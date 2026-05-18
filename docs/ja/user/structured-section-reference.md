# 構造化セクションリファレンス

このリファレンスは、[DSL](dsl.md#文書構造の用語) で定義した文書構造用語を使って、
MarkVSpec の各 `Section` の書き方を説明します。対象は現行実装が認識する
level-2 section です。

## 認識される Section

現行 parser は次の section を認識します。

- `## States`
- `## Layout` / `## Layout: <viewport>`
- `## Slot: <name>` / `## Slot: <name>: <viewport>`
- `## Slots`
- `## Elements`
- `## Form Groups`
- `## Actions`
- `## View Context`
- `## View Context Samples`
- `## Preview Scenarios`
- `## Field Validations`
- `## Cross-field Validations`
- `## Validations` (legacy-compatible)
- `## Business Rules`
- `## Error Codes`
- `## History Fields`
- `## History`

`## Notes`、`## Open Questions`、その他の未認識 level-2 section は
`Free-form Section` です。

## 共通の prose ルール

- `Section Lead` は section 全体を説明し、生成される設計書ではその section の
  構造化 summary より前に表示します。
- `Section Notes` は section 全体の後置補足です。entity 型 section で entity 群の後に
  section 全体の notes を書く場合は `### Section Notes` を使います。
- `Entity Lead` は 1 つの entity の説明で、entity 詳細の冒頭に表示します。
  一部の summary では description としても使います。
- `Entity Notes` は 1 つの entity の `Structured Body` 後に置く補足です。
- `Structured Body` は機械可読な DSL です。prose 領域は Markdown として保持しますが、
  DSL semantics としては解釈しません。

## Section 一覧

| Section | 役割 | Entity Block | Structured Body | Preview / generated document |
| --- | --- | --- | --- | --- |
| `States` | 表示 state を定義する。 | なし。 | top-level state list。`*` は initial state。 | state list、state flow、baseline State Views。 |
| `Layout` / `Layout: <viewport>` | viewport ごとの wireframe layout group を定義する。 | あり: `### [marker:]L-* Name` と presentation `P-*`。 | layout kind/properties と `#### Items`。 | wireframe と State View の Layouts fragment。 |
| `Slot: <name>` | template slot に差し込む screen 側 content を定義する。 | あり: Layout と同じ。 | layout kind/properties と `#### Items`。 | template slot に合成された wireframe。 |
| `Slots` | template が所有する slot contract を定義する。 | あり: `### <slot-name>`。 | `required`、`purpose`、`default: <ID>` などの slot metadata。 | template slot summary。 |
| `Elements` | UI element を定義する。 | あり: `### [marker:]E-* Type`。 | `label`、`src`、`action`、`action event`、`visible when` などの element properties。 | wireframe elements、Element Summary、detail fragments。 |
| `Form Groups` | form の意味単位を定義する。 | あり: `### F-* Name`。 | field/member references と submit/validation metadata。 | form group summary と validation context。 |
| `Events` | lifecycle event から Action への dispatch を定義する。 | なし。 | `page.load: A-*`、`partial.render: A-*`。 | System events と action caller label。 |
| `Actions` | 受付 state、process、outcome を定義する。 | あり: `### [marker:]A-* Name`。 | `From`、`Process`、process `case`、`Effects`、`stop`、`continue`。 | Action Summary、Action Details、action markers、state flow、transition diagrams。 |
| `View Context` | state とは別の UI-local context を定義する。 | ID entity ではない definition heading: `### <view-name>`。 | view type、values、default `*`。 | State View context resolution と condition evaluation。 |
| `View Context Samples` | view context value set に名前を付ける。 | ID entity ではない sample heading: `### <sample-name>`。 | `${view.*}` keyed view values。 | Preview Scenario と baseline view resolution。 |
| `Preview Scenarios` | state/view/sample の explicit preview combination を追加する。 | ID entity ではない scenario heading: `### <scenario-name>`。 | state、view、before、case values、`samples`。 | baseline state previews の後に追加表示される State Views。 |
| `Field Validations` | client-side single-field validation contract を定義する。 | あり: `### [marker:]V-* Name`。 | `target`、optional `run`、`constraints`、messages。 | validation summary と display-message resolution。 |
| `Cross-field Validations` | client-side form / multi-input validation contract を定義する。 | あり: `### [marker:]V-* Name`。 | `target`、`inputs`、`check`、optional `run`、messages。 | validation summary と display-message resolution。 |
| `Validations` | legacy-compatible validation section。 | あり: `### [marker:]V-* Name`。 | target、scope/run、rules/constraints、messages。 | validation summary と display-message resolution。 |
| `Business Rules` | domain rule / UI business rule を定義する。 | 任意: `### R-* Name`。なければ top-level list。 | rule list または rule entity properties。 | business rule summary と display-message resolution。 |
| `Error Codes` | error code と UI display contract を対応付ける。 | あり: `### ERR-* Name`。 | code、message、display、target など。 | error code summary と display-message resolution。 |
| `History Fields` | history entry の metadata field を定義する。 | なし。 | top-level field list。 | history field summary。 |
| `History` | document change history を定義する。 | 通常 entity ではない history entry heading: `### <version>`。 | entry metadata list と changes body。 | history table/detail。 |
| Free-form sections | notes や open questions を保持する。 | DSL entity として解釈しない。 | Markdown のみ。 | authored Markdown として保持。 |

## Section 詳細

### States

`Section Lead` には state model の意図を書きます。`Entity Block` はありません。
`Structured Body` は最初の top-level state list item から始まります。state list 後の
prose は `Section Notes` です。

```markdown
## States

この画面では request の進行状態だけを state として扱う。

- idle*
- fetching
- loaded

`fetching` 中は送信 action を無効化する。
```

### Layout / Slot Content

`Section Lead` には viewport または slot 全体の意図を書きます。`L-*` または `P-*`
heading は `Entity Block` です。`Entity Lead` は layout properties より前に置く
layout group の説明です。`Structured Body` は layout kind/properties と
`#### Items` です。layout properties の後、`#### Items` 直下、item list 後の prose は
`Entity Notes` です。

次の位置関係では、`(A)` が `Section Lead`、`(B)` が `Entity Lead`、
`(C)`、`(D)`、`(E)` が `Entity Notes` です。

`Layout` の `Entity Lead` と `Entity Notes` は、生成される設計書の Layouts fragment
に表示する対象です。wireframe annotation へ利用してもよいですが、wireframe 自体は
`Structured Body` で決まります。

```markdown
## Layout: mobile
(A)

### L1:L-Page Async fetching page
(B)

- stack
- gap: md
(C)

#### Items
(D)

- E-Title
- E-RefreshButton
- L-StatusArea
(E)
```

### Slots

`Slots` は template が所有する slot contract を定義します。`Section Lead` は slot set 全体の説明です。
`### <slot-name>` heading は `Entity Block` です。`Entity Lead` は slot の目的、
`Structured Body` は `required` や `default: <ID>` などの slot metadata、
`Entity Notes` は slot 固有の補足です。`default: <ID>` は同じ template 内の
`E-*` 要素または `L-*` Layout を参照します。slot 全体の後置補足は
`### Section Notes` に書きます。

```markdown
## Slots

### content

メイン content 用 slot。

- required: true
```

### Elements

`Section Lead` は element catalog の説明です。`### [marker:]E-* Type` heading は
`Entity Block` です。`Entity Lead` は `description` / `purpose` より詳しい説明です。
`Structured Body` は element properties、`Entity Notes` は element 固有の補足です。
preview は structured properties だけを DSL として解釈します。

```markdown
## Elements

### E-SubmitButton Button

現在の form を送信する。

- label: Submit
- variant: primary
- action: A-Submit
```

### Form Groups

`Section Lead` は form model の説明です。`### F-* Name` heading は `Entity Block` です。
`Structured Body` には field membership と form-level validation / submit metadata を書きます。

```markdown
## Form Groups

### F-Login Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
```

### Actions

`Section Lead` は action 設計方針の説明です。`### [marker:]A-* Name` heading は
`Entity Block` です。`Entity Lead` は authored action summary です。
`Structured Body` には source state、process、case、effect を書きます。caller は
Element の `action:` property から来ます。click 以外の caller は `action event:`
で表します。lifecycle caller は `## Events` から来ます。`Entity Notes` は Action
Details に表示し、Action Summary には表示しません。

```markdown
## Actions

### A1:A-Submit Submit

form を検証して送信する。

- From
  - idle
- Process P1: Send request
  - request:
    - method: POST
    - path: /login
  - case: sent
    - Effects
      - state: submitting
```

### Preview Scenarios

`Preview Scenarios` は ID 付き entity ではなく、scenario heading の階層を持ちます。
`Section Lead` は scenario 全体の説明です。`### <scenario-name>` は scenario を開始し、
`state`、`view`、`before`、display `cases`、Element ID keyed の `samples` を束ねます。

```markdown
## Preview Scenarios

### loaded-with-results

- state: loaded
- samples:
  - E-ItemsTable:
    - rows:
      - row:
        - name: First item
```

### View Context

`View Context` は selected tab や open panel など、state ではない UI-local context を
定義します。`### <view-name>` heading は view context 定義を開始しますが、
ID 付きの `Entity Block` ではありません。型は enum-like values と boolean をサポートします。

```markdown
## View Context

### selectedTab

- type: enum
- values:
  - summary*
  - details

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true
```

### View Context Samples

view values の再利用セットに名前を付けます。`### <sample-name>` heading は
sample を開始しますが、ID 付きの `Entity Block` ではありません。

```markdown
## View Context Samples

### default

- ${view.selectedTab}: summary
- ${view.isHelpPanelOpen}: false
```

### Preview Scenarios

explicit preview combination を追加します。`### <scenario-name>` heading は scenario を
開始しますが、ID 付きの `Entity Block` ではありません。存在しない場合も、
preview/export はすべての state を baseline として表示します。

```markdown
## Preview Scenarios

### loaded details

- state: loaded
- view: default
```

### Field Validations / Cross-field Validations

single-field は `## Field Validations`、form-level / multi-input は
`## Cross-field Validations` に書きます。server 側で検出される domain constraint は
`Business Rules`、具体的な API error は `Error Codes` に書きます。
`### [marker:]V-* Name` heading は `Entity Block` です。`Structured Body` には
target、constraints または inputs/check、optional run、messages を書きます。

```markdown
## Field Validations

### V-EmailRequired Email required

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
```

### Business Rules

domain rule を書きます。単純な top-level list は free-form rule set として扱います。
rule ごとに `Entity Lead`、`Structured Body`、`Entity Notes` が必要なら
`### R-* Name` を使います。

```markdown
## Business Rules

### R-AccountLocked Locked account

- condition: account is locked
- message: Account is locked.
```

### Error Codes

`### ERR-* Name` heading は `Entity Block` です。`Structured Body` で code や condition を
display text / target に対応付けます。

```markdown
## Error Codes

### ERR-AUTH-401 Invalid credentials

- code: 401
- display: banner
- target: L-MessageArea
```

### History Fields

`Entity Block` はありません。top-level field list が `Structured Body` です。
field list の前後の prose は `Section Lead` / `Section Notes` です。

```markdown
## History Fields

- author
  - type: string
- date
  - type: date
```

### History

`### <version>` は history entry を開始しますが、通常の `Entity Block` ではありません。
heading 後の metadata list は `Structured Body`、metadata 後の prose は entry changes body であり、
`Entity Notes` ではありません。

```markdown
## History

### 0.3.0

- date: 2026-05-17

- Added validation examples.
```

### Free-form Sections

未認識の level-2 section は Markdown として保持し、`Section Lead`、
`Structured Body`、`Section Notes` には分割しません。

```markdown
## Open Questions

- Help panel は View Context value にすべきか。
```
