# Project Index Design

MarkVSpec is currently single-screen-first. Multi-screen support should add a
small project index that discovers screen files, validates cross-file
references, and builds project-wide transition diagrams without making each
screen file less readable.

## Proposed Format

Use a Markdown file named `vspec.project.md` at the project root. Keep machine
readable project metadata in Front Matter and human notes in Markdown.

```markdown
---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: examples/04-real-world-screens/search-list.vspec.md
  - id: SCR-USER-DETAIL
    path: examples/03-actions/form-submit-flow.vspec.md
  - id: SCR-USER-EDIT
    path: examples/01-basics/login-basic.vspec.md
---

# PRJ-ADMIN Admin Console

## Notes

- User management screens are owned by the admin area.
```

If no project index exists, tooling may fall back to workspace discovery with
`**/*.vspec.md`, excluding dependency and build directories. The explicit
index should take precedence because it gives reviewable ordering and allows
teams to omit drafts or experiments.

## Screen Discovery Rules

- Indexed paths are relative to the project index file.
- Each indexed `id` must match the screen Front Matter `id` in the target file.
- Duplicate screen IDs are errors.
- Missing files are errors.
- Files discovered implicitly but not listed are informational only when an
  explicit index exists.

## Transition Graph Requirements

The project graph should be built from Action transitions that use
`navigate: SCR-*`.

For each edge, record:

- source screen ID
- source action ID and marker when available
- action name
- source state when available
- result case when available
- target screen ID

The graph should keep external URLs separate from screen IDs. A transition to
`/path` or `https://...` is an external navigation edge, not a missing screen.

## Cross-File Validation Scope

Initial v0.4 validation should cover:

- `navigate: SCR-*` references a screen in the project index or discovery set.
- Project index IDs match target screen Front Matter IDs.
- Duplicate screen IDs are reported once at the project level.
- The same route used by multiple screens is a warning unless explicitly
  allowed later.

Do not validate layout, element, action, or state IDs across files in v0.4.
Those IDs remain screen-local.

## Output Surfaces

- VS Code command: open project index preview.
- Project transition diagram: Mermaid graph of screen-to-screen navigation.
- Project diagnostics: missing screen file, ID mismatch, duplicate screen ID,
  missing navigation target.
- Static HTML export: one project document linking to each screen document.
