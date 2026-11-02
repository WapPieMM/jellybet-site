(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.JELLYBET_CONFIG || {};
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey);
  const db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const START_DATE = '2026-11-01';
  const INSTALLMENT_MARKER = '[[JELLYBET_INSTALLMENT_PLANS]]';
  let currentUser = null;
  let accounts = [];
  let entries = [];
  let payments = [];
  let activeTab = 'overview';
  const money = value => '฿' + Number(value || 0).toLocaleString('th-TH', {minimumFractionDigits: 0, maximumFractionDigits: 2});
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const today = () => {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
  };
  const formatDate = value => {
    if (!value) return '—';
    const parts = String(value).slice(0,10).split('-').map(Number);
    if (parts.length !== 3 || !parts[0]) return '—';
    return new Date(parts[0], parts[1]-1, parts[2]).toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'numeric'});
  };
  const selectedMonth = () => $('accountingMonth').value || START_DATE.slice(0,7);
  const WEEKDAY_NAMES = ['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];
  const weekdayLabel = value => value!==null && value!=='' && Number.isInteger(Number(value)) && Number(value)>=0 && Number(value)<=6 ? WEEKDAY_NAMES[Number(value)] : '';
  function dateKey(date){
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }
  function latestWeeklyDueDate(weekday){
    const date=new Date();date.setHours(0,0,0,0);
    date.setDate(date.getDate()-((date.getDay()-Number(weekday)+7)%7));
    return dateKey(date);
  }
  function nextWeeklyDueDate(weekday, skipToday){
    const date=new Date();
    date.setHours(0,0,0,0);
    let daysUntil=(Number(weekday)-date.getDay()+7)%7;
    if(skipToday && daysUntil===0) daysUntil=7;
    date.setDate(date.getDate()+daysUntil);
    return dateKey(date);
  }
  function weeklyDueState(entry){
    if(entry.installment_due_weekday==null)return {label:'',dueToday:false,overdue:false,nextDate:''};
    const scheduled=latestWeeklyDueDate(entry.installment_due_weekday);
    const paidAfterSchedule=paymentsFor(entry.id).some(payment=>payment.paid_on>=scheduled);
    const nextDate=nextWeeklyDueDate(entry.installment_due_weekday, paidAfterSchedule);
    return {
      label:'ส่งยอดทุก'+weekdayLabel(entry.installment_due_weekday),
      dueToday:!paidAfterSchedule&&scheduled===today(),
      overdue:!paidAfterSchedule&&scheduled<today(),
      nextDate
    };
  }
  const bangkokDate = value => {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
    const part = type => parts.find(item => item.type === type).value;
    return part('year') + '-' + part('month') + '-' + part('day');
  };
  const monthBounds = month => {
    const parts = month.split('-').map(Number);
    const start = month + '-01';
    const next = new Date(parts[0], parts[1], 1);
    const end = next.getFullYear() + '-' + String(next.getMonth()+1).padStart(2,'0') + '-01';
    return {start, end};
  };
  const setMessage = (message, isError) => {
    const el = $('accountingMessage');
    el.textContent = message || '';
    el.classList.toggle('is-error', !!isError);
    el.classList.toggle('is-visible', !!message);
  };
  const parsePlans = raw => {
    const value = String(raw || '');
    if (!value.startsWith(INSTALLMENT_MARKER)) return [];
    const rest = value.slice(INSTALLMENT_MARKER.length);
    const end = rest.indexOf(']');
    try {
      const parsed = JSON.parse(end >= 0 ? rest.slice(0, end + 1) : rest);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Could not parse Account installment plans:', error);
      return [];
    }
  };
  const paymentsFor = entryId => payments.filter(payment => payment.entry_id === entryId);
  const totalPaid = entryId => paymentsFor(entryId).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const remaining = entry => Math.max(0, Number(entry.opening_balance || 0) - totalPaid(entry.id));
  const entryById = id => entries.find(entry => entry.id === id);
  const typeLabel = type => type === 'deposit' ? 'เงินมัดจำ' : type === 'other' ? 'อื่น ๆ' : 'ค่างวด';

  function showTab(name) {
    activeTab = name;
    document.querySelectorAll('[data-accounting-tab]').forEach(button => {
      const active = button.dataset.accountingTab === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('[data-accounting-panel]').forEach(panel => {
      panel.hidden = panel.dataset.accountingPanel !== name;
    });
    setMessage('');
    if (name === 'import') renderImportCandidates();
  }

  function renderOverview() {
    const month = selectedMonth();
    const bounds = monthBounds(month);
    const monthEntries = entries.filter(entry => !entry.is_carryover && entry.sale_date >= bounds.start && entry.sale_date < bounds.end);
    const monthPayments = payments.filter(payment => payment.paid_on >= bounds.start && payment.paid_on < bounds.end);
    const sales = monthEntries.reduce((sum, entry) => sum + Number(entry.sale_amount || 0), 0);
    const costs = monthEntries.reduce((sum, entry) => sum + Number(entry.cost_amount || 0), 0);
    const received = monthPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const profit = sales - costs;
    const openEntries = entries.filter(entry => remaining(entry) > 0.009);
    const outstanding = openEntries.reduce((sum, entry) => sum + remaining(entry), 0);
    const monthDate = new Date(Number(month.slice(0,4)), Number(month.slice(5,7))-1, 1);
    $('accountingMonthLabel').textContent = monthDate.toLocaleDateString('th-TH', {month:'long',year:'numeric'});
    $('statSales').textContent = money(sales);
    $('statSalesCount').textContent = monthEntries.length + ' รายการขายใหม่';
    $('statReceived').textContent = money(received);
    $('statProfit').textContent = money(profit);
    $('statCost').textContent = 'ต้นทุนไอดีที่ขายเดือนนี้ ' + money(costs);
    $('statOutstanding').textContent = money(outstanding);
    $('statOpenCount').textContent = openEntries.length + ' ไอดีที่ยังมียอดค้าง';

    const recent = monthPayments.slice().sort((a,b) => b.paid_on.localeCompare(a.paid_on) || String(b.created_at).localeCompare(String(a.created_at))).slice(0,6);
    $('overviewRecentPayments').innerHTML = recent.length ? recent.map(payment => {
      const entry = entryById(payment.entry_id);
      return '<div class="accounting-activity-row"><div><strong>' + escapeHtml(entry ? entry.account_title : 'Account ที่ถูกนำออก') + '</strong><small>' + formatDate(payment.paid_on) + ' · ' + typeLabel(payment.payment_type) + '</small></div><b>' + money(payment.amount) + '</b></div>';
    }).join('') : '<p class="accounting-empty">ยังไม่มีรายการรับเงินในเดือนนี้</p>';

    const outstandingList = openEntries.slice().sort((a,b) => remaining(b)-remaining(a)).slice(0,6);
    $('overviewOutstanding').innerHTML = outstandingList.length ? outstandingList.map(entry => (
      '<div class="accounting-activity-row"><div><strong>' + escapeHtml(entry.account_title) + '</strong><small>' + (entry.is_carryover ? 'ยอดยกมาตั้งต้น' : 'ขาย ' + formatDate(entry.sale_date)) + (entry.installment_due_weekday!=null ? ' · ส่งยอดทุก'+weekdayLabel(entry.installment_due_weekday) : '') + '</small></div><b>' + money(remaining(entry)) + '</b></div>'
    )).join('') : '<p class="accounting-empty">ยังไม่มีรายการค้างชำระ</p>';
  }

  function renderInstallments() {
    const open = entries.filter(entry => remaining(entry) > 0.009).sort((a,b) => a.sale_date.localeCompare(b.sale_date));
    const total = open.reduce((sum, entry) => sum + remaining(entry), 0);
    $('installmentOpenTotal').textContent = 'ยอดค้าง ' + money(total);
    $('accountingInstallmentList').innerHTML = entries.length ? entries.slice().sort((a,b) => remaining(b)-remaining(a)).map(entry => {
      const due = remaining(entry);
      const schedule = weeklyDueState(entry);
      const overdue = due > 0.009 && schedule.overdue;
      const dueToday = due > 0.009 && schedule.dueToday;
      const statusClass = due <= 0.009 ? 'is-paid' : overdue ? 'is-overdue' : 'is-open';
      const statusLabel = due <= 0.009 ? 'ปิดยอดแล้ว' : overdue ? 'เลยกำหนดส่งยอด' : dueToday ? 'ถึงวันส่งยอดวันนี้' : 'กำลังผ่อน';
      const history = paymentsFor(entry.id).slice().sort((a,b) => b.paid_on.localeCompare(a.paid_on));
      return '<article class="accounting-entry-card card">' +
        '<div class="accounting-entry-top"><div><span class="accounting-status ' + statusClass + '">' + statusLabel + '</span>' + (entry.is_carryover ? '<span class="accounting-carry-tag">ยอดยกมา</span>' : '') +
        '<h3>' + escapeHtml(entry.account_title) + '</h3><small>วันที่ขาย ' + formatDate(entry.sale_date) + (schedule.label ? ' · ' + schedule.label : '') + '</small>' + (schedule.nextDate && due > 0.009 ? '<small class="accounting-next-due">กำหนดชำระครั้งถัดไป: <b>' + formatDate(schedule.nextDate) + '</b></small>' : '') + '</div><strong class="accounting-due">' + money(due) + '<small>ยอดคงเหลือ</small></strong></div>' +
        '<div class="accounting-entry-numbers"><span>ยอดที่ต้องชำระทั้งหมด <b>' + money(entry.sale_amount) + '</b></span><span>ต้นทุน <b>' + money(entry.cost_amount) + '</b></span><span>รับเงินแล้ว <b>' + money(totalPaid(entry.id)) + '</b></span><span>คงเหลือ <b>' + money(due) + '</b></span>' + (Number(entry.weekly_amount)>0 ? '<span>ส่งยอด/สัปดาห์ <b>' + money(entry.weekly_amount) + '</b></span>' : '') + '</div>' +
        '<div class="accounting-entry-actions">' + (due > 0.009 ? '<button type="button" class="primary-button" data-record-payment="' + entry.id + '">＋ บันทึกรับเงิน</button>' : '<span class="accounting-paid-note">ชำระครบแล้ว ♡</span>') +
        '<button type="button" class="accounting-text-button" data-edit-entry="' + entry.id + '">แก้ไขข้อมูลบัญชี / เลื่อนวันส่งยอด</button>' + (entry.installment_due_weekday!=null && entry.source_account_id ? '<button type="button" class="accounting-text-button" data-release-installment="' + entry.id + '">ลูกค้าหลุดผ่อน / คืนสถานะพร้อมขาย</button>' : '') +
        '<button type="button" class="accounting-text-button" data-toggle-history="' + entry.id + '">ประวัติรับเงิน (' + history.length + ')</button></div>' +
        '<div class="accounting-inline-history" id="history-' + entry.id + '" hidden>' + (history.length ? history.map(payment => '<div><span>' + formatDate(payment.paid_on) + ' · ' + typeLabel(payment.payment_type) + (payment.note ? ' · ' + escapeHtml(payment.note) : '') + '</span><b>' + money(payment.amount) + '</b><button type="button" class="accounting-text-button" data-edit-payment="' + payment.id + '">แก้ไข</button></div>').join('') : '<p>ยังไม่มีประวัติรับเงิน</p>') + '</div>' +
      '</article>';
    }).join('') : '<div class="accounting-empty card">ยังไม่มีรายการบัญชี กรุณาตรวจสอบรายการจากแท็บ “นำเข้าจาก Account”</div>';
  }

  function renderTransactions() {
    const month = selectedMonth();
    const bounds = monthBounds(month);
    const visible = payments.filter(payment => payment.paid_on >= bounds.start && payment.paid_on < bounds.end).slice().sort((a,b) => b.paid_on.localeCompare(a.paid_on) || String(b.created_at).localeCompare(String(a.created_at)));
    const total = visible.reduce((sum,payment) => sum + Number(payment.amount || 0), 0);
    $('transactionMonthTotal').textContent = money(total);
    $('accountingTransactionList').innerHTML = visible.length ? '<div class="accounting-transaction-table-wrap"><table class="accounting-transaction-table"><thead><tr><th>วันที่รับ</th><th>รายการ</th><th>ประเภท</th><th>จำนวนเงิน</th><th></th></tr></thead><tbody>' + visible.map(payment => {
      const entry = entryById(payment.entry_id);
      return '<tr><td>' + formatDate(payment.paid_on) + '</td><td><strong>' + escapeHtml(entry ? entry.account_title : 'Account ที่ถูกนำออก') + '</strong><small>' + escapeHtml(payment.note || '') + '</small></td><td>' + typeLabel(payment.payment_type) + '</td><td class="accounting-money-cell">' + money(payment.amount) + '</td><td><button type="button" class="accounting-text-button" data-edit-payment="' + payment.id + '">แก้ไข</button><button type="button" class="accounting-delete-button" data-delete-payment="' + payment.id + '" aria-label="ลบรายการรับเงิน">ลบ</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="accounting-empty">ยังไม่มีรายการรับเงินในเดือนนี้</p>';
  }

  function getPendingImports() {
    const linked = new Set(entries.map(entry => String(entry.source_account_id)));
    const unlinked = accounts.filter(account => !linked.has(String(account.id)));
    const handoffDate = account => {
      const timestamp=account.accounting_handoff_at||account.sale_started_at;
      return timestamp?bangkokDate(timestamp):'';
    };
    const carryovers = unlinked.filter(account => account.status==='installment' && (account.accounting_carryover===true || !handoffDate(account)) && (!handoffDate(account) || handoffDate(account)<START_DATE));
    const newSales = unlinked.filter(account => ['installment','sold'].includes(account.status) && handoffDate(account) && handoffDate(account)>=START_DATE);
    return {carryovers, newSales};
  }

  function importCard(account, carryover) {
    const plans = parsePlans(account.installment_details);
    const planOptions = plans.map((plan,index) => '<option value="' + index + '">' + escapeHtml('ผ่อน ' + Number(plan.months || 0) + ' เดือน · ดาวน์ ' + Number(plan.down || 0).toLocaleString('th-TH') + ' · ผ่อน ' + Number(plan.total || 0).toLocaleString('th-TH')) + '</option>').join('');
    const planControl = plans.length ? '<label>แผนผ่อนที่ใช้จริง<select data-import-plan>' + planOptions + '</select></label>' : '<p class="accounting-import-hint">ไม่พบตัวเลือกแผนผ่อนที่บันทึกไว้ใน Account</p>';
    const saleDate = carryover ? START_DATE : bangkokDate(account.accounting_handoff_at||account.sale_started_at);
    const firstPlan = plans[0] || {};
    const saleValue = account.status === 'sold' && account.actual_sale_price != null ? Number(account.actual_sale_price) : plans.length && !carryover && account.status === 'installment' ? Number(firstPlan.down || 0) + Number(firstPlan.total || 0) : Number(account.price || 0);
    const receivedDefault = carryover ? 0 : account.status === 'installment' ? Number(firstPlan.down || 0) : saleValue;
    return '<article class="accounting-import-card card" data-import-card data-account-id="' + account.id + '" data-carryover="' + String(carryover) + '">' +
      '<div class="accounting-import-card-head"><div><span class="accounting-candidate-tag">' + (carryover ? 'ยอดยกมาเดิม' : account.status === 'installment' ? 'เริ่มผ่อนใหม่' : 'ขายใหม่') + '</span><h4>' + escapeHtml(account.title || 'Account #' + account.id) + '</h4><small>ราคาใน Account ' + money(account.price) + ' · ' + (carryover ? 'วันเริ่มต้นบัญชี ' + formatDate(START_DATE) : 'วันที่เริ่มขาย ' + formatDate(saleDate)) + (account.status === 'installment' && account.installment_due_weekday!=null ? ' · ส่งยอดทุก' + weekdayLabel(account.installment_due_weekday) : '') + '</small></div><span class="accounting-account-id">#' + escapeHtml(account.id) + '</span></div>' +
      planControl +
      '<div class="accounting-import-fields"><label>' + (carryover ? 'ราคาขายเดิมตามข้อมูล Account (บาท)' : 'ยอดขายจริง (บาท)') + '<input type="number" min="0" step="0.01" data-import-sale value="' + saleValue + '" required></label>' +
      '<label>ต้นทุนไอดี (บาท)<input type="number" min="0" step="0.01" data-import-cost value="' + Number(account.acquisition_cost || 0) + '" required></label>' +
      (carryover ? '<label>ยอดค้างตั้งต้น (บาท)<input type="number" min="0" step="0.01" data-import-opening placeholder="กรอกยอดคงเหลือจริง" required></label>' :
        '<label>เงินที่รับแล้ว ณ วันเริ่มขาย (บาท)<input type="number" min="0" step="0.01" data-import-received value="' + receivedDefault + '" required></label>') +
      '<label>ยอดส่งต่อสัปดาห์ (บาท)<input type="number" min="0" step="0.01" data-import-weekly value="' + Number(firstPlan.weekly || 0) + '"></label></div>' +
      '<label class="accounting-import-note-label">หมายเหตุ (ไม่บังคับ)<input type="text" maxlength="250" data-import-note placeholder="ข้อมูลเพิ่มเติม"></label>' +
      '<button type="button" class="primary-button" data-import-entry>นำเข้าบัญชีรายการนี้</button></article>';
  }

  function renderImportCandidates() {
    const pending = getPendingImports();
    const count = pending.carryovers.length + pending.newSales.length;
    $('accountingImportCount').textContent = count;
    $('accountingPendingChip').textContent = count + ' รายการ';
    $('accountingCarryoverCandidates').innerHTML = pending.carryovers.length ? pending.carryovers.map(account => importCard(account, true)).join('') : '<p class="accounting-empty">ไม่มีไอดีติดผ่อนเดิมที่รอนำเข้า</p>';
    $('accountingNewCandidates').innerHTML = pending.newSales.length ? pending.newSales.map(account => importCard(account, false)).join('') : '<p class="accounting-empty">ยังไม่มีรายการขายใหม่ที่รอนำเข้า</p>';
  }

  function renderAll() {
    renderOverview();
    renderInstallments();
    renderTransactions();
    renderImportCandidates();
  }

  async function loadData() {
    setMessage('กำลังโหลดข้อมูลบัญชี…');
    const results = await Promise.all([
      db.from('accounting_entries').select('*').order('sale_date', {ascending:false}),
      db.from('accounting_payments').select('*').order('paid_on', {ascending:false}),
      db.from('accounts').select('id,title,price,status,installment_details,sale_started_at,accounting_carryover,created_at').order('created_at', {ascending:false}),
      db.from('account_private_financials').select('account_id,acquisition_cost,installment_due_weekday,accounting_handoff_at,actual_sale_price')
    ]);
    const issue = results.find(result => result.error);
    if (issue) {
      const message=issue.error.message||String(issue.error);
      if (/column .* does not exist|schema cache|could not find .*column/i.test(message)) {
        throw new Error('ฐานข้อมูลยังไม่ได้อัปเดต กรุณารัน Migration 20261102_account_status_weekday_handoff.sql ใน Supabase SQL Editor แล้วโหลดหน้านี้ใหม่');
      }
      throw issue.error;
    }
    entries = results[0].data || [];
    payments = results[1].data || [];
    const savedFinancials = new Map((results[3].data || []).map(row => [String(row.account_id), row]));
    accounts = (results[2].data || []).map(account => {
      const financials = savedFinancials.get(String(account.id)) || {};
      return {
        ...account,
        acquisition_cost: Number(financials.acquisition_cost || 0),
        installment_due_weekday: financials.installment_due_weekday == null ? null : Number(financials.installment_due_weekday),
        accounting_handoff_at: financials.accounting_handoff_at || null,
        actual_sale_price: financials.actual_sale_price == null ? null : Number(financials.actual_sale_price)
      };
    });
    renderAll();
    setMessage('');
  }

  async function requireAdmin(user) {
    if (!user || !user.app_metadata || user.app_metadata.role !== 'admin') {
      if (db) await db.auth.signOut();
      currentUser = null;
      $('accountingLogin').hidden = false;
      $('accountingApp').hidden = true;
      $('accountingLoginMessage').textContent = 'บัญชีนี้ไม่มีสิทธิ์ Admin สำหรับหน้าบัญชี';
      return false;
    }
    currentUser = user;
    $('accountingLogin').hidden = true;
    $('accountingApp').hidden = false;
    $('accountingLoginMessage').textContent = '';
    await loadData();
    return true;
  }

  async function createImport(card) {
    const accountId = card.dataset.accountId;
    const account = accounts.find(item => String(item.id) === String(accountId));
    if (!account) throw new Error('ไม่พบ Account ต้นทาง กรุณาโหลดหน้าใหม่');
    const carryover = card.dataset.carryover === 'true';
    const plans = parsePlans(account.installment_details);
    const selectedPlanIndex = Number(card.querySelector('[data-import-plan]') ? card.querySelector('[data-import-plan]').value : 0);
    const plan = plans[selectedPlanIndex] || {};
    const saleInput = Number(card.querySelector('[data-import-sale]').value);
    const costAmount = Number(card.querySelector('[data-import-cost]').value);
    const weeklyAmount = Number(card.querySelector('[data-import-weekly]').value) || Number(plan.weekly || 0);
    const note = card.querySelector('[data-import-note]').value.trim();
    if (!Number.isFinite(saleInput) || saleInput < 0 || !Number.isFinite(costAmount) || costAmount < 0) throw new Error('กรุณาตรวจสอบยอดขายและต้นทุน');
    const payload = {
      source_account_id: account.id,
      account_title: account.title || 'Account #' + account.id,
      sale_date: carryover ? START_DATE : bangkokDate(account.sale_started_at),
      sale_amount: saleInput,
      cost_amount: costAmount,
      opening_balance: carryover ? Number(card.querySelector('[data-import-opening]').value) : saleInput,
      weekly_amount: weeklyAmount,
      installment_due_weekday: !carryover && account.status === 'installment' ? account.installment_due_weekday ?? null : null,
      is_carryover: carryover,
      notes: note
    };
    if (!Number.isFinite(payload.opening_balance) || payload.opening_balance < 0) throw new Error('กรุณากรอกยอดคงเหลือตั้งต้นให้ถูกต้อง');
    if (carryover && !card.querySelector('[data-import-opening]').value) throw new Error('ต้องกรอกยอดคงเหลือจริง ณ 1 พ.ย. 2569');
    const received = carryover ? 0 : Number(card.querySelector('[data-import-received]').value);
    if (!Number.isFinite(received) || received < 0 || received > payload.opening_balance) throw new Error('ยอดที่รับแล้วต้องไม่เกินยอดขาย/ยอดตั้งต้น');
    if (!carryover && account.status === 'installment' && plans.length && payload.sale_amount < Number(plan.down || 0) + Number(plan.total || 0)) {
      throw new Error('ยอดขายจริงน้อยกว่ายอดรวมของแผนผ่อนที่เลือก โปรดตรวจสอบ');
    }
    const {data:entry,error} = await db.from('accounting_entries').insert(payload).select('*').single();
    if (error) throw error;
    if (received > 0) {
      const {error:paymentError} = await db.from('accounting_payments').insert({
        entry_id: entry.id,
        amount: received,
        paid_on: payload.sale_date,
        payment_type: account.status === 'installment' ? 'deposit' : 'other',
        note: carryover ? '' : 'ยอดรับเริ่มต้นจากการนำเข้า'
      });
      if (paymentError) {
        await db.from('accounting_entries').delete().eq('id', entry.id);
        throw paymentError;
      }
    }
    await loadData();
    setMessage('นำเข้า ' + payload.account_title + ' เข้าระบบบัญชีแล้ว ♡');
  }

  function openEntryEditDialog(entryId) {
    const entry = entryById(entryId);
    if (!entry) return;
    $('editAccountingEntryId').value = entry.id;
    $('accountingEntryEditTitle').textContent = entry.account_title;
    $('editAccountingSaleDate').value = entry.sale_date || START_DATE;
    $('editAccountingSaleAmount').value = Number(entry.sale_amount || 0);
    $('editAccountingCostAmount').value = Number(entry.cost_amount || 0);
    $('editAccountingOpeningBalance').value = Number(entry.opening_balance || 0);
    $('editAccountingWeeklyAmount').value = Number(entry.weekly_amount || 0);
    $('editAccountingDueWeekday').value = entry.installment_due_weekday == null ? '' : String(entry.installment_due_weekday);
    $('editAccountingNotes').value = entry.notes || '';
    $('accountingEntryEditMessage').textContent = '';
    $('accountingEntryEditDialog').showModal();
  }

  $('accountingEntryEditForm').addEventListener('submit', async event => {
    event.preventDefault();
    const id = $('editAccountingEntryId').value;
    const entry = entryById(id);
    if (!entry) {
      $('accountingEntryEditMessage').textContent = 'ไม่พบรายการบัญชี กรุณาโหลดหน้าใหม่';
      return;
    }
    const saleAmount = Number($('editAccountingSaleAmount').value);
    const costAmount = Number($('editAccountingCostAmount').value);
    const openingBalance = Number($('editAccountingOpeningBalance').value);
    const weeklyAmount = Number($('editAccountingWeeklyAmount').value || 0);
    if (![saleAmount,costAmount,openingBalance,weeklyAmount].every(Number.isFinite) ||
        saleAmount < 0 || costAmount < 0 || openingBalance < 0 || weeklyAmount < 0) {
      $('accountingEntryEditMessage').textContent = 'กรุณาตรวจสอบตัวเลขให้ถูกต้องและไม่ติดลบ';
      return;
    }
    if (totalPaid(id) > openingBalance + 0.001) {
      $('accountingEntryEditMessage').textContent = 'ยอดตั้งต้นต้องไม่น้อยกว่าเงินที่รับไปแล้ว (' + money(totalPaid(id)) + ')';
      return;
    }
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const {error} = await db.from('accounting_entries').update({
        sale_date: $('editAccountingSaleDate').value,
        sale_amount: saleAmount,
        cost_amount: costAmount,
        opening_balance: openingBalance,
        weekly_amount: weeklyAmount,
        installment_due_weekday: $('editAccountingDueWeekday').value === '' ? null : Number($('editAccountingDueWeekday').value),
        notes: $('editAccountingNotes').value.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      $('accountingEntryEditDialog').close();
      await loadData();
      setMessage('แก้ไขข้อมูลบัญชีเรียบร้อยแล้ว และคำนวณยอดค้างใหม่ ♡');
    } catch (error) {
      $('accountingEntryEditMessage').textContent = 'แก้ไขไม่สำเร็จ: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });

  $('accountingEntryEditDialog').querySelector('#closeAccountingEntryEdit').addEventListener('click', () => $('accountingEntryEditDialog').close());
  $('accountingEntryEditDialog').querySelector('#cancelAccountingEntryEdit').addEventListener('click', () => $('accountingEntryEditDialog').close());

  function openPaymentEditDialog(paymentId) {
    const payment = payments.find(item => String(item.id) === String(paymentId));
    if (!payment) return;
    const entry = entryById(payment.entry_id);
    $('editAccountingPaymentId').value = payment.id;
    $('accountingPaymentEditAccount').textContent = entry ? entry.account_title : 'Account ที่ถูกนำออก';
    $('editAccountingPaymentAmount').value = Number(payment.amount || 0);
    $('editAccountingPaymentDate').value = payment.paid_on || today();
    $('editAccountingPaymentType').value = payment.payment_type || 'installment';
    $('editAccountingPaymentNote').value = payment.note || '';
    $('accountingPaymentEditMessage').textContent = '';
    $('accountingPaymentEditDialog').showModal();
  }

  $('accountingPaymentEditForm').addEventListener('submit', async event => {
    event.preventDefault();
    const paymentId = $('editAccountingPaymentId').value;
    const payment = payments.find(item => String(item.id) === String(paymentId));
    const amount = Number($('editAccountingPaymentAmount').value);
    if (!payment || !Number.isFinite(amount) || amount <= 0) {
      $('accountingPaymentEditMessage').textContent = 'กรุณากรอกจำนวนเงินที่มากกว่า 0';
      return;
    }
    const entry = entryById(payment.entry_id);
    const otherPayments = payments.filter(item => item.entry_id === payment.entry_id && String(item.id) !== String(payment.id))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (entry && otherPayments + amount > Number(entry.opening_balance || 0) + 0.001) {
      $('accountingPaymentEditMessage').textContent = 'ยอดรับรวมจะเกินยอดตั้งต้นของบัญชี (' + money(entry.opening_balance) + ')';
      return;
    }
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const {error} = await db.from('accounting_payments').update({
        amount,
        paid_on: $('editAccountingPaymentDate').value,
        payment_type: $('editAccountingPaymentType').value,
        note: $('editAccountingPaymentNote').value.trim()
      }).eq('id', paymentId);
      if (error) throw error;
      $('accountingPaymentEditDialog').close();
      await loadData();
      setMessage('แก้ไขยอดรับเงินจากลูกค้าเรียบร้อยแล้ว และคำนวณยอดคงเหลือใหม่ ♡');
    } catch (error) {
      $('accountingPaymentEditMessage').textContent = 'แก้ไขไม่สำเร็จ: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });

  $('accountingPaymentEditDialog').querySelector('#closeAccountingPaymentEdit').addEventListener('click', () => $('accountingPaymentEditDialog').close());
  $('accountingPaymentEditDialog').querySelector('#cancelAccountingPaymentEdit').addEventListener('click', () => $('accountingPaymentEditDialog').close());

  function openPaymentDialog(entryId) {
    const entry = entryById(entryId);
    if (!entry) return;
    const due = remaining(entry);
    if (due <= 0.009) return;
    $('paymentEntryId').value = entryId;
    $('accountingPaymentAccount').textContent = entry.account_title + ' · คงเหลือ ' + money(due);
    $('paymentAmount').value = '';
    $('paymentAmount').max = due.toFixed(2);
    $('paymentDate').value = today();
    $('paymentType').value = 'installment';
    $('paymentNote').value = '';
    $('accountingPaymentMessage').textContent = '';
    $('accountingPaymentDialog').showModal();
  }

  $('accountingLoginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!db) {
      $('accountingLoginMessage').textContent = 'ยังไม่ได้ตั้งค่า Supabase ใน config.js';
      return;
    }
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    $('accountingLoginMessage').textContent = 'กำลังเข้าสู่ระบบ…';
    try {
      const {data,error} = await db.auth.signInWithPassword({
        email: $('accountingEmail').value.trim(),
        password: $('accountingPassword').value
      });
      if (error) throw error;
      await requireAdmin(data.user);
    } catch (error) {
      $('accountingLoginMessage').textContent = 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });

  $('accountingLogout').addEventListener('click', async () => {
    if (db) await db.auth.signOut();
    currentUser = null;
    $('accountingApp').hidden = true;
    $('accountingLogin').hidden = false;
    $('accountingPassword').value = '';
  });

  document.querySelectorAll('[data-accounting-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.accountingTab)));
  document.querySelectorAll('[data-open-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.openTab)));
  $('accountingMonth').addEventListener('change', renderAll);
  $('accountingPaymentDialog').querySelector('#closeAccountingPayment').addEventListener('click', () => $('accountingPaymentDialog').close());
  $('accountingPaymentDialog').querySelector('#cancelAccountingPayment').addEventListener('click', () => $('accountingPaymentDialog').close());

  $('accountingPaymentForm').addEventListener('submit', async event => {
    event.preventDefault();
    const entryId = $('paymentEntryId').value;
    const entry = entryById(entryId);
    const amount = Number($('paymentAmount').value);
    if (!entry || !Number.isFinite(amount) || amount <= 0 || amount > remaining(entry) + 0.001) {
      $('accountingPaymentMessage').textContent = 'จำนวนเงินต้องมากกว่า 0 และไม่เกินยอดคงเหลือ';
      return;
    }
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const {error} = await db.from('accounting_payments').insert({
        entry_id: entryId,
        amount: amount,
        paid_on: $('paymentDate').value,
        payment_type: $('paymentType').value,
        note: $('paymentNote').value.trim()
      });
      if (error) throw error;
      $('accountingPaymentDialog').close();
      await loadData();
      setMessage('บันทึกรับเงินเรียบร้อยแล้ว ♡');
    } catch (error) {
      $('accountingPaymentMessage').textContent = 'บันทึกไม่สำเร็จ: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('click', async event => {
    const importButton = event.target.closest('[data-import-entry]');
    if (importButton) {
      const card = importButton.closest('[data-import-card]');
      importButton.disabled = true;
      importButton.textContent = 'กำลังนำเข้า…';
      try { await createImport(card); }
      catch (error) { setMessage('นำเข้าไม่สำเร็จ: ' + error.message, true); }
      finally { importButton.disabled = false; importButton.textContent = 'นำเข้าบัญชีรายการนี้'; }
      return;
    }
    const releaseButton = event.target.closest('[data-release-installment]');
    if (releaseButton) {
      const entry = entryById(releaseButton.dataset.releaseInstallment);
      if (!entry || !entry.source_account_id) return;
      const received = totalPaid(entry.id);
      const originalCost = Number(entry.cost_amount || 0);
      const netCost = Math.max(0, originalCost - received);
      const profit = Math.max(0, received - originalCost);
      const summary = profit > 0
        ? 'เงินที่รับ ' + money(received) + ' มากกว่าต้นทุน ' + money(originalCost) + ' ส่วนต่างเป็นกำไร ' + money(profit)
        : 'เงินที่รับ ' + money(received) + ' จะนำไปหักต้นทุน ' + money(originalCost) + ' เหลือต้นทุนสุทธิ ' + money(netCost);
      if (!window.confirm('ยืนยันว่าลูกค้าหลุดผ่อนและคืน Account เป็นพร้อมขาย?\n\n' + summary + '\n\nระบบจะเก็บประวัติรับเงินเดิมไว้ และปิดรอบผ่อนนี้')) return;
      releaseButton.disabled = true;
      try {
        const {error:entryError} = await db.from('accounting_entries').update({
          sale_amount: received,
          opening_balance: received,
          cost_amount: originalCost,
          weekly_amount: 0,
          installment_due_weekday: null,
          notes: [entry.notes, 'ปิดรอบ: ลูกค้าหลุดผ่อน; เงินรับรวม ' + received + ' บาท; ต้นทุนสุทธิหลังหักเงินรับ ' + netCost + ' บาท; กำไร ' + profit + ' บาท'].filter(Boolean).join(' | '),
          source_account_id: null,
          updated_at: new Date().toISOString()
        }).eq('id', entry.id);
        if (entryError) throw entryError;
        const {error:accountError} = await db.from('accounts').update({status:'available',sale_started_at:null,updated_at:new Date().toISOString()}).eq('id',entry.source_account_id);
        if (accountError) throw accountError;
        const {error:financialError} = await db.from('account_private_financials').update({
          accounting_handoff_at:null,
          actual_sale_price:null,
          updated_at:new Date().toISOString()
        }).eq('account_id',entry.source_account_id);
        if (financialError) throw financialError;
        await loadData();
        setMessage('ปิดรอบผ่อนและคืน Account เป็นพร้อมขายแล้ว ประวัติรับเงินเดิมยังอยู่ครบ ♡');
      } catch (error) {
        setMessage('ดำเนินการหลุดผ่อนไม่สำเร็จ: ' + error.message, true);
        releaseButton.disabled = false;
      }
      return;
    }
    const editEntryButton = event.target.closest('[data-edit-entry]');
    if (editEntryButton) { openEntryEditDialog(editEntryButton.dataset.editEntry); return; }
    const editPaymentButton = event.target.closest('[data-edit-payment]');
    if (editPaymentButton) { openPaymentEditDialog(editPaymentButton.dataset.editPayment); return; }
    const recordButton = event.target.closest('[data-record-payment]');
    if (recordButton) { openPaymentDialog(recordButton.dataset.recordPayment); return; }
    const historyButton = event.target.closest('[data-toggle-history]');
    if (historyButton) {
      const panel = $('history-' + historyButton.dataset.toggleHistory);
      if (panel) panel.hidden = !panel.hidden;
      return;
    }
    const deleteButton = event.target.closest('[data-delete-payment]');
    if (deleteButton) {
      const payment = payments.find(item => item.id === deleteButton.dataset.deletePayment);
      if (!payment || !window.confirm('ลบรายการรับเงินนี้ใช่ไหม? ยอดคงเหลือจะถูกคำนวณใหม่')) return;
      deleteButton.disabled = true;
      try {
        const {error} = await db.from('accounting_payments').delete().eq('id', payment.id);
        if (error) throw error;
        await loadData();
        setMessage('ลบรายการรับเงินแล้ว และคำนวณยอดคงเหลือใหม่เรียบร้อย');
      } catch (error) {
        setMessage('ลบรายการไม่สำเร็จ: ' + error.message, true);
        deleteButton.disabled = false;
      }
    }
  });

  if (!db) {
    $('accountingLoginMessage').textContent = 'ยังไม่ได้ตั้งค่า Supabase ใน config.js';
  } else {
    db.auth.getSession().then(async ({data,error}) => {
      if (error) {
        $('accountingLoginMessage').textContent = 'ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ: ' + error.message;
        return;
      }
      if (data.session) {
        try { await requireAdmin(data.session.user); }
        catch (loadError) { setMessage('โหลดข้อมูลไม่สำเร็จ: ' + loadError.message, true); }
      }
    });
    db.auth.onAuthStateChange((event,session) => {
      if (event === 'SIGNED_OUT') {
        currentUser = null;
        $('accountingApp').hidden = true;
        $('accountingLogin').hidden = false;
      }
    });
  }
  showTab('overview');
})();