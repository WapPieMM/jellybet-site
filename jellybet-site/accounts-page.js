(() => {
  const $ = id => document.getElementById(id), cfg = window.JELLYBET_CONFIG || {};
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
  const db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PUBLIC_ACCOUNT_COLUMNS = 'id,title,price,status,image_url,description,created_at';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const PAGE_SIZE = 6;
  let accounts = [], activeStatus = 'available', visibleLimit = PAGE_SIZE;
  const statusNames = {available:'พร้อมขาย',installment:'ติดผ่อน',sold:'ขายแล้ว'};

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

  function setStatus(status) {
    if (!statusNames[status]) return;
    activeStatus = status;
    visibleLimit = PAGE_SIZE;
    document.querySelectorAll('[data-status-filter]').forEach(button => {
      const active = button.dataset.statusFilter === status;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
  }

  function render() {
    const grid = $('accountGrid');
    if (!grid) return;
    const counts = {available:0,installment:0,sold:0};
    accounts.forEach(a => { if (Object.prototype.hasOwnProperty.call(counts, a.status)) counts[a.status]++; });
    $('countAvailable').textContent = counts.available;
    $('countInstallment').textContent = counts.installment;
    $('countSold').textContent = counts.sold;
    $('accountCount').textContent = accounts.length + ' รายการทั้งหมด';
    const visible = accounts.filter(a => a.status === activeStatus);
    const paged = visible.slice(0, visibleLimit);
    grid.innerHTML = paged.length ? paged.map(a => {
      const sold = a.status === 'sold', installment = a.status === 'installment', label = statusNames[a.status] || 'พร้อมขาย', cls = sold ? 'sold' : installment ? 'installment' : 'available';
      const image = a.image_url ? '<img class="account-image" src="' + esc(a.image_url) + '" alt="' + esc(a.title || 'Account') + '" loading="lazy" decoding="async">' : '<div class="account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
      return '<article class="account-card card ' + (sold ? 'is-sold' : '') + '">' + image + '<div class="account-card-body"><div class="account-card-top"><span class="account-status ' + cls + '">' + label + '</span></div><h3>' + esc(a.title || 'Account') + '</h3><p class="account-description account-description-preview">' + esc(a.description || 'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ') + '</p><div class="account-card-bottom"><strong class="account-price">' + Number(a.price || 0).toLocaleString('th-TH', {maximumFractionDigits:2}) + ' <small>บาท</small></strong><a class="account-contact-button" href="/account/' + encodeURIComponent(a.id) + '">ดูเพิ่มเติม ↗</a></div></div></article>';
    }).join('') : '<div class="empty-state card account-empty"><span>୨୧</span><p>ยังไม่มีรายการในหมวด' + statusNames[activeStatus] + '</p><small>ลองเลือกสถานะอื่น หรือแวะกลับมาดูใหม่ได้ค่ะ ♡</small></div>';

    const moreWrap = $('accountsLoadMoreWrap');
    const moreBtn = $('accountsLoadMoreButton');
    if (moreWrap && moreBtn) {
      const remainingCount = visible.length - paged.length;
      moreWrap.hidden = remainingCount <= 0;
      if (remainingCount > 0) {
        moreBtn.textContent = 'ดูรายการ Account เพิ่มเติม (เหลืออีก ' + remainingCount + ' รายการ) ♡';
      }
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-status-filter]');
    if (button) { setStatus(button.dataset.statusFilter); return; }
    if (event.target.closest('#accountsLoadMoreButton')) {
      visibleLimit += PAGE_SIZE;
      render();
    }
  });

  if ('IntersectionObserver' in window) {
    document.addEventListener('DOMContentLoaded', () => {
      const moreBtn = $('accountsLoadMoreButton');
      if (!moreBtn) return;
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting) && !$('accountsLoadMoreWrap')?.hidden) {
          visibleLimit += PAGE_SIZE;
          render();
        }
      }, {rootMargin: '180px'});
      io.observe(moreBtn);
    }, {once: true});
  }

  async function load() {
    if (!db) {
      $('accountGrid').innerHTML = '<div class="empty-state card"><p>ยังไม่ได้ตั้งค่าฐานข้อมูล</p><a href="/">กลับหน้าร้าน</a></div>';
      return;
    }
    try {
      const cachedAccounts = readCache('jellybet_cache_public_accounts_v1');
      const cachedSettings = readCache('jellybet_cache_settings_v1');
      if (cachedAccounts && cachedSettings) {
        if (cachedSettings.shop_name) $('accountsShopName').textContent = cachedSettings.shop_name;
        accounts = cachedAccounts;
        render();
        return;
      }
      const [accountsRes, settingsRes] = await Promise.all([
        cachedAccounts ? Promise.resolve({data: cachedAccounts, error: null}) : db.from('accounts').select(PUBLIC_ACCOUNT_COLUMNS).order('created_at', {ascending:false}),
        cachedSettings ? Promise.resolve({data: cachedSettings, error: null}) : db.from('site_settings').select('shop_name,line').eq('id', 1).maybeSingle()
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (settingsRes.data?.shop_name) $('accountsShopName').textContent = settingsRes.data.shop_name;
      accounts = accountsRes.data || [];
      if (!cachedAccounts) writeCache('jellybet_cache_public_accounts_v1', accounts);
      render();
    } catch (e) {
      console.error(e);
      $('accountGrid').innerHTML = '<div class="empty-state card"><p>โหลดรายการ Account ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', load, {once: true});
})();