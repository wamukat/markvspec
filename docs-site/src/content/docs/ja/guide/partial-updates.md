---
title: "部分更新"
---

Partial update は、画面全体ではなく一部だけを差し替える動きです。

MarkVSpec では `hx-*` や CSS selector は書きません。どの request が、どの領域を、何に置き換えるかだけを書きます。

## まずこれだけ

```markdown
### A-RefreshProfile Refresh profile

- Process P1: Request profile summary
  - request:
    - GET /profile/summary
  - case: success
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

プレビューでは、`L-ProfileSummary` が更新対象として読めます。

![Profile Home の partial update preview](../../assets/vscode-previews/profile-page-with-template-vscode-preview.png)

## 書くもの

- `request:`: 取得する request。
- `target`: 差し替える layout / element。
- `partial`: referenced partial document で差し替える場合の `PRT-*` ID。
- `element`: 既存 element を表示する場合の `E-*` ID。
- `message`: message text または message reference。

## 書かないもの

- `hx-get`
- `hx-target`
- `hx-swap`
- CSS selector
- HTML fragment の中身そのもの

MarkVSpec は実装属性ではなく、画面仕様を書くためのものです。

## 見る例

- [Profile Home](/markvspec/examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](/markvspec/examples/showcase/profile-summary.partial.html)
- [サーバー部分更新](/markvspec/ja/recipes/server-partial-update/)
