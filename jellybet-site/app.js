(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.JELLYBET_CONFIG || {};
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
  const db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const defaultSettings = { id: 1, shop_name: 'jellybet', intro: 'ยินดีต้อนรับสู่หน้ารวมเครดิตและช่องทางติดต่อของร้านนะคะ ขอบคุณที่ไว้วางใจและสนับสนุนกันเสมอ ♡', handle: 'a little place made with love', portfolio_drive_url: '', status: 'open', line: '', x: '', instagram: '', facebook: '', avatar_url: '', cover_url: '', theme_preset:'coquette', theme_bg:'#fffaf4', theme_card:'#fffdfb', theme_primary:'#d994ad', theme_soft:'#fff0f5', theme_text:'#59434b', account_entry_image_1:'', account_entry_image_2:'', mood_bunny_url:'', mood_vanity_url:'' };
  let settings = { ...defaultSettings }, reviews = [], accounts = [], musicTracks = [], currentUser = null;
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
    const bunnyImage=$('moodBunnyImage');if(bunnyImage&&settings.mood_bunny_url)bunnyImage.src=settings.mood_bunny_url;
    const vanityImage=$('moodVanityImage');if(vanityImage&&settings.mood_vanity_url)vanityImage.src=settings.mood_vanity_url;
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
    const bunnyPreview=$('moodBunnyPreview');if(bunnyPreview){bunnyPreview.src=settings.mood_bunny_url||$('moodBunnyImage')?.src||'';bunnyPreview.hidden=!settings.mood_bunny_url;}
    const vanityPreview=$('moodVanityPreview');if(vanityPreview){vanityPreview.src=settings.mood_vanity_url||$('moodVanityImage')?.src||'';vanityPreview.hidden=!settings.mood_vanity_url;}
    const pill=$('statusPill'); pill.classList.toggle('is-open',settings.status==='open'); pill.classList.toggle('is-closed',settings.status!=='open');
    pill.lastElementChild.textContent = settings.status==='open' ? 'เปิดให้บริการ' : 'ปิดให้บริการ';
    $('contactList').innerHTML = contactDefs.map((c,index)=>{
      const raw=(settings[c.key]||'').trim(); if(!raw) return '';
      const href=linkFor(c.key,raw);
      const content=`<span class="contact-card-icon contact-icon-${c.key}">${c.icon}</span><span class="contact-card-copy"><strong>${c.label}</strong><small>แตะเพื่อพูดคุยกับร้าน</small></span><span class="contact-card-action">เปิดแชต</span>`;
      return href ? `<a class="contact-card-item" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="เปิดช่องทางติดต่อ ${c.label}">${content}</a>` : '';
    }).filter(Boolean).join('') || '<div class="empty-state"><span>♡</span><p>ยังไม่ได้เพิ่มช่องทางติดต่อ</p><small>เจ้าของร้านสามารถเพิ่มข้อมูลได้จากหลังบ้าน</small></div>';
    $('editShopName').value=settings.shop_name||''; $('editIntro').value=settings.intro||''; $('editHandle').value=settings.handle||''; if($('editPortfolioDriveUrl'))$('editPortfolioDriveUrl').value=settings.portfolio_drive_url||''; $('editStatus').value=settings.status||'open';
    const portfolioCard=$('portfolioDriveCard'),portfolioUrl=(settings.portfolio_drive_url||'').trim(),validPortfolioUrl=/^https:\/\/(drive|docs)\.google\.com\//i.test(portfolioUrl);
    if(portfolioCard){portfolioCard.hidden=!validPortfolioUrl;if(validPortfolioUrl)portfolioCard.href=portfolioUrl;}
    $('editLine').value=settings.line||''; $('editX').value=settings.x||''; $('editInstagram').value=settings.instagram||''; $('editFacebook').value=settings.facebook||'';
    renderAccountEntryImageOptions();
  }
  function renderAccountEntryImageOptions(){
    const candidates=accounts.filter(a=>a.image_url);
    ['accountEntryImage1','accountEntryImage2'].forEach((id,index)=>{
      const select=$(id);if(!select)return;
      const key=index===0?'account_entry_image_1':'account_entry_image_2';
      const selected=String(select.dataset.userChanged==='true'?select.value:(settings[key]||select.value||''));
      select.innerHTML='<option value="">อัตโนมัติจากคลัง Account</option>'+candidates.map(a=>`<option value="${escapeHtml(a.id)}">${escapeHtml(a.title||'Account')} · ${a.status==='sold'?'ขายแล้ว':a.status==='installment'?'ติดผ่อน':'พร้อมขาย'}</option>`).join('');
      select.value=candidates.some(a=>String(a.id)===selected)?selected:'';
      const image=$('accountEntryImagePreview'+(index+1)),account=candidates.find(a=>String(a.id)===select.value);
      if(image){image.src=account?.image_url||'';image.hidden=!account;}
    });
  }
  function renderAccountEntryPreview(){
    const preview=$('accountEntryPreview');if(!preview)return;
    const candidates=accounts.filter(a=>a.image_url&&a.status!=='sold').concat(accounts.filter(a=>a.image_url&&a.status==='sold'));
    const selectedIds=[$('accountEntryImage1')?.dataset.userChanged==='true'? $('accountEntryImage1').value:($('accountEntryImage1')?.value||settings.account_entry_image_1),$('accountEntryImage2')?.dataset.userChanged==='true'? $('accountEntryImage2').value:($('accountEntryImage2')?.value||settings.account_entry_image_2)].filter(Boolean);
    let samples=selectedIds.map(id=>accounts.find(a=>String(a.id)===String(id)&&a.image_url)).filter(Boolean);
    if(!selectedIds.length)samples=candidates.slice(0,2);
    else if(samples.length<2)samples=samples.concat(candidates.filter(a=>!samples.some(s=>String(s.id)===String(a.id))).slice(0,2-samples.length));
    if(!samples.length){preview.hidden=true;preview.innerHTML='';return;}
    preview.innerHTML=samples.map((a,i)=>`<figure class="account-entry-sample account-entry-sample-${i+1}"><img src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.title||'ตัวอย่าง Account')}" loading="lazy"><figcaption>${escapeHtml(a.title||'Account')}</figcaption></figure>`).join('');
    preview.hidden=false;
  }
  function renderAccounts(){
    renderAccountEntryPreview();
    const grid=$('accountGrid'); if(!grid)return;
    const available=accounts.filter(a=>a.status==='available'||a.status==='installment');
    $('accountCount').textContent=`${available.length} พร้อมขาย/ติดผ่อน`;
    grid.innerHTML=accounts.length ? accounts.map(a=>{
      const sold=a.status==='sold', installment=a.status==='installment';
      const statusLabel=sold?'ขายแล้ว':installment?'ติดผ่อน':'พร้อมขาย';
      const statusClass=sold?'sold':installment?'installment':'available';
      const image=a.image_url ? `<img class="account-image" src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.title)}" loading="lazy">` : '<div class="account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
      const shortDescription=(a.description||'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ').trim();
      return `<article class="account-card card ${sold?'is-sold':''}">${image}<div class="account-card-body"><div class="account-card-top"><span class="account-status ${statusClass}">${statusLabel}</span></div><h3>${escapeHtml(a.title||'Account')}</h3><p class="account-description account-description-preview">${escapeHtml(shortDescription)}</p><div class="account-card-bottom"><strong class="account-price">${Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})} <small>บาท</small></strong><a class="account-contact-button" href="/account/${encodeURIComponent(a.id)}">ดูเพิ่มเติม ↗</a></div></div></article>`;
    }).join('') : '<div class="empty-state card account-empty"><span>୨୧</span><p>ยังไม่มี Account ลงขายในตอนนี้</p><small>แวะกลับมาดูรายการใหม่ได้อีกนะคะ ♡</small></div>';
    renderAdminAccounts();
  }
  async function loadPublicAccounts(){
    if(!db){accounts=[];renderAccounts();return;}
    try{const {data,error}=await db.from('accounts').select('*').order('created_at',{ascending:false});if(error)throw error;accounts=data||[];renderAccounts();renderAdminAccounts();renderAdminAccounts();}
    catch(err){console.warn('Account listing unavailable until database schema is applied:',err);accounts=[];renderAccounts();}
  }
  function renderAdminAccounts(){
    const list=$('adminAccountList');if(!list)return;
    if(!currentUser){list.innerHTML='';return;}
    const groups=[{key:'available',label:'พร้อมขาย',icon:'♡'},{key:'installment',label:'ติดผ่อน',icon:'◷'},{key:'sold',label:'ขายแล้ว',icon:'✓'}];
    const card=a=>`<div class="admin-review-item admin-account-item"><div class="admin-account-heading">${a.image_url?`<img src="${escapeHtml(a.image_url)}" alt="" loading="lazy">`:'<span class="admin-account-thumb">୨୧</span>'}<div><strong>${escapeHtml(a.title||'Account')}</strong><p>${Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})} บาท</p></div></div><p>${escapeHtml(a.description||'ไม่มีรายละเอียด')}</p><div class="admin-item-actions"><button data-edit-account="${escapeHtml(a.id)}">แก้ไข</button><button data-toggle-account="${escapeHtml(a.id)}">เปลี่ยนสถานะ</button><button class="danger" data-delete-account="${escapeHtml(a.id)}">ลบ</button></div></div>`;
    list.innerHTML=accounts.length?groups.map(g=>{const items=accounts.filter(a=>(a.status||'available')===g.key);return `<section class="admin-account-group admin-account-group-${g.key}"><h4><span>${g.icon}</span> ${g.label}<small>${items.length} รายการ</small></h4><div class="admin-account-group-list">${items.length?items.map(card).join(''):'<div class="admin-account-group-empty">ไม่มี Account ในหมวดนี้ค่ะ</div>'}</div></section>`;}).join(''):'<div class="empty-state"><p>ยังไม่มี Account เพิ่มรายการแรกจากแบบฟอร์มด้านบนได้เลยค่ะ ♡</p></div>';
    const installmentList=$('installmentAccountList');if(installmentList){const availableAccounts=accounts.filter(a=>a.status==='available');installmentList.innerHTML=availableAccounts.length?availableAccounts.map(a=>`<div class="admin-review-item admin-account-item"><div class="admin-account-heading">${a.image_url?`<img src="${escapeHtml(a.image_url)}" alt="" loading="lazy">`:'<span class="admin-account-thumb">୨୧</span>'}<div><strong>${escapeHtml(a.title||'Account')}</strong><p>${Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})} บาท · พร้อมขาย</p></div></div><p>${a.installment_details?escapeHtml(a.installment_details):'ยังไม่ได้เพิ่มรายละเอียดการผ่อน'}</p><div class="admin-item-actions"><button data-edit-installment="${escapeHtml(a.id)}">${a.installment_details?'แก้ไขรายละเอียดการผ่อน':'เพิ่มรายละเอียดการผ่อน'}</button></div></div>`).join(''):'<div class="empty-state"><p>ยังไม่มี Account สถานะพร้อมขายให้จัดการค่ะ ♡</p></div>';}
    renderAccountEntryImageOptions();
    renderAccountEntryPreview();
  }
  async function cleanupSoldAccountImages(){
    if(!db||!currentUser)return;
    try{
      const cutoff=Date.now()-14*24*60*60*1000;
      const {data:rows,error}=await db.from('accounts').select('id,image_url,status').eq('status','sold');if(error)throw error;
      const soldByUrl=new Map((rows||[]).filter(a=>a.image_url).map(a=>[a.image_url,a]));if(!soldByUrl.size)return;
      const {data:files,error:listError}=await db.storage.from('account-images').list('admin',{limit:1000,sortBy:{column:'created_at',order:'asc'}});if(listError)throw listError;
      const expired=(files||[]).filter(file=>file.name&&file.created_at&&new Date(file.created_at).getTime()<=cutoff).map(file=>({path:'admin/'+file.name,url:db.storage.from('account-images').getPublicUrl('admin/'+file.name).data.publicUrl})).filter(file=>soldByUrl.has(file.url));
      if(!expired.length)return;
      const {error:removeError}=await db.storage.from('account-images').remove(expired.map(file=>file.path));if(removeError)throw removeError;
      for(const file of expired){const account=soldByUrl.get(file.url);const {error:updateError}=await db.from('accounts').update({image_url:''}).eq('id',account.id).eq('status','sold');if(updateError)throw updateError;}
      console.info('Cleaned up '+expired.length+' sold account image(s) older than 14 days.');
    }catch(error){console.warn('Automatic sold-image cleanup skipped:',error.message);}
  }
  async function refreshAccounts(){
    if(!db)return;
    const {data,error}=await db.from('accounts').select('*').order('created_at',{ascending:false});
    if(error){setMessage('accountMessage','โหลดรายการ Account ไม่สำเร็จ: '+error.message,true);return;}
    accounts=data||[];renderAccounts();
  }
  const installmentPlanMarker='[[JELLYBET_INSTALLMENT_PLANS]]';
  function installmentPlanCard(plan={},index=0){return '<section class="account-installment-plan-card" data-installment-plan><div class="account-installment-plan-heading"><strong>ตัวเลือกที่ '+(index+1)+'</strong><button type="button" class="account-installment-remove" data-remove-installment-plan aria-label="ลบตัวเลือกนี้">ลบ</button></div><label>ระยะเวลาผ่อน (เดือน)<input data-plan-months type="number" min="1" max="60" step="1" value="'+escapeHtml(plan.months??'')+'" placeholder="เช่น 1"></label><div class="account-admin-inline"><label>วางดาวน์ (บาท)<input data-plan-down type="number" min="0" step="1" value="'+escapeHtml(plan.down??'')+'" placeholder="เช่น 1,000"></label><label>ผ่อนต่ออีก (บาท)<input data-plan-total type="number" min="0" step="1" value="'+escapeHtml(plan.total??'')+'" placeholder="เช่น 4,000"></label></div><p class="account-plan-total-preview" data-plan-total-preview></p><label class="account-plan-weekly-label">ส่งยอด อาทิตย์ละ (บาท)<input data-plan-weekly type="number" min="0" step="1" value="'+escapeHtml(plan.weekly??'')+'" placeholder="เช่น 1,000"></label></section>';}
  function updateInstallmentPlanTotal(card){if(!card)return;const down=Number(card.querySelector('[data-plan-down]')?.value)||0,installment=Number(card.querySelector('[data-plan-total]')?.value)||0,output=card.querySelector('[data-plan-total-preview]');if(output)output.textContent='ยอดรวม (เงินดาวน์ + ยอดผ่อนต่อ): '+(down+installment).toLocaleString('th-TH')+' บาท';}
  function renderInstallmentPlans(plans=[]){const wrap=$('accountInstallmentPlans');if(!wrap)return;wrap.innerHTML=(plans||[]).map((plan,i)=>installmentPlanCard(plan,i)).join('');wrap.querySelectorAll('[data-installment-plan]').forEach(updateInstallmentPlanTotal);}
  function collectInstallmentPlans(){return Array.from(document.querySelectorAll('[data-installment-plan]')).map(card=>({months:Number(card.querySelector('[data-plan-months]')?.value)||0,down:Number(card.querySelector('[data-plan-down]')?.value)||0,total:Number(card.querySelector('[data-plan-total]')?.value)||0,weekly:Number(card.querySelector('[data-plan-weekly]')?.value)||0})).filter(plan=>plan.months>0);}
  function buildInstallmentDetails(){const plans=collectInstallmentPlans(),note=$('accountInstallmentDetails')?.value.trim()||'';if(!plans.length)return note;return installmentPlanMarker+JSON.stringify(plans)+(note?'\n'+note:'');}
  function populateInstallmentPlans(value=''){const raw=String(value||'');if(raw.startsWith(installmentPlanMarker)){const rest=raw.slice(installmentPlanMarker.length),end=rest.indexOf(']');try{const plans=JSON.parse(end>=0?rest.slice(0,end+1):rest);renderInstallmentPlans(plans);$('accountInstallmentDetails').value=end>=0?rest.slice(end+1).trim().replace(/^\n/,''):'';return;}catch(error){console.warn('Could not parse installment plan data',error);}}const months=raw.match(/ผ่อน (\d+) เดือน/),down=raw.match(/วางดาวน์ ([\d,.]+)฿/),total=raw.match(/ผ่อนต่ออีก ([\d,.]+)฿/),weekly=[...raw.matchAll(/งวดที่ \d+: ([\d,.]+) บาท\/สัปดาห์/g)].map(m=>m[1].replace(/,/g,''));if(months||down||total||weekly.length){renderInstallmentPlans([{months:months?.[1]||'',down:down?.[1]?.replace(/,/g,'')||'',total:total?.[1]?.replace(/,/g,'')||'',weekly:weekly[0]||''}]);$('accountInstallmentDetails').value=raw.split('\n').filter(line=>!/^(ผ่อน \d+ เดือน|วางดาวน์ |ผ่อนต่ออีก |งวดที่ \d+:)/.test(line)).join('\n').trim();}else{renderInstallmentPlans([]);$('accountInstallmentDetails').value=raw;}}
  $('addInstallmentPlan')?.addEventListener('click',()=>{const plans=collectInstallmentPlans();plans.push({});renderInstallmentPlans(plans);});
  $('accountInstallmentPlans')?.addEventListener('input',e=>{if(e.target.matches('[data-plan-down], [data-plan-total]'))updateInstallmentPlanTotal(e.target.closest('[data-installment-plan]'));});
  $('accountInstallmentPlans')?.addEventListener('click',e=>{if(!e.target.closest('[data-remove-installment-plan]'))return;const card=e.target.closest('[data-installment-plan]');card?.remove();Array.from(document.querySelectorAll('[data-installment-plan]')).forEach((el,i)=>{const heading=el.querySelector('.account-installment-plan-heading strong');if(heading)heading.textContent='ตัวเลือกที่ '+(i+1);});});
  function collectAccountStructuredDetails(){const lines=[],login=[];if($('accountLoginGarena')?.checked)login.push('การีน่า');if($('accountLoginFacebook')?.checked)login.push('Facebook');if(login.length)lines.push('ล็อกอินด้วย: '+login.join(', '));const email=$('accountEmailStatus')?.value||'';if(email)lines.push('อีเมล: '+email+(email==='รอเปลี่ยน'&&$('accountEmailDays').value?' ('+$('accountEmailDays').value+' วัน)':''));const phone=$('accountPhoneStatus')?.value||'';if(phone)lines.push('เบอร์: '+phone+(phone==='รอเปลี่ยน'&&$('accountPhoneDate').value?' วันที่ '+$('accountPhoneDate').value:''));const other=$('accountOtherDetails')?.value.trim();if(other)lines.push('อื่น ๆ: '+other);return lines.join('\n');}
  function populateAccountStructuredDetails(value=''){const lines=String(value||'').split(/\r?\n/),get=p=>lines.find(x=>x.startsWith(p))?.slice(p.length).trim()||'',login=get('ล็อกอินด้วย:');$('accountLoginGarena').checked=login.includes('การีน่า');$('accountLoginFacebook').checked=login.includes('Facebook');const email=get('อีเมล:');$('accountEmailStatus').value=['ยกอีเมล','รอเปลี่ยน','พร้อมเปลี่ยน','ตาย'].find(x=>email.startsWith(x))||'';$('accountEmailDays').value=email.match(/\((\d+) วัน\)/)?.[1]||'';const phone=get('เบอร์:');$('accountPhoneStatus').value=['รอเปลี่ยน','พร้อมเปลี่ยน'].find(x=>phone.startsWith(x))||'';$('accountPhoneDate').value=phone.match(/วันที่ (.+)$/)?.[1]||'';$('accountOtherDetails').value=get('อื่น ๆ:');if(!lines.some(x=>/^(ล็อกอินด้วย:|อีเมล:|เบอร์:|อื่น ๆ:)/.test(x)))$('accountOtherDetails').value=value||'';}

  function resetAccountForm(){
    $('accountForm').reset();$('editAccountId').value='';$('accountStatus').value='available';renderInstallmentPlans([]);
    $('accountFormTitle').textContent='เพิ่ม Account';$('cancelAccountEdit').hidden=true;
    const img=$('accountImagePreview');if(img){img.hidden=true;img.removeAttribute('src');}
    setMessage('accountMessage','');
  }
  let reviewsExpanded=false;
  function renderReviews(){
    const published=reviews.filter(r=>r.published);
    $('statReviews').textContent=published.length; $('reviewCount').textContent=`${published.length} รีวิว`;
    $('statRating').textContent=published.length ? (published.reduce((n,r)=>n+Number(r.rating||5),0)/published.length).toFixed(1) : '—';
    const visibleReviews=reviewsExpanded?published:published.slice(0,5);
    $('reviewList').innerHTML=published.length ? visibleReviews.map(r=>{const decorations=['♡','✿','♫','🐰','୨୧'];const decoration=decorations[Math.floor(Math.random()*decorations.length)];const leftDecoration=decorations[Math.floor(Math.random()*decorations.length)];return `<article class="review-card card"><span class="review-decoration review-decoration-left" aria-hidden="true">${leftDecoration}</span><span class="review-decoration" aria-hidden="true">${decoration}</span><div class="review-top"><div class="review-person"><span class="avatar">♡</span><div><strong>${escapeHtml(r.customer_name||'ลูกค้าท่านหนึ่ง')}</strong><span class="review-date">${r.created_at?new Date(r.created_at).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}):'ขอบคุณที่ไว้วางใจค่ะ'}</span></div></div><span class="stars review-hearts" aria-label="${Number(r.rating||5)} จาก 5 หัวใจ">${'♥'.repeat(Math.max(1,Math.min(5,Number(r.rating||5))))}${'♡'.repeat(5-Math.max(1,Math.min(5,Number(r.rating||5))))}</span></div><p class="review-text">${escapeHtml(r.review_text||'')}</p>${r.image_url?`<a href="${escapeHtml(r.image_url)}" target="_blank" rel="noopener noreferrer"><img class="review-image" src="${escapeHtml(r.image_url)}" alt="ภาพประกอบรีวิว" loading="lazy" referrerpolicy="no-referrer"></a>`:''}</article>`}).join('') : '<div class="empty-state card"><span>♡</span><p>ยังไม่มีรีวิวที่แสดงในตอนนี้</p><small>ขอบคุณที่แวะมาเยี่ยมชมร้านนะคะ</small></div>';
    const moreButton=$('reviewMoreButton');if(moreButton){moreButton.hidden=published.length<=5;moreButton.textContent=reviewsExpanded?'แสดงรีวิวน้อยลง ♡':`ดูรีวิวเพิ่มเติม (${published.length-5}) ♡`;}
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
  let siteMusic={title:'เพลงประจำร้าน',audio_url:'',enabled:false},musicStarted=false;
  const musicAudio=$('siteMusicAudio');
  if(musicAudio)musicAudio.volume=0.05;
  function renderMusic(){
    if(!musicAudio)return;
    const player=$('musicPlayer'),toggle=$('musicToggle');
    if(siteMusic.enabled&&siteMusic.audio_url){
      if(musicAudio.src!==siteMusic.audio_url)musicAudio.src=siteMusic.audio_url;
      player.hidden=false;$('musicPlayerTitle').textContent=siteMusic.title||'เพลงประจำร้าน';
      if($('musicTitle'))$('musicTitle').value=siteMusic.title||'';
      if($('musicEnabled'))$('musicEnabled').checked=true;
      if($('musicCurrentTrack'))$('musicCurrentTrack').textContent='เพลงปัจจุบัน: '+(siteMusic.title||'เพลงประจำร้าน');
      if(toggle)toggle.textContent=musicAudio.paused?'♫':'Ⅱ';
    }else{player.hidden=true;musicAudio.pause();if($('musicCurrentTrack'))$('musicCurrentTrack').textContent='ยังไม่มีเพลงเปิดใช้งาน';}
  }
  async function loadSiteMusic(){
    if(!db)return;
    const {data,error}=await db.from('site_music').select('*').eq('id',1).maybeSingle();
    if(error){console.warn('โหลดเพลงไม่สำเร็จ',error.message);return;}
    if(data)siteMusic={...siteMusic,...data};renderMusic();
  }
  async function startMusicAfterGesture(){
    if(musicStarted||!siteMusic.enabled||!siteMusic.audio_url||!musicAudio)return;
    musicStarted=true;
    try{await musicAudio.play();document.removeEventListener('pointerdown',startMusicAfterGesture,true);document.removeEventListener('keydown',startMusicAfterGesture,true);renderMusic();}catch(err){musicStarted=false;console.info('เบราว์เซอร์ยังไม่อนุญาตให้เล่นเพลง',err);}
  }
  document.addEventListener('pointerdown',startMusicAfterGesture,{capture:true});
  document.addEventListener('keydown',startMusicAfterGesture,{capture:true});
  $('musicToggle')?.addEventListener('click',async()=>{
    if(!musicAudio)return;
    if(musicAudio.paused){try{await musicAudio.play();musicStarted=true;}catch(e){toast('เบราว์เซอร์ไม่อนุญาตให้เล่นเพลง');}}
    else{musicAudio.pause();}
    renderMusic();
  });
  $('musicForm')?.addEventListener('submit',async e=>{
    e.preventDefault();if(!db||!currentUser){setMessage('musicMessage','กรุณาเข้าสู่ระบบเจ้าของร้านและเชื่อมต่อ Supabase ก่อน',true);return;}
    const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('musicMessage','กำลังบันทึกเพลง…');
    try{
      let audio_url=siteMusic.audio_url||'';
      const file=$('musicFile').files[0];
      if(file){
        if(file.size>50*1024*1024)throw new Error('ไฟล์เพลงต้องมีขนาดไม่เกิน 50 MB');
        if(!file.type.startsWith('audio/'))throw new Error('กรุณาเลือกไฟล์เสียงเท่านั้น');
        const ext=(file.name.split('.').pop()||'mp3').toLowerCase().replace(/[^a-z0-9]/g,'');
        const path='admin/store-music-'+Date.now()+'.'+ext;
        const {data,error}=await db.storage.from('shop-music').upload(path,file,{upsert:true,contentType:file.type});
        if(error)throw error;
        audio_url=db.storage.from('shop-music').getPublicUrl(data.path).data.publicUrl;
      }
      const payload={id:1,title:$('musicTitle').value.trim()||'เพลงประจำร้าน',audio_url,enabled:$('musicEnabled').checked,updated_at:new Date().toISOString()};
      const {error}=await db.from('site_music').upsert(payload,{onConflict:'id'});if(error)throw error;
      siteMusic=payload;musicStarted=false;renderMusic();setMessage('musicMessage','บันทึกเพลงเรียบร้อยแล้ว ♡');toast('อัปเดตเพลงหน้าร้านแล้ว');
    }catch(err){setMessage('musicMessage','บันทึกเพลงไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  $('removeMusic')?.addEventListener('click',async()=>{
    if(!db||!currentUser)return;
    if(!confirm('ต้องการปิดเพลงบนหน้าร้านใช่ไหม?'))return;
    const {error}=await db.from('site_music').upsert({id:1,title:'เพลงประจำร้าน',audio_url:'',enabled:false,updated_at:new Date().toISOString()},{onConflict:'id'});
    if(error){setMessage('musicMessage','ปิดเพลงไม่สำเร็จ: '+error.message,true);return;}
    siteMusic={title:'เพลงประจำร้าน',audio_url:'',enabled:false};renderMusic();setMessage('musicMessage','นำเพลงออกจากหน้าร้านแล้ว ♡');
  });
  function openModal(){ $('adminModal').hidden=false; document.body.style.overflow='hidden'; if(!configured){$('setupHint').hidden=false; $('loginMessage').textContent='';} else {$('setupHint').hidden=true;} }
  function closeModal(){ $('adminModal').hidden=true; document.body.style.overflow=''; }
  function showDashboard(){ $('adminLoginView').hidden=true; $('adminDashboard').hidden=false; renderSettings(); renderAdminReviews(); }
  function showLogin(){ $('adminLoginView').hidden=false; $('adminDashboard').hidden=true; }
  function renderAdminReviews(){
    const list=$('adminReviewList'); if(!list)return;
    if(!currentUser){list.innerHTML='';return;}
    list.innerHTML=reviews.length ? reviews.map(r=>`<div class="admin-review-item"><strong>${escapeHtml(r.customer_name||'ลูกค้าท่านหนึ่ง')} · ${'♥'.repeat(Number(r.rating||5))}</strong><p>${escapeHtml(r.review_text||'')}</p><small>${r.published?'แสดงบนหน้าเว็บ':'ซ่อนอยู่'} · ${r.created_at?new Date(r.created_at).toLocaleDateString('th-TH'):''}</small><div class="admin-item-actions"><button data-edit-review="${escapeHtml(r.id)}">แก้ไข</button><button data-toggle-review="${escapeHtml(r.id)}">${r.published?'ซ่อนรีวิว':'เผยแพร่'}</button><button class="danger" data-delete-review="${escapeHtml(r.id)}">ลบ</button></div></div>`).join('') : '<div class="empty-state"><p>ยังไม่มีรีวิว เพิ่มรีวิวแรกได้จากแบบฟอร์มด้านบน</p></div>';
  }
  
  $('accountForm')?.addEventListener('submit',async e=>{
    e.preventDefault();if(!db){setMessage('accountMessage','ต้องเชื่อมต่อ Supabase ก่อนบันทึกรายการ',true);return;}
    if(!currentUser){setMessage('accountMessage','กรุณาเข้าสู่ระบบเจ้าของร้านก่อน',true);return;}
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');btn.disabled=true;setMessage('accountMessage','กำลังบันทึก Account…');
    try{
      const id=$('editAccountId').value,existing=accounts.find(a=>String(a.id)===id);
      let image_url=existing?.image_url||'';
      const file=$('accountImageFile').files[0];if(file)image_url=await uploadImage(file,'account-images','admin');
      const payload={title:$('accountTitle').value.trim(),description:[collectAccountStructuredDetails(),$('accountDescription').value.trim()].filter(Boolean).join('\n\n'),installment_details:buildInstallmentDetails(),price:Number($('accountPrice').value),status:$('accountStatus').value,image_url,updated_at:new Date().toISOString()};
      const result=id?await db.from('accounts').update(payload).eq('id',id):await db.from('accounts').insert(payload);
      if(result.error)throw result.error;
      resetAccountForm();await refreshAccounts();setMessage('accountMessage','บันทึกรายการเรียบร้อยแล้ว ♡');toast('บันทึก Account แล้ว ♡');
    }catch(err){setMessage('accountMessage','บันทึกไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  $('cancelAccountEdit')?.addEventListener('click',resetAccountForm);
  $('accountImageFile')?.addEventListener('change',()=>previewFile($('accountImageFile'),$('accountImagePreview')));
  ['adminAccountList','installmentAccountList'].forEach(listId=>$(listId)?.addEventListener('click',async e=>{
    const installmentEdit=e.target.closest('[data-edit-installment]');if(installmentEdit){const a=accounts.find(x=>String(x.id)===installmentEdit.dataset.editInstallment);if(!a)return;$('editAccountId').value=a.id;$('accountTitle').value=a.title||'';populateAccountStructuredDetails(a.description||'');$('accountDescription').value=(a.description||'').split(/\n\n/).slice(-1)[0]||'';populateInstallmentPlans(a.installment_details||'');$('accountPrice').value=a.price??'';$('accountStatus').value=a.status||'available';const img=$('accountImagePreview');if(img){img.src=a.image_url||'';img.hidden=!a.image_url;}$('accountFormTitle').textContent='แก้ไขรายละเอียดการผ่อน';$('cancelAccountEdit').hidden=false;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab==='accountsAdmin'));['settingsTab','themeAdminTab','accountsAdminTab','installmentAdminTab','reviewsAdminTab'].forEach(id=>{const el=$(id);if(el)el.hidden=id!=='accountsAdminTab';});$('accountForm').scrollIntoView({behavior:'smooth',block:'start'});return;}
    const edit=e.target.closest('[data-edit-account]'),toggle=e.target.closest('[data-toggle-account]'),del=e.target.closest('[data-delete-account]');
    if(edit){const a=accounts.find(x=>String(x.id)===edit.dataset.editAccount);if(!a)return;$('editAccountId').value=a.id;$('accountTitle').value=a.title||'';populateAccountStructuredDetails(a.description||'');$('accountDescription').value=(a.description||'').split(/\n\n/).slice(-1)[0]||'';populateInstallmentPlans(a.installment_details||'');$('accountPrice').value=a.price??'';$('accountStatus').value=a.status||'available';const img=$('accountImagePreview');if(img){img.src=a.image_url||'';img.hidden=!a.image_url;}$('accountFormTitle').textContent='แก้ไข Account';$('cancelAccountEdit').hidden=false;$('accountForm').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(toggle){const a=accounts.find(x=>String(x.id)===toggle.dataset.toggleAccount);if(!a)return;const nextStatus=a.status==='available'?'installment':a.status==='installment'?'sold':'available';const {error}=await db.from('accounts').update({status:nextStatus,updated_at:new Date().toISOString()}).eq('id',a.id);if(error){toast('เปลี่ยนสถานะ Account ไม่สำเร็จ: '+error.message);return;}await refreshAccounts();toast('อัปเดตสถานะ Account แล้ว ♡');return;}
    if(del){const a=accounts.find(x=>String(x.id)===del.dataset.deleteAccount);if(!a||!confirm('ต้องการลบ Account รายการนี้ใช่ไหม?'))return;const {error}=await db.from('accounts').delete().eq('id',a.id);if(error){toast('ลบ Account ไม่สำเร็จ: '+error.message);return;}await refreshAccounts();toast('ลบ Account แล้ว');}
  }));
  async function refreshAdminReviews(){
    if(!db)return;
    const {data,error}=await db.from('reviews').select('*').order('created_at',{ascending:false});
    if(error){setMessage('reviewMessage','โหลดรีวิวไม่สำเร็จ: '+error.message,true);return;}
    reviews=data||[]; renderReviews();
  }
  $('reviewMoreButton')?.addEventListener('click',()=>{reviewsExpanded=!reviewsExpanded;renderReviews();});
  $('heartButton').addEventListener('click',()=>{const b=$('heartButton');b.classList.toggle('saved');b.textContent=b.classList.contains('saved')?'♥':'♡';toast(b.classList.contains('saved')?'เพิ่มหัวใจให้ jellybet แล้ว ♡':'ยกเลิกหัวใจแล้ว');});
  document.querySelectorAll('#openAdmin, #openAdminIcon').forEach(button=>button.addEventListener('click',openModal)); $('closeAdmin').addEventListener('click',closeModal);
  $('adminModal').addEventListener('click',e=>{if(e.target===$('adminModal'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('adminModal').hidden)closeModal();});
  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault(); if(!db){setMessage('loginMessage','ยังไม่ได้ตั้งค่า Supabase โปรดดู README.md',true);return;}
    const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('loginMessage','กำลังเข้าสู่ระบบ…');
    try{const {data,error}=await db.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});if(error)throw error;currentUser=data.user;showDashboard();await loadAdminSettings();await refreshAdminReviews();await refreshAccounts();await cleanupSoldAccountImages();setMessage('loginMessage','');}
    catch(err){setMessage('loginMessage','เข้าสู่ระบบไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  async function loadAdminSettings(){if(!db)return;const {data,error}=await db.from('site_settings').select('*').eq('id',1).maybeSingle();if(error){toast('อ่านข้อมูลหลังบ้านไม่สำเร็จ');return;}if(data){settings={...defaultSettings,...data};renderSettings();}}
  $('settingsForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!db)return;const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;setMessage('settingsMessage','กำลังบันทึก…');
    try{
    let avatar_url=settings.avatar_url||'', cover_url=settings.cover_url||'', mood_bunny_url=settings.mood_bunny_url||'', mood_vanity_url=settings.mood_vanity_url||'';
    if($('shopAvatarFile').files[0]) avatar_url=await uploadImage($('shopAvatarFile').files[0],'shop-images','admin');
    if($('shopCoverFile').files[0]) cover_url=await uploadImage($('shopCoverFile').files[0],'shop-images','admin');
    if($('moodBunnyFile').files[0]) mood_bunny_url=await uploadImage($('moodBunnyFile').files[0],'shop-images','admin/moodboard');
    if($('moodVanityFile').files[0]) mood_vanity_url=await uploadImage($('moodVanityFile').files[0],'shop-images','admin/moodboard');
    const portfolio_drive_url=$('editPortfolioDriveUrl')?.value.trim()||'';if(portfolio_drive_url&&!/^https:\/\/(drive|docs)\.google\.com\//i.test(portfolio_drive_url)){setMessage('settingsMessage','กรุณาใส่ลิงก์ Google Drive หรือ Google Docs ที่ขึ้นต้นด้วย https://',true);return;}const payload={id:1,avatar_url,cover_url,mood_bunny_url,mood_vanity_url,portfolio_drive_url,account_entry_image_1:$('accountEntryImage1')?.value||'',account_entry_image_2:$('accountEntryImage2')?.value||'',shop_name:$('editShopName').value.trim(),intro:$('editIntro').value.trim(),handle:$('editHandle').value.trim(),status:$('editStatus').value,line:$('editLine').value.trim(),x:$('editX').value.trim(),instagram:$('editInstagram').value.trim(),facebook:$('editFacebook').value.trim(),theme_preset:$('themePreset').value,theme_bg:$('themeBg').value,theme_card:$('themeCard').value,theme_primary:$('themePrimary').value,theme_soft:$('themeSoft').value,theme_text:$('themeText').value,updated_at:new Date().toISOString()};
    const {error}=await db.from('site_settings').upsert(payload,{onConflict:'id'});if(error)throw error;settings={...settings,...payload};renderSettings();$('shopAvatarFile').value='';$('shopCoverFile').value='';$('moodBunnyFile').value='';$('moodVanityFile').value='';setMessage('settingsMessage','บันทึกข้อมูลเรียบร้อยแล้ว ♡');toast('บันทึกข้อมูลร้านแล้ว ♡');}
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
  $('moodBunnyFile')?.addEventListener('change',()=>previewFile($('moodBunnyFile'),$('moodBunnyPreview')));
  $('moodVanityFile')?.addEventListener('change',()=>previewFile($('moodVanityFile'),$('moodVanityPreview')));
  const customerFile=$('customerReviewImage');
  customerFile?.addEventListener('change',()=>previewFile(customerFile,$('customerReviewImagePreview')));
  function previewFile(input,img){const file=input?.files?.[0];if(!img)return;if(file){img.src=URL.createObjectURL(file);img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}}
  $('customerReviewRatingPicker')?.addEventListener('click',e=>{const button=e.target.closest('[data-rating]');if(!button)return;const value=Number(button.dataset.rating);$('customerReviewRating').value=String(value);$('customerReviewRatingPicker').querySelectorAll('[data-rating]').forEach(item=>{const active=Number(item.dataset.rating)<=value;item.classList.toggle('selected',active);item.textContent=active?'♥':'♡';item.setAttribute('aria-checked',String(Number(item.dataset.rating)===value));});});
  $('customerReviewForm').addEventListener('submit',async e=>{
    e.preventDefault(); if(!db){setMessage('customerReviewMessage','ระบบยังไม่พร้อมรับรีวิว กรุณาลองใหม่ภายหลัง',true);return;}
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');btn.disabled=true;setMessage('customerReviewMessage','กำลังส่งรีวิว…');
    try{
      let image_url=null;const file=$('customerReviewImage').files[0];if(file)image_url=await uploadImage(file,'review-images','customer');
      const payload={customer_name:$('customerReviewName').value.trim()||'Anonymous',rating:Number($('customerReviewRating').value)||5,review_text:$('customerReviewText').value.trim(),image_url,published:true};
      const {error}=await db.from('reviews').insert(payload);if(error)throw error;
      form.reset();const prev=$('customerReviewImagePreview');if(prev){prev.hidden=true;prev.removeAttribute('src');}
      setMessage('customerReviewMessage','รีวิวของคุณแสดงบนเว็บไซต์แล้ว ขอบคุณมากค่ะ ♡');toast('ส่งรีวิวเรียบร้อยแล้ว ♡');
    }catch(err){setMessage('customerReviewMessage','ส่งรีวิวไม่สำเร็จ: '+err.message,true);}finally{btn.disabled=false;}
  });
  ['accountEntryImage1','accountEntryImage2'].forEach(id=>$(id)?.addEventListener('change',()=>{$(id).dataset.userChanged='true';renderAccountEntryImageOptions();renderAccountEntryPreview();}));
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
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b===btn));$('settingsTab').hidden=btn.dataset.tab!=='settings';$('themeAdminTab').hidden=btn.dataset.tab!=='themeAdmin';$('accountsAdminTab').hidden=btn.dataset.tab!=='accountsAdmin';$('reviewsAdminTab').hidden=btn.dataset.tab!=='reviewsAdmin';$('installmentAdminTab').hidden=btn.dataset.tab!=='installmentAdmin';$('musicAdminTab').hidden=btn.dataset.tab!=='musicAdmin';if(btn.dataset.tab==='musicAdmin')loadSiteMusic();if(btn.dataset.tab==='reviewsAdmin')refreshAdminReviews();if(btn.dataset.tab==='accountsAdmin'||btn.dataset.tab==='installmentAdmin')refreshAccounts();if(btn.dataset.tab==='themeAdmin')setThemeInputs(settings);}));
  $('logoutButton').addEventListener('click',async()=>{if(db)await db.auth.signOut();currentUser=null;showLogin();closeModal();toast('ออกจากระบบแล้ว');});
  if(db){db.auth.getSession().then(async({data})=>{if(data.session){currentUser=data.session.user;showDashboard();await loadAdminSettings();await refreshAdminReviews();}});}
  document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n===a));}));
  // Floating flowers on clicks and touch interactions, without blocking normal controls.
  const heartLayer=$('heartEffects');
  if(heartLayer){
    document.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const count=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:4;
      const flowers=['✿','❀','✾','✽','🌸'];
      for(let i=0;i<count;i++){
        const flower=document.createElement('span');
        flower.className='floating-flower';
        flower.textContent=flowers[Math.floor(Math.random()*flowers.length)];
        const spread=count===1?0:(Math.random()-0.5)*54;
        flower.style.left=(e.clientX+spread)+'px';
        flower.style.top=(e.clientY+(Math.random()-0.5)*24)+'px';
        flower.style.setProperty('--flower-drift',(Math.random()-0.5)*90+'px');
        flower.style.setProperty('--flower-rotate',(Math.random()-0.5)*75+'deg');
        flower.style.animationDelay=(Math.random()*100)+'ms';
        heartLayer.appendChild(flower);
        flower.addEventListener('animationend',()=>flower.remove(),{once:true});
      }
    },{passive:true});
  }
  loadPublic();
  loadPublicAccounts();
  loadSiteMusic();
  
})();
