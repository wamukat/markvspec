---
id: TPL-RESPONSIVE-SHELL
type: template
title: Responsive Shell
locale: en
---

# TPL-RESPONSIVE-SHELL Responsive Shell

This template teaches viewport-specific slot insertion points. It defines mobile
and desktop shells that both render the same `content` slot, allowing screens to
provide viewport-specific slot content when needed.

## States

- idle*

## Layout: mobile

### L1:L-MobileShell Mobile shell

- stack
- gap: md

#### Items

- E-MobileBrand
- slot: content

## Layout: desktop

### L2:L-DesktopShell Desktop shell

- row
- gap: lg

#### Items

- L-DesktopNav
- slot: content

### L3:L-DesktopNav Desktop nav

- stack
- variant: navigation

#### Items

- E-DesktopBrand
- E-OverviewLink
- E-SettingsLink

## Slots

### content Main content

- required
- default: E-ResponsiveDefaultMessage

## Elements

### 1:E-MobileBrand Heading

- level: 2
- label: Mobile Account

### 2:E-DesktopBrand Heading

- level: 2
- label: Desktop Account

### 3:E-OverviewLink Link

- label: Overview
- href: /account

### 4:E-SettingsLink Link

- label: Settings
- href: /account/settings

### 5:E-ResponsiveDefaultMessage Paragraph

- text: Responsive shell default content.
