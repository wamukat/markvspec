---
id: SCR-MODEL-SAMPLES
type: screen
title: Model Samples
route: /model-samples
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-MODEL-SAMPLES Model Samples

This example focuses on list-style `## Model Samples` and model-backed preview
content. Read the sample sets, `${model.*}` references, and state-specific
preview output together. The load flow is intentionally minimal so the sample
data contract stays visible while `loading`, `loaded`, and `empty` still form a
coherent state flow.

## States

- loading*
  - Account data is being loaded before the model-backed preview is available.
- loaded
- empty
  - The account has no active subscriptions to render.

## Layout: desktop

### L1:L-Page Model samples page

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

#### Items

- E-MemberName
- E-PlanName
- E-SeatCount
- E-StatusBanner

## Elements

### 1:E-Title Heading

- level: 1
- label: Model samples

### 2:E-MemberName Text

- src: ${model.member.name}
- visible when: loaded
- visible when: empty

### 3:E-PlanName Text

- src: ${model.account.plan}
- visible when: loaded
- visible when: empty

### 4:E-SeatCount Text

- src: ${model.account.seats}
- visible when: loaded
- visible when: empty

### 5:E-StatusBanner Banner

- tone: warning
- sample: Renewal attention required.
- visible when: loaded

### 6:E-SubscriptionTable Table

- rows: ${model.subscriptions.items}
- source: data
- Columns:
  - product: Product
  - seats: Seats
  - renewal: Renewal
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

## Model Samples

### loaded

#### ${model.member}

- name: Morgan Lee

#### ${model.account}

- plan: Team Pro
- seats: 12

#### ${model.subscriptions.items}

- product: Workspace
  seats: 8
  renewal: 2026-06-30
- product: Analytics
  seats: 4
  renewal: 2026-07-15

### empty

#### ${model.member}

- name: Morgan Lee

#### ${model.account}

- plan: Team Pro
- seats: 0

#### ${model.subscriptions.items}

| product | seats | renewal |
| --- | --- | --- |
