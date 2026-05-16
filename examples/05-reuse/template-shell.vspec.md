---
id: TPL-MYPAGE-SHELL
type: template
title: Account Shell
owner: platform
locale: en
status: draft
---

# TPL-MYPAGE-SHELL Account Shell

## States

- ready*
- signing-out

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
- E-LogoutButton

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

- value: ${model.locale}
- initial value: en
- options:
  - English
  - Japanese

### 8:E-LogoutButton Button

- label: Sign out
- variant: secondary
- action: A-SignOut

### 9:E-Footer Text

- sample: MarkVSpec example gallery

### 10:E-EmptySlotMessage Paragraph

- sample: No content has been assigned to this template slot.

## Actions

### A1:A-SignOut Sign out

- Triggered
  - E-LogoutButton.click
- From
  - ready
- Process: HttpRequest
  - POST /logout
  - case: sent
    - state: signing-out
  - case: send-failed
    - state: ready

### A2:A-HandleSignOutResponse Handle sign out response

- Triggered
  - A-SignOut.response
- From
  - signing-out
- Process: HttpResponse
  - case: success
    - response: 204 signed out
    - navigate: SCR-LOGIN
  - case: failure
    - response: 5xx
    - state: ready
