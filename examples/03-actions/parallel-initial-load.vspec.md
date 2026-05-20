---
id: SCR-PARALLEL-INITIAL-LOAD
type: screen
title: Parallel Initial Load
route: /dashboard
locale: en
---

# SCR-PARALLEL-INITIAL-LOAD Parallel Initial Load

This example teaches parallel initial loading. Read the grouped server processes,
response handler, and final ready/failed state decision; it avoids user input so
the ordering and final state decision are clear.

## States

- before-load+
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

## Events

- page.load: A-InitialLoad

## Actions

### A1:A-InitialLoad Initial dashboard load

- From
  - before-load
- Process P0: Start initial loading
  - state: initializing
- Process P1: Call server service
  - group: initial-load
  - server:
    - MemberQueryService.findSelfProfile()
  - result:
    - member profile load request
  - case: sent
    - description: member profile request sent
    - continue
- Process P2: Call server service
  - group: initial-load
  - server:
    - PointQueryService.findSelfPoints()
  - result:
    - points load request
  - case: sent
    - description: points request sent
    - continue

### A2:A-HandleInitialLoadResponse Handle initial load response

- From
  - initializing
- Process P1: Apply initial load responses
  - receive:
    - response: A-InitialLoad.P1.response
    - response: A-InitialLoad.P2.response
  - case: ready
    - response: profile and points loaded
    - state: idle
    - stop
  - case: failed
    - response: one or more calls failed
    - state: initialize-error
    - stop
