# Validation

Validation は入力条件とエラー表示を source に残すための書き方です。field の constraints と action の failure case を分けて書くと、仕様の抜けを見つけやすくなります。

## 考え方

Validation では、入力項目そのものの制約と、処理結果として起きるエラーを分けて書きます。required、format、minLength のような field constraint は element の近くに置くと読みやすくなります。一方で、重複 email、権限不足、在庫不足のような business rule は `R-*` rule や action case として分けると、API や業務仕様との対応が review しやすくなります。

エラーは制約だけでなく、表示方法まで書きます。どの state で、どの message area に、どの tone の message が出るかを残しておくと、VS Code preview と HTML/PDF export の両方で仕様を共有できます。

## 最小例

```markdown
## Elements

### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email

## Business Rules

### R-EmailRequired Rule

- target: E-EmailInput
- message: Email is required
```

この例では、field の基本制約を element に置き、review したい rule を `R-*` として分けています。最小の画面では element だけでも始められますが、複数 field や business rule が増えたら `Business Rules` を使うと見通しがよくなります。

## よくある書き方

- field 単位の制約は element に近い場所へ置く。
- business rule は `R-*` として分ける。
- action failure case からエラー state や message area を更新する。
- message はユーザーに表示する文言として書く。実装内部の error code だけにしない。
- 複数 field にまたがる rule は、対象 field を明示する。
- submit 前の client-side validation と submit 後の server-side validation を action case で区別する。
- error 表示用の element や message area を layout に含める。

## 例: server-side validation

```markdown
## Elements

### E-NameInput Input

- label: Name
- required

### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email

### E-FormMessage Message

- tone: danger
- visible when: input-error

## Business Rules

### R-UniqueEmail Rule

- target: E-EmailInput
- message: This email address is already used.

## Actions

### A-SubmitProfile Submit profile

- Triggered
  - E-SaveButton.click
- Process
  - HttpRequest
    - POST /profile
    - name: E-NameInput.value
    - email: E-EmailInput.value
- Cases
  - validation-error:
    - state: input-error
    - update:
      - target: E-FormMessage
      - content: Validation error summary
```

field の制約、業務 rule、submit 後の error case を分けると、仕様漏れを見つけやすくなります。特に AI に修正を依頼するときは、`R-UniqueEmail` や `A-SubmitProfile` のように ID で対象を指定できます。

## 次に読むもの

- [Elements](elements.md)
- [Actions](actions.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
- [Reference](../reference/index.md)
