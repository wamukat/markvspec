---
id: SCR-FORM-SUBMIT-FLOW
type: screen
title: Form Submit Flow
route: /form-submit
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-FORM-SUBMIT-FLOW Form Submit Flow

This example teaches an action that validates input, updates the model, calls a
server, and navigates only after a successful response.

## States

- idle*
- validation-error
- submitting
- submit-error

## Layout: desktop

### L1:L-Page Submit flow page

- stack
- gap: md

#### Items

- E-Title
- L-Form
- L-MessageArea

### L2:L-Form Form

- stack
- gap: sm
- disabled when: submitting

#### Items

- "Email*": E-EmailInput
- "Plan": E-PlanSelect
- E-SubmitButton

### L3:L-MessageArea Message area

- stack

#### Items

- E-ValidationMessage
- E-SubmitError

## Elements

### 1:E-Title Heading

- level: 1
- label: Submit request

### 2:E-EmailInput Input*

- label: Email
- value: ${model.email}
- placeholder: user@example.com

### 3:E-PlanSelect Select

- value: ${model.plan}
- initial value: Standard
- options:
  - Standard
  - Pro
  - Enterprise

### 4:E-SubmitButton Button

- label: Submit
- variant: primary
- action: A-SubmitRequest

### 5:E-ValidationMessage Text

- tone: danger
- value: Email is required.
- visible when: validation-error

### 6:E-SubmitError Banner

- tone: danger
- sample: Request could not be submitted.
- visible when: submit-error

## Form Groups

### F-SubmitRequest Submit request

- fields: E-EmailInput, E-PlanSelect

## Actions

### A1:A-SubmitRequest Submit request

- Triggered
  - E-SubmitButton.click
- From
  - idle
  - validation-error
  - submit-error
- Process P1: Check validation
  - receive:
    - validation: V-SubmitRequest.result
  - case: invalid
    - description: required field missing
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage
    - stop
  - case: valid
    - description: all required fields are valid
    - continue
- Process P2: Submit subscription
  - sync:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - result:
    - subscription creation request
  - case: sent
    - Effects
      - state: submitting
  - case: send-failed
    - Effects
      - state: submit-error

### A2:A-HandleSubmitResponse Handle submit response

- Triggered
  - A-SubmitRequest.P2.response
- From
  - submitting
- Process P1: Handle server response
  - receive:
    - response: A-SubmitRequest.P2.response
  - case: success
    - response: 201 created
    - Effects
      - navigate: SCR-THANK-YOU
  - case: failure
    - response: 4xx or 5xx
    - Effects
      - state: submit-error

## Validations

### V-SubmitRequest Required subscription email

- target: E-EmailInput
- rules:
  - required:
    - E-EmailInput
- scope: field
- run: client
- message: Email is required before submitting the subscription request.
