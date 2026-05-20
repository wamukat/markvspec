# Elements

Elements describe UI parts by meaning. Prefer type, label, value, variant, tone, and action over visual implementation details.

## Concept

An element describes what appears on the screen and what that UI part means to the user. MarkVSpec is not a place for design tokens or CSS. Prefer UI roles such as Heading, Text, Input, Button, Message, and Link over colors, font sizes, or class names.

In low-fidelity preview, element type, label, value, variant, tone, and action provide the cues needed to understand the screen. In Git diffs, you can see meaningful changes such as a button label changing, an action connection moving, or an error message being added.

## Minimal Example

```markdown
## Elements

### E-Title Heading

- level: 1
- text: Sign in

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

This example defines only a heading and a primary button. The `action` property connects the button to an action in the `Actions` section, so the visible control and the behavior stay linked.

## Common Patterns

- Use `Heading` with `level: 1..6` for headings.
- Use `Text` for short labels and values.
- Use `variant` for priority and `tone` for semantic intent.
- Keep input label, placeholder, required, and constraints close to the input element.
- Add `action: A-*` to buttons and links when they trigger behavior.
- Express warning, error, and success semantics with `tone`, not raw colors.
- Do not use types such as `H1` or `H2`; use `Heading` plus `level`.

## Example: Input And Message

```markdown
## Elements

### E-EmailInput Input

- label: Email
- placeholder: name@example.com
- required
- constraints
  - format: email

### E-ErrorMessage Message

- tone: danger
- text: Email address is required.
- visible when: auth-error

### E-SubmitButton Button

- label: Continue
- variant: primary
- action: A-Submit
```

Input constraints stay near `E-EmailInput`, while the error message uses `tone: danger` and a state condition. This lets preview and review show which UI part matters in each state.

![Source Kind Metadata elements preview](../../assets/previews/source-kind-metadata-showcase.png)

## Next Reading

- [Actions](actions.md)
- [Validation](validation.md)
- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)
- [Reference](../reference/index.md)
