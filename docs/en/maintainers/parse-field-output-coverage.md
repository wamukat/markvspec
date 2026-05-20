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
| `states.message` | `rendered-preview`, `rendered-static-export` | State messages render in static State Views and are repeated near the state-flow diagram and state-transition table for transition context. |
| `layoutGroups.id`, `name`, `viewport`, `kind`, `partial`, `items`, `properties`, `notes` | `rendered-preview`, `rendered-static-export` | Layout spec tables and state-view wireframes. |
| `layoutGroups.overview` | `rendered-preview`, `rendered-static-export` | Static State Views render layout overview in the layout spec table, separate from layout notes and outside the wireframe. |
| `slotDefinitions.name`, `title`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Template slot contracts and composed project documents. |
| `slotContents.name`, `viewport`, `layoutGroups` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Screen-side slot content is rendered after composition. |
| `elements.id`, `type`, `documentRole`, display properties, metadata, route params, options, tabs, accordions, menu items, table columns/rows, sample rows, conditional expressions, validations, input rules, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Element spec tables, wireframes, state views, and scenario samples. |
| `formGroups.id`, `name`, `fields`, `submit`, `properties`, `bullets`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Form Groups section, entity prose, fields, submit action, and properties are rendered in static single-document export. |
| `events.event`, `events.actionId` | `rendered-preview`, `rendered-static-export`, `diagnostic` | Lifecycle callers are rendered through action trigger/flow detail and validated. |
| `actions.id`, `name`, `fromStates`, `triggeredBy`, `trigger`, `transitions`, `target`, `mode`, `fragment`, `sideEffects`, `routeParams`, `responses`, `properties` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Action detail tables, state/project transition graphs, and diagnostics. |
| `actions.overview`, `actions.notes` | `rendered-preview`, `rendered-static-export` | Static action details render action overview/notes and section lead/notes. |
| `processSteps.name`, `marker`, `parallelGroup`, `resolveGroup`, `when`, `skipWhen`, `inputs`, `receives`, `results`, `details`, `outcomes`, `to`, `target`, `mode`, `fragment`, `content`, `display`, `sideEffects` | `rendered-preview`, `rendered-static-export` | Action process cards and process/case detail tables. |
| `actionOutcomes.result`, `flow`, `flowDirectives`, `from`, `to`, `description`, `response`, `request`, `target`, `mode`, `fragment`, `content`, `display`, `sideEffects`, `errorCodes`, `businessRules`, `routeParams` | `rendered-preview`, `rendered-static-export`, `rendered-project` | Process outcomes and transition extraction. |
| `rules.id`, `name`, `bodyLines`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Business Rules section prose, rule body, properties, overview, and notes render in static single-document export. |
| `validations.id`, `name`, `rules`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Validation section prose, validation rules, properties, overview, and notes render in static single-document export. |
| `errorCodes.id`, `name`, `bullets`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | Error Codes section prose, properties, overview, and notes render in static single-document export. |
| `historyFields.key`, `label`, `required`, `type`, `rawType` | `rendered-preview`, `rendered-static-export` | History table schema. |
| `historyEntries.version`, `fields`, `bodyLines` | `rendered-preview`, `rendered-static-export` | History section. |
| `notes.title`, `lines` | `rendered-preview`, `rendered-static-export` | Custom Notes sections render in static single-document export. |
| `sectionProse.overview`, `sectionProse.notes` | `rendered-preview`, `rendered-static-export`, `follow-up` | Static single-document export renders lead/notes for Layout, Form Groups, Actions, Validations, Business Rules, Error Codes, View Context, View Context Samples, and Preview Scenarios. Remaining follow-ups are section-specific and do not imply a third static screen parity phase. |
| `sectionProse.renderKeys` | `internal-metadata` | Routing metadata used by preview fragments. |
| `viewContexts.name`, `type`, `values`, `defaultValue`, `properties`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | View Context definition section and state-view evaluation. |
| `viewContextSamples.name`, `values`, `overview`, `notes` | `rendered-preview`, `rendered-static-export` | View Context Samples section and scenario/state-view evaluation. |
| `previewScenarios.name`, `state`, `model`, `view`, `before`, `route`, `samples`, `cases`, `properties` | `rendered-preview`, `rendered-static-export` | State-view variants and sample tables. |
| `previewScenarios.overview`, `previewScenarios.notes` | `rendered-preview`, `rendered-static-export` | Preview Scenario section lead/notes and scenario lead/notes render in preview and static single-document HTML export. Static project-site parity is intentionally outside this matrix. |
| `diagnostics` | `diagnostic` | Diagnostics table and editor diagnostics. |

## Project Document

| Type / field | Classification | Notes |
| --- | --- | --- |
| `project.id`, `project.title` | `rendered-project` | Project preview spec. |
| `project.frontMatter`, `project.heading` | `internal-metadata` | Source metadata; not a user-facing project table target beyond ID/title. |
| `templates[].id`, `templates[].path`, loaded template `title` | `rendered-project` | Project preview Templates table and document-list export. |
| `screens[].id`, `screens[].path`, loaded screen `title`, `route` | `rendered-project` | Project preview Screens table and document-list export. |
| `project.description`, `project.notes` | `rendered-project` | Project preview renders the Project overview and Project Notes sections. Document-list export intentionally omits long project prose to preserve list readability. |
| `documentGraph.nodes`, `documentGraph.edges` | `internal-metadata` | Resolver/runtime graph metadata; used to discover referenced partials. |
| `projectTransitionGraph.nodes`, `projectTransitionGraph.edges` | `rendered-project` | Project transition diagram and transition table. |
| `diagnostics` | `diagnostic` | Project preview diagnostics and document-list row counts. |

## Follow-Up Log

- #1231: Preview Scenario section lead/notes and scenario lead/notes are
  surfaced in preview and static single-document HTML export.
- #1233: View Context / View Context Samples prose and values are surfaced as
  generated-document sections.
- #1235: Static single-document export now renders Form Groups, action prose,
  Validation/Business Rule/Error Code prose, and custom Notes.
- #1314: Static single-document export now renders state messages near State
  Views, the state-flow diagram, and the state-transition table. It also renders
  Layout section prose and layout entity overview in the State Views layout spec
  area rather than inside the wireframe.
- Project document lead/notes are surfaced by project preview. Document-list
  export intentionally omits them because it is a compact document inventory.
- Static export still treats section/entity prose parity as screen static HTML
  parity only; static project-site parity remains intentionally separate.
- Static project-site parity is intentionally not asserted by the sentinel tests;
  add a dedicated ticket if project-site export becomes a first-class target.
