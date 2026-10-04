'use strict';
const harvestT_farm_pickup_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
// Long presses consume the original click, so moving a crop cannot harvest it.
class FarmPickupGesture {
 constructor(camera,gestures,handlers,timers={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}){this.camera=camera;this.gestures=gestures;this.handlers=handlers;this.timers=timers;this.pointers=new Map();this.wait=null;this.carry=null;this.cursor=null;this.anchorId=null;this.navigating=false;this.pointerType='mouse';}
 clearWait(){if(this.wait)this.timers.clear(this.wait.timer);this.wait=null;this.handlers.hold?.(null);}
 reset(){this.clearWait();this.carry=null;this.cursor=null;this.anchorId=null;this.navigating=false;this.pointers.clear();this.gestures.pointers.clear();}
 follow(x,y){this.cursor={x:Math.max(0,Math.min(this.camera.width,x)),y:Math.max(0,Math.min(this.camera.height,y))};}
 refresh(){if(this.cursor&&this.handlers.active()&&this.handlers.enabled())this.handlers.move(this.camera.screenToWorld(this.cursor.x,this.cursor.y));}
 leave(){if(!this.pointers.size)this.cursor=null;}
 navigate(){this.clearWait();this.navigating=true;this.carry=null;this.gestures.pointers.clear();for(const[id,p]of this.pointers)this.gestures.down(id,p.x,p.y);}
 down(id,x,y,options={}){
  if(!this.handlers.enabled())return;
  this.pointers.set(id,{x,y});
  this.pointerType=options.pointerType||'mouse';
  if(this.pointers.size>1){this.navigate();return;}
  this.anchorId=id;this.follow(x,y);
  if(options.pan){this.navigate();return;}
  if(this.handlers.active()){this.clearWait();this.carry={id,x,y,moved:false,bornHolding:false};this.refresh();return;}
  this.gestures.down(id,x,y);
  const target=this.handlers.pick(this.camera.screenToWorld(x,y));if(!target)return;
  const wait=this.wait={id,x,y,target,timer:null};this.handlers.hold?.({x,y});
  wait.timer=this.timers.set(()=>{if(this.wait!==wait)return;if(this.pointers.size!==1||!this.handlers.enabled()){this.clearWait();return;}this.clearWait();this.gestures.cancel(id);if(this.handlers.lift(target,this.camera.screenToWorld(x,y)))this.carry={id,x,y,moved:false,bornHolding:true};},1500);
 }
 move(id,x,y,options={}){
  if(!this.handlers.enabled())return;
  if(options.pointerType)this.pointerType=options.pointerType;
  if(!this.navigating||id===this.anchorId)this.follow(x,y);
  if(this.navigating){this.gestures.move(id,x,y);if(this.pointers.has(id))this.pointers.set(id,{x,y});this.refresh();return;}
  if(this.pointers.has(id))this.pointers.set(id,{x,y});
  if(this.handlers.active()&&this.pointers.size<=1){if(this.carry&&Math.hypot(x-this.carry.x,y-this.carry.y)>5)this.carry.moved=true;this.refresh();return;}
  if(this.wait&&Math.hypot(x-this.wait.x,y-this.wait.y)>5)this.clearWait();
  this.gestures.move(id,x,y);
 }
 up(id,x,y){
  this.pointers.delete(id);
  if(this.navigating){this.gestures.up(id,x,y,true);this.refresh();if(!this.pointers.size){this.navigating=false;this.anchorId=null;}return;}
  if(this.carry?.id===id){const carry=this.carry;this.carry=null;this.gestures.cancel(id);this.follow(x,y);this.refresh();if(carry.moved||!carry.bornHolding)this.handlers.drop();return;}
  if(this.wait?.id===id)this.clearWait();this.gestures.up(id,x,y);
 }
 cancel(id){const moving=this.handlers.active();this.clearWait();this.pointers.delete(id);this.gestures.cancel(id);this.carry=null;if(!this.pointers.size){this.navigating=false;this.cursor=null;this.anchorId=null;}if(moving)this.handlers.cancel();}
 update(seconds=0){
  if(!this.handlers.active()||!this.handlers.enabled()||!this.cursor)return;
  if(!this.navigating&&(this.pointerType!=='touch'||this.pointers.size)){
   const c=this.camera,p=this.cursor,margin=Math.min(64,c.width*.12,c.height*.12),edge=(v,size)=>Math.max(0,(margin-v)/margin)-Math.max(0,(v-size+margin)/margin),dx=edge(p.x,c.width),dy=edge(p.y,c.height),dt=Math.max(0,Math.min(.05,seconds));
   if(margin>0&&dt&&(dx||dy)){const x=c.x,y=c.y;c.pan(dx*420*dt,dy*420*dt);if(this.carry&&(c.x!==x||c.y!==y))this.carry.moved=true;}
  }
  this.refresh();
 }
}
