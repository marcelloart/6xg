import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {AccountAvatar} from './account-avatar.jsx';
const harvestT_privy_jsx=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value.replaceAll('Firebase','Privy')).replaceAll('Privy','Firebase'):value;
const cfg=window.BARA_ONLINE,game=window.LadangBara;
const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const keyFor=id=>'6xg-farm:'+id;
export function FarmAccount({identity,login}){
  const {ready,authenticated,user,getAccessToken,logout}=identity;
  const accountT=value=>harvestT_privy_jsx(value).replaceAll('Firebase',identity.provider==='privy'?'Privy':'Firebase');
  const [status,setStatus]=useState({state:'loading',text:accountT('Menyiapkan login Firebase…')});
  const [profile,setProfile]=useState(game.profile());
  useEffect(()=>{const update=()=>setProfile(game.profile());window.addEventListener('bara:profile',update);window.addEventListener('bara:save',update);return()=>{window.removeEventListener('bara:profile',update);window.removeEventListener('bara:save',update);};},[]);
  const [choice,setChoice]=useState(false);
  const [busy,setBusy]=useState(false);
  const [retry,setRetry]=useState(0);
  const attached=useRef(null),session=useRef(null),auth=useRef({}),flushTimer=useRef(null);
  const userId=authenticated?user?.id:null;
  auth.current={userId,getAccessToken};
  const showStatus=(state,text)=>setStatus({state,text});
  useEffect(()=>{
    if(!ready)return;
    let cancelled=false;
    session.current?.close();session.current=null;setChoice(false);
    game.setIdentity(userId);game.setAccountPhoto(user?.twitter?.profilePictureUrl);setProfile(null);
    if(!userId){
      attached.current=null;game.detach();
      if(identity.error)showStatus('error',accountT('Sesi game belum dapat dipulihkan. Hubungkan akun kembali untuk mencoba lagi.'));
      else showStatus('guest',accountT('Masuk atau daftar untuk memiliki akun pemain.'));return;
    }
    try{localStorage.setItem('6xg-account-used','1');}catch{}
    game.pause();
    const accountKey=keyFor(userId);let cached=read(accountKey);
    const remember=(raw,revision)=>{try{localStorage.setItem(accountKey+':cloud-baseline',JSON.stringify({save:raw,revision}));}catch{}};
    const apply=raw=>{if(cancelled)return;attached.current=null;game.attach(accountKey,raw);attached.current=accountKey;if(window.BARA_PAGE==='game')game.enter();};
    (async()=>{
      showStatus('loading',accountT('Memuat progres akun…'));
      let cloud=null;
      try{
        if(!cfg.apiBase)throw new Error(accountT('Server diperlukan'));
        cloud=new window.BaraFarmSession(identity.apiBase||cfg.apiBase,userId,async()=>{
          if(auth.current.userId!==userId)throw new Error(accountT('Akun berubah'));
          const token=await auth.current.getAccessToken();if(auth.current.userId!==userId)throw new Error(accountT('Akun berubah'));return token;
        },{cookieSession:identity.cookieSession===true,...(identity.fetcher?{fetcher:identity.fetcher}:{}),onSaved:remember,
          onState:data=>{if(!cancelled&&attached.current===accountKey)game.receiveState(data);},onStatus:(state,text)=>{if(!cancelled)showStatus(state,text);}});
        session.current=cloud;
        const data=await cloud.load();if(cancelled)return;
        const raw=JSON.stringify(data.save);if(!game.validate(raw))throw new Error(accountT('Progres tidak valid'));
        apply(raw);game.connectActions(cloud);game.receiveState(data);showStatus('synced',accountT('Progres dan transaksi diperiksa server.'));
      }catch{
        if(cancelled)return;
        cloud?.close();session.current=null;
        showStatus('error',accountT('Progres online belum dapat dimuat. Kebun tetap aman di akunmu. Coba lagi setelah terhubung.'));
        if(window.BARA_PAGE==='game')document.getElementById('accountDialog').showModal();
      }
    })();
    return()=>{cancelled=true;clearTimeout(flushTimer.current);session.current?.close();session.current=null;};
  },[ready,userId,retry]);
  useEffect(()=>{game.setAccountPhoto(authenticated?user?.twitter?.profilePictureUrl:null);},[authenticated,userId,user?.twitter?.profilePictureUrl]);

  useEffect(()=>{
    const onSave=event=>{
      if(event.detail.key!==attached.current)return;
      // This event caches a confirmed server state; it never uploads balances.
      queueMicrotask(updateBadge);
    };
    function updateBadge(){
      if(!attached.current)return;
      const synced=status.state==='synced';
      game.setSaveStatus(synced?accountT('TERSIMPAN ONLINE'):status.state==='saving'?accountT('MEMERIKSA TRANSAKSI'):accountT('MENUNGGU SERVER'));
      game.setSaveNote(accountT('Koin, hasil panen, pesanan, dan waktu tumbuh ditentukan server. Gunakan akun yang sama untuk melanjutkan di perangkat lain.'));
    }
    window.addEventListener('bara:save',onSave);
    const onHide=()=>{if(!document.hidden)session.current?.flush();};
    document.addEventListener('visibilitychange',onHide);
    const interval=setInterval(()=>{session.current?.flush();updateBadge();},15000);
    updateBadge();
    return()=>{window.removeEventListener('bara:save',onSave);document.removeEventListener('visibilitychange',onHide);clearInterval(interval);};
  },[status.state,userId]);

  async function signOut(){
    setBusy(true);game.pause();
    try{await session.current?.flush();await logout();}
    catch{showStatus('error',accountT('Belum dapat keluar. Coba kembali.'));}
    finally{setBusy(false);}
  }
  const name=user?.email?.address||user?.google?.email||(user?.twitter?.username?'@'+user.twitter.username:user?.twitter?.name)||user?.wallet?.address||accountT('Pemain');
  const open=()=>document.getElementById('accountDialog').showModal();
  return <>
    <button className="account-btn" onClick={open} aria-label={authenticated?accountT('Buka akun pemain'):accountT('Daftar atau masuk')}>
      <AccountAvatar authenticated={authenticated} profile={profile} accountURL={user?.twitter?.profilePictureUrl}/>
      <span className="account-name">{authenticated?((typeof BaraI18n!=='undefined'?BaraI18n.defaultName(profile?.name):profile?.name)||accountT('Akun pemain')):accountT('Daftar / Masuk')}</span>
    </button>
    {createPortal(<>
      {authenticated?<><p className="account-email">{name}</p><p className="account-meta">{accountT("Identitas terverifikasi melalui Firebase.")}</p></>:<p className="account-copy">{accountT("Daftar atau masuk dengan metode yang tersedia melalui Firebase. Akun baru dibuat setelah identitas Anda terverifikasi.")}</p>}
      <div className="account-status" data-state={status.state} role="status">{status.text}</div>
      {!cfg.apiBase&&<div className="account-notice"><p className="account-copy">{accountT("Penyimpanan online belum aktif.")}</p><p className="account-meta">{accountT("Progres tetap tersimpan di browser perangkat ini. Akun belum menyinkronkan kebun ke perangkat lain.")}</p></div>}
      <div className="account-actions">
        {!authenticated&&<button className="primary" disabled={!ready||busy} onClick={()=>{document.getElementById('accountDialog').close();login({disableSignup:false});}}>{!ready?accountT('Menyiapkan login…'):identity.error?accountT('Hubungkan akun kembali ↗'):accountT('Daftar / Masuk dengan Firebase ↗')}</button>}
        
        {authenticated&&game.canPlay()&&<button className="primary" onClick={()=>{document.getElementById('accountDialog').close();game.enter();}}>{accountT("Mainkan 6XG Harvest ↗")}</button>}
        {authenticated&&['error','local'].includes(status.state)&&cfg.apiBase&&<><button className="primary" onClick={()=>setRetry(n=>n+1)}>{accountT("Coba sinkronkan lagi")}</button></>}
        {authenticated&&status.state==='conflict'&&<button className="primary" onClick={()=>setRetry(n=>n+1)}>{accountT("Muat progres online")}</button>}
        {authenticated&&<button className="secondary" disabled={busy||status.state==='loading'} onClick={signOut}>{busy?accountT('Keluar…'):accountT('Keluar dari akun')}</button>}
      </div>
      <p className="account-footer">{accountT("Login diperlukan untuk bermain. Progres disimpan pada akun pemain; kebun baru dimulai dengan 0 koin, 0 bahan, dan 6 bibit wortel gratis. Login ditangani oleh")}<a href={identity.provider==='privy'?'https://privy.io':'https://firebase.google.com/products/auth'} target="_blank" rel="noopener noreferrer">Firebase</a>.</p>
    </>,document.getElementById('accountBody'))}
  </>;
}
