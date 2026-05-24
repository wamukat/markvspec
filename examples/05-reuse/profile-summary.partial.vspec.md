---
id: PRT-PROFILE-SUMMARY
type: partial
title: Profile Summary Partial
locale: en
---

# PRT-PROFILE-SUMMARY Profile Summary Partial

This partial teaches the `type: partial` document shape used inside a host
screen. Read the partial route, partial-local states, server-side load/build
action, and fields intended for template composition; full-page navigation and
global layout are handled by the host screen.

## States

- loaded*
- fetching
- fetch-error

## Layout: desktop

### L1:L-ProfileSummary Profile summary

- stack
- gap: sm

#### Items

- E-ProfileName
- E-ProfileRole
- E-ProfileEmail
- E-ProfileError

## Elements

### 1:E-ProfileName Heading

- level: 2
- source: data
- sample: Jane Doe

### 2:E-ProfileRole Badge

- source: data
- sample: Product Owner

### 3:E-ProfileEmail Text

- source: data
- sample: jane@example.com

### 4:E-ProfileError Banner

- tone: danger
- text: Profile summary could not be loaded.
- visible when: fetch-error

## Events

- partial.render: A-BuildProfileSummary

## Actions

### A1:A-BuildProfileSummary Build profile summary

#### From
- fetching
#### P1: Process Call server service
- server:
  - MemberQueryService.findCurrent()
- result:
  - current member profile result
- case: success
  - description: 200 member profile
  - state: loaded
  - stop
- case: failure
  - description: 5xx or timeout
  - state: fetch-error
  - stop
