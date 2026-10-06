export async function nativeUpdate(request,assets){
 const headers={'expo-protocol-version':'1','expo-sfv-version':'0','expo-manifest-filters':'','expo-server-defined-headers':'','Cache-Control':'private, max-age=0','X-Content-Type-Options':'nosniff','Vary':'expo-platform, expo-runtime-version, expo-protocol-version'};
 if(request.method!=='GET')return new Response(null,{status:405,headers});
 const platform=request.headers.get('expo-platform'),runtime=request.headers.get('expo-runtime-version');
 if(request.headers.get('expo-protocol-version')!=='1'||platform!=='android'||!/^[a-zA-Z0-9._-]{1,64}$/.test(runtime||''))return new Response(null,{status:400,headers});
 const accept=request.headers.get('accept')||'';
 if(!/application\/(expo\+)?json|multipart\/mixed|\*\/\*/.test(accept))return new Response(null,{status:406,headers});
 const response=await assets.fetch(new Request(new URL('/assets/native-updates/'+runtime+'/manifest.json',request.url)));
 if(response.status===404)return new Response(null,{status:204,headers});
 if(!response.ok)return new Response(null,{status:503,headers});
 try{
  const payload=await response.json(),manifest=JSON.parse(payload.manifest);
  if(manifest.runtimeVersion!==runtime||manifest.metadata?.platform!=='android'||!/^[-a-zA-Z0-9+/=]+$/.test(payload.signature||'')||!manifest.launchAsset?.url?.startsWith('https://app.6xg.online/assets/native-updates/blobs/'))throw new Error('Invalid update');
  if(request.headers.get('expo-current-update-id')===manifest.id)return new Response(null,{status:204,headers});
  return new Response(payload.manifest,{headers:{...headers,'Content-Type':'application/expo+json','expo-signature':'sig="'+payload.signature+'", keyid="harvest-1", alg="rsa-v1_5-sha256"'}});
 }catch{return new Response(null,{status:503,headers});}
}
