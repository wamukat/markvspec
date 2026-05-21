# レシピ

レシピは、よくある UI 仕様パターンを目的から選ぶ入口です。

MarkVSpec は、画面の状態、要素、アクション、結果を意味で書くための形式です。実装コードやフレームワーク固有の属性を書く場所ではありません。迷ったときは、近いレシピを開き、最小形から自分の画面に置き換えてください。

## 目的別

| 目的 | レシピ | 主な概念 |
| --- | --- | --- |
| ログイン、バリデーション、認証リクエストを1画面に書く | [ログインフォーム](login-form.md) | `Elements`, `Business Rules`, `Actions`, `case:` |
| 初期読み込み、読み込み中、空、エラー、成功を扱う | [読み込みとエラー](loading-error.md) | `States`, `page.load`, `case:` |
| サーバー生成の部分更新を指定する | [サーバー部分更新](server-partial-update.md) | `request`, `display`, `target`, `partial` |
| `.vspec.md` を HTML / PDF として共有する | [PDF出力](pdf-export.md) | VS Code 出力, CLI 出力 |

## 読む順番

1. 画面の目的に近いレシピを選ぶ。
2. 最小形をそのまま写さず、ID、ラベル、パス、状態名を自分の画面の言葉に置き換える。
3. 注意点を確認し、実装の詳細や CSS が仕様に漏れていないか見る。
4. 関連サンプルを開き、プレビューの見え方を確認する。
5. 追加の詳細が必要なときだけガイドやリファレンスを引く。

## サンプルで見る

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小の文書構造。
- [Login](../../../examples/showcase/login-basic.html): フォーム、バリデーション、認証の流れ。
- [Async Fetching](../../../examples/showcase/async-loading.html): 読み込み / 空 / エラーの状態遷移。
- [Display Updates](../../../examples/showcase/display-effects.html): メッセージ、トースト、ダイアログ、フィールドのフィードバック。
- [Profile Home](../../../examples/showcase/profile-page-with-template.html): テンプレートと部分更新。

## リファレンスで引く

- [ガイド](../guide/index.md): 書く流れを学ぶ。
- [アクション](../guide/actions.md): リクエスト、分岐、表示更新。
- [部分更新](../guide/partial-updates.md): サーバー生成の部分更新モデル。
- [CLI](../reference/cli.md): バリデーション、HTML/PDF 出力、プロジェクトの `document-list` 出力。
- [リファレンス](../reference/index.md): セクション、ID、要素、ルール。

## レシピの使い方

- 画面仕様の粒度で書く。実装コード、CSS クラス、生のフレームワーク属性は書かない。
- `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` ID を使い、画面、レイアウト、要素、アクション、ルールを追跡できるようにする。
- 状態を変える振る舞いは `Actions` と `case:` に置く。
- ユーザーに見える結果は `state`、`update`、`display`、`navigate` で明示する。
- プレビューと出力の正本は、1つの `.vspec.md` にする。
