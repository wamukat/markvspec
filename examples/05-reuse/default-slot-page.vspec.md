---
id: SCR-DEFAULT-SLOT-PAGE
type: screen
title: Default Slot Page
locale: en
template:
  id: TPL-MYPAGE-SHELL
  src: ./template-shell.vspec.md
---

# SCR-DEFAULT-SLOT-PAGE Default Slot Page

This example teaches template slot default fallback. The screen intentionally
does not provide `## Slot: content`, so preview renders the template-owned
`default: E-EmptySlotMessage` content from the slot contract.

## States

- idle*
