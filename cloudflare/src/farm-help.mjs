import {sharedRow} from './farm-sharing.mjs';
// Two farms and the sender's receipt commit in one D1 transaction.
// Revisions protect both players; an old retry cannot transfer another gift.
export async function prepareHelp(db,uid,action,farm,now,serverFarm){
 const F=globalThis.BaraFarm,a=action.args,row=await sharedRow(db,a.code);
 const deny=message=>({ok:false,message});
 if(!row||row.user_id===uid||!farm.s.social.friends.includes(a.code))return deny('Tambahkan kebun teman yang membuka kunjungan terlebih dahulu.');
 const target=serverFarm(JSON.parse(row.save),now),c=farm.s.community;
 let result;
 if(action.type==='friend-water'){
  const p=target.s.plots[a.plot];
  if(c.helped.length>=5)return deny('Bantuan hari ini sudah mencapai batas 5 tanaman.');
  if(!p||p.id>=target.unlocked||!p.crop||p.readyAt<=now||p.wateredAt)return deny('Pilih tanaman yang masih tumbuh dan belum disiram teman.');
  if(c.helped.some(v=>v.code===a.code&&v.plot===a.plot&&v.plantedAt===p.plantedAt))return deny('Tanaman ini sudah kamu bantu.');
  p.wateredAt=now;p.readyAt-=Math.min(F.CROPS[p.crop].minutes*6000,p.readyAt-now);
  c.helped.push({code:a.code,plot:p.id,plantedAt:p.plantedAt});farm.addXP(2);
  result={ok:true,xp:2,watered:true};
 }else{
  if(c.gifts.length>=3||c.gifts.includes(a.code))return deny('Kirim satu hadiah per teman, maksimal 3 teman per hari.');
  if(!farm.cropUnlocked(a.crop)||farm.s.seeds[a.crop]<a.qty)return deny('Bibit milikmu belum cukup untuk hadiah ini.');
  const remaining=Object.entries(farm.s.seeds).some(([key,n])=>n-(key===a.crop?a.qty:0)>0);
  if(!remaining&&!farm.used&&!farm.s.plots.some(p=>p.crop)&&farm.s.coins<5)return deny('Sisakan satu bibit atau 5 koin untuk panen berikutnya.');
  if(target.s.seeds[a.crop]+a.qty>1000)return deny('Penyimpanan bibit teman sudah penuh.');
  farm.s.seeds[a.crop]-=a.qty;target.s.seeds[a.crop]+=a.qty;c.gifts.push(a.code);
  result={ok:true,gifted:a.qty};
 }
 target.s.community.received.unshift({at:now,name:farm.s.profile.name,type:action.type==='friend-water'?'water':'gift',qty:action.type==='friend-water'?1:a.qty,...(action.type==='friend-gift'?{crop:a.crop}:{})});
 target.s.community.received=target.s.community.received.slice(0,8);
 F.validateSave(JSON.parse(target.serialize()));
 return{ok:true,row,target,result};
}
