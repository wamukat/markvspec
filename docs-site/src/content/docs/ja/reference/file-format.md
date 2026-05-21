---
title: "ファイル形式"
---

`.vspec.md` は MarkVSpec の作成元です。1ファイルは原則として1つの画面、テンプレート、partial を表します。
`.vspec.project.md` は、複数の画面ファイルやテンプレートファイルを参照するプロジェクトインデックスを表します。

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
| `type` | yes | `screen`、`template`、`partial`、`project` |
| `title` | yes | 人が読む画面名 |
| `route` | no | screen の URL path |
| `locale` | no | `ja`、`en` などの locale |

Front Matter には element property、action、layout item は書きません。それらは Markdown 本文に書きます。

### Project files

複数の画面とテンプレートを1つのプレビューで確認したい場合はプロジェクトファイルを使います。

```markdown
---
id: PRJ-ACCOUNT
type: project
title: Account Project
screens:
  - id: SCR-LOGIN
    path: screens/login.vspec.md
templates:
  - id: TPL-ACCOUNT-SHELL
    path: templates/account-shell.vspec.md
---

# PRJ-ACCOUNT Account Project

アカウント関連画面をまとめて確認するための project です。

## Notes

navigation と共通 shell の変更を同じ場所で確認します。
```

プロジェクトプレビューではプロジェクト概要と `## Notes` が表示され、画面 / テンプレート一覧や遷移図と一緒にプロジェクトの意図を確認できます。HTML/PDF 出力でもプロジェクトファイルを指定でき、列挙された画面を読み込んで1つの成果物にまとめます。CLI の [document-list 出力](/markvspec/ja/reference/cli/) は一覧性を優先するため、プロジェクト文書の長い概要やメモ本文は含めません。

関連:

- [プレビュー](/markvspec/ja/start/preview/): プロジェクトプレビューの表示内容。
- [出力](/markvspec/ja/start/export/): プロジェクト HTML/PDF 出力。
- [CLI](/markvspec/ja/reference/cli/): 一覧用の `export document-list`。

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

- ファイル拡張子は `.vspec.md` を使います。
- 画面をまたぐ仕様は、複数の画面ファイルに分けます。
- Front Matter は YAML ですが、本文を YAML や JSON に寄せないでください。
- Markdown table は説明用には使えますが、canonical source にはしません。
- `type: partial` は server-rendered partial や画面断片を表す場合に使います。
- `type: project` は、関連する screen と template を列挙する `.vspec.project.md` にだけ使います。
- state は `## States` の下に bullet で書き、初期状態には `*` を1つだけ付けます。

## 関連ページ

- [セクション](/markvspec/ja/reference/sections/)
- [ID](/markvspec/ja/reference/ids/)
- [制限事項](/markvspec/ja/reference/limitations/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
