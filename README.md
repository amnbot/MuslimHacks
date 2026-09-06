# SANAD — Agree on what arrives

A lean, mobile-first MuslimHacks Challenge 02 prototype: **conversation → cost decision → mutual agreement → verifiable record**. Chat and Finance are separate screens at every width, connected by the invoice and persistent navigation.

A fictional Montréal importer owes a supplier in Sfax €6,000. Sending €6,000 may leave the supplier short after bank deductions. SANAD compares full buyer outlay, makes the possible receipt gap visible, and records which party covers it. Both parties sign the same snapshot before any payment happens.

## Run

Requires Node.js 22+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The current workspace's preview is already running there. Use localhost or HTTPS: browser cryptography needs a secure context. Do not open index.html directly from disk.

```sh
npm run build
npm run preview
npm test
npm run test:coverage
```

The production build is `dist/`, ready for any static HTTPS host. No backend, environment variables, API keys, database, wallet, or account setup. Fonts and icons are bundled locally. The app is not publicly deployed.

## Mobile app (React Native)

The same workflow runs as a native iOS and Android app built with Expo in `mobile/`. It imports `src/lib/costs.ts` and `src/lib/agreement.ts` directly, so the arithmetic, canonical JSON, hashing and signatures are identical to the web app and covered by the same tests.

```sh
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` or `a` for a simulator. No native build is required. Hermes has no `crypto.subtle`, so the app installs a small WebCrypto-compatible shim (`mobile/src/crypto/subtle-shim.ts`) over `@noble/curves` for ECDSA P-256 and `@noble/hashes` for SHA-256. Records signed in a browser verify on the phone and vice versa; `npm run crypto-check` in `mobile/` proves this against Node's WebCrypto in both directions, including tamper detection. `npm run typecheck` type-checks the app and scripts.

Differences from the web app: both demo roles run on one device (there is no tab-to-tab sync), **Share signed record** opens the system share sheet with the JSON file, **Copy record as JSON** puts it on the clipboard, the verifier reads a file through the document picker or pasted text, and there is no print layout.

## Try the complete workflow

1. The app opens in **Chat**. Read Amira's request for the full €6,000, then tap **Review payment options** to open **Finance**. The sample bank route can leave her €35 short.
2. Compare **Bank wire**, **Specialist transfer** and **USDC route**. Select **Specialist transfer** and choose **Buyer · budget for full invoice**. Bottom navigation on phones and a rail on desktop let you return to Chat without losing the decision.
3. Expand **Where every dollar goes**. The buyer budgets **CA$9,065.04–9,080.12**, compared with **CA$9,292.09–9,322.87** for the sample bank route under the same fee responsibility. The upper-estimate difference is **CA$242.75**. These are synthetic arithmetic results, not real provider savings.
4. Optionally explore a +5% FX scenario. This raises the modeled specialist outlay to **CA$9,533.73**. Scenarios never alter the signed baseline quote.
5. **Review agreement**, acknowledge the estimates, and **Sign as Bilal**.
6. **Review as Amira**, acknowledge separately, and **Sign as Amira**. Or open the other party in a tab in the same browser, then sign there. Both tabs synchronize locally.
7. **Download signed record**. Open **Verify or test a change**, upload the JSON, then **Test a changed amount**. The modified copy fails; the original still verifies.

Use the invoice edit control to change quantity, unit price, sale proceeds, other costs and due date. The sample fee bands require an invoice of at least €35. **Revise terms** starts a new draft and discards the previous signatures. Download a sealed record before revising or resetting if you want to preserve it.

## Real versus simulated

| Working | Simulated / not claimed |
| --- | --- |
| Cost ranges, fee allocation, margin calculations, ±10% FX sensitivity | Fictional providers, rates, fee bands, delivery estimates, invoice and participants |
| Three-route comparison including the complete modeled USDC path | No wallet, token execution, live USDC quote or confirmed payout availability |
| In-memory conversation and local same-browser tab synchronization | No remote messaging service or production end-to-end encryption |
| SHA-256 canonical content hash and ECDSA P-256 signatures | No verified human or company identities; no legal enforceability claim |
| Complete signed JSON export, import checks, printable record, alteration detection | No trusted timestamp authority, identity certificate, bank connection or funds movement |

No analytics or third-party runtime requests. Messages and private keys live only in memory. Closing all demo tabs clears the session; another open tab can reshare its current state after a refresh. Exports contain deal data and public keys, never private keys. Both roles run on one device by default. This proves integrity against the included keys; an entirely replaced file with new keys requires an independent trusted record to detect.

## Small architecture

- `src/App.tsx`: separate Chat and Finance screens sharing one workflow, React state, native dialogs, local BroadcastChannel synchronization.
- `src/lib/costs.ts`: explicit input validation and deterministic cost arithmetic.
- `src/lib/agreement.ts`: canonical JSON, non-extractable private keys, signing, strict verification, and merge of concurrent signatures to identical terms.
- `src/styles.css`: responsive interface, print layout and reduced-motion handling.
- `tests/`: calculation, validation, signing, tampering and concurrent-merge tests.
- `scripts/browser-check.cjs`: browser acceptance test for the complete journey.
- `mobile/`: Expo React Native app. `src/state/useDeal.ts` holds the shared workflow state, `src/screens/` the Chat and Finance screens, `src/modals/` the guide, sources, invoice editor, verifier and USDC sheets, and `src/crypto/subtle-shim.ts` the WebCrypto shim for Hermes.

Same-party conflicting signatures are rejected. Asynchronous agreement work is invalidated on reset or revision. Incoming quotes are read from the signed snapshot. Changes to a signed invoice or calculated costs cannot reuse the previous signatures.

## Cost model

Reference principal = invoice EUR × reference CAD/EUR rate. Markup = customer-rate principal minus reference principal. Buyer outlay = customer-rate principal + transfer fee + downstream reserve when the buyer covers it. Supplier receipt = invoice minus the fee range when the supplier covers it. Margin = expected sales minus other costs minus outlay. Both customer and reference rates shift in an FX scenario; fixed CAD transfer fees stay fixed. Amounts round at monetary boundaries to cents.

Fee bands are assumptions, not confidence intervals. Buyer coverage targets full receipt, but does not guarantee a provider can deliver it. Final executable rates and charges must be confirmed outside this prototype. There is no prediction of FX direction, no hedging product and no Sharia-certification claim.

The USDC comparison models **CAD → USDC → EUR**. USDC follows the US dollar; it does not remove the CAD funding and EUR cash-out conversions in this example. Small businesses also need partner providers for entry and exit. [Circle's USDC access FAQ](https://www.circle.com/usdc)

The synthetic USDC assumptions include both conversion spreads, a funding charge, a network-fee budget and downstream fees. Under buyer coverage, its modeled outlay is **CA$9,153.45–9,164.12**, versus **CA$9,065.04–9,080.12** for the specialist. USDC therefore costs more in this scenario. These are authored inputs, not provider quotes or evidence of a usable payout route in Tunisia. The same agreement and verification workflow works with any of the three choices.

## Verification performed

On 5 September 2026:

- **32/32 automated tests passed.** Cost module: 100% lines, branches and functions. Agreement module: 99.36% lines, 85.71% branches and 100% functions. These metrics cover the two domain modules, not React UI coverage.
- Production TypeScript/Vite build passed. JavaScript is approximately **80.22 KB gzipped**.
- Chromium acceptance passed all **23 recorded checks**, including the full workflow at **1440 × 1100** and **390 × 844**, plus layout checks at **320 × 740** and **844 × 390**. Checks include separate screens, navigation and state retention, USDC cost decomposition, mobile USDC signing and export/import, fee allocation, FX scenarios, consent, same-tab and two-tab signing, alteration detection, revision and reset.
- No uncaught browser errors, horizontal overflow or third-party runtime requests in the tested journeys.

These are browser-emulated viewport checks, not tests on physical phones.

Run browser acceptance with a local preview running and Playwright installed (`npm install --no-save playwright`, then `npx playwright install chromium`). The script accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `SANAD_URL` overrides for bundled runtimes. Run `node scripts/browser-check.cjs`. Output goes to `test-results/`; screenshots go to `.impeccable/review/`.

## Present and continue

- [90-second demo and judge Q&A](docs/DEMO.md)
- [Product critique, research and rubric mapping](docs/DECISION.md)
- [Interface system](DESIGN.md)
- [Validation notes](docs/VALIDATION.md)

The first post-hackathon step is five importer interviews using actual completed invoices. No customer validation, usage, revenue or real savings is claimed. Validate whether this shared cost decision changes behavior before adding infrastructure.
