---
id: SCR-SINGLE-FIELD-VALIDATION
type: screen
title: Single Field Validation
route: /single-field-validation
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-SINGLE-FIELD-VALIDATION Single Field Validation

This example focuses on element-level input specifications and matching
single-field validation contracts.

## States

- idle*
- validation-error
- saving
- saved

## Layout: desktop

### L1:L-Page Single field validation page

- stack
- gap: md

#### Items

- E-Title
- E-LeadText
- L-Form
- L-MessageArea

### L2:L-Form Profile fields

- stack
- gap: sm
- disabled when: saving

#### Items

- "Username*": E-UsernameInput
- "Email*": E-EmailInput
- "Age": E-AgeInput
- E-SaveButton

### L3:L-MessageArea Message area

- stack

#### Items

- E-ValidationMessage
- E-SavedMessage

## Elements

### 1:E-Title Heading

- level: 1
- label: Single-field validation

### 2:E-LeadText Paragraph

- sample: Each input declares browser-facing constraints, and each Validation contract declares the product rule that consumes the same field.

### 3:E-UsernameInput Input*

- label: Username
- value: ${model.username}
- placeholder: wamukat
- input rule:
  - min length: 3
  - max length: 40
  - pattern: [a-z0-9-]+

### 4:E-EmailInput Input*

- label: Email
- type: email
- value: ${model.email}
- placeholder: user@example.com
- input rule:
  - type: email

### 5:E-AgeInput NumberInput

- label: Age
- value: ${model.age}
- initial value: 18
- min: 13
- max: 120
- step: 1

### 6:E-SaveButton Button

- label: Save profile
- variant: primary
- action: A-SaveProfile

### 7:E-ValidationMessage Text

- tone: danger
- sample: Fix the highlighted fields before saving.
- visible when: validation-error

### 8:E-SavedMessage Text

- tone: success
- sample: Profile saved.
- visible when: saved

## Form Groups

### F-ProfileForm Profile form

- fields:
  - E-UsernameInput
  - E-EmailInput
  - E-AgeInput
- submit: A-SaveProfile

## Actions

### A1:A-SaveProfile Save profile

- Triggered
  - E-SaveButton.click
- From
  - idle
  - validation-error
  - saved
- Process P1: Check field validation
  - receive:
    - validation: V-UsernameRules.result
    - validation: V-EmailRules.result
    - validation: V-AgeRange.result
  - case: invalid
    - description: one or more single-field validation results are invalid
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage
    - stop
  - case: valid
    - description: all single-field validation results are valid
    - continue
- Process P2: Save profile
  - request:
    - method: POST
    - path: /profile
    - params:
      - username: E-UsernameInput.value
      - email: E-EmailInput.value
      - age: E-AgeInput.value
  - result:
    - profile save request
  - case: sent
    - Effects
      - state: saving
  - case: send-failed
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage

### A2:A-HandleSaveResponse Handle save response

- Triggered
  - A-SaveProfile.P2.response
- From
  - saving
- Process P1: Handle save response
  - receive:
    - response: A-SaveProfile.P2.response
  - case: success
    - response: 200 saved
    - Effects
      - state: saved
      - display:
        - target: L-MessageArea
        - element: E-SavedMessage
  - case: failure
    - response: 4xx or 5xx
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage

## Validations

### V-UsernameRules Username rules

- target: E-UsernameInput
- rules:
  - required:
    - E-UsernameInput
  - min-length:
    - E-UsernameInput
  - max-length:
    - E-UsernameInput
  - pattern:
    - E-UsernameInput
- scope: field
- run: client
- message: Username must be 3 to 40 lowercase letters, numbers, or hyphens.

### V-EmailRules Email rules

- target: E-EmailInput
- rules:
  - required:
    - E-EmailInput
  - email:
    - E-EmailInput
- scope: field
- run: client
- message: Enter a valid email address.

### V-AgeRange Age range

- target: E-AgeInput
- rules:
  - min:
    - E-AgeInput
  - max:
    - E-AgeInput
- scope: field
- run: client
- message: Age must be between 13 and 120.
