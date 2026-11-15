(() => {
  const $ = id => document.getElementById(id), cfg = window.JELLYBET_CONFIG || {};
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
  const db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DETAIL_ACCOUNT_COLUMNS = 'id,title,price,status,image_url,description,installment_details';
  const CACHE_TTL_MS = 5 * 60 * 1000;

  function readCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - Number(parsed.ts || 0) > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch { return null; }
  }

  function writeCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ts: Date.now(), data})); } catch {}
  }

  function formatAccountDescription(value) {
    return esc(value).split(/\n/).map(line => {
      const match = line.match(/^\s*\*(.+?)\*\s*$/);
      if (match) return '<div class="account-highlight-line"><span>' + match[1] + '</span></div>';
      const field = line.match(/^(ล็อกอินด้วย|อีเมล|เบอร์):\s*(.*)$/);
      if (field) return '<span class="account-detail-field-label">' + field[1] + '</span> ' + field[2];
      return line || '';
    }).join('<br>');
  }

  const lineUrl = raw => {
    const v = (raw || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return 'https://line.me/R/ti/p/~' + encodeURIComponent(v.replace(/^@/, ''));
  };

  const installmentPlanMarker = '[[JELLYBET_INSTALLMENT_PLANS]]';
  function renderInstallmentDetails(value) {
    const raw = String(value || '');
    if (!raw) return '';
    if (raw.startsWith(installmentPlanMarker)) {
      const rest = raw.slice(installmentPlanMarker.length), end = rest.indexOf(']');
      try {
        const plans = JSON.parse(end >= 0 ? rest.slice(0, end + 1) : rest);
        const note = end >= 0 ? rest.slice(end + 1).trim().replace(/^\n/, '') : '';
        const cards = plans.map(plan => {
          const down = Number(plan.down) || 0, installment = Number(plan.total) || 0, grandTotal = down + installment;
          return '<article class="account-installment-option"><span class="account-installment-option-title">ผ่อน ' + Number(plan.months || 0) + ' เดือน</span><p>= วางดาวน์ ' + down.toLocaleString('th-TH') + '฿ ผ่อนต่ออีก ' + installment.toLocaleString('th-TH') + '฿<br>ส่งยอดงวดละ ' + Number(plan.weekly || 0).toLocaleString('th-TH') + ' ฿<br><strong class="account-installment-grand-total">ยอดรวม (ดาวน์ + ผ่อนต่อ) = ' + grandTotal.toLocaleString('th-TH') + ' ฿</strong></p></article>';
        }).join('');
        return '<section class="account-installment-details"><h2>รายละเอียดการผ่อน ≡</h2><div class="account-installment-options">' + cards + '</div>' + (note ? '<p class="account-installment-note">' + formatAccountDescription(note) + '</p>' : '') + '</section>';
      } catch (error) { console.warn('Could not parse installment plans', error); }
    }
    return '<section class="account-installment-details"><h2>รายละเอียดการผ่อน ≡</h2><p>' + formatAccountDescription(raw) + '</p></section>';
  }

  async function load() {
    const content = $('accountPageContent'), id = decodeURIComponent(location.pathname.replace(/\/$/, '').split('/').pop() || '');
    if (!db) {
      content.innerHTML = '<div class="empty-state card"><p>ยังไม่ได้ตั้งค่าฐานข้อมูลค่ะ</p><a class="account-contact-button" href="/">กลับหน้าร้าน</a></div>';
      return;
    }
    try {
      const detailCacheKey = 'jellybet_cache_account_detail_v1_' + id;
      const cachedAccount = readCache(detailCacheKey);
      const cachedSettings = readCache('jellybet_cache_settings_v1');

      const [accountRes, settingsRes] = await Promise.all([
        cachedAccount ? Promise.resolve({data: cachedAccount, error: null}) : db.from('accounts').select(DETAIL_ACCOUNT_COLUMNS).eq('id', id).maybeSingle(),
        cachedSettings ? Promise.resolve({data: cachedSettings, error: null}) : db.from('site_settings').select('shop_name,line').eq('id', 1).maybeSingle()
      ]);

      if (settingsRes.error) throw settingsRes.error;
      const settings = settingsRes.data;
      if (settings?.shop_name) $('accountShopName').textContent = settings.shop_name;
      if (accountRes.error) throw accountRes.error;
      const account = accountRes.data;
      if (!account) {
        content.innerHTML = '<div class="empty-state card"><span>୨୧</span><p>ไม่พบ Account รายการนี้</p><a class="account-contact-button" href="/">กลับไปดูรายการทั้งหมด</a></div>';
        return;
      }
      if (!cachedAccount) writeCache(detailCacheKey, account);
      const sold = account.status === 'sold', installment = account.status === 'installment', contact = lineUrl(settings?.line);
      const image = account.image_url ? '<img class="account-detail-image" src="' + esc(account.image_url) + '" alt="' + esc(account.title || 'Account') + '" loading="lazy" decoding="async">' : '<div class="account-detail-image account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
      const installmentHtml = renderInstallmentDetails(account.installment_details || '');
      content.innerHTML = '<article class="account-detail-card card"><div class="account-detail-media">' + image + '</div><div class="account-detail-content"><span class="account-status ' + (sold ? 'sold' : installment ? 'installment' : 'available') + '">' + (sold ? 'ขายแล้ว' : installment ? 'ติดผ่อน' : 'พร้อมขาย') + '</span><h1>' + esc(account.title || 'Account') + '</h1><div class="account-detail-description">' + formatAccountDescription(account.description || 'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ') + '</div>' + installmentHtml + '<div class="account-detail-footer"><strong class="account-price">' + Number(account.price || 0).toLocaleString('th-TH', {maximumFractionDigits:2}) + ' <small>บาท</small></strong>' + (sold ? '<span class="sold-note">รายการนี้ขายแล้ว ♡</span>' : (contact ? '<a class="account-contact-button" href="' + esc(contact) + '" target="_blank" rel="noopener noreferrer">สนใจรายการนี้ ↗</a>' : '<a class="account-contact-button" href="/#contact">สนใจรายการนี้ ↗</a>')) + '<a class="account-menu-link" href="/accounts">← กลับไปหน้า Account เพื่อเลือกดูไอดีอื่น</a></div></div></article>';
      document.title = (account.title || 'รายละเอียด Account') + ' ♡ jellybet';
    } catch (err) {
      console.error(err);
      content.innerHTML = '<div class="empty-state card"><p>โหลดรายละเอียดไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ</p><a class="account-contact-button" href="/">กลับหน้าร้าน</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', load, {once: true});
})();