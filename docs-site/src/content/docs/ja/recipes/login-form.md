---
title: "Login Form"
---

ログイン画面を書くときの最小パターンです。入力 field、submit button、送信 request、成功時の遷移、失敗時の message を 1 つの screen spec にまとめます。

## 完成イメージ

- `idle`: email、password、Sign in button。
- `submitting`: 送信中の状態。
- `auth-error`: 認証エラー message。
- required などの単項目制約は input の近くに書く。
- locked account などの業務判断は `## Business Rules` に分ける。

[Login example を preview で見る](/markvspec/examples/showcase/login-basic.html)

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
  - request:
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
      - message: Authentication error message
```

## ここを見る

- button が何を起こすか: `E-SignInButton` の `action`。
- 入力 field の制約: `E-EmailInput` / `E-PasswordInput` の `required`。
- 送信先: `request: POST /login`。
- 送信する値: `params`。
- 成功時: `case: success`。
- 失敗時: `case: failure`。
- 失敗時の表示先: `display` の `target` と `message`。

## よくある間違い

- `action: submit` だけで終わらせる。
- required や format を prose だけで説明する。
- 単なる required を `## Business Rules` に置く。
- success / failure を文章だけで説明する。
- CSS class や button 色を書く。
- API の内部仕様を書きすぎる。

## 詳細

- [Actions Guide](/markvspec/ja/guide/actions/)
- [Validation Guide](/markvspec/ja/guide/validation/)
- [Validations Reference](/markvspec/ja/reference/validations/)
- [Actions Reference](/markvspec/ja/reference/actions/)
- [Business Rules Reference](/markvspec/ja/reference/rules/)
