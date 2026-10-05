(function(root){'use strict';
 function next(c,now,stage,hasRoom){
  if(!c)return null;
  if(stage==='bite'&&now>=c.biteAt+150)return{type:'fish-hook',id:c.id,key:c.id+':hook'};
  if(stage==='pull'&&now>=c.hookedAt+(c.reels+1)*3000-600)return{type:'fish-reel',id:c.id,key:c.id+':reel:'+c.reels};
  if(stage==='landed'&&hasRoom)return{type:'fish-reel',id:c.id,key:c.id+':keep'};
  return null;
 }
 class Pull{
  constructor({enabled,getFarm,clock,identity,stage,run}){Object.assign(this,{enabled,getFarm,clock,identity,stage,run});this.pending=null;this.lastKey=null;this.lastAttempt=-Infinity;this.currentIdentity=null;}
  tick(){
   const identity=this.identity();if(identity!==this.currentIdentity){this.currentIdentity=identity;this.lastKey=null;this.lastAttempt=-Infinity;}
   if(!identity||!this.enabled()||this.pending)return;
   const farm=this.getFarm(),now=this.clock(),c=farm.s.fishing.cast,job=next(c,now,this.stage(c,now),farm.used<farm.capacity);
   if(!job||job.key===this.lastKey&&now-this.lastAttempt<800)return;
   this.lastKey=job.key;this.lastAttempt=now;
   const pending={identity,farm};this.pending=pending;
   Promise.resolve().then(()=>{if(this.pending!==pending||identity!==this.identity()||farm!==this.getFarm()||!this.enabled())return false;return this.run(job,farm);}).catch(()=>false).finally(()=>{if(this.pending===pending)this.pending=null;});
  }
 }
 root.FarmFishingAuto=Object.freeze({Pull,next});
})(typeof globalThis!=='undefined'?globalThis:window);
