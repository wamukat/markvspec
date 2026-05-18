---
id: SCR-ASYNC-LOADING
type: screen
title: Async Fetching
route: /async-loading
locale: en
---

# SCR-ASYNC-LOADING Async Fetching

This example teaches asynchronous state modeling for a list refresh. Read
`## States`, the split send/receive `## Actions`, response cases, and the
table `sample rows:`; it keeps layout and input controls minimal so fetching,
loaded, empty, and error previews are the focus.

## States

- idle*
- fetching
  - The list request has been sent and the screen is waiting for a response.
- loaded
- empty
- fetch-error

## Layout: mobile

### L1:L-Page Async fetching page

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
- label: Async fetching

### 2:E-RefreshButton Button

- label: Refresh
- variant: primary
- action: A-RefreshItems
- disabled when: fetching

### 3:E-LoadingSpinner Spinner

- label: Fetching items
- visible when: fetching

### 4:E-ErrorBanner Banner

- tone: danger
- text: Items could not be loaded.
- visible when: fetch-error

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

- From
  - idle
  - loaded
  - empty
  - fetch-error
- Process P1: Send request
  - request:
    - method: GET
    - path: /items
  - result:
    - item list request
  - case: sent
    - Effects
      - state: fetching
  - case: send-failed
    - Effects
      - state: fetch-error
      - display:
        - target: L-StatusArea
        - element: E-ErrorBanner

### A2:A-HandleItemsResponse Handle items response

- From
  - fetching
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
      - state: fetch-error
