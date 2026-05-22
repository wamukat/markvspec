# サンプル

サンプルは、自分の `.vspec.md` に写して使う画面パターンとして読みます。
サンプルカタログは、公開済み source と browser-generated design document preview を
並べて見る showcase page へリンクします。runtime failure 時は、事前生成済み example
HTML artifact へ fallback せず、diagnostics と source/raw link を表示します。実験中の
Online Live Editor は showcase とは別物であり、ブラウザ上で編集できる PoC を明示的に
試したい場合だけ使います。

- [サンプルカタログ](../../../examples/)
- [Hello Screen サンプル](../../../examples/showcase/hello-screen.html)
- [Login サンプル](../../../examples/showcase/login-basic.html)
- [Form Submit Flow サンプル](../../../examples/showcase/form-submit-flow.html)
- [Profile Home サンプル](../../../examples/showcase/profile-page-with-template.html)

## 目的で選ぶ

| 目的 | 最初に見る例 | 使う場面 |
| --- | --- | --- |
| はじめて書く | [Hello Screen](../../../examples/showcase/hello-screen.html) | プレビューで開ける最小ファイルを知りたい。 |
| フォームとバリデーション | [Login](../../../examples/showcase/login-basic.html) | 必須項目、送信、応答ごとの分岐、エラーメッセージが必要。 |
| 読み込み / 空 / エラー | [Async Fetching](../../../examples/showcase/async-loading.html) | リクエスト中、空の結果、エラー表示を扱う。 |
| 部分更新 | [Profile Home](../../../examples/showcase/profile-page-with-template.html) | サーバー応答で画面の一部を差し替える。 |
| ナビゲーションと重ね合わせ表示 | [Action Menu](../../../examples/showcase/action-menu.html) | タブ、メニュー、ダイアログ、ポップオーバー、トーストを扱う。 |
| 再利用とテンプレート | [Account Shell](../../../examples/showcase/template-shell.html) | 複数画面でシェルや slot を共有する。 |

## おすすめ順

1. `Hello Screen`: 最小ファイルの形をつかむ。
2. `Login`: バリデーションと応答ごとの分岐を含むフォームの流れを写す。
3. `Async Fetching`: 読み込み、空、エラーの状態を書く。
4. `Search List`: フィルター、結果、ページング、差し替えを組み合わせる。
5. `Profile Home`: テンプレート構成と partial 更新を見る。

## 自分の画面に使う

- 近い `.vspec.md` を自分の作業ディレクトリにコピーする。
- Front Matter の `id`、`title`、`route` を変える。
- 状態、レイアウトグループ、要素、アクションを自分の画面名に変える。
- 実装方法を書く前に、画面で何が変わるかを意味で書く。
- プレビューを開き、状態、アクション、メッセージが見えることを確認する。

## 関連ドキュメント

- [はじめる: 最初の画面](../start/first-screen.md)
- [ガイド: Markdownモデル](../guide/markdown-model.md)
- [ガイド: アクション](../guide/actions.md)
- [ガイド: 部分更新](../guide/partial-updates.md)
- [リファレンス: ファイル形式](../reference/file-format.md)
- [レシピ: ログインフォーム](../recipes/login-form.md)
