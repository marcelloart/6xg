import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';

const URLS=typeof FARM_CC0_URLS==='undefined'?{}:FARM_CC0_URLS;
export const MODEL_IDS={apple:'3DApple002',avocado:'3DAvocado001',stump:'3DTreeStump001',tree:'island_tree_02',rock:'boulder_01',crate:'wooden_crate_02'};
export function assetUrl(path,quality='ultra'){return URLS['assets/cc0/'+path.replace(/-ultra(?=\.)/g,'-'+quality)];}
export function modelInstance(template,size=1,dimension='height'){const clone=template.clone(true);clone.scale.setScalar(size/(template.userData[dimension]||1));return clone;}
export async function loadModel(id,quality){const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{const relative=new URL(url,location.href).pathname.split('/assets/cc0/')[1];return relative?assetUrl(relative,quality)||url:url;});
 const loaded=await new GLTFLoader(manager).loadAsync(assetUrl(id+'/model-'+quality+'.gltf',quality));const model=loaded.scene;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);model.userData.height=bounds.max.y-bounds.min.y;const extent=bounds.getSize(new THREE.Vector3());model.userData.span=Math.max(extent.x,extent.y,extent.z);
 model.traverse(m=>{if(m.isMesh){m.geometry.userData.cc0Shared=true;m.castShadow=m.receiveShadow=true;}});return model;
}
export async function loadEnvironment(renderer){const exr=await new EXRLoader().loadAsync(assetUrl('DaySkyHDRI069A/environment.exr'));exr.mapping=THREE.EquirectangularReflectionMapping;const generator=new THREE.PMREMGenerator(renderer);const target=generator.fromEquirectangular(exr);generator.dispose();return{sky:exr,environment:target.texture,target};}
