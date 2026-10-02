'use strict';
const F=BaraFarm,$=id=>document.getElementById(id),gate=new AccountGate('6xg-farm:');
const {camera,renderer}=typeof Farm3D!=='undefined'?Farm3D.create($('worldCanvas')):(()=>{const camera=new MapCamera();$('rotateLeft').hidden=true;$('rotateRight').hidden=true;$('cameraPosition').textContent='TAMPILAN 2D';return{camera,renderer:new FarmRenderer($('worldCanvas'),camera)};})();
let farm=new F.Farm(),activeSaveKey=null,entered=false,selectedCrop='carrot',selectedPlot=null,pendingBuild=null,panel=null,shop='seeds',storeItem='carrot',tradeQty=1,placement=null,selectedBuilding=null,toastTimer=null,uiSignature='';
const format=n=>new Intl.NumberFormat('id-ID').format(n);
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
 document.body.classList.toggle('account-locked',!gate.canPlay);$('welcome').hidden=entered&&gate.canPlay;
 $('startButton').textContent=gate.canPlay?'Mainkan kebunmu ↗':'Masuk / Daftar ↗';
 $('welcomeCopy').innerHTML=gate.canPlay?'Kebunmu menunggu.<br>Tanaman tetap tumbuh saat kamu pergi.':'Tanam harapan. Petik hasilnya.<br>Kembangkan kebun kecilmu menjadi dunia milikmu.';
}
function enter(){if(!gate.canPlay)return false;entered=true;refreshGate();center();$('worldCanvas').focus();return true;}
function center(){if(camera.home)camera.home();else camera.focus(1590,1135);}
function closePanel(){panel=null;$('farmPanel').hidden=true;document.querySelectorAll('.toolbar button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-expanded','false');});renderSelection();}
function openPanel(view){
 if(!gate.canPlay||!entered)return;
 pickup.reset();
 placement=null;pendingBuild=null;$('placementDock').hidden=true;
 if(panel===view){closePanel();return;}
 panel=view;selectedPlot=null;selectedBuilding=null;$('plotInfo').hidden=true;$('farmPanel').hidden=false;
 for(const [name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory'],['layout','openLayout']]){$(id).classList.toggle('active',view===name);$(id).setAttribute('aria-expanded',String(view===name));}
 renderPanel();
}
const storeKinds=()=>shop==='materials'?F.MATERIALS:shop==='buildings'?F.BUILDINGS:F.CROPS;
const picture=(key,icon)=>`<img data-art="${key}" ${renderer.catalogue?.[key]?'src="'+renderer.catalogue[key]+'"':'hidden'} alt="" loading="lazy">${renderer.catalogue?.[key]?'':'<span class="product-emoji" aria-hidden="true">'+icon+'</span>'}`;
const stock=(key)=>shop==='sell'?farm.s.produce[key]:shop==='materials'?farm.s.materials[key]:shop==='buildings'?farm.s.buildings.filter(b=>b.kind===key).length:farm.s.seeds[key];
function buildingCosts(key){return Object.entries(F.BUILDINGS[key].cost).map(([k,n])=>`<span class="cost-chip ${farm.s.materials[k]>=n?'enough':'missing'}">${F.MATERIALS[k].icon} ${farm.s.materials[k]} / ${n}</span>`).join('');}
function tradeLimit(key){const c=storeKinds()[key];if(shop==='sell')return Math.max(1,farm.s.produce[key]);if(shop==='buildings')return 1;return Math.max(1,Math.min(100,Math.floor(farm.s.coins/c.price),(shop==='materials'?10000-farm.s.materials[key]:1000-farm.s.seeds[key])));}
function renderStore(){
 const kinds=storeKinds();if(!Object.hasOwn(kinds,storeItem))storeItem=Object.keys(kinds)[0];const c=kinds[storeItem],s=farm.s,isBuild=shop==='buildings',selling=shop==='sell',type=selling?'sell':shop==='materials'?'material':'seed';tradeQty=Math.max(1,Math.min(tradeQty,selling?Math.max(1,stock(storeItem)):100));const total=tradeQty*(selling?c.sell:c.price),can=selling?stock(storeItem)>=tradeQty:s.coins>=total&&(stock(storeItem)+tradeQty<=(shop==='materials'?10000:1000));
 const detail=`<section class="trade-detail"><div class="trade-product"><div class="trade-art">${picture(storeItem,c.icon)}</div><div><span class="product-type">${isBuild?'ARSITEKTUR KEBUN':selling?'HASIL DARI KEBUNMU':shop==='materials'?'BAHAN PILIHAN':'BIBIT PILIHAN'}</span><h3>${c.name}</h3><p>${isBuild?c.benefit:shop==='materials'?'Bahan untuk membangun dan mengembangkan kebun.':duration(c.minutes)+' tumbuh · '+c.yield+' hasil / bibit'}</p><small>${isBuild?c.seconds+' detik pembangunan':'Tersimpan: '+format(stock(storeItem))+' '+(shop==='seeds'?'bibit':shop==='materials'?'unit':'hasil')}</small></div></div>`+(isBuild?`<div class="cost-list">${buildingCosts(storeItem)}</div><div class="trade-buttons">${action('Pilih lokasi di peta','build',storeItem,1,!farm.canBuild(storeItem)||s.buildings.length>=F.MAX_BUILDINGS)}${action('Beli bahan yang kurang · '+farm.buildKitQuote(storeItem).cost+' ◉','kit',storeItem,1,!farm.buildKitQuote(storeItem).cost||farm.buildKitQuote(storeItem).cost>s.coins,true)}</div>`:`<div class="quantity-line"><span>Jumlah</span><div class="quantity-control">${action('−','quantity',storeItem,-1,tradeQty<=1,true)}<output aria-label="Jumlah transaksi">${tradeQty}</output>${action('+','quantity',storeItem,1,tradeQty>=(selling?Math.max(1,stock(storeItem)):100),true)}</div><div class="quantity-presets">${action('5','preset',storeItem,5,false,true)}${action('Maks','preset',storeItem,tradeLimit(storeItem),false,true)}</div></div><div class="trade-total"><span>${selling?'Kamu menerima':'Total belanja'}<small>${tradeQty} × ${selling?c.sell:c.price} koin</small></span><b>◉ ${format(total)}</b></div>${action((selling?'Jual ':'Beli ')+tradeQty+' '+(shop==='seeds'?'bibit ':'')+c.name.toLowerCase(),type,storeItem,tradeQty,!can)}${!can?'<p class="trade-warning">'+(selling?'Panen tanamanmu terlebih dahulu.':s.coins<total?'Perlu '+format(total-s.coins)+' koin lagi.':'Penyimpanan produk ini sudah penuh.')+'</p>':''}`)+'</section>';
 return `<div class="store-wallet"><span>Dompetmu <b>◉ ${format(s.coins)}</b></span><span>Tas panen <b>${farm.used} / ${farm.capacity}</b></span></div>${detail}<div class="catalog-heading"><h3>${selling?'Hasil panen':isBuild?'Katalog bangunan':shop==='materials'?'Bahan bangunan':'Katalog bibit'}</h3><span>${Object.keys(kinds).length} pilihan</span></div><div class="product-grid">`+Object.entries(kinds).map(([key,item])=>`<button class="product-card ${storeItem===key?'selected':''}" data-action="inspect" data-key="${key}" aria-pressed="${storeItem===key}"><div class="product-art">${picture(key,item.icon)}<span class="product-stock">${stock(key)} ${isBuild?'dibangun':shop==='seeds'?'bibit':'unit'}</span></div><div class="product-info"><h3>${item.name}</h3><small>${isBuild?item.benefit:shop==='materials'?'Bahan pembangunan':duration(item.minutes)}</small><div class="product-price"><b>${isBuild?Object.entries(item.cost).map(([k,n])=>F.MATERIALS[k].icon+' '+n).join(' · '):'◉ '+(selling?item.sell:item.price)}</b><span>${isBuild?'Lihat':'Pilih'} ↗</span></div></div></button>`).join('')+'</div>';
}
function renderPanel(){
 if(!panel)return;
 $('shopTabs').hidden=panel!=='shop';document.querySelectorAll('[data-shop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shop===shop)));
 const body=$('panelBody'),s=farm.s;$('farmPanel').dataset.view=panel;
 if(panel==='farm'){
  $('panelLabel').textContent='KEBUNMU';$('panelTitle').textContent='Tanam hari yang baik.';$('panelCopy').textContent='Pilih bibit lalu klik tanah kosong. Tanaman matang bisa langsung dipanen.';
  body.innerHTML='<div class="seed-shelf">'+Object.entries(F.CROPS).filter(([key])=>s.seeds[key]>0).map(([key,c])=>`<button class="seed-card ${selectedCrop===key?'selected':''}" data-action="select" data-key="${key}"><div class="seed-art">${picture(key,c.icon)}</div><h3>${c.name}</h3><small>${duration(c.minutes)} · ${s.seeds[key]} bibit</small><span>${selectedCrop===key?'✓ Dipilih':'Pilih bibit ↗'}</span></button>`).join('')+'</div>';
  if(!Object.values(s.seeds).some(Boolean))body.innerHTML='<div class="empty-state"><span>🌱</span><h3>Siap untuk panen berikutnya?</h3><p>Belanja bibit baru dengan koin hasil kebunmu.</p></div>';
  body.innerHTML+='<div class="item-actions">'+action('Belanja bibit','shop','seeds',1,false,true)+action('Atur tata letak','panel','layout',1,false,true)+'</div><div class="catalog-heading"><h3>'+farm.unlocked+' petak terbuka</h3><span>Klik untuk melihat</span></div><div class="plot-grid">'+s.plots.slice(0,farm.unlocked).map(p=>{const ready=p.crop&&p.readyAt<=farm.now();return`<button data-action="plot" data-key="${p.id}" class="${ready?'ready':''}" aria-label="Petak ${p.id+1}, ${p.crop?F.CROPS[p.crop].name+(ready?', siap panen':', sedang tumbuh'):'kosong'}">${p.crop?F.CROPS[p.crop].icon:'+'} ${p.id+1}${ready?' ✓':''}</button>`;}).join('')+'</div>';
 }else if(panel==='shop'){
  $('panelLabel').textContent='PASAR LEMBAH';$('panelTitle').textContent=shop==='sell'?'Hasilmu punya nilai.':shop==='buildings'?'Bangun dunia milikmu.':shop==='materials'?'Bekal untuk membangun.':'Ada yang ingin ditanam?';$('panelCopy').textContent=shop==='sell'?'Pilih panen, atur jumlah, lalu jual untuk mendapatkan koin.':shop==='buildings'?'Beli bahan yang kurang, lalu tentukan sendiri lokasi bangunan.':'Pilih produk dan jumlahnya. Semua harga menggunakan koin kebun.';body.innerHTML=renderStore();
 }else if(panel==='build'){
  $('panelLabel').textContent='ARSITEKTUR KEBUN';$('panelTitle').textContent='Tempat untuk bertumbuh.';$('panelCopy').textContent='Bangunan bebas ditempatkan di tanah terbuka. Putar, tinjau, lalu konfirmasi.';
  body.innerHTML='<div class="building-grid">'+Object.entries(F.BUILDINGS).map(([key,b])=>`<article class="building-card"><div class="building-art">${picture(key,b.icon)}</div><div class="building-copy"><h3>${b.name}</h3><p>${b.benefit} · ${b.seconds} detik</p><div class="cost-list">${buildingCosts(key)}</div><div class="item-actions">${action('Pilih tempat','build',key,1,!farm.canBuild(key)||s.buildings.length>=F.MAX_BUILDINGS)}${action('Belanja bahan','building-shop',key,1,false,true)}</div></div></article>`).join('')+'</div><div class="item-actions">'+action('Pindahkan bangunan / petak','panel','layout',1,false,true)+'</div>';
 }else if(panel==='layout'){
  $('panelLabel').textContent='STUDIO TATA LETAK';$('panelTitle').textContent='Kebun sesuai caramu.';$('panelCopy').textContent='Tahan bangunan atau petak di peta selama 3 detik untuk mengangkatnya. Geser ke lokasi hijau, lalu lepaskan. Tanaman tetap tumbuh.';
  body.innerHTML='<section class="layout-expansion"><span class="layout-icon">🌿</span><div><h3>Tambah area tanam</h3><p>20 koin per petak · maksimal '+F.MAX_PLOTS+' petak</p><div class="item-actions">'+[1,3,6].map(n=>action('+'+n+' petak · '+n*20+' ◉','expand','',n,farm.unlocked+n>F.MAX_PLOTS||s.coins<n*20)).join('')+'</div></div></section><div class="catalog-heading"><h3>Bangunanmu</h3><span>'+s.buildings.length+' / '+F.MAX_BUILDINGS+'</span></div>'+(s.buildings.map(b=>`<article class="layout-row"><span>${F.BUILDINGS[b.kind].icon}</span><div><b>${F.BUILDINGS[b.kind].name}</b><small>${b.readyAt<=farm.now()?'Selesai':'Sedang dibangun'} · arah ${b.rotation*90}°</small></div>${action('Pindah','move-building',b.slot,1,false,true)}</article>`).join('')||'<p class="empty-note">Bangun lumbung pertamamu melalui menu Bangun atau Toko → Bangunan.</p>')+'<div class="catalog-heading"><h3>Petak tanam</h3><span>'+farm.unlocked+' aktif</span></div><div class="layout-plots">'+s.plots.slice(0,farm.unlocked).map(p=>`<button data-action="move-plot" data-key="${p.id}" aria-label="Pindahkan petak ${p.id+1}"><span>${p.crop?F.CROPS[p.crop].icon:'🌱'}</span><b>Petak ${p.id+1}</b><small>Pindahkan ↗</small></button>`).join('')+'</div>';
 }else{
  $('panelLabel').textContent='LUMBUNG DAN CATATAN';$('panelTitle').textContent='Hasil kerja tanganmu.';$('panelCopy').textContent='Pantau persediaan dan perjalanan kebunmu.';
  body.innerHTML='<div class="store-wallet"><span>Hasil panen <b>'+farm.used+' / '+farm.capacity+'</b></span><span>Total dipanen <b>'+format(s.stats.harvested)+'</b></span></div><div class="item-actions">'+action('Jual hasil di pasar','shop','sell')+'</div><div class="inventory-grid">'+Object.entries(F.CROPS).map(([k,c])=>`<article><span>${c.icon}</span><b>${c.name}</b><small>${s.seeds[k]} bibit · ${s.produce[k]} panen</small></article>`).join('')+'</div><div class="item"><h3>Bahan bangunan</h3>'+Object.entries(F.MATERIALS).map(([k,m])=>`<div class="inventory-stat"><span>${m.icon} ${m.name}</span><b>${s.materials[k]}</b></div>`).join('')+'</div><h3 class="section-title">Jurnal kebun</h3>'+s.log.map(e=>'<div class="log-entry">'+escape(e.text)+'<small>'+new Date(e.at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join('');
 }
}
function renderSelection(){
 if(selectedBuilding!==null){const b=farm.s.buildings.find(b=>b.slot===selectedBuilding);$('plotInfo').hidden=!b||Boolean(panel)||!entered;if(b&&!$('plotInfo').hidden){$('plotLabel').textContent='BANGUNANMU';$('plotTitle').textContent=F.BUILDINGS[b.kind].name;$('plotCopy').textContent=F.BUILDINGS[b.kind].benefit+' · '+(b.readyAt<=farm.now()?'Selesai':'Membangun '+countdown(b.readyAt-farm.now()));$('plotActions').innerHTML=action('Pindahkan bangunan','move-building',b.slot)+action('Tata letak','panel','layout',1,false,true);}return;}
 const p=farm.s.plots[selectedPlot];$('plotInfo').hidden=selectedPlot===null||!p||Boolean(panel)||!entered;
 if($('plotInfo').hidden)return;
 $('plotLabel').textContent='PETAK '+String(selectedPlot+1).padStart(2,'0');
 if(!p.crop){const c=F.CROPS[selectedCrop];$('plotTitle').textContent='Siap ditanami.';$('plotCopy').textContent=c.name+' · '+duration(c.minutes)+' · '+farm.s.seeds[selectedCrop]+' bibit tersedia';$('plotActions').innerHTML=action('Tanam '+c.name.toLowerCase(),'plant',selectedCrop,1,!farm.s.seeds[selectedCrop])+action('Pilih bibit','panel','farm',1,false,true)+action('Pindahkan petak','move-plot',selectedPlot,1,false,true);}
 else{const c=F.CROPS[p.crop],ready=p.readyAt<=farm.now();$('plotTitle').textContent=c.icon+' '+c.name;$('plotCopy').textContent=ready?'Siap dipanen · '+c.yield+' hasil.':'Sedang tumbuh · '+countdown(p.readyAt-farm.now())+' lagi';$('plotActions').innerHTML=ready?action('Panen '+c.yield+' hasil','harvest',selectedPlot,1,farm.used+c.yield>farm.capacity):action('Lihat bibit lain','panel','farm',1,false,true);$('plotActions').innerHTML+=action('Pindahkan petak','move-plot',selectedPlot,1,false,true);if(ready&&farm.used+c.yield>farm.capacity)$('plotCopy').textContent+=' Penyimpanan penuh. Jual panen di toko.';}
}
function renderUI(){
 const s=farm.s;$('coinsValue').textContent=format(s.coins);for(const k of Object.keys(F.MATERIALS))$(k+'Value').textContent=format(s.materials[k]);
 $('storageValue').textContent=farm.used+' / '+farm.capacity;$('storageFill').style.width=100*farm.used/farm.capacity+'%';
 $('mapNote').textContent=placement?.followPointer?'GESER KE AREA HIJAU · LEPASKAN / KLIK UNTUK MENEMPATKAN':placement?'KLIK TANAH · R PUTAR · KONFIRMASI UNTUK MENEMPATKAN':selectedCrop?'KLIK UNTUK MENANAM · TAHAN 3 DETIK UNTUK MEMINDAHKAN':'SERET PETA UNTUK MENJELAJAH ↔';
 $('farmName').textContent=s.profile.farmName;renderPlacement();renderProfile();renderPanel();renderSelection();
}
function perform(result,success){if(!result.ok){toast(result.message);return false;}save();renderUI();if(success)toast(success);return true;}
function choosePlot(id,plantOnClick=false){
 if(!gate.canPlay||!entered||id>=farm.unlocked)return;
 selectedBuilding=null;selectedPlot=id;const p=farm.s.plots[id];
 if(p.crop&&p.readyAt<=farm.now()){perform(farm.harvest(id),'Panen masuk ke tas. Jual hasilnya di toko.');}
 else if(!p.crop&&plantOnClick&&farm.s.seeds[selectedCrop]){perform(farm.plant(id,selectedCrop),F.CROPS[selectedCrop].name+' mulai tumbuh.');}
 closePanel();renderSelection();
}
function placementResult(){if(!placement?.point)return{ok:false,message:'Klik tanah di peta untuk memilih posisi.'};const p=placement;return p.kind==='garden'?farm.gardenPlacement(p.point,p.count,p.rotation):farm.checkPlacement(p.kind,p.point,p.rotation,{ignoreBuilding:p.moveBuilding??null,ignorePlots:p.movePlot===undefined?[]:[p.movePlot]});}
function renderPlacement(){const dock=$('placementDock');dock.hidden=!placement;dock.dataset.follow=String(Boolean(placement?.followPointer));$('map').classList.toggle('is-carrying',Boolean(placement?.followPointer));if(!placement)return;const valid=placementResult();placement.valid=valid.ok;$('placementTitle').textContent=placement.kind==='garden'?'Area '+placement.count+' petak baru':placement.kind==='plot'?'Pindahkan petak '+(placement.movePlot+1):(placement.moveBuilding!==undefined?'Pindahkan ':'Bangun ')+F.BUILDINGS[placement.kind].name;$('placementCopy').textContent=placement.point?(valid.ok?(placement.followPointer?'Lokasi tersedia · lepaskan atau klik untuk menempatkan.':'Lokasi tersedia · klik Konfirmasi untuk menempatkan.'):valid.message):'Klik tanah kosong untuk memilih lokasi. Seret peta untuk melihat area lain.';$('confirmPlacement').disabled=!valid.ok;$('rotatePlacement').hidden=placement.kind==='plot';dock.dataset.valid=String(valid.ok);$('placementAngle').textContent=placement.rotation*90+'°';}
function beginPlacement(value){placement={rotation:0,point:null,...value};pendingBuild=value.kind;selectedPlot=null;selectedBuilding=null;closePanel();renderUI();if(!value.followPointer)toast('Klik posisi pilihanmu di peta, lalu konfirmasi.');}
function cancelPlacement(){pickup.reset();placement=null;pendingBuild=null;renderUI();}
function confirmPlacement(){if(!placement||!gate.canPlay||!entered)return;const valid=placementResult();if(!valid.ok){toast(valid.message);return;}const p=placement,result=p.kind==='garden'?farm.expandGarden(p.point,p.count,p.rotation):p.kind==='plot'?farm.movePlot(p.movePlot,p.point):p.moveBuilding!==undefined?farm.moveBuilding(p.moveBuilding,p.point,p.rotation):farm.build(p.kind,p.point,p.rotation);if(perform(result,p.kind==='garden'?'Area tanam baru siap digunakan.':p.moveBuilding!==undefined||p.kind==='plot'?'Tata letak berhasil diperbarui.':'Pembangunan dimulai.')){cancelPlacement();}}
function chooseLocation(point){
 if(!gate.canPlay||!entered)return;
 if(placement){placement.point={x:Math.round(point.x),y:Math.round(point.y)};renderPlacement();return;}
 const building=renderer.pickBuilding?.(point)??farm.s.buildings.find(b=>{const size=F.footprint(b.kind,b.rotation);return Math.abs(b.x-point.x)<size.w/2&&Math.abs(b.y-point.y)<size.h/2;})?.slot;
 if(Number.isInteger(building)){selectedPlot=null;selectedBuilding=building;closePanel();renderSelection();return;}
 const hit=renderer.pickPlot?.(point);if(hit===-1){selectedPlot=null;selectedBuilding=null;renderSelection();return;}if(Number.isInteger(hit)){choosePlot(hit,true);return;}
 const p=farm.s.plots.slice(0,farm.unlocked).find(p=>Math.abs(p.x-point.x)<31&&Math.abs(p.y-point.y)<30);if(p)choosePlot(p.id,true);else{selectedPlot=null;selectedBuilding=null;renderSelection();}
}
function onAction(event){
 const b=event.target.closest('button[data-action]');if(!b||b.disabled||!gate.canPlay||!entered)return;
 const {action:type,key}=b.dataset,qty=Number(b.dataset.qty||1);
 if(type==='select'){selectedCrop=key;pendingBuild=null;placement=null;closePanel();toast('Bibit '+F.CROPS[key].name.toLowerCase()+' dipilih. Klik petak kosong.');renderUI();}
 else if(type==='plot')choosePlot(Number(key));
 else if(type==='plant')perform(farm.plant(selectedPlot,key),F.CROPS[key].name+' mulai tumbuh.');
 else if(type==='harvest')perform(farm.harvest(Number(key)),'Hasil panen masuk ke tas.');
 else if(type==='seed')perform(farm.buySeed(key,qty),'Membeli '+qty+' bibit '+F.CROPS[key].name.toLowerCase()+'.');
 else if(type==='sell'){const result=farm.sell(key,qty);perform(result,result.ok?'Penjualan berhasil · +'+result.earned+' koin.':'');}
 else if(type==='material')perform(farm.buyMaterial(key,qty),'Membeli '+qty+' '+F.MATERIALS[key].name.toLowerCase()+'.');
 else if(type==='build')beginPlacement({kind:key});
 else if(type==='expand')beginPlacement({kind:'garden',count:qty});
 else if(type==='move-plot'){const p=farm.s.plots[Number(key)];camera.focus(p.x,p.y);beginPlacement({kind:'plot',movePlot:p.id});}
 else if(type==='move-building'){const b=farm.s.buildings.find(v=>v.slot===Number(key));camera.focus(b.x,b.y);beginPlacement({kind:b.kind,moveBuilding:b.slot,rotation:b.rotation});}
 else if(type==='inspect'){storeItem=key;tradeQty=1;renderPanel();$('panelBody').parentElement.scrollTop=0;}
 else if(type==='quantity'){tradeQty=Math.max(1,Math.min(shop==='sell'?Math.max(1,stock(storeItem)):100,tradeQty+qty));renderPanel();}
 else if(type==='preset'){tradeQty=qty;renderPanel();}
 else if(type==='kit')perform(farm.buyBuildKit(key),'Bahan bangunan sudah masuk ke tas.');
 else if(type==='building-shop'){shop='buildings';storeItem=key;panel=null;openPanel('shop');}
 
 else if(type==='cancel')cancelPlacement();
 else if(type==='shop'){shop=key;storeItem=Object.keys(storeKinds())[0];tradeQty=1;panel=null;openPanel('shop');}
 else if(type==='panel'){panel=null;openPanel(key);}
}
$('panelBody').addEventListener('click',onAction);$('plotActions').addEventListener('click',onAction);
for(const[name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory'],['layout','openLayout']])$(id).addEventListener('click',()=>openPanel(name));
for(const b of document.querySelectorAll('[data-shop]'))b.addEventListener('click',()=>{shop=b.dataset.shop;storeItem=Object.keys(storeKinds())[0];tradeQty=1;renderPanel();});
$('closePanel').addEventListener('click',()=>{closePanel();$('openFarm').focus();});
$('startButton').addEventListener('click',()=>gate.canPlay?enter():document.dispatchEvent(new Event('bara:account-open')));
for(const[id,dialog]of[['helpButton','helpDialog'],['menuButton','menuDialog']])$(id).addEventListener('click',()=>{if(placement?.followPointer)cancelPlacement();else pickup.reset();$(dialog).showModal();});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
$('saveButton').addEventListener('click',()=>{if(gate.canPlay){save();toast('Progres dikirim untuk disimpan. Lihat status akun.');}else document.dispatchEvent(new Event('bara:account-open'));});
function pickMovable(point){
 if(placement)return null;
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
 lift:(target,point)=>{if(!gate.canPlay||!entered)return false;beginPlacement({...target,point:target.origin,followPointer:true,lifted:true,offset:{x:target.origin.x-point.x,y:target.origin.y-point.y}});toast('Objek terangkat. Geser ke area hijau, lalu lepaskan atau klik untuk menempatkan.');return true;},
 move:point=>{if(!placement?.followPointer||!gate.canPlay||!entered)return;placement.point={x:Math.round(point.x+placement.offset.x),y:Math.round(point.y+placement.offset.y)};renderPlacement();},
 drop:confirmPlacement,cancel:cancelPlacement
});
const pointer=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(!entered||e.button!==0)return;const p=pointer(e);canvas.setPointerCapture(e.pointerId);pickup.down(e.pointerId,p.x,p.y);});
canvas.addEventListener('pointermove',e=>{const p=pointer(e);pickup.move(e.pointerId,p.x,p.y);});
canvas.addEventListener('pointerup',e=>{const p=pointer(e);pickup.up(e.pointerId,p.x,p.y);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',e=>pickup.cancel(e.pointerId));canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{if(placement?.followPointer)cancelPlacement();else pickup.reset();});
canvas.addEventListener('wheel',e=>{if(!entered)return;e.preventDefault();const p=pointer(e);camera.zoomAt(Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
$('zoomIn').addEventListener('click',()=>camera.zoomAt(1.2));$('zoomOut').addEventListener('click',()=>camera.zoomAt(1/1.2));$('centerFarm').addEventListener('click',center);
$('rotateLeft').addEventListener('click',()=>camera.rotate?.(-Math.PI/8));$('rotateRight').addEventListener('click',()=>camera.rotate?.(Math.PI/8));
$('environmentMotion').checked=renderer.wind!==false;$('environmentMotion').addEventListener('change',e=>{try{localStorage.setItem('6xg:motion',String(e.target.checked));}catch{}renderer.setMotion?.(e.target.checked);});
$('graphicsQuality').addEventListener('change',e=>{save();try{localStorage.setItem('6xg:graphics',e.target.value);}catch{}location.reload();});
try{$('graphicsQuality').value=localStorage.getItem('6xg:graphics')||'auto';}catch{}
$('miniMap').addEventListener('click',e=>{if(!entered)return;const r=e.currentTarget.getBoundingClientRect();camera.focus((e.clientX-r.left)/r.width*3200,(e.clientY-r.top)/r.height*2200);});
for(const target of[canvas,$('miniMap')])target.addEventListener('keydown',e=>{if(!entered)return;const shifts={ArrowLeft:[90,0],ArrowRight:[-90,0],ArrowUp:[0,90],ArrowDown:[0,-90]};if(shifts[e.key]){e.preventDefault();camera.pan(...shifts[e.key]);}else if(e.key==='Home'){e.preventDefault();center();}else if(e.key==='q'||e.key==='Q')camera.rotate?.(-Math.PI/8);else if(e.key==='e'||e.key==='E')camera.rotate?.(Math.PI/8);else if(e.key==='+'||e.key==='=')camera.zoomAt(1.2);else if(e.key==='-')camera.zoomAt(1/1.2);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelPlacement();selectedPlot=null;selectedBuilding=null;closePanel();renderUI();}else if((e.key==='r'||e.key==='R')&&placement&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){placement.rotation=(placement.rotation+1)%4;renderPlacement();}});
const resize=()=>{const r=$('map').getBoundingClientRect();camera.resize(r.width,r.height);};new ResizeObserver(resize).observe($('map'));resize();center();
function draw(){renderer.draw(farm,{selectedPlot,pendingBuild,placement,selectedCrop,now:farm.now(),welcome:!entered});renderer.mini($('miniMap'),farm);$('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';requestAnimationFrame(draw);}requestAnimationFrame(draw);
setInterval(()=>{const now=farm.now(),signature=farm.unlocked+'|'+farm.capacity+'|'+farm.s.plots.filter(p=>p.crop&&p.readyAt<=now).map(p=>p.id).join(',')+'|'+farm.s.buildings.filter(b=>b.readyAt<=now).length;if(signature!==uiSignature){uiSignature=signature;renderUI();}else if(selectedPlot!==null){const p=farm.s.plots[selectedPlot];if(p?.crop&&p.readyAt>now)$('plotCopy').textContent='Sedang tumbuh · '+countdown(p.readyAt-now)+' lagi';}},1000);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(placement?.followPointer)cancelPlacement();else pickup.reset();}else renderUI();});setInterval(save,60000);
const AVATAR_ICONS={sprout:'🌱',sunflower:'🌻',apple:'🍎',bee:'🐝'};
function renderProfile(){const holder=$('profileBody');holder.hidden=!gate.canPlay;if(!gate.canPlay){holder.replaceChildren();return;}const p=farm.s.profile;if(!holder.querySelector('form'))holder.innerHTML=`<div class="profile-banner"><div class="profile-avatar" id="profileAvatar">🌱</div><span>PEKEBUN LEMBAH BARA</span><h3 id="profileHeading">Pekebun</h3><p id="profileFarm">Kebunku</p><button class="profile-play" id="profilePlay" type="button">Ke kebun ↗</button></div><div class="profile-stats"><div><b id="profileHarvest">0</b><span>Hasil dipanen</span></div><div><b id="profileEarned">0</b><span>Koin penjualan</span></div><div><b id="profilePlots">9</b><span>Petak terbuka</span></div></div><form id="profileForm"><div class="profile-fields"><label>Nama pekebun<input name="name" required maxlength="24" autocomplete="nickname"></label><label>Nama kebun<input name="farmName" required maxlength="24" autocomplete="off"></label></div><fieldset class="avatar-options"><legend>Pilih avatar kebunmu</legend>${F.AVATARS.map(k=>`<label title="${({sprout:'Tunas',sunflower:'Bunga matahari',apple:'Apel',bee:'Lebah'})[k]}"><input type="radio" name="avatar" value="${k}" aria-label="${({sprout:'Tunas',sunflower:'Bunga matahari',apple:'Apel',bee:'Lebah'})[k]}"><span>${AVATAR_ICONS[k]}</span></label>`).join('')}</fieldset><div class="profile-save"><button class="action" type="submit">Simpan profil</button><span id="profileFeedback" role="status"></span></div></form>`;
 $('profileHeading').textContent=p.name;$('profileFarm').textContent=p.farmName;$('profileAvatar').textContent=AVATAR_ICONS[p.avatar];$('profileHarvest').textContent=format(farm.s.stats.harvested);$('profileEarned').textContent=format(farm.s.stats.earned);$('profilePlots').textContent=farm.unlocked;
 const form=$('profileForm');if(!form.contains(document.activeElement)){form.elements.name.value=p.name;form.elements.farmName.value=p.farmName;form.elements.avatar.value=p.avatar;}
}
$('profileBody').addEventListener('click',e=>{if(e.target.closest('#profilePlay')&&gate.canPlay){$('accountDialog').close();enter();}});
$('profileBody').addEventListener('submit',e=>{e.preventDefault();if(!gate.canPlay)return;const form=e.target,data=new FormData(form),result=farm.updateProfile({name:data.get('name'),farmName:data.get('farmName'),avatar:data.get('avatar')});if(result.ok){save();renderUI();window.dispatchEvent(new Event('bara:profile'));$('profileFeedback').textContent='Profil diperbarui.';}else $('profileFeedback').textContent=result.message;});
$('profileBody').addEventListener('change',e=>{if(e.target.name==='avatar')$('profileAvatar').textContent=AVATAR_ICONS[e.target.value];});
$('confirmPlacement').addEventListener('click',confirmPlacement);$('cancelPlacement').addEventListener('click',cancelPlacement);$('rotatePlacement').addEventListener('click',()=>{if(placement){placement.rotation=(placement.rotation+1)%4;renderPlacement();}});
window.addEventListener('bara:art',()=>{for(const img of document.querySelectorAll('img[data-art]')){const source=renderer.catalogue?.[img.dataset.art];if(source){img.src=source;img.hidden=false;img.parentElement.querySelector('.product-emoji')?.remove();}}});

// Narrow account adapter; no anonymous game save is attached or exported.
window.LadangBara={
 setIdentity(id){save();pickup.reset();gate.setIdentity(id);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;placement=null;selectedBuilding=null;selectedPlot=null;closePanel();refreshGate();renderUI();},
 attach(key,raw){pickup.reset();const next=new F.Farm({save:raw});gate.attach(key);farm=next;activeSaveKey=key;entered=false;selectedCrop='carrot';placement=null;pendingBuild=null;selectedPlot=null;selectedBuilding=null;save();refreshGate();renderUI();},
 detach(){save();pickup.reset();gate.setIdentity(null);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;placement=null;selectedBuilding=null;selectedPlot=null;closePanel();refreshGate();renderUI();},
 snapshot:()=>farm.serialize(),validate:raw=>{try{F.validateSave(JSON.parse(raw));return true;}catch{return false;}},legacySnapshot:()=>null,
 profile:()=>gate.canPlay?{...farm.s.profile}:null,canPlay:()=>gate.canPlay,enter,pause:save,setSaveStatus:text=>{$('saveStatus').textContent=text;},setSaveNote:text=>{$('saveNote').textContent=text;}
};
refreshGate();renderUI();

