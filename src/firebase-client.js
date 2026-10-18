let client;
export function firebaseClient(){
 if(client)return client;
 const cfg=window.BARA_FIREBASE;
 if(!cfg?.enabled||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(cfg.projectId)||!/^AIza[A-Za-z0-9_-]{30,}$/.test(cfg.apiKey)||cfg.authDomain!==cfg.projectId+'.firebaseapp.com')return Promise.reject(Error('Firebase configuration is incomplete.'));
 client=Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]).then(async([app,sdk])=>{const auth=sdk.getAuth(app.initializeApp({apiKey:cfg.apiKey,projectId:cfg.projectId,authDomain:cfg.authDomain,appId:cfg.appId},'6xg-harvest'));await sdk.setPersistence(auth,sdk.browserLocalPersistence);return {auth,sdk};}).catch(error=>{client=null;throw error;});return client;
}
