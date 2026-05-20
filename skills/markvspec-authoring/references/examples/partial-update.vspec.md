---
id: SCR-PARTIAL-UPDATE
type: screen
title: Partial Update
route: /partial-update
locale: en
---

# SCR-PARTIAL-UPDATE Partial Update

## States

- idle*
- loaded
- load-error

## Layout: desktop

### L1:L-Page Partial update page

- stack
- gap: md

#### Items

- E-Title
- E-RefreshButton
- L-ResultArea

### L2:L-ResultArea Result area

- stack

### L3:L-SummaryPanel Summary panel

- stack

#### Items

- E-SummaryText

## Elements

### 1:E-Title Heading

- level: 1
- label: Latest summary

### 2:E-RefreshButton Button

- label: Refresh
- variant: secondary
- action: A-RefreshSummary

### 3:E-SummaryText Paragraph

- text: The latest summary is ready.

### 4:E-LoadErrorBanner Banner

- tone: danger
- text: Summary could not be refreshed.

## Actions

### A1:A-RefreshSummary Refresh summary

- From
  - idle
  - loaded
  - load-error
- Process P1: Request summary
  - request:
    - method: GET
    - path: /summary
  - result:
    - summary response
  - case: success
    - description: summary loaded
    - Effects
      - state: loaded
      - display:
        - target: L-ResultArea
        - element: L-SummaryPanel
    - stop
  - case: failure
    - description: summary could not be loaded
    - Effects
      - state: load-error
      - display:
        - target: L-ResultArea
        - element: E-LoadErrorBanner
    - stop

## Preview Scenarios

### loaded-after-refresh

- state: loaded
- cases:
  - A-RefreshSummary.P1.success

### refresh-error

- state: load-error
- cases:
  - A-RefreshSummary.P1.failure
