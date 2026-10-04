'use strict';
(function(root){
 const SLOT=30*60000,TRANSITION=120000,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function profile(slot){let seed=Math.imul(slot^60105,1597334677);seed=Math.imul(seed^(seed>>>16),2246822507);const n=((seed^(seed>>>13))>>>0)/4294967296;return n<.55?{cloud:.12,rain:0,wind:.75}:n<.82?{cloud:.62,rain:0,wind:1.2}:{cloud:.9,rain:.72,wind:1.65};}
 function at(timestamp=Date.now()){
  const stamp=Number.isFinite(timestamp)?timestamp:Date.now(),slot=Math.floor(stamp/SLOT),previous=profile(slot-1),next=profile(slot),blend=smooth((stamp-slot*SLOT)/TRANSITION);
  const mix=k=>previous[k]+(next[k]-previous[k])*blend,rain=mix('rain'),cloud=mix('cloud');
  // Dampness lingers after rain; farming timers and inventory are unaffected.
  const age=stamp-slot*SLOT,wetness=Math.max(rain,...Array.from({length:8},(_,i)=>profile(slot-i-1).rain*.65*Math.exp(-(age+i*SLOT)/SLOT)));
  return{cloud,rain,wind:mix('wind'),wetness,phase:rain>.15?'rain':cloud>.4?'cloudy':'clear'};
 }
 root.FarmWeather=Object.freeze({at,profile,SLOT,TRANSITION});
})(typeof window!=='undefined'?window:globalThis);
