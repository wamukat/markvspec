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
| Date / time / number input | Supported | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | Use `value: ${model.value}` with `initial value`, plus optional `min`, `max`, and `step` where applicable. |
| File input | Supported | `FileInput`, `FileUpload` | Use `accept`, `multiple`, `label`, and `sample` for constraints and helper text. |
| Button / link | Supported | `Button`, `Link` | `variant`, `tone`, `action`, `href`, and route params are supported. |
| Select / checkbox / radio group | Supported | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | Choice options use nested Markdown list items. Use `RadioGroup` for mutually exclusive value ranges, `CheckboxGroup` or `MultiSelect` for multiple values, and `Switch` for boolean settings. |
| Banner / badge | Supported | `Banner`, `Badge` | Use `tone` for semantic intent such as danger or success. |
| List / table | Supported | `List`, `Table` | Table columns and sample rows use nested Markdown lists. |
| Dialog / overlay | Supported | `Dialog` with targetless `display.element` | Dialogs are modal overlays by default. Define cancel/confirm buttons with `actions:` and show the dialog from a Preview Scenario or action case without a layout target. |
| Toast notification | Supported | `Toast` with targetless `display.element` | Toasts are non-modal overlays. Use `message`, `tone`, `placement`, and `duration`; multiple displayed toasts stack in a toast region. |
| Spinner / loading mask | Supported | `Spinner` with state-visible overlay layout | Used for wait states and partial loading states. |
| Divider | Supported | `Divider` | Separates groups inside forms or detail screens. |
| Empty state | Supported | `Paragraph` with `visible when: empty` | Empty states are prose content tied to an empty state rather than a dedicated element type. |
| Breadcrumb | Alternative | `Link` elements in a row layout | Dedicated breadcrumb semantics are not yet defined. |
| Tabs | Alternative | `Button` or `Link` elements in a row layout | Dedicated selected-tab semantics are not yet defined. |
| Accordion | Planned | Not yet canonical | Needs expanded/collapsed state semantics. |
| Pagination | Alternative | Row layout with paging buttons and page text | Dedicated pagination element is not yet canonical. |
| Stepper | Planned | Not yet canonical | Needs current/completed/error step semantics. |
| Skeleton | Alternative | `Spinner`, `Text`, or placeholder layouts | Dedicated skeleton semantics are not yet defined. |

## Screen Pattern Coverage

| Pattern | Status | Recommended expression |
| --- | --- | --- |
| Search/list screen | Supported | Toolbar layout, `Table`, empty-state `Paragraph`, paging buttons, `loading` and `load-error` states. |
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
2. Add Tabs when tab content and selected-tab behavior need generated summaries.
3. Add Accordion when expanded/collapsed state needs to be validated.
4. Add Pagination only if the row-layout alternative becomes too repetitive.
5. Add Stepper for multi-step applications after state-flow notation settles.

## Candidate Classification

These candidates are evaluated by screen-specification meaning, not by visual
popularity. A component should become canonical only when it carries state,
selection, expansion, overlay, progress, or navigation semantics that are hard to
review from generic Layout and Element combinations.

| Candidate | Classification | Decision | Reason |
| --- | --- | --- | --- |
| Tabs | Add candidate | Define canonical semantics | Selected tab and tab panel visibility should connect to View Context and Preview Scenarios. |
| Menu / DropdownMenu / ActionMenu | Add candidate | Define canonical semantics | Menu item actions and open/closed overlay state are hard to see from a row of Buttons. |
| Popover / Tooltip | Add candidate | Define anchored overlay semantics | These are lighter than Dialog and need an anchor plus visibility rule. |
| Accordion / Disclosure | Add candidate | Define canonical semantics | Expanded/collapsed sections are common and should be reviewable without inventing state names. |
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

## Candidate Syntax Sketches

These sketches are not implemented syntax. They document the minimum shape a
future canonical element would need before implementation work starts.

### Tabs

```markdown
### E-SettingsTabs Tabs

- value: ${view.selectedSettingsTab}
- items:
  - Profile: profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing: billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab
```

Preview policy: render a tab strip, mark the selected item, and show which panel
each item controls in Element Summary or a dedicated behavior row.

### Menu / DropdownMenu / ActionMenu

```markdown
### E-RowActions ActionMenu

- label: More actions
- open when: ${view.openActionMenuRowId} == ${model.row.id}
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
- visible when: ${view.isPasswordHelpOpen}
- content: Password must be at least 12 characters.
```

Preview policy: render as an anchored non-modal overlay and expose anchor,
placement, visibility, and content in Display Content Spec.

### Accordion / Disclosure

```markdown
### E-AdvancedFilters Accordion

- value: ${view.expandedSections}
- items:
  - Advanced filters: filters
    - panel: L-AdvancedFilterPanel
```

Preview policy: render headers and expanded panels for the active View Context.
Summarize expanded/collapsed state separately from screen state.

### ProgressBar

```markdown
### E-UploadProgress ProgressBar

- value: ${model.upload.percent}
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

- page: ${model.search.page}
- total pages: ${model.search.totalPages}
- page size: ${model.search.pageSize}
- previous action: A-PreviousPage
- next action: A-NextPage
```

Preview policy: render previous/next controls, current page, total pages, and
page-size information. Keep page-changing actions visible in Action Summary.

## Example Plan

- Add a focused Tabs example when View Context examples are expanded.
- Add a search-list Pagination example only after the row-layout alternative
  becomes too noisy in generated Input/Display/Action specs.
- Add an overlay example that compares Dialog, Toast, Popover, and Tooltip after
  anchored overlay syntax is designed.
- Add Accordion and Stepper examples together with View Context samples because
  both need non-state UI mode values.
- Keep Skeleton, Card, Toolbar, SearchBox, EmptyState, and Avatar as examples of
  Layout/content patterns rather than canonical Element additions for now.
