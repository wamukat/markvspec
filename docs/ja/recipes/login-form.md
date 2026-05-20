# Login Form

ログイン画面を書くときの最小パターンです。

## 完成イメージ

- `idle`: email、password、Sign in button。
- `submitting`: 送信中の状態。
- `auth-error`: 認証エラー message。

[Login example を preview で見る](../../../examples/showcase/login-basic.html)

## DSL

```markdown
## States

### idle

### submitting

### auth-error

## Elements

### E-EmailInput Input

- label: Email
- required

### E-PasswordInput Input

- label: Password
- type: password
- required

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

## Actions

### A-SubmitLogin Submit login

- From
  - idle
- Process P1: Send login request
  - server:
    - POST /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - case: sent
    - state: submitting

### A-HandleLoginResponse Handle login response

- From
  - submitting
- Process P1: Apply login response
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - navigate: SCR-DASHBOARD
  - case: failure
    - state: auth-error
    - display:
      - target: L-MessageArea
      - content: Authentication error message
```

## ここを見る

- button が何を起こすか: `E-SignInButton` の `action`。
- 送信先: `server: POST /login`。
- 送信する値: `params`。
- 成功時: `case: success`。
- 失敗時: `case: failure`。

## よくある間違い

- `action: submit` だけで終わらせる。
- success / failure を文章だけで説明する。
- CSS class や button 色を書く。
- API の内部仕様を書きすぎる。

## 詳細

- [Actions Guide](../guide/actions.md)
- [Validation Guide](../guide/validation.md)
- [Actions Reference](../reference/actions.md)
