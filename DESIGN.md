---
name: SANAD
description: Separate mobile conversation and finance screens for one clear trade decision.
colors:
  forest: "#183e38"
  ink: "#263e38"
  canvas: "#f5f5ef"
  paper: "#fffefa"
  muted: "#5f6f63"
  line: "#dde3d5"
  warning: "#fff0df"
  pale: "#eef2e7"
typography:
  display:
    fontFamily: "Lora, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  control: "9px"
  panel: "12px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 15px"
  workspace-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

## Overview

**Creative North Star: "The importer's correspondence desk"**

A calm daylight interface connects the conversation to its cost decision through two separate screens. Forest actions and paper surfaces preserve the correspondence-desk identity. Mobile navigation anchors the bottom of the screen; the desktop rail serves the same two destinations. The information is the visual content.

**Key Characteristics:** clear figures, familiar conversation, ruled agreement, visible uncertainty.

## Colors

Forest carries primary actions. Ink carries decisions and values. Warm warning surfaces explain uncertain deductions. Pale green signals selection or verified completion. State always has a text label or icon as well as a color.

**The State Rule.** A selected route, a resolved fee question and a verified signature have distinct text, not color alone.

## Typography

Lora introduces Finance and the signed record. The Finance title is 34px on mobile and 38px on desktop; its decision heading is Manrope at 21px, increasing to 23px from 520px. Manrope carries controls and prose. Chat messages are 15px, financial content is generally 13–15px, and auxiliary labels are generally 10–12px. Message and invoice inputs are 16px. Currency values use tabular numerals; hashes use monospace because they are machine identifiers. Compact metadata is not a recommendation for reading-heavy surfaces.

## Layout

The base layout is a single mobile screen. Chat opens first, with a scrollable conversation, linked invoice, and composer above persistent bottom navigation. **Review payment options** opens Finance; the linked conversation and navigation return to Chat. The two screens are never displayed side by side, including on desktop. Deal state survives screen changes.

At 520px, spacing increases and supporting details can use two columns. At 960px, a 220px navigation rail replaces bottom navigation. Finance remains a single sheet with a maximum width of 800px; Chat has a maximum width of 820px. Quote options remain stacked rows at every width, with aligned figures on desktop. Mobile Finance reserves space for navigation and the safe-area inset. Chat uses dynamic viewport height to keep its composer within the available screen.

**The Decision Rule.** Put the consequence, fee owner and action together; extra arithmetic is disclosed through native details elements.

## Elevation & Depth

Work panels use a border and tonal separation. Shadows are reserved for dialogs and transient notices. There is no ornamental glass, texture or simulated physical material.

## Shapes

Panels have softly rounded corners. Controls are smaller rounded rectangles. Circles identify people, radio selection and the seal's check mark. Conversation direction uses asymmetric bubble corners.

## Components

Primary actions use forest backgrounds; secondary controls are outlined. Buttons have a minimum height of 44px; primary and secondary workflow actions are at least 52px. Quote options behave as labeled radio choices and compare bank, specialist and simulated USDC routes. The USDC explanation discloses both currency conversions rather than implying FX avoidance. Native selects choose fee responsibility, details disclose calculations, and native dialogs provide focus management for editing and verification. Every signing action requires a separate checkbox acknowledgement. The seal reveal is a single clip-path transition, disabled under reduced-motion preference.

## Do's and Don'ts

- Do preserve aligned money columns and explicit currency context.
- Do keep synthetic-data labels next to financial choices.
- Do pair verification states with clear written outcomes.
- Do keep Chat and Finance separate and retain the invoice link between them.
- Don't replace uncertainty with decorative success badges.
- Don't imply that a signature verifies a person's legal identity.
- Don't inherit the smallest timestamp or metadata sizes for primary tasks.
