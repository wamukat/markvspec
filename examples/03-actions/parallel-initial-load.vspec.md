---
id: SCR-PARALLEL-INITIAL-LOAD
type: screen
title: Parallel Initial Load
route: /dashboard
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-PARALLEL-INITIAL-LOAD Parallel Initial Load

This example teaches parallel process groups. Two server calls start together and
the `Process: Resolve` step owns the final state transition.

## States

- loading*
- idle
- load-error

## Layout: desktop

### L1:L-Dashboard Dashboard

- grid
- columns: 2
- gap: md

#### Items

- E-Title
- L-ProfilePanel
- L-PointsPanel
- E-LoadErrorBanner

### L2:L-ProfilePanel Profile panel

- stack

#### Items

- E-ProfileName

### L3:L-PointsPanel Points panel

- stack

#### Items

- E-PointsBalance

## Elements

### 1:E-Title Heading

- level: 1
- value: Dashboard

### 2:E-ProfileName Text

- value: ${model.memberProfile.name}

### 3:E-PointsBalance Text

- value: ${model.points.balance}

### 4:E-LoadErrorBanner Banner

- tone: danger
- sample: Dashboard data could not be loaded.
- visible when: load-error

## Actions

### A1:A-InitialLoad Initial dashboard load

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - group: initial-load
  - MemberQueryService.findSelfProfile()
  - case: success
    - response: 200 member profile
    - Effects
      - model: ${model.memberProfile.loaded} = true
      - model: ${model.memberProfile.name} = result.name
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.memberProfile.loaded} = false
    - continue
- Process: ServerCall
  - group: initial-load
  - PointQueryService.findSelfPoints()
  - case: success
    - response: 200 points
    - Effects
      - model: ${model.points.loaded} = true
      - model: ${model.points.balance} = result.balance
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.points.loaded} = false
    - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - response: profile and points loaded
    - state: idle
    - stop
  - case: failed
    - response: one or more calls failed
    - state: load-error
    - stop

## Model Samples

### idle

#### ${model.memberProfile}

- name: Taylor Stone
- loaded: true

#### ${model.points}

- balance: 12,400
- loaded: true
