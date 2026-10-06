import {serverFarm,loadFarm} from './farm-actions.mjs';
import '../../assets/js/farm-market.js';
const F=globalThis.BaraFarm,M=globalThis.FarmMarket;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const read=(db,uid)=>db.prepare('SELECT user_id,save,revision,saved_at FROM farm_saves WHERE user_id=?').bind(uid).first();
const paymentMethods=()=>M.currencies.map(currency=>({currency,enabled:currency==='coins',reason:currency==='coins'?null:'merchant_setup_required'}));
export function parseMarketAction(p){
 if(!exact(p,['id','revision','type','args'])||!uuid(p.id)||!integer(p.revision,0,Number.MAX_SAFE_INTEGER-1))throw new TypeError('Invalid market action');
 const a=p.args;
 if(p.type==='list'){if(!exact(a,['category','item','qty','unitPrice','currency'])||!M.spec(a.category,a.item)||!integer(a.qty,1,10000)||!integer(a.unitPrice,1,1000000)||!M.currencies.includes(a.currency)||a.qty*a.unitPrice>1e9)throw new TypeError('Invalid listing');}
 else if(p.type==='buy'){if(!exact(a,['listing','version','qty','unitPrice','currency'])||!uuid(a.listing)||!integer(a.version,1,1e9)||!integer(a.qty,1,10000)||!integer(a.unitPrice,1,1000000)||!M.currencies.includes(a.currency))throw new TypeError('Invalid purchase');}
 else if(p.type==='cancel'){if(!exact(a,['listing','version'])||!uuid(a.listing)||!integer(a.version,1,1e9))throw new TypeError('Invalid cancellation');}
 else throw new TypeError('Unknown market action');return p;
}
function sellerProfile(save){const p=JSON.parse(save).state.profile;const photo=p.sharePhoto===false?null:p.photo?(p.sharePhoto===true?p.photo:null):p.useAccountPhoto!==false?F.accountPhotoURL(p.accountPhoto):null;return{name:p.name,farmName:p.farmName,avatar:p.avatar,...(photo?{photo}:{})};}
function listingView(row,uid){return{id:row.id,category:row.category,item:row.item,currency:row.currency,unitPrice:row.unit_price,qty:row.remaining_qty,originalQty:row.original_qty,status:row.status,version:row.version,createdAt:row.created_at,expiresAt:row.expires_at,mine:row.seller_id===uid,...(row.seller_save?{seller:sellerProfile(row.seller_save)}:{})};}
export async function marketData(db,uid,query,now=Date.now()){
 const currency=query.get('currency')||'coins',view=query.get('view')||'browse',category=query.get('category')||'',item=query.get('item')||'',before=query.get('before'),cursor=before?.split(':');
 if(!M.currencies.includes(currency)||!['browse','mine','history'].includes(view)||category&&!Object.hasOwn(M.groups,category)||item&&(!category||!M.spec(category,item))||before&&(!/^\d{1,13}:[0-9a-f-]{36}$/i.test(before)||!integer(Number(cursor[0]),1,now)||!uuid(cursor[1])))return{status:400,data:{error:'invalid_market_query'}};
 if(view==='history'){const rows=await db.prepare('SELECT id,category,item,qty,unit_price,currency,created_at,buyer_id FROM market_trades WHERE buyer_id=? OR seller_id=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(uid,uid).all();return{status:200,data:{userId:uid,trades:rows.results.map(r=>({id:r.id,category:r.category,item:r.item,qty:r.qty,unitPrice:r.unit_price,currency:r.currency,at:r.created_at,side:r.buyer_id===uid?'buy':'sell'})),paymentMethods:paymentMethods(),serverTime:now}};}
 const clauses=['l.currency=?'],values=[currency];
 if(view==='mine'){clauses.push('l.seller_id=?');values.push(uid);}else{clauses.push("l.status='active' AND l.remaining_qty>0 AND l.expires_at>?");values.push(now);}
 if(category){clauses.push('l.category=?');values.push(category);}if(item){clauses.push('l.item=?');values.push(item);}if(before){clauses.push('(l.created_at<? OR (l.created_at=? AND l.id<?))');values.push(Number(cursor[0]),Number(cursor[0]),cursor[1]);}
 const rows=await db.prepare('SELECT l.*,s.save AS seller_save FROM market_listings l JOIN farm_saves s ON s.user_id=l.seller_id WHERE '+clauses.join(' AND ')+' ORDER BY l.created_at DESC,l.id DESC LIMIT 51').bind(...values).all();
 const shown=rows.results.slice(0,50);return{status:200,data:{userId:uid,listings:shown.map(r=>listingView(r,uid)),next:rows.results.length>50?shown.at(-1).created_at+':'+shown.at(-1).id:null,paymentMethods:paymentMethods(),serverTime:now}};
}
export async function runMarketAction(db,uid,p,now=Date.now()){
 parseMarketAction(p);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([p.revision,p.type,p.args])))),b=>b.toString(16).padStart(2,'0')).join('');
 const receipt=()=>db.prepare('SELECT request_hash,result FROM market_actions WHERE user_id=? AND action_id=?').bind(uid,p.id).first();
 const replay=async r=>r.request_hash===hash?{status:200,data:{...await loadFarm(db,uid,now),result:JSON.parse(r.result),replayed:true}}:{status:409,data:{error:'action_id_reused'}};
 const previous=await receipt();if(previous)return replay(previous);
 const deny=async(status,error,message)=>({status,data:{error,message,...await loadFarm(db,uid,now)}});
 const row=await read(db,uid);
 if((row?.revision||0)!==p.revision)return deny(409,'save_conflict','Your farm changed. Refresh and try again.');
 if(!row)return deny(422,'market_denied','Grow and harvest your first crops before trading.');
 const farm=serverFarm(JSON.parse(row.save),now),a=p.args,stamp=new Date(now).toISOString();
 const checks=['EXISTS(SELECT 1 FROM farm_saves WHERE user_id=? AND revision=?)'],bindings=[uid,p.revision],writes=[];
 function updateFarm(user,r,f){const raw=f.serialize();F.validateSave(JSON.parse(raw));writes.push(db.prepare('UPDATE farm_saves SET save=?,revision=revision+1,saved_at=?,last_action_id=? WHERE user_id=? AND revision=?').bind(raw,stamp,p.id,user,r.revision));}
 let result;
 if(p.type==='list'){
  if(a.currency!=='coins')return deny(503,'merchant_setup_required','Real-money payments are not active yet.');
  if(M.count(farm,a.category,a.item)<a.qty)return deny(422,'stock_unavailable','You do not have this quantity in your inventory.');
  const id=crypto.randomUUID();M.inventory(farm,a.category)[a.item]-=a.qty;updateFarm(uid,row,farm);
  checks.push("(SELECT COUNT(*) FROM market_listings WHERE seller_id=? AND status='active')<?");bindings.push(uid,M.maxListings);
  writes.push(db.prepare("INSERT INTO market_listings(id,seller_id,category,item,currency,unit_price,original_qty,remaining_qty,status,version,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,'active',1,?,?,?)").bind(id,uid,a.category,a.item,a.currency,a.unitPrice,a.qty,a.qty,now,now,now+7*86400000));
  result={ok:true,type:'listed',listing:id,qty:a.qty};
 }else{
  const listing=await db.prepare('SELECT * FROM market_listings WHERE id=?').bind(a.listing).first();
  if(!listing||listing.status!=='active'||listing.version!==a.version)return deny(409,'listing_changed','This listing changed. Refresh the market.');
  checks.push("EXISTS(SELECT 1 FROM market_listings WHERE id=? AND status='active' AND version=? AND remaining_qty=?)");bindings.push(listing.id,listing.version,listing.remaining_qty);
  if(p.type==='cancel'){
   if(listing.seller_id!==uid)return deny(403,'not_listing_owner','Only the seller can cancel this listing.');
   if(!M.receive(farm,listing.category,listing.item,listing.remaining_qty))return deny(422,'inventory_full','Free inventory space to return the unsold items.');
   M.inventory(farm,listing.category)[listing.item]+=listing.remaining_qty;updateFarm(uid,row,farm);
   writes.push(db.prepare("UPDATE market_listings SET status='cancelled',remaining_qty=0,version=version+1,updated_at=? WHERE id=?").bind(now,listing.id));
   result={ok:true,type:'cancelled',listing:listing.id,returned:listing.remaining_qty};
  }else{
   if(listing.currency!=='coins'||a.currency!=='coins')return deny(503,'merchant_setup_required','Real-money payments are not active yet.');
   if(listing.seller_id===uid)return deny(422,'self_purchase','You cannot buy your own listing.');
   if(listing.expires_at<=now||a.qty>listing.remaining_qty||a.unitPrice!==listing.unit_price)return deny(409,'listing_changed','Stock or price changed. Refresh the market.');
   const total=a.qty*listing.unit_price;
   if(farm.s.coins<total)return deny(422,'insufficient_coins','You do not have enough game coins.');
   if(!M.receive(farm,listing.category,listing.item,a.qty))return deny(422,'inventory_full','Your inventory is full.');
   const sellerRow=await read(db,listing.seller_id);if(!sellerRow)return deny(409,'listing_changed','This seller is unavailable.');
   const seller=serverFarm(JSON.parse(sellerRow.save),now);if(seller.s.coins+total>1e9)return deny(422,'seller_balance_full','The seller cannot receive more coins yet.');
   checks.push('EXISTS(SELECT 1 FROM farm_saves WHERE user_id=? AND revision=?)');bindings.push(listing.seller_id,sellerRow.revision);
   if(listing.category==='fish'&&farm.s.fishing.traded+a.qty>1e9)return deny(422,'inventory_full','Your inventory is full.');
   farm.s.coins-=total;M.inventory(farm,listing.category)[listing.item]+=a.qty;
   // Fish bought from players are inventory acquisitions, never catches or XP.
   if(listing.category==='fish')farm.s.fishing.traded+=a.qty;
   seller.s.coins+=total;seller.s.stats.earned=Math.min(1e12,seller.s.stats.earned+total);
   updateFarm(uid,row,farm);updateFarm(listing.seller_id,sellerRow,seller);
   writes.push(db.prepare("UPDATE market_listings SET remaining_qty=remaining_qty-?,status=CASE WHEN remaining_qty=? THEN 'sold' ELSE 'active' END,version=version+1,updated_at=? WHERE id=?").bind(a.qty,a.qty,now,listing.id));
   const trade=crypto.randomUUID();writes.push(db.prepare('INSERT INTO market_trades(id,listing_id,buyer_id,seller_id,category,item,qty,unit_price,currency,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(trade,listing.id,uid,listing.seller_id,listing.category,listing.item,a.qty,listing.unit_price,'coins',now));
   result={ok:true,type:'purchased',listing:listing.id,qty:a.qty,total,trade};
  }
 }
 const guard=crypto.randomUUID();
 const batch=[db.prepare('INSERT INTO market_guards(id,valid) VALUES(?,CASE WHEN '+checks.join(' AND ')+' THEN 1 ELSE 0 END)').bind(guard,...bindings),...writes,db.prepare('INSERT INTO market_actions(user_id,action_id,request_hash,result,created_at) VALUES(?,?,?,?,?)').bind(uid,p.id,hash,JSON.stringify(result),now),db.prepare('DELETE FROM market_guards WHERE id=?').bind(guard)];
 try{await db.batch(batch);}catch(error){if(!/market_snapshot_valid|UNIQUE constraint failed: market_actions/.test(String(error?.message)))throw error;const committed=await receipt();return committed?replay(committed):deny(409,'market_conflict','The farm or listing changed. Refresh and try again.');}
 return replay(await receipt());
}
