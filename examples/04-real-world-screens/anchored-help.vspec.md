---
id: SCR-ANCHORED-HELP
type: screen
title: Anchored Help
route: /settings/security
locale: en
---

# SCR-ANCHORED-HELP Anchored Help

Focused example for `Popover` and `Tooltip` Elements. It shows anchor element
references, placement, static tooltip text, and a visible popover state without
modeling hover, focus, or interactive popover controls.

## States

- idle*
- help-open

## Layout: desktop

### L1:L-SecurityForm Security form

- stack
- gap: sm

#### Items

- E-PasswordLabel
- E-PasswordInput
- E-PasswordHint
- E-PasswordHelpButton
- E-PasswordHelp

## Elements

### 1:E-PasswordLabel Text

- text: Password

### 2:E-PasswordInput Input

- type: password
- placeholder: New password

### 3:E-PasswordHint Tooltip

- anchor: E-PasswordInput
- placement: top
- text: Use at least 12 characters.

### 4:E-PasswordHelpButton Button

- label: Password help
- action: A-OpenPasswordHelp

### 5:E-PasswordHelp Popover

- anchor: E-PasswordHelpButton
- placement: bottom-start
- text: Password must be at least 12 characters and include a number.
- visible when: help-open

## Actions

### A1:A-OpenPasswordHelp Open password help

- From
  - idle
- Process P1: Immediate
  - state: help-open
