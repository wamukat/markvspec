---
id: SCR-ANCHORED-HELP
type: screen
title: Anchored Help
route: /settings/security
locale: en
---

# SCR-ANCHORED-HELP Anchored Help

Focused example for `Popover` and `Tooltip` Elements. It shows anchored
non-modal help without modeling hover, focus, or interactive popover controls.

## States

- idle*
- help-open

## Layout: desktop

### L-SecurityForm Security form

- stack
- gap: sm

#### Items

- E-PasswordLabel
- E-PasswordInput
- E-PasswordHint
- E-PasswordHelpButton
- E-PasswordHelp

## Elements

### E-PasswordLabel Text

- text: Password

### E-PasswordInput Input

- type: password
- placeholder: New password

### E-PasswordHint Tooltip

- anchor: E-PasswordInput
- placement: top
- text: Use at least 12 characters.

### E-PasswordHelpButton Button

- label: Password help
- action: A-OpenPasswordHelp

### E-PasswordHelp Popover

- anchor: E-PasswordHelpButton
- placement: bottom-start
- text: Password must be at least 12 characters and include a number.
- visible when: help-open

## Actions

### A-OpenPasswordHelp Open password help

- From
  - idle
- Process P1: Immediate
  - Effects
    - state: help-open
