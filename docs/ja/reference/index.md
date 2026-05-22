# Reference

MarkVSpec の正確な記法を確認するための入口です。

順に学ぶ説明は [Guide](../guide/index.md) に置いています。Reference は、`.vspec.md` を書いている途中に「この section には何を書けるか」「この property はどう書くか」を引くために使います。

## 使い方

- ファイル全体の形を確認する: [File Format](file-format.md)
- `## Layout: mobile`、`## Form Groups`、`## Preview Scenarios` などの section を確認する: [Sections](sections.md)
- parser 実装の基準になる canonical syntax を確認する: [Grammar](grammar.md)
- UI 部品の type と property を確認する: [Elements](elements.md)
- click、request、state change、partial update を確認する: [Actions](actions.md)
- 入力制約と error 表示を確認する: [Validations](validations.md)
- 画面固有の判断条件を確認する: [Business Rules](rules.md)
- ID prefix と参照規則を確認する: [IDs](ids.md)
- CLI の validation、HTML/PDF export、project document-list export を確認する: [CLI](cli.md)
- 現時点で書かないものを確認する: [Limitations](limitations.md)

## Reference Pages

| Page | 内容 |
| --- | --- |
| [File Format](file-format.md) | `.vspec.md`、Front Matter、document type、本文の基本形 |
| [Grammar](grammar.md) | canonical EBNF、semantic constraints、non-canonical forms |
| [Sections](sections.md) | layout、events、form groups、validations、slots、error codes、history などの section |
| [Elements](elements.md) | `Heading`、`Paragraph`、`Text`、`Input`、`Button` などの element |
| [Actions](actions.md) | `action: A-*`、`## Events`、`Process Pn:`、`request`、`receive`、`case:`、`display` |
| [Validations](validations.md) | `## Field Validations`、`constraints`、validation message |
| [Business Rules](rules.md) | `## Business Rules` に書く business rule と画面固有条件 |
| [IDs](ids.md) | `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` の使い分け |
| [CLI](cli.md) | `validate`、HTML/PDF export、project `document-list` export |
| [Limitations](limitations.md) | Markdown table、JSON、visual design、実装詳細の扱い |

## よく見る組み合わせ

- 最小の screen を書く: [File Format](file-format.md)、[Sections](sections.md)、[Elements](elements.md)
- parser-facing canonical syntax を確認する: [Grammar](grammar.md)
- form を書く: [Elements](elements.md)、[Validations](validations.md)、[Actions](actions.md)
- form group、preview scenario、slot、error code を書く: [Sections](sections.md)
- HTTP request を書く: [Actions](actions.md)、[Business Rules](rules.md)、[IDs](ids.md)
- partial update を書く: [Actions](actions.md)、[Elements](elements.md)
- export する: [CLI](cli.md)、[Limitations](limitations.md)

## 小さな例

```markdown markvspec
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
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

- [Guide](../guide/index.md)
- [Examples](../examples/index.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
