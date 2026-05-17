---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
route: /scenario-samples
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-SCENARIO-SAMPLES Scenario Samples

This example focuses on preview data without a separate data model section.
Read Element `sample` / `sample rows:` as the baseline display data, then compare
the `## Preview Scenarios` overrides for the loaded and empty states.

## States

- loading*
  - Account data is being loaded before scenario-specific data is available.
- loaded
- empty
  - The account has no active subscriptions to render.

## Layout: desktop

### L1:L-Page Scenario samples page

- stack
- gap: md

#### Items

- E-Title
- E-LoadingMessage
- L-Summary
- E-SubscriptionTable
- E-EmptyMessage

### L2:L-Summary Summary panel

- grid
- columns: 3
- gap: sm
- hidden when: loading

#### Items

- E-MemberName
- E-PlanName
- E-SeatCount
- E-StatusBanner

## Elements

### 1:E-Title Heading

- level: 1
- label: Scenario samples

### 2:E-MemberName Text

- source: data
- sample: Morgan Lee

### 3:E-PlanName Text

- source: data
- sample: Team Pro

### 4:E-SeatCount Text

- source: data
- sample: 12 seats

### 5:E-StatusBanner Banner

- tone: warning
- sample: Renewal attention required.
- visible when: loaded

### 6:E-SubscriptionTable Table

- source: data
- Columns:
  - product: Product
  - seats: Seats
  - renewal: Renewal
- sample rows:
  - row:
    - product: Workspace
    - seats: 8
    - renewal: 2026-06-30
  - row:
    - product: Analytics
    - seats: 4
    - renewal: 2026-07-15
- visible when: loaded

### 7:E-EmptyMessage Paragraph

- sample: No subscriptions are linked to this account.
- visible when: empty

### 8:E-LoadingMessage Text

- sample: Loading account data...
- visible when: loading

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
      - state: empty

## Preview Scenarios

### loaded-renewal

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

### empty-account

- state: empty
- samples:
  - E-MemberName: Morgan Lee
  - E-PlanName: Team Pro
  - E-SeatCount: 0 seats
  - E-SubscriptionTable:
    - rows: []
