# プレビュー

VS Code ライブプレビューは、`.vspec.md` を低忠実度の画面仕様として確認するための入口です。

## 開く

### Step 1: ソースを開く

VS Code で作成した `hello.vspec.md` を開きます。

### Step 2: コマンドパレットを開く

VS Code のコマンドパレットを開きます。

### Step 3: プレビューコマンドを実行する

次のコマンドを実行します。

```text
MarkVSpec: Open Preview
```

プレビューはソースの変更に追従します。Markdown を編集しながら、状態、レイアウト、要素、アクションの見え方を確認します。

## プロジェクトプレビュー

プロジェクトプレビューは、まとめて確認したい画面とテンプレートを
`.vspec.project.md` に明示的に列挙している場合に使います。workspace 内のすべての
`.vspec.md` を自動 discovery する機能ではありません。プロジェクトファイルが明示的な
index です。

```markdown markvspec-skip reason=project-file-example
---
id: PRJ-ACCOUNT
type: project
title: Account Project
screens:
  - id: SCR-LOGIN
    path: screens/login.vspec.md
  - id: SCR-SETTINGS
    path: screens/settings.vspec.md
templates:
  - id: TPL-ACCOUNT-SHELL
    path: templates/account-shell.vspec.md
---

# PRJ-ACCOUNT Account Project

アカウント関連画面をまとめて確認するためのプロジェクトです。

## Notes

ナビゲーションと共通シェルの変更を同じ場所で確認します。
```

`.vspec.project.md` を開き、同じコマンドを実行します。

```text
MarkVSpec: Open Preview
```

プロジェクトプレビューには次が表示されます。

- project file の ID、title、lead text。
- `## Notes` とその他 note section の project notes。
- template list と load status。
- screen list。screen ID、title、route、path を確認できます。
- 列挙された screen の `navigate:` target から作られる project transition diagram。
- action、source state、result、target type、target を確認できる transition table。
- missing file、duplicate screen ID、route collision、missing navigation target などの
  project-level diagnostics。

プロジェクト全体の確認、つまり screen inventory、project notes、画面間 navigation、
diagnostics にはプロジェクトプレビューを使います。画面の wireframe、state views、
element details、action details など画面内の詳細を確認したい場合は、各 `.vspec.md` の
画面仕様を開きます。

project preview、project export、`document-list` は用途が違います。

| 機能 | 使いどころ | 出力 |
| --- | --- | --- |
| Project preview | VS Code 内で project intent、screen/template list、transition graph、diagnostics を読みたい。 | live preview webview |
| Project HTML/PDF export | 列挙された画面仕様を1つの共有用成果物にまとめたい。 | 読み込んだ screen design document を含む HTML または PDF |
| `export document-list` | screen、template、参照 partial の compact inventory が必要。 | `document-list.md` の Markdown table |

プロジェクトプレビューは、workspace 内の全 screen から project summary を自動生成する
機能ではありません。全 screen design file から summary が必要な場合は、先に project
index を作るか、その機能が利用可能になった後は専用の project summary workflow を使います。

## VS Code コマンド

これらのコマンドはコマンドパレットから実行できます。表示名は `MarkVSpec: <title>` です。

| コマンド | 使いどころ |
| --- | --- |
| `MarkVSpec: Open Preview` | 現在の `.vspec.md` または `.vspec.project.md` のライブプレビューを開く、または表示中のプレビューに戻る。 |
| `MarkVSpec: Format Structure` | レビュー前に、開いているソースの認識済み MarkVSpec 構造だけを整理する。一般的な Markdown formatter ではありません。文章、未知のセクション、Markdown tables、list indentation は保持します。 |
| `MarkVSpec: Export Static HTML` | 現在の画面またはプロジェクトファイルから、単体で開ける HTML レビュー成果物を書き出す。 |
| `MarkVSpec: Export PDF` | 互換ブラウザがある環境で、現在の画面またはプロジェクトファイルから PDF レビュー成果物を書き出す。 |
| `MarkVSpec: Refresh Preview` | 自動更新を止めている、更新が遅れている、または source / message file の変更が反映されない場合に、現在のプレビューを強制的に再描画する。 |

authoring 中は `Open Preview` を使い、既存 preview を手動で再読み込みしたいときは
`Refresh Preview` を使います。共有用の成果物が必要な場合は `Export Static HTML` または
`Export PDF` を使います。`Format Structure` は、説明文を書き換えずに認識済み
MarkVSpec block だけを整える場合に限って使います。

## 見る場所

- ソースの見出しがプレビューのセクションになる。
- レイアウトグループはワイヤーフレームのまとまりとして表示される。
- 要素は種類、`label`、`variant`、`tone` などの意味情報として表示される。
- アクションはトリガー、処理、ケースの流れとして表示される。

## プレビューで確認する判断

プレビューは細かな見た目を確認するための画面ではありません。次のような仕様上の抜けや誤解を見つけるために使います。

- 画面の主要な要素が `Elements` にそろっているか。
- `Layout` の `Items` が、読み手に伝わる順番になっているか。
- `variant: primary` のアクションが画面の主操作として妥当か。
- `tone: danger` や `tone: warning` が、状態やメッセージの意図と合っているか。
- アクションの `From`、`Process Pn:`、`case:` が、状態遷移として読めるか。

文言や構造を変えたら、保存してプレビューを見直します。Markdown の diff とプレビューの見え方を
セットで確認すると、レビュー担当者が仕様変更を追いやすくなります。

## プレビューが期待通りでないとき

- 画面に出ない要素は、`Layout` の `Items` から参照されているか確認する。
- ボタンの意図が見えない場合は、`action: A-*` と `## Actions` の ID が一致しているか確認する。
- 状態依存の表示は、`visible when`、`disabled when`、状態名の綴りを確認する。
- 構文が曖昧な場合は [リファレンス](../reference/index.md) で正確な書き方を確認する。

## 次

- [出力](./export.md)
- [ファイル形式](../reference/file-format.md)
