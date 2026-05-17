# MarkVSpec Design Specification

MarkVSpec is a Markdown-first screen specification format. It is designed for
screen design documents that can also be parsed, previewed, validated, and used
for downstream implementation handoff.

This document summarizes the release product baseline. The canonical syntax is
defined in [dsl.md](../user/dsl.md); this document should not introduce alternate
authoring forms.

Generated preview output follows the section responsibilities in
[preview-information-architecture.md](preview-information-architecture.md).

## Product Direction

MarkVSpec is screen-first, but the design document unit can be `template`,
`screen`, or `partial`.

Each `.vspec.md` file describes one design subject. Reusable implementation
components may be derived later, but component composition is not part of the
primary authoring model.

- `template`: shared shell and slots. It can be previewed and printed by itself.
- `screen`: initial page reached by URL. It describes template usage, initial
  DOM, partial requests such as htmx calls, and local screen state transitions.
- `partial`: server-rendered partial HTML response. It can be previewed and
  printed by itself and describes the returned HTML layout, elements,
  server-side process, empty state, and error state.

The author writes a readable Markdown design document. MarkVSpec tools interpret a
small, predictable subset of that document.

## Authoring Model

Use three layers:

- YAML Front Matter for document-level metadata.
- Markdown headings for screen objects.
- Markdown bullets for properties, rules, conditions, and transitions.

Do not use Markdown tables as canonical source. Tables may be generated views.

## ID Model

IDs are used so humans, renderers, tests, and implementation tasks can refer to
the same object precisely.

- `SCR-*`: screen
- `TPL-*`: template
- `PRT-*`: partial
- `L-*`: layout group
- `E-*`: element
- `A-*`: action
- `R-*`: rule

The name part after the prefix may use Japanese or other Unicode letters and
numbers, such as `E-ページヘッダ`. Do not use spaces, `.` or `:` inside IDs;
those characters are reserved for Markdown readability and MarkVSpec syntax.

Example:

```markdown
### 5:E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

The heading ID is the stable reference used by the document. Write a short
preview marker before the ID as `<marker>:<id>`, such as
`### 5:E-SignInButton Button` or `### A1:A-SubmitLogin Submit login`. The active
examples prefer ASCII markers for preview readability. Marker bullets remain
valid when the heading form is not convenient.

## Front Matter

Front Matter is for structural metadata only.

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
owner: auth
viewport: mobile
default-state: idle
status: draft
---
```

Required fields:

- `id`
- `type`
- `title`

Useful optional fields:

- `route`
- `owner`
- `viewport`
- `default-state`: state used as the default for standalone wireframe rendering
  and embedded partial previews. Design document state previews use the initial
  state and the `States` order instead.
- `status`
- `tags`
- `version`

## Sections

The current release recognizes these sections:

- `## States`
- `## Layout: <viewport>`
- `## Elements`
- `## Actions`
- `## Validations`
- `## Business Rules`

Unknown sections are allowed as plain Markdown and should be preserved as
free-form sections in the generated design document.

## Layout

Layout groups describe arrangement, grouping, and visibility. They do not define
implementation component boundaries.

```markdown
## Layout: mobile

### L-Page Page

- marker: L1
- stack
- align: center
- gap: md

#### Items

- E-Heading
- L-EmailField
- E-SignInButton
```

Use one layout section per viewport, such as `## Layout: mobile` and
`## Layout: desktop`. Generated design documents render all viewports so the
document remains printable. The baseline viewport/initial state shows full
element and action lists; other viewport/state sections show the current layout,
element, and action specifications, with repeated rows marked when the same
rendered specification already appeared in an earlier state.
The export print stylesheet prints every viewport/state section, starts each
additional viewport/state screen on a new page, wraps long table values, and
keeps the State Flow diagram readable from the rendered Mermaid SVG when
available.
Reuse the same marker when the same layout ID appears in multiple viewport
sections.

Supported layout kinds:

- `stack`
- `row`
- `grid`
- `inline`

Alignment:

```markdown
- align: start|center|end|stretch
- justify: start|center|end|between|around
- gap: none|xs|sm|md|lg|xl
- overlay: area|screen
```

`justify` controls the main axis. `align` controls the cross axis.

Use `overlay: area` for a loading mask over a form or panel, and
`overlay: screen` for a full-screen waiting mask. Pair overlays with
`visible when` and use `disabled when` on the covered layout group when controls
should be unavailable while the overlay is visible.

## Field Layout

Forms often need a label and a control. Use quoted field mapping in layout groups.

```markdown
### L-EmailField Email Field

- marker: L2
- row
- gap: sm

#### Items

- "Email": E-EmailInput
```

The label must be quoted. The referenced ID must be an element.

The layout kind controls rendering:

- `row`: label and control side by side.
- `stack`: label above control.
- `grid`: repeated label/control rows or columns.

## Elements

Elements are user-visible or interaction-relevant objects.

Release element types:

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Button`
- `Link`
- `Select`
- `Checkbox`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

Use `Heading` with `level`, not `H1` through `H6` as element types.

```markdown
### 1:E-Heading Heading

- level: 1
- label: Welcome back
```

Use `## Validations` with `rules: required` for required-field product
validation. The element heading stays focused on the control type:

```markdown
### 3:E-EmailInput Input

- value: ${model.email}
- initial value: "test@example.com"
```

The value example is an opaque data expression, while `initial value` supplies
the initial display value. Do not use a separate `bind` property; it is outside
the supported DSL because input value source, initial fallback, and request
parameters should remain explicit. `Checkbox` supports the same separate
`initial value` property for an initial checked state.

Use `Paragraph` for prose and explanatory text.

Use `Spinner` for loading or waiting feedback tied to a screen state, such as
`wait-auth`.

```markdown
### E-LeadText Paragraph

- sample: Sign in with your account email and password.
```

Use `Text` for short labels, values, and compact text.

```markdown
### E-RequiredText Text

- sample: Required
```

## Element Meaning

MarkVSpec should not become a design system DSL. Avoid `size`, raw colors, CSS
classes, widths, heights, and low-level styling.

Use `variant` and `tone` only when the meaning matters to the design.

`variant` describes priority:

- `primary`: main action or primary emphasis.
- `secondary`: secondary action.
- `tertiary`: low-emphasis action.

`tone` describes semantic intent:

- `neutral`
- `info`
- `success`
- `warning`
- `danger`

Examples:

```markdown
### E-SignInButton Button

- marker: 5
- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

```markdown
### E-DeleteAccountButton Button

- label: Delete account
- variant: primary
- tone: danger
- action: A-DeleteAccount
```

```markdown
### E-LoginErrorBanner Banner

- tone: danger
- sample: Invalid email or password.
```

Implementation tools may map `variant` and `tone` to Bootstrap, Tailwind, or an
internal CSS system. MarkVSpec stores the semantic meaning.

## States

States describe screen conditions, not framework state variables.

```markdown
## States

- idle*
- validation-error
  - Client-side validation error.
- wait-auth
- auth-error
  - Invalid email or password.
```

If no state uses `*`, the first state is treated as initial and the
validator should warn.

## Actions

Actions describe user or system behavior. An action is primarily a trigger plus
process steps and effects. Use `state` for screen-local state,
opaque expressions such as `${model.value}` for screen data, and `navigate` for screen transitions.

```markdown
### A1:A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
  - auth-error
- Process P1: Clear stale message
  - when: ${state.auth-error}
  - Effects
    - display:
      - target: L-MessageArea
      - element: E-EmptyMessage
- Process P2: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-SignInEmail.value
      - password: E-SignInPassword.value
  - case: sent
    - Effects
      - state: wait-auth

### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.P2.response
- From
  - wait-auth
- Process P1: Receive auth response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthenticationErrorMessage

### A4:A-ValidateEmail Validate email

- Triggered
  - E-EmailInput.blur
- Process P1: Validate email field
  - case: empty
    - description: empty email in idle state
    - Effects
      - state: validation-error
      - display:
        - target: L-EmailValidation
        - element: E-EmailRequiredMessage
  - case: valid
    - description: valid email after validation error
    - Effects
      - state: idle
      - display:
        - target: L-EmailValidation
        - element: E-EmptyEmailValidation
```

Client-side validation actions omit `HttpRequest`. The trigger and result-scoped
effects describe local validation behavior, while server-side authentication
errors remain modeled as auth response outcomes. Keep the top-level state
abstract, such as `validation-error`, and put field-specific details in result
names, update targets, and fragments. This avoids a state model that must define
one state per field error and field-error combination.

Use nested action groups when an action has several related details. Action-level
guards are not modeled; put operability on elements with `disabled when`, and put
input checks in `Validations` plus process-scoped `receive: V-....result` steps.

```markdown
- Process P1: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthenticationErrorMessage
```

Request parameter bullets describe how request payload values are built. Use
element sources such as `E-EmailInput.value` when the submitted value comes from
a visible input.

Response bullets under `Cases` describe how response outcomes are classified.

Transition interpretation:

- target is a local state: screen state transition.
- target starts with `SCR-`: screen transition.
- target starts with `/`: route transition.
- target starts with `http://` or `https://`: external navigation.

Generated design documents should include a Mermaid `stateDiagram-v2` view of
the action transitions. The diagram is a generated view, not canonical authoring
source. Node labels should preserve readable screen-local states, while tools may
use safe internal Mermaid aliases. Screen transitions such as `SCR-*`, routes,
and external URLs should be rendered as terminal transitions to `[*]`, not as
screen-local state nodes.

Generated design documents should start the visual section with the initial
state wireframe, then continue in `States` order. The element and action lists
immediately below that wireframe describe only what is visible or relevant in
that initial state.

Additional screen states should be rendered as their own wireframe sections.
The layout, element, and action lists below those sections should show the
current specification for that state. Repeated rows may be marked for scanning,
but the reader should not need to reconstruct the state from add/remove rows.
State-specific rendering uses authored state conditions such as `visible when:
auth-error` and `hidden when: wait-auth`. Conditions that are not screen states,
such as permission or input value expressions, should remain visible in the mock
and be documented in the layout, input form, display content, or action detail
tables instead.

Generated design documents should not include a Model Updates section. Action
effects describe screen-visible outcomes such as state changes, navigation, and
display changes; they do not canonically assign into `${model.value}`. Display
values should be reviewed through State Views, Display Content Spec, Input Form
Spec, Element samples, and Preview Scenario samples.

## Thymeleaf And Htmx

MarkVSpec can describe htmx-style partial updates without depending on htmx
attribute names.

Use structured action groups:

- Screen-side `Process` / `PartialRequest` for partial HTML method, path, and parameters.
- `Cases` / `update` for result-specific partial updates.
- `target`, `mode`, and `content` under `update` for semantic update details.

Example mapping:

- `PartialRequest` with `request: GET /mypage/partials/notices` maps to an htmx request such as `hx-get="/mypage/partials/notices"`.
- `target: L-MessageArea` maps to `hx-target="#L-MessageArea"`.

Actions are viewport-independent. When an action update targets a layout ID,
that layout should exist in every declared viewport. If a target layout is
missing from a viewport, tools should warn; element targets are not affected by
this viewport coverage rule.

Lower-level implementation details such as concrete `hx-*` attributes belong in
an implementation mapping, not in the main screen design flow. Semantic `mode`
and `fragment` bullets are allowed when the design needs to identify a
replacement strategy or server-rendered fragment without naming framework
attributes directly.

Use result-scoped outcome details when only one outcome performs the partial
update. For example, a login success may navigate to `SCR-DASHBOARD`, while the
`failure` outcome can describe the error update with nested `target`, `mode`,
and `fragment` bullets.

When a server-rendered partial needs its own design document, the screen should
describe which action replaces which target with partial-derived content. The
partial should describe the returned HTML structure, server-side data process,
empty state, and error state.

```markdown
---
id: PRT-NOTICE-LIST-CARD
type: partial
title: Notice List Card
route: /mypage/partials/notices
---

# PRT-NOTICE-LIST-CARD Notice List Card

## States

- loading*
- loaded
- empty
- load-error

## Layout: mobile

### L-NoticeCard Notice Card

- stack

#### Items

- E-NoticeHeading
- E-NoticeList

## Actions

### A-BuildNoticeList Build notice list

- Triggered
  - partial.render
- From
  - loading
- Process P1: Find latest notices
  - server:
    - NoticeQueryService.findLatest()
  - case: success
    - Effects
      - state: loaded
  - case: empty
    - Effects
      - state: empty
  - case: failure
    - Effects
      - state: load-error
```

`partial.render` is the lifecycle trigger for rendering the partial document on
the server. Process step names such as `ServerCall` are project-level modeling
choices. Architecture-specific words such as `bridge` are not MarkVSpec core
keywords; write them only as implementation details when a project needs them.

Supported update modes:

- `replace`

## Business Rules

Rules capture behavior that crosses multiple elements or states.

```markdown
### R-RequiredFields

- The submit button must stay disabled until required fields are valid.
```

## Free-form Sections

Use unreserved level-2 headings for context that reviewers should still see.
These sections are preserved as Markdown so temporary design context is not
silently dropped, but MarkVSpec does not validate or interpret their content.

## Example Screen

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
owner: auth
viewport: mobile
status: draft
---

# SCR-LOGIN Login

## States

- idle*
- validation-error
  - Client-side validation error.
- wait-auth
- auth-error
  - Invalid email or password.

## Layout: mobile

### L-Page Page

- marker: L1
- stack
- align: center
- gap: md

#### Items

- E-Heading
- E-LeadText
- L-MessageArea
- L-EmailField
- L-PasswordField
- E-SignInButton
- E-ForgotPasswordLink

### L-EmailField Email Field

- marker: L2
- row
- gap: sm

#### Items

- "Email": E-EmailInput
- L-EmailValidation

### L-PasswordField Password Field

- marker: L3
- row
- gap: sm

#### Items

- "Password": E-PasswordInput

### L-MessageArea Message Area

- marker: L4
- stack
- visible when: auth-error

#### Items

- E-ErrorBanner

### L-EmailValidation Email Validation

- marker: L5
- stack
- visible when: validation-error

#### Items

- E-EmailRequiredText

## Elements

### E-Heading Heading

- marker: 1
- level: 1
- label: Welcome back

### E-LeadText Paragraph

- marker: 2
- sample: Sign in with your account email and password.

### 3:E-EmailInput Input

- value: ${model.email}
- input rule:
  - type: email

### E-EmailRequiredText Text

- marker: 8
- tone: danger
- sample: Email is required.
- visible when: validation-error

### 4:E-PasswordInput Input

- type: password
- value: ${model.password}

### E-SignInButton Button

- marker: 5
- label: Sign in
- variant: primary
- action: A-SubmitLogin
- disabled when: E-EmailInput is empty
- disabled when: E-PasswordInput is empty

### E-ForgotPasswordLink Link

- marker: 6
- label: Forgot password?
- href: /password/reset

### E-ErrorBanner Banner

- marker: 7
- tone: danger
- sample: Invalid email or password.
- visible when: auth-error

## Actions

### A1:A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
  - auth-error
- Process P1: Clear stale message
  - when: ${state.auth-error}
  - Effects
    - display:
      - target: L-MessageArea
      - element: E-EmptyMessage
- Process P2: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-SignInEmail.value
      - password: E-SignInPassword.value
  - case: sent
    - Effects
      - state: wait-auth

### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.P2.response
- From
  - wait-auth
- Process P1: Receive auth response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthenticationErrorMessage

### A4:A-ValidateEmail Validate email

- Triggered
  - E-EmailInput.blur
- Process P1: Validate email field
  - case: empty
    - description: empty email in idle state
    - Effects
      - state: validation-error
      - display:
        - target: L-EmailValidation
        - element: E-EmailRequiredMessage
  - case: valid
    - description: valid email after validation error
    - Effects
      - state: idle
      - display:
        - target: L-EmailValidation
        - element: E-EmptyEmailValidation
```

## Parser Responsibilities

The parser should:

- Parse Front Matter.
- Parse recognized sections.
- Extract IDs and source line numbers.
- Extract layout groups, elements, actions, states, and rules.
- Preserve unrecognized Markdown as notes.
- Validate references between layout, elements, and actions.
- Preserve original condition text while extracting ID references.

## Renderer Responsibilities

The renderer should:

- Render layout groups and contained elements.
- Show element IDs as optional overlays.
- Render field mappings as label/control pairs.
- Render `variant` and `tone` semantically.
- Support state selection and conditional visibility.
- Annotate htmx-style partial update targets.

## Open Decisions

- Whether generated code should preserve IDs as `data-testid`, comments, or both.
- Whether state-specific visibility should live on elements, layout groups, or both.
- How much free-form natural language should the parser attempt to interpret.
