# 要素

`## Elements` は UI 要素を意味で記述するセクションです。MarkVSpec では、見た目の実装詳細ではなく、要素の種類、ラベル、文言、値、優先度、意味、アクションなどを書きます。

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

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

### 要素見出し

要素は `### E-* Name Type` で宣言します。プレビューにマーカーを出したい場合は
`### marker:E-* Name Type` と書きます。

```markdown
### E-HelpText Paragraph

### 3:E-HelpText Paragraph
```

- `E-*` は安定した ID。
- `3` は任意のプレビュー用マーカー。
- `HelpText` は人が読む対象名。
- `Paragraph` は要素の種類。

### 主な種類

| 種類 | 用途 |
| --- | --- |
| `Heading` | 画面やセクションの見出し。`level: 1..6` を必ず併用します。 |
| `Paragraph` | 説明文、長めの文章。 |
| `Text` | 短いラベル、値、補足表示。 |
| `Input` | text/email/password/search などの入力。 |
| `Button` | アクションを発火する操作。 |
| `Link` | 別画面や外部 URL への移動。 |
| `Image` | 意味のある画像やアバター。 |
| `List` | 繰り返し項目やメニュー。 |
| `Spinner` | 処理中状態の読み込み表示。 |
| `Banner` | エラー、警告、成功、情報などのページ / セクションメッセージ。 |
| `Badge` | 状態、役割、カテゴリの短いラベル。 |
| `Table` | 行 / 列を持つ構造化された一覧。 |
| `Select` | 選択肢から1つ選ぶ入力。 |
| `Dialog` | 確認や中断を伴うモーダル。 |
| `Toast` | アクション後に一時的に出すフィードバック。 |
| `Tabs` | 1画面内で排他的に切り替えるパネル。 |
| `ActionMenu` | 行や項目に紐づく文脈メニュー。 |

### その他のサンプルで使う種類

examples には次の専用コントロールも出ます。画面の意味を区別したい場合に使い、
不要なら `Input`、`Select`、`Button`、`Text`、`Paragraph` を優先します。

- `Checkbox`、`CheckboxGroup`、`RadioGroup`、`Switch`
- `Textarea`、`NumberInput`、`DateInput`、`DatePicker`、`TimeInput`
- `MultiSelect`、`FileInput`、`FileUpload`
- `Accordion`、`Disclosure`、`Popover`、`Tooltip`
- `Icon`、`Divider`

### 主な項目

| 項目 | 書き方 | 用途 |
| --- | --- | --- |
| `text` | `- text: Hello` | `Heading`、`Paragraph`、`Text`、`Banner`、`Toast` の表示文 |
| `label` | `- label: Sign in` | `Button`、`Input`、`Select`、`Checkbox`、`Link` などのコントロール / リンク名 |
| `value` | `- value: email` | フィールドの値やデータバインド名。表示ラベルではない |
| `placeholder` | `- placeholder: name@example.com` | 入力例 |
| `required` | `- required` | 入力欄を必須として表示する |
| `variant` | `- variant: primary` | 優先度。`primary`、`secondary`、`tertiary` |
| `tone` | `- tone: danger` | 意味上の意図。`neutral`、`info`、`success`、`warning`、`danger` |
| `width` | `- width: medium` | 入力系、選択系、ファイル系要素の幅。`short`、`medium`、`long`、`full` |
| `size` | `- size: small` | `Button` のサイズ。`small`、`medium`、`large` |
| `action` | `- action: A-SubmitLogin` | 発火するアクション ID |
| `href` | `- href: /settings` | リンク先 |
| `options` | `- options:` | 選択肢 |
| `columns` / `sample rows` | `- columns:` / `- sample rows:` | テーブルの構造と代表行 |
| `visible when` | `- visible when: error` | 要素が表示される状態 |
| `hidden when` | `- hidden when: loading` | 要素が非表示になる状態 |
| `disabled when` | `- disabled when: submitting` | コントロールが無効になる状態 |
| `open when` | `- open when: menu-open` | `Disclosure` / `ActionMenu` が開く状態 |
| `placement` | `- placement: bottom-start` | `Tooltip`、`Popover`、`ActionMenu`、`Toast` の表示位置 |

`Accordion` の開閉条件は、要素直下ではなく `items` の各項目に `open when` を書きます。
`Dialog` や `Popover` の状態ごとの表示は `visible when` / `hidden when` で表します。
`loading when` は現在の Elements 構文ではありません。

入力値の検証ルールとエラーメッセージは `## Field Validations` に書きます。`Input` 要素直下の `constraints` や `error:` は現在の構文ではありません。

### Text、Label、Value

この3つは用途を分けます。

- `text`: 読み取り専用の表示文。新しい `Heading`、`Paragraph`、`Text`、`Banner`、
  `Toast` ではこれを使います。
- `label`: コントロールやリンクの表示名。`Button`、`Input`、`Select`、`Checkbox`、
  `RadioGroup`、`Switch`、`Link` で使います。
- `value`: 入力系要素の現在値、バインド名、サンプル値。表示ラベルではありません。

`Heading` は `level` と `text` を使います。`label` は名前を持つコントロールとリンクにだけ使います。

### Message 型

新しいソースでは `Message` を使わないでください。広すぎて、どの UI として見せたいのか
プレビューが判断しづらくなります。

- ページ / フォーム全体のフィードバックは `Banner`。
- インラインの短いメッセージは `Text`。
- 長めの説明文は `Paragraph`。
- アクション後の一時的なフィードバックは `Toast`。

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

![Source Kind Metadata の要素プレビュー](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## 注意点

- 見出しは `H1` や `H2` ではなく、`Heading` と `level: 1..6` で書きます。
- `variant` は優先度です。色名ではありません。
- `tone` は意味です。生の色指定ではありません。
- CSS class、height、pixel value、生の色指定は主要 DSL に書きません。
- ボタンの click 処理は要素に直接書き込まず、`action: A-*` で `## Actions` に接続します。
- `Text` は短い表示、`Paragraph` は文として読む説明に使います。

## 関連ページ

- [セクション](./sections.md)
- [アクション](./actions.md)
- [バリデーション](./validations.md)
- [ID](./ids.md)
- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)
