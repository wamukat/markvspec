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

## 見る場所

- source の見出しが preview のセクションになる。
- layout group は wireframe のまとまりとして表示される。
- element は種類、label、variant、tone などの意味情報として表示される。
- action は trigger、process、case の流れとして表示される。

## 次

- [Export](export.md)
