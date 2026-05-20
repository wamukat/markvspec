# Partial Updates

Partial updates は、server-rendered partial や htmx 風の部分更新を意味として表すための guide です。MarkVSpec では raw `hx-*` 属性ではなく、request と update の意味を書きます。

## 最小例

```markdown
### A-RefreshProfile Refresh profile

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

- request は `Process` / `HttpRequest` に書く。
- 結果別の部分更新は `Cases` / `update` に書く。
- `target` と `content` は semantic な説明にする。

## 関連 example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)

## 関連 reference

- [Reference](../reference/index.md)
