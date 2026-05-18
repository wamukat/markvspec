# MarkVSpec DSL

MarkVSpec DSL is a constrained interpretation of ordinary Markdown.
Authors write Markdown. Tools read the parts that follow these rules.

This document defines the MarkVSpec release authoring baseline. Tools should
treat the forms in this document as the canonical source format.

Parser-tested release examples live in `examples/` as a learning path that
covers basics, states, actions, realistic screens, reuse, and
structured release metadata. Use those files as practical references when the
grammar examples below are too small.

The authoring-source decision is documented in
[html-vs-markdown.md](../maintainers/html-vs-markdown.md). In short, HTML is the release render
and export target, while Markdown DSL remains the canonical design document
source.

Project icon guidance is documented in [brand-assets.md](../maintainers/brand-assets.md).
Formatter and lint recommendations are documented in
[authoring-quality.md](../maintainers/authoring-quality.md).

## Design Goals

- Keep valid MarkVSpec readable as normal Markdown.
- Use YAML Front Matter only for document-level metadata.
- Use headings to declare design objects.
- Use bullets for properties, conditions, and rules.
- Use structured action bullets for state transitions, screen transitions, and
  partial updates.
- Keep parsing predictable enough for rendering, validation, and implementation handoff.

## File

A MarkVSpec file represents one design subject: `screen`, `template`, or
`partial`.

File extension:

```text
*.vspec.md
```

Top-level shape:

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
---

# SCR-LOGIN Login

## States

...

## Layout: mobile

...

## Elements

...

## Actions

...
```

## Front Matter

Front Matter is YAML.

Required fields:

- `id`: screen, template, or partial ID, such as `SCR-LOGIN`,
  `TPL-MYPAGE-SHELL`, or `PRT-NOTICE-LIST-CARD`
- `type`: `screen`, `template`, or `partial`
- `title`: human-readable design subject name

Optional fields:

- `template`: screen template reference as a map with `id` and `src`.
- `references`: document ID to file path mappings used by a screen. Supported
  groups are `partials`.
- `route`
- `default-state`: display state opened first in preview/export. The screen
  model's initial state is still the `*` state in `## States`.
- `locale`: generated design document language. Supported values are `en` and
  `ja`.
- `tags`
- `version`

`owner`, `status`, and `viewport` are no longer canonical Front Matter fields.
If they remain in a document, MarkVSpec warns and ignores them instead of
showing them in preview/export metadata or using them for default viewport
selection.

The first level-1 heading should repeat the design subject ID and title:

```markdown
# SCR-LOGIN Login
```

Use `template.id` / `template.src` for the single template a screen uses. Use
`references.partials` when the readable design document should name partials by
design ID while the preview still needs concrete file paths.
`references.partials` is only the document ID to file path map; it does not say
where a partial is displayed.

```yaml
---
id: SCR-MYPAGE-HOME
type: screen
title: My Page Home
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
references:
  partials:
    PRT-MEMBER-PROFILE-CARD: ../partials/mypage-member-profile-card.vspec.md
---
```

For partial hosts, the nested `partial` block loads the mapped file
before falling back to local file-name search. If the referenced file is missing,
has a different document ID, or is not a `partial`, the VS Code preview reports a
diagnostic. Partial IDs in the element summary link to the referenced document in
the VS Code preview.

Partial documents are reusable HTML fragments. A `type: partial` document may
declare its own `references.partials` and host child partials from its Layout
section. Preview resolves these dependencies recursively, reports missing child
partials, and stops circular references with a diagnostic. The maximum supported
partial nesting depth is 10.

`locale` localizes generated design document chrome such as section headings
and table headers. It does not localize DSL keywords such as
`## Elements` or action group names; those remain stable for parsing and
cross-language examples.

If Front Matter and the level-1 heading disagree, Front Matter wins and the
parser should emit a warning.

## Document Units

MarkVSpec uses these design document units:

- `template`: shared shell, slots, common navigation, and other page frame
  structure. It can be previewed and printed by itself.
- `screen`: initial page reached by URL. It describes template usage, initial
  DOM, partial calls, and local screen state transitions.
- `partial`: reusable server-rendered HTML fragment. It describes the returned
  HTML layout, elements, server-side process, empty state, and error state. It
  can compose child partials through `references.partials`.

When a screen calls a partial, the screen should describe which action replaces
which target area with partial-derived content. The partial should describe the
returned HTML itself.
The Action `request:` block describes only the communication contract. A Layout
`partial:` block declares the partial host contract. A `display.partial` effect
declares that a referenced `PRT-*` document's content is displayed in that host.

## Authoring Model

MarkVSpec does not interpret all Markdown as DSL. Tools separate
machine-readable areas from Markdown that is preserved for readers.

| Area | Authoring shape | Interpretation | Status |
| --- | --- | --- | --- |
| Document Header | YAML Front Matter and `# <ID> <Title>` | Document ID, type, title, references, and other document metadata. | Implemented |
| Recognized Section | `## States`, `## Actions`, and similar sections | Interpreted according to each section's structure. | Implemented |
| Entity Block | `### A1:A-Submit Submit` and similar headings | Definition unit for one ID-bearing design object. | Implemented |
| Structured Body | Bullets, nested lists, and supported tables under an entity | MarkVSpec DSL read by parser, validator, and preview. | Implemented |
| Supplemental Markdown | Lead / Notes / Free-form Section content | Preserved as ordinary Markdown and not interpreted as DSL semantics. | Implemented |

This document uses these categories when describing syntax:

| Category | Examples | Meaning |
| --- | --- | --- |
| Reserved keyword | `## Actions`, `Process`, `request:`, `Effects` | A word with DSL meaning when used as a heading, group name, property name, or type name. |
| Reference ID | `E-EmailInput`, `L-MessageArea`, `A-Submit.P2.response` | Stable reference to a design object in this document or a referenced document. |
| Opaque expression | `${data.notice.title}`, `${view.selectedTab}`, `${route.userId}` | Value source preserved by MarkVSpec. Preview only evaluates the supported view/state condition subset. |
| Arbitrary string | Action names, case descriptions, message text, service call text | Human-readable text, not a fixed enum. |
| Supplemental Markdown | Lead, Notes, and Free-form Section body | Rendered in generated documents but not converted into structured DSL. |

### Current Canonical Syntax

| Subject | Canonical syntax | Status | Details |
| --- | --- | --- | --- |
| Screen state | Top-level list in `## States`; initial state marked with `*` | Implemented | [States](#states-section) |
| Layout | `## Layout: <viewport>`, `### [marker:]L-* Name`, `#### Items` | Implemented | [Layout](#layout-section) |
| Element | `### [marker:]E-* Type` with element property bullets | Implemented | [Elements](#elements-section) |
| Form Group | `### [marker:]F-* Name`, `fields`, and `submit` | Implemented | [Form Groups](#form-groups) |
| Action | `Triggered` / `From` / `Process <marker>: <name>` | Implemented | [Actions](#actions-section) |
| Process detail | `request:` / `server:` / `receive:` / project-specific detail | Implemented | Use at most one execution detail per Process. |
| Request params | `request.params` with sources such as `E-*.value` | Implemented | `input:` is legacy. |
| Server params | `server.params` for values passed to service calls | Implemented | Service call text is an arbitrary string. |
| Result cases | `case: <name>` directly under the Process | Implemented | Old `Cases` blocks are not canonical. |
| Effects | `state` / `navigate` / `view` / `display` under `case:` or an immediate Process | Implemented | Action-level `Effects` and `${data.*}` assignment are not canonical. |
| Flow control | `stop` / `continue` at the end of a case | Implemented | Omitted flow is treated as `continue`. |
| Display | `display.target` plus exactly one of `element`, `message`, or `partial` | Implemented | `display.content` and `display.elements` are unsupported. |
| View Context | `## View Context`, `${view.<name>}`, and `view:` effects | Implemented | Supported types are `boolean` and `enum`. |
| source / samples | `source: data`, `sample`, `sample rows:`, scenario `samples` | Implemented | `source` is origin category; samples are concrete preview values. |
| Preview Scenarios | `state` / `view` / `cases` / `samples` in `## Preview Scenarios` | Implemented | Explicit state/view/sample variants added to baseline previews. |
| Validation | `## Field Validations` / `## Cross-field Validations` | Implemented | `## Validations` is legacy-compatible. |
| Business Rules | `## Business Rules`, `### [marker:]R-* Name` | Implemented | Server-side domain constraints stay separate from validation. |
| Template / Slot | `type: template`, `## Slots`, and screen-side `## Slot:<name>` | Implemented | [Templates And Slots](#templates-and-slots) |
| Partial | `type: partial`, Layout `partial:` hosts, and `display.partial` | Implemented | [Partial Updates](#partial-updates) |

Primary legacy or unsupported forms:

- `owner`, `status`, and `viewport` Front Matter: warn and are not canonical metadata.
- Bare `## Layout`: not release syntax. Use `## Layout: <viewport>`.
- Action-level `Effects`: not canonical. Put effects directly under an immediate Process or under `case:`.
- Action-level `Cases` / legacy `cases:` blocks: not canonical. Use process-local `case:`.
- `input:`: legacy syntax. Use `request.params`, `server.params`, or `<custom detail>.params`.
- `update:`: not canonical. Use `display:` for visible changes, `state:` for screen state, and `navigate:` for screen transitions.
- `display.content` / `display.elements`: unsupported. Define reusable UI first as `E-*` or `L-*`.

## Sections

Recognized level-2 sections:

- `## States`
- `## Layout: <viewport>`
- `## Slot: <name>`
- `## Slots`
- `## Elements`
- `## Form Groups`
- `## Actions`
- `## View Context`
- `## View Context Samples`
- `## Preview Scenarios`
- `## Field Validations`
- `## Cross-field Validations`
- `## Validations` (legacy-compatible)
- `## Business Rules`
- `## Error Codes`
- `## History Fields`
- `## History`

Other level-2 sections are free-form Markdown sections. MarkVSpec preserves them
in generated design documents but does not interpret their content as DSL
semantics.

Body text immediately after `# <ID> <Title>` and before the first level-2
section is treated as the screen or partial description. In the document
structure terminology below, this area is the `Document Lead`.

Use `History` and `History Fields` for structured change history. Use
`Business Rules` for domain rules, and `Error Codes` for error display
contracts. Field definitions, messages, permissions, API contracts, and test
notes will be reintroduced only after their structured syntax is defined.
There are no standard section names for those concepts in this release.

### Document Structure Terms

Use the following terms when discussing MarkVSpec document placement in Preview,
parser behavior, documentation, and tickets. These names are canonical in both
English and Japanese documentation.

For a visual annotated skeleton of these regions, see
[Document Structure](https://wamukat.github.io/markvspec/docs/en/user/document-structure.html).

- `Document Header`: YAML Front Matter and the first level-1 heading. It is the
  document-level entry point for metadata and the design subject title.
- `Document Lead`: Markdown body directly below the level-1 heading and before
  the first level-2 section. Use it for the screen, template, partial, or
  example purpose.
- `Section`: a level-2 heading such as `## States` or `## Actions`. Recognized
  sections are interpreted by the parser; unrecognized sections remain
  free-form Markdown.
- `Section Lead`: Markdown body at the beginning of a section, before the first
  `Entity Block` or other structured definition in that section.
- `Entity Block`: an ID-bearing definition unit that starts with a level-3
  heading such as `### A1:A-Submit Submit` or `### E-EmailInput Input`.
- `Entity Lead`: Markdown body directly below an entity heading and before the
  entity `Structured Body`.
- `Structured Body`: the bullet lists, nested lists, and supported tables that
  the parser, validator, and preview interpret as MarkVSpec semantics.
- `Entity Notes`: supplemental Markdown after an entity `Structured Body` and
  still inside the entity.
- `Section Notes`: supplemental Markdown after the section's entity blocks or
  other structured definitions.
- `Free-form Section`: an unrecognized level-2 section, or a reserved section
  such as `## Notes` / `## Open Questions` whose body is preserved as Markdown
  and not interpreted as structured DSL.

`Lead` content is displayed before the target it describes. For example,
`Section Lead` appears before that section's table, list, or entity summary, and
`Entity Lead` appears at the beginning of that entity's detail. `Notes` content
is displayed after the target it supplements. For example, `Entity Notes` follow
the entity's structured content, and `Section Notes` follow the section's
structured content.

`Structured Body` is the canonical machine-readable part of a structured
section. Prose regions such as `Document Lead`, `Section Lead`, `Entity Lead`,
`Entity Notes`, and `Section Notes` may contain normal Markdown, but they are not
interpreted as DSL semantics. HTML comments (`<!-- -->`) in prose regions are
authoring comments and are not displayed in preview or export output.

### Entity References in Prose

Use `#{ID}` in Markdown prose to link to a MarkVSpec entity without colliding
with Markdown anchors, URLs, or `${...}` model expressions.

```markdown
See #{R-ApplicationEligibility} for the detailed rule.
```

Preview and static HTML export render resolved references as reference chips
using the entity marker when one exists, then the entity name. Supported prefixes
are `SCR-*`, `L-*`, `E-*`, `A-*`, `F-*`, `V-*`, `R-*`, and `ERR-*`.

Unresolved references remain as literal text and produce a warning. References
inside code spans and fenced code blocks are left unchanged.

### Supplemental Prose in Structured Sections

Structured sections may contain Markdown paragraphs, tables, and code blocks as
supplemental prose. Put the prose where its owner is unambiguous.

Section-level prose:

- Prose immediately under a structured section such as `## States`, before the
  first structured data block, is `Section Lead`.
- Prose after structured data is `Section Notes`.
- In entity sections such as `Elements`, `Actions`, `Form Groups`,
  `Validations`, `Business Rules`, and
  `Error Codes`, use `### Section Notes` when you need notes for the whole
  section after entities.

Entity-level prose:

- Prose immediately under an entity heading such as `### E-*`, `### A-*`, or
  `### V-*`, before the first structured list, is `Entity Lead`.
- Prose after the structured list is `Entity Notes`.
- Action overviews are not generated automatically. Write the action summary as
  `Entity Lead` immediately under the action heading.
- Put action notes, design caveats, and background that cannot be represented by
  DSL lists after the action's structured list as `Entity Notes`.

```markdown
## Actions

### A1:A-SubmitLogin Submit login

Validate the input and move to auth wait only when the request can be sent.

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Submit login
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
  - case: sent
    - Effects
      - state: authenticating
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-RequestErrorBanner

Send failure means the request could not be sent, not an HTTP response failure.
```

Ambiguous prose produces a warning. For example, prose after an invalid `###`
heading in an entity section cannot be assigned safely. HTML blocks, thematic
breaks, and unknown Markdown blocks inside structured sections also warn until
they have a stable preview/print policy. Ordinary prose in an unreserved section
does not warn just because it contains words such as `error`, `transition`, or
`validation`.

## Keywords

MarkVSpec interprets these words structurally. They may still appear freely in
normal prose, but they have DSL meaning when used as headings, bullet group
names, property names, or type names.

Level-2 section names:

- `States`
- `Layout`
- `Slot`
- `Slots`
- `Elements`
- `Form Groups`
- `Actions`
- `View Context`
- `View Context Samples`
- `Preview Scenarios`
- `Field Validations`
- `Cross-field Validations`
- `Validations`
- `Business Rules`
- `Error Codes`
- `History Fields`
- `History`

Primary Front Matter keys:

- `id`
- `type`
- `title`
- `route`
- `default-state`
- `template`
- `references`
- `locale`
- `tags`
- `version`

Action group names:

- `Triggered`
- `From`
- `Process`
- `Effects`
- `case`
- `stop`
- `continue`

Primary action process detail, result, and display words:

- `input`
- `receive`
- `result`
- `request`
- `server`
- `response`
- `validation`
- `state`
- `navigate`
- `display`
- `target`
- `content`

Event names. In event references such as `E-SignInButton.click`, `.` is the
syntax separator between the ID and event name; the keyword is `click`.

- `click`
- `blur`
- `change`
- `submit`

Document lifecycle triggers:

- `screen.load`
- `partial.render`

Layout kinds:

- `stack`
- `row`
- `grid`
- `inline`

Element types:

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Textarea`
- `Button`
- `Link`
- `Select`
- `MultiSelect`
- `Checkbox`
- `CheckboxGroup`
- `Switch`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Toast`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

Element list group names:

- `options`
- `Columns`
- `Sample Rows`
- `Row`

Common property names:

- `marker`
- `label`
- `label src`
- `placeholder`
- `placeholder src`
- `sample`
- `sample rows`
- `source`
- `src`
- `text`
- `hint`
- `value`
- `variant`
- `tone`
- `visible when`
- `hidden when`
- `disabled when`

Layout property names:

- `gap`
- `align`
- `justify`
- `overlay`
- `partial`
- `states`

`variant` and `tone` values:

- `primary`
- `danger`
- `success`
- `warning`
- `info`

## IDs

ID prefixes:

- `SCR-*`: screen
- `TPL-*`: template
- `PRT-*`: partial
- `L-*`: layout group
- `P-*`: presentation panel
- `E-*`: element
- `A-*`: action
- `R-*`: rule

Recommended IDs should describe the object's role in the design document:

- `L-LoginForm`
- `P-LoginFields`
- `E-EmailInput`
- `A-SubmitLogin`
- `R-RequiredFields`

The part after the prefix may use Japanese or other Unicode letters and
numbers. Keep IDs free of spaces, `.` and `:` because those characters are used
as syntax delimiters.

- `L-ログインフォーム`
- `E-ページヘッダ`
- `A-ログイン実行`

Screen IDs should be semantic:

- `SCR-LOGIN`
- `SCR-DASHBOARD`
- `SCR-ACCOUNT-SETTINGS`

Template IDs should use `TPL-*`, for example `TPL-MYPAGE-SHELL`.

IDs are case-sensitive. IDs must be unique within their namespace in one file.

Use a marker prefix when the preview needs a short visual marker such as `1`,
`L1`, or `A1`. Markers are display aids, not reference IDs. The active examples
prefer ASCII markers so Mermaid labels, document symbols, and plain-text review
comments stay easy to read.

```markdown
### 2:E-EmailInput Input

- value: ${data.email}
- initial value: "test@example.com"
```

Marker rules:

- A marker may be written before a Layout, Element, Action, FormGroup,
  Validation, or Business Rule ID as
  `<marker>:<id>`.
- The recommended marker shape is 1-12 ASCII letters, numbers, underscores, or
  hyphens, starting with a letter or number. Other marker shapes are accepted
  for compatibility but reported as warnings.
- `marker` bullets remain valid for cases where heading markers are not
  convenient.
- References still use the heading ID, such as `E-EmailInput`.
- Preview marker display prefers `marker` when present, then falls back to the heading ID.
- Duplicate markers should be reported at least within the same category.
- Preview tools may toggle Layout, Element, and Action markers independently.
  FormGroup markers follow the Layout marker visibility because they are drawn
  on the resolved layout scope.
- Rule and validation headings should use stable IDs directly, for example
  `### R-AccessControl Access control` and
  `### V-RequiredEmail Required email`.

## States Section

States are written as bullets.

```markdown
## States

- idle*
- authenticating
- signed-in
- recovered
  - The user recovered from an authentication error.
```

State forms:

```text
- <state>
- <state>*
- <state>
  - <description>
```

Rules:

- Exactly one state should end with `*` as the initial state.
- If no state uses `*`, the first state is treated as initial with a warning.
- State names should use lower kebab case, such as `authenticating` or `initialize-error`.
- Inline state descriptions such as `- idle: initial` or `- error: message` are invalid.
- Nested list items under a state are free-form state descriptions. They do not
  define preview diff baselines.

Example state names should keep lifecycle intent screen-oriented:

- Use `initializing` for initial screen bootstrap.
- Use `idle` for the initialized, interactive baseline state.
- Use `loading` for user-triggered or in-screen read operations.
- Use `saving`, `submitting`, or a domain-specific state such as
  `authenticating` for pending writes or submissions.
- Use `initialize-error` for bootstrap failures and `load-error` for later read
  failures when the distinction matters.
- Use `loaded` only when the example explicitly teaches loaded data variants or
  a visible loaded result state.
- Use `editing` only when the screen has a distinct non-editing mode and an
  explicit transition into editing.
- Prefer `display:` Preview Scenarios for help text, dialogs, and banners that
  do not represent persistent screen states.

## Layout Section

Layout sections are viewport-scoped. Write one `## Layout: <viewport>` section
for each viewport that needs an explicit wireframe. A bare `## Layout` section is
not part of the release syntax.

Layout groups are level-3 headings inside a viewport layout section.

```markdown
## Layout: mobile

### L-LoginForm Login Form

- marker: L1
- stack
- align: center
- gap: md

#### Items

- E-EmailInput
- L-EmailField

### L-EmailField Email Field

- marker: L2
- row

#### Items

- "Email": E-EmailInput

## Layout: desktop

### L-LoginForm Login Form

- marker: L1
- row
- align: center
- gap: lg

#### Items

- L-EmailField
- E-SignInButton
```

The first `## Layout: <viewport>` section in document order is the baseline
viewport. Generated design documents render every viewport for print/export.
Element and action lists are shown as current specifications for each
viewport/state pair. Rows that repeat the same rendered specification from an
earlier state may be marked as repeated.
When the same layout ID appears in multiple viewport sections, keep its marker
consistent across those sections.

## Templates And Slots

Templates describe reusable page shells as standalone design documents. A
document with `type: template` owns the shared shell layout, shell elements,
shell actions, and the `## Slots` contract that screens can fill. A template
may be previewed and printed by itself; in that standalone preview the template
is the main subject and unresolved slots render as placeholder areas.

Screens remain the page-specific design documents. A document with
`type: screen` can reference one template in Front Matter with `template.id` and
`template.src`, then provide only the screen-specific slot content with
`## Slot: <name>` or `## Slot: <name>: <viewport>`. A partial remains a
server-rendered reusable fragment; templates provide page shells, screens
provide page content and behavior, and partials provide reusable fragment
content.

```markdown
---
id: TPL-MYPAGE-SHELL
type: template
title: My Page Shell
---

# TPL-MYPAGE-SHELL My Page Shell

## Layout: desktop

### L-Shell Page Shell

- row

#### Items

- L-LeftPane
- L-RightPane

### L-RightPane Right Pane

- stack

#### Items

- L-Header
- slot: content
- L-Footer

## Slots

### content Main Content

- purpose: Page-specific main content.
- required
- default: E-EmptySlotMessage

## Elements

### E-EmptySlotMessage Paragraph

- text: No content has been assigned to this slot.
```

A screen can reference a template file in Front Matter and define the slot
content in `## Slot: <name>`. Slot content can also be scoped to a viewport with
`## Slot: <name>: <viewport>`.

```markdown
---
id: SCR-MYPAGE-HOME
type: screen
title: My Page Home
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME My Page Home

## Slot: content

### L-HomeContent Home Content

- stack

#### Items

- E-PageTitle

## Slot: content: desktop

### L-DesktopHomeContent Desktop Home Content

- grid

#### Items

- E-PageTitle
```

Opening the screen file directly in preview loads the template file and composes
the slot content into the shell. The generated design document keeps the screen's
slot content as the main specification focus; template-owned elements and
actions are treated as shared shell context. Slot definitions and slot content
tables are not rendered as reader-facing preview sections; readers see the
composed result in the wireframe. In screen preview, the template shell is shown
as wireframe context, but template markers, template details, and template spec
tables are not promoted as the primary screen subject.

Template composition uses the viewport set from the template's own
`## Layout:<viewport>` sections. Screen slot content can provide
viewport-specific alternatives for those template viewports, but it does not
create additional composition viewports by itself.

Use [Template Shell](../../../examples/05-reuse/template-shell.vspec.md) and
[Basic Slot Page](../../../examples/05-reuse/basic-slot-page.vspec.md) as the
minimum template and slot examples. Use
[Responsive Template Shell](../../../examples/05-reuse/responsive-template-shell.vspec.md)
and [Responsive Slot Page](../../../examples/05-reuse/responsive-slot-page.vspec.md)
for the multi-viewport template and slot override case. The
[examples/05-reuse README](../../../examples/05-reuse/README.md) lists the role
of each reuse example.

When a template layout renders `slot: content`, MarkVSpec resolves the slot in
this order:

1. `## Slot: content: <viewport>` for the currently rendered template viewport.
2. The viewport-neutral `## Slot: content`.
3. A valid `default: <ID>` from the template-side `## Slots` contract.

`## Slots` is the template-side slot contract. Each slot entry may declare
metadata such as `required`, `purpose`, and `default: <ID>`. `default: <ID>`
references fallback content owned by the template document, and the ID must
refer to an `E-*` element or `L-*` layout defined in that same template. A
`required` slot with a valid default does not report missing screen-provided
content. A `required` slot without screen-provided content and without a valid
default is a diagnostic target. MarkVSpec does not invent fallback content when
the default ID is missing or invalid.

Keep `template.id`, `template.src`, and `references` separate:

- `template.id`: the template document ID expected by the screen. It must match
  the referenced file's Front Matter `id`.
- `template.src`: the relative path used to load that template document. Missing
  files, outside-workspace files, ID mismatches, and non-`template` documents are
  diagnostic targets.
- `references.partials`: the map from `PRT-*` partial document IDs to file
  paths. It does not say where the partial is rendered; Layout partial hosts and
  Action display effects do that.

Defining the same slot name and viewport more than once reports a diagnostic.
When a screen references a template, top-level `## Layout` and
`## Layout:<viewport>` sections in that screen are noncanonical and should be
reported as warnings. They are not rendered as another shell or separate frame
in the composed screen preview; the rendered result is the template shell plus
resolved slot content. Use canonical `## Slot:<name>` or
`## Slot:<name>:<viewport>` sections to provide template content.

Template layout IDs and screen slot-content layout IDs are scoped separately
during template composition, so matching layout IDs across that boundary are not
reported as duplicates. Element, action, validation, rule, and error-code IDs
still share the composed screen namespace.

Representative Template / Slot diagnostics:

- A screen `template.src` points to a missing file, outside-workspace file,
  ID-mismatched file, or a file whose `type` is not `template`.
- A screen defines `## Slot: content`, but the template `## Slots` section does
  not declare a `content` contract.
- A template layout renders `slot: content`, but `## Slots` does not declare
  `content`.
- A `required` slot has no screen content and no valid `default: <E-*|L-*>`.
- `default:` points to a screen-owned ID, a missing ID, or something other than
  an `E-*` element or `L-*` layout.
- A screen using a template defines top-level `## Layout:<viewport>`; template
  content belongs in `## Slot:<name>`.

Layout heading form:

```text
### [<marker>:]<layout-id> <name>
### P-<panel-id> <name>
```

The trailing text is a layout name. Layouts are structural and often are not
visible as UI text, so generated action details use the layout marker plus this
name when they refer to a layout target. They do not repeat the layout ID there.

Use a `P-*` presentation panel when a container exists only to arrange controls
in the wireframe. Presentation panels support layout kinds and `#### Items`, but
render without border, padding, or a layout marker. They are omitted from
generated layout lists and cannot be targets for `visible when`, `hidden when`,
`disabled when`, partial hosts, validations, error codes, or action updates. Use
an `L-*` layout when the container has specification meaning or needs behavior.

Layout metadata and setting bullets:

```text
- stack
- row
- grid
- stack
- visible when: loading
- marker: L1
- align: center
- justify: end
- gap: md
```

The first bare layout keyword defines the layout kind.

Layout child references and field mappings must be placed under `#### Items`.

```markdown
#### Items

- E-Heading
- L-EmailField
- "Email": E-EmailInput
```

Supported layout kinds:

- `stack`
- `row`
- `grid`
- `inline`

Layout alignment bullets:

```text
- align: start|center|end|stretch
- justify: start|center|end|between|around
- gap: none|xs|sm|md|lg|xl
- overlay: area|screen
- partial:
  - id: PRT-*
  - states:
    - <screen-state>: <partial-state>
```

`justify` controls the main axis of the layout group.
`align` controls the cross axis.
`gap` is a visual hint for wireframe spacing. It is accepted by the DSL and
applied to wireframe rendering, but generated design-document summary tables do
not show it as a primary specification attribute.

`overlay: area` floats the layout over its parent layout group. Use it for a
loading mask over a form or panel. `overlay: screen` represents a full-screen
loading mask. Combine overlays with `visible when` so the overlay is tied to a
screen state.

To embed a partial preview from a screen, put `partial` on the replacement
target layout. This marks the `L-*` layout as a partial host. Initial MarkVSpec
supports one partial ID per host: one host maps to one `PRT-*` document. Use
`states` when the partial should render a different state for each screen state.
The left side is the screen state; the right side is the partial document's
render state.

```markdown
### L-MemberProfilePartial Member Profile Partial

- stack
- partial:
  - id: PRT-MEMBER-PROFILE-CARD
  - states:
    - initializing: loading
    - idle: loaded
```

Use Element `sample` for baseline preview values on `source: data` elements and
`sample rows:` for baseline preview rows on `source: data` Table/List elements.
Use Preview Scenario `samples` when a state/scenario needs different displayed
values. Repeated rows come from `sample rows:` / scenario `rows:`; do not assign
separate IDs such as `E-Notice1Link` and `E-Notice2Link` to each rendered sample
item.
Use list syntax as the primary authoring style. Markdown tables are not
canonical sample data because row and field boundaries are harder to validate.

```markdown
### E-NoticeTable Table

- source: data
- Columns:
  - noticeId: Notice ID
  - title: Title
  - publishedAt: Published at
  - read: Read
- sample rows:
  - row:
    - noticeId: N-001
    - title: Maintenance notice
    - publishedAt: 2026-05-01
    - read: false

## Preview Scenarios

### empty

- state: empty
- samples:
  - E-NoticeTable:
    - rows: []

### loaded-with-notices

- state: loaded
- samples:
  - E-NoticeTable:
    - rows:
      - row:
        - noticeId: N-001
        - title: Maintenance notice
        - publishedAt: 2026-05-01
        - read: false

```

Use `sample rows:` for baseline table rows and `Preview Scenarios` `samples`
for state-specific overrides. Write table rows with explicit `row:` entries so
each row has the same grammar in element definitions and scenarios. Use
`rows: []` when the scenario intentionally renders an empty collection.

Examples:

```markdown
### L-LoginForm Login Form

- marker: L1
- stack
- align: center
- gap: md

#### Items

- E-Heading
- L-EmailField

### L-FooterActions Footer Actions

- marker: L2
- row
- justify: end
- gap: sm

#### Items

- E-SubmitButton
- E-CancelButton
```

Disable a layout group when every control inside the group should be unavailable
during a waiting state:

```markdown
### L-LoginControls Login Controls

- stack
- disabled when: authenticating

#### Items

- L-EmailField
- L-PasswordField
- E-SignInButton
- L-AuthProgress

### L-AuthProgress Auth Progress

- stack
- overlay: area
- visible when: authenticating

#### Items

- E-AuthSpinner
```

Field mapping item bullets:

```text
- "<label>": <element-id>
```

Examples:

```markdown
### L-EmailField Email Field

- marker: L3
- row

#### Items

- "Email": E-EmailInput

### L-ProfileForm Profile Form

- marker: L4
- grid

#### Items

- "Name": E-NameInput
- "Email": E-EmailInput
- "Role": E-RoleSelect
```

The label must be quoted. Field mappings are valid only under `#### Items`.
This keeps labels with spaces or punctuation readable and avoids ambiguity with
ordinary key-value bullets.

The layout kind decides how the field is rendered:

- `row`: label and control are rendered horizontally.
- `stack`: label and control are rendered vertically.
- `grid`: labels and controls are rendered as repeated rows or columns.

## Elements Section

Elements are level-3 headings.

```markdown
## Elements

### 5:E-SignInButton Button

- label: Sign in
- action: A-SubmitLogin
- disabled when: E-EmailInput is empty
```

Element heading form:

```text
### [<marker>:]<element-id> <element-type>[*]
```

The trailing text is the element type, not an element name. MarkVSpec does not
define a separate element display name, and an element `name` property remains an
element-specific property such as a form field name. Generated action details
identify element references with the element marker plus element ID, without
adding the element type or display-content summary.

Append `*` to the element type only when the element itself has input-level
required metadata. For example, `Input*` is equivalent to a `required` flag in
the Input Form Spec `Required` column. It is not the canonical way to
define product validation. Required validation belongs in
`## Field Validations` as a `required` constraint.
Required metadata is not rendered as a native `required` attribute or an
automatic `*` marker in the wireframe preview. If the screen should visibly show
a required mark, write it into the authored label text.

Supported element types:

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Textarea`
- `Button`
- `Link`
- `Select`
- `MultiSelect`
- `Checkbox`
- `CheckboxGroup`
- `Switch`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Toast`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

Unknown element types are reported as warnings. Use `custom:*`, such as
`custom:Map`, when a project intentionally needs a custom element type.

Use `Paragraph` for block prose such as descriptions, body copy, and empty-state
messages. Use `Text` for inline or compact display such as short labels, values,
timestamps, and counters.

Element bullets:

```text
- <key>: <value>
- <flag>
- visible when: <condition>
- hidden when: <condition>
- disabled when: <condition>
- variant: <variant>
- tone: <tone>
- validation: <rule>
- error text: <text>
```

Visibility and availability conditions are authored as readable condition text:

```markdown
- visible when: loading
- hidden when: user.role is guest
- disabled when: E-EmailInput is empty
- disabled when: E-PasswordInput is empty
```

When the same condition key appears multiple times on the same object, the lines
are combined as OR. In the example above, the element is disabled when either
the email input is empty or the password input is empty.

`and` and `or` inside a single condition line are part of that human-readable
condition text. They are not parsed as structured logical expressions in the
initial DSL. If the intended meaning is OR, author it as multiple lines with the
same key. If the intended meaning is an indivisible condition such as "email is
present and valid", keep it in one readable line.

Condition joining and readable condition text apply to Element conditions
(`visible when`, `hidden when`, `disabled when`), Layout conditions
(`visible when`, `hidden when`, `disabled when`, `enabled when`,
`selected when`, `active when`), Process step conditions (`when`,
`skip when`), Validation constraint `when`, and legacy `condition`.

Preview evaluation is intentionally limited. Tools may evaluate state names such
as `loading`, `state is loading`, and supported opaque expressions such as
`${view.isHelpPanelOpen}`, `not ${view.isHelpPanelOpen}`, and
`${view.selectedTab} = results`. Other conditions, including field emptiness,
roles, authorization text, and single-line conditions containing `and` or `or`,
should be surfaced as design information without inventing runtime values.

`visible when`, `hidden when`, and `disabled when` are supported on Elements and
may also be surfaced for Layout groups in generated design documents. Role and
authorization rules do not have a separate DSL yet; write them as semantic
conditions such as `user.role is admin` or `can update account`. Tools should
surface these conditions in the generated design document instead of translating
them into framework-specific code.

Use opaque expressions such as `${data.memberProfile.loaded}` when a visual
switch depends on loaded data rather than a screen state. For example, a screen
can show a loading placeholder until a server call has populated application
data.

```markdown
### E-Greeting Text

- source: data
- sample: Hello, Taylor
- src: ${data.memberProfile.displayName}
- visible when: ${data.memberProfile.loaded}

### E-GreetingLoading Text

- text: Loading...
- visible when: not ${data.memberProfile.loaded}
```

Display text separates static UI wording from dynamic data examples:

- `label`: static wording shown to users, such as headings, buttons, links, and
  form labels.
- `label src`: an optional opaque source for `label`. Do not use it for
  implementation i18n keys; prefer `source: i18n` when the label is
  translation-backed.
- `text`: fixed body text for static `Paragraph`, `Text`, `Banner`, and `Badge`
  content.
- `hint`: fixed helper text for `FileUpload` and `FileInput`.
- `sample`: the representative preview value for `source: data` elements. Do
  not use it for fixed wording.
- `src`: the data source represented by `sample`, written as an
  opaque expression such as `${data.notice.title}` or `${route.noticeId}`.
- `value`: a mechanical value, such as a submitted form value, selected option
  value, or hidden value. Do not use it as a plain display sample.
- `source`: the origin category for the element's displayed value or wording.
  It is not a reference path.

`format` describes how a `src` value is transformed into the `sample`.

`source` accepts only these source types: `fixed`, `i18n`, `data`, `route`,
`element`, `asset`, `external`, and `computed`. If omitted, `source` is treated
as `fixed`; explicitly writing `source: fixed` is also valid.

- `fixed`: fixed content written directly in the MarkVSpec document.
- `i18n`: wording that should be managed by internationalization resources.
  Do not write i18n keys, namespaces, bundle names, or translation file names in
  `source`; use `source: i18n` only to mark that the text is translation-backed.
- `data`: raw business data, screen data, API response data, or server-side
  model data. It is an origin category, not a path to sample data.
- `route`: URL path parameters, query strings, and route parameters.
- `element`: another element's current value, referenced by a separate property
  such as `value: E-EmailInput.value`. This is not data binding.
- `asset`: app-managed images, icons, and static files.
- `external`: URLs, services, embeds, or delivered resources outside the app's
  control.
- `computed`: a value derived by formatting, combining, or calculating from
  other values.

Use `data` for values as received from data sources. Use `computed` when the
display value is derived from those values. Use `element` only when another
element's value is displayed as-is; use `computed` when that value is transformed.
Use `asset` for app-managed resources and `external` for resources managed
outside the app. `source: document` and old reference-path usage such as
`source: ${data.users.items}` are invalid.

Keep `source:` and samples separate:

- `source:` is the origin category for displayed content. It names a category
  such as `data` or `route`; it is not the concrete preview value.
- `sample` / `sample rows:` are concrete values supplied to preview. They are
  not implementation bindings or data-fetching paths.
- `source: fixed` and elements without `source` already carry their displayed
  value in `label`, `text`, `message`, `hint`, `value`, or a similar property.
  Do not add `sample` for fixed content.
- `source: fixed` with `sample` is a warning. Preview does not invent a fixed
  value from the sample; the fixed display property remains authoritative.
- Use `sample` for scalar `source: data` elements. Use `sample rows:` or
  Preview Scenario `rows:` for multi-row `Table` and `List` data.

Minimal examples:

```markdown
### E-PageTitle Heading

- label: My Page
- source: i18n

### E-FixedTitle Heading

- level: 1
- label: Notice detail

### E-NoticeTitle Link

- source: data
- sample: Maintenance notice
- src: ${data.notice.title}
- href: SCR-NOTICE-DETAIL
- params:
  - noticeId: ${data.notice.noticeId}

### E-NoticePublishedAt Text

- source: data
- sample: 2026/05/01
- src: ${data.notice.publishedAt}
- format: date yyyy/MM/dd

### E-NoticeId Text

- source: route
- src: ${route.noticeId}

### E-ConfirmEmail Text

- source: element
- value: E-EmailInput.value
```

Wireframes render fixed `text` / `hint` directly and use `sample` only as the
baseline preview value for `source: data` elements. Generated design document tables
surface `label src`, `placeholder src`, `src`, `sample`, `text`, `hint`, `value`, and `format`
in Display Content Spec so implementation and review can verify wording,
bindings, and machine values without mixing their meanings. Input Form Spec
keeps input constraints separate from labels, placeholders, and option labels.

When a `Link` points at a screen ID, put navigation parameters under `params`.
The values are data references, not display text. Project validation checks
these names against target screen route placeholders when the target screen is
available.

Use the same nested `params` block for action-driven screen navigation.

```markdown
### A-OpenNotice Open notice

- Triggered
  - E-NoticeTitle.click
- From
  - loaded
- Process P1: Immediate
  - Effects
    - navigate: SCR-NOTICE-DETAIL
    - params:
      - noticeId: ${data.notice.noticeId}
```

Exception: `Image` uses `src` for the image asset source. For display elements
such as `Text`, `Link`, and `Heading`, `src` is a data source; for `Image`, it is
an asset source.

For repeated data such as notice rows, avoid assigning markers only because each
row has a different title or date. Use stable IDs for bindings and interactions,
but reserve visible markers for meaningful review targets or value variants such
as read/unread badges.

Flags are boolean properties. A `required` flag or `Input*` heading suffix is
element metadata shown in the Input Form Spec `Required` column. Use it
only for input-level UI requirements, not for product validation contracts.
Prefer `## Field Validations` with a `required` constraint when the design needs
to specify validation behavior.

```markdown
- required
- readonly
- optional
```

## Form Groups

`## Form Groups` defines semantic groups for form-level validation and submit
responsibility. A FormGroup is not a visible screen object or DOM replacement
target. FormGroup IDs use `F-*`.

```markdown
## Form Groups

### F1:F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin
```

`fields` lists the input Element IDs included in the FormGroup. `submit`
identifies the submit Action. Do not bind a FormGroup to a Layout. Keep display
and update targets as `L-*`, and validation targets as `F-*`.

The `F1:` marker is optional. If it is omitted, preview tables and reference
chips use the FormGroup ID as the fallback marker label. In wireframes,
MarkVSpec displays the FormGroup marker on the smallest layout scope that
contains all listed input elements. If that scope cannot be resolved, the
marker is omitted from the wireframe and a warning is reported.

Use `F-*` only as a Validation `target`. Use Layout IDs for Action update
targets and partial update targets. For validation across multiple fields,
`target: F-LoginForm` makes the validated input group explicit in the design
document.

Input values may define an opaque data expression and an initial fallback value:

```markdown
### 3:E-EmailInput Input

- value: ${data.email}
- initial value: "test@example.com"
```

This keeps the value source and initial fallback value separate. Do not use a
separate `bind` property; it is outside the supported DSL. Request parameters
should read explicit element values such as `E-EmailInput.value` or explicit
model values where the model is the actual source.

Input-like controls can use semantic width presets. `width` is supported by
`Input`, `Textarea`, `Select`, `MultiSelect`, `DatePicker`, `DateInput`,
`TimeInput`, `NumberInput`, `FileUpload`, and `FileInput`.

```markdown
### E-PostalCodeInput Input

- width: short
- placeholder: 100-0001

### E-AddressInput Input

- width: full
- placeholder: Street address
```

Use `short` for postal codes, phone numbers, quantities, or short codes;
`medium` for names and search terms; and `long` or `full` for addresses, email
addresses, and descriptive values. Buttons can use visual size presets:

```markdown
### E-SearchAddressButton Button

- label: Search address
- size: small

### E-SaveButton Button

- label: Save
- variant: primary
- size: large
```

`validation` and `error text` are legacy descriptive metadata for the generated
Elements tables. Prefer `## Field Validations` or `## Cross-field Validations`
for validation contracts. They are not
rendered automatically near the form control in the wireframe preview. If
validation or error copy should appear on screen, model it as a visible element
such as `Text` or `Banner`, usually with `visible when`.

```markdown
### 3:E-EmailInput Input

- value: ${data.email}
- initial value: "test@example.com"
- validation: Must be a valid email address.
- error text: Enter a valid email address.
```

`Select` uses the same value form for the selected initial value. Options are a
nested Markdown list under `options:`. Each option item is the visible label; the
preview uses the same text as the option value. If an option label has a text
source, write it after `:`.

```markdown
### E-RoleSelect Select

- value: ${data.role}
- initial value: "Administrator"
- options:
  - Viewer
  - Administrator
  - Owner
```

`Checkbox` can also use `initial value` when the initial checked state comes
from model or cookie data.

```markdown
### E-RememberMe Checkbox

- label: Remember me
- value: ${data.rememberMe}
- initial value: ${cookie.remember.present}
```

Use `RadioGroup` for mutually exclusive choices. Define the displayed value
range as nested Markdown list items under `options:`, and put the default
selection in `initial value`.

```markdown
### E-ReadStatusFilter RadioGroup

- label: Read status
- source: i18n
- name: readStatus
- value: ${data.noticeSearch.readStatus}
- initial value: "All"
- options:
  - All
  - Unread only
  - Read only
```

Use `RadioGroup` instead of individual radio inputs. The standalone `Radio`
element type has been removed so exclusive choices always carry one value
source, one default value, and one options list.

`List` uses a compact property for short sequences. `Table` uses nested
Markdown lists so columns and sample rows remain readable without delimiter
parsing. For data-backed tables, use `source: data` for the origin category and
`sample rows:` or Preview Scenario `rows:` for preview rows.

Use colon-suffixed block starters for nested element blocks: `options:`,
`Columns:`, `Sample Rows:`, `params:`, and `input rule:`.

```markdown
### E-Steps List

- items: Draft, Review, Publish

### E-Users Table

- label: Users
- source: data
- Columns:
  - name: Name
    sortable: true
    sort: asc
  - email: Email
    sortable: true
  - role: Role

- sample rows:
  - row:
    - name: Alice
    - email: alice@example.com
    - role: Admin
  - row:
    - name: Bob
    - email: bob@example.com
    - role: Viewer
```

In `Columns:`, `- key: Label` separates the sample-data key from the visible
header. Add `sortable: true` to show a sort affordance, or `sort: asc` /
`sort: desc` to show the current sort direction. The older `Sample Rows:`
element block remains supported for older static tables, but new examples should
use `sample rows:`.
`sample rows: []` intentionally renders an empty baseline preview. A `Table`
keeps its headers and renders a single empty fallback body row. A `List` renders
an empty fallback item. A `source: data` `Table` or `List` without `sample rows:`
and without Preview Scenario `rows:` is a warning.

`Dialog`, `Toast`, `Image`, `Icon`, and `Spinner` use small semantic property sets.
`Dialog` is a modal overlay by default. Do not place a dedicated
`L-DialogArea` in normal layout just to host it. Define its action buttons as
regular `Button` elements and list them with `actions:` so each button can
point to its own `Action`.
`Toast` is a non-modal overlay notification. Use `message`, `tone`,
`placement`, and `duration` to describe the visible feedback. Unlike `Dialog`,
it does not block the screen and does not require action buttons.
`Image` renders as a wireframe placeholder rather than loading the actual asset.
For `Image`, `src` is the asset source, not a data-binding source.
`Spinner` represents loading or waiting feedback for states such as
`authenticating`.

```markdown
### E-ConfirmDialog Dialog

- title: Delete item
- message: This action cannot be undone.
- tone: warning
- actions: E-CancelDeleteButton, E-ConfirmDeleteButton

### E-CancelDeleteButton Button

- label: Cancel
- variant: secondary
- action: A-CancelDelete

### E-ConfirmDeleteButton Button

- label: Delete
- variant: primary
- tone: danger
- action: A-ConfirmDelete

### E-SavedToast Toast

- message: Settings saved.
- tone: success
- placement: top-right
- duration: short

### E-ProfileImage Image

- src: /assets/profile.png
- alt: Profile photo

### E-SearchIcon Icon

- name: search
- label: Search

### E-AuthSpinner Spinner

- label: Signing in...
- visible when: authenticating
```

`Textarea`, `MultiSelect`, `CheckboxGroup`, and `Switch` cover common form
primitives that need clearer input semantics than a generic custom element.
Use `MultiSelect` for compact multi-value selection, `CheckboxGroup` when every
choice should stay visible, and `Switch` for a boolean setting.

```markdown
### E-Notes Textarea

- label: Notes
- width: full
- rows: 4
- placeholder: Internal notes

### E-Permissions MultiSelect

- label: Permissions
- initial value: Manage users, Export reports
- options:
  - Manage users
  - Export reports
  - Billing

### E-Notifications CheckboxGroup

- label: Notifications
- initial value: Product updates, Security alerts
- options:
  - Product updates
  - Security alerts
  - Billing notices

### E-EmailSwitch Switch

- label: Email notifications
- initial value: true
```

`Divider`, `FileUpload`, `FileInput`, `DatePicker`, `DateInput`, `TimeInput`,
and `NumberInput` cover common practical
screen details without introducing framework-specific widgets.

```markdown
### E-ProfileDivider Divider

- label: Profile options

### E-EmptyUsers Paragraph

- text: No users found. Change filters and search again.
- visible when: empty

### E-AvatarUpload FileUpload

- label: Upload avatar
- accept: image/png,image/jpeg
- hint: PNG or JPEG, up to 2 MB.

### E-StartDate DatePicker

- value: ${data.startDate}
- initial value: 2026-05-01
- min: 2020-01-01
- max: 2030-12-31

### E-RequestedDate DateInput

- value: ${data.requestedDate}
- initial value: 2026-06-01
- min: 2026-05-13
- max: 2026-12-31

### E-StartTime TimeInput

- value: ${data.startTime}
- initial value: 09:30
- min: 09:00
- max: 18:00

### E-Headcount NumberInput

- value: ${data.headcount}
- initial value: 2
- min: 1
- max: 20
- step: 1

### E-Evidence FileInput

- label: Evidence file
- accept: application/pdf,image/png,image/jpeg
- hint: Attach a PDF or image.
```

## Display Update Mapping

Partial updates are described semantically in Actions. MarkVSpec records what the
screen does, not the exact htmx attributes.

```markdown
### A-ValidateEmail Validate email

- Triggered
  - E-EmailInput.blur
- From
  - idle
- Process P1: Check email field
  - receive:
    - validation: V-EmailRequired.result
  - case: invalid
    - Effects
      - display:
        - target: L-EmailValidation
        - element: E-EmailRequiredMessage
    - stop
  - case: valid
    - continue
```

Mapping to htmx/Thymeleaf is implementation-facing:

- `Triggered` maps to the event that starts the interaction, such as `click` or `blur`.
- `request:` maps to request method and path.
- `target` maps to the layout or element that will be replaced.
- `element` maps to the existing `E-*` element or `L-*` layout shown in that target.

Generated design documents should list these as partial update flows so that
reviewers can see trigger, request, target, mode, fragment/content, and outcome
without reading framework-specific attributes.

## Data Sources And Samples

`source: data` marks that a value comes from business data, API responses, or
server-side data. It is an origin category, not a data path. Use `sample` and
`sample rows:` for baseline preview values, and Preview Scenario `samples` for
scenario-specific overrides.

Do not use Action `Effects` to assign into `${data.*}`. Action-side model
mutation is not canonical because it describes an implementation store or server
model update rather than screen behavior. The generated design document therefore
does not include a `Model Updates` section.

Element variants describe visual emphasis or component style without naming CSS
classes directly.

Supported variants:

- `primary`
- `secondary`
- `tertiary`

Element tones describe semantic intent.

Supported tones:

- `neutral`
- `info`
- `success`
- `warning`
- `danger`

Examples:

```markdown
### E-Heading Heading

- marker: 1
- level: 1
- label: Welcome back
- source: i18n

### E-LeadText Paragraph

- marker: 2
- text: Sign in with your account email and password.

### 5:E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

### E-DeleteAccountButton Button

- label: Delete account
- variant: primary
- tone: danger
- action: A-DeleteAccount

### E-ErrorBanner Banner

- tone: danger
- text: Invalid email or password.

### E-StatusBadge Badge

- tone: success
- text: Active
```

Rendering tools may map `variant` and `tone` to framework-specific classes, such
as Bootstrap, Tailwind, or an internal design system. MarkVSpec itself stores the
semantic meaning, not the final class name.

Use `Heading` with `level: 1` through `level: 6` instead of `H1` through `H6`
element types. Use `Paragraph` for prose and explanatory text. Use `Text` for
short labels, values, and compact text.

## Actions Section

Actions are level-3 headings. An action describes a trigger, the screen states it
can run from, one or more process steps, and the resulting effects. Keep the DSL
screen-oriented: write what appears on the screen with `display:`, use `state`
for screen-local state changes, use `navigate` for screen transitions, and keep
implementation details such as DOM replacement, component rerendering, returned
HTML, and htmx swap behavior in generators or adapters.

Action heading form:

```text
### [<marker>:]<action-id> <action-name>
```

Each process uses an action-local marker and a human-readable name:

```text
- Process <marker>: <process name>
```

`P1`, `P2`, and similar markers are stable references for preview scenarios and
later process steps. The process name is ordinary prose, not a fixed enum. The
reserved process detail keys `request:`, `server:`, `response:`, and
`validation:` are known detail hints; they are not process types. Projects may
also use custom process detail blocks such as `sync:` when they need to preserve
project-specific execution notes. MarkVSpec preserves custom detail structure
but does not assign portable semantics to it unless a generator explicitly opts
in.

Treat a Process as one meaningful processing unit. A single Process should
contain at most one execution detail block such as `request:`, `server:`,
`sync:`, or another project-specific custom detail. If an action performs two
independent calls, split them into two Process steps and connect them with
`continue` / `receive` / a later Resolve process as needed.

Use `request.params`, `server.params`, or `<custom detail>.params` as the
canonical source for values passed to a request, server call, or project-specific
execution detail. Use `receive:` when a process classifies an external event,
validation result, or prior process result. Validation contracts are received as
opaque sources such as `V-LoginForm.result`.

Prefer element value sources such as `E-EmailInput.value` when a process reads a
value currently shown in an editable screen element. Use `${data.*}` in
execution params only when the process intentionally reads derived or stored
model state that is not directly represented by an element value, such as the
current page number or a calculated next page.

For execution processes, write the process in this order:
`request/server/custom detail -> result -> case`. For processes that receive
external data, write `receive -> case`. `prepare:` is not part of the current
DSL; if a future process needs to describe meaningful pre-execution derivation,
it should not duplicate values already captured by params.

For deterministic immediate effects with no execution detail and no result
classification, omit `case:` and `Effects` and put the effects directly under
the Process:

```markdown
- Process P1: Open password reset
  - navigate: SCR-PASSWORD-RESET
```

Use this short form only for immediate screen/data effects. Once the Process has
`request:`, `server:`, `sync:`, `receive:`, `result:`, or any `case:`, put
result-specific effects under that case's `Effects` block.

```markdown
## Actions

### A1:A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Check login form
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - description: required fields are missing
    - Effects
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage
    - stop
  - case: valid
    - description: all required fields are valid
    - continue
- Process P2: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
  - case: sent
    - Effects
      - state: authenticating
    - stop
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-RequestErrorBanner
    - stop

### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.P2.response
- From
  - authenticating
- Process P1: Handle auth response
  - receive:
    - response: A-SubmitLogin.P2.response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
    - stop
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
    - stop
```

Preferred action groups and effects:

```text
- Triggered
  - <element-id>.<event>
  - <action-id>.<process-marker>.response
  - screen.load
- From
  - <state>
- Process <marker>: <process name>
  - receive:
    - <name>: <source>
  - request:
    - method: <method>
    - path: <path>
    - params:
      - <name>: <source>
  - server:
    - <service-call>
    - params:
      - <name>: <source>
  - <custom-detail>:
    - <project-specific detail>
    - params:
      - <name>: <source>
  - result:
    - <result contract>
  - case: <result>
    - description: <human-readable case explanation>
    - response: <received response classification>
    - Effects
      - view: ${view.<name>} = <value>
      - state: <state>
      - navigate: <screen-id-or-route>
      - display:
        - target: <layout-id-or-element-id>
        - element: <element-id-or-layout-id>
    - stop | continue
```

`display.target` points to the existing `L-*` layout or `E-*` element that
receives the display result. It may also point to `E-*.error`, the implicit
field-level error slot attached to an input element. `display.element` is
singular and points to one existing `E-*` element or `L-*` layout to insert or
show in that target. `display.message` points to a validation or business-rule
message group such as `V-EmailRules.messages`. `display.partial` points to a
referenced `PRT-*` document whose content is displayed in an existing `L-*`
partial host.
Define reusable UI as an element or layout first; direct `display.content` and
`display.elements` are not supported. The exceptions are `Dialog` and `Toast`:
a display effect whose `element` is a `Dialog` may omit `target` and render as a
modal overlay, while a display effect whose `element` is a `Toast` may omit
`target` and render in the non-modal toast region.
Use only one payload key per display effect: `element`, `message`, or `partial`.

```markdown
- display:
  - target: L-SearchResultsArea
  - element: L-SearchResultsList
```

`L-*` targets are display containers such as message areas, result areas, help
areas, or slots. A layout may omit `#### Items` when it is an empty display
container that receives content from a scenario or action display effect.
`E-*` targets remain valid for replacing or updating an existing element-level
presentation.

Use `E-*.error` only for input elements. It does not replace the input element;
it displays simple validation text or authored error UI in that element's
field-level error slot. Non-input `E-*.error` targets warn. Missing target
elements error.

```markdown
- display:
  - target: E-EmailInput.error
  - message: V-EmailRules.messages
```

Use `display.message` for simple `V-*.messages` or `R-*.messages` output, and
`display.element` for authored rich UI. Defining both in the same display effect
warns.

In preview output, `display.message` is marked with the source validation or
business-rule marker, not with a target-specific display marker. If the same
`V-*` message is displayed in several targets, the same marker appears in each
displayed message. The State View wireframe explanation groups displayed
messages by source and lists where they are displayed and which scenario cases
trigger them. Constraint details stay in the `V-*` definition.

```markdown
- display:
  - element: E-ConfirmDialog
```

```markdown
- display:
  - element: E-SavedToast
```

Under a process step `case: <name>` branch, add `stop` or `continue` directly
under the case as the final entry, after any `Effects` block. `stop` ends the
action process at that case. `continue` advances to the next process step, and
omitted flow is treated as `continue`.

When an action starts multiple operations in parallel and decides after all of
them complete, add `group: <group-id>` to each participating process and put the
aggregate decision in a Resolve process with the same `group`.

```markdown
- Process P1: Load profile
  - group: initial-load
  - server:
    - call: MemberQueryService.findSelfProfile()
  - case: success
    - description: 200 member profile
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process P2: Load points
  - group: initial-load
  - server:
    - call: PointQueryService.findSelfPoints()
  - case: success
    - description: 200 points
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process P3: Resolve initial load
  - group: initial-load
  - case: ready
    - description: profile and points loaded
    - Effects
      - state: idle
    - stop
  - case: failed
    - description: one or more calls failed
    - Effects
      - state: initialize-error
    - stop
```

Action-level `When` guards are not supported. Keep operation availability close
to the element (`disabled when`) and keep validation rules under
`Validations`.
Use a process-step `when` only when the condition belongs to a specific step; it
does not guard the action transition itself.

## Cases

Process step outcomes belong under `case: <name>` branches for that process
step. The `case` name classifies the result produced by the process. Use
optional `description:` for human-readable case explanation. Keep `result:` at
the Process level; do not use `result:` inside a case.

Use `response:` only when the case is describing an actually received response,
typically in a process step with a `receive:` block. Do not use `response:` as a
generic explanation for `sent`, `send-failed`, validation, or branching cases.
Each case should still contain enough behavioral detail, such as `description`,
`response`, `state`, `navigate`, or a `display` effect. Empty cases are
diagnosed because they do not describe behavior.

Supported events:

- `click`
- `change`
- `submit`
- `focus`
- `blur`
- `open`
- `close`

Supported action lifecycle events:

- `response`

Response references use the process marker, for example
`A-SubmitLogin.P2.response`. Action-level response references are ambiguous when
one Action has multiple processes and should not be used as canonical syntax.

## Preview Scenarios

Use `## Preview Scenarios` when state previews need explicit `state`, `model`,
`view`, and action/process case combinations. Preview Scenarios are additive:
baseline previews from `## States` still render, and each scenario adds an
extra variant.

```markdown
## Preview Scenarios

### idle-auth-error

- state: idle
- cases:
  - A-AuthResponse.P1.failure
```

Use `before:` to insert the scenario before a baseline state preview or another
preview scenario. Only `before:` is supported for scenario ordering; do not use
`after:`. If `before:` is omitted, the scenario is inserted after its base
state preview.

If `## Preview Scenarios` is absent, preview/export still renders all states
using the baseline model and the default View Context values.

## Partial Updates

Partial updates are written as display effects, not as implementation-specific
attributes:

```markdown
- Effects
  - display:
    - target: L-MessageArea
    - element: E-AuthErrorBanner
```

For a reusable multi-element result, define a layout and reference it from
`element:`:

```markdown
- Effects
  - display:
    - target: L-SearchResultsArea
    - element: L-SearchResultsList
```

This is intentionally compatible with SPA rerendering, MPA returned HTML, and
MPA+htmx partial replacement. MarkVSpec does not expose htmx attributes or swap
modes in the authoring DSL.

When the update displays content from a `type: partial` document, target an
existing `L-*` partial host and use `partial:` inside the display effect:

A partial is a standalone `type: partial` document. It is separate from host
screen and template states; it specifies the server-rendered fragment that can
be inserted into an `L-*` partial host on the host screen. States inside the
partial are partial-local states. Map host screen states to partial-local states
with `partial.states` on the host layout. If no mapping applies, preview chooses
the partial `default-state`, then the `*` initial state, then the first partial
state.

Use [Profile Summary Partial](../../../examples/05-reuse/profile-summary.partial.vspec.md)
as the minimal partial document, and
[Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md)
for the host layout and `display.partial` update.

```markdown
### L-ProfileSummaryHost Profile summary host

- stack
- partial:
  - id: PRT-PROFILE-SUMMARY
  - states:
    - idle: loaded
    - loading: loading
    - load-error: load-error
```

```markdown
- Process P1: Handle profile summary response
  - receive:
    - response: A-RefreshProfile.P1.response
  - case: success
    - description: 200 profile summary partial
    - Effects
      - state: idle
      - display:
        - target: L-ProfileSummaryHost
        - partial: PRT-PROFILE-SUMMARY
    - stop
```

`request:` remains the endpoint and parameter contract only. Do not put
`partial:` directly under an Action Process. Process-level `partial:` is
unsupported authoring syntax and is not treated as an alias for
`display.partial`. Canonical examples keep request-sent cases to effects such as
`state: loading`; returned partial content is modeled on the response success
case.

For htmx partial replacement, keep MarkVSpec semantic. `request:` describes the
endpoint and params, `display.target` describes the replacement host, and
`display.partial` identifies the returned fragment design. Swap modes and DOM
attributes belong to implementation code, not the design document.

Representative Partial diagnostics:

- A `partial:` host or `display.partial` references a `PRT-*` ID that is not
  defined in Front Matter `references.partials`.
- A `references.partials` file is missing, outside the workspace, ID-mismatched,
  or not a `type: partial` document.
- A `P-*` presentation panel is used as a partial host. Use an `L-*` layout for
  partial hosts.
- A partial host `partial.states` entry references a missing screen state or a
  missing partial-local state.
- `display.partial` targets something other than an `L-*` partial host, targets
  a host whose `partial.id` differs from the displayed `PRT-*`, or is combined
  with `element` / `message`.
- `partial:` is written directly under a Process. Returned fragments belong in
  response-case `Effects.display.partial`.

`input:` is legacy syntax. Put execution values under `request.params`,
`server.params`, or `<custom detail>.params` instead:

```markdown
- Process P1: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
```

Generated design documents should list screen transitions separately from
screen-local state transitions. A screen transition is any action transition
whose target is a screen ID such as `SCR-DASHBOARD`, a route path such as
`/account`, or an external URL.

Generated design documents render the initial state first. Its wireframe is
followed by the element and action lists relevant to that state. Other states
are rendered below it with their own wireframes, followed by current element and
action specifications for that state. State-specific rendering uses the
`States` section and visibility conditions such as `visible when:
${state.loading}`. Non-state conditions use namespaced sources such as
`${view.isHelpPanelOpen}` or `${data.profile.loaded}`.

## View Context Section

Use `## View Context` for UI-local display context that changes the view but is
not a screen state. Examples include the selected tab, current display mode, or
whether a help panel is open. Keep displayed data in Element samples or Preview
Scenario samples; use View Context for temporary UI context.

```markdown
## View Context

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true

### selectedTab

- type: enum
- values:
  - results*
  - billing
```

Supported types are `boolean` and `enum`. Boolean values must be `true` or
`false`. The `*` marker identifies the default value. If no value is marked,
MarkVSpec falls back to the first listed value.

Use `${view.<name>}` when Elements, Layouts, or Actions refer to View Context:

```markdown
- visible when: ${view.isHelpPanelOpen}
```

Actions update View Context with `view:` effects inside a process case:

```markdown
- Process P1: Immediate
  - case: opened
    - Effects
      - view: ${view.isHelpPanelOpen} = true
      - view: ${view.selectedTab} = results
```

## View Context Samples Section

Use `## View Context Samples` to name reusable view-context value sets for
preview/export.

```markdown
## View Context Samples

### default

- ${view.isHelpPanelOpen}: false
- ${view.selectedTab}: results

### help-open

- ${view.isHelpPanelOpen}: true
- ${view.selectedTab}: billing
```

If no Preview Scenario specifies `view`, preview/export first uses a sample named
`default`. If that sample is absent, it uses the default values from
`## View Context`. View Context definitions without a `*` default fall back to
their first listed value.

## Preview Scenarios Section

Use `## Preview Scenarios` when state previews need explicit `state`, `model`,
and `view` combinations. Preview Scenarios are additive: baseline previews from
`## States` always render, and each scenario adds an extra preview variant.

```markdown
## Preview Scenarios

### loaded-help

- state: loaded
- model: loaded
- view: help-open
- before: saved
```

Use `before:` to insert a scenario before a baseline state preview or another
preview scenario. Only `before:` is supported for scenario ordering. If
`before:` is omitted, the scenario is inserted after its base state preview.

If `## Preview Scenarios` is absent, preview/export renders all states. View
Context fallback follows the same order: `View Context Samples.default`, then
View Context default values. View Context definitions without a `*` default fall
back to their first listed value.

Sample precedence:

1. Preview Scenario `samples` are used first for that scenario.
2. If the scenario does not override an element, the element's `sample` /
   `sample rows:` provides the baseline value.
3. `source: fixed` and elements without `source` use fixed properties such as
   `label`, `text`, `message`, `hint`, or `value`.
4. A scalar `source: data` element with no preview value remains a placeholder;
   MarkVSpec does not invent a value.

```markdown
## Elements

### E-Title Text

- source: data
- sample: Baseline title
- src: ${data.notice.title}

### E-Users Table

- source: data
- Columns:
  - name: Name
- sample rows:
  - row:
    - name: Alice

## Preview Scenarios

### loaded-empty

- state: loaded
- samples:
  - E-Title: Scenario title
  - E-Users:
    - rows: []
```

In this scenario, `E-Title` renders `Scenario title` and `E-Users` renders the
empty fallback. The baseline preview still renders `Baseline title` and the
`Alice` row.

For a section-by-section reference that uses `Section Lead`, `Entity Block`,
`Structured Body`, and `Entity Notes` terminology, see
[Structured Section Reference](https://wamukat.github.io/markvspec/docs/en/user/structured-section-reference.html).

## Field Validations and Cross-field Validations Sections

Use `## Field Validations` and `## Cross-field Validations` for client-side and
screen-local validation contracts. A `V-*` entry defines what is validated; it
does not define when an Action runs validation. Keep element input metadata
limited to input UI specifications such as type, length, range, pattern, IME,
accept, and step. Validation constraints, messages, and error codes belong in
these sections.

For required fields, validation is canonical. Write `required` as a validation
constraint instead of repeating required intent in layout labels such as
`"Email*"` or element headings such as `Input*`.

```markdown
## Field Validations

### V1:V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
  - email:
    - message: Enter a valid email address.
  - length: element
    - when: E-EmailInput.value is present
    - message: Email length must follow the input specification.
```

Validation heading form:

```text
### [marker:]<validation-id> [name]
```

The heading marker, such as `V1:` in `### V1:V-EmailRules`, is expected for
preview output. If it is missing, the validator should warn and use the
validation ID as the marker label. The marker is a display label, not the
reference ID; references use `V-*` IDs such as `V-EmailRules.result`.
Supported summary keys are `target`, `run`, and `constraints`. You usually omit
`run`; the initial supported value is `client`. Do not write `scope`; the
section name determines whether a validation is field or cross-field.
In the generated preview, field validation tables use `ID`, `Name`, `Target`,
`Rule`, `When`, `Message`, and `Error Code`. A validation with multiple
constraints is shown as one row per constraint, with the validation identity
columns merged.

`length: element` reuses the target Element's min/max length input metadata.
`range: element` reuses the target Element's min/max value metadata. If the
referenced Element does not provide the needed input metadata, the validator
warns. The preview does not invent a fallback message.
When these shorthand rules are used, the preview keeps the authored shorthand
and supplements it with the Element's actual values, such as
`length: element (min length: 3, max length: 40)` or
`range: element (min: 13, max: 120, step: 1)`.

For validation contracts that depend on several inputs or a whole form, use
`## Cross-field Validations`.

```markdown
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin

## Cross-field Validations

### V2:V-LoginForm Login form validation

- target: F-LoginForm
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: E-EmailInput.value is present and E-PasswordInput.value is present
- message: Email and password are required.
```

For form-level validation, define `F-*` in `## Form Groups` and use the
FormGroup ID as the validation `target`. Do not use `target: L-*` for
cross-field validation, because that mixes visual layout with validation
responsibility.

Supported summary keys are `target`, `run`, `inputs`, `check`, `when`, and
`message`. `check` and `when` are human-readable text in the initial DSL; they
are not structured expressions. `and` or `or` inside `check` is descriptive
text, and `when` follows the general condition joining rules above.
`condition:` and `group:` are not canonical.
In the generated preview, cross-field validation tables use `ID`, `Name`,
`Target`, `Inputs`, `Check`, `When`, `Message`, and `Error Code`. `check`
describes the validation content; `when` describes applicability.

Each validation exposes implicit opaque references named `<validation-id>.result`
and `<validation-id>.messages`. Result values are limited to `valid` and
`invalid` in the initial Action contract. Actions decide when validation results
are consumed and where messages are displayed.

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - Effects
      - display:
        - target: L-MessageArea
        - message: V-LoginForm.messages
    - stop
  - case: valid
    - continue
```

If `display.message` references a validation that has no messages, the validator
warns and the preview shows no fallback text. Validation definitions do not use
`attach`; display targets belong to Action `Effects` and follow the usual
`display.target` rule for `L-*`, `E-*`, and input field error targets such as
`E-EmailInput.error`.

If `display.message` references a `V-*` validation that has no heading marker,
the validator warns and the preview uses the validation ID as the fallback
marker label.

## Business Rules Section

Business rules describe domain constraints, including constraints that can only
be detected after a server request. Keep client-side and screen-local input
checks in `V-*` validations. Use `R-*` for business rule violations, and use
`ERR-*` only when the UI spec needs to document a concrete API error code.

```markdown
## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- description: Subscription email must not already be registered.
- messages:
  - This email address is already registered.
```

Rule heading form:

```text
### [marker:]<rule-id> [name]
```

`messages:` defines the message group exposed as `<rule-id>.messages`. When an
Action displays `R-*.messages`, preview output uses the `R-*` heading marker in
the same way as validation message markers. If the marker is missing, the
validator warns and the preview uses the rule ID as the fallback marker label.

Business rule violations are received in a process `case:` branch, usually on a
`request:` or `server:` process. The canonical case name is
`business-rule-violation`; avoid `validation-error` for server-detected domain
failures because that name collides with `V-*` validation.

```markdown
- Process P2: Submit subscription
  - server:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - result:
    - subscription creation request
  - case: business-rule-violation
    - description: email is already registered
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: R-EmailMustBeUnique.messages
    - stop
```

Place `business rule:` under the `case:` branch. Do not put it under `receive:`
or `result:`. Display the message through normal `display.target` rules; both
`E-*.error` field slots and `L-*` summary areas are valid targets. If
`R-*.messages` references a rule without `messages:` or `message`, the validator
warns and the preview shows no fallback text.

Error codes are optional supporting references for API traceability. The screen
meaning remains the `business rule:` reference.

## Error Codes Section

Use `## Error Codes` to map server responses and validation failures to the UI
display contract.

```markdown
## Error Codes

### ERR-PASSWORD-CONFIRMATION Password confirmation

- business rule: R-RequiredFields
- target: E-PasswordConfirmInput
- message: Password and confirmation must match.
- display: inline
```

Validation rules can reference an error code with `error code`. Action response
cases can also include `error code: ERR-*` to connect server responses to the UI
message contract.

## History Section

Use `## History` for structured document change history. Each `###` heading is a
history entry version or ID. Metadata bullets at the start of the entry are
validated against the standard schema:

- `date`: required, `YYYY-MM-DD`
- `author`: required string
- `reviewer`: optional string
- `reason`: optional string

Text after the metadata bullets is free Markdown and is rendered in the
generated design document.

```markdown
## History

### ver 1.0

- date: 2026-05-13
- author: Alice
- reviewer: Bob
- reason: Initial release

Added the first screen specification.

- Login form
- Error display
```

Use `## History Fields` when a project needs additional fields or different
labels/requirements. Custom fields override the same standard key and extend the
schema order after the standard fields.

```markdown
## History Fields

- date
  label: Published
  required: true
  type: date

- author
  label: Author
  required: true
  type: string

- ticket
  label: Ticket
  required: false
  type: string

- approvedBy
  label: Approved By
  required: false
  type: string
```

## Free-form Sections

MarkVSpec treats unreserved level-2 headings as free-form sections. Free-form
sections are preserved as Markdown in generated design documents, but MarkVSpec
does not validate, aggregate, or interpret their content as implementation
contract.

```markdown
## Implementation Notes

- Error copy still needs product review.
- The first release uses server-side rendering.
```

You can leave unresolved questions in a free-form section, but do not hand a
spec with unresolved decisions to implementation or acceptance checks as if
those questions were contract. Move implementation-relevant requirements into
`Actions`, `Validations`, `Business Rules`, or
`Error Codes`.

## Conditions

Conditions are text expressions in this release.
The parser should preserve the original text and extract ID references.

Examples:

```text
E-EmailInput is empty
E-EmailInput is not empty
E-EmailInput is valid
E-PasswordInput is invalid
state is error
```

The renderer can display conditions as annotations before it understands full
boolean logic.

## References

References are tokens that match known ID forms:

```text
SCR-LOGIN
E-EmailInput
A-SubmitLogin
L-LoginForm
R-RequiredFields
```

The validator should check:

- `- E-EmailInput` under `#### Items` references an existing element.
- `action: A-SubmitLogin` references an existing action.
- `Triggered` references such as `E-SignInButton.click` reference an existing element.
- Conditions reference existing IDs when they contain ID-like tokens.
- Transitions to local states reference existing states.
- Transitions to `SCR-*` are allowed as external screen references.
- `PRT-*` partials used by layout partial hosts are defined in Front Matter
  `references.partials`, including from `type: partial` documents that compose
  child partials.
- Circular partial references and partial nesting deeper than 10 levels are
  invalid.
- Project-level validation can also load referenced template/partial files and
  report missing files, ID mismatches, and document type mismatches.

## Parsing Notes

The parser should preserve source positions where possible:

- file path
- line number
- heading text
- original bullet text

This is important for diagnostics and implementation handoff.

## Validation Levels

Use two validation levels:

- `error`: cannot render or is likely wrong.
- `warning`: can render, but should be reviewed.

Errors:

- Missing required Front Matter fields.
- Duplicate IDs in the same namespace.
- Element heading without an element type.
- Action trigger references a missing element.
- Element `action` references a missing action.
- Partial IDs used from a screen/template but missing from `references.partials`.
- Display effects written with removed `display.content` or `display.elements`
  payloads.

Warnings:

- No initial state.
- Heading document ID differs from Front Matter ID.
- Removed Front Matter fields such as `owner`, `status`, or `viewport` are present.
- Unknown element type, except explicit `custom:*` element types.
- Unknown layout kind.
- ID-like token in a condition does not resolve.
- Invalid marker shape.

## Grammar Summary

```text
file              = front_matter document_heading section*
document_heading  = "# " document_id " " title
section           = states | layout | slot | slots | elements | form_groups | actions | view_context | view_context_samples | preview_scenarios | field_validations | cross_field_validations | validations | business_rules | error_codes | history_fields | history | markdown
states            = "## States" state_bullet*
layout            = "## Layout:" viewport layout_group*
slot              = "## Slot:" slot_name (":" viewport)? layout_group*
slots             = "## Slots" slot_definition*
elements          = "## Elements" element*
form_groups       = "## Form Groups" form_group*
actions           = "## Actions" action*
view_context      = "## View Context" view_context_entry*
view_context_entry = "### " view_name bullet*
view_context_samples = "## View Context Samples" view_context_sample*
view_context_sample = "### " sample_name key_value*
preview_scenarios = "## Preview Scenarios" preview_scenario*
preview_scenario = "### " scenario_name key_value*
field_validations = "## Field Validations" field_validation*
cross_field_validations = "## Cross-field Validations" cross_field_validation*
validations       = "## Validations" validation* ; legacy-compatible
business_rules    = "## Business Rules" rule*
error_codes       = "## Error Codes" error_code*
history_fields    = "## History Fields" history_field*
history           = "## History" history_entry*
marker_prefix     = marker ":"
layout_group      = "### " marker_prefix? layout_id " " name bullet*
element           = "### " marker_prefix? element_id " " element_type required_suffix? bullet*
form_group        = "### " marker_prefix? form_group_id " " name bullet*
action            = "### " marker_prefix? action_id " " action_name action_group*
action_group      = triggered_group | from_group | process_group
triggered_group   = "- Triggered" nested_bullet*
from_group        = "- From" nested_bullet*
process_group     = "- Process " marker ": " process_name process_detail*
process_case      = indent "- case:" result_name nested_bullet*
process_detail    = receive_group | process_case | nested_bullet
receive_group     = indent "- receive:" receive_item*
receive_item      = indent indent "- validation: " validation_result_ref | indent indent "- response: " action_process_response_ref | indent indent "- " name ": " opaque_source
display_message   = indent indent indent "- message: " validation_messages_ref
field_validation  = "### " marker_prefix? validation_id name? field_validation_property*
cross_field_validation = "### " marker_prefix? validation_id name? cross_field_validation_property*
field_validation_property = target_property | run_property | constraints_group
cross_field_validation_property = target_property | run_property | inputs_group | check_property | when_property | message_property
target_property   = "- target: " id
run_property      = "- run: client"
constraints_group = "- constraints:" constraint_item*
constraint_item   = indent "- " constraint_name nested_bullet*
inputs_group      = "- inputs:" input_item*
input_item        = indent "- " element_id
check_property    = "- check: " text
when_property     = "- when: " text
message_property  = "- message: " text
validation_result_ref = validation_id ".result"
validation_messages_ref = validation_id ".messages"
rule              = "### " marker_prefix? rule_id name? bullet*
required_suffix   = "*"
bullet            = "- " text
nested_bullet     = indent "- " text
key_value         = "- " key ": " value
flag              = "- " key
```

This is not intended to replace Markdown parsing. It describes the subset of
Markdown that MarkVSpec tools interpret semantically.
