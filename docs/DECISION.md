> Historical cost-comparison direction. The current B2B USDC invoice implementation is described in README.md and PRODUCT.md.

# SANAD: agree on what arrives

Decision date: 5 September 2026. This is a hackathon product decision, not customer validation or a claim that the project will win.

## The current decision

Build one workflow for a Canadian specialty-food importer paying an overseas supplier: **turn a conversation about an invoice into a jointly approved payment-cost agreement**. Before signing, the buyer sees the complete modeled CAD outlay, the supplier sees the modeled amount they receive, and both resolve who covers deductions. A user-controlled FX scenario shows the cost of waiting. The resulting snapshot can be signed and checked for alteration.

The useful moment is the fee disagreement being resolved. Chat makes the decision understandable in context; signatures preserve the decision. Neither is the main financial benefit by itself.

Use separate, mobile-first **Chat** and **Finance** screens with persistent bottom navigation. Chat opens first; **Review payment options** on the invoice opens Finance. Finance compares three fictional routes—Bank wire, Specialist transfer and USDC route—then leads through fee responsibility, FX scenarios and the same signed, exportable agreement. Keeping one purpose per screen makes the conversation and financial decision usable on a phone without creating a second product.

The demo persona and transaction are fictional. They illustrate a hypothesis about businesses already negotiating purchases in messaging apps. We have not interviewed that persona, observed their transactions, or established willingness to pay.

**Decision history:** the initial prototype excluded crypto and placed conversation beside the cost sheet. The revised scope includes a simulated USDC comparison and separates Chat from Finance in response to the mobile direction. Token execution and wallets remain outside the MVP.

## Critique of the supplied directions

| Direction | Judgment | Decision |
| --- | --- | --- |
| Messaging, payments, wallet, crypto, calls, separate identity, KYC integrations | Several products with different trust boundaries. This cannot credibly be finished as one lean workflow. | Keep the conversation and low-friction experience. Replace money movement with a payment decision. |
| Crypto as automatically cheaper or avoiding FX | A USD peg does not remove CAD funding or EUR payout conversion. A small network charge says little about the full invoice cost. | Include one explicitly simulated USDC route with both conversions, funding, network and recipient costs. Compare it on the same terms; no token execution or wallet. |
| Privacy | A useful constraint, but a production privacy claim needs a defined threat model and verified implementation. | Keep demo data local. Describe actual storage and cryptography precisely; do not claim zero knowledge or production messenger security. |
| Signed chat as the whole product | Technically demonstrable, but weak alignment with the international-transaction cost challenge. | Attach signatures to a concrete cost decision and fee responsibility. |
| PSP registry badge | Does not establish the supplier's identity, payment safety, or receipt amount. Name matching can mislead. | Cut from the core workflow. |
| Historical cost band | Requires real transaction observations. Synthetic rows are not historical evidence. | Use clearly labeled synthetic quotes and explicit fee ranges. |
| Broad international-trade tools from the research map | TripMargin and BidJPY have sharp business outcomes, but change more of the team's original conversation direction. | Select SANAD's collaborative exact-receipt workflow as the best fit across supplied preferences and challenge alignment. |

The pasted build document contains old prompts, file ownership rules and stage claims. Those are source material, not current instructions. We preserve the useful single-workflow scope and tamper-evident agreement idea; we do not repeat its unsupported claims about legal outcomes, customer validation, avoided disputes, or registry coverage.

## Evidence and its limits

The challenge brief explicitly identifies spreads, sender fees, intermediary charges, receiving charges and timing risk. Independent primary sources support those mechanisms:

- EDC explains that foreign-currency exposure can begin at quotation, before invoicing or settlement. This supports placing the decision before commitment. [EDC, FX risk](https://www.edc.ca/en/article/how-to-manage-fx-risk-before-it-impacts-your-profits.html)
- OFX states that third-party banks may deduct fees before paying the recipient. This supports displaying a receipt range when deductions are incomplete. This is mechanism evidence, not a quote used in the demo. [OFX Canada, transfer fees](https://www.ofx.com/en-ca/faqs/are-there-any-transfer-fees/)
- Swift describes unexpected fees, delays and deductions for consumers and SMEs, and already offers a participating-bank service intended to deliver the full amount. The market has solutions; our hypothesized distinction is collaborative agreement before selecting a route. [Swift Go](https://www.swift.com/products/swift-go)
- Bank of Canada rates are indicative and may differ from executable transaction rates. Reference rates must be separate from provider quotes. [Bank of Canada, FX methodology](https://www.bankofcanada.ca/rates/exchange/background-information-on-foreign-exchange-rates/)
- Circle describes USDC as redeemable for US dollars and says Circle Mint is unavailable to individuals or small businesses; small businesses use partner providers for entry and exit. Our inference for this CAD-funded, EUR-invoiced example is that a USD stablecoin still requires currency conversion at both ends. [Circle, USDC and access FAQ](https://www.circle.com/usdc)
- Circle's dollar-access use case concerns holding and spending dollars. It does not establish an FX-free CAD-to-EUR route. Circle's terms also distinguish direct redemption from third-party prices, which may vary, and identify possible fees. [Circle, dollar access](https://www.circle.com/use-case/dollar-access), [Circle, USDC terms](https://www.circle.com/legal/usdc-terms)

Sources checked on 5 September 2026. These sources do not prove demand for SANAD, the frequency of this specific persona's problem, or realized savings. The earlier research map's idea scores are informal prioritization scores; the attached judging PDF supplies the official weights below.

## Scope and claim boundaries

**Working prototype scope:** separate mobile Chat and Finance screens, editable invoice inputs, three-route deterministic cost comparison, receiver-deduction range, explicit fee bearer, a user-selected adverse-FX scenario, an agreement snapshot, browser-generated signatures and verification, and signed-record export.

**Synthetic or simulated:** named parties, conversation, provider quotes, fee ranges, reference rate and any transaction history; role switching represents the two participants. None is a bank offer or live customer transaction.

**USDC model:** CAD → USD/USDC → EUR. The invented assumptions are a 0.6% funding-conversion spread, 1% cash-out spread, C$4 funding charge, 0.25 USDC network charge valued at C$1.35 per USD, and €3–10 downstream charges. These are scenario inputs, not Circle fees or current market quotes. No provider, network, eligibility or payout availability has been established for the fictional supplier in Tunisia. The comparison includes modeled costs; it does not establish a usable route or capture every possible real-world cost.

**Deferred:** actual transfer or token execution, wallets, bank connections, identity verification, remote-party authentication, legal enforceability analysis, durable audited storage, live quote integrations, calibrated fee prediction and a production encrypted messenger. There is no FX forecast or Sharia certification claim.

The modeled upper fee bound is an assumption, not a confidence interval or receipt guarantee. Signing a snapshot does not lock an exchange rate. Cryptographic verification establishes consistency with the included public keys, not the legal identity of either person. A hash alone is insufficient: both signatures must verify against the signed content. Changed terms require new agreement and new signatures.

## Rubric mapping

Each criterion is graded 1–5 in the supplied PDF. Only category weights are supplied; there are no stated criterion-level weights.

| Official category | Weight | What judges should see | Evidence to present |
| --- | --- | --- | --- |
| Business: solves the problem, easy to use, sustainable running cost, researched rationale | 40% | One invoice with a visible receipt shortfall, comparable full-path costs including USDC, and an agreed fee bearer | This decision, source links, synthetic-data labels, a short before/after demo |
| Delivery: working live demo, clear explanation, convincing pitch, follow-up answers | 30% | Mobile Chat → Finance → agreement flow and a successful alteration-detection check | Rehearsed demo; candid real/mock explanation; tested reset path |
| Technical: architecture, code quality, performance, testing/coverage, decision process | 30% | Small static application with separated calculation and signing logic | Source, actual test output, production build and browser checks; report coverage only if measured |

Do not manufacture a projected score. A complete demo improves the case; customer evidence remains a gap.

USDC earns its place only by testing the challenge's full-cost comparison: the user must see what CAD leaves and what EUR may arrive. It adds no separate wallet workflow, runtime payment dependency or claim of automatic savings. This keeps the addition aligned with Challenge 02's visibility-tool constraint and its requirement for one core workflow.

## Business hypothesis and first validation

The prospective paying customer is a small importer with repeated foreign supplier invoices. A business subscription is a hypothesis to test; trade associations and bookkeepers are possible distribution partners, not confirmed buyers. A static prototype needs no paid model or payment-processing infrastructure. Production identity, storage, support and quote-data costs remain unmeasured.

Start with five importer interviews using one anonymized completed invoice per participant. Reconstruct the quoted rate, debit, recipient credit and fee responsibility. Ask whether a shared pre-payment cost snapshot would have changed an actual decision. Measure quoted-versus-settled cost error, frequency of short receipts, time to agreement, repeat use and willingness to pay. Continue only if the workflow changes real decisions; do not count enthusiasm as validation.
