import * as THREE from 'three';

// Each tier is actual architecture. Its footprint stays within the player's
// existing reserved plot, so upgrading never moves neighbours or planted crops.
const box=new THREE.BoxGeometry(1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,24);
const ball=new THREE.SphereGeometry(1,16,12);
const TAU=Math.PI*2;
function part(g,geometry,material,x,y,z,w=1,h=w,d=w,rx=0,ry=0,rz=0){
 if(![box,cylinder,ball].includes(geometry))geometry.userData.buildingOwned=true;
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
const block=(g,m,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>part(g,box,m,x,y,z,w,h,d,rx,ry,rz);
function beam(g,m,a,b,r=1){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=part(g,cylinder,m,0,0,0,r,delta.length(),r);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function face(g,m,points,z,back=false){
 const p=[],uv=[];for(const [x,y]of points){p.push(x,y,z);uv.push((x+80)/160,y/160);}
 const indices=[];for(let i=1;i<points.length-1;i++)indices.push(...(back?[0,i+1,i]:[0,i,i+1]));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return part(g,geometry,m,0,0,0);
}
function roof(g,m,w,d,eaves,rise,{x=0,z=0,gambrel=false,roofMaterial=m.roof,wallMaterial=m.plaster}={}){
 const half=w/2+4,profile=gambrel?[[0,eaves+rise],[half*.62,eaves+rise*.72],[half,eaves]]:[[0,eaves+rise],[half,eaves]];
 for(const side of[-1,1])for(let i=0;i<profile.length-1;i++){
  const [a,ya]=profile[i],[b,yb]=profile[i+1],angle=Math.atan2(yb-ya,side*(b-a));
  block(g,roofMaterial,x+side*(a+b)/2,(ya+yb)/2,z,Math.hypot(b-a,yb-ya),3,d+8,0,0,side>0?angle:Math.PI+angle);
  // Courses and ridge pieces follow the pitch, including both gambrel slopes.
  for(let course=0;course<3;course++){const t=(course+.4)/3,xx=a+(b-a)*t,yy=ya+(yb-ya)*t;block(g,m.darkWood,x+side*xx,yy+2,z,1.6,1.5,d+9,0,0,side>0?angle:Math.PI+angle);}
 }
 const outline=gambrel?[[-w/2,eaves],[w/2,eaves],[w*.31,eaves+rise*.72],[0,eaves+rise],[-w*.31,eaves+rise*.72]]:[[-w/2,eaves],[w/2,eaves],[0,eaves+rise]];
 for(const front of[-1,1])face(g,wallMaterial,outline.map(([xx,yy])=>[xx+x,yy]),z+front*d/2,front<0);
 block(g,m.darkWood,x,eaves+rise+2,z,4,4,d+10);
}
function window(g,m,x,y,z,w=17,h=21){
 block(g,m.darkWood,x,y,z,w+5,h+5,3);block(g,m.window||m.glass,x,y,z+2,w,h,1.5);
 block(g,m.plaster,x,y,z+3,1.3,h+1,1);block(g,m.plaster,x,y,z+3,w+1,1.3,1);block(g,m.stone,x,y-h/2-2,z+3,w+7,3,6);
}
function door(g,m,x,z,w=23,h=40,y=13,barn=false){
 block(g,m.darkWood,x,y+h/2,z,w+6,h+5,4);block(g,m.wood,x,y+h/2,z+3,w,h,2);
 for(let i=0;i<5;i++)block(g,m.darkWood,x-w/2+(i+.5)*w/5,y+h/2,z+4,.6,h,1);
 for(const yy of[y+6,y+h-6])block(g,m.iron,x,yy,z+5,w,2,1);
 if(barn){beam(g,m.plaster,[x-w/2+2,y+2,z+5],[x+w/2-2,y+h-2,z+5],1);beam(g,m.plaster,[x+w/2-2,y+2,z+5],[x-w/2+2,y+h-2,z+5],1);}
 else part(g,ball,m.iron,x+w*.3,y+h*.46,z+6,1.3);
}
function chimney(g,m,x,z,top,level){const height=28+level*4;block(g,m.stone,x,top+height*.2,z,13,height,13);for(let y=top-height*.2;y<top+height*.7;y+=7)block(g,m.darkWood,x,y,z,13.5,.8,13.5);block(g,m.stone,x,top+height*.7,z,18,4,18);block(g,m.iron,x,top+height*.7+3,z,9,3,9);}
function dormer(g,m,x,z,base,w=25,depth=21){block(g,m.plaster,x,base+10,z,w,20,depth);roof(g,m,w,depth,base+20,12,{x,z});window(g,m,x,base+12,z+depth/2+1,w-10,12);}
function cupola(g,m,y,w=24,d=24,z=0){
 block(g,m.stone,0,y,z,w+5,4,d+5);block(g,m.plaster,0,y+13,z,w,22,d);
 for(const side of[-1,1]){block(g,m.darkWood,side*(w/2-1),y+13,z,2,22,d+1);for(let yy=y+6;yy<y+22;yy+=4)block(g,m.iron,0,yy,z+side*(d/2+1),w-8,1.5,1);}
 roof(g,m,w,d,y+25,13,{z});beam(g,m.iron,[0,y+40,z],[0,y+54,z],.7);block(g,m.iron,6,y+49,z,12,2,1);part(g,ball,m.iron,0,y+42,z,2);
}
function terrace(g,m,w,d,z,y=12,rails=false){
 block(g,m.stone,0,y-3,z,w+6,6,d+4);for(let x=-w/2+4;x<w/2;x+=9)block(g,m.wood,x,y+1,z,8,2,d);
 for(let i=0;i<3;i++)block(g,m.stone,0,3+i*3,z+d/2+5-i*2,27,3,7);
 if(rails)for(const side of[-1,1]){const x=side*(w/2-2);for(const zz of[z-d/2,z,z+d/2])block(g,m.darkWood,x,y+12,zz,2.5,24,2.5);for(const yy of[y+7,y+22])block(g,m.wood,x,yy,z,2,2,d);}
}
function solidBuilding(g,r,kind,level){
 const m=r.materials,storage=['barn','shed'].includes(kind),workshop=['kitchen','juicery','bakery'].includes(kind),barn=kind==='barn',shed=kind==='shed',home=kind==='house';
 const w=(barn?[0,108,110,116,122,126]:shed?[0,84,78,82,86,90]:[0,96,92,96,100,104])[level];
 const d=(barn?[0,92,78,82,84,88]:shed?[0,74,60,62,64,66]:[0,74,60,62,64,66])[level];
 const h=(barn?[0,68,80,96,116,132]:shed?[0,58,68,84,102,120]:[0,58,66,84,105,124])[level],z=-6,eaves=h+12,rise=barn&&level>=3?32:28;
 block(g,m.stone,0,7,z,w+10,14,d+10);
 block(g,storage&&level<4?m.wood:m.plaster,0,h/2+12,z,w,h,d);
 // Masonry foundations, timber framing and upper storeys replace the old walls.
 for(const x of[-w/2,w/2])for(const zz of[z-d/2,z+d/2])block(g,level>=4?m.stone:m.darkWood,x,h/2+12,zz,level>=4?7:5,h+3,5);
 for(let y=20;y<eaves;y+=storage?10:22)for(const side of[-1,1])block(g,m.darkWood,0,y,z+side*(d/2+.7),w,storage?1.2:3,1.5);
 if(level>=3){const floor=level===3?58:70;for(const side of[-1,1])block(g,m.stone,0,floor,z+side*(d/2+1),w+6,4,3);for(const x of[-w*.28,0,w*.28])window(g,m,x,eaves-17,z+d/2+2,storage?13:17,17);}
 const front=z+d/2;door(g,m,0,front+2,barn?42:shed?32:24,level>=4?46:40,13,storage);
 if(!shed)for(const x of[-w*.3,w*.3])window(g,m,x,42,front+2,17,21);
 for(const side of[-1,1]){
  const wall=new THREE.Group();wall.position.set(side*(w/2+1),0,z);wall.rotation.y=side*Math.PI/2;
  for(const xx of[-d*.24,d*.24]){window(wall,m,xx,42,0,shed?12:17,20);if(level>=3)window(wall,m,xx,eaves-18,0,shed?12:17,18);}
  g.add(wall);
  if(level>=3){for(const zz of[z-d*.3,z+d*.3])block(g,m.darkWood,side*(w/2+1),h/2+12,zz,2,h,3);beam(g,m.darkWood,[side*(w/2+1.5),18,z-d/2+5],[side*(w/2+1.5),level>=4?66:eaves-12,z+d/2-5],1.2);}
 }
 roof(g,m,w,d,eaves,rise,{z,gambrel:storage&&level>=3,wallMaterial:storage?m.wood:m.plaster});
 const porchW=storage?w*.8:w-8,porchZ=front+(storage?8:11);terrace(g,m,porchW,storage?12:14,porchZ,12,level>=3);
 if(home||workshop){
  for(const x of[-porchW/2+3,porchW/2-3])block(g,level>=4?m.stone:m.darkWood,x,34,porchZ+5,level>=4?6:3,45,4);
  if(level===2)block(g,m.roof,0,59,porchZ,w-2,3,21,.13);
  else roof(g,m,porchW-4,18,58,level>=4?16:10,{z:porchZ});
 }
 if(level>=3&&!storage)dormer(g,m,0,front+2,eaves+6,level>=4?32:25,23);
 if(level>=4){
  if(storage)dormer(g,m,0,front+2,eaves+4,34,28);
  else for(const side of[-1,1])dormer(g,m,side*w*.3,front-2,eaves+6,22,21);
 }
 if(level===5)cupola(g,m,eaves+rise+2,storage?26:23,25,z-12);
 if(home){chimney(g,m,w*.29,z-d*.22,eaves+15,level);for(const x of[-porchW/2+8,porchW/2-8]){part(g,cylinder,m.soil,x,20,porchZ+2,7,13,7);part(g,ball,m.green,x,32,porchZ+2,10,10,9);}if(level>=4){block(g,m.stone,0,72,front+10,w*.55,4,17);for(const x of[-w*.27,w*.27])block(g,m.iron,x,81,front+17,2,18,2);block(g,m.iron,0,89,front+17,w*.56,2,2);}}
 if(workshop){
  const stripe=kind==='juicery'?m.green:m.red;for(let i=0;i<9;i++)block(g,i%2?m.plaster:stripe,(i-4)*(porchW/9),55,porchZ,porchW/9,2.5,19,.15);
  block(g,m.darkWood,0,30,porchZ,porchW-8,7,13);part(g,new THREE.PlaneGeometry(60,15),r.workshopSign(kind),0,level>=3?61:70,front+3);
  if(kind==='juicery'){for(const x of[-27,27]){part(g,cylinder,m.wood,x,18,porchZ,8,24,8);for(const y of[8,27])part(g,new THREE.TorusGeometry(8,1,6,20),m.iron,x,y,porchZ,1,1,1,Math.PI/2);part(g,ball,r.fruitMaterials.orange,x,32,porchZ,4);}if(level>=4){block(g,m.iron,26,46,porchZ,12,22,11);beam(g,m.iron,[18,58,porchZ],[34,58,porchZ],1);}}
  else{chimney(g,m,-w*.3,z-d*.2,eaves+14,level);block(g,m.stone,-27,23,porchZ,20,25,15);block(g,m.iron,-27,23,porchZ+8,13,14,1.5);if(kind==='bakery'){for(let i=0;i<3;i++)part(g,ball,m.straw,5+i*12,35,porchZ,5,3,4);}else{part(g,cylinder,m.iron,20,38,porchZ,7,9,7);part(g,ball,r.fruitMaterials.carrot,20,43,porchZ,4,1,4);}}
 }
 if(storage){
  for(const x of[-w*.32,w*.32]){block(g,m.wood,x,22,porchZ,16,18,14);for(const yy of[15,29])block(g,m.iron,x,yy,porchZ+7.5,16,1.2,1);}
  if(level>=3){beam(g,m.iron,[0,eaves-14,front+3],[0,eaves-14,front+13],1);beam(g,m.straw,[0,eaves-14,front+13],[0,49,front+13],.5);part(g,cylinder,m.iron,0,eaves-15,front+13,3,3,3,Math.PI/2);}
 }
}
function well(g,r,level){
 const m=r.materials,radius=level>=4?20:26,z=level>=4?15:0;
 part(g,new THREE.CylinderGeometry(40,42,6,8),m.stone,0,3,0);
 part(g,new THREE.CylinderGeometry(radius,radius+3,27,24,1,true),m.stone,0,20,z);
 part(g,cylinder,m.glass,0,11,z,radius-1,2,radius-1);
 for(let a=0;a<TAU;a+=TAU/14)block(g,m.stone,(radius+1)*Math.cos(a),34,z+(radius+1)*Math.sin(a),10,6,8,0,-a);
 if(level<4){for(const x of[-32,32])for(const zz of[level===3?-22:0,...(level===3?[22]:[])])block(g,level===3?m.stone:m.darkWood,x,45,zz,level===3?7:5,82,5);roof(g,m,70,level===3?66:48,88,level===3?28:22);beam(g,m.iron,[-33,65,0],[33,65,0],2);beam(g,m.straw,[0,65,0],[0,26,0],.6);part(g,cylinder,m.iron,0,25,0,7,12,7);if(level===3){part(g,cylinder,m.iron,31,46,15,3,35,3);beam(g,m.iron,[31,62,15],[20,62,15],2);beam(g,m.iron,[31,55,15],[36,67,15],1.1);}}
 else{
  const height=level===4?84:110,tankY=height+25,tankRadius=level===4?20:25;
  for(const x of[-25,25])for(const zz of[-35,12]){block(g,level===5?m.stone:m.darkWood,x,height/2,zz,level===5?7:5,height,5);beam(g,m.iron,[x,8,-35],[x,height-6,12],1.2);}
  block(g,m.darkWood,0,height,-12,58,5,54);part(g,cylinder,m.iron,0,tankY,-12,tankRadius,45,tankRadius);
  for(const y of[tankY-17,tankY+17])part(g,new THREE.TorusGeometry(tankRadius,.9,8,32),m.stone,0,y,-12,1,1,1,Math.PI/2);
  roof(g,m,52,48,tankY+24,level===5?23:14,{z:-12});beam(g,m.iron,[22,tankY,-12],[22,28,20],1.8);beam(g,m.iron,[22,28,20],[10,28,20],1.8);
  for(const x of[-32,-21])beam(g,m.iron,[x,6,-29],[x,height+8,-29],1);for(let y=8;y<height;y+=9)beam(g,m.iron,[-32,y,-29],[-21,y,-29],.8);
  if(level===5){block(g,m.stone,0,45,15,16,4,4);part(g,ball,m.iron,0,42,18,3);}
 }
}
function pen(g,r,kind,level){
 const m=r.materials,cow=kind==='cowshed',w=cow?146:116,d=cow?142:122;
 block(g,m.soil,0,1,0,w,2,d);block(g,m.stone,0,3,-d*.28,w-8,4,d*.38);
 const sw=w-(level===2?28:16),sd=level>=4?d*.51:d*.39,zz=-d/2+sd/2+5,h=[0,58,65,78,94,113][level];
 for(const x of[-sw/2,sw/2])block(g,level>=4?m.stone:m.wood,x,h/2,zz,5,h,sd);
 block(g,level>=4?m.plaster:m.wood,0,h/2,zz-sd/2,sw,h,4);
 const loft=level>=3?27:0;if(loft)block(g,m.wood,0,h-loft/2,zz,sw,loft,sd);
 for(const x of[-sw/2,0,sw/2])block(g,m.darkWood,x,h/2,zz+sd/2,4,h,4);
 roof(g,m,sw,sd,h+2,level>=4?31:24,{z:zz,gambrel:level>=4,wallMaterial:m.wood});
 if(level>=3){for(const x of[-sw*.28,sw*.28])window(g,m,x,h-14,zz+sd/2+2,16,14);block(g,m.stone,0,h-loft,zz,sw,4,sd);}
 if(level>=4){for(const x of[-sw/2,sw/2])block(g,m.darkWood,x,35,8,4,70,4);block(g,m.roof,0,73,8,sw+6,3,30,.1);}
 if(level===5)cupola(g,m,h+35,25,25,zz);
 for(const x of[-w/2,w/2]){for(let z=-d/2;z<=d/2;z+=d/4)block(g,level>=3?m.stone:m.darkWood,x,18,z,level>=4?6:4,36,4);for(const y of[11,27])block(g,level>=4?m.iron:m.wood,x,y,0,3,3,d);}
 for(const z of[-d/2,d/2]){for(let x=-w/2;x<=w/2;x+=w/4)block(g,level>=3?m.stone:m.darkWood,x,18,z,4,36,4);for(const y of[11,27])block(g,level>=4?m.iron:m.wood,0,y,z,w,3,3);}
 const troughX=w/2-16;block(g,m.stone,troughX,8,6,22,16,37);block(g,m.straw,troughX,17,6,18,2,32);
 if(!cow){for(let i=0;i<level+1;i++){const x=(i-level/2)*16;block(g,m.wood,x,10,zz+5,15,20,18);block(g,m.straw,x,8,zz+15,11,9,5);block(g,m.darkWood,x,17,zz+15,10,2,1);}for(let i=0;i<5;i++)block(g,m.wood,-sw*.27,11-i*1.7,zz+sd/2+4+i*4,17,2,5);}
 if(level===5){for(const x of[-24,24]){block(g,m.stone,x,26,d/2,8,52,8);block(g,m.roof,x,54,d/2,11,3,11);part(g,ball,m.window||m.glass,x,49,d/2+4,3,4,3);}block(g,m.iron,0,40,d/2,40,3,2);}
}
function greenhouse(g,r,level){
 const m=r.materials;
 r.upgradeGlass??=new THREE.MeshPhysicalMaterial({color:'#c9ded7',roughness:.13,metalness:0,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.8});
 const glass=r.upgradeGlass,frame=level>=3?m.iron:m.darkWood,w=[0,104,112,120,132,142][level],d=[0,80,88,96,106,116][level],h=[0,62,72,84,96,110][level],rise=level>=4?34:28;
 block(g,m.stone,0,4,0,w+8,8,d+8);for(let x=-w/2+8;x<w/2;x+=16)for(let z=-d/2+8;z<d/2;z+=16)block(g,m.plaster,x,8.5,z,15,1,15);
 for(const side of[-1,1]){
  const x=side*w/2;for(let z=-d/2;z<=d/2+.1;z+=d/5)block(g,frame,x,h/2+8,z,2.5,h,2.5);
  for(const y of[12,h*.55,h+8])block(g,frame,x,y,0,3,2,d+2);
  const pane=block(g,glass,x,h/2+8,0,.7,h-4,d);pane.castShadow=false;
  const half=w/2,length=Math.hypot(half,rise),angle=Math.atan2(rise,half);
  const roofPane=block(g,glass,side*w/4,h+8+rise/2,0,length,.7,d+4,0,0,-side*angle);roofPane.castShadow=false;
  for(let z=-d/2;z<=d/2+.1;z+=d/5)beam(g,frame,[0,h+8+rise,z],[side*w/2,h+8,z],1.2);
 }
 for(const z of[-d/2,d/2]){for(const x of[-w/2,-w/3,-w/6,0,w/6,w/3,w/2])block(g,frame,x,h/2+8,z,2,h,2);block(g,glass,0,h/2+8,z,w,h-4,.6).castShadow=false;face(g,glass,[[-w/2,h+8],[w/2,h+8],[0,h+8+rise]],z,z<0).castShadow=false;block(g,frame,0,h+8,z,w,2,2);}
 block(g,frame,0,h+rise+9,0,3,3,d+6);door(g,m,0,d/2+2,23,45,9);
 if(level>=3){const yy=h+rise+8;block(g,m.plaster,0,yy+5,0,34,10,d*.7);for(const z of[-d*.3,0,d*.3])window(g,m,0,yy+5,z,20,6);roof(g,m,34,d*.72,yy+12,11,{roofMaterial:glass});}
 if(level>=4){for(const x of[-w*.27,w*.27])dormer(g,{...m,plaster:glass,roof:glass},x,d*.24,h+13,27,25);for(const x of[-w/2,w/2])block(g,m.stone,x,h/2+9,d/2,5,h+2,5);}
 if(level===5){const top=h+rise+33;part(g,new THREE.SphereGeometry(15,24,12,0,TAU,0,Math.PI/2),glass,0,top,0);for(let a=0;a<TAU;a+=TAU/8)beam(g,frame,[Math.cos(a)*15,top,Math.sin(a)*15],[0,top+15,0],.7);beam(g,frame,[0,top+15,0],[0,top+26,0],.7);part(g,ball,m.stone,0,top+23,0,2);}
 for(const x of[-w*.31,w*.31])for(const z of[-d*.3,0,d*.26]){block(g,m.wood,x,14,z,23,11,22);block(g,m.soil,x,20,z,20,1,19);const plant=r.makeCrop(z<0?'grape':'orange',.7);plant.scale.setScalar(level===5?.46:.38);plant.position.set(x,20,z);g.add(plant);}
 for(const x of[-w*.31,w*.31]){block(g,m.wood,x,27,-d*.42,30,3,12);for(const xx of[x-11,x+11])block(g,frame,xx,18,-d*.42,2,18,2);}
 // Living beds and stone planters preserve the botanical feel of the starter
 // conservatory as the glasshouse gains more rooms and ventilation above it.
 for(const x of[-w/2+10,w/2-10]){part(g,cylinder,m.stone,x,10,d/2+6,5,13,5);const plant=r.makeCrop('strawberry',1);plant.scale.setScalar(.33);plant.position.set(x,17,d/2+6);g.add(plant);}
 part(g,new THREE.CylinderGeometry(10,12,5,24),m.stone,0,13,-d*.18);part(g,cylinder,m.glass,0,16,-d*.18,9,.7,9);part(g,cylinder,m.iron,0,23,-d*.18,1.3,14,1.3);part(g,ball,m.stone,0,30,-d*.18,3);
}
function scaffold(g,m,width,depth,roofY){
 const side=width/2-6,front=depth/2-7;for(const x of[-side,side]){for(const z of[-front,front])block(g,m.wood,x,roofY/2,z,2.5,roofY,2.5);beam(g,m.wood,[x,12,-front],[x,roofY-6,front],1);for(let y=35;y<roofY;y+=35)block(g,m.wood,x,y,0,8,2,depth-14);}
}
export function upgradedBuilding(renderer,kind,level,upgrading,footprint,merge){
 const group=new THREE.Group();group.userData.buildingKind=kind;group.userData.buildingLevel=level;
 if(kind==='well')well(group,renderer,level);
 else if(kind==='coop'||kind==='cowshed')pen(group,renderer,kind,level);
 else if(kind==='greenhouse')greenhouse(group,renderer,level);
 else solidBuilding(group,renderer,kind,level);
 const bounds=new THREE.Box3().setFromObject(group);group.userData.roofHeight=bounds.max.y;
 if(upgrading)scaffold(group,renderer.materials,footprint.w,footprint.h,bounds.max.y+5);
 // These architectural parts are static; foliage still uses its shared wind
 // material. Flatten transforms before batching to keep phone draw calls low.
 group.updateMatrixWorld(true);const nested=[];group.traverse(o=>{if(o.isMesh&&o.parent!==group)nested.push(o);});for(const mesh of nested)group.attach(mesh);for(const child of [...group.children])if(child.isGroup)group.remove(child);
 const model=merge(group);model.traverse(o=>{if(o.isMesh&&o.material.transparent)o.castShadow=false;});return model;
}
