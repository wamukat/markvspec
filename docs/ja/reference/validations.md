# Validations

## 目的

Validations は入力値の制約とエラー表示を扱います。field validation は element や input constraint に近い場所で説明し、business rule とは分けます。

## 例

```markdown
### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email
```

## Rules との違い

Validation は入力項目の形式、必須、範囲などを扱います。`## Rules` は画面や業務の判断条件を扱います。validator diagnostics は tool が source を検査して出す結果であり、`## Rules` そのものではありません。

## 関連 example

- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)

## 旧文書

- [DSL リファレンス](../user/dsl.md)
