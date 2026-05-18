---
id: SCR-ACTION-MENU
type: screen
title: Action Menu
route: /accounts/actions
locale: en
---

# SCR-ACTION-MENU Action Menu

Focused example for the `ActionMenu` Element. It keeps the screen small so the
menu trigger, open overlay, item actions, disabled condition, and danger tone are
easy to review without introducing a generic navigation menu.

## States

- idle*

## Layout: desktop

### L-Page Account actions page

- stack
- gap: md

#### Items

- E-PageTitle
- E-AccountName
- E-RowActions

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Account actions

### 2:E-AccountName Text

- label: Account
- value: Morgan Lee

### 3:E-RowActions ActionMenu

- label: More actions
- placement: bottom-end
- open: true
- items:
  - Edit
    - action: A-EditAccount
  - Disable
    - action: A-DisableAccount
    - tone: danger
    - disabled when: selected-row-locked

## Actions

### A-EditAccount Edit account

- From
  - idle

### A-DisableAccount Disable account

- From
  - idle
