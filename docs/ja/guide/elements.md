# Elements

Elements は画面に出る UI 部品を意味で記述します。見た目の詳細より、type、label、value、variant、tone、action などを優先します。

## 考え方

Element は「画面に何があるか」と「ユーザーにとって何をする部品か」を表します。MarkVSpec は design token や CSS の置き場ではないため、色、font size、class 名ではなく、Heading、Text、Input、Button、Message、Link のような UI の役割を中心に書きます。

低忠実度 preview では、element の type、label、value、variant、tone、action が画面理解の手掛かりになります。Git diff でも、button の label が変わった、action の接続先が変わった、error message が追加された、といった意味のある変更が見えます。

## 最小例

```markdown
## Elements

### E-Title Heading

- level: 1
- text: Sign in

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

この例では、見出しと primary button だけを書いています。`action` で button と action をつなぐと、画面上の操作と `Actions` section の処理を対応させられます。

## よくある書き方

- 見出しは `Heading` と `level: 1..6` を使う。
- 短い label や値は `Text` を使う。
- `variant` は priority、`tone` は semantic intent として使う。
- 入力項目は label、placeholder、required、constraints を element に近い場所へ置く。
- `Button` や `Link` には、必要に応じて `action: A-*` を付ける。
- warning、error、success などの意味は raw color ではなく `tone` で表す。
- `H1`、`H2` のような type は使わず、`Heading` と `level` で表す。

## 例: 入力とメッセージ

```markdown
## Elements

### E-EmailInput Input

- label: Email
- placeholder: name@example.com
- required
- constraints
  - format: email

### E-ErrorMessage Message

- tone: danger
- text: Email address is required.
- visible when: auth-error

### E-SubmitButton Button

- label: Continue
- variant: primary
- action: A-Submit
```

入力制約は `E-EmailInput` に近い場所へ置き、エラー表示は `tone: danger` と state 条件で表します。これにより preview でも仕様 review でも、どの部品がどの状態で意味を持つかを確認できます。

## 次に読むもの

- [Actions](actions.md)
- [Validation](validation.md)
- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)
- [Reference](../reference/index.md)
