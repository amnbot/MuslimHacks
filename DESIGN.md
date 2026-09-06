---
name: SANAD / سند
description: A Mashrabiya-daylight ledger for clear business invoices and shared signed records.
colors:
  plum-action: "#241d3e"
  plum-action-hover: "#352a56"
  plum-ink: "#2c264a"
  plum-link: "#6750a8"
  porcelain-ground: "#fdfcf9"
  porcelain-surface: "#fdfbf8"
  porcelain-input: "#fffefa"
  hairline: "#e8e1eb"
  muted-ink: "#6f6878"
  lilac-wash: "#f6f1fa"
  mint-wash: "#eaf8f3"
  warning-wash: "#fff1ea"
  danger: "#9b3855"
  state-lilac: "#e8d8ff"
  state-mint: "#bcede7"
  state-pink: "#ff8fcc"
typography:
  display:
    fontFamily: "Lora, Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.23
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Lora, Georgia, serif"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.6
  mono:
    fontFamily: "Menlo, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  clipped: "3px"
  small: "8px"
  control: "13px"
  panel: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.plum-action}"
    textColor: "{colors.porcelain-input}"
    rounded: "{rounded.control}"
    padding: "13px 19px"
    height: "50px"
  button-secondary:
    backgroundColor: "#f8f4fa"
    textColor: "#4b3b67"
    rounded: "{rounded.control}"
    padding: "13px 19px"
    height: "50px"
  text-field:
    backgroundColor: "{colors.porcelain-input}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control}"
    padding: "12px 13px"
    height: "49px"
  invoice-folio:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.panel}"
    padding: "32px"
  nav-active:
    backgroundColor: "#efe8ff"
    textColor: "{colors.plum-ink}"
    rounded: "14px"
---

# Design System: SANAD / سند

## Overview

**Creative North Star: "Mashrabiya Daylight Ledger"**

SANAD feels like a bilateral trade record laid on a porcelain field beneath cropped Mashrabiya daylight. Plum ink provides seriousness without resembling a bank dashboard; lilac, mint, and pink remain restrained state accents. The bilingual SANAD / سند identity and the interlaced Arabic counterseal make the system recognisable before any account chrome could.

The interface stays calm until a consequential record needs attention. Authored invoice details, aligned figures, signatures, and supporting actions share one visual language. Dense financial information remains semantic, selectable, and legible; decorative geometry never sits behind it. The current app composition is recorded in `.impeccable/surfaces/src-app-tsx.md`; its Invoices/Wallet hierarchy supersedes the historical Chat/Finance composition without replacing this identity.

**Key Characteristics:**

- Porcelain fields under cropped geometric daylight.
- Plum ink with quiet lilac and mint states and retained pink seal accents.
- Lora-led records paired with highly legible Manrope controls.
- The shared interlaced eight-point counterseal.
- Ruled records, generous reading space, and explicitly labelled amounts.

## Colors

Porcelain neutrals hold the reading surface, plum establishes authority, and the state hues behave like transmitted light rather than large decorative fills.

### Primary

- **Action Plum** (`plum-action`): Primary workflow buttons and the darkest brand anchors.
- **Plum Ink** (`plum-ink`): Default text, financial figures, and high-importance labels.
- **Ledger Violet** (`plum-link`): Text actions, selected controls, and navigational emphasis.

### Secondary

- **Compare Lilac** (`state-lilac`): Retained counterseal vocabulary and restrained unresolved-state light.
- **Agreement Mint** (`state-mint`): Retained agreement and resolved-state light.
- **Counterseal Pink** (`state-pink`): Retained native counterseal accent; it does not require a pink stage on every screen.

### Tertiary

- **Lavender Wash** (`lilac-wash`): Quiet supporting and selected surfaces; retained in the native theme.
- **Agreement Wash** (`mint-wash`): Acknowledged states and resolved callouts.
- **Caution Peach** (`warning-wash`): Decision-point uncertainty.
- **Tamper Rose** (`danger`): Validation failures and error states.

### Neutral

- **Porcelain Ground** (`porcelain-ground`): The application canvas beneath daylight.
- **Porcelain Surface** (`porcelain-surface`): Headers, invoice folios, dialogs, and lifted records.
- **Porcelain Input** (`porcelain-input`): Inputs and crisp reading fields.
- **Lilac Hairline** (`hairline`): Structural separators and quiet container edges.
- **Muted Ink** (`muted-ink`): Supporting copy, dates, disclosures, and secondary labels.

**The State-Light Rule.** Lilac supports pending or selected states and mint supports acknowledgement. Every state also carries readable text or an icon; colour alone never declares a signature or payment result.

**The Porcelain Rule.** Preserve warm near-white layering. Do not substitute cool grey dashboard panels or large saturated fills.

## Typography

**Display Font:** Lora (with Georgia and serif fallbacks)  
**Body Font:** Manrope (with sans-serif fallback)  
**Label/Mono Font:** Manrope for labels; platform monospace for fingerprints, record IDs, and wallet addresses.

**Character:** Lora makes invoices, section headings, and totals feel authored and durable. Manrope keeps controls, explanations, and dense arithmetic direct; the contrast is editorial rather than ornamental.

### Hierarchy

- **Display:** Web screen headings use 36px, reducing to 31px below 600px. Native invoice screens use roughly 30–32px.
- **Headline:** Web section headings use 25px; record subsections commonly use 23px. Native record sections use 23–25px.
- **Title:** Manrope gives business names and decision labels a compact, confident weight; reserve larger sizes for actual headings.
- **Body:** Ordinary web prose uses 14px with 1.8 line-height and a 72ch maximum. Native prose uses 13–14px; inherited 15px controls remain available.
- **Label:** The 12px role carries fields and supporting actions. Smaller status/date text is limited to compact metadata.
- **Mono:** Fingerprints and addresses wrap safely; a shortened fingerprint offers a copy action for its full value.

**The Financial-Figure Rule.** Amounts use tabular numerals and stay visually aligned; currency context never relies on position alone.

**The Record-Voice Rule.** Reserve Lora for identity, headings, invoice totals, and record artifacts. Controls and explanatory prose remain Manrope.

## Layout

The base spatial model is one focused task at a time, with a stable two-destination shell and vertically flowing work surfaces. Invoice creation and detail occupy the invoice destination. The surface brief owns the exact workflow; historical conversation/composer layouts are not requirements for new screens.

Web content is centered in a 960px maximum main region. At widths up to 600px, content uses 17px side insets, business fields stack, and each line-item description spans a full row above quantity, unit price, and removal. List amounts wrap below the business identity. Primary list creation and detail actions become full-width. Larger forms use two columns and horizontal line editors.

At 1000px on web, a 238px porcelain rail replaces the 76px bottom bar; main content gains 44px side padding. The mobile bar includes the bottom safe-area inset. Native retains a 72px bottom bar plus safe-area inset, with 58px navigation targets; its scrolling work surface uses 20px side padding and a 700px maximum width. The established 4/8/16/24 spacing scale remains the rhythm beneath these responsive measurements.

**The One-Task Rule.** Keep one main work surface in view. Navigation, back actions, and the shared record identity provide continuity.

## Elevation & Depth

The system combines tonal layering with low-chroma plum shadows. Most hierarchy comes from translucent porcelain over the daylight field; shadows lift the web folio, dialogs, and transient feedback. Web daylight occupies a cropped 470px upper field at 0.55 opacity; native uses a 430px field at 0.66 opacity. Solid reading surfaces keep this atmosphere away from dense content.

### Shadow Vocabulary

- **Folio Lift** (`0 20px 54px #33213f0e`): The current web invoice, empty-state, setup, and wallet folios.
- **Focused Dialog** (`0 28px 90px #23172f38`): Modal import, sharing, and privacy tasks.
- **Transient Toast** (`0 18px 42px #291d4030`): Short-lived confirmations above navigation.

**The Light-Before-Shadow Rule.** Establish depth with daylight, surface opacity, and tonal contrast first. Use shadows for functional separation.

## Shapes

The prevailing silhouette is a softly faceted rectangle: roughly 12–14px fields and controls inside 16px panels. Hairlines are pale lilac and usually one pixel. Small status and network tags use pills. The older asymmetric message bubbles and luminous invoice hinge remain historical compositions, not required active components.

The counterseal is an interlaced eight-point line mark. The web record uses broken outer strokes before acknowledgement and continuous strokes after acknowledgement; native retains the shared open/aligned/closed component vocabulary. Keep the recognisable geometry and pair record state with words. Completion geometry describes acknowledgement, never settlement.

**The Counterseal Rule.** Never redraw seal states as unrelated icons or use them as a substitute for a written status.

## Components

### Buttons

- **Shape:** Softly faceted controls with 13px web primary corners. Primary/secondary controls have a 50px web minimum height; inherited native buttons retain their touch-sized proportions.
- **Primary:** Action Plum with Porcelain Input text, semibold Manrope, and 13px vertical / 19px horizontal web padding; horizontal padding reduces to 15px on small screens.
- **Secondary:** Pale lilac porcelain with a quiet border and dark violet text.
- **States:** Primary hover uses `plum-action-hover`; disabled controls lower opacity to 0.48. Web focus uses a visible violet 3px outline with 4px offset.
- **Text / Icon:** Ledger Violet text actions and accessible names on icon controls. Most icon controls use 44px squares; compact line removal is 36px wide on small web screens.

### Chips

Compact pills identify the network or acknowledgement state using written labels. Pending signatures use lilac; acknowledged records use mint. Active screens do not use simulation or fictional-role badges.

### Cards / Containers

Major web surfaces use Porcelain Surface, 16px corners, and Folio Lift. The ruled invoice has 32px desktop padding, reducing to 24px vertically and 20px horizontally on small screens. Native invoice paper uses 20px padding and a hairline boundary. Supporting callouts use quiet lilac or mint fields; rows are divided with hairlines rather than nested cards.

### Inputs / Fields

Fields use Porcelain Input, a one-pixel lilac border, approximately 12–13px corners, and 16px input text. Web fields have a 49px minimum height; native fields use 52px. Native focus strengthens the border without shifting content; web focus keeps the shared visible outline. Place validation copy beside the relevant form and retain labels when placeholders disappear.

### Navigation

The active destinations are **Invoices** and **Wallet**. A quiet lilac selected field accompanies the icon and label. Web exposes the current page semantically; native tabs expose selected state. Creation and detail retain the invoice selection and a clear return action. The bilingual mark and USDC/Solana context remain in the shell.

### Invoice List & Editor

The list combines a clear Create invoice action, All/Issued/Received filters, import, and a true empty state. Each record prioritizes counterparty, reference, explicit USDC amount, due date, network, and acknowledgement status. The generic editor groups business details, repeatable descriptions/quantities/unit prices, a running USDC total, receiving wallet, and optional terms. Create & sign invoice is the form's terminal action.

### Signed Invoice & Counterseal

A ruled porcelain record presents the parties, line items, dominant total, network, due date, terms, and signature evidence. Acknowledgement and encrypted sharing follow the record; payment instructions form a separate section. Copyable fingerprints and expandable technical details support verification without overwhelming the record hierarchy.

### Sharing, Import & Privacy

Use focused dialogs or native sheets with a labelled title, close action, clear primary action, and inline feedback. Web dialogs derive their accessible name from the visible heading. Encrypted export and the separately presented decryption key are distinct actions. Import keeps record input, key input, and verification in a readable sequence. Privacy disclosures use the same typography and spacing as ordinary product content.

### Wallet & Provider Links

Lead with a saved public receiving address and direct USDC funding guidance. Provider information appears as restrained linked rows with an external-link cue, description, and eligibility copy. Keep provider purchase charges, SANAD fees, and SOL network costs visibly distinguishable. Unknown quotes, unconnected balances, and unverified settlement must not receive decorative success treatments.

Reduced-motion web users receive static states with transitions disabled. Preserve native reduced-motion handling in shared components; do not add movement to dense records.

## Do's and Don'ts

### Do:

- **Do** preserve the bilingual SANAD / سند identity, porcelain/plum world, Lora/Manrope pairing, and cropped daylight.
- **Do** reuse the interlaced counterseal geometry and pair state colour with words or icons.
- **Do** keep amounts tabular, aligned, and explicitly labelled USDC.
- **Do** keep uncertainty and provider charges beside the funding or payment action they qualify.
- **Do** make empty, loading, error, signature, and acknowledgement states readable without colour alone.
- **Do** keep encryption-key handling and record sharing visibly separate.

### Don't:

- **Don't** reintroduce fictional participants, category-specific invoice fields, or Chat/Finance navigation as design requirements.
- **Don't** introduce unrelated KPI tiles or invented destinations.
- **Don't** place ornamental geometry behind dense financial or technical copy or rasterize core interface elements.
- **Don't** use a signature or counterseal as evidence of verified identity, wallet ownership, or payment settlement.
- **Don't** depict provider information links as integrated checkout, quote comparison, or guaranteed availability.
- **Don't** replace an unknown network cost with false precision or a zero-cost success claim.
- **Don't** use the smallest metadata sizes for primary actions or reading-heavy content.
