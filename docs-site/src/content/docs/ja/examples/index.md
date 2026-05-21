---
title: "サンプル"
---

サンプルは、自分の `.vspec.md` に写して使う画面パターンとして読みます。
ソースとプレビューを並べて見る主導線は、生成済みのカタログです。

- [サンプルカタログ](/markvspec/examples/)
- [Hello Screen showcase](/markvspec/examples/showcase/hello-screen.html)
- [Login showcase](/markvspec/examples/showcase/login-basic.html)
- [Form Submit Flow showcase](/markvspec/examples/showcase/form-submit-flow.html)
- [Profile Partial showcase](/markvspec/examples/showcase/profile-summary.partial.html)

## 目的で選ぶ

| 目的 | 最初に見る例 | 使う場面 |
| --- | --- | --- |
| はじめて書く | [Hello Screen](/markvspec/examples/showcase/hello-screen.html) | プレビューで開ける最小ファイルを知りたい。 |
| フォームとバリデーション | [Login](/markvspec/examples/showcase/login-basic.html) | 必須項目、送信、応答ごとの分岐、エラーメッセージが必要。 |
| 読み込み / 空 / エラー | [Async Fetching](/markvspec/examples/showcase/async-loading.html) | リクエスト中、空の結果、エラー表示を扱う。 |
| 部分更新 | [Profile Partial](/markvspec/examples/showcase/profile-summary.partial.html) | サーバー応答で画面の一部を差し替える。 |
| Navigation and overlays | [Action Menu](/markvspec/examples/showcase/action-menu.html) | tabs、menu、dialog、popover、toast を扱う。 |
| Reuse and templates | [Account Shell](/markvspec/examples/showcase/template-shell.html) | 複数画面で shell や slot を共有する。 |

## おすすめ順

1. `Hello Screen`: 最小ファイルの形をつかむ。
2. `Login`: バリデーションと応答ごとの分岐を含むフォームの流れを写す。
3. `Async Fetching`: 読み込み、空、エラーの状態を書く。
4. `Search List`: filters、results、paging、replacement を組み合わせる。
5. `Profile Home`: template composition と partial refresh を見る。

## 自分の画面に使う

- 近い `.vspec.md` を自分の workspace にコピーする。
- Front Matter の `id`、`title`、`route` を変える。
- 状態、レイアウトグループ、要素、アクションを自分の画面名に変える。
- フレームワーク固有の詳細を足す前に、画面で何が変わるかを意味で書く。
- プレビューを開き、状態、アクション、メッセージが見えることを確認する。

## 関連ドキュメント

- [はじめる: 最初の画面](/markvspec/ja/start/first-screen/)
- [ガイド: Markdownモデル](/markvspec/ja/guide/markdown-model/)
- [ガイド: アクション](/markvspec/ja/guide/actions/)
- [ガイド: 部分更新](/markvspec/ja/guide/partial-updates/)
- [リファレンス: ファイル形式](/markvspec/ja/reference/file-format/)
- [レシピ: ログインフォーム](/markvspec/ja/recipes/login-form/)
