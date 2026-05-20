# Sections

Sections は `.vspec.md` の本文を分割する top-level heading です。MarkVSpec は section 名から、後続の object をどう読むかを判断します。

## 書ける構文

```markdown
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

| Section | 書く内容 |
| --- | --- |
| `## States` | screen state の名前 |
| `## Layout: mobile` | layout group と item の並び |
| `## Elements` | UI element の意味、label、value、action |
| `## Actions` | trigger、request、effect、case |
| `## Events` | page load など element click ではない event |
| `## Form Groups` | form 単位の field group と submit action |
| `## Field Validations` | 単一 field の constraint と message |
| `## Cross-field Validations` | 複数 field または form 単位の check |
| `## Preview Scenarios` | state、validation、action result を組み合わせた preview case |
| `## Business Rules` | business rule と画面固有の判断条件 |
| `## Error Codes` | 再利用する error 定義と表示先 |
| `## Slots` | template が受け取る slot 宣言 |
| `## Slot: name` | page / partial から渡す slot content |
| `## History Fields` | history entry に使う structured field |
| `## History` | revision history entry |
| `## Notes` | 補足、実装メモ、意図 |
| `## Open Questions` | 未決事項 |

### States

state は `## States` の下に bullet で書きます。初期状態を明示したい場合は、
1つの state にだけ `*` を付けます。

```markdown
## States

- idle*
- loading
- error
```

action case、element の表示条件、preview note からは同じ state 名を参照します。

### Form Groups

複数 input をまとめて validation / submit する場合は `## Form Groups` を使います。

```markdown
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

```markdown
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

```markdown
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

`## Model Samples` / `modelSamples` は canonical ではありません。Element の scalar 値、
Element の `sample rows:`、Preview Scenario の `samples:` / `route:`、または
View Context Samples を使ってください。

[Scenario Preview Data](../../../examples/showcase/scenario-samples.html) と
[Display Effects](../../../examples/showcase/display-effects.html) を参照してください。

### Field And Cross-Field Validations

1つの input の制約は `## Field Validations`、複数 input または form group に
またがる check は `## Cross-field Validations` に書きます。

```markdown
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

```markdown
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

```markdown
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

```markdown
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

```markdown
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen の section 構成と生成 preview](../../assets/vscode-previews/hello-screen-sections-vscode-preview.png)

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
