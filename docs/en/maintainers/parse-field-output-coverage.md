# Parse Field Output Coverage Matrix

This maintainer matrix audits authoring-derived fields from
`packages/core/src/types.ts` against preview/export output. It intentionally
excludes parser bookkeeping such as `location`, `raw`, `propertyLocations`,
`fieldLocations`, dependency graph coordinates, and loaded-project resolver
paths; those fields are internal metadata and should not become sentinel output.

Coverage statuses:

- `rendered-preview`: covered by VS Code preview design-document output.
- `rendered-static-export`: covered by static single-document HTML export.
- `rendered-project`: covered by project preview or document-list export.
- `diagnostic`: intended to surface through diagnostics rather than content.
- `unsupported/deprecated`: parsed only for compatibility or explicitly warned.
- `internal-metadata`: parser/runtime metadata only.
- `follow-up`: known gap that should be handled by a dedicated ticket.

Regression fixtures:

- Screen track: `packages/core/test-fixtures/parse-output-coverage/screen-sentinel.vspec.md`
- Project track: `packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md`

Project-level checks currently cover project preview HTML and document-list
export. They do not claim full static project-site parity.

## Screen Document

| Type / field | Classification | Notes |
| --- | --- | --- |
| `screen.id`, `screen.title`, `screen.description`, `screen.route`, `screen.defaultState`, `screen.frontMatter.locale` | `rendered-preview`, `rendered-static-export` | Screen spec, state views, route/scenario rendering, and localized labels. |
| `screen.template`, `screen.templateSrc`, `screen.references` | `rendered-project`, `diagnostic` | Composition/project loading consumes these; broken references become diagnostics. Standalone screen docs do not render the raw reference object. |
| `states.name`, `states.initial`, `states.preInitial` | `rendered-preview`, `rendered-static-export` | State lists, state views, and transition context. |
| `states.message` | `rendered-preview`, `follow-up` | VS Code preview renders state messages. Static export parity should be handled separately if needed. |
| `layoutGroups.id`, `name`, `viewport`, `kind`, `partial`, `items`, `properties`, `notes` | `rendered-preview`, `rendered-static-export` | Layout spec tables and state-view wireframes. |
| `layoutGroups.overview` | `rendered-preview`, `follow-up` | Static export currently keeps layout notes but not all lead prose. |
| `slotDefinitions.name`, `title`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Template slot contracts and composed project documents. |
| `slotContents.name`, `viewport`, `layoutGroups` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Screen-side slot content is rendered after composition. |
| `elements.id`, `type`, `documentRole`, display properties, metadata, route params, options, tabs, accordions, menu items, table columns/rows, sample rows, conditional expressions, validations, input rules, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Element spec tables, wireframes, state views, and scenario samples. |
| `formGroups.id`, `name`, `fields`, `submit`, `properties`, `bullets`, `overview`, `notes` | `rendered-preview`, `follow-up` | Form Groups detail prose is covered in VS Code preview; static parity is not complete. |
| `events.event`, `events.actionId` | `rendered-preview`, `rendered-static-export`, `diagnostic` | Lifecycle callers are rendered through action trigger/flow detail and validated. |
| `actions.id`, `name`, `fromStates`, `triggeredBy`, `trigger`, `transitions`, `target`, `mode`, `fragment`, `sideEffects`, `routeParams`, `responses`, `properties` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Action detail tables, state/project transition graphs, and diagnostics. |
| `actions.overview`, `actions.notes` | `rendered-preview`, `follow-up` | VS Code preview renders action prose; static action prose parity is not complete. |
| `processSteps.name`, `marker`, `parallelGroup`, `resolveGroup`, `when`, `skipWhen`, `inputs`, `receives`, `results`, `details`, `outcomes`, `to`, `target`, `mode`, `fragment`, `content`, `display`, `sideEffects` | `rendered-preview`, `rendered-static-export` | Action process cards and process/case detail tables. |
| `actionOutcomes.result`, `flow`, `flowDirectives`, `from`, `to`, `description`, `response`, `request`, `target`, `mode`, `fragment`, `content`, `display`, `sideEffects`, `errorCodes`, `businessRules`, `routeParams` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Process outcomes and transition extraction. |
| `rules.id`, `name`, `bodyLines`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `follow-up` | Business Rules section is covered in preview; static prose parity is not complete. |
| `validations.id`, `name`, `rules`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `follow-up` | Validations section is covered in preview; static prose parity is not complete. |
| `errorCodes.id`, `name`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `follow-up` | Error Codes section is covered in preview; static prose parity is not complete. |
| `historyFields.key`, `label`, `required`, `type`, `rawType` | `rendered-preview`, `rendered-static-export` | History table schema. |
| `historyEntries.version`, `fields`, `bodyLines` | `rendered-preview`, `rendered-static-export` | History section. |
| `notes.title`, `lines` | `rendered-preview`, `follow-up` | Notes section is visible in VS Code preview. Static export parity is not complete. |
| `sectionProse.overview`, `sectionProse.notes` | `rendered-preview`, `follow-up` | Section lead/notes ownership for structured sections. Static export parity is intentionally recorded as a gap. |
| `sectionProse.renderKeys` | `internal-metadata` | Routing metadata used by preview fragments. |
| `viewContexts.name`, `type`, `values`, `defaultValue`, `properties` | `rendered-preview`, `rendered-static-export` | Consumed by state-view evaluation and conditional rendering. |
| `viewContexts.overview`, `viewContexts.notes` | `follow-up` | View Context prose is parsed but not yet surfaced in generated documents. |
| `viewContextSamples.name`, `values` | `rendered-preview`, `rendered-static-export` | Consumed by scenario/state-view evaluation. |
| `viewContextSamples.overview`, `viewContextSamples.notes` | `follow-up` | View Context Sample prose is parsed but not yet surfaced in generated documents. |
| `previewScenarios.name`, `state`, `model`, `view`, `before`, `route`, `samples`, `cases`, `properties` | `rendered-preview`, `rendered-static-export` | State-view variants and sample tables. |
| `previewScenarios.overview`, `previewScenarios.notes` | `follow-up` | Known gap tracked by #1231. |
| `modelSampleGroups`, `modelSamples` | `unsupported/deprecated` | Legacy Model Samples are intentionally warned and omitted from canonical output. |
| `diagnostics` | `diagnostic` | Diagnostics table and editor diagnostics. |

## Project Document

| Type / field | Classification | Notes |
| --- | --- | --- |
| `project.id`, `project.title` | `rendered-project` | Project preview spec. |
| `project.frontMatter`, `project.heading` | `internal-metadata` | Source metadata; not a user-facing project table target beyond ID/title. |
| `templates[].id`, `templates[].path`, loaded template `title` | `rendered-project` | Project preview Templates table and document-list export. |
| `screens[].id`, `screens[].path`, loaded screen `title`, `route` | `rendered-project` | Project preview Screens table and document-list export. |
| `project.notes` | `follow-up` | Parsed project notes are not rendered by the current project preview/document-list outputs. |
| `documentGraph.nodes`, `documentGraph.edges` | `internal-metadata` | Resolver/runtime graph metadata; used to discover referenced partials. |
| `projectTransitionGraph.nodes`, `projectTransitionGraph.edges` | `rendered-project` | Project transition diagram and transition table. |
| `diagnostics` | `diagnostic` | Project preview diagnostics and document-list row counts. |

## Follow-Up Log

- #1231: Preview Scenario entity lead/notes must be surfaced consistently.
- View Context / View Context Samples prose is parsed but not surfaced as a
  generated-document section yet.
- Project document lead/notes are parsed but not surfaced by project preview or
  document-list export yet.
- Static export omits several structured-section lead/entity prose fields that
  VS Code preview already renders. This ticket records the gap instead of
  broadening static export behavior.
- Static project-site parity is intentionally not asserted by the sentinel tests;
  add a dedicated ticket if project-site export becomes a first-class target.
