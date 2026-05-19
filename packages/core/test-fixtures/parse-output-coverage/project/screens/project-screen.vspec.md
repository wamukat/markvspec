---
id: SCR-COVERAGE-PROJECT
type: screen
title: Coverage Project Screen
route: /coverage/project
template:
  id: TPL-COVERAGE-SHELL
  src: ../templates/shell.vspec.md
references:
  partials:
    PRT-COVERAGE-SUMMARY: ../partials/summary.partial.vspec.md
---

# SCR-COVERAGE-PROJECT Coverage Project Screen

Project screen summary sentinel for document-list export.

## States

- idle*

## Slot: content

### L-ProjectContent Project content

- stack

#### Items

- E-ProjectTitle

## Elements

### E-ProjectTitle Heading

- label: Project screen title sentinel

## Actions

### A-OpenProject Open project

- Triggered
  - E-ProjectTitle.click
- From
  - idle
- Process P1: Immediate
  - case: success
    - navigate: SCR-COVERAGE-PROJECT
