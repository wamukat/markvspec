---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Preview Data
route: /scenario-samples
locale: en
---

# SCR-SCENARIO-SAMPLES Scenario Preview Data

This example focuses on previewing data variations without a separate data
model section. Read Element `sample` / `sample rows:` as neutral baseline data,
then compare the `## Preview Scenarios` overrides that show different loaded
account data without creating extra states.

## States

- before-load+
  - Account data has not started loading yet.
- initializing*
  - Account data is being initialized before scenario-specific data is available.
- loaded
  - Account data was initialized. Scenario samples decide which data variation is shown.
- initialize-error
  - Account data could not be initialized.

## Layout: desktop

### L1:L-Page Scenario samples page

- stack
- gap: md

#### Items

- E-Title
- E-LoadingMessage
- L-Summary
- E-SubscriptionTable

### L2:L-Summary Summary panel

- grid
- columns: 3
- gap: sm
- hidden when: initializing

#### Items

- E-MemberName
- E-PlanName
- E-SeatCount
- E-LoadedStatusBanner
- E-LoadErrorMessage

## Elements

### 1:E-Title Heading

- level: 1
- label: Scenario samples

### 2:E-MemberName Text

- source: data
- sample: Baseline Member

### 3:E-PlanName Text

- source: data
- sample: Baseline Plan

### 4:E-SeatCount Text

- source: data
- sample: 1 seat

### 5:E-LoadedStatusBanner Banner

- tone: info
- text: Subscription data loaded for review.
- visible when: loaded

### 6:E-SubscriptionTable Table

- source: data
- Columns:
  - product: Product
  - seats: Seats
  - renewal: Renewal
- sample rows:
  - row:
    - product: Baseline workspace
    - seats: 1
    - renewal: 2026-08-01
- visible when: loaded

### 7:E-LoadingMessage Text

- text: Initializing account data...
- visible when: initializing

### 8:E-LoadErrorMessage Paragraph

- text: Account subscription data could not be initialized.
- tone: danger
- visible when: initialize-error

## Events

- page.load: A-LoadAccount

## Actions

### A1:A-LoadAccount Load account

#### From
- before-load
#### P1: Process Send request
- request:
  - method: GET
  - path: /account/subscriptions
- case: sent
  - description: account subscription request sent
  - state: initializing

### A2:A-HandleAccountResponse Handle account response

#### From
- initializing
#### P1: Process Apply response
- receive:
  - response: A-LoadAccount.P1.response
- case: has-subscriptions
  - response: HTTP 200 with subscription rows
  - state: loaded
- case: empty
  - response: HTTP 200 with no subscription rows
  - state: loaded
- case: failure
  - response: HTTP 5xx or network failure
  - state: initialize-error

## Preview Scenarios

These scenarios document why each loaded-state preview variant exists. The
section lead appears once above the State Views output, while each scenario lead
appears on its own state view.

### loaded

Defines the standard loaded-state account data. Because the heading matches the
`loaded` state and omits `state:`, these samples apply to the normal `loaded`
preview instead of creating an extra `loaded / loaded` scenario.

- samples:
  - E-MemberName: Morgan Lee
  - E-PlanName: Team Pro
  - E-SeatCount: 12 seats
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Workspace
        - seats: 8
        - renewal: 2026-06-30
      - row:
        - product: Analytics
        - seats: 4
        - renewal: 2026-07-15

These baseline notes appear after the loaded State View details.

### loaded-empty-account

Shows the same loaded state when the response has no subscription rows. The
`rows: []` sample demonstrates the table fallback without introducing an
extra empty state.

- state: loaded
- samples:
  - E-MemberName: Sam Carter
  - E-PlanName: Starter
  - E-SeatCount: 0 seats
  - E-SubscriptionTable:
    - rows: []
- cases:
  - A-HandleAccountResponse.P1.empty

These empty-account notes appear after the additional scenario details.

### loaded-renewal-risk

Shows a loaded account with subscriptions renewing soon, so reviewers can check
whether the table data makes upcoming renewals clear for a high-seat enterprise
account.

- state: loaded
- samples:
  - E-MemberName: Alex Rivera
  - E-PlanName: Enterprise
  - E-SeatCount: 98 seats
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Core platform
        - seats: 80
        - renewal: 2026-05-31
      - row:
        - product: Analytics
        - seats: 18
        - renewal: 2026-06-07

These renewal-risk notes appear after the additional scenario details.

### Section Notes

These section notes appear once after the Preview Scenario-derived State Views.
