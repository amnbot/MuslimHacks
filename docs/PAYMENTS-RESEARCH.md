# USDC settlement and funding research

Checked against primary documentation on 6 September 2026.

## Settlement choice

Use Circle-issued **USDC on Solana**, and show the blockchain on every invoice, payment request and payment detail. Circle's mainnet USDC mint is `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. The separate Solana devnet token is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`; devnet tokens have no financial value. [Circle contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

A transfer from an existing self-custody USDC wallet does not require a fiat onramp. SANAD can charge no app transfer fee. Solana still charges a base network fee of **5,000 lamports (0.000005 SOL) per signature**, plus any priority fee. Fees are paid in SOL; USD cost changes with SOL's price and the transaction. Creating a missing recipient token account can also require a separate account deposit. Do not promise zero total fees or a fixed fraction of one cent. Show the wallet's current network estimate at authorization. [Solana fees](https://solana.com/docs/core/fees), [Solana token accounts](https://solana.com/docs/tokens/basics/create-token-account).

Third-party funding is a separate purchase of USDC delivered to the wallet before the invoice is paid. Provider processing fees, FX spread and delivery/network charges belong to that funding quote. An exchange may also charge a withdrawal fee for sending existing USDC. These should not be invented or charged again as an app invoice fee.

## Funding providers

| Provider | Verified support and limits | Fee / integration behavior |
| --- | --- | --- |
| MoonPay | USDC on Solana is supported. Canadian Interac funding is available, but its help page explicitly excludes business bank accounts. This is not verified Canadian B2B treasury support. | Fees vary with transaction and jurisdiction; the pricing disclosure distinguishes MoonPay, network and possible ecosystem fees. Fetch a current eligible quote or direct the user to provider details. |
| Banxa | Asset table lists USDC on `SOL` for buy/sell, with `CA` in restricted geographies. | Hosted checkout quote APIs require a partner API key. Processing fees can be zero while spread remains in the rate. |
| Stripe crypto onramp | USDC on Solana is supported. Embedded onramp is available in the US excluding Hawaii and in the EU; it is not a CAD/Canada funding option. | Application approval is required even for testing. Backend session creation uses secret keys. Fees distinguish network and transaction fees. |
| Transak | Lists USDC on Solana. Coverage and limits depend on country, payment method, customer checks and asset. | Partner keys and onboarding are needed for an integrated checkout. Fees include provider and optional partner charges, network/exchange cost and conversion rate/slippage; use the actual quote. |

Sources: [MoonPay USDC on Solana](https://www.moonpay.com/newsroom/usdc-solana-moonpay), [MoonPay Canadian Interac](https://support.moonpay.com/en/articles/396467-buying-crypto-with-interac-e-transfer), [MoonPay pricing](https://www.moonpay.com/legal/pricing_disclosure), [Banxa asset coverage](https://docs.banxa.com/products/native-api/docs/how-it-works/supported-cryptocurrencies-and-blockchains), [Banxa quote API](https://docs.banxa.com/products/hosted-checkout/docs/api-integration/get-a-quote), [Stripe onramp setup and regions](https://docs.stripe.com/crypto/onramp/embedded), [Stripe onramp session fee fields](https://docs.stripe.com/api/crypto/onramp_sessions/object), [Transak USDC purchase networks](https://transak.com/buy/usdc), [Transak partner FAQs and fees](https://docs.transak.com/guides/partner-faqs).

## What is not connected

The local app has no demonstrated approved provider integration, live funding quotes, authenticated wallet signer or on-chain settlement observer. Provider information links are not integrations. A funding click or return URL must not mark funds as received. An invoice payment should remain awaiting verification until an actual confirmed transaction has been checked for chain, native USDC mint, destination, amount and duplicate use. Do not present a fabricated signature, balance or completed transfer as live settlement. Business eligibility, customer verification and production credentials must be resolved before a funding option can become actionable.
