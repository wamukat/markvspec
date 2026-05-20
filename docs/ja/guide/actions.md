# Actions

Actions は、ユーザー操作や画面読み込みで起きる処理を記述します。trigger、process、case を分けると、UI と API の関係を review しやすくなります。

## 考え方

Action は「何をきっかけに」「何を実行し」「結果として画面がどう変わるか」を 1 つの単位で書きます。button click、link click、form submit、screen load、timer、selection change など、ユーザーや画面が起こすイベントを `Triggered` に置きます。

処理の中身は `Process` に置きます。API request であれば `HttpRequest`、画面内の計算であれば calculation として書けます。結果は `Cases` に分け、success、failure、empty、validation-error などの分岐ごとに state、navigate、update、message を書きます。

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

この例では、button click が `/login` request を起こし、成功時は dashboard へ移動、失敗時は `auth-error` state に変わることだけを書いています。実装の関数名ではなく、画面仕様として review したい流れを残します。

## よくある書き方

- trigger は element と event を対応させる。
- process は request や calculation などの処理を書く。
- case は成功、失敗、空結果などの分岐を書く。
- request parameter は element の値を参照して書く。例: `email: E-EmailInput.value`。
- 処理開始時に loading 表示が必要なら `Effects` に `state: loading` を置く。
- 結果ごとに navigation、state、partial update、message update を分けて書く。
- 1 つの action に複数の責務を詰め込まない。ユーザー操作として別なら action も分ける。

## 例: form submit

```markdown
## Actions

### A-SubmitProfile Submit profile

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /profile
    - name: E-NameInput.value
    - email: E-EmailInput.value
- Effects
  - state: submitting
- Cases
  - success:
    - state: saved
    - update:
      - target: L-MessageArea
      - content: Saved message
  - validation-error:
    - state: input-error
    - update:
      - target: L-MessageArea
      - content: Validation error message
  - failure:
    - state: error
```

この書き方にすると、request parameter、処理中 state、結果ごとの画面変化が 1 か所で確認できます。VS Code preview では状態を切り替えながら、どの case がどの UI を作るかを確認しやすくなります。

## 次に読むもの

- [States](states.md)
- [Partial Updates](partial-updates.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Reference](../reference/index.md)
