const encoder=new TextEncoder();
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export async function digest(value){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
const random=()=>base64url(crypto.getRandomValues(new Uint8Array(32)));
const valid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
function accountPhoto(value){if(value==null)return null;if(typeof value!=='string'||value.length>1024)return false;try{const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='pbs.twimg.com'||url.port||url.username||url.password||url.search||url.hash||!/^\/profile_images\/[A-Za-z0-9_./-]+$/.test(url.pathname))return false;url.pathname=url.pathname.replace(/_normal(?=\.[a-z0-9]+$)/i,'');return url.href;}catch{return false;}}

// Browser authentication grants only a short-lived PKCE code. Privy JWTs never
// travel in deep links, and the app's verifier never travels to the browser.
export async function authorizeNative(db,uid,body,now=Date.now()){
  if(!(exact(body,['challenge'])||exact(body,['challenge','accountPhoto']))||!valid(body.challenge)||accountPhoto(body.accountPhoto)===false)return{status:400,data:{error:'invalid_challenge'}};
  const code=random(),expiresAt=now+120000;
  await db.batch([
    db.prepare('DELETE FROM native_auth_codes WHERE expires_at < ?').bind(now),
    db.prepare('DELETE FROM native_sessions WHERE expires_at < ?').bind(now),
    db.prepare('INSERT INTO native_auth_codes(code_hash,user_id,challenge,account_photo,expires_at) VALUES (?,?,?,?,?)').bind(await digest(code),uid,body.challenge,accountPhoto(body.accountPhoto),expiresAt)
  ]);
  return{status:200,data:{code,expiresAt}};
}
export async function exchangeNative(db,body,now=Date.now()){
  if(!exact(body,['code','verifier'])||!valid(body.code)||typeof body.verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier))return{status:400,data:{error:'invalid_exchange'}};
  // DELETE RETURNING consumes a code atomically. Wrong verifiers cannot consume
  // someone else's code; racing exchanges cannot mint two sessions.
  const row=await db.prepare('DELETE FROM native_auth_codes WHERE code_hash=? AND challenge=? AND expires_at>=? RETURNING user_id,account_photo').bind(await digest(body.code),await digest(body.verifier),now).first();
  if(!row)return{status:401,data:{error:'invalid_or_expired_code'}};
  const token='6xg_native_'+random(),expiresAt=now+30*86400000;
  await db.prepare('INSERT INTO native_sessions(token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await digest(token),row.user_id,now,expiresAt).run();
  return{status:200,data:{token,userId:row.user_id,expiresAt,...(row.account_photo?{accountPhoto:row.account_photo}:{})}};
}
export async function nativeIdentity(db,token,now=Date.now()){
  if(typeof token!=='string'||!/^6xg_native_[A-Za-z0-9_-]{43}$/.test(token)||!db)throw new TypeError('Invalid native session');
  const row=await db.prepare('SELECT user_id FROM native_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),now).first();
  if(!row||!row.user_id.startsWith('did:privy:'))throw new TypeError('Expired native session');
  return row.user_id;
}
export async function revokeNative(db,token){await db.prepare('DELETE FROM native_sessions WHERE token_hash=?').bind(await digest(token)).run();}
