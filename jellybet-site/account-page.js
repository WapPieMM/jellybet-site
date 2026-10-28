(() => {
 const $=id=>document.getElementById(id), cfg=window.JELLYBET_CONFIG||{};
 const configured=!!(window.supabase&&cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes('YOUR-PROJECT')&&!cfg.supabaseAnonKey.includes('YOUR_SUPABASE'));
 const db=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
 const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lineUrl=raw=>{const v=(raw||'').trim();if(!v)return '';if(/^https?:\/\//i.test(v))return v;return 'https://line.me/R/ti/p/~'+encodeURIComponent(v.replace(/^@/,''));};
 async function load(){
  const content=$('accountPageContent'), id=decodeURIComponent(location.pathname.replace(/\/$/,'').split('/').pop()||'');
  if(!db){content.innerHTML='<div class="empty-state card"><p>ยังไม่ได้ตั้งค่าฐานข้อมูลค่ะ</p><a class="account-contact-button" href="/">กลับหน้าร้าน</a></div>';return;}
  try{
   const [{data:account,error:aErr},{data:settings,error:sErr}]=await Promise.all([db.from('accounts').select('*').eq('id',id).maybeSingle(),db.from('site_settings').select('shop_name,line').eq('id',1).maybeSingle()]);
   if(sErr)throw sErr;if(settings?.shop_name)$('accountShopName').textContent=settings.shop_name;if(aErr)throw aErr;
   if(!account){content.innerHTML='<div class="empty-state card"><span>୨୧</span><p>ไม่พบ Account รายการนี้</p><a class="account-contact-button" href="/">กลับไปดูรายการทั้งหมด</a></div>';return;}
   const sold=account.status==='sold', contact=lineUrl(settings?.line);
   const image=account.image_url?'<img class="account-detail-image" src="'+esc(account.image_url)+'" alt="'+esc(account.title||'Account')+'">':'<div class="account-detail-image account-image-placeholder"><span>୨୧</span><small>account details</small></div>';
   content.innerHTML='<article class="account-detail-card card"><div class="account-detail-media">'+image+'</div><div class="account-detail-content"><span class="account-status '+(sold?'sold':'available')+'">'+(sold?'ขายแล้ว':'พร้อมขาย')+'</span><h1>'+esc(account.title||'Account')+'</h1><p class="account-detail-description">'+esc(account.description||'สอบถามรายละเอียดเพิ่มเติมได้ทางช่องทางติดต่อร้านค่ะ')+'</p><div class="account-detail-footer"><strong class="account-price">'+Number(account.price||0).toLocaleString('th-TH',{maximumFractionDigits:2})+' <small>บาท</small></strong>'+(sold?'<span class="sold-note">รายการนี้ขายแล้ว ♡</span>':(contact?'<a class="account-contact-button" href="'+esc(contact)+'" target="_blank" rel="noopener noreferrer">สนใจรายการนี้ ↗</a>':'<a class="account-contact-button" href="/#contact">สนใจรายการนี้ ↗</a>'))+'</div></div></article>';
   document.title=(account.title||'รายละเอียด Account')+' ♡ jellybet';
  }catch(err){console.error(err);content.innerHTML='<div class="empty-state card"><p>โหลดรายละเอียดไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ</p><a class="account-contact-button" href="/">กลับหน้าร้าน</a></div>';}
 }
 document.addEventListener('DOMContentLoaded',load);
})();