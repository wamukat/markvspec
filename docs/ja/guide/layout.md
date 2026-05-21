# Layout

Layout は画面内のまとまりと順序を表します。低レベルな CSS ではなく、group、方向、gap、items を使って意味のある構造を残します。

## 考え方

Layout section では、画面をどの UI のまとまりとして読むかを表します。目的は pixel-perfect な配置指定ではなく、preview、AI edit、review が理解できる画面の骨格を残すことです。

`L-*` の layout group は、フォーム、ヘッダー、リスト、詳細領域、メッセージ領域など、意味のある単位にします。縦に積む場合は `stack`、横に並べる場合は `row`、表形式に近い並びは `grid`、文中に近い並びは `inline` を使い、`Items` で group の中にどの element や sub group が入るかを書きます。

## 最小例

```markdown
## Layout: mobile

### L-Form Login Form

- stack
- gap: sm

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- "Submit": E-SignInButton
```

この例では、ログインフォームを 1 つの layout group として定義し、フォーム内の順序を `Items` で固定しています。これだけで preview は「何がどの順で並ぶか」を表現できます。

![Responsive Profile の layout preview](../../assets/vscode-previews/responsive-profile-vscode-preview.png)

## よくある書き方

- layout group は `L-*` ID を使う。
- `Items` で label と element ID を対応させる。
- 生の width / height / pixel 値や CSS class のような実装詳細は書かない。
- 画面の大きな領域から先に書く。例: `L-Page`、`L-Header`、`L-Main`、`L-Aside`。
- 入れ子が深くなりすぎる場合は、ユーザーが認識するまとまりだけを group にする。
- responsive の指定は CSS breakpoints ではなく、`mobile`、`desktop` などの layout intent として書く。
- 同じ element を複数 group に置かない。状態ごとの見せ分けが必要な場合は state 条件を説明する。

## 見た目だけを整える P-* パネル

`P-*` は presentation panel（表示調整パネル）です。ユーザーが意味を認識するまとまりではなく、
フォーム内の2項目を横並びにするなど、プレビュー上の見た目だけを整えたいときに使います。

```markdown
### L-ProfileForm Profile form

- stack

#### Items

- P-NameFields
- "Email": E-EmailInput

### P-NameFields Name fields

- row
- gap: sm

#### Items

- "First name": E-FirstNameInput
- "Last name": E-LastNameInput
```

`L-*` はレビュー対象になる意味のあるレイアウトです。`P-*` は枠やマーカーを出さず、
子要素の並びだけを調整します。表示条件、無効化、部分更新の差し替え先、アクションの
`target` が必要な場合は `P-*` ではなく `L-*` を使います。

[Presentation Panel](../../../examples/showcase/presentation-panel.html) で、
`P-NameFields` が余計な枠やレイアウトマーカーを出さずに2項目を並べる様子を確認できます。

## 例: ページ構造を分ける

```markdown
## Layout: mobile

### L-Page Settings Page

- stack
- gap: md

#### Items

- "Header": L-Header
- "Content": L-Content
- "Status": L-MessageArea

### L-Header Header

- row
- align: center

#### Items

- "Title": E-Title
- "Save": E-SaveButton

### L-Content Content

- stack
- gap: sm

#### Items

- "Name": E-NameInput
- "Email": E-EmailInput
```

大きな `L-Page` から始め、header、content、message area に分けています。実装上の CSS grid や class 名ではなく、画面を読むための構造を残します。

## 次に読むもの

- [Elements](elements.md)
- [States](states.md)
- [Responsive Profile](../../../examples/showcase/responsive-profile.html)
- [Reference](../reference/index.md)
