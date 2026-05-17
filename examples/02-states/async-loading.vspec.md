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

This example teaches asynchronous state modeling for a list refresh. Read
`## States`, the split send/receive `## Actions`, response cases, and the
table `sample rows:`; it keeps layout and input controls minimal so loading,
loaded, empty, and error previews are the focus.

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
- text: Items could not be loaded.
- visible when: load-error

### 5:E-ItemsTable Table

- source: data
- Columns:
  - name: Name
  - status: Status
- sample rows:
  - row:
    - name: Account setup
    - status: Ready
  - row:
    - name: Billing review
    - status: Waiting
- visible when: loaded

### 6:E-EmptyText Paragraph

- text: No items are available.
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
  - result:
    - item list request
  - case: sent
    - Effects
      - state: loading
  - case: send-failed
    - Effects
      - state: load-error
      - display:
        - target: L-StatusArea
        - element: E-ErrorBanner

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
    - Effects
      - state: loaded
      - display:
        - target: E-ItemsTable
        - element: E-ItemsTable
  - case: empty
    - response: HTTP 200 with no rows
    - Effects
      - state: empty
  - case: failure
    - response: HTTP error or timeout
    - Effects
      - state: load-error
