'use strict';
// The SDK establishes identity; attaching that identity's save unlocks play.
class AccountGate {
  constructor(){this.identity=null;this.attached=null;}
  setIdentity(id){this.identity=typeof id==='string'&&id.startsWith('did:privy:')?id:null;this.attached=null;}
  attach(key){if(!this.identity||key!=='6xg-account:'+this.identity)throw new Error('Login diperlukan untuk masuk ke permainan.');this.attached=key;}
  get canPlay(){return Boolean(this.identity&&this.attached==='6xg-account:'+this.identity);}
}
