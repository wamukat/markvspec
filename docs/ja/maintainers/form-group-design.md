# FormGroup 設計

## 目的

`FormGroup` は、複数の入力要素と送信アクションを「フォームとして検証される意味単位」にまとめるための DSL です。
レイアウト ID を Validation の対象にすると、見た目のまとまりと入力検証の責務が混ざり、設計意図が読み取りにくくなります。
`FormGroup` はこの混在を避け、Validation、プレビュー、実装タスクが同じ意味単位を参照できるようにします。

## 採用する記法

`FormGroup` は画面上の要素ではなく、入力群の意味単位です。そのため `## Elements` ではなく、専用の
`## Form Groups` セクションで定義します。

```markdown
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin
```

- `F-*` を FormGroup ID とします。
- `fields` は入力に関係する `E-*` を列挙します。
- `submit` は主送信アクションの `A-*` を指定します。
- FormGroup には Layout との紐づけを書きません。表示・更新対象は `L-*`、検証対象は `F-*` で分けます。

Field Validation は 1 つの Element を対象にします。複数入力を 1 つのフォームとして検証する場合、
Cross-field Validation は FormGroup を対象にします。

```markdown
## Cross-field Validations

### V1:V-LoginForm Login form validation

- target: F-LoginForm
- run: client
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: E-EmailInput.value is present and E-PasswordInput.value is present
- message: Email and password are required.
```

## 診断ルール

Parser は `## Form Groups` を構造化して `formGroups` として返します。
Validator は次の診断を行います。

- `fields` に存在しない Element ID がある場合は error。
- `fields` に入力系ではない Element ID がある場合は warning。
- `submit` に存在しない Action ID がある場合は error。
- Field Validation の `target` は Element ID を正とします。
- Cross-field Validation の `target` は FormGroup ID を正とします。
- Validation の `trigger` は canonical ではありません。Action は暗黙の `V-*.result` 参照を消費します。
- Cross-field Validation の `target` に Layout ID が指定された場合は warning とし、FormGroup への移行を促します。

新 canonical syntax では Layout target は有効な検証対象ではありません。利用者には FormGroup を canonical として案内します。

`F-*` は Validation target 専用です。Action の update target、partial update target、layout item、DOM 更新先には使いません。
送信ボタンは `submit` で参照し、`fields` に含める必要はありません。

## プレビュー

プレビューでは `Form Groups` を状態・ビューポート配下ではなく、画面共通セクションとして 1 回だけ表示します。
表には FormGroup ID、fields、submit を表示します。

Cross-field Validations セクションでは `target: F-*` を FormGroup への参照として表示します。
入力フォーム仕様と Validation の対応が追えることを優先します。

## 移行対象

最初の移行対象は `examples/04-real-world-screens/login-basic.vspec.md` です。
現在の `V-LoginForm` は `target: L-LoginForm` になっているため、`F-LoginForm` を追加して
Validation target を差し替えます。

## 実装単位

1. Core types / parser / section order に `FormGroup` を追加する。
2. Validator に FormGroup 参照診断、field 診断、composite layout target warning を追加する。
3. Preview に `Form Groups` 表示と Validation target 参照を追加する。
4. 日本語 DSL と login example を更新する。
5. Core / Preview のテストを追加し、既存の layout target 例は FormGroup へ移行する。
