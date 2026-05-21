# リファレンス

MarkVSpec の正確な記法を確認するための入口です。

順に学ぶ説明は [ガイド](../guide/index.md) に置いています。リファレンスは、`.vspec.md` を書いている途中に「このセクションには何を書けるか」「このプロパティはどう書くか」を引くために使います。

## 使い方

- ファイル全体の形を確認する: [ファイル形式](file-format.md)
- `## Layout: mobile`、`## Form Groups`、`## Preview Scenarios` などのセクションを確認する: [セクション](sections.md)
- UI 部品の種類と項目を確認する: [要素](elements.md)
- クリック、リクエスト、状態変化、部分更新を確認する: [アクション](actions.md)
- 入力制約とエラー表示を確認する: [バリデーション](validations.md)
- 画面固有の判断条件を確認する: [ビジネスルール](rules.md)
- ID 接頭辞と参照規則を確認する: [ID](ids.md)
- CLI のバリデーション、HTML/PDF 出力、プロジェクト文書一覧出力を確認する: [CLI](cli.md)
- 現時点で書かないものを確認する: [制限事項](limitations.md)

## リファレンスページ

| ページ | 内容 |
| --- | --- |
| [ファイル形式](file-format.md) | `.vspec.md`、Front Matter、文書タイプ、本文の基本形 |
| [セクション](sections.md) | レイアウト、イベント、フォームグループ、バリデーション、slot、エラーコード、履歴などのセクション |
| [要素](elements.md) | `Heading`、`Paragraph`、`Text`、`Input`、`Button` などの要素 |
| [アクション](actions.md) | `action: A-*`、`## Events`、`Process Pn:`、`request`、`receive`、`case:`、`display` |
| [バリデーション](validations.md) | `## Field Validations`、`constraints`、検証メッセージ |
| [ビジネスルール](rules.md) | `## Business Rules` に書くビジネスルールと画面固有条件 |
| [IDs](ids.md) | `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` の使い分け |
| [CLI](cli.md) | `validate`、HTML/PDF 出力、プロジェクト `document-list` 出力 |
| [制限事項](limitations.md) | Markdown table、JSON、視覚デザイン、実装詳細の扱い |

## よく見る組み合わせ

- 最小の画面を書く: [ファイル形式](file-format.md)、[セクション](sections.md)、[要素](elements.md)
- フォームを書く: [要素](elements.md)、[バリデーション](validations.md)、[アクション](actions.md)
- フォームグループ、プレビューシナリオ、slot、エラーコードを書く: [セクション](sections.md)
- HTTP リクエストを書く: [アクション](actions.md)、[ビジネスルール](rules.md)、[IDs](ids.md)
- 部分更新を書く: [アクション](actions.md)、[要素](elements.md)
- 出力する: [CLI](cli.md)、[制限事項](limitations.md)

## 小さな例

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## States

- idle*

## Layout: mobile

### L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Continue

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello MarkVSpec

### 2:E-Continue Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A1:A-Continue Continue

- Process P1: Stay on the current screen
  - state: idle
```

![Hello Screen のソースと生成プレビュー](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## 関連ページ

- [ガイド](../guide/index.md)
- [サンプル](../examples/index.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
