import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePrivy,useLogin} from '@privy-io/react-auth';
import {startGameSession} from './game-session.js';

export function LandingAccount({cfg}){
  const {ready,authenticated,user,getAccessToken,logout}=usePrivy();
  const [summary,setSummary]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const prompted=useRef(false),opening=useRef(false);
  const currentUser=useRef(null);currentUser.current=authenticated?user?.id:null;
  const [wantPlay,setWantPlay]=useState(()=>new URLSearchParams(location.search).get('next')==='game');
  const play=async()=>{
    if(opening.current)return;opening.current=true;setBusy(true);setError('');
    const id=currentUser.current;
    try{
      await startGameSession({gameOrigin:cfg.gameOrigin,userId:id,getAccessToken});
      if(currentUser.current!==id)throw new Error('Akun berubah. Silakan coba kembali.');
      history.replaceState(null,'','/');window.location.assign(cfg.playUrl||cfg.gameOrigin+'/');
    }catch(e){setError(e.message||'Game belum dapat dibuka. Silakan coba kembali.');dialog().showModal();}
    finally{opening.current=false;setBusy(false);}
  };
  const dialog=()=>document.getElementById('accountDialog');
  const {login}=useLogin({onComplete:()=>{setError('');if(new URLSearchParams(location.search).get('next')==='game')setWantPlay(true);else dialog().showModal();},onError:()=>{setError('Login belum berhasil. Silakan coba kembali.');dialog().showModal();}});
  useEffect(()=>{
    window.BARA_SESSION={ready,authenticated};
    window.dispatchEvent(new CustomEvent('bara:session',{detail:{ready,authenticated}}));
    const params=new URLSearchParams(location.search);
    if(ready&&!prompted.current&&params.get('login')==='1'){
      prompted.current=true;
      if(!authenticated)login({disableSignup:false});
    }
  },[ready,authenticated]);
  useEffect(()=>{if(ready&&authenticated&&user?.id&&wantPlay){setWantPlay(false);play();}},[ready,authenticated,user?.id,wantPlay]);
  useEffect(()=>{const open=()=>play();document.addEventListener('bara:game-open',open);return()=>document.removeEventListener('bara:game-open',open);},[getAccessToken,user?.id]);
  useEffect(()=>{if(ready&&!prompted.current&&new URLSearchParams(location.search).get('logout')==='1'){prompted.current=true;logout().then(()=>history.replaceState(null,'','/')).catch(()=>setError('Belum dapat keluar. Coba lagi.'));}},[ready]);
  useEffect(()=>{
    let cancelled=false;setSummary(null);if(!ready||!authenticated)return;
    (async()=>{try{
      const token=await getAccessToken();if(!token)return;
      const response=await fetch(cfg.apiBase+'/api/farm-save',{headers:{Authorization:'Bearer '+token}});
      if(!response.ok)return;const data=await response.json();
      if(!cancelled&&data.save)setSummary(data.save.state?.profile||null);
    }catch{}})();return()=>{cancelled=true;};
  },[ready,authenticated,user?.id]);
  const name=summary?.name||'Akun pemain';
  const accountLabel=user?.email?.address||user?.google?.email||(user?.twitter?.username?'@'+user.twitter.username:user?.twitter?.name)||user?.wallet?.address||'Akun terverifikasi';
  const begin=()=>{dialog().close();setError('');login({disableSignup:false});};
  const signOut=async()=>{setBusy(true);try{const response=await fetch(new URL('/api/game-session/logout',cfg.gameOrigin),{method:'POST',credentials:'include'});if(!response.ok)throw new Error('Logout failed');await logout();}catch{setError('Belum dapat keluar. Coba lagi.');}finally{setBusy(false);}};
  return <>
    <button className="account-btn" aria-label={authenticated?'Buka akun pemain':'Daftar atau masuk'} onClick={()=>dialog().showModal()}><span className="login-symbol" aria-hidden="true">{authenticated?'✓':'↗'}</span>{authenticated?name:'Daftar / Masuk'}</button>
    {createPortal(<>
      <p className="account-eyebrow">AKUN LADANG BARA</p>
      <h3>{authenticated?'Selamat datang, '+name+'.':'Satu akun. Kebun milikmu.'}</h3>
      <p className="account-copy">{authenticated?accountLabel:'Daftar atau masuk melalui Privy. Akun baru dibuat setelah identitasmu terverifikasi.'}</p>
      <div className="account-status" role="status">{error||(busy?'Menghubungkan sesi game…':!ready?'Menyiapkan login…':authenticated?'Akun terhubung. Kebun siap dibuka.':'Mulai dengan 6 bibit wortel gratis, 0 koin, dan 0 bahan bangunan.')}</div>
      {authenticated&&summary?.farmName&&<p className="farm-summary">Kebunmu: <strong>{summary.farmName}</strong></p>}
      <div className="account-actions">{authenticated?<><button className="primary" disabled={busy} onClick={play}>{busy?'Menghubungkan…':'Mainkan kebunmu ↗'}</button><button className="secondary" disabled={busy} onClick={signOut}>Keluar dari akun</button></>:<button className="primary" disabled={!ready||busy} onClick={begin}>{ready?'Daftar / Masuk ↗':'Menyiapkan login…'}</button>}</div>
      <p className="account-footer">Login ditangani oleh <a href="https://privy.io" target="_blank" rel="noopener noreferrer">Privy</a>. Progres kebun disimpan online pada akun yang sama.</p>
    </>,document.getElementById('accountBody'))}
  </>;
}

