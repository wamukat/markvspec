# Business Rules

`## Business Rules` は business rule や画面固有の判断条件を書く section です。入力形式の validation、tool が出す diagnostics、実装コードの if 文とは分けて扱います。

権限、account status、plan 制約、在庫、複数値を読んで決める業務判断など、product meaning によって決まる条件を書く場所です。required、format、min、max、単純な field 比較はここに置きません。そうした check は [Validations](validations.md) に書きます。

## 書ける構文

```markdown
## Business Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked.

### R-AccountRequiresMfa Account requires MFA

- when:
  - account.mfaRequired is true
  - device is not trusted
- effect: show E-MfaStep
- message: Additional verification is required.
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

![History And Errors の business rules preview](../../assets/vscode-previews/history-and-errors-vscode-preview.png)

## アクション結果ケース

action result が business rule violation の場合は、`business rule:` を
`case: business-rule-violation` の下に書きます。他の case 名で
`business rule:` を書くと、non-canonical な記述として診断されます。

```markdown
## Actions

### A-Submit Submit

- Process P1: Submit request
  - case: business-rule-violation
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - display:
      - target: E-EmailInput.error
      - message: R-EmailMustBeUnique.messages
```

## Validator Diagnostics との違い

Validator Diagnostics は parser / validator が source の不足や矛盾を見つけて出す tool output です。`## Business Rules` は author が画面仕様として書く判断条件です。

## 注意点

- field の必須、format、range は [Validations](validations.md) に書きます。
- 単純な複数 field 比較は [Validations](validations.md) の `## Cross-field Validations` に書きます。
- server response による error は [Actions](actions.md) の response `case:` と `display` に書きます。
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
