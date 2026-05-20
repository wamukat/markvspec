# Markdown Model

MarkVSpec は Markdown を source of truth にします。YAML Front Matter は文書全体の metadata、Markdown 見出しは画面内の object、箇条書きは property や振る舞いを表します。

## 考え方

`.vspec.md` は、人が読む画面仕様と tool が読む構造を同じ Markdown に置くための形式です。Front Matter には screen ID、title、role、locale などの文書全体の情報を書きます。本文では `#` に画面名、`##` に States、Layout、Elements、Actions などの主要 section、`###` に個別 object を置きます。

重要なのは、Markdown を自由なメモとして使いながらも、構造化したい部分は見出しと箇条書きで安定させることです。これにより VS Code preview が読み取りやすくなり、Git diff でも「何が変わったか」が見えやすくなります。AI に修正を依頼するときも、対象 section や ID を指定できます。

## 最小例

```markdown
---
id: SCR-HELLO
title: Hello Screen
role: Example
locale: en
---

# Hello Screen

## States

### idle

## Layout: mobile

### L-Main Main

- column

## Elements

### E-Title Heading

- level: 1
- text: Hello
```

この例は、画面 ID と title を metadata として持ち、`States`、`Layout`、`Elements` の 3 section だけで preview 可能な最小の画面を表します。最初はこのサイズで作り、preview が出ることを確認してから action や validation を追加すると、問題の切り分けが簡単です。

## よくある書き方

- `SCR-*` は画面、`L-*` は layout group、`E-*` は element、`A-*` は action、`R-*` は rule に使う。
- Front Matter には文書全体の情報だけを書く。個別 element の label や action は本文に置く。
- `##` section は大きな関心ごとで分ける。画面の見え方は `Layout` と `Elements`、振る舞いは `Actions`、制約は `Business Rules` や `Validation` に寄せる。
- 文章の補足は `## Notes` や section 直下の prose に置く。構造化された object の箇条書きと混ぜすぎない。
- Markdown table は説明用には使えるが、canonical な source としては見出しと箇条書きを優先する。

## 次に読むもの

- [Document Structure](document-structure.html)
- [States](states.md)
- [Layout](layout.md)

- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [Reference](../reference/index.md)
