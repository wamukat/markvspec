# Validations

Validations は入力値の検証契約と error 表示を扱います。入力欄そのものの metadata は `## Elements`、検証ルールと message は `## Field Validations`、画面や業務の判断条件は [Business Rules](rules.md) に分けます。

## 境界

| 判定対象 | 書く場所 |
| --- | --- |
| 入力欄の required 表示 | `Input` element の `required` または `input rule` |
| 入力欄の format、length、range、pattern metadata | `Input` element の `input rule`、または `NumberInput` の `min` / `max` / `step` |
| 検証ルールと user-visible な error message | `## Field Validations` |
| 複数 field の比較 | `## Cross-field Validations` |
| client 側の業務ルール | `## Business Rules` |
| server response で決まる field error | `## Actions` の `case:` と field error への `display` |
| 権限、在庫、契約状態などの業務判断 | `## Business Rules` と server response の `case:` |

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

### Error Messages

error message は `## Field Validations` の各 constraint に `message` として書きます。

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

![Single Field Validation の validation preview](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## 注意点

- `Input` element 直下の `constraints` と `error:` は現在の実装で扱う構文ではありません。
- validation は `V-*` として `## Field Validations` に書きます。
- 複数フィールドの検証は `F-*` のフォームグループを `target` にします。`L-*` のレイアウトを複合検証の対象にしません。
- `## Business Rules` は business rule や画面固有条件を扱います。
- validator diagnostics は tool output であり、source に書く validation 仕様とは別です。
- error 表示用の element がある場合は、`tone: danger` の `Paragraph` や `Text` として `## Elements` に書けます。
- server response による error 表示は `## Actions` の `case:` と `display` で書くと、request との関係が明確になります。
- user-visible な error text は `display` の `message` に書きます。既存 element や partial を表示する場合は `element` または `partial` を使います。

## 関連ページ

- [Guide: Validation](../guide/validation.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
