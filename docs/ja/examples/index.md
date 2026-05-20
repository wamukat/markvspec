# Examples

このセクションは、`examples/` を学習順・目的別に読むためのドキュメント入口です。

実際に動く `.vspec.md` screen を探す主導線は、生成済みの example catalog です。

- [Example catalog](../../../examples/)
- [Hello Screen showcase](../../../examples/showcase/hello-screen.html)
- [Login Basic showcase](../../../examples/showcase/login-basic.html)
- [Form Submit Flow showcase](../../../examples/showcase/form-submit-flow.html)
- [Partial Profile showcase](../../../examples/showcase/profile-summary.partial.html)

## 読み方

まず `Hello Screen` から始め、catalog の learning path に沿って読み進めます。
各 showcase は source と生成 preview を並べて表示するため、Markdown の heading と
bullet が低忠実度 UI 仕様へどう変換されるかを確認できます。

Examples は次の用途で使います。

- full reference を読む前に file shape をつかむ
- 小さな screen pattern を新しい `.vspec.md` に写す
- actions、states、partial updates を組み合わせた書き方を確認する
- common UI patterns の renderer coverage を確認する

## 学習順

catalog の learning path は、基本構造から実務的な画面へ少しずつ進む順番です。

1. `Hello Screen`: Front Matter、states、layout、elements、actions の最小形。
2. `Async Fetching`: loading / error state と初期読み込み。
3. `Responsive Profile`: mobile / desktop layout の切り替え。
4. `Form Submit Flow`: form submit、request、success / failure cases。
5. `Single Field Validation`: field validation と error text。
6. `Display Effects`: action の結果として表示内容を変える例。

途中から読む場合でも、showcase の `What this teaches` と related docs を先に確認すると、
その example が何を説明しているかを把握しやすくなります。

## 自分の画面に使う

example は copy して終わりではなく、screen spec の書き方を確認する材料です。
自分の画面へ持ち込むときは、次を先に変えてください。

- Front Matter の `id`、`title`、`route`。
- `## States` の状態名。
- `## Layout: mobile` の group 名と `Items`。
- `## Elements` の label、text、tone、variant。
- `## Actions` の process、request、case、update。

実装 framework 固有の attribute を example に足すより、MarkVSpec の semantic な
action / update として表現できるかを先に検討します。

## 関連ドキュメント

- [Start: First Screen](../start/first-screen.md)
- [Guide: Markdown Model](../guide/markdown-model.md)
- [Guide: Actions](../guide/actions.md)
- [Reference: File Format](../reference/file-format.md)
- [Reference: Elements](../reference/elements.md)
- [Recipes: Login Form](../recipes/login-form.md)
