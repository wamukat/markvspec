---
title: "状態"
---

State は、同じ画面の見え方を分ける名前です。

ログイン画面なら `idle`、`submitting`、`auth-error`。一覧画面なら `loading`、`loaded`、`empty`、`error`。まずはユーザーから見える状態名で分けます。

## まずこれだけ

以下は `## States` セクションだけの抜粋です。画面全体の例では、先頭メタデータと
`# SCR-* ...` の下に置きます。

```markdown
## States

- idle*
- loading
- empty
- error
```

`*` が付いた `idle` が初期状態です。プレビューでは状態ごとに画面を切り替えて確認できます。

![Async Fetching の状態切り替えプレビュー](../../assets/vscode-previews/async-loading-vscode-preview.png)

## 名前の付け方

- `isLoading` ではなく `loading`
- `hasError` ではなく `error`
- `authFailedFlag` ではなく `auth-error`
- `apiDone` ではなく `loaded`

実装の変数名ではなく、画面の状態名にします。
state は `## States` の下に箇条書きで書き、初期状態には `*` を1つだけ付けます。

## アクションとつなぐ

以下は `## Actions` 内の抜粋です。`idle`、`loading`、`empty`、`error` は
`## States` に定義済みの状態として読んでください。

```markdown
### A-LoadOrders Load orders

- From
  - idle
- Process P1: Request orders
  - request:
    - GET /orders
  - case: sent
    - state: loading
  - case: empty
    - state: empty
  - case: failure
    - state: error
```

この DSL を見れば、「どの結果でどの状態になるか」が分かります。長い文章で説明しなくてかまいません。

同じ状態のバリデーションエラー、空データ、直接リンクなどを名前付きでレビューしたいだけなら、
状態を増やさず [シナリオ](/markvspec/ja/guide/scenarios/) を使います。

## 見る例

- [Async Fetching](/markvspec/examples/showcase/async-loading.html)
- [シナリオ](/markvspec/ja/guide/scenarios/)
- [読み込みとエラー](/markvspec/ja/recipes/loading-error/)
- [セクションリファレンス](/markvspec/ja/reference/sections/)
