import React,{useEffect,useRef} from 'react';
import '../assets/js/account-photo.js';
export function AccountAvatar({profile,accountURL,authenticated=true,className='account-avatar'}){
 const ref=useRef(null);
 useEffect(()=>{if(!authenticated){ref.current.textContent='◉';return;}BaraAccountPhoto.render(ref.current,BaraAccountPhoto.source(profile,accountURL),profile?.avatar);},[authenticated,profile?.photo,profile?.avatar,profile?.useAccountPhoto,accountURL]);
 return <span className={className} ref={ref} aria-hidden="true"/>;
}
