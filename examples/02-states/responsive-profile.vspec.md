---
id: SCR-RESPONSIVE-PROFILE
type: screen
title: Responsive Profile
route: /profile
locale: en
viewport: mobile
---

# SCR-RESPONSIVE-PROFILE Responsive Profile

This example teaches viewport-specific layout over shared elements. Read the
mobile and desktop `## Layout` variants and the shared `## Elements`; it keeps
state and actions minimal so the responsive structure is the main thing to
compare.

## States

- idle*

## Layout: mobile

### L1:L-ProfilePage Profile page

- stack
- gap: md

#### Items

- E-Name
- E-RoleBadge
- E-Email
- E-EditButton

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
