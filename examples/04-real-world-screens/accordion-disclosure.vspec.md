---
id: SCR-ACCORDION-DISCLOSURE
type: screen
title: Accordion Disclosure
route: /settings/advanced
locale: en
---

# SCR-ACCORDION-DISCLOSURE Accordion Disclosure

Focused example for `Accordion` and `Disclosure` Elements. It keeps the screen
small so open sections, panel references, and optional actions are easy to
review without introducing screen states for local UI expansion.

## States

- idle*

## Layout: desktop

### L-Page Advanced settings page

- stack
- gap: md

#### Items

- E-PageTitle
- E-AdvancedFilters
- L-AdvancedFilterPanel
- L-SavedFiltersPanel
- E-ShippingDetails
- L-ShippingDetailsPanel

### L-AdvancedFilterPanel Advanced filter panel

- stack
- gap: sm

#### Items

- E-StatusFilter
- E-DateRange

### L-SavedFiltersPanel Saved filters panel

- stack
- gap: sm

#### Items

- E-SavedFilterName

### L-ShippingDetailsPanel Shipping details panel

- stack
- gap: sm

#### Items

- E-ShippingAddress
- E-ShippingMethod

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Advanced settings

### 2:E-AdvancedFilters Accordion

- open: Advanced filters
- items:
  - Advanced filters
    - panel: L-AdvancedFilterPanel
    - action: A-ToggleAdvancedFilters
  - Saved filters
    - panel: L-SavedFiltersPanel

### 3:E-StatusFilter Text

- label: Status
- value: Active

### 4:E-DateRange Text

- label: Date range
- value: Last 30 days

### 5:E-SavedFilterName Text

- label: Saved filter
- value: Monthly review

### 6:E-ShippingDetails Disclosure

- label: Shipping details
- open: true
- panel: L-ShippingDetailsPanel
- action: A-ToggleShippingDetails

### 7:E-ShippingAddress Text

- label: Address
- value: 1 Market Street

### 8:E-ShippingMethod Text

- label: Method
- value: Standard shipping

## Actions

### A-ToggleAdvancedFilters Toggle advanced filters

- From
  - idle

### A-ToggleShippingDetails Toggle shipping details

- From
  - idle
