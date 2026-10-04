import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const smooth=value=>{const x=clamp(value,0,1);return x*x*(3-2*x);};
const point=(bone,out)=>bone.getWorldPosition(out);

function shoeSupports(model,leg,side){
 const directions=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)directions.push(new THREE.Vector3(x,y,z));
 const scores=directions.map(()=>-Infinity),support=directions.map(()=>new THREE.Vector3()),position=new THREE.Vector3(),origin=point(leg.foot,new THREE.Vector3()),rotation=leg.foot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const names=new RegExp('^Bip01_'+side+'_(Foot|Toe)');
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight,feet=mesh.skeleton.bones.map(b=>names.test(b.name));
  for(let i=0;i<indices.count;i++){let influence=0;for(let j=0;j<4;j++)if(feet[indices.getComponent(i,j)])influence+=weights.getComponent(i,j);if(influence<.8)continue;
   mesh.getVertexPosition(i,position);mesh.localToWorld(position);if(position.y>origin.y+.3)continue;position.sub(origin).applyQuaternion(rotation);
   for(let j=0;j<directions.length;j++){const score=position.dot(directions[j]);if(score>scores[j]){scores[j]=score;support[j].copy(position);}}
  }
 });return support.filter((_,i)=>Number.isFinite(scores[i]));
}

export function createGait(root,model){
 root.updateMatrixWorld(true);
 const pelvis=model.getObjectByName('Bip01');
 const legs=['L','R'].map(side=>{
  const thigh=model.getObjectByName('Bip01_'+side+'_Thigh'),calf=model.getObjectByName('Bip01_'+side+'_Calf'),foot=model.getObjectByName('Bip01_'+side+'_Foot');
  if(!thigh||!calf||!foot)return null;
  const rest=root.worldToLocal(point(foot,new THREE.Vector3()));
  const leg={thigh,calf,foot,rest,local:new THREE.Vector3(),target:new THREE.Vector3(),hip:new THREE.Vector3(),knee:new THREE.Vector3(),ankle:new THREE.Vector3(),pole:new THREE.Vector3(),forward:new THREE.Vector3(),originalDirection:new THREE.Vector3(),direction:new THREE.Vector3(),desiredKnee:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),rotation:new THREE.Quaternion(),worldRotation:new THREE.Quaternion(),parentRotation:new THREE.Quaternion(),footRotation:new THREE.Quaternion(),plant:null,lastZ:rest.z,contact:0};
  leg.supports=shoeSupports(model,leg,side);return leg;
 }).filter(Boolean);
 const arms=[];model.traverse(bone=>{if(bone.isBone&&/Bip01_[LR]_(UpperArm|Forearm|Clavicle)$/.test(bone.name))arms.push({bone,rest:bone.quaternion.clone()});});
 return{pelvis,legs,arms,ratio:1,rise:0,scratch:new THREE.Vector3()};
}

function turnBone(leg,bone,from,to){
 if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)return;
 leg.rotation.setFromUnitVectors(from.normalize(),to.normalize());
 bone.getWorldQuaternion(leg.worldRotation);bone.parent.getWorldQuaternion(leg.parentRotation);
 bone.quaternion.copy(leg.parentRotation.invert().multiply(leg.rotation.multiply(leg.worldRotation))).normalize();
 bone.updateMatrixWorld(true);
}

function solveLeg(leg){
 point(leg.thigh,leg.hip);point(leg.calf,leg.knee);point(leg.foot,leg.ankle);
 const upper=leg.hip.distanceTo(leg.knee),lower=leg.knee.distanceTo(leg.ankle);
 leg.direction.subVectors(leg.target,leg.hip);const reach=clamp(leg.direction.length(),Math.abs(upper-lower)+.0001,upper+lower-.0001);leg.direction.normalize();
 leg.originalDirection.subVectors(leg.ankle,leg.hip).normalize();leg.pole.subVectors(leg.knee,leg.hip);leg.pole.addScaledVector(leg.originalDirection,-leg.pole.dot(leg.originalDirection));
 if(leg.pole.lengthSq()<.0004)leg.pole.copy(leg.forward);else if(leg.pole.dot(leg.forward)<0)leg.pole.negate();
 leg.pole.addScaledVector(leg.direction,-leg.pole.dot(leg.direction));
 leg.pole.normalize();const along=(upper*upper+reach*reach-lower*lower)/(2*reach),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
 leg.desiredKnee.copy(leg.hip).addScaledVector(leg.direction,along).addScaledVector(leg.pole,bend);
 turnBone(leg,leg.thigh,leg.from.subVectors(leg.knee,leg.hip),leg.to.subVectors(leg.desiredKnee,leg.hip));
 point(leg.calf,leg.knee);point(leg.foot,leg.ankle);
 turnBone(leg,leg.calf,leg.from.subVectors(leg.ankle,leg.knee),leg.to.subVectors(leg.target,leg.knee));
 // Keep the captured heel/toe roll after changing the leg reach.
 leg.foot.parent.getWorldQuaternion(leg.parentRotation);leg.foot.quaternion.copy(leg.parentRotation.invert().multiply(leg.footRotation)).normalize();leg.foot.updateMatrixWorld(true);
}

/** Keep a human walking cadence while shortening the stride for a leisurely pace. */
export function updateGait(person,delta,heightAt){
 const gait=person.gait,weight=person.actions.walk.getEffectiveWeight();if(!gait?.pelvis||gait.legs.length!==2)return;
 const ratio=clamp(person.currentSpeed/(person.walkStrideSpeed*Math.max(.001,person.walkRate)),0,1);
 gait.ratio+=(ratio-gait.ratio)*(1-Math.exp(-delta/.1));
 if(weight<.0001){for(const leg of gait.legs){leg.plant=null;leg.contact=0;}gait.rise=0;return;}
 const stride=1+(gait.ratio-1)*weight,liftScale=1+(Math.sqrt(gait.ratio)-1)*weight;
 for(const arm of gait.arms)arm.bone.quaternion.slerp(arm.rest,weight*(1-gait.ratio)*.5);
 person.root.updateMatrixWorld(true);let rise=0,total=0;
 for(const leg of gait.legs){
  point(leg.thigh,leg.hip);point(leg.calf,leg.knee);point(leg.foot,leg.ankle);leg.foot.getWorldQuaternion(leg.footRotation);person.root.worldToLocal(leg.local.copy(leg.ankle));
  leg.forward.set(0,0,1).transformDirection(person.root.matrixWorld);
  let lowest=0;for(const support of leg.supports)lowest=Math.min(lowest,gait.scratch.copy(support).applyQuaternion(leg.footRotation).y);
  const height=Math.max(0,leg.local.y-leg.rest.y),velocity=delta>0?(leg.local.z-leg.lastZ)/delta:0,backward=velocity<-.1;leg.lastZ=leg.local.z;
  leg.target.copy(leg.local);leg.target.z=leg.rest.z+(leg.local.z-leg.rest.z)*stride;leg.target.y+=(leg.rest.y+height*liftScale-leg.local.y)*weight;person.root.localToWorld(leg.target);
  const soleHeight=Math.max(0,leg.local.y+lowest),contact=weight>.9&&person.currentSpeed>2?smooth(1-soleHeight/.6)*smooth(-velocity/4):0;
  if(!leg.plant&&backward&&contact>.65)leg.plant=leg.target.clone();
  leg.contact=leg.plant?contact:0;
  if(leg.plant){leg.target.x+=(leg.plant.x-leg.target.x)*contact;leg.target.z+=(leg.plant.z-leg.target.z)*contact;if(contact===0)leg.plant=null;}
  const ground=heightAt?heightAt(leg.target.x,leg.target.z):person.root.position.y;leg.target.y+=(ground-person.root.position.y)*weight;
  leg.target.y+=(Math.max(leg.target.y,ground-lowest+.03)-leg.target.y)*weight;
  const original=leg.hip.distanceToSquared(leg.ankle),horizontal=(leg.hip.x-leg.target.x)**2+(leg.hip.z-leg.target.z)**2,vertical=Math.sqrt(Math.max(0,original-horizontal));
  const correction=clamp(leg.target.y+vertical-leg.hip.y,0,2),importance=Math.exp(-height*2);rise+=correction*importance;total+=importance;
 }
 // Preserve the captured knee bend of the supporting leg instead of crouching
 // both knees when the forward reach gets shorter.
 gait.rise+=((rise/Math.max(.001,total))*weight-gait.rise)*(1-Math.exp(-delta/.07));
 point(gait.pelvis,gait.scratch);gait.scratch.y+=gait.rise;gait.pelvis.parent.worldToLocal(gait.scratch);gait.pelvis.position.copy(gait.scratch);person.root.updateMatrixWorld(true);
 for(const leg of gait.legs)solveLeg(leg);
}
