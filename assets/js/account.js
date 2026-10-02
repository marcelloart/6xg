'use strict';
// The authentication SDK loads only when needed, so the map is playable first.
let authLoading=null;
function openAccountDialog(){
  document.getElementById('accountDialog').showModal();
  if(!authLoading){
    authLoading=import(new URL(window.BARA_AUTH_ENTRY,document.baseURI).href)
      .then(module=>module.mountAuth())
      .catch(()=>{
        authLoading=null;
        document.getElementById('accountBody').textContent='Login belum dapat dimuat. Periksa koneksi, lalu buka Akun kembali.';
      });
  }
}
document.getElementById('accountButton').addEventListener('click',openAccountDialog);
document.addEventListener('bara:account-open',openAccountDialog);
// Returning players restore their identity without delaying the initial game.
try{
  if(localStorage.getItem('6xg-account-used')==='1'){
    const restore=()=>{if(!authLoading)authLoading=import(new URL(window.BARA_AUTH_ENTRY,document.baseURI).href).then(module=>module.mountAuth()).catch(()=>{authLoading=null;});};
    if('requestIdleCallback'in window)requestIdleCallback(restore,{timeout:3000});else setTimeout(restore,1000);
  }
}catch{}
