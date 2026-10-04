(function(root){'use strict';
 const F=root.BaraFarm;
 function plan(farm,now,preferred='carrot'){
  const jobs={gardener:null,builder:null,neighbor:null},plots=farm.s.plots.slice(0,farm.unlocked),ready=plots.find(p=>p.crop&&p.readyAt<=now&&farm.used+F.CROPS[p.crop].yield<=farm.capacity);
  const crop=[preferred,...Object.keys(F.CROPS)].find(k=>farm.s.seeds[k]>0&&farm.cropUnlocked(k)),empty=crop&&plots.find(p=>!p.crop);
  if(ready)jobs.gardener={key:'harvest:'+ready.id+':'+ready.readyAt,targetKind:'plot',id:ready.id,mode:'tend',action:'harvest',args:{id:ready.id},seconds:4};
  else if(empty)jobs.gardener={key:'plant:'+empty.id+':'+crop,targetKind:'plot',id:empty.id,mode:'tend',action:'plant',args:{id:empty.id,crop},seconds:3};
  const construction=farm.s.buildings.filter(b=>b.readyAt>now||b.upgrade?.readyAt>now).sort((a,b)=>(a.upgrade?.readyAt||a.readyAt)-(b.upgrade?.readyAt||b.readyAt))[0];
  if(construction)jobs.builder={key:'build:'+construction.slot+':'+(construction.upgrade?.readyAt||construction.readyAt),targetKind:'building',slot:construction.slot,mode:'work',construction:true};
  const production=farm.s.production,finished=production.jobs.find(j=>j.readyAt<=now&&farm.used+F.RECIPES[j.recipe].yield<=farm.capacity&&production.goods[j.recipe]+F.RECIPES[j.recipe].yield<=10000);
  if(finished)jobs.neighbor={key:'collect:'+finished.id,targetKind:'building',slot:finished.slot,mode:'work',action:'collect',args:{id:finished.id},seconds:2};
  else{
   const cooking=production.jobs.filter(j=>j.startedAt<=now&&j.readyAt>now).sort((a,b)=>a.readyAt-b.readyAt)[0];
   if(cooking)jobs.neighbor={key:'cook:'+cooking.id,targetKind:'building',slot:cooking.slot,mode:'work'};
   else for(const b of farm.s.buildings){if(b.readyAt>now||production.jobs.some(j=>j.slot===b.slot))continue;const recipe=Object.keys(F.RECIPES).find(key=>F.RECIPES[key].building===b.kind&&farm.productionQuote(b.slot,key).ok);if(recipe){jobs.neighbor={key:'production:'+b.slot+':'+recipe,targetKind:'building',slot:b.slot,mode:'work',action:'production',args:{slot:b.slot,recipe},seconds:5};break;}}
  }
  return jobs;
 }
 class Work {
  constructor({getFarm,enabled,run,clock=Date.now,preferred=()=> 'carrot',identity=()=>null}){Object.assign(this,{getFarm,enabled,run,clock,preferred,identity});this.busy=false;this.retryAt=0;this.background={};}
  plans(){const jobs=this.enabled()?plan(this.getFarm(),this.clock(),this.preferred()):{gardener:null,builder:null,neighbor:null};for(const job of Object.values(jobs))if(job)job.owner=this.identity();return jobs;}
  async complete(job){if(!job?.action||!this.enabled()||this.busy||this.clock()<this.retryAt||job.owner!==this.identity())return false;const farm=this.getFarm(),plans=this.plans();if(!Object.values(plans).some(p=>p?.key===job.key))return false;this.busy=true;this.retryAt=this.clock()+4000;try{return await this.run(job,farm);}catch{return false;}finally{this.busy=false;}}
  tick(background=false){const plans=this.plans();if(!background||!this.enabled()){this.background={};return plans;}const now=this.clock();for(const [role,job]of Object.entries(plans)){if(!job?.action){delete this.background[role];continue;}let pending=this.background[role];if(pending?.key!==job.key)pending=this.background[role]={key:job.key,at:now+12000};if(now>=pending.at){pending.at=now+12000;void this.complete(job);}}return plans;}
 }
 root.FarmResidentWork=Object.freeze({plan,Work});
})(typeof window!=='undefined'?window:globalThis);
