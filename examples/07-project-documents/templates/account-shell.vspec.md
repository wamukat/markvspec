---
id: TPL-ACCOUNT-SHELL
type: template
title: Account Shell
locale: en
references:
  partials:
    PRT-ACCOUNT-SUMMARY: ../partials/account-summary.partial.vspec.md
---

# TPL-ACCOUNT-SHELL Account Shell

Shared account shell used by the project preview example.

## States

- idle*

## Layout: desktop

### L1:L-Shell Account shell

- row
- gap: lg

#### Items

- L-Sidebar
- L-Main

### L2:L-Sidebar Sidebar

- stack
- variant: navigation

#### Items

- E-Brand
- E-DashboardLink
- E-SettingsLink

### L3:L-Main Main

- stack
- gap: md

#### Items

- E-SectionTitle
- slot: content

## Slots

### content Main content

- required

## Elements

### 1:E-Brand Heading

- level: 2
- label: Account Portal

### 2:E-DashboardLink Link

- label: Dashboard
- href: /account

### 3:E-SettingsLink Link

- label: Settings
- href: /account/settings

### 4:E-SectionTitle Heading

- level: 1
- label: Account area

