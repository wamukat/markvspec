---
id: SCR-TABS-SETTINGS
type: screen
title: Tabs Settings
route: /settings/tabs
locale: en
---

# SCR-TABS-SETTINGS Tabs Settings

This example focuses on the `Tabs` element. It keeps the screen small so state
changes can switch the active tab and expand exactly one controlled panel.

## States

- profile-tab*
- billing-tab

## Layout: desktop

### L1:L-Page Settings page

- stack
- gap: md

#### Items

- E-PageTitle
- E-SettingsTabs

### L2:L-ProfilePanel Profile panel

- stack
- gap: sm

#### Items

- E-ProfileHeading
- E-ProfileEmail

### L3:L-BillingPanel Billing panel

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

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile-tab
    - active when: ${route.hash} = profile
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - active when: billing-tab
    - active when: ${route.hash} = billing
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

### A1:A-SelectProfileTab Select profile tab

#### From
- billing-tab
#### P1: Process Select tab item
- case: done
  - description: Profile tab is selected and L-ProfilePanel becomes the active panel.
  - state: profile-tab
  - stop

### A2:A-SelectBillingTab Select billing tab

#### From
- profile-tab
#### P1: Process Select tab item
- case: done
  - description: Billing tab is selected and L-BillingPanel becomes the active panel.
  - state: billing-tab
  - stop

## Preview Scenarios

### billing-direct-link

- state: billing-tab
- route:
  - hash: billing
