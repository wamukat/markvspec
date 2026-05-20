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
- required
- constraints
  - format: email

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

### Common Properties

| Property | 書き方 | 用途 |
| --- | --- | --- |
| `label` | `- label: Sign in` | control の表示名 |
| `text` | `- text: Hello` | prose または短い表示文 |
| `value` | `- value: email` | field の値や data binding 名 |
| `placeholder` | `- placeholder: name@example.com` | input の入力例 |
| `required` | `- required` | 必須入力 |
| `variant` | `- variant: primary` | priority。`primary`、`secondary`、`tertiary` |
| `tone` | `- tone: danger` | semantic intent。`neutral`、`info`、`success`、`warning`、`danger` |
| `action` | `- action: A-SubmitLogin` | 発火する action ID |

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
