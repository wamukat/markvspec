---
id: SCR-DISPLAY-EFFECTS
type: screen
title: Display Updates
route: /display-effects
locale: en
---

# SCR-DISPLAY-EFFECTS Display Updates

This example teaches the core `display:` effect shapes in one small screen. Read
the Preview Scenarios to compare layout-level element insertion, field-level
validation text, business-rule message text, targetless dialog display, and
targetless toast display; request/response details, navigation, and rich form
behavior are intentionally excluded.

## States

- idle*

## Layout: desktop

### L1:L-Page Display effects page

- stack
- gap: md

#### Items

- E-Title
- L-Form
- L-MessageArea
- E-SubmitButton
- E-DeleteButton
- E-SaveButton

### L2:L-Form Email form

- stack
- gap: sm

#### Items

- E-EmailInput

### L3:L-MessageArea Message area

- stack
- gap: sm

## Elements

### 1:E-Title Heading

- level: 1
- label: Display effects

### 2:E-EmailInput Input

- label: Email
- type: email
- placeholder: member@example.com
- required: true

### 3:E-SubmitButton Button

- label: Submit
- variant: primary
- action: A-Submit

### 4:E-DeleteButton Button

- label: Delete
- variant: secondary
- tone: danger
- action: A-RequestDelete

### 5:E-SaveButton Button

- label: Save draft
- variant: secondary
- action: A-SaveDraft

### 6:E-FormBanner Banner

- tone: warning
- text: Check the highlighted fields before submitting.

### 7:E-DeleteDialog Dialog

- title: Delete draft?
- message: This targetless dialog is displayed without replacing a layout.
- tone: danger
- actions: E-CancelDeleteButton, E-ConfirmDeleteButton

### 8:E-CancelDeleteButton Button

- label: Cancel
- variant: secondary
- action: A-CloseDeleteDialog

### 9:E-ConfirmDeleteButton Button

- label: Delete
- variant: primary
- tone: danger
- action: A-CloseDeleteDialog

### 10:E-SavedToast Toast

- message: Draft saved.
- tone: success
- placement: top-right
- duration: short

## Form Groups

### F-EmailForm Email form

- marker: F1
- fields:
  - E-EmailInput
- submit: A-Submit

## Actions

### A1:A-Submit Submit form

- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-EmailRequired.result
  - case: invalid
    - description: field validation failed
    - display:
      - target: E-EmailInput.error
      - message: V-EmailRequired.messages
    - stop
  - case: duplicate
    - description: business rule failed after a valid field value
    - display:
      - target: L-MessageArea
      - message: R-EmailMustBeUnique.messages
    - stop
  - case: missing-form-data
    - description: show a rich element in a layout target
    - display:
      - target: L-MessageArea
      - element: E-FormBanner
    - stop

### A2:A-RequestDelete Request delete dialog

- From
  - idle
- Process P1: Show dialog
  - case: done
    - display:
      - element: E-DeleteDialog
    - stop

### A3:A-CloseDeleteDialog Close delete dialog

- From
  - idle
- Process P1: Close dialog
  - case: done
    - state: idle

### A4:A-SaveDraft Save draft

- From
  - idle
- Process P1: Show toast
  - case: saved
    - display:
      - element: E-SavedToast
    - stop

## Preview Scenarios

### idle-field-error

- state: idle
- cases:
  - A-Submit.P1.invalid

### idle-business-message

- state: idle
- cases:
  - A-Submit.P1.duplicate

### idle-layout-element

- state: idle
- cases:
  - A-Submit.P1.missing-form-data

### idle-dialog

- state: idle
- cases:
  - A-RequestDelete.P1.done

### idle-toast

- state: idle
- cases:
  - A-SaveDraft.P1.saved

## Field Validations

### V-EmailRequired Email required

- marker: V1
- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.

## Business Rules

### R-EmailMustBeUnique Email must be unique

- marker: R1
- description: Duplicate email addresses are rejected after the field value is syntactically valid.
- messages:
  - This email address is already registered.

## Notes

- `display.partial` is covered later by `profile-page-with-template` because it needs a partial host and a referenced partial document.
- `toast-feedback` expands the targetless toast pattern with success and failure cases.
