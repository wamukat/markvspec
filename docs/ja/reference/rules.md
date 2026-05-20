# Rules

## 目的

`## Rules` は business rule や画面固有の判断条件を記述する section です。入力形式の validation と混同しないようにします。

## 例

```markdown
## Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked
```

## Validator Diagnostics との違い

`## Rules` は仕様として作者が書く内容です。validator diagnostics は parser / validator が source の不足や矛盾を見つけて出す tool output です。

## 関連 example

- [Account Settings](../../../examples/showcase/history-and-errors.html)

## 旧文書

- [DSL リファレンス](../user/dsl.md)
