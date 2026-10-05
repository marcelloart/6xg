import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {loadPerson} from './farm-people.js';

const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);
/** Visual choreography only. The authenticated fishing action owns every catch. */
export function anglerMotion(cast,last,now,clock){
 const age=cast?Math.max(0,(now-cast.startedAt)/1000):Infinity;
 const caught=!cast&&last&&now>=last.at&&now-last.at<5500;
 let pitch=.57,lean=.02,reach=0,reel=0,mode='idle';
 if(cast&&now<=cast.expiresAt){
  mode='waiting';pitch+=Math.sin(clock*.8)*.015;
  if(age<1.3){const backswing=smooth(0,.35,age),release=smooth(.35,1.1,age);pitch+=backswing*1.25-release*1.25;reach=backswing*(1-release)*2.2;lean=-.07*backswing+.12*release*(1-smooth(1.1,1.3,age));mode='casting';}
  else if(cast.reels===3){pitch+=.55;lean=-.045;mode='landed';}
  else if(cast.hookedAt){const hookAge=Math.max(0,(now-cast.hookedAt)/1000),lift=Math.sin(Math.min(1,hookAge/.9)*Math.PI);pitch+=.3+.4*lift+Math.sin(clock*2)*.045;lean=-.075;reel=1;mode=hookAge<.9?'hooking':'reeling';}
  else if(now>=cast.biteAt&&now<cast.expiresAt){pitch+=Math.sin(clock*4)*.04;lean=.055;mode='bite';}
 }else if(caught){const t=(now-last.at)/1000;pitch+=.55*(1-smooth(2.2,5.5,t));lean=-.045*(1-smooth(2.2,5.5,t));mode='catch';}
 return{pitch,lean,reach,reel,mode};
}

function turnBone(bone,from,to){
 const rotation=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=bone.getWorldQuaternion(new THREE.Quaternion()),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 bone.quaternion.copy(parent.invert().multiply(rotation.multiply(world))).normalize();bone.updateMatrixWorld(true);
}
/** Preserve bone lengths; elbows bend away from the body while wrists meet the tackle. */
export function solveFishingArm(arm,target,pole){
 const shoulder=arm.upper.getWorldPosition(new THREE.Vector3()),elbow=arm.lower.getWorldPosition(new THREE.Vector3()),hand=arm.hand.getWorldPosition(new THREE.Vector3());
 const upper=shoulder.distanceTo(elbow),lower=elbow.distanceTo(hand),direction=target.clone().sub(shoulder),distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.001,upper+lower-.001);direction.normalize();
 const bend=pole.clone().sub(shoulder);bend.addScaledVector(direction,-bend.dot(direction));if(bend.lengthSq()<.001)bend.set(1,0,0);bend.normalize();
 const along=(upper*upper+distance*distance-lower*lower)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along)),knee=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height),reachable=shoulder.clone().addScaledVector(direction,distance);
 turnBone(arm.upper,elbow.clone().sub(shoulder),knee.clone().sub(shoulder));
 arm.lower.getWorldPosition(elbow);arm.hand.getWorldPosition(hand);turnBone(arm.lower,hand.sub(elbow),reachable.sub(elbow));
}

export class FarmAngler{
 constructor(parent,loader=()=>loadPerson('angler')){
  this.parent=parent;this.root=new THREE.Group();this.root.name='farm-angler';this.root.visible=false;parent.add(this.root);this.clock=0;this.reelPhase=0;this.pitch=.57;this.lean=0;this.reach=0;this.disposed=false;
  this.ready=loader().then(asset=>{if(!asset)return;if(this.disposed){this.release(asset.model);return;}this.asset=asset;this.model=cloneSkeleton(asset.model);const scale=38/asset.model.userData.height;this.model.scale.setScalar(scale);this.model.position.y=-asset.model.userData.ground*scale;this.root.add(this.model);
   this.mixer=new THREE.AnimationMixer(this.model);this.mixer.clipAction(asset.clips.find(c=>c.name==='idle')).play();this.mixer.update(.01);this.root.position.set(-62,18,-12);this.root.rotation.y=-Math.PI/2;
   this.pose=[];this.model.traverse(b=>{if(b.isBone)this.pose.push({bone:b,rotation:b.quaternion.clone()});});
   this.arms=['L','R'].map(side=>({side,upper:this.model.getObjectByName('Bip01_'+side+'_UpperArm'),lower:this.model.getObjectByName('Bip01_'+side+'_Forearm'),hand:this.model.getObjectByName('Bip01_'+side+'_Hand')}));
   this.spine=this.model.getObjectByName('Bip01_Spine1');this.head=this.model.getObjectByName('Bip01_Head');
  }).catch(error=>{if(!this.disposed)console.warn('Fishing character could not load',error);});
 }
 update(rod,cast,last,now,delta,motion=true){
  if(!this.model||!rod)return false;this.root.visible=true;
  // A hidden tab or disabled motion cannot advance the crank or snap a pose on return.
  const dt=motion?Math.max(0,Math.min(.06,delta)):0;this.clock+=dt;
  const target=anglerMotion(cast,last,now,this.clock),blend=1-Math.exp(-dt/.14);this.mode=target.mode;
  this.pitch+=(target.pitch-this.pitch)*blend;this.lean+=(target.lean-this.lean)*blend;this.reach+=(target.reach-this.reach)*blend;this.reelPhase+=dt*target.reel*3.6;
  if(dt){this.mixer.update(dt);const alpha=1-Math.exp(-dt/.065);for(const joint of this.pose){const angle=joint.rotation.angleTo(joint.bone.quaternion);joint.rotation.slerp(joint.bone.quaternion,Math.min(alpha,angle?5*dt/angle:1));}}
  for(const joint of this.pose)joint.bone.quaternion.copy(joint.rotation);
  this.root.updateMatrixWorld(true);
  if(this.spine){const axis=new THREE.Vector3(1,0,0).transformDirection(this.root.matrixWorld),rotation=new THREE.Quaternion().setFromAxisAngle(axis,this.lean),world=this.spine.getWorldQuaternion(new THREE.Quaternion()),parent=this.spine.parent.getWorldQuaternion(new THREE.Quaternion());this.spine.quaternion.copy(parent.invert().multiply(rotation.multiply(world)));}
  this.root.updateMatrixWorld(true);
  const grip=this.root.localToWorld(new THREE.Vector3(-3.4,24+this.reach,.3));this.parent.worldToLocal(grip);rod.position.copy(grip);rod.scale.setScalar(.83);rod.rotation.order='YXZ';rod.rotation.set(0,Math.PI,this.pitch-Math.atan2(39,54));if(rod.userData.reelHandle)rod.userData.reelHandle.rotation.z=this.reelPhase;
  this.parent.updateMatrixWorld(true);
  const right=rod.localToWorld(new THREE.Vector3(5,3,0)),left=rod.userData.crankKnob?.getWorldPosition(new THREE.Vector3())||rod.localToWorld(new THREE.Vector3(10,2,-4));
  for(const arm of this.arms){if(!arm.upper||!arm.lower||!arm.hand)continue;const target=arm.side==='R'?right:left,pole=this.root.localToWorld(new THREE.Vector3(arm.side==='R'?-12:12,20,-2));solveFishingArm(arm,target,pole);
   // The palm follows the grip; curled finger joints complete the hold.
   const direction=new THREE.Vector3(-1,.15,0).transformDirection(rod.matrixWorld),finger=arm.hand.children.find(b=>b.isBone&&/Finger1$/.test(b.name));if(finger)turnBone(arm.hand,finger.getWorldPosition(new THREE.Vector3()).sub(arm.hand.getWorldPosition(new THREE.Vector3())),direction);
  }
  this.model.traverse(b=>{if(!b.isBone||!/Finger[1-4][12]$/.test(b.name))return;b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-.65));});
  this.root.updateMatrixWorld(true);return true;
 }
 hide(){this.root.visible=false;}
 release(model){const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();}
 dispose(){this.disposed=true;this.mixer?.stopAllAction();if(this.model)this.mixer.uncacheRoot(this.model);this.root.removeFromParent();if(this.asset)this.release(this.asset.model);this.model=null;}
}
