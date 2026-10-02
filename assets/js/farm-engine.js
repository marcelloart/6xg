'use strict';
// Pure farming rules shared by the browser and the authenticated save service.
// Growth uses absolute deadlines: closing a tab does not pause a planted crop.
(function(root){
 const MINUTE=60000,MAX_TIME=4102444800000;
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
 const unlocked=(s,now=s.lastSeen)=>Math.min(45,9+6*complete(s,'house',now)+3*complete(s,'well',now));
 const used=s=>keys.reduce((total,k)=>total+s.produce[k],0);
 function validateSave(save){
  check(object(save)&&save.version===4&&object(save.state));
  const s=save.state;
  check(integer(s.coins,0,1e9)&&integer(s.lastSeen,1,MAX_TIME));
  const clean={coins:s.coins,lastSeen:s.lastSeen,seeds:inventory(s.seeds,keys,1000),produce:inventory(s.produce,keys,10000),materials:inventory(s.materials,materialKeys,10000)};
  check(Array.isArray(s.buildings)&&s.buildings.length<=LOTS.length);
  const slots=new Set();clean.buildings=s.buildings.map(b=>{
   check(object(b)&&integer(b.slot,0,LOTS.length-1)&&!slots.has(b.slot)&&Object.hasOwn(BUILDINGS,b.kind)&&integer(b.startedAt,1,s.lastSeen)&&b.readyAt===b.startedAt+BUILDINGS[b.kind].seconds*1000&&b.readyAt<=MAX_TIME);
   slots.add(b.slot);return{slot:b.slot,kind:b.kind,startedAt:b.startedAt,readyAt:b.readyAt};
  });
  check(used(clean)<=capacity(clean));
  check(Array.isArray(s.plots)&&s.plots.length===PLOTS.length);
  clean.plots=s.plots.map((p,id)=>{
   check(object(p)&&p.id===id);
   if(p.crop===null){check(p.plantedAt===0&&p.readyAt===0);return{id,crop:null,plantedAt:0,readyAt:0};}
   check(id<unlocked(clean)&&Object.hasOwn(CROPS,p.crop)&&integer(p.plantedAt,1,s.lastSeen)&&p.readyAt===p.plantedAt+CROPS[p.crop].minutes*MINUTE&&p.readyAt<=MAX_TIME);
   return{id,crop:p.crop,plantedAt:p.plantedAt,readyAt:p.readyAt};
  });
  check(Array.isArray(s.log)&&s.log.length<=8);
  clean.log=s.log.map(e=>{check(object(e)&&integer(e.at,1,s.lastSeen)&&typeof e.text==='string'&&e.text.length<=180);return{at:e.at,text:e.text};});
  return{version:4,state:clean};
 }
 class Farm{
  constructor({clock=()=>Date.now(),save=null}={}){
   this.clock=clock;
   const counters=()=>Object.fromEntries(keys.map(k=>[k,0]));
   this.s=save?validateSave(typeof save==='string'?JSON.parse(save):save).state:{coins:0,lastSeen:clock(),seeds:counters(),produce:counters(),materials:Object.fromEntries(materialKeys.map(k=>[k,0])),plots:PLOTS.map(p=>({id:p.id,crop:null,plantedAt:0,readyAt:0})),buildings:[],log:[]};
   if(!save){this.s.seeds.carrot=6;this.note('Selamat datang! 6 bibit wortel untuk panen pertamamu.');}
  }
  now(){this.s.lastSeen=Math.max(this.s.lastSeen,this.clock());return this.s.lastSeen;}
  get capacity(){return capacity(this.s,this.now());}
  get unlocked(){return unlocked(this.s,this.now());}
  get used(){return used(this.s);}
  note(text){this.s.log.unshift({at:this.now(),text});this.s.log=this.s.log.slice(0,8);}
  serialize(){this.now();return JSON.stringify({version:4,state:this.s});}
  buySeed(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,100))return{ok:false,message:'Jumlah bibit tidak valid.'};
   const cost=CROPS[crop].price*qty;
   if(this.s.coins<cost)return{ok:false,message:'Koin belum cukup. Panen dan jual hasil kebunmu.'};
   if(this.s.seeds[crop]+qty>1000)return{ok:false,message:'Maksimal 1.000 bibit per tanaman.'};
   this.s.coins-=cost;this.s.seeds[crop]+=qty;this.note(`Membeli ${qty} bibit ${CROPS[crop].name.toLowerCase()}.`);return{ok:true};
  }
  plant(id,crop){
   const p=this.s.plots[id];
   if(!integer(id,0,44)||id>=this.unlocked||!p||p.crop||!Object.hasOwn(CROPS,crop))return{ok:false,message:'Pilih petak kosong yang sudah terbuka.'};
   if(!this.s.seeds[crop])return{ok:false,message:'Bibit habis. Beli bibit ini di toko.'};
   this.s.seeds[crop]--;p.crop=crop;p.plantedAt=this.now();p.readyAt=p.plantedAt+CROPS[crop].minutes*MINUTE;
   this.note(`Menanam ${CROPS[crop].name.toLowerCase()} di petak ${id+1}.`);return{ok:true};
  }
  harvest(id){
   const p=this.s.plots[id];if(!integer(id,0,44)||!p?.crop)return{ok:false,message:'Belum ada tanaman di petak ini.'};
   if(this.now()<p.readyAt)return{ok:false,message:'Tanaman masih tumbuh. Tunggu sampai siap dipanen.'};
   const crop=CROPS[p.crop];
   if(this.used+crop.yield>this.capacity)return{ok:false,message:'Penyimpanan penuh. Jual hasil panen atau bangun lumbung.'};
   this.s.produce[p.crop]+=crop.yield;this.note(`Memanen ${crop.yield} ${crop.name.toLowerCase()}.`);p.crop=null;p.plantedAt=0;p.readyAt=0;return{ok:true};
  }
  sell(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,10000)||this.s.produce[crop]<qty)return{ok:false,message:'Hasil panen belum tersedia.'};
   const earned=CROPS[crop].sell*qty;
   if(this.s.coins+earned>1e9)return{ok:false,message:'Kapasitas koin sudah penuh.'};
   this.s.produce[crop]-=qty;this.s.coins+=earned;this.note(`Menjual ${qty} ${CROPS[crop].name.toLowerCase()} · +${earned} koin.`);return{ok:true,earned};
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
  build(kind,slot){
   if(!Object.hasOwn(BUILDINGS,kind)||!integer(slot,0,LOTS.length-1)||this.s.buildings.some(b=>b.slot===slot))return{ok:false,message:'Pilih tapak bangunan kosong.'};
   if(!this.canBuild(kind))return{ok:false,message:'Bahan belum cukup. Beli bahan pembangunan di toko.'};
   for(const k of materialKeys)this.s.materials[k]-=BUILDINGS[kind].cost[k];
   const startedAt=this.now();this.s.buildings.push({kind,slot,startedAt,readyAt:startedAt+BUILDINGS[kind].seconds*1000});this.note(`Mulai membangun ${BUILDINGS[kind].name.toLowerCase()}.`);return{ok:true};
  }
 }
 root.BaraFarm=Object.freeze({Farm,CROPS,MATERIALS,BUILDINGS,LOTS,PLOTS,validateSave});
})(globalThis);
