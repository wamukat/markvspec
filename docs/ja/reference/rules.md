# Business Rules

`## Business Rules` は business rule や画面固有の判断条件を書く section です。入力形式の validation、tool が出す diagnostics、実装コードの if 文とは分けて扱います。

## 書ける構文

```markdown
## Business Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked.

### R-CanSubmit Can submit login

- when:
  - E-EmailInput.value is present
  - E-PasswordInput.value is present
- effect: enable E-SignInButton
```

### Rule Heading

Rule は `### R-* Name` の形で宣言します。

```markdown
### R-PasswordPolicy Password policy
```

### Common Properties

| Property | 用途 |
| --- | --- |
| `when` | 条件。単一行または nested bullet で書く |
| `effect` | 条件が満たされたときの画面上の影響 |
| `message` | 利用者に見せる説明や error |
| `appliesTo` | 対象 element、layout、action |
| `priority` | rule が複数ある場合の優先度 |

## 小さな例

```markdown
### R-EmptyResult Empty search result

- when: search returns no items
- effect: show E-EmptyMessage
- message: No matching results.
```

## Validator Diagnostics との違い

Validator Diagnostics は parser / validator が source の不足や矛盾を見つけて出す tool output です。`## Business Rules` は author が画面仕様として書く判断条件です。

## 注意点

- field の必須や format は [Validations](validations.md) に書きます。
- action の request/response 分岐は [Actions](actions.md) の `case:` に書きます。
- `## Business Rules` は人が読む仕様です。Validator Diagnostics の出力先ではありません。
- rule から element や action を参照するときは `E-*`、`A-*` などの stable ID を使います。
- CSS や implementation branch の詳細ではなく、画面仕様として意味のある条件を書きます。

## 関連ページ

- [Actions](actions.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Limitations](limitations.md)
- [Account Settings](../../../examples/showcase/history-and-errors.html)
