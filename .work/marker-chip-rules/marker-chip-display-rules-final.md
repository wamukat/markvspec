# Marker / Reference Chip Display Rules

## 目的

Preview 内の marker 表示を統一する。

現状は、marker だけの表示、marker と name / ID の横並び、marker + name / ID を枠で囲う表示が混在している。
このルールでは、読みやすさと表示密度のバランスを取りながら、実装者が迷わない基準を定義する。

## 確定ルール

### 1. 表示パターン

Preview では以下の2パターンを使い分ける。

#### Marker only

marker だけを表示する。

使用場所:

- Wireframe 上の overlay annotation。
- 狭い領域で、同じ行・近接列・tooltip から対象を追える場合。

例:

```text
[A1]
[L3]
[(10)]
```

#### Reference Chip

marker と name / ID を同じ枠内に表示する。

使用場所:

- 1セル内で entity 参照を示す場所。
- Action Details の entity 参照。
- Display updates。
- Displayed messages の source / displayed at。
- Transition table の action 参照。
- 説明領域で対象を明示する場所。

例:

```text
[A1] Submit login
[L3] Message area
[(10)] E-RequestErrorBanner
[V1] Login form required
[R1] Email must be unique
```

## Entity 別の Reference Chip 表示

### Action

Action は marker + action name を表示する。

```text
[A1] Submit login
```

process / case は chip 内に入れず、補助行として表示する。

```text
[A1] Submit login
P2.send-failed
```

理由:

- chip が長くなりすぎるのを避ける。
- action と process/case の階層が読み取りやすい。

### Layout

Layout は marker + layout name を表示する。

```text
[L3] Message area
```

layout name がない場合は layout ID を表示する。

```text
[L3] L-MessageArea
```

### Element

Element は marker + element ID を表示する。

```text
[(10)] E-RequestErrorBanner
```

element name ではなく ID を優先する。

理由:

- Element は DSL source / Element Summary / Display Content Spec と ID で照合する場面が多い。
- name は似た名前が増えると追跡しにくい。
- element type は chip 内に含めない。

### Validation / Business Rule / Message Source

Validation / Business Rule は marker + rule name を表示する。

```text
[V1] Login form required
[R1] Email must be unique
```

rule name がない場合は ID を表示する。

message text は chip 内に入れず、別欄に表示する。

```text
Source: [V1] Login form required
Message: Email and password are required.
```

理由:

- chip は参照対象を示すためのもの。
- message text は content として読みたいので、chip 内に詰め込まない。

## 場所別ルール

### Wireframe

Wireframe 上は marker only とする。

Reference Chip は表示しない。

理由:

- wireframe は実画面レイアウトの形を優先する。
- name / ID を wireframe 上に出すと、画面レイアウトを壊しやすい。

### Display updates

`display.element` の差分説明では Reference Chip を使う。

例:

```text
Triggered by | Update
[A1] Submit login
P2.send-failed | [L3] Message area receives [(10)] E-RequestErrorBanner
```

### Displayed messages

`display.message` の説明では Reference Chip を使う。

例:

```text
Source       | [V1] Login form required
Displayed at | [L3] Message area
Message      | Email and password are required.
```

message text は chip に入れない。

### Action Details

Action Details 内で action / layout / element / validation / rule を参照する場合は Reference Chip を使う。

process marker `P1`, `P2` は process 表示用の既存表現を維持してよい。

### Summary / Spec Tables

entity の主語を表す summary / spec table では、旧 `Marker | ID` split columns を使わず、`Marker/ID` 単一列に Reference Chip を表示する。

対象:

- `Element Summary`
- `Layout Summary`
- `Input Form Spec`
- `Display Content Spec`

例:

```text
Marker/ID
[(10)] E-RequestErrorBanner
```

Wireframe 上の overlay annotation は対象外であり、marker only のままにする。

### Transition Tables

セル内で action を示す場合は Reference Chip を使う。

```text
[A1] Submit login
P2.sent
```

state 自体は既存の state badge 表現を維持する。

### 目次 / 見出し / State Heading

目次、見出し、state heading は chip 化しない。

理由:

- navigation / document outline はテキストとして読みたい。
- chip が増えると視覚ノイズが強くなる。

## 狭い領域での縮退ルール

標準は Reference Chip。

ただし、表示領域が狭い場合は以下の順に縮退してよい。

1. marker + label / ID の Reference Chip
2. marker only

marker only に縮退する条件:

- 同じ行・近接列で name / ID が読める。
- または tooltip / title に完全参照が入っている。

tooltip 例:

```text
title="A-SubmitLogin Submit login"
title="E-RequestErrorBanner Banner"
```

## クリック先

Reference Chip をリンク化する場合、リンク先は detail section とする。

wireframe occurrence には飛ばさない。

理由:

- 同じ marker が複数 scenario / viewport に表示される場合、wireframe occurrence は曖昧になる。
- detail section は安定した参照先になる。

## 実装方針

### 共通 helper を用意する

renderer ごとに marker + name / ID を個別実装しない。

共通 helper を用意し、表示揺れを抑える。

概念:

```ts
renderEntityRef({
  kind: "action" | "layout" | "element" | "validation" | "rule",
  marker,
  id,
  label,
  mode: "marker" | "chip" | "split",
  compact?: boolean
})
```

### 既存 marker class を維持する

Reference Chip 内の marker 部分は既存 marker class を使う。

```text
.mm-marker-action
.mm-marker-layout
.mm-marker-element
.mm-marker-message
```

Reference Chip 用 class を追加する。

```text
.mm-ref-chip
.mm-ref-chip-action
.mm-ref-chip-layout
.mm-ref-chip-element
.mm-ref-chip-message
```

## 参考プロトタイプ

- `.work/marker-chip-rules/marker-chip-display-prototype.html`
- `.work/marker-chip-rules/marker-chip-decision-prototype.html`
