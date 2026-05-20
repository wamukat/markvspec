# File Format

`.vspec.md` は MarkVSpec の authoring source です。1ファイルは原則として1つの screen、template、partial を表します。

## 書ける構文

```markdown
---
id: SCR-LOGIN
type: screen
title: ログイン
route: /login
locale: ja
---

## States

- idle*

## Layout: mobile

### L-Page Login page

- stack
- gap: md
```

### Front Matter

Front Matter は document-level metadata だけを書きます。

| Field | 必須 | 値 |
| --- | --- | --- |
| `id` | yes | `SCR-*`、または document type に合う stable ID |
| `type` | yes | `screen`、`template`、`partial` |
| `title` | yes | 人が読む画面名 |
| `route` | no | screen の URL path |
| `locale` | no | `ja`、`en` などの locale |

Front Matter には element property、action、layout item は書きません。それらは Markdown 本文に書きます。

### Body

本文は Markdown 見出しと箇条書きで書きます。

- `##` は top-level section。
- `###` は object 宣言。
- `####` は object 内の subsection。
- bullet は property、rule、condition、transition を表します。
- `###` の object heading は `### ID Name` または `### marker:ID Name` で書けます。

JSON は authoring format ではありません。tool の内部表現や export 結果として使われることはありますが、利用者が source として書く形式ではありません。

## 小さな例

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello MarkVSpec
```

![Hello Screen の file format 例と生成 preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## 注意点

- file extension は `.vspec.md` を使います。
- 画面をまたぐ仕様は、複数の screen file に分けます。
- Front Matter は YAML ですが、本文を YAML や JSON に寄せないでください。
- Markdown table は説明用には使えますが、canonical source にはしません。
- `type: partial` は server-rendered partial や画面断片を表す場合に使います。
- state は `## States` の下に bullet で書き、初期状態には `*` を1つだけ付けます。

## 関連ページ

- [Sections](sections.md)
- [IDs](ids.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
