'use strict';
// Restore an existing session on the login screen; playing always needs identity.
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
const restore=()=>{if(!authLoading)authLoading=import(new URL(window.BARA_AUTH_ENTRY,document.baseURI).href).then(module=>module.mountAuth()).catch(()=>{authLoading=null;});};
if('requestIdleCallback'in window)requestIdleCallback(restore,{timeout:2000});else setTimeout(restore,500);
