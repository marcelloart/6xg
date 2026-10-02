export const riverCenter=z=>640+110*Math.sin(z/270);
export function bridgeBounds(z=1115,width=78){
 const centers=Array.from({length:17},(_,i)=>riverCenter(z-width/2+width*i/16));
 return{z,width,left:Math.min(...centers)-105-38,right:Math.max(...centers)+105+38,deckY:17};
}
// Preserve the viewport aspect ratio. The explicit UHD preset fits a 3840 × 2160 buffer.
export function renderScale(quality,width,height,dpr=1,maxSize=16384){
 const wanted=quality==='ultra'?Math.min(3840/width,2160/height):Math.min(dpr,quality==='high'?2:1);
 return Math.max(.1,Math.min(wanted,maxSize/width,maxSize/height));
}
