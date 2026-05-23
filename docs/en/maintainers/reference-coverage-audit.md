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
| External input / configuration source | Front Matter `messages`, project `screens`, VS Code settings absence/presence | Reference required when users can provide or search for that input |
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
| `packages/core/src/markdown-document.ts`, `parser.ts`, and `project-parser.ts` | Adopt | Source of truth for Front Matter parsing, document references, screen fields, and project entries. |
| `packages/core/src/renderer-message-loader.ts` | Adopt | Source of truth for renderer message file lookup, supported file names, locale handling, and warning behavior. |
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
- VS Code commands and settings presence/absence from `packages/vscode-extension/package.json`.
- Front Matter fields, project file fields, and renderer message resolution from
  the parser, project parser, exporter, VS Code extension, and renderer message
  loader.
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

## Minimal Checker

`npm run audit:reference-coverage` builds a deterministic inventory/report from
grammar sections, structured contexts, element types and properties, diagnostic
codes and detectable diagnostic push sites, renderer/exporter/preview output
features, CLI commands/options, VS Code commands/settings presence, Front Matter
fields, project file fields, renderer message resolution coverage targets,
Reference page structure, generated Reference markers, and example catalog
entries.

The initial checker is intentionally report-first. It fails only when the audit
preconditions are broken:

- A required inventory category is empty.
- English and Japanese Reference page sets are asymmetric.
- Required generated Reference markers are missing.
- A required external input/configuration inventory category is empty, or a
  required Reference coverage target is missing.
- Existing Reference page structure is unreadable enough that the report cannot
  be trusted.

It warns, without failing release, when feature-to-Reference mapping is still
manual, coverage markers are not present, prose depth may be thin, Guide-only or
Example-only coverage may exist, or diagnostic/renderer/export coverage cannot
yet be judged mechanically. External input/configuration prose depth and exact
item-to-paragraph mapping are also warnings until stable feature IDs and marker
coverage are introduced.

`npm run audit:reference-coverage` is not included in `npm run check:release`
yet. Missing Reference page/section findings should be promoted from warning to
release-blocking failure only after the first generated report has been triaged
and stable feature IDs or coverage markers exist.

## Coverage Markers

Reference coverage markers use this HTML comment form:

```html
<!-- markvspec-coverage:reference.page.actions -->
```

Marker IDs must be stable, lowercase feature IDs using `.` and `-` as
separators. Do not reuse `markvspec-generated:*` markers for coverage; generated
markers prove that generated tables exist, while coverage markers map a product
feature to explanatory prose.

The first supported marker family is `reference.page.<basename>`, one marker per
non-index Reference page in both English and Japanese. For example,
`reference.page.actions` must appear in both `docs/en/reference/actions.md` and
`docs/ja/reference/actions.md`.

`npm run audit:reference-coverage` reports the feature ID to Reference marker
mapping and warns when a required locale marker is missing. Marker absence is a
warning while the coverage model is being introduced; individual feature
families can become release-blocking only after their expected marker set is
stable and triaged.

## External Input / Configuration Coverage

External input coverage tracks settings and inputs that users provide outside the
ordinary Markdown section body. The report currently includes these categories:

| Category | Source | Required Coverage Target |
| --- | --- | --- |
| CLI commands | `packages/cli/src/index.ts` usage and command branches | [CLI](../reference/cli.md) |
| CLI options | `packages/cli/src/index.ts` flags | [CLI](../reference/cli.md), [External Inputs And Configuration](../reference/configuration.md) |
| Front Matter fields | `markdown-document.ts`, `parser.ts`, `project-parser.ts`, exporter, VS Code extension | [File Format](../reference/file-format.md), [External Inputs And Configuration](../reference/configuration.md) |
| Project file fields | `project-parser.ts` project `screens:` / `templates:` entries | [File Format](../reference/file-format.md) |
| VS Code commands | `packages/vscode-extension/package.json` contributes.commands | Start/Preview docs and [External Inputs And Configuration](../reference/configuration.md) |
| VS Code settings absence/presence | `packages/vscode-extension/package.json` contributes.configuration | [External Inputs And Configuration](../reference/configuration.md) |
| Renderer message resolution | `renderer-message-loader.ts`, exporter, VS Code extension | [CLI](../reference/cli.md), [File Format](../reference/file-format.md), [External Inputs And Configuration](../reference/configuration.md) |

`npm run audit:reference-coverage` fails when a required source category becomes
empty or when a Reference coverage target for this matrix is missing. It reports
the discovered items and warns, rather than failing, when a reviewer still needs
to judge whether the prose explains syntax, precedence, boundary behavior, and
diagnostics deeply enough.

The #1425 report found these current counts: CLI options `4`, Front Matter
fields `13`, project file fields `4`, VS Code settings entries `1` with status
`absent`, renderer message resolution entries `3`, and external
input/configuration categories `7`.

## Diagnostic Coverage Matrix

Diagnostic coverage starts from `supportedDiagnosticMessageCodes()`. The matrix
does not make diagnostic prose itself canonical; it records where authors should
go to understand and fix each diagnostic.

| Diagnostic Code | Severity | Trigger Category | User-Facing Coverage | Status |
| --- | --- | --- | --- | --- |
| `frontMatter.missingYaml` | warning | File has no YAML Front Matter block. | [File Format](../reference/file-format.md), [Start](../start/index.md) | Covered |
| `frontMatter.missingRequired` | error | Required Front Matter field `id`, `type`, or `title` is missing. | [File Format](../reference/file-format.md), [Start](../start/index.md) | Covered |
| `section.recommendedOrder` | warning | Recognized section appears after a later recommended section. | [Sections](../reference/sections.md), [Grammar](../reference/grammar.md) | Covered |
| `layout.missingViewport` | warning | `## Layout` section lacks a viewport suffix. | [Sections](../reference/sections.md), [Grammar](../reference/grammar.md) | Covered |
| `layout.groupIgnoredWithoutViewport` | warning | Layout group appears under a Layout section that has no viewport. | [Sections](../reference/sections.md) | Covered |
| `layout.unsupportedItemsEntry` | warning | `#### Items` contains an entry that is not an `L-*` or `E-*` item. | [Sections](../reference/sections.md), [IDs](../reference/ids.md) | Covered |
| `element.unknownType` | warning | Element heading uses an unsupported element type. | [Elements](../reference/elements.md), [Grammar](../reference/grammar.md) | Covered |
| `action.missingTrigger` | warning | Action has no element action, event, or response receive trigger. | [Actions](../reference/actions.md), [Elements](../reference/elements.md), [Sections](../reference/sections.md) | Covered |
| `action.invalidTrigger` | warning | Action trigger uses an unsupported trigger shape. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `action.process.multipleExecutionDetails` | warning | One Process step contains more than one execution detail block. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `action.process.mixesExecutionDetailAndImmediateEffects` | warning | One Process step mixes execution detail with direct immediate effects. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `action.process.mixesResultClassificationAndImmediateEffects` | warning | One Process step mixes result classification with direct immediate effects. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `action.parallelProcess.caseShouldNotSetStateOrNavigate` | warning | Parallel Process case sets final state or navigation instead of deferring to Resolve. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `action.process.caseResponseWithoutReceive` | warning | Process case uses `response` without a `receive: response` detail. | [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | Covered |
| `unrepresented-source-text` | warning | Source prose or list item is preserved but not represented in MarkVSpec output. | [Grammar](../reference/grammar.md), [Limitations](../reference/limitations.md) | Covered |
| `partial.referenceMissing` | error | Partial reference is not declared in Front Matter `references.partials`. | [File Format](../reference/file-format.md), [Sections](../reference/sections.md) | Covered |
| `validation.ruleMissingElement` | error | Validation rule targets a missing `E-*` element. | [Validations](../reference/validations.md), [Elements](../reference/elements.md), [IDs](../reference/ids.md) | Covered |
| `previewScenario.missingState` | error | Preview Scenario omits `state`. | [Sections](../reference/sections.md) | Covered |
| `previewScenario.samplesMissingElement` | error | Preview Scenario sample row targets a missing `E-*` element. | [Sections](../reference/sections.md), [Elements](../reference/elements.md), [IDs](../reference/ids.md) | Covered |

Future machine-readable mapping should keep this shape close to the source:

- `code`: one value from `supportedDiagnosticMessageCodes()`.
- `severity`: expected severity at the source push site.
- `category`: front matter, section order, layout, element, action process,
  partial, validation, preview scenario, or output representation.
- `coverageMarkers`: Reference coverage feature IDs that explain the fix.
- `followUp`: optional Kanbalone ticket when the Reference explanation is thin.

No new blocking docs gap was found in this matrix pass. The remaining automation
gap is that `audit:reference-coverage` inventories diagnostic codes and push
sites, but does not yet compare them against this matrix.

## Renderer / Export Output Coverage Matrix

Renderer and export coverage starts from user-visible output, not from individual
CSS selectors or implementation helpers. A cluster needs Reference or Start
coverage when a reviewer can make a product decision from that output.

This matrix is also the checklist for mismatches that are invisible in the VS
Code live preview but visible in static HTML, PDF, or project `document-list`
export. For each row, compare the same source file through the relevant
artifacts and verify that IDs, markers, labels, ordering, diagnostics, and
omitted/compact fields preserve the documented semantics.

| Output Cluster | Source Of Truth | User-Facing Coverage | Representative Example | Artifact To Verify |
| --- | --- | --- | --- | --- |
| Screen Basic Info | Front Matter plus `latestHistoryBasicInfo()` over `## History` entries in source order | [File Format](../reference/file-format.md), [History](../reference/history.md), [Start](../start/index.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview, `export html`, `export pdf` |
| Static document section order and table of contents | `renderStaticDesignDocumentHtml()` section list and generated grammar section order | [Sections](../reference/sections.md), [Grammar](../reference/grammar.md) | `examples/01-basics/hello-screen.vspec.md` | `export html`, `export pdf` |
| States, state flow, and action transition tables | `## States`, action `From`, process result cases, and Mermaid state graph generation | [Sections](../reference/sections.md), [Actions](../reference/actions.md), [Grammar](../reference/grammar.md) | `examples/03-actions/form-submit-flow.vspec.md` | VS Code preview, `export html`, `export pdf` |
| State Views and Preview Scenarios | `## Layout`, `## Elements`, `## View Context`, `## View Context Samples`, and `## Preview Scenarios` | [Sections](../reference/sections.md), [Elements](../reference/elements.md), [Grammar](../reference/grammar.md) | `examples/02-states/source-kind-metadata.vspec.md`, `examples/02-states/responsive-profile.vspec.md` | VS Code preview state views, `export html`, `export pdf` |
| Marker/ID cells and entity reference chips | Canonical IDs plus optional `marker` properties resolved by entity reference presenters | [File Format](../reference/file-format.md), [IDs](../reference/ids.md), [Elements](../reference/elements.md), [Actions](../reference/actions.md) | `examples/01-basics/hello-screen.vspec.md`, `examples/02-states/presentation-panel.vspec.md` | VS Code preview, static HTML tables, PDF tables |
| Element display source metadata and Display Content Spec | Element-level `source` fallback plus nested `kind`, `source`, and `format` display value metadata | [Elements](../reference/elements.md), [Grammar](../reference/grammar.md), [Limitations](../reference/limitations.md) | `examples/02-states/source-kind-metadata.vspec.md`, `examples/04-real-world-screens/notice-detail.vspec.md` | VS Code preview element details, static HTML Display Content Spec, PDF tables |
| Form Groups and input specification tables | `## Form Groups`, element types/properties, required/value/source/spec columns | [Elements](../reference/elements.md), [Sections](../reference/sections.md), [Validations](../reference/validations.md) | `examples/03-actions/form-submit-flow.vspec.md` | VS Code preview, static HTML, PDF |
| Business Rules, Validations, and Error Codes sections | Rule/validation/error-code structured sections and validation renderer helpers | [Rules](../reference/rules.md), [Validations](../reference/validations.md), [Sections](../reference/sections.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview, static HTML, PDF |
| History table | `## History Fields`, effective standard fields, custom entry metadata, and `## History` entries | [History](../reference/history.md), [Sections](../reference/sections.md), [Grammar](../reference/grammar.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview, static HTML, PDF |
| Export diagnostics section | Parser/project diagnostics plus message localization in `renderDiagnostics()` | [CLI](../reference/cli.md), [Validations](../reference/validations.md), Diagnostic Coverage Matrix in this document | `examples/06-structured-sections/history-and-errors.vspec.md` | `validate`, `export html`, `export pdf` with warning/error fixtures |
| Project preview overview, notes, templates, screens, and transitions | `.vspec.project.md` Front Matter/body, project loader, project transition graph | [File Format](../reference/file-format.md), [Preview](../start/preview.md), [Export](../start/export.md) | `packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md` | VS Code project preview, project `export html`, project `export pdf` |
| Project `document-list` export | `exportDocumentList()` over project screens/templates/partials and per-document diagnostics | [CLI](../reference/cli.md), [File Format](../reference/file-format.md), [History](../reference/history.md) | `packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md` | `export document-list` output Markdown |
| Renderer messages and localized labels | Built-in locale messages, Front Matter `messages`, CLI `--messages`, and message-file diagnostics | [CLI](../reference/cli.md), [File Format](../reference/file-format.md) | Any source exported with `markvspec.messages.yml` | VS Code preview labels, `export html`, `export pdf` |

Review rows that include static HTML or PDF by inspecting the generated artifact,
not only the source or a unit test. Marker/ID and Display Content Spec rows are
especially sensitive because the live preview can show a readable chip while the
static table accidentally substitutes a label, marker, or sample value for the
canonical ID or source metadata.

This matrix pass found no new focused docs gap or render/export mismatch beyond
the already tracked source metadata and Marker/ID work. No additional follow-up
ticket was required for #1417. The remaining automation gap is that
`audit:reference-coverage` inventories renderer/export output features, but does
not yet compare those features against this matrix or generated artifacts.

## First Generated Report

The first checked report was generated for #1412 with
`npm run audit:reference-coverage`. It completed with `Failures: 0`.

| Inventory | Count |
| --- | ---: |
| Grammar sections | 18 |
| Structured item contexts | 22 |
| Structured items | 158 |
| Element types | 35 |
| Element properties | 95 |
| Diagnostic codes | 19 |
| Diagnostic push sites | 17 |
| Renderer output features | 189 |
| Generated Reference marker files | 24 |
| English Reference pages | 12 |
| Japanese Reference pages | 12 |
| VS Code commands | 5 |
| CLI commands | 11 |
| Example catalog entries | 28 |
| Example files | 28 |

Warnings from the first report:

| Warning | Classification | Next Action |
| --- | --- | --- |
| `rules.md` English/Japanese key heading count differs (`9` vs `8`) | English/Japanese depth gap candidate | Triage in #1413. If the missing/thin heading reflects real content asymmetry, create a focused docs ticket. |
| Reference coverage markers are not present yet | Follow-up infrastructure gap | Triage in #1413. Likely create a focused ticket for stable feature IDs or coverage markers before making missing coverage release-blocking. |
| Feature-to-Reference mapping is report-only | Expected skeleton limitation | Triage in #1413 before promoting missing Reference page/section findings to failures. |
| Diagnostic and renderer/export output coverage still requires manual review | Expected skeleton limitation | Triage in #1413 by cluster: diagnostics, renderer/export output, CLI, VS Code, and examples. |

None of these warnings are release-blocking in the first report. They are triage
inputs for #1413; this #1412 update does not make broad Reference prose changes.

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

- Triage the first generated coverage report and create focused docs tickets for
  each missing or thin area.
- Add Reference coverage markers for feature IDs and generated inventory tables.
- Add renderer-output coverage inventory for Basic Info, State Views, History,
  marker/chip display, and export-only fields.
- Add English/Japanese Reference coverage comparison for page presence and key
  headings.

## Maintenance Rule

When adding a user-visible feature, update one of these before merging:

- Reference page/section for exact syntax and behavior.
- Guide or Recipe if users need workflow context.
- Example if output inspection is important.
- Maintainer-only doc only when the feature is not user-facing.

If the feature is represented in `grammar-definition.ts`, generated grammar and
reference docs must be regenerated or checked before release.
