---
id: SCR-ASYNC-LOADING
type: screen
title: Async Loading
route: /async-loading
owner: docs
locale: en
viewport: mobile
status: draft
---

# SCR-ASYNC-LOADING Async Loading

This example teaches how to separate request sending from asynchronous response
handling. The click action only reaches `loading` after the request is sent.

## States

- idle*
- loading
  - The list request has been sent and the screen is waiting for a response.
- loaded
- empty
- load-error

## Layout: mobile

### L1:L-Page Async loading page

- stack
- gap: md

#### Items

- E-Title
- E-RefreshButton
- L-StatusArea
- E-ItemsTable
- E-EmptyText

### L2:L-StatusArea Status area

- stack

#### Items

- E-LoadingSpinner
- E-ErrorBanner

## Elements

### 1:E-Title Heading

- level: 1
- label: Async loading

### 2:E-RefreshButton Button

- label: Refresh
- variant: primary
- action: A-RefreshItems
- disabled when: loading

### 3:E-LoadingSpinner Spinner

- label: Loading items
- visible when: loading

### 4:E-ErrorBanner Banner

- tone: danger
- sample: Items could not be loaded.
- visible when: load-error

### 5:E-ItemsTable Table

- source: ${model.items.rows}
- Columns:
  - name: Name
  - status: Status
- visible when: loaded

### 6:E-EmptyText Paragraph

- sample: No items are available.
- visible when: empty

## Actions

### A1:A-RefreshItems Refresh items

- Triggered
  - E-RefreshButton.click
- From
  - idle
  - loaded
  - empty
  - load-error
- Process P1: Send request
  - request:
    - method: GET
    - path: /items
    - params:
      - page: ${model.page}
  - result:
    - item list request
  - case: sent
    - state: loading
  - case: send-failed
    - state: load-error
    - display:
      - target: L-StatusArea
      - content: Request could not be sent.

### A2:A-HandleItemsResponse Handle items response

- Triggered
  - A-RefreshItems.P1.response
- From
  - loading
- Process P1: Handle response
  - receive:
    - response: A-RefreshItems.P1.response
  - case: success
    - response: HTTP 200 with rows
    - state: loaded
    - display:
      - target: E-ItemsTable
      - content: Latest item rows
  - case: empty
    - response: HTTP 200 with no rows
    - state: empty
  - case: failure
    - response: HTTP error or timeout
    - state: load-error

## Model Samples

### loaded

#### ${model.items.rows}

| name | status |
| --- | --- |
| Account setup | Ready |
| Billing review | Waiting |
