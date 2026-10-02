'use strict';
// Long presses consume the original click, so moving a crop cannot harvest it.
class FarmPickupGesture {
 constructor(camera,gestures,handlers,timers={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}){this.camera=camera;this.gestures=gestures;this.handlers=handlers;this.timers=timers;this.pointers=new Map();this.wait=null;this.carry=null;}
 clearWait(){if(this.wait)this.timers.clear(this.wait.timer);this.wait=null;this.handlers.hold?.(null);}
 reset(){this.clearWait();this.carry=null;this.pointers.clear();this.gestures.pointers.clear();}
 down(id,x,y){
  if(!this.handlers.enabled())return;
  this.pointers.set(id,{x,y});
  if(this.pointers.size>1){this.clearWait();if(this.handlers.active()){const pointers=[...this.pointers];this.handlers.cancel();this.pointers=new Map(pointers);this.carry=null;this.gestures.pointers.clear();for(const [key,p]of this.pointers)this.gestures.down(key,p.x,p.y);}else this.gestures.down(id,x,y);return;}
  if(this.handlers.active()){this.carry={id,x,y,moved:false,bornHolding:false};this.handlers.move(this.camera.screenToWorld(x,y));return;}
  this.gestures.down(id,x,y);
  const target=this.handlers.pick(this.camera.screenToWorld(x,y));if(!target)return;
  const wait=this.wait={id,x,y,target,timer:null};this.handlers.hold?.({x,y});
  wait.timer=this.timers.set(()=>{if(this.wait!==wait)return;if(this.pointers.size!==1||!this.handlers.enabled()){this.clearWait();return;}this.clearWait();this.gestures.cancel(id);if(this.handlers.lift(target,this.camera.screenToWorld(x,y)))this.carry={id,x,y,moved:false,bornHolding:true};},3000);
 }
 move(id,x,y){
  if(this.pointers.has(id))this.pointers.set(id,{x,y});
  if(this.handlers.active()&&this.pointers.size<=1){if(this.carry&&Math.hypot(x-this.carry.x,y-this.carry.y)>5)this.carry.moved=true;this.handlers.move(this.camera.screenToWorld(x,y));return;}
  if(this.wait&&Math.hypot(x-this.wait.x,y-this.wait.y)>5)this.clearWait();
  this.gestures.move(id,x,y);
 }
 up(id,x,y){
  this.pointers.delete(id);
  if(this.carry?.id===id){const carry=this.carry;this.carry=null;this.gestures.cancel(id);this.handlers.move(this.camera.screenToWorld(x,y));if(carry.moved||!carry.bornHolding)this.handlers.drop();return;}
  if(this.wait?.id===id)this.clearWait();this.gestures.up(id,x,y);
 }
 cancel(id){const moving=this.handlers.active();this.clearWait();this.pointers.delete(id);this.gestures.cancel(id);this.carry=null;if(moving)this.handlers.cancel();}
}
