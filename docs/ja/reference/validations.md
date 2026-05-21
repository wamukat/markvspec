# バリデーション

Validations は入力値の検証契約とエラー表示を扱います。入力欄そのもののメタデータは `## Elements`、検証ルールとメッセージは `## Field Validations`、画面や業務の判断条件は [ビジネスルール](./rules.md) に分けます。

## 境界

| 判定対象 | 書く場所 |
| --- | --- |
| 入力欄の required 表示 | `Input` 要素の `required` または `input rule` |
| 入力欄の形式、長さ、範囲、パターンのメタデータ | `Input` 要素の `input rule`、または `NumberInput` の `min` / `max` / `step` |
| 検証ルールとユーザーに見せるエラーメッセージ | `## Field Validations` |
| 複数フィールドの比較 | `## Cross-field Validations` |
| クライアント側の業務ルール | `## Business Rules` |
| サーバー応答で決まるフィールドエラー | `## Actions` の `case:` とフィールドエラーへの `display` |
| 権限、在庫、契約状態などの業務判断 | `## Business Rules` とサーバー応答の `case:` |

## 書ける構文

```markdown
## Elements

### E-EmailInput Input

- label: Email
- value: email
- type: email
- input rule:
  - type: email

## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
  - email:
    - message: Enter a valid email address.
```

### よく使う制約名

`constraints` の下には検証名を書きます。現在の実装は検証名を固定リストに限定していませんが、以下の名前を使うと入力メタデータやプレビューと対応づけて読みやすくなります。

| 制約名 | 例 | 用途 |
| --- | --- | --- |
| `required` | `- required:` | 空欄を許可しない |
| `email` | `- email:` | email 形式 |
| `length: element` | `- length: element` | `input rule` の `min length` / `max length` を検証に使う |
| `range: element` | `- range: element` | `NumberInput` の `min` / `max` / `step` を検証に使う |
| `pattern` | `- pattern:` | domain 固有の入力形式 |

### 複数フィールドの検証

複数フィールドを見る検証は、対象フィールドを `## Form Groups` でまとめ、`## Cross-field Validations` から参照します。

```markdown
## Form Groups

### F-PasswordForm Password form

- fields:
  - E-PasswordInput
  - E-PasswordConfirmInput

## Cross-field Validations

### V-PasswordConfirmation Password confirmation

- target: F-PasswordForm
- inputs:
  - E-PasswordInput
  - E-PasswordConfirmInput
- check: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password and confirmation must match.
```

`scope` は書きません。`## Field Validations` と `## Cross-field Validations` のどちらに置くかで決まります。`run` も通常は書きません。現行実装で認識する実行場所は `client` だけです。

### エラーメッセージ

エラーメッセージは `## Field Validations` の各制約に `message` として書きます。

```markdown
- constraints:
  - required:
    - message: Password is required.
  - length: element
    - message: Use at least 8 characters.
```

## 小さな例

```markdown
### E-QuantityInput Input

- label: Quantity
- value: quantity
- input rule:
  - required

### E-AgeInput NumberInput

- label: Age
- min: 13
- max: 120

## Field Validations

### V-QuantityRules Quantity rules

- target: E-QuantityInput
- constraints:
  - required:
    - message: Quantity is required.

### V-AgeRange Age range

- target: E-AgeInput
- constraints:
  - range: element
    - message: Age must be between 13 and 120.
```

![Single Field Validation のバリデーションプレビュー](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## 注意点

- `Input` 要素直下の `constraints` と `error:` は現在の実装で扱う構文ではありません。
- バリデーションは `V-*` として `## Field Validations` に書きます。
- 複数フィールドの検証は `F-*` のフォームグループを `target` にします。`L-*` のレイアウトを複合検証の対象にしません。
- `## Business Rules` はビジネスルールや画面固有条件を扱います。
- バリデーション診断はツール出力であり、ソースに書くバリデーション仕様とは別です。
- エラー表示用の要素がある場合は、`tone: danger` の `Paragraph` や `Text` として `## Elements` に書けます。
- サーバー応答によるエラー表示は `## Actions` の `case:` と `display` で書くと、リクエストとの関係が明確になります。
- ユーザーに見えるエラー文は `display` の `message` に書きます。既存要素や partial を表示する場合は `element` または `partial` を使います。

## 関連ページ

- [ガイド: バリデーション](../guide/validation.md)
- [要素](./elements.md)
- [アクション](./actions.md)
- [ビジネスルール](./rules.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
