# Validation

Validation は入力条件とエラー表示を source に残すための書き方です。field の constraints と action の failure case を分けて書くと、仕様の抜けを見つけやすくなります。

## 最小例

```markdown
### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email

### R-EmailRequired Rule

- target: E-EmailInput
- message: Email is required
```

## 書き方

- field 単位の制約は element に近い場所へ置く。
- business rule は `R-*` として分ける。
- action failure case からエラー state や message area を更新する。

## 関連 example

- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)

## 関連 reference

- [Reference](../reference/index.md)
