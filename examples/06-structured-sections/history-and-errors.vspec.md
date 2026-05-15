---
id: SCR-ACCOUNT-SETTINGS
type: screen
title: Account Settings
route: /settings/account
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-ACCOUNT-SETTINGS Account Settings

This example teaches structured documentation sections that are easy to miss in
small screens: Error Codes, custom History Fields, and History entries.

## States

- idle*
- validation-error
- save-error
- saved

## Layout: desktop

### L1:L-Page Account settings page

- stack
- gap: md

#### Items

- E-Title
- L-Form
- L-MessageArea

### L2:L-Form Account settings form

- stack
- gap: sm

#### Items

- "Display name": E-DisplayNameInput
- "Notification email": E-EmailInput
- E-SaveButton

### L3:L-MessageArea Message area

- stack
- visible when: validation-error, save-error, saved

#### Items

- E-ValidationMessage
- E-SaveErrorBanner
- E-SavedBanner

## Elements

### 1:E-Title Heading

- level: 1
- value: Account settings

### 2:E-DisplayNameInput Input*

- value: ${model.displayName}
- placeholder: Taylor Stone
- width: medium

### 3:E-EmailInput Input*

- value: ${model.email}
- placeholder: taylor@example.com
- width: long

### 4:E-SaveButton Button

- label: Save
- action: A-SaveAccount

### 5:E-ValidationMessage Text

- sample: Display name and notification email are required.
- visible when: validation-error

### 6:E-SaveErrorBanner Banner

- tone: danger
- sample: Account settings could not be saved.
- visible when: save-error

### 7:E-SavedBanner Banner

- tone: success
- sample: Account settings saved.
- visible when: saved

## Form Groups

### F-AccountSettings Account settings form

- fields:
  - E-DisplayNameInput
  - E-EmailInput
- submit: A-SaveAccount

## Actions

### A1:A-SaveAccount Save account settings

This action shows how a validation error code and a server error code can be
referenced from the same flow.

- Triggered
  - E-SaveButton.click
- From
  - idle
  - validation-error
  - save-error
  - saved
- Process
  - Validate
    - cases:
      - invalid:
        - response: required field missing
        - error code: ERR-ACCOUNT-REQUIRED
        - state: validation-error
        - stop
      - valid:
        - response: all required fields are present
        - continue
  - ServerCall
    - AccountSettingsService.save()
      - displayName: E-DisplayNameInput.value
      - email: E-EmailInput.value
    - cases:
      - sent:
        - state: idle
      - send-failed:
        - response: network error
        - error code: ERR-ACCOUNT-SAVE-FAILED
        - state: save-error

### A2:A-HandleSaveResponse Handle save response

- Triggered
  - A-SaveAccount.response
- From
  - idle
- Process
  - ServerResponse
    - cases:
      - success:
        - response: 200 saved
        - state: saved
        - stop
      - failure:
        - response: 409 or 5xx
        - error code: ERR-ACCOUNT-SAVE-FAILED
        - state: save-error
        - stop

## Validations

### V-AccountSettings Required account fields

- target: F-AccountSettings
- trigger: A-SaveAccount
- scope: composite
- run: client
- error code: ERR-ACCOUNT-REQUIRED
- message: Display name and notification email are required.

## Business Rules

### R-ACCOUNT-REQUIRED Required account fields

- Display name and notification email must be present before sending the save request.

### R-ACCOUNT-SAVE Save failure handling

- Save failures must keep the entered values visible.
- The page must show an inline recovery message instead of navigating away.

## Error Codes

### ERR-ACCOUNT-REQUIRED Required account fields

- business rule: R-ACCOUNT-REQUIRED
- target: E-ValidationMessage
- message: Display name and notification email are required.
- display: inline

### ERR-ACCOUNT-SAVE-FAILED Save failed

- business rule: R-ACCOUNT-SAVE
- target: E-SaveErrorBanner
- message: Account settings could not be saved.
- display: banner

## History Fields

This document adds release-oriented columns on top of the standard history
fields.

- date
  label: Date
  required: true
  type: date

- author
  label: Author
  required: true
  type: string

- ticket
  label: Ticket
  required: false
  type: string

- approvedBy
  label: Approved By
  required: false
  type: string

## History

The History section is rendered as structured revision history while keeping the
body text as normal Markdown.

### 0.1

- date: 2026-05-10
- author: Docs Team
- reviewer: Product Owner
- ticket: DOC-101
- approvedBy: Product Owner
- reason: Initial account settings specification.

Initial version with required fields, validation, and save failure behavior.

- Added structured Error Codes.
- Added account save response handling.

### 0.2

- date: 2026-05-15
- author: Docs Team
- reviewer: QA Lead
- ticket: DOC-118
- approvedBy: QA Lead
- reason: Added release review metadata.

Added custom History Fields so release reviewers can track ticket and approval
metadata inside the generated design document.
