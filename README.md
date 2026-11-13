# EMPX UI

Vite + React dapp, deployed on Vercel. `npm run dev` serves it on port 3000; `npm run build` builds it; `npm run test:run` runs the tests.

## EMPX V2 cross-chain

`VITE_CROSS_ENGINES` (build time) decides what `/cross-v2` runs (`src/features/cross/engine.ts`):

| Value | `/cross-v2` shows |
| --- | --- |
| unset or `v1` | the V1 page only (today's production) |
| `v1,v2` | a floating `V1 | V2 · Beta` toggle; the choice is kept in `?engine=` (shareable) and in this browser |
| `v2` | the V2 flow only (launch setting) |

Each engine is lazy-loaded, so a build with one engine never downloads the other.

The browser never holds a V2 API key. It calls the same-origin route `/api/cross-v2/*`, which a small proxy forwards to the V2 API
(`api/_lib/crossV2Proxy.ts`, served by the Vercel function in `api/cross-v2` and by `vite.config.js` in dev).
Only the calls the cross-chain page makes are allowed (capabilities, quote, commit intent, submit order, report step, attach reference,
intent status, two-order journeys, basket plan/status/begin/cancel and leg commit/steps/requote). The proxy adds the server's key and ignores any key the browser sends. Everything else is a 404.

Vercel environment variables (Project Settings → Environment Variables):

| Variable | Scope | Value |
| --- | --- | --- |
| `VITE_CROSS_ENGINES` | build | `v1,v2` on the testing deployment; unset in production until launch, then `v2` |
| `EMPX_V2_API_BASE_URL` | server only | `https://crosschain-v2.empx.io` |
| `EMPX_V2_API_KEY` | server only | the app's V2 integrator key (mark it Sensitive) |

The two `EMPX_V2_*` variables have no `VITE_` prefix, so Vite never puts them in the bundle. For local dev, put them in `.env.local`.

### V2 baskets

`/multi-v2?engine=v2` uses the same enabled-engine setting and stored preference. V1's basket API and Liquidator stay unchanged; V2 offers Multiswap, Split routes and Rebalancer only, with 1–10 independent intent legs.

Review shows skipped legs first and requires explicit begin before wallet execution. Splits use exact base-unit integer allocation; the largest share receives the remainder (first on ties). A stale begin/requote version re-reads the basket and requires another review, never an automatic retry.

Open basket ids are stored per wallet for manual resume. Active baskets poll every five seconds until completion, partial completion, failure or cancellation. Replayed legs consult intent status before requesting outstanding wallet steps. Claim/Recover opens the existing single-intent screen with that intent selected. V2 does not expose the V1 gas-top-up toggle.

Part A requires only a normal UI deployment with `v2` enabled. No backend or contract deployment is needed; the proxy's server-side key is unchanged.

### Removing V1 (after launch)

1. Point the `/cross-v2` route in `src/routers/index.jsx` at `src/features/cross/v2/CrossV2Flow` directly.
2. Delete `src/features/cross/engine.ts`, `engine.test.ts`, `CrossEnginePage.tsx`, `CrossEngineToggle.tsx`, and `VITE_CROSS_ENGINES`.
3. Delete `src/design-system/pages/CrossPage.tsx` and the V1-only code it alone uses in `src/features/cross/` (`api/`, `execution/`, `hooks/`, `model/`, `components/`, `utils/`), plus `VITE_CROSS_API_BASE_URL` and the `/api/v1` proxy in `vite.config.js`. Check each with a search for other importers first (the widget and Multi page share some helpers).
