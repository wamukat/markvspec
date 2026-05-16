# FormGroup Design

## Purpose

`FormGroup` is the DSL construct for grouping multiple input elements and a submit action into one semantic validation unit.
When a Validation targets a layout ID, the visual grouping and validation responsibility become mixed and the design intent becomes harder to read.
`FormGroup` avoids that ambiguity so Validation, preview output, and implementation tasks can refer to the same semantic unit.

## Canonical Syntax

`FormGroup` is not a visible screen element. It is a semantic input group, so it is defined in the dedicated `## Form Groups` section instead of `## Elements`.

```markdown
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin
```

- Use `F-*` as the FormGroup ID.
- `fields` lists the related input `E-*` elements.
- `submit` points to the primary submit `A-*` action.
- Do not bind a FormGroup to a Layout. Use `L-*` for display and update targets, and `F-*` for validation targets.

Validations should target either a FormGroup or an Element. Multiple `target: E-*` entries remain valid for composite validation, but `F-*` is the preferred target when several inputs are validated as one form.

```markdown
## Validations

### V-LoginForm Login form validation

- target: F-LoginForm
- rules:
  - required:
    - E-EmailInput
    - E-PasswordInput
- scope: composite
- run: client
- condition: email is empty or password is empty
- message: Email and password are required.
```

## Diagnostics

The parser returns `## Form Groups` as structured `formGroups`.
The validator applies these diagnostics:

- Error when `fields` references an unknown Element ID.
- Warning when `fields` references a non-input Element ID.
- Error when `submit` references an unknown Action ID.
- Validation `target` should be an Element ID or FormGroup ID. Multiple Element targets remain valid.
- Validation `trigger` is not canonical; Actions consume the implicit `V-*.result` reference.
- Warning when a Validation targets a Layout ID with `scope: composite` or `scope: cross-field`, because that should be migrated to a FormGroup.

Layout targets are not immediate errors for compatibility, but examples and documentation should not use them. User-facing docs should present FormGroup as canonical.

`F-*` is only for Validation targets. Do not use it as an Action update target, partial update target, layout item, or DOM replacement target.
The submit button is referenced through `submit`; it does not need to be listed under `fields`.

## Preview

The preview displays `Form Groups` once as a screen-level common section, not under each state or viewport.
The table shows FormGroup ID, fields, and submit action.

The Validation section renders `target: F-*` as a reference to the FormGroup.
The priority is to make the relationship between input-form specs and validation rules easy to follow.

## Migration Target

The first migrated example is `examples/01-basics/login-basic.vspec.md`.
Its previous `V-LoginForm` targeted `L-LoginForm`; the updated version adds `F-LoginForm` and points the Validation target to that FormGroup.

## Implementation Units

1. Add FormGroup to core types, parser, and section order.
2. Add FormGroup reference diagnostics, field diagnostics, and composite layout-target warnings to the validator.
3. Add `Form Groups` rendering and Validation target references to the preview.
4. Update the DSL docs and login example.
5. Add core and preview tests, and migrate existing layout-target examples to FormGroup.
