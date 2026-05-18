---
id: SCR-TABS-SETTINGS
type: screen
title: Tabs Settings
route: /settings/tabs
locale: en
---

# SCR-TABS-SETTINGS Tabs Settings

This example focuses on the `Tabs` element. It keeps the screen small so the
active tab, controlled panels, and item actions are easy to review.

## States

- idle*

## Layout: desktop

### L-Page Settings page

- stack
- gap: md

#### Items

- E-PageTitle
- E-SettingsTabs
- L-ProfilePanel
- L-BillingPanel

### L-ProfilePanel Profile panel

- stack
- gap: sm

#### Items

- E-ProfileHeading
- E-ProfileEmail

### L-BillingPanel Billing panel

- stack
- gap: sm

#### Items

- E-BillingHeading
- E-BillingPlan

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Settings

### 2:E-SettingsTabs Tabs

- active: Profile
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab

### 3:E-ProfileHeading Heading

- level: 2
- label: Profile

### 4:E-ProfileEmail Text

- label: Email
- value: morgan@example.com

### 5:E-BillingHeading Heading

- level: 2
- label: Billing

### 6:E-BillingPlan Text

- label: Plan
- value: Team

## Actions

### A-SelectProfileTab Select profile tab

- From
  - idle

### A-SelectBillingTab Select billing tab

- From
  - idle
