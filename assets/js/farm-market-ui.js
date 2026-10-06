'use strict';
const marketWords=(en,id)=>typeof BaraI18n!=='undefined'&&BaraI18n.language==='en'?en:id;
let marketView='browse',marketCurrency='coins',marketCategory='',marketLoaded=false,marketLoading=false,marketError='',marketData={listings:[],trades:[],next:null},marketGeneration=0,marketOwner=null,marketSelected=null;
let marketDraft={item:'crop:carrot',qty:'1',price:'7'},marketBuyQty='1';
let marketRefreshDue=0,marketRefreshFailures=0;
let marketRenderPending=false,marketPointerDown=false;
const MARKET_REFRESH_MS=5000;
const marketLabels=()=>({crop:marketWords('Harvest','Panen'),seed:marketWords('Seeds','Bibit'),goods:marketWords('Crafted goods','Olahan'),animal:marketWords('Animal products','Hasil ternak'),fish:marketWords('Fish','Ikan'),material:marketWords('Materials','Bahan')});
const marketCurrencyName=key=>({coins:marketWords('Game coins','Koin game'),idr:'Rupiah',usd:'USD',crypto:'Crypto'}[key]);
function resetMarket(){marketGeneration++;marketOwner=null;marketLoaded=false;marketLoading=false;marketError='';marketData={listings:[],trades:[],next:null};marketSelected=null;marketDraft={item:'crop:carrot',qty:'1',price:'7'};marketRefreshDue=0;marketRefreshFailures=0;marketRenderPending=false;}
const marketContent=data=>JSON.stringify([data.listings||[],data.trades||[],data.next||null]);
async function loadMarket(more=false,{quiet=false}={}){
 if(!authority||authority.closed||marketLoading||visiting||marketView==='sell'||marketCurrency!=='coins'||more&&!marketData.next)return;
 const generation=marketGeneration,session=authority,owner=activeSaveKey,previous=marketContent(marketData),hadError=Boolean(marketError),target=quiet?(marketData.listings||[]).length:0;
 let changed=false;marketLoading=true;marketError='';if(!quiet&&panel==='market')renderPanel();
 const current=()=>generation===marketGeneration&&session===authority&&owner===activeSaveKey&&!session.closed;
 try{const query={view:marketView,currency:marketCurrency,...(marketCategory?{category:marketCategory}:{}),...(more?{before:String(marketData.next)}:{})};let data=await session.market(query);
  if(!current())return;
  // Rebuild every loaded page so new rows and sold-out rows never leave stale stock behind.
  while(quiet&&data.next&&(data.listings||[]).length<target){const next=await session.market({...query,before:String(data.next)});if(!current())return;data={...next,listings:[...data.listings,...next.listings]};}
  marketData={...data,...(more?{listings:[...(marketData.listings||[]),...data.listings]}:{})};marketLoaded=true;marketRefreshFailures=0;changed=hadError||previous!==marketContent(marketData);
 }catch(error){if(current()){marketError=error.message;marketRefreshFailures++;changed=true;}}
 finally{if(current()){marketLoading=false;marketRefreshDue=Date.now()+Math.min(30000,MARKET_REFRESH_MS*2**Math.min(Math.max(0,marketRefreshFailures-1),3));if(panel==='market'&&(!quiet||changed))renderMarketUpdate();}}
}
function refreshMarketPurchase(){
 const input=$('marketBuyQty'),button=$('marketBuySubmit');if(!input||!button)return;
 const offer=marketData.listings.find(v=>v.id===marketSelected),qty=Number(marketBuyQty),available=offer&&offer.status==='active'&&!offer.mine&&offer.expiresAt>serverClock(),valid=available&&/^\d+$/.test(marketBuyQty)&&qty>=1&&qty<=offer.qty;
 input.max=String(available?offer.qty:0);button.disabled=!valid||transactionBusy;
 $('marketBuyTotal').textContent=valid?'◉ '+format(qty*offer.unitPrice):'—';
}
function renderMarketUpdate(){
 if(document.activeElement?.matches('.market-form input,.market-form select')){marketRenderPending=true;refreshMarketPurchase();return;}
 marketRenderPending=false;
 const scroll=$('panelBody').parentElement.scrollTop;renderPanel();refreshMarketPurchase();$('panelBody').parentElement.scrollTop=scroll;
}
function tickMarketUpdates(immediate=false){
 if(panel==='market'&&marketRenderPending&&!marketPointerDown&&!document.activeElement?.matches('.market-form input,.market-form select'))renderMarketUpdate();
 if(document.hidden||navigator.onLine===false||panel!=='market'||marketCurrency!=='coins'||marketView==='sell'||!gate.canPlay||!authority||authority.closed||authority.saving||authority.command||transactionBusy||visiting||marketLoading)return;
 if(immediate||Date.now()>=marketRefreshDue)void loadMarket(false,{quiet:marketLoaded});
}
function marketProduct(category,item){const spec=FarmMarket.spec(category,item);return spec?{...spec,name:(category==='seed'?marketWords('Seeds · ','Bibit · '):'')+(category==='fish'&&typeof BaraI18n!=='undefined'&&BaraI18n.language==='id'?spec.idName:spec.name)}:null;}
function marketFormInfo(){const [category,item]=marketDraft.item.split(':'),spec=marketProduct(category,item),stock=FarmMarket.count(farm,category,item),qty=Number(marketDraft.qty),price=Number(marketDraft.price);return{category,item,spec,stock,qty,price,valid:spec&&/^\d+$/.test(marketDraft.qty)&&/^\d+$/.test(marketDraft.price)&&qty>=1&&qty<=stock&&qty<=10000&&price>=1&&price<=1000000&&qty*price<=1e9};}
function updateMarketForm(){
 const info=marketFormInfo(),button=document.getElementById('marketListSubmit');if(!button)return;
 button.disabled=!info.valid||transactionBusy||marketLoading;
 $('marketOwned').textContent=marketWords('Available: ','Tersedia: ')+info.stock;
 $('marketListQty').max=String(Math.max(1,info.stock));
 $('marketListTotal').textContent=info.valid?'◉ '+format(info.qty*info.price):'—';
 $('marketListPreview').innerHTML=info.spec?picture(info.item,info.spec.icon):'';
}
function renderMarket(body){
 if(marketOwner!==activeSaveKey){resetMarket();marketOwner=activeSaveKey;}
 $('panelLabel').textContent=marketWords('PLAYER MARKET','PASAR PEMAIN');$('panelTitle').textContent=marketWords('From farm to market.','Dari kebun ke pasar.');$('panelCopy').textContent=marketWords('Buy and sell at player-set prices.','Jual beli dengan harga pilihan pemain.');
 body.innerHTML='<div class="store-wallet"><span>'+marketWords('Game wallet','Dompet game')+' <b>◉ '+format(farm.s.coins)+'</b></span><span>'+marketWords('Bag','Tas')+' <b>'+farm.used+' / '+farm.capacity+'</b></span></div><div class="market-currencies" role="group" aria-label="'+marketWords('Payment currency','Mata uang pembayaran')+'">'+FarmMarket.currencies.map(key=>'<button type="button" data-action="market-currency" data-key="'+key+'" aria-pressed="'+(marketCurrency===key)+'">'+marketCurrencyName(key)+(key==='coins'?'':' <small>'+marketWords('Not active','Belum aktif')+'</small>')+'</button>').join('')+'</div>';
 if(marketCurrency!=='coins'){
  body.innerHTML+='<section class="market-unavailable" role="status"><span aria-hidden="true">◇</span><h3>'+marketCurrencyName(marketCurrency)+' · '+marketWords('payments not active','pembayaran belum aktif')+'</h3><p>'+marketWords('Payments and seller withdrawals will become available after the payment service is connected.','Pembayaran dan pencairan penjual akan tersedia setelah layanan pembayaran terhubung.')+'</p><small>'+marketWords('Game coins stay in the game and cannot be withdrawn as money.','Koin game tetap digunakan dalam game dan tidak dapat dicairkan sebagai uang.')+'</small>'+action(marketWords('Open the coin market','Buka pasar koin'),'market-currency','coins')+'</section>';return;
 }
 body.innerHTML+='<div class="market-tabs" role="group" aria-label="'+marketWords('Market sections','Bagian pasar')+'">'+[['browse',marketWords('Buy','Beli')],['sell',marketWords('Sell','Jual')],['mine',marketWords('My listings','Dagangan saya')],['history',marketWords('History','Riwayat')]].map(([key,label])=>'<button type="button" data-action="market-view" data-key="'+key+'" aria-pressed="'+(marketView===key)+'">'+label+'</button>').join('')+'</div>';
 if(marketView!=='sell'&&!marketLoaded&&!marketLoading)queueMicrotask(()=>{if(panel==='market')tickMarketUpdates();});
 if(marketError)body.innerHTML+='<p class="trade-warning" role="status">'+escape(marketError)+'</p>';
 if(marketView==='sell'){
  const items=FarmMarket.catalog().filter(v=>FarmMarket.count(farm,v.category,v.item)>0);
  if(!items.length){body.innerHTML+='<div class="empty-state"><span>🌱</span><h3>'+marketWords('Your next harvest belongs here.','Panen berikutnya bisa dijual di sini.')+'</h3><p>'+marketWords('Harvest, catch fish, or craft goods to create your first listing.','Panen, tangkap ikan, atau buat olahan untuk memasang dagangan pertamamu.')+'</p></div>';return;}
  if(!items.some(v=>v.category+':'+v.item===marketDraft.item)){const first=items[0];marketDraft.item=first.category+':'+first.item;marketDraft.price=String(first.reference||1);}
  body.innerHTML+='<form id="marketListForm" class="market-form"><div class="market-form-art" id="marketListPreview"></div><label>'+marketWords('Item to sell','Barang yang dijual')+'<select id="marketListItem" name="item">'+items.map(v=>'<option value="'+v.category+':'+v.item+'" '+(v.category+':'+v.item===marketDraft.item?'selected':'')+'>'+escape(marketLabels()[v.category]+' · '+marketProduct(v.category,v.item).name)+'</option>').join('')+'</select></label><small id="marketOwned"></small><div class="market-fields"><label>'+marketWords('Quantity','Jumlah')+'<input id="marketListQty" name="qty" type="number" inputmode="numeric" min="1" step="1" required value="'+escape(marketDraft.qty)+'"></label><label>'+marketWords('Coins per item','Koin per barang')+'<input id="marketListPrice" name="price" type="number" inputmode="numeric" min="1" max="1000000" step="1" required value="'+escape(marketDraft.price)+'"></label></div><div class="market-total"><span>'+marketWords('Total listing value','Total nilai dagangan')+'</span><b id="marketListTotal"></b></div><button class="action" id="marketListSubmit" type="submit">'+marketWords('List these items','Pasang dagangan')+'</button><p class="market-help">'+marketWords('Listed items leave your bag and are reserved for buyers. Unsold items can be returned. Listings last 7 days; up to 20 open listings. No coin trading fee.','Barang dagangan keluar dari tas dan dititipkan untuk pembeli. Sisa barang bisa dikembalikan. Berlaku 7 hari; maksimal 20 dagangan terbuka. Tanpa biaya transaksi koin.')+'</p></form>';updateMarketForm();return;
 }
 body.innerHTML+='<div class="market-controls">'+(marketView==='browse'?'<select id="marketCategory" aria-label="'+marketWords('Item category','Kategori barang')+'"><option value="">'+marketWords('All items','Semua barang')+'</option>'+Object.entries(marketLabels()).map(([key,label])=>'<option value="'+key+'" '+(key===marketCategory?'selected':'')+'>'+label+'</option>').join('')+'</select>':'<small>'+marketWords('Your recent activity','Aktivitas terbarumu')+'</small>')+action(marketLoading?marketWords('Loading…','Memuat…'):marketWords('Refresh','Perbarui'),'market-refresh','',1,marketLoading,true)+'</div>';
 if(marketView==='history'){body.innerHTML+='<div class="market-history">'+((marketData.trades||[]).map(v=>{const spec=marketProduct(v.category,v.item);return'<article><span>'+picture(v.item,spec?.icon)+'</span><div><b>'+escape(spec?.name||v.item)+'</b><small>'+marketWords(v.side==='buy'?'Bought':'Sold',v.side==='buy'?'Dibeli':'Terjual')+' · '+v.qty+' '+marketWords('items','barang')+'</small></div><strong>◉ '+format(v.qty*v.unitPrice)+'</strong></article>';}).join('')||'<p class="empty-note">'+marketWords('Your completed trades will appear here.','Transaksi yang selesai akan tampil di sini.')+'</p>')+'</div>';return;}
 const offers=marketData.listings||[];
 const selected=offers.find(v=>v.id===marketSelected&&v.status==='active'&&!v.mine&&v.expiresAt>serverClock());
 if(selected){const spec=marketProduct(selected.category,selected.item),qty=Number(marketBuyQty),valid=/^\d+$/.test(marketBuyQty)&&qty>=1&&qty<=selected.qty;
  body.innerHTML+='<form id="marketBuyForm" class="market-form market-checkout"><h3>'+escape(spec.name)+'</h3><p>'+marketWords('Seller: ','Penjual: ')+escape(selected.seller.name)+' · ◉ '+format(selected.unitPrice)+' / '+marketWords('item','barang')+'</p><label>'+marketWords('Quantity','Jumlah')+'<input id="marketBuyQty" type="number" inputmode="numeric" min="1" max="'+selected.qty+'" step="1" required value="'+escape(marketBuyQty)+'"></label><div class="market-total"><span>'+marketWords('Total to pay','Total pembayaran')+'</span><b id="marketBuyTotal">'+(valid?'◉ '+format(qty*selected.unitPrice):'—')+'</b></div><button class="action" id="marketBuySubmit" type="submit" '+(!valid||transactionBusy?'disabled':'')+'>'+marketWords('Buy with game coins','Beli dengan koin game')+'</button>'+action(marketWords('Close offer','Tutup penawaran'),'market-close','',1,false,true)+'</form>';
 }
 body.innerHTML+='<div class="market-list">'+(offers.map(v=>{const spec=marketProduct(v.category,v.item),expired=v.expiresAt<=serverClock(),available=v.status==='active'&&!expired,status=v.status==='sold'?marketWords('Sold out','Habis terjual'):v.status==='cancelled'?marketWords('Returned','Dikembalikan'):expired?marketWords('Expired','Kedaluwarsa'):v.qty+' '+marketWords('available','tersedia');
  return'<article class="market-offer"><div class="market-offer-art">'+picture(v.item,spec?.icon)+'</div><div class="market-offer-info"><small>'+marketLabels()[v.category]+'</small><h3>'+escape(spec?.name||v.item)+'</h3><div class="market-seller">'+friendAvatar(v.seller)+'<span>'+escape(v.seller?.name||marketWords('Farmer','Pekebun'))+'</span></div><div class="market-offer-price"><b>◉ '+format(v.unitPrice)+'</b><small>/ '+marketWords('item','barang')+'</small></div><small>'+status+'</small>'+(v.mine?v.status==='active'?action(marketWords('Return unsold items','Kembalikan sisa barang'),'market-cancel',v.id,1,transactionBusy,true):'':available?action(marketWords('View offer','Lihat penawaran'),'market-offer',v.id):'')+'</div></article>';}).join('')||'<div class="empty-state"><span>🧺</span><h3>'+marketWords(marketView==='mine'?'Your stall is waiting.':'Be the first to trade.',marketView==='mine'?'Lapakmu menunggu dagangan.':'Jadilah pedagang pertama.')+'</h3><p>'+marketWords(marketView==='mine'?'Create a listing in Sell.':'No listings in this category yet.',marketView==='mine'?'Pasang dagangan melalui Jual.':'Belum ada dagangan di kategori ini.')+'</p></div>')+'</div>'+(marketData.next?action(marketWords('Load more','Muat lagi'),'market-more','',1,marketLoading,true):'');
}
async function marketTransact(type,args){
 if(!gate.canPlay||transactionBusy||visiting||!authority)return;
 const session=authority,generation=++marketGeneration;marketLoading=false;transactionBusy=true;document.body.classList.add('transaction-busy');
 try{const result=await session.marketAction(type,args);if(generation!==marketGeneration||session!==authority)return;
  if(result?.ok){marketSelected=null;marketLoaded=false;audio.play(type==='buy'?'buy':'sell');toast(marketWords(type==='buy'?'Purchase complete. Items are in your inventory.':type==='cancel'?'Unsold items returned to your inventory.':'Your listing is now available to players.',type==='buy'?'Pembelian selesai. Barang masuk ke persediaanmu.':type==='cancel'?'Sisa barang kembali ke persediaanmu.':'Daganganmu sudah tersedia untuk pemain.'));if(type==='list')marketView='mine';void loadMarket();}
  else{toast(result?.message||marketWords('Trade is awaiting confirmation.','Transaksi menunggu konfirmasi.'));if(!result?.pending)void loadMarket();}
 }catch(error){if(generation===marketGeneration)toast(error.message);}
 finally{transactionBusy=false;document.body.classList.remove('transaction-busy');renderUI();}
}
function handleMarketAction(type,key){
 if(!type.startsWith('market-'))return false;
 if(type==='market-currency'){marketCurrency=key;marketGeneration++;marketLoading=false;marketLoaded=false;marketData={listings:[],trades:[]};marketSelected=null;renderPanel();}
 else if(type==='market-view'){marketView=key;marketGeneration++;marketLoading=false;marketLoaded=false;marketData={listings:[],trades:[]};marketSelected=null;renderPanel();}
 else if(type==='market-refresh')void loadMarket();else if(type==='market-more')void loadMarket(true);
 else if(type==='market-offer'){marketSelected=key;marketBuyQty='1';renderPanel();$('panelBody').parentElement.scrollTop=0;}
 else if(type==='market-close'){marketSelected=null;renderPanel();}
 else if(type==='market-cancel'){const offer=marketData.listings.find(v=>v.id===key);if(offer)void marketTransact('cancel',{listing:offer.id,version:offer.version});}
 return true;
}
document.addEventListener('input',event=>{
 if(event.target.closest('#marketListForm')){marketDraft={item:$('marketListItem').value,qty:$('marketListQty').value,price:$('marketListPrice').value};updateMarketForm();}
 if(event.target.id==='marketBuyQty'){marketBuyQty=event.target.value;refreshMarketPurchase();}
});
document.addEventListener('change',event=>{if(event.target.id==='marketCategory'){marketCategory=event.target.value;marketLoaded=false;marketGeneration++;marketLoading=false;marketSelected=null;void loadMarket();}});
document.addEventListener('submit',event=>{
 if(event.target.id==='marketListForm'){event.preventDefault();if(!event.target.reportValidity())return;const info=marketFormInfo();if(info.valid)void marketTransact('list',{category:info.category,item:info.item,qty:info.qty,unitPrice:info.price,currency:'coins'});}
 if(event.target.id==='marketBuyForm'){event.preventDefault();if(!event.target.reportValidity())return;const offer=marketData.listings.find(v=>v.id===marketSelected),qty=Number(marketBuyQty);if(offer&&offer.status==='active'&&!offer.mine&&offer.expiresAt>serverClock()&&Number.isSafeInteger(qty)&&qty>=1&&qty<=offer.qty)void marketTransact('buy',{listing:offer.id,version:offer.version,qty,unitPrice:offer.unitPrice,currency:'coins'});}
});
document.addEventListener('pointerdown',()=>{marketPointerDown=true;});
document.addEventListener('pointerup',()=>{marketPointerDown=false;});
document.addEventListener('pointercancel',()=>{marketPointerDown=false;});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickMarketUpdates(true);});
window.addEventListener('online',()=>tickMarketUpdates(true));
setInterval(tickMarketUpdates,1000);
