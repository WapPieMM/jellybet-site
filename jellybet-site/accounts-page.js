(() => {
 const $=id=>document.getElementById(id),cfg=window.JELLYBET_CONFIG||{};
 const configured=!!(window.supabase&&cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes('YOUR-PROJECT')&&!cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
 const db=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
 const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let accounts=[],activeStatus='available';
 const statusNames={available:'พร้อมขาย',installment:'ติดผ่อน',sold:'ขายแล้ว'};
 function setStatus(status){
  if(!statusNames[status])return;
  activeStatus=status;
  document.querySelectorAll('[data-status-filter]').forEach(button=>{
   const active=button.dataset.statusFilter===status;
   button.classList.toggle('is-active',active);
   button.setAttribute('aria-pressed',String(active));
  });
  render();
 }
 function render(){
  const grid=$('accountGrid');if(!grid)return;
  const counts={available:0,installment:0,sold:0};
  accounts.forEach(a=>{if(Object.prototype.hasOwnProperty.call(counts,a.status))counts[a.status]++;});
  $('countAvailable').textContent=counts.available;
  $('countInstallment').textContent=counts.installment;
  $('countSold').textContent=counts.sold;
  $('accountCount').textContent=accounts.length+' รายการทั้งหมด';
  const visible=accounts.filter(a=>a.status===activeStatus);
  grid.innerHTML=visible.length?visible.map(a=>{
   const sold=a.status==='sold',installment=a.status==='installment',label=statusNames[a.status]||'พร้อมขาย',cls=sold?'sold':installment?'installment':'available';
   const image=a.image_url?'<img class="account-image" src="'+esc(a.image_url)+'" alt="'+esc(a.title||'Account')+'" loading="lazy">':'<div class="account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
   return '<article class="account-card card '+(sold?'is-sold':'')+'">'+image+'<div class="account-card-body"><div class="account-card-top"><span class="account-status '+cls+'">'+label+'</span></div><h3>'+esc(a.title||'Account')+'</h3><p class="account-description account-description-preview">'+esc(a.description||'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ')+'</p><div class="account-card-bottom"><strong class="account-price">'+Number(a.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})+' <small>บาท</small></strong><a class="account-contact-button" href="/account/'+encodeURIComponent(a.id)+'">ดูเพิ่มเติม ↗</a></div></div></article>';
  }).join(''):'<div class="empty-state card account-empty"><span>୨୧</span><p>ยังไม่มีรายการในหมวด'+statusNames[activeStatus]+'</p><small>ลองเลือกสถานะอื่น หรือแวะกลับมาดูใหม่ได้ค่ะ ♡</small></div>';
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-status-filter]');if(button)setStatus(button.dataset.statusFilter);});
 async function load(){
  if(!db){$('accountGrid').innerHTML='<div class="empty-state card"><p>ยังไม่ได้ตั้งค่าฐานข้อมูล</p><a href="/">กลับหน้าร้าน</a></div>';return;}
  try{
   const [{data,error},{data:settings}]=await Promise.all([db.from('accounts').select('*').order('created_at',{ascending:false}),db.from('site_settings').select('shop_name').eq('id',1).maybeSingle()]);
   if(error)throw error;if(settings?.shop_name)$('accountsShopName').textContent=settings.shop_name;accounts=data||[];render();
  }catch(e){console.error(e);$('accountGrid').innerHTML='<div class="empty-state card"><p>โหลดรายการ Account ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p></div>';}
 }
 document.addEventListener('DOMContentLoaded',load);
})();