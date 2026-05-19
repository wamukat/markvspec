---
id: SCR-BASIC-FORM
type: screen
title: Basic Form
route: /basic-form
locale: en
---

# SCR-BASIC-FORM Basic Form

## States

- idle*

## Layout: desktop

### L1:L-Page Basic form page

- stack
- gap: md

#### Items

- E-Title
- L-Form

### L2:L-Form Contact form

- stack
- gap: sm

#### Items

- "Name": E-NameInput
- "Email": E-EmailInput
- E-SubmitButton

## Elements

### 1:E-Title Heading

- level: 1
- label: Contact

### 2:E-NameInput Input

- label: Name
- placeholder: Morgan Lee

### 3:E-EmailInput Input

- label: Email
- type: email
- placeholder: morgan@example.com

### 4:E-SubmitButton Button

- label: Submit
- variant: primary
- action: A-SubmitContact

## Actions

### A1:A-SubmitContact Submit contact

- From
  - idle
- Process P1: Acknowledge submit
  - state: idle
