# Actions

Actions は、ユーザー操作や画面読み込みで起きる処理を記述します。呼び出し元、process、result case を分けると、UI と API の関係を review しやすくなります。

## 考え方

Action は「どこから呼ばれ」「何を実行し」「結果として画面がどう変わるか」を 1 つの単位で書きます。button click や link click は element の `action: A-*` で接続します。screen load などの lifecycle event は `## Events` に置きます。

処理の中身は `Process Pn:` に置きます。server request であれば `server:`、画面内の計算や validation であれば `sync:` や `receive:` として書けます。結果は process 配下の `case:` に分け、success、failure、empty、validation-error などの分岐ごとに state、navigate、display update、message を書きます。

## 最小例

```markdown
## Actions

### A-SubmitLogin Submit login

- Process P1: Send login request
  - server:
    - POST /login
  - case: sent
    - state: submitting
```

button との接続は `E-SignInButton` 側の `action: A-SubmitLogin` で表します。この例では、実装の関数名ではなく、画面仕様として review したい request 開始の流れを残します。

## よくある書き方

- user event は element の `action: A-*`、lifecycle event は `## Events` で action に接続する。
- process は `Process Pn:` として request、calculation、response handling などを書く。
- case は `Process Pn:` 配下に成功、失敗、空結果などの分岐として書く。
- request parameter は element の値を参照して書く。例: `email: E-EmailInput.value`。
- 処理開始時に loading 表示が必要なら、送信 process の `case: sent` 配下に `state: loading` を置く。
- 結果ごとに navigation、state、partial update、message update を分けて書く。
- 1 つの action に複数の責務を詰め込まない。ユーザー操作として別なら action も分ける。

## 例: form submit

```markdown
## Actions

### A-SubmitProfile Submit profile

- From
  - idle
- Process P1: Send profile request
  - server:
    - POST /profile
    - params:
      - name: E-NameInput.value
      - email: E-EmailInput.value
  - case: sent
    - state: submitting

### A-HandleProfileResponse Handle profile response

- From
  - submitting
- Process P1: Apply profile response
  - receive:
    - response: A-SubmitProfile.P1.response
  - case: success
    - state: saved
    - display:
      - target: L-MessageArea
      - content: Saved message
  - case: validation-error
    - state: input-error
    - display:
      - target: L-MessageArea
      - content: Validation error message
  - case: failure
    - state: error
```

この書き方にすると、request parameter、処理中 state、結果ごとの画面変化を action の流れとして確認できます。VS Code preview では状態を切り替えながら、どの case がどの UI を作るかを確認しやすくなります。

## 次に読むもの

- [States](states.md)
- [Partial Updates](partial-updates.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Reference](../reference/index.md)
