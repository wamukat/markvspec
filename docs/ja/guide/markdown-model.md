# Markdownモデル

MarkVSpec は Markdown を正本にします。YAML Front Matter は文書全体のメタデータ、Markdown 見出しは画面内の対象、箇条書きは項目や振る舞いを表します。

## 考え方

`.vspec.md` は、人が読む画面仕様とツールが読む構造を同じ Markdown に置くための形式です。Front Matter には画面 ID、タイトル、役割、言語などの文書全体の情報を書きます。本文では `#` に画面名、`##` に States、Layout、Elements、Actions などの主要セクション、`###` に個別の対象を置きます。

重要なのは、Markdown を自由なメモとして使いながらも、構造化したい部分は見出しと箇条書きで安定させることです。これにより VS Code プレビューが読み取りやすくなり、Git diff でも「何が変わったか」が見えやすくなります。AI に修正を依頼するときも、対象セクションや ID を指定できます。

## 最小例

```markdown markvspec
---
id: SCR-HELLO
type: screen
title: Hello Screen
locale: en
---

# SCR-HELLO Hello Screen

## States

- idle*

## Layout: mobile

### L1:L-Main Main

- stack

#### Items

- E-Title

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello
```

この例は、画面 ID とタイトルをメタデータとして持ち、`States`、`Layout`、`Elements` の 3 セクションだけでプレビュー可能な最小の画面を表します。最初はこのサイズで作り、プレビューが出ることを確認してからアクションやバリデーションを追加すると、問題の切り分けが簡単です。

![Hello Screen のソースと描画プレビュー](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## よくある書き方

- `SCR-*` は画面、`L-*` はレイアウトグループ、`E-*` は要素、`A-*` はアクション、`R-*` はルールに使う。
- 対象は `### ID Name` または `### marker:ID Name` で書く。マーカーは任意で、参照に使うのは ID。
- state は `## States` の下に箇条書きで書き、初期状態には `*` を1つだけ付ける。
- Front Matter には文書全体の情報だけを書く。個別要素のラベルやアクションは本文に置く。
- `##` セクションは大きな関心ごとで分ける。画面の見え方は `Layout` と `Elements`、振る舞いは `Actions`、制約は `Business Rules` や `Validation` に寄せる。
- 文章の補足は `## Notes` やセクション直下の本文に置く。構造化された対象の箇条書きと混ぜすぎない。
- Markdown table は説明用には使えるが、正本としては見出しと箇条書きを優先する。

## 次に読むもの

- [文書構造](./document-structure.md)
- [状態](./states.md)
- [レイアウト](./layout.md)

- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [リファレンス](../reference/index.md)
