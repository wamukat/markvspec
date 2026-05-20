# Actions

`## Actions` は user interaction、server request、state change、navigation、partial update を結びます。element の `action: A-*` から参照される処理をここに書きます。

## 書ける構文

```markdown
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
  - state: wait-auth
- Cases
  - success:
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
      - mode: replace
```

### Action Heading

Action は `### A-* Name` の形で宣言します。

```markdown
### A-RefreshList Refresh list
```

### Blocks

| Block | 用途 |
| --- | --- |
| `Triggered` | action を開始する event。例: `E-Button.click` |
| `From` | action が有効な state |
| `Process` | request、calculation、local process |
| `Effects` | immediate state change や navigation |
| `Cases` | success/failure/empty など、結果別の挙動 |

### HttpRequest

`Process` の下に `HttpRequest` を置き、method/path と request parameter を書きます。

```markdown
- Process
  - HttpRequest
    - GET /profile
    - userId: E-UserId.value
```

### Partial Update

server-rendered partial update は raw htmx 属性ではなく、結果 case の `update` で意味を書きます。

```markdown
- Cases
  - success:
    - response: 200 profile partial
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
```

## 小さな例

```markdown
### A-OpenSettings Open settings

- Triggered
  - E-SettingsLink.click
- Effects
  - navigate: SCR-SETTINGS
```

## 注意点

- action の ID は `A-*` を使います。
- trigger の対象 element は `## Elements` に存在する `E-*` を参照します。
- state 名は `## States` に書いた名前と合わせます。
- `mode: replace` は partial update の意味であり、`hx-*` 属性を書く指示ではありません。
- request の parameter は element value への参照として書くと、AI と reviewer が追いやすくなります。
- `Cases` は server response、validation failure、empty result など結果が分岐する場合に使います。

## 関連ページ

- [Elements](elements.md)
- [Business Rules](rules.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
