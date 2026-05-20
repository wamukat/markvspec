# Actions

## 目的

`## Actions` は trigger、process、case、effect を記述します。UI 操作と server request、状態変化、画面遷移、partial update を結びます。

## 例

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- Process
  - HttpRequest
    - POST /login
- Cases
  - success:
    - navigate: SCR-DASHBOARD
  - failure:
    - state: auth-error
```

## Partial Update

server-rendered partial update は raw htmx 属性ではなく、`HttpRequest` と `update` で意味を表します。

```markdown
- Cases
  - success:
    - update:
      - target: L-MessageArea
      - content: Error message partial
      - mode: replace
```

## 関連 example

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
