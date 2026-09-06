# Validation and finish review

28 domain tests passed on 5 September 2026. Cost calculation coverage: lines 100%, branches 100%, functions 100%. Agreement coverage: lines 99.36%, branches 85.71%, functions 100%. UI is not included in those percentages. Node 22 and Chromium were used.

Browser acceptance covered sequential two-tab consent, same-tab role switching, receipt/fee/rate calculations, exports, imports, altered copies, revision, edited invoices and reset. Screen widths 1440 and 390 pixels were checked. No uncaught errors or external runtime requests occurred. Tests deliberately check that an FX scenario does not silently change the snapshot's baseline rate.

The final targeted browser check also passed simultaneous signing with deliberately delayed real WebCrypto operations. Both tabs converged on two valid signatures. Resetting from the other tab during signing prevented the discarded agreement from returning. A changed invoice with recomputed arithmetic failed the original fingerprint; the unchanged record still verified. Results are in test-results/concurrency-check.json.

The integration review found and fixed concurrent signature replacement, quote assumptions being read from the wrong record, discarded drafts being resurrected by pending asynchronous operations, and buyer outlay labeled as the current participant's outlay.

## Finish review

The independent design reviewer was dispatched with source and desktop/mobile captures but stopped at an account usage limit. The author substituted the skill's degraded review; this is not an independent visual certification.

Disposition: ship at prototype scope after the listed fixes.

- **Persistence:** PRODUCT.md and the direction contract exist. The seed key survives the production build. DESIGN.md records the resulting interface.
- **Fidelity:** forest rail, paper work surfaces, Manrope interface, Lora shipment title and conversation/cost composition match the direction. Mobile prioritizes the decision and places the conversation beneath it, an adaptation for limited space.
- **Ceiling:** no image composition was promised; there are no shipping raster assets. A single seal reveal uses a clip transition and honors reduced-motion settings.
- **Material fixes:** small decision copy was enlarged; verbose quote metadata was shortened and separated correctly; misleading absolute integrity wording was narrowed; mobile now reaches the cost decision first. The deterministic source checks and second visual pass verified these changes. Some metadata remains compact; comprehensive accessibility certification was not performed.
- **Keep:** the recipient shortfall, explicit fee owner, and one mutually signed cost snapshot stay central.

Limitations: in-memory local demo, synthetic inputs, fictional roles, no authenticated remote participants, no guarantee of fee bounds or receipt amount, and no production security or legal certification. Public deployment has not been performed.
