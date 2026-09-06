---
name: SANAD / سند
description: A Mashrabiya-daylight ledger that turns one invoice conversation into a clear bilateral agreement.
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
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Lora, Georgia, serif"
    fontSize: "26px"
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
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
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
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    height: "52px"
  button-secondary:
    backgroundColor: "#f8f4fa"
    textColor: "#4b3b67"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    height: "52px"
  text-field:
    backgroundColor: "{colors.porcelain-input}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 10px"
    height: "49px"
  finance-folio:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.panel}"
    padding: "24px 19px 20px"
  invoice-hinge:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.panel}"
    padding: "9px"
  route-option:
    backgroundColor: "{colors.porcelain-input}"
    textColor: "{colors.plum-ink}"
    rounded: "15px"
    padding: "15px 13px"
  nav-active:
    backgroundColor: "#efe8ff"
    textColor: "{colors.plum-ink}"
    rounded: "14px"
---

# Design System: SANAD / سند

## Overview

**Creative North Star: "Mashrabiya Daylight Ledger"**

SANAD feels like a bilateral trade record laid on a porcelain field beneath cropped Mashrabiya daylight. Plum ink provides seriousness without resembling a bank dashboard; lilac, mint, and pink appear as restrained state light. The bilingual SANAD / سند identity and the interlaced Arabic counterseal make the system recognisable before any account chrome could.

The interface stays calm until a consequential object needs attention. The invoice and its Finance action form one luminous two-part hinge, while the Finance folio turns comparison, agreement, signature, and verification into one continuous record. Dense financial information remains semantic, selectable, and legible; decorative geometry never sits behind it.

**Key Characteristics:**

- Porcelain fields under cropped geometric daylight.
- Plum ink with lilac, mint, and pink state bands.
- Lora-led records paired with highly legible Manrope controls.
- A shared eight-point counterseal that resolves from open to aligned to closed.
- One dominant invoice hinge connecting conversation to the cost decision.

## Colors

Porcelain neutrals hold the reading surface, plum establishes authority, and the three state hues behave like transmitted light rather than decoration.

### Primary

- **Action Plum** (`plum-action`): Primary workflow buttons, the send control, and the darkest brand anchors.
- **Plum Ink** (`plum-ink`): Default text, financial figures, and high-importance labels.
- **Ledger Violet** (`plum-link`): Text actions, selected controls, and navigational emphasis.

### Secondary

- **Compare Lilac** (`state-lilac`): The Compare phase, open counterseal context, and the first edge of luminous bridges.
- **Agreement Mint** (`state-mint`): Resolved fee ownership, agreed states, and the middle of state progressions.
- **Counterseal Pink** (`state-pink`): Signing, sealing, and the terminal edge of luminous bridges.

### Tertiary

- **Incoming Lavender** (`lilac-wash`): Supplier message bubbles and quiet selected surfaces.
- **Outgoing Mint** (`mint-wash`): Buyer message bubbles, resolved callouts, and verified outcomes.
- **Caution Peach** (`warning-wash`): Unresolved recipient deductions and other decision-point uncertainty.
- **Tamper Rose** (`danger`): Validation failures and tamper or error states.

### Neutral

- **Porcelain Ground** (`porcelain-ground`): The application canvas beneath daylight.
- **Porcelain Surface** (`porcelain-surface`): Chat headers, the Finance folio, dialogs, and lifted records.
- **Porcelain Input** (`porcelain-input`): Inputs and route rows that need a crisp white reading field.
- **Lilac Hairline** (`hairline`): Structural separators and quiet container edges.
- **Muted Ink** (`muted-ink`): Supporting copy, timestamps, disclosures, and non-primary labels.

**The State-Light Rule.** Lilac means Compare, mint means Agree or resolved, and pink means Sign or sealed; every state also carries text, an icon, or counterseal geometry.

**The Porcelain Rule.** Preserve warm near-white layering. Do not substitute cool grey dashboard panels or large saturated fills.

## Typography

**Display Font:** Lora (with Georgia and serif fallbacks)  
**Body Font:** Manrope (with sans-serif fallback)  
**Label/Mono Font:** Manrope for labels; Menlo or platform monospace for fingerprints and record IDs.

**Character:** Lora makes invoices, Finance headings, signatures, and agreement titles feel authored and durable. Manrope keeps controls, explanations, and dense arithmetic direct; the contrast is editorial rather than ornamental.

### Hierarchy

- **Display** (regular, 34px, 1.2): Screen-level Finance titles; expands to 38px on desktop web.
- **Headline** (regular, 26px, 1.4): Agreement goods, sheet titles, and signed names where a record voice is needed.
- **Title** (semibold, 21px, 1.4): Decision questions and primary section headings; may reach 23px in expanded layouts.
- **Body** (regular, 15px, 1.7): Conversation and ordinary reading copy.
- **Label** (semibold, 12px, 1.6): Field labels, route metadata, and compact workflow copy.
- **Mono** (regular, 10px, 1.8): Content fingerprints and machine identifiers only.

**The Financial-Figure Rule.** Amounts use tabular numerals and stay visually aligned; currency context never relies on position alone.

**The Record-Voice Rule.** Reserve Lora for identity, invoices, Finance, signatures, and agreement artifacts. Controls and explanatory prose remain Manrope.

## Layout

The base spatial model is one mobile task at a time. Chat opens first and owns the available dynamic viewport: a framed conversation scrolls between its header and the fixed invoice/composer zone. Finance is a separate vertical folio, not a panel beside Chat. Both web and native keep the Chat → Finance → agreement/signature/verification sequence intact.

The mobile rhythm starts with 14–18px edge insets and the 4/8/16/24 spacing scale. The invoice hinge sits directly above the composer, with a dominant amount and a minimum 54–56px action band. Finance stacks route rows and aligns their figures; disclosure keeps arithmetic available without crowding the initial decision.

At 520px on web, outer spacing opens, the agreement grid becomes two columns, and financial rows gain room without changing screen structure. At 960px, a 240px porcelain navigation rail replaces the 76px bottom navigation. The Chat surface remains centered at a maximum width of 860px and Finance at 850px. Native retains bottom navigation and safe-area insets.

**The One-Task Rule.** Chat and Finance are never shown side by side. Their shared state and the luminous invoice hinge provide continuity.

## Elevation & Depth

The system uses a restrained hybrid of tonal layering and low-chroma plum shadows. Most hierarchy comes from translucent porcelain over the daylight field; shadows lift only the conversation frame, invoice hinge, Finance folio, dialogs, and transient feedback. The Mashrabiya raster is cropped from the upper field at 0.68 opacity on web and 0.66 on native, then allowed to recede beneath solid reading surfaces.

### Shadow Vocabulary

- **Quiet Surface** (`0 13px 35px #4432500c`): Chat and linked-record headers.
- **Hinge Lift** (`0 18px 42px #35234218`): The two-part invoice hinge only.
- **Folio Lift** (`0 22px 56px #33213f14`): The continuous Finance decision surface.
- **Focused Dialog** (`0 28px 90px #23172f38`): Modal tasks and verification sheets.
- **Transient Toast** (`0 18px 42px #291d4030`): Short-lived confirmations above navigation.

**The Light-Before-Shadow Rule.** Establish depth with daylight, surface opacity, and tonal contrast first. Use the shadow vocabulary only for functional separation.

## Shapes

The prevailing silhouette is a softly faceted rectangle: 13px controls inside 16px panels. Message bubbles keep 15px outer corners but clip the sender-facing top corner to 3px. Avatars are slightly rotated rounded squares rather than generic circles; pills remain reserved for tiny status tags. Hairlines are pale lilac and usually one pixel.

The counterseal is an interlaced eight-point line mark. Open uses broken strokes, aligned uses longer joined strokes, and closed uses continuous geometry with full central opacity. The same paths and state order recur in Chat, Finance progress, agreement state, and primary actions.

**The Counterseal Rule.** Never redraw the three seal states as unrelated icons. State changes are expressed by stroke rhythm, lilac → mint → pink color, and a written label.

## Components

### Buttons

- **Shape:** Softly faceted controls (13–14px radius) with a 52px minimum primary/secondary height and 44px minimum touch targets elsewhere.
- **Primary:** Action Plum with Porcelain Input text, semibold Manrope, 12px vertical and 15px horizontal padding. Hover shifts to `plum-action-hover`; disabled state lowers opacity to 0.48.
- **Secondary:** A pale lilac porcelain field with a quiet lilac border and dark violet text.
- **Focus:** Web focus uses a visible violet 3px outline with 4px offset; native preserves platform press feedback and accessibility state.
- **Text / Icon:** Text actions use Ledger Violet. Icon-only buttons are 44px squares and gain a quiet lilac hover or pressed field.

### Chips

- **Style:** Compact pills identify simulation, lowest estimate, prototype state, or verification status; they use text plus color.
- **State:** Mint denotes a favourable or resolved status, pink marks simulation or sealing, and lilac marks neutral prototype metadata.

### Cards / Containers

- **Corner Style:** Major surfaces use the 16px panel radius; nested callouts and quote options use 13–15px.
- **Background:** Porcelain Surface for framing and Porcelain Input for selectable rows.
- **Shadow Strategy:** Apply only Quiet Surface, Hinge Lift, or Folio Lift according to the component’s job.
- **Border:** Use a one-pixel lilac hairline when an edge must remain visible over daylight.
- **Internal Padding:** Compact mobile cards use 13–19px; primary folios use roughly 19–27px depending on width.

### Inputs / Fields

- **Style:** Porcelain Input, a one-pixel lilac border, 13px corners, 16px input text, and a 49px minimum height.
- **Focus:** Keep the field surface stable and add the system focus ring; never rely on a subtle border-color change alone.
- **Disabled / Error:** Disabled controls use 0.48–0.6 opacity. Error copy and surfaces use Tamper Rose with a pale rose field.

### Navigation

Navigation contains exactly Chat and Finance. On mobile it is a two-item bottom bar with 58px targets and a softly faceted lilac–mint selected field; on desktop web it becomes a 240px porcelain rail. Pending agreement state may add a small pink dot, but the destination and current state remain text-labelled.

### Invoice Hinge

The signature component is one framed object with two inseparable regions: an invoice summary above and a luminous Finance action below. The invoice amount is 25–31px, tabular, and the dominant object in Chat. The action band moves lilac → mint → pink and carries the same open/aligned/closed counterseal state as the invoice summary.

### Route Options

Routes remain full-width stacked radio rows. Each aligns provider name, estimate, currency, route metadata, and state. The selected row combines a violet border, pale lilac field, radio mark, and check; “Lowest estimate” and “Simulation” remain explicit labels.

### Agreement & Counterseal

The Finance folio does not change visual worlds when an agreement is created. It turns the same surface into a ruled record with terms, two signature slots, and a fingerprint strip. The counterseal advances open → aligned → closed as the agreement becomes reviewable and then sealed. Reduced-motion users receive the resolved state without drift or reveal animation.

## Do's and Don'ts

### Do:

- **Do** preserve the bilingual SANAD / سند identity in plum ink.
- **Do** keep the invoice summary and Finance action fused as one luminous hinge.
- **Do** reuse the exact interlaced counterseal geometry for open, aligned, and closed states.
- **Do** keep money columns tabular, aligned, and explicitly labelled with currency.
- **Do** place synthetic-data, estimate, and uncertainty labels beside the decision they qualify.
- **Do** keep Chat and Finance separate while preserving shared deal state.
- **Do** use text and iconography in addition to lilac, mint, or pink state color.

### Don't:

- **Don't** introduce account-dashboard chrome, KPI tiles, or a sidebar full of invented destinations.
- **Don't** place ornamental geometry behind dense financial or legal copy.
- **Don't** rasterize core interface elements; only the daylight atmosphere is a raster asset.
- **Don't** imply that a digital-dollar route avoids CAD/EUR conversion or that sample quotes are live.
- **Don't** imply that cryptographic signing proves identity, legal enforceability, payment, or provider safety.
- **Don't** replace an unknown fee range with a decorative success state or false precision.
- **Don't** use the smallest metadata sizes for primary actions or reading-heavy content.
