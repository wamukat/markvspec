# Loading And Error

## Purpose

Represent async loading, empty, error, and success behavior with screen states and action cases.

## Target Result

The screen starts a request on load. It shows loading while waiting, empty when there is no data, error when the request fails, and loaded when data arrives.

## Minimal Snippet

```markdown
## States

### loading

### loaded

### empty

### error

## Actions

### A-LoadItems Load items

- Triggered
  - screen.load
- Process
  - HttpRequest
    - GET /items
- Cases
  - success:
    - state: loaded
  - empty:
    - state: empty
  - failure:
    - state: error
```

## Related Example

- [Async Fetching](../../../examples/showcase/async-loading.html)
- [Display Effects](../../../examples/showcase/display-effects.html)

## Related Reference

- [States Guide](../guide/states.md)
- [Actions Guide](../guide/actions.md)
- [Reference](../reference/index.md)

## Verify

- States before and after the request are clear.
- Empty and failure are separate cases.
- The message placement is clear.
