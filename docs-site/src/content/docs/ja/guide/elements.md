---
title: "要素"
---

Elements は画面に出る UI 部品を意味で記述します。見た目の詳細より、種類、ラベル、値、優先度、意味、アクションなどを優先します。

## 考え方

Element は「画面に何があるか」と「ユーザーにとって何をする部品か」を表します。MarkVSpec はデザイントークンや CSS の置き場ではないため、色、フォントサイズ、class 名ではなく、Heading、Text、Input、Button、Banner、Toast、Link のような UI の役割を中心に書きます。

低忠実度プレビューでは、要素の種類、ラベル、値、優先度、意味、アクションが画面理解の手掛かりになります。Git diff でも、ボタンのラベルが変わった、アクションの接続先が変わった、エラーメッセージが追加された、といった意味のある変更が見えます。

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

この例では、見出しと主ボタンだけを書いています。`action` でボタンとアクションをつなぐと、画面上の操作と `Actions` セクションの処理を対応させられます。

## よくある書き方

- 見出しは `Heading` と `level: 1..6` を使う。
- 短いラベルや値は `Text` を使う。
- `variant` は優先度、`tone` は意味上の意図として使う。
- 入力項目は label、placeholder、type、initial value、width などの UI メタデータを element に置く。
- 検証ルールとエラーメッセージは `## Field Validations` に分ける。
- `Button` や `Link` には、必要に応じて `action: A-*` を付ける。
- warning、error、success などの意味は生の色指定ではなく `tone` で表す。
- `H1`、`H2` のような type は使わず、`Heading` と `level` で表す。

## 例: 入力とエラーバナー

```markdown
## Elements

### E-EmailInput Input

- label: Email
- placeholder: name@example.com
- type: email

### E-ErrorBanner Banner

- tone: danger
- text: Email address is required.
- visible when: auth-error

### E-SubmitButton Button

- label: Continue
- variant: primary
- action: A-Submit
```

入力欄のメタデータは `E-EmailInput` に置き、検証ルールは `## Field Validations` に分けます。エラーバナーは `tone: danger` と状態条件で表します。これによりプレビューでも仕様レビューでも、どの部品がどの状態で意味を持つかを確認できます。

![Source Kind Metadata の要素プレビュー](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## 次に読むもの

- [アクション](/markvspec/ja/guide/actions/)
- [バリデーション](/markvspec/ja/guide/validation/)
- [Source Kind Metadata](/markvspec/examples/showcase/source-kind-metadata.html)
- [リファレンス](/markvspec/ja/reference/)
