---
id: SCR-SOURCE-KIND-METADATA
type: screen
title: Source Kind Metadata
route: /members/:memberId/source-kind
locale: en
---

# SCR-SOURCE-KIND-METADATA Source Kind Metadata

This example focuses on property-level display value metadata. Read the nested
`kind`, `source`, and `format` bullets as Display Content Spec metadata for each
displayed value; the property value itself is the baseline preview sample.

## States

- loaded*

## Layout: desktop

### L1:L-Page Source kind page

- stack
- gap: md

#### Items

- E-Title
- L-ProfileSummary
- L-OrderSummary
- L-ReferenceLinks
- E-RoleSelect
- E-SaveButton

### L2:L-ProfileSummary Profile summary

- grid
- columns: 2
- gap: sm

#### Items

- E-Avatar
- E-MemberId
- E-DisplayName
- E-EmailInput
- E-ConfirmEmail

### L3:L-OrderSummary Order summary

- stack
- gap: sm

#### Items

- E-Subtotal
- E-RenewalDate
- E-LineItems

### L4:L-ReferenceLinks Reference links

- row
- gap: sm

#### Items

- E-StatusLink
- E-HelpLink

## Elements

### 1:E-Title Heading

- level: 1
- label: Member source kinds
  - kind: i18n

### 2:E-Avatar Image

- src: /assets/member-avatar.png
  - kind: asset
  - source: asset catalog: member-avatar
- alt: Current member avatar
  - kind: i18n

### 3:E-MemberId Text

- label: Member ID
  - kind: i18n
- value: M-100
  - kind: route
  - source: ${route.memberId}

### 4:E-DisplayName Text

- label: Display name
  - kind: i18n
- value: Morgan Lee
  - kind: data
  - source: ${data.member.displayName}

### 5:E-EmailInput Input

- label: Email address
  - kind: i18n
- type: email
- value: morgan@example.com
  - kind: data
- placeholder: name@example.com
  - kind: i18n

### 6:E-ConfirmEmail Text

- label: Confirmation email
  - kind: i18n
- value: E-EmailInput.value
  - kind: element
  - source: E-EmailInput.value

### 7:E-Subtotal Text

- label: Subtotal
  - kind: i18n
- value: USD 128.40
  - kind: computed
  - source: ${data.invoice.subtotalCents} formatted as currency
  - format: currency USD

### 8:E-RenewalDate Text

- label: Renewal reminder
  - kind: i18n
- value: 2026/05/25
  - kind: computed
  - source: ${data.subscription.renewalDate} - 7 days
  - format: date yyyy/MM/dd

### 9:E-LineItems Table

- label: Line items
  - kind: i18n
- Columns:
  - item: Item
  - amount: Amount

### 10:E-RoleSelect Select

- label: Role
  - kind: i18n
- value: member
  - kind: data
  - source: ${data.member.role}
- options:
  - Member
    - kind: i18n
  - Administrator
    - kind: i18n

### 11:E-StatusLink Link

- label: Status page
  - kind: i18n
- href: https://status.example.com
  - kind: external
  - source: external status page URL

### 12:E-HelpLink Link

- label: Help center
  - kind: i18n
- href: /help/members
  - kind: route
  - source: application help route

### 13:E-SaveButton Button

- label: Save changes
  - kind: i18n
- variant: primary

## Preview Scenarios

### loaded

- samples:
  - E-DisplayName: Taylor Stone
  - E-EmailInput: taylor@example.com
  - E-Subtotal: USD 240.00
  - E-RoleSelect: administrator
