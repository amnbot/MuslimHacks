# SANAD / سند — Business, in agreement

Create B2B invoices for goods or services, exchange encrypted signed records, and request **native USDC on Solana mainnet**. Each device has its own business profile. There are no fictional conversations, persona-switching controls, sample oil invoices, bank-wire choices, or fabricated balances in the active app.

## Run

Node.js 22+ is required. The browser app uses React, TypeScript and Vite:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 using localhost or HTTPS, which WebCrypto requires.

The native app uses Expo and the same invoice/signature domain:

```sh
cd mobile
npm install
npx expo start --lan
```

Open the QR code with compatible Expo Go on two phones connected to the same network. Each person enters their own business name; no role switch is needed. See [the two-phone walkthrough](docs/DEMO.md). These are separate workspaces. Records are exchanged manually through the share sheet or clipboard, not synchronized by a messaging server.

## Working features

- Create and keep multiple invoices, filter issued/received records, and import invoices from another business. Up to 50 goods/service line items per invoice; quantities support three decimal places, prices support six. Integer USDC arithmetic rejects unsupported precision instead of silently rounding it.
- Sign invoices with ECDSA P-256 and hash their canonical contents with SHA-256. The customer independently signs an acknowledgement of both the exact invoice and the issuer's signature. Imports verify signatures and reject conflicting copies of a saved invoice.
- Share AES-256-GCM encrypted files with a fresh random key and nonce. The decryption key is separate from the file. Browser WebCrypto and Expo Crypto use the same format. Plain signed JSON import is also supported; the web has an explicit unencrypted export option.
- Create Solana Pay transfer requests with the exact amount, recipient and native USDC mint. The wallet performs review and authorization. Select mainnet in the wallet; the standard transfer URI does not enforce the wallet's cluster.
- Save a public receiving wallet address. Wallet funding explains direct USDC transfers and links to MoonPay, Banxa, Stripe and Transak information, including material regional/business restrictions.
- Keep profile and invoice records across app restarts in browser localStorage or the native app's private document directory. Records are verified when loaded. Signing keys remain session-only and never appear in exports.

## Payment and fee model

Invoices are denominated and requested entirely in USDC. The supplier receives the invoiced USDC amount when the requested transfer executes; gas is paid separately in SOL. SANAD adds no invoice-payment or funding charge. No EUR cash-out, CAD conversion, fee-responsibility slider or synthetic provider price is added to the invoice.

The blockchain is **Solana mainnet-beta**, with Circle's native USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Every invoice/payment screen identifies USDC and Solana. [Circle contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

Solana's base fee is **0.000005 SOL per signature**, plus any priority fee. A new recipient token account may need an additional refundable SOL account deposit. The dollar value varies; the wallet is responsible for showing the current transaction cost. Existing exchanges may charge withdrawal fees. [Solana fees](https://solana.com/docs/core/fees).

Third-party purchase fees and conversion spreads apply when acquiring USDC through an eligible provider. No executable quote or provider integration is claimed. Canadian B2B eligibility cannot be assumed: Banxa restricts Canadian USDC/Solana coverage, MoonPay's Canadian Interac excludes business bank accounts, and Stripe's embedded onramp is US/EU only. See [verified provider research](docs/PAYMENTS-RESEARCH.md).

## Security and implementation boundaries

The interesting technical mechanism is a portable, encrypted, mutually signed invoice. Changing the amount, line items, business names, receiving wallet, blockchain or mint invalidates the signed record. A customer's acknowledgement also binds the issuer's exact signature, and previously saved records pin their original content and signatures.

AES-256-GCM protects **shared files**, not the whole app. Local invoice storage and copied plaintext remain unencrypted; Solana transactions and addresses are public. There is no messaging E2EE, authenticated business onboarding, secure device enrollment, hardware-backed signing, permanent signing identity or key recovery. Names and wallet ownership are self-declared; confirm a partner and their record fingerprint independently. [Privacy implementation](docs/PRIVACY.md).

There is no connected wallet signer, live balance, approved onramp checkout, remote chat service, RPC payment observer or paid-status automation. Opening a payment request never marks an invoice paid. Those integrations need production credentials and transaction verification. The app does not custody funds or send money itself.

## Verify

```sh
npm run build
npm test
node scripts/business-browser-check.cjs
cd mobile
npm run typecheck
npm run crypto-check
npx expo export --platform android --output-dir dist
```

The browser script expects the local Vite server at port 5173, `playwright-core`, and installed Chrome. It accepts `SANAD_URL`, `PLAYWRIGHT_MODULE`, and `CHROMIUM_PATH` overrides. Results go to `test-results/`, captures to `.impeccable/review/`. [Validation details](docs/VALIDATION.md).

Active architecture: `src/App.tsx` and `src/styles.css` own the web surface; `mobile/App.tsx`, `mobile/src/state/useBusiness.ts` and `mobile/src/screens/BusinessScreens.tsx` own the native surface; `src/lib/business.ts` owns invoices and signatures; `src/lib/envelope.ts` and `mobile/src/crypto/envelope.ts` own encrypted sharing; `src/lib/funding.ts` holds researched provider links.

The earlier cost-comparison modules, tests, mobile screens and browser scripts remain as legacy source, disconnected from the active interface. Their synthetic bank/EUR assumptions do not describe the new USDC invoice flow. `src/lib/agreement.ts` still supplies canonical JSON and hash helpers; new invoice signatures use the business module.
