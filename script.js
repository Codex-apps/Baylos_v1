// ================= KONFIGURASI =================
const SB_URL='https://txndsvswrukdcydwkyag.supabase.co';   // GANTI
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bmRzdnN3cnVrZGN5ZHdreWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5ODUsImV4cCI6MjEwNTQ4MDk4NX0.W-rLCdQXYPLdDonhBU8CLIA67hGAIQwgQD7fgDQcqoo';             // GANTI (anon key)
const sb=supabase.createClient(SB_URL,SB_KEY);

// Voucher toko (ubah sesukamu)
const VOUCHERS={GRATIS10:{type:'pct',val:10,min:50000},Hemat5K:{type:'fix',val:5000,min:30000}};

// ================= STATE =================
let products=[],cart=JSON.parse(localStorage.getItem('cart')||'[]'),
    settings=JSON.parse(localStorage.getItem('settings')||'{}'),
    curCat='Semua',pmItem=null,pmQtyN=1,coBank='',pendingOrder=null,
    buktiUrl=null,locData=null,discount=0;

settings=Object.assign({storeName:'Tokoku',storeEmoji:'🛍️',banks:['BCA 1234567890 a.n. Tokoku','BRI 0987654321 a.n. Tokoku'],csHours:'08.00–20.00'},settings);

// ================= UTIL =================
const $=id=>document.getElementById(id);
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const saveCart=()=>{localStorage.setItem('cart',JSON.stringify(cart));updateBadges()};
function me(){return JSON.parse(localStorage.getItem('profile')||'{}')}
function saveProfile(p){localStorage.setItem('profile',JSON.stringify(p))}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)}
function openModal(id){$(id).classList.add('open')}
function closeModal(id){$(id).classList.remove('open')}
function updateBadges(){
  const n=cart.reduce((a,i)=>a+i.qty,0);
  $('cartBadge').textContent=n;$('cartBadge').style.display=n?'flex':'none';
  const tot=cart.reduce((a,i)=>a+i.price*i.qty,0);
  $('fabTotal').textContent=fmt(tot);
  $('cartFab').classList.toggle('hide',!n);
}

// ================= LOAD DATA =================
async function cloudLoad(){
  try{
    const{data,error}=await sb.from('products').select('*').eq('aktif',true).order('created_at',{ascending:false});
    if(error)throw error;
    products=data||[];
  }catch(e){toast('⚠️ Gagal memuat produk');products=[]}
  renderCats();renderProducts();
}

// ================= RENDER PRODUK =================
function renderCats(){
  const cats=['Semua',...new Set(products.map(p=>p.kategori).filter(Boolean))];
  $('catBar').innerHTML=cats.map(c=>`<div class="cat-chip ${c===curCat?'active':''}" onclick="curCat='${esc(c)}';renderCats();renderProducts()">${esc(c)}</div>`).join('');
}
function renderProducts(){
  const q=($('searchInput').value||'').toLowerCase();
  const list=products.filter(p=>(curCat==='Semua'||p.kategori===curCat)&&(p.nama||'').toLowerCase().includes(q));
  $('emptyMsg').style.display=list.length?'none':'block';
  $('productGrid').innerHTML=list.map(p=>{
    const habis=(p.stok??99)<=0;
    return`<div class="card" onclick="openProduct(${p.id})">
      <img src="${esc(p.gambar||'https://placehold.co/300x300/eee?text=%F0%9F%93%A6')}" loading="lazy" alt="">
      <div class="card-body">
        <h3>${esc(p.nama)}</h3>
        <div class="price">${fmt(p.harga)}</div>
        <div class="stock ${habis?'habis':''}">${habis?'Stok habis':'Stok '+(p.stok??'∞')}</div>
        <button class="add-mini" ${habis?'disabled':''} onclick="event.stopPropagation();openProduct(${p.id})">+ Keranjang</button>
      </div></div>`;
  }).join('');
}

// ================= DETAIL PRODUK =================
function openProduct(id){
  pmItem=products.find(p=>p.id===id);pmQtyN=1;
  $('pmImg').src=pmItem.gambar||'https://placehold.co/400x400/eee?text=%F0%9F%93%A6';
  $('pmCat').textContent=pmItem.kategori||'Produk';
  $('pmName').textContent=pmItem.nama;
  $('pmPrice').textContent=fmt(pmItem.harga);
  $('pmDesc').textContent=pmItem.deskripsi||'';
  $('pmQty').textContent=1;
  openModal('productModal');
}
function pmQty(d){
  pmQtyN=Math.max(1,Math.min(pmQtyN+d,pmItem.stok??99));
  $('pmQty').textContent=pmQtyN;
}
function addToCartFromModal(){
  addToCart(pmItem,pmQtyN);closeModal('productModal');toast('✅ Ditambahkan ke keranjang');
}
function addToCart(p,qty){
  const ex=cart.find(i=>i.id===p.id);
  if(ex)ex.qty=Math.min(ex.qty+qty,p.stok??99);else cart.push({id:p.id,name:p.nama,price:p.harga,qty,img:p.gambar});
  saveCart();
}

// ================= KERANJANG =================
function openCart(){renderCart();openModal('cartModal')}
function renderCart(){
  $('cartEmpty').style.display=cart.length?'none':'block';
  $('cartItems').innerHTML=cart.map((i,ix)=>`
    <div class="cart-item">
      <img src="${esc(i.img||'https://placehold.co/100x100/eee?text=%F0%9F%93%A6')}" alt="">
      <div class="ci-info"><h4>${esc(i.name)}</h4><div class="price">${fmt(i.price)}</div></div>
      <div class="qty-ctrl">
        <button onclick="cartQty(${ix},-1)">−</button><b>${i.qty}</b><button onclick="cartQty(${ix},1)">+</button>
      </div></div>`).join('');
  $('cartTotal').textContent=fmt(cart.reduce((a,i)=>a+i.price*i.qty,0));
}
function cartQty(ix,d){
  cart[ix].qty+=d;
  if(cart[ix].qty<=0)cart.splice(ix,1);
  saveCart();renderCart();
}

// ================= CHECKOUT =================
function goCheckout(){
  if(!cart.length)return toast('Keranjang kosong');
  const u=me();
  $('coName').value=u.nama||'';$('coPhone').value=u.phone||'';$('coAddress').value=u.address||'';
  $('coVoucher').value='';discount=0;$('voucherMsg').textContent='';
  $('bankList').innerHTML=settings.banks.map((b,i)=>`
    <label class="bank-opt ${i===0?'sel':''}"><input type="radio" name="bank" value="${i}" ${i===0?'checked':''}
      onchange="coBank='${esc(b)}';document.querySelectorAll('.bank-opt').forEach(e=>e.classList.remove('sel'));this.closest('.bank-opt').classList.add('sel')">
      🏦 ${esc(b)}</label>`).join('');
  coBank=settings.banks[0]||'';
  updateCoTotal();closeModal('cartModal');openModal('checkoutModal');
}
function applyVoucher(){
  const code=$('coVoucher').value.trim(),v=VOUCHERS[code];
  const sub=cart.reduce((a,i)=>a+i.price*i.qty,0);
  const m=$('voucherMsg');
  if(!code){discount=0;m.textContent='';}
  else if(!v){discount=0;m.className='voucher-msg voucher-no';m.textContent='❌ Voucher tidak valid';}
  else if(sub<v.min){discount=0;m.className='voucher-msg voucher-no';m.textContent=`❌ Minimal belanja ${fmt(v.min)}`;}
  else{discount=v.type==='pct'?Math.round(sub*v.val/100):v.val;m.className='voucher-msg voucher-ok';m.textContent=`✅ Voucher aktif — hemat ${fmt(discount)}`;}
  updateCoTotal();
}
function updateCoTotal(){
  const sub=cart.reduce((a,i)=>a+i.price*i.qty,0);
  $('coTotal').textContent=fmt(Math.max(0,sub-discount));
}
function shareLocation(){
  if(!navigator.geolocation)return toast('Browser tidak mendukung GPS');
  toast('📍 Mengambil lokasi...');
  navigator.geolocation.getCurrentPosition(
    p=>{locData={lat:p.coords.latitude.toFixed(6),lng:p.coords.longitude.toFixed(6)};$('locLabel').textContent='✅ Lokasi terkirim';toast('🎯 Lokasi siap dikirim');},
    ()=>toast('❌ Izin lokasi ditolak'),{enableHighAccuracy:true,timeout:10000});
}

async function submitOrder(){
  const u={nama:$('coName').value.trim(),phone:$('coPhone').value.trim(),address:$('coAddress').value.trim()};
  if(!u.nama||!u.phone||!u.address)return toast('Lengkapi nama, HP & alamat');
  if(!/^0\d{8,13}$/.test(u.phone))return toast('Nomor HP tidak valid (contoh: 0812xxx)');
  saveProfile(u);

  const kode='BL'+Date.now().toString().slice(-10);
  pendingOrder={
    kode,uname:u.nama,phone:u.phone,address:u.address,
    note:$('coNote').value.trim()||null,
    items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),
    voucher:$('coVoucher').value.trim()||null,disc:discount,
    total:Math.max(0,cart.reduce((a,i)=>a+i.price*i.qty,0)-discount),
    bank:coBank,lat:locData?.lat||null,lng:locData?.lng||null,status:'baru',paid:false
  };
  try{
    const{error}=await sb.from('orders').insert(pendingOrder);
    if(error)throw error;
    // kurangi stok
    for(const i of pendingOrder.items){
      const p=products.find(x=>x.id===i.id);
      if(p)await sb.from('products').update({stok:Math.max(0,(p.stok??0)-i.qty)}).eq('id',i.id);
    }
    cart=[];saveCart();
    closeModal('checkoutModal');
    $('vaBox').innerHTML=`Transfer ke:<br><b>${esc(pendingOrder.bank)}</b><br>Jumlah: <b>${fmt(pendingOrder.total)}</b>`;
    $('buktiPreview').style.display='none';$('buktiFile').value='';
    openModal('buktiModal');
  }catch(e){toast('❌ Gagal: '+e.message)}
}

// ================= BUKTI TRANSFER =================
$('buktiFile').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  if(f.size>5*1024*1024)return toast('Maksimal 5MB');
  const r=new FileReader();r.onload=ev=>{$('buktiPreview').src=ev.target.result;$('buktiPreview').style.display='block'};r.readAsDataURL(f);
});
async function submitBukti(){
  const f=$('buktiFile').files[0];
  if(!f){finishOrder(null);return}
  try{
    toast('⏳ Mengunggah...');
    const path=`bukti/${pendingOrder.kode}-${Date.now()}.jpg`;
    const{error}=await sb.storage.from('uploads').upload(path,f,{contentType:f.type});
    if(error)throw error;
    const{data:{publicUrl}}=sb.storage.from('uploads').getPublicUrl(path);
    await sb.from('orders').update({bukti:publicUrl}).eq('kode',pendingOrder.kode);
    finishOrder(publicUrl);
  }catch(e){toast('❌ Upload gagal: '+e.message)}
}
function finishOrder(url){
  buktiUrl=url;
  if(window._tg&&pendingOrder)buktibridge(url);
  closeModal('buktiModal');
  $('successMsg').textContent=`Order ${pendingOrder.kode} (${fmt(pendingOrder.total)}) terkirim!`;
  openModal('successModal');
  window._lastOrder={...pendingOrder,created_at:new Date().toISOString(),bukti:url};
  cloudLoad();
}
// kirim info bukti via RPC (Telegram webhook trigger di DB sudah otomatis)
async function buktibridge(url){
  try{await sb.from('orders').update({bukti:url}).eq('kode',pendingOrder.kode)}catch(e){}
}

// ================= PESANAN SAYA =================
async function openOrders(){
  const u=me();
  if(!u.phone){saveProfile({nama:'',phone:'',address:''});toast('Isi data dulu saat checkout ya');return}
  try{
    const{data,error}=await sb.from('orders').select('*').eq('phone',u.phone).order('created_at',{ascending:false}).limit(30);
    if(error)throw error;
    $('myOrders').innerHTML=(data||[]).map(o=>{
      const st={baru:['MENUNGGU KONFIRMASI','st-baru'],diproses:['DIPROSES','st-diproses'],selesai:['SELESAI ✅','st-selesai'],batal:['DIBATALKAN','st-batal']}[o.status]||[o.status,''];
      return`<div class="order-card">
        <div class="oc-head"><b>${esc(o.kode)}</b><span class="oc-status ${st[1]}">${st[0]}</span></div>
        <div class="oc-items">${(o.items||[]).map(i=>`${esc(i.name)} ×${i.qty}`).join('<br>')}</div>
        <div class="oc-total">${fmt(o.total)}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px">${new Date(o.created_at).toLocaleString('id-ID')} • ${esc(o.bank||'')}</div>
        <button class="big-btn" style="padding:10px" onclick='openInvoice(${JSON.stringify(o).replace(/'/g,"&#39;")})'>🧾 Invoice</button>
      </div>`;
    }).join('')||'<p style="text-align:center;color:var(--muted);padding:20px">Belum ada pesanan</p>';
  }catch(e){toast('❌ Gagal memuat pesanan')}
  openModal('ordersModal');
}

// ================= INVOICE =================
function openInvoice(o){
  if(!o)return toast('Data pesanan belum ada');
  const win=window.open('','_blank','width=420,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${esc(o.kode)}</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;color:#222;max-width:400px;margin:auto}
  .hdr{text-align:center;border-bottom:2px dashed #ddd;padding-bottom:12px;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;font-size:.8rem;padding:4px 0}
  .tot{border-top:2px solid #333;margin-top:8px;padding-top:8px;font-weight:800;font-size:1rem}
  table{width:100%;border-collapse:collapse;font-size:.78rem;margin:8px 0}
  td,th{padding:5px;border-bottom:1px solid #eee;text-align:left}
  .btn{display:block;width:100%;padding:12px;background:#6c5ce7;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:14px}
  </style></head><body>
  <div class="hdr"><h1>${esc(settings.storeEmoji+' '+settings.storeName)}</h1>
  <div style="font-size:.7rem;color:#888">INVOICE — ${esc(o.kode)}</div></div>
  <div class="row"><span>Tanggal</span><b>${new Date(o.created_at).toLocaleString('id-ID')}</b></div>
  <div class="row"><span>Pembeli</span><b>${esc(o.uname)}</b></div>
  <div class="row"><span>HP</span><b>${esc(o.phone)}</b></div>
  <div class="row"><span>Alamat</span><b style="text-align:right;max-width:220px">${esc(o.address)}</b></div>
  <table><tr><th>Produk</th><th>Qty</th><th style="text-align:right">Harga</th></tr>
  ${(o.items||[]).map(i=>`<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td style="text-align:right">${fmt(i.price*i.qty)}</td></tr>`).join('')}</table>
  ${o.voucher?`<div class="row"><span>Voucher ${esc(o.voucher)}</span><b style="color:#e17055">−${fmt(o.disc)}</b></div>`:''}
  <div class="row"><span>Bank</span><b>${esc(o.bank||'-')}</b></div>
  <div class="row tot"><span>TOTAL</span><span style="color:#6c5ce7">${fmt(o.total)}</span></div>
  ${o.lat?`<div class="row"><span>Lokasi</span><a href="https://maps.google.com/?q=${o.lat},${o.lng}">Buka Maps</a></div>`:''}
  <p style="font-size:.68rem;color:#888;text-align:center;margin-top:14px">Terima kasih telah berbelanja! 🙏<br>CS: ${esc(settings.csHours)}</p>
  <button class="btn" onclick="window.print()">🖨️ Simpan / Cetak PDF</button></body></html>`);
  win.document.close();
}

// ================= INIT =================
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
$('storeName').textContent=settings.storeName;
$('storeEmoji').textContent=settings.storeEmoji;
cloudLoad();updateBadges();
