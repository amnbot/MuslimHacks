# Two-phone walkthrough

Run `npx expo start --lan` from `mobile/`. Both phones need compatible Expo Go and access to the same Metro server. Open its QR code on each phone. Each device has its own stored profile and signing session.

1. On the issuer's phone, enter the issuer's business name. On the customer's phone, enter a different business name. Use the customer's exact workspace name in the invoice. For a presentation, use clearly identified example businesses in your narration; the app itself starts empty.
2. The issuer chooses **Create invoice**, enters any goods or services, quantity and USDC unit price, reference, due date, terms and a Solana receiving wallet they control. Choose **Create & sign invoice**.
3. Show **USDC · Solana mainnet** and the exact invoice total. Expand signature details to show the SHA-256 fingerprint. The issuer signature includes the amount, recipient, network and native USDC mint.
4. Choose **Share encrypted record**. Send the encrypted JSON using the system share sheet or copy it into your transfer channel. Copy the separate decryption key and deliver it through another trusted channel. Keep the sheet open until both are saved; reopening creates a new encrypted file/key pair.
5. The customer uses **Import signed invoice**, chooses/pastes the encrypted record and enters its separate key. **Verify & import** decrypts the file and checks the issuer signature. Wrong keys or modified content fail.
6. The customer reviews the invoice, checks the acknowledgement box, and signs. Share the newly encrypted record and its new separate key back to the issuer. Importing it merges the customer's signature into the issuer's original invoice.
7. Both phones now show acknowledgement of the same terms. This is not a payment confirmation. Show Wallet funding information and the payment request with Solana identified. A compatible wallet can review a native USDC transfer; ensure it is on mainnet. Actual payment is optional and requires your own funds and explicit authorization in the wallet.

No remote chat or automatic sync is connected. File exchange is the functioning two-phone transport; there are no hidden role switches. No funds need to move to demonstrate creation, encrypted sharing, independent signatures or tamper rejection. Never present a fabricated transaction as real.

Technical explanation: “The invoice is portable evidence. Both businesses sign the same amount, terms, wallet and blockchain. We encrypt the shared file using AES-256-GCM, while SHA-256 and P-256 signatures make changed or substituted records detectable.”

Be precise about privacy: exports are encrypted, local stored invoice records are not; Solana transfers are public. Business names are self-declared. The protocol is not a claim of fully encrypted messaging or authenticated business identities.
