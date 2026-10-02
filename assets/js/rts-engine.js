'use strict';
// Pure RTS simulation, shared by the browser and the cloud snapshot validator.
(function (root) {
  const W = 3200, H = 2200, CELL = 32, COLS = 100, ROWS = 69;
  const resources = ['wood', 'stone', 'gold', 'meat'];
  const kinds = {
    villager: {name:'Pekerja',hp:55,speed:96,damage:3,range:23,reload:1.4,time:8,cost:{meat:40},producer:'townhall'},
    soldier: {name:'Prajurit',hp:95,speed:100,damage:11,range:27,reload:1,time:8,cost:{gold:12,meat:25},producer:'barracks'},
    archer: {name:'Pemanah',hp:60,speed:94,damage:10,range:175,reload:1.3,time:11,cost:{wood:25,gold:18},producer:'archery'},
    cavalry: {name:'Kavaleri',hp:155,speed:145,damage:17,range:30,reload:1.1,time:15,cost:{gold:40,meat:55},producer:'stable'}
  };
  const buildings = {
    townhall:{name:'Balai desa',symbol:'♛',hp:720,radius:54,time:45,cost:{wood:160,stone:100},description:'Melatih pekerja dan menerima hasil pengumpulan.'},
    house:{name:'Rumah',symbol:'⌂',hp:220,radius:27,time:12,cost:{wood:35},description:'Menambah kapasitas penduduk sebanyak 6.'},
    barracks:{name:'Barak',symbol:'⚔',hp:380,radius:40,time:20,cost:{wood:95},description:'Tempat melatih prajurit infanteri.'},
    archery:{name:'Lapangan panah',symbol:'➶',hp:320,radius:38,time:24,cost:{wood:115,stone:30},description:'Melatih pemanah dengan serangan jarak jauh.'},
    stable:{name:'Kandang kuda',symbol:'♞',hp:400,radius:40,time:26,cost:{wood:125,meat:60},description:'Melatih kavaleri yang bergerak cepat.'},
    tower:{name:'Menara',symbol:'♜',hp:450,radius:22,time:23,cost:{wood:60,stone:100},range:230,damage:16,reload:1.5,description:'Menembakkan panah ke musuh di dekatnya.'},
    castle:{name:'Kastel',symbol:'♜',hp:1400,radius:64,time:48,cost:{wood:160,stone:220,gold:80},range:280,damage:28,reload:1.2,description:'Benteng besar dengan serangan jarak jauh dan +10 kapasitas penduduk.'},
    wall:{name:'Tembok',symbol:'▥',hp:600,radius:18,time:9,cost:{stone:25},description:'Menghalangi jalan musuh. Bangun beberapa segmen untuk melindungi desa.'},
    storehouse:{name:'Gudang',symbol:'▣',hp:260,radius:28,time:15,cost:{wood:55},description:'Tempat pekerja mengantar resource agar perjalanan lebih pendek.'},
    farm:{name:'Ladang',symbol:'▦',hp:180,radius:32,time:17,cost:{wood:55},description:'Sumber makanan yang dapat dikerjakan oleh pekerja.'}
  };
  const nodeNames={wood:'Hutan',stone:'Deposit batu',gold:'Deposit emas',meat:'Perburuan'};
  const camps=[{name:'Kamp Serigala',x:2550,y:540,hp:320},{name:'Pos Besi',x:2750,y:1760,hp:500},{name:'Benteng Kelam',x:640,y:450,hp:850}];
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const point=v=>object(v)&&finite(v.x,0,W)&&finite(v.y,0,H);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v[k]]));

  function validateSave(save) {
    const need=v=>{if(!v)throw new TypeError('Progres RTS tidak valid');};
    need(object(save)&&save.version===3&&object(save.state));
    const s=save.state;
    need(finite(s.time,0,1e8)&&object(s.resources));
    for(const r of resources)need(finite(s.resources[r],0,9999));
    need(integer(s.nextId,1,10000000)&&integer(s.wave,0,100000)&&finite(s.raidTimer,0,600)&&[null,'won','lost'].includes(s.result));
    need(Array.isArray(s.units)&&s.units.length<=100&&Array.isArray(s.buildings)&&s.buildings.length<=48);
    need(Array.isArray(s.nodes)&&s.nodes.length===16&&Array.isArray(s.camps)&&s.camps.length===3);
    const ids=new Set();
    const entity=(v)=>{need(object(v)&&integer(v.id,1,s.nextId-1)&&!ids.has(v.id)&&point(v));ids.add(v.id);};
    let own=0,enemy=0;
    const units=s.units.map(u=>{
      entity(u);need(Object.hasOwn(kinds,u.kind)&&[0,1].includes(u.team)&&finite(u.hp,.000001,kinds[u.kind].hp));
      u.team===0?own++:enemy++;
      need(finite(u.cooldown,0,3)&&finite(u.carry,0,12)&&[null,...resources].includes(u.carryType));
      need(integer(u.home,-1,2)&&object(u.order)&&['idle','hold','move','attackMove','attack','gather','build','repair','return'].includes(u.order.type));
      const o=u.order;need(point(o)&&[null,...resources].includes(o.resource)&&integer(o.target,0,s.nextId-1));
      return {...pick(u,['id','kind','team','x','y','hp','cooldown','carry','carryType','home']),order:pick(o,['type','x','y','target','resource'])};
    });
    need(own<=64&&enemy<=36);
    const built=s.buildings.map(b=>{
      entity(b);need(Object.hasOwn(buildings,b.kind)&&finite(b.hp,.000001,buildings[b.kind].hp)&&finite(b.progress,0,1)&&finite(b.cooldown,0,3)&&point(b.rally));
      need(Array.isArray(b.queue)&&b.queue.length<=5);
      const queue=b.queue.map(t=>{need(object(t)&&Object.hasOwn(kinds,t.kind)&&kinds[t.kind].producer===b.kind&&finite(t.left,.000001,kinds[t.kind].time));return pick(t,['kind','left']);});
      return {...pick(b,['id','kind','x','y','hp','progress','cooldown']),rally:pick(b.rally,['x','y']),queue};
    });
    const nodes=s.nodes.map((n,i)=>{entity(n);need(Object.hasOwn(nodeNames,n.resource)&&n.resource===resources[i%4]&&finite(n.amount,0,8000));return pick(n,['id','resource','x','y','amount']);});
    const savedCamps=s.camps.map((c,i)=>{entity(c);need(c.x===camps[i].x&&c.y===camps[i].y&&finite(c.hp,0,camps[i].hp));return pick(c,['id','x','y','hp']);});
    const references=new Map([...units,...built,...nodes,...savedCamps].map(v=>[v.id,v]));
    for(const u of units){const o=u.order,t=references.get(o.target);if(o.target)need(Boolean(t));if(o.type==='gather')need(u.kind==='villager'&&t&&(Object.hasOwn(t,'amount')||t.kind==='farm'));if(o.type==='build'||o.type==='repair')need(u.kind==='villager'&&t&&Object.hasOwn(t,'progress'));if(o.type==='return')need(u.kind==='villager');}
    const log=Array.isArray(s.log)?s.log.slice(0,8).filter(e=>object(e)&&finite(e.time,0,1e8)&&typeof e.text==='string').map(e=>({time:e.time,text:e.text.slice(0,180)})):[];
    return {version:3,state:{...pick(s,['time','nextId','wave','raidTimer','result']),resources:pick(s.resources,resources),units,buildings:built,nodes,camps:savedCamps,log}};
  }

  class RTSGame {
    constructor(onEvent=()=>{}) {
      this.onEvent=onEvent;this.running=false;this.paths=new Map();this.pathStamp=0;
      this.s={time:0,resources:{wood:0,stone:0,gold:0,meat:0},nextId:1,wave:0,raidTimer:300,result:null,units:[],buildings:[],nodes:[],camps:[],log:[]};
      this.addBuilding('townhall',1593,1077,1);
      for(let i=0;i<8;i++)this.addUnit('villager',1515+(i%4)*20,1150+Math.floor(i/4)*24);
      for(let i=0;i<4;i++)this.addUnit('soldier',1570+i*22,1230);
      const deposits=[[1324,1020],[1840,1140],[1748,925],[1366,1260],[450,1550],[900,1720],[2670,1100],[2300,1920],[800,600],[2160,600],[1060,370],[540,950],[2200,1520],[2950,600],[340,350],[1900,1780]];
      deposits.forEach(([x,y],i)=>this.s.nodes.push({id:this.id(),resource:resources[i%4],x,y,amount:8000}));
      camps.forEach((c,i)=>{this.s.camps.push({id:this.id(),x:c.x,y:c.y,hp:c.hp});for(let j=0;j<3+i;j++)this.addUnit(i===2&&j%2?'archer':'soldier',c.x-75+j*30,c.y+90,1,i);});
      this.s.log=[{time:0,text:'Desa didirikan. Pilih pekerja dan perintahkan mengumpulkan resource.'}];
    }
    id(){return this.s.nextId++;}
    get capacity(){return Math.min(64,16+this.s.buildings.filter(b=>b.progress===1&&b.kind==='house').length*6+this.s.buildings.filter(b=>b.progress===1&&b.kind==='castle').length*10);}
    get ownUnits(){return this.s.units.filter(u=>u.team===0);}
    get army(){return this.ownUnits.filter(u=>u.kind!=='villager');}
    get villagers(){return this.ownUnits.filter(u=>u.kind==='villager');}
    get townhall(){return this.s.buildings.find(b=>b.kind==='townhall'&&b.progress===1);}
    get rates(){const r=Object.fromEntries(resources.map(k=>[k,0]));for(const u of this.villagers)if(['gather','return'].includes(u.order.type)&&u.order.resource)r[u.order.resource]+=.75;return r;}
    entity(id){return this.s.units.find(v=>v.id===id)||this.s.buildings.find(v=>v.id===id)||this.s.nodes.find(v=>v.id===id)||this.s.camps.find(v=>v.id===id);}
    emit(type,text){if(text){this.s.log.unshift({time:Math.floor(this.s.time),text});this.s.log.length=Math.min(8,this.s.log.length);}this.onEvent(type,text);}
    start(){if(this.s.result)return false;this.running=true;this.emit('resume');return true;}
    pause(){if(this.running){this.running=false;this.emit('pause');}}
    canPay(cost){return Object.entries(cost).every(([r,n])=>this.s.resources[r]>=n);}
    pay(cost){if(!this.canPay(cost))return false;for(const[r,n]of Object.entries(cost))this.s.resources[r]-=n;return true;}
    addUnit(kind,x,y,team=0,home=-1){const p=this.nearestOpen(x,y);const u={id:this.id(),kind,team,x:p.x,y:p.y,hp:kinds[kind].hp,cooldown:0,carry:0,carryType:null,home,order:{type:'idle',x:p.x,y:p.y,target:0,resource:null}};this.s.units.push(u);return u;}
    addBuilding(kind,x,y,progress=0){const b={id:this.id(),kind,x,y,hp:buildings[kind].hp,progress,cooldown:0,rally:{x:x+85,y:y+80},queue:[]};this.s.buildings.push(b);this.pathStamp++;return b;}
    setOrder(u,type,p=u,target=0,resource=null){u.order={type,x:p.x,y:p.y,target,resource};this.paths.delete(u.id);}
    command(ids,type,p,target=0){
      if(!this.running||!point(p)||!['move','attackMove','attack','gather','build','repair'].includes(type))return false;
      const selected=this.ownUnits.filter(u=>ids.includes(u.id));if(!selected.length)return false;
      const t=this.entity(target);let n=0;
      for(const u of selected){
        if(type==='gather'&&(u.kind!=='villager'||!t||(!Object.hasOwn(t,'amount')&&t.kind!=='farm')))continue;
        if(['build','repair'].includes(type)&&(u.kind!=='villager'||!t||!Object.hasOwn(t,'progress')))continue;
        if(type==='attack'&&(!t||!this.hostile(u,t)))continue;
        const offset=['move','attackMove'].includes(type)?{x:p.x+((n%5)-Math.min(2,(selected.length-1)/2))*20,y:p.y+Math.floor(n/5)*20}:p;
        const resource=type==='gather'?(t.resource||'meat'):null;
        // Deliver existing cargo before switching jobs; wood cannot become stone.
        if(type==='gather'&&u.carry>0){const drop=this.s.buildings.find(b=>b.progress===1&&['townhall','storehouse'].includes(b.kind));if(drop){this.setOrder(u,'return',drop,target,resource);n++;continue;}}
        this.setOrder(u,type,{x:Math.max(8,Math.min(W-8,offset.x)),y:Math.max(8,Math.min(H-8,offset.y))},target,resource);n++;
      }
      if(n)this.emit('ordered',n+' unit menerima perintah.');return n>0;
    }
    stop(ids,hold=false){if(!this.running)return false;for(const u of this.ownUnits.filter(u=>ids.includes(u.id)))this.setOrder(u,hold?'hold':'idle');this.emit('ordered');return true;}
    hostile(u,t){return Object.hasOwn(t,'team')?t.team!==u.team:this.s.camps.includes(t)?u.team===0&&t.hp>0:this.s.buildings.includes(t)?u.team===1:false;}
    blocked(x,y,ignore=0){if(x<8||y<8||x>W-8||y>H-8)return true;const row=Math.floor(y/CELL),col=Math.floor(x/CELL);if(root.BARA_NAV?.[row]?.[col]==='1')return true;return this.s.buildings.some(b=>b.id!==ignore&&Math.hypot(x-b.x,y-b.y)<buildings[b.kind].radius+9);}
    nearestOpen(x,y,ignore=0){x=Math.max(16,Math.min(W-16,x));y=Math.max(16,Math.min(H-16,y));if(!this.blocked(x,y,ignore))return{x,y};const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);for(let r=0;r<18;r++){const choices=[];for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const p={x:(cx+dx+.5)*CELL,y:(cy+dy+.5)*CELL};if(!this.blocked(p.x,p.y,ignore))choices.push(p);}if(choices.length)return choices.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];}return{x,y};}
    placement(kind,x,y){if(!Object.hasOwn(buildings,kind))return{ok:false,reason:'Bangunan tidak dikenal.'};const r=buildings[kind].radius;if(x-r<16||y-r<16||x+r>W-16||y+r>H-16)return{ok:false,reason:'Lokasi berada di luar peta.'};if(this.s.buildings.some(b=>distance({x,y},b)<r+buildings[b.kind].radius+14)||this.s.camps.some(c=>c.hp>0&&distance({x,y},c)<r+75)||this.s.nodes.some(n=>n.amount>0&&distance({x,y},n)<r+30))return{ok:false,reason:'Lokasi bertabrakan dengan bangunan atau sumber daya.'};for(const[dx,dy]of[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,-r*.7]])if(this.blocked(x+dx,y+dy))return{ok:false,reason:'Pilih tanah kering yang bisa dilalui.'};return{ok:true,reason:'Klik untuk membangun di sini.'};}
    canBuild(kind,ids){return this.running&&Object.hasOwn(buildings,kind)&&this.s.buildings.length<48&&this.canPay(buildings[kind].cost)&&this.villagers.some(u=>ids.includes(u.id));}
    place(kind,x,y,ids){x=Math.round(x/16)*16;y=Math.round(y/16)*16;if(!this.canBuild(kind,ids)||!this.placement(kind,x,y).ok)return false;this.pay(buildings[kind].cost);const b=this.addBuilding(kind,x,y);this.command(ids,'build',b,b.id);this.emit('build',buildings[kind].name+' mulai dibangun di lokasi pilihanmu.');return b;}
    canTrain(kind,producer){const b=this.entity(producer);return this.running&&Object.hasOwn(kinds,kind)&&b&&b.kind===kinds[kind].producer&&b.progress===1&&b.queue.length<5&&this.ownUnits.length+this.s.buildings.reduce((n,v)=>n+v.queue.length,0)<this.capacity&&this.canPay(kinds[kind].cost);}
    train(kind,producer){if(!this.canTrain(kind,producer))return false;this.pay(kinds[kind].cost);this.entity(producer).queue.push({kind,left:kinds[kind].time});this.emit('train',kinds[kind].name+' masuk antrean pelatihan.');return true;}
    path(from,to){let goal=this.nearestOpen(to.x,to.y);const center={x:(Math.floor(goal.x/CELL)+.5)*CELL,y:(Math.floor(goal.y/CELL)+.5)*CELL};if(this.blocked(center.x,center.y))goal=this.nearestOpen(center.x,center.y);const start=Math.floor(from.y/CELL)*COLS+Math.floor(from.x/CELL),end=Math.floor(goal.y/CELL)*COLS+Math.floor(goal.x/CELL);if(start===end)return[goal];const open=[start],scores=new Map([[start,0]]),parents=new Map(),closed=new Set();const heuristic=id=>Math.hypot(id%COLS-end%COLS,Math.floor(id/COLS)-Math.floor(end/COLS));let visited=0;while(open.length&&visited++<8000){let best=0;for(let i=1;i<open.length;i++)if(scores.get(open[i])+heuristic(open[i])<scores.get(open[best])+heuristic(open[best]))best=i;const current=open.splice(best,1)[0];if(current===end){const route=[goal];let n=end;while(n!==start){route.push({x:(n%COLS+.5)*CELL,y:(Math.floor(n/COLS)+.5)*CELL});n=parents.get(n);}route.reverse();return route;}closed.add(current);const cx=current%COLS,cy=Math.floor(current/COLS);for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const nx=cx+dx,ny=cy+dy,n=ny*COLS+nx;if(nx<0||nx>=COLS||ny<0||ny>=ROWS||closed.has(n)||this.blocked((nx+.5)*CELL,(ny+.5)*CELL))continue;if(dx&&dy&&(this.blocked((cx+dx+.5)*CELL,(cy+.5)*CELL)||this.blocked((cx+.5)*CELL,(cy+dy+.5)*CELL)))continue;const score=scores.get(current)+(dx&&dy?1.414:1);if(score<(scores.get(n)??Infinity)){scores.set(n,score);parents.set(n,current);if(!open.includes(n))open.push(n);}}}return null;}
    walk(u,target,dt,reach=8){if(distance(u,target)<=reach)return true;let cache=this.paths.get(u.id);if(!cache||cache.stamp!==this.pathStamp||distance(cache.target,target)>40){const path=this.path(u,target);cache={path:path||[],target:{x:target.x,y:target.y},stamp:this.pathStamp};this.paths.set(u.id,cache);if(!path)return false;}while(cache.path.length&&distance(u,cache.path[0])<5)cache.path.shift();if(!cache.path.length)return distance(u,target)<=reach+25;const p=cache.path[0],d=distance(u,p),step=Math.min(d,kinds[u.kind].speed*dt);u.x+=(p.x-u.x)/d*step;u.y+=(p.y-u.y)/d*step;return distance(u,target)<=reach;}
    nearestEnemy(u,range=200){const targets=[...this.s.units.filter(t=>t.team!==u.team),...(u.team===0?this.s.camps.filter(t=>t.hp>0):this.s.buildings)];return targets.filter(t=>distance(u,t)<=range+(t.kind?buildings[t.kind]?.radius||0:0)).sort((a,b)=>distance(u,a)-distance(u,b))[0];}
    strike(a,t,damage,reload){if(a.cooldown>0)return;a.cooldown=reload;t.hp-=damage;if(t.hp<=0&&this.s.camps.includes(t)){t.hp=0;this.emit('conquest',camps[this.s.camps.indexOf(t)].name+' dikuasai.');}this.onEvent('strike',{from:{x:a.x,y:a.y},to:{x:t.x,y:t.y},ranged:distance(a,t)>70});}
    unitStep(u,dt){u.cooldown=Math.max(0,u.cooldown-dt);let o=u.order,t=this.entity(o.target);if(o.target&&!t){this.setOrder(u,'idle');o=u.order;}
      if(u.team===1&&o.type==='idle'){const enemy=this.nearestEnemy(u,240);if(enemy)this.setOrder(u,'attack',enemy,enemy.id);else if(u.home<0&&this.townhall)this.setOrder(u,'attack',this.townhall,this.townhall.id);o=u.order;t=this.entity(o.target);}
      if(u.team===0&&u.kind!=='villager'&&['idle','hold','attackMove'].includes(o.type)){const enemy=this.nearestEnemy(u,o.type==='hold'?kinds[u.kind].range+25:180);if(enemy){const range=kinds[u.kind].range+(buildings[enemy.kind]?.radius||0)+(this.s.camps.includes(enemy)?48:0);if(distance(u,enemy)<=range)this.strike(u,enemy,kinds[u.kind].damage,kinds[u.kind].reload);else if(o.type!=='hold')this.walk(u,enemy,dt,range);return;}}
      if(o.type==='move'||o.type==='attackMove'){if(this.walk(u,o,dt))this.setOrder(u,'idle');}
      else if(o.type==='attack'&&t){if(t.hp<=0){this.setOrder(u,'idle');return;}const range=kinds[u.kind].range+(buildings[t.kind]?.radius||0)+(this.s.camps.includes(t)?48:0);if(distance(u,t)<=range)this.strike(u,t,kinds[u.kind].damage,kinds[u.kind].reload);else this.walk(u,t,dt,range);}
      else if(o.type==='gather'&&t){if(t.amount===0||t.kind==='farm'&&t.progress<1){this.setOrder(u,'idle');return;}if(this.walk(u,t,dt,39)){const gain=Math.min(12-u.carry,(o.resource==='stone'?1.6:2.1)*dt,t.amount??Infinity);u.carry+=gain;u.carryType=o.resource;if(Object.hasOwn(t,'amount'))t.amount=Math.max(0,t.amount-gain);if(u.carry>=11.999||t.amount===0){const drop=this.s.buildings.filter(b=>b.progress===1&&['townhall','storehouse'].includes(b.kind)).sort((a,b)=>distance(u,a)-distance(u,b))[0];if(drop)this.setOrder(u,'return',drop,t.id,o.resource);}}}
      else if(o.type==='return'){const drop=this.s.buildings.filter(b=>b.progress===1&&['townhall','storehouse'].includes(b.kind)).sort((a,b)=>distance(u,a)-distance(u,b))[0];if(drop&&this.walk(u,drop,dt,buildings[drop.kind].radius+22)){this.s.resources[u.carryType]=Math.min(9999,this.s.resources[u.carryType]+u.carry);u.carry=0;u.carryType=null;if(t)this.setOrder(u,'gather',t,t.id,o.resource);else this.setOrder(u,'idle');}}
      else if(o.type==='build'&&t){if(t.progress>=1){this.setOrder(u,'idle');return;}if(this.walk(u,t,dt,buildings[t.kind].radius+24)){t.progress=Math.min(1,t.progress+dt/buildings[t.kind].time);if(t.progress===1){this.pathStamp++;this.emit('built',buildings[t.kind].name+' selesai dibangun.');}}}
      else if(o.type==='repair'&&t){if(t.hp>=buildings[t.kind].hp){this.setOrder(u,'idle');return;}if(this.walk(u,t,dt,buildings[t.kind].radius+24)&&this.pay({wood:.4*dt,stone:.2*dt}))t.hp=Math.min(buildings[t.kind].hp,t.hp+12*dt);}
    }
    update(dt){if(!this.running||this.s.result)return;dt=Math.max(0,Math.min(.25,dt));this.s.time+=dt;
      for(const u of [...this.s.units])if(u.hp>0)this.unitStep(u,dt);
      for(const b of this.s.buildings){b.cooldown=Math.max(0,b.cooldown-dt);if(b.progress<1||b.hp<=0)continue;if(b.queue.length){const q=b.queue[0];q.left-=dt;if(q.left<=0){const u=this.addUnit(q.kind,b.x+buildings[b.kind].radius+32,b.y+32);this.setOrder(u,'move',b.rally);b.queue.shift();this.emit('trained',kinds[q.kind].name+' siap menerima perintah.');}}if(buildings[b.kind].range){const t=this.s.units.filter(u=>u.team===1&&u.hp>0&&distance(b,u)<=buildings[b.kind].range).sort((a,c)=>distance(b,a)-distance(b,c))[0];if(t)this.strike(b,t,buildings[b.kind].damage,buildings[b.kind].reload);}}
      const dead=new Set(this.s.units.filter(u=>u.hp<=0).map(u=>u.id));for(const u of this.s.units)if(dead.has(u.id)){this.paths.delete(u.id);this.emit('casualty',u.team===0?kinds[u.kind].name+' gugur.':'Pasukan musuh dikalahkan.');}
      this.s.units=this.s.units.filter(u=>u.hp>0);const destroyed=this.s.buildings.filter(b=>b.hp<=0);if(destroyed.length){this.s.buildings=this.s.buildings.filter(b=>b.hp>0);this.pathStamp++;for(const b of destroyed)this.emit('destroyed',buildings[b.kind].name+' hancur.');}
      for(let i=0;i<3;i++)if(this.s.camps[i].hp<0){this.s.camps[i].hp=0;this.emit('conquest',camps[i].name+' dikuasai.');}
      // A dead target never leaves an un-restorable order in a saved snapshot.
      for(const u of this.s.units)if(u.order.target&&!this.entity(u.order.target))this.setOrder(u,'idle');
      if(!this.townhall&&!this.s.buildings.some(b=>b.kind==='townhall')){this.finish('lost');return;}
      if(this.s.camps.every(c=>c.hp===0)){this.finish('won');return;}
      this.s.raidTimer=Math.max(0,this.s.raidTimer-dt);if(this.s.raidTimer===0){this.s.wave++;const camp=this.s.camps.find(c=>c.hp>0);const count=Math.min(8,2+this.s.wave);for(let i=0;i<count&&this.s.units.filter(u=>u.team===1).length<36;i++)this.addUnit(this.s.wave>2&&i%3===0?'archer':'soldier',camp.x+i*24,camp.y+120,1);this.s.raidTimer=Math.max(180,300-this.s.wave*10);this.emit('raid','Musuh mengirim pasukan penyerang. Siapkan pertahanan.');}
    }
    finish(result){this.s.result=result;this.running=false;this.emit('end',result==='won'?'Semua kamp musuh telah dikuasai.':'Balai desa terakhir hancur.');}
    serialize(){return JSON.stringify({version:3,state:this.s});}
    load(raw){try{const save=JSON.parse(raw);if(save.version===2)return this.migrate(save);const clean=validateSave(save);this.s=clean.state;this.running=false;this.paths.clear();this.pathStamp++;return true;}catch{return false;}}
    migrate(save){
      if(typeof Kingdom==='undefined')return false;const old=new Kingdom();if(!old.load(JSON.stringify(save)))return false;
      const legacy=old.s,next=new RTSGame();next.s.resources=clone(legacy.resources);next.s.time=legacy.time;next.s.wave=legacy.wave;next.s.result=legacy.result;next.s.log=clone(legacy.log);
      next.s.units=next.s.units.filter(u=>u.team===1||u.kind==='villager');
      for(let i=8;i<old.population;i++)next.addUnit('villager',1515+(i%4)*20,1150+Math.floor(i/4)*24);
      for(const[k,n]of Object.entries(legacy.army)){const returning=legacy.expedition?.troops[k]||0;for(let i=0;i<n+returning;i++)next.addUnit(k,1530+(i%8)*22,1230+Math.floor(i/8)*24);}
      // Convert old unlock levels into the equivalent physical production buildings.
      const positions={barracks:[1650,1300],tower:[1482,1106],wall:[1601,1166],archery:[1760,1390],stable:[1860,1450]};
      for(const k of ['barracks','tower','wall'])if(legacy.levels[k])next.addBuilding(k,...positions[k],1);
      if(legacy.levels.barracks>=2)next.addBuilding('archery',...positions.archery,1);
      if(legacy.levels.barracks>=3)next.addBuilding('stable',...positions.stable,1);
      for(const q of legacy.training){const producer=next.s.buildings.find(b=>b.kind===kinds[q.key].producer);if(producer)producer.queue.push({kind:q.key,left:Math.min(q.left,kinds[q.key].time)});else next.addUnit(q.key,1600,1260);}
      const population=next.ownUnits.length+legacy.training.length;
      for(let i=0;next.capacity<population;i++)next.addBuilding('house',1700+i*72,1610,1);
      // An old upgrade has no direct RTS equivalent; return its paid resources.
      if(legacy.construction)for(const[r,n]of Object.entries(old.buildingCost(legacy.construction.key)))next.s.resources[r]=Math.min(9999,next.s.resources[r]+n);
      for(let i=0;i<3;i++)if(legacy.captured[i]){next.s.camps[i].hp=0;next.s.units=next.s.units.filter(u=>u.team===0||u.home!==i);}
      next.townhall.hp=Math.max(1,Math.min(720,legacy.hp/old.maxHp*720));
      this.s=validateSave({version:3,state:next.s}).state;this.running=false;this.paths.clear();this.pathStamp++;return true;
    }
  }
  root.BaraRTS=Object.freeze({Game:RTSGame,validateSave,kinds,buildings,resources,nodeNames,camps,W,H});
})(globalThis);
