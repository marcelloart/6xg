'use strict';
const F=BaraFarm,$=id=>document.getElementById(id),gate=new AccountGate('6xg-farm:');
const camera=new MapCamera(),renderer=new FarmRenderer($('worldCanvas'),camera);
let farm=new F.Farm(),activeSaveKey=null,entered=false,selectedCrop='carrot',selectedPlot=null,pendingBuild=null,panel=null,shop='seeds',toastTimer=null,uiSignature='';
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
function center(){camera.focus(1590,1135);}
function closePanel(){panel=null;$('farmPanel').hidden=true;document.querySelectorAll('.toolbar button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-expanded','false');});renderSelection();}
function openPanel(view){
 if(!gate.canPlay||!entered)return;
 if(panel===view){closePanel();return;}
 panel=view;selectedPlot=null;$('plotInfo').hidden=true;$('farmPanel').hidden=false;
 for(const [name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory']]){$(id).classList.toggle('active',view===name);$(id).setAttribute('aria-expanded',String(view===name));}
 renderPanel();
}
function renderPanel(){
 if(!panel)return;
 $('shopTabs').hidden=panel!=='shop';document.querySelectorAll('[data-shop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shop===shop)));
 const body=$('panelBody'),s=farm.s;
 if(panel==='farm'){
  $('panelLabel').textContent='KEBUNMU';$('panelTitle').textContent='Mulai dari satu bibit.';$('panelCopy').textContent='Pilih bibit, lalu klik petak kosong. Klik tanaman matang untuk memanen.';
  body.innerHTML=Object.entries(F.CROPS).filter(([key])=>s.seeds[key]>0).map(([key,c])=>`<article class="item"><div class="item-top"><span class="item-icon">${c.icon}</span><div><h3>${c.name}</h3><small>${duration(c.minutes)} · ${c.yield} hasil panen</small></div><b class="item-stock">×${s.seeds[key]}</b></div><div class="item-actions">${action(selectedCrop===key?'Dipilih · tanam di peta':'Pilih bibit','select',key)}</div></article>`).join('')||'<p class="empty-note">Bibit sudah habis. Beli bibit berikutnya di Toko.</p>';
  body.innerHTML+='<div class="item-actions">'+action('Beli bibit di toko','shop','seeds',1,false,true)+'</div><p class="empty-note">Petak tanam · '+farm.unlocked+' terbuka</p><div class="plot-grid">'+F.PLOTS.slice(0,farm.unlocked).map(p=>{const planted=s.plots[p.id],ready=planted.crop&&planted.readyAt<=farm.now();return`<button data-action="plot" data-key="${p.id}" class="${ready?'ready':''}" aria-label="Petak ${p.id+1}, ${planted.crop?F.CROPS[planted.crop].name+(ready?', siap panen':', sedang tumbuh'):'kosong'}">${planted.crop?F.CROPS[planted.crop].icon:'+'} ${p.id+1}${ready?' ✓':''}</button>`;}).join('')+'</div>';
 }else if(panel==='shop'){
  $('panelLabel').textContent='TOKO LEMBAH BARA';$('panelTitle').textContent=shop==='seeds'?'Bibit untuk esok.':shop==='sell'?'Dari panen jadi koin.':'Bangun dari hasilmu.';
  $('panelCopy').textContent=shop==='seeds'?'Beli bibit dengan koin hasil penjualan. Waktu tumbuh mengikuti jenis tanaman.':shop==='sell'?'Jual buah dan sayuran yang sudah dipanen. Harga di bawah berlaku per hasil.':'Beli bahan dengan koin, lalu gunakan di menu Bangun.';
  if(shop==='seeds')body.innerHTML=Object.entries(F.CROPS).map(([key,c])=>`<article class="item"><div class="item-top"><span class="item-icon">${c.icon}</span><div><h3>${c.name}</h3><small>${duration(c.minutes)} · punya ${s.seeds[key]} bibit</small></div><b class="item-stock">◉ ${c.price}</b></div><p>Panen ${c.yield} hasil · jual ${c.sell} koin / hasil</p><div class="item-actions">${action('Beli 1','seed',key,1,s.coins<c.price||s.seeds[key]>=1000)}${action('Beli 5 · '+c.price*5+' ◉','seed',key,5,s.coins<c.price*5||s.seeds[key]>995,true)}</div></article>`).join('');
  if(shop==='sell')body.innerHTML=Object.entries(F.CROPS).map(([key,c])=>`<article class="item"><div class="item-top"><span class="item-icon">${c.icon}</span><div><h3>${c.name}</h3><small>${c.sell} koin / hasil</small></div><b class="item-stock">×${s.produce[key]}</b></div><div class="item-actions">${action('Jual 1','sell',key,1,!s.produce[key])}${action('Jual semua · '+c.sell*s.produce[key]+' ◉','sell',key,s.produce[key],!s.produce[key],true)}</div></article>`).join('');
  if(shop==='materials')body.innerHTML=Object.entries(F.MATERIALS).map(([key,m])=>`<article class="item"><div class="item-top"><span class="item-icon">${m.icon}</span><div><h3>${m.name}</h3><small>Punya ${s.materials[key]} · bahan pembangunan</small></div><b class="item-stock">◉ ${m.price}</b></div><div class="item-actions">${action('Beli 1','material',key,1,s.coins<m.price||s.materials[key]>=10000)}${action('Beli 5 · '+m.price*5+' ◉','material',key,5,s.coins<m.price*5||s.materials[key]>9995,true)}</div></article>`).join('');
 }else if(panel==='build'){
  $('panelLabel').textContent='KEMBANGKAN KEBUN';$('panelTitle').textContent='Rumah bagi impianmu.';$('panelCopy').textContent=pendingBuild?'Klik tapak kosong di peta, atau pilih nomor tapak di bawah. Bahan dibayar saat penempatan.':'Pilih bangunan, lalu pilih tapaknya. Bahan tersedia di Toko → Bahan.';
  body.innerHTML=Object.entries(F.BUILDINGS).map(([key,b])=>`<article class="item"><div class="item-top"><span class="item-icon">${b.icon}</span><div><h3>${b.name}</h3><small>${b.seconds} detik · ${b.benefit}</small></div></div><p>🪵 ${b.cost.wood} kayu · 🪨 ${b.cost.stone} batu · 🥩 ${b.cost.meat} daging</p><div class="item-actions">${action(pendingBuild===key?'Pilih tapak di peta':'Pilih '+b.name.toLowerCase(),'build',key,1,!farm.canBuild(key)||s.buildings.length===F.LOTS.length)}</div></article>`).join('');
  if(pendingBuild)body.innerHTML+='<p class="empty-note">Tapak kosong untuk '+F.BUILDINGS[pendingBuild].name.toLowerCase()+'</p><div class="lot-grid">'+F.LOTS.map((p,id)=>`<button data-action="lot" data-key="${id}" ${s.buildings.some(b=>b.slot===id)?'disabled':''}>Tapak ${id+1}</button>`).join('')+'</div>'+action('Batalkan penempatan','cancel','',1,false,true);
 }else{
  $('panelLabel').textContent='TAS DAN CATATAN';$('panelTitle').textContent='Simpan hasil ceritamu.';$('panelCopy').textContent='Bibit dan bahan disimpan terpisah dari kapasitas hasil panen.';
  body.innerHTML='<div class="item"><h3>Penyimpanan panen</h3><p>'+farm.used+' / '+farm.capacity+' hasil · '+farm.unlocked+' petak tanam</p>'+action('Jual hasil di toko','shop','sell')+'</div><div class="item"><h3>Bibit</h3>'+Object.entries(F.CROPS).map(([k,c])=>`<div class="inventory-stat"><span>${c.icon} ${c.name}</span><b>${s.seeds[k]}</b></div>`).join('')+'</div><div class="item"><h3>Bahan bangunan</h3>'+Object.entries(F.MATERIALS).map(([k,m])=>`<div class="inventory-stat"><span>${m.icon} ${m.name}</span><b>${s.materials[k]}</b></div>`).join('')+'</div><h3>Catatan kebun</h3>'+s.log.map(e=>'<div class="log-entry">'+escape(e.text)+'<small>'+new Date(e.at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join('');
 }
}
function renderSelection(){
 const p=farm.s.plots[selectedPlot];$('plotInfo').hidden=selectedPlot===null||!p||Boolean(panel)||!entered;
 if($('plotInfo').hidden)return;
 $('plotLabel').textContent='PETAK '+String(selectedPlot+1).padStart(2,'0');
 if(!p.crop){const c=F.CROPS[selectedCrop];$('plotTitle').textContent='Siap ditanami.';$('plotCopy').textContent=c.name+' · '+duration(c.minutes)+' · '+farm.s.seeds[selectedCrop]+' bibit tersedia';$('plotActions').innerHTML=action('Tanam '+c.name.toLowerCase(),'plant',selectedCrop,1,!farm.s.seeds[selectedCrop])+action('Pilih bibit','panel','farm',1,false,true);}
 else{const c=F.CROPS[p.crop],ready=p.readyAt<=farm.now();$('plotTitle').textContent=c.icon+' '+c.name;$('plotCopy').textContent=ready?'Siap dipanen · '+c.yield+' hasil.':'Sedang tumbuh · '+countdown(p.readyAt-farm.now())+' lagi';$('plotActions').innerHTML=ready?action('Panen '+c.yield+' hasil','harvest',selectedPlot,1,farm.used+c.yield>farm.capacity):action('Lihat bibit lain','panel','farm',1,false,true);if(ready&&farm.used+c.yield>farm.capacity)$('plotCopy').textContent+=' Penyimpanan penuh. Jual panen di toko.';}
}
function renderUI(){
 const s=farm.s;$('coinsValue').textContent=format(s.coins);for(const k of Object.keys(F.MATERIALS))$(k+'Value').textContent=format(s.materials[k]);
 $('storageValue').textContent=farm.used+' / '+farm.capacity;$('storageFill').style.width=100*farm.used/farm.capacity+'%';
 $('mapNote').textContent=pendingBuild?'PILIH TAPAK UNTUK '+F.BUILDINGS[pendingBuild].name.toUpperCase():selectedCrop?'BIBIT '+F.CROPS[selectedCrop].name.toUpperCase()+' · KLIK PETAK KOSONG':'SERET PETA UNTUK MENJELAJAH ↔';
 renderPanel();renderSelection();
}
function perform(result,success){if(!result.ok){toast(result.message);return false;}save();renderUI();if(success)toast(success);return true;}
function choosePlot(id,plantOnClick=false){
 if(!gate.canPlay||!entered||id>=farm.unlocked)return;
 selectedPlot=id;const p=farm.s.plots[id];
 if(p.crop&&p.readyAt<=farm.now()){perform(farm.harvest(id),'Panen masuk ke tas. Jual hasilnya di toko.');}
 else if(!p.crop&&plantOnClick&&farm.s.seeds[selectedCrop]){perform(farm.plant(id,selectedCrop),F.CROPS[selectedCrop].name+' mulai tumbuh.');}
 closePanel();renderSelection();
}
function chooseLocation(point){
 if(!gate.canPlay||!entered)return;
 if(pendingBuild){const slot=F.LOTS.findIndex(p=>Math.hypot(p.x-point.x,p.y-point.y)<70);if(slot<0){toast('Pilih salah satu tapak bangunan bertanda +.');return;}place(slot);return;}
 const p=F.PLOTS.slice(0,farm.unlocked).find(p=>Math.abs(p.x-point.x)<31&&Math.abs(p.y-point.y)<30);if(p)choosePlot(p.id,true);else{selectedPlot=null;renderSelection();}
}
function place(slot){if(!pendingBuild)return;const kind=pendingBuild;if(perform(farm.build(kind,slot),F.BUILDINGS[kind].name+' mulai dibangun.')){pendingBuild=null;closePanel();renderUI();}}
function onAction(event){
 const b=event.target.closest('button[data-action]');if(!b||b.disabled||!gate.canPlay||!entered)return;
 const {action:type,key}=b.dataset,qty=Number(b.dataset.qty||1);
 if(type==='select'){selectedCrop=key;pendingBuild=null;closePanel();toast('Bibit '+F.CROPS[key].name.toLowerCase()+' dipilih. Klik petak kosong.');renderUI();}
 else if(type==='plot')choosePlot(Number(key));
 else if(type==='plant')perform(farm.plant(selectedPlot,key),F.CROPS[key].name+' mulai tumbuh.');
 else if(type==='harvest')perform(farm.harvest(Number(key)),'Hasil panen masuk ke tas.');
 else if(type==='seed')perform(farm.buySeed(key,qty),'Membeli '+qty+' bibit '+F.CROPS[key].name.toLowerCase()+'.');
 else if(type==='sell'){const result=farm.sell(key,qty);perform(result,result.ok?'Penjualan berhasil · +'+result.earned+' koin.':'');}
 else if(type==='material')perform(farm.buyMaterial(key,qty),'Membeli '+qty+' '+F.MATERIALS[key].name.toLowerCase()+'.');
 else if(type==='build'){pendingBuild=key;selectedPlot=null;renderUI();toast('Pilih tapak '+F.BUILDINGS[key].name.toLowerCase()+' di peta.');}
 else if(type==='lot')place(Number(key));
 else if(type==='cancel'){pendingBuild=null;renderUI();}
 else if(type==='shop'){shop=key;panel=null;openPanel('shop');}
 else if(type==='panel'){panel=null;openPanel(key);}
}
$('panelBody').addEventListener('click',onAction);$('plotActions').addEventListener('click',onAction);
for(const[name,id]of[['farm','openFarm'],['shop','openShop'],['build','openBuild'],['inventory','openInventory']])$(id).addEventListener('click',()=>openPanel(name));
for(const b of document.querySelectorAll('[data-shop]'))b.addEventListener('click',()=>{shop=b.dataset.shop;renderPanel();});
$('closePanel').addEventListener('click',()=>{closePanel();$('openFarm').focus();});
$('startButton').addEventListener('click',()=>gate.canPlay?enter():document.dispatchEvent(new Event('bara:account-open')));
for(const[id,dialog]of[['helpButton','helpDialog'],['menuButton','menuDialog']])$(id).addEventListener('click',()=>$(dialog).showModal());
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
$('saveButton').addEventListener('click',()=>{if(gate.canPlay){save();toast('Progres dikirim untuk disimpan. Lihat status akun.');}else document.dispatchEvent(new Event('bara:account-open'));});
const gestures=new MapGesture(camera,chooseLocation),canvas=$('worldCanvas');
const pointer=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(!entered)return;const p=pointer(e);canvas.setPointerCapture(e.pointerId);gestures.down(e.pointerId,p.x,p.y);});
canvas.addEventListener('pointermove',e=>{const p=pointer(e);gestures.move(e.pointerId,p.x,p.y);});
canvas.addEventListener('pointerup',e=>{const p=pointer(e);gestures.up(e.pointerId,p.x,p.y);});
canvas.addEventListener('pointercancel',e=>gestures.cancel(e.pointerId));canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{if(!entered)return;e.preventDefault();const p=pointer(e);camera.zoomAt(Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
$('zoomIn').addEventListener('click',()=>camera.zoomAt(1.2));$('zoomOut').addEventListener('click',()=>camera.zoomAt(1/1.2));$('centerFarm').addEventListener('click',center);
$('miniMap').addEventListener('click',e=>{if(!entered)return;const r=e.currentTarget.getBoundingClientRect();camera.focus((e.clientX-r.left)/r.width*3200,(e.clientY-r.top)/r.height*2200);});
for(const target of[canvas,$('miniMap')])target.addEventListener('keydown',e=>{if(!entered)return;const shifts={ArrowLeft:[90,0],ArrowRight:[-90,0],ArrowUp:[0,90],ArrowDown:[0,-90]};if(shifts[e.key]){e.preventDefault();camera.pan(...shifts[e.key]);}else if(e.key==='Home'){e.preventDefault();center();}else if(e.key==='+'||e.key==='=')camera.zoomAt(1.2);else if(e.key==='-')camera.zoomAt(1/1.2);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){pendingBuild=null;selectedPlot=null;closePanel();renderUI();}});
const resize=()=>{const r=$('map').getBoundingClientRect();camera.resize(r.width,r.height);};new ResizeObserver(resize).observe($('map'));resize();center();
function draw(){renderer.draw(farm,{selectedPlot,pendingBuild,selectedCrop,now:farm.now(),welcome:!entered});renderer.mini($('miniMap'),farm);$('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';requestAnimationFrame(draw);}requestAnimationFrame(draw);
setInterval(()=>{const now=farm.now(),signature=farm.unlocked+'|'+farm.capacity+'|'+farm.s.plots.filter(p=>p.crop&&p.readyAt<=now).map(p=>p.id).join(',')+'|'+farm.s.buildings.filter(b=>b.readyAt<=now).length;if(signature!==uiSignature){uiSignature=signature;renderUI();}else if(selectedPlot!==null){const p=farm.s.plots[selectedPlot];if(p?.crop&&p.readyAt>now)$('plotCopy').textContent='Sedang tumbuh · '+countdown(p.readyAt-now)+' lagi';}},1000);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else renderUI();});setInterval(save,60000);
// Narrow account adapter; no anonymous game save is attached or exported.
window.LadangBara={
 setIdentity(id){save();gate.setIdentity(id);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;selectedPlot=null;closePanel();refreshGate();renderUI();},
 attach(key,raw){const next=new F.Farm({save:raw});gate.attach(key);farm=next;activeSaveKey=key;entered=false;selectedCrop='carrot';save();refreshGate();renderUI();},
 detach(){save();gate.setIdentity(null);activeSaveKey=null;farm=new F.Farm();entered=false;pendingBuild=null;selectedPlot=null;closePanel();refreshGate();renderUI();},
 snapshot:()=>farm.serialize(),validate:raw=>{try{F.validateSave(JSON.parse(raw));return true;}catch{return false;}},legacySnapshot:()=>null,
 canPlay:()=>gate.canPlay,enter,pause:save,setSaveStatus:text=>{$('saveStatus').textContent=text;},setSaveNote:text=>{$('saveNote').textContent=text;}
};
refreshGate();renderUI();
