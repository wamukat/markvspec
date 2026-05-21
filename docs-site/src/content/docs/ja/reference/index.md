---
title: "リファレンス"
---

MarkVSpec の正確な記法を確認するための入口です。

順に学ぶ説明は [ガイド](/markvspec/ja/guide/) に置いています。リファレンスは、`.vspec.md` を書いている途中に「このセクションには何を書けるか」「このプロパティはどう書くか」を引くために使います。

## 使い方

- ファイル全体の形を確認する: [ファイル形式](/markvspec/ja/reference/file-format/)
- `## Layout: mobile`、`## Form Groups`、`## Preview Scenarios` などのセクションを確認する: [セクション](/markvspec/ja/reference/sections/)
- UI 部品の type と property を確認する: [要素](/markvspec/ja/reference/elements/)
- click、request、状態変化、部分更新を確認する: [アクション](/markvspec/ja/reference/actions/)
- 入力制約とエラー表示を確認する: [バリデーション](/markvspec/ja/reference/validations/)
- 画面固有の判断条件を確認する: [ビジネスルール](/markvspec/ja/reference/rules/)
- ID prefix と参照規則を確認する: [ID](/markvspec/ja/reference/ids/)
- CLI のバリデーション、HTML/PDF 出力、project document-list 出力を確認する: [CLI](/markvspec/ja/reference/cli/)
- 現時点で書かないものを確認する: [制限事項](/markvspec/ja/reference/limitations/)

## リファレンスページ

| ページ | 内容 |
| --- | --- |
| [ファイル形式](/markvspec/ja/reference/file-format/) | `.vspec.md`、Front Matter、文書タイプ、本文の基本形 |
| [セクション](/markvspec/ja/reference/sections/) | layout、events、form groups、validations、slots、error codes、history などのセクション |
| [要素](/markvspec/ja/reference/elements/) | `Heading`、`Paragraph`、`Text`、`Input`、`Button` などの要素 |
| [アクション](/markvspec/ja/reference/actions/) | `action: A-*`、`## Events`、`Process Pn:`、`request`、`receive`、`case:`、`display` |
| [バリデーション](/markvspec/ja/reference/validations/) | `required`、`constraints`、format/range、エラーメッセージ |
| [ビジネスルール](/markvspec/ja/reference/rules/) | `## Business Rules` に書く business rule と画面固有条件 |
| [ID](/markvspec/ja/reference/ids/) | `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` の使い分け |
| [CLI](/markvspec/ja/reference/cli/) | `validate`、HTML/PDF 出力、project `document-list` 出力 |
| [制限事項](/markvspec/ja/reference/limitations/) | Markdown table、JSON、visual design、実装詳細の扱い |

## よく見る組み合わせ

- 最小の画面を書く: [ファイル形式](/markvspec/ja/reference/file-format/)、[セクション](/markvspec/ja/reference/sections/)、[要素](/markvspec/ja/reference/elements/)
- form を書く: [要素](/markvspec/ja/reference/elements/)、[バリデーション](/markvspec/ja/reference/validations/)、[アクション](/markvspec/ja/reference/actions/)
- form group、preview scenario、slot、error code を書く: [セクション](/markvspec/ja/reference/sections/)
- HTTP request を書く: [アクション](/markvspec/ja/reference/actions/)、[ビジネスルール](/markvspec/ja/reference/rules/)、[ID](/markvspec/ja/reference/ids/)
- partial update を書く: [アクション](/markvspec/ja/reference/actions/)、[要素](/markvspec/ja/reference/elements/)
- export する: [CLI](/markvspec/ja/reference/cli/)、[制限事項](/markvspec/ja/reference/limitations/)

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

![Hello Screen の source と生成 preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## 関連ページ

- [ガイド](/markvspec/ja/guide/)
- [サンプル](/markvspec/ja/examples/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
