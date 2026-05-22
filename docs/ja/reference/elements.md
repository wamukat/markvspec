# Elements

`## Elements` は UI element を意味で記述する section です。MarkVSpec では、見た目の実装詳細ではなく、element type、label、text、value、variant、tone、action などを書きます。

## 書ける構文

```markdown markvspec-skip reason=requires-action-definitions
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

```markdown markvspec-skip reason=requires-elements-context
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

<!-- markvspec-generated:reference-elements:start -->
この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `label` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `label src` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `placeholder src` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `description` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `help` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `help src` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `hint` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `message` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `message src` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `sample` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `source` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `purpose` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `text` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `value` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `src` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `format` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `initial value` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `required` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `readonly` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `optional` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `visible when` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `hidden when` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `disabled when` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `variant` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `tone` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `validation` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `input rule` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `error text` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `action` | `canonical` | 出力対象 | - | Element 共通 property。 |
| `action event` | `canonical` | 出力対象 | - | Element 共通 property。 |

Element type 固有の item property は以下の context で定義します。

| Context | Keys |
| --- | --- |
| `element.tab-item.property` | `panel`, `action`, `active when` |
| `element.accordion-item.property` | `panel`, `action`, `open when` |
| `element.action-menu-item.property` | `action`, `tone`, `disabled when` |
| `element.display-value-property` | `value`, `label`, `placeholder`, `text`, `message`, `hint`, `href`, `src`, `alt` |
| `element.display-value-metadata` | `kind`, `source`, `format` |
<!-- markvspec-generated:reference-elements:end -->

入力値の検証ルールと error message は `## Field Validations` に書きます。`Input` element 直下の `constraints` や `error:` は現在の構文ではありません。

### Element Source Metadata

Element source metadata は、表示される content がどこから来るかを説明する metadata
です。preview、export、生成される Display Content Spec のための説明であり、
低レベルの binding code ではありません。

source metadata を書く場所は2つあります。

- Element-level `source`: その element の fallback source type です。display
  property に nested `kind` がない場合に使われます。
- Nested display value metadata: `value`、`label`、`placeholder`、`text`、
  `message`、`hint`、`href`、`src`、`alt` などの display value property の下に
  `kind`、`source`、`format` を付けます。

source type は次を使います。

| Type | 意味 |
| --- | --- |
| `fixed` | spec に直接書いた literal な text / value。source が未指定の場合の default です。 |
| `i18n` | 翻訳される UI copy または translation key。 |
| `data` | application / model data。preview に表示値が必要な場合は `sample` または `## Preview Scenarios` を使います。 |
| `route` | route、path parameter、query parameter。 |
| `element` | `E-EmailInput.value` のように別 element から導かれる値。 |
| `asset` | image、file、asset catalog entry。 |
| `external` | 外部 URL、service、content source。 |
| `computed` | 派生値または formatted value。`source` と、必要に応じて `format` を併用します。 |

```markdown markvspec-fragment section=elements
### E-DisplayName Text

- label: Display name
  - kind: i18n
- value: Morgan Lee
  - kind: data
  - source: ${data.member.displayName}

### E-EmailInput Input

- label: Email
- value: morgan@example.com
  - kind: data
  - source: ${data.member.email}

### E-ConfirmEmail Text

- value: E-EmailInput.value
  - kind: element
  - source: E-EmailInput.value

### E-Subtotal Text

- value: USD 128.40
  - kind: computed
  - source: ${data.invoice.subtotalCents}
  - format: currency USD
```

element level に `source: data` を書くと、preview rendering は `sample` または
`## Preview Scenarios` から代表値を表示できます。Display Content Spec の各 row では
nested metadata が優先されるため、1つの element の中で `label` は `i18n`、`value` は
`data`、`src` は `asset` のように混在できます。

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

```markdown markvspec-fragment section=screen
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
