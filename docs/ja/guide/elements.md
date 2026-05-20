# Elements

Elements は画面に出る UI 部品を意味で記述します。見た目の詳細より、type、label、value、variant、tone、action などを優先します。

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

## 書き方

- 見出しは `Heading` と `level: 1..6` を使う。
- 短い label や値は `Text` を使う。
- `variant` は priority、`tone` は semantic intent として使う。

## 関連 example

- [Source Kind Metadata](../../../examples/showcase/source-kind-metadata.html)

## 関連 reference

- [Reference](../reference/index.md)
