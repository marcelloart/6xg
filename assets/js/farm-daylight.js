'use strict';
// Visual time is fixed to Asia/Jakarta (UTC+7), independent of the device timezone.
// A 06:00–18:00 daylight cycle is an art direction, not an astronomical ephemeris.
(function(root){
 const smooth=(a,b,v)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);};
 function at(timestamp=Date.now()){
  const stamp=Number.isFinite(timestamp)?timestamp:Date.now();
  const hour=((stamp/3600000+7)%24+24)%24;
  const daylight=smooth(5.5,7,hour)*(1-smooth(17,18.5,hour));
  const altitude=Math.sin((hour-6)*Math.PI/12);
  const golden=daylight*(1-smooth(.12,.6,Math.max(0,altitude)));
  const phase=hour<5.5||hour>=18.5?'Malam':hour<7?'Fajar':hour<16.5?'Siang':'Senja';
  const minutes=Math.floor(hour*60+1e-7)%1440;
  return {hour,daylight,golden,phase,clock:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0'),
   // X is east; the sun moves from east at dawn to west at dusk.
   sun:{x:Math.cos((hour-6)*Math.PI/12)*1250,y:Math.max(.04,altitude)*1500,z:-280},
   sunIntensity:2.2*daylight*Math.max(.18,altitude),moonIntensity:.6*(1-daylight),
   hemisphereIntensity:.9+.25*daylight,environmentIntensity:.25+.4*daylight,backgroundIntensity:.035+.715*daylight};
 }
 function describe(value){const phase=typeof BaraI18n!=='undefined'?BaraI18n.t(value.phase):value.phase;return phase+' · '+value.clock+' WIB (Jakarta)';}
 root.FarmDaylight=Object.freeze({at,describe});
})(typeof window!=='undefined'?window:globalThis);
