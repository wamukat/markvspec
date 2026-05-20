# Login Form

## いつ使うか

ログイン、サインイン、管理画面への入口など、入力値を検証して authentication request を送る画面で使います。入力欄、submit button、required rule、成功時の遷移、失敗時の message を1つの screen spec にまとめます。

この recipe は、form の見た目を細かく指定するためではなく、user が何を入力し、どの action が起き、結果として画面がどう変わるかを読むためのものです。

## 完成イメージ

Email と password を入力し、Sign in を押す。入力不足なら field message を表示し、request 中は submit を待機状態にする。認証に成功したら dashboard へ遷移し、失敗したら error state と message area を更新します。

## 最小の書き方

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

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Effects
  - state: submitting
- Cases
  - success:
    - from: submitting
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - from: submitting
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
```

## 書き方の要点

- `Input` には user に見える label と入力種別を書く。
- submit の発火元は `Triggered` に書き、button 側にも `action` を付ける。
- request parameter は `E-EmailInput.value` のように element の値として書く。
- request 中、成功、失敗を state と case で分ける。
- 失敗時にどこへ何を表示するかは `update` の `target` と `content` で明示する。

## よくある落とし穴

- `action: submit` だけで終わらせると、request path、parameter、結果が読めません。
- password policy や required 条件を prose だけにすると、review で見落とされます。`required` や `Business Rules` に分けて書きます。
- API の実装詳細を書きすぎる必要はありません。画面仕様として必要な method、path、入力、response case に絞ります。
- button の disabled 色や CSS class は書きません。semantic には `state: submitting` や `variant: primary` で十分です。
- success と failure を1つの文章にまとめると、preview や AI review が追いにくくなります。

## 関連 example

- [Login](../../../examples/showcase/login-basic.html): responsive layout、required validation、request parameter、response case、navigation を含む例。
- [Single Field Validation](../../../examples/showcase/single-field-validation.html): field 単位の validation feedback を確認する例。

## 関連 reference

- [Actions Guide](../guide/actions.md)
- [Validation Guide](../guide/validation.md)
- [Elements Reference](../reference/elements.md)
- [Actions Reference](../reference/actions.md)
- [Business Rules Reference](../reference/rules.md)

## 確認方法

- required field の条件が element または rule として読める。
- request parameter が input element の値から取られている。
- request 中、success、failure の state / case が分かれている。
- failure message の表示先が `target` で追える。
- dashboard など他 screen へ移る場合、`navigate` の遷移先 ID が明示されている。
