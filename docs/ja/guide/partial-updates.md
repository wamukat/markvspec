# 部分更新

部分更新は、画面全体の遷移ではなく、一部の表示内容が変わる動きです。

MarkVSpec では `hx-*` や CSS selector は書きません。どのリクエストやイベントで、どの領域が、どんな意味の内容に変わるかを書きます。

## 考え方

部分更新は HTMX/Thymeleaf だけの記法ではありません。MarkVSpec の `display` は
framework-neutral な表示変化の契約です。実装方式が違っても、同じ DSL を次のように
読み替えられます。

| 実装方式 | MarkVSpec の読み方 |
| --- | --- |
| Thymeleaf / htmx | request の結果として server-rendered content が返り、target 領域に表示される。 |
| React / Vue / Svelte | state、store、component data が変わり、target の component subtree が再描画される。 |
| SSR + fetch | fetch の結果で view model または HTML が更新され、target 領域の表示が変わる。 |

`mode: replace` を使う場合、それは対象領域に表示される内容が置き換わるという意味です。
DOM swap 命令や `hx-swap` の値ではありません。

## まずこれだけ

以下は `## Actions` 内の抜粋です。完全な画面ファイルでは、更新対象の
`L-ProfileSummary` と、必要なボタンや状態も同じ `.vspec.md` に定義します。

```markdown markvspec-skip reason=requires-actions-context
### A-RefreshProfile Refresh profile

#### P1: Process Request profile summary
- request:
    - GET /profile/summary
- case: success
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

プレビューでは、`L-ProfileSummary` が更新対象として読めます。

![Profile Home の部分更新プレビュー](../../assets/vscode-previews/profile-page-with-template-vscode-preview.png)

## 書くもの

- `request:`: 取得するリクエスト。
- `target`: 差し替えるレイアウト / 要素。
- `partial`: 参照する partial 文書で差し替える場合の `PRT-*` ID。
- `element`: 既存要素を表示する場合の `E-*` ID。
- `message`: メッセージ本文またはメッセージ参照。
- `content:` は canonical な display payload としては使わない。`message:`、
  `element:`、`partial:` のいずれかで書き、content を framework-neutral な意味として
  保ちます。
- `mode: replace`: 対象領域の表示内容を置き換えることを明示したい場合に使う。

## 書かないもの

- raw framework attributes
- `hx-get`
- `hx-target`
- `hx-swap`
- CSS selector
- React / Vue / Svelte の component API や store API
- HTML 断片の中身そのもの

MarkVSpec は実装属性ではなく、画面仕様を書くためのものです。

## 見る例

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)
- [サーバー部分更新](../recipes/server-partial-update.md)
