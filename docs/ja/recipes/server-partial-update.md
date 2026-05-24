# サーバー部分更新

## いつ使うか

Thymeleaf やサーバー生成 HTML partial を使い、画面全体ではなく一部の領域だけを更新したいときに使います。MarkVSpec には htmx の生の属性を書くのではなく、どのユーザー操作でリクエストが発生し、どの領域にどんな意味の内容が表示されるかを書きます。

React、Vue、Svelte、SSR + fetch では、同じ `display` 構造を targeted display update の契約として読めます。state、store、view model、または取得した content が変わり、target 領域の表示が変わる、という意味です。サーバー生成 partial は実装例の一つであり、DSL の制限ではありません。

## 完成イメージ

更新ボタンやフィルター変更でサーバーへリクエストし、返ってきた summary partial を `L-ProfileSummary` に差し替えます。失敗時は差し替え先を壊さず、メッセージ領域にエラーフィードバックを表示します。

## 最小の書き方

```markdown markvspec-skip reason=requires-partial-context
## Layout: mobile

### L-ProfileSummary Profile summary

- stack
- gap: sm

### L-MessageArea Message area

- stack

## Elements

### E-RefreshButton Button

- label: Refresh
- action: A-RefreshSummary

## Actions

### A-RefreshSummary Refresh summary

#### P1: Process Request profile summary
- request:
    - GET /profile/summary
    - params:
      - userId: route.userId
- case: sent
    - state: refreshing-summary

### A-HandleSummaryResponse Handle summary response

#### From
- refreshing-summary
#### P1: Process Apply profile summary response
- receive:
    - response: A-RefreshSummary.P1.response
- case: success
    - response: 200 profile summary partial
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
- case: failure
    - response: network error or 5xx
    - display:
      - target: L-MessageArea
      - message: Summary refresh error message
```

## 書き方の要点

- リクエストは `#### Pn: Process ...` の `request:` に書く。
- 差し替え先は `target` にレイアウト ID で書く。
- 参照する partial 文書に対応する場合は `partial: PRT-*` を足す。
- 既存要素を表示する場合だけ `element: E-*` を使う。
- エラーフィードバックや単純なメッセージ差し替えは `message:` で書く。
- `mode: replace` は target の表示内容が置き換わることを明示したい場合にだけ使う。`hx-swap` の値ではありません。
- エラーケースも書き、失敗時に既存 partial がどう扱われるかを読めるようにする。

## よくある落とし穴

- `hx-get`, `hx-target`, `hx-swap` のような生の属性を書かない。MarkVSpec は実装属性ではなく、画面の振る舞いの仕様です。
- `target: #summary` のような CSS selector ではなく、`L-ProfileSummary` のような MarkVSpec ID を使います。
- success だけを書くと、partial 更新に失敗したときのユーザーフィードバックが未定義になります。
- 生の HTML だけでは意味が読めません。partial 文書、要素、メッセージの意味を参照します。
- 1つの `case:` で表す表示差し替え先は1つにします。独立した複数領域を差し替える場合は、別の process case または別 action に分け、target と表示内容の対応を明確にします。

## 関連サンプル

- [Profile Home](../../../examples/showcase/profile-page-with-template.html): ホスト画面と partial 更新の例。
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html): partial 文書の構造を確認する例。

## 関連リファレンス

- [部分更新ガイド](../guide/partial-updates.md)
- [アクションガイド](../guide/actions.md)
- [レイアウトガイド](../guide/layout.md)
- [アクションリファレンス](../reference/actions.md)
- [セクションリファレンス](../reference/sections.md)

## 確認方法

- リクエストメソッド、パス、必要なパラメータが分かる。
- 更新対象が MarkVSpec のレイアウト ID で追える。
- 差し替えられる内容が `partial`、`element`、`message` として読める。
- success と failure のユーザーに見える結果が分かれている。
- htmx などの実装属性ではなく、意味を持つアクション / 表示変更として読める。
- レビュー担当者が、実装属性ではなく「意味を持つアクション / 表示変更」として動きを確認できる。
