'use strict';
const harvestT_farm_engine_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
// Pure farming rules shared by the browser and the authenticated save service.
// Growth uses absolute deadlines: closing a tab does not pause a planted crop.
(function(root){
 const MINUTE=60000,MAX_TIME=4102444800000,MAX_PLOTS=81,MAX_BUILDINGS=24;
 const CROPS=Object.freeze({
  carrot:{name:harvestT_farm_engine_js('Wortel'),icon:'🥕',minutes:5,price:5,yield:3,sell:3,color:'#ee9551'},
  tomato:{name:harvestT_farm_engine_js('Tomat'),icon:'🍅',minutes:15,price:12,yield:4,sell:5,color:'#e76e58'},
  corn:{name:harvestT_farm_engine_js('Jagung'),icon:'🌽',minutes:30,price:24,yield:5,sell:8,color:'#e9c759'},
  strawberry:{name:harvestT_farm_engine_js('Stroberi'),icon:'🍓',minutes:60,price:45,yield:6,sell:12,color:'#df6372'},
  potato:{name:harvestT_farm_engine_js('Kentang'),icon:'🥔',minutes:120,price:75,yield:7,sell:18,color:'#c5a47a'},
  chili:{name:harvestT_farm_engine_js('Cabai'),icon:'🌶️',minutes:300,price:120,yield:8,sell:25,color:'#d95a4d'},
  orange:{name:harvestT_farm_engine_js('Jeruk'),icon:'🍊',minutes:600,price:200,yield:9,sell:36,color:'#f1a649'},
  apple:{name:harvestT_farm_engine_js('Apel'),icon:'🍎',minutes:720,price:280,yield:10,sell:46,color:'#d96965'},
  avocado:{name:harvestT_farm_engine_js('Alpukat'),icon:'🥑',minutes:1440,price:420,yield:12,sell:60,color:'#8dac65'},
  grape:{name:harvestT_farm_engine_js('Anggur'),icon:'🍇',minutes:240,price:500,yield:12,sell:75,color:'#725386'},
  pumpkin:{name:harvestT_farm_engine_js('Labu'),icon:'🎃',minutes:480,price:650,yield:10,sell:115,color:'#d48635'},
  cacao:{name:harvestT_farm_engine_js('Kakao'),icon:'🌰',minutes:1440,price:900,yield:12,sell:145,color:'#876139'}
 });
 const MATERIALS=Object.freeze({wood:{name:harvestT_farm_engine_js('Kayu'),icon:'🪵',price:3},stone:{name:harvestT_farm_engine_js('Batu'),icon:'🪨',price:4},meat:{name:harvestT_farm_engine_js('Daging'),icon:'🥩',price:5}});
 const BUILDINGS=Object.freeze({
  pier:{name:harvestT_farm_engine_js('Dermaga pancing'),icon:'🎣',seconds:90,cost:{wood:12,stone:4,meat:0},benefit:harvestT_farm_engine_js('Memancing di sungai')},
  barn:{name:harvestT_farm_engine_js('Lumbung'),icon:'🏚️',seconds:90,cost:{wood:6,stone:3,meat:1},benefit:harvestT_farm_engine_js('+80 ruang hasil panen')},
  house:{name:harvestT_farm_engine_js('Rumah'),icon:'🏡',seconds:60,cost:{wood:10,stone:5,meat:2},benefit:harvestT_farm_engine_js('+6 petak tanam')},
  shed:{name:harvestT_farm_engine_js('Gudang'),icon:'🛖',seconds:60,cost:{wood:8,stone:4,meat:1},benefit:harvestT_farm_engine_js('+40 ruang hasil panen')},
  well:{name:harvestT_farm_engine_js('Sumur'),icon:'⛲',seconds:45,cost:{wood:5,stone:6,meat:1},benefit:harvestT_farm_engine_js('+3 petak tanam')},
  bench:{name:harvestT_farm_engine_js('Bangku kebun'),icon:'🪑',seconds:30,cost:{wood:4,stone:2,meat:0},benefit:harvestT_farm_engine_js('Dekorasi sudut kebun')},
  lamp:{name:harvestT_farm_engine_js('Lampu kebun'),icon:'🏮',seconds:30,cost:{wood:2,stone:4,meat:0},benefit:harvestT_farm_engine_js('Cahaya hangat · menyala otomatis saat malam')},
  kitchen:{name:harvestT_farm_engine_js('Dapur kebun'),icon:'🍲',seconds:120,cost:{wood:14,stone:8,meat:2},benefit:harvestT_farm_engine_js('Sup wortel dan selai · 3 antrean')},
  juicery:{name:harvestT_farm_engine_js('Rumah jus'),icon:'🍊',seconds:150,cost:{wood:22,stone:12,meat:3},benefit:harvestT_farm_engine_js('Jus jeruk · 3 antrean')},
  bakery:{name:harvestT_farm_engine_js('Rumah pai'),icon:'🥧',seconds:180,cost:{wood:26,stone:16,meat:4},benefit:harvestT_farm_engine_js('Pai apel · 3 antrean')},
  coop:{name:harvestT_farm_engine_js('Kandang ayam'),icon:'🐔',seconds:80,cost:{wood:12,stone:6,meat:1},benefit:harvestT_farm_engine_js('Rumah untuk 4 ayam · menghasilkan telur')},
  cowshed:{name:harvestT_farm_engine_js('Kandang sapi'),icon:'🐄',seconds:120,cost:{wood:22,stone:12,meat:2},benefit:harvestT_farm_engine_js('Rumah untuk 2 sapi · menghasilkan susu')},
  greenhouse:{name:harvestT_farm_engine_js('Rumah kaca'),icon:'🌿',seconds:300,cost:{wood:45,stone:30,meat:5},benefit:harvestT_farm_engine_js('+9 petak tanam · kebun botani')},
  planter:{name:harvestT_farm_engine_js('Pot bunga hadiah'),icon:'🌻',seconds:15,cost:{wood:0,stone:0,meat:0},benefit:harvestT_farm_engine_js('Dekorasi dari pencapaian Panen Bertumbuh')}
 });
 const FISH=Object.freeze({
  tilapia:{name:harvestT_farm_engine_js('Nila'),enName:'Tilapia',idName:'Nila',icon:'🐟',sell:12,xp:5,min:16,max:34,color:'#889a83'},
  carp:{name:harvestT_farm_engine_js('Ikan mas'),enName:'Carp',idName:'Ikan mas',icon:'🐟',sell:22,xp:7,min:22,max:48,color:'#bc924d'},
  catfish:{name:harvestT_farm_engine_js('Lele'),enName:'Catfish',idName:'Lele',icon:'🐟',sell:26,xp:8,min:24,max:55,color:'#5c6b66'},
  snakehead:{name:harvestT_farm_engine_js('Gabus'),enName:'Snakehead',idName:'Gabus',icon:'🐟',sell:45,xp:12,min:28,max:62,color:'#7a8060'}
 });
 const BAITS=Object.freeze({worm:{name:'Earthworm',idName:'Cacing',price:3},dough:{name:'Dough bait',idName:'Umpan adonan',price:5}});
 const FISHING_LEVEL=3;
 const fishingText=(en,id)=>typeof BaraI18n!=='undefined'&&BaraI18n.language==='id'?id:en;
 const riverCenter=y=>640+110*Math.sin(y/270);
 const pierPoint=(y,rotation=0)=>({x:Math.round(riverCenter(Math.round(y))+(rotation===2?-145:145)),y:Math.round(y),rotation});
 const pierOnLand=(p,rotation=0)=>[0,2].includes(rotation)&&integer(p.y,90,2110)&&integer(p.x,0,3200)&&Math.abs(p.x-pierPoint(p.y,rotation).x)<=3&&Math.abs(p.y-1115)>=125;
 const freshFishing=()=>({rod:1,bait:{worm:0,dough:0},starter:false,nextId:1,cast:null,fish:Object.fromEntries(Object.keys(FISH).map(k=>[k,0])),caught:0,best:0,records:[]});
 function fishingConditions(at){
  const hour=Math.floor((at+7*3600000)%86400000/3600000),slot=Math.floor(at/1800000);
  const rain=n=>{let seed=Math.imul(n^60105,1597334677);seed=Math.imul(seed^(seed>>>16),2246822507);return((seed^(seed>>>13))>>>0)/4294967296>=.82?.72:0;};
  const t=Math.max(0,Math.min(1,(at-slot*1800000)/120000)),blend=t*t*(3-2*t),wet=rain(slot-1)+(rain(slot)-rain(slot-1))*blend;
  return{night:hour<6||hour>=18,rain:wet>.15};
 }
 const fishingBite=(start,seed)=>start+5000+seed%6000;
 // Active casts and pier construction exclude each other, so this tier stays
 // fixed until the catch is kept or cancelled, including a full-bag landing.
 const pierFishingBonus=level=>({xp:(level-1)*2,rareWeight:(level-1)*4});
 function fishingOutcome(seed,bait,rod,conditions,pierLevel=1){
  const weights={tilapia:55,carp:25,catfish:17,snakehead:3+(rod-1)*5+pierFishingBonus(pierLevel).rareWeight};
  if(bait==='dough'){weights.carp+=20;weights.tilapia-=15;}
  if(conditions.night)weights.catfish+=14;if(conditions.rain)weights.carp+=10;
  const total=Object.values(weights).reduce((a,b)=>a+b,0);let pick=((Math.imul(seed^83117,1597334677)>>>0)%total),kind='tilapia';
  for(const[k,w]of Object.entries(weights)){if(pick<w){kind=k;break;}pick-=w;}
  const spec=FISH[kind],length=spec.min+((seed>>>8)%(spec.max-spec.min+1));return{kind,length};
 }
 function fishingStage(c,now){
  if(!c)return'idle';if(c.reels===3)return'landed';if(now>c.expiresAt)return'escaped';if(!c.hookedAt)return now<c.biteAt?'waiting':'bite';
  const target=c.hookedAt+(c.reels+1)*3000;return now<target-900?'reeling':now<=target+1600?'pull':'escaped';
 }
 function validateFishing(value,state){
  const f=value;check(object(f)&&integer(f.rod,1,3)&&typeof f.starter==='boolean'&&integer(f.nextId,1,1e9)&&integer(f.caught,0,1e9)&&integer(f.best,0,62)&&Array.isArray(f.records)&&f.records.length<=8);
  const clean={rod:f.rod,bait:inventory(f.bait,Object.keys(BAITS),1000),starter:f.starter,nextId:f.nextId,cast:null,fish:inventory(f.fish,Object.keys(FISH),10000),caught:f.caught,best:f.best,records:f.records.map(r=>{check(object(r)&&Object.hasOwn(FISH,r.kind)&&integer(r.length,FISH[r.kind].min,FISH[r.kind].max)&&integer(r.at,1,state.lastSeen));return{kind:r.kind,length:r.length,at:r.at};})};
  check(f.caught>=clean.records.length&&Object.values(clean.fish).reduce((a,b)=>a+b,0)<=f.caught&&clean.records.every(r=>r.length<=f.best));
  if(f.cast){const c=f.cast,b=state.buildings.find(b=>b.slot===c.slot);check(object(c)&&integer(c.id,1,f.nextId-1)&&b?.kind==='pier'&&b.readyAt<=c.startedAt&&integer(c.startedAt,b.readyAt,state.lastSeen)&&integer(c.seed,0,4294967295)&&Object.hasOwn(BAITS,c.bait)&&integer(c.rod,1,f.rod)&&c.biteAt===fishingBite(c.startedAt,c.seed)&&integer(c.reels,0,3));
   const conditions=fishingConditions(c.startedAt);check(object(c.conditions)&&c.conditions.night===conditions.night&&c.conditions.rain===conditions.rain);
   check((c.hookedAt===0&&c.reels===0&&c.expiresAt===c.biteAt+7000)||(integer(c.hookedAt,c.biteAt,Math.min(state.lastSeen,c.biteAt+7000))&&c.expiresAt===c.hookedAt+10600));
   if(c.reels)check(state.lastSeen>=c.hookedAt+c.reels*3000-900);
   clean.cast={id:c.id,slot:c.slot,startedAt:c.startedAt,seed:c.seed,bait:c.bait,rod:c.rod,conditions,biteAt:c.biteAt,expiresAt:c.expiresAt,hookedAt:c.hookedAt,reels:c.reels};
  }return clean;
 }

 const UPGRADE_KINDS=Object.freeze(['barn','shed','house','well','kitchen','juicery','bakery','coop','cowshed','greenhouse','pier']);
 const REGIONS=Object.freeze({vineyard:{name:harvestT_farm_engine_js('Kebun anggur'),level:10,count:6,coins:300},botanical:{name:harvestT_farm_engine_js('Kebun botani'),level:14,count:6,coins:600}});
 const LEGACY_CROPS=Object.keys(CROPS).slice(0,9);
 const LOTS=Object.freeze([{x:1230,y:810},{x:1510,y:765},{x:1810,y:805},{x:2050,y:1050},{x:2050,y:1350},{x:1830,y:1540},{x:1470,y:1600},{x:1130,y:1420}]);
 const grid=Array.from({length:45},(_,i)=>({col:i%9,row:Math.floor(i/9)}));
 grid.sort((a,b)=>Number(!(a.col>=3&&a.col<6&&a.row<3))-Number(!(b.col>=3&&b.col<6&&b.row<3)));
 const PLOTS=Object.freeze(grid.map((p,id)=>({id,x:1320+p.col*68,y:1010+p.row*74})));
 const keys=Object.keys(CROPS),materialKeys=Object.keys(MATERIALS);
 const LEVEL_XP=Object.freeze([0,30,80,150,260,420,650,950,1400,2000,2900,4200,6000,8500,12000]);
 const CROP_LEVEL=Object.freeze(Object.fromEntries(keys.map((k,i)=>[k,i+1])));
 const BUILDING_LEVEL=Object.freeze({pier:3,barn:1,house:2,well:3,shed:4,bench:3,lamp:2,kitchen:2,juicery:7,bakery:8,planter:1,coop:3,cowshed:5,greenhouse:12});
 const RECIPES=Object.freeze({
  soup:{name:harvestT_farm_engine_js('Sup wortel'),icon:'🍲',building:'kitchen',level:2,minutes:15,inputs:{carrot:3},yield:1,sell:16,xp:4},
  jam:{name:harvestT_farm_engine_js('Selai stroberi'),icon:'🍓',building:'kitchen',level:4,minutes:30,inputs:{strawberry:3},yield:1,sell:60,xp:9},
  juice:{name:harvestT_farm_engine_js('Jus jeruk'),icon:'🥤',building:'juicery',level:7,minutes:5,inputs:{orange:3},yield:1,sell:175,xp:15},
  compote:{name:harvestT_farm_engine_js('Kompot anggur'),icon:'🍇',building:'kitchen',level:10,buildingLevel:2,minutes:40,inputs:{grape:3,apple:1},yield:1,sell:370,xp:28},
  pumpkinSoup:{name:harvestT_farm_engine_js('Sup labu'),icon:'🍲',building:'kitchen',level:11,buildingLevel:3,minutes:25,inputs:{pumpkin:2,carrot:2},yield:1,sell:330,xp:32},
  chocolate:{name:harvestT_farm_engine_js('Dessert cokelat'),icon:'🍫',building:'bakery',level:13,buildingLevel:2,minutes:90,inputs:{cacao:3,avocado:1},yield:1,sell:730,xp:48},
  pie:{name:harvestT_farm_engine_js('Pai apel'),icon:'🥧',building:'bakery',level:8,minutes:60,inputs:{apple:3},yield:1,sell:225,xp:20}
 });
 const LEGACY_RECIPES=['soup','jam','juice','pie'];
 const freshCommunity=now=>({day:farmDay(now),helped:[],gifts:[],received:[]});
 const ANIMALS=Object.freeze({chicken:{name:harvestT_farm_engine_js('Ayam'),icon:'🐔',building:'coop',capacity:4,level:3,price:65,minutes:30,feed:{corn:1},product:'egg',yield:3,xp:4},cow:{name:harvestT_farm_engine_js('Sapi'),icon:'🐄',building:'cowshed',capacity:2,level:5,price:200,minutes:120,feed:{carrot:2,corn:2},product:'milk',yield:3,xp:8}});
 const ANIMAL_PRODUCTS=Object.freeze({egg:{name:harvestT_farm_engine_js('Telur'),icon:'🥚',sell:7},milk:{name:harvestT_farm_engine_js('Susu'),icon:'🥛',sell:14}});
 const freshLivestock=()=>({nextId:1,animals:[],produce:{egg:0,milk:0}});
 const freshSocial=()=>({enabled:false,code:null,friends:[]});
 const friendCode=code=>typeof code==='string'&&/^[A-F0-9]{16}$/.test(code);
 const DAILY=Object.freeze({
  plant:{name:harvestT_farm_engine_js('Bibit hari ini'),text:harvestT_farm_engine_js('Tanam 3 bibit'),counter:'planted',target:3,seeds:2,xp:8},
  harvest:{name:harvestT_farm_engine_js('Keranjang pagi'),text:harvestT_farm_engine_js('Panen 9 hasil tanaman'),counter:'harvested',target:9,seeds:3,xp:12},
  order:{name:harvestT_farm_engine_js('Sapa pelanggan'),text:harvestT_farm_engine_js('Kirim 1 pesanan pelanggan'),counter:'orders',target:1,seeds:2,xp:10}
 });
 const ACHIEVEMENTS=Object.freeze({
  harvester:{name:harvestT_farm_engine_js('Panen Bertumbuh'),text:harvestT_farm_engine_js('Panen 30 hasil tanaman'),target:30,seeds:3,xp:20},
  trader:{name:harvestT_farm_engine_js('Pedagang Kebun'),text:harvestT_farm_engine_js('Dapatkan 300 koin dari penjualan dan pesanan'),target:300,seeds:4,xp:30},
  builder:{name:harvestT_farm_engine_js('Desa Kecil'),text:harvestT_farm_engine_js('Selesaikan 3 bangunan'),target:3,seeds:3,xp:25},
  artisan:{name:harvestT_farm_engine_js('Tangan Terampil'),text:harvestT_farm_engine_js('Ambil 5 hasil produksi'),target:5,seeds:3,xp:35},
  diligent:{name:harvestT_farm_engine_js('Pekebun Rajin'),text:harvestT_farm_engine_js('Klaim 9 misi harian'),target:9,seeds:5,xp:50}
 });
 const farmDay=now=>Math.floor((now+7*3600000)/86400000);
 const freshProduction=()=>({nextId:1,jobs:[],goods:Object.fromEntries(Object.keys(RECIPES).map(k=>[k,0]))});
 const freshChallenges=now=>({day:farmDay(now),counts:{planted:0,harvested:0,orders:0},claimed:[],totals:{crafted:0,dailies:0},achievements:[]});
 const ORDER_TEMPLATES=Object.freeze([
  {name:harvestT_farm_engine_js('Bu Sari'),text:harvestT_farm_engine_js('Wortel segar untuk dapur'),level:1,items:{carrot:6}},
  {name:harvestT_farm_engine_js('Pak Bima'),text:harvestT_farm_engine_js('Bekal warung pagi'),level:1,items:{carrot:9}},
  {name:'Maya',text:harvestT_farm_engine_js('Keranjang sayur pertama'),level:1,items:{carrot:3}},
  {name:harvestT_farm_engine_js('Bu Sari'),text:harvestT_farm_engine_js('Bahan sup keluarga'),level:2,items:{carrot:3,tomato:4}},
  {name:harvestT_farm_engine_js('Pak Bima'),text:harvestT_farm_engine_js('Jagung untuk pasar'),level:3,items:{corn:5,tomato:4}},
  {name:'Maya',text:harvestT_farm_engine_js('Selai stroberi'),level:4,items:{strawberry:6}},
  {name:harvestT_farm_engine_js('Bu Sari'),text:harvestT_farm_engine_js('Kentang untuk makan siang'),level:5,items:{potato:7,carrot:3}},
  {name:harvestT_farm_engine_js('Pak Bima'),text:harvestT_farm_engine_js('Sambal warung'),level:6,items:{chili:8,tomato:4}},
  {name:'Maya',text:harvestT_farm_engine_js('Jus jeruk segar'),level:7,items:{orange:9}},
  {name:harvestT_farm_engine_js('Bu Sari'),text:harvestT_farm_engine_js('Pai apel akhir pekan'),level:8,items:{apple:10}},
  {name:'Maya',text:harvestT_farm_engine_js('Sarapan alpukat'),level:9,items:{avocado:12}},
  {name:'Maya',text:harvestT_farm_engine_js('Panen kebun anggur'),level:10,items:{grape:12,apple:3}},
  {name:'Maya',text:harvestT_farm_engine_js('Festival labu'),level:11,items:{pumpkin:10,carrot:6}},
  {name:'Maya',text:harvestT_farm_engine_js('Kakao pilihan'),level:12,items:{cacao:12,orange:3}},
  {name:'Maya',text:harvestT_farm_engine_js('Keranjang botani'),level:14,items:{grape:12,pumpkin:10,cacao:6}}
 ]);
 const levelFor=xp=>LEVEL_XP.reduce((level,need,i)=>xp>=need?i+1:level,1);
 const freshProgress=()=>({xp:0,grandfatheredCrops:[],grandfatheredBuildings:[],tutorial:{planted:0,harvested:0,sold:0,dismissed:false},orders:{completed:0,rounds:[0,0,0],offers:[0,1,2]}});
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const check=v=>{if(!v)throw new TypeError(harvestT_farm_engine_js('Progres kebun tidak valid.'));};
 const inventory=(v,list,max,legacy=null)=>{check(object(v)&&Object.keys(v).every(k=>list.includes(k))&&(legacy?legacy.every(k=>Object.hasOwn(v,k)):Object.keys(v).length===list.length));return Object.fromEntries(list.map(k=>{const value=Object.hasOwn(v,k)?v[k]:0;check((legacy||Object.hasOwn(v,k))&&integer(value,0,max));return[k,value];}));};
 const buildingLevel=(b,now)=>b.upgrade?.readyAt<=now?b.upgrade.targetLevel:(b.level||1);
 const upgradeDuration=(kind,target)=>BUILDINGS[kind].seconds*1000*target*2;
 const upgradeCost=(kind,target)=>({cost:Object.fromEntries(Object.entries(BUILDINGS[kind].cost).map(([k,n])=>[k,Math.ceil(n*target*1.5)])),coins:target*50});
 const queueCapacity=(b,now)=>3+buildingLevel(b,now)-1;
 const complete=(s,kind,now)=>s.buildings.filter(b=>b.kind===kind&&b.readyAt<=now).reduce((n,b)=>n+buildingLevel(b,now),0);
 const capacity=(s,now=s.lastSeen)=>20+80*complete(s,'barn',now)+40*complete(s,'shed',now);
 const unlocked=(s,now=s.lastSeen)=>Math.min(s.expansions===undefined?45:MAX_PLOTS,9+6*complete(s,'house',now)+3*complete(s,'well',now)+9*complete(s,'greenhouse',now)+(s.expansions||0));
 const used=s=>Object.values(s.fishing?.fish||{}).reduce((a,b)=>a+b,0)+keys.reduce((total,k)=>total+s.produce[k],0)+Object.keys(RECIPES).reduce((total,k)=>total+(s.production?.goods[k]||0),0)+Object.keys(ANIMAL_PRODUCTS).reduce((total,k)=>total+(s.livestock?.produce[k]||0),0);
 const AVATARS=Object.freeze(['sprout','sunflower','apple','bee']);
 const defaultProfile=()=>({name:harvestT_farm_engine_js('Pekebun'),farmName:harvestT_farm_engine_js('Kebunku'),avatar:'sprout'});
 const defaultStats=()=>({harvested:0,earned:0});
 const accountPhotoURL=value=>{if(typeof value!=='string'||value.length>1024)return null;try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='pbs.twimg.com'||u.port||u.username||u.password||u.search||u.hash||!/^\/profile_images\/[A-Za-z0-9_./-]+$/.test(u.pathname))return null;u.pathname=u.pathname.replace(/_normal(?=\.[a-z0-9]+$)/i,'');return u.href;}catch{return null;}};
 const profile=v=>{check(object(v));const clean={};for(const k of ['name','farmName']){check(typeof v[k]==='string'&&v[k].trim().length>=1&&v[k].trim().length<=24&&!/[\u0000-\u001f\u007f]/.test(v[k]));clean[k]=v[k].trim();}check(AVATARS.includes(v.avatar));clean.avatar=v.avatar;if(v.accountPhoto!=null){const url=accountPhotoURL(v.accountPhoto);check(url);clean.accountPhoto=url;}if(v.sharePhoto!==undefined){check(typeof v.sharePhoto==='boolean');clean.sharePhoto=v.sharePhoto;}if(v.useAccountPhoto!==undefined){check(typeof v.useAccountPhoto==='boolean');clean.useAccountPhoto=v.useAccountPhoto;}if(v.photo!=null){check(typeof v.photo==='string'&&v.photo.length>=128&&v.photo.length<=16384&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(v.photo)&&(v.photo.length-23)%4===0);clean.photo=v.photo;}return clean;};
 const footprint=(kind,rotation=0)=>{const size=kind==='plot'?[60,60]:kind==='garden'?[196,136]:({pier:[240,100],barn:[150,128],house:[130,116],shed:[112,104],well:[90,90],bench:[90,60],lamp:[32,32],kitchen:[130,116],juicery:[130,116],bakery:[130,116],planter:[48,48],coop:[130,136],cowshed:[160,156],greenhouse:[160,144]}[kind]||[60,60]);return rotation%2?{w:size[1],h:size[0]}:{w:size[0],h:size[1]};};
 const overlaps=(a,b,gap=5)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;
 const onLand=(p,size)=>{
  if(!integer(p.x,Math.ceil(size.w/2),3200-Math.ceil(size.w/2))||!integer(p.y,Math.ceil(size.h/2),2200-Math.ceil(size.h/2)))return false;
  // Both banks are usable. Check the entire footprint against the curved river.
  const top=p.y-size.h/2,bottom=p.y+size.h/2,centers=[top,bottom].map(y=>640+110*Math.sin(y/270));
  for(let k=Math.ceil((top/270-Math.PI/2)/Math.PI);(Math.PI/2+k*Math.PI)*270<=bottom;k++)centers.push(640+110*Math.sin(Math.PI/2+k*Math.PI));
  return p.x+size.w/2<=Math.min(...centers)-108||p.x-size.w/2>=Math.max(...centers)+108;
 };
 const defaultPlot=id=>PLOTS[id]||{id,x:1080+(id-45)%12*68,y:1460+Math.floor((id-45)/12)*74};
 function placement(s,kind,point,rotation=0,{ignoreBuilding=null,ignorePlots=[],props=true}={}){
  const size=footprint(kind,rotation),rect={...point,...size};
  if(!integer(rotation,0,3)||!(kind==='pier'?pierOnLand(point,rotation):onLand(point,size)))return{ok:false,message:harvestT_farm_engine_js('Pilih daratan di peta. Posisi ini berada di sungai atau di luar peta.')};
  if(s.buildings.some(b=>b.slot!==ignoreBuilding&&overlaps(rect,{...b,...footprint(b.kind,b.rotation)})))return{ok:false,message:harvestT_farm_engine_js('Posisi bertabrakan dengan bangunan lain.')};
  // Unopened entries are future defaults, not occupied land. Only active plots block placement.
  if(s.plots.some(p=>p.id<unlocked(s)&&!ignorePlots.includes(p.id)&&overlaps(rect,{...p,...footprint('plot')})))return{ok:false,message:harvestT_farm_engine_js('Posisi bertabrakan dengan petak tanam.')};
  if(props&&(overlaps(rect,{x:1593,y:872,w:112,h:100})||[[1408,867],[1788,859],[1050,910],[1108,1650],[2130,870],[2180,1570]].some(([x,y])=>overlaps(rect,{x,y,w:58,h:58}))))return{ok:false,message:harvestT_farm_engine_js('Sisakan ruang untuk pondok dan pepohonan.')};
  return{ok:true};
 }
 function validateSave(save){
  check(object(save)&&[4,5,6,7,8,9,10].includes(save.version)&&object(save.state));const modern=save.version>=5;
  const s=save.state;
  check(integer(s.coins,0,1e9)&&integer(s.lastSeen,1,MAX_TIME));
  const clean={coins:s.coins,lastSeen:s.lastSeen,seeds:inventory(s.seeds,keys,1000,save.version<9?LEGACY_CROPS:null),produce:inventory(s.produce,keys,10000,save.version<9?LEGACY_CROPS:null),materials:inventory(s.materials,materialKeys,10000)};
  check(Array.isArray(s.buildings)&&s.buildings.length<=(modern?MAX_BUILDINGS:LOTS.length));
  const slots=new Set();clean.buildings=s.buildings.map(b=>{
   check(object(b)&&integer(b.slot,0,(modern?MAX_BUILDINGS:LOTS.length)-1)&&!slots.has(b.slot)&&Object.hasOwn(BUILDINGS,b.kind)&&integer(b.startedAt,1,s.lastSeen)&&b.readyAt===b.startedAt+BUILDINGS[b.kind].seconds*1000&&b.readyAt<=MAX_TIME);
   slots.add(b.slot);const base={slot:b.slot,kind:b.kind,startedAt:b.startedAt,readyAt:b.readyAt,level:1,upgrade:null};if(save.version>=9){check(integer(b.level,1,5)&&(UPGRADE_KINDS.includes(b.kind)||b.level===1));base.level=b.level;if(b.upgrade){const u=b.upgrade;check(UPGRADE_KINDS.includes(b.kind)&&object(u)&&u.targetLevel===b.level+1&&u.targetLevel<=5&&integer(u.startedAt,b.readyAt,s.lastSeen)&&u.readyAt===u.startedAt+upgradeDuration(b.kind,u.targetLevel)&&u.readyAt<=MAX_TIME);base.upgrade={startedAt:u.startedAt,readyAt:u.readyAt,targetLevel:u.targetLevel};}}if(modern){check(integer(b.rotation,0,3)&&(b.kind==='pier'?pierOnLand(b,b.rotation):onLand(b,footprint(b.kind,b.rotation))));Object.assign(base,{x:b.x,y:b.y,rotation:b.rotation});}return base;
  });
  if(save.version>=7){
   const p=s.production,c=s.challenges;
   check(object(p)&&integer(p.nextId,1,1e9)&&Array.isArray(p.jobs)&&p.jobs.length<=MAX_BUILDINGS*7);
   clean.production={nextId:p.nextId,goods:inventory(p.goods,Object.keys(RECIPES),10000,save.version<9?LEGACY_RECIPES:null),jobs:[]};
   const ids=new Set(),tails=new Map(),counts=new Map();
   for(const j of p.jobs){check(object(j)&&Object.hasOwn(RECIPES,j.recipe));const recipe=RECIPES[j.recipe],b=clean.buildings.find(b=>b.slot===j.slot);check(integer(j.id,1,p.nextId-1)&&!ids.has(j.id)&&b?.kind===recipe.building&&integer(j.startedAt,b.readyAt,MAX_TIME)&&[recipe.minutes,...({soup:[10],juice:[45]}[j.recipe]||[])].some(minutes=>j.readyAt===j.startedAt+minutes*MINUTE)&&j.readyAt<=MAX_TIME&&j.startedAt>=(tails.get(j.slot)||0));ids.add(j.id);tails.set(j.slot,j.readyAt);counts.set(j.slot,(counts.get(j.slot)||0)+1);check(counts.get(j.slot)<=queueCapacity(b,s.lastSeen));clean.production.jobs.push({id:j.id,slot:j.slot,recipe:j.recipe,startedAt:j.startedAt,readyAt:j.readyAt});}
   const claims=(v,list)=>{check(Array.isArray(v)&&v.length<=list.length&&new Set(v).size===v.length&&v.every(k=>list.includes(k)));return[...v];};
   check(object(c)&&integer(c.day,0,50000)&&object(c.totals)&&integer(c.totals.crafted,0,1e9)&&integer(c.totals.dailies,0,1e9));
   clean.challenges={day:c.day,counts:inventory(c.counts,['planted','harvested','orders'],1e9),claimed:claims(c.claimed,Object.keys(DAILY)),totals:{crafted:c.totals.crafted,dailies:c.totals.dailies},achievements:claims(c.achievements,Object.keys(ACHIEVEMENTS))};
  }
  if(save.version>=8){
   const l=s.livestock,t=s.social;check(object(l)&&integer(l.nextId,1,1e9)&&Array.isArray(l.animals)&&l.animals.length<=MAX_BUILDINGS*12);
   clean.livestock={nextId:l.nextId,produce:inventory(l.produce,Object.keys(ANIMAL_PRODUCTS),10000),animals:[]};const ids=new Set(),counts=new Map();
   for(const a of l.animals){check(object(a)&&Object.hasOwn(ANIMALS,a.kind));const spec=ANIMALS[a.kind],b=clean.buildings.find(b=>b.slot===a.slot);check(integer(a.id,1,l.nextId-1)&&!ids.has(a.id)&&b?.kind===spec.building&&b.readyAt<=s.lastSeen&&((a.fedAt===0&&a.readyAt===0)||(integer(a.fedAt,b.readyAt,s.lastSeen)&&a.readyAt===a.fedAt+spec.minutes*MINUTE&&a.readyAt<=MAX_TIME)));ids.add(a.id);counts.set(a.slot,(counts.get(a.slot)||0)+1);check(counts.get(a.slot)<=spec.capacity+2*(buildingLevel(b,s.lastSeen)-1));clean.livestock.animals.push({id:a.id,slot:a.slot,kind:a.kind,fedAt:a.fedAt,readyAt:a.readyAt});}
   check(object(t)&&typeof t.enabled==='boolean'&&(t.code===null||friendCode(t.code))&&(!t.enabled||t.code!==null)&&Array.isArray(t.friends)&&t.friends.length<=30&&new Set(t.friends).size===t.friends.length&&t.friends.every(code=>friendCode(code)&&code!==t.code));clean.social={enabled:t.enabled,code:t.code,friends:[...t.friends]};
  }
  if(save.version>=9){const c=s.community;check(object(c)&&integer(c.day,0,50000)&&Array.isArray(c.helped)&&c.helped.length<=5&&Array.isArray(c.gifts)&&c.gifts.length<=3&&Array.isArray(c.received)&&c.received.length<=8);clean.community={day:c.day,helped:c.helped.map(v=>{check(object(v)&&friendCode(v.code)&&integer(v.plot,0,80)&&integer(v.plantedAt,1,MAX_TIME));return{code:v.code,plot:v.plot,plantedAt:v.plantedAt};}),gifts:c.gifts.map(code=>{check(friendCode(code));return code;}),received:c.received.map(v=>{check(object(v)&&integer(v.at,1,s.lastSeen)&&typeof v.name==='string'&&v.name.length<=24&&['water','gift'].includes(v.type)&&(v.type==='water'||Object.hasOwn(CROPS,v.crop))&&integer(v.qty,1,5));return{at:v.at,name:v.name,type:v.type,qty:v.qty,...(v.type==='gift'?{crop:v.crop}:{})};})};check(new Set(c.gifts).size===c.gifts.length);}
  if(save.version>=9){check(Array.isArray(s.regions)&&s.regions.length<=2&&new Set(s.regions).size===s.regions.length&&s.regions.every(k=>Object.hasOwn(REGIONS,k))&&s.expansions>=s.regions.length*6);clean.regions=[...s.regions];}
  if(save.version>=10)clean.fishing=validateFishing(s.fishing,clean);
  check(used(clean)<=capacity(clean));
  if(modern){check(integer(s.expansions,0,72));clean.expansions=s.expansions;clean.profile=profile(s.profile);check(object(s.stats)&&integer(s.stats.harvested,0,1e9)&&integer(s.stats.earned,0,1e12));clean.stats={harvested:s.stats.harvested,earned:s.stats.earned};}
  if(save.version>=6){
   const p=s.progress;check(object(p)&&integer(p.xp,0,1e12));
   const allowed=(v,list)=>{check(Array.isArray(v)&&v.length<=list.length&&new Set(v).size===v.length&&v.every(k=>list.includes(k)));return[...v];};
   const t=p.tutorial,o=p.orders;check(object(t)&&['planted','harvested','sold'].every(k=>integer(t[k],0,1e9))&&typeof t.dismissed==='boolean');
   check(object(o)&&integer(o.completed,0,1e9)&&Array.isArray(o.rounds)&&o.rounds.length===3&&o.rounds.every(n=>integer(n,0,1e9))&&Array.isArray(o.offers)&&o.offers.length===3&&o.offers.every(n=>integer(n,0,ORDER_TEMPLATES.length-1))&&o.rounds.reduce((a,b)=>a+b,0)===o.completed);
   clean.progress={xp:p.xp,grandfatheredCrops:allowed(p.grandfatheredCrops,keys),grandfatheredBuildings:allowed(p.grandfatheredBuildings,Object.keys(BUILDINGS)),tutorial:{planted:t.planted,harvested:t.harvested,sold:t.sold,dismissed:t.dismissed},orders:{completed:o.completed,rounds:[...o.rounds],offers:[...o.offers]}};
  }
  check(Array.isArray(s.plots)&&(modern?s.plots.length>=45&&s.plots.length<=MAX_PLOTS&&s.plots.length>=unlocked(clean):s.plots.length===PLOTS.length));
  clean.plots=s.plots.map((p,id)=>{
   check(object(p)&&p.id===id);const pos=modern?{x:p.x,y:p.y}:{};if(modern)check(onLand(p,footprint('plot')));
   if(p.crop===null){check(p.plantedAt===0&&p.readyAt===0);return{id,...pos,crop:null,plantedAt:0,readyAt:0};}
   check(id<unlocked(clean)&&Object.hasOwn(CROPS,p.crop)&&integer(p.plantedAt,1,s.lastSeen)&&p.readyAt===p.plantedAt+CROPS[p.crop].minutes*MINUTE-(p.wateredAt?Math.min(CROPS[p.crop].minutes*MINUTE*.1,p.plantedAt+CROPS[p.crop].minutes*MINUTE-p.wateredAt):0)&&p.readyAt<=MAX_TIME);
   if(p.wateredAt)check(save.version>=9&&integer(p.wateredAt,p.plantedAt,Math.min(s.lastSeen,p.plantedAt+CROPS[p.crop].minutes*MINUTE-1)));return{id,...pos,crop:p.crop,plantedAt:p.plantedAt,readyAt:p.readyAt,...(p.wateredAt?{wateredAt:p.wateredAt}:{})};
  });
  check(Array.isArray(s.log)&&s.log.length<=8);
  clean.log=s.log.map(e=>{check(object(e)&&integer(e.at,1,s.lastSeen)&&typeof e.text==='string'&&e.text.length<=180);return{at:e.at,text:e.text};});
  if(modern){for(const p of clean.plots.slice(0,unlocked(clean)))check(placement(clean,'plot',p,0,{ignorePlots:[p.id],props:false}).ok);for(const b of clean.buildings)check(placement(clean,b.kind,b,b.rotation,{ignoreBuilding:b.slot,props:false}).ok);}
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
   if(!this.s.progress){this.s.progress=freshProgress();if(save){const p=this.s.progress;p.xp=this.s.stats.harvested*2;p.grandfatheredCrops=keys.filter(k=>this.s.seeds[k]||this.s.produce[k]||this.s.plots.some(v=>v.crop===k));p.grandfatheredBuildings=[...new Set(this.s.buildings.map(b=>b.kind))];p.tutorial.planted=this.s.stats.harvested?1:this.s.plots.some(v=>v.crop)?1:0;p.tutorial.harvested=this.s.stats.harvested;p.tutorial.sold=this.s.stats.earned?3:0;}}
   if(!this.s.production)this.s.production=freshProduction();
   if(!this.s.challenges)this.s.challenges=freshChallenges(this.s.lastSeen);
   if(!this.s.livestock)this.s.livestock=freshLivestock();
   if(!this.s.social)this.s.social=freshSocial();
   if(!this.s.regions)this.s.regions=[];
   if(!this.s.community)this.s.community=freshCommunity(this.s.lastSeen);
   if(!this.s.fishing)this.s.fishing=freshFishing();
   this.allocatedPlots=Math.min(this.s.plots.length,unlocked(this.s));
   if(!save){this.s.seeds.carrot=6;this.note(harvestT_farm_engine_js('Selamat datang! 6 bibit wortel untuk panen pertamamu.'));}
  }
  now(){this.s.lastSeen=Math.max(this.s.lastSeen,this.clock());for(const b of this.s.buildings){b.level||=1;b.upgrade??=null;if(b.upgrade?.readyAt<=this.s.lastSeen){b.level=b.upgrade.targetLevel;b.upgrade=null;}}this.ensurePlots();const c=this.s.challenges,day=farmDay(this.s.lastSeen);if(c&&c.day!==day){c.day=day;c.counts={planted:0,harvested:0,orders:0};c.claimed=[];}if(this.s.community&&this.s.community.day!==day){this.s.community.day=day;this.s.community.helped=[];this.s.community.gifts=[];}return this.s.lastSeen;}
  ensurePlots(){const count=unlocked(this.s),start=this.allocatedPlots;this.allocatedPlots=count;for(let id=start;id<count;id++){
   const p=this.s.plots[id],ignorePlots=Array.from({length:MAX_PLOTS-id},(_,i)=>id+i);
   if(p&&placement(this.s,'plot',p,0,{ignorePlots}).ok)continue;
   let pos=null;for(let y=670;y<=1720&&!pos;y+=74)for(let x=1040;x<=2150;x+=68){if(placement(this.s,'plot',{x,y},0,{ignorePlots}).ok){pos={x,y};break;}}
   if(!pos)break;if(p)Object.assign(p,pos);else this.s.plots.push({id,...pos,crop:null,plantedAt:0,readyAt:0});
  }}
  get capacity(){return capacity(this.s,this.now());}
  get unlocked(){this.now();return Math.min(this.s.plots.length,unlocked(this.s));}
  get used(){return used(this.s);}
  note(text){this.s.log.unshift({at:this.now(),text});this.s.log=this.s.log.slice(0,8);}
  serialize(){this.now();return JSON.stringify({version:10,state:this.s});}
  buildingLevel(b){return buildingLevel(b,this.now());}
  queueCapacity(b){return queueCapacity(b,this.now());}
  animalCapacity(b){const a=Object.values(ANIMALS).find(v=>v.building===b.kind);return a?a.capacity+2*(this.buildingLevel(b)-1):0;}
  upgradeQuote(slot){const now=this.now(),b=this.s.buildings.find(v=>v.slot===slot);if(!b||!UPGRADE_KINDS.includes(b.kind))return{ok:false,message:harvestT_farm_engine_js('Bangunan ini tidak memiliki upgrade.')};if(b.readyAt>now||b.upgrade)return{ok:false,message:harvestT_farm_engine_js('Tunggu pekerjaan bangunan selesai.')};if(b.kind==='pier'&&this.s.fishing.cast?.slot===slot&&fishingStage(this.s.fishing.cast,now)!=='escaped')return{ok:false,message:fishingText('Finish or cancel fishing before upgrading this pier.','Selesaikan atau batalkan pancingan sebelum upgrade dermaga ini.')};const target=(b.level||1)+1;if(target>5)return{ok:false,message:harvestT_farm_engine_js('Bangunan sudah level maksimum.')};const required=Math.max(BUILDING_LEVEL[b.kind],(target-1)*3),{cost,coins}=upgradeCost(b.kind,target),seconds=upgradeDuration(b.kind,target)/1000;return{ok:this.level>=required&&this.s.coins>=coins&&Object.entries(cost).every(([k,n])=>this.s.materials[k]>=n),target,required,cost,coins,seconds,message:harvestT_farm_engine_js('Siapkan level, koin, dan bahan untuk upgrade.')};}
  upgradeBuilding(slot){const q=this.upgradeQuote(slot);if(!q.ok)return q;const b=this.s.buildings.find(v=>v.slot===slot),now=this.now();for(const[k,n]of Object.entries(q.cost))this.s.materials[k]-=n;this.s.coins-=q.coins;b.level||=1;b.upgrade={startedAt:now,readyAt:now+q.seconds*1000,targetLevel:q.target};this.note(harvestT_farm_engine_js('Upgrade dimulai. Manfaat lama tetap aktif sampai selesai.'));return{ok:true,target:q.target,readyAt:b.upgrade.readyAt};}
  get level(){return levelFor(this.s.progress.xp);}
  cropUnlocked(k){return Object.hasOwn(CROPS,k)&&(this.level>=CROP_LEVEL[k]||this.s.progress.grandfatheredCrops.includes(k));}
  buildingUnlocked(k){return Object.hasOwn(BUILDINGS,k)&&(k==='planter'?this.s.challenges.achievements.includes('harvester'):this.level>=BUILDING_LEVEL[k]||this.s.progress.grandfatheredBuildings.includes(k));}
  addXP(amount){this.s.progress.xp=Math.min(1e12,this.s.progress.xp+amount);}
  tutorialStep(){const t=this.s.progress.tutorial;return !t.planted?0:t.harvested<3?1:t.sold<3?2:!this.s.buildings.some(b=>b.kind==='barn'&&b.readyAt<=this.now())?3:4;}
  tutorialDismiss(dismissed){if(typeof dismissed!=='boolean')return{ok:false,message:harvestT_farm_engine_js('Pilihan panduan tidak valid.')};this.s.progress.tutorial.dismissed=dismissed;return{ok:true};}
  orders(){return this.s.progress.orders.offers.map((n,slot)=>{const t=ORDER_TEMPLATES[n],base=Object.entries(t.items).reduce((sum,[k,qty])=>sum+CROPS[k].sell*qty,0);return{...t,name:[harvestT_farm_engine_js('Bu Sari'),harvestT_farm_engine_js('Pak Bima'),'Maya'][slot],slot,id:slot+':'+this.s.progress.orders.rounds[slot]+':'+n,reward:Math.ceil(base*1.25),xp:8+t.level*4,ready:this.level>=t.level&&Object.entries(t.items).every(([k,qty])=>this.s.produce[k]>=qty)};});}
  deliverOrder(id){this.now();const order=this.orders().find(o=>o.id===id);if(!order||!order.ready)return{ok:false,message:harvestT_farm_engine_js('Pesanan sudah berganti atau hasil panen belum cukup.')};if(this.s.coins+order.reward>1e9)return{ok:false,message:harvestT_farm_engine_js('Kapasitas koin sudah penuh.')};for(const[k,qty]of Object.entries(order.items))this.s.produce[k]-=qty;this.s.coins+=order.reward;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+order.reward);this.s.progress.tutorial.sold=Math.min(1e9,this.s.progress.tutorial.sold+(order.items.carrot||0));this.addXP(order.xp);this.countDaily('orders',1);const o=this.s.progress.orders;o.completed++;o.rounds[order.slot]++;const eligible=ORDER_TEMPLATES.map((t,i)=>({t,i})).filter(v=>v.t.level<=this.level);o.offers[order.slot]=eligible[(o.rounds[order.slot]+order.slot)%eligible.length].i;this.note((harvestT_farm_engine_js("Pesanan ")+(order.name)+harvestT_farm_engine_js(" selesai · +")+(order.reward)+harvestT_farm_engine_js(" koin · +")+(order.xp)+harvestT_farm_engine_js(" XP.")));return{ok:true,earned:order.reward,xp:order.xp};}
  fishingStarter(){const f=this.s.fishing;if(this.level<FISHING_LEVEL)return{ok:false,message:fishingText('Fishing unlocks at level 3.','Memancing terbuka di level 3.')};if(f.starter)return{ok:false,message:fishingText('Your starter bait has already been claimed.','Umpan awal sudah diambil.')};if(f.bait.worm>997)return{ok:false,message:fishingText('Use some bait first.','Gunakan sebagian umpan dahulu.')};f.starter=true;f.bait.worm+=3;return{ok:true};}
  buyBait(key,qty){if(this.level<FISHING_LEVEL||!Object.hasOwn(BAITS,key)||!integer(qty,1,100))return{ok:false,message:fishingText('This bait is not available.','Umpan belum tersedia.')};const f=this.s.fishing,cost=BAITS[key].price*qty;if(f.bait[key]+qty>1000||this.s.coins<cost)return{ok:false,message:fishingText('Not enough coins or bait storage is full.','Koin belum cukup atau penyimpanan umpan penuh.')};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-cost<5)return{ok:false,message:fishingText('Keep 5 coins for carrot seeds.','Sisakan 5 koin untuk bibit wortel.')};this.s.coins-=cost;f.bait[key]+=qty;return{ok:true};}
  upgradeRod(){const f=this.s.fishing,target=f.rod+1,coins=target===2?120:300,wood=target===2?10:20,stone=target===2?0:10,level=target===2?5:7;if(target>3||this.level<level||this.s.coins<coins||this.s.materials.wood<wood||this.s.materials.stone<stone||f.cast)return{ok:false,message:fishingText('Finish fishing and prepare the required level, coins and materials.','Selesaikan memancing dan siapkan level, koin, serta bahan.')};this.s.coins-=coins;this.s.materials.wood-=wood;this.s.materials.stone-=stone;f.rod=target;return{ok:true,rod:target};}
  startFishing(slot,bait,seed){const now=this.now(),f=this.s.fishing,b=this.s.buildings.find(b=>b.slot===slot);if(this.level<FISHING_LEVEL||b?.kind!=='pier'||b.readyAt>now||b.upgrade||!Object.hasOwn(BAITS,bait)||!integer(seed,0,4294967295))return{ok:false,message:fishingText('Choose a completed fishing pier.','Pilih dermaga yang sudah selesai.')};if(f.cast&&fishingStage(f.cast,now)!=='escaped')return{ok:false,message:fishingText('Finish or cancel your current cast.','Selesaikan atau batalkan pancingan yang aktif.')};if(!f.bait[bait])return{ok:false,message:fishingText('Buy bait before casting.','Beli umpan sebelum melempar pancing.')};if(this.used>=this.capacity||f.nextId>=1e9||f.caught>=1e9)return{ok:false,message:fishingText('Make room in your bag before fishing.','Kosongkan ruang tas sebelum memancing.')};const biteAt=fishingBite(now,seed);if(biteAt+20000>MAX_TIME)return{ok:false,message:'Fishing is not available.'};f.bait[bait]--;f.cast={id:f.nextId++,slot,startedAt:now,bait,seed,rod:f.rod,conditions:fishingConditions(now),biteAt,expiresAt:biteAt+7000,hookedAt:0,reels:0};return{ok:true,id:f.cast.id};}
  hookFish(id){const now=this.now(),f=this.s.fishing,c=f.cast;if(!c||c.id!==id)return{ok:false,message:fishingText('This cast has already ended.','Pancingan sudah selesai.')};if(fishingStage(c,now)==='escaped'){f.cast=null;return{ok:true,escaped:true};}if(fishingStage(c,now)!=='bite')return{ok:false,message:fishingText('Wait for the bobber to dip.','Tunggu pelampung tenggelam.')};c.hookedAt=now;c.expiresAt=now+10600;return{ok:true};}
  reelFish(id){const now=this.now(),f=this.s.fishing,c=f.cast;if(!c||c.id!==id)return{ok:false,message:fishingText('This cast has already ended.','Pancingan sudah selesai.')};const stage=fishingStage(c,now);if(stage==='escaped'){f.cast=null;return{ok:true,escaped:true};}if(stage!=='pull'&&stage!=='landed')return{ok:false,message:fishingText('Reel when the marker reaches the green zone.','Gulung saat penanda masuk zona hijau.')};if(c.reels<3)c.reels++;if(c.reels<3)return{ok:true,reels:c.reels};const pier=this.s.buildings.find(b=>b.slot===c.slot),pierLevel=buildingLevel(pier,now),catchInfo=fishingOutcome(c.seed,c.bait,c.rod,c.conditions,pierLevel),xp=FISH[catchInfo.kind].xp+pierFishingBonus(pierLevel).xp;if(this.used+1>this.capacity||f.fish[catchInfo.kind]>=10000)return{ok:true,landed:true,full:true};f.fish[catchInfo.kind]++;f.caught++;f.best=Math.max(f.best,catchInfo.length);f.records.unshift({...catchInfo,at:now});f.records=f.records.slice(0,8);f.cast=null;this.addXP(xp);this.note(fishingText('Caught ','Menangkap ')+fishingText(FISH[catchInfo.kind].name,FISH[catchInfo.kind].idName)+' · '+catchInfo.length+' cm');return{ok:true,caught:catchInfo,xp};}
  cancelFishing(id){const c=this.s.fishing.cast;if(!c||c.id!==id)return{ok:false,message:fishingText('This cast has already ended.','Pancingan sudah selesai.')};this.s.fishing.cast=null;return{ok:true};}
  sellFish(kind,qty){const f=this.s.fishing;if(!Object.hasOwn(FISH,kind)||!integer(qty,1,10000)||f.fish[kind]<qty)return{ok:false,message:fishingText('Fish are not available in your bag.','Ikan belum tersedia di tas.')};const earned=FISH[kind].sell*qty;if(this.s.coins+earned>1e9)return{ok:false,message:fishingText('Coin storage is full.','Penyimpanan koin penuh.')};f.fish[kind]-=qty;this.s.coins+=earned;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+earned);return{ok:true,earned};}

  buySeed(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,100))return{ok:false,message:harvestT_farm_engine_js('Jumlah bibit tidak valid.')};
   if(!this.cropUnlocked(crop))return{ok:false,message:(harvestT_farm_engine_js("")+(CROPS[crop].name)+harvestT_farm_engine_js(" terbuka di level ")+(CROP_LEVEL[crop])+harvestT_farm_engine_js("."))};
   const cost=CROPS[crop].price*qty;
   if(this.s.coins<cost)return{ok:false,message:harvestT_farm_engine_js('Koin belum cukup. Panen dan jual hasil kebunmu.')};
   if(this.s.seeds[crop]+qty>1000)return{ok:false,message:harvestT_farm_engine_js('Maksimal 1.000 bibit per tanaman.')};
   this.s.coins-=cost;this.s.seeds[crop]+=qty;this.note((harvestT_farm_engine_js("Membeli ")+(qty)+harvestT_farm_engine_js(" bibit ")+(CROPS[crop].name.toLowerCase())+harvestT_farm_engine_js(".")));return{ok:true};
  }
  plant(id,crop){
   const p=this.s.plots[id];
   if(!integer(id,0,MAX_PLOTS-1)||id>=this.unlocked||!p||p.crop||!Object.hasOwn(CROPS,crop))return{ok:false,message:harvestT_farm_engine_js('Pilih petak kosong yang sudah terbuka.')};
   if(!this.s.seeds[crop])return{ok:false,message:harvestT_farm_engine_js('Bibit habis. Beli bibit ini di toko.')};
   this.s.seeds[crop]--;p.crop=crop;p.plantedAt=this.now();p.readyAt=p.plantedAt+CROPS[crop].minutes*MINUTE;
   this.s.progress.tutorial.planted=Math.min(1e9,this.s.progress.tutorial.planted+1);
   this.countDaily('planted',1);
   this.note((harvestT_farm_engine_js("Menanam ")+(CROPS[crop].name.toLowerCase())+harvestT_farm_engine_js(" di petak ")+(id+1)+harvestT_farm_engine_js(".")));return{ok:true};
  }
  harvest(id){
   const p=this.s.plots[id];if(!integer(id,0,MAX_PLOTS-1)||!p?.crop)return{ok:false,message:harvestT_farm_engine_js('Belum ada tanaman di petak ini.')};
   if(this.now()<p.readyAt)return{ok:false,message:harvestT_farm_engine_js('Tanaman masih tumbuh. Tunggu sampai siap dipanen.')};
   const crop=CROPS[p.crop];
   if(this.used+crop.yield>this.capacity)return{ok:false,message:harvestT_farm_engine_js('Penyimpanan penuh. Jual hasil panen atau bangun lumbung.')};
   this.s.produce[p.crop]+=crop.yield;this.s.stats.harvested=Math.min(1e9,this.s.stats.harvested+crop.yield);this.addXP(crop.yield*2);this.s.progress.tutorial.harvested=Math.min(1e9,this.s.progress.tutorial.harvested+crop.yield);this.countDaily('harvested',crop.yield);this.note((harvestT_farm_engine_js("Memanen ")+(crop.yield)+harvestT_farm_engine_js(" ")+(crop.name.toLowerCase())+harvestT_farm_engine_js(" · +")+(crop.yield*2)+harvestT_farm_engine_js(" XP.")));p.crop=null;p.plantedAt=0;p.readyAt=0;delete p.wateredAt;return{ok:true,xp:crop.yield*2};
  }
  sell(crop,qty=1){
   if(!Object.hasOwn(CROPS,crop)||!integer(qty,1,10000)||this.s.produce[crop]<qty)return{ok:false,message:harvestT_farm_engine_js('Hasil panen belum tersedia.')};
   const earned=CROPS[crop].sell*qty;
   if(this.s.coins+earned>1e9)return{ok:false,message:harvestT_farm_engine_js('Kapasitas koin sudah penuh.')};
   if(crop==='carrot')this.s.progress.tutorial.sold=Math.min(1e9,this.s.progress.tutorial.sold+qty);
   this.s.produce[crop]-=qty;this.s.coins+=earned;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+earned);this.note((harvestT_farm_engine_js("Menjual ")+(qty)+harvestT_farm_engine_js(" ")+(CROPS[crop].name.toLowerCase())+harvestT_farm_engine_js(" · +")+(earned)+harvestT_farm_engine_js(" koin.")));return{ok:true,earned};
  }
  buyMaterial(material,qty=1){
   if(!Object.hasOwn(MATERIALS,material)||!integer(qty,1,100))return{ok:false,message:harvestT_farm_engine_js('Jumlah bahan tidak valid.')};
   const cost=MATERIALS[material].price*qty;
   if(this.s.coins<cost)return{ok:false,message:harvestT_farm_engine_js('Koin belum cukup untuk membeli bahan.')};
   const futureHarvest=this.used>0||keys.some(k=>this.s.seeds[k]>0)||this.s.plots.some(p=>p.crop!==null);
   if(!futureHarvest&&this.s.coins-cost<5)return{ok:false,message:harvestT_farm_engine_js('Sisakan 5 koin untuk membeli bibit wortel agar kebun bisa terus berjalan.')};
   if(this.s.materials[material]+qty>10000)return{ok:false,message:harvestT_farm_engine_js('Penyimpanan bahan sudah penuh.')};
   this.s.coins-=cost;this.s.materials[material]+=qty;this.note((harvestT_farm_engine_js("Membeli ")+(qty)+harvestT_farm_engine_js(" ")+(MATERIALS[material].name.toLowerCase())+harvestT_farm_engine_js(".")));return{ok:true};
  }
  canBuild(kind){return this.buildingUnlocked(kind)&&materialKeys.every(k=>this.s.materials[k]>=BUILDINGS[kind].cost[k]);}
  buildKitQuote(kind){if(!Object.hasOwn(BUILDINGS,kind))return{cost:0,missing:{}};const missing=Object.fromEntries(materialKeys.map(k=>[k,Math.max(0,BUILDINGS[kind].cost[k]-this.s.materials[k])]));return{missing,cost:materialKeys.reduce((sum,k)=>sum+missing[k]*MATERIALS[k].price,0)};}
  buyBuildKit(kind){if(!Object.hasOwn(BUILDINGS,kind))return{ok:false,message:harvestT_farm_engine_js('Bangunan tidak tersedia.')};const q=this.buildKitQuote(kind);if(!q.cost)return{ok:false,message:harvestT_farm_engine_js('Bahan bangunan sudah lengkap.')};if(this.s.coins<q.cost)return{ok:false,message:harvestT_farm_engine_js('Koin belum cukup untuk paket bahan.')};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-q.cost<5)return{ok:false,message:harvestT_farm_engine_js('Sisakan 5 koin untuk membeli bibit wortel.')};this.s.coins-=q.cost;for(const k of materialKeys)this.s.materials[k]+=q.missing[k];this.note((harvestT_farm_engine_js("Melengkapi bahan ")+(BUILDINGS[kind].name.toLowerCase())+harvestT_farm_engine_js(" · ")+(q.cost)+harvestT_farm_engine_js(" koin.")));return{ok:true};}
  build(kind,point,rotation=0){
   if(!Object.hasOwn(BUILDINGS,kind)||this.s.buildings.length>=MAX_BUILDINGS)return{ok:false,message:harvestT_farm_engine_js('Maksimal 24 bangunan di kebun.')};
   if(!this.buildingUnlocked(kind))return{ok:false,message:(harvestT_farm_engine_js("")+(BUILDINGS[kind].name)+harvestT_farm_engine_js(" terbuka di level ")+(BUILDING_LEVEL[kind])+harvestT_farm_engine_js("."))};
   const legacy=typeof point==='number';let slot=legacy?point:Array.from({length:MAX_BUILDINGS},(_,i)=>i).find(i=>!this.s.buildings.some(b=>b.slot===i));
   if(legacy){if(!integer(point,0,7)||this.s.buildings.some(b=>b.slot===point))return{ok:false,message:harvestT_farm_engine_js('Tapak ini sudah terisi.')};point=LOTS[point];}
   const valid=placement(this.s,kind,point||{},rotation,{props:!legacy});if(!valid.ok)return valid;
   if(!this.canBuild(kind))return{ok:false,message:harvestT_farm_engine_js('Bahan belum cukup. Beli bahan pembangunan di toko.')};
   for(const k of materialKeys)this.s.materials[k]-=BUILDINGS[kind].cost[k];
   if(kind!=='planter')this.addXP(10);
   const startedAt=this.now();this.s.buildings.push({kind,slot,x:point.x,y:point.y,rotation,level:1,upgrade:null,startedAt,readyAt:startedAt+BUILDINGS[kind].seconds*1000});this.note((harvestT_farm_engine_js("Mulai membangun ")+(BUILDINGS[kind].name.toLowerCase())+harvestT_farm_engine_js(".")));return{ok:true};
  }
  moveBuilding(slot,point,rotation=0){const b=this.s.buildings.find(b=>b.slot===slot);if(!b)return{ok:false,message:harvestT_farm_engine_js('Pilih bangunan yang ingin dipindahkan.')};if(b.kind==='pier'&&this.s.fishing.cast?.slot===slot&&fishingStage(this.s.fishing.cast,this.now())!=='escaped')return{ok:false,message:fishingText('Finish fishing before moving the pier.','Selesaikan memancing sebelum memindahkan dermaga.')};const valid=placement(this.s,b.kind,point,rotation,{ignoreBuilding:slot});if(!valid.ok)return valid;Object.assign(b,{x:point.x,y:point.y,rotation});this.note((harvestT_farm_engine_js("Memindahkan ")+(BUILDINGS[b.kind].name.toLowerCase())+harvestT_farm_engine_js(".")));return{ok:true};}
  buildingSaleQuote(slot){
   const now=this.now(),b=this.s.buildings.find(v=>v.slot===slot);
   if(!b)return{ok:false,message:harvestT_farm_engine_js('Bangunan ini sudah tidak tersedia.')};
   // Base construction consumes materials only. Kit coins purchased those same
   // materials, so they must not be refunded a second time as construction coins.
   const cost={...BUILDINGS[b.kind].cost};let coins=0;
   for(let target=2;target<=b.level;target++){const paid=upgradeCost(b.kind,target);coins+=paid.coins;for(const k of materialKeys)cost[k]+=paid.cost[k];}
   const refund={coins:Math.floor(coins/2),materials:Object.fromEntries(materialKeys.map(k=>[k,Math.floor(cost[k]/2)]))};
   const remaining={...this.s,buildings:this.s.buildings.filter(v=>v!==b)},nextCapacity=capacity(remaining,now),nextPlots=Math.min(this.s.plots.length,unlocked(remaining,now));
   const quote={slot:b.slot,kind:b.kind,startedAt:b.startedAt,level:b.level,refund,nextCapacity,nextPlots,lostStorage:capacity(this.s,now)-nextCapacity,lostPlots:this.unlocked-nextPlots};
   const deny=message=>({...quote,ok:false,message:harvestT_farm_engine_js(message)});
   if(b.kind==='pier'&&this.s.fishing.cast?.slot===slot)return{...quote,ok:false,message:fishingText('Finish or cancel fishing before selling the pier.','Selesaikan atau batalkan memancing sebelum menjual dermaga.')};
   if(b.readyAt>now||b.upgrade)return deny('Tunggu pembangunan atau upgrade selesai sebelum menjual.');
   if(this.s.production.jobs.some(j=>j.slot===slot))return deny('Ambil semua olahan dan selesaikan antrean bangunan ini sebelum menjual.');
   if(this.s.livestock.animals.some(a=>a.slot===slot))return deny('Bangunan ini masih menampung ternak dan belum bisa dijual.');
   if(this.used>nextCapacity)return deny('Jual hasil panen atau tambah penyimpanan lain terlebih dahulu.');
   if(this.s.plots.slice(nextPlots,this.unlocked).some(p=>p.crop))return deny('Panen petak yang akan ditutup terlebih dahulu sebelum menjual bangunan ini.');
   if(this.s.coins+refund.coins>1e9||materialKeys.some(k=>this.s.materials[k]+refund.materials[k]>10000))return deny('Sisakan ruang untuk koin dan bahan pengembalian terlebih dahulu.');
   return{...quote,ok:true};
  }
  sellBuilding(slot,identity){
   const q=this.buildingSaleQuote(slot);
   if(identity&&(q.kind!==identity.kind||q.startedAt!==identity.startedAt))return{ok:false,message:harvestT_farm_engine_js('Bangunan telah berubah. Buka kembali rincian penjualannya.')};
   if(!q.ok)return q;
   this.s.buildings=this.s.buildings.filter(b=>b.slot!==slot);this.s.coins+=q.refund.coins;
   for(const k of materialKeys)this.s.materials[k]+=q.refund.materials[k];
   this.note(harvestT_farm_engine_js('Bangunan dijual dengan pengembalian 50%.'));
   return{ok:true,slot,refund:q.refund};
  }
  movePlot(id,point){const p=this.s.plots[id];if(!p||id>=this.unlocked)return{ok:false,message:harvestT_farm_engine_js('Petak tidak tersedia.')};const valid=placement(this.s,'plot',point,0,{ignorePlots:[id]});if(!valid.ok)return valid;Object.assign(p,{x:point.x,y:point.y});this.note((harvestT_farm_engine_js("Memindahkan petak ")+(id+1)+harvestT_farm_engine_js(". Tanaman tetap tumbuh.")));return{ok:true};}
  regionQuote(key){this.now();const r=REGIONS[key];if(!r||this.s.regions.includes(key))return{ok:false,message:harvestT_farm_engine_js('Kawasan ini sudah dibuka.')};const space=this.gardenQuote(r.count);return{...r,ok:space.ok&&this.level>=r.level&&this.s.coins>=r.coins,message:space.ok?harvestT_farm_engine_js('Siapkan level dan koin untuk membuka kawasan.'):space.message};}
  unlockRegion(key,point,rotation=0){const q=this.regionQuote(key);if(!q.ok)return q;const before=this.s.coins,result=this.expandGarden(point,q.count,rotation);if(!result.ok)return result;this.s.coins=before-q.coins;this.s.regions.push(key);this.note(q.name+harvestT_farm_engine_js(' dibuka · 6 petak baru.'));return{ok:true,region:key};}
  gardenQuote(count=6){if(![1,3,6].includes(count)||this.unlocked+count>MAX_PLOTS)return{ok:false,message:harvestT_farm_engine_js('Maksimal 81 petak di kebun.')};return{ok:true,cost:count*20,count};}
  gardenPoints(point,count=6,rotation=0){return Array.from({length:count},(_,i)=>{const dx=((i%3)-(Math.min(count,3)-1)/2)*68,dy=(Math.floor(i/3)-(Math.ceil(count/3)-1)/2)*74;return{x:Math.round(point.x+(rotation%2?dy:dx)),y:Math.round(point.y+(rotation%2?dx:dy))};});}
  gardenPlacement(point,count=6,rotation=0){const quote=this.gardenQuote(count);if(!quote.ok)return quote;const ids=Array.from({length:count},(_,i)=>this.unlocked+i);for(const p of this.gardenPoints(point,count,rotation)){const valid=placement(this.s,'plot',p,0,{ignorePlots:ids});if(!valid.ok)return valid;}return{ok:true};}
  expandGarden(point,count=6,rotation=0){const valid=this.gardenPlacement(point,count,rotation);if(!valid.ok)return valid;const quote=this.gardenQuote(count);if(this.s.coins<quote.cost)return{ok:false,message:(harvestT_farm_engine_js("Perlu ")+(quote.cost)+harvestT_farm_engine_js(" koin untuk ")+(count)+harvestT_farm_engine_js(" petak baru."))};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-quote.cost<5)return{ok:false,message:harvestT_farm_engine_js('Sisakan 5 koin untuk membeli bibit wortel.')};const start=this.unlocked,points=this.gardenPoints(point,count,rotation);this.s.coins-=quote.cost;this.s.expansions+=count;for(let i=0;i<count;i++){const id=start+i;this.s.plots[id]={id,...points[i],crop:null,plantedAt:0,readyAt:0};}this.note((harvestT_farm_engine_js("Membuka ")+(count)+harvestT_farm_engine_js(" petak baru · ")+(quote.cost)+harvestT_farm_engine_js(" koin.")));return{ok:true};}
  checkPlacement(kind,point,rotation=0,ignore={}){return placement(this.s,kind,point,rotation,ignore);}
  countDaily(counter,amount){const c=this.s.challenges;c.counts[counter]=Math.min(1e9,c.counts[counter]+amount);}
  daily(){this.now();const c=this.s.challenges;return Object.entries(DAILY).map(([key,m])=>({...m,key,id:c.day+':'+key,progress:Math.min(m.target,c.counts[m.counter]),claimed:c.claimed.includes(key),ready:c.counts[m.counter]>=m.target&&!c.claimed.includes(key)}));}
  dailyDeadline(){return(this.s.challenges.day+1)*86400000-7*3600000;}
  achievements(){const now=this.now(),values={harvester:this.s.stats.harvested,trader:this.s.stats.earned,builder:this.s.buildings.filter(b=>b.readyAt<=now&&b.kind!=='planter').length,artisan:this.s.challenges.totals.crafted,diligent:this.s.challenges.totals.dailies};return Object.entries(ACHIEVEMENTS).map(([key,a])=>({...a,key,progress:Math.min(a.target,values[key]),claimed:this.s.challenges.achievements.includes(key),ready:values[key]>=a.target&&!this.s.challenges.achievements.includes(key)}));}
  claimDaily(id){const mission=this.daily().find(m=>m.id===id);if(!mission?.ready)return{ok:false,message:harvestT_farm_engine_js('Misi belum selesai, sudah diklaim, atau harinya telah berganti.')};if(this.s.seeds.carrot+mission.seeds>1000)return{ok:false,message:harvestT_farm_engine_js('Gunakan sebagian bibit wortel sebelum mengambil hadiah.')};this.s.seeds.carrot+=mission.seeds;this.addXP(mission.xp);this.s.challenges.claimed.push(mission.key);this.s.challenges.totals.dailies=Math.min(1e9,this.s.challenges.totals.dailies+1);this.note((harvestT_farm_engine_js("Misi ")+(mission.name)+harvestT_farm_engine_js(" · +")+(mission.seeds)+harvestT_farm_engine_js(" bibit wortel · +")+(mission.xp)+harvestT_farm_engine_js(" XP.")));return{ok:true,seeds:mission.seeds,xp:mission.xp};}
  claimAchievement(key){const a=this.achievements().find(a=>a.key===key);if(!a?.ready)return{ok:false,message:harvestT_farm_engine_js('Pencapaian belum selesai atau hadiahnya sudah diambil.')};if(this.s.seeds.carrot+a.seeds>1000)return{ok:false,message:harvestT_farm_engine_js('Gunakan sebagian bibit wortel sebelum mengambil hadiah.')};this.s.seeds.carrot+=a.seeds;this.addXP(a.xp);this.s.challenges.achievements.push(key);this.note((harvestT_farm_engine_js("Pencapaian ")+(a.name)+harvestT_farm_engine_js(" · +")+(a.seeds)+harvestT_farm_engine_js(" bibit · +")+(a.xp)+harvestT_farm_engine_js(" XP.")));return{ok:true,seeds:a.seeds,xp:a.xp,decoration:key==='harvester'?'planter':null};}
  productionQuote(slot,key){const now=this.now(),r=RECIPES[key],b=this.s.buildings.find(b=>b.slot===slot);if(!Object.hasOwn(RECIPES,key)||!b||b.kind!==r.building)return{ok:false,message:harvestT_farm_engine_js('Pilih bangunan yang sesuai untuk resep ini.')};if(b.readyAt>now)return{ok:false,message:harvestT_farm_engine_js('Bangunan masih dalam proses pembangunan.')};if(this.buildingLevel(b)<(r.buildingLevel||1))return{ok:false,message:harvestT_farm_engine_js('Upgrade bangunan untuk membuka resep ini.')};if(this.level<r.level)return{ok:false,message:(harvestT_farm_engine_js("Resep terbuka di level ")+(r.level)+harvestT_farm_engine_js("."))};const jobs=this.s.production.jobs.filter(j=>j.slot===slot);if(jobs.length>=this.queueCapacity(b))return{ok:false,message:harvestT_farm_engine_js('Antrean penuh. Ambil olahan yang sudah selesai.')};if(!Object.entries(r.inputs).every(([crop,n])=>this.s.produce[crop]>=n))return{ok:false,message:harvestT_farm_engine_js('Bahan panen belum cukup untuk resep ini.')};return{ok:true,startedAt:Math.max(now,...jobs.map(j=>j.readyAt)),recipe:r};}
  startProduction(slot,key){const q=this.productionQuote(slot,key),p=this.s.production;if(!q.ok)return q;const readyAt=q.startedAt+q.recipe.minutes*MINUTE;if(readyAt>MAX_TIME||p.nextId>=1e9)return{ok:false,message:harvestT_farm_engine_js('Antrean produksi tidak bisa ditambah.')};for(const[crop,n]of Object.entries(q.recipe.inputs))this.s.produce[crop]-=n;const id=p.nextId++;p.jobs.push({id,slot,recipe:key,startedAt:q.startedAt,readyAt});this.note((harvestT_farm_engine_js("Mengolah ")+(q.recipe.name.toLowerCase())+harvestT_farm_engine_js(". Bahan masuk ke antrean.")));return{ok:true,id,readyAt};}
  collectProduction(id){const now=this.now(),p=this.s.production,j=p.jobs.find(j=>j.id===id);if(!j||j.readyAt>now)return{ok:false,message:harvestT_farm_engine_js('Olahan belum selesai atau sudah diambil.')};const r=RECIPES[j.recipe];if(this.used+r.yield>this.capacity||p.goods[j.recipe]+r.yield>10000)return{ok:false,message:harvestT_farm_engine_js('Tas penuh. Jual panen atau olahan sebelum mengambil hasil.')};p.goods[j.recipe]+=r.yield;p.jobs=p.jobs.filter(job=>job.id!==id);this.s.challenges.totals.crafted=Math.min(1e9,this.s.challenges.totals.crafted+r.yield);this.addXP(r.xp);this.note((harvestT_farm_engine_js("Mengambil ")+(r.name.toLowerCase())+harvestT_farm_engine_js(" · +")+(r.xp)+harvestT_farm_engine_js(" XP.")));return{ok:true,xp:r.xp};}
  sellGoods(key,qty=1){const p=this.s.production;if(!Object.hasOwn(RECIPES,key)||!integer(qty,1,10000)||p.goods[key]<qty)return{ok:false,message:harvestT_farm_engine_js('Olahan belum tersedia di tas.')};const earned=RECIPES[key].sell*qty;if(this.s.coins+earned>1e9)return{ok:false,message:harvestT_farm_engine_js('Kapasitas koin sudah penuh.')};p.goods[key]-=qty;this.s.coins+=earned;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+earned);this.note((harvestT_farm_engine_js("Menjual ")+(qty)+harvestT_farm_engine_js(" ")+(RECIPES[key].name.toLowerCase())+harvestT_farm_engine_js(" · +")+(earned)+harvestT_farm_engine_js(" koin.")));return{ok:true,earned};}
  animalQuote(slot,kind,qty=1){if(!integer(qty,1,100))return{ok:false,message:fishingText("Enter a valid quantity.","Isi jumlah yang valid.")};const now=this.now();if(!Object.hasOwn(ANIMALS,kind))return{ok:false,message:harvestT_farm_engine_js('Jenis ternak tidak tersedia.')};const spec=ANIMALS[kind],b=this.s.buildings.find(b=>b.slot===slot);if(!b||b.kind!==spec.building||b.readyAt>now)return{ok:false,message:harvestT_farm_engine_js('Bangun dan selesaikan kandang yang sesuai terlebih dahulu.')};if(this.level<spec.level)return{ok:false,message:harvestT_farm_engine_js('Ternak terbuka di level ')+spec.level+'.'};if(this.s.livestock.animals.filter(a=>a.slot===slot).length+qty>this.animalCapacity(b))return{ok:false,message:harvestT_farm_engine_js('Kandang penuh. Bangun kandang lain.')};if(this.s.coins<spec.price*qty)return{ok:false,message:harvestT_farm_engine_js('Koin belum cukup untuk membeli ternak.')};const future=this.used||keys.some(k=>this.s.seeds[k])||this.s.plots.some(p=>p.crop);if(!future&&this.s.coins-spec.price*qty<5)return{ok:false,message:harvestT_farm_engine_js('Sisakan 5 koin untuk bibit dan pakan berikutnya.')};if(this.s.livestock.nextId+qty>1e9)return{ok:false,message:harvestT_farm_engine_js('Ternak tidak bisa ditambah.')};return{ok:true};}
  buyAnimals(slot,kind,qty){const q=this.animalQuote(slot,kind,qty);if(!q.ok)return q;const ids=[];for(let i=0;i<qty;i++)ids.push(this.buyAnimal(slot,kind).id);return{ok:true,ids};}
  buyAnimal(slot,kind){const q=this.animalQuote(slot,kind);if(!q.ok)return q;const spec=ANIMALS[kind],l=this.s.livestock,id=l.nextId++;this.s.coins-=spec.price;l.animals.push({id,kind,slot,fedAt:0,readyAt:0});this.note(harvestT_farm_engine_js('Membeli ')+spec.name.toLowerCase()+harvestT_farm_engine_js('. Beri pakan untuk memulai produksi.'));return{ok:true,id};}
  feedQuote(id){const now=this.now(),a=this.s.livestock.animals.find(a=>a.id===id);if(!a)return{ok:false,message:harvestT_farm_engine_js('Ternak tidak tersedia.')};if(a.fedAt)return{ok:false,message:a.readyAt<=now?harvestT_farm_engine_js('Ambil hasil ternak sebelum memberi pakan lagi.'):harvestT_farm_engine_js('Ternak masih menghasilkan. Pakan tidak perlu ditambah.')};const spec=ANIMALS[a.kind];if(!Object.entries(spec.feed).every(([crop,n])=>this.s.produce[crop]>=n))return{ok:false,message:harvestT_farm_engine_js('Pakan panen belum cukup. Tanam dan panen bahan pakannya.')};return{ok:true};}
  feedAnimal(id){const q=this.feedQuote(id);if(!q.ok)return q;const a=this.s.livestock.animals.find(a=>a.id===id),spec=ANIMALS[a.kind],now=this.now();if(now+spec.minutes*MINUTE>MAX_TIME)return{ok:false,message:harvestT_farm_engine_js('Produksi ternak tidak dapat dimulai.')};for(const[k,n]of Object.entries(spec.feed))this.s.produce[k]-=n;a.fedAt=now;a.readyAt=now+spec.minutes*MINUTE;this.note(harvestT_farm_engine_js('Memberi pakan ')+spec.name.toLowerCase()+harvestT_farm_engine_js('. Hasil tersedia dalam ')+spec.minutes+harvestT_farm_engine_js(' menit.'));return{ok:true,readyAt:a.readyAt};}
  collectAnimal(id){const a=this.s.livestock.animals.find(a=>a.id===id),now=this.now();if(!a?.fedAt||a.readyAt>now)return{ok:false,message:harvestT_farm_engine_js('Hasil ternak belum siap atau sudah diambil.')};const spec=ANIMALS[a.kind],l=this.s.livestock;if(this.used+spec.yield>this.capacity||l.produce[spec.product]+spec.yield>10000)return{ok:false,message:harvestT_farm_engine_js('Tas penuh. Jual sebagian hasil sebelum mengambil hasil ternak.')};l.produce[spec.product]+=spec.yield;a.fedAt=0;a.readyAt=0;this.addXP(spec.xp);this.note(harvestT_farm_engine_js('Mengambil ')+spec.yield+' '+ANIMAL_PRODUCTS[spec.product].name.toLowerCase()+' · +'+spec.xp+' XP.');return{ok:true,xp:spec.xp};}
  sellAnimalProduct(key,qty){if(!Object.hasOwn(ANIMAL_PRODUCTS,key)||!integer(qty,1,10000)||this.s.livestock.produce[key]<qty)return{ok:false,message:harvestT_farm_engine_js('Hasil ternak belum tersedia.')};const earned=ANIMAL_PRODUCTS[key].sell*qty;if(this.s.coins+earned>1e9)return{ok:false,message:harvestT_farm_engine_js('Kapasitas koin sudah penuh.')};this.s.livestock.produce[key]-=qty;this.s.coins+=earned;this.s.stats.earned=Math.min(1e12,this.s.stats.earned+earned);this.note(harvestT_farm_engine_js('Menjual ')+qty+' '+ANIMAL_PRODUCTS[key].name.toLowerCase()+' · +'+earned+harvestT_farm_engine_js(' koin.'));return{ok:true,earned};}
  setSharing(enabled,code){if(typeof enabled!=='boolean'||(enabled&&!friendCode(this.s.social.code||code)))return{ok:false,message:harvestT_farm_engine_js('Kode kunjungan belum tersedia.')};this.s.social.enabled=enabled;if(enabled&&!this.s.social.code)this.s.social.code=code;return{ok:true};}
  addFriend(code){const t=this.s.social;if(!friendCode(code)||code===t.code)return{ok:false,message:harvestT_farm_engine_js('Gunakan kode kebun teman yang valid.')};if(t.friends.includes(code))return{ok:false,message:harvestT_farm_engine_js('Kebun sudah ada di daftar teman.')};if(t.friends.length>=30)return{ok:false,message:harvestT_farm_engine_js('Maksimal 30 kebun teman.')};t.friends.push(code);return{ok:true};}
  removeFriend(code){const t=this.s.social;if(!t.friends.includes(code))return{ok:false,message:harvestT_farm_engine_js('Kebun tidak ada di daftar teman.')};t.friends=t.friends.filter(c=>c!==code);return{ok:true};}
  updateProfile(value){try{if(!Object.hasOwn(value,'sharePhoto')&&this.s.profile.sharePhoto!==undefined)value={...value,sharePhoto:this.s.profile.sharePhoto};if(!Object.hasOwn(value,'accountPhoto')&&this.s.profile.accountPhoto)value={...value,accountPhoto:this.s.profile.accountPhoto};this.s.profile=profile(value);return{ok:true};}catch{return{ok:false,message:harvestT_farm_engine_js('Isi nama hingga 24 karakter dan pilih avatar atau foto JPG yang valid.')};}}

 }
 root.BaraFarm=Object.freeze({FISH,BAITS,FISHING_LEVEL,pierPoint,pierOnLand,riverCenter,fishingConditions,fishingOutcome,pierFishingBonus,fishingStage,freshFishing,accountPhotoURL,Farm,CROPS,MATERIALS,BUILDINGS,LOTS,PLOTS,AVATARS,MAX_PLOTS,MAX_BUILDINGS,LEVEL_XP,CROP_LEVEL,BUILDING_LEVEL,ORDER_TEMPLATES,RECIPES,ANIMALS,ANIMAL_PRODUCTS,REGIONS,UPGRADE_KINDS,buildingLevel,upgradeDuration,queueCapacity,friendCode,DAILY,ACHIEVEMENTS,farmDay,levelFor,footprint,validateSave});
})(globalThis);
