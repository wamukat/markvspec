---
name: markvspec-authoring
description: Use when creating or editing MarkVSpec `.vspec.md` screen specifications, especially from requirements notes, screen ideas, or existing Markdown design material.
---

# MarkVSpec Authoring

Use this skill when creating or editing `.vspec.md` files.

MarkVSpec is a Markdown-first screen specification format. Keep the document semantic and implementation-neutral:

- One `.vspec.md` file describes one screen.
- YAML Front Matter is only for document-level metadata.
- Markdown headings declare screens, layouts, elements, actions, rules, and related objects.
- Markdown bullets declare properties, rules, conditions, transitions, and effects.
- Do not use Markdown tables as canonical source.
- Do not write raw CSS classes, raw colors, dimensions, or htmx attributes into the specification.
- Model htmx-style behavior with Actions, Process/HttpRequest, Cases, and display/update effects.

## Before Creating A Spec

When starting from a requirements note, screen idea, meeting note, API note, or other Markdown input that is not yet `.vspec.md`, run:

```bash
markvspec diagnose input <markdown-file>
```

Read the JSON report yourself. Do not paste the raw report back to the user. Use it to summarize missing information, confirmation questions, warnings, and the next edits needed before or during authoring.

The report uses the current `ai-input-diagnostics/v1` schema. Pay attention to:

- `readinessLevel`
- `readinessScore`
- `missingInformation`
- `questions`
- `findings`
- `axes`

Treat these as readiness, missing information, confirmation questions, warnings/errors, and evidence for whether the input is specific enough for AI-assisted screen specification work.

## Creating Or Editing `.vspec.md`

Follow the project DSL conventions. Prefer these section names when applicable:

- `## States`
- `## Layout`
- `## Elements`
- `## Actions`
- `## Rules`
- `## Notes`
- `## Open Questions`

Use stable semantic IDs:

- `SCR-*` for screens
- `L-*` for layout groups
- `E-*` for elements
- `A-*` for actions
- `R-*` for rules

Element guidance:

- Use `Heading` with `level: 1..6`; do not invent `H1` through `H6` element types.
- Use `Paragraph` for prose.
- Use `Text` for short labels, values, and compact text.
- Use `variant` for priority: `primary`, `secondary`, `tertiary`.
- Use `tone` for semantic intent: `neutral`, `info`, `success`, `warning`, `danger`.
- Avoid low-level styling properties such as `size`, raw colors, CSS classes, `width`, or `height`.

For server interactions and partial updates, keep the spec semantic:

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
      - mode: replace
```

## After Editing A Spec

After creating or editing `.vspec.md`, validate it:

```bash
markvspec validate <file-or-glob> --fail-on-warnings
```

Use `--fail-on-warnings` for AI-agent work so warnings are treated as failures. Fix diagnostics when they reflect actual DSL, reference, or authoring issues. If a warning is intentionally left unresolved, explain why and keep the remaining risk visible.

For a lighter manual check, `markvspec validate <file-or-glob>` is available, but the standard AI-agent workflow should use `--fail-on-warnings`.

## Reporting Back

Summarize:

- what spec files changed;
- what gaps or confirmation questions came from `diagnose input`, if used;
- what `validate` command ran;
- whether validation passed, failed, or passed with intentionally accepted warnings.
