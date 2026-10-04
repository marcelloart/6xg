'use strict';
const harvestT_farm_scenery_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
// Original vector scenery; no FarmVille artwork or game assets are used.
class FarmRenderer{
 constructor(canvas,camera){this.wind=!matchMedia('(prefers-reduced-motion: reduce)').matches;try{const saved=localStorage.getItem('6xg:motion');if(saved!==null)this.wind=saved==='true';}catch{}this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=camera;this.back=document.createElement('canvas');this.back.width=3200;this.back.height=2200;this.paintLandscape(this.back.getContext('2d'));}
 setMotion(enabled){this.wind=Boolean(enabled);}
 ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
 rect(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 line(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
 tree(c,x,y,size,kind=0){
  this.ellipse(c,x+12,y+13,size*.8,size*.26,'#456b4128');this.rect(c,x-4,y-size*.3,8,size*.65,'#9a794f',3);
  const colors=kind===2?['#92819e','#ae99b0','#c1adbc']:kind===1?['#587e4c','#719853','#8bad60']:['#487751','#5f925d','#80ad73'];
  this.ellipse(c,x,y-size*.65,size*.78,size*.74,colors[0]);this.ellipse(c,x-size*.22,y-size*.85,size*.56,size*.54,colors[1]);this.ellipse(c,x-size*.33,y-size*1.06,size*.29,size*.22,colors[2]);
  if(kind===1)for(const[dx,dy]of[[-12,-21],[16,-29],[2,-48]])this.ellipse(c,x+dx,y+dy,3,3,'#e8ba68');
 }
 house(c,x,y,kind='house',scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);this.ellipse(c,12,12,74,24,'#49694628');
  const barn=kind==='barn',shed=kind==='shed';
  if(kind==='planter'){this.rect(c,-14,-15,28,23,'#a78158',4);for(const dx of[-9,0,9]){this.line(c,[[dx,-8],[dx,-32]],'#628543',2);this.ellipse(c,dx,-32,7,7,'#e5bf64');this.ellipse(c,dx,-32,3,3,'#7d5936');}c.restore();return;}
  if(kind==='bench'){this.rect(c,-32,-12,64,13,'#a68554',2);this.rect(c,-32,-29,64,12,'#987747',2);for(const dx of[-25,25])this.line(c,[[dx,-24],[dx,15]],'#604b35',5);c.restore();return;}
  if(kind==='well'){
   this.ellipse(c,0,4,26,14,'#7e9a8b');this.ellipse(c,0,-2,20,11,'#487d89');this.rect(c,-27,-48,5,47,'#987554');this.rect(c,22,-48,5,47,'#987554');this.line(c,[[-36,-47],[0,-65],[36,-47]],'#9a7451',9);this.line(c,[[-2,-52],[-2,-11]],'#e2c288',2);this.rect(c,-8,-15,13,13,'#be9760',2);
  }else{
   this.rect(c,-52,-63,102,72,barn?'#b87c67':'#e4d6a4',4);this.rect(c,14,-64,38,74,barn?'#9d6858':'#c8c496',2);
   c.fillStyle=barn?'#886355':'#be8b64';c.beginPath();c.moveTo(-63,-60);c.lineTo(-8,-106);c.lineTo(65,-61);c.lineTo(8,-67);c.closePath();c.fill();c.fillStyle=barn?'#b38c76':'#d6a777';c.beginPath();c.moveTo(-63,-60);c.lineTo(-8,-106);c.lineTo(8,-67);c.closePath();c.fill();
   if(!shed){this.rect(c,29,-98,12,23,'#d0bf99',2);this.rect(c,-37,-42,19,19,'#638981',2);this.line(c,[[-27,-42],[-27,-23]],'#ecdfb3',2);}
   this.rect(c,-6,-30,barn?29:19,40,barn?'#715548':'#79806a',2);if(barn){this.line(c,[[-3,-27],[20,7]],'#cba17c',2);this.line(c,[[20,-27],[-3,7]],'#cba17c',2);}this.rect(c,-57,8,115,7,'#ccc2a0',2);if(['kitchen','juicery','bakery'].includes(kind)){this.rect(c,-46,-21,92,8,kind==='juicery'?'#729650':'#c48469',2);this.rect(c,-34,-74,68,14,'#eee2b9',2);c.font='bold 8px sans-serif';c.textAlign='center';c.fillStyle='#536e43';c.fillText({kitchen:harvestT_farm_scenery_js('DAPUR'),juicery:harvestT_farm_scenery_js('JUS'),bakery:harvestT_farm_scenery_js('PAI')}[kind],0,-64);}
  }c.restore();
 }
 fence(c,x,y,w,h){
  const rail=(ax,ay,bx,by)=>{this.line(c,[[ax,ay-8],[bx,by-8]],'#9b8059',4);this.line(c,[[ax,ay-17],[bx,by-17]],'#c0a476',4);};
  rail(x,y,x+w,y);rail(x,y+h,x+w,y+h);rail(x,y,x,y+h);rail(x+w,y,x+w,y+h);
  for(let i=0;i<=w;i+=52)for(const py of[y,y+h])this.rect(c,x+i-3,py-24,7,27,'#a58c63',2);
  for(let i=0;i<=h;i+=52)for(const px of[x,x+w])this.rect(c,px-3,y+i-24,7,27,'#a58c63',2);
 }
 paintLandscape(c){
  this.rect(c,0,0,3200,2200,'#9fba76');
  for(let y=0;y<2200;y+=84)for(let x=0;x<3200;x+=91){const seed=(x*37+y*19)%113;this.ellipse(c,x+seed,y+seed*.2,65+seed*.4,31,seed%2?'#a9c37a40':'#8eae6d35');}
  const river=[];for(let y=-90;y<2350;y+=50)river.push([640+110*Math.sin(y/270),y]);
  this.line(c,river,'#b6b995',217);this.line(c,river,'#84a8a0',182);this.line(c,river,'#6f9faa',159);this.line(c,river.map(([x,y])=>[x-15,y]),'#83b2b780',94);
  for(let y=30;y<2190;y+=70){const x=640+110*Math.sin(y/270);this.line(c,[[x-35,y],[x+10,y+3]],'#aad0c040',2);}
  this.line(c,[[810,1130],[1050,1120],[1250,1250],[1930,1250],[2250,1510],[2540,1640]],'#adbc80',58);this.line(c,[[810,1130],[1050,1120],[1250,1250],[1930,1250],[2250,1510],[2540,1640]],'#d4cd96',36);
  this.line(c,[[1600,710],[1600,920]],'#d2ca94',30);
  this.ellipse(c,1600,1130,510,410,'#b6c88144');this.ellipse(c,1660,915,125,61,'#c1cd9233');
  
  this.house(c,1593,896,'house',.85);this.rect(c,1480,902,57,8,'#c1a479',3);this.rect(c,1486,908,6,12,'#9f8a67');this.rect(c,1520,908,6,12,'#9f8a67');
  this.tree(c,1420,890,44,2);this.tree(c,1770,862,50,1);
  // Footbridge connects both sides of the valley.
  c.save();c.translate(550,1115);this.rect(c,-155,-34,310,66,'#aa8b58',4);for(let i=-150;i<156;i+=15)this.rect(c,i,-31,11,61,'#d6b981',1);this.line(c,[[-154,-33],[154,-33]],'#987853',5);this.line(c,[[-154,33],[154,33]],'#987853',5);c.restore();
  for(const[x,y,k]of WORLD_DATA.flowers){if(x>1100&&x<2100&&y>780&&y<1700)continue;this.line(c,[[x,y],[x,y-8]],'#7b9c62',1.5);this.ellipse(c,x,y-9,3,2,['#ead7a1','#c6a4ac','#f3e8bd'][k]);}
  for(const[x,y,size,kind]of WORLD_DATA.trees)this.tree(c,x,y,size,kind);
  for(const[x,y]of[[1130,780],[2070,920],[1110,1650],[2070,1600]]){this.ellipse(c,x,y+8,22,9,'#7a976b2b');this.ellipse(c,x,y,17,11,'#c1c5ac');this.ellipse(c,x-5,y-4,11,8,'#d0d2ba');}
  this.tree(c,1060,1070,48);this.tree(c,2140,1330,55,2);this.tree(c,2020,730,51,1);
 }
 crop(c,x,y,key,stage,t){
  const crop=BaraFarm.CROPS[key],orchard=['apple','orange','avocado'].includes(key),size=.4+.6*stage;
  if(orchard){c.save();c.translate(x,y+4);c.scale(size,size);this.tree(c,0,0,22,0);if(stage>.7)for(const[dx,dy]of[[-10,-14],[9,-25],[0,-34]])this.ellipse(c,dx,dy,3.5,3.5,crop.color);c.restore();return;}
  const sway=this.wind?Math.sin(t/1400+x)*1.4:0;
  for(const dx of[-15,15])for(const dy of[-5,15]){
   const xx=x+dx,yy=y+dy,high=10+20*stage;
   this.line(c,[[xx,yy],[xx+sway,yy-high]],'#639452',2.5);this.ellipse(c,xx-5,yy-high*.65,8*size,3.5*size,'#80a762');this.ellipse(c,xx+5,yy-high*.88,7*size,3.5*size,'#6e9855');
   if(stage>.7){if(key==='carrot'){c.fillStyle=crop.color;c.beginPath();c.moveTo(xx-4,yy-4);c.lineTo(xx+4,yy-4);c.lineTo(xx,yy+8);c.closePath();c.fill();}else if(key==='corn'){this.ellipse(c,xx+4,yy-13,4,9,crop.color);}else this.ellipse(c,xx,yy-high*.4,5,4,crop.color);}
  }
 }
 label(c,x,y,text,color='#f7efdc',background='#3f6547e8'){
  c.font='500 10px "DM Sans",sans-serif';const width=c.measureText(text).width+16;this.rect(c,x-width/2,y,width,20,background,5);c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y+14);
 }
 draw(farm,{selectedPlot=null,pendingBuild=null,selectedCrop='carrot',now=Date.now(),welcome=false,placement=null,lightingNow=now}={}){
  const c=this.ctx,cam=this.camera,dpr=Math.min(2,devicePixelRatio||1);if(this.canvas.width!==Math.round(cam.width*dpr)||this.canvas.height!==Math.round(cam.height*dpr)){this.canvas.width=Math.round(cam.width*dpr);this.canvas.height=Math.round(cam.height*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cam.width,cam.height);c.translate(cam.width/2,cam.height/2);c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);c.drawImage(this.back,0,0);
  const open=farm.unlocked;
  for(const p of farm.s.plots){
   if(placement?.point&&p.id===placement.movePlot)continue;
   const planted=farm.s.plots[p.id],locked=p.id>=open;
   this.rect(c,p.x-29,p.y-25,59,55,locked?'#9cb17b':'#977350',5);this.rect(c,p.x-26,p.y-22,53,48,locked?'#a5b981':'#b18b5e',4);
   if(!locked){for(let i=-15;i<23;i+=10)this.line(c,[[p.x-23,p.y+i],[p.x+23,p.y+i]],'#976f4b66',2);}
   if(locked){if(placement){c.strokeStyle='#e0e6bd';c.lineWidth=1.5;c.setLineDash([5,5]);c.strokeRect(p.x-30,p.y-30,60,60);c.setLineDash([]);}if(p.id===open){c.fillStyle='#d0daae';c.font='16px sans-serif';c.textAlign='center';c.fillText('+',p.x,p.y+9);}continue;}
   if(planted.crop){const progress=Math.max(0,Math.min(1,(now-planted.plantedAt)/(planted.readyAt-planted.plantedAt)));this.crop(c,p.x,p.y,planted.crop,progress,now);if(now>=planted.readyAt){this.ellipse(c,p.x+21,p.y-22,8,8,'#edce7e');c.fillStyle='#6e7850';c.font='bold 10px sans-serif';c.textAlign='center';c.fillText('✓',p.x+21,p.y-18);}else{this.rect(c,p.x-20,p.y+31,40,3,'#668753',2);this.rect(c,p.x-20,p.y+31,40*progress,3,'#e6c57a',2);}}
   else if(!welcome){c.fillStyle='#d5ba8a';c.textAlign='center';c.font='18px sans-serif';c.fillText('+',p.x,p.y+8);}
   if(p.id===selectedPlot){c.strokeStyle='#f4d17c';c.lineWidth=3;c.beginPath();c.roundRect(p.x-30,p.y-26,61,57,5);c.stroke();}
  }
  this.label(c,1610,1391,open+harvestT_farm_scenery_js(' petak · kebunmu'),'#5e744d','#f5efdcdf');
  for(const b of farm.s.buildings){if(placement?.point&&b.slot===placement.moveBuilding)continue;const ready=now>=b.readyAt;c.save();c.translate(b.x,b.y);if(!ready){this.rect(c,-48,-30,96,48,'#bfb88d',4);this.line(c,[[-48,-56],[-48,16],[48,16],[48,-56]],'#a08b68',4);}else this.house(c,0,0,b.kind);c.restore();this.label(c,b.x,b.y+26,ready?BaraFarm.BUILDINGS[b.kind].name:harvestT_farm_scenery_js('Membangun · ')+Math.ceil((b.readyAt-now)/1000)+'d');}
  for(const a of farm.s.livestock.animals){const b=farm.s.buildings.find(b=>b.slot===a.slot);if(!b||b.readyAt>now||b.slot===placement?.moveBuilding)continue;const i=farm.s.livestock.animals.filter(v=>v.slot===b.slot).indexOf(a),x=b.x+(i%2?22:-22)+Math.sin(now/1300+a.id)*2,y=b.y+12+Math.floor(i/2)*17;this.ellipse(c,x,y,a.kind==='cow'?13:7,a.kind==='cow'?8:5,'#f1e9d3');this.ellipse(c,x+8,y-5,a.kind==='cow'?5:3,4,'#ded6c2');if(a.kind==='cow')this.ellipse(c,x-3,y,4,5,'#343b30');else this.ellipse(c,x+9,y-9,2,2,'#b65235');}
  if(placement?.point){const points=placement.kind==='garden'?farm.gardenPoints(placement.point,placement.count,placement.rotation):[placement.point];for(const p of points){const size=BaraFarm.footprint(placement.kind==='garden'?'plot':placement.kind,placement.rotation);this.rect(c,p.x-size.w/2,p.y-size.h/2,size.w,size.h,placement.valid?'#9bd49b99':'#d9807899',5);c.strokeStyle=placement.valid?'#397f50':'#af463c';c.lineWidth=3;c.strokeRect(p.x-size.w/2,p.y-size.h/2,size.w,size.h);}}
  if(placement?.lifted&&placement.point){const p=placement.point;c.save();c.globalAlpha=.8;if(placement.kind==='plot'){this.rect(c,p.x-29,p.y-43,58,55,'#b18b5e',4);const original=farm.s.plots[placement.movePlot];if(original?.crop)this.crop(c,p.x,p.y-18,original.crop,Math.min(1,(now-original.plantedAt)/(original.readyAt-original.plantedAt)),now);}else this.house(c,p.x,p.y-18,placement.kind);c.restore();}
  this.label(c,1593,927,harvestT_farm_scenery_js('Pondok kebun'),'#f4eedb','#566e47dc');
  // Slow ripples and birds keep the valley alive without changing the economy.
  for(let i=0;i<3;i++){const x=680+Math.sin(now/10000+i)*38,y=830+i*47;this.ellipse(c,x,y,8,4,'#edf0ce');this.ellipse(c,x+6,y-3,4,3,'#faf4dd');this.ellipse(c,x+10,y-3,2,1,'#d8a95c');}
  if(typeof FarmDaylight!=='undefined'){const light=FarmDaylight.at(lightingNow),night=1-light.daylight;c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='rgba(13,28,59,'+(night*.42)+')';c.fillRect(0,0,cam.width,cam.height);if(light.golden>.01){c.fillStyle='rgba(255,161,67,'+(light.golden*.12)+')';c.fillRect(0,0,cam.width,cam.height);}}
 }
 mini(canvas,farm){
  const c=canvas.getContext('2d'),sx=canvas.width/3200,sy=canvas.height/2200;c.setTransform(sx,0,0,sy,0,0);c.drawImage(this.back,0,0);
  for(const p of farm.s.plots.slice(0,farm.unlocked)){this.rect(c,p.x-23,p.y-23,46,46,farm.s.plots[p.id].crop?'#668847':'#ad875c');}
  for(const b of farm.s.buildings){const p=b;this.rect(c,p.x-38,p.y-32,76,64,'#ad7f59');}
  const r=this.camera.bounds;c.lineWidth=20;c.strokeStyle='#f3df97';c.strokeRect(r.left,r.top,r.width,r.height);
 }
}
