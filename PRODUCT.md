# Product

<!-- impeccable:product-schema 1 -->

## Platform

Expo iOS/Android app and mobile-first React web app.

## Users and purpose

Businesses selling goods or services to other businesses. SANAD creates clear USDC invoices, records independent agreement to the same terms, and shares those records with encryption. There is no required product category or fictional participant.

## Current user direction

Invoice creation is a first-class feature. Payments and wallet balances are crypto-only; external providers may convert fiat into USDC before funding. All invoices settle in native USDC on Solana mainnet. The provider's purchase charges are separated from the small but nonzero SOL network cost. Do not add synthetic cash-out or bank-transfer routes.

## Operating context

One self-declared business profile per device. Invoices and Wallet are the main destinations; creation and detail are focused invoice screens. Real empty states replace seeded conversations and persona controls. Two independent Expo phones exchange encrypted files and separate keys via system sharing, then return signed acknowledgements. No automatic remote sync is currently implemented.

## Implemented technical mechanism

Canonical invoice JSON with SHA-256 content fingerprint, ECDSA P-256 issuer signature, and separate customer signature binding the exact issuer signature. The network, mint, wallet and amount are signed. Imported versions must match previously saved content and signing keys. AES-256-GCM file encryption uses fresh keys and nonces, authenticates metadata, and keeps the decryption key outside the shared file.

## Boundaries

Local records persist without application-level encryption at rest. Private signing keys stay in session memory; they are not persistent verified business identities. Public blockchain data remains public. Names and wallet ownership are not authenticated. Wallet links request payments but never claim settlement; approved onramp checkout, balance feeds, backend chat and settlement monitoring are not connected. Provider restrictions and current fees must be checked with that provider.

## Visual direction

Preserve the established porcelain, plum, lilac and mint identity, bilingual SANAD / سند mark, Lora/Manrope type and soft Mashrabiya daylight. The interface serves invoice work rather than demonstrating personas. Documented historical Chat/Finance compositions are superseded by the B2B invoice flow authorized on 6 September 2026.
