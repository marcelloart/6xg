'use strict';
const WORLD=WORLD_DATA.bounds;
class MapCamera {
 constructor(){this.x=WORLD.originX+493;this.y=WORLD.originY+365;this.zoom=1;this.width=1;this.height=1;}
 get minZoom(){return Math.max(.28,this.width/WORLD.width,this.height/WORLD.height);}
 resize(width,height){this.width=Math.max(1,width);this.height=Math.max(1,height);this.zoom=Math.max(this.minZoom,Math.min(2,this.zoom));this.clamp();}
 clamp(){const halfW=this.width/(2*this.zoom),halfH=this.height/(2*this.zoom);this.x=Math.max(halfW,Math.min(WORLD.width-halfW,this.x));this.y=Math.max(halfH,Math.min(WORLD.height-halfH,this.y));}
 focus(x,y){this.x=x;this.y=y;this.clamp();}
 pan(dx,dy){this.x-=dx/this.zoom;this.y-=dy/this.zoom;this.clamp();}
 screenToWorld(x,y){return{x:this.x+(x-this.width/2)/this.zoom,y:this.y+(y-this.height/2)/this.zoom};}
 worldToScreen(x,y){return{x:(x-this.x)*this.zoom+this.width/2,y:(y-this.y)*this.zoom+this.height/2};}
 zoomAt(factor,x=this.width/2,y=this.height/2){const point=this.screenToWorld(x,y);this.zoom=Math.max(this.minZoom,Math.min(2,this.zoom*factor));this.x=point.x-(x-this.width/2)/this.zoom;this.y=point.y-(y-this.height/2)/this.zoom;this.clamp();}
 get bounds(){return{left:this.x-this.width/(2*this.zoom),top:this.y-this.height/(2*this.zoom),width:this.width/this.zoom,height:this.height/this.zoom};}
}
// Pointer gestures share the same behavior for mouse, pen, and touch.
class MapGesture {
 constructor(camera,onSelect=()=>{}){this.camera=camera;this.onSelect=onSelect;this.pointers=new Map();}
 down(id,x,y){this.pointers.set(id,{x,y,startX:x,startY:y,moved:false});if(this.pointers.size>1)for(const p of this.pointers.values())p.moved=true;}
 move(id,x,y){const p=this.pointers.get(id);if(!p)return;const previous=[...this.pointers.values()].map(v=>({...v}));const dx=x-p.x,dy=y-p.y;p.x=x;p.y=y;if(this.pointers.size===1){if(Math.hypot(x-p.startX,y-p.startY)>5)p.moved=true;if(p.moved)this.camera.pan(dx,dy);}else if(this.pointers.size===2){const next=[...this.pointers.values()];const mid=list=>({x:(list[0].x+list[1].x)/2,y:(list[0].y+list[1].y)/2});const before=mid(previous),after=mid(next),distance=list=>Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);this.camera.pan(after.x-before.x,after.y-before.y);const oldDistance=distance(previous);if(oldDistance>1)this.camera.zoomAt(distance(next)/oldDistance,after.x,after.y);}}
 up(id,x,y,cancelled=false){const p=this.pointers.get(id);if(!p)return;const select=!cancelled&&!p.moved&&this.pointers.size===1&&Math.hypot(x-p.startX,y-p.startY)<=5;this.pointers.delete(id);for(const remaining of this.pointers.values()){remaining.startX=remaining.x;remaining.startY=remaining.y;remaining.moved=true;}if(select)this.onSelect(this.camera.screenToWorld(x,y));}
 cancel(id){this.pointers.delete(id);for(const p of this.pointers.values())p.moved=true;}
}

