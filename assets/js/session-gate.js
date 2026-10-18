'use strict';
// The SDK establishes identity; attaching that identity's save unlocks play.
class AccountGate {
  constructor(prefix='6xg-account:'){this.prefix=prefix;this.identity=null;this.attached=null;}
  setIdentity(id){this.identity=typeof id==='string'&&(/^(?:did:privy:)[A-Za-z0-9:_-]{1,180}$/.test(id)||/^firebase:[a-z][a-z0-9-]{4,28}[a-z0-9]:[A-Za-z0-9_-]{1,128}$/.test(id))?id:null;this.attached=null;}
  attach(key){if(!this.identity||key!==this.prefix+this.identity)throw new Error('Login diperlukan untuk masuk ke permainan.');this.attached=key;}
  get canPlay(){return Boolean(this.identity&&this.attached===this.prefix+this.identity);}
}
