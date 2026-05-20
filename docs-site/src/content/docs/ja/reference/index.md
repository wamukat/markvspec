---
title: "Reference"
---

MarkVSpec の正確な記法を確認するための入口です。

順に学ぶ説明は [Guide](/markvspec/ja/guide/) に置いています。Reference は、`.vspec.md` を書いている途中に「この section には何を書けるか」「この property はどう書くか」を引くために使います。

## 使い方

- ファイル全体の形を確認する: [File Format](/markvspec/ja/reference/file-format/)
- `## Layout: mobile`、`## Form Groups`、`## Preview Scenarios` などの section を確認する: [Sections](/markvspec/ja/reference/sections/)
- UI 部品の type と property を確認する: [Elements](/markvspec/ja/reference/elements/)
- click、request、state change、partial update を確認する: [Actions](/markvspec/ja/reference/actions/)
- 入力制約と error 表示を確認する: [Validations](/markvspec/ja/reference/validations/)
- 画面固有の判断条件を確認する: [Business Rules](/markvspec/ja/reference/rules/)
- ID prefix と参照規則を確認する: [IDs](/markvspec/ja/reference/ids/)
- CLI の validation、HTML/PDF export、project document-list export を確認する: [CLI](/markvspec/ja/reference/cli/)
- 現時点で書かないものを確認する: [Limitations](/markvspec/ja/reference/limitations/)

## Reference Pages

| Page | 内容 |
| --- | --- |
| [File Format](/markvspec/ja/reference/file-format/) | `.vspec.md`、Front Matter、document type、本文の基本形 |
| [Sections](/markvspec/ja/reference/sections/) | layout、events、form groups、validations、slots、error codes、history などの section |
| [Elements](/markvspec/ja/reference/elements/) | `Heading`、`Paragraph`、`Text`、`Input`、`Button` などの element |
| [Actions](/markvspec/ja/reference/actions/) | `action: A-*`、`## Events`、`Process Pn:`、`request`、`receive`、`case:`、`display` |
| [Validations](/markvspec/ja/reference/validations/) | `required`、`constraints`、format/range、error message |
| [Business Rules](/markvspec/ja/reference/rules/) | `## Business Rules` に書く business rule と画面固有条件 |
| [IDs](/markvspec/ja/reference/ids/) | `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` の使い分け |
| [CLI](/markvspec/ja/reference/cli/) | `validate`、HTML/PDF export、project `document-list` export |
| [Limitations](/markvspec/ja/reference/limitations/) | Markdown table、JSON、visual design、実装詳細の扱い |

## よく見る組み合わせ

- 最小の screen を書く: [File Format](/markvspec/ja/reference/file-format/)、[Sections](/markvspec/ja/reference/sections/)、[Elements](/markvspec/ja/reference/elements/)
- form を書く: [Elements](/markvspec/ja/reference/elements/)、[Validations](/markvspec/ja/reference/validations/)、[Actions](/markvspec/ja/reference/actions/)
- form group、preview scenario、slot、error code を書く: [Sections](/markvspec/ja/reference/sections/)
- HTTP request を書く: [Actions](/markvspec/ja/reference/actions/)、[Business Rules](/markvspec/ja/reference/rules/)、[IDs](/markvspec/ja/reference/ids/)
- partial update を書く: [Actions](/markvspec/ja/reference/actions/)、[Elements](/markvspec/ja/reference/elements/)
- export する: [CLI](/markvspec/ja/reference/cli/)、[Limitations](/markvspec/ja/reference/limitations/)

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

- [Guide](/markvspec/ja/guide/)
- [Examples](/markvspec/ja/examples/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
