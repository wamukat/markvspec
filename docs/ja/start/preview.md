# Preview

VS Code live preview は、`.vspec.md` を低忠実度の画面仕様として確認するための入口です。

## 開く

### Step 1: source を開く

VS Code で作成した `hello.vspec.md` を開きます。

### Step 2: Command Palette を開く

Command Palette を開きます。

### Step 3: preview command を実行する

次のコマンドを実行します。

```text
MarkVSpec: Open Preview
```

preview は source の変更に追従します。Markdown を編集しながら、状態、レイアウト、要素、アクションの見え方を確認します。

## Project preview

複数画面をまとめて確認したい場合は、同じ command で `.vspec.project.md` を開きます。
Project preview には project overview、notes、screen list、template list、
project transition diagram、transition table、diagnostics が表示されます。

project 全体の確認には project preview を使います。screen の wireframe や詳細 section を
確認したい場合は、各 `.vspec.md` screen を開きます。

## 見る場所

- source の見出しが preview のセクションになる。
- layout group は wireframe のまとまりとして表示される。
- element は種類、label、variant、tone などの意味情報として表示される。
- action は trigger、process、case の流れとして表示される。

## preview で確認する判断

preview は pixel-perfect なデザイン確認ではありません。次のような仕様上の抜けや誤解を見つけるために使います。

- 画面の主要な要素が `Elements` にそろっているか。
- `Layout` の `Items` が、読み手に伝わる順番になっているか。
- `variant: primary` の action が画面の主操作として妥当か。
- `tone: danger` や `tone: warning` が、状態やメッセージの意図と合っているか。
- action の `From`、`Process Pn:`、`case:` が、状態遷移として読めるか。

文言や構造を変えたら、保存して preview を見直します。Markdown の diff と preview の見え方を
セットで確認すると、reviewer が仕様変更を追いやすくなります。

## preview が期待通りでないとき

- 画面に出ない要素は、`Layout` の `Items` から参照されているか確認する。
- button の意図が見えない場合は、`action: A-*` と `## Actions` の ID が一致しているか確認する。
- 状態依存の表示は、`visible when`、`disabled when`、state 名の spelling を確認する。
- 構文が曖昧な場合は [Reference](../reference/index.md) で正確な書き方を確認する。

## 次

- [Export](export.md)
- [File Format](../reference/file-format.md)
