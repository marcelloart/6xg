import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePrivy,useLogin} from '@privy-io/react-auth';

export function LandingAccount({cfg}){
  const {ready,authenticated,user,getAccessToken,logout}=usePrivy();
  const [summary,setSummary]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const prompted=useRef(false);
  const play=()=>window.location.assign(cfg.gameOrigin+'/');
  const dialog=()=>document.getElementById('accountDialog');
  const {login}=useLogin({onComplete:()=>{setError('');if(new URLSearchParams(location.search).get('next')==='game')play();else dialog().showModal();},onError:()=>{setError('Login belum berhasil. Silakan coba kembali.');dialog().showModal();}});
  useEffect(()=>{
    window.BARA_SESSION={ready,authenticated};
    window.dispatchEvent(new CustomEvent('bara:session',{detail:{ready,authenticated}}));
    const params=new URLSearchParams(location.search);
    if(ready&&!prompted.current&&params.get('login')==='1'){
      prompted.current=true;
      if(authenticated&&params.get('next')==='game')play();else if(!authenticated)login({disableSignup:false});
    }
  },[ready,authenticated]);
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
  const email=user?.email?.address||user?.google?.email||'Akun terverifikasi';
  const begin=()=>{dialog().close();setError('');login({disableSignup:false});};
  const signOut=async()=>{setBusy(true);try{await logout();}catch{setError('Belum dapat keluar. Coba lagi.');}finally{setBusy(false);}};
  return <>
    <button className="account-btn" aria-label={authenticated?'Buka akun pemain':'Daftar atau masuk'} onClick={()=>dialog().showModal()}><span className="login-symbol" aria-hidden="true">{authenticated?'✓':'↗'}</span>{authenticated?name:'Daftar / Masuk'}</button>
    {createPortal(<>
      <p className="account-eyebrow">AKUN LADANG BARA</p>
      <h3>{authenticated?'Selamat datang, '+name+'.':'Satu akun. Kebun milikmu.'}</h3>
      <p className="account-copy">{authenticated?email:'Daftar atau masuk melalui Privy. Akun baru dibuat setelah identitasmu terverifikasi.'}</p>
      <div className="account-status" role="status">{error||(!ready?'Menyiapkan login…':authenticated?'Akun terhubung. Kebun siap dibuka.':'Mulai dengan 6 bibit wortel gratis, 0 koin, dan 0 bahan bangunan.')}</div>
      {authenticated&&summary?.farmName&&<p className="farm-summary">Kebunmu: <strong>{summary.farmName}</strong></p>}
      <div className="account-actions">{authenticated?<><button className="primary" onClick={play}>Mainkan kebunmu ↗</button><button className="secondary" disabled={busy} onClick={signOut}>{busy?'Keluar…':'Keluar dari akun'}</button></>:<button className="primary" disabled={!ready||busy} onClick={begin}>{ready?'Daftar / Masuk ↗':'Menyiapkan login…'}</button>}</div>
      <p className="account-footer">Login ditangani oleh <a href="https://privy.io" target="_blank" rel="noopener noreferrer">Privy</a>. Progres kebun disimpan online pada akun yang sama.</p>
    </>,document.getElementById('accountBody'))}
  </>;
}

