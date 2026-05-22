# Sections

Sections は `.vspec.md` の本文を分割する top-level heading です。MarkVSpec は section 名から、後続の object をどう読むかを判断します。

## 書ける構文

```markdown markvspec-skip reason=requires-cross-section-context
## States

- idle*
- loading
- error

## Layout: mobile

### L-Page Page layout

- stack
- gap: md

#### Items

- E-Title
- E-Submit
```

認識される top-level section は次の通りです。

<!-- markvspec-generated:reference-sections:start -->
この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。

| Section | Heading pattern | Order |
| --- | --- | --- |
| `## States` | `"States"` | 1 |
| `## Layout` | `"Layout" \| "Layout:" viewport` | 2 |
| `## Slot` | `"Slot:" slot_name [":" viewport]` | 2 |
| `## Slots` | `"Slots"` | 3 |
| `## Elements` | `"Elements"` | 4 |
| `## Form Groups` | `"Form Groups"` | 5 |
| `## Events` | `"Events"` | 6 |
| `## Actions` | `"Actions"` | 7 |
| `## View Context` | `"View Context"` | 8 |
| `## View Context Samples` | `"View Context Samples"` | 9 |
| `## Preview Scenarios` | `"Preview Scenarios"` | 10 |
| `## Field Validations` | `"Field Validations"` | 11 |
| `## Cross-field Validations` | `"Cross-field Validations"` | 12 |
| `## Validations` | `"Validations"` | 13 |
| `## Business Rules` | `"Business Rules"` | 14 |
| `## Error Codes` | `"Error Codes"` | 15 |
| `## History Fields` | `"History Fields"` | 16 |
| `## History` | `"History"` | 17 |

推奨 section order: `States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History`

`## Notes` と `## Open Questions` は structured render model に入る recognized section ではなく、手書き prose として扱います。
<!-- markvspec-generated:reference-sections:end -->

### States

state は `## States` の下に bullet で書きます。初期状態を明示したい場合は、
1つの state にだけ `*` を付けます。

```markdown markvspec-skip reason=requires-cross-section-context
## States

- idle*
- loading
- error
```

action case、element の表示条件、preview note からは同じ state 名を参照します。

### Form Groups

複数 input をまとめて validation / submit する場合は `## Form Groups` を使います。

```markdown markvspec-skip reason=requires-cross-section-context
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin
```

login、search、profile、settings form で使います。
[Login Basic](../../../examples/showcase/login-basic.html) と
[Form Submit Flow](../../../examples/showcase/form-submit-flow.html) を参照してください。

### Events

element click ではなく lifecycle から action を呼ぶ場合は `## Events` を使います。

```markdown markvspec-skip reason=requires-cross-section-context
## Events

- page.load: A-LoadPreferences
```

initial load、partial initialization、screen lifecycle による data refresh で使います。
[Parallel Initial Load](../../../examples/showcase/parallel-initial-load.html) を参照してください。

### Preview Scenarios

画面全体を複製せず、review したい preview 状態に名前を付ける場合は
`## Preview Scenarios` を使います。

Preview Data は、MarkVSpec が preview/export に渡す表示用データ全体の総称です。
Element の scalar 表示値、Element の `sample rows:`、Preview Scenario の
`samples:`、Preview Scenario の `route:`、`## View Context Samples` が含まれます。

```markdown markvspec-skip reason=requires-cross-section-context
## Preview Scenarios

### idle-validation-error

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

error、empty、dialog、toast、direct link の状態を見せたいときに使います。
`samples:` は Element ごとの Scenario Preview Data です。`route:` は route
parameter や hash fragment に使う Route Preview Data です。

[Scenario Preview Data](../../../examples/showcase/scenario-samples.html) と
[Display Effects](../../../examples/showcase/display-effects.html) を参照してください。

### Field And Cross-Field Validations

1つの input の制約は `## Field Validations`、複数 input または form group に
またがる check は `## Cross-field Validations` に書きます。

```markdown markvspec-skip reason=requires-cross-section-context
## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.

## Cross-field Validations

### V-LoginForm Required login fields

- target: F-LoginForm
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: email and password are both present
```

[Single Field Validation](../../../examples/showcase/single-field-validation.html) と
[Login Basic](../../../examples/showcase/login-basic.html) を参照してください。

### Slots

template 側で slot を宣言する場合は `## Slots`、page / partial 側で slot content を
渡す場合は `## Slot: name` を使います。

```markdown markvspec-skip reason=requires-cross-section-context
## Slots

### content Main content

- required
- default: E-EmptySlotMessage

## Slot: content

### L-AccountContent Account content

#### Items

- E-Title
```

viewport ごとの slot content は `## Slot: name: viewport` と書きます。
[Profile Page With Template](../../../examples/showcase/profile-page-with-template.html) と
[Responsive Slot Page](../../../examples/showcase/responsive-slot-page.html) を参照してください。

### Error Codes

同じ error に stable code、表示先、表示形式を持たせたい場合は `## Error Codes` を使います。

```markdown markvspec-skip reason=requires-cross-section-context
## Error Codes

### ER1:ERR-EMAIL-ALREADY-REGISTERED Email already registered

- business rule: R-EmailMustBeUnique
- target: E-SubmitError
- message: Email is already registered.
- display: banner
```

[Form Submit Flow](../../../examples/showcase/form-submit-flow.html) を参照してください。

### History

history entry の field を定義する場合は `## History Fields`、revision entry は
`## History` に書きます。

```markdown markvspec-skip reason=requires-cross-section-context
## History Fields

- date
  label: Date
  required: true

## History

### 0.1

- date: 2026-05-10
- author: Docs Team
- reason: Initial version.
```

review history を仕様 file に残す場合に使います。
[History And Errors](../../../examples/showcase/history-and-errors.html) を参照してください。

## 小さな例

```markdown markvspec-skip reason=requires-cross-section-context
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen の section 構成と描画 preview](../../assets/vscode-previews/hello-screen-sections-vscode-preview.png)

## 注意点

- section heading は英語の固定名を使います。日本語文書でも `## Elements` のように書きます。
- Markdown 見出しは object 宣言です。見た目の見出し装飾ではありません。
- object は `### ID Name` または marker 付きの `### marker:ID Name` で宣言します。
- `#### Items` などの subsection は、直前の object に属します。
- 未認識 section は prose として扱われる可能性があり、preview や validation の対象にならない場合があります。

## 関連ページ

- [File Format](file-format.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
