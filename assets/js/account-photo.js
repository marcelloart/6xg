'use strict';
(function(root){
 const failed=new Set(),icons={sprout:'🌱',sunflower:'🌻',apple:'🍎',bee:'🐝'};
 function twitterURL(value){
  if(typeof value!=='string'||value.length>1024)return null;
  try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='pbs.twimg.com'||u.port||u.username||u.password||u.search||u.hash||!/^\/profile_images\/[A-Za-z0-9_./-]+$/.test(u.pathname))return null;u.pathname=u.pathname.replace(/_normal(?=\.[a-z0-9]+$)/i,'');return u.href;}catch{return null;}
 }
 function source(profile,accountURL){return profile?.photo||(profile?.useAccountPhoto===false?null:twitterURL(accountURL));}
 function render(holder,photo,avatar,alt=''){
  holder.replaceChildren();const fallback=()=>{holder.textContent=icons[avatar]||icons.sprout;};
  if(!photo||failed.has(photo)){fallback();return;}
  const img=holder.ownerDocument.createElement('img');img.alt=alt;img.referrerPolicy='no-referrer';img.decoding='async';
  img.onerror=()=>{failed.add(photo);if(img.parentElement===holder)fallback();};img.src=photo;holder.append(img);
 }
 root.BaraAccountPhoto=Object.freeze({twitterURL,source,render});
})(globalThis);
