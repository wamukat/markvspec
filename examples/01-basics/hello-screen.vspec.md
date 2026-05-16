---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
owner: docs
locale: en
viewport: mobile
status: draft
---

# SCR-HELLO Hello Screen

This example teaches the smallest useful MarkVSpec document: one screen, one state,
one viewport, a layout, two elements, and a button marker.

## States

- idle*

## Layout: mobile

### L1:L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Lead
- E-ContinueButton

## Elements

### 1:E-Title Heading

- level: 1
- label: Hello MarkVSpec

### 2:E-Lead Paragraph

- sample: This is the minimum screen specification that still renders a useful preview.

### 3:E-ContinueButton Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A1:A-Continue Continue

This example keeps the action intentionally small so the marker appears in the
wireframe and Action Details without introducing request handling.

- Triggered
  - E-ContinueButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - navigate: SCR-NEXT
