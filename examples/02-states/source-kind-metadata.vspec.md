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

### L-Page Source kind page

- stack
- gap: md

#### Items

- E-Title
- L-ProfileSummary
- L-OrderSummary
- L-ReferenceLinks
- E-RoleSelect
- E-SaveButton

### L-ProfileSummary Profile summary

- grid
- columns: 2
- gap: sm

#### Items

- E-Avatar
- E-MemberId
- E-DisplayName
- E-EmailInput
- E-ConfirmEmail

### L-OrderSummary Order summary

- stack
- gap: sm

#### Items

- E-Subtotal
- E-RenewalDate
- E-LineItems

### L-ReferenceLinks Reference links

- row
- gap: sm

#### Items

- E-StatusLink
- E-HelpLink

## Elements

### E-Title Heading

- level: 1
- label: Member source kinds
  - kind: i18n

### E-Avatar Image

- src: /assets/member-avatar.png
  - kind: asset
  - source: asset catalog: member-avatar
- alt: Current member avatar
  - kind: i18n

### E-MemberId Text

- label: Member ID
  - kind: i18n
- value: M-100
  - kind: route
  - source: ${route.memberId}

### E-DisplayName Text

- label: Display name
  - kind: i18n
- value: Morgan Lee
  - kind: data
  - source: ${data.member.displayName}

### E-EmailInput Input

- label: Email address
  - kind: i18n
- type: email
- value: morgan@example.com
  - kind: data
- placeholder: name@example.com
  - kind: i18n

### E-ConfirmEmail Text

- label: Confirmation email
  - kind: i18n
- value: E-EmailInput.value
  - kind: element
  - source: E-EmailInput.value

### E-Subtotal Text

- label: Subtotal
  - kind: i18n
- value: USD 128.40
  - kind: computed
  - source: ${data.invoice.subtotalCents} formatted as currency
  - format: currency USD

### E-RenewalDate Text

- label: Renewal reminder
  - kind: i18n
- value: 2026/05/25
  - kind: computed
  - source: ${data.subscription.renewalDate} - 7 days
  - format: date yyyy/MM/dd

### E-LineItems Table

- label: Line items
  - kind: i18n
- Columns:
  - item: Item
  - amount: Amount

### E-RoleSelect Select

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

### E-StatusLink Link

- label: Status page
  - kind: i18n
- href: https://status.example.com
  - kind: external
  - source: external status page URL

### E-HelpLink Link

- label: Help center
  - kind: i18n
- href: /help/members
  - kind: route
  - source: application help route

### E-SaveButton Button

- label: Save changes
  - kind: i18n
- variant: primary

## Preview Scenarios

### loaded-admin

- state: loaded
- samples:
  - E-DisplayName: Taylor Stone
  - E-EmailInput: taylor@example.com
  - E-Subtotal: USD 240.00
  - E-RoleSelect: administrator
