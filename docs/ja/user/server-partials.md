# サーバレンダリング部分更新

## この文書の位置づけ

この文書は、サーバから返る partial HTML や htmx 風の部分更新を MarkVSpec で表現する
ためのガイドです。基本の Action / Layout 記法は [DSL リファレンス](dsl.md) を参照してください。

MarkVSpec では、Thymeleaf や htmx 風の部分更新を、まず design intent として
表現します。実装詳細は補足できますが、意味の説明を置き換えないようにします。

部分更新が独立して設計・レビューされる規模になった場合は、`type: partial`
の文書として切り出します。screen 文書は partial を呼び出して DOM を置き換える
契約を持ち、partial 文書はサーバから返る HTML の構造とサーバ側処理を持ちます。

partial 文書は再利用可能な HTML fragment です。partial 自身も
`references.partials` を持ち、child partial を合成できます。プレビューは nested
partial を再帰的に解決します。循環参照は無効で、preview の負荷を抑えるため
nesting は最大 10 階層までです。

partial 文書は、自分自身を再取得して置き換える self refresh action も表現できます。
ただし `display:` の payload は、作成済みの `E-*` element または `L-*` layout を
単数の `element:` で参照します。直接の `display.content` や
`display.content.partial` は authoring syntax としては扱いません。

## 原則

次の層で書き分けます。

1. `element`: 更新後に表示される作成済み element / layout。
2. `target`: どの layout / element が変わるか。
3. `request`: method / path などの実装契約ヒント。

`hx-post` や `hx-target` のような htmx 属性そのものは、主 DSL としては書きません。
それらは Action と display details から導出される実装選択です。

## 推奨パターン

screen 側の Action では、リクエストと画面上の置き換え結果を書きます。

```markdown
### A1:A-SubmitLogin ログイン送信

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: ログイン送信
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
  - case: sent
    - Effects
      - state: wait-auth
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
      - fragment: auth/login :: message
```

`element` が設計上の契約です。`fragment` は設計と Thymeleaf をつなぐ実装ヒントです。

screen 側で partial のプレビューを埋め込む場合は、置き換え先 layout に partial ID と
画面状態ごとの partial 状態を指定します。これにより、同じ partial でも
`initializing` では `loading`、`idle` では `loaded` のように表示を切り替えられます。

```markdown
### L2:L-MemberProfilePartial Member Profile Partial

- stack
- variant: card
- partial:
  - id: PRT-MEMBER-PROFILE-CARD
  - states:
    - initializing: loading
    - idle: loaded
```

partial 側は `partial.render` を契機にして、返却 HTML を組み立てる処理を書きます。

```markdown
---
id: PRT-NOTICE-LIST-CARD
type: partial
title: お知らせカード
route: /mypage/partials/notices
---

# PRT-NOTICE-LIST-CARD お知らせカード

## Actions

### A-BuildNoticeList Build notice list

- Triggered
  - partial.render
- Process P1: Notice list を構築
  - server:
    - call: NoticeQueryService.findLatest()
  - case: success
    - description: 200 notices
    - Effects
      - model: ${model.notices.items} = result.items
      - model: ${model.notice} = ${model.notices.items} の現在行
```

`bridge` のような特定アーキテクチャの語は MarkVSpec の予約語にしません。
必要な場合は名前付き process の詳細にプロジェクト固有名として書きます。

htmx 風に partial 自身を置き換える場合は、その partial 上の名前付き request
process として refresh を表現します。

```markdown
---
id: PRT-POINTS-CONTENT
type: partial
title: Points Content
---

# PRT-POINTS-CONTENT Points Content

## Actions

### A-RefreshPoints Refresh points

- Triggered
  - E-Refresh.click
- Process P1: Points content を更新
  - request:
    - method: GET
    - path: /points/content
  - case: success
    - Effects
      - state: loading
```

## リクエストモデリング

request は `Process P1: Send request` に書きます。

```markdown
- Process P1: ログインリクエスト送信
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
```

これは implementation-aware ですが、htmx syntax を設計書へ直接持ち込みません。
実装側では通常の form post、`fetch`、htmx のいずれにも対応できます。

## レスポンスモデリング

response は、`A-SubmitLogin.P1.response` のような response handler Action に分けて書きます。

```markdown
### A2:A-HandleLoginResponse ログイン応答処理

- Triggered
  - A-SubmitLogin.P1.response
- From
  - wait-auth
- Process P1: ログイン応答処理
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 with message fragment
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
```

現在画面の状態が変わる場合は `state`、別画面へ移る場合は `navigate` を使います。
メッセージ表示だけの失敗は baseline state に戻し、`display` で banner を表示できます。
partial update はどの case にも付けられますが、実際に画面を更新する result にだけ
scope します。

## 曖昧さを避けるルール

- framework 固有の fragment 名が必要な場合は実装メモに寄せ、`display.element`
  は review 可能な作成済み UI を指すようにする。
- `target` がない場合は、画面更新ではなく side effect として扱う。
- 1つの result で複数 target を更新する場合は、result row には主 target を書き、
  追加の影響は result notes に記載する。
- server-side validation と client-side validation は、trigger が異なるなら
  別 action として書く。

## サンプルでの確認箇所

- [Login Basic](../../../examples/01-basics/login-basic.vspec.md) は認証レスポンスの
  エラーと remember-me cookie side effect を扱います。
- [Search List](../../../examples/04-real-world-screens/search-list.vspec.md) は検索、
  empty result、load-error の部分更新を扱います。
- [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md) は
  validation、request case、update target を扱います。
- [Template Shell](../../../examples/05-reuse/template-shell.vspec.md) は、
  現在の reuse-oriented release example です。
