# Start

MarkVSpec を初めて試す人向けの最短ルートです。

5分で、VS Code 拡張のインストール、Hello Screen の確認、live preview、HTML / PDF export まで進めます。

## 5分で試す

### Step 1: 拡張を入れる

[MarkVSpec for VS Code](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec) を VS Code Marketplace から入れます。

CLI で入れる場合:

```bash
code --install-extension wamukat.markvspec
```

### Step 2: Hello Screen を開く

repository を開き、[Hello Screen](../../../examples/01-basics/hello-screen.vspec.md) を開きます。

```bash
code examples/01-basics/hello-screen.vspec.md
```

### Step 3: preview を開く

Command Palette で次を実行します。

```text
MarkVSpec: Open Preview
```

### Step 4: HTML / PDF を出力する

必要なら CLI で HTML / PDF を出力します。

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## 詳細

- [First Screen](first-screen.md): Hello Screen の読み方。
- [Preview](preview.md): VS Code live preview の開き方。
- [Export](export.md): HTML / PDF export の使い方。

## 次に読む

- [Examples](../examples/index.md): 学習順に並んだ example。
- [Guide](../guide/index.md): MarkVSpec の基本。
- [Reference](../reference/index.md): 記法の詳細。
