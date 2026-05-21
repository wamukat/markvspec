---
title: "レイアウト"
---

Layout は画面内のまとまりと順序を表します。低レベルな CSS ではなく、group、方向、gap、items を使って意味のある構造を残します。

## 考え方

レイアウトセクションでは、画面をどの UI のまとまりとして読むかを表します。目的は pixel-perfect な配置指定ではなく、プレビュー、AI編集、レビューが理解できる画面の骨格を残すことです。

`L-*` の layout group は、フォーム、ヘッダー、リスト、詳細領域、メッセージ領域など、意味のある単位にします。`column`、`row`、`stack`、`grid` などの方向や並びを使い、`Items` で group の中にどの element や sub group が入るかを書きます。

## 最小例

```markdown
## Layout: mobile

### L-Form Login Form

- column
- gap: sm

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- "Submit": E-SignInButton
```

この例では、ログインフォームを 1 つのレイアウトグループとして定義し、フォーム内の順序を `Items` で固定しています。これだけでプレビューは「何がどの順で並ぶか」を表現できます。

![Responsive Profile の layout preview](../../assets/vscode-previews/responsive-profile-vscode-preview.png)

## よくある書き方

- layout group は `L-*` ID を使う。
- `Items` で label と element ID を対応させる。
- width、height、CSS class のような実装詳細は書かない。
- 画面の大きな領域から先に書く。例: `L-Page`、`L-Header`、`L-Main`、`L-Aside`。
- 入れ子が深くなりすぎる場合は、ユーザーが認識するまとまりだけを group にする。
- responsive の指定は CSS breakpoints ではなく、`mobile`、`desktop` などの layout intent として書く。
- 同じ element を複数 group に置かない。状態ごとの見せ分けが必要な場合は state 条件を説明する。

## 例: ページ構造を分ける

```markdown
## Layout: mobile

### L-Page Settings Page

- column
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

- column
- gap: sm

#### Items

- "Name": E-NameInput
- "Email": E-EmailInput
```

大きな `L-Page` から始め、header、content、message area に分けています。実装上の CSS grid や class 名ではなく、画面を読むための構造を残します。

## 次に読むもの

- [Elements](/markvspec/ja/guide/elements/)
- [States](/markvspec/ja/guide/states/)
- [Responsive Profile](/markvspec/examples/showcase/responsive-profile.html)
- [リファレンス](/markvspec/ja/reference/)
