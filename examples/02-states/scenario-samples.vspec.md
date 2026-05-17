---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
route: /scenario-samples
locale: en
---

# SCR-SCENARIO-SAMPLES Scenario Samples

This example focuses on previewing data variations without a separate data
model section. Read Element `sample` / `sample rows:` as neutral baseline data,
then compare the `## Preview Scenarios` overrides that show different loaded
account data without creating extra states.

## States

- loading*
  - Account data is being loaded before scenario-specific data is available.
- loaded
  - Account data was loaded. Scenario samples decide which data variation is shown.
- load-error
  - Account data could not be loaded.

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
- hidden when: loading

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

- text: Loading account data...
- visible when: loading

### 8:E-LoadErrorMessage Paragraph

- text: Account subscription data could not be loaded.
- tone: danger
- visible when: load-error

## Actions

### A1:A-LoadAccount Load account

- Triggered
  - screen.load
- From
  - loading
- Process P1: Send request
  - request:
    - method: GET
    - path: /account/subscriptions
  - result:
    - account subscription response

### A2:A-HandleAccountResponse Handle account response

- Triggered
  - A-LoadAccount.P1.response
- From
  - loading
- Process P1: Apply response
  - receive:
    - response: A-LoadAccount.P1.response
  - case: has-subscriptions
    - response: HTTP 200 with subscription rows
    - Effects
      - state: loaded
  - case: empty
    - response: HTTP 200 with no subscription rows
    - Effects
      - state: loaded
  - case: failure
    - response: HTTP 5xx or network failure
    - Effects
      - state: load-error

## Preview Scenarios

### loaded-standard-account

Shows a normal loaded account with a small subscription list. This scenario
uses realistic account data instead of repeating the neutral baseline samples.

- state: loaded
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
