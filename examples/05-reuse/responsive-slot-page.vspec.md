---
id: SCR-RESPONSIVE-SLOT-PAGE
type: screen
title: Responsive Slot Page
locale: en
template:
  id: TPL-RESPONSIVE-SHELL
  src: ./responsive-template-shell.vspec.md
---

# SCR-RESPONSIVE-SLOT-PAGE Responsive Slot Page

This example teaches viewport-specific slot content. The neutral `## Slot:
content` entry is used by mobile, while `## Slot: content: desktop` overrides it
for the desktop template viewport.

## States

- idle*

## Slot: content

### L-AccountContent Mobile account content

- stack
- gap: sm

#### Items

- E-MobileTitle
- E-MobileSummary

## Slot: content: desktop

### L-AccountContent Desktop account content

- stack
- gap: md

#### Items

- E-DesktopTitle
- E-DesktopSummary
- E-DesktopAction

## Elements

### 1:E-MobileTitle Heading

- level: 1
- label: Mobile overview

### 2:E-MobileSummary Paragraph

- text: Compact account summary for the mobile shell.

### 3:E-DesktopTitle Heading

- level: 1
- label: Desktop overview

### 4:E-DesktopSummary Paragraph

- text: Wider account summary for the desktop shell.

### 5:E-DesktopAction Button

- label: Open settings
