---
id: PRT-PROFILE-SUMMARY
type: partial
title: Profile Summary Partial
owner: docs
locale: en
viewport: desktop
status: draft
---

# PRT-PROFILE-SUMMARY Profile Summary Partial

This partial renders the profile summary block used inside the account shell
example.

## States

- loaded*
- loading
- load-error

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
- value: ${model.member.name}

### 2:E-ProfileRole Badge

- value: ${model.member.role}

### 3:E-ProfileEmail Text

- value: ${model.member.email}

### 4:E-ProfileError Banner

- tone: danger
- sample: Profile summary could not be loaded.
- visible when: load-error

## Actions

### A1:A-BuildProfileSummary Build profile summary

- Triggered
  - partial.render
- From
  - loading
- Process: ServerCall
  - MemberQueryService.findCurrent()
  - case: success
    - response: 200 member profile
    - Effects
      - model: ${model.member} = result.member
    - state: loaded
    - stop
  - case: failure
    - response: 5xx or timeout
    - state: load-error
    - stop
