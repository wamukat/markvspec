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

This example teaches Display Content Spec fields. It keeps UI wording, data
sources, representative samples, machine values, formats, and navigation
parameters visibly separate.

## States

- loaded*
  - Notice data is available.
- searching
  - A related-notice search request was sent.
- search-error
  - Related notices could not be searched.

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
- L-StatusArea

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
- disabled when: searching

#### Items

- "Keyword": E-KeywordInput
- "Read status": E-ReadStatusSelect
- E-SearchButton

### L6:L-Links Links

- row
- gap: md

#### Items

- E-RelatedInvoiceLink
- E-BackToListLink

### L7:L-StatusArea Status area

- stack

#### Items

- E-SearchingBanner
- E-SearchErrorBanner

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

### 10:E-SearchButton Button

- label: Search
- label src: ${i18n.noticeList.searchButton}
- variant: primary
- action: A-SearchRelatedNotices

### 11:E-RelatedInvoiceLink Link

- label: View related invoice
- label src: ${i18n.noticeDetail.relatedInvoiceLink}
- sample: INV-2026-0421
- src: ${model.notice.invoiceNo}
- href: SCR-INVOICE-DETAIL
- params:
  - invoiceId: ${model.notice.invoiceId}

### 12:E-BackToListLink Link

- label: Back to notices
- label src: ${i18n.noticeDetail.backToListLink}
- href: SCR-NOTICE-LIST
- params:
  - keyword: ${model.search.keyword}
  - readStatus: ${model.search.readStatus}

### 13:E-SearchingBanner Banner

- tone: info
- sample: Searching related notices.
- visible when: searching

### 14:E-SearchErrorBanner Banner

- tone: danger
- sample: Related notices could not be searched.
- visible when: search-error

## Actions

### A1:A-SearchRelatedNotices Search related notices

- Triggered
  - E-SearchButton.click
- From
  - loaded
  - search-error
- Process: ModelUpdate
  - Effects
    - model: ${model.search.keyword} = E-KeywordInput.value
    - model: ${model.search.readStatus} = E-ReadStatusSelect.value
- Process: HttpRequest
  - GET /notices
    - keyword: ${model.search.keyword}
    - readStatus: ${model.search.readStatus}
    - relatedTo: ${route.noticeId}
  - case: sent
    - state: searching
  - case: send-failed
    - state: search-error

### A2:A-HandleRelatedSearchResponse Handle related search response

- Triggered
  - A-SearchRelatedNotices.response
- From
  - searching
- Process: HttpResponse
  - case: success
    - response: 200 related notices
    - state: loaded
  - case: failure
    - response: 4xx or 5xx
    - state: search-error

## Business Rules

### R-NOTICE-001

- Use `sample` only for representative rendered values.
- Keep submitted or selected machine values in `value`.
- Put navigation parameter sources under `params`, not in display text.
