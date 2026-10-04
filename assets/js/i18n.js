'use strict';
// Interface copy only. Account IDs, inventory keys, and player-entered names stay unchanged.
(function(root){
 const languages=Object.freeze({en:'English',id:'Bahasa Indonesia'}),key='6xg:language',cookie='6xg_language';
 const valid=value=>Object.hasOwn(languages,value)?value:null;
 function preference(){let shared=null,local=null;try{shared=valid(document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1));}catch{}try{local=valid(localStorage.getItem(key));}catch{}return shared||local||'en';}
 const language=preference(),catalog=root.BaraTranslations||{},memo=new Map();
 const entries=Object.entries(catalog).sort((a,b)=>b[0].length-a[0].length);
 const byLower=new Map();for(const [source,target] of entries){const lower=source.toLowerCase();if(!byLower.has(lower)||source!==source.toUpperCase())byLower.set(lower,target);}
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const matcher=new RegExp('(?<![\\p{L}\\p{N}_-])(?:'+entries.map(([source])=>escape(source)).join('|')+')(?![\\p{L}\\p{N}_-])','giu');
 function english(value){if(memo.has(value))return memo.get(value);const result=value.replace(matcher,source=>{const target=byLower.get(source.toLowerCase());if(/[a-zA-Z]/.test(source)&&source===source.toUpperCase())return target.toUpperCase();if(source===source.toLowerCase())return target.toLowerCase();if(/^[A-Z]/.test(source))return target[0].toUpperCase()+target.slice(1);return target;});if(memo.size<3000)memo.set(value,result);return result;}
 function t(value){return typeof value==='string'&&language==='en'?english(value):value;}
 function defaultName(value){return ['Pekebun','Kebunku','Akun pemain'].includes(value)?t(value):value;}
 function remember(value){if(!valid(value))return false;try{localStorage.setItem(key,value);}catch{}try{const shared=location.hostname==='6xg.online'||location.hostname.endsWith('.6xg.online');document.cookie=cookie+'='+value+'; Path=/; Max-Age=31536000; SameSite=Lax'+(shared?'; Domain=6xg.online; Secure':'');}catch{}return true;}
 function setLanguage(value){if(!remember(value)||value===language)return;location.reload();}
 function localize(container){
  if(!container)return;const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){if(node.parentElement?.closest('script,style,[data-i18n-skip],option[data-language]'))continue;const translated=t(node.nodeValue);if(translated!==node.nodeValue)node.nodeValue=translated;}
  for(const el of container.querySelectorAll('[title],[alt],[aria-label],[placeholder]')){if(el.closest('[data-i18n-skip]'))continue;for(const attr of ['title','alt','aria-label','placeholder'])if(el.hasAttribute(attr))el.setAttribute(attr,t(el.getAttribute(attr)));}
  document.documentElement.lang=language;document.title=t(document.title);
  for(const meta of document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]'))meta.content=t(meta.content);
  for(const select of container.querySelectorAll('[data-language-picker]')){select.value=language;select.setAttribute('aria-label',language==='id'?'Bahasa':'Language');select.addEventListener('change',()=>setLanguage(select.value));}
 }
 root.BaraI18n=Object.freeze({language,locale:language==='id'?'id-ID':'en-US',languages,t,defaultName,setLanguage,localize});
 if(typeof document!=='undefined')document.documentElement.lang=language;
})(typeof window!=='undefined'?window:globalThis);
