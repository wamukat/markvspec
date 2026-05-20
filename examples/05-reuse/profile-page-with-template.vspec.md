---
id: SCR-PROFILE-HOME
type: screen
title: Profile Home
route: /members/:memberId
locale: en
template:
  id: TPL-MYPAGE-SHELL
  src: ./template-shell.vspec.md
references:
  partials:
    PRT-PROFILE-SUMMARY: ./profile-summary.partial.vspec.md
---

# SCR-PROFILE-HOME Profile Home

This example teaches how a screen fills a template slot and references a partial.
Read front matter `template`/`references.partials`, `## Slot: content`, route
parameters, the `L-*` partial host contract, and response-side `display`
updates; the reusable shell itself is defined in the template example.

## States

- idle*
- fetching
- fetch-error

## Slot: content

### L1:L-ProfileContent Profile content

- stack
- gap: md

#### Items

- E-ProfileTitle
- E-MemberIdText
- L-ProfileSummaryHost
- E-RefreshProfileButton
- E-RefreshErrorBanner

### L2:L-ProfileSummaryHost Profile summary host

- stack
- partial:
  - id: PRT-PROFILE-SUMMARY
  - states:
    - idle: loaded
    - fetching: fetching
    - fetch-error: fetch-error

## Elements

### 1:E-ProfileTitle Heading

- level: 1
- value: Profile

### 2:E-MemberIdText Text

- value: Member ID ${route.memberId}
- route param memberId: ${route.memberId}

### 3:E-RefreshProfileButton Button

- label: Refresh profile
- action: A-RefreshProfile

### 4:E-RefreshErrorBanner Banner

- tone: danger
- text: Profile summary could not be refreshed.
- visible when: fetch-error

## Actions

### A1:A-RefreshProfile Refresh profile partial

- From
  - idle
  - fetch-error
- Process P1: Refresh partial content
  - request:
    - method: GET
    - path: /members/:memberId/profile-summary
    - params:
      - memberId: ${route.memberId}
  - case: sent
    - description: request accepted
    - state: fetching
    - stop
  - case: send-failed
    - description: network error
    - state: fetch-error
    - stop

### A2:A-HandleProfileSummaryResponse Handle profile summary response

- From
  - fetching
- Process P1: PartialResponse
  - receive:
    - response: A-RefreshProfile.P1.response
  - case: success
    - response: 200 partial HTML
    - state: idle
    - display:
      - target: L-ProfileSummaryHost
      - partial: PRT-PROFILE-SUMMARY
    - stop
  - case: failure
    - response: 5xx or timeout
    - state: fetch-error
    - stop
