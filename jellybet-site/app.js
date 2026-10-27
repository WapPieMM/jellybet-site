(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.JELLYBET_CONFIG || {};
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
  const db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const defaultSettings = { id: 1, shop_name: 'jellybet', intro: 'ยินดีต้อนรับสู่หน้ารวมเครดิตและช่องทางติดต่อของร้านนะคะ ขอบคุณที่ไว้วางใจและสนับสนุนกันเสมอ ♡', handle: 'a little place made with love', status: 'open', line: '', x: '', instagram: '', facebook: '', avatar_url: '', cover_url: '', theme_preset:'coquette', theme_bg:'#fffaf4', theme_card:'#fffdfb', theme_primary:'#d994ad', theme_soft:'#fff0f5', theme_text:'#59434b' };
  let settings = { ...defaultSettings }, reviews = [], accounts = [], currentUser = null;
  const contactDefs = [
    {key:'line',label:'LINE',icon:'♡',hint:'พูดคุยและสอบถามข้อมูล'},
    {key:'x',label:'X / Twitter',icon:'𝕏',hint:'ติดตามข่าวสารของร้าน'},
    {key:'instagram',label:'Instagram',icon:'◎',hint:'ดูอัปเดตและผลงานของร้าน'},
    {key:'facebook',label:'Facebook',icon:'f',hint:'ติดต่อผ่านเพจร้าน'}
  ];
  const toast = (msg) => { const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600); };
  const setMessage = (id,msg,error=false) => { const el=$(id); if(!el)return; el.textContent=msg; el.classList.toggle('error',!!error); };
  const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isConfigured = () => !!db;
  const linkFor = (key, raw) => {
    const value = (raw || '').trim(); if(!value) return '';
    if(/^https?:\/\//i.test(value)) return value;
    const username=value.replace(/^@/,'');
    if(key==='line') return `https://line.me/R/ti/p/~${encodeURIComponent(username)}`;
    if(key==='x') return `https://x.com/${encodeURIComponent(username)}`;
    if(key==='instagram') return `https://www.instagram.com/${encodeURIComponent(username)}/`;
    return '';
  };
  const themePresets={
    coquette:{theme_preset:'coquette',theme_bg:'#fffaf4',theme_card:'#fffdfb',theme_primary:'#d994ad',theme_soft:'#fff0f5',theme_text:'#59434b'},
    pastel:{theme_preset:'pastel',theme_bg:'#fff7fb',theme_card:'#ffffff',theme_primary:'#e6a6c0',theme_soft:'#ffeaf3',theme_text:'#604653'},
    rose:{theme_preset:'rose',theme_bg:'#fdf4f5',theme_card:'#fffafa',theme_primary:'#c77f98',theme_soft:'#f7e0e7',theme_text:'#5b3f49'},
    cream:{theme_preset:'cream',theme_bg:'#fff8e9',theme_card:'#fffdf5',theme_primary:'#c99a9e',theme_soft:'#f8e9e5',theme_text:'#5b4b45'}
  };
  function applyTheme(s){document.body.style.backgroundImage='none';document.body.style.backgroundColor=s.theme_bg||'#fffaf4';const root=document.documentElement;root.style.setProperty('--page-bg',s.theme_bg||'#fffaf4');root.style.setProperty('--card-bg',s.theme_card||'#fffdfb');root.style.setProperty('--pink-strong',s.theme_primary||'#d994ad');root.style.setProperty('--pink',s.theme_soft||'#fff0f5');root.style.setProperty('--rose',s.theme_soft||'#fff0f5');root.style.setProperty('--ink',s.theme_text||'#59434b');root.style.setProperty('--paper',s.theme_bg||'#fffaf4');}
  function updateThemePreview(){const el=$('themePreview');if(!el)return;const bg=$('themeBg')?.value||'#fffaf4',card=$('themeCard')?.value||'#fffdfb',primary=$('themePrimary')?.value||'#d994ad',soft=$('themeSoft')?.value||'#fff0f5',ink=$('themeText')?.value||'#59434b';el.style.background=bg;el.style.color=ink;el.querySelector('span').style.background=card;el.querySelector('button').style.background=primary;el.querySelector('button').style.color='#fff';el.style.borderColor=soft;}
  function setThemeInputs(theme){Object.entries({themePreset:theme.theme_preset,themeBg:theme.theme_bg,themeCard:theme.theme_card,themePrimary:theme.theme_primary,themeSoft:theme.theme_soft,themeText:theme.theme_text}).forEach(([id,v])=>{if($(id)&&v)$(id).value=v;});updateThemePreview();}
  function renderSettings(){
    applyTheme(settings);
    const siteName = (settings.shop_name || 'jellybet').trim() || 'jellybet';
    document.title = `${siteName} ♡ เครดิตและช่องทางติดต่อ`;
    const metaDescription = $('siteMetaDescription');
    if (metaDescription) metaDescription.setAttribute('content', `${siteName} — เครดิตร้าน รีวิว และช่องทางติดต่อ`);
    const headerName = $('headerSiteName'); if (headerName) headerName.textContent = siteName;
    const brand = $('siteBrand'); if (brand) brand.setAttribute('aria-label', `${siteName} หน้าแรก`);
    const moodboard = $('siteMoodboard'); if (moodboard) moodboard.setAttribute('aria-label', `${siteName} aesthetic`);
    const moodName = $('moodboardSiteName'); if (moodName) moodName.textContent = `♡ ${siteName} ♡`;
    const noticeName = $('noticeSiteName'); if (noticeName) noticeName.textContent = siteName;
    const footerName = $('footerSiteName'); if (footerName) footerName.textContent = siteName;
    const adminName = $('adminSiteName'); if (adminName) adminName.textContent = siteName;
    const adminEyebrow = $('adminEyebrow'); if (adminEyebrow) adminEyebrow.textContent = `${siteName.toLocaleUpperCase()} CONTROL ROOM`;
    const adminTitle = $('adminTitle'); if (adminTitle) adminTitle.textContent = `หลังบ้านร้าน ${siteName}`;
    ['themePreset','themeBg','themeCard','themePrimary','themeSoft','themeText'].forEach((id)=>{const el=$(id); if(!el)return; const key={themePreset:'theme_preset',themeBg:'theme_bg',themeCard:'theme_card',themePrimary:'theme_primary',themeSoft:'theme_soft',themeText:'theme_text'}[id]; el.value=settings[key]||el.value;});
    updateThemePreview();
    $('heroTitle').innerHTML = `${settings.avatar_url ? `<img class=\"shop-avatar\" src=\"${escapeHtml(settings.avatar_url)}\" alt=\"รูปโปรไฟล์ร้าน\">` : ''}${escapeHtml(settings.shop_name || 'jellybet')} <span>♡</span>`;
    $('heroHandle').textContent = settings.handle || 'a little place made with love';
    $('heroIntro').textContent = settings.intro || defaultSettings.intro;
    const hero=$('hero'); if(hero){hero.style.backgroundImage=settings.cover_url ? `linear-gradient(90deg,rgba(255,250,248,.93),rgba(255,245,249,.78)),url(\"${settings.cover_url}\")` : ''; hero.style.backgroundSize='cover';hero.style.backgroundPosition='center';}
    const avatar=$('shopAvatarPreview'); if(avatar){avatar.src=settings.avatar_url||'';avatar.hidden=!settings.avatar_url;} const cover=$('shopCoverPreview'); if(cover){cover.src=settings.cover_url||'';cover.hidden=!settings.cover_url;}
    const pill=$('statusPill'); pill.classList.toggle('is-open',settings.status==='open'); pill.classList.toggle('is-closed',settings.status!=='open');
    pill.lastElementChild.textContent = settings.status==='open' ? 'เปิดให้บริการ' : 'ปิดให้บริการ';
    $('contactList').innerHTML = contactDefs.map(c=>{
      const raw=(settings[c.key]||'').trim(); if(!raw) return '';
      const href=linkFor(c.key,raw); const content=`<span class="contact-icon">${c.icon}</span><span class="contact-copy"><strong>${c.label}</strong><small>${escapeHtml(raw)}</small></span><span class="contact-arrow">↗</span>`;
      return href ? `<a class="contact-row" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${content}</a>` : `<div class="contact-row">${content}</div>`;
    }).filter(Boolean).join('') || '<div class="empty-state"><span>♡</span><p>ยังไม่ได้เพิ่มช่องทางติดต่อ</p><small>เจ้าของร้านสามารถเพิ่มข้อมูลได้จากหลังบ้าน</small></div>';
    $('editShopName').value=settings.shop_name||''; $('editIntro').value=settings.intro||''; $('editHandle').value=settings.handle||''; $('editStatus').value=settings.status||'open';
    $('editLine').value=settings.line||''; $('editX').value=settings.x||''; $('editInstagram').value=settings.instagram||''; $('editFacebook').value=settings.facebook||'';
  }
  function renderAccounts(){
    const grid=$('accountGrid'); if(!grid)return;
    const available=accounts.filter(a=>a.status==='available');
    $('accountCount').textContent=`${available.length} พร้อมขาย`;
    const contactHref=linkFor('line',settings.line)||'#contact';
    grid.innerHTML=accounts.length ? accounts.map(a=>{
      const sold=a.status==='sold';
      const image=a.image_url ? `<img class="account-image" src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.title)}" loading="lazy">` : '<div class="account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
      return `<article class="account-card card ${sold?'is-sold':''}">${image}<div class="account-card-body"><div class="account-card-top"><span class="account-status ${sold?'sold':'available'}">${sold?'ขายแล้ว':'พร้อมขาย'}</span></div><h3>${escapeHtml(a.title||'Account')}</h3><p class="account-description">${escapeHtml(a.description||'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ')}</p><div class="account-card-bottom"><strong class="account-price">${Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})} <small>บาท</small></strong>${sold?'<span class="sold-note">รายการนี้ขายแล้ว ♡</span>':`<a class="account-contact-button" href="${escapeHtml(contactHref)}" ${contactHref==='#contact'?'':'target="_blank" rel="noopener noreferrer"'}>สนใจรายการนี้ ↗</a>`}</div></div></article>`;
    }).join('') : '<div class="empty-state card account-empty"><span>୨୧</span><p>ยังไม่มี Account ลงขายในตอนนี้</p><small>แวะกลับมาดูรายการใหม่ได้อีกนะคะ ♡</small></div>';
    renderAdminAccounts();
  }
  async function loadPublicAccounts(){
    if(!db){accounts=[];renderAccounts();return;}
    try{const {data,error}=await db.from('accounts').select('*').order('created_at',{ascending:false});if(error)throw error;accounts=data||[];renderAccounts();}
    catch(err){console.warn('Account listing unavailable until database schema is applied:',err);accounts=[];renderAccounts();}
  }
  function renderAdminAccounts(){
    const list=$('adminAccountList');if(!list)return;
    if(!currentUser){list.innerHTML='';return;}
    list.innerHTML=accounts.length?accounts.map(a=>`<div class="admin-review-item admin-account-item"><div class="admin-account-heading">${a.image_url?`<img src="${escapeHtml(a.image_url)}" alt="" loading="lazy">`:'<span class="admin-account-thumb">୨୧</span>'}<div><strong>${escapeHtml(a.title||'Account')}</strong><p>${Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})} บาท · ${a.status==='sold'?'ขายแล้ว':'พร้อมขาย'}</p></div></div><p>${escapeHtml(a.description||'ไม่มีรายละเอียด')}</p><div class="admin-item-actions"><button data-edit-account="${escapeHtml(a.id)}">แก้ไข</button><button data-toggle-account="${escapeHtml(a.id)}">${a.status==='sold'?'ตั้งเป็นพร้อมขาย':'ตั้งเป็นขายแล้ว'}</button><button class="danger" data-delete-account="${escapeHtml(a.id)}">ลบ</button></div></div>`).join(''):'<div class="empty-state"><p>ยังไม่มี Account เพิ่มรายการแรกจากแบบฟอร์มด้านบนได้เลยค่ะ ♡</p></div>';
  }
  async function refreshAccounts(){
    if(!db)return;
    const {data,error}=await db.from('accounts').select('*').order('created_at',{ascending:false});
    if(error){setMessage('accountMessage','โหลดรายการ Account ไม่สำเร็จ: '+error.message,true);return;}
    accounts=data||[];renderAccounts();
  }
  function resetAccountForm(){
    $('accountForm').reset();$('editAccountId').value='';$('accountStatus').value='available';
    $('accountFormTitle').textContent='เพิ่ม Account พร้อมขาย';$('cancelAccountEdit').hidden=true;
    const img=$('accountImagePreview');if(img){img.hidden=true;img.removeAttribute('src');}
    setMessage('accountMessage','');
  }
  function renderReviews(){
    const published=reviews.filter(r=>r.published);
    $('statReviews').textContent=published.length; $('reviewCount').textContent=`${published.length} รีวิว`;
    $('statRating').textContent=published.length ? (published.reduce((n,r)=>n+Number(r.rating||5),0)/published.length).toFixed(1) : '—';
    $('reviewList').innerHTML=published.length ? published.map(r=>`<article class="review-card card"><div class="review-top"><div class="review-person"><span class="avatar">♡</span><div><strong>${escapeHtml(r.customer_name||'ลูกค้าท่านหนึ่ง')}</strong><span class="review-date">${r.created_at?new Date(r.created_at).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}):'ขอบคุณที่ไว้วางใจค่ะ'}</span></div></div><span class="stars" aria-label="${Number(r.rating||5)} จาก 5 ดาว">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating||5))))}${'☆'.repeat(5-Math.max(1,Math.min(5,Number(r.rating||5))))}</span></div><p class="review-text">${escapeHtml(r.review_text||'')}</p>${r.image_url?`<a href="${escapeHtml(r.image_url)}" target="_blank" rel="noopener noreferrer"><img class="review-image" src="${escapeHtml(r.image_url)}" alt="ภาพประกอบรีวิว" loading="lazy" referrerpolicy="no-referrer"></a>`:''}</article>`).join('') : '<div class="empty-state card"><span>♡</span><p>ยังไม่มีรีวิวที่แสดงในตอนนี้</p><small>ขอบคุณที่แวะมาเยี่ยมชมร้านนะคะ</small></div>';
    renderAdminReviews();
  }
  async function loadPublic(){
    if(!db){ settings={...defaultSettings}; reviews=[]; accounts=[]; renderSettings(); renderReviews(); renderAccounts(); $('setupHint').textContent='เว็บแสดงตัวอย่างได้แล้ว หากต้องการบันทึกข้อมูลจริงและใช้หลังบ้าน ให้ตั้งค่า Supabase ตาม README.md'; return; }
    try{
      const [{data:setting,error:sErr},{data:reviewData,error:rErr}]=await Promise.all([
        db.from('site_settings').select('*').eq('id',1).maybeSingle(),
        db.from('reviews').select('*').eq('published',true).order('created_at',{ascending:false})
      ]);
      if(sErr) throw sErr; if(rErr) throw rErr;
      if(setting) settings={...defaultSettings,...setting};
      reviews=reviewData||[]; renderSettings(); renderReviews();
    }catch(e){console.error(e);renderSettings();renderReviews();toast('โหลดข้อมูลไม่สำเร็จ โปรดตรวจสอบการตั้งค่า Supabase');}
  }
  function openModal(){ $('adminModal').hidden=false; document.body.style.overflow='hidden'; if(!configured){$('setupHint').hidden=false; $('loginMessage').textContent='';} else {$('setupHint').hidden=true;} }
  function closeModal(){ $('adminModal').hidden=true; document.body.style.overflow=''; }
  function showDashboard(){ $('adminLoginView').hidden=true; $('adminDashboard').hidden=false; renderSettings(); renderAdminReviews(); }
  function showLogin(){ $('adminLoginView').hidden=false; $('adminDashboard').hidden=true; }
  function renderAdminReviews(){
    const list=$('adminReviewList'); if(!list)return;
    if(!currentUser){list.innerHTML='';return;}
    list.innerHTML=reviews.length ? reviews.map(r=>`<div class="admin-review-item"><strong>${escapeHtml(r.customer_name||'ลูกค้าท่านหนึ่ง')} · ${'★'.repeat(Number(r.rating||5))}</strong><p>${escapeHtml(r.review_text||'')}</p><small>${r.published?'แสดงบนหน้าเว็บ':'ซ่อนอยู่'} · ${r.created_at?new Date(r.created_at).toLocaleDateString('th-TH'):''}</small><div class="admin-item-actions"><button data-edit-review="${escapeHtml(r.id)}">แก้ไข</button><button data-toggle-review="${escapeHtml(r.id)}">${r.published?'ซ่อนรีวิว':'เผยแพร่'}</button><button class="danger" data-delete-review="${escapeHtml(r.id)}">ลบ</button></div></div>`).join('') : '<div class="empty-state"><p>ยังไม่มีรีวิว เพิ่มรีวิวแรกได้จากแบบฟอร์มด้านบน</p></div>';
  }
  $('accountForm')?.addEventListener('submit',async e=>{
    e.preventDefault();if(!db){setMessage('accountMessage','ต้องเชื่อมต่อ Supabase ก่อนบันทึกรายการ',true);return;}
    if(!currentUser){setMessage('accountMessage','กรุณาเข้าสู่ระบบเจ้าของร้านก่อน',true);return;}
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');btn.disabled=true;setMessage('accountMessage','กำลังบันทึก Account…');
    try{
      const id=$('editAccountId').value,existing=accounts.find(a=>String(a.id)===id);
      let image_url=existing?.image_url||'';
      const file=$('accountImageFile').files[0];if(file)image_url=await uploadImage(file,'account-images','admin');
      const payload={title:$('accountTitle').value.trim(),description:$('accountDescription').value.trim(),price:Number($('accountPrice').value),status:$('accountStatus').value,image_url,updated_at:new Date().toISOString()};
      const result=id?await db.from('accounts').update(payload).eq('id',id):await db.from('accounts').insert(payload);
      if(result.error)throw result.error;
      resetAccountForm();await refreshAccounts();setMessage('accountMessage','บันทึกรายการเรียบร้อยแล้ว ♡');toast('บันทึก Account แล้ว ♡');
    }catch(err){setMessage('accountMessage','บันทึกไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  $('cancelAccountEdit')?.addEventListener('click',resetAccountForm);
  $('accountImageFile')?.addEventListener('change',()=>previewFile($('accountImageFile'),$('accountImagePreview')));
  $('adminAccountList')?.addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit-account]'),toggle=e.target.closest('[data-toggle-account]'),del=e.target.closest('[data-delete-account]');
    if(edit){const a=accounts.find(x=>String(x.id)===edit.dataset.editAccount);if(!a)return;$('editAccountId').value=a.id;$('accountTitle').value=a.title||'';$('accountDescription').value=a.description||'';$('accountPrice').value=a.price??'';$('accountStatus').value=a.status||'available';const img=$('accountImagePreview');if(img){img.src=a.image_url||'';img.hidden=!a.image_url;}$('accountFormTitle').textContent='แก้ไข Account';$('cancelAccountEdit').hidden=false;$('accountForm').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(toggle){const a=accounts.find(x=>String(x.id)===toggle.dataset.toggleAccount);if(!a)return;const {error}=await db.from('accounts').update({status:a.status==='sold'?'available':'sold',updated_at:new Date().toISOString()}).eq('id',a.id);if(error){toast('เปลี่ยนสถานะ Account ไม่สำเร็จ: '+error.message);return;}await refreshAccounts();toast('อัปเดตสถานะ Account แล้ว ♡');return;}
    if(del){const a=accounts.find(x=>String(x.id)===del.dataset.deleteAccount);if(!a||!confirm('ต้องการลบ Account รายการนี้ใช่ไหม?'))return;const {error}=await db.from('accounts').delete().eq('id',a.id);if(error){toast('ลบ Account ไม่สำเร็จ: '+error.message);return;}await refreshAccounts();toast('ลบ Account แล้ว');}
  });
  async function refreshAdminReviews(){
    if(!db)return;
    const {data,error}=await db.from('reviews').select('*').order('created_at',{ascending:false});
    if(error){setMessage('reviewMessage','โหลดรีวิวไม่สำเร็จ: '+error.message,true);return;}
    reviews=data||[]; renderReviews();
  }
  $('heartButton').addEventListener('click',()=>{const b=$('heartButton');b.classList.toggle('saved');b.textContent=b.classList.contains('saved')?'♥':'♡';toast(b.classList.contains('saved')?'เพิ่มหัวใจให้ jellybet แล้ว ♡':'ยกเลิกหัวใจแล้ว');});
  $('openAdmin').addEventListener('click',openModal); $('closeAdmin').addEventListener('click',closeModal);
  $('adminModal').addEventListener('click',e=>{if(e.target===$('adminModal'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('adminModal').hidden)closeModal();});
  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault(); if(!db){setMessage('loginMessage','ยังไม่ได้ตั้งค่า Supabase โปรดดู README.md',true);return;}
    const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('loginMessage','กำลังเข้าสู่ระบบ…');
    try{const {data,error}=await db.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});if(error)throw error;currentUser=data.user;showDashboard();await loadAdminSettings();await refreshAdminReviews();setMessage('loginMessage','');}
    catch(err){setMessage('loginMessage','เข้าสู่ระบบไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  async function loadAdminSettings(){if(!db)return;const {data,error}=await db.from('site_settings').select('*').eq('id',1).maybeSingle();if(error){toast('อ่านข้อมูลหลังบ้านไม่สำเร็จ');return;}if(data){settings={...defaultSettings,...data};renderSettings();}}
  $('settingsForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!db)return;const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('settingsMessage','กำลังบันทึก…');
    try{
    let avatar_url=settings.avatar_url||'', cover_url=settings.cover_url||'';
    if($('shopAvatarFile').files[0]) avatar_url=await uploadImage($('shopAvatarFile').files[0],'shop-images','admin');
    if($('shopCoverFile').files[0]) cover_url=await uploadImage($('shopCoverFile').files[0],'shop-images','admin');
    const payload={id:1,avatar_url,cover_url,shop_name:$('editShopName').value.trim(),intro:$('editIntro').value.trim(),handle:$('editHandle').value.trim(),status:$('editStatus').value,line:$('editLine').value.trim(),x:$('editX').value.trim(),instagram:$('editInstagram').value.trim(),facebook:$('editFacebook').value.trim(),theme_preset:$('themePreset').value,theme_bg:$('themeBg').value,theme_card:$('themeCard').value,theme_primary:$('themePrimary').value,theme_soft:$('themeSoft').value,theme_text:$('themeText').value,updated_at:new Date().toISOString()};
    const {error}=await db.from('site_settings').upsert(payload,{onConflict:'id'});if(error)throw error;settings={...settings,...payload};renderSettings();$('shopAvatarFile').value='';$('shopCoverFile').value='';setMessage('settingsMessage','บันทึกข้อมูลเรียบร้อยแล้ว ♡');toast('บันทึกข้อมูลร้านแล้ว ♡');}
    catch(err){setMessage('settingsMessage','บันทึกไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  async function uploadImage(file,bucket,folder){
    if(!file)return null;
    if(!file.type.startsWith('image/'))throw new Error('กรุณาเลือกไฟล์รูปภาพ');
    if(file.size>5*1024*1024)throw new Error('ไฟล์รูปต้องมีขนาดไม่เกิน 5 MB');
    if(!db)throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${folder}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=db.storage.from(bucket).getPublicUrl(path); return data.publicUrl;
  }
  const customerFile=$('customerReviewImage');
  customerFile?.addEventListener('change',()=>previewFile(customerFile,$('customerReviewImagePreview')));
  function previewFile(input,img){const file=input?.files?.[0];if(!img)return;if(file){img.src=URL.createObjectURL(file);img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}}
  $('customerReviewForm').addEventListener('submit',async e=>{
    e.preventDefault(); if(!db){setMessage('customerReviewMessage','ระบบยังไม่พร้อมรับรีวิว กรุณาลองใหม่ภายหลัง',true);return;}
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');btn.disabled=true;setMessage('customerReviewMessage','กำลังส่งรีวิว…');
    try{
      let image_url=null;const file=$('customerReviewImage').files[0];if(file)image_url=await uploadImage(file,'review-images','customer');
      const payload={customer_name:$('customerReviewName').value.trim(),rating:Number($('customerReviewRating').value),review_text:$('customerReviewText').value.trim(),image_url,published:false};
      const {error}=await db.from('reviews').insert(payload);if(error)throw error;
      form.reset();const prev=$('customerReviewImagePreview');if(prev){prev.hidden=true;prev.removeAttribute('src');}
      setMessage('customerReviewMessage','ส่งรีวิวแล้วค่ะ ♡ รอเจ้าของร้านตรวจสอบก่อนแสดงบนเว็บไซต์นะคะ');toast('ส่งรีวิวเรียบร้อยแล้ว ♡');
    }catch(err){setMessage('customerReviewMessage','ส่งรีวิวไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  $('shopAvatarFile')?.addEventListener('change',()=>previewFile($('shopAvatarFile'),$('shopAvatarPreview')));
  $('shopCoverFile')?.addEventListener('change',()=>previewFile($('shopCoverFile'),$('shopCoverPreview')));
  $('reviewImageFile')?.addEventListener('change',()=>previewFile($('reviewImageFile'),$('reviewImagePreview')));
  $('reviewForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!db)return;const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('reviewMessage','กำลังบันทึก…');
    const id=$('editReviewId').value;const payload={customer_name:$('reviewCustomer').value.trim(),rating:Number($('reviewRating').value),review_text:$('reviewText').value.trim(),image_url:reviews.find(r=>String(r.id)===id)?.image_url||null,published:$('reviewPublished').checked};
    try{const imageFile=$('reviewImageFile').files[0];if(imageFile)payload.image_url=await uploadImage(imageFile,'review-images','customer');let result=id?await db.from('reviews').update(payload).eq('id',id):await db.from('reviews').insert(payload);if(result.error)throw result.error;setMessage('reviewMessage','บันทึกรีวิวเรียบร้อยแล้ว ♡');$('reviewForm').reset();if($('reviewImagePreview')){$('reviewImagePreview').hidden=true;$('reviewImagePreview').removeAttribute('src');}$('editReviewId').value='';$('reviewRating').value='5';$('reviewPublished').checked=true;$('reviewFormTitle').textContent='เพิ่มรีวิวใหม่';$('cancelReviewEdit').hidden=true;await refreshAdminReviews();toast('บันทึกรีวิวแล้ว ♡');}
    catch(err){setMessage('reviewMessage','บันทึกไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  $('cancelReviewEdit').addEventListener('click',()=>{$('reviewForm').reset();if($('reviewImagePreview')){$('reviewImagePreview').hidden=true;$('reviewImagePreview').removeAttribute('src');}$('editReviewId').value='';$('reviewRating').value='5';$('reviewPublished').checked=true;$('reviewFormTitle').textContent='เพิ่มรีวิวใหม่';$('cancelReviewEdit').hidden=true;setMessage('reviewMessage','');});
  $('adminReviewList').addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit-review]'),toggle=e.target.closest('[data-toggle-review]'),del=e.target.closest('[data-delete-review]');
    if(edit){const r=reviews.find(x=>String(x.id)===edit.dataset.editReview);if(!r)return;$('editReviewId').value=r.id;$('reviewCustomer').value=r.customer_name||'';$('reviewRating').value=String(r.rating||5);$('reviewText').value=r.review_text||'';if($('reviewImagePreview')){ $('reviewImagePreview').src=r.image_url||''; $('reviewImagePreview').hidden=!r.image_url; }$('reviewPublished').checked=!!r.published;$('reviewFormTitle').textContent='แก้ไขรีวิว';$('cancelReviewEdit').hidden=false;$('reviewForm').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(toggle){const r=reviews.find(x=>String(x.id)===toggle.dataset.toggleReview);if(!r)return;const {error}=await db.from('reviews').update({published:!r.published}).eq('id',r.id);if(error){toast('เปลี่ยนสถานะไม่สำเร็จ');return;}await refreshAdminReviews();toast('อัปเดตสถานะรีวิวแล้ว');return;}
    if(del){const r=reviews.find(x=>String(x.id)===del.dataset.deleteReview);if(!r||!confirm('ต้องการลบรีวิวนี้ใช่ไหม? การลบไม่สามารถย้อนกลับได้'))return;const {error}=await db.from('reviews').delete().eq('id',r.id);if(error){toast('ลบรีวิวไม่สำเร็จ');return;}await refreshAdminReviews();toast('ลบรีวิวแล้ว');}
  });
  $('themePreset')?.addEventListener('change',()=>{const preset=themePresets[$('themePreset').value];if(preset)setThemeInputs(preset);else updateThemePreview();});
  ['themeBg','themeCard','themePrimary','themeSoft','themeText'].forEach(id=>$(id)?.addEventListener('input',()=>{if($('themePreset'))$('themePreset').value='custom';updateThemePreview();}));
  $('resetTheme')?.addEventListener('click',()=>{const preset=themePresets[$('themePreset').value]||themePresets.coquette;setThemeInputs(preset);toast('แสดงตัวอย่างสีแล้ว อย่าลืมกดบันทึกนะคะ');});
  $('themeForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!db){setMessage('themeMessage','ต้องเชื่อมต่อ Supabase ก่อนบันทึกธีม',true);return;}if(!currentUser){setMessage('themeMessage','กรุณาเข้าสู่ระบบเจ้าของร้านก่อน',true);return;}const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('themeMessage','กำลังบันทึกธีม…');try{const payload={id:1,theme_preset:$('themePreset').value,theme_bg:$('themeBg').value,theme_card:$('themeCard').value,theme_primary:$('themePrimary').value,theme_soft:$('themeSoft').value,theme_text:$('themeText').value,updated_at:new Date().toISOString()};const {error}=await db.from('site_settings').upsert({...settings,...payload},{onConflict:'id'});if(error)throw error;settings={...settings,...payload};applyTheme(settings);setMessage('themeMessage','บันทึกธีมเรียบร้อยแล้ว ♡');toast('บันทึกธีมเว็บไซต์แล้ว ♡');}catch(err){setMessage('themeMessage','บันทึกธีมไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}});
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b===btn));$('settingsTab').hidden=btn.dataset.tab!=='settings';$('themeAdminTab').hidden=btn.dataset.tab!=='themeAdmin';$('accountsAdminTab').hidden=btn.dataset.tab!=='accountsAdmin';$('reviewsAdminTab').hidden=btn.dataset.tab!=='reviewsAdmin';if(btn.dataset.tab==='reviewsAdmin')refreshAdminReviews();if(btn.dataset.tab==='accountsAdmin')refreshAccounts();if(btn.dataset.tab==='themeAdmin')setThemeInputs(settings);}));
  $('logoutButton').addEventListener('click',async()=>{if(db)await db.auth.signOut();currentUser=null;showLogin();closeModal();toast('ออกจากระบบแล้ว');});
  if(db){db.auth.getSession().then(async({data})=>{if(data.session){currentUser=data.session.user;showDashboard();await loadAdminSettings();await refreshAdminReviews();}});}
  document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n===a));}));
  loadPublic();
  loadPublicAccounts();
})();
