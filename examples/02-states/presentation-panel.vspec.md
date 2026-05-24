---
id: SCR-PRESENTATION-PANEL
type: screen
title: Presentation Panel
route: /presentation-panel
locale: en
---

# SCR-PRESENTATION-PANEL Presentation Panel

This example shows a `P-*` presentation panel used only to arrange two fields on
one row. Read `P-NameFields` as a visual grouping inside the meaningful
`L-ProfileForm`; actions and display updates still target `L-*` or `E-*` IDs.

## States

- idle*
- saving
- save-error

## Layout: desktop

### L1:L-Page Profile page

- stack
- gap: md

#### Items

- E-Title
- L-ProfileForm
- L-MessageArea

### L2:L-ProfileForm Profile form

- stack
- gap: sm
- disabled when: saving

#### Items

- P-NameFields
- "Email": E-EmailInput
- E-SaveButton

### P-NameFields Name fields

- row
- gap: sm

#### Items

- "First name": E-FirstNameInput
- "Last name": E-LastNameInput

### L3:L-MessageArea Message area

- stack

#### Items

- E-SaveError

## Elements

### 1:E-Title Heading

- level: 1
- label: Edit profile

### 2:E-FirstNameInput Input

- label: First name
- placeholder: Taylor

### 3:E-LastNameInput Input

- label: Last name
- placeholder: Stone

### 4:E-EmailInput Input

- label: Email
- placeholder: taylor@example.com

### 5:E-SaveButton Button

- label: Save
- variant: primary
- action: A-SaveProfile

### 6:E-SaveError Banner

- tone: danger
- text: Profile could not be saved.
- visible when: save-error

## Actions

### A1:A-SaveProfile Save profile

#### From
- idle
- save-error
#### P1: Process Submit profile
- request:
  - PUT /profile
  - params:
    - firstName: E-FirstNameInput.value
    - lastName: E-LastNameInput.value
    - email: E-EmailInput.value
- case: sent
  - state: saving
- case: send-failed
  - state: save-error
  - display:
    - target: L-MessageArea
    - element: E-SaveError

### A2:A-HandleSaveResponse Handle save response

#### From
- saving
#### P1: Process Apply save response
- receive:
  - response: A-SaveProfile.P1.response
- case: success
  - response: HTTP 200
  - state: idle
- case: failure
  - response: HTTP error
  - state: save-error
  - display:
    - target: L-MessageArea
    - element: E-SaveError
