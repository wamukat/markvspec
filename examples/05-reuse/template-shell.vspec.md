---
id: TPL-MYPAGE-SHELL
type: template
title: Account Shell
locale: en
---

# TPL-MYPAGE-SHELL Account Shell

This template teaches reusable shell structure. Read the `type: template`
metadata, navigation frame, top bar, language select, and `content` slot
placeholder; screen-specific states, scenario samples, and business actions
belong to the screens that use the template.

## States

- idle*

## Layout: desktop

### L1:L-Shell Account shell

- row
- gap: lg

#### Items

- L-Sidebar
- L-MainColumn

### L2:L-Sidebar Sidebar

- stack
- variant: navigation

#### Items

- E-Brand
- E-HomeLink
- E-ProfileLink
- E-BillingLink
- E-SupportLink

### L3:L-MainColumn Main column

- stack
- gap: md

#### Items

- L-TopBar
- slot: content
- E-Footer

### L4:L-TopBar Top bar

- row
- align: between

#### Items

- E-SectionTitle
- E-LanguageSelect

## Slots

### content Main content

- required
- default: E-EmptySlotMessage

## Elements

### 1:E-Brand Heading

- level: 2
- label: MarkVSpec Account

### 2:E-HomeLink Link

- label: Home
- href: /mypage

### 3:E-ProfileLink Link

- label: Profile
- href: /mypage/profile

### 4:E-BillingLink Link

- label: Billing
- href: /mypage/billing

### 5:E-SupportLink Link

- label: Support
- href: /mypage/support

### 6:E-SectionTitle Heading

- level: 1
- label: Account workspace

### 7:E-LanguageSelect Select

- initial value: en
- options:
  - English
  - Japanese

### 8:E-Footer Text

- text: MarkVSpec example gallery

### 9:E-EmptySlotMessage Paragraph

- text: No content has been assigned to this template slot.
