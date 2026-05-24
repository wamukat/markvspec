---
id: SCR-ACCORDION-DISCLOSURE
type: screen
title: Accordion Disclosure
route: /settings/advanced
locale: en
---

# SCR-ACCORDION-DISCLOSURE Accordion Disclosure

Focused example for `Accordion` and `Disclosure` Elements. It keeps the screen
small so state changes can open one accordion item or the disclosure panel and
show the referenced panel content inside the controlling component.

## States

- advanced-filters-open*
- saved-filters-open
- shipping-details-open

## Layout: desktop

### L1:L-Page Advanced settings page

- stack
- gap: md

#### Items

- E-PageTitle
- E-AdvancedFilters
- E-ShippingDetails

### L2:L-AdvancedFilterPanel Advanced filter panel

- stack
- gap: sm

#### Items

- E-StatusFilter
- E-DateRange

### L3:L-SavedFiltersPanel Saved filters panel

- stack
- gap: sm

#### Items

- E-SavedFilterName

### L4:L-ShippingDetailsPanel Shipping details panel

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

- items:
  - Advanced filters
    - panel: L-AdvancedFilterPanel
    - open when: advanced-filters-open
    - action: A-ToggleAdvancedFilters
  - Saved filters
    - panel: L-SavedFiltersPanel
    - open when: saved-filters-open
    - action: A-OpenSavedFilters

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
- open when: shipping-details-open
- panel: L-ShippingDetailsPanel
- action: A-ToggleShippingDetails

### 7:E-ShippingAddress Text

- label: Address
- value: 1 Market Street

### 8:E-ShippingMethod Text

- label: Method
- value: Standard shipping

## Actions

### A1:A-ToggleAdvancedFilters Toggle advanced filters

#### From
- saved-filters-open
- shipping-details-open
#### P1: Process Toggle accordion item
- case: done
  - description: Advanced filters item opens L-AdvancedFilterPanel inside the accordion.
  - state: advanced-filters-open
  - stop

### A2:A-OpenSavedFilters Open saved filters

#### From
- advanced-filters-open
- shipping-details-open
#### P1: Process Toggle accordion item
- case: done
  - description: Saved filters item opens L-SavedFiltersPanel inside the accordion.
  - state: saved-filters-open
  - stop

### A3:A-ToggleShippingDetails Toggle shipping details

#### From
- advanced-filters-open
- saved-filters-open
#### P1: Process Toggle disclosure
- case: done
  - description: Shipping details disclosure opens L-ShippingDetailsPanel inside the disclosure.
  - state: shipping-details-open
  - stop
