---
id: SCR-PROFILE-HOME
type: screen
title: Profile Home
route: /members/:memberId
owner: docs
locale: en
viewport: desktop
status: draft
template:
  id: TPL-MYPAGE-SHELL
  src: ./template-shell.vspec.md
references:
  partials:
    PRT-PROFILE-SUMMARY: ./profile-summary.partial.vspec.md
---

# SCR-PROFILE-HOME Profile Home

This example teaches how a screen uses a template slot and a referenced partial.
It also demonstrates route parameters through `${route.memberId}`.

## States

- idle*
- refreshing
- refresh-error

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
    - refreshing: loading
    - refresh-error: load-error

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
- sample: Profile summary could not be refreshed.
- visible when: refresh-error

## Actions

### A1:A-RefreshProfile Refresh profile partial

- Triggered
  - E-RefreshProfileButton.click
- From
  - idle
  - refresh-error
- Process P1: Refresh partial content
  - request: GET /members/${route.memberId}/profile-summary
  - params:
    - memberId: ${route.memberId}
  - partial: PRT-PROFILE-SUMMARY
  - case: sent
    - response: request accepted
    - Effects
      - state: refreshing
      - display:
        - target: L-ProfileSummaryHost
        - content:
          - partial: PRT-PROFILE-SUMMARY
          - state: loading
      - stop
  - case: send-failed
    - response: network error
    - state: refresh-error
    - stop

### A2:A-HandleProfileSummaryResponse Handle profile summary response

- Triggered
  - A-RefreshProfile.P1.response
- From
  - refreshing
- Process P1: PartialResponse
  - case: success
    - response: 200 partial HTML
    - state: idle
    - display:
      - target: L-ProfileSummaryHost
      - content: PRT-PROFILE-SUMMARY
    - stop
  - case: failure
    - response: 5xx or timeout
    - state: refresh-error
    - stop
