# Firebase Authentication migration

Status: implementation prepared; production activation requires the owner's Firebase project. The production configuration remains disabled until that project and both authentication flows are verified.

## Cost and scope
Use base Firebase Authentication on Spark for Google, X/Twitter and email/password. Do not enable billing, phone/SMS login or upgrade to Identity Platform automatically. Firebase still has operational quotas. The optional Identity Platform upgrade changes free limits (Spark 3,000 daily active users; Blaze free tier 50,000 monthly active users). No unlimited service promise is made.

A new Firebase account does not automatically own an old Privy farm even when emails match. Existing wallet users can verify their old wallet through the one-time legacy linking flow, then use their linked Google/X/email account for future Firebase logins. New standalone wallet login is not included in Firebase's built-in providers; wallet signing needs a separate custom authentication implementation. Do not advertise new wallet registration under Firebase until that is implemented.

## Configure the owner's project
1. Create/select a Firebase project on Spark. No billing account, Analytics or Firestore is required for this migration; game saves remain in the existing Cloudflare D1 database.
2. Enable Google and Email/Password in Authentication. Register a Web app. Add 6xg.online and app.6xg.online to Authorized domains.
3. For X/Twitter, create/use an owner-controlled X developer app. Enter its OAuth API key and secret only in Firebase Console. Add https://PROJECT_ID.firebaseapp.com/__/auth/handler to the X callback allowlist. Then enable the Twitter provider and set providers.twitter=true. The existing Privy X configuration is not automatically transferred.
4. Fill public apiKey, authDomain, projectId and appId in assets/js/firebase-config.js, leaving enabled=false. The supported authDomain is the project's default PROJECT_ID.firebaseapp.com. Never commit X secrets or service-account/private keys.
5. Add FIREBASE_PROJECT_ID to cloudflare/wrangler.jsonc vars. Keep legacy Privy verification configured during migration. Deploy additive migration 0006_firebase_auth.sql and the backend before enabling the frontend.
6. Build Firebase assets with node tools/build-firebase-auth.mjs. Publish the changed source, configuration, CSS and generated assets, and refresh the HTML cache versions for account.js, session-gate.js, market-page.js and Firebase files.
7. Test real Google/email login, email verification, X login if configured, cross-origin cookie restoration, existing-account linking, account switch, logout and the standalone market. Only then set enabled=true and publish.

## Account preservation
The backend validates Firebase RS256 signatures using Google's fixed public key endpoint, plus issuer, audience, expiry, issued-at, auth-time and provider. Anonymous, custom, tenant and unverified email/password tokens cannot play. Privy ES256 verification remains solely for existing compatibility and explicit migration.

/api/auth-link requires both a Firebase bearer token and a valid original Privy token. The Firebase login must be recent. Its project-qualified subject (firebase:PROJECT:UID) is atomically bound to the original player key, preserving original farm saves, friends, market listings, trade receipts and balances. No matching by email, client user ID or uploaded save is allowed. If the Firebase identity already has saved progress, linking refuses to overwrite it. A uniqueness constraint prevents two Firebase accounts claiming one old player account. SQLite triggers prevent an in-flight first write from recreating a second farm after a link.

Game sessions retain Secure, HttpOnly, host-only cookies. The browser compares the verified Firebase authSubject on bootstrap; attached game identity uses the backend's canonical account ID. Firebase refresh tokens stay in the central site's Firebase SDK, never in the game or a URL. Old account verification loads Privy only after the player explicitly selects Keep my existing farm.

## Rollback and remaining activation checks
Keep the old bundle and provider verification until all players have migrated. Turning enabled=false restores the old login UI; it does not delete links, farms or any Firebase users. Old and new identities remain isolated. The account owner must complete project authorization and provider credentials; no account/project details are fabricated.

Validation commands: node --test tests/firebase-session.mjs; node --test cloudflare/test/firebase-auth.mjs (from repository root after resolving its package dependencies); npm run test:session; npm run test:market; node tools/build-firebase-auth.mjs; npm run build:game; backend build and test suite.
