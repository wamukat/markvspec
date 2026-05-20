# Start

MarkVSpec を初めて使う人向けの最短ルートです。

repository を clone していなくても進められる手順です。5分で、VS Code 拡張のインストール、最小 screen file の作成、live preview、HTML / PDF export まで確認します。

## 5分で試す

### Step 1: 拡張を入れる

[MarkVSpec for VS Code](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec) を VS Code Marketplace から入れます。

CLI で入れる場合:

```bash
code --install-extension wamukat.markvspec
```

### Step 2: Hello Screen を作る

VS Code で空の folder を開き、`hello.vspec.md` を作ります。次の内容を貼り付けて保存します。

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
locale: ja
---

# SCR-HELLO Hello Screen

## States

- idle*

## Layout: mobile

### L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Lead
- E-ContinueButton

## Elements

### E-Title Heading

- level: 1
- label: Hello MarkVSpec

### E-Lead Paragraph

- text: This is the minimum screen specification that still renders a useful preview.

### E-ContinueButton Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A-Continue Continue

- From
  - idle
- Process P1: Apply immediate effect
  - navigate: SCR-NEXT
```

### Step 3: preview を開く

Command Palette で次を実行します。

```text
MarkVSpec: Open Preview
```

source の右側に preview が開き、Markdown から生成された画面仕様を確認できます。

![VS Code で hello.vspec.md と MarkVSpec preview を並べて表示している画面](../../assets/start/vscode-preview-clean.png)

### Step 4: HTML / PDF を出力する

必要なら VS Code の Command Palette から HTML / PDF を出力します。

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code Command Palette で MarkVSpec の HTML / PDF export command を表示している画面](../../assets/start/vscode-export-command.png)

CLI で出力したい場合は、同じ file を指定します。詳しい option は [CLI reference](../reference/cli.md) を参照してください。

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

## 詳細

- [First Screen](first-screen.md): Hello Screen の読み方。
- [Preview](preview.md): VS Code live preview の開き方。
- [Export](export.md): HTML / PDF export の使い方。

## 次に読む

- [Examples](../examples/index.md): 追加で読める example。
- [Guide](../guide/index.md): MarkVSpec の基本。
- [Reference](../reference/index.md): 記法の詳細。
