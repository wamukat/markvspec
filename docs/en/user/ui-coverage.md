# UI Component and Screen Pattern Coverage

This page tracks what MarkVSpec can express for practical screen specifications.
It is intentionally not a design-system catalog. The goal is to know whether a
business screen can be written, previewed, printed, and handed to implementation
without falling back to ambiguous prose.

## Component Coverage

| Component | Status | MarkVSpec expression | Notes |
| --- | --- | --- | --- |
| Heading / paragraph / text | Supported | `Heading`, `Paragraph`, `Text` | Static text and sampled model-bound text are separated by `label`, `sample`, `src`, and `format`. |
| Form text input | Supported | `Input` | `value`, `initial value`, `placeholder`, input rules, and validation contracts are supported. Use `## Validations` for required checks. |
| Date / time / number input | Supported | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | Use `value: ${data.value}` with `initial value`, plus optional `min`, `max`, and `step` where applicable. |
| File input | Supported | `FileInput`, `FileUpload` | Use `accept`, `multiple`, `label`, and `sample` for constraints and helper text. |
| Button / link | Supported | `Button`, `Link` | `variant`, `tone`, `action`, `href`, and route params are supported. |
| Select / checkbox / radio group | Supported | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | Choice options use nested Markdown list items. Use `RadioGroup` for mutually exclusive value ranges, `CheckboxGroup` or `MultiSelect` for multiple values, and `Switch` for boolean settings. |
| Tabs | Supported | `Tabs` | `active` marks the local initial tab. Each item may reference a `panel: L-*` and an `action: A-*`; generated specs aggregate item labels and keep action links traceable. |
| Banner / badge | Supported | `Banner`, `Badge` | Use `tone` for semantic intent such as danger or success. |
| List / table | Supported | `List`, `Table` | Table columns and sample rows use nested Markdown lists. |
| Dialog / overlay | Supported | `Dialog` with targetless `display.element` | Dialogs are modal overlays by default. Define cancel/confirm buttons with `actions:` and show the dialog from a Preview Scenario or action case without a layout target. |
| Popover / Tooltip | Supported | `Popover`, `Tooltip` | Anchored non-modal help. `anchor` must reference `E-*`; `placement`, `text`, and visibility conditions are shown in preview and generated specs. Runtime hover/focus behavior and interactive popover content are outside the initial contract. |
| Accordion / Disclosure | Supported | `Accordion`, `Disclosure` | Local expanded/collapsed sections. `open` is element-local initial display state; panels reference `L-*` layout groups and optional actions remain traceable. |
| Toast notification | Supported | `Toast` with targetless `display.element` | Toasts are non-modal overlays. Use `message`, `tone`, `placement`, and `duration`; multiple displayed toasts stack in a toast region. |
| Spinner / loading mask | Supported | `Spinner` with state-visible overlay layout | Used for wait states and partial loading states. |
| Divider | Supported | `Divider` | Separates groups inside forms or detail screens. |
| Empty state | Supported | `Paragraph` with `visible when: empty` | Empty states are prose content tied to an empty state rather than a dedicated element type. |
| Breadcrumb | Alternative | `Link` elements in a row layout | Dedicated breadcrumb semantics are not yet defined. |
| Pagination | Alternative | Row layout with paging buttons and page text | Dedicated pagination element is not yet canonical. |
| Stepper | Planned | Not yet canonical | Needs current/completed/error step semantics. |
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
3. Add Stepper for multi-step applications after state-flow notation settles.

## Candidate Classification

These candidates are evaluated by screen-specification meaning, not by visual
popularity. A component should become canonical only when it carries state,
selection, expansion, overlay, progress, or navigation semantics that are hard to
review from generic Layout and Element combinations.

| Candidate | Classification | Decision | Reason |
| --- | --- | --- | --- |
| Menu / DropdownMenu / ActionMenu | Add candidate | Define canonical semantics | Menu item actions and open/closed overlay state are hard to see from a row of Buttons. |
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

## Element Syntax Notes

These notes collect implemented element syntax and candidate sketches that need
more design work. Implemented elements are marked in the surrounding text.

### Tabs

```markdown
### E-SettingsTabs Tabs

- active: Profile
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab
```

`Tabs` is implemented. The preview renders a tab strip, marks the active item,
and exposes the active panel reference. Generated specs aggregate tab items and
link item actions from Element Summary.

### Menu / DropdownMenu / ActionMenu

Candidate sketch:

```markdown
### E-RowActions ActionMenu

- label: More actions
- open when: ${view.openActionMenuRowId} == ${data.row.id}
- items:
  - Edit: A-EditRow
  - Disable: A-DisableRow
```

Preview policy: render the trigger and list item actions. When the menu is open
in a Preview Scenario, show it as an anchored overlay.

### Popover / Tooltip

```markdown
### E-PasswordHelp Popover

- anchor: E-PasswordHelpButton
- placement: bottom-start
- visible when: help-open
- text: Password must be at least 12 characters.
```

`Popover` and `Tooltip` are implemented. Preview renders them as anchored
non-modal help and exposes anchor, placement, visibility, and text in Display
Content Spec. Tooltip hover/focus runtime behavior and interactive Popover
content are intentionally out of scope.

### Accordion / Disclosure

```markdown
### E-AdvancedFilters Accordion

- open: Advanced filters
- items:
  - Advanced filters
    - panel: L-AdvancedFilterPanel
    - action: A-ToggleAdvancedFilters
  - Saved filters
    - panel: L-SavedFiltersPanel
```

```markdown
### E-ShippingDetails Disclosure

- label: Shipping details
- open: true
- panel: L-ShippingDetailsPanel
- action: A-ToggleShippingDetails
```

`Accordion` and `Disclosure` are implemented. Preview renders headers and open
panel references. Display Content Spec aggregates panel/action links so local
expansion behavior stays separate from screen state.

### ProgressBar

```markdown
### E-UploadProgress ProgressBar

- value: ${data.upload.percent}
- max: 100
- tone: info
```

Preview policy: render a low-fidelity bar and show value/max/source in Display
Content Spec.

### Stepper

```markdown
### E-ApplicationSteps Stepper

- value: ${view.currentStep}
- items:
  - Profile: profile
  - Confirm: confirm
  - Complete: complete
```

Preview policy: render current/completed/pending/error states from View Context
or model values and summarize each step.

### Breadcrumb

```markdown
### E-AccountBreadcrumb Breadcrumb

- items:
  - Accounts: SCR-ACCOUNT-LIST
  - Account detail
```

Preview policy: render a compact path and expose navigable items separately from
the current item.

### Pagination

```markdown
### E-SearchPagination Pagination

- page: ${data.search.page}
- total pages: ${data.search.totalPages}
- page size: ${data.search.pageSize}
- previous action: A-PreviousPage
- next action: A-NextPage
```

Preview policy: render previous/next controls, current page, total pages, and
page-size information. Keep page-changing actions visible in Action Summary.

## Example Plan

- Add a search-list Pagination example only after the row-layout alternative
  becomes too noisy in generated Input/Display/Action specs.
- Add a broader overlay example that compares Dialog, Toast, Popover, and
  Tooltip after more overlay usage repeats.
- Add Stepper examples together with View Context samples because step position
  may need non-state UI mode values.
- Keep Skeleton, Card, Toolbar, SearchBox, EmptyState, and Avatar as examples of
  Layout/content patterns rather than canonical Element additions for now.
