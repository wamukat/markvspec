# Actions

<!-- markvspec-coverage:reference.page.actions -->

`## Actions` は user interaction、HTTP request、state change、navigation、
targeted display update を結びます。button や link は element の `action: A-*`
から参照し、画面読み込みなどの lifecycle event は `## Events` で接続します。

## 書ける構文

```markdown markvspec-skip reason=requires-validation-context
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

```markdown markvspec-skip reason=requires-actions-context
### A-RefreshList Refresh list

### A1:A-RefreshList Refresh list
```

### Blocks

<!-- markvspec-generated:reference-actions:start -->
この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。

#### Action 直下の structured item

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `From` | `canonical` | 出力対象 | - | Action の遷移元 state。 |
| `Process Pn:` | `canonical` | 出力対象 | - | marker 付き process step。 |
| `Otherwise` | `canonical` | 出力対象 | - | fallback outcome。 |
| `Triggered` | `non-canonical` | 出力対象外 | `warning` | legacy trigger wrapper。Element の action または Events を使います。 |

#### Process 配下の structured item

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `request` | `canonical` | 出力対象 | - | HTTP request block。 |
| `receive` | `canonical` | 出力対象 | - | 外部 result block。 |
| `sync` | `canonical` | 出力対象 | - | 同期 service / calculation detail。 |
| `server` | `canonical` | 出力対象 | - | server-side service call detail。HTTP method/path は request 配下に置きます。 |
| `response` | `canonical` | 出力対象 | - | response classification detail。 |
| `validation` | `canonical` | 出力対象 | - | validation process detail。 |
| `when` | `canonical` | 出力対象 | - | process guard。 |
| `skip when` | `canonical` | 出力対象 | - | skip guard。 |
| `parallel` | `canonical` | 出力対象 | - | parallel process group。 |
| `resolve` | `canonical` | 出力対象 | - | resolve process group。 |
| `case` | `canonical` | 出力対象 | - | process result branch。 |
| `state` | `canonical` | 出力対象 | - | immediate state transition effect。 |
| `navigate` | `canonical` | 出力対象 | - | immediate navigation effect。 |
| `display` | `canonical` | 出力対象 | - | display effect block。 |
| `update` | `canonical` | 出力対象 | - | partial update effect block。 |
| `model` | `canonical` | 出力対象 | - | structured model side effect。 |
| `view` | `canonical` | 出力対象 | - | structured view side effect。 |
| `stop` | `canonical` | 出力対象 | - | process case flow directive。 |
| `continue` | `canonical` | 出力対象 | - | process case flow directive。 |
| `Effects` | `non-canonical` | 出力対象外 | `warning` | legacy effect wrapper。 |
| `input` | `non-canonical` | 出力対象外 | `warning` | 古い process wrapper label。 |
| `inputs` | `non-canonical` | 出力対象外 | `warning` | 古い process wrapper label。 |
| `condition` | `non-canonical` | 出力対象外 | `warning` | 古い process wrapper label。 |
| `conditions` | `non-canonical` | 出力対象外 | `warning` | 古い process wrapper label。 |
| `cases` | `non-canonical` | 出力対象外 | `warning` | 古い process wrapper label。 |
<!-- markvspec-generated:reference-actions:end -->

### HTTP Request

HTTP request は `Process Pn:` の `request:` の下に置き、method/path と request parameter を書きます。`server:` は必要な場合だけ、サーバ側の service call など HTTP request ではない処理を書くために使います。

```markdown markvspec-skip reason=requires-action-heading
- Process P1: Load profile
  - request:
    - GET /profile
    - params:
      - userId: route.userId
```

### Partial Update

targeted display update は、結果 case の `display` で意味を書きます。これは
implementation-neutral な契約です。raw framework attributes ではなく、ユーザーに
見える結果を書きます。

```markdown markvspec-skip reason=requires-action-heading
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
- `content`: diagnostics のために認識されますが、canonical な `display` payload では
  ありません。raw inline content は書かず、`message:`、`element:` で参照する
  `E-*` / `L-*`、または `partial:` で参照する `PRT-*` document を使います。
- `mode: replace`: target 領域に表示される内容が置き換わることを表す。DOM swap 命令や
  `hx-swap` の値ではありません。

`display` には raw HTML、CSS selector、raw framework attributes を書きません。
MarkVSpec の ID と semantic message で、ユーザーに見える content の結果を書きます。

同じ `display` block は、実装方式ごとに次のように読めます。

| 実装方式 | 読み方 |
| --- | --- |
| Thymeleaf / htmx | server-rendered partial または response content が target 領域に表示される。 |
| React / Vue / Svelte | state、store、component data が変わり、target の component subtree が再描画される。 |
| SSR + fetch | fetch の結果で view model または HTML が更新され、target 領域の表示が変わる。 |

## 小さな例

```markdown markvspec-skip reason=requires-state-action-definitions
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
- `partial` は参照した置き換え content の意味であり、`hx-*` 属性を書く指示ではありません。
- `content` は canonical な display payload ではありません。`message`、`element`、
  `partial` のいずれかで semantic に書きます。
- display payload は `message`、`element`、`partial` のいずれかで書きます。
- request の parameter は element value への参照として書くと、AI と reviewer が追いやすくなります。
- 結果分岐は `Process Pn:` 配下の `case:` として書きます。

## 関連ページ

- [Elements](elements.md)
- [Business Rules](rules.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
