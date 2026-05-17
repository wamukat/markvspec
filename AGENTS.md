# MarkVSpec Agent Notes

## Project Summary

MarkVSpec is a Markdown-first screen specification format for AI-assisted product
work. A `.vspec.md` file should read like a human screen design document while
remaining structured enough for parsing, validation, live preview, and AI edits.

## Current Product Direction

- Screen-first: one `.vspec.md` file describes one screen.
- Componentization is an implementation concern, not part of the primary authoring model.
- Live Preview is essential because the DSL is readable Markdown, not a WireMD-style visual notation.
- The first implementation target is a VS Code extension with live preview.
- The implementation stack should start with TypeScript.

## Key Docs

- `README.md`: English project overview and quick start.
- `README.ja.md`: Japanese project overview and quick start.
- `docs/en/`: English documentation set.
- `docs/ja/`: Japanese documentation set with the same file structure as `docs/en/`.
- `docs/en/design-spec.md` / `docs/ja/design-spec.md`: product-level design specification.
- `docs/en/dsl.md` / `docs/ja/dsl.md`: MVP DSL rules.
- `docs/en/maintainers/markvspec-concept.md` / `docs/ja/maintainers/markvspec-concept.md`: concept and positioning.
- `examples/01-basics/login-basic.vspec.md`: current basic example screen.

## DSL Principles

- YAML Front Matter is only for document-level metadata.
- Markdown headings declare objects.
- Markdown bullets declare properties, rules, conditions, and transitions.
- Markdown tables are not canonical source.
- JSON is an internal/export representation, not an authoring format.

## ID Model

- `SCR-*`: screen
- `L-*`: layout group
- `E-*`: element
- `A-*`: action
- `R-*`: rule

## Authoring Model

Recognized sections:

- `## States`
- `## Layout`
- `## Elements`
- `## Actions`
- `## Rules`
- `## Notes`
- `## Open Questions`

Important syntax:

```markdown
### L-EmailField Email Field

- row
- gap: sm

#### Items

- "Email": E-EmailInput
```

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Effects
  - state: wait-auth
- Cases
  - success:
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
```

## Element Policy

- Use `Heading` plus `level: 1..6`, not `H1` through `H6` element types.
- Use `Paragraph` for prose.
- Use `Text` for short labels, values, and compact text.
- Do not add `size`, raw colors, CSS classes, width, height, or low-level styling.
- `variant` means priority: `primary`, `secondary`, `tertiary`.
- `tone` means semantic intent: `neutral`, `info`, `success`, `warning`, `danger`.

## Thymeleaf And Htmx

The user's product uses Thymeleaf and plans to support htmx partial updates.
MarkVSpec actions should model this with:

- `Process` / `HttpRequest` for method, path, and request parameters.
- `Cases` / `update` for result-specific partial updates.
- `target` and `content` under `update` for semantic update details.
- Use `mode: replace` for partial update replacement semantics.
  it is not an instruction to write raw `hx-*` attributes into the design doc.

Keep MarkVSpec semantic. Do not turn it into htmx attribute syntax.

## Implementation Target

Initial implementation should be:

- `packages/core`: parser, validator, render model.
- `packages/vscode-extension`: VS Code command, webview live preview, diagnostics.

MVP user story:

Open `examples/01-basics/login-basic.vspec.md` in VS Code and run `MarkVSpec: Open Preview`.
The webview should show a low-fidelity wireframe and update as the document changes.

## Kanban

Use Kanbalone for project task tracking.

- Board URL: `http://localhost:3470/boards/7`
- Board ID: `7`
- Lanes: `todo`, `doing`, `done`
- Use the `kanbalone-api` skill and HTTP API only.
- Installed skill path: `~/.codex/skills/kanbalone-api`
- Write MarkVSpec Kanbalone ticket titles, bodies, and comments in Japanese by
  default.

The requested GitHub skill source was:

`https://github.com/wamukat/kanbalone/tree/main/skills/kanbalone-api`

It was already installed in this environment.

## Done Policy

Before moving any MarkVSpec Kanbalone ticket to `done`, use the project-local skill:

`skills/markvspec-done-review/SKILL.md`

Hard rule: every ticket must receive an independent sub-agent review before it is
moved to `done`.

Codex is responsible for moving reviewed work to the `done` lane, but must leave
`isResolved: false`. The user will verify the result and set the resolve flag.

If sub-agents are unavailable, leave the ticket in `doing` and add a Kanbalone
comment explaining that the ticket is blocked from completion until review is
available.
