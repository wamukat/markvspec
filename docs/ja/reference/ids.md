# IDs

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

### E-SignInButton Button

- label: Sign in
- action: A-SubmitLogin

## Actions

### A-SubmitLogin Submit login
```

## Prefixes

| Prefix | 対象 | 例 |
| --- | --- | --- |
| `SCR-*` | screen | `SCR-LOGIN` |
| `L-*` | layout group | `L-LoginForm` |
| `E-*` | element | `E-EmailInput` |
| `A-*` | action | `A-SubmitLogin` |
| `R-*` | rule | `R-CanSubmit` |

## 小さな例

```markdown
### E-RememberMe Checkbox

- label: Remember me

### A-ToggleRememberMe Toggle remember me

- Process P1: Toggle remembered state
  - state: idle
```

![Hello Screen の ID 付き preview](../../assets/previews/hello-screen-showcase.png)

## 注意点

- ID は参照用、`label` や `text` は表示用です。
- ID は大文字 prefix と意味のある名前で書きます。
- 同じ file 内で ID を重複させないでください。
- `Items`、`action`、`target`、`navigate` などは ID を参照します。
- screen を分割しても参照が壊れないよう、rename は慎重に行います。
- ID に raw route、CSS class、database primary key を混ぜないでください。

## 関連ページ

- [File Format](file-format.md)
- [Sections](sections.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
