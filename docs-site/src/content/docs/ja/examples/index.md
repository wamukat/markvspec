---
title: "Examples"
---

examples は、自分の `.vspec.md` に写して使う screen pattern として読みます。
source と preview を並べて見る主導線は、生成済みの catalog です。

- [Example catalog](/markvspec/ja/examples/)
- [Hello Screen showcase](/markvspec/examples/showcase/hello-screen.html)
- [Login showcase](/markvspec/examples/showcase/login-basic.html)
- [Form Submit Flow showcase](/markvspec/examples/showcase/form-submit-flow.html)
- [Profile Partial showcase](/markvspec/examples/showcase/profile-summary.partial.html)

## 目的で選ぶ

| 目的 | 最初に見る例 | 使う場面 |
| --- | --- | --- |
| Beginner | [Hello Screen](/markvspec/examples/showcase/hello-screen.html) | preview で開ける最小 file を知りたい。 |
| Form and validation | [Login](/markvspec/examples/showcase/login-basic.html) | required field、submit、response case、error message が必要。 |
| Loading / empty / error | [Async Fetching](/markvspec/examples/showcase/async-loading.html) | request 中、empty result、error 表示を扱う。 |
| Partial update | [Profile Partial](/markvspec/examples/showcase/profile-summary.partial.html) | server response で画面の一部を差し替える。 |
| Navigation and overlays | [Action Menu](/markvspec/examples/showcase/action-menu.html) | tabs、menu、dialog、popover、toast を扱う。 |
| Reuse and templates | [Account Shell](/markvspec/examples/showcase/template-shell.html) | 複数画面で shell や slot を共有する。 |

## おすすめ順

1. `Hello Screen`: 最小 file shape をつかむ。
2. `Login`: validation と response cases を含む form flow を写す。
3. `Async Fetching`: loading、empty、error state を書く。
4. `Search List`: filters、results、paging、replacement を組み合わせる。
5. `Profile Home`: template composition と partial refresh を見る。

## 自分の画面に使う

- 近い `.vspec.md` を自分の workspace にコピーする。
- Front Matter の `id`、`title`、`route` を変える。
- states、layout groups、elements、actions を自分の画面名に変える。
- framework 固有の detail を足す前に、画面で何が変わるかを semantic に書く。
- preview を開き、states、actions、messages が見えることを確認する。

## 関連ドキュメント

- [Start: First Screen](/markvspec/ja/start/first-screen/)
- [Guide: Markdown Model](/markvspec/ja/guide/markdown-model/)
- [Guide: Actions](/markvspec/ja/guide/actions/)
- [Guide: Partial Updates](/markvspec/ja/guide/partial-updates/)
- [Reference: File Format](/markvspec/ja/reference/file-format/)
- [Recipes: Login Form](/markvspec/ja/recipes/login-form/)
