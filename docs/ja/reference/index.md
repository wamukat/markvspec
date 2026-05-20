# Reference

MarkVSpec の正確な記法を確認するための入口です。

順に学ぶ説明は [Guide](../guide/index.md) に置いています。Reference は、`.vspec.md` を書いている途中に「この section には何を書けるか」「この property はどう書くか」を引くために使います。

## 使い方

- ファイル全体の形を確認する: [File Format](file-format.md)
- `## Layout: mobile` や `## Elements` などの section を確認する: [Sections](sections.md)
- UI 部品の type と property を確認する: [Elements](elements.md)
- click、request、state change、partial update を確認する: [Actions](actions.md)
- 入力制約と error 表示を確認する: [Validations](validations.md)
- 画面固有の判断条件を確認する: [Business Rules](rules.md)
- ID prefix と参照規則を確認する: [IDs](ids.md)
- CLI の validate/export を確認する: [CLI](cli.md)
- 現時点で書かないものを確認する: [Limitations](limitations.md)

## Reference Pages

| Page | 内容 |
| --- | --- |
| [File Format](file-format.md) | `.vspec.md`、Front Matter、document type、本文の基本形 |
| [Sections](sections.md) | 認識される top-level section と Markdown 見出しの役割 |
| [Elements](elements.md) | `Heading`、`Paragraph`、`Text`、`Input`、`Button` などの element |
| [Actions](actions.md) | `action: A-*`、`## Events`、`Process Pn:`、`server`、`receive`、`case:`、`display` |
| [Validations](validations.md) | `required`、`constraints`、format/range、error message |
| [Business Rules](rules.md) | `## Business Rules` に書く business rule と画面固有条件 |
| [IDs](ids.md) | `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` の使い分け |
| [CLI](cli.md) | `validate`、HTML export、PDF export |
| [Limitations](limitations.md) | Markdown table、JSON、visual design、実装詳細の扱い |

## よく見る組み合わせ

- 最小の screen を書く: [File Format](file-format.md)、[Sections](sections.md)、[Elements](elements.md)
- form を書く: [Elements](elements.md)、[Validations](validations.md)、[Actions](actions.md)
- server request を書く: [Actions](actions.md)、[Business Rules](rules.md)、[IDs](ids.md)
- partial update を書く: [Actions](actions.md)、[Elements](elements.md)
- export する: [CLI](cli.md)、[Limitations](limitations.md)

## 小さな例

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## States

- idle

## Layout: mobile

### L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Continue

## Elements

### E-Title Heading

- level: 1
- text: Hello MarkVSpec

### E-Continue Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A-Continue Continue

- Process P1: Navigate to next screen
  - navigate: SCR-NEXT
```

![Hello Screen の source と生成 preview](../../assets/previews/hello-screen-showcase.png)

## 関連ページ

- [Guide](../guide/index.md)
- [Examples](../examples/index.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
