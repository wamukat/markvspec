# MarkVSpec Concept

MarkVSpec is a Markdown-first screen specification format for product teams. The
source document should read like a screen design document first, while still
being structured enough to render a wireframe and export machine-readable data.

## Positioning

Wireframe Markdown tools are useful because they keep UI sketches close to text.
MarkVSpec should go one layer deeper: the Markdown file is not only a visual
sketch, but also the canonical screen design document that engineers, designers,
and reviewers can inspect and modify.

## Design Principle

Keep MarkVSpec screen-first.

Componentization is an implementation concern. A MarkVSpec document may later help
an engineer identify reusable implementation components, but the authoring format
should not require authors to compose screens from component files.

## Goals

- Keep the document readable as Markdown.
- Render a low-fidelity wireframe from the same source.
- Assign stable IDs to screens, layout groups, elements, actions, states, and rules.
- Define screen states and transitions explicitly.
- Attach requirements, validations, and implementation notes to each element.
- Export structured data for tests, implementation tasks, and review checklists.

## Non-Goals

- Pixel-perfect UI design.
- Replacing Figma or a full design system.
- Encoding frontend component boundaries.
- Composing screens from reusable component files.
- Creating a general-purpose programming language inside Markdown.

## Document Shape

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
---

# SCR-LOGIN Login

## States

- idle*
- wait-auth
- auth-error
  - Invalid email or password.

## Layout: mobile

### L1:L-LoginForm Login Form

- stack

#### Items

- E-Heading
- L-EmailField
- L-PasswordField
- E-SignInButton
- E-ForgotPasswordLink

### L2:L-EmailField Email Field

- row

#### Items

- "Email": E-EmailInput

### L3:L-PasswordField Password Field

- row

#### Items

- "Password": E-PasswordInput

## Elements

### 1:E-Heading Heading

- level: 1
- label: Welcome back
- purpose: Greet returning users.

### 3:E-EmailInput Input

- value: ${data.email}
- input rule:
  - type: email

### 4:E-PasswordInput Input

- type: password
- value: ${data.password}
- validation: Must not be empty.

### 5:E-SignInButton Button

- label: Sign in
- action: A-SubmitLogin
- disabled when: E-EmailInput is empty
- disabled when: E-PasswordInput is empty

### 6:E-ForgotPasswordLink Link

- label: Forgot password?
- href: /password/reset

## Actions

### A1:A-SubmitLogin Submit login

- From
  - idle
- Process P1: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - case: sent
    - state: wait-auth
  - case: success
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 invalid credentials
    - state: auth-error

## Business Rules

### R-RequiredFields

- The submit button must stay disabled until required fields are valid.
```

## Front Matter

Front Matter stores document-level machine metadata. It should stay small and
structural.

Good Front Matter fields:

- `id`
- `type`
- `title`
- `route`
- `viewport`
- `tags`
- `version`

Do not put the whole screen design in Front Matter. Use the Markdown body for
content that humans need to read, review, and edit.

## Core Model

### Project

A project is a collection of screen documents.

Suggested structure:

```text
markvspec/
  screens/
    login.vspec.md
    users-index.vspec.md
    user-detail.vspec.md
    user-edit.vspec.md
    dashboard.vspec.md
    account-settings.vspec.md
```

The repository keeps practical English examples in `examples/`. These examples
are parser-tested and should stay aligned with the released DSL.

### Screen

A screen is the top-level unit. It maps to one route, modal, flow step, or major
view.

Screen ID format:

- `SCR-LOGIN`
- `SCR-DASHBOARD`
- `SCR-USER-DETAIL`

Required fields:

- Front Matter: `id`, `type`, `title`
- Body: `States`, `Layout: <viewport>`, `Elements`, `Actions`

### Layout Group

A layout group describes visible structure without forcing implementation
component boundaries. Layout is defined per viewport with headings such as
`## Layout: mobile`.

Layout ID format:

- `L-LoginForm`
- `L-EmailField`

Examples:

- `L-LoginForm Login Form`
- `L-FooterLinks Footer Links`
- `L-MessageArea Message Area`

### Element

An element is any user-visible or interaction-relevant object. Every element
should have a stable ID.

Element ID format:

- `E-EmailInput`
- `E-SignInButton`
- `E-ErrorBanner`

Common element types:

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Button`
- `Link`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Table`
- `List`
- `Dialog`
- `Banner`
- `Badge`
- `Image`
- `Icon`
- `Spinner`

Element meaning can be described with `variant` and `tone`, not framework class
names.

Examples:

- `variant: primary`
- `variant: secondary`
- `tone: danger`
- `tone: success`

### State

State describes the screen condition, not the implementation framework.

Examples:

- `idle`
- `fetching`
- `empty`
- `error`
- `success`
- `editing`
- `confirming-delete`

### Action

An action defines something that changes state, navigates, submits data, or opens
a secondary surface.

Action ID format:

- `A-SubmitLogin`
- `A-ValidateEmail`

Action fields:

- `From`
- `Process`
- `state` / `display` / `navigate`
- process `case`
- side effects when needed

Action callers are declared outside the action. User operations come from
Element `action:` / `action event:`, lifecycle events come from `## Events`, and
process responses come from `receive:`.

### Rule

A rule captures behavior that crosses multiple elements or states.

Rule ID format:

- `R-RequiredFields`
- `R-Authorization`

## Authoring Syntax

Prefer Markdown that people can write quickly:

- Front Matter defines document-level machine metadata.
- Headings define major objects: `# SCR-LOGIN Login`,
  `### 7:E-SignInButton Button`, or `### A1:A-SubmitLogin Submit login`.
- Bullets define properties and rules: `- label: Sign in`.
- Nested bullets define action groups and process details such as `From`, `Process Pn:`, direct state/display changes, and process `case:`.

Short heading markers such as `7` or `A1` are preview display aids. References
still use stable IDs such as `E-SignInButton` and `A-SubmitLogin`.

Avoid making tables or large YAML blocks the primary authoring surface. Tables are
acceptable as generated views, but not as the canonical source.

The concrete release syntax is defined in [dsl.md](../reference/index.md).
The current product-level design is summarized in [design-spec.md](design-spec.md).

## Rendering Rules

The renderer should treat `Layout` and `Elements` as the visual source of truth.
`Actions`, `States`, and `Business Rules` enrich the rendered result with annotations,
overlays, inspector panels, and validation warnings.

Suggested views:

- `wireframe`: visual layout only, with optional element numbers.
- `spec`: wireframe plus element and action inspector.
- `state`: select a state and render only applicable elements.
- `flow`: action/state transition graph.
- `checklist`: generated review and implementation checklist.
- `json`: normalized export for downstream tooling.

## Implementation Components

Implementation components can be derived later from layout groups and repeated
patterns. They should not be part of the first-class MarkVSpec authoring model.

For example, a team may choose to extract `L-LoginForm Login Form` into
`AuthForm.tsx`, but the screen design document should remain screen-oriented.

## Release Scope

1. Parse one screen `.vspec.md` file.
2. Validate screen IDs, layout IDs, element IDs, action IDs, duplicate references, and missing actions.
3. Render a simple screen wireframe preview.
4. Generate a scrollable design document view with wireframe, elements, actions, transitions, notes, diagnostics, and state flow.
5. Support syntax highlighting and VS Code diagnostics.
6. Package the VS Code extension for Marketplace and VSIX installation.

## Open Questions

- Should generated code preserve IDs as `data-testid`, comments, or both?
- Should state-specific visibility live on elements, layout groups, or both?
- How much visual layout should MarkVSpec encode before it stops feeling like Markdown?
