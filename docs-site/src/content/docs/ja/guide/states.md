---
title: "States"
---

State は、同じ画面の見え方を分ける名前です。

ログイン画面なら `idle`、`submitting`、`auth-error`。一覧画面なら `loading`、`loaded`、`empty`、`error`。まずはユーザーから見える状態名で分けます。

## まずこれだけ

```markdown
## States

- idle*
- loading
- empty
- error
```

`*` が付いた `idle` が初期状態です。preview では state ごとに画面を切り替えて確認できます。

![Async Fetching の state 切り替え preview](../../assets/vscode-previews/async-loading-vscode-preview.png)

## 名前の付け方

- `isLoading` ではなく `loading`
- `hasError` ではなく `error`
- `authFailedFlag` ではなく `auth-error`
- `apiDone` ではなく `loaded`

実装の変数名ではなく、画面の状態名にします。
state は `## States` の下に bullet で書き、初期状態には `*` を1つだけ付けます。

## Action とつなぐ

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

この DSL を見れば、「どの結果でどの state になるか」が分かります。長い文章で説明しなくてかまいません。

同じ state の validation error、empty data、direct link などを名前付きで review したいだけなら、
state を増やさず [シナリオ](/markvspec/ja/guide/scenarios/) を使います。

## 見る例

- [Async Fetching](/markvspec/examples/showcase/async-loading.html)
- [シナリオ](/markvspec/ja/guide/scenarios/)
- [Loading And Error](/markvspec/ja/recipes/loading-error/)
- [States Reference](/markvspec/ja/reference/sections/)
