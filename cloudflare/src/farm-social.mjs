import {serverFarm} from './farm-actions.mjs';
const F=globalThis.BaraFarm;
// A code is a random capability. Sharing is private until explicitly enabled.
import {sharedRow} from './farm-sharing.mjs';
export function publicView(row,now){const f=serverFarm(JSON.parse(row.save),now),s=f.s;return{profile:{name:s.profile.name,farmName:s.profile.farmName,avatar:s.profile.avatar,...(s.profile.sharePhoto===false?{}:s.profile.photo?(s.profile.sharePhoto===true?{photo:s.profile.photo}:{}):s.profile.useAccountPhoto!==false&&F.accountPhotoURL(s.profile.accountPhoto)?{photo:F.accountPhotoURL(s.profile.accountPhoto)}:{})},level:f.level,plots:s.plots.slice(0,f.unlocked).map(p=>({...p})),buildings:s.buildings.map(b=>({...b})),animals:s.livestock.animals.map(a=>({id:a.id,slot:a.slot,kind:a.kind})),savedAt:row.saved_at};}
export async function socialData(db,uid,code=null,now=Date.now()){
 if(code!==null){if(!F.friendCode(code))return{status:400,data:{error:'invalid_code'}};const row=await sharedRow(db,code);return row?{status:200,data:{userId:uid,code,view:publicView(row,now),serverTime:now}}:{status:404,data:{error:'farm_not_shared',message:'Kebun tidak ditemukan atau kunjungannya dinonaktifkan.'}};}
 const own=await db.prepare('SELECT save FROM farm_saves WHERE user_id = ?').bind(uid).first(),f=serverFarm(own?JSON.parse(own.save):null,now),friends=[];
 for(const code of f.s.social.friends){const row=await sharedRow(db,code);friends.push(row?{code,available:true,...publicView(row,now),plots:undefined,buildings:undefined,animals:undefined}:{code,available:false});}
 return{status:200,data:{userId:uid,friends,serverTime:now}};
}
