import assert from 'node:assert/strict';
import {bridgeBounds,renderScale,riverCenter} from '../src/farm-visuals.js';
const bridge=bridgeBounds();
for(let z=bridge.z-bridge.width/2;z<=bridge.z+bridge.width/2;z++){
 assert(bridge.left<riverCenter(z)-105-30,'West end must rest on dry land across the entire bridge width');
 assert(bridge.right>riverCenter(z)+105+30,'East end must rest on dry land across the entire bridge width');
}
for(const [w,h]of[[1280,720],[1920,1080],[3840,2160]]){const r=renderScale('ultra',w,h);assert.equal(w*r,3840);assert.equal(h*r,2160);}
for(const [w,h]of[[3440,1440],[390,844],[5120,2880]]){const r=renderScale('ultra',w,h);assert(w*r<=3840&&h*r<=2160);assert.equal(w*r/(h*r),w/h);}
assert(renderScale('ultra',1280,720,1,2048)*1280<=2048,'Respect GPU framebuffer limits');
assert.equal(renderScale('high',1920,1080,2),2);
assert.equal(renderScale('low',1920,1080,2),1);
console.log('Bridge landing and real UHD framebuffer checks passed.');
