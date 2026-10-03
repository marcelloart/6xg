// Access tokens stay in memory. Only the central site owns the Privy session.
export const CHANNEL='6xg-session-v1';
export function createSessionBridge({siteOrigin,gameOrigin,onState,win=window,doc=document,timeout=25000}){
  if(win.location.origin!==gameOrigin)throw new Error('Game origin is not authorized');
  const frame=doc.createElement('iframe');
  frame.src=new URL('/auth/bridge.html',siteOrigin).href;
  frame.title='Pemulihan sesi akun';frame.hidden=true;frame.referrerPolicy='origin';
  const pending=new Map();let closed=false;
  const bootTimer=win.setTimeout(()=>onState({ready:true,authenticated:false,error:true}),timeout);
  const request=method=>new Promise((resolve,reject)=>{
    if(closed){reject(new Error('Sesi ditutup'));return;}
    const id=win.crypto.randomUUID();
    const timer=win.setTimeout(()=>{pending.delete(id);reject(new Error('Sesi belum tersambung'));},timeout);
    pending.set(id,{resolve,reject,timer});
    frame.contentWindow.postMessage({channel:CHANNEL,id,method},siteOrigin);
  });
  const receive=event=>{
    if(event.origin!==siteOrigin||event.source!==frame.contentWindow||event.data?.channel!==CHANNEL)return;
    const data=event.data;
    if(data.type==='state'){if(data.state?.ready)win.clearTimeout(bootTimer);onState(data.state);return;}
    const task=pending.get(data.id);if(!task)return;
    pending.delete(data.id);win.clearTimeout(task.timer);
    if(data.error)task.reject(new Error('Session request failed'));else task.resolve(data.result);
  };
  win.addEventListener('message',receive);
  frame.addEventListener('load',()=>{request('state').then(state=>{if(state?.ready)win.clearTimeout(bootTimer);onState(state);}).catch(()=>onState({ready:true,authenticated:false,error:true}));});
  doc.body.append(frame);
  return {request,close(){closed=true;win.clearTimeout(bootTimer);win.removeEventListener('message',receive);frame.remove();for(const task of pending.values()){win.clearTimeout(task.timer);task.reject(new Error('Sesi ditutup'));}pending.clear();}};
}
