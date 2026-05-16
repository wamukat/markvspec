---
id: SCR-NOTICE-DETAIL
type: screen
title: Notice Detail
route: /notices/:noticeId
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-NOTICE-DETAIL Notice Detail

This example teaches Display Content Spec coverage. Read the fields that separate
UI wording, source paths, representative samples, machine values, formats, and
navigation parameters; actions are deliberately small so content/source mapping
is easy to inspect.

## States

- idle*
  - Notice data is available.

## Layout: desktop

### L1:L-Page Notice detail page

- stack
- gap: md

#### Items

- L-Header
- L-Metadata
- L-Body
- L-RelatedSearch
- L-Links

### L2:L-Header Header

- stack
- gap: sm

#### Items

- E-PageTitle
- E-NoticeTitle
- E-PriorityBadge

### L3:L-Metadata Metadata

- grid
- columns: 3
- gap: sm

#### Items

- "Published": E-PublishedAt
- "Refund": E-RefundAmount
- "Contact": E-ContactEmail

### L4:L-Body Body

- stack

#### Items

- E-NoticeBody

### L5:L-RelatedSearch Related notice search

- row
- gap: sm
- align: center

#### Items

- "Keyword": E-KeywordInput
- "Read status": E-ReadStatusSelect

### L6:L-Links Links

- row
- gap: md

#### Items

- E-RelatedInvoiceLink
- E-BackToListLink

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Notice detail
- label src: ${i18n.noticeDetail.heading}

### 2:E-NoticeTitle Heading

- level: 2
- sample: Emergency maintenance on May 20
- src: ${model.notice.title}

### 3:E-PriorityBadge Badge

- label: Priority
- sample: Important
- src: ${model.notice.priority}
- format: priority code to localized label

### 4:E-PublishedAt Text

- label: Published
- sample: 2026/05/01
- src: ${model.notice.publishedAt}
- format: date yyyy/MM/dd

### 5:E-RefundAmount Text

- label: Refund amount
- sample: USD 12.50
- src: ${model.notice.refundAmount}
- format: currency USD

### 6:E-ContactEmail Link

- label: Contact
- sample: support@example.com
- src: ${model.notice.contact.email}
- href: mailto:support@example.com

### 7:E-NoticeBody Paragraph

- sample: Service will be unavailable from 01:00 to 03:00 UTC while maintenance is performed.
- src: ${model.notice.body}
- format: markdown excerpt

### 8:E-KeywordInput Input

- label: Keyword
- label src: ${i18n.noticeList.keywordLabel}
- placeholder: Search related notices
- placeholder src: ${i18n.noticeList.keywordPlaceholder}
- value: ${model.search.keyword}
- initial value: maintenance
- width: medium

### 9:E-ReadStatusSelect Select

- label: Read status
- label src: ${i18n.noticeList.readStatusLabel}
- value: ${model.search.readStatus}
- initial value: Unread
- width: medium
- options:
  - Unread
  - Read
  - All

### 10:E-RelatedInvoiceLink Link

- label: View related invoice
- label src: ${i18n.noticeDetail.relatedInvoiceLink}
- sample: INV-2026-0421
- src: ${model.notice.invoiceNo}
- href: SCR-INVOICE-DETAIL
- params:
  - invoiceId: ${model.notice.invoiceId}

### 11:E-BackToListLink Link

- label: Back to notices
- label src: ${i18n.noticeDetail.backToListLink}
- href: SCR-NOTICE-LIST
- params:
  - keyword: ${model.search.keyword}
  - readStatus: ${model.search.readStatus}

## Business Rules

### R-NOTICE-001

- Use `sample` only for representative rendered values.
- Keep submitted or selected machine values in `value`.
- Put navigation parameter sources under `params`, not in display text.
