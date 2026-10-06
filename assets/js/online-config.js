'use strict';
// Public settings only. Never put an App Secret or private key in this file.
window.BARA_ONLINE = Object.freeze({
  privyAppId: 'cmuqjbgfe02a60cjlya6r4t0m',
  // Verified production Cloudflare Workers + D1 backend. Public URL only.
  apiBase: 'https://6xg-cloud-save.marcelloartis.workers.dev',
  siteOrigin: 'https://6xg.online',
  gameOrigin: 'https://app.6xg.online',
  // Dedicated full-screen game. Authentication stays on the central landing site.
  // Only this fixed destination is allowed after the central login handoff.
  playUrl: typeof location!=='undefined'&&new URLSearchParams(location.search).get('return')==='market'?'https://app.6xg.online/market':'https://app.6xg.online/'
});
