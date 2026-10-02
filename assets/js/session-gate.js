'use strict';
// The SDK establishes identity; attaching that identity's save unlocks play.
class AccountGate {
  constructor(prefix='6xg-account:'){this.prefix=prefix;this.identity=null;this.attached=null;}
  setIdentity(id){this.identity=typeof id==='string'&&id.startsWith('did:privy:')?id:null;this.attached=null;}
  attach(key){if(!this.identity||key!==this.prefix+this.identity)throw new Error('Login diperlukan untuk masuk ke permainan.');this.attached=key;}
  get canPlay(){return Boolean(this.identity&&this.attached===this.prefix+this.identity);}
}
