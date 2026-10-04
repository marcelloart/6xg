import '../assets/js/account-photo.js';
export async function startGameSession({gameOrigin,userId,twitterPhoto,getAccessToken,fetcher=(...args)=>fetch(...args)}){
  const token=await getAccessToken();
  if(!token||!userId)throw new Error('Sesi akun belum siap. Silakan coba kembali.');
  const url=new URL('/api/game-session',gameOrigin).href;
  const photo=BaraAccountPhoto.twitterURL(twitterPhoto);
  const created=await fetcher(url,{method:'POST',credentials:'include',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({twitterPhoto:photo})});
  if(!created.ok)throw new Error('Sesi game belum dapat disambungkan. Silakan coba kembali.');
  // Verify the browser accepted the HttpOnly cookie before leaving the landing.
  const restored=await fetcher(url,{credentials:'include',cache:'no-store'});
  if(!restored.ok)throw new Error('Sesi game belum tersimpan. Izinkan cookie situs lalu coba kembali.');
  const data=await restored.json();
  if(data.user?.id!==userId)throw new Error('Akun game belum sesuai. Silakan coba kembali.');
  return data;
}
