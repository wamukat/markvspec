---
id: SCR-BASIC-SLOT-PAGE
type: screen
title: Basic Slot Page
locale: en
template:
  id: TPL-MYPAGE-SHELL
  src: ./template-shell.vspec.md
---

# SCR-BASIC-SLOT-PAGE Basic Slot Page

This example teaches the smallest screen that fills a template slot. Read the
front matter `template` reference and the viewport-neutral `## Slot: content`
section; the reusable navigation shell is inherited from the template.

## States

- idle*

## Slot: content

### L1:L-BasicSlotContent Basic slot content

- stack
- gap: sm

#### Items

- E-PageTitle
- E-IntroText

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Account overview

### 2:E-IntroText Paragraph

- text: This content is provided by the screen and rendered inside the template content slot.
