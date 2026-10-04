export const riverCenter=z=>640+110*Math.sin(z/270);
// Keep refresh-rate timing instead of discarding every other 60 Hz frame.
export function renderFrameTime(tick,last,quality){const interval=1000/60,elapsed=tick-last;if(elapsed+.25<interval)return null;const frames=Math.max(1,Math.floor((elapsed+.25)/interval));return tick-Math.max(0,elapsed-frames*interval);}
export function bridgeBounds(z=1115,width=78){
 const centers=Array.from({length:17},(_,i)=>riverCenter(z-width/2+width*i/16));
 return{z,width,left:Math.min(...centers)-105-38,right:Math.max(...centers)+105+38,deckY:17};
}
// Scenic roads stay outside the complete movable farm rectangle, including future gardens.
export function farmRoads(){const bridge=bridgeBounds();return[
 {width:34,points:[[bridge.right+40,1115],[950,1115],[955,1440],[960,1690],[990,1810],[1500,1820],[2170,1820],[2390,1750],[2600,1620]]},
 {width:34,points:[[bridge.left-40,1115],[340,1118],[180,1190]]}
];}
// Preserve the viewport aspect ratio. The explicit UHD preset fits a 3840 × 2160 buffer.
export function renderScale(quality,width,height,dpr=1,maxSize=16384){
 const wanted=quality==='ultra'?Math.min(3840/width,2160/height):Math.min(dpr,quality==='high'?2:1);
 return Math.max(.1,Math.min(wanted,maxSize/width,maxSize/height));
}
