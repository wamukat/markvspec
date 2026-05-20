# Partial Updates

Partial updates は、server-rendered partial や htmx 風の部分更新を意味として表すための guide です。MarkVSpec では raw `hx-*` 属性ではなく、request と update の意味を書きます。

## 考え方

Partial update は、画面全体を遷移させずに一部の領域だけを置き換える振る舞いです。MarkVSpec では、HTML attribute や framework 固有の書き方ではなく、「どの request が」「どの領域を」「どんな内容で」「どの方式で」更新するかを書きます。

この書き方にすると、Thymeleaf、htmx、独自 fetch 実装などに寄りすぎず、UI 仕様として review できます。preview では更新対象の layout group や message area が分かり、HTML/PDF export でも部分更新の意図を読めます。

## 最小例

```markdown
## Actions

### A-RefreshProfile Refresh profile

- Process P1: Request profile summary
  - server:
    - GET /profile/summary
  - case: success
    - display:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
```

この例では、refresh button の click が summary の partial を取得し、`L-ProfileSummary` を置き換えることを表しています。`mode: replace` は「対象領域を差し替える」という意味であり、特定 library の attribute を直接書くものではありません。

## よくある書き方

- request は `Process Pn:` の `server:` に書く。
- 結果別の部分更新は process 配下の `case:` と `display` に書く。
- `target` と `content` は semantic な説明にする。
- `target` には更新される layout group や message element の ID を置く。
- `content` には partial の意味を書く。template path や implementation detail だけにしない。
- `mode` は `replace` のような更新の意味を書く。append や prepend が必要な場合も、まずユーザーに見える意味を説明する。
- failure case では、更新対象とは別に message area や state を変える。

## 例: 検索結果だけを更新する

```markdown
## Layout: mobile

### L-SearchPanel Search Panel

- column

#### Items

- "Query": E-SearchInput
- "Results": L-ResultList
- "Status": E-SearchMessage

## Actions

### A-SearchProducts Search products

- Process P1: Search products
  - server:
    - GET /products/search
    - params:
      - q: E-SearchInput.value
  - case: sent
    - state: searching
  - case: success
    - state: results
    - display:
      - target: L-ResultList
      - content: Product result list partial
      - mode: replace
  - case: empty
    - state: empty
    - display:
      - target: L-ResultList
      - content: Empty result partial
      - mode: replace
  - case: failure
    - state: error
    - display:
      - target: E-SearchMessage
      - content: Search error message
```

検索結果、空結果、エラーを case として分けています。更新対象を ID で書くことで、layout、state、action の関係が Git diff と preview の両方で追いやすくなります。

## 次に読むもの

- [Actions](actions.md)
- [Layout](layout.md)
- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)
- [Reference](../reference/index.md)
