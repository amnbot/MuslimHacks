# Product

<!-- impeccable:product-schema 1 -->

## Platform

mobile-first web

## Stack

Delegated by the user's explicit instruction to select and build the entire lean MVP. React, TypeScript and Vite; static browser application, no backend or paid API.

## Users

Small importers who negotiate with overseas suppliers in messaging apps. Bilal in Montréal and Amira in Sfax are fictional demo personas, not interviewed customers.

## Product Purpose

SANAD turns one supplier invoice in a conversation into a reviewed, mutually signed cost agreement. Reveal the full payer cost, possible recipient deductions, and who covers them before either party agrees.

## Positioning

The useful unit is an agreed payment decision: a cost comparison and fee allocation that both parties can verify later. Customer demand and willingness to pay remain unvalidated.

## Operating Context

Hackathon Challenge 02: international transaction cost visibility. One workflow that works on a phone and remains easy to demonstrate on a laptop. Chat opens first; its invoice opens a separate Finance screen. Bottom navigation on smaller screens becomes a rail on desktop, with the two screens kept separate at every width. Preserve the team's integrated messaging and privacy direction without operating payment rails.

## Capabilities and Constraints

Synthetic invoice and three provider-route quotes, real arithmetic, exchange-rate stress scenarios (not predictions), browser-generated signatures, portable evidence and tamper detection. The USDC comparison models CAD funding, transfer and EUR cash-out, including both conversion spreads and modeled fees. A USD peg does not avoid CAD/EUR conversion; no real quote or payout availability is claimed. No movement of money, wallet, claims of verified identities, legal enforceability, provider safety, zero knowledge or Sharia certification. No analytics or third-party runtime requests. No persistence of messages or private keys. Separate demo roles clearly labeled.

## Evidence on Hand

User supplied message (8), message (9), SANAD build document and MuslimHacks judging rubric. Existing research/international-trade-hackathon-ideas.md is context, not independently verified evidence. No customer interviews or real quotes supplied.

## Product Principles

- The signed object must capture a useful cost decision.
- Show unknown charges as ranges, never as a fake precise quote.
- Label assumptions and synthetic inputs at the decision point.
- Mock infrastructure; implement the core mechanism.
- Give Chat and Finance one purpose per screen while preserving shared deal state.
- Compare USDC on full buyer outlay and supplier receipt, never network fees alone.
