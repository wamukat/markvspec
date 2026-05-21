# IDs

IDs are stable names for referring to objects. Keep IDs stable when display labels or copy change.

## Syntax You Can Write

```markdown markvspec-skip reason=requires-validation-context
---
id: SCR-LOGIN
type: screen
title: Login
---

## Layout: mobile

### L-LoginForm Login form

#### Items

- E-EmailInput
- E-SignInButton

## Elements

### 5:E-SignInButton Button

- label: Sign in
- action: A-SubmitLogin

## Actions

### A1:A-SubmitLogin Submit login
```

## Prefixes

| Prefix | Target | Example |
| --- | --- | --- |
| `SCR-*` | Screen | `SCR-LOGIN` |
| `L-*` | Layout group | `L-LoginForm` |
| `P-*` | Presentation-only panel | `P-NameFields` |
| `E-*` | Element | `E-EmailInput` |
| `A-*` | Action | `A-SubmitLogin` |
| `R-*` | Rule | `R-CanSubmit` |

`P-*` can be used inside `Items`, but it is not a semantic layout ID. Preview
does not show layout chrome or layout markers for it; it only arranges child
items. Use `L-*` when the region needs a `target`, visibility, disabled state,
or partial host behavior.

## Marker-Prefixed Headings

Object headings may include a preview marker before the ID.

```markdown markvspec-skip reason=requires-elements-context
### 5:E-SignInButton Button

### A1:A-SubmitLogin Submit login

### L1:L-LoginForm Login form
```

The part before `:` is the marker shown in preview. The stable ID is the part
after `:`. Use the stable ID in references such as `Items`, `action`, `target`,
and `navigate`.
Write `P-*` panels without a marker prefix, such as `### P-NameFields Name fields`.

You can omit the marker when you do not need preview labels:

```markdown markvspec-fragment section=elements
### E-SignInButton Button
```

## Small Example

```markdown markvspec-skip reason=requires-elements-context
### 1:E-RememberMe Checkbox

- label: Remember me

### A1:A-ToggleRememberMe Toggle remember me

- Process P1: Toggle remembered state
  - state: idle
```

![Hello Screen preview with stable IDs](../../assets/vscode-previews/hello-screen-ids-vscode-preview.png)

## Notes

- IDs are for references; `label` and `text` are for display.
- Write IDs with an uppercase prefix and a meaningful name.
- Do not duplicate IDs within the same file.
- `Items`, `action`, `target`, and `navigate` refer to IDs, not preview markers.
- Rename IDs carefully so references keep working when screens are split.
- Do not mix raw routes, CSS classes, or database primary keys into IDs.

## Related Pages

- [File Format](./file-format.md)
- [Sections](./sections.md)
- [Elements](./elements.md)
- [Actions](./actions.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
