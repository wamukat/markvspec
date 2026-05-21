# アクション

`## Actions` はユーザー操作、HTTP リクエスト、状態変化、画面遷移、部分更新を結びます。ボタンやリンクは要素の `action: A-*` から参照し、画面読み込みなどのライフサイクルイベントは `## Events` で接続します。

## 書ける構文

以下は `## Actions` セクションの抜粋です。参照している状態、レイアウト、要素、
バリデーション、メッセージは同じ画面文書内で定義されている前提です。

```markdown markvspec-skip reason=context
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
    - state: wait-auth
  - case: send-failed
    - state: auth-error

### A-HandleLoginResponse Handle login response

- From
  - wait-auth
- Process P1: Apply login response
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - case: failure
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - display:
      - target: L-MessageArea
      - message: Authentication error message
```

### アクション見出し

アクションは `### A-* Name` で宣言します。プレビューにアクションマーカーを出したい場合は
`### marker:A-* Name` と書きます。

以下は見出しだけの抜粋です。

```markdown markvspec-skip reason=context
### A-RefreshList Refresh list

### A1:A-RefreshList Refresh list
```

### ブロック

| ブロック | 用途 |
| --- | --- |
| `From` | アクションが有効な状態 |
| `Process Pn: ...` | リクエスト、計算、ローカル処理、応答処理 |
| `request` / `receive` / `sync` / `server` | 処理の入力や実行内容 |
| `case: ...` | success/failure/empty など、処理結果別の挙動 |

### HTTP リクエスト

HTTP リクエストは `Process Pn:` の `request:` の下に置き、メソッド、パス、リクエストパラメータを書きます。`server:` は必要な場合だけ、サーバー側のサービス呼び出しなど HTTP リクエストではない処理を書くために使います。

以下はアクション内の `Process` 抜粋です。

```markdown markvspec-skip reason=context
- Process P1: Load profile
  - request:
    - GET /profile
    - params:
      - userId: route.userId
```

### 部分更新

サーバー生成 partial の更新は、生の htmx 属性ではなく、結果ケースの `display` で意味を書きます。

以下はアクション内の `Process` 抜粋です。

```markdown markvspec-skip reason=context
- Process P1: Apply profile response
  - case: success
    - response: 200 profile partial
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

`display` の項目は次のように使い分けます。

- `target`: 更新する MarkVSpec のレイアウト ID または要素 ID。
- `message`: 意味を持つメッセージ文、またはメッセージ参照。
- `element`: 既存要素を表示する場合の `E-*` ID。
- `partial`: 参照する partial ファイルで差し替え先を置き換える場合の `PRT-*` 文書 ID。

`display` には生の HTML、CSS selector、htmx 属性を書きません。MarkVSpec の ID と
意味を持つメッセージで、ユーザーに見える結果を書きます。

## 小さな例

以下はアクション 1件だけの抜粋です。実際の画面では、このアクションを呼ぶ要素や
有効な状態も合わせて書きます。

```markdown markvspec-skip reason=context
### A-OpenSettings Open settings

- Process P1: Navigate to settings
  - navigate: SCR-SETTINGS
```

![Form Submit Flow のアクションプレビュー](../../assets/vscode-previews/form-submit-flow-vscode-preview.png)

## 注意点

- アクションの ID は `A-*` を使います。
- click などの要素イベントは、対象要素の `action: A-*` で接続します。
- 画面読み込みなどのライフサイクルイベントは `## Events` に書きます。
- 状態名は `## States` に書いた名前と合わせます。
- `partial` は partial replacement の意味であり、`hx-*` 属性を書く指示ではありません。
- display の内容は `message`、`element`、`partial` のいずれかで書きます。
- リクエストのパラメータは要素の値への参照として書くと、AI とレビュー担当者が追いやすくなります。
- 結果分岐は `Process Pn:` 配下の `case:` として書きます。

## 関連ページ

- [要素](./elements.md)
- [ビジネスルール](./rules.md)
- [バリデーション](./validations.md)
- [ID](./ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
