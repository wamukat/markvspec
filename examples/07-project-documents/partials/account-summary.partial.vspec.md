---
id: PRT-ACCOUNT-SUMMARY
type: partial
title: Account Summary Partial
route: /account/summary
locale: en
---

# PRT-ACCOUNT-SUMMARY Account Summary Partial

Reusable account summary partial included in the project document list.

## States

- loaded*
- refresh-error

## Layout: desktop

### L1:L-AccountSummary Account summary

- stack
- gap: sm

#### Items

- E-AccountName
- E-PlanBadge
- E-RenewalText
- E-SummaryError

## Elements

### 1:E-AccountName Heading

- level: 2
- source: data
- sample: Acme Workspace

### 2:E-PlanBadge Badge

- tone: success
- source: data
- sample: Business plan

### 3:E-RenewalText Text

- source: data
- sample: Renews on 2026-06-30

### 4:E-SummaryError Banner

- tone: danger
- text: Account summary could not be loaded.
- visible when: refresh-error

