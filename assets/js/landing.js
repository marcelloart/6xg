'use strict';
const navToggle=document.getElementById('navToggle'),nav=document.getElementById('siteNav');
navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';navToggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a')){navToggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>{
  if(window.BARA_SESSION?.authenticated)document.dispatchEvent(new Event('bara:game-open'));
  else document.dispatchEvent(new Event('bara:account-open'));
}));
window.addEventListener('bara:session',event=>document.querySelectorAll('[data-start]').forEach(button=>{button.textContent=event.detail.authenticated?'Mainkan kebunmu ↗':'Daftar & mulai ↗';}));
