# Elements

## 目的

`## Elements` は UI element を意味で記述します。見た目の実装詳細ではなく、type、label、value、variant、tone、action を書きます。

## 例

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

## 原則

- 見出しは `Heading` と `level: 1..6` を使う。
- `variant` は priority、`tone` は semantic intent。
- raw color、CSS class、width、height は書かない。

## 関連 example

- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)

## 旧文書

- [DSL リファレンス](../user/dsl.md)
