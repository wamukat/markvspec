---
id: SCR-USERS
type: screen
title: Search List
route: /users
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-USERS Search List

This example teaches a compact real-world list screen: search criteria, a table
fed by Model Samples, empty and error states, request send cases, response cases,
and pagination actions.

## States

- idle*
- loading
  - A search or paging request has been sent.
- empty
  - The request succeeded but no rows matched.
- load-error
  - The request could not be sent or the server response failed.

## Layout: desktop

### L1:L-Page Search list page

- stack
- gap: md

#### Items

- E-PageTitle
- L-SearchToolbar
- L-StatusArea
- L-Results
- L-Pagination

### L2:L-SearchToolbar Search toolbar

- row
- gap: sm
- align: center
- disabled when: loading

#### Items

- "Keyword": E-KeywordInput
- "Status": E-StatusFilter
- E-SearchButton

### L3:L-StatusArea Status area

- stack

#### Items

- E-LoadingSpinner
- E-LoadErrorBanner

### L4:L-Results Results

- stack

#### Items

- E-UsersTable
- E-EmptyText

### L5:L-Pagination Pagination

- row
- gap: sm
- align: right
- visible when: idle

#### Items

- E-PreviousPageButton
- E-PageSummary
- E-NextPageButton

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Search users

### 2:E-KeywordInput Input

- placeholder: Name or email
- value: ${model.keyword}

### 3:E-StatusFilter Select

- value: ${model.status}
- initial value: All
- options:
  - All
  - Active
  - Invited
  - Suspended

### 4:E-SearchButton Button

- label: Search
- variant: primary
- action: A-SearchUsers

### 5:E-LoadingSpinner Spinner

- label: Loading results
- visible when: loading

### 6:E-LoadErrorBanner Banner

- tone: danger
- sample: Results could not be loaded.
- visible when: load-error

### 7:E-UsersTable Table

- source: ${model.users.items}
- Columns:
  - name: Name
    sortable: true
  - email: Email
  - status: Status
- visible when: idle

### 8:E-EmptyText Paragraph

- sample: No users match the current filters.
- visible when: empty

### 9:E-PreviousPageButton Button

- label: Previous
- action: A-PreviousPage
- disabled when: ${model.page} is first

### 10:E-PageSummary Text

- sample: Page 1 of 3

### 11:E-NextPageButton Button

- label: Next
- action: A-NextPage

## Actions

### A1:A-SearchUsers Search users

- Triggered
  - E-SearchButton.click
- From
  - idle
  - empty
  - load-error
- Process P1: Request matching users
  - request:
    - method: GET
    - path: /users
    - params:
      - keyword: E-KeywordInput.value
      - status: E-StatusFilter.value
      - page: 1
  - result:
    - first search page request
  - case: sent
    - Effects
      - state: loading
  - case: send-failed
    - Effects
      - state: load-error
      - display:
        - target: L-StatusArea
        - element: E-LoadErrorBanner

### A2:A-HandleSearchUsersResponse Handle search users response

- Triggered
  - A-SearchUsers.P1.response
- From
  - loading
- Process P1: Handle response
  - receive:
    - response: A-SearchUsers.P1.response
  - case: success
    - response: 200 with one or more rows
    - Effects
      - state: idle
      - display:
        - target: L-Results
        - element: E-UsersTable
  - case: empty
    - response: 200 with no rows
    - Effects
      - state: empty
      - display:
        - target: L-Results
        - element: E-EmptyText
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error
      - display:
        - target: L-StatusArea
        - element: E-LoadErrorBanner

### A3:A-NextPage Next page

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process P1: Request next page
  - request:
    - method: GET
    - path: /users
    - params:
      - keyword: ${model.keyword}
      - status: ${model.status}
      - page: ${model.nextPage}
  - result:
    - next search page request
  - case: sent
    - Effects
      - state: loading
  - case: send-failed
    - Effects
      - state: load-error

### A4:A-PreviousPage Previous page

- Triggered
  - E-PreviousPageButton.click
- From
  - idle
- Process P1: Request previous page
  - request:
    - method: GET
    - path: /users
    - params:
      - keyword: ${model.keyword}
      - status: ${model.status}
      - page: ${model.previousPage}
  - result:
    - previous search page request
  - case: sent
    - Effects
      - state: loading
  - case: send-failed
    - Effects
      - state: load-error

### A5:A-HandleNextPageResponse Handle next page response

- Triggered
  - A-NextPage.P1.response
- From
  - loading
- Process P1: Handle response
  - receive:
    - response: A-NextPage.P1.response
  - case: success
    - response: 200 with one or more rows
    - Effects
      - state: idle
      - display:
        - target: L-Results
        - element: E-UsersTable
  - case: empty
    - response: 200 with no rows
    - Effects
      - state: empty
      - display:
        - target: L-Results
        - element: E-EmptyText
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error
      - display:
        - target: L-StatusArea
        - element: E-LoadErrorBanner

### A6:A-HandlePreviousPageResponse Handle previous page response

- Triggered
  - A-PreviousPage.P1.response
- From
  - loading
- Process P1: Handle response
  - receive:
    - response: A-PreviousPage.P1.response
  - case: success
    - response: 200 with one or more rows
    - Effects
      - state: idle
      - display:
        - target: L-Results
        - element: E-UsersTable
  - case: empty
    - response: 200 with no rows
    - Effects
      - state: empty
      - display:
        - target: L-Results
        - element: E-EmptyText
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error
      - display:
        - target: L-StatusArea
        - element: E-LoadErrorBanner

## Model Samples

### idle

#### ${model.users.items}

- name: Taylor Stone
  email: taylor@example.com
  status: Active
- name: Riley Chen
  email: riley@example.com
  status: Invited
