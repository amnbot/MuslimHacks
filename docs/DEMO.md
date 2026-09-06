# SANAD demo and judge notes

## The one sentence

**SANAD takes an importer and supplier from a chat about an international invoice to a shared agreement on its full modeled cost and who covers deductions.**

The buyer cares what leaves their account. The supplier cares what arrives. The prototype makes both visible before either agrees.

## Ninety-second walkthrough

Start from the seeded demo on a phone-sized screen in **Chat**. The persona, routes, rates and fees are synthetic. Read calculated figures from the interface; do not memorize numbers that may change with inputs.

| Time | Show | Say |
| --- | --- | --- |
| 0–10 seconds | Chat and supplier invoice | “This fictional Canadian importer owes a supplier €6,000. They agree on the invoice, but not yet on what arrives.” |
| 10–20 seconds | Tap **Review payment options** to open Finance | “Chat keeps the conversation familiar. Finance compares three synthetic routes by what leaves in CAD and what may arrive in EUR.” |
| 20–35 seconds | Select **USDC route** and expand the cost breakdown | “USDC is tied to the US dollar. Here CAD still converts in and EUR converts out. We include those spreads, funding, network and recipient charges. This is a hypothetical route, with availability unverified.” |
| 35–48 seconds | Select **Specialist transfer**; choose buyer fee responsibility | “Under these assumptions, this option has the lower modeled outlay. We agree the buyer budgets for deductions. The range stays visible; it is not a receipt guarantee.” Read the current figures, without claiming real savings. |
| 48–58 seconds | Change the adverse-FX scenario | “What if EUR costs more CAD when payment is due? This is a scenario, not a prediction.” Signing snapshots the baseline quote, not this scenario. |
| 58–76 seconds | Review the snapshot; acknowledge and sign as each demo party | “Both approve the same invoice, route, fee responsibility and cost assumptions. Each signature binds to that snapshot.” |
| 76–87 seconds | Download the signed record and run the alteration check | “Changing signed terms fails verification. These keys demonstrate integrity, not real-world identity.” |
| 87–90 seconds | Verified original record | “One payment decision agreed. No money moved.” |

If time is cut to one minute, omit the scenario interaction and export click; retain Chat → Finance, the USDC full-path reveal, fee responsibility, signatures and alteration check.

## Before presenting

1. Run the project using the README instructions and reset to the seed scenario.
2. Check the full workflow once in the exact browser and screen size being used on stage, including both bottom-navigation tabs and the invoice's Finance link.
3. Keep the source and actual test results ready for technical questions. Do not invent test coverage.
4. Prepare an honest fallback: screenshots or a recording of the working build, clearly described as recorded. If no recording exists, use the source to explain the failing step rather than claiming a backup works.
5. Rehearse with a timer. Start with the financial problem; explain cryptography only after the useful decision is visible.

## What is real and what is simulated

| Real capability | Demo boundary |
| --- | --- |
| Calculations recompute from inputs and selected assumptions | Provider quotes, reference rates and fee bounds are synthetic, not live offers |
| USDC is compared using modeled funding, conversion, network and payout costs | No wallet, blockchain transaction, live partner quote or verified Tunisia payout availability |
| Scenario controls show the arithmetic effect of an exchange-rate change | No probability, recommendation about market direction, or rate forecast |
| The selected deal can be signed and cryptographically checked | Demo keys are not verified human or company identities |
| An altered signed snapshot can fail verification | This does not establish legal enforceability or protect against a compromised device |
| A conversation anchors the transaction | Demo parties and messages are fictional; role switching is not remote identity authentication |

Describe any storage, messaging, export or multi-tab functionality exactly as it exists in the final README and interface. Do not claim production end-to-end encryption simply because browser signing is implemented.

## Judge questions

**Why this problem?** The challenge names incomplete all-in costs and timing risk. EDC describes exposure beginning at quotation, and OFX acknowledges possible third-party deductions. We place the decision before commitment. Sources and limitations are in `docs/DECISION.md`.

**Why not use the bank, an FX comparison site, or e-sign software?** Those solve parts of the workflow. Our hypothesis is that the missing moment is agreement between buyer and supplier on net receipt and fee responsibility. That distinction still needs customer validation; it is not a claim that no competitor exists.

**Have you validated it with importers?** No customer interviews or live transactions are claimed. We have desk research supporting the cost mechanisms and a prototype for testing the workflow. The next step is reconstructing five completed invoices with real importers.

**How much does it save?** The interface calculates a difference between the synthetic options under their stated assumptions. That is a scenario result, not observed customer savings or a promise about an actual provider.

**Does USDC avoid FX fees?** Its dollar peg does not remove conversion from CAD or into EUR. The demo exposes both conversion spreads and the other modeled charges. Circle also says small businesses obtain USDC through partner providers rather than Circle Mint; actual access and cost need confirmation. [Circle, USDC FAQ](https://www.circle.com/usdc)

**Why include USDC at all?** It is another hypothesis to compare against the same full-cost question. A low network fee can look attractive until the rest of the payment path is visible. It adds a comparison within the existing workflow, with no token execution, guaranteed savings or Sharia-certification claim.

**Can you guarantee the supplier gets the invoice amount?** No. Fee responsibility records who agrees to cover deductions. Any modeled gross-up only covers the stated fee assumptions. The actual transfer provider must confirm a current executable quote and payout terms outside this prototype.

**Are these legally binding signatures?** We demonstrate cryptographic signatures and detection of changed content using demo identities. We make no claim about legal enforceability or verified identity.

**Where is the AI?** The runtime does not need an LLM. The difficult parts are honest cost modeling, making uncertainty readable, and agreeing on one exact snapshot. Describe coding-assistant use accurately when asked how the project was built.

**What did you build during the hackathon?** Give the real timeline and disclose pre-existing research or assets. Do not claim every line was written during the event unless that is true.

**How does it work behind the scenes?** A small browser application calculates from structured inputs. An agreement snapshots the chosen terms; browser cryptography signs it, and verification checks its integrity. Use the final README for the exact libraries and persistence behavior.

**How is it tested?** Show the real test output. Explain the calculation cases, validation boundaries and alteration-detection checks that actually ran, plus browser verification. If line coverage was not measured, say so.

**Who pays and how do you acquire users?** A subscription for repeat importers is the first hypothesis. Bookkeepers and trade associations are possible channels. We have no pricing validation or distribution agreements.

**What would production need?** Verified party identity and key management, authenticated sharing, consent and retention decisions, recovery, accessible quote provenance, provider integrations, security review and invoice-based field validation. Those are future work, not hidden working features.

**Why should this win?** It completes one financially meaningful decision, exposes uncertainty instead of hiding it, and demonstrates a useful agreement with working verification. The case is its clarity and completeness, not an invented traction number.
