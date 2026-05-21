# Scenarios

Use Preview Scenarios when one screen needs several reviewable preview cases.
Do not copy the whole screen just to show an error, empty state, toast, dialog,
or direct link.

## When To Use

- Show a validation error without rewriting the screen.
- Show empty, error, or loading data for the same state.
- Show a toast, dialog, or message caused by an action result.
- Show a direct link with route parameters or a hash fragment.
- Give reviewers named cases they can discuss in preview and exported HTML.

States name the display modes of the screen. Preview Scenarios name concrete
review cases inside those states.

## Minimal Example

```markdown
## Preview Scenarios

### invalid-email

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

This scenario says: show the `idle` state, apply the invalid submit case, fill
the email input with preview data, and render the route as if `token=expired`
was present.

## What Goes Where

| Need | Write |
| --- | --- |
| Which state to render | `state:` |
| Which Action case result to show, including validation-related cases | `cases:` |
| Element-specific preview values | `samples:` |
| Route parameters or hash fragments | `route:` |
| View Context sample to apply | `view:` |
| State or scenario that this scenario should appear before | `before:` |

Preview Scenarios are preview data. They do not create a new screen, new state,
or new action. Keep the real screen behavior in `## States`, `## Elements`, and
`## Actions`; use scenarios only to name useful review views.

## Baseline State Samples

When a scenario name is exactly the same as a state name and omits `state:`, it
adds sample data to that state's normal preview.

```markdown
## States

- idle*
- loaded

## Preview Scenarios

### loaded

- samples:
  - E-Title: Loaded
  - E-Users:
    - rows:
      - row:
        - name: Alice
```

This `loaded` entry is not an additional scenario. It is baseline data for the
`loaded` State View. In this form, only `samples:` and `route:` are allowed.

If you need another review case for the same `loaded` state, give the scenario a
distinct name and write `state:`.

```markdown
### loaded-empty

- state: loaded
- samples:
  - E-Users:
    - rows: []
```

## Sample Values

For ordinary elements, write the element ID and value.

```markdown
- samples:
  - E-EmailInput: invalid@example
```

For repeated content such as `Table` or `List`, use `rows:`. Use `rows: []` when
the scenario needs to show an empty result.

```markdown
- samples:
  - E-Users:
    - rows:
      - row:
        - name: Alice
        - role: Admin
```

## Cases And Routes

`cases:` references an Action result. Use the
`A-ActionId.P-marker.case-name` form.

```markdown
- cases:
  - A-SubmitLogin.P1.invalid
```

`route:` must be a block. Keys other than `hash` should match a `:param` in the
screen `route:`.

```markdown
- route:
  - memberId: M-100
  - hash: details
```

## Next Reading

- [States](./states.md)
- [Actions](./actions.md)
- [Validation](./validation.md)
- [Preview Scenarios Reference](../reference/sections.md)
- [Scenario Preview Data Example](../../../examples/showcase/scenario-samples.html)
