# Reference Coverage Audit

This document defines how maintainers decide whether MarkVSpec Reference covers
all product-facing functionality. It is a planning and review guide for future
checkers; it does not replace the existing generated-docs and vocabulary audits.

## Goal

Every user-visible feature must have at least one Reference entry that states the
canonical syntax, semantic boundary, diagnostics when relevant, and where users
can see an example. Guide, Recipes, and Examples can teach usage, but they do not
substitute for Reference coverage.

## Feature Inventory Classes

| Class | Examples | Required Coverage |
| --- | --- | --- |
| DSL section | `## Actions`, `## Error Codes`, `## History` | Reference required, generated grammar row required, example recommended |
| Structured item / property | `Process P1:`, `request`, `label`, `required` | Reference required, grammar-definition coverage required when structured |
| Element type | `Heading`, `Input`, `Tabs`, `ActionMenu` | Reference required, example required for non-trivial controls |
| Element property | `text`, `label`, `value`, `action event` | Reference required when rendered, Guide recommended when confusing |
| Validation / diagnostic behavior | duplicate IDs, non-canonical items, required fields | Reference required when source authors can trigger it |
| Renderer / preview output feature | Basic Info, History table, state views, marker chips | Reference required when output affects review semantics |
| CLI command / option | `validate`, `export html`, `export document-list` | CLI Reference required, example recommended |
| VS Code command / UI feature | Open Preview, diagnostics, export commands | Start/Guide required, Reference or Start page required depending on user task |
| Example-supported pattern | partial update, loading/error states, history | Example required; Reference required for every syntax used |

## Coverage Levels

| Level | Meaning | Minimum Evidence |
| --- | --- | --- |
| Reference required | Users need exact syntax or behavior to author correctly | Dedicated Reference page or section, canonical example, diagnostics/renderer notes |
| Guide recommended | Users need workflow or decision guidance | Guide page or subsection linked from Reference |
| Recipe optional | Pattern combines multiple features into a task | Recipe page if repeated user workflow exists |
| Example required | Feature is easier to understand by inspecting output | Catalog example or showcase link |
| Maintainer-only | Feature is internal or release/process-only | Maintainer doc, no public sidebar link |

When a feature appears in Guide or Examples but not Reference, classify it as
`Guide-only Reference gap`. History before #1386 was in that state.

## Source Inventory

| Source | Decision | Why |
| --- | --- | --- |
| `packages/core/src/grammar-definition.ts` | Adopt | Source of truth for recognized sections, section order, structured item keys, and generated grammar/reference tables. |
| `packages/core/src/element-domain.ts` and element validators | Adopt | Source of truth for element type behavior and element-specific properties. |
| `packages/core/src/markdown-section-semantic.ts` | Adopt | Source of truth for parser behavior that is not fully table-driven yet. |
| `packages/core/src/validator.ts` and focused validators | Adopt | Source of truth for author-visible diagnostics and severity. |
| `packages/core/src/project-loader.ts` | Adopt | Source for template/screen composition behavior that can affect visible docs. |
| Renderer, document-renderer, exporter, VS Code preview | Adopt | Source for visible output semantics such as Basic Info, History table, state views, and export behavior. |
| `packages/cli/src/index.ts` | Adopt | Source of truth for CLI commands and options. |
| `packages/vscode-extension/package.json` and command handlers | Adopt | Source of truth for contributed commands and user-visible VS Code entry points. |
| `examples/catalog.yml` and `examples/**/*.vspec.md` | Adopt | Source for patterns that users can copy and for syntax that must be documented. |
| Generated Reference docs | Adopt as evidence, not source | They prove generated blocks exist, but the source remains grammar definition and implementation. |
| `docs/*/maintainers/*audit*` | Adopt as historical evidence | They record prior gaps and checks, but do not define current DSL syntax by themselves. |
| Future integrations not implemented in this repository | Hold | Record as a possible future source only after the feature enters the product plan; do not count it for current Reference coverage. |
| Rendered `docs-site/src/content/docs/` | Do not adopt | Generated copy from `docs/`; never the documentation source of truth. |

Use `Hold` for a source that may become relevant but is not currently stable
enough to define coverage, such as a planned online editor persistence model or
a future external integration. A held source must not create a release-blocking
Reference gap until the product feature is accepted into implementation scope.

## Coverage Extraction

Automatable extraction:

- Sections and structured items from `grammar-definition.ts`.
- Generated grammar/reference rows between `markvspec-generated:*` markers.
- Element type names and type-specific properties from element domain and validators.
- CLI commands/options from `packages/cli/src/index.ts`.
- VS Code commands from `packages/vscode-extension/package.json`.
- Example feature tags and source paths from `examples/catalog.yml`.
- English/Japanese Reference page presence and link graph from docs link checks.

Human review remains required for:

- Whether a Reference paragraph explains the semantic boundary clearly enough.
- Whether a Guide-only topic needs a Reference page.
- Whether renderer output behavior is user-visible enough to require Reference.
- Whether English and Japanese have equivalent depth, not just matching links.
- Whether an example is representative rather than incidental.

## Diff Categories

| Category | Meaning | Action |
| --- | --- | --- |
| Missing Reference | Feature has no Reference entry | Add Reference page/section |
| Thin Reference | Feature is named but lacks syntax, behavior, or diagnostics | Expand Reference |
| Implementation mismatch | Docs claim behavior that code does not implement | Fix docs or implementation |
| Guide-only Reference gap | Guide explains a feature, Reference lacks exact syntax | Add Reference coverage |
| Example-only Reference gap | Example uses syntax not covered in Reference | Add Reference coverage or change example |
| English/Japanese depth gap | One locale has materially less information | Update the thinner locale |
| Generated-doc drift | Generated block differs from grammar definition | Run generator or fix generator/source |

## Existing Checks

| Check | Current Role | Gap |
| --- | --- | --- |
| `npm run check:generated-docs` | Confirms grammar and generated Reference blocks match `grammar-definition.ts` | Does not decide whether every feature has hand-written Reference coverage |
| `npm run audit:docs-code` | Validates MarkVSpec fenced examples in user docs | Does not inventory all product features |
| `npm run audit:docs-reference-vocabulary` | Checks Reference fenced examples and generated tables against grammar vocabulary | Does not scan prose or renderer/CLI/extension features |
| `npm run check:docs-links` | Validates docs links and catalog links | Does not detect missing conceptual coverage |
| `npm run audit:examples` | Validates examples through VS Code audit tests | Does not prove every example syntax is documented |

`scripts/generate-grammar-docs.mjs` generates the full grammar pages used by
`npm run docs:grammar` and `npm run check:grammar-docs`. `scripts/generate-reference-docs.mjs`
updates the generated Reference tables used by `npm run docs:reference` and
`npm run check:reference-docs`. `npm run check:generated-docs` runs both checks.

## Proposed Minimal Checker

A future `npm run audit:reference-coverage` should start with deterministic,
low-noise checks:

1. Build a feature inventory JSON from grammar sections, structured contexts,
   element types, CLI commands, VS Code commands, and example catalog entries.
2. Extract Reference coverage from headings, generated block markers, and
   explicit maintainer-owned coverage markers.
3. Fail on missing Reference page/section for Reference-required features.
4. Warn on Guide-only or Example-only features without Reference links.
5. Report English/Japanese asymmetry for page presence and key headings.

Do not fail release on prose-depth scoring until the report has been reviewed
manually for at least one release cycle.

## Initial Gaps To Track

| Gap | Why It Matters | Suggested Follow-up |
| --- | --- | --- |
| No machine-readable feature inventory | Coverage cannot be checked consistently | Add inventory extractor for grammar, element, CLI, VS Code, and examples |
| Reference coverage has no explicit markers | A checker cannot reliably map feature IDs to prose | Add optional coverage markers or generated inventory tables |
| Renderer output semantics are scattered | Basic Info, History, state views, chips, and document tables can drift from docs | Add renderer-output coverage table to Reference or maintainer inventory |
| English/Japanese depth is manual | Link checks cannot tell whether both locales explain the same feature | Add locale heading/coverage comparison report |

History-specific Guide/Reference coverage was completed in #1386 and should be
used as a model for future Guide-only gaps.

## Follow-up Ticket Ideas

- Implement `audit:reference-coverage` inventory extraction and report output.
- Add Reference coverage markers for feature IDs and generated inventory tables.
- Add renderer-output coverage inventory for Basic Info, State Views, History,
  marker/chip display, and export-only fields.
- Add English/Japanese Reference coverage comparison for page presence and key
  headings.
- Triage the first generated coverage report and create focused docs tickets for
  each missing or thin area.

## Maintenance Rule

When adding a user-visible feature, update one of these before merging:

- Reference page/section for exact syntax and behavior.
- Guide or Recipe if users need workflow context.
- Example if output inspection is important.
- Maintainer-only doc only when the feature is not user-facing.

If the feature is represented in `grammar-definition.ts`, generated grammar and
reference docs must be regenerated or checked before release.
