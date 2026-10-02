'use strict';
// Pure farming rules shared by the browser and the authenticated save service.
// Growth uses absolute deadlines: closing a tab does not pause a planted crop.
(function(root){
 const MINUTE=60000,MAX_TIME=4102444800000,MAX_PLOTS=81,MAX_BUILDINGS=24;
 const CROPS=Object.freeze({
  carrot:{name:'Wortel',icon:'🥕',minutes:5,price:5,yield:3,sell:3,color:'#ee9551'},
  tomato:{name:'Tomat',icon:'🍅',minutes:15,price:12,yield:4,sell:5,color:'#e76e58'},
  corn:{name:'Jagung',icon:'🌽',minutes:30,price:24,yield:5,sell:8,color:'#e9c759'},
  strawberry:{name:'Stroberi',icon:'🍓',minutes:60,price:45,yield:6,sell:12,color:'#df6372'},
  potato:{name:'Kentang',icon:'🥔',minutes:120,price:75,yield:7,sell:18,color:'#c5a47a'},
  chili:{name:'Cabai',icon:'🌶️',minutes:300,price:120,yield:8,sell:25,color:'#d95a4d'},
  orange:{name:'Jeruk',icon:'🍊',minutes:600,price:200,yield:9,sell:36,color:'#f1a649'},
  apple:{name:'Apel',icon:'🍎',minutes:720,price:280,yield:10,sell:46,color:'#d96965'},
  avocado:{name:'Alpukat',icon:'🥑',minutes:1440,price:420,yield:12,sell:60,color:'#8dac65'}
 });
 const MATERIALS=Object.freeze({wood:{name:'Kayu',icon:'🪵',price:3},stone:{name:'Batu',icon:'🪨',price:4},meat:{name:'Daging',icon:'🥩',price:5}});
 const BUILDINGS=Object.freeze({
  barn:{name:'Lumbung',icon:'🏚️',seconds:90,cost:{wood:6,stone:3,meat:1},benefit:'+80 ruang hasil panen'},
  house:{name:'Rumah',icon:'🏡',seconds:60,cost:{wood:10,stone:5,meat:2},benefit:'+6 petak tanam'},
  shed:{name:'Gudang',icon:'🛖',seconds:60,cost:{wood:8,stone:4,meat:1},benefit:'+40 ruang hasil panen'},
  well:{name:'Sumur',icon:'⛲',seconds:45,cost:{wood:5,stone:6,meat:1},benefit:'+3 petak tanam'}
 });
 const LOTS=Object.freeze([{x:1230,y:810},{x:1510,y:765},{x:1810,y:805},{x:2050,y:1050},{x:2050,y:1350},{x:1830,y:1540},{x:1470,y:1600},{x:1130,y:1420}]);
 const grid=Array.from({length:45},(_,i)=>({col:i%9,row:Math.floor(i/9)}));
 grid.sort((a,b)=>Number(!(a.col>=3&&a.col<6&&a.row<3))-Number(!(b.col>=3&&b.col<6&&b.row<3)));
 const PLOTS=Object.freeze(grid.map((p,id)=>({id,x:1320+p.col*68,y:1010+p.row*74})));
 const keys=Object.keys(CROPS),materialKeys=Object.keys(MATERIALS);
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const check=v=>{if(!v)throw new TypeError('Progres kebun tidak valid.');};
 const inventory=(v,list,max)=>{check(object(v)&&Object.keys(v).length===list.length);return Object.fromEntries(list.map(k=>{check(Object.hasOwn(v,k)&&integer(v[k],0,max));return[k,v[k]];}));};
 const complete=(s,kind,now)=>s.buildings.filter(b=>b.kind===kind&&b.readyAt<=now).length;
 const capacity=(s,now=s.lastSeen)=>20+80*complete(s,'barn',now)+40*complete(s,'shed',now);
 const unlocked=(s,now=s.lastSeen)=>Math.min(s.expansions===undefined?45:MAX_PLOTS,9+6*complete(s,'house',now)+3*complete(s,'well',now)+(s.expansions||0));
 const used=s=>keys.reduce((total,k)=>total+s.produce[k],0);
 const AVATARS=Object.freeze(['sprout','sunflower','apple','bee']);
 const defaultProfile=()=>({name:'Pekebun',farmName:'Kebunku',avatar:'sprout'});
 const defaultStats=()=>({harvested:0,earned:0});
 const profile=v=>{check(object(v));const clean={};for(const k of ['name','farmName']){check(typeof v[k]==='string'&&v[k].trim().length>=1&&v[k].trim().length<=24&&!/[\u0000-\u001f\u007f]/.test(v[k]));clean[k]=v[k].trim();}check(AVATARS.includes(v.avatar));clean.avatar=v.avatar;if(v.photo!=null){check(typeof v.photo==='string'&&v.photo.length>=128&&v.photo.length<=16384&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(v.photo)&&(v.photo.length-23)%4===0);clean.photo=v.photo;}return clean;};
 const footprint=(kind,rotation=0)=>{const size=kind==='plot'?[60,60]:kind==='garden'?[196,136]:({barn:[150,128],house:[130,116],shed:[112,104],well:[90,90]}[kind]||[60,60]);return rotation%2?{w:size[1],h:size[0]}:{w:size[0],h:size[1]};};
 const overlaps=(a,b,gap=5)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;
 const onLand=(p,size)=>integer(p.x,1000+Math.ceil(size.w/2),2190-Math.ceil(size.w/2))&&integer(p.y,630+Math.ceil(size.h/2),1760-Math.ceil(size.h/2));
 const defaultPlot=id=>PLOTS[id]||{id,x:1080+(id-45)%12*68,y:1460+Math.floor((id-45)/12)*74};
 function placement(s,kind,point,rotation=0,{ignoreBuilding=null,ignorePlots=[],props=true}={}){
  const size=footprint(kind,rotation),rect={...point,...size};
  if(!integer(rotation,0,3)||!onLand(point,size))return{ok:false,message:'Pilih tanah terbuka di lembah, jauh dari sungai dan tepi hutan.'};
  if(s.buildings.some(b=>b.slot!==ignoreBuilding&&overlaps(rect,{...b,...footprint(b.kind,b.rotation)})))return{ok:false,message:'Posisi bertabrakan dengan bangunan lain.'};
  if(s.plots.some(p=>!ignorePlots.includes(p.id)&&overlaps(rect,{...p,...footprint('plot')})))return{ok:false,message:'Posisi bertabrakan dengan petak tanam atau petak cadangan.'};
  if(props&&(overlaps(rect,{x:1593,y:872,w:112,h:100})||[[1408,867],[1788,859],[1050,910],[1108,1650],[2130,870],[2180,1570]].some(([x,y])=>overlaps(rect,{x,y,w:58,h:58}))))return{ok:false,message:'Sisakan ruang untuk pondok dan pepohonan.'};
  return{ok:true};
 }
 function validateSave(save){
  check(object(save)&&[4,5].includes(save.version)&&object(save.state));const modern=save.version===5;
  const s=save.state;
  check(integer(s.coins,0,1e9)&&integer(s.lastSeen,1,MAX_TIME));
  const clean={coins:s.coins,lastSeen:s.lastSeen,seeds:inventory(s.seeds,keys,1000),produce:inventory(s.produce,keys,10000),materials:inventory(s.materials,materialKeys,10000)};
  check(Array.isArray(s.buildings)&&s.buildings.length<=(modern?MAX_BUILDINGS:LOTS.length));
  const slots=new Set();clean.buildings=s.buildings.map(b=>{
   check(object(b)&&integer(b.slot,0,(modern?MAX_BUILDINGS:LOTS.length)-1)&&!slots.has(b.slot)&&Object.hasOwn(BUILDINGS,b.kind)&&integer(b.startedAt,1,s.lastSeen)&&b.readyAt===b.startedAt+BUILDINGS[b.kind].seconds*1000&&b.readyAt<=MAX_TIME);
   slots.add(b.slot);const base={slot:b.slot,kind:b.kind,startedAt:b.startedAt,readyAt:b.readyAt};if(modern){check(integer(b.rotation,0,3)&&onLand(b,footprint(b.kind,b.rotation)));Object.assign(base,{x:b.x,y:b.y,rotation:b.rotation});}return base;
  });
  check(used(clean)<=capacity(clean));
  if(modern){check(integer(s.expansions,0,72));clean.expansions=s.expansions;clean.profile=profile(s.profile);check(object(s.stats)&&integer(s.stats.harvested,0,1e9)&&integer(s.stats.earned,0,1e12));clean.stats={harvested:s.stats.harvested,earned:s.stats.earned};}
  check(Array.isArray(s.plots)&&(modern?s.plots.length>=45&&s.plots.length<=MAX_PLOTS&&s.plots.length>=unlocked(clean):s.plots.length===PLOTS.length));
  clean.plots=s.plots.map((p,id)=>{
   check(object(p)&&p.id===id);const pos=modern?{x:p.x,y:p.y}:{};if(modern)check(onLand(p,footprint('plot')));
   if(p.crop===null){check(p.plantedAt===0&&p.readyAt===0);return{id,...pos,crop:null,plantedAt:0,readyAt:0};}
   check(id<unlocked(clean)&&Object.hasOwn(CROPS,p.crop)&&integer(p.plantedAt,1,s.lastSeen)&&p.readyAt===p.plantedAt+CROPS[p.crop].minutes*MINUTE&&p.readyAt<=MAX_TIME);
   return{id,...pos,crop:p.crop,plantedAt:p.plantedAt,readyAt:p.readyAt};
  });
  check(Array.isArray(s.log)&&s.log.length<=8);
  clean.log=s.log.map(e=>{check(object(e)&&integer(e.at,1,s.lastSeen)&&typeof e.text==='string'&&e.text.length<=180);return{at:e.at,text:e.text};});
  if(modern){for(const p of clean.plots)check(placement(clean,'plot',p,0,{ignorePlots:[p.id],props:false}).ok);for(const b of clean.buildings)check(placement(clean,b.kind,b,b.rotation,{ignoreBuilding:b.slot,props:false}).ok);}
  return{version:save.version,state:clean};
 }
 class Farm{
  constructor({clock=()=>Date.now(),save=null}={}){
   this.clock=clock;
   const counters=()=>Object.fromEntries(keys.map(k=>[k,0]));
   this.s=save?validateSave(typeof save==='string'?JSON.parse(save):save).state:{coins:0,lastSeen:clock(),seeds:counters(),produce:counters(),materials:Object.fromEntries(materialKeys.map(k=>[k,0])),plots:PLOTS.map(p=>({id:p.id,crop:null,plantedAt:0,readyAt:0})),buildings:[],log:[],expansions:0,profile:defaultProfile(),stats:defaultStats()};
   if(this.s.expansions===undefined){this.s.expansions=0;this.s.profile=defaultProfile();this.s.stats=defaultStats();}
   this.s.plots.forEach((p,id)=>{if(p.x===undefined)Object.assign(p,{x:PLOTS[id].x,y:PLOTS[id].y});});
   this.s.buildings.forEach(b=>{if(b.x===undefined)Object.assign(b,{...LOTS[b.slot],rotation:0});});
   if(!save){this.s.seeds.carrot=6;this.note('Selamat datang! 6 bibit wortel untuk panen pertamamu.');}
  }
  now(){this.s.lastSeen=Math.max(this.s.lastSeen,this.clock());this.ensurePlots();return this.s.lastSeen;}
  ensurePlots(){while(this.s.plots.length<unlocked(this.s)){const id=this.s.plots.length;let pos=null;for(let y=670;y<=1720&&!pos;y+=74)for(let x=1040;x<=2150;x+=68){if(placement(this.s,'plot',{x,y}).ok){pos={x,y};break;}}if(!pos)break;this.s.plots.push({id,...pos,crop:null,plantedAt:0,readyAt:0});}}
  get capacity(){return capacity(this.s,this.now());}
  get unlocked(){this.now();return Math.min(this.s.plots.length,unlocked(this.s));}
  get used(){return used(this.s);}
  note(text){this.s.log.unshift({at:this.now(),text});this.s.log=this.s.log.slice(0,8);}
  serialize(){this.now();return JSON.stringify({version:5,state:this.s});}
  buySeed(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,100))return{ok:false,message:'Jumlah bibit tidak valid.'};
   const cost=CROPS[crop].price*qty;
   if(this.s.coins<cost)return{ok:false,message:'Koin belum cukup. Panen dan jual hasil kebunmu.'};
   if(this.s.seeds[crop]+qty>1000)return{ok:false,message:'Maksimal 1.000 bibit per tanaman.'};
   this.s.coins-=cost;this.s.seeds[crop]+=qty;this.note(`Membeli ${qty} bibit ${CROPS[crop].name.toLowerCase()}.`);return{ok:true};
  }
  plant(id,crop){
   const p=this.s.plots[id];
   if(!integer(id,0,MAX_PLOTS-1)||id>=this.unlocked||!p||p.crop||!Object.hasOwn(CROPS,crop))return{ok:false,message:'Pilih petak kosong yang sudah terbuka.'};
   if(!this.s.seeds[crop])return{ok:false,message:'Bibit habis. Beli bibit ini di toko.'};
   this.s.seeds[crop]--;p.crop=crop;p.plantedAt=this.now();p.readyAt=p.plantedAt+CROPS[crop].minutes*MINUTE;
   this.note(`Menanam ${CROPS[crop].name.toLowerCase()} di petak ${id+1}.`);return{ok:true};
  }
  harvest(id){
   const p=this.s.plots[id];if(!integer(id,0,MAX_PLOTS-1)||!p?.crop)return{ok:false,message:'Belum ada tanaman di petak ini.'};
   if(this.now()<p.readyAt)return{ok:false,message:'Tanaman masih tumbuh. Tunggu sampai siap dipanen.'};
   const crop=CROPS[p.crop];
   if(this.used+crop.yield>this.capacity)return{ok:false,message:'Penyimpanan penuh. Jual hasil panen atau bangun lumbung.'};
   this.s.produce[p.crop]+=crop.yield;this.s.stats.harvested=Math.min(1e9,this.s.stats.harvested+crop.yield);this.note(`Memanen ${crop.yield} ${crop.name.toLowerCase()}.`);p.crop=null;p.plantedAt=0;p.readyAt=0;return{ok:true};
  }
  sell(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,10000)||this.s.produce[crop]<qty)return{ok:false,message:'Hasil panen belum tersedia.'};
   const earned=CROPS[crop].sell*qty;
   if(this.s.coins+earned>1e9)return{ok:false,message:'Kapasitas koin sudah penuh.'};
   this.s.produce[crop]-=qty;this.s.coins+=earned;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+earned);this.note(`Menjual ${qty} ${CROPS[crop].name.toLowerCase()} · +${earned} koin.`);return{ok:true,earned};
  }
  buyMaterial(material,qty=1){
   if(!Object.hasOwn(MATERIALS,material)||!integer(qty,1,100))return{ok:false,message:'Jumlah bahan tidak valid.'};
   const cost=MATERIALS[material].price*qty;
   if(this.s.coins<cost)return{ok:false,message:'Koin belum cukup untuk membeli bahan.'};
   const futureHarvest=this.used>0||keys.some(k=>this.s.seeds[k]>0)||this.s.plots.some(p=>p.crop!==null);
   if(!futureHarvest&&this.s.coins-cost<5)return{ok:false,message:'Sisakan 5 koin untuk membeli bibit wortel agar kebun bisa terus berjalan.'};
   if(this.s.materials[material]+qty>10000)return{ok:false,message:'Penyimpanan bahan sudah penuh.'};
   this.s.coins-=cost;this.s.materials[material]+=qty;this.note(`Membeli ${qty} ${MATERIALS[material].name.toLowerCase()}.`);return{ok:true};
  }
  canBuild(kind){return Object.hasOwn(BUILDINGS,kind)&&materialKeys.every(k=>this.s.materials[k]>=BUILDINGS[kind].cost[k]);}
  buildKitQuote(kind){if(!Object.hasOwn(BUILDINGS,kind))return{cost:0,missing:{}};const missing=Object.fromEntries(materialKeys.map(k=>[k,Math.max(0,BUILDINGS[kind].cost[k]-this.s.materials[k])]));return{missing,cost:materialKeys.reduce((sum,k)=>sum+missing[k]*MATERIALS[k].price,0)};}
  buyBuildKit(kind){if(!Object.hasOwn(BUILDINGS,kind))return{ok:false,message:'Bangunan tidak tersedia.'};const q=this.buildKitQuote(kind);if(!q.cost)return{ok:false,message:'Bahan bangunan sudah lengkap.'};if(this.s.coins<q.cost)return{ok:false,message:'Koin belum cukup untuk paket bahan.'};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-q.cost<5)return{ok:false,message:'Sisakan 5 koin untuk membeli bibit wortel.'};this.s.coins-=q.cost;for(const k of materialKeys)this.s.materials[k]+=q.missing[k];this.note(`Melengkapi bahan ${BUILDINGS[kind].name.toLowerCase()} · ${q.cost} koin.`);return{ok:true};}
  build(kind,point,rotation=0){
   if(!Object.hasOwn(BUILDINGS,kind)||this.s.buildings.length>=MAX_BUILDINGS)return{ok:false,message:'Maksimal 24 bangunan di kebun.'};
   const legacy=typeof point==='number';let slot=legacy?point:Array.from({length:MAX_BUILDINGS},(_,i)=>i).find(i=>!this.s.buildings.some(b=>b.slot===i));
   if(legacy){if(!integer(point,0,7)||this.s.buildings.some(b=>b.slot===point))return{ok:false,message:'Tapak ini sudah terisi.'};point=LOTS[point];}
   const valid=placement(this.s,kind,point||{},rotation,{props:!legacy});if(!valid.ok)return valid;
   if(!this.canBuild(kind))return{ok:false,message:'Bahan belum cukup. Beli bahan pembangunan di toko.'};
   for(const k of materialKeys)this.s.materials[k]-=BUILDINGS[kind].cost[k];
   const startedAt=this.now();this.s.buildings.push({kind,slot,x:point.x,y:point.y,rotation,startedAt,readyAt:startedAt+BUILDINGS[kind].seconds*1000});this.note(`Mulai membangun ${BUILDINGS[kind].name.toLowerCase()}.`);return{ok:true};
  }
  moveBuilding(slot,point,rotation=0){const b=this.s.buildings.find(b=>b.slot===slot);if(!b)return{ok:false,message:'Pilih bangunan yang ingin dipindahkan.'};const valid=placement(this.s,b.kind,point,rotation,{ignoreBuilding:slot});if(!valid.ok)return valid;Object.assign(b,{x:point.x,y:point.y,rotation});this.note(`Memindahkan ${BUILDINGS[b.kind].name.toLowerCase()}.`);return{ok:true};}
  movePlot(id,point){const p=this.s.plots[id];if(!p)return{ok:false,message:'Petak tidak tersedia.'};const valid=placement(this.s,'plot',point,0,{ignorePlots:[id]});if(!valid.ok)return valid;Object.assign(p,{x:point.x,y:point.y});this.note(`Memindahkan petak ${id+1}. Tanaman tetap tumbuh.`);return{ok:true};}
  gardenQuote(count=6){if(![1,3,6].includes(count)||this.unlocked+count>MAX_PLOTS)return{ok:false,message:'Maksimal 81 petak di kebun.'};return{ok:true,cost:count*20,count};}
  gardenPoints(point,count=6,rotation=0){return Array.from({length:count},(_,i)=>{const dx=((i%3)-(Math.min(count,3)-1)/2)*68,dy=(Math.floor(i/3)-(Math.ceil(count/3)-1)/2)*74;return{x:Math.round(point.x+(rotation%2?dy:dx)),y:Math.round(point.y+(rotation%2?dx:dy))};});}
  gardenPlacement(point,count=6,rotation=0){const quote=this.gardenQuote(count);if(!quote.ok)return quote;const ids=Array.from({length:count},(_,i)=>this.unlocked+i);for(const p of this.gardenPoints(point,count,rotation)){const valid=placement(this.s,'plot',p,0,{ignorePlots:ids});if(!valid.ok)return valid;}return{ok:true};}
  expandGarden(point,count=6,rotation=0){const valid=this.gardenPlacement(point,count,rotation);if(!valid.ok)return valid;const quote=this.gardenQuote(count);if(this.s.coins<quote.cost)return{ok:false,message:`Perlu ${quote.cost} koin untuk ${count} petak baru.`};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-quote.cost<5)return{ok:false,message:'Sisakan 5 koin untuk membeli bibit wortel.'};const start=this.unlocked,points=this.gardenPoints(point,count,rotation);this.s.coins-=quote.cost;this.s.expansions+=count;for(let i=0;i<count;i++){const id=start+i;this.s.plots[id]={id,...points[i],crop:null,plantedAt:0,readyAt:0};}this.note(`Membuka ${count} petak baru · ${quote.cost} koin.`);return{ok:true};}
  checkPlacement(kind,point,rotation=0,ignore={}){return placement(this.s,kind,point,rotation,ignore);}
  updateProfile(value){try{this.s.profile=profile(value);return{ok:true};}catch{return{ok:false,message:'Isi nama hingga 24 karakter dan pilih avatar atau foto JPG yang valid.'};}}

 }
 root.BaraFarm=Object.freeze({Farm,CROPS,MATERIALS,BUILDINGS,LOTS,PLOTS,AVATARS,MAX_PLOTS,MAX_BUILDINGS,footprint,validateSave});
})(globalThis);
