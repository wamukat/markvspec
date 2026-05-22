# Docs Code Audit

`npm run audit:docs-code` checks MarkVSpec examples in the documentation source.
It audits `docs/`, `README.md`, and `README.ja.md`; generated
`docs-site/src/content/docs/` files are not source of truth and are not checked.

## Fence Markers

Use one of these markers for Markdown fences that contain MarkVSpec source:

- `markdown markvspec`: a complete `.vspec.md` document. The audit validates it
  with the same diagnostic gate as `markvspec validate --fail-on-warnings`.
- `markdown markvspec-fragment section=screen`: a body fragment that already
  contains one or more `##` sections. The audit wraps it in temporary front
  matter and a screen heading before validation. Do not use this for snippets
  that include front matter; use `markdown markvspec` instead.
- `markdown markvspec-fragment section=elements`: an Elements-section fragment.
- `markdown markvspec-fragment section=business-rules`: a Business Rules-section
  fragment.
- `markdown markvspec-skip reason=<specific-reason>`: a contextual, negative, or
  non-canonical example that should not be validated as a standalone source.

Do not leave MarkVSpec-like `markdown` fences unmarked. The audit fails them so
examples cannot silently escape validation.

## Skip Reasons

Skip reasons must be concrete. `reason=context` is forbidden because it does not
explain what context is missing.

Current reasons include:

- `requires-action-heading`
- `requires-action-definitions`
- `requires-actions-context`
- `requires-cross-section-context`
- `requires-element-definitions`
- `requires-elements-context`
- `requires-layout-context`
- `requires-partial-context`
- `requires-preview-context`
- `requires-preview-scenario-heading`
- `requires-preview-scenarios-context`
- `requires-rule-error-context`
- `requires-state-action-definitions`
- `requires-validation-context`
- `noncanonical-example`
- `project-file-example`
- `non-markvspec`

Prefer validation over skip. Use skip only when the snippet is intentionally
partial, requires surrounding definitions that would distract from the point, or
shows a non-canonical pattern.

## Release Check

`npm run check:release` includes `npm run audit:docs-code`.

The audit prints file and line for every validated, fragment-validated,
explicitly skipped, and non-MarkVSpec code block. Warning and error diagnostics
fail the command.
