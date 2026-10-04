'use strict';
// Original, lightweight farm foley. No remote audio, autoplay, or microphone access.
class FarmAudio {
 constructor({contextFactory,storage,random=Math.random,onChange=()=>{}}={}){
  this.contextFactory=contextFactory||(()=>{const Audio=window.AudioContext||window.webkitAudioContext;return Audio?new Audio({latencyHint:'interactive'}):null;});
  try{this.storage=storage===undefined?window.localStorage:storage;}catch{this.storage=null;}
  this.random=random;this.onChange=onChange;this.settings={enabled:true,volume:.65,effects:.8,ambience:.35};
  try{const saved=JSON.parse(this.storage?.getItem('6xg:audio'));if(saved&&typeof saved==='object'){if(typeof saved.enabled==='boolean')this.settings.enabled=saved.enabled;for(const key of['volume','effects','ambience'])if(Number.isFinite(saved[key]))this.settings[key]=Math.max(0,Math.min(1,saved[key]));}}catch{}
  this.ctx=null;this.unlocked=false;this.everUnlocked=false;this.active=false;this.visible=true;this.unavailable=false;this.voices=new Set();this.loops=[];this.environmentBuffers={};this.cooldowns=new Map();this.construction=new Map();this.nextHammer=0;this.nextBird=0;
 }
 init(context){
  this.ctx=context;const c=this.ctx;
  this.master=c.createGain();this.effects=c.createGain();this.ambience=c.createGain();this.boost=c.createGain();this.limiter=c.createDynamicsCompressor();
  // Lift the quiet foley by 12 dB before compression; saved volume and mute still apply.
  this.boost.gain.value=4;
  this.limiter.threshold.value=-12;this.limiter.knee.value=18;this.limiter.ratio.value=5;this.limiter.attack.value=.003;this.limiter.release.value=.18;
  this.effects.connect(this.master);this.ambience.connect(this.master);this.master.connect(this.boost);this.boost.connect(this.limiter);this.limiter.connect(c.destination);
  this.noiseBuffer=this.makeNoise(2,false);this.updateGains();
 }
 async unlock(){
  if(!this.settings.enabled||!this.settings.volume||!this.visible||this.unavailable)return false;
  try{
   if(!this.ctx){const c=this.contextFactory();if(!c){this.unavailable=true;this.onChange();return false;}this.init(c);c.onstatechange=()=>{this.unlocked=c.state==='running';this.onChange();};}
   if(this.ctx.state!=='running'&&this.ctx.state!=='closed')await this.ctx.resume();
   this.unlocked=this.ctx.state==='running';if(this.unlocked)this.everUnlocked=true;this.updateGains();this.startAmbience();this.onChange();return this.unlocked;
  }catch{this.unlocked=false;this.onChange();return false;}
 }
 ramp(parameter,value,time=.035){if(!this.ctx)return;const t=this.ctx.currentTime;parameter.cancelScheduledValues(t);parameter.setTargetAtTime(value,t,time);}
 updateGains(){if(!this.ctx)return;this.ramp(this.master.gain,this.settings.enabled&&this.visible?this.settings.volume:0);this.ramp(this.effects.gain,this.settings.effects);this.ramp(this.ambience.gain,this.active?this.settings.ambience:0);}
 configure(patch){
  if(typeof patch.enabled==='boolean')this.settings.enabled=patch.enabled;
  for(const key of['volume','effects','ambience'])if(Number.isFinite(patch[key]))this.settings[key]=Math.max(0,Math.min(1,patch[key]));
  try{this.storage?.setItem('6xg:audio',JSON.stringify(this.settings));}catch{}
  this.updateGains();if(!this.settings.enabled||!this.settings.volume){this.stopAmbience();this.stopVoices();this.suspend();}else if(!this.settings.ambience)this.stopAmbience();else this.startAmbience();this.onChange();
 }
 setActive(value){value=Boolean(value);if(value===this.active)return;this.active=value;this.updateGains();if(value)this.startAmbience();else{this.stopAmbience();this.stopVoices();this.resetFarm();}}
 setVisible(value){this.visible=Boolean(value);this.updateGains();if(!this.visible){this.stopAmbience();this.stopVoices();this.resetFarm();this.suspend();}else if(this.everUnlocked)return this.unlock();}
 suspend(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
 resetFarm(){this.construction.clear();this.nextHammer=0;this.nextBird=0;}
 makeNoise(seconds,soft,seam=false){
  const buffer=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*seconds),this.ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;
  for(let i=0;i<data.length;i++){const n=this.random()*2-1;previous=soft?(previous+.025*n)/1.025:n;data[i]=soft?previous*3.5:n;}
  // Crossfade the seam of the environmental loop to prevent a repeating click.
  if(soft||seam){const fade=Math.min(Math.floor(this.ctx.sampleRate*.25),data.length/2),tail=data[data.length-1];for(let i=0;i<fade;i++){const a=i/fade;data[i]=tail*(1-a)+data[i]*a;}}
  return buffer;
 }
 connectVoice(source,nodes){
  if(this.voices.size>=48){const oldest=this.voices.values().next().value;oldest.cleanup();try{oldest.source.stop();}catch{}}
  const voice={source,cleanup:()=>{this.voices.delete(voice);for(const node of[source,...nodes])node.disconnect();}};this.voices.add(voice);source.onended=voice.cleanup;
 }
 stopVoices(){for(const voice of[...this.voices]){voice.cleanup();try{voice.source.stop();}catch{}}this.cooldowns.clear();}
 voiceRoute(gain,pan,bus){const target=this[bus];if(this.ctx.createStereoPanner){const p=this.ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(p);p.connect(target);return[p];}gain.connect(target);return[];}
 tone(frequency,end,duration,volume,delay=0,pan=0,bus='effects',type='sine'){
  const c=this.ctx,source=c.createOscillator(),gain=c.createGain(),t=c.currentTime+delay;source.type=type;source.frequency.setValueAtTime(frequency,t);source.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+Math.min(.009,duration/4));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(gain);const route=this.voiceRoute(gain,pan,bus);this.connectVoice(source,[gain,...route]);source.start(t);source.stop(t+duration+.012);
 }
 noise(duration,frequency,volume,delay=0,pan=0,bus='effects'){
  const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime+delay;source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=frequency;filter.Q.value=.55;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);const route=this.voiceRoute(gain,pan,bus);this.connectVoice(source,[filter,gain,...route]);source.start(t,this.random()*.5,duration);source.stop(t+duration+.012);
 }
 emit(name,{pan=0,strength=1,bus='effects',delay=0}={}){
  if(!this.ctx)return;
  const n=(duration,freq,volume,offset=0)=>this.noise(duration,freq,volume*strength,delay+offset,pan,bus),t=(freq,end,duration,volume,offset=0,type='sine')=>this.tone(freq,end,duration,volume*strength,delay+offset,pan,bus,type);
  if(name==='plant'){n(.16,750,.26);n(.11,1500,.1,.12);t(92,42,.16,.12,.07);}
  else if(name==='harvest'){n(.16,2400,.12);n(.2,1400,.12,.09);t(280,165,.13,.06,.08);for(const[i,f]of[523,659,784].entries())t(f,f,.2,.035,.18+i*.08);}
  else if(name==='buy'||name==='sell'){for(let i=0;i<3;i++){const f=(name==='sell'?1700+i*350:2300-i*250);t(f,f*.96,.17,.03,i*.085,'triangle');t(f*1.43,f*1.4,.1,.009,i*.085);n(.045,6000,.04,i*.085);}}
  else if(name==='hammer'||name==='build'){for(let i=0;i<(name==='build'?3:2);i++){n(.09,1400,.18,i*.2);t(115,55,.1,.11,i*.2);t(420,290,.06,.035,i*.2);}}
  else if(name==='place'){n(.16,600,.2);t(110,42,.16,.14);n(.06,1800,.045,.07);}
  else if(name==='lift'){n(.23,1800,.09);n(.14,950,.11,.06);}
  else if(name==='rotate'){n(.1,1600,.07);}
  else if(name==='complete'){for(const[i,f]of[392,523,659,784].entries())t(f,f,.38,.04,i*.12);n(.08,1000,.07);}
  else if(name==='bird'){const f=2400+this.random()*1100;for(let i=0;i<3;i++){t(f,f*1.32,.06,.04,i*.16);t(f*1.32,f*.81,.1,.026,.055+i*.16);}}
  else if(name==='error'){t(165,140,.09,.055);t(140,120,.11,.045,.12);}
  else if(name==='cancel'){n(.08,1100,.065);t(240,150,.075,.035);}
  else if(name==='tap'){t(480,330,.045,.045);n(.035,1800,.025);}
 }
 play(name,{preview=false,...options}={}){
  if(!this.ctx||this.ctx.state!=='running'||!this.unlocked||!this.visible||!this.settings.enabled||!this.settings.volume||!this.settings.effects||(!this.active&&!preview))return false;
  const now=this.ctx.currentTime,cooldown=name==='complete'?1.2:name==='tap'?.06:.1;if(now-(this.cooldowns.get(name)??-100)<cooldown)return false;this.cooldowns.set(name,now);this.emit(name,options);return true;
 }
 async preview(){if(await this.unlock()){this.play('plant',{preview:true});this.play('harvest',{preview:true,delay:.55});this.play('sell',{preview:true,delay:1.25});}}
 startAmbience(){
  if(this.loops.length||!this.ctx||!this.unlocked||this.ctx.state!=='running'||!this.active||!this.visible||!this.settings.enabled||!this.settings.volume||!this.settings.ambience)return;
  for(const kind of['wind','water','rain']){
   const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),panner=this.ctx.createStereoPanner?.();source.buffer=this.environmentBuffers[kind]??=this.makeNoise(kind==='wind'?9:6,kind==='wind',true);source.loop=true;
   filter.type='lowpass';filter.frequency.value=kind==='wind'?650:kind==='rain'?4500:2100;filter.Q.value=.35;gain.gain.value=kind==='wind'?.2:0;source.connect(filter);filter.connect(gain);
   if(panner){gain.connect(panner);panner.connect(this.ambience);}else gain.connect(this.ambience);source.start();this.loops.push({kind,source,gain,filter,panner});
  }
  this.nextBird=this.ctx.currentTime+4;
 }
 stopAmbience(){for(const loop of this.loops){try{loop.source.stop();}catch{}for(const node of[loop.source,loop.gain,loop.filter,loop.panner])node?.disconnect();}this.loops=[];}
 spatial(point,camera){const p=camera.worldToScreen(point.x,point.y),dx=point.x-camera.x,dy=point.y-camera.y;return{pan:Math.max(-.85,Math.min(.85,(p.x-camera.width/2)/(camera.width/2))),strength:Math.max(0,1-Math.hypot(dx,dy)/850)};}
 observe(farm,camera,now){
  if(!this.active||!this.visible||!this.unlocked||this.ctx?.state!=='running'||!this.settings.enabled||!this.settings.volume)return;
  this.startAmbience();const t=this.ctx.currentTime;
  const weather=globalThis.FarmWeather?.at(now)||{rain:0,wind:1},rain=this.loops.find(l=>l.kind==='rain'),wind=this.loops.find(l=>l.kind==='wind');if(rain)this.ramp(rain.gain.gain,weather.rain*.42,.7);if(wind)this.ramp(wind.gain.gain,.2*weather.wind,.7);
  const river={x:640+110*Math.sin(camera.y/270),y:camera.y},water=this.loops.find(l=>l.kind==='water'),position=this.spatial(river,camera);
  if(water){this.ramp(water.gain.gain,.22*position.strength,.4);if(water.panner)this.ramp(water.panner.pan,position.pan,.25);}
  for(const [slot,deadline]of this.construction)if(deadline<=now){if(farm.s.buildings.some(b=>b.slot===slot&&(b.readyAt===deadline||b.upgrade?.readyAt===deadline||b.readyAt<deadline&&b.level>1)))this.play('complete');this.construction.delete(slot);}
  const building=farm.s.buildings.filter(b=>b.readyAt>now||b.upgrade?.readyAt>now);for(const b of building)this.construction.set(b.slot,b.upgrade?.readyAt||b.readyAt);
  if(this.settings.ambience&&this.loops.length){
   if(t>=this.nextBird&&weather.rain<.15){this.emit('bird',{bus:'ambience',strength:.6,pan:this.random()*1.2-.6});this.nextBird=t+8+this.random()*10;}
   if(t>=this.nextHammer){const nearest=building.map(b=>({...this.spatial(b,camera),slot:b.slot})).sort((a,b)=>b.strength-a.strength)[0];if(nearest?.strength>.05)this.emit('hammer',{bus:'ambience',pan:nearest.pan,strength:nearest.strength*.5});this.nextHammer=t+1.2+this.random()*1.1;}
  }
 }
}
