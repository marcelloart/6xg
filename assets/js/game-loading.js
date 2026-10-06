'use strict';
// The loader observes readiness; it never attaches account data or authorizes play.
(()=>{
 const root=document.getElementById('gameLoading');if(!root)return;
 const get=id=>document.getElementById(id),words=(en,id)=>window.BaraI18n?.language==='id'?id:en;
 let identified=false,account=false,assets=false,frame=false,finished=false,leaving=false,failed=false,slow=false,slowTimer=null,exitTimer=null,scene=null;
 const surfaces=()=>[get('map'),document.querySelector('.topbar')].filter(Boolean);
 function block(on){document.body.classList.toggle('game-booting',on);for(const el of surfaces()){el.inert=on;if(on)el.setAttribute('aria-hidden','true');else el.removeAttribute('aria-hidden');}document.body.setAttribute('aria-busy',String(on));}
 function copy(){get('bootTitle').textContent=words('Growing your world.','Menyiapkan duniamu.');get('bootKicker').textContent=words('A LITTLE SEED. A NEW ADVENTURE.','SATU BENIH. PETUALANGAN BARU.');get('bootAccountStep').textContent=words('Account','Akun');get('bootFarmStep').textContent=words('Farm','Kebun');get('bootReadyStep').textContent=words('Ready','Siap');get('bootRetry').textContent=words('Try again','Coba lagi');get('bootLight').textContent=words('Use lighter graphics','Gunakan tampilan ringan');get('bootHome').textContent=words('Back to home','Kembali ke beranda');get('bootProgress').setAttribute('aria-label',words('Preparing your farm','Menyiapkan kebunmu'));}
 function status(){if(failed||finished||leaving)return;root.dataset.state=identified?account&&assets?'finishing':'farm':'account';get('bootMessage').textContent=slow?(assets?words('This is taking a little longer. Check your connection or try again.','Persiapan lebih lama dari biasanya. Periksa koneksi atau coba lagi.'):words('Still preparing your farm. You can retry or use lighter graphics.','Kebun masih disiapkan. Kamu bisa mencoba lagi atau memakai tampilan ringan.')):!identified?words('Connecting to your farm account…','Menghubungkan akun kebunmu…'):!account?words('Loading your farm progress…','Memuat progres kebunmu…'):!assets?words('Preparing the fields and farm life…','Menyiapkan ladang dan kehidupan kebun…'):words('Putting the finishing touches…','Menyelesaikan persiapan kebun…');get('bootAccountStep').dataset.step=identified?'complete':'active';get('bootFarmStep').dataset.step=identified?(account&&assets?'complete':'active'):'waiting';get('bootReadyStep').dataset.step=account&&assets?'active':'waiting';if(account&&assets&&frame)finish();}
 function finish(){if(finished||leaving||failed||!window.LadangBara?.canPlay())return;leaving=true;clearTimeout(slowTimer);root.dataset.state='ready';get('bootMessage').textContent=words('Your farm is ready.','Kebunmu sudah siap.');get('bootActions').hidden=true;root.classList.add('is-leaving');const end=()=>{if(!leaving)return;finished=true;leaving=false;root.hidden=true;block(false);get('worldCanvas')?.focus({preventScroll:true});};exitTimer=setTimeout(end,matchMedia('(prefers-reduced-motion: reduce)').matches?0:550);}
 function start(){clearTimeout(exitTimer);clearTimeout(slowTimer);finished=false;leaving=false;failed=false;slow=false;identified=false;account=false;frame=false;root.hidden=false;root.classList.remove('is-leaving');get('bootActions').hidden=true;block(true);status();slowTimer=setTimeout(()=>{if(finished||leaving||failed)return;slow=true;status();get('bootActions').hidden=false;get('bootLight').hidden=assets;},25000);}
 function fail(){if(finished||leaving)return;failed=true;clearTimeout(slowTimer);root.dataset.state='error';get('bootTitle').textContent=words('Let’s reconnect.','Hubungkan kembali.');get('bootMessage').textContent=words('Your farm could not be loaded. Check your connection and try again.','Kebun belum dapat dimuat. Periksa koneksi lalu coba lagi.');get('bootActions').hidden=false;get('bootLight').hidden=true;const dialog=get('accountDialog');if(dialog?.open)dialog.close();}
 const api={
  identity(id){if(!id)return;if(finished||leaving){start();copy();}identified=true;failed=false;get('bootTitle').textContent=words('Growing your world.','Menyiapkan duniamu.');status();},
  graphics(renderer){scene=renderer;assets=!renderer.assetReady;if(renderer.assetReady)Promise.resolve(renderer.assetReady).then(()=>{if(scene!==renderer)return;assets=true;frame=false;status();},fail);status();},
  accountReady(){account=true;frame=false;failed=false;status();},
  frameReady(){if(scene?.lost)return;frame=true;status();},
  fail
 };window.HarvestLoading=Object.freeze(api);
 copy();start();
 get('bootRetry').addEventListener('click',()=>location.reload());get('bootLight').addEventListener('click',()=>{try{localStorage.setItem('6xg:graphics','2d');}catch{}location.reload();});
 // Existing auth renders failures here, including errors restoring the cookie session.
 new MutationObserver(()=>{const state=document.querySelector('#accountBody .account-status')?.dataset.state;if(state==='error')fail();}).observe(get('accountBody'),{subtree:true,childList:true,attributes:true,attributeFilter:['data-state']});
 window.addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT'&&!finished)fail();},true);
})();
