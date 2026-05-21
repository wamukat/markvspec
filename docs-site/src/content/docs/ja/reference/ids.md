---
title: "ID"
---

ID は object を安定して参照するための名前です。表示 label や文言が変わっても、ID はできるだけ変えないようにします。

## 書ける構文

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
---

## Layout: mobile

### L-LoginForm Login form

#### Items

- E-EmailInput
- E-SignInButton

## Elements

### 5:E-SignInButton Button

- label: Sign in
- action: A-SubmitLogin

## Actions

### A1:A-SubmitLogin Submit login
```

## Prefixes

| Prefix | 対象 | 例 |
| --- | --- | --- |
| `SCR-*` | screen | `SCR-LOGIN` |
| `L-*` | layout group | `L-LoginForm` |
| `E-*` | element | `E-EmailInput` |
| `A-*` | action | `A-SubmitLogin` |
| `R-*` | rule | `R-CanSubmit` |

## Marker 付き heading

object heading には、プレビュー用 marker を ID の前に付けられます。

```markdown
### 5:E-SignInButton Button

### A1:A-SubmitLogin Submit login

### L1:L-LoginForm Login form
```

`:` より前がプレビューに表示される marker です。安定した ID は `:` より後ろです。
`Items`、`action`、`target`、`navigate` などの参照では、marker ではなく ID を使います。

プレビュー用 marker が不要な場合は、省略できます。

```markdown
### E-SignInButton Button
```

## 小さな例

```markdown
### 1:E-RememberMe Checkbox

- label: Remember me

### A1:A-ToggleRememberMe Toggle remember me

- Process P1: Toggle remembered state
  - state: idle
```

![Hello Screen の ID 付き preview](../../assets/vscode-previews/hello-screen-ids-vscode-preview.png)

## 注意点

- ID は参照用、`label` や `text` は表示用です。
- ID は大文字 prefix と意味のある名前で書きます。
- 同じファイル内で ID を重複させないでください。
- `Items`、`action`、`target`、`navigate` などは marker ではなく ID を参照します。
- screen を分割しても参照が壊れないよう、rename は慎重に行います。
- ID に raw route、CSS class、database primary key を混ぜないでください。

## 関連ページ

- [ファイル形式](/markvspec/ja/reference/file-format/)
- [Sections](/markvspec/ja/reference/sections/)
- [Elements](/markvspec/ja/reference/elements/)
- [Actions](/markvspec/ja/reference/actions/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
