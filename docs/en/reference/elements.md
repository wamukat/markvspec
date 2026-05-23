# Elements

<!-- markvspec-coverage:reference.page.elements -->

`## Elements` describes UI elements by meaning. MarkVSpec records element type, label, text, value, variant, tone, and action instead of visual implementation details.

## Syntax You Can Write

```markdown markvspec-skip reason=requires-action-definitions
## Elements

### E-Title Heading

- level: 1
- text: Login

### E-EmailInput Input

- label: Email
- value: email
- type: email
- input rule:
  - type: email

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

### Element Heading

Declare an element with `### E-* Name Type`. When you want the preview to show
a marker, write `### marker:E-* Name Type`.

```markdown markvspec-skip reason=requires-elements-context
### E-HelpText Paragraph

### 3:E-HelpText Paragraph
```

- `E-*` is the stable ID.
- `3` is an optional preview marker.
- `HelpText` is the human-readable object name.
- `Paragraph` is the element type.

### Common Types

| Type | Use |
| --- | --- |
| `Heading` | Screen or section headings. Always pair it with `level: 1..6`. |
| `Paragraph` | Descriptive prose and longer text. |
| `Text` | Short labels, values, and compact text. |
| `Input` | Text, email, password, search, and similar inputs. |
| `Button` | Controls that trigger actions. |
| `Link` | Navigation to another screen or external URL. |
| `Image` | Meaningful images or avatars. |
| `List` | Repeated items or menus. |
| `Spinner` | Loading indicator for an in-flight state. |
| `Banner` | Page or section message such as error, warning, success, or info. |
| `Badge` | Compact status, role, or category label. |
| `Table` | Structured rows and columns. |
| `Select` | Single-choice input from options. |
| `Dialog` | Modal confirmation or blocking prompt. |
| `Toast` | Temporary feedback after an action. |
| `Tabs` | Mutually exclusive panels inside one screen. |
| `ActionMenu` | Contextual actions for a row or item. |

### Other Showcase Types

The examples also show specialized controls. Use them when the screen meaning
needs the distinction; otherwise prefer `Input`, `Select`, `Button`, `Text`, or
`Paragraph`.

- `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`
- `Textarea`, `NumberInput`, `DateInput`, `DatePicker`, `TimeInput`
- `MultiSelect`, `FileInput`, `FileUpload`
- `Accordion`, `Disclosure`, `Popover`, `Tooltip`
- `Icon`, `Divider`

### Common Properties

<!-- markvspec-generated:reference-elements:start -->
This block is generated from `packages/core/src/grammar-definition.ts`. Do not hand-edit it; update the grammar definition and regenerate the docs.

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | represented | - | Common element property. |
| `label` | `canonical` | represented | - | Common element property. |
| `label src` | `canonical` | represented | - | Common element property. |
| `placeholder src` | `canonical` | represented | - | Common element property. |
| `description` | `canonical` | represented | - | Common element property. |
| `help` | `canonical` | represented | - | Common element property. |
| `help src` | `canonical` | represented | - | Common element property. |
| `hint` | `canonical` | represented | - | Common element property. |
| `message` | `canonical` | represented | - | Common element property. |
| `message src` | `canonical` | represented | - | Common element property. |
| `sample` | `canonical` | represented | - | Common element property. |
| `source` | `canonical` | represented | - | Common element property. |
| `purpose` | `canonical` | represented | - | Common element property. |
| `text` | `canonical` | represented | - | Common element property. |
| `value` | `canonical` | represented | - | Common element property. |
| `src` | `canonical` | represented | - | Common element property. |
| `format` | `canonical` | represented | - | Common element property. |
| `initial value` | `canonical` | represented | - | Common element property. |
| `required` | `canonical` | represented | - | Common element property. |
| `readonly` | `canonical` | represented | - | Common element property. |
| `optional` | `canonical` | represented | - | Common element property. |
| `visible when` | `canonical` | represented | - | Common element property. |
| `hidden when` | `canonical` | represented | - | Common element property. |
| `disabled when` | `canonical` | represented | - | Common element property. |
| `variant` | `canonical` | represented | - | Common element property. |
| `tone` | `canonical` | represented | - | Common element property. |
| `validation` | `canonical` | represented | - | Common element property. |
| `input rule` | `canonical` | represented | - | Common element property. |
| `error text` | `canonical` | represented | - | Common element property. |
| `action` | `canonical` | represented | - | Common element property. |
| `action event` | `canonical` | represented | - | Common element property. |

Element type-specific item properties are defined by these contexts.

| Context | Keys |
| --- | --- |
| `element.tab-item.property` | `panel`, `action`, `active when` |
| `element.accordion-item.property` | `panel`, `action`, `open when` |
| `element.action-menu-item.property` | `action`, `tone`, `disabled when` |
| `element.display-value-property` | `value`, `label`, `placeholder`, `text`, `message`, `hint`, `href`, `src`, `alt` |
| `element.display-value-metadata` | `kind`, `source`, `format` |
<!-- markvspec-generated:reference-elements:end -->

Write validation rules and error messages in `## Field Validations`. Element-level `constraints` and `error:` are not current MarkVSpec syntax.

### Element Source Metadata

Element source metadata explains where displayed content comes from. It is
documentation for preview, export, and the generated Display Content Spec; it is
not low-level binding code.

There are two places to write source metadata:

- Element-level `source`: the fallback source type for the element when a
  display property has no nested `kind`.
- Nested display value metadata: attach `kind`, `source`, and `format` under a
  display value property such as `value`, `label`, `placeholder`, `text`,
  `message`, `hint`, `href`, `src`, or `alt`.

Use these source types:

| Type | Meaning |
| --- | --- |
| `fixed` | Literal authored text or value in the spec. This is the default when no source is specified. |
| `i18n` | Translated UI copy or translation key. |
| `data` | Application or model data. Use `sample` or `## Preview Scenarios` when the preview needs a display value. |
| `route` | Route, path, or query parameter. |
| `element` | Value derived from another element, such as `E-EmailInput.value`. |
| `asset` | Image, file, or asset catalog entry. |
| `external` | External URL, service, or content source. |
| `computed` | Derived or formatted value. Pair it with `source` and, when useful, `format`. |

```markdown markvspec-fragment section=elements
### E-DisplayName Text

- label: Display name
  - kind: i18n
- value: Morgan Lee
  - kind: data
  - source: ${data.member.displayName}

### E-EmailInput Input

- label: Email
- value: morgan@example.com
  - kind: data
  - source: ${data.member.email}

### E-ConfirmEmail Text

- value: E-EmailInput.value
  - kind: element
  - source: E-EmailInput.value

### E-Subtotal Text

- value: USD 128.40
  - kind: computed
  - source: ${data.invoice.subtotalCents}
  - format: currency USD
```

When `source: data` is written at element level, preview rendering can use
`sample` or `## Preview Scenarios` to show a representative value. Nested
metadata still wins for each property in Display Content Spec rows, so a single
element can mix `label` from `i18n`, `value` from `data`, and `src` from
`asset`.

### Text, Label, And Value

Use these three properties consistently:

- `text`: visible copy on read-only display elements. Use this for new
  `Heading`, `Paragraph`, `Text`, `Banner`, and `Toast` entries.
- `label`: visible name of a control or link. Use it for `Button`, `Input`,
  `Select`, `Checkbox`, `RadioGroup`, `Switch`, and `Link`.
- `value`: current value, binding name, or sample value for input-like elements.

`Heading` uses `level` and `text`. Use `label` only for named controls and links.

### Message Type

Do not use `Message` for new source. It is too broad to tell the preview what
kind of UI is intended.

- Use `Banner` for page or form-level feedback.
- Use `Text` for compact inline messages.
- Use `Paragraph` for longer explanatory copy.
- Use `Toast` for temporary action feedback.

## Small Example

```markdown markvspec-fragment section=screen
## Elements

### E-ErrorMessage Paragraph

- text: Email or password is incorrect.
- tone: danger

### E-CreateAccount Link

- label: Create account
- href: /signup
```

![Source Kind Metadata elements preview](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## Notes

- Use `Heading` with `level: 1..6`, not `H1` or `H2` element types.
- `variant` means priority. It is not a color name.
- `tone` means semantic intent. It is not a raw color.
- Do not write CSS classes, width, height, pixel values, or raw colors in the primary DSL.
- Connect button behavior to `## Actions` with `action: A-*` instead of embedding behavior directly in the element.
- Use `Text` for compact display text and `Paragraph` for prose.

## Related Pages

- [Sections](sections.md)
- [Actions](actions.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)
