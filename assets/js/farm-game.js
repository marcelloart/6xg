'use strict';
const PREMIUM_STORE_ENABLED=false;
const F=BaraFarm,$=id=>document.getElementById(id),gate=new AccountGate('6xg-farm:');
const {camera,renderer}=typeof Farm3D!=='undefined'?Farm3D.create($('worldCanvas')):(()=>{const camera=new MapCamera();$('rotateLeft').hidden=true;$('rotateRight').hidden=true;$('cameraPosition').textContent='TAMPILAN 2D';return{camera,renderer:new FarmRenderer($('worldCanvas'),camera)};})();
let farm=new F.Farm(),activeSaveKey=null,entered=false,selectedCrop='carrot',selectedPlot=null,pendingBuild=null,panel=null,shop='seeds',storeItem='carrot',tradeQty=1,placement=null,selectedBuilding=null,toastTimer=null,uiSignature='';
let authority=null,transactionBusy=false,serverAnchor=null;
const serverClock=()=>serverAnchor?serverAnchor.time+Math.floor(Math.max(0,performance.now()-serverAnchor.tick)):Date.now();
const audio=new FarmAudio({onChange:syncSoundUI});
const format=n=>new Intl.NumberFormat('id-ID').format(n);
const hudFormat=n=>camera.width<=760&&n>=10000?new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(n):format(n);
const duration=m=>m<60?m+' menit':m===1440?'1 hari':m/60+' jam';
const countdown=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return h?h+'j '+String(m).padStart(2,'0')+'m':String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const action=(label,type,key,qty=1,disabled=false,soft=false)=>`<button class="action${soft?' soft':''}" data-action="${type}" data-key="${key}" data-qty="${qty}" ${disabled?'disabled':''}>${label}</button>`;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;$('announcer').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},3800);}
function save(){
 if(!gate.canPlay||!activeSaveKey)return false;
 const raw=farm.serialize();let stored=true;try{localStorage.setItem(activeSaveKey,raw);}catch{stored=false;}
 window.dispatchEvent(new CustomEvent('bara:save',{detail:{key:activeSaveKey,save:raw}}));
 if(!stored)toast('Penyimpanan perangkat penuh. Pastikan progres tersimpan online.');return stored;
}
function refreshGate(){
 audio.setActive(gate.canPlay&&entered);
 document.body.classList.toggle('account-locked',!gate.canPlay);document.body.classList.toggle('welcome-active',!(entered&&gate.canPlay));$('welcome').hidden=entered&&gate.canPlay;
 $('startButton').textContent=gate.canPlay?'Mainkan kebunmu ↗':'Masuk / Daftar ↗';
 $('welcomeCopy').innerHTML=gate.canPlay?'Kebunmu menunggu.<br>Tanaman tetap tumbuh saat kamu pergi.':'Tanam harapan. Petik hasilnya.<br>Kembangkan kebun kecilmu menjadi dunia milikmu.';
}
let inviteAttempted=false;
function enter(){if(!gate.canPlay)return false;entered=true;refreshGate();center();$('worldCanvas').focus();const invite=pendingFarmInvite;if(invite&&!inviteAttempted&&authority){inviteAttempted=true;try{sessionStorage.removeItem('6xg:visit-invite');}catch{}visitFriend(invite);}return true;}
function center(){
 if(camera.home)camera.home();else camera.focus(1590,1135);
  if(camera.width<=760){camera.zoomAt(1.05/camera.zoom);const view=visiting?.farm||farm,plots=view.s.plots.slice(0,view.unlocked),points=plots.flatMap(p=>[{x:p.x-32,y:p.y+32,h:0},{x:p.x+32,y:p.y-32,h:0}]);
  if(plots.some(p=>Math.hypot(p.x-1593,p.y-872)<420))points.push({x:1513,y:872,h:120},{x:1673,y:872,h:120});
  if(points.length){const bounds=()=>{const projected=points.map(p=>camera.worldToScreen(p.x,p.y,p.h));return{left:Math.min(...projected.map(p=>p.x)),right:Math.max(...projected.map(p=>p.x)),top:Math.min(...projected.map(p=>p.y)),bottom:Math.max(...projected.map(p=>p.y))};},top=visiting?170:camera.width>=600&&camera.height<=500?64:112,bottom=Math.max(top+80,camera.height-108),before=bounds(),fit=Math.min(1,(camera.width-80)/(before.right-before.left),(bottom-top-20)/(before.bottom-before.top));
   if(fit<1)camera.zoomAt(fit);const b=bounds();camera.pan(camera.width/2-(b.left+b.right)/2,(top+bottom)/2-(b.top+b.bottom)/2);}
 }
}
function closePanel(){panel=null;document.body.classList.remove('panel-open');$('farmPanel').hidden=true;document.querySelectorAll('.toolbar button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-expanded','false');});renderSelection();}
function openPanel(view){
 if(!gate.canPlay||!entered||visiting)return;
 pickup.reset();
 placement=null;pendingBuild=null;$('placementDock').hidden=true;
 if(panel===view){closePanel();return;}
 panel=view;document.body.classList.add('panel-open');selectedPlot=null;selectedBuilding=null;$('plotInfo').hidden=true;$('farmPanel').hidden=false;
 for(const [name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory'],['layout','openLayout'],['goals','openGoals'],['production','openProduction'],['livestock','openLivestock'],['friends','openFriends'],['more','openMore']]){const active=view===name||(name==='more'&&['inventory','layout','goals','production','livestock','friends'].includes(view));$(id).classList.toggle('active',active);$(id).setAttribute('aria-expanded',String(active));}
 renderPanel();$('panelBody').parentElement.scrollTop=0;if(view==='friends'&&!communityLoaded)loadFriends();
}
const sellingShop=()=>shop==='sell'||shop==='goods'||shop==='livestock';
const storeKinds=()=>shop==='livestock'?F.ANIMAL_PRODUCTS:shop==='materials'?F.MATERIALS:shop==='buildings'?F.BUILDINGS:shop==='goods'?F.RECIPES:F.CROPS;
const productPhotos=Object.freeze({carrot:'./assets/produce/carrot.jpg?v=8f8faa693e',tomato:'./assets/produce/tomato.jpg?v=c66d03f75b',corn:'./assets/produce/corn.jpg?v=e09aa88ddf',strawberry:'./assets/produce/strawberry.jpg?v=94e3f3b8e8',potato:'./assets/produce/potato.jpg?v=1be4f87202',chili:'./assets/produce/chili.jpg?v=edf173b6ea',orange:'./assets/produce/orange.jpg?v=60bbd6d5b4',apple:'./assets/produce/apple.jpg?v=ae9b5a5fb6',avocado:'./assets/produce/avocado.jpg?v=3e02a2d3be'});
const productImage=key=>productPhotos[key]||renderer.catalogue?.[key];
const picture=(key,icon)=>{const source=productImage(key);return`<img data-art="${key}" ${productPhotos[key]?'class="uploaded-produce" ':''}${source?'src="'+source+'"':'hidden'} alt="" loading="lazy" decoding="async">${source?'':'<span class="product-emoji" aria-hidden="true">'+icon+'</span>'}`;};
const stock=(key)=>shop==='livestock'?farm.s.livestock.produce[key]:shop==='goods'?farm.s.production.goods[key]:shop==='sell'?farm.s.produce[key]:shop==='materials'?farm.s.materials[key]:shop==='buildings'?farm.s.buildings.filter(b=>b.kind===key).length:farm.s.seeds[key];
function buildingCosts(key){if(Object.values(F.BUILDINGS[key].cost).every(n=>n===0))return'<span class="cost-chip enough">Hadiah gratis · tanpa bahan</span>';return Object.entries(F.BUILDINGS[key].cost).map(([k,n])=>`<span class="cost-chip ${farm.s.materials[k]>=n?'enough':'missing'}">${F.MATERIALS[k].icon} ${farm.s.materials[k]} / ${n}</span>`).join('');}
function tradeLimit(key){const c=storeKinds()[key];if(sellingShop())return Math.max(1,stock(key));if(shop==='buildings')return 1;return Math.max(1,Math.min(100,Math.floor(farm.s.coins/c.price),(shop==='materials'?10000-farm.s.materials[key]:1000-farm.s.seeds[key])));}
function renderPremiumStore(){
 const source=productImage('sunsetConservatory'),supported=renderer.mode==='3d';
 return '<article class="premium-product"><div class="premium-art"><img data-art="sunsetConservatory" '+(source?'src="'+source+'"':'hidden')+' alt="Model 3D asli Rumah Kaca Senja: paviliun kaca, taman botani, air mancur, teras, dan lampu gantung." decoding="async"><span>'+(supported?'Menyiapkan gambar dari model 3D…':'Aktifkan tampilan 3D di Menu untuk melihat dekorasi.')+'</span><b class="premium-tag">KOLEKSI SENJA · PROTOTIPE</b><small class="premium-art-caption">Model asli · suasana senja</small></div><div class="premium-description"><h3>Rumah Kaca Senja</h3><p>Paviliun kaca dengan taman botani, air mancur mengalir, teras santai, dan cahaya lampu hangat.</p><div class="premium-features"><span>Air mancur & lampu</span><span>Preview siang / senja</span></div><div class="premium-price"><strong>Preview gratis</strong><small>Desain baru · belum dijual</small></div>'+action('Preview di kebun','decor-preview','sunsetConservatory',1,!supported||!source)+'</div></article><p class="premium-notice"><b>Lihat bentuk aslinya sebelum membeli.</b> Gambar ini dirender dari model yang sama dengan dekorasi di kebun. Preview sementara tidak memakai koin atau bahan dan hilang setelah ditutup. Pembayaran belum dibuka.</p>';
}
function renderStore(){
 const kinds=storeKinds();if(!Object.hasOwn(kinds,storeItem))storeItem=Object.keys(kinds)[0];const c=kinds[storeItem],s=farm.s,isBuild=shop==='buildings',selling=sellingShop(),type=shop==='livestock'?'animal-sell':shop==='goods'?'goods':selling?'sell':shop==='materials'?'material':'seed';tradeQty=Math.max(1,Math.min(tradeQty,selling?Math.max(1,stock(storeItem)):100));const total=tradeQty*(selling?c.sell:c.price),can=selling?stock(storeItem)>=tradeQty:s.coins>=total&&(stock(storeItem)+tradeQty<=(shop==='materials'?10000:1000));
 const detail=`<section class="trade-detail"><div class="trade-product"><div class="trade-art">${picture(storeItem,c.icon)}</div><div><span class="product-type">${isBuild?'ARSITEKTUR KEBUN':selling?'HASIL DARI KEBUNMU':shop==='materials'?'BAHAN PILIHAN':'BIBIT PILIHAN'}</span><h3>${c.name}</h3><p>${isBuild?c.benefit:shop==='livestock'?'Hasil ternak segar dari kandangmu.':shop==='materials'?'Bahan untuk membangun dan mengembangkan kebun.':duration(c.minutes)+(shop==='goods'?' pengolahan · ':' tumbuh · ')+c.yield+(shop==='goods'?' olahan':' hasil / bibit')+(!productUnlocked(storeItem)?' · '+unlockLabel(storeItem):'')}</p><small>${isBuild?c.seconds+' detik pembangunan'+(!farm.buildingUnlocked(storeItem)?' · '+unlockLabel(storeItem,true):''):'Tersimpan: '+format(stock(storeItem))+' '+(shop==='seeds'?'bibit':shop==='materials'?'unit':shop==='goods'?'olahan':'hasil')}</small></div></div>`+(isBuild?`<div class="cost-list">${buildingCosts(storeItem)}</div><div class="trade-buttons">${action('Pilih lokasi di peta','build',storeItem,1,!farm.canBuild(storeItem)||s.buildings.length>=F.MAX_BUILDINGS)}${action('Beli bahan yang kurang · '+farm.buildKitQuote(storeItem).cost+' ◉','kit',storeItem,1,!farm.buildingUnlocked(storeItem)||!farm.buildKitQuote(storeItem).cost||farm.buildKitQuote(storeItem).cost>s.coins,true)}</div>`:`<div class="quantity-line"><span>Jumlah</span><div class="quantity-control">${action('−','quantity',storeItem,-1,tradeQty<=1,true)}<output aria-label="Jumlah transaksi">${tradeQty}</output>${action('+','quantity',storeItem,1,tradeQty>=(selling?Math.max(1,stock(storeItem)):100),true)}</div><div class="quantity-presets">${action('5','preset',storeItem,5,false,true)}${action('Maks','preset',storeItem,tradeLimit(storeItem),false,true)}</div></div><div class="trade-total"><span>${selling?'Kamu menerima':'Total belanja'}<small>${tradeQty} × ${selling?c.sell:c.price} koin</small></span><b>◉ ${format(total)}</b></div>${action((selling?'Jual ':'Beli ')+tradeQty+' '+(shop==='seeds'?'bibit ':'')+c.name.toLowerCase(),type,storeItem,tradeQty,!can||!productUnlocked(storeItem))}${!can?'<p class="trade-warning">'+(selling?(shop==='livestock'?'Ambil hasil yang siap di menu Ternak.':shop==='goods'?'Ambil olahan yang sudah selesai di menu Olah.':'Panen tanamanmu terlebih dahulu.'):s.coins<total?'Perlu '+format(total-s.coins)+' koin lagi.':'Penyimpanan produk ini sudah penuh.')+'</p>':''}`)+'</section>';
 return `<div class="store-wallet"><span>Dompetmu <b>◉ ${format(s.coins)}</b></span><span>Tas kebun <b>${farm.used} / ${farm.capacity}</b></span></div>${detail}<div class="catalog-heading"><h3>${shop==='livestock'?'Telur & susu':shop==='goods'?'Hasil olahan':selling?'Hasil panen':isBuild?'Katalog bangunan':shop==='materials'?'Bahan bangunan':'Katalog bibit'}</h3><span>${Object.keys(kinds).length} pilihan</span></div><div class="product-grid">`+Object.entries(kinds).map(([key,item])=>`<button class="product-card ${storeItem===key?'selected':''}" data-action="inspect" data-key="${key}" aria-pressed="${storeItem===key}"><div class="product-art">${picture(key,item.icon)}<span class="product-stock">${stock(key)} ${isBuild?'dibangun':shop==='seeds'?'bibit':'unit'}</span></div><div class="product-info"><h3>${item.name}</h3><small>${!productUnlocked(key)?unlockLabel(key,isBuild):isBuild?item.benefit:shop==='materials'?'Bahan pembangunan':shop==='livestock'?'Hasil ternak':duration(item.minutes)}</small><div class="product-price"><b>${isBuild?Object.entries(item.cost).map(([k,n])=>F.MATERIALS[k].icon+' '+n).join(' · '):'◉ '+(selling?item.sell:item.price)}</b><span>${isBuild?'Lihat':'Pilih'} ↗</span></div></div></button>`).join('')+'</div>';
}
const productUnlocked=key=>shop==='materials'||sellingShop()||(shop==='buildings'?farm.buildingUnlocked(key):farm.cropUnlocked(key));
const unlockLabel=(key,building=false)=>key==='planter'?'Hadiah Panen Bertumbuh':'Terbuka di level '+(building?F.BUILDING_LEVEL[key]:F.CROP_LEVEL[key]);
function renderPanel(){
 if(!panel)return;
 $('shopTabs').hidden=panel!=='shop';document.querySelectorAll('[data-shop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shop===shop)));
 const body=$('panelBody'),s=farm.s;$('farmPanel').dataset.view=panel;$('farmPanel').dataset.shop=panel==='shop'?shop:'';
 if(panel==='farm'){
  $('panelLabel').textContent='KEBUNMU';$('panelTitle').textContent='Tanam hari yang baik.';$('panelCopy').textContent='Pilih bibit lalu klik tanah kosong. Tanaman matang bisa langsung dipanen.';
  body.innerHTML='<div class="seed-shelf">'+Object.entries(F.CROPS).filter(([key])=>s.seeds[key]>0).map(([key,c])=>`<button class="seed-card ${selectedCrop===key?'selected':''}" data-action="select" data-key="${key}"><div class="seed-art">${picture(key,c.icon)}</div><h3>${c.name}</h3><small>${duration(c.minutes)} · ${s.seeds[key]} bibit</small><span>${selectedCrop===key?'✓ Dipilih':'Pilih bibit ↗'}</span></button>`).join('')+'</div>';
  if(!Object.values(s.seeds).some(Boolean))body.innerHTML='<div class="empty-state"><span>🌱</span><h3>Siap untuk panen berikutnya?</h3><p>Belanja bibit baru dengan koin hasil kebunmu.</p></div>';
  body.innerHTML+='<div class="item-actions">'+action('Belanja bibit','shop','seeds',1,false,true)+action('Atur tata letak','panel','layout',1,false,true)+'</div><div class="catalog-heading"><h3>'+farm.unlocked+' petak terbuka</h3><span>Klik untuk melihat</span></div><div class="plot-grid">'+s.plots.slice(0,farm.unlocked).map(p=>{const ready=p.crop&&p.readyAt<=farm.now();return`<button data-action="plot" data-key="${p.id}" class="${ready?'ready':''}" aria-label="Petak ${p.id+1}, ${p.crop?F.CROPS[p.crop].name+(ready?', siap panen':', sedang tumbuh'):'kosong'}">${p.crop?F.CROPS[p.crop].icon:'+'} ${p.id+1}${ready?' ✓':''}</button>`;}).join('')+'</div>';
 }else if(panel==='shop'&&shop==='premium'&&PREMIUM_STORE_ENABLED){
  $('panelLabel').textContent='STUDIO DEKORASI';$('panelTitle').textContent='Sentuhan untuk kebunmu.';$('panelCopy').textContent='Putar, pilih posisi, dan lihat dekorasi aslinya.';body.innerHTML=renderPremiumStore();
 }else if(panel==='shop'){
  $('panelLabel').textContent='PASAR LEMBAH';$('panelTitle').textContent=shop==='livestock'?'Hasil ternak segar.':shop==='goods'?'Olahan siap dipasarkan.':shop==='sell'?'Hasilmu punya nilai.':shop==='buildings'?'Bangun dunia milikmu.':shop==='materials'?'Bekal untuk membangun.':'Ada yang ingin ditanam?';$('panelCopy').textContent=shop==='livestock'?'Ambil telur dan susu di menu Ternak, lalu jual di sini.':shop==='goods'?'Ambil olahan di menu Olah, lalu jual di sini.':shop==='sell'?'Pilih panen, atur jumlah, lalu jual untuk mendapatkan koin.':shop==='buildings'?'Beli bahan yang kurang, lalu tentukan sendiri lokasi bangunan.':'Pilih produk dan jumlahnya. Semua harga menggunakan koin kebun.';body.innerHTML=renderStore();
 }else if(panel==='build'){
  $('panelLabel').textContent='ARSITEKTUR KEBUN';$('panelTitle').textContent='Tempat untuk bertumbuh.';$('panelCopy').textContent='Pilih bangunan, geser pratinjau ke tanah hijau, lalu klik atau lepaskan untuk membangun.';
  body.innerHTML='<div class="building-grid">'+Object.entries(F.BUILDINGS).map(([key,b])=>`<article class="building-card"><div class="building-art">${picture(key,b.icon)}</div><div class="building-copy"><h3>${b.name}</h3><p>${b.benefit} · ${b.seconds} detik${!farm.buildingUnlocked(key)?' · '+unlockLabel(key,true):''}</p><div class="cost-list">${buildingCosts(key)}</div><div class="item-actions">${action('Pilih tempat','build',key,1,!farm.canBuild(key)||s.buildings.length>=F.MAX_BUILDINGS)}${action('Belanja bahan','building-shop',key,1,false,true)}</div></div></article>`).join('')+'</div><div class="item-actions">'+action('Pindahkan bangunan / petak','panel','layout',1,false,true)+'</div>';
 }else if(panel==='layout'){
  $('panelLabel').textContent='STUDIO TATA LETAK';$('panelTitle').textContent='Kebun sesuai caramu.';$('panelCopy').textContent='Tahan bangunan atau petak di peta selama 1,5 detik untuk mengangkatnya. Geser ke lokasi hijau, lalu lepaskan. Tanaman tetap tumbuh.';
  body.innerHTML='<section class="layout-expansion"><span class="layout-icon">🌿</span><div><h3>Tambah area tanam</h3><p>20 koin per petak · maksimal '+F.MAX_PLOTS+' petak</p><div class="item-actions">'+[1,3,6].map(n=>action('+'+n+' petak · '+n*20+' ◉','expand','',n,farm.unlocked+n>F.MAX_PLOTS||s.coins<n*20)).join('')+'</div></div></section><div class="catalog-heading"><h3>Bangunanmu</h3><span>'+s.buildings.length+' / '+F.MAX_BUILDINGS+'</span></div>'+(s.buildings.map(b=>`<article class="layout-row"><span>${F.BUILDINGS[b.kind].icon}</span><div><b>${F.BUILDINGS[b.kind].name}</b><small>${b.readyAt<=farm.now()?'Selesai':'Sedang dibangun'} · arah ${b.rotation*90}°</small></div>${action('Pindah','move-building',b.slot,1,false,true)}</article>`).join('')||'<p class="empty-note">Bangun lumbung pertamamu melalui menu Bangun atau Toko → Bangunan.</p>')+'<div class="catalog-heading"><h3>Petak tanam</h3><span>'+farm.unlocked+' aktif</span></div><div class="layout-plots">'+s.plots.slice(0,farm.unlocked).map(p=>`<button data-action="move-plot" data-key="${p.id}" aria-label="Pindahkan petak ${p.id+1}"><span>${p.crop?F.CROPS[p.crop].icon:'🌱'}</span><b>Petak ${p.id+1}</b><small>Pindahkan ↗</small></button>`).join('')+'</div>';
 }else if(panel==='more'){
  $('panelLabel').textContent='KEGIATAN KEBUN';$('panelTitle').textContent='Ada banyak yang bisa dilakukan.';$('panelCopy').textContent='Pilih kegiatan, lalu kembali menjelajah kebunmu.';
  body.innerHTML='<div class="more-grid">'+[['layout','✥','Atur','Petak dan tata letak'],['production','🍲','Olah','Masak hasil panen'],['goals','🎯','Tujuan','Misi dan pesanan'],['livestock','🐔','Ternak','Pakan, telur, susu'],['friends','👥','Teman','Kunjungi kebun'],['inventory','📦','Tas','Persediaan dan jurnal']].map(([key,icon,name,copy])=>'<button data-action="panel" data-key="'+key+'"><span aria-hidden="true">'+icon+'</span><b>'+name+'</b><small>'+copy+'</small></button>').join('')+'</div>';
 }else if(panel==='livestock'){renderLivestock(body);
 }else if(panel==='friends'){renderFriends(body);
 }else if(panel==='production'){renderProduction(body);
 }else if(panel==='goals'){renderGoals(body);
 }else{
  $('panelLabel').textContent='LUMBUNG DAN CATATAN';$('panelTitle').textContent='Hasil kerja tanganmu.';$('panelCopy').textContent='Pantau persediaan dan perjalanan kebunmu.';
  body.innerHTML='<div class="store-wallet"><span>Hasil panen <b>'+farm.used+' / '+farm.capacity+'</b></span><span>Total dipanen <b>'+format(s.stats.harvested)+'</b></span></div><div class="item-actions">'+action('Jual hasil di pasar','shop','sell')+action('Jual olahan','shop','goods',1,false,true)+'</div><div class="inventory-grid">'+Object.entries(F.CROPS).map(([k,c])=>`<article><span>${c.icon}</span><b>${c.name}</b><small>${s.seeds[k]} bibit · ${s.produce[k]} panen</small></article>`).join('')+'</div><div class="catalog-heading"><h3>Hasil olahan</h3><span>Siap dijual</span></div><div class="inventory-grid">'+Object.entries(F.RECIPES).map(([k,r])=>`<article><span>${r.icon}</span><b>${r.name}</b><small>${s.production.goods[k]} olahan</small></article>`).join('')+'</div><div class="catalog-heading"><h3>Hasil ternak</h3></div><div class="inventory-grid">'+Object.entries(F.ANIMAL_PRODUCTS).map(([k,v])=>`<article><span>${v.icon}</span><b>${v.name}</b><small>${s.livestock.produce[k]} unit</small></article>`).join('')+'</div><div class="item"><h3>Bahan bangunan</h3>'+Object.entries(F.MATERIALS).map(([k,m])=>`<div class="inventory-stat"><span>${m.icon} ${m.name}</span><b>${s.materials[k]}</b></div>`).join('')+'</div><h3 class="section-title">Jurnal kebun</h3>'+s.log.map(e=>'<div class="log-entry">'+escape(e.text)+'<small>'+new Date(e.at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join('');
 }
}
function renderSelection(){
 if(selectedBuilding!==null){const b=farm.s.buildings.find(b=>b.slot===selectedBuilding);$('plotInfo').hidden=!b||Boolean(panel)||!entered;if(b&&!$('plotInfo').hidden){$('plotLabel').textContent='BANGUNANMU';$('plotTitle').textContent=F.BUILDINGS[b.kind].name;$('plotCopy').textContent=F.BUILDINGS[b.kind].benefit+' · '+(b.readyAt<=farm.now()?'Selesai':'Membangun '+countdown(b.readyAt-farm.now()));$('plotActions').innerHTML=(Object.values(F.ANIMALS).some(a=>a.building===b.kind)?action('Rawat ternak','livestock-pen',b.slot):'')+(Object.values(F.RECIPES).some(r=>r.building===b.kind)?action('Buka produksi','workshop',b.slot):'')+action('Pindahkan bangunan','move-building',b.slot)+action('Tata letak','panel','layout',1,false,true);}return;}
 const p=farm.s.plots[selectedPlot];$('plotInfo').hidden=selectedPlot===null||!p||Boolean(panel)||!entered;
 if($('plotInfo').hidden)return;
 $('plotLabel').textContent='PETAK '+String(selectedPlot+1).padStart(2,'0');
 if(!p.crop){const c=F.CROPS[selectedCrop];$('plotTitle').textContent='Siap ditanami.';$('plotCopy').textContent=c.name+' · '+duration(c.minutes)+' · '+farm.s.seeds[selectedCrop]+' bibit tersedia';$('plotActions').innerHTML=action('Tanam '+c.name.toLowerCase(),'plant',selectedCrop,1,!farm.s.seeds[selectedCrop])+action('Pilih bibit','panel','farm',1,false,true)+action('Pindahkan petak','move-plot',selectedPlot,1,false,true);}
 else{const c=F.CROPS[p.crop],ready=p.readyAt<=farm.now();$('plotTitle').textContent=c.icon+' '+c.name;$('plotCopy').textContent=ready?'Siap dipanen · '+c.yield+' hasil.':'Sedang tumbuh · '+countdown(p.readyAt-farm.now())+' lagi';$('plotActions').innerHTML=ready?action('Panen '+c.yield+' hasil','harvest',selectedPlot,1,farm.used+c.yield>farm.capacity):action('Lihat bibit lain','panel','farm',1,false,true);$('plotActions').innerHTML+=action('Pindahkan petak','move-plot',selectedPlot,1,false,true);if(ready&&farm.used+c.yield>farm.capacity)$('plotCopy').textContent+=' Penyimpanan penuh. Jual panen di toko.';}
}
function renderUI(){
 if(visiting)return;
 const s=farm.s;$('coinsValue').textContent=hudFormat(s.coins);$('coinsValue').title=format(s.coins);for(const k of Object.keys(F.MATERIALS)){$(k+'Value').textContent=hudFormat(s.materials[k]);$(k+'Value').title=format(s.materials[k]);}
 $('storageValue').textContent=farm.used+' / '+farm.capacity;$('storageFill').style.width=100*farm.used/farm.capacity+'%';

 $('farmName').textContent=s.profile.farmName;renderProgress();renderPlacement();renderProfile();renderPanel();renderSelection();
}
async function transact(type,args,success,cue){
 if(!gate.canPlay||transactionBusy||visiting||communityVisitBusy)return false;
 if(!authority){toast('Hubungkan ke server untuk melakukan transaksi.');return false;}
 transactionBusy=true;document.body.classList.add('transaction-busy');
 try{const result=await authority.action(type,args);if(!result?.ok){audio.play('error');toast(result?.message||'Transaksi belum dikonfirmasi.');return false;}
 if(cue)audio.play(cue);save();renderUI();if(result.levelUp)toast('Level '+result.level+' terbuka! Lihat tanaman dan bangunan baru di Tujuan.');else toast(typeof success==='function'?success(result):success||'Progres diperbarui.');return true;
 }catch{toast('Server belum dapat dihubungi. Transaksi belum dikonfirmasi.');return false;}
 finally{transactionBusy=false;document.body.classList.remove('transaction-busy');renderUI();}
}
function choosePlot(id,plantOnClick=false){
 if(!gate.canPlay||!entered||visiting||id>=farm.unlocked)return;
 selectedBuilding=null;selectedPlot=id;const p=farm.s.plots[id];
 if(p.crop&&p.readyAt<=farm.now())transact('harvest',{id},r=>'Panen masuk ke tas · +'+r.xp+' XP.','harvest');
 else if(!p.crop&&plantOnClick&&farm.s.seeds[selectedCrop])transact('plant',{id,crop:selectedCrop},F.CROPS[selectedCrop].name+' mulai tumbuh.','plant');
 closePanel();renderSelection();
}
function placementResult(){if(!placement?.point)return{ok:false,message:'Klik tanah di peta untuk memilih posisi.'};const p=placement;return p.kind==='garden'?farm.gardenPlacement(p.point,p.count,p.rotation):farm.checkPlacement(p.kind,p.point,p.rotation,{ignoreBuilding:p.moveBuilding??null,ignorePlots:p.movePlot===undefined?[]:[p.movePlot]});}
function renderPlacement(){const dock=$('placementDock');dock.hidden=!placement;dock.dataset.follow=String(Boolean(placement?.followPointer));$('map').classList.toggle('is-carrying',Boolean(placement?.followPointer));dock.dataset.demo=String(Boolean(placement?.demo));$('confirmPlacement').textContent=placement?.demo?(placement.demoPlaced?'Ubah posisi':'Letakkan preview'):'Konfirmasi ✓';$('cancelPlacement').textContent=placement?.demo?'Selesai preview':'Batal';$('previewAmbience').hidden=!placement?.demo;$('previewAmbience').textContent=placement?.dusk?'☀ Siang':'☾ Senja';$('previewAmbience').setAttribute('aria-pressed',String(Boolean(placement?.dusk)));if(!placement)return;const valid=placementResult();placement.valid=valid.ok;$('placementTitle').textContent=placement.demo?'Preview Rumah Kaca Senja':placement.kind==='garden'?'Area '+placement.count+' petak baru':placement.kind==='plot'?'Pindahkan petak '+(placement.movePlot+1):(placement.moveBuilding!==undefined?'Pindahkan ':'Bangun ')+F.BUILDINGS[placement.kind].name;$('placementCopy').textContent=placement.demoPlaced?'Coba suasana siang / senja. Geser atau zoom untuk melihat detailnya. Preview ini belum disimpan.':placement.point?(valid.ok?(placement.followPointer?'Lokasi tersedia · lepaskan atau klik untuk menempatkan.':'Lokasi tersedia · klik Konfirmasi untuk menempatkan.'):valid.message):'Klik tanah kosong untuk memilih lokasi. Seret peta untuk melihat area lain.';$('confirmPlacement').disabled=!valid.ok&&!placement.demoPlaced;$('rotatePlacement').hidden=placement.kind==='plot';dock.dataset.valid=String(valid.ok);$('placementAngle').textContent=placement.rotation*90+'°';}
function frameDecorationPreview(){
 if(camera.width>599)return;const point=placement.point,top=112,bottom=$('placementDock').getBoundingClientRect().top-$('map').getBoundingClientRect().top-30;
 const vertices=[[-75,-64,0],[-75,64,0],[75,-64,0],[75,64,0],[-52,-48,62],[-52,18,62],[52,-48,62],[52,18,62],[0,-48,99],[0,18,99]],bounds=()=>{const ps=vertices.map(([x,z,h])=>camera.worldToScreen(point.x+x,point.y+z,h));return{top:Math.min(...ps.map(p=>p.y)),bottom:Math.max(...ps.map(p=>p.y))};};
 const before=bounds(),fit=Math.min(1,Math.max(80,bottom-top)/(before.bottom-before.top));if(fit<1)camera.zoomAt(fit);const after=bounds();camera.pan(-15,(top+bottom)/2-(after.top+after.bottom)/2);
}
function beginPlacement(value){if(visiting)return;audio.play('lift');placement={rotation:0,point:camera.screenToWorld(camera.width/2,camera.height/2),followPointer:true,lifted:true,offset:{x:0,y:0},...value};pendingBuild=value.kind;selectedPlot=null;selectedBuilding=null;closePanel();renderUI();if(value.demo)frameDecorationPreview();if(!value.lifted){const p=camera.worldToScreen(placement.point.x,placement.point.y);pickup.follow(p.x,p.y);}canvas.focus();if(!value.lifted)toast('Pilih lokasi hijau, lalu lepaskan atau konfirmasi.');}
function beginDecorationPreview(){
 if(!PREMIUM_STORE_ENABLED||renderer.mode!=='3d'||!productImage('sunsetConservatory')||!gate.canPlay||!entered||visiting)return;
 let point=null;for(let y=1100;y<=1650&&!point;y+=90)for(let x=1850;x>=1100;x-=100)if(farm.checkPlacement('barn',{x,y},0).ok){point={x,y};break;}
 if(!point){toast('Tidak ada ruang kosong untuk contoh ini. Atur tata letak kebun terlebih dahulu.');return;}
 const landscape=camera.width<=760&&camera.height<=500,zoom=Math.min(2.2,(camera.width-100)/150,landscape?(camera.height-220)/126:2.2);camera.zoomAt(zoom/camera.zoom);camera.focus(point.x,point.y);if(landscape){camera.pan(-Math.max(0,camera.width/2-260),40);}
 beginPlacement({kind:'barn',product:'sunsetConservatory',demo:true,demoPlaced:false,dusk:true,point});
 toast('Preview gratis: pilih area hijau dan klik Letakkan preview. Koin dan bahan tidak dipakai.');
}
function rotatePlacement(){
 if(!placement)return;const previous=placement.rotation;placement.rotation=(previous+1)%4;
 if(placement.demoPlaced&&!placementResult().ok){placement.rotation=previous;audio.play('error');toast('Ruang untuk arah ini belum cukup. Pilih Ubah posisi terlebih dahulu.');return;}
 audio.play('rotate');renderPlacement();
}
function cancelPlacement(silent=false){if(placement&&silent!==true)audio.play('cancel');pickup.reset();placement=null;pendingBuild=null;renderUI();}
async function confirmPlacement(){
 if(!placement||!gate.canPlay||!entered||visiting||transactionBusy)return;
 if(placement.demoPlaced){placement.demoPlaced=false;placement.followPointer=true;placement.lifted=true;const screen=camera.worldToScreen(placement.point.x,placement.point.y);pickup.follow(screen.x,screen.y);renderPlacement();return;}
 const valid=placementResult();if(!valid.ok){audio.play('error');toast(valid.message);return;}
 if(placement.demo){pickup.reset();placement.demoPlaced=true;placement.followPointer=false;placement.lifted=false;renderPlacement();audio.play('place');$('toast').hidden=true;return;}
 const p=placement,point={...p.point},type=p.kind==='garden'?'expand':p.kind==='plot'?'move-plot':p.moveBuilding!==undefined?'move-building':'build';
 const args=type==='expand'?{point,count:p.count,rotation:p.rotation}:type==='move-plot'?{id:p.movePlot,point}:type==='move-building'?{slot:p.moveBuilding,point,rotation:p.rotation}:{kind:p.kind,point,rotation:p.rotation};
 if(await transact(type,args,type==='expand'?'Area tanam baru siap digunakan.':type==='build'?'Pembangunan dimulai · +10 XP.':'Tata letak diperbarui.',type==='build'?'build':'place')){if(placement===p)cancelPlacement(true);}
}
function chooseLocation(point){
 if(!gate.canPlay||!entered||visiting)return;
 if(placement?.demoPlaced)return;
 if(placement){placement.point={x:Math.round(point.x),y:Math.round(point.y)};renderPlacement();return;}
 const building=renderer.pickBuilding?.(point)??farm.s.buildings.find(b=>{const size=F.footprint(b.kind,b.rotation);return Math.abs(b.x-point.x)<size.w/2&&Math.abs(b.y-point.y)<size.h/2;})?.slot;
 if(Number.isInteger(building)){selectedPlot=null;selectedBuilding=building;closePanel();renderSelection();return;}
 const hit=renderer.pickPlot?.(point);if(hit===-1){selectedPlot=null;selectedBuilding=null;renderSelection();return;}if(Number.isInteger(hit)){choosePlot(hit,true);return;}
 const p=farm.s.plots.slice(0,farm.unlocked).find(p=>Math.abs(p.x-point.x)<31&&Math.abs(p.y-point.y)<30);if(p)choosePlot(p.id,true);else{selectedPlot=null;selectedBuilding=null;renderSelection();}
}
function onAction(event){
 const b=event.target.closest('button[data-action]');if(!b||b.disabled||!gate.canPlay||!entered||visiting)return;
 const {action:type,key}=b.dataset,qty=Number(b.dataset.qty||1);
 if(type==='select'){selectedCrop=key;pendingBuild=null;placement=null;closePanel();toast('Bibit '+F.CROPS[key].name.toLowerCase()+' dipilih. Klik petak kosong.');renderUI();}
 else if(type==='plot')choosePlot(Number(key));
 else if(['pen','livestock-pen','animal','feed','animal-collect','animal-sell','sharing','unfriend','refresh-friends','visit','copy-farm'].includes(type))communityAction(type,key);
 else if(type==='plant')transact('plant',{id:selectedPlot,crop:key},F.CROPS[key].name+' mulai tumbuh.','plant');
 else if(type==='harvest')transact('harvest',{id:Number(key)},r=>'Hasil panen masuk ke tas · +'+r.xp+' XP.','harvest');
 else if(type==='seed')transact('seed',{crop:key,qty},'Membeli '+qty+' bibit '+F.CROPS[key].name.toLowerCase()+'.','buy');
 else if(type==='sell')transact('sell',{crop:key,qty},r=>'Penjualan berhasil · +'+r.earned+' koin.','sell');
 else if(type==='goods')transact('goods',{recipe:key,qty},r=>'Penjualan olahan berhasil · +'+r.earned+' koin.','sell');
 else if(type==='production')transact('production',{slot:productionSlot,recipe:key},'Bahan masuk ke antrean. Produksi tetap berjalan saat kamu pergi.','build');
 else if(type==='collect')transact('collect',{id:Number(key)},r=>'Olahan masuk ke tas · +'+r.xp+' XP.','harvest');
 else if(type==='daily'||type==='achievement')transact(type,type==='daily'?{id:key}:{key},r=>'Hadiah diambil · +'+r.seeds+' bibit wortel · +'+r.xp+' XP.'+(r.decoration?' Pot bunga terbuka di Bangun.':''),'harvest');
 else if(type==='workshop'){productionSlot=Number(key);panel=null;openPanel('production');}
 else if(type==='locate-building'){const v=farm.s.buildings.find(v=>v.slot===Number(key));if(v){closePanel();camera.focus(v.x,v.y);selectedBuilding=v.slot;renderSelection();}}
 else if(type==='material')transact('material',{material:key,qty},'Membeli '+qty+' '+F.MATERIALS[key].name.toLowerCase()+'.','buy');
 else if(type==='decor-preview'&&key==='sunsetConservatory')beginDecorationPreview();
 else if(type==='build')beginPlacement({kind:key});
 else if(type==='expand')beginPlacement({kind:'garden',count:qty});
 else if(type==='move-plot'){const p=farm.s.plots[Number(key)];camera.focus(p.x,p.y);beginPlacement({kind:'plot',movePlot:p.id,point:{x:p.x,y:p.y}});}
 else if(type==='move-building'){const b=farm.s.buildings.find(v=>v.slot===Number(key));camera.focus(b.x,b.y);beginPlacement({kind:b.kind,moveBuilding:b.slot,rotation:b.rotation,point:{x:b.x,y:b.y}});}
 else if(type==='inspect'){storeItem=key;tradeQty=1;renderPanel();$('panelBody').parentElement.scrollTop=0;}
 else if(type==='quantity'){tradeQty=Math.max(1,Math.min(sellingShop()?Math.max(1,stock(storeItem)):100,tradeQty+qty));renderPanel();}
 else if(type==='preset'){tradeQty=qty;renderPanel();}
 else if(type==='kit')transact('kit',{kind:key},'Bahan bangunan sudah masuk ke tas.','buy');
 else if(type==='building-shop'){shop='buildings';storeItem=key;panel=null;openPanel('shop');}
 
 else if(type==='order')transact('order',{id:key},r=>'Pesanan terkirim · +'+r.earned+' koin · +'+r.xp+' XP.','sell');
 else if(type==='tutorial')transact('tutorial',{dismissed:key==='dismiss'},key==='dismiss'?'Panduan disimpan. Buka lagi lewat Tujuan.':'Panduan dilanjutkan.');
 else if(type==='guide')guideAction();
 else if(type==='retry')authority?.flush();
 else if(type==='cancel')cancelPlacement();
 else if(type==='shop'){shop=key;storeItem=Object.keys(storeKinds())[0];tradeQty=1;panel=null;openPanel('shop');}
 else if(type==='panel'){panel=null;openPanel(key);}
}
$('panelBody').addEventListener('click',onAction);$('plotActions').addEventListener('click',onAction);$('progressBadge').addEventListener('click',()=>openPanel('goals'));
for(const[name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory'],['layout','openLayout'],['goals','openGoals'],['production','openProduction'],['livestock','openLivestock'],['friends','openFriends'],['more','openMore']])$(id).addEventListener('click',()=>openPanel(name));
for(const b of document.querySelectorAll('[data-shop]'))b.addEventListener('click',()=>{shop=b.dataset.shop;storeItem=Object.keys(storeKinds())[0];tradeQty=1;renderPanel();});
$('closePanel').addEventListener('click',()=>{closePanel();$('openFarm').focus();});
$('startButton').addEventListener('click',()=>gate.canPlay?enter():document.dispatchEvent(new Event('bara:account-open')));
for(const[id,dialog]of[['menuButton','menuDialog']])$(id).addEventListener('click',()=>{if(placement?.followPointer)cancelPlacement();else pickup.reset();$(dialog).showModal();});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
for(const b of document.querySelectorAll('[data-help]'))b.addEventListener('click',()=>{$('menuDialog').close();$('helpDialog').showModal();});
$('mobileStorage').addEventListener('click',()=>{panel=null;openPanel('inventory');});
$('cameraControls').addEventListener('click',()=>{const tools=$('zoomTools'),open=tools.dataset.expanded!=='true';tools.dataset.expanded=String(open);$('cameraControls').setAttribute('aria-expanded',String(open));});
$('cameraControls').hidden=!camera.rotate;
$('saveButton').addEventListener('click',async()=>{if(gate.canPlay){const result=await authority?.flush();toast(result?.ok?'Progres online dimuat.':result?.message||'Periksa status akun.');}else document.dispatchEvent(new Event('bara:account-open'));});
function pickMovable(point){
 if(placement||visiting)return null;
 const building=renderer.pickBuilding?.(point)??farm.s.buildings.find(b=>{const size=F.footprint(b.kind,b.rotation);return Math.abs(b.x-point.x)<size.w/2&&Math.abs(b.y-point.y)<size.h/2;})?.slot;
 if(Number.isInteger(building)){const b=farm.s.buildings.find(b=>b.slot===building);return{kind:b.kind,moveBuilding:b.slot,rotation:b.rotation,origin:{x:b.x,y:b.y}};}
 const hit=renderer.pickPlot?.(point);if(hit===-1)return null;
 const p=Number.isInteger(hit)?farm.s.plots[hit]:farm.s.plots.slice(0,farm.unlocked).find(p=>Math.abs(p.x-point.x)<31&&Math.abs(p.y-point.y)<30);
 return p&&p.id<farm.unlocked?{kind:'plot',movePlot:p.id,origin:{x:p.x,y:p.y}}:null;
}
const gestures=new MapGesture(camera,chooseLocation),canvas=$('worldCanvas');
const pickup=new FarmPickupGesture(camera,gestures,{
 enabled:()=>gate.canPlay&&entered&&!document.hidden&&!document.querySelector('dialog[open]'),
 active:()=>Boolean(placement?.followPointer),pick:pickMovable,
 hold:p=>{const hint=$('pickupHint');hint.hidden=!p;if(p){hint.style.left=p.x+'px';hint.style.top=p.y+'px';}},
 lift:(target,point)=>{if(!gate.canPlay||!entered)return false;beginPlacement({...target,point:target.origin,followPointer:true,lifted:true,offset:{x:target.origin.x-point.x,y:target.origin.y-point.y}});toast('Objek terangkat. Pilih lokasi hijau.');return true;},
 move:point=>{if(!placement?.followPointer||!gate.canPlay||!entered)return;const next={x:Math.round(point.x+placement.offset.x),y:Math.round(point.y+placement.offset.y)};if(placement.point?.x===next.x&&placement.point?.y===next.y)return;placement.point=next;renderPlacement();},
 drop:confirmPlacement,cancel:cancelPlacement
});
const pointer=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(!entered||![0,1,2].includes(e.button))return;const p=pointer(e);if(e.button)e.preventDefault();canvas.setPointerCapture(e.pointerId);pickup.down(e.pointerId,p.x,p.y,{pan:e.button!==0,pointerType:e.pointerType});});
canvas.addEventListener('pointermove',e=>{const p=pointer(e);pickup.move(e.pointerId,p.x,p.y,{pointerType:e.pointerType});});
canvas.addEventListener('pointerleave',()=>pickup.leave());
canvas.addEventListener('pointerup',e=>{const p=pointer(e);pickup.up(e.pointerId,p.x,p.y);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',e=>pickup.cancel(e.pointerId));canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{if(placement?.followPointer)cancelPlacement(true);else pickup.reset();});
canvas.addEventListener('wheel',e=>{if(!entered)return;e.preventDefault();const p=pointer(e);camera.zoomAt(Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
$('zoomIn').addEventListener('click',()=>camera.zoomAt(1.2));$('zoomOut').addEventListener('click',()=>camera.zoomAt(1/1.2));$('centerFarm').addEventListener('click',center);
$('rotateLeft').addEventListener('click',()=>camera.rotate?.(-Math.PI/8));$('rotateRight').addEventListener('click',()=>camera.rotate?.(Math.PI/8));
$('environmentMotion').checked=renderer.wind!==false;$('environmentMotion').addEventListener('change',e=>{try{localStorage.setItem('6xg:motion',String(e.target.checked));}catch{}renderer.setMotion?.(e.target.checked);});
$('graphicsQuality').addEventListener('change',e=>{save();try{localStorage.setItem('6xg:graphics',e.target.value);}catch{}location.reload();});
try{$('graphicsQuality').value=localStorage.getItem('6xg:graphics')||'auto';}catch{}
$('miniMap').addEventListener('click',e=>{if(!entered)return;const r=e.currentTarget.getBoundingClientRect();camera.focus((e.clientX-r.left)/r.width*3200,(e.clientY-r.top)/r.height*2200);});
for(const target of[canvas,$('miniMap')])target.addEventListener('keydown',e=>{if(!entered)return;const shifts={ArrowLeft:[90,0],ArrowRight:[-90,0],ArrowUp:[0,90],ArrowDown:[0,-90]};if(shifts[e.key]){e.preventDefault();camera.pan(...shifts[e.key]);}else if(e.key==='Home'){e.preventDefault();center();}else if(e.key==='q'||e.key==='Q')camera.rotate?.(-Math.PI/8);else if(e.key==='e'||e.key==='E')camera.rotate?.(Math.PI/8);else if(e.key==='+'||e.key==='=')camera.zoomAt(1.2);else if(e.key==='-')camera.zoomAt(1/1.2);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelPlacement();selectedPlot=null;selectedBuilding=null;closePanel();renderUI();}else if((e.key==='r'||e.key==='R')&&placement&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){rotatePlacement();}});
let mobileViewport=null,mapWidth=0;
const resize=()=>{const r=$('map').getBoundingClientRect(),mobile=r.width<=760;camera.resize(r.width,r.height);if(mobileViewport!==null&&(mobile!==mobileViewport||(mobile&&Math.abs(r.width-mapWidth)>1))&&entered&&!placement){center();renderUI();}mobileViewport=mobile;mapWidth=r.width;};new ResizeObserver(resize).observe($('map'));resize();center();
let lastPlacementFrame=performance.now();
function draw(){const tick=performance.now();pickup.update((tick-lastPlacementFrame)/1000);lastPlacementFrame=tick;const sceneFarm=visiting?.farm||farm;renderer.draw(sceneFarm,{selectedPlot,pendingBuild,placement,selectedCrop,now:sceneFarm.now(),welcome:!entered});renderer.mini($('miniMap'),sceneFarm);$('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';requestAnimationFrame(draw);}requestAnimationFrame(draw);
setInterval(()=>{const now=farm.now();if(visiting)return;renderProgress();tickCommunityUI(now);audio.observe(farm,camera,now);tickProductionUI(now);const signature=farm.s.livestock.animals.map(a=>a.id+':'+a.fedAt+':'+Number(a.readyAt<=now)).join(',')+'|'+farm.s.challenges.day+'|'+farm.s.production.jobs.map(j=>j.id+':'+Number(j.readyAt<=now)+':'+Number(j.startedAt<=now)).join(',')+'|'+farm.unlocked+'|'+farm.capacity+'|'+farm.s.plots.filter(p=>p.crop&&p.readyAt<=now).map(p=>p.id).join(',')+'|'+farm.s.buildings.filter(b=>b.readyAt<=now).length;if(signature!==uiSignature){uiSignature=signature;renderUI();}else if(selectedPlot!==null){const p=farm.s.plots[selectedPlot];if(p?.crop&&p.readyAt>now)$('plotCopy').textContent='Sedang tumbuh · '+countdown(p.readyAt-now)+' lagi';}},1000);
window.addEventListener('pagehide',()=>{save();audio.setVisible(false);});document.addEventListener('visibilitychange',()=>{audio.setVisible(!document.hidden);if(document.hidden){save();if(placement?.followPointer)cancelPlacement();else pickup.reset();}else renderUI();});setInterval(save,60000);
const AVATAR_ICONS={sprout:'🌱',sunflower:'🌻',apple:'🍎',bee:'🐝'};
let photoDraft,photoBusy=false,photoGeneration=0,profileDirty=false;
function resetPhotoDraft(){photoGeneration++;photoDraft=undefined;photoBusy=false;profileDirty=false;$('profileBody').replaceChildren();}
function previewAvatar(photo,avatar){const holder=$('profileAvatar');holder.replaceChildren();if(photo){const img=document.createElement('img');img.src=photo;img.alt='Pratinjau foto profil';holder.append(img);}else holder.textContent=AVATAR_ICONS[avatar]||'🌱';}
function renderProfile(){const holder=$('profileBody');holder.hidden=!gate.canPlay;if(!gate.canPlay){holder.replaceChildren();return;}const p=farm.s.profile;if(!holder.querySelector('form'))holder.innerHTML=`<div class="profile-banner"><div class="profile-avatar" id="profileAvatar">🌱</div><span>PEKEBUN LEMBAH BARA</span><h3 id="profileHeading">Pekebun</h3><p id="profileFarm">Kebunku</p><button class="profile-play" id="profilePlay" type="button">Ke kebun ↗</button></div><div class="profile-stats"><div><b id="profileHarvest">0</b><span>Hasil dipanen</span></div><div><b id="profileEarned">0</b><span>Koin penjualan</span></div><div><b id="profilePlots">9</b><span>Petak terbuka</span></div></div><form id="profileForm"><div class="profile-fields"><label>Nama pekebun<input name="name" required maxlength="24" autocomplete="nickname"></label><label>Nama kebun<input name="farmName" required maxlength="24" autocomplete="off"></label></div><div class="photo-controls"><label class="photo-upload" for="profilePhoto">Pilih foto dari perangkat<input id="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photoHelp"></label><button class="photo-remove" id="removePhoto" type="button">Hapus foto</button><small id="photoHelp">JPG, PNG, WebP · Maks. 10 MB. Bagian tengah dipotong persegi. Klik Simpan profil untuk menggunakan foto.</small></div><fieldset class="avatar-options"><legend>Atau gunakan avatar kebun</legend>${F.AVATARS.map(k=>`<label title="${({sprout:'Tunas',sunflower:'Bunga matahari',apple:'Apel',bee:'Lebah'})[k]}"><input type="radio" name="avatar" value="${k}" aria-label="${({sprout:'Tunas',sunflower:'Bunga matahari',apple:'Apel',bee:'Lebah'})[k]}"><span>${AVATAR_ICONS[k]}</span></label>`).join('')}</fieldset><div class="profile-save"><button class="action" id="profileSubmit" type="submit">Simpan profil</button><span id="profileFeedback" role="status"></span></div></form>`;
 $('profileHeading').textContent=p.name;$('profileFarm').textContent=p.farmName;$('profileHarvest').textContent=format(farm.s.stats.harvested);$('profileEarned').textContent=format(farm.s.stats.earned);$('profilePlots').textContent=farm.unlocked;
 const form=$('profileForm');if(!profileDirty){form.elements.name.value=p.name;form.elements.farmName.value=p.farmName;form.elements.avatar.value=p.avatar;}
 previewAvatar(photoDraft!==undefined?photoDraft:p.photo,form.elements.avatar.value||p.avatar);$('profileSubmit').disabled=photoBusy;$('removePhoto').disabled=photoBusy||!(photoDraft!==undefined?photoDraft:p.photo);
}
$('profileBody').addEventListener('click',e=>{if(e.target.closest('#profilePlay')&&gate.canPlay){$('accountDialog').close();enter();}if(e.target.closest('#removePhoto')&&gate.canPlay){photoGeneration++;photoDraft=null;photoBusy=false;$('profilePhoto').value='';previewAvatar(null,$('profileForm').elements.avatar.value);$('removePhoto').disabled=true;$('profileFeedback').textContent='Foto dihapus dari pratinjau. Simpan profil untuk menerapkan.';}});
$('profileBody').addEventListener('input',()=>{if(gate.canPlay)profileDirty=true;});
$('profileBody').addEventListener('submit',async e=>{e.preventDefault();if(!gate.canPlay||photoBusy)return;const data=new FormData(e.target),profile={name:data.get('name'),farmName:data.get('farmName'),avatar:data.get('avatar')},photo=photoDraft!==undefined?photoDraft:farm.s.profile.photo;if(photo)profile.photo=photo;
 if(await transact('profile',{profile},'Profil diperbarui.')){photoDraft=undefined;profileDirty=false;renderUI();window.dispatchEvent(new Event('bara:profile'));$('profileFeedback').textContent='Profil diperbarui.';}});
$('profileBody').addEventListener('change',async e=>{if(!gate.canPlay)return;profileDirty=true;if(e.target.name==='avatar'){photoGeneration++;photoDraft=null;photoBusy=false;$('profilePhoto').value='';previewAvatar(null,e.target.value);$('profileSubmit').disabled=false;$('removePhoto').disabled=true;return;}if(e.target.id!=='profilePhoto'||!e.target.files[0])return;const currentFarm=farm,key=activeSaveKey,generation=++photoGeneration,form=$('profileForm');photoBusy=true;$('profileSubmit').disabled=true;$('removePhoto').disabled=true;$('profileFeedback').textContent='Menyiapkan foto…';try{const photo=await prepareFarmPhoto(e.target.files[0]);if(generation!==photoGeneration||farm!==currentFarm||activeSaveKey!==key||!gate.canPlay||!form.isConnected)return;photoDraft=photo;previewAvatar(photo,form.elements.avatar.value);$('profileFeedback').textContent='Foto siap. Klik Simpan profil.';}catch(error){if(generation===photoGeneration&&farm===currentFarm&&form.isConnected)$('profileFeedback').textContent=error.message||'Gambar tidak bisa dibaca. Pilih foto lain.';}finally{if(generation===photoGeneration&&farm===currentFarm&&form.isConnected){photoBusy=false;$('profileSubmit').disabled=false;$('removePhoto').disabled=!(photoDraft!==undefined?photoDraft:farm.s.profile.photo);e.target.value='';}}});
$('confirmPlacement').addEventListener('click',confirmPlacement);$('cancelPlacement').addEventListener('click',()=>{const demo=placement?.demo;cancelPlacement();if(demo){shop='premium';openPanel('shop');}});$('rotatePlacement').addEventListener('click',rotatePlacement);$('previewAmbience').addEventListener('click',()=>{if(placement?.demo){placement.dusk=!placement.dusk;renderPlacement();}});
window.addEventListener('bara:art',()=>{if(panel==='shop'&&shop==='premium')renderPanel();for(const img of document.querySelectorAll('img[data-art]')){const source=productImage(img.dataset.art);if(source){img.src=source;img.hidden=false;img.parentElement.querySelector('.product-emoji')?.remove();}}});

function syncSoundUI(){
 const s=audio.settings,muted=!s.enabled||s.volume===0;$('soundToggle').textContent=muted?'🔇':'🔊';$('soundToggle').setAttribute('aria-pressed',String(muted));$('soundToggle').setAttribute('aria-label',muted?'Aktifkan suara permainan':'Matikan suara permainan');$('soundToggle').title=muted?'Aktifkan suara permainan':'Matikan suara permainan';$('soundEnabled').checked=s.enabled;
 for(const[key,id]of[['volume','soundVolume'],['effects','effectsVolume'],['ambience','ambienceVolume']]){$(id).value=Math.round(s[key]*100);$(id+'Value').textContent=Math.round(s[key]*100)+'%';}
 $('soundStatus').textContent=audio.unavailable?'Suara tidak didukung perangkat ini.':muted?'Suara dimatikan.':audio.unlocked?'Suara aktif · pengaturan tersimpan.':'Ketuk layar atau Dengarkan contoh untuk mengaktifkan suara.';$('soundPreview').disabled=muted||audio.unavailable;
}
for(const type of['pointerdown','keydown'])document.addEventListener(type,e=>{if(e.isTrusted)audio.unlock();},{capture:true});
$('soundToggle').addEventListener('click',()=>{const s=audio.settings;audio.configure({enabled:!s.enabled||s.volume===0,...(s.volume===0?{volume:.65}:{})});audio.unlock();});
$('soundEnabled').addEventListener('change',e=>{audio.configure({enabled:e.target.checked});audio.unlock();});
for(const[key,id]of[['volume','soundVolume'],['effects','effectsVolume'],['ambience','ambienceVolume']]){$(id).addEventListener('input',e=>{audio.configure({[key]:Number(e.target.value)/100});audio.unlock();});$(id).addEventListener('change',()=>audio.play('tap',{preview:true}));}
$('soundPreview').addEventListener('click',()=>audio.preview());
document.addEventListener('click',e=>{if(e.target.closest('.toolbar button,.topbar nav #menuButton,#shopTabs button,[data-close],#zoomIn,#zoomOut,#rotateLeft,#rotateRight,#centerFarm'))audio.play('tap');});
audio.setVisible(!document.hidden);syncSoundUI();

// Narrow account adapter; no anonymous game save is attached or exported.
window.LadangBara={
 setIdentity(id){resetCommunity();authority=null;serverAnchor=null;save();resetPhotoDraft();pickup.reset();gate.setIdentity(id);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;placement=null;selectedBuilding=null;selectedPlot=null;closePanel();refreshGate();renderUI();window.dispatchEvent(new Event('bara:profile'));},
 attach(key,raw){resetCommunity();resetPhotoDraft();pickup.reset();const next=new F.Farm({save:raw,clock:serverClock});gate.attach(key);farm=next;activeSaveKey=key;entered=false;selectedCrop='carrot';placement=null;pendingBuild=null;selectedPlot=null;selectedBuilding=null;save();refreshGate();renderUI();},
 detach(){resetCommunity();authority=null;serverAnchor=null;save();resetPhotoDraft();pickup.reset();gate.setIdentity(null);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;placement=null;selectedBuilding=null;selectedPlot=null;closePanel();refreshGate();renderUI();window.dispatchEvent(new Event('bara:profile'));},
 connectActions(session){authority=session;const invite=pendingFarmInvite;if(invite&&!inviteAttempted&&entered){inviteAttempted=true;try{sessionStorage.removeItem('6xg:visit-invite');}catch{}visitFriend(invite);}},
 receiveState(data){if(!gate.canPlay||!data?.save)return;serverAnchor={time:data.serverTime,tick:performance.now()};farm=new F.Farm({save:data.save,clock:serverClock});save();renderUI();},
 snapshot:()=>farm.serialize(),validate:raw=>{try{F.validateSave(JSON.parse(raw));return true;}catch{return false;}},legacySnapshot:()=>null,
 profile:()=>gate.canPlay?{...farm.s.profile}:null,canPlay:()=>gate.canPlay,enter,pause:save,setSaveStatus:text=>{$('saveStatus').textContent=text;},setSaveNote:text=>{$('saveNote').textContent=text;}
};
refreshGate();renderUI();
