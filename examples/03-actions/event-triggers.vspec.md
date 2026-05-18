---
id: SCR-EVENT-TRIGGERS
type: screen
title: Event Triggers
route: /preferences/events
locale: en
---

# SCR-EVENT-TRIGGERS Event Triggers

This example teaches non-click events and lifecycle triggers around a small
preferences form. Read `screen.load`, `.change`, `.blur`, `.focus`, `.submit`,
dialog click/close actions, and the Preview Scenarios that show display effects
such as unsaved notices, help text, validation feedback, and modal dialogs.

## States

- initializing*
  - The screen is requesting saved preferences.
- idle
  - Preferences are editable.
- initialize-error
  - Saved preferences could not be loaded.

## Layout: desktop

### L1:L-Page Preferences page

- stack
- gap: md

#### Items

- E-Title
- L-StatusArea
- L-PreferencesForm

### L2:L-StatusArea Status area

- stack

#### Items

- E-LoadingBanner
- E-LoadErrorBanner

### L3:L-PreferencesForm Preferences form

- stack
- gap: sm
- disabled when: initializing

#### Items

- E-PreferencesForm
- "Search keyword": E-SearchInput
- "Notification email": E-EmailInput
- "Delivery cadence": E-DeliverySelect
- E-HelpIcon
- L-HelpArea
- L-ValidationArea
- L-Actions

### L4:L-HelpArea Delivery help area

- stack

### L5:L-ValidationArea Validation message area

- stack

### L7:L-Actions Actions

- row
- gap: sm

#### Items

- E-SubmitButton
- E-DiscardButton

## Elements

### 1:E-Title Heading

- level: 1
- label: Notification preferences

### 2:E-LoadingBanner Banner

- tone: info
- text: Loading saved preferences.
- visible when: initializing

### 3:E-HelpText Text

- text: Delivery cadence controls how often notification digests are sent.

### 4:E-ValidationBanner Banner

- tone: danger
- text: Enter a valid notification email before saving.

### 5:E-LoadErrorBanner Banner

- tone: danger
- text: Saved preferences could not be loaded.
- visible when: initialize-error

### 6:E-UnsavedNotice Banner

- tone: info
- text: Preferences have unsaved changes.

### 7:E-PreferencesForm custom:Form

- label: Preferences form
- purpose: Form submit event boundary for the preferences fields.
- action: A-SubmitPreferences

### 8:E-SearchInput Input

- label: Search keyword
- initial value: system alerts
- placeholder: notification keyword
- width: medium

### 9:E-EmailInput Input

- label: Notification email
- type: email
- initial value: member@example.com
- placeholder: member@example.com
- width: long

### 10:E-DeliverySelect Select

- label: Delivery cadence
- initial value: Daily
- width: medium
- options:
  - Immediate
  - Daily
  - Weekly

### 11:E-HelpIcon Icon

- label: Delivery help
- name: circle-help

### 12:E-SubmitButton Button

- label: Submit preferences
- variant: primary
- action: A-SubmitPreferences

### 13:E-DiscardButton Button

- label: Discard changes
- variant: secondary
- action: A-RequestDiscardDialog

### 14:E-ConfirmDialog Dialog

- title: Discard changes?
- message: Closing this dialog keeps the current edits on the page.
- tone: warning
- actions: E-CancelDiscardButton, E-ConfirmDiscardButton

### 15:E-CancelDiscardButton Button

- label: Keep editing
- variant: secondary
- action: A-CloseDiscardDialog

### 16:E-ConfirmDiscardButton Button

- label: Discard changes
- variant: primary
- tone: danger
- action: A-ConfirmDiscard

## Form Groups

### F-PreferencesForm Preferences form

- marker: F1
- fields:
  - E-SearchInput
  - E-EmailInput
  - E-DeliverySelect
- submit: A-SubmitPreferences

## Actions

### A1:A-LoadPreferences Load saved preferences

- Triggered
  - screen.load
- From
  - initializing
- Process P1: Call server service
  - server:
    - PreferencesQueryService.findSaved()
  - result:
    - saved preferences load result
  - case: success
    - description: 200 saved preferences
    - Effects
      - state: idle
  - case: failure
    - description: 5xx or timeout
    - Effects
      - state: initialize-error

### A2:A-MarkPreferencesChanged Mark preferences changed

- Triggered
  - E-SearchInput.change
- From
  - idle
- Process P1: Mark changed
  - case: done
    - Effects
      - display:
        - target: L-StatusArea
        - element: E-UnsavedNotice
    - stop

### A3:A-ValidateEmail Validate email on blur

- Triggered
  - E-EmailInput.blur
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-PreferencesForm.result
  - case: invalid
    - description: email is empty or malformed
    - Effects
      - display:
        - target: L-ValidationArea
        - element: E-ValidationBanner
    - stop
  - case: valid
    - description: email is valid
    - Effects
      - state: idle
    - stop

### A4:A-ShowDeliveryHelp Show delivery help

- Triggered
  - E-HelpIcon.focus
- From
  - idle
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - target: L-HelpArea
        - element: E-HelpText
    - stop

### A5:A-RequestDiscardDialog Request discard dialog

- Triggered
  - E-DiscardButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - element: E-ConfirmDialog
    - stop

### A6:A-CloseDiscardDialog Close discard dialog

- Triggered
  - E-CancelDiscardButton.click
  - E-ConfirmDialog.close
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

### A7:A-ConfirmDiscard Confirm discard

- Triggered
  - E-ConfirmDiscardButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

### A8:A-SubmitPreferences Submit preferences

- Triggered
  - E-PreferencesForm.submit
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-PreferencesForm.result
  - case: invalid
    - description: required field missing or invalid
    - Effects
      - display:
        - target: L-ValidationArea
        - element: E-ValidationBanner
    - stop
  - case: valid
    - description: form fields are valid
    - Effects
      - state: idle
    - stop

## Preview Scenarios

### idle-unsaved

- state: idle
- cases:
  - A-MarkPreferencesChanged.P1.done

### idle-help

- state: idle
- cases:
  - A-ShowDeliveryHelp.P1.done

### idle-validation-error

- state: idle
- cases:
  - A-ValidateEmail.P1.invalid

### idle-confirm-discard

- state: idle
- cases:
  - A-RequestDiscardDialog.P1.done

## Cross-field Validations

### V-PreferencesForm Required preference fields

- marker: V1
- target: F-PreferencesForm
- inputs:
  - E-EmailInput
- check: notification email is present and uses a valid email format
- message: Notification email is required and must be an email address.
