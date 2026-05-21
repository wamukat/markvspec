---
title: "プレビュー"
---

VS Code ライブプレビューは、`.vspec.md` を低忠実度の画面仕様として確認するための入口です。

## 開く

### Step 1: source を開く

VS Code で作成した `hello.vspec.md` を開きます。

### Step 2: Command Palette を開く

Command Palette を開きます。

### Step 3: プレビューコマンドを実行する

次のコマンドを実行します。

```text
MarkVSpec: Open Preview
```

プレビューはソースの変更に追従します。Markdown を編集しながら、状態、レイアウト、要素、アクションの見え方を確認します。

## プロジェクトプレビュー

複数画面をまとめて確認したい場合は、同じ command で `.vspec.project.md` を開きます。
プロジェクトプレビューにはプロジェクト概要、メモ、画面一覧、テンプレート一覧、
project transition diagram、transition table、diagnostics が表示されます。

プロジェクト全体の確認にはプロジェクトプレビューを使います。画面のワイヤーフレームや詳細セクションを
確認したい場合は、各 `.vspec.md` screen を開きます。

## 見る場所

- ソースの見出しがプレビューのセクションになる。
- layout group は wireframe のまとまりとして表示される。
- element は種類、label、variant、tone などの意味情報として表示される。
- action は trigger、process、case の流れとして表示される。

## プレビューで確認する判断

プレビューは pixel-perfect なデザイン確認ではありません。次のような仕様上の抜けや誤解を見つけるために使います。

- 画面の主要な要素が `Elements` にそろっているか。
- `Layout` の `Items` が、読み手に伝わる順番になっているか。
- `variant: primary` の action が画面の主操作として妥当か。
- `tone: danger` や `tone: warning` が、状態やメッセージの意図と合っているか。
- action の `From`、`Process Pn:`、`case:` が、状態遷移として読めるか。

文言や構造を変えたら、保存してプレビューを見直します。Markdown の diff とプレビューの見え方を
セットで確認すると、reviewer が仕様変更を追いやすくなります。

## プレビューが期待通りでないとき

- 画面に出ない要素は、`Layout` の `Items` から参照されているか確認する。
- button の意図が見えない場合は、`action: A-*` と `## Actions` の ID が一致しているか確認する。
- 状態依存の表示は、`visible when`、`disabled when`、state 名の spelling を確認する。
- 構文が曖昧な場合は [リファレンス](/markvspec/ja/reference/) で正確な書き方を確認する。

## 次

- [Export](/markvspec/ja/start/export/)
- [ファイル形式](/markvspec/ja/reference/file-format/)
