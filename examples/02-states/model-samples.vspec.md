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
preview output; actions and request flow are intentionally omitted so the sample
data contract stays visible.

## States

- loaded*
- empty
  - The account has no active subscriptions to render.

## Layout: desktop

### L1:L-Page Model samples page

- stack
- gap: md

#### Items

- E-Title
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

### 3:E-PlanName Text

- src: ${model.account.plan}

### 4:E-SeatCount Text

- src: ${model.account.seats}

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
