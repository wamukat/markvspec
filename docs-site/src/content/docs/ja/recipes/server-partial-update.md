---
title: "サーバー部分更新"
---

## いつ使うか

Thymeleaf や server-rendered HTML partial を使い、画面全体ではなく一部の領域だけを更新したいときに使います。MarkVSpec には htmx の raw 属性を書くのではなく、どの user action で request が発生し、どの領域がどんな意味の content に置き換わるかを書きます。

## 完成イメージ

Refresh button や filter の変更で server に request し、返ってきた summary partial を `L-ProfileSummary` に replace します。失敗時は target を壊さず、message area に error feedback を表示します。

## 最小の書き方

```markdown
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

- Process P1: Request profile summary
  - request:
    - GET /profile/summary
    - params:
      - userId: route.userId
  - case: sent
    - state: refreshing-summary

### A-HandleSummaryResponse Handle summary response

- From
  - refreshing-summary
- Process P1: Apply profile summary response
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

- request は `Process Pn:` の `request:` に書く。
- 差し替え先は `target` に layout ID で書く。
- referenced partial document に対応する場合は `partial: PRT-*` を足す。
- 既存 element を表示する場合だけ `element: E-*` を使う。
- error feedback や単純な message replacement は `message:` で書く。
- error case も書き、失敗時に既存 partial がどう扱われるかを読めるようにする。

## よくある落とし穴

- `hx-get`, `hx-target`, `hx-swap` のような raw 属性を書かない。MarkVSpec は実装属性ではなく、screen behavior の仕様です。
- `target: #summary` のような CSS selector ではなく、`L-ProfileSummary` のような MarkVSpec ID を使います。
- success だけを書くと、partial 更新に失敗したときの user feedback が未定義になります。
- raw HTML だけでは意味が読めません。partial document、element、message の意味を参照します。
- 複数領域を更新する場合は、`display` を複数並べ、どの target に何を表示するかを分けます。

## 関連サンプル

- [Profile Home](/markvspec/examples/showcase/profile-page-with-template.html): host screen と partial refresh の例。
- [Profile Summary Partial](/markvspec/examples/showcase/profile-summary.partial.html): partial document の構造を確認する例。

## 関連リファレンス

- [部分更新ガイド](/markvspec/ja/guide/partial-updates/)
- [アクションガイド](/markvspec/ja/guide/actions/)
- [レイアウトガイド](/markvspec/ja/guide/layout/)
- [アクションリファレンス](/markvspec/ja/reference/actions/)
- [セクションリファレンス](/markvspec/ja/reference/sections/)

## 確認方法

- request method、path、必要な parameter が分かる。
- 更新対象が MarkVSpec の layout ID で追える。
- replace される content が `partial`、`element`、`message` として読める。
- success と failure の user-visible result が分かれている。
- htmx などの実装属性ではなく、意味を持つアクション / 表示変更として読める。
- レビュー担当者が、実装属性ではなく「意味を持つアクション / 表示変更」として動きを確認できる。
