# 6XG Harvest player market

Players open **Shop → Player market** (also available through More on phones). They trade harvests, seeds, crafted goods, animal products, fish, and building materials. Quantities and prices are editable. The market has Buy, Sell, My listings, and History views.

## Coin transactions

Listing removes the chosen quantity from the seller's inventory and reserves it in `market_listings`. A purchase deducts game coins from the buyer, credits exactly that amount to the seller, and delivers the goods. There is no coin transaction fee. Sellers can return unsold items if their inventory has space. Listings expire after seven days and remain recoverable through My listings; up to 20 active listings per seller.

The Worker verifies account identity, immutable unit price, quoted listing version, both farm revisions, inventory limits, and balance limits. A D1 transactional batch begins with a checked snapshot guard, then commits both farms, listing stock, trade history, and the idempotency receipt together. A failed guard or write rolls everything back. Repeating the same action returns the original result; changing a previously used action ID is rejected.

Only the authenticated user's own activity is returned in trade history. Public listings include the seller's display profile, subject to their photo-sharing preference. Private IDs, balances, tokens, and inventories are excluded.

Fish purchases update the additive `fishing.traded` acquisition count. They do not increase catches, XP, best size, or catch records. Older saves without this field load with zero. Snapshot uploads remain disabled; this counter is controlled by server actions.

## Real-money status

The owner requested rupiah, USD and crypto, but has no merchant account yet. Those options display **not active**. The server rejects financial listing and purchase attempts before reserving stock or changing balances. No real checkout, payout, cash balance, or coin-to-cash conversion is implemented. Game coins are not withdrawable money.

Activation requires an actual marketplace payment provider, seller onboarding/payout arrangements, signed payment confirmation, receipt reconciliation, refunds, and a tested supported currency/network. Changing a UI flag alone must never enable payments. Native Play distribution also needs a reviewed payment flow that complies with the applicable Play policies.

## Services and checks

- Migration: `cloudflare/migrations/0005_marketplace.sql`.
- Authenticated reads: `GET /api/farm-market` with `view`, `currency`, `category`, `item`, or an opaque `before` cursor.
- Intent-only writes: `POST /api/farm-market-action` with `{id, revision, type, args}`; types `list`, `buy`, `cancel`.
- The game-origin HttpOnly session bridge forwards the same verified identity. Native sessions use the same Worker routes.
- Run `npm run test:market` in the web project and `npm test` in its Cloudflare directory. Native transport includes a marketplace lost-response integration test.

The Android project is maintained separately. Its native market panel shares this catalogue and backend; the APK is still awaiting SDK license acceptance, compilation, and Android-device validation.
