---
id: SCR-ACCOUNT-DASHBOARD
type: screen
title: Account Dashboard
route: /account
locale: en
template:
  id: TPL-ACCOUNT-SHELL
  src: ../templates/account-shell.vspec.md
references:
  partials:
    PRT-ACCOUNT-SUMMARY: ../partials/account-summary.partial.vspec.md
---

# SCR-ACCOUNT-DASHBOARD Account Dashboard

Dashboard screen used by the project preview and document-list example.

## States

- idle*
- loading-summary

## Slot: content

### L1:L-DashboardContent Dashboard content

- stack
- gap: md

#### Items

- L-SummaryHost
- E-SettingsButton
- E-RefreshSummaryButton

### L2:L-SummaryHost Summary host

- stack
- partial:
  - id: PRT-ACCOUNT-SUMMARY
  - states:
    - idle: loaded
    - loading-summary: loaded

## Elements

### 1:E-SettingsButton Button

- label: Manage settings
- variant: primary
- action: A-OpenSettings

### 2:E-RefreshSummaryButton Button

- label: Refresh summary
- action: A-RefreshSummary

## Actions

### A1:A-OpenSettings Open settings

- From
  - idle
- Process P1: Open settings screen
  - case: selected
    - navigate: SCR-ACCOUNT-SETTINGS
    - stop

### A2:A-RefreshSummary Refresh account summary

- From
  - idle
- Process P1: Request summary partial
  - request:
    - method: GET
    - path: /account/summary
  - case: sent
    - state: loading-summary
    - display:
      - target: L-SummaryHost
      - partial: PRT-ACCOUNT-SUMMARY
    - stop

## History

### v1.1

- date: 2026-05-20
- author: Product
