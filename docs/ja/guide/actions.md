# Actions

Actions は、ユーザー操作や画面読み込みで起きる処理を記述します。trigger、process、case を分けると、UI と API の関係を review しやすくなります。

## 最小例

```markdown
## Actions

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

## 書き方

- trigger は element と event を対応させる。
- process は request や calculation などの処理を書く。
- case は成功、失敗、空結果などの分岐を書く。

## 関連 example

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)

## 関連 reference

- [Reference](../reference/index.md)
