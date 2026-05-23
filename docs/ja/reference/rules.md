# Business Rules

`## Business Rules` は business rule や画面固有の判断条件を書く section です。入力形式の validation、tool が出す diagnostics、実装コードの if 文とは分けて扱います。

権限、account status、plan 制約、在庫、日付の関係、複数 field の関係など、product meaning によって決まる条件を書く場所です。required、format、min、max のような入力値そのものの形はここに置きません。

## 書ける構文

```markdown markvspec-fragment section=business-rules
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

```markdown markvspec-fragment section=business-rules
### R-PasswordPolicy Password policy
```

### Common Properties

<!-- markvspec-generated:reference-rules:start -->
この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。

#### Business Rule property

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | 出力対象 | - | Business Rule property。 |
| `description` | `canonical` | 出力対象 | - | Business Rule property。 |
| `when` | `canonical` | 出力対象 | - | Business Rule property。 |
| `effect` | `canonical` | 出力対象 | - | Business Rule property。 |
| `message` | `canonical` | 出力対象 | - | Business Rule property。 |
| `messages` | `canonical` | 出力対象 | - | Business Rule property。 |
| `appliesTo` | `canonical` | 出力対象 | - | Business Rule property。 |
| `priority` | `canonical` | 出力対象 | - | Business Rule property。 |

#### Error Code property

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | 出力対象 | - | Error Code property。 |
| `business rule` | `canonical` | 出力対象 | - | Error Code property。 |
| `target` | `canonical` | 出力対象 | - | Error Code property。 |
| `message` | `canonical` | 出力対象 | - | Error Code property。 |
| `display` | `canonical` | 出力対象 | - | Error Code property。 |
| `tone` | `canonical` | 出力対象 | - | Error Code property。 |
| `description` | `canonical` | 出力対象 | - | Error Code property。 |
<!-- markvspec-generated:reference-rules:end -->

## 小さな例

```markdown markvspec-fragment section=business-rules
### R-EmptyResult Empty search result

- when: search returns no items
- effect: show E-EmptyMessage
- message: No matching results.
```

![History And Errors の business rules preview](../../assets/vscode-previews/history-and-errors-vscode-preview.png)

## Action Result Cases

action result が business rule 違反を表す場合は、`business rule:` を
`case: business-rule-violation` の下に書きます。その他の case 名で
`business rule:` を使うと non-canonical として報告されます。

```markdown markvspec-skip reason=requires-rule-error-context
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
- 単純な複数 field の比較は、`## Cross-field Validations` として [Validations](validations.md) に書きます。
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
