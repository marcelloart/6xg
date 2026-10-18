import {createRemoteJWKSet,importSPKI,jwtVerify} from 'jose';
const firebaseKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
let privyKey;
export const isAccountId=id=>typeof id==='string'&&(/^(?:did:privy:)[A-Za-z0-9:_-]{1,180}$/.test(id)||/^firebase:[a-z][a-z0-9-]{4,28}[a-z0-9]:[A-Za-z0-9_-]{1,128}$/.test(id));
export const firebaseConfigured=env=>typeof env.FIREBASE_PROJECT_ID==='string'&&/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID);
export const authConfigured=env=>firebaseConfigured(env)||Boolean(env.PRIVY_APP_ID&&env.PRIVY_VERIFICATION_KEY);
export async function verifyFirebase(token,env,{keys=firebaseKeys,now=Date.now()}={}){
 if(!firebaseConfigured(env))throw TypeError('Firebase is not configured');
 const currentDate=new Date(now),seconds=Math.floor(now/1000);
 const {payload}=await jwtVerify(token,keys,{algorithms:['RS256'],issuer:'https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID,audience:env.FIREBASE_PROJECT_ID,currentDate,requiredClaims:['exp','iat','iss','aud','sub','auth_time','firebase']});
 if(typeof payload.sub!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(payload.sub)||!Number.isSafeInteger(payload.iat)||payload.iat<0||payload.iat>seconds||!Number.isSafeInteger(payload.auth_time)||payload.auth_time<0||payload.auth_time>seconds||!['google.com','twitter.com','password'].includes(payload.firebase?.sign_in_provider)||(payload.firebase?.sign_in_provider==='password'&&payload.email_verified!==true)||payload.firebase?.tenant)throw TypeError('Invalid Firebase identity');
 return {subject:'firebase:'+env.FIREBASE_PROJECT_ID+':'+payload.sub,provider:'firebase',authTime:payload.auth_time};
}
export async function verifyPrivy(token,env){
 if(!env.PRIVY_APP_ID||!env.PRIVY_VERIFICATION_KEY)throw TypeError('Legacy authentication unavailable');
 const pem=env.PRIVY_VERIFICATION_KEY.replaceAll('\\n','\n');
 if(!privyKey||privyKey.pem!==pem)privyKey={pem,key:importSPKI(pem,'ES256')};
 const {payload}=await jwtVerify(token,await privyKey.key,{algorithms:['ES256'],issuer:'privy.io',audience:env.PRIVY_APP_ID,requiredClaims:['exp','iat','iss','aud','sub','sid']});
 if(!isAccountId(payload.sub)||!payload.sub.startsWith('did:privy:')||typeof payload.sid!=='string'||!payload.sid||!Number.isSafeInteger(payload.iat)||payload.iat<0||payload.iat>Math.floor(Date.now()/1000))throw TypeError('Invalid legacy identity');
 return {subject:payload.sub,accountId:payload.sub,provider:'privy'};
}
export async function resolveFirebase(identity,env){
 if(!env.DB)throw TypeError('Account storage unavailable');
 const row=await env.DB.prepare('SELECT account_id FROM auth_links WHERE project_id=? AND firebase_subject=?').bind(env.FIREBASE_PROJECT_ID,identity.subject).first();
 if(row&&!isAccountId(row.account_id))throw TypeError('Invalid linked account');
 return {...identity,accountId:row?.account_id||identity.subject};
}
export async function authenticateIdentity(header,env){
 if(typeof header!=='string'||!header.startsWith('Bearer ')||header.length>16384)throw TypeError('Invalid token');
 const token=header.slice(7);
 // Firebase uses RS256; Privy uses ES256. Failed verification never falls back.
 const encoded=token.split('.')[0];let algorithm;
 try{algorithm=JSON.parse(atob(encoded.replaceAll('-','+').replaceAll('_','/'))).alg;}catch{throw TypeError('Invalid token');}
 if(algorithm==='RS256')return resolveFirebase(await verifyFirebase(token,env),env);
 if(algorithm==='ES256')return verifyPrivy(token,env);
 throw TypeError('Unsupported token');
}
export async function linkLegacyAccount(env,firebase,legacy,{now=Date.now()}={}){
 if(firebase.provider!=='firebase'||legacy.provider!=='privy'||!isAccountId(firebase.subject)||!firebase.subject.startsWith('firebase:')||!isAccountId(legacy.accountId)||!legacy.accountId.startsWith('did:privy:'))return {status:400,data:{error:'invalid_account_link'}};
 if(Math.floor(now/1000)-firebase.authTime>300)return{status:401,data:{error:'recent_login_required'}};
 // Keep the original account key: listings, friends, receipts and saves remain intact.
 const query=()=>env.DB.prepare('SELECT account_id FROM auth_links WHERE project_id=? AND firebase_subject=?').bind(env.FIREBASE_PROJECT_ID,firebase.subject).first();
 const previous=await query();if(previous)return previous.account_id===legacy.accountId?{status:200,data:{userId:legacy.accountId,authSubject:firebase.subject,linked:true}}:{status:409,data:{error:'account_already_linked'}};
 await env.DB.prepare(`INSERT INTO auth_links(project_id,firebase_subject,account_id,created_at)
 SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM farm_saves WHERE user_id=?)
 AND NOT EXISTS(SELECT 1 FROM saves WHERE user_id=?)
 AND NOT EXISTS(SELECT 1 FROM market_listings WHERE seller_id=?)
 ON CONFLICT DO NOTHING`).bind(env.FIREBASE_PROJECT_ID,firebase.subject,legacy.accountId,now,firebase.subject,firebase.subject,firebase.subject).run();
 const linked=await query();return linked?.account_id===legacy.accountId?{status:200,data:{userId:legacy.accountId,authSubject:firebase.subject,linked:true}}:{status:409,data:{error:'account_link_conflict',message:'This account already has progress or is linked. No progress was overwritten.'}};
}
