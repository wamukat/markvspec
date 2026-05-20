# Actions

`## Actions` は user interaction、HTTP request、state change、navigation、partial update を結びます。button や link は element の `action: A-*` から参照し、画面読み込みなどの lifecycle event は `## Events` で接続します。

## 書ける構文

```markdown
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

### Action Heading

Action は `### A-* Name` で宣言します。preview に action marker を出したい場合は
`### marker:A-* Name` と書きます。

```markdown
### A-RefreshList Refresh list

### A1:A-RefreshList Refresh list
```

### Blocks

| Block | 用途 |
| --- | --- |
| `From` | action が有効な state |
| `Process Pn: ...` | request、calculation、local process、response handling |
| `request` / `receive` / `sync` / `server` | process の入力や実行内容 |
| `case: ...` | success/failure/empty など、process result 別の挙動 |

### HTTP Request

HTTP request は `Process Pn:` の `request:` の下に置き、method/path と request parameter を書きます。`server:` は必要な場合だけ、サーバ側の service call など HTTP request ではない処理を書くために使います。

```markdown
- Process P1: Load profile
  - request:
    - GET /profile
    - params:
      - userId: route.userId
```

### Partial Update

server-rendered partial update は raw htmx 属性ではなく、結果 case の `display` で意味を書きます。

```markdown
- Process P1: Apply profile response
  - case: success
    - response: 200 profile partial
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

`display` の field は次のように使い分けます。

- `target`: 更新する MarkVSpec の layout ID または element ID。
- `message`: semantic message text または message reference。
- `element`: 既存 element を表示する場合の `E-*` ID。
- `partial`: referenced partial file で target を置き換える場合の `PRT-*` document ID。

`display` には raw HTML、CSS selector、htmx 属性を書きません。MarkVSpec の ID と
semantic message で、ユーザーに見える結果を書きます。

## 小さな例

```markdown
### A-OpenSettings Open settings

- Process P1: Navigate to settings
  - navigate: SCR-SETTINGS
```

![Form Submit Flow の actions preview](../../assets/vscode-previews/form-submit-flow-vscode-preview.png)

## 注意点

- action の ID は `A-*` を使います。
- click などの element event は、対象 element の `action: A-*` で接続します。
- 画面読み込みなどの lifecycle event は `## Events` に書きます。
- state 名は `## States` に書いた名前と合わせます。
- `partial` は partial replacement の意味であり、`hx-*` 属性を書く指示ではありません。
- display payload は `message`、`element`、`partial` のいずれかで書きます。
- request の parameter は element value への参照として書くと、AI と reviewer が追いやすくなります。
- 結果分岐は `Process Pn:` 配下の `case:` として書きます。

## 関連ページ

- [Elements](elements.md)
- [Business Rules](rules.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
