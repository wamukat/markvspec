# UI Component and Screen Pattern Coverage

## Position

This page is a user-facing inventory of the UI components and screen patterns
that MarkVSpec can express in the current release. It is not a design-system
catalog. Use it to decide whether a business screen can be authored, previewed,
printed, and handed to implementation without falling back to ambiguous prose.

For exact syntax, use the [DSL Reference](dsl.md). For complete source files,
use the [Example Gallery](example-gallery.md).

## Component Coverage

| Component | Status | MarkVSpec expression | Notes |
| --- | --- | --- | --- |
| Heading / paragraph / text | Supported | `Heading`, `Paragraph`, `Text` | Static wording and sampled data-backed text are separated by `label`, `sample`, `src`, and `format`. |
| Form text input | Supported | `Input` | `value`, `initial value`, `placeholder`, input rules, and validation contracts are supported. Use `## Validations` for required checks. |
| Date / time / number input | Supported | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | Use `value` as an opaque source, `initial value`, and optional `min`, `max`, and `step` where applicable. |
| File input | Supported | `FileInput`, `FileUpload` | Use `accept`, `multiple`, `label`, and `sample` for constraints and helper text. |
| Button / link | Supported | `Button`, `Link` | `variant`, `tone`, `action`, `href`, and route params are supported. |
| Select / checkbox / radio group | Supported | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | Choice options use nested Markdown list items. Use `RadioGroup` for mutually exclusive value ranges, `CheckboxGroup` or `MultiSelect` for multiple values, and `Switch` for boolean settings. |
| Tabs | Supported | `Tabs` | Local tab selection. Each item may reference `panel: L-*`, `active when`, and `action: A-*`; preview renders the active panel layout inside the tab element. |
| Banner / badge | Supported | `Banner`, `Badge` | Use `tone` for semantic intent such as danger or success. |
| List / table | Supported | `List`, `Table` | Table columns and sample rows use nested Markdown lists. |
| Dialog / overlay | Supported | `Dialog` with targetless `display.element` | Dialogs are modal overlays by default. Define cancel/confirm buttons with `actions:` and show the dialog from a Preview Scenario or action case without a layout target. |
| Popover / Tooltip | Supported | `Popover`, `Tooltip` | Anchored non-modal help. `anchor` must reference `E-*`; `placement`, `text`, and visibility conditions are shown in preview and generated specs. Runtime hover/focus behavior and interactive popover content are outside the current contract. |
| Accordion / Disclosure | Supported | `Accordion`, `Disclosure` | Local expanded/collapsed sections. `open when` controls which panel layout is rendered in matching preview states; optional actions remain traceable. |
| Action menu | Supported | `ActionMenu` | Action-only menu for row actions and three-dot menus. `open when` controls overlay display. Each item requires `action: A-*`; optional `tone` and `disabled when` stay visible in specs. Generic `Menu`, selection menus, and nested menus are not part of this contract. |
| Toast notification | Supported | `Toast` with targetless `display.element` | Toasts are non-modal overlays. Use `message`, `tone`, `placement`, and `duration`; multiple displayed toasts stack in a toast region. |
| Spinner / loading mask | Supported | `Spinner` with state-visible overlay layout | Used for wait states and partial loading states. |
| Divider | Supported | `Divider` | Separates groups inside forms or detail screens. |
| Empty state | Supported | `Paragraph` with `visible when` | Empty states are prose content tied to an empty state rather than a dedicated element type. |
| Breadcrumb | Alternative | `Link` elements in a row layout | Dedicated breadcrumb semantics are not yet defined. |
| Pagination | Alternative | Row layout with paging buttons and page text | Dedicated pagination element is not yet canonical. |
| Stepper | Planned | Not yet canonical | Needs current/completed/error step semantics. |
| ProgressBar | Planned | Not yet canonical | Determinate progress needs value/max/tone semantics that Spinner cannot express. |
| Skeleton | Alternative | `Spinner`, `Text`, or placeholder layouts | Dedicated skeleton semantics are not yet defined. |

## Screen Pattern Coverage

| Pattern | Status | Recommended expression |
| --- | --- | --- |
| Search/list screen | Supported | Toolbar layout, `Table`, empty-state `Paragraph`, paging buttons, `fetching` and `fetch-error` states. |
| Detail screen | Supported | Stack/grid layouts, `Badge`, `List`, read-only text, and optional dialog actions. |
| Edit form | Supported | `Input`, `DateInput`, `TimeInput`, `NumberInput`, `Textarea`, `FileInput`, `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `DatePicker`, `FileUpload`, validation feedback, save lifecycle actions. |
| Confirmation flow | Supported | `Dialog`, targetless `display.element`, confirm/cancel actions, danger tone. |
| Save feedback | Supported | `Toast`, targetless `display.element`, success/error tones, and Error Codes with `display: toast`. |
| Approval flow | Alternative | Detail/edit patterns with explicit actions and rules. |
| History/audit trail | Supported | `Table` or `List` with sampled rows. |
| Permission-dependent display | Alternative | `visible when` / `hidden when` with semantic role conditions. |
| Async partial update | Supported | Named request processes, partial documents, `display.target`, and partial render states. |
| Error recovery | Supported | Error state, retry action, and display outcome. |

## Priority Gaps

1. Add canonical Breadcrumb semantics when route hierarchy and current-page
   handling become important.
2. Add Pagination only if the row-layout alternative becomes too repetitive.
3. Add ProgressBar when determinate progress appears in real examples.
4. Add Stepper for multi-step applications after state-flow and View Context
   notation settle.

## Candidate Classification

These candidates are evaluated by screen-specification meaning, not by visual
popularity. A component should become canonical only when it carries state,
selection, expansion, overlay, progress, or navigation semantics that are hard to
review from generic Layout and Element combinations.

| Candidate | Classification | Decision | Reason |
| --- | --- | --- | --- |
| Menu / DropdownMenu | Add candidate | Define canonical semantics later | Generic navigation and selection menus still need semantics beyond the action-only `ActionMenu`. |
| ProgressBar | Add candidate | Define canonical semantics | Determinate progress has value/max/tone semantics that Spinner cannot express. |
| Stepper | Add candidate | Define canonical semantics | Multi-step flows need current/completed/error step summaries. |
| Breadcrumb | Add candidate | Define canonical semantics | Hierarchical navigation needs current item and destination summaries. |
| Pagination | Add candidate | Define canonical semantics | Search/list screens repeatedly need page, total, next, previous, and page-size actions. |
| Skeleton | Layout pattern | Do not add as an Element yet | Loading placeholders are usually layout variants unless a project needs named skeleton regions. |
| Card | Layout pattern | Keep as Layout variant | It is a container style, not a separate screen object. |
| Toolbar | Layout pattern | Keep as Layout with Button/Link children | Actions remain clearer as ordinary Elements in a row. |
| SearchBox | Layout pattern | Keep as Input + Button + Action | It is a composition of supported form and action primitives. |
| EmptyState | Layout/content pattern | Keep as Paragraph/Banner with visibility | Empty states are authored content tied to state or scenario. |
| Avatar | Layout/content pattern | Keep as Image + Text | The image and label are independently reviewable. |
| Chart / Map / RichTextEditor / Calendar / TreeView | Custom/domain-specific | Use `custom:*` until a concrete need repeats | These depend heavily on domain and product interaction details. |

## Implemented Element Syntax

### Tabs

Use `Tabs` when the screen has a local tab strip and each tab controls a panel
or action. `panel: L-*` is rendered as controlled content inside the active tab.

```markdown
### E-SettingsTabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile-tab
    - active when: ${route.hash} = profile
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - active when: billing-tab
    - active when: ${route.hash} = billing
    - action: A-SelectBillingTab
```

Preview renders a tab strip, marks the active item, and expands the active
panel layout. Generated specs aggregate tab items and link item actions from
Element Summary. If no `active when` matches, preview falls back to legacy
`active`, then to the first item.
`${route.hash}` can select a tab for a direct-link scenario such as
`/settings/tabs#billing`; comparisons omit the leading `#`.

Inactive `panel: L-*` layouts are still controlled by the Tabs element, but
State Views only lists the panel layout that is active in the current view. The
active panel row shows a compact `(via: E-*)` line in the Marker/ID cell so the
controlling element remains traceable, and its Condition cell is shown as
`controlled content` instead of `always`. Inactive controlled panels are omitted
from the State View tables and are not marked `not placed in current layout`.

Example: [Tabs Settings](../../../examples/04-real-world-screens/tabs-settings.vspec.md).
Generated HTML: [tabs-settings.html](https://wamukat.github.io/markvspec/examples/tabs-settings.html).

### Popover / Tooltip

Use `Popover` or `Tooltip` for anchored, non-modal help. The anchor must be an
existing `E-*` element.

```markdown
### E-PasswordHelp Popover

- anchor: E-PasswordHelpButton
- placement: bottom-start
- visible when: help-open
- text: Password must be at least 12 characters.
```

Preview renders anchored help and exposes anchor, placement, visibility, and
text in Display Content Spec. Tooltip hover/focus runtime behavior and
interactive Popover content are intentionally out of scope.

Example: [Anchored Help](../../../examples/04-real-world-screens/anchored-help.vspec.md).
Generated HTML: [anchored-help.html](https://wamukat.github.io/markvspec/examples/anchored-help.html).

### Accordion / Disclosure

Use `Accordion` when one element owns multiple expandable sections. Use
`Disclosure` when one trigger controls one panel. `panel: L-*` is rendered as
controlled content inside the open section.

```markdown
### E-AdvancedFilters Accordion

- items:
  - Advanced filters
    - panel: L-AdvancedFilterPanel
    - open when: advanced-filters-open
    - action: A-ToggleAdvancedFilters
  - Saved filters
    - panel: L-SavedFiltersPanel
    - open when: saved-filters-open
```

```markdown
### E-ShippingDetails Disclosure

- label: Shipping details
- open when: shipping-details-open
- panel: L-ShippingDetailsPanel
- action: A-ToggleShippingDetails
```

Preview renders headers and open panel layouts. Display Content Spec
aggregates panel/action links so local expansion behavior stays separate from
screen state. If no `open when` matches, preview falls back to legacy `open`.

Closed `panel: L-*` layouts are still controlled content, but State Views only
lists the panel layout that is open in the current view. The open panel row
shows a compact `(via: E-*)` line in the Marker/ID cell, and its Condition cell
is shown as `controlled content` instead of `always`. Closed controlled panels
are omitted from the State View tables and are not marked `not placed in current
layout`; that marker is reserved for layouts with no current placement or
controlled component reference.

Example: [Accordion Disclosure](../../../examples/04-real-world-screens/accordion-disclosure.vspec.md).
Generated HTML: [accordion-disclosure.html](https://wamukat.github.io/markvspec/examples/accordion-disclosure.html).

### ActionMenu

Use `ActionMenu` for action-only menus such as row actions and three-dot menus.
Do not use it for selection menus, nested navigation menus, or generic
dropdowns.

```markdown
### E-RowActions ActionMenu

- label: More actions
- placement: bottom-end
- open when: menu-open
- items:
  - Edit
    - action: A-EditRow
  - Disable
    - action: A-DisableRow
    - tone: danger
    - disabled when: menu-open-locked
```

Preview renders the trigger and, when `open when` matches, an anchored item list.
Display Content Spec aggregates item labels, action links, tones, and disabled
conditions.

Example: [Action Menu](../../../examples/04-real-world-screens/action-menu.vspec.md).
Generated HTML: [action-menu.html](https://wamukat.github.io/markvspec/examples/action-menu.html).

## Candidate Notes

Candidate components in this section are not canonical syntax. Keep them as
ordinary layouts, text, buttons, links, and visibility conditions until a
dedicated ticket defines parser, validator, preview, generated document, and
example behavior.

- `Menu` / `DropdownMenu`: use ordinary `Button` / `Link` elements or
  `ActionMenu` only when every item is an action.
- `ProgressBar`: use `Spinner` or text status until determinate progress is
  implemented.
- `Stepper`: describe the current step with supported headings, text, and
  action buttons until step semantics are implemented.
- `Breadcrumb`: use row layout with `Link` elements.
- `Pagination`: use row layout with previous/next buttons and page text.

## Example Guidance

- Focused examples for Tabs, Popover / Tooltip, Accordion / Disclosure, and
  ActionMenu are listed in the [Example Gallery](example-gallery.md).
- Pagination should stay in examples as a row-layout pattern until the
  alternative becomes too noisy in generated specs.
- A broader overlay example that compares Dialog, Toast, Popover, and Tooltip
  can be added later if overlay usage repeats.
- Skeleton, Card, Toolbar, SearchBox, EmptyState, and Avatar should stay as
  Layout/content patterns rather than canonical Elements for now.
