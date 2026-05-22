---
id: SCR-FORM-SUBMIT-FLOW
type: screen
title: Form Submit Flow
route: /form-submit
locale: en
---

# SCR-FORM-SUBMIT-FLOW Form Submit Flow

This example teaches a submit action lifecycle from validation through server
response. Read `## Form Groups`, validation receive sources, request parameters,
server process details, `stop`/success continuation, and navigation; it does not
try to cover non-submit element events.

## States

- idle*
- submitting

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

- "Email": E-EmailInput
- "Plan": E-PlanSelect
- E-SubmitButton

### L3:L-MessageArea Message area

- stack

## Elements

### 1:E-Title Heading

- level: 1
- label: Submit request

### 2:E-EmailInput Input

- label: Email
- placeholder: user@example.com

### 3:E-PlanSelect Select

- initial value: Standard
- options:
  - Standard
  - Pro
  - Enterprise

### 4:E-SubmitButton Button

- label: Submit
- variant: primary
- action: A-SubmitRequest

### 5:E-SubmitError Banner

- tone: danger
- text: Request could not be submitted.

## Form Groups

### F-SubmitRequest Submit request

- marker: F1
- fields: E-EmailInput, E-PlanSelect

## Actions

### A1:A-SubmitRequest Submit request

- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-SubmitRequest.result
  - case: invalid
    - description: required field missing
    - display:
      - target: E-EmailInput.error
      - message: V-SubmitRequest.messages
    - stop
  - case: valid
    - description: all required fields are valid
    - continue
- Process P2: Submit subscription
  - server:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - result:
    - subscription creation request
  - case: sent
    - state: submitting
  - case: send-failed
    - state: idle
    - display:
      - target: L-MessageArea
      - element: E-SubmitError

### A2:A-HandleSubmitResponse Handle submit response

- From
  - submitting
- Process P1: Handle server response
  - receive:
    - response: A-SubmitRequest.P2.response
  - case: success
    - response: 201 created
    - navigate: SCR-THANK-YOU
  - case: failure
    - response: 4xx or 5xx
    - state: idle
    - display:
      - target: L-MessageArea
      - element: E-SubmitError
  - case: business-rule-violation
    - response: 409 duplicate email
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - state: idle
    - display:
      - target: E-EmailInput.error
      - message: R-EmailMustBeUnique.messages

## Preview Scenarios

### idle-validation-error

- state: idle
- cases:
  - A-SubmitRequest.P1.invalid

### idle-submit-error

- state: idle
- cases:
  - A-SubmitRequest.P2.send-failed

### idle-submit-response-error

- state: idle
- cases:
  - A-HandleSubmitResponse.P1.failure

### idle-duplicate-email

- state: idle
- cases:
  - A-HandleSubmitResponse.P1.business-rule-violation

## Field Validations

### V1:V-SubmitRequest Required subscription email

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required before submitting the subscription request.

## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- description: Subscription email must not already be registered.
- messages:
  - This email address is already registered.

## Error Codes

### ER1:ERR-EMAIL-ALREADY-REGISTERED Email already registered

- business rule: R-EmailMustBeUnique
- target: E-EmailInput.error
- message: This email address is already registered.
- display: inline
