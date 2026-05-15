---
id: SCR-RESPONSIVE-PROFILE
type: screen
title: Responsive Profile
route: /profile
owner: docs
locale: en
viewport: mobile
status: draft
---

# SCR-RESPONSIVE-PROFILE Responsive Profile

This example teaches how the same elements can be arranged differently by
viewport while keeping state behavior shared.

## States

- idle*
- editing

## Layout: mobile

### L1:L-ProfilePage Profile page

- stack
- gap: md

#### Items

- E-Name
- E-RoleBadge
- E-Email
- E-EditButton
- E-SaveButton

## Layout: desktop

### L1:L-ProfilePage Profile page

- row
- gap: lg
- align: between

#### Items

- L-ProfileSummary
- L-ProfileActions

### L2:L-ProfileSummary Profile summary

- stack
- gap: sm

#### Items

- E-Name
- E-RoleBadge
- E-Email

### L3:L-ProfileActions Profile actions

- row
- gap: sm

#### Items

- E-EditButton
- E-SaveButton

## Elements

### 1:E-Name Heading

- level: 1
- label: Morgan Lee

### 2:E-RoleBadge Badge

- label: Administrator
- tone: info

### 3:E-Email Text

- value: morgan@example.com

### 4:E-EditButton Button

- label: Edit
- action: A-StartEdit
- visible when: idle

### 5:E-SaveButton Button

- label: Save
- variant: primary
- action: A-SaveProfile
- visible when: editing

## Actions

### A1:A-StartEdit Start edit

- Triggered
  - E-EditButton.click
- From
  - idle
- Process
  - ModelUpdate
    - ${model.profileMode}: editing
  - Transition
    - state: editing

### A2:A-SaveProfile Save profile

- Triggered
  - E-SaveButton.click
- From
  - editing
- Process
  - ServerCall
    - ProfileService.save()
      - email: ${model.email}
    - cases:
      - success:
        - state: idle
      - failure:
        - state: editing

