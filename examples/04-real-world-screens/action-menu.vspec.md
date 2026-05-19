---
id: SCR-ACTION-MENU
type: screen
title: Action Menu
route: /accounts/actions
locale: en
---

# SCR-ACTION-MENU Action Menu

Focused example for the `ActionMenu` Element. It keeps the screen small so the
menu trigger, open overlay, item actions, disabled condition, and danger tone can
be reviewed in open and locked menu states without introducing a generic menu.

## States

- menu-open*
- menu-open-locked

## Layout: desktop

### L1:L-Page Account actions page

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
- open when: menu-open
- open when: menu-open-locked
- items:
  - Edit
    - action: A-EditAccount
  - Disable
    - action: A-DisableAccount
    - tone: danger
    - disabled when: menu-open-locked

## Actions

### A1:A-EditAccount Edit account

- From
  - menu-open
  - menu-open-locked
- Process P1: Select menu item
  - case: done
    - description: Edit action item is selected from the open action menu.
    - Effects
      - state: menu-open
    - stop

### A2:A-DisableAccount Disable account

- From
  - menu-open
  - menu-open-locked
- Process P1: Select menu item
  - case: blocked
    - description: Disable action is unavailable while the menu is open and the selected row is locked.
    - Effects
      - state: menu-open-locked
    - stop
  - case: done
    - description: Disable action item is selected with danger tone.
    - Effects
      - state: menu-open
    - stop
