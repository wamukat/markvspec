# UI Component and Screen Pattern Coverage

This page tracks what MarkVSpec can express for practical screen specifications.
It is intentionally not a design-system catalog. The goal is to know whether a
business screen can be written, previewed, printed, and handed to implementation
without falling back to ambiguous prose.

## Component Coverage

| Component | Status | MarkVSpec expression | Notes |
| --- | --- | --- | --- |
| Heading / paragraph / text | Supported | `Heading`, `Paragraph`, `Text` | Static text and sampled model-bound text are separated by `label`, `sample`, `src`, and `format`. |
| Form text input | Supported | `Input`, `Input*` | `value`, `initial value`, `placeholder`, validation, and error text are supported. |
| Date / time / number input | Supported | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | Use `value: ${model.value}` with `initial value`, plus optional `min`, `max`, and `step` where applicable. |
| File input | Supported | `FileInput`, `FileUpload` | Use `accept`, `multiple`, `label`, and `sample` for constraints and helper text. |
| Button / link | Supported | `Button`, `Link` | `variant`, `tone`, `action`, `href`, and route params are supported. |
| Select / checkbox / radio group | Supported | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | Choice options use nested Markdown list items. Use `RadioGroup` for mutually exclusive value ranges, `CheckboxGroup` or `MultiSelect` for multiple values, and `Switch` for boolean settings. |
| Banner / badge | Supported | `Banner`, `Badge` | Use `tone` for semantic intent such as danger or success. |
| List / table | Supported | `List`, `Table` | Table columns and sample rows use nested Markdown lists. |
| Dialog / overlay | Supported | `Dialog` with overlay layout | Overlay behavior is modeled by layout metadata such as `overlay: area` or `overlay: screen`. |
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
| Edit form | Supported | `Input*`, `DateInput`, `TimeInput`, `NumberInput`, `Textarea`, `FileInput`, `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `DatePicker`, `FileUpload`, validation states, save lifecycle actions. |
| Confirmation flow | Supported | `Dialog`, `overlay`, confirm/cancel actions, danger tone. |
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
