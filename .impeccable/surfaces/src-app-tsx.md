---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["mobile/App.tsx", "mobile/src/screens/BusinessScreens.tsx"]
---

# SANAD app surface

## Scope and mode

Operate mode across the React/Vite web app and Expo mobile app. This is the authorized 6 September 2026 B2B invoice feature merge into the incumbent identity. The active destinations are Invoices and Wallet; creation and detail are focused invoice screens. PRODUCT.md owns product truth and DESIGN.md owns the visual system. Historical Chat/Finance composition instructions and `.impeccable/mocks/hybrid-a.webp` do not govern the current app hierarchy.

## Audience, job, and action

Businesses invoicing other businesses for any goods or services. One self-declared business profile belongs to each device. Create and sign a USDC invoice, exchange an encrypted record and separate key, independently acknowledge the same terms, and import the returned record. There are no seeded conversations, demo participants, product-category constraints, or role-switch controls.

## Chosen direction

Mashrabiya Daylight Ledger remains the world: porcelain surfaces, cropped diffused geometric daylight, plum ink, Lora/Manrope, and restrained lilac/mint/pink state vocabulary. The bilingual SANAD / سند mark and interlaced counterseal preserve recognition. The current memorable object is the authored invoice: ruled line items, a dominant USDC total, and readable signature evidence. It stays in the same material and typographic world as creation, sharing, and funding.

## Current composition

- **Workspace setup:** A calm business-name form establishes the self-declared profile. It leads to a true empty invoice list.
- **Invoices:** Create invoice leads; All/Issued/Received filters and Import invoice support it. Rows show counterparty, reference, due date, USDC amount, Solana mainnet, and acknowledgement status.
- **Create invoice:** Business details lead into generic, repeatable line items with description, quantity, unit price, and running total. Receiving Solana wallet and optional terms precede Create & sign invoice.
- **Invoice detail:** Parties and dates precede the ruled goods/services record and total. Signature or acknowledgement evidence follows. Share encrypted record and import actions support manual exchange. Payment instructions remain a distinct section and never mark settlement as confirmed.
- **Wallet:** Save a public receiving address, explain direct native-USDC deposits, then present external funding-provider information. Saving an address does not connect a wallet or fetch a balance.
- **Import/share/privacy:** Focused dialogs on web and sheets on native. Export the encrypted file and expose a separate decryption-key action with explicit separate-channel guidance. Import verifies the record before adding it. Privacy copy explains implemented mechanisms and local-storage limits in ordinary product language.

## Responsive hierarchy

Desktop web uses a 238px navigation rail at 1000px and a centered main work region with a 960px maximum width. Smaller web layouts retain a bottom bar; at 600px and below, form fields stack, line descriptions occupy a full row, list amounts wrap, and primary creation/detail actions expand. Native uses safe-area-aware bottom tabs and one scrolling work surface with 20px side insets. Invoices and Wallet are not simultaneous dashboard panes.

## Implementation inventory

| Ingredient | Current commitment | Medium |
| --- | --- | --- |
| Bilingual identity | SANAD + سند, dark plum ink | semantic text / native text |
| Mashrabiya daylight | cropped soft upper-field atmosphere behind solid reading surfaces | existing raster assets |
| Counterseal | recognizable interlaced geometry; broken/continuous web record strokes reflect acknowledgement | authored SVG / native component |
| Invoice list | genuine empty state, Create invoice, filters, import, labelled record rows | semantic controls / native views |
| Line-item editor | generic goods/services, add/remove, USDC unit prices and total | labelled inputs / native fields |
| Invoice folio | continuous porcelain record, hairline rules, aligned totals, readable signatures | semantic layout / native views |
| Acknowledgement state | pending lilac and resolved mint with written labels; no paid-state inference | tokens + text/icons |
| Primary action | dark plum, touch-sized and explicitly named | semantic button / native control |
| Navigation | exactly Invoices and Wallet; creation/detail remain under Invoices | current-page / selected-tab semantics |
| Secure exchange | encrypted file first, decryption key separately; verified import and manual return | dialog / native sheet and system sharing |
| Funding | address entry, direct deposits, honest external provider links | form + linked rows |

## Product and trust boundaries

All invoices request native USDC on Solana mainnet. Separate the zero SANAD payment/funding fee from third-party purchase/payment-method/conversion charges and the nonzero SOL network cost. Provider links are information links with eligibility caveats; there is no connected checkout, live quote comparison, balance feed, bank route, or cash-out simulation.

SHA-256 fingerprints and ECDSA P-256 signatures bind the canonical invoice; customer acknowledgement binds the exact issuer signature. AES-256-GCM exports use fresh keys/nonces and keep the key outside the file. Explain these details in privacy/record views without claiming authenticated business identity, wallet ownership, legal enforceability, encrypted local storage, or hidden blockchain activity. Signing keys are session-scoped. Sharing is manual and there is no automatic synchronization or settlement monitoring.

## Review evidence and limitations

The independent finish review disposition is **ship for the reviewed web scope**. The web dialog accessible-name issue was resolved by binding the visible title through `aria-labelledby`.

Current web evidence includes `.impeccable/review/business-desktop.png`, `business-mobile.png`, `business-desktop-builder.png`, `business-mobile-builder.png`, `business-mobile-detail.png`, and `business-mobile-wallet.png`. These replace the historical Chat/Finance screenshots as current composition evidence. Responsive web captures are not native device screenshots. The Android and iOS exports pass, but native screenshot certification is unavailable; do not present it as completed visual certification.
