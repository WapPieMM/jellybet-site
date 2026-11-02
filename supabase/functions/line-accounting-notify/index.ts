import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-line-signature, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const env = (name: string) => Deno.env.get(name) ?? "";
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function scheduledDateForToday(today: string, scheduleType: string, weekday: number | null, anchor: string | null): string {
  const date = new Date(`${today}T00:00:00Z`);
  if (scheduleType === 'weekly') {
    if (weekday === null) return '';
    const daysBack = (date.getUTCDay() - weekday + 7) % 7;
    date.setUTCDate(date.getUTCDate() - daysBack);
    return date.toISOString().slice(0, 10);
  }
  if (!anchor || anchor > today) return '';
  const interval = scheduleType === 'every_other_day' ? 2 : 1;
  const anchorDate = new Date(`${anchor}T00:00:00Z`);
  const elapsed = Math.floor((date.getTime() - anchorDate.getTime()) / 86400000);
  return elapsed % interval === 0 ? today : '';
}

function money(value: number): string {
  return "฿" + value.toLocaleString("th-TH", {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
}

async function validLineSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = env("LINE_CHANNEL_SECRET");
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

async function handleWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  if (!(await validLineSignature(rawBody, signature))) return json({ error: "Invalid LINE signature" }, 401);

  let payload: { events?: Array<{ source?: { type?: string; groupId?: string } }> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const groupIds = [...new Set((payload.events ?? [])
    .filter((event) => event.source?.type === "group" && event.source.groupId)
    .map((event) => event.source!.groupId!))];

  if (groupIds.length) {
    const { error } = await supabase.from("line_notification_config").upsert({
      id: 1, group_id: groupIds[0], updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Could not save LINE group configuration:", error.message);
      return json({ error: "Could not save group configuration" }, 500);
    }
  }
  return json({ ok: true, groupsCaptured: groupIds.length });
}

async function handleDailyReminder(req: Request): Promise<Response> {
  const expectedSecret = env("LINE_CRON_SECRET");
  const suppliedSecret = req.headers.get("x-cron-secret") ?? "";
  if (!expectedSecret || suppliedSecret !== expectedSecret) return json({ error: "Unauthorized" }, 401);

  const token = env("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return json({ error: "Missing LINE_CHANNEL_ACCESS_TOKEN secret" }, 500);

  const { data: config, error: configError } = await supabase
    .from("line_notification_config").select("group_id").eq("id", 1).maybeSingle();
  if (configError || !config?.group_id) return json({ error: "LINE group has not been captured yet" }, 409);

  const today = bangkokToday();
  const { data: entries, error: entriesError } = await supabase
    .from("accounting_entries")
    .select("id, account_title, opening_balance, weekly_amount, installment_due_weekday, installment_schedule_type, installment_due_date");
  if (entriesError) {
    console.error("Could not read accounting entries:", entriesError.message);
    return json({ error: "Could not read accounting entries" }, 500);
  }

  const entryIds = (entries ?? []).map((entry) => entry.id);
  let payments: Array<{ entry_id: string; amount: number; paid_on: string }> = [];
  if (entryIds.length) {
    const { data, error } = await supabase.from("accounting_payments")
      .select("entry_id, amount, paid_on").in("entry_id", entryIds);
    if (error) {
      console.error("Could not read accounting payments:", error.message);
      return json({ error: "Could not read accounting payments" }, 500);
    }
    payments = data ?? [];
  }

  const rows = (entries ?? []).map((entry) => {
    const entryPayments = payments.filter((payment) => payment.entry_id === entry.id);
    const paid = entryPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remaining = Math.max(0, Number(entry.opening_balance || 0) - paid);
    const scheduleType = entry.installment_schedule_type || 'weekly';
    const dueDate = scheduledDateForToday(today, scheduleType, entry.installment_due_weekday == null ? null : Number(entry.installment_due_weekday), entry.installment_due_date);
    const alreadyPaidThisCycle = !!dueDate && entryPayments.some((payment) => payment.paid_on >= dueDate);
    const dueAmount = Math.min(Math.max(0, Number(entry.weekly_amount || 0)), remaining);
    return { title: entry.account_title, remaining, dueAmount, due: !!dueDate && dueDate === today && !alreadyPaidThisCycle && remaining > 0.009 };
  }).filter((row) => row.due && row.dueAmount > 0.009);

  const totalDue = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(`${today}T12:00:00+07:00`));

  const lines = rows.length
    ? rows.map((row, index) =>
      `${index + 1}. ${row.title}\n   ส่งวันนี้ ${money(row.dueAmount)} | คงเหลือ ${money(row.remaining)}`)
    : ["วันนี้ไม่มีรายการครบกำหนดชำระที่ยังมียอดค้าง"];

  const message = [
    `🔔 แจ้งเตือนยอดผ่อนประจำวัน — ${dateLabel}`,
    "",
    ...lines,
    "",
    `รวมยอดส่งวันนี้: ${money(totalDue)}`,
    `รวมยอดคงเหลือ: ${money(totalRemaining)}`,
  ].join("\n");

  // Recover a stale lock left by an interrupted invocation; never clear today's sent record.
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { error: staleError } = await supabase.from("line_notification_runs")
    .delete().eq("run_date", today).eq("status", "sending").lt("created_at", staleBefore);
  if (staleError) {
    console.error("Could not clear stale notification lock:", staleError.message);
    return json({ error: "Could not prepare notification run" }, 500);
  }

  // Unique run_date prevents duplicate pushes if the scheduled invocation retries.
  const { error: runError } = await supabase.from("line_notification_runs")
    .insert({ run_date: today, status: "sending" });
  if (runError) {
    if (runError.code === "23505") return json({ ok: true, skipped: "already sent or in progress", date: today });
    console.error("Could not create notification run:", runError.message);
    return json({ error: "Could not create notification run" }, 500);
  }

  const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: config.group_id, messages: [{ type: "text", text: message }] }),
  });

  if (!lineResponse.ok) {
    const detail = await lineResponse.text();
    await supabase.from("line_notification_runs").delete().eq("run_date", today);
    console.error("LINE push failed:", lineResponse.status, detail);
    return json({ error: "LINE push failed", status: lineResponse.status }, 502);
  }

  await supabase.from("line_notification_runs")
    .update({ status: "sent", sent_at: new Date().toISOString() }).eq("run_date", today);
  return json({ ok: true, date: today, accounts: rows.length, totalDue, totalRemaining });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // LINE webhook requests have an X-Line-Signature header; scheduled calls use a private cron secret.
  if (req.headers.has("x-line-signature")) return await handleWebhook(req);
  return await handleDailyReminder(req);
});
