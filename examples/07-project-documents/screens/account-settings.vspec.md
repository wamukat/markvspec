---
id: SCR-ACCOUNT-SETTINGS
type: screen
title: Account Settings
route: /account/settings
locale: en
template:
  id: TPL-ACCOUNT-SHELL
  src: ../templates/account-shell.vspec.md
---

# SCR-ACCOUNT-SETTINGS Account Settings

Settings screen used to make the project transition graph visible.

## States

- idle*
- saving
- saved

## Slot: content

### L1:L-SettingsForm Settings form

- stack
- gap: md

#### Items

- E-EmailInput
- E-NotificationSwitch
- E-SaveButton
- E-BackButton
- E-SavedMessage

## Elements

### 1:E-EmailInput Input

- label: Notification email
- initial value: owner@example.com
- required

### 2:E-NotificationSwitch Switch

- label: Product updates
- initial value: true

### 3:E-SaveButton Button

- label: Save settings
- variant: primary
- action: A-SaveSettings

### 4:E-BackButton Button

- label: Back to dashboard
- action: A-BackToDashboard

### 5:E-SavedMessage Banner

- tone: success
- text: Settings were saved.
- visible when: saved

## Actions

### A1:A-SaveSettings Save settings

- From
  - idle
  - saved
- Process P1: Submit settings
  - request:
    - method: POST
    - path: /account/settings
    - params:
      - email: E-EmailInput.value
      - productUpdates: E-NotificationSwitch.value
  - case: sent
    - state: saving
    - stop
  - case: success
    - description: 2xx saved
    - state: saved
    - stop

### A2:A-BackToDashboard Back to dashboard

- From
  - idle
  - saved
- Process P1: Return to dashboard
  - case: selected
    - navigate: SCR-ACCOUNT-DASHBOARD
    - stop

## History

### v1.0

- date: 2026-05-19
- author: Product
