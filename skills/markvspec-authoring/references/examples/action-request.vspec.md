---
id: SCR-ACTION-REQUEST
type: screen
title: Action Request
route: /action-request
locale: en
---

# SCR-ACTION-REQUEST Action Request

## States

- idle*
- submitting
- submit-error

## Layout: desktop

### L1:L-Page Request page

- stack
- gap: md

#### Items

- E-Title
- L-Form
- L-MessageArea

### L2:L-Form Request form

- stack
- gap: sm
- disabled when: submitting

#### Items

- "Email": E-EmailInput
- E-SubmitButton

### L3:L-MessageArea Message area

- stack

## Elements

### 1:E-Title Heading

- level: 1
- label: Request access

### 2:E-EmailInput Input

- label: Email
- type: email

### 3:E-SubmitButton Button

- label: Submit
- variant: primary
- action: A-SubmitRequest

### 4:E-SubmitErrorBanner Banner

- tone: danger
- text: Request could not be submitted.

## Form Groups

### F-Request Request form

- marker: F1
- fields: E-EmailInput

## Actions

### A1:A-SubmitRequest Submit request

- From
  - idle
- Process P1: Check request form
  - receive:
    - validation: V-RequestForm.result
  - case: invalid
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: V-RequestForm.messages
    - stop
  - case: valid
    - continue
- Process P2: Submit request
  - request:
    - method: POST
    - path: /request-access
    - params:
      - email: E-EmailInput.value
  - result:
    - request submission result
  - case: sent
    - Effects
      - state: submitting
    - stop
  - case: send-failed
    - Effects
      - state: submit-error
      - display:
        - target: L-MessageArea
        - element: E-SubmitErrorBanner
    - stop

### A2:A-HandleRequestResponse Handle request response

- From
  - submitting
- Process P1: Handle request response
  - receive:
    - response: A-SubmitRequest.P2.response
  - case: success
    - response: 2xx accepted
    - Effects
      - navigate: SCR-THANK-YOU
    - stop
  - case: failure
    - response: 4xx or 5xx
    - Effects
      - state: submit-error
      - display:
        - target: L-MessageArea
        - element: E-SubmitErrorBanner
    - stop

## Preview Scenarios

### submit-error-after-send

- state: submit-error
- cases:
  - A-SubmitRequest.P2.send-failed
- samples:
  - E-EmailInput: morgan@example.com

## Cross-field Validations

### V1:V-RequestForm Request form validation

- target: F-Request
- inputs:
  - E-EmailInput
- check: E-EmailInput.value is present
- message: Email is required.
