import * as THREE from 'three';
const smooth=x=>x*x*(3-2*x);
export class WeatherScene{
 constructor(renderer){
  this.renderer=renderer;this.cloud={value:0};this.time={value:0};
  const count=renderer.quality==='low'?100:300;this.seeds=Array.from({length:count},(_,i)=>({x:((i*137.508)%1)*1100-550,z:((i*.618034)%1)*900-450,phase:(i*.754877)%1,speed:240+(i%7)*17}));
  // Thin world-space streaks remain visible when a 4K framebuffer is downsampled.
  this.rainGeometry=new THREE.PlaneGeometry(1.1,16);
  this.rainMaterial=new THREE.MeshBasicMaterial({color:'#c5dde2',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});this.rain=new THREE.InstancedMesh(this.rainGeometry,this.rainMaterial,count);this.rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.rain.frustumCulled=false;this.rain.visible=false;renderer.scene.add(this.rain);
  this.rippleMaterial=new THREE.MeshBasicMaterial({color:'#c2d8d0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});this.ripples=new THREE.InstancedMesh(new THREE.RingGeometry(1,1.15,16),this.rippleMaterial,24);this.ripples.frustumCulled=false;this.ripples.visible=false;renderer.scene.add(this.ripples);this.temp=new THREE.Object3D();
  for(const mat of [renderer.materials.grass,renderer.materials.soil,renderer.materials.path]){
   const original=mat.onBeforeCompile.bind(mat);mat.onBeforeCompile=shader=>{original(shader);shader.uniforms.farmCloud=this.cloud;shader.uniforms.farmWeatherTime=this.time;shader.vertexShader='varying vec3 farmCloudPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nfarmCloudPosition=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 farmCloudPosition;uniform float farmCloud;uniform float farmWeatherTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 p=farmCloudPosition.xz*.003+vec2(farmWeatherTime*.013,farmWeatherTime*.007);
    float cloudWave=sin(p.x+sin(p.y*.7))*sin(p.y*.83+cos(p.x*.6));
    diffuseColor.rgb*=1.-smoothstep(-.3,.6,cloudWave)*farmCloud*.24;`);};mat.customProgramCacheKey=()=> 'farm-drifting-clouds-1';
  }
 }
 update(timestamp,tick){
  const r=this.renderer,v=globalThis.FarmWeather?.at(timestamp)||{cloud:0,rain:0,wind:1,wetness:0},time=tick/1000;this.state=v;this.cloud.value=v.cloud;if(r.wind)this.time.value=time;
  if(r.daylight){r.sun.intensity=r.daylight.sunIntensity*(1-v.cloud*.68);r.hemisphere.intensity=r.daylight.hemisphereIntensity*(1-v.cloud*.15);r.scene.environmentIntensity=r.daylight.environmentIntensity*(1-v.cloud*.23);r.scene.backgroundIntensity=r.daylight.backgroundIntensity*(1-v.cloud*.25);}
  r.scene.fog.near=3300-v.rain*400;r.scene.fog.far=4900-v.rain*1000;
  r.materials.grass.roughness=.95-v.wetness*.22;r.materials.soil.roughness=.9-v.wetness*.28;r.materials.path.roughness=1-v.wetness*.35;
  r.windStrength.value=r.wind?4.2*v.wind:0;r.grassStrength.value=r.wind?2.2*v.wind:0;r.trunkStrength.value=r.wind?3.5*v.wind:0;
  this.rain.visible=this.ripples.visible=r.wind&&v.rain>.02;this.rainMaterial.opacity=v.rain*.3;this.rippleMaterial.opacity=v.rain*.24;
  if(this.rain.visible){for(let i=0;i<this.seeds.length;i++){const s=this.seeds[i],height=420-((time*s.speed+s.phase*420)%420),x=r.camera.x+s.x+(height-210)*.07,z=r.camera.y+s.z;const ground=r.heightAt?.(x,z)||0;this.temp.position.set(x,height+ground,z);this.temp.rotation.set(0,r.camera.yaw||0,.07);this.temp.scale.setScalar(1);this.temp.updateMatrix();this.rain.setMatrixAt(i,this.temp.matrix);}this.rain.instanceMatrix.needsUpdate=true;}
  if(this.ripples.visible)for(let i=0;i<24;i++){const z=(i*91.67)%2200,x=640+110*Math.sin(z/270)+(i%3-1)*45,phase=(time*.8+i*.618)%1,scale=1+phase*8;this.temp.position.set(x,2.15,z);this.temp.rotation.set(-Math.PI/2,0,0);this.temp.scale.setScalar(scale);this.temp.updateMatrix();this.ripples.setMatrixAt(i,this.temp.matrix);}this.ripples.instanceMatrix.needsUpdate=this.ripples.visible;
  return v;
 }
}
