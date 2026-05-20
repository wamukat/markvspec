# Server Partial Update

## 目的

server-rendered partial の差し替えを、htmx 属性ではなく MarkVSpec の semantic action/update として書きます。

## 完成イメージ

ボタンや filter 変更で server に request し、返ってきた partial を画面内の target に replace します。

## 最小 snippet

```markdown
### A-RefreshSummary Refresh summary

- Triggered
  - E-RefreshButton.click
- Process
  - HttpRequest
    - GET /profile/summary
- Cases
  - success:
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
```

## 書き方

- raw `hx-get` や `hx-target` は書かない。
- request は `Process` / `HttpRequest` に書く。
- 差し替え先と内容は `Cases` / `update` に semantic に書く。

## 関連 example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)

## 関連 reference

- [Partial Updates Guide](../guide/partial-updates.md)
- [Actions Guide](../guide/actions.md)
- [Reference](../reference/index.md)

## 確認方法

- request method と path が分かる。
- target layout が分かる。
- replace される content の意味が分かる。
