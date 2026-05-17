# Preview Information Architecture

MarkVSpec preview is a generated design document. Its sections should be readable
from top to bottom and printable as a single artifact. The preview may repeat a
small amount of information, but each section must have one primary job.

## Principles

- Put overview information before details.
- Keep summary tables short enough for scanning.
- Put the full behavior contract in detail sections.
- Do not expose parser-only metadata unless it helps the reader verify the
  specification.
- When the same fact appears in multiple places, change the purpose: overview,
  placement, transition, request contract, or detail.

## Section Responsibilities

| Section | Primary job | Show | Avoid |
|---|---|---|---|
| Screen | Entry point for the design document | document ID, title, type, route, owner, status, resolved references | default-state, locale, partial state maps, action results, element details |
| Wireframe | Visual structure and state-specific appearance | model samples for the current state, layout structure, element placement, markers, system events, partial preview placement, current viewport/state specifications | full element properties, action internals, request details |
| Layouts | Layout objects visible in the current wireframe context | marker, name, kind, layout properties, item references | element behavior and action details |
| Element Summary | Element catalog for the current wireframe context | marker, ID, type, triggered actions, description | display text, input constraints, visibility/disabled conditions, action process details |
| Input Form Spec | What users can enter and which constraints apply | required flag, value initial/source, input details, constraints including readonly, format, visible condition, enabled condition | labels, placeholders, option labels, validation required rules, direct bind column, and other display text |
| Display Content Spec | What appears in the UI and where it comes from | label, placeholder, help, sample, option label, i18n/model/source references, format, display condition, enabled condition | input constraints, action internals, validation conditions |
| Model Updates | Model mutations caused by actions | action-level groups, trigger, context/process/case, model path, update expression | UI placement, transition diagrams, repeated action/trigger cells |
| Action Summary | Operation catalog | marker, name, trigger, kind, overview | case-by-case request params, response body, update target details, action availability |
| Action Details | Behavior contract | overview, kind, trigger, from, process, request, params, responses, cases, partial updates, updates, transitions, route params | visual layout details and action-level guards |
| State Flow | Flow overview | Mermaid state diagram and a link to State Transitions | request parameters and UI element properties |
| Screen Transitions | Cross-screen navigation | action, trigger, case, destination type, destination target | local state changes, partial updates, request parameter details |
| State Transitions | Local state movement | from-state x to-state matrix with action marker, result, and action name | action internals, trigger details, and response payload details |
| States | State vocabulary | state name, initial flag, description | action lists and API contracts |
| Validations / Business Rules | Business constraints | target, condition, message, notes | layout placement |
| Free-form Sections / Diagnostics | Author notes and tool feedback | human notes, diagnostics | canonical behavior that belongs in structured sections |

## Summary Versus Detail

Summary sections should answer "what exists and where should I look next?".
Detail sections should answer "exactly what happens?".

- Element Summary is limited to what exists: marker, ID, type, triggered actions,
  and description.
- Input Form Spec owns what users can enter: required metadata, value
  initial/source, input details, constraints, format, and visible/enabled
  conditions. Required metadata stays in the Required column rather than the
  Spec cell. Product validation required rules stay in Validations.
- Display Content Spec owns wording and rendered values such as `label`,
  `placeholder`, `source`, `sample`, `src`, `value`, `format`, and option labels by
  display location. It also keeps display and enabled conditions visible for
  non-input elements that have display content.
- Validations group behavior contracts by client/server execution and
  field/cross-field scope, avoiding mixed-responsibility validation tables.
- Action summary keeps one row per action and describes the main effect
  category.
- Action details follow the reader's behavior-review order: overview, kind,
  trigger, from, process, request, parameters, responses, cases, partial
  updates, updates, transitions, and route parameters. Element references
  include marker plus ID; layout references include marker plus layout name and
  avoid repeating layout IDs; action references include marker plus action name.
- Partial updates live inside Action Details so readers can inspect targets,
  fragment/content, and resulting states or screens in the same action context
  as request, response, and cases.
- Model Updates extract cross-cutting data changes from actions and group them
  by action for auditing. The action and trigger appear once per group, while
  rows stay focused on context/process/case, model path, and update expression.
- Model Samples show the actual sample rows used to explain how `${model.value}`
  references render immediately before each state's Wireframe. They are not an
  independent section and should not collapse into column names and row counts
  only.

## Recommended Output Order

1. Screen
2. Structured History
3. Table of Contents
4. States
5. State Flow
6. Viewport / State Wireframes, with Model Samples immediately before each state's Wireframe
7. Screen Transitions
8. State Transitions
9. Model Updates
10. Action Details
11. Validations / Business Rules
12. Error Codes
13. Free-form Sections
14. Diagnostics

Document references remain in the Screen section as document dependencies and
render as a table of kind, ID, title, and status. This order lets readers
understand the state vocabulary and flow before the wireframes, then review data
samples next to their state wireframes before moving into
cross-cutting behavior tables and detailed action contracts.

## Output Rules

- State preview ordering follows the initial state and the `States` order.
  `default-state` is reserved for standalone wireframes and embedded partial
  preview defaults.
- State previews render the current specifications for each viewport/state pair.
  Repeated rows may be marked when the same rendered specification already
  appeared in an earlier state, so the view stays scannable without presenting
  an add/remove diff model.
- Actions that are not tied to a rendered screen element appear as System Events
  directly below the matching state's Wireframe. Actions with visible element
  markers stay attached to their elements.
- State view tables use the same primary grouping as normal element tables:
  Element Summary, Input Form Spec, and Display Content Spec. They show current
  rows directly and reserve badges for repeated specifications.
- Preview labels, badges, chips, and active segmented controls use light
  backgrounds with borders and readable text. Dark-background label treatments
  are avoided so state, event, partial, and difference labels read as one visual
  system across HTML and print/PDF output.
- `locale` is an authoring/rendering setting. It is not shown as reader-facing
  screen metadata.
- `result` and response cases belong in Action Details, State Transitions, or
  Screen Transitions. They do not belong as a wide result column in Action
  Summary.
- References to templates and partials appear in Screen as document
  dependencies, in Wireframe as placement/previews, and in Action Details as DOM
  replacement targets.
- Generated tables may use markers for readability, but internal IDs should only
  appear when the reader needs stable references.
