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
- Process: Validate
  - case: invalid
    - response: required field missing
    - state: validation-error
    - stop
    - update:
      - target: L-MessageArea
      - mode: replace
      - content: Validation message
  - case: valid
    - response: all required fields are valid
    - continue
- Process: ModelUpdate
  - Effects
    - model: ${model.email} = E-EmailInput.value
    - model: ${model.plan} = E-PlanSelect.value
- Process: ServerCall
  - SubscriptionService.create()
    - email: ${model.email}
    - plan: ${model.plan}
  - case: sent
    - state: submitting
  - case: send-failed
    - state: submit-error

### A2:A-HandleSubmitResponse Handle submit response

- Triggered
  - A-SubmitRequest.response
- From
  - submitting
- Process: ServerResponse
  - case: success
    - response: 201 created
    - navigate: SCR-THANK-YOU
  - case: failure
    - response: 4xx or 5xx
    - state: submit-error
