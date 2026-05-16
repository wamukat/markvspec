---
id: SCR-EVENT-TRIGGERS
type: screen
title: Event Triggers
route: /preferences/events
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-EVENT-TRIGGERS Event Triggers

This example teaches non-click element events and the common lifecycle triggers
used around a form-like preferences screen.

## States

- loading*
  - The screen is requesting saved preferences.
- editing
  - Preferences are editable.
- saving
  - The save request was sent and the screen is waiting for the response.
- saved
  - Preferences were saved.
- load-error
  - Saved preferences could not be loaded.
- save-error
  - Preferences could not be sent or saved.

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
- E-SavedBanner
- E-LoadErrorBanner
- E-SaveErrorBanner

### L3:L-PreferencesForm Preferences form

- stack
- gap: sm
- disabled when: loading
- disabled when: saving

#### Items

- E-PreferencesForm
- "Search keyword": E-SearchInput
- "Notification email*": E-EmailInput
- "Delivery cadence": E-DeliverySelect
- E-HelpIcon
- L-Actions

### L4:L-Actions Actions

- row
- gap: sm

#### Items

- E-SaveButton
- E-DiscardButton

## Elements

### 1:E-Title Heading

- level: 1
- label: Notification preferences

### 2:E-LoadingBanner Banner

- tone: info
- sample: Loading saved preferences.
- visible when: loading

### 3:E-HelpText Text

- sample: Delivery cadence controls how often notification digests are sent.

### 4:E-ValidationBanner Banner

- tone: danger
- sample: Enter a valid notification email before saving.

### 5:E-SavedBanner Banner

- tone: success
- sample: Preferences were saved.
- visible when: saved

### 6:E-LoadErrorBanner Banner

- tone: danger
- sample: Saved preferences could not be loaded.
- visible when: load-error

### 7:E-SaveErrorBanner Banner

- tone: danger
- sample: Preferences could not be saved.
- visible when: save-error

### 8:E-PreferencesForm custom:Form

- label: Preferences form
- purpose: Browser form submit boundary for the preferences fields.
- action: A-SubmitPreferences

### 9:E-SearchInput Input

- label: Search keyword
- value: ${model.keyword}
- initial value: system alerts
- placeholder: notification keyword
- width: medium

### 10:E-EmailInput Input*

- label: Notification email
- type: email
- value: ${model.email}
- initial value: member@example.com
- placeholder: member@example.com
- width: long

### 11:E-DeliverySelect Select

- label: Delivery cadence
- value: ${model.deliveryCadence}
- initial value: Daily
- width: medium
- options:
  - Immediate
  - Daily
  - Weekly

### 12:E-HelpIcon Icon

- label: Delivery help
- name: circle-help

### 13:E-SaveButton Button

- label: Save preferences
- variant: primary
- action: A-SubmitPreferences

### 14:E-DiscardButton Button

- label: Discard changes
- variant: secondary
- action: A-RequestDiscardDialog

### 15:E-ConfirmDialog Dialog

- title: Discard changes?
- content: Closing this dialog keeps the current edits on the page.

## Form Groups

### F-PreferencesForm Preferences form

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
  - loading
- Process P1: Call server service
  - server:
    - PreferencesQueryService.findSaved()
  - result:
    - saved preferences load result
  - case: success
    - response: 200 saved preferences
    - Effects
      - model: ${model.keyword} = result.keyword
      - model: ${model.email} = result.email
      - model: ${model.deliveryCadence} = result.deliveryCadence
      - state: editing
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error

### A2:A-UpdateKeyword Update keyword

- Triggered
  - E-SearchInput.change
- From
  - editing
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - state: editing

### A3:A-ValidateEmail Validate email on blur

- Triggered
  - E-EmailInput.blur
- From
  - editing
- Process P1: Check validation
  - receive:
    - validation: V-PreferencesForm.result
  - case: invalid
    - result: email is empty or malformed
    - Effects
      - display:
        - target: E-ValidationBanner
        - content: Enter a valid notification email before saving.
      - stop
  - case: valid
    - result: email is valid
    - Effects
      - state: editing
      - stop

### A4:A-ShowDeliveryHelp Show delivery help

- Triggered
  - E-HelpIcon.focus
- From
  - editing
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - target: E-HelpText
        - content: Delivery cadence controls how often notification digests are sent.
      - stop

### A5:A-RequestDiscardDialog Request discard dialog

- Triggered
  - E-DiscardButton.click
- From
  - editing
  - save-error
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - target: E-ConfirmDialog
        - content: Discard changes confirmation dialog
      - stop

### A6:A-CloseDiscardDialog Close discard dialog

- Triggered
  - E-ConfirmDialog.close
- From
  - editing
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - target: E-ConfirmDialog
        - content: Dialog is dismissed
      - stop

### A7:A-SubmitPreferences Submit preferences

- Triggered
  - E-PreferencesForm.submit
- From
  - editing
  - save-error
- Process P1: Check validation
  - receive:
    - validation: V-PreferencesForm.result
  - case: invalid
    - result: required field missing or invalid
    - Effects
      - display:
        - target: E-ValidationBanner
        - content: Enter a valid notification email before saving.
      - stop
  - case: valid
    - result: form fields are valid
    - Effects
      - continue
- Process P2: Submit preferences
  - server:
    - PreferencesCommandService.save()
    - params:
      - keyword: E-SearchInput.value
      - email: E-EmailInput.value
      - deliveryCadence: E-DeliverySelect.value
  - result:
    - preferences save request
  - case: sent
    - Effects
      - state: saving
  - case: send-failed
    - Effects
      - state: save-error

### A8:A-HandleSaveResponse Handle save response

- Triggered
  - A-SubmitPreferences.P2.response
- From
  - saving
- Process P1: Handle server response
  - receive:
    - response: A-SubmitPreferences.P2.response
  - case: success
    - response: 200 saved preferences
    - Effects
      - state: saved
  - case: failure
    - response: 4xx or 5xx
    - Effects
      - state: save-error

## Preview Scenarios

### editing-help

- state: editing
- before: saving
- cases:
  - A-ShowDeliveryHelp.P1.done

### editing-validation-error

- state: editing
- before: saving
- cases:
  - A-ValidateEmail.P1.invalid

### editing-confirm-discard

- state: editing
- before: saved
- cases:
  - A-RequestDiscardDialog.P1.done

## Validations

### V-PreferencesForm Required preference fields

- target: F-PreferencesForm
- rules:
  - required:
    - E-EmailInput
  - email:
    - E-EmailInput
- scope: composite
- run: client
- message: Notification email is required and must be an email address.

## Business Rules

### R-PREF-001

- Do not submit preferences while the email field is empty or malformed.
- Treat `sent` as the successful start of a save request, not as a completed save.
