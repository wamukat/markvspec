---
id: SCR-COVERAGE-SENTINEL
type: screen
title: Coverage Sentinel Screen
route: /coverage/:memberId
locale: en
default-state: loaded
references:
  partials:
    PRT-COVERAGE-SUMMARY: ./project/partials/summary.partial.vspec.md
---

# SCR-COVERAGE-SENTINEL Coverage Sentinel Screen

Screen lead sentinel: authoring prose attached to the screen summary.

## States

States section overview sentinel.

- before-load+
- idle*
  - State idle message sentinel.
- loaded
  - State loaded message sentinel.

### Section Notes

States section notes sentinel.

## Layout: desktop

Layout section overview sentinel.

### L-Root Coverage root

Layout entity overview sentinel.

- stack
- gap: md

#### Items

- E-Title
- L-Form
- E-SubmitButton

Layout entity notes sentinel.

### L-Form Coverage form layout

- stack

#### Items

- E-NameInput
- E-HelpText

### Section Notes

Layout section notes sentinel.

## Elements

Elements section overview sentinel.

### E-Title Heading

Element entity overview sentinel.

- level: 1
- label: Coverage sentinel title

Element entity notes sentinel.

### E-NameInput Input

- label: Name
- value: ${model.member.name}
- placeholder: Member name
- visible when: ${view.isHelpOpen} = false

### E-HelpText Text

- value: Saved coverage sentinel.
- visible when: ${view.isHelpOpen}

### E-SubmitButton Button

- label: Save coverage
- action: A-SaveCoverage
- variant: primary

### Section Notes

Elements section notes sentinel.

## Form Groups

Form Groups section overview sentinel.

### F-CoverageForm Coverage form

Form group overview sentinel.

- fields:
  - E-NameInput
- submit: A-SaveCoverage
- purpose: Coverage form purpose sentinel.

Form group notes sentinel.

### Section Notes

Form Groups section notes sentinel.

## Events

- page.load: A-LoadCoverage

## Actions

Actions section overview sentinel.

### A-LoadCoverage Load coverage

#### From
- before-load
#### P1: Process Immediate
- case: success
  - state: idle

### A-SaveCoverage Save coverage

Action overview sentinel.

#### From
- idle

Action notes sentinel.

#### P1: Process Immediate
- when: ${view.isHelpOpen} = false
- receive:
  - validation: V-CoverageName.result
- result:
  - coverage validation accepted
- case: success
  - state: loaded
  - view: ${view.isHelpOpen} = false
#### P2: Process Submit coverage
- sync:
  - CoverageService.save()
  - params:
    - memberId: ${route.memberId}
    - name: E-NameInput.value
- result:
  - coverage request sent
- case: sent
  - state: loaded
  - display:
    - target: E-HelpText
    - element: E-HelpText

### Section Notes

Actions section notes sentinel.

## View Context

View Context section overview sentinel.

### isHelpOpen

View context entity overview sentinel.

- type: boolean
- values:
  - false*
  - true

View context entity notes sentinel.

### Section Notes

View Context section notes sentinel.

## View Context Samples

View Context Samples section overview sentinel.

### default

View context sample overview sentinel.

- ${view.isHelpOpen}: false

View context sample notes sentinel.

### Section Notes

View Context Samples section notes sentinel.

## Preview Scenarios

Preview Scenarios section overview sentinel.

### loaded

Preview scenario overview sentinel.

- route:
  - memberId: M-001
- samples:
  - E-NameInput: Ada Lovelace

Preview scenario notes sentinel.

### Section Notes

Preview Scenarios section notes sentinel.

## Validations

Validations section overview sentinel.

### V-CoverageName Coverage name validation

Validation overview sentinel.

- target: E-NameInput
- rules:
  - required:
    - E-NameInput
- message: Name is required.

Validation notes sentinel.

### Section Notes

Validations section notes sentinel.

## Business Rules

Business Rules section overview sentinel.

### R-CoverageName Coverage name policy

Rule overview sentinel.

- Coverage name must be readable.

Rule notes sentinel.

### Section Notes

Business Rules section notes sentinel.

## Error Codes

Error Codes section overview sentinel.

### ERR-COVERAGE-NAME Coverage name error

Error overview sentinel.

- business rule: R-CoverageName
- target: E-NameInput
- display: inline
- message: Coverage name error sentinel.

Error notes sentinel.

### Section Notes

Error Codes section notes sentinel.

## History Fields

- ticket
  label: Ticket
  required: false
  type: string

## History

### v0.1

- date: 2026-05-19
- author: Coverage Bot
- ticket: MV-1232

History entry body sentinel.

## Notes

General note sentinel.
