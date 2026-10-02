import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {PrivyProvider,usePrivy,useLogin} from '@privy-io/react-auth';

const cfg=window.BARA_ONLINE;
const game=window.LadangBara;
const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const keyFor=id=>'6xg-farm:'+id;

function Account(){
  const {ready,authenticated,user,getAccessToken,logout}=usePrivy();
  const [status,setStatus]=useState({state:'loading',text:'Menyiapkan login Privy…'});
  const [profile,setProfile]=useState(game.profile());
  useEffect(()=>{const update=()=>setProfile(game.profile());window.addEventListener('bara:profile',update);window.addEventListener('bara:save',update);return()=>{window.removeEventListener('bara:profile',update);window.removeEventListener('bara:save',update);};},[]);
  const [choice,setChoice]=useState(false);
  const [busy,setBusy]=useState(false);
  const [retry,setRetry]=useState(0);
  const attached=useRef(null),session=useRef(null),auth=useRef({}),flushTimer=useRef(null);
  const userId=authenticated?user?.id:null;
  auth.current={userId,getAccessToken};
  const showStatus=(state,text)=>setStatus({state,text});
  const {login}=useLogin({
    onComplete:()=>document.getElementById('accountDialog').showModal(),
    onError:()=>showStatus('error','Login dibatalkan atau belum berhasil. Anda bisa mencoba kembali.')
  });

  useEffect(()=>{
    if(!ready)return;
    let cancelled=false;
    session.current?.close();session.current=null;setChoice(false);
    game.setIdentity(userId);setProfile(null);
    if(!userId){
      attached.current=null;game.detach();
      showStatus('guest','Masuk atau daftar untuk memiliki akun pemain.');return;
    }
    try{localStorage.setItem('6xg-account-used','1');}catch{}
    game.pause();
    const accountKey=keyFor(userId),cached=read(accountKey);
    const remember=(raw,revision)=>{try{localStorage.setItem(accountKey+':cloud-baseline',JSON.stringify({save:raw,revision}));}catch{}};
    const apply=raw=>{if(cancelled)return;attached.current=null;game.attach(accountKey,raw);attached.current=accountKey;};
    (async()=>{
      showStatus('loading','Memuat progres akun…');
      let cloud=null;
      try{
        if(cfg.apiBase){
          cloud=new window.BaraCloudSession(cfg.apiBase,userId,async()=>{
            if(auth.current.userId!==userId)throw new Error('Akun berubah');
            const token=await auth.current.getAccessToken();
            if(auth.current.userId!==userId)throw new Error('Akun berubah');
            return token;
          },{path:'/api/farm-save',onSaved:remember,onStatus:(state,text)=>{if(!cancelled)showStatus(state,text);}});
          session.current=cloud;
          const data=await cloud.load();if(cancelled)return;
          if(data.save){
            const raw=JSON.stringify(data.save);if(!game.validate(raw))throw new Error('Progres tidak valid');
            let baseline=null;try{baseline=JSON.parse(read(accountKey+':cloud-baseline'));}catch{}
            if(cached&&game.validate(cached)&&baseline?.revision===data.revision&&baseline.save!==cached){
              apply(cached);cloud.changed(game.snapshot());await cloud.flush();return;
            }
            remember(raw,data.revision);
            apply(raw);showStatus('synced','Progres tersimpan online.');return;
          }
        }
        if(cached&&game.validate(cached)){
          apply(cached);
          if(cloud){cloud.changed(game.snapshot());await cloud.flush();}
          else showStatus('local','Akun aktif. Progres tersimpan di perangkat ini.');
        }else{
          setChoice(true);showStatus('choose','Mulai kebun untuk akun baru Anda.');
        }
      }catch{
        if(cancelled)return;
        cloud?.close();session.current=null;
        showStatus('error','Progres online belum dapat dimuat. Coba lagi, atau lanjutkan di perangkat ini.');
      }
    })();
    return()=>{cancelled=true;clearTimeout(flushTimer.current);session.current?.close();session.current=null;};
  },[ready,userId,retry]);

  useEffect(()=>{
    const onSave=event=>{
      if(event.detail.key!==attached.current)return;
      session.current?.changed(event.detail.save);
      clearTimeout(flushTimer.current);flushTimer.current=setTimeout(()=>session.current?.flush(),1200);
      // Local saving runs first; the status remains honest about cloud availability.
      queueMicrotask(updateBadge);
    };
    function updateBadge(){
      if(!attached.current)return;
      const synced=status.state==='synced';
      game.setSaveStatus(synced?'TERSIMPAN ONLINE':'TERSIMPAN DI PERANGKAT');
      game.setSaveNote(cfg.apiBase&&status.state!=='local'?'Progres disimpan ke akun saat koneksi tersedia. Jika bermain di perangkat lain, masuk dengan akun yang sama.':'Akun Privy aktif. Progres saat ini tersimpan di perangkat ini; sinkronisasi lintas perangkat belum tersambung.');
    }
    window.addEventListener('bara:save',onSave);
    const onHide=()=>{if(document.hidden)session.current?.flush();};
    document.addEventListener('visibilitychange',onHide);
    const interval=setInterval(()=>{session.current?.flush();updateBadge();},15000);
    updateBadge();
    return()=>{window.removeEventListener('bara:save',onSave);document.removeEventListener('visibilitychange',onHide);clearInterval(interval);};
  },[status.state,userId]);

  function choose(){
    if(!userId)return;
    attached.current=null;
    game.attach(keyFor(userId),null);
    attached.current=keyFor(userId);setChoice(false);
    if(session.current){session.current.changed(game.snapshot());session.current.flush();}
    else showStatus('local','Akun aktif. Progres tersimpan di perangkat ini.');
  }
  function continueLocal(){
    if(!userId)return;
    const raw=read(keyFor(userId));attached.current=null;
    game.attach(keyFor(userId),raw&&game.validate(raw)?raw:null);attached.current=keyFor(userId);
    showStatus('local','Progres tersimpan di perangkat ini. Sinkronisasi belum tersambung.');
  }
  async function signOut(){
    setBusy(true);game.pause();
    try{await session.current?.flush();await logout();}
    catch{showStatus('error','Belum dapat keluar. Coba kembali.');}
    finally{setBusy(false);}
  }
  const name=user?.email?.address||user?.google?.email||user?.wallet?.address||'Pemain';
  const open=()=>document.getElementById('accountDialog').showModal();
  return <>
    <button className="account-btn" onClick={open} aria-label={authenticated?'Buka akun pemain':'Daftar atau masuk'}>
      <span className="account-avatar" aria-hidden="true">{authenticated?({sprout:"🌱",sunflower:"🌻",apple:"🍎",bee:"🐝"}[profile?.avatar]||"🌱"):"◉"}</span>
      <span className="account-name">{authenticated?(profile?.name||'Akun pemain'):'Daftar / Masuk'}</span>
    </button>
    {createPortal(<>
      {authenticated?<><p className="account-email">{name}</p><p className="account-meta">Identitas terverifikasi melalui Privy.</p></>:<p className="account-copy">Daftar atau masuk dengan metode yang tersedia melalui Privy. Akun baru dibuat setelah identitas Anda terverifikasi.</p>}
      <div className="account-status" data-state={status.state} role="status">{status.text}</div>
      {!cfg.apiBase&&<div className="account-notice"><p className="account-copy">Penyimpanan online belum aktif.</p><p className="account-meta">Progres tetap tersimpan di browser perangkat ini. Akun belum menyinkronkan kebun ke perangkat lain.</p></div>}
      <div className="account-actions">
        {!authenticated&&<button className="primary" disabled={!ready||busy} onClick={()=>{document.getElementById('accountDialog').close();login({disableSignup:false});}}>{ready?'Daftar / Masuk dengan Privy ↗':'Menyiapkan login…'}</button>}
        {authenticated&&choice&&<button className="primary" onClick={choose}>Mulai kebun baru</button>}
        {authenticated&&game.canPlay()&&<button className="primary" onClick={()=>{document.getElementById('accountDialog').close();game.enter();}}>Mainkan Ladang Bara ↗</button>}
        {authenticated&&['error','local'].includes(status.state)&&cfg.apiBase&&<><button className="primary" onClick={()=>setRetry(n=>n+1)}>Coba sinkronkan lagi</button>{status.state==='error'&&<button className="secondary" onClick={continueLocal}>Lanjutkan di perangkat ini</button>}</>}
        {authenticated&&status.state==='conflict'&&<button className="primary" onClick={()=>setRetry(n=>n+1)}>Muat progres online</button>}
        {authenticated&&<button className="secondary" disabled={busy||status.state==='loading'} onClick={signOut}>{busy?'Keluar…':'Keluar dari akun'}</button>}
      </div>
      <p className="account-footer">Login diperlukan untuk bermain. Progres disimpan pada akun pemain; kebun baru dimulai dengan 0 koin, 0 bahan, dan 6 bibit wortel gratis. Login ditangani oleh <a href="https://privy.io" target="_blank" rel="noopener noreferrer">Privy</a>.</p>
    </>,document.getElementById('accountBody'))}
  </>;
}

let mounted=false;
export function mountAuth(){
  if(mounted)return;mounted=true;
  document.getElementById('accountBody').replaceChildren();
  createRoot(document.getElementById('accountRoot')).render(
    <PrivyProvider appId={cfg.privyAppId} config={{appearance:{theme:'light',accentColor:'#557c50'},embeddedWallets:{ethereum:{createOnLogin:'off'},solana:{createOnLogin:'off'}}}}>
      <Account/>
    </PrivyProvider>
  );
}
