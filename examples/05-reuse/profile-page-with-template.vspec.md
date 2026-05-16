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
- loading
- load-error

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
    - loading: loading
    - load-error: load-error

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
- visible when: load-error

## Actions

### A1:A-RefreshProfile Refresh profile partial

- Triggered
  - E-RefreshProfileButton.click
- From
  - idle
  - load-error
- Process P1: Refresh partial content
  - request: GET /members/${route.memberId}/profile-summary
  - params:
    - memberId: ${route.memberId}
  - partial: PRT-PROFILE-SUMMARY
  - case: sent
    - description: request accepted
    - Effects
      - state: loading
      - display:
        - target: L-ProfileContent
        - element: L-ProfileSummaryHost
    - stop
  - case: send-failed
    - description: network error
    - Effects
      - state: load-error
    - stop

### A2:A-HandleProfileSummaryResponse Handle profile summary response

- Triggered
  - A-RefreshProfile.P1.response
- From
  - loading
- Process P1: PartialResponse
  - receive:
    - response: A-RefreshProfile.P1.response
  - case: success
    - response: 200 partial HTML
    - Effects
      - state: idle
      - display:
        - target: L-ProfileContent
        - element: L-ProfileSummaryHost
    - stop
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error
    - stop
