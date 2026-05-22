# バリデーション

バリデーションは「入力を受け付けてよいか」と「エラーをどう見せるか」を書くための章です。

まず、判定場所と対象を分けて考えます。

## 6つに分ける

| 種類 | 例 | 書く場所 |
| --- | --- | --- |
| クライアント単項目チェック | 必須、email形式、文字数、数値範囲 | `## Field Validations` |
| 入力欄のメタデータ | type、placeholder、min/max、HTML入力制約のヒント | `## Elements` の入力 |
| クライアント複合項目チェック | password確認、開始日 <= 終了日 | `## Cross-field Validations` |
| 送信前の判断 | 送信前のプラン制約、画面単位の条件判定 | `## Business Rules` または送信前 action |
| サーバ単項目チェック | email重複、商品コード不存在 | `## Actions` の応答ケースと対象フィールド |
| サーバ複合項目チェック | 在庫不足、権限不足、契約状態による不可 | `## Actions` の応答ケースと `## Business Rules` |

Business Rule は、入力形式そのものや単純なフィールド比較ではなく、画面や業務の判断条件を表します。

## クライアント単項目チェック

入力自体に閉じる条件は `## Field Validations` に書きます。入力欄側には label、type、placeholder、min/max などの UI メタデータだけを置きます。

```markdown markvspec-fragment section=screen
## Elements

### E-EmailInput Input

- label: Email
- type: email
- placeholder: user@example.com
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

プレビューやレビューでは、入力欄のメタデータと検証ルールが別々に読めます。`Element` は UI、`Validation` は判定とメッセージです。

![Single Field Validation のプレビュー](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## クライアント複合項目チェック

複数フィールドを見る条件は、単一要素に押し込まず、ルールとして分けます。

```markdown markvspec-skip reason=requires-validation-context
## Form Groups

### F-PasswordForm Password form

- fields:
  - E-PasswordInput
  - E-PasswordConfirmInput

## Cross-field Validations

### V-PasswordMatches Password matches

- target: F-PasswordForm
- inputs:
  - E-PasswordInput
  - E-PasswordConfirmInput
- check: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password confirmation does not match.
```

「どのフィールドを見て、どこへ表示するか」を明示すると、仕様レビューでバリデーションの判断と表示位置を確認できます。

## サーバ単項目チェック

サーバーに送って初めて分かるフィールドエラーは、リクエストの応答ケースとして書きます。

```markdown markvspec-skip reason=requires-validation-context
## Elements

### E-EmailInput Input

- label: Email
- type: email
- input rule:
  - type: email

### E-EmailError Text

- tone: danger
- visible when: input-error

## Actions

### A-SubmitProfile Submit profile

- Process P1: Submit profile
  - request:
    - POST /profile
    - params:
      - email: E-EmailInput.value
  - case: email-duplicated
    - state: input-error
    - display:
      - target: E-EmailError
      - message: This email address is already used.
```

これは `format: email` とは別物です。email の形式はクライアントで見られますが、重複はサーバー応答で決まります。

## サーバ複合項目チェック

在庫、権限、契約状態、予約枠の空きなど、複数条件で決まるものは応答ケースとビジネスルールを対応させます。

```markdown markvspec-skip reason=requires-rule-error-context
## Business Rules

### R-PlanAllowsExport Plan allows export

- when: current plan does not allow PDF export
- appliesTo: A-ExportPdf
- message: Your current plan cannot export PDF.

## Actions

### A-ExportPdf Export PDF

- Process P1: Request PDF export
  - request:
    - POST /exports/pdf
  - case: plan-not-allowed
    - state: export-error
    - display:
      - target: E-ExportMessage
      - message: Your current plan cannot export PDF.
```

Business Rule は「なぜ不可なのか」を説明し、アクションのケースは「その結果、画面で何が起きるか」を書きます。

## エラー表示を書く

バリデーションは判定だけでは不十分です。ユーザーに見える表示先も書きます。

- フィールドの直下に出す: `E-EmailError`
- フォーム全体に出す: `E-FormMessage`
- アクション結果として出す: `display` で target と message を指定する
- エラー状態を持つ: `state: input-error` や `state: submit-error`

表示用要素は `tone: danger` の `Text` や `Paragraph` として `## Elements` に置きます。

## 迷ったとき

- 1つのフィールドだけで判定できるなら `## Field Validations`。
- 複数フィールドを比較するなら `## Cross-field Validations`。
- 業務条件を見るなら `## Business Rules`。
- サーバー応答で決まるなら `## Actions` の `case:`。
- ユーザーに何を見せるかは `display` とエラー要素で書く。
- レビューでエラーケースをプレビューしたいなら、該当する `case:` を指す [シナリオ](./scenarios.md) を追加する。

## 次に読むもの

- [要素](./elements.md)
- [アクション](./actions.md)
- [シナリオ](./scenarios.md)
- [ビジネスルール](../reference/rules.md)
- [バリデーションリファレンス](../reference/validations.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
