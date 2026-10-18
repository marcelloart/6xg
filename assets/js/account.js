'use strict';
const harvestT_account_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
// Exactly one login SDK owns a page. A saved preference is not proof of identity.
let authLoading=null,authProvider=null,authStarted=false,authSwitching=false;
const authWords=(en,id)=>window.BaraI18n?.language==='id'?id:en;
const dualAuth=()=>window.BARA_FIREBASE?.enabled===true&&window.BARA_PAGE==='landing';
const validAuthProvider=value=>value==='privy'||value==='firebase';
function rememberedAuthProvider(){
 const hint=new URLSearchParams(location.search).get('auth');if(validAuthProvider(hint))return hint;
 try{const saved=localStorage.getItem('6xg:login-provider');return validAuthProvider(saved)?saved:null;}catch{return null;}
}
function rememberAuthProvider(provider){try{localStorage.setItem('6xg:login-provider',provider);}catch{}}
function authSwitchURL(provider){
 const url=new URL('/',window.BARA_ONLINE.siteOrigin),params=new URLSearchParams(location.search);
 url.searchParams.set('auth',provider);url.searchParams.set('login','1');
 if(params.get('next')==='game')url.searchParams.set('next','game');
 if(params.get('return')==='market')url.searchParams.set('return','market');
 return url.href;
}
function authFailure(){authLoading=null;window.HarvestLoading?.fail();document.getElementById('accountBody').textContent=harvestT_account_js('Login belum dapat dimuat. Periksa koneksi, lalu buka Akun kembali.');}
function showAuthChoices(){
 if(!dualAuth())return;
 let choices=document.getElementById('authProviderChoices');
 if(!choices){choices=document.createElement('section');choices.id='authProviderChoices';choices.className='auth-provider-choices';choices.setAttribute('aria-label',authWords('Sign-in options','Pilihan login'));document.getElementById('accountDialog').append(choices);}
 choices.replaceChildren();
 const label=document.createElement('p');label.textContent=authWords('Choose your sign-in option','Pilih cara masukmu');choices.append(label);
 const methods=window.BARA_FIREBASE.providers||{},firebaseMethods=[methods.google?'Google':null,methods.twitter?'X':null,methods.email?'Email':null].filter(Boolean).join(' · ')||authWords('Sign in','Masuk');
 for(const [key,title,copy]of [['firebase','Firebase',firebaseMethods],['privy','Privy',authWords('Google, X, email and crypto wallet','Google, X, email, dan wallet crypto')]]){
  const button=document.createElement('button');button.type='button';button.dataset.loginProvider=key;button.className='auth-provider-option';button.setAttribute('aria-pressed',String(authProvider===key));button.disabled=authSwitching;
  const name=document.createElement('strong');name.textContent=title;const description=document.createElement('small');description.textContent=copy;button.append(name,description);button.addEventListener('click',()=>void chooseAuthProvider(key));choices.append(button);
 }
}
function showAuthIntro(){
 const body=document.getElementById('accountBody');body.replaceChildren();const heading=document.createElement('h3');heading.textContent=authWords('Welcome to your farm.','Selamat datang di kebunmu.');const copy=document.createElement('p');copy.className='account-copy';copy.textContent=authWords('Sign in or create an account with either option below. Link your accounts to use the same farm.','Masuk atau daftar melalui salah satu pilihan di bawah. Hubungkan kedua akun untuk memakai kebun yang sama.');body.append(heading,copy);
 window.BARA_SESSION={ready:true,authenticated:false};window.dispatchEvent(new CustomEvent('bara:session',{detail:window.BARA_SESSION}));showAuthChoices();
}
function loadAuth(provider){
 if(authLoading)return authLoading;authProvider=provider;authStarted=true;
 const entry=provider==='firebase'?window.BARA_FIREBASE_ENTRY:window.BARA_AUTH_ENTRY;
 authLoading=import(new URL(entry,document.baseURI).href).then(module=>module.mountAuth()).catch(authFailure);return authLoading;
}
async function chooseAuthProvider(provider){
 if(!dualAuth()||!validAuthProvider(provider)||authSwitching)return;
 if(authStarted&&authProvider!==provider){
  const previousSession=window.BARA_SESSION;authSwitching=true;document.getElementById('accountBody').inert=true;window.BARA_SESSION={ready:true,authenticated:false};window.dispatchEvent(new CustomEvent('bara:session',{detail:window.BARA_SESSION}));showAuthChoices();
  try{const response=await fetch(new URL('/api/game-session/logout',window.BARA_ONLINE.gameOrigin),{method:'POST',credentials:'include'});if(!response.ok)throw Error('Session switch failed');rememberAuthProvider(provider);location.assign(authSwitchURL(provider));}
  catch{authSwitching=false;document.getElementById('accountBody').inert=false;window.BARA_SESSION=previousSession;window.dispatchEvent(new CustomEvent('bara:session',{detail:window.BARA_SESSION}));showAuthChoices();let status=document.getElementById('authSwitchStatus');if(!status){status=document.createElement('p');status.id='authSwitchStatus';status.setAttribute('role','alert');document.getElementById('authProviderChoices').append(status);}status.textContent=authWords('Could not switch accounts. Please try again.','Belum dapat mengganti akun. Silakan coba lagi.');}return;
 }
 authProvider=provider;rememberAuthProvider(provider);showAuthChoices();await loadAuth(provider);
}
function restoreAccount(){
 if(dualAuth()){
  const provider=rememberedAuthProvider();if(provider){authProvider=provider;rememberAuthProvider(provider);showAuthChoices();return loadAuth(provider);}showAuthIntro();return;
 }
 return loadAuth(window.BARA_FIREBASE?.enabled?'firebase':'privy');
}
function openAccountDialog(){document.getElementById('accountDialog').showModal();if(!authLoading)restoreAccount();else showAuthChoices();}
document.getElementById('accountButton').addEventListener('click',openAccountDialog);
document.addEventListener('bara:account-open',openAccountDialog);
if(window.BARA_PAGE==='game')restoreAccount();else if('requestIdleCallback'in window)requestIdleCallback(restoreAccount,{timeout:2000});else setTimeout(restoreAccount,500);
if(dualAuth()&&new URLSearchParams(location.search).get('login')==='1')document.getElementById('accountDialog').showModal();
