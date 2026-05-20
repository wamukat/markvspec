# Loading And Error

## When To Use

Use this recipe for screens that load data on page load or filter change and need to distinguish loading, loaded, empty, and error states. Instead of explaining async behavior only in prose, write it as screen states and action cases so preview, review, and implementation tasks can follow it.

## Target Result

The screen starts a request when it loads. It shows a loading state while waiting, a loaded state when data arrives, an empty state when the response is valid but contains no data, and an error state when the request fails. If there is a Retry button, it runs the same load action again.

## Minimal Shape

```markdown
## States

### loading

### loaded

### empty

### error

## Layout: mobile

### L-Content Content area

- stack
- gap: md

## Elements

### E-LoadingMessage Text

- visible when: loading
- text: Loading items

### E-EmptyMessage Text

- visible when: empty
- text: No items yet

### E-ErrorMessage Text

- visible when: error
- text: Could not load items
- tone: danger

### E-RetryButton Button

- label: Retry
- action: A-LoadItems

## Events

- page.load: A-LoadItems

## Actions

### A-LoadItems Load items

- Process P1: Request items
  - server:
    - GET /items
  - case: sent
    - state: loading

### A-HandleItemsResponse Handle items response

- From
  - loading
- Process P1: Apply items response
  - receive:
    - response: A-LoadItems.P1.response
  - case: success
    - response: 200 item list
    - state: loaded
  - case: empty
    - response: 200 empty list
    - state: empty
  - case: failure
    - response: network error or 5xx
    - state: error
```

## Authoring Notes

- Make `loading` explicit as the temporary state around the request.
- Empty is not failure. Model it as a valid response with a separate `case:`.
- Put error messages, empty messages, and retry buttons in elements so their placement is clear.
- If retry exists, connect the Retry button to the same load action with `action: A-*`.
- For initial data loading, write `page.load` in `## Events`.

## Common Pitfalls

- Omitting loading leaves the in-flight UI undefined.
- Combining empty and error makes user messaging and response handling ambiguous.
- Writing only `success` and leaving failure in prose makes the failure path easy to miss.
- Spinner size and animation duration are not the main purpose of MarkVSpec. Express user-visible meaning with `E-LoadingMessage` and `state: loading`.
- Do not turn response notes into a full API specification. Keep only the conditions needed for screen branching.

## Related Example

- [Async Fetching](../../../examples/showcase/async-loading.html): Request, loading, loaded, empty, and error states.
- [Display Updates](../../../examples/showcase/display-effects.html): User-visible feedback such as messages, toasts, and dialogs.

## Related Reference

- [States Guide](../guide/states.md)
- [Actions Guide](../guide/actions.md)
- [Elements Reference](../reference/elements.md)
- [Actions Reference](../reference/actions.md)
- [Limitations Reference](../reference/limitations.md)

## Verify

- States before and after the request are readable.
- Loading, loaded, empty, and error are separately traceable.
- Empty and failure are separate cases.
- Message and retry placement is clear to the reader.
- Each required trigger is present, such as initial load, retry, or filter change.
