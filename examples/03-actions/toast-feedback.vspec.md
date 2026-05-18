---
id: SCR-TOAST-FEEDBACK
type: screen
title: Toast Feedback
route: /settings/toast-feedback
locale: en
---

# SCR-TOAST-FEEDBACK Toast Feedback

This example focuses on non-modal toast feedback. It shows a save action that
keeps the form available while success and error notifications appear in a
toast stack.

## States

- idle*
  - Settings are editable.

## Layout: desktop

### L1:L-Page Settings page

- stack
- gap: md

#### Items

- E-Title
- L-SettingsForm

### L2:L-SettingsForm Settings form

- stack
- gap: sm

#### Items

- "Display name": E-DisplayNameInput
- E-SaveButton

## Elements

### 1:E-Title Heading

- level: 1
- label: Notification settings

### 2:E-DisplayNameInput Input

- label: Display name
- value: E-DisplayNameInput.value
- placeholder: Taylor Stone
- width: medium

### 3:E-SaveButton Button

- label: Save settings
- variant: primary
- action: A-SaveSettings

### 4:E-SavedToast Toast

- message: Settings saved.
- tone: success
- placement: top-right
- duration: short

### 5:E-SyncQueuedToast Toast

- message: Sync queued for background processing.
- tone: info
- placement: top-right
- duration: medium

### 6:E-SaveFailedToast Toast

- message: Settings could not be saved.
- tone: danger
- placement: top-right
- duration: long

## Actions

### A1:A-SaveSettings Save settings

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Save settings
  - server:
    - SettingsService.save()
    - params:
      - displayName: E-DisplayNameInput.value
  - result:
    - settings save request
  - case: success
    - description: settings saved
    - Effects
      - display:
        - element: E-SavedToast
    - continue
  - case: failure
    - description: save failed
    - Effects
      - error code: ERR-SETTINGS-SAVE-FAILED
      - state: idle
      - display:
        - element: E-SaveFailedToast
    - stop
- Process P2: Queue background sync
  - server:
    - SettingsSyncService.queue()
  - result:
    - settings sync queue request
  - case: queued
    - Effects
      - display:
        - element: E-SyncQueuedToast
    - stop

## Preview Scenarios

### idle-saved-toast

- state: idle
- cases:
  - A-SaveSettings.P1.success

### idle-toast-stack

- state: idle
- cases:
  - A-SaveSettings.P1.success
  - A-SaveSettings.P2.queued

### idle-save-failed-toast

- state: idle
- cases:
  - A-SaveSettings.P1.failure

## Business Rules

### R1:R-SETTINGS-SAVE Save failure feedback

- Save failures must keep the form available and show non-modal feedback.

## Error Codes

### ER1:ERR-SETTINGS-SAVE-FAILED Settings save failed

- business rule: R-SETTINGS-SAVE
- target: E-SaveFailedToast
- message: Settings could not be saved.
- display: toast
