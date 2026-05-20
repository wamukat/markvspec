# Partial Updates

Partial update は、画面全体ではなく一部だけを差し替える動きです。

MarkVSpec では `hx-*` や CSS selector は書きません。どの request が、どの領域を、何に置き換えるかだけを書きます。

## まずこれだけ

```markdown
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

preview では、`L-ProfileSummary` が更新対象として読めます。

![Profile Home の partial update preview](../../assets/vscode-previews/profile-page-with-template-vscode-preview.png)

## 書くもの

- `server:`: 取得する request。
- `target`: 差し替える layout / element。
- `content`: 表示される内容の意味。
- `mode: replace`: 対象領域を置き換える。

## 書かないもの

- `hx-get`
- `hx-target`
- `hx-swap`
- CSS selector
- HTML fragment の中身そのもの

MarkVSpec は実装属性ではなく、画面仕様を書くためのものです。

## 見る例

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)
- [Server Partial Update](../recipes/server-partial-update.md)
