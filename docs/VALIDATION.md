# Validation — B2B USDC invoices

Validation date: 6 September 2026. This replaces the earlier cost-comparison validation as the current app's record.

- Production TypeScript/Vite build passed.
- All 51 automated tests passed, including 13 new business-invoice tests and 6 encrypted-envelope tests. Legacy cost/agreement tests remain for the preserved source modules.
- Native app and scripts TypeScript checks passed.
- `mobile/npm run crypto-check` passed 12 Node-signed and 12 Expo-shim-signed agreement records in both runtimes, including tampering detection. The new business tests separately verify browser/shim invoice-signature interoperability.
- Android and iOS Expo exports bundled successfully to `mobile/dist/` and `mobile/dist-ios/`. This establishes bundle compatibility, not physical-device behavior.
- All 13 checks in `scripts/business-browser-check.cjs` passed: separate issuer/customer browser contexts, multi-line invoice creation, exact USDC amounts, invalid-address rejection, encrypted download, wrong-key rejection, independent acknowledgement, encrypted return/merge, tamper rejection, reload persistence, wallet address storage and provider disclosure. Widths 320, 390, 768, 1000 and 1440 had no horizontal overflow in the checked surfaces. No uncaught browser errors or third-party runtime requests occurred. Results are in `test-results/business-browser.json`.

Security tests also cover malformed imports, unsupported chain/mint, canonical keys, timestamp/signature/content changes, substituted issuer keys, customer acknowledgement binding, unsafe decimal amounts, plaintext/secret exclusion from encrypted exports, altered ciphertext/IV/tag/metadata, maximum envelope bounds and independent Node AES-GCM interoperability.

Physical Expo devices, native AES execution, system share sheets, wallet handoff and iOS keyboard behavior have not been exercised on hardware here. Follow the two-phone walkthrough for those checks. There is no connected checkout, live blockchain observer, payment execution or authenticated account service to test. No production security certification is claimed.

The web design detector was run once; it reported advisory color/type differences against the previous Chat/Finance design documentation. The B2B surface preserves the established visual identity. Native code is outside that detector's scope.

Independent finish review: **ship for reviewed web scope**. The sole material finding, unnamed web dialogs, was fixed with unique heading IDs and `aria-labelledby`; a Chromium accessible-name assertion passed. The reviewer inspected desktop and mobile web captures, not native devices. This is not native visual certification.
