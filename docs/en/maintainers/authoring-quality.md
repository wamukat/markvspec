# MarkVSpec Authoring Quality

This note records the release recommendation for formatter and lint behavior.

## Recommendation

MarkVSpec should prioritize structural lint diagnostics before providing an
automatic formatter.

The DSL is still evolving, and MarkVSpec files are also human-facing Markdown
design documents. A formatter can accidentally rewrite spacing, prose, or
unknown Markdown sections in a way that makes the document less useful for
review. Lint diagnostics are lower risk because they point out structural
problems without changing the author's text.

## Lint Scope

Lint should focus on issues that affect parsing, preview, navigation, and
design review:

- Missing required Front Matter.
- Front Matter and level-1 heading mismatches.
- Missing or duplicate initial states.
- Duplicate IDs and duplicate markers.
- Bare `## Layout` sections instead of `## Layout: <viewport>`.
- Semantic sections outside the recommended order.
- Layout item references outside `#### Items`.
- Missing referenced layouts, elements, actions, rules, or states.
- Unsupported element types, layout kinds, action events, and element
  properties.
- Action blocks that cannot be interpreted, including missing `From` / `Process`
  structure or missing caller connections.
- Partial references used by layouts or partial update actions but missing from
  `references.partials`.
- Referenced template/partial files that are missing, point to the wrong
  document ID, or point to the wrong document type.
- Partial updates written without the current `PartialRequest` and `mode: replace` structure.

## Validation Gate

The core package exposes `evaluateMarkVSpecDiagnostics()` as the shared
validation gate for the CLI and editor integrations. The gate counts errors and
warnings and returns a CI-ready `exitCode`.

Default behavior:

- `error` diagnostics fail the gate with exit code `1`.
- `warning` diagnostics are reported but do not fail the gate.

Strict behavior:

- Set `failOnWarnings` to make warnings fail the gate as well.
- This mode is useful for release checks or repositories that want design
  documents to be warning-free before implementation.

## Formatter Position

Format-on-save and automatic document formatting are intentionally conservative in this release
recommendation.

The VS Code extension provides an explicit `MarkVSpec: Format Structure` command
for opt-in cleanup. It is intentionally conservative:

- Format only recognized MarkVSpec blocks.
- Preserve unknown Markdown sections byte-for-byte.
- Avoid rewriting prose.
- Avoid changing list indentation.
- Normalize blank lines and trailing whitespace inside recognized sections only.

## Risks

- Markdown tables, prose, and notes are part of the design document, not just
  parser input.
- Unknown sections may contain decisions or review context that tools must not
  discard.
- Automatic formatting can create noisy diffs while the DSL is still changing.
- Overly strict lint can make exploratory authoring feel hostile.

## Included Authoring Helpers

The VS Code extension includes authoring helpers around the current lint scope:

- Quick fixes for common structural lint findings.
- Documentation-driven lint rules for action process and case structure.
