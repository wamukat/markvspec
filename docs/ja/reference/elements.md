# Elements

`## Elements` は UI element を意味で記述する section です。MarkVSpec では、見た目の実装詳細ではなく、element type、label、text、value、variant、tone、action などを書きます。

## 書ける構文

```markdown
## Elements

### E-Title Heading

- level: 1
- text: Login

### E-EmailInput Input

- label: Email
- value: email
- type: email
- input rule:
  - type: email

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

### Element Heading

Element は `### E-* Name Type` で宣言します。preview に marker を出したい場合は
`### marker:E-* Name Type` と書きます。

```markdown
### E-HelpText Paragraph

### 3:E-HelpText Paragraph
```

- `E-*` は stable ID。
- `3` は任意の preview marker。
- `HelpText` は人が読む object 名。
- `Paragraph` は element type。

### Common Types

| Type | 用途 |
| --- | --- |
| `Heading` | 画面や section の見出し。`level: 1..6` を必ず併用します。 |
| `Paragraph` | 説明文、長めの prose。 |
| `Text` | 短い label、値、補足表示。 |
| `Input` | text/email/password/search などの入力。 |
| `Button` | action を発火する操作。 |
| `Link` | 別画面や外部 URL への移動。 |
| `Image` | 意味のある画像や avatar。 |
| `List` | 繰り返し項目や menu。 |
| `Spinner` | 処理中 state の loading indicator。 |
| `Banner` | error、warning、success、info などの page / section message。 |
| `Badge` | status、role、category の短い label。 |
| `Table` | row / column を持つ構造化された一覧。 |
| `Select` | option から1つ選ぶ入力。 |
| `Dialog` | 確認や中断を伴う modal prompt。 |
| `Toast` | action 後に一時的に出す feedback。 |
| `Tabs` | 1画面内で排他的に切り替える panel。 |
| `ActionMenu` | row や item に紐づく context action。 |

### その他の showcase type

examples には次の specialized control も出ます。画面の意味を区別したい場合に使い、
不要なら `Input`、`Select`、`Button`、`Text`、`Paragraph` を優先します。

- `Checkbox`、`CheckboxGroup`、`RadioGroup`、`Switch`
- `Textarea`、`NumberInput`、`DateInput`、`DatePicker`、`TimeInput`
- `MultiSelect`、`FileInput`、`FileUpload`
- `Accordion`、`Disclosure`、`Popover`、`Tooltip`
- `Icon`、`Divider`

### Common Properties

| Property | 書き方 | 用途 |
| --- | --- | --- |
| `text` | `- text: Hello` | `Heading`、`Paragraph`、`Text`、`Banner`、`Toast` の表示文 |
| `label` | `- label: Sign in` | `Button`、`Input`、`Select`、`Checkbox`、`Link` などの control / link 名 |
| `value` | `- value: email` | field の値や data binding 名。表示 label ではない |
| `placeholder` | `- placeholder: name@example.com` | input の入力例 |
| `required` | `- required` | 入力欄を必須として表示する |
| `variant` | `- variant: primary` | priority。`primary`、`secondary`、`tertiary` |
| `tone` | `- tone: danger` | semantic intent。`neutral`、`info`、`success`、`warning`、`danger` |
| `action` | `- action: A-SubmitLogin` | 発火する action ID |
| `href` | `- href: /settings` | link 先 |
| `options` | `- options:` | choice control の選択肢 |
| `columns` / `sample rows` | `- columns:` / `- sample rows:` | table の構造と代表 row |
| `visible when` | `- visible when: error` | element が表示される state |
| `hidden when` | `- hidden when: loading` | element が非表示になる state |
| `disabled when` | `- disabled when: submitting` | control が disabled になる state |
| `loading when` | `- loading when: submitting` | loading feedback を出す state |
| `open when` | `- open when: dialog-open` | dialog、popover、accordion、disclosure が開く state |
| `placement` | `- placement: below E-HelpIcon` | tooltip、popover、menu の表示位置 |

入力値の検証ルールと error message は `## Field Validations` に書きます。`Input` element 直下の `constraints` や `error:` は現在の構文ではありません。

### Text、Label、Value

この3つは用途を分けます。

- `text`: read-only な表示文。新しい `Heading`、`Paragraph`、`Text`、`Banner`、
  `Toast` ではこれを使います。
- `label`: control や link の表示名。`Button`、`Input`、`Select`、`Checkbox`、
  `RadioGroup`、`Switch`、`Link` で使います。
- `value`: input 系 element の現在値、binding 名、sample value。表示 label ではありません。

`Heading` は `level` と `text` を使います。`label` は名前を持つ control と link にだけ使います。

### Message type

新しい source では `Message` を使わないでください。広すぎて、どの UI として見せたいのか
preview が判断しづらくなります。

- page / form 全体の feedback は `Banner`。
- inline の短い message は `Text`。
- 長めの説明文は `Paragraph`。
- action 後の一時的な feedback は `Toast`。

## 小さな例

```markdown
## Elements

### E-ErrorMessage Paragraph

- text: Email or password is incorrect.
- tone: danger

### E-CreateAccount Link

- label: Create account
- href: /signup
```

![Source Kind Metadata の elements preview](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## 注意点

- 見出しは `H1` や `H2` ではなく、`Heading` と `level: 1..6` で書きます。
- `variant` は priority です。色名ではありません。
- `tone` は意味です。raw color ではありません。
- CSS class、width、height、pixel value、raw color は primary DSL に書きません。
- button の click 処理は element に直接書き込まず、`action: A-*` で `## Actions` に接続します。
- `Text` は短い表示、`Paragraph` は文として読む説明に使います。

## 関連ページ

- [Sections](sections.md)
- [Actions](actions.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)
