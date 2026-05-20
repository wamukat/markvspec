# MarkVSpec DSL Authoring Reference

Use this reference when writing or editing `.vspec.md` without the full project docs in context. It is not the complete DSL specification; it is the canonical authoring subset an AI agent needs for ordinary screen specs.

## Quick Index

- File skeleton and sections
- IDs and headings
- Layout and elements
- Forms and validation
- Actions and events
- Display effects and partial updates
- Preview scenarios
- Complete example files
- Legacy forms to avoid

## File Skeleton

One `.vspec.md` file describes one screen, template, or partial.

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
default-state: idle
locale: en
---

# SCR-LOGIN Login

## States

- idle*
- auth-error

## Layout: desktop

### L1:L-Page Login page

- stack
- gap: md

#### Items

- E-Title
- L-LoginForm
- L-MessageArea

## Elements

...

## Actions

...

## Preview Scenarios

...
```

Use YAML Front Matter only for document-level metadata. Do not put per-element settings, CSS, htmx attributes, or low-level layout dimensions in Front Matter.

## IDs And Headings

Use stable semantic IDs in headings and references:

- `SCR-*` for screens
- `TPL-*` for templates
- `PRT-*` for partial documents
- `L-*` for layout groups
- `E-*` for elements
- `A-*` for actions
- `R-*` for business rules
- `V-*` for validation contracts

Markers are optional visual labels before IDs. References always use IDs, not markers.

```markdown
### L1:L-MessageArea Message area
### 1:E-Title Heading
### A1:A-SubmitLogin Submit login
```

## Sections

Prefer these sections when applicable:

- `## States`
- `## View Context`
- `## Layout: <viewport>`
- `## Elements`
- `## Form Groups`
- `## Events`
- `## Actions`
- `## Rules`
- `## Preview Scenarios`
- `## Error Codes`
- `## Notes`
- `## Open Questions`

Do not use Markdown tables as canonical source. Use headings and nested bullets.

## Layout And Elements

Layouts group elements and other layouts.

```markdown
## Layout: desktop

### L1:L-LoginForm Login form

- stack
- gap: sm
- disabled when: authenticating

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- E-SignInButton
```

Use semantic element types and properties. Avoid raw colors, CSS classes, `width`, `height`, and implementation attributes.

```markdown
## Elements

### 1:E-Title Heading

- level: 1
- label: Welcome back

### 2:E-EmailInput Input

- label: Email
- type: email
- placeholder: you@example.com

### 3:E-PasswordInput Input

- label: Password
- type: password

### 4:E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

### 5:E-AuthErrorBanner Banner

- tone: danger
- text: Invalid email or password.
```

Element guidance:

- Use `Heading` with `level: 1..6`; do not use `H1` through `H6`.
- Use `Paragraph` for block prose.
- Use `Text` for compact labels, values, or short inline text.
- Use `variant` for priority: `primary`, `secondary`, `tertiary`.
- Use `tone` for semantic intent: `neutral`, `info`, `success`, `warning`, `danger`.
- Use `visible when`, `disabled when`, and similar semantic conditions instead of framework attributes.

## Forms And Validation

Use `## Form Groups` when an action validates a group of fields.

```markdown
## Form Groups

### F-Login Login form

- marker: F1
- fields: E-EmailInput, E-PasswordInput

## Rules

### V-LoginForm Login form validation

- applies to: F-Login
- check: E-EmailInput.value is present and E-PasswordInput.value is present
- message: Email and password are required.
```

Display validation output through `display.message`:

```markdown
- display:
  - target: E-EmailInput.error
  - message: V-LoginForm.messages
```

## Actions And Events

Actions are triggered by element properties or lifecycle events. Do not put a `Triggered` block inside an Action.

User operations:

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

Non-default element events:

```markdown
### E-EmailInput Input

- label: Email
- action: A-ValidateEmail
- action event: blur
```

Lifecycle events:

```markdown
## Events

- page.load: A-LoadInitialData
```

Canonical Action shape:

```markdown
## Actions

### A1:A-SubmitLogin Submit login

- From
  - idle
- Process P1: Check login form
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: V-LoginForm.messages
    - stop
  - case: valid
    - continue
- Process P2: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request result
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
    - stop
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
    - stop
```

Rules for Actions:

- Use `- From` for allowed source states.
- Use `- Process <marker>: <name>` for each meaningful step.
- Use at most one execution detail per Process, such as `request:`, `server:`, `sync:`, or `receive:`.
- Put result branches directly under the Process as `case: <name>`.
- Put `Effects` under a `case:` branch.
- Put `stop` or `continue` directly under the case branch after `Effects`.
- For immediate deterministic effects, a Process may omit `case:` and `Effects`.

Immediate deterministic Process example:

```markdown
- Process P1: Open password reset
  - navigate: SCR-PASSWORD-RESET
```

## Display Effects And Partial Updates

Use `display:` for visible changes, including htmx-style partial replacement. Keep the spec semantic; do not write raw `hx-*` attributes.

`display.target` points to the existing `L-*` or `E-*` receiving the visible result. `E-*.error` is allowed for input field errors.

Use exactly one payload key per display effect:

- `element`: one existing `E-*` element or `L-*` layout to show
- `message`: validation or business-rule messages such as `V-*.messages` or `R-*.messages`
- `partial`: referenced `PRT-*` partial content shown in an existing host

Examples:

```markdown
- display:
  - target: L-MessageArea
  - element: E-AuthErrorBanner
```

```markdown
- display:
  - target: E-EmailInput.error
  - message: V-LoginForm.messages
```

```markdown
- display:
  - target: L-ProfileSummaryHost
  - partial: PRT-ProfileSummary
```

Dialog and Toast elements may omit `target`:

```markdown
- display:
  - element: E-SavedToast
```

For partial documents, map the partial ID to a source path in Front Matter and display it semantically.

```yaml
references:
  partials:
    PRT-ProfileSummary: ./profile-summary.partial.vspec.md
```

```markdown
- display:
  - target: L-ProfileSummaryHost
  - partial: PRT-ProfileSummary
```

## Preview Scenarios

Use `## Preview Scenarios` when baseline `## States` previews need explicit state, view context, route params, sample data, or action/process case combinations.

If a scenario heading matches a state name and omits `state:`, its samples apply to that normal state preview:

```markdown
## Preview Scenarios

### loaded

- samples:
  - E-MemberName: Morgan Lee
  - E-PlanName: Team Pro
```

If the heading is a distinct scenario name, include `state:` to create an additional preview variant:

```markdown
### auth-error-after-submit

- state: auth-error
- cases:
  - A-SubmitLogin.P2.failure
- samples:
  - E-EmailInput: test@example.com
```

For table or list rows, put row samples under the element:

```markdown
### loaded-with-rows

- state: loaded
- samples:
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Workspace
        - seats: 8
        - renewal: 2026-06-30
```

Use `before:` only when scenario ordering matters. Do not use `after:`.

## Complete Example Files

Read these complete `.vspec.md` examples before drafting similar specs:

- `references/examples/hello-world.vspec.md`: minimum screen shape.
- `references/examples/basic-form.vspec.md`: basic form layout without action complexity.
- `references/examples/action-request.vspec.md`: validation, HTTP request params, success/failure cases, and navigation.
- `references/examples/partial-update.vspec.md`: semantic partial update with `display:` and `mode: replace` intent kept out of raw htmx attributes.

These examples are intentionally small and should validate as complete MarkVSpec documents.

## Legacy Forms To Avoid

Do not write these forms in new specs:

- `Triggered` blocks inside Actions
- Action-level `Effects`
- Action-level `Cases`
- legacy `cases:` blocks
- `update:`
- `display.content`
- `display.elements`
- `HttpRequest` as a Process type
- raw `hx-*` attributes
- `prepare:` Process detail
- `${data.*}` assignment from Action effects
- Markdown tables as canonical source
- `H1` through `H6` element types

Canonical replacements:

- Use Element `action: A-*`, `action event:`, or `## Events` for triggers.
- Use `Process Pn: Name` plus `request:` / `server:` / `sync:` / `receive:`.
- Use process-local `case:`.
- Use `display:` for visible partial updates.
- Use `state:`, `view:`, and `navigate:` for state/view/screen transitions.

## Validation

After editing a spec, run:

```bash
markvspec validate <file-or-glob> --fail-on-warnings
```

Fix syntax, schema, duplicate ID, broken reference, unsupported DSL, and invalid section diagnostics when the intended correction is clear. For missing product facts, ask a targeted question or record the gap in `## Open Questions`; do not invent facts.
