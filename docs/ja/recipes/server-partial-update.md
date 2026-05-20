# Server Partial Update

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

- Triggered
  - E-RefreshButton.click
- Process
  - HttpRequest
    - GET /profile/summary
    - userId: route.userId
- Effects
  - state: refreshing-summary
- Cases
  - success:
    - response: 200 profile summary partial
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
  - failure:
    - response: network error or 5xx
    - update:
      - target: L-MessageArea
      - content: Summary refresh error message
      - tone: danger
```

## 書き方の要点

- request は `Process` / `HttpRequest` に書く。
- 差し替え先は `target` に layout ID で書く。
- 返ってくるものは HTML 断片そのものではなく、`Profile summary partial` のように意味で書く。
- 差し替え方法は必要に応じて `mode: replace` で明示する。
- error case も書き、失敗時に既存 partial がどう扱われるかを読めるようにする。

## よくある落とし穴

- `hx-get`, `hx-target`, `hx-swap` のような raw 属性を書かない。MarkVSpec は実装属性ではなく、screen behavior の仕様です。
- `target: #summary` のような CSS selector ではなく、`L-ProfileSummary` のような MarkVSpec ID を使います。
- success だけを書くと、partial 更新に失敗したときの user feedback が未定義になります。
- `content: HTML` だけでは意味が読めません。何の partial なのかを書きます。
- 複数領域を更新する場合は、`update` を複数並べ、どの target に何を表示するかを分けます。

## 関連 example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html): host screen と partial refresh の例。
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html): partial document の構造を確認する例。

## 関連 reference

- [Partial Updates Guide](../guide/partial-updates.md)
- [Actions Guide](../guide/actions.md)
- [Layout Guide](../guide/layout.md)
- [Actions Reference](../reference/actions.md)
- [Sections Reference](../reference/sections.md)

## 確認方法

- request method、path、必要な parameter が分かる。
- 更新対象が MarkVSpec の layout ID で追える。
- replace される content の意味が分かる。
- success と failure の user-visible result が分かれている。
- htmx などの実装属性ではなく、semantic な action / update として読める。
- reviewer が、実装属性ではなく `semantic action/update` として動きを確認できる。
