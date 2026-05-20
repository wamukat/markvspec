# Layout

Layout は画面内のまとまりと順序を表します。低レベルな CSS ではなく、group、方向、gap、items を使って意味のある構造を残します。

## 最小例

```markdown
## Layout

### L-Form Login Form

- column
- gap: sm

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- "Submit": E-SignInButton
```

## 書き方

- layout group は `L-*` ID を使う。
- `Items` で label と element ID を対応させる。
- width、height、CSS class のような実装詳細は書かない。

## 関連 example

- [Responsive Profile](../../../examples/showcase/responsive-profile.html)

## 関連 reference

- [Reference](../reference/index.md)
