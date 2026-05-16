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
- `owner`
- `viewport`
- `locale`: generated design document language. Supported values are `en` and
  `ja`.
- `status`
- `tags`
- `version`

The first level-1 heading should repeat the design subject ID and title:

```markdown
# SCR-LOGIN Login
```

Use `template.id` / `template.src` for the single template a screen uses. Use
`references.partials` when the readable design document should name partials by
design ID while the preview still needs concrete file paths.

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

## Sections

Recognized level-2 sections:

- `## States`
- `## Layout: <viewport>`
- `## Slot: <name>`
- `## Slots`
- `## Elements`
- `## Form Groups`
- `## Actions`
- `## Model Samples`
- `## View Context`
- `## View Context Samples`
- `## Preview Scenarios`
- `## Validations`
- `## Business Rules`
- `## Error Codes`
- `## History Fields`
- `## History`

Other level-2 sections are free-form Markdown sections. MarkVSpec preserves them
in generated design documents but does not interpret their content as DSL
semantics.

Body text immediately after `# <ID> <Title>` and before the first level-2
section is treated as the screen or partial description.

Use `History` and `History Fields` for structured change history. Use
`Business Rules` for domain rules, and `Error Codes` for error display
contracts. Field definitions, messages, permissions, API contracts, and test
notes will be reintroduced only after their structured syntax is defined.
There are no standard section names for those concepts in this release.

### Supplemental Prose in Structured Sections

Structured sections may contain Markdown paragraphs, tables, and code blocks as
supplemental prose. Put the prose where its owner is unambiguous.

Section-level prose:

- Prose immediately under a structured section such as `## States`, before the
  first structured data block, is Section Overview.
- Prose after structured data is Section Notes.
- In entity sections such as `Elements`, `Actions`, `Form Groups`,
  `Validations`, `Business Rules`, and `Error Codes`, use `### Section Notes`
  when you need notes for the whole section after entities.

Entity-level prose:

- Prose immediately under an entity heading such as `### E-*`, `### A-*`, or
  `### V-*`, before the first structured list, is Entity Overview.
- Prose after the structured list is Entity Notes.
- Action overviews are not generated automatically. Write the action summary as
  prose immediately under the action heading.
- Put action notes, design caveats, and background that cannot be represented by
  DSL lists after the action's structured list.

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
      - state: wait-auth
  - case: send-failed
    - Effects
      - state: auth-error

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
- `Elements`
- `Form Groups`
- `Actions`
- `Model Samples`
- `Validations`
- `Business Rules`
- `Error Codes`
- `History Fields`
- `History`

Template and slot section names:

- `Slot`
- `Slots`

Action group names:

- `Triggered`
- `From`
- `Process`
- `Effects`
- `Otherwise`
- `Cases`

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
- `sample`
- `src`
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
### 2:E-EmailInput Input*

- value: ${model.email}
- initial value: "test@example.com"
```

Marker rules:

- A marker may be written before a Layout, Element, or Action ID as
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
- Rule and validation headings should use stable IDs directly, for example
  `### R-AccessControl Access control` and
  `### V-RequiredEmail Required email`.

## States Section

States are written as bullets.

```markdown
## States

- idle*
- wait-auth
- auth-error
  - Invalid email or password.
- loaded
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
- State names should use lower kebab case, such as `wait-auth` or `validation-error`.
- Inline state descriptions such as `- idle: initial` or `- error: message` are invalid.
- Nested list items under a state are free-form state descriptions. They do not
  define preview diff baselines.

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

The baseline viewport is `viewport` in Front Matter when it matches a layout
section. Otherwise, the first `## Layout: <viewport>` section is the baseline.
Generated design documents render every viewport for print/export. Element and
action lists are shown as current specifications for each viewport/state pair.
Rows that repeat the same rendered specification from an earlier state may be
marked as repeated.
When the same layout ID appears in multiple viewport sections, keep its marker
consistent across those sections.

## Templates And Slots

Templates describe reusable page shells as standalone design documents. A
template may be previewed and printed by itself; unresolved slots render as
placeholder areas.

```markdown
---
id: TPL-MYPAGE-SHELL
type: template
title: My Page Shell
viewport: desktop
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
composed result in the wireframe.

When a template layout renders `slot: content`, MarkVSpec first looks for slot
content with the same slot name and the active layout viewport. If no
viewport-specific content exists, it falls back to the viewport-neutral
`## Slot: content` definition. Defining the same slot name and viewport more than
once reports a diagnostic.
Template layout IDs and screen slot-content layout IDs are scoped separately
during template composition, so matching layout IDs across that boundary are not
reported as duplicates. Element, action, validation, rule, and error-code IDs
still share the composed screen namespace.

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
- visible when: auth-error
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
target layout. Use `states` when the partial should render a different state
for each screen state.

```markdown
### L-MemberProfilePartial Member Profile Partial

- stack
- partial:
  - id: PRT-MEMBER-PROFILE-CARD
  - states:
    - initializing: loading
    - idle: loaded
```

Use `## Model Samples` to define state-specific preview data. Repeated rows or
cards are a result of model sample arrays; do not assign separate IDs such as
`E-Notice1Link` and `E-Notice2Link` to each rendered sample item.
Use list syntax as the primary authoring style; it is easier to maintain than
wide Markdown tables when sample fields grow.
Generated design documents show Model Samples immediately before the matching
state's Wireframe instead of as an independent section.
Each sample is headed by its model path. Generic labels such as `Rows: n` and
`Sample Data` are not shown. A table with headers only represents an explicit
empty array, while a model path with no fields is reported as having no sample
fields defined.

```markdown
### L-NoticeRows Notice Rows

- stack
- visible when: loaded

#### Items

- L-NoticeRow

### L-NoticeRow Notice Row

- row
- gap: sm
- align: center

#### Items

- E-NoticeStatusBadge
- E-NoticeLink
- E-NoticePublishedAt

## Model Samples

### empty

#### ${model.noticeList.items}

| noticeId | title | publishedAt | read |
|---|---|---|---|

### loaded

#### ${model.noticeList.items}

- noticeId: N-001
  title: Maintenance notice
  publishedAt: 2026-05-01
  read: false
- noticeId: N-002
  title: Terms update
  publishedAt: 2026-04-20
  read: true
```

`### <state>` selects the screen or partial state. `#### <model path>` selects
the model path. Prefer list syntax for ordinary sample data because it stays
readable as fields grow. A table with zero data rows remains the explicit empty
array notation, and a table with multiple rows can be used for compact tabular
data. For `${model.noticeList.items}`, the row alias is `${model.notice}`, so
row elements can use `src: ${model.notice.title}`.

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
- disabled when: wait-auth

#### Items

- L-EmailField
- L-PasswordField
- E-SignInButton
- L-AuthProgress

### L-AuthProgress Auth Progress

- stack
- overlay: area
- visible when: wait-auth

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

Append `*` to the element type to mark an element as required in the generated
design document. For example, `Input*` is equivalent to a `required` flag.
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
- visible when: auth-error
- hidden when: user.role is guest
- disabled when: E-EmailInput is empty
```

`visible when`, `hidden when`, and `disabled when` are supported on Elements and
may also be surfaced for Layout groups in generated design documents. Role and
authorization rules do not have a separate DSL yet; write them as semantic
conditions such as `user.role is admin` or `can update account`. Tools should
surface these conditions in the generated design document instead of translating
them into framework-specific code.

Use opaque expressions such as `${model.memberProfile.loaded}` when a visual
switch depends on loaded data rather than a screen state. For example, a screen
can show a loading placeholder until a server call has populated application
data.

```markdown
### E-Greeting Text

- sample: Hello, Taylor
- src: ${model.memberProfile.displayName}
- visible when: ${model.memberProfile.loaded}

### E-GreetingLoading Text

- sample: Loading...
- visible when: not ${model.memberProfile.loaded}
```

Display text separates static UI wording from dynamic data examples:

- `label`: static wording shown to users, such as headings, buttons, links, and
  form labels.
- `label src`: the source of `label`, usually an opaque expression such as
  `${i18n.login.heading}`.
- `sample`: the representative display value shown in the wireframe for dynamic
  data.
- `src`: the data source or binding represented by `sample`, written as an
  opaque expression such as `${model.notice.title}` or `${route.noticeId}`.
- `value`: a mechanical value, such as a submitted form value, selected option
  value, or hidden value. Do not use it as a plain display sample.

`format` describes how a `src` value is transformed into the `sample`.

```markdown
### E-PageTitle Heading

- label: My Page
- label src: ${i18n.mypage.title}

### E-NoticeTitle Link

- sample: Maintenance notice
- src: ${model.notice.title}
- href: SCR-NOTICE-DETAIL
- params:
  - noticeId: ${model.notice.noticeId}

### E-NoticePublishedAt Text

- sample: 2026/05/01
- src: ${model.notice.publishedAt}
- format: date yyyy/MM/dd
```

Wireframes render the `sample` text. Generated design document tables
surface `label src`, `placeholder src`, `src`, `sample`, `value`, and `format`
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
      - noticeId: ${model.notice.noticeId}
```

Exception: `Image` uses `src` for the image asset source. For display elements
such as `Text`, `Link`, and `Heading`, `src` is a data source; for `Image`, it is
an asset source.

For repeated data such as notice rows, avoid assigning markers only because each
row has a different title or date. Use stable IDs for bindings and interactions,
but reserve visible markers for meaningful review targets or value variants such
as read/unread badges.

Flags are boolean properties. For required form controls, prefer the canonical
heading suffix such as `Input*`; use a `required` flag only when a boolean
property is clearer than the element type suffix.

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

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin
```

`fields` lists the input Element IDs included in the FormGroup. `submit`
identifies the submit Action. Do not bind a FormGroup to a Layout. Keep display
and update targets as `L-*`, and validation targets as `F-*`.

Use `F-*` only as a Validation `target`. Use Layout IDs for Action update
targets and partial update targets. For validation across multiple fields,
`target: F-LoginForm` makes the validated input group explicit in the design
document.

Input values may define a model binding and an initial fallback value:

```markdown
### 3:E-EmailInput Input*

- value: ${model.email}
- initial value: "test@example.com"
```

This keeps the model binding and initial fallback value separate.

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

`validation` and `error text` are specification metadata for the generated
Elements tables. They are not rendered automatically near the form control in
the wireframe preview. If validation or error copy should appear on screen, model
it as a visible element such as `Text` or `Banner`, usually with `visible when`.

```markdown
### 3:E-EmailInput Input*

- value: ${model.email}
- initial value: "test@example.com"
- validation: Must be a valid email address.
- error text: Enter a valid email address.
```

`Select` uses the same value form for the selected initial value. Options are a
nested Markdown list under `options:`. Each option item is the visible label; the
preview uses the same text as the option value. If an option label has a text
source, write it after `:`.

```markdown
### E-RoleSelect Select*

- value: ${model.role}
- initial value: "Administrator"
- options:
  - Viewer: ${i18n.roles.viewer}
  - Administrator: ${i18n.roles.administrator}
  - Owner: ${i18n.roles.owner}
```

`Checkbox` can also use `initial value` when the initial checked state comes
from model or cookie data.

```markdown
### E-RememberMe Checkbox

- label: Remember me
- value: ${model.rememberMe}
- initial value: ${cookie.remember.present}
```

Use `RadioGroup` for mutually exclusive choices. Define the displayed value
range as nested Markdown list items under `options:`, and put the default
selection in `initial value`.

```markdown
### E-ReadStatusFilter RadioGroup

- label: Read status
- label src: ${i18n.search.read-status}
- name: readStatus
- value: ${model.noticeSearch.readStatus}
- initial value: "All"
- options:
  - All: ${i18n.search.all}
  - Unread only: ${i18n.search.unread-only}
  - Read only: ${i18n.search.read-only}
```

Use `RadioGroup` instead of individual radio inputs. The standalone `Radio`
element type has been removed so exclusive choices always carry one value
source, one default value, and one options list.

`List` uses a compact property for short sequences. `Table` uses nested
Markdown lists so columns and sample rows remain readable without delimiter
parsing. For model-backed tables, prefer `source` plus list-based
`## Model Samples`; the table preview will render rows from the active state's
sample data.

Use colon-suffixed block starters for nested element blocks: `options:`,
`Columns:`, `Sample Rows:`, `params:`, and `input rule:`.

```markdown
### E-Steps List

- items: Draft, Review, Publish

### E-Users Table

- label: Users
- source: ${model.users.items}
- Columns:
  - name: Name
    sortable: true
    sort: asc
  - email: Email
    sortable: true
  - role: Role

## Model Samples

### idle

#### ${model.users.items}

- name: Alice
  email: alice@example.com
  role: Admin
- name: Bob
  email: bob@example.com
  role: Viewer
```

In `Columns:`, `- key: Label` separates the sample-data key from the visible
header. Add `sortable: true` to show a sort affordance, or `sort: asc` /
`sort: desc` to show the current sort direction. The older `Sample Rows:`
element block remains supported for static tables that do not use
`## Model Samples`.

`Dialog`, `Image`, `Icon`, and `Spinner` use small semantic property sets.
`Image` renders as a wireframe placeholder rather than loading the actual asset.
For `Image`, `src` is the asset source, not a data-binding source.
`Spinner` represents loading or waiting feedback for states such as
`wait-auth`.

```markdown
### E-ConfirmDialog Dialog

- title: Delete item
- content: This action cannot be undone.

### E-ProfileImage Image

- src: /assets/profile.png
- alt: Profile photo

### E-SearchIcon Icon

- name: search
- label: Search

### E-AuthSpinner Spinner

- label: Signing in...
- visible when: wait-auth
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

- sample: No users found. Change filters and search again.
- visible when: empty

### E-AvatarUpload FileUpload

- label: Upload avatar
- accept: image/png,image/jpeg
- sample: PNG or JPEG, up to 2 MB.

### E-StartDate DatePicker

- value: ${model.startDate}
- initial value: 2026-05-01
- min: 2020-01-01
- max: 2030-12-31

### E-RequestedDate DateInput*

- value: ${model.requestedDate}
- initial value: 2026-06-01
- min: 2026-05-13
- max: 2026-12-31

### E-StartTime TimeInput

- value: ${model.startTime}
- initial value: 09:30
- min: 09:00
- max: 18:00

### E-Headcount NumberInput*

- value: ${model.headcount}
- initial value: 2
- min: 1
- max: 20
- step: 1

### E-Evidence FileInput

- label: Evidence file
- accept: application/pdf,image/png,image/jpeg
- sample: Attach a PDF or image.
```

## Partial Updates

Partial updates are described semantically in Actions. MarkVSpec records what the
screen does, not the exact htmx attributes.

```markdown
### A-ValidateEmail Validate email

- Triggered
  - E-EmailInput.blur
- Process P1: Immediate
  - case: empty
    - from: idle
    - Effects
      - state: validation-error
      - display:
        - target: L-EmailValidation
        - content: Email is required.
```

Mapping to htmx/Thymeleaf is implementation-facing:

- `Triggered` maps to the event that starts the interaction, such as `click` or `blur`.
- `request:` maps to request method and path.
- `target` maps to the layout or element that will be replaced.
- `display.content` maps to the semantic content or partial source shown in that target.

Generated design documents should list these as partial update flows so that
reviewers can see trigger, request, target, mode, fragment/content, and outcome
without reading framework-specific attributes.

## Model Updates

Model updates remain authored inside Actions because the Action is the source of
truth for when data changes. The generated design document also collects these
entries into a "Model Updates" section so reviewers can see every
`${model.value}` style write in one place.

The "Model Updates" section groups rows by Action. The Action marker, Action
name, and trigger appear once in the group header, and the group's table stays
focused on context/process/case, model path, and update content.

MarkVSpec includes explicit `${model.value}` process details and outcome side
effects that mention `${model.value}`.

```markdown
- Process P1: Load notice
  - server:
    - call: NoticeQueryService.findNotice()
    - noticeId: ${route.noticeId}
  - result:
    - notice load result
  - case: success
    - response: 200 notice
    - Effects
      - model: ${model.notice} = NoticeDetailResult
- Process P2: Show notice body
  - case: success
    - Effects
      - display:
        - target: L-NoticeBody
        - content: Stored notice body
```

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
- label src: ${i18n.login.heading}

### E-LeadText Paragraph

- marker: 2
- sample: Sign in with your account email and password.

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
- sample: Invalid email or password.

### E-StatusBadge Badge

- tone: success
- sample: Active
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
value currently shown in an editable screen element. Use `${model.*}` in
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
  - auth-error
- Process P1: Check login form
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - result: required fields are missing
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - content: Required field message
    - stop
  - case: valid
    - result: all required fields are valid
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
      - state: wait-auth
    - stop
  - case: send-failed
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - content: Login request could not be sent
    - stop

### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.P2.response
- From
  - wait-auth
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
      - state: auth-error
      - display:
        - target: L-MessageArea
        - content: Authentication error message
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
    - response: <classification>
    - Effects
      - model: ${model.<name>} = <source>
      - view: ${view.<name>} = <value>
      - state: <state>
      - navigate: <screen-id-or-route>
      - display:
        - target: <layout-id-or-element-id>
        - content: <description>
      - display:
        - target: <layout-id-or-element-id>
        - content:
          - partial: <partial-id>
          - state: <partial-state>
    - stop | continue
```

`display.content` may be scalar prose or a structured content source. Partial
content sources use `PRT-*` document references declared in Front Matter:

```markdown
- display:
  - target: L-SearchResultsArea
  - content:
    - partial: PRT-SearchResultsList
    - state: loaded
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
    - response: 200 member profile
    - Effects
      - model: ${model.memberProfile.loaded} = true
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.memberProfile.loaded} = false
    - continue
- Process P2: Load points
  - group: initial-load
  - server:
    - call: PointQueryService.findSelfPoints()
  - case: success
    - response: 200 points
    - Effects
      - model: ${model.points.loaded} = true
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.points.loaded} = false
    - continue
- Process P3: Resolve initial load
  - group: initial-load
  - case: ready
    - result: profile and points loaded
    - Effects
      - state: idle
    - stop
  - case: failed
    - result: one or more calls failed
    - Effects
      - state: load-error
    - stop
```

Action-level `When` guards are not supported. Keep operation availability close
to the element (`disabled when`) and keep validation rules under `Validations`.
Use a process-step `when` only when the condition belongs to a specific step; it
does not guard the action transition itself.

## Cases

Process step outcomes belong under `case: <name>` branches for that process
step. Each case should contain enough detail to explain what the result means,
such as `response`, `state`, `navigate`, or a `display` effect. Empty cases are
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

### auth-error

- state: auth-error
- before: request-error
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
    - content: Authentication error message
```

For a server-rendered partial, use a structured content source:

```markdown
- Effects
  - display:
    - target: L-SearchResultsArea
    - content:
      - partial: PRT-SearchResultsList
      - state: loaded
```

This is intentionally compatible with SPA rerendering, MPA returned HTML, and
MPA+htmx partial replacement. MarkVSpec does not expose htmx attributes or swap
modes in the authoring DSL.

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
${state.auth-error}`. Non-state conditions use namespaced sources such as
`${view.isHelpPanelOpen}` or `${model.profile.loaded}`.

## View Context Section

Use `## View Context` for UI-local display context that changes the view but is
not a screen state. Examples include the selected tab, current display mode, or
whether a help panel is open. Keep durable business data in `Model Samples`; use
View Context for temporary UI context.

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

## Validations Section

Use `## Validations` for single-field and composite validation contracts. A
`V-*` entry defines what is validated; it does not define when an Action runs
validation. Keep element `input rule` entries limited to input specifications
such as type, length, range, pattern, IME, accept, and step. Validation rules,
conditions, messages, and error codes belong in this section.

```markdown
## Validations

### V-PasswordConfirmation Password confirmation

- target: E-PasswordInput
- target: E-PasswordConfirmInput
- rules:
  - same-as:
    - E-PasswordInput
    - E-PasswordConfirmInput
- scope: composite
- run: client
- condition: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password and confirmation must match.
- error code: ERR-PASSWORD-CONFIRMATION
```

Validation heading form:

```text
### <validation-id> [name]
```

Supported summary keys are `target`, `rules`, `scope`, `run`, `condition`,
`message`, and `error code`. `scope` is `single` / `field` or `composite` /
`cross-field`; `run` is `client`, `server`, or `server-response`. The generated
design document groups validation contracts into Client Field, Client Cross-field,
Server Field, and Server Cross-field tables; empty groups are omitted. `trigger`
is not canonical on `V-*`; Actions decide when validation results are consumed.

Each validation exposes an implicit result reference named `<validation-id>.result`.
For 1035, its result values are limited to `valid` and `invalid`.

For form-level validation, define `F-*` in `## Form Groups` and use the
FormGroup ID as the Validation `target`. Do not use `target: L-*` for composite
validation, because that mixes visual layout with validation responsibility.

```markdown
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin

## Validations

### V-LoginForm Login form validation

- target: F-LoginForm
- rules:
  - required:
    - E-EmailInput
    - E-PasswordInput
- scope: composite
- run: client
- message: Email and password are required.
```

## Business Rules Section

Business rules are level-3 headings under `## Business Rules`.

```markdown
## Business Rules

### R-RequiredFields

- The submit button must stay disabled until required fields are valid.
```

Rule heading form:

```text
### <rule-id> [name]
```

Rule bullets can be free text in this release.

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
`Actions`, `Validations`, `Business Rules`, or `Error Codes`.

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
- `PRT-*` partials used by layout partial hosts or `display.content.partial`
  are defined in Front Matter `references.partials`, including from
  `type: partial` documents that compose child partials.
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
- Partial updates written without the current `display.content.partial` structure.

Warnings:

- No initial state.
- Heading document ID differs from Front Matter ID.
- Unknown element type, except explicit `custom:*` element types.
- Unknown layout kind.
- ID-like token in a condition does not resolve.
- Invalid marker shape.

## Grammar Summary

```text
file              = front_matter document_heading section*
document_heading  = "# " document_id " " title
section           = states | layout | slot | elements | form_groups | actions | model_samples | view_context | view_context_samples | preview_scenarios | validations | business_rules | error_codes | history_fields | history | markdown
states            = "## States" state_bullet*
layout            = "## Layout:" viewport layout_group*
slot              = "## Slot:" slot_name (":" viewport)? layout_group*
elements          = "## Elements" element*
form_groups       = "## Form Groups" form_group*
actions           = "## Actions" action*
model_samples     = "## Model Samples" model_sample_set*
view_context      = "## View Context" view_context_entry*
view_context_entry = "### " view_name bullet*
view_context_samples = "## View Context Samples" view_context_sample*
view_context_sample = "### " sample_name key_value*
preview_scenarios = "## Preview Scenarios" preview_scenario*
preview_scenario = "### " scenario_name key_value*
validations       = "## Validations" validation*
business_rules    = "## Business Rules" rule*
error_codes       = "## Error Codes" error_code*
history_fields    = "## History Fields" history_field*
history           = "## History" history_entry*
marker_prefix     = marker ":"
layout_group      = "### " marker_prefix? layout_id " " name bullet*
element           = "### " marker_prefix? element_id " " element_type required_suffix? bullet*
action            = "### " marker_prefix? action_id " " action_name action_group*
action_group      = triggered_group | from_group | process_group | otherwise_group
triggered_group   = "- Triggered" nested_bullet*
from_group        = "- From" nested_bullet*
process_group     = "- Process " marker ": " process_name process_detail*
process_case      = indent "- case:" result_name nested_bullet*
otherwise_group   = "- Otherwise" nested_bullet*
validation        = "### " validation_id name? bullet*
rule              = "### " marker_prefix? rule_id name? bullet*
required_suffix   = "*"
bullet            = "- " text
nested_bullet     = indent "- " text
key_value         = "- " key ": " value
flag              = "- " key
```

This is not intended to replace Markdown parsing. It describes the subset of
Markdown that MarkVSpec tools interpret semantically.
