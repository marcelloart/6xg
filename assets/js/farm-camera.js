'use strict';
// Ground-plane coordinates stay identical to the saved farm and the 2D fallback.
class FarmCamera {
 constructor(){this.x=1590;this.y=1135;this.zoom=1.05;this.width=1;this.height=1;this.yaw=0;this.tilt=40*Math.PI/180;}
 get sinTilt(){return Math.sin(this.tilt);}
 get minZoom(){const c=Math.abs(Math.cos(this.yaw)),s=Math.abs(Math.sin(this.yaw));return Math.max(.4,(c*this.width+s*this.height/this.sinTilt)/3200,(s*this.width+c*this.height/this.sinTilt)/2200);}
 resize(w,h){this.width=Math.max(1,w);this.height=Math.max(1,h);this.clamp();}
 clamp(){this.zoom=Math.max(this.minZoom,Math.min(2.6,this.zoom));const c=Math.abs(Math.cos(this.yaw)),s=Math.abs(Math.sin(this.yaw)),hx=(c*this.width+s*this.height/this.sinTilt)/(2*this.zoom),hy=(s*this.width+c*this.height/this.sinTilt)/(2*this.zoom);this.x=Math.max(hx,Math.min(3200-hx,this.x));this.y=Math.max(hy,Math.min(2200-hy,this.y));}
 focus(x,y){this.x=x;this.y=y;this.clamp();}
 screenToWorld(x,y){const right=(x-this.width/2)/this.zoom,forward=(y-this.height/2)/(this.zoom*this.sinTilt),c=Math.cos(this.yaw),s=Math.sin(this.yaw);return{x:this.x+c*right+s*forward,y:this.y-s*right+c*forward};}
 worldToScreen(x,y,elevation=0){const dx=x-this.x,dy=y-this.y,c=Math.cos(this.yaw),s=Math.sin(this.yaw);return{x:this.width/2+(c*dx-s*dy)*this.zoom,y:this.height/2+(this.sinTilt*(s*dx+c*dy)-Math.cos(this.tilt)*elevation)*this.zoom};}
 pan(dx,dy){const a=this.screenToWorld(0,0),b=this.screenToWorld(dx,dy);this.x-=b.x-a.x;this.y-=b.y-a.y;this.clamp();}
 zoomAt(factor,x=this.width/2,y=this.height/2){const before=this.screenToWorld(x,y);this.zoom*=factor;this.clamp();const after=this.screenToWorld(x,y);this.x+=before.x-after.x;this.y+=before.y-after.y;this.clamp();}
 rotate(delta){this.yaw=(this.yaw+delta)%(2*Math.PI);this.clamp();}
 home(){this.yaw=0;this.tilt=40*Math.PI/180;this.focus(1590,1135);}
 get corners(){return[[0,0],[this.width,0],[this.width,this.height],[0,this.height]].map(([x,y])=>this.screenToWorld(x,y));}
 get bounds(){const p=this.corners,x=p.map(v=>v.x),y=p.map(v=>v.y);return{left:Math.min(...x),top:Math.min(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)};}
}
