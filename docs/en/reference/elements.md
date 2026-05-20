# Elements

`## Elements` describes UI elements by meaning. MarkVSpec records element type, label, text, value, variant, tone, and action instead of visual implementation details.

## Syntax You Can Write

```markdown
## Elements

### E-Title Heading

- level: 1
- text: Login

### E-EmailInput Input

- label: Email
- value: email
- required
- constraints
  - format: email

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

### Element Heading

Declare an element with `### E-* Name Type`. When you want the preview to show
a marker, write `### marker:E-* Name Type`.

```markdown
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

| Property | Syntax | Use |
| --- | --- | --- |
| `text` | `- text: Hello` | Display copy for `Heading`, `Paragraph`, `Text`, `Banner`, and `Toast` |
| `label` | `- label: Sign in` | Control or link label for `Button`, `Input`, `Select`, `Checkbox`, and `Link` |
| `value` | `- value: email` | Field value or data binding name; not a display label |
| `placeholder` | `- placeholder: name@example.com` | Input example |
| `required` | `- required` | Required input |
| `variant` | `- variant: primary` | Priority: `primary`, `secondary`, `tertiary` |
| `tone` | `- tone: danger` | Semantic intent: `neutral`, `info`, `success`, `warning`, `danger` |
| `action` | `- action: A-SubmitLogin` | Action ID to trigger |
| `href` | `- href: /settings` | Link target |
| `options` | `- options:` | Selectable values for choice controls |
| `columns` / `sample rows` | `- columns:` / `- sample rows:` | Table structure and representative rows |
| `visible when` | `- visible when: error` | State where the element appears |
| `hidden when` | `- hidden when: loading` | State where the element is hidden |
| `disabled when` | `- disabled when: submitting` | State where the control is disabled |
| `loading when` | `- loading when: submitting` | State where the element shows loading feedback |
| `open when` | `- open when: dialog-open` | State where dialog, popover, accordion, or disclosure is open |
| `placement` | `- placement: below E-HelpIcon` | Placement for tooltip, popover, or menu |

### Text, Label, And Value

Use these three properties consistently:

- `text`: visible copy on read-only display elements. Use this for new
  `Heading`, `Paragraph`, `Text`, `Banner`, and `Toast` entries.
- `label`: visible name of a control or link. Use it for `Button`, `Input`,
  `Select`, `Checkbox`, `RadioGroup`, `Switch`, and `Link`.
- `value`: current value, binding name, or sample value for input-like elements.

`Heading` examples may still contain `label` for compatibility with older
sources, but new source should use `text` with `level`.

### Message Type

Do not use `Message` for new source. It is too broad to tell the preview what
kind of UI is intended.

- Use `Banner` for page or form-level feedback.
- Use `Text` for compact inline messages.
- Use `Paragraph` for longer explanatory copy.
- Use `Toast` for temporary action feedback.

## Small Example

```markdown
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
