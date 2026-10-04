'use strict';
const harvestT_cloud_client_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
// A session belongs to exactly one Privy user. No token is stored by the game.
class BaraCloudSession {
  constructor(base,userId,getToken,{fetcher=(...args)=>fetch(...args),onStatus=()=>{},onSaved=()=>{},path='/api/save',cookieSession=false}={}) {
    const url=new URL(base);
    if(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))throw new Error(harvestT_cloud_client_js('Server akun harus menggunakan HTTPS.'));
    if(url.username||url.password||url.search||url.hash)throw new Error(harvestT_cloud_client_js('Alamat server tidak valid.'));
    if(!['/api/save','/api/farm-save'].includes(path))throw new Error(harvestT_cloud_client_js('Endpoint progres tidak valid.'));
    this.path=path;
    this.onSaved=onSaved;
    this.cookieSession=cookieSession;
    this.base=url.href.replace(/\/$/,'');this.userId=userId;this.getToken=getToken;this.fetcher=fetcher;this.onStatus=onStatus;
    this.controller=new AbortController();this.closed=false;this.revision=0;this.pending=null;this.saving=false;this.blocked=false;
  }
  async request(method,body,path=this.path,{social=false}={}) {
    if(this.closed)throw new Error(harvestT_cloud_client_js('Sesi telah berakhir.'));
    const token=this.cookieSession?null:await this.getToken();
    if(this.closed)throw new Error(harvestT_cloud_client_js('Sesi telah berakhir.'));
    if(!this.cookieSession&&!token)throw new Error(harvestT_cloud_client_js('Silakan masuk kembali.'));
    const response=await this.fetcher(this.base+path,{
      method,signal:typeof AbortSignal!=='undefined'&&typeof AbortSignal.any==='function'&&typeof AbortSignal.timeout==='function'?AbortSignal.any([this.controller.signal,AbortSignal.timeout(15000)]):this.controller.signal,cache:'no-store',credentials:this.cookieSession?'include':'omit',
      headers:{...(!this.cookieSession?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    if(this.closed)throw new Error(harvestT_cloud_client_js('Sesi telah berakhir.'));
    if(!response.ok){let data;try{data=await response.json();}catch{}const error=new Error(data?.message|| (response.status===409?harvestT_cloud_client_js('Progres berubah di perangkat lain. Coba tindakan lagi.'):response.status===401?harvestT_cloud_client_js('Sesi login perlu diperbarui.'):harvestT_cloud_client_js('Koneksi server belum tersedia. Transaksi belum dikonfirmasi.')));error.status=response.status;error.data=data;throw error;}
    const data=await response.json();
    if(data.userId!==this.userId)throw new Error(harvestT_cloud_client_js('Akun server tidak sesuai dengan akun pemain.'));
    if(!social&&(!Number.isSafeInteger(data.revision)||data.revision<0))throw new Error(harvestT_cloud_client_js('Versi progres server tidak valid.'));
    return data;
  }
  async load() {
    const data=await this.request('GET');this.revision=data.revision;this.blocked=false;return data;
  }
  changed(raw) {
    if(this.closed||this.blocked)return;
    this.pending=raw;this.onStatus('pending',harvestT_cloud_client_js('Progres tersimpan di perangkat; menunggu sinkronisasi.'));
  }
  async flush() {
    if(this.closed||this.blocked||this.saving||!this.pending)return;
    this.saving=true;const raw=this.pending;this.pending=null;this.onStatus('saving',harvestT_cloud_client_js('Menyimpan progres online…'));
    try{
      const data=await this.request('PUT',{save:JSON.parse(raw),revision:this.revision});
      if(this.closed)return;
      this.revision=data.revision;this.onStatus(this.pending?'pending':'synced',this.pending?harvestT_cloud_client_js('Progres terbaru menunggu sinkronisasi.'):harvestT_cloud_client_js('Progres tersimpan online.'));
      try{this.onSaved(raw,this.revision);}catch{}
    }catch(error){
      if(this.closed)return;
      this.pending=this.pending||raw;
      if(error.status===409){this.blocked=true;this.onStatus('conflict',harvestT_cloud_client_js('Progres berubah di perangkat lain. Muat progres online untuk melanjutkan.'));}
      else this.onStatus('error',harvestT_cloud_client_js('Koneksi terputus. Progres tetap tersimpan di perangkat ini.'));
    }finally{this.saving=false;}
  }
  close(){this.closed=true;this.pending=null;this.controller.abort();}
}
window.BaraCloudSession=BaraCloudSession;
// Commands contain intent only. Balances, rewards and deadlines come from the server.
class BaraFarmSession extends BaraCloudSession{
 constructor(base,userId,getToken,options={}){super(base,userId,getToken,{...options,path:'/api/farm-save'});this.onState=options.onState||(()=>{});this.command=null;}
 accept(data){if(data.userId!==this.userId||!Number.isSafeInteger(data.revision)||data.revision<0||data.authoritative!==true||![6,7,8].includes(data.save?.version)||!Number.isSafeInteger(data.serverTime)||data.serverTime<1)throw new Error(harvestT_cloud_client_js('Perbarui game untuk memakai transaksi server.'));this.revision=data.revision;this.onState(data);this.onSaved(JSON.stringify(data.save),data.revision);return data;}
 async load(){const data=this.accept(await this.request('GET'));this.onStatus('synced',harvestT_cloud_client_js('Progres dan transaksi diperiksa server.'));return data;}
 changed(){}
 async action(type,args){if(this.saving||this.command)return{ok:false,message:harvestT_cloud_client_js('Transaksi sebelumnya sedang dikonfirmasi. Tunggu atau tekan Coba lagi.')};this.command={id:crypto.randomUUID(),revision:this.revision,type,args};return this.sendCommand();}
 async sendCommand(){
  if(this.saving||!this.command)return{ok:false,message:harvestT_cloud_client_js('Menunggu konfirmasi server.')};this.saving=true;this.onStatus('saving',harvestT_cloud_client_js('Memeriksa transaksi…'));
  try{const data=this.accept(await this.request('POST',this.command,'/api/farm-action'));this.command=null;this.onStatus('synced',harvestT_cloud_client_js('Progres tersimpan online.'));return data.result;}
  catch(error){
   if(this.closed)return{ok:false,message:harvestT_cloud_client_js('Sesi telah berakhir.')};
   if(error.status&&error.status<500&&error.status!==429){this.command=null;if(error.data?.save)this.accept(error.data);else if(error.status===409)await this.load().catch(()=>{});this.onStatus('synced',error.message);return{ok:false,message:error.message};}
   this.onStatus('error',harvestT_cloud_client_js('Koneksi terputus. Transaksi menunggu konfirmasi; koin belum diubah.'));return{ok:false,pending:true,message:harvestT_cloud_client_js('Transaksi belum dikonfirmasi. Coba lagi saat koneksi kembali.')};
  }finally{this.saving=false;}
 }
 async friends(){return this.request('GET',null,'/api/farm-friends',{social:true});}
 async visit(code){if(!/^[A-F0-9]{16}$/.test(code))throw new Error(harvestT_cloud_client_js('Masukkan kode kebun yang valid.'));return this.request('GET',null,'/api/farm-visit?code='+encodeURIComponent(code),{social:true});}
 async flush(){if(this.closed||this.saving)return;if(this.command)return this.sendCommand();try{await this.load();return{ok:true};}catch{this.onStatus('error',harvestT_cloud_client_js('Koneksi terputus. Muat kembali sebelum melakukan transaksi.'));return{ok:false,message:harvestT_cloud_client_js('Server belum dapat dihubungi.')};}}
 close(){super.close();this.command=null;}
}
window.BaraFarmSession=BaraFarmSession;
