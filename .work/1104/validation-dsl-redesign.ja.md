# 1104 Validation DSL redesign

## 目的

YAVI の validation model を参考にしつつ、MarkVSpec の authoring syntax を単項目検証と複合項目検証に分けて整理する。
このメモは parser / validator / preview 実装チケットへ分解できる粒度の canonical syntax を定義する。

## YAVI から取り込む考え方

YAVI 0.9.1 は field constraint、conditional validation、group validation、cross-field validation を持つ。MarkVSpec では初期設計として以下だけを取り込む。

- field に対する constraint chain
- 複数 field をまたぐ cross-field validation
- validation result を Action が受け取り、invalid case で表示する流れ

以下は初期構文に入れない。

- conditional validation の構造化式
- group validation
- fail-fast / applicative validation の実行制御
- constraint ごとの message key / code の詳細分類

## Canonical sections

旧 `## Validations` は廃止し、author は以下の 2 section を使う。

- `## Field Validations`
- `## Cross-field Validations`

`scope:` は author が書かない。section 名から自動分類する。

## Field Validations

単一 input element に閉じる検証を定義する。

```markdown
## Field Validations

### V1:V-EmailRules Email rules

- target: E-EmailInput
- run: client
- constraints:
  - required
    - message: Email is required.
  - email
    - message: Enter a valid email address.
  - length: element
    - message: Email length must follow the input specification.
```

### Rules

- `target` は `E-*` を 1 つ指定する。
- `run` は validation 定義単位で指定し、初期値は `client`。
- 初期対応する `run` は `client` のみ。
- `required` が canonical。`not-null`、`not-empty`、`not-blank` は authoring syntax として採用しない。
- `constraints` は constraint 名を bullet とし、必要な場合だけその下に `message` を持つ。
- `### V1:V-EmailRules` の `V1:` のような heading marker がなければ warning。
- preview marker は heading marker を使う。marker がなければ validation ID を fallback label として使う。
- heading marker は表示用 label であり、参照 ID ではない。参照には `V-EmailRules.result` のような `V-*` ID を使う。

## Cross-field Validations

複数 input または form 全体で成立する検証を定義する。

```markdown
## Cross-field Validations

### V2:V-PasswordConfirmation Password confirmation

- target: F-AccountForm
- run: client
- inputs:
  - E-PasswordInput
  - E-PasswordConfirmInput
- check: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password and confirmation must match.
```

### Rules

- `target` は原則 `F-*`。form ではなく画面全体の文脈なら `SCR-*` も将来検討に残すが、初期実装では `F-*` を優先する。
- `inputs` は検証に関係する `E-*` を列挙する。
- `check` は人間が読む検証条件であり、初期実装では式評価しない。
- `when:` は任意の補足条件として許可するが、人間可読 text として扱う。構造化 expression ではない。
- `condition:` と `group:` は採用しない。

## Element input spec との関係

Element の input specification は入力 UI の制約を表す。Validation は product-level の検証契約を表す。

- type / pattern / min / max / min length / max length などは Element に残せる。
- `required` の意図は Validation 側が canonical。
- Validation で Element 制約を再利用する場合は `length: element` または `range: element` と書く。
- `length: element` は対象 Element の min length / max length を参照する。
- `range: element` は対象 Element の min / max を参照する。
- 対象 Element に必要な制約がなければ warning。screen preview には fallback message を出さない。
- `type: element` と `pattern: element` は初期 canonical syntax には入れない。必要なら後続で追加する。

## Action からの利用

Validation はいつ実行されるかを自分では持たない。Action の Process が validation result を受け取り、case ごとに Effects を持つ。

```markdown
### A-SubmitAccount Submit account

- Triggered
  - E-SubmitButton.click
- From
  - editing
- Process P1: Check validation
  - receive:
    - validation: V-EmailRules.result
    - validation: V-PasswordConfirmation.result
  - case: invalid
    - Effects
      - display:
        - target: L-MessageArea
        - message: V-EmailRules.messages
        - message: V-PasswordConfirmation.messages
    - stop
  - case: valid
    - continue
- Process P2: Send request
  - POST /account
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
  - case: success
    - Effects
      - state: saved
  - case: failure
    - Effects
      - display:
        - target: L-MessageArea
        - message: Server rejected the request.
```

### display.message

- `display.message` は `V-*.messages` を参照できる。
- `V-*.messages` は validation 定義に含まれる message 群をまとめて受け取る opaque source。
- constraint-specific な参照は初期対応しない。
- `display.message` が message を持たない validation を参照した場合は warning。fallback text は表示しない。
- `attach` は Validation 定義には書かない。表示先は Action の `Effects display.target` で指定する。

## Preview

Generated design document は validation contract を以下に分けて表示する。

- Client Field Validations
- Client Cross-field Validations

`run` が `client` 以外の場合、初期実装では unsupported warning を出し、preview group には入れない。

FormGroup を target にした Cross-field Validation は、form aggregation として target form の下にまとめて表示する。
Field Validation は target Element の input form spec と対応しやすいよう、Element ID と validation marker を併記する。

## Migration examples

### single-field-validation

旧:

```markdown
## Validations

### V-UsernameRules Username rules

- target: E-UsernameInput
- rules:
  - required:
    - E-UsernameInput
  - min-length:
    - E-UsernameInput
  - max-length:
    - E-UsernameInput
  - pattern:
    - E-UsernameInput
- scope: field
- run: client
- message: Username must be 3 to 40 lowercase letters, numbers, or hyphens.

### V-EmailRules Email rules

- target: E-EmailInput
- rules:
  - required:
    - E-EmailInput
  - email:
    - E-EmailInput
- scope: field
- run: client
- message: Enter a valid email address.

### V-AgeRange Age range

- target: E-AgeInput
- rules:
  - min:
    - E-AgeInput
  - max:
    - E-AgeInput
- scope: field
- run: client
- message: Age must be between 13 and 120.
```

新:

```markdown
## Field Validations

### V1:V-UsernameRules Username rules

- target: E-UsernameInput
- run: client
- constraints:
  - required
    - message: Username is required.
  - length: element
    - message: Username must be 3 to 40 characters.
  - pattern
    - message: Username must use lowercase letters, numbers, or hyphens.

### V2:V-EmailRules Email rules

- target: E-EmailInput
- run: client
- constraints:
  - required
    - message: Email is required.
  - email
    - message: Enter a valid email address.

### V3:V-AgeRange Age range

- target: E-AgeInput
- run: client
- constraints:
  - range: element
    - message: Age must be between 13 and 120.
```

### form-submit-flow

旧:

```markdown
## Validations

### V-SubmitRequest Required subscription email

- target: E-EmailInput
- rules:
  - required:
    - E-EmailInput
- scope: field
- run: client
- message: Email is required before submitting the subscription request.
```

新:

```markdown
## Field Validations

### V1:V-SubmitRequest Required subscription email

- target: E-EmailInput
- run: client
- constraints:
  - required
    - message: Email is required before submitting the subscription request.
```

## Implementation decomposition

1. Parser / AST
   - `## Field Validations` と `## Cross-field Validations` を recognized section に追加する。
   - 旧 `## Validations` は互換維持しない。
   - `constraints`、`inputs`、`check`、`when` を structured field として読む。
2. Validator
   - section による field / cross-field 自動分類を行う。
   - `scope:`、`condition:`、`group:`、Validation 定義上の `attach` を warning または error にする。
   - `run` は `client` のみ許可し、それ以外は unsupported warning にする。
   - `V-*` marker missing warning を出す。
   - `length: element` / `range: element` の参照先 Element 制約 missing warning を出す。
   - `display.message` の `V-*.messages` 参照を検証し、message がなければ warning を出す。
3. Renderer / preview
   - Client Field / Client Cross-field の 2 group を表示する。
   - `F-*` target の Cross-field Validation を form aggregation に表示する。
   - Action Details の `display.message` に `V-*.messages` を source として表示する。
4. Examples
   - `examples/03-actions/single-field-validation.vspec.md` を Field Validations の最小例にする。
   - `examples/03-actions/form-submit-flow.vspec.md` を Cross-field Validation と Action invalid case の例にする。
   - 他 examples の旧 `## Validations` を新 section へ移行する。
