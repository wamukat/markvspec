---
id: SCR-PARALLEL-INITIAL-LOAD
type: screen
title: Parallel Initial Load
route: /dashboard
locale: en
---

# SCR-PARALLEL-INITIAL-LOAD Parallel Initial Load

This example teaches parallel initial loading. Read the grouped server processes,
response cases, and final `Process P3: Resolve grouped processes`
step; it avoids user input so the ordering and final state decision are clear.

## States

- initializing*
- idle
- initialize-error

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

- source: data
- sample: Taylor Stone

### 3:E-PointsBalance Text

- source: data
- sample: 12,400 points

### 4:E-LoadErrorBanner Banner

- tone: danger
- text: Dashboard data could not be loaded.
- visible when: initialize-error

## Actions

### A1:A-InitialLoad Initial dashboard load

- Triggered
  - screen.load
- From
  - initializing
- Process P1: Call server service
  - group: initial-load
  - server:
    - MemberQueryService.findSelfProfile()
  - result:
    - member profile load result
  - case: success
    - description: 200 member profile
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process P2: Call server service
  - group: initial-load
  - server:
    - PointQueryService.findSelfPoints()
  - result:
    - points load result
  - case: success
    - description: 200 points
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process P3: Resolve grouped processes
  - group: initial-load
  - receive:
    - profile: A-InitialLoad.P1.result
    - points: A-InitialLoad.P2.result
  - case: ready
    - description: profile and points loaded
    - Effects
      - state: idle
    - stop
  - case: failed
    - description: one or more calls failed
    - Effects
      - state: initialize-error
    - stop
