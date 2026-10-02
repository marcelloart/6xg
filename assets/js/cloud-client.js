'use strict';
// A session belongs to exactly one Privy user. No token is stored by the game.
class BaraCloudSession {
  constructor(base,userId,getToken,{fetcher=fetch,onStatus=()=>{},onSaved=()=>{},path='/api/save'}={}) {
    const url=new URL(base);
    if(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))throw new Error('Server akun harus menggunakan HTTPS.');
    if(url.username||url.password||url.search||url.hash)throw new Error('Alamat server tidak valid.');
    if(!['/api/save','/api/farm-save'].includes(path))throw new Error('Endpoint progres tidak valid.');
    this.path=path;
    this.onSaved=onSaved;
    this.base=url.href.replace(/\/$/,'');this.userId=userId;this.getToken=getToken;this.fetcher=fetcher;this.onStatus=onStatus;
    this.controller=new AbortController();this.closed=false;this.revision=0;this.pending=null;this.saving=false;this.blocked=false;
  }
  async request(method,body) {
    if(this.closed)throw new Error('Sesi telah berakhir.');
    const token=await this.getToken();
    if(this.closed)throw new Error('Sesi telah berakhir.');
    if(!token)throw new Error('Silakan masuk kembali.');
    const response=await this.fetcher(this.base+this.path,{
      method,signal:this.controller.signal,cache:'no-store',credentials:'omit',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    if(this.closed)throw new Error('Sesi telah berakhir.');
    if(!response.ok){const error=new Error(response.status===409?'Progres berubah di perangkat lain.':response.status===401?'Sesi login perlu diperbarui.':'Server belum dapat menyimpan progres.');error.status=response.status;throw error;}
    const data=await response.json();
    if(data.userId!==this.userId)throw new Error('Akun server tidak sesuai dengan akun pemain.');
    if(!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('Versi progres server tidak valid.');
    return data;
  }
  async load() {
    const data=await this.request('GET');this.revision=data.revision;this.blocked=false;return data;
  }
  changed(raw) {
    if(this.closed||this.blocked)return;
    this.pending=raw;this.onStatus('pending','Progres tersimpan di perangkat; menunggu sinkronisasi.');
  }
  async flush() {
    if(this.closed||this.blocked||this.saving||!this.pending)return;
    this.saving=true;const raw=this.pending;this.pending=null;this.onStatus('saving','Menyimpan progres online…');
    try{
      const data=await this.request('PUT',{save:JSON.parse(raw),revision:this.revision});
      if(this.closed)return;
      this.revision=data.revision;this.onStatus(this.pending?'pending':'synced',this.pending?'Progres terbaru menunggu sinkronisasi.':'Progres tersimpan online.');
      try{this.onSaved(raw,this.revision);}catch{}
    }catch(error){
      if(this.closed)return;
      this.pending=this.pending||raw;
      if(error.status===409){this.blocked=true;this.onStatus('conflict','Progres berubah di perangkat lain. Muat progres online untuk melanjutkan.');}
      else this.onStatus('error','Koneksi terputus. Progres tetap tersimpan di perangkat ini.');
    }finally{this.saving=false;}
  }
  close(){this.closed=true;this.pending=null;this.controller.abort();}
}
window.BaraCloudSession=BaraCloudSession;
