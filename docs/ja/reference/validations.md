# Validations

Validations は入力値の制約と error 表示を扱います。field validation は element の近くに書き、画面や業務の判断条件は [Business Rules](rules.md) に分けます。

## 書ける構文

```markdown
## Elements

### E-EmailInput Input

- label: Email
- value: email
- required
- constraints
  - format: email
  - maxLength: 255
- error:
  - required: Email is required.
  - format: Enter a valid email address.
```

### Common Constraints

| Constraint | 例 | 用途 |
| --- | --- | --- |
| `required` | `- required` | 空欄を許可しない |
| `format` | `- format: email` | email、url などの形式 |
| `minLength` | `- minLength: 8` | 最小文字数 |
| `maxLength` | `- maxLength: 255` | 最大文字数 |
| `min` | `- min: 1` | 数値や件数の下限 |
| `max` | `- max: 99` | 数値や件数の上限 |
| `pattern` | `- pattern: ^[A-Z0-9]+$` | domain 固有の入力形式 |

### Error Messages

error message は constraint と対応する形で書けます。

```markdown
- error:
  - required: Password is required.
  - minLength: Use at least 8 characters.
```

## 小さな例

```markdown
### E-QuantityInput Input

- label: Quantity
- value: quantity
- required
- constraints
  - min: 1
  - max: 10
- error:
  - min: Quantity must be at least 1.
  - max: Quantity must be 10 or less.
```

## 注意点

- validation は field の形式、必須、範囲などを扱います。
- `## Business Rules` は business rule や画面固有条件を扱います。
- validator diagnostics は tool output であり、source に書く validation 仕様とは別です。
- error 表示用の element がある場合は、`tone: danger` の `Paragraph` や `Text` として `## Elements` に書けます。
- server response による error 表示は `## Actions` の `Cases` と `update` で書くと、request との関係が明確になります。

## 関連ページ

- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
