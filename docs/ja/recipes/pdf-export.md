# PDF Export

## 目的

`.vspec.md` を HTML / PDF として出力し、レビューや共有に使える成果物を作ります。

## 完成イメージ

source は Git で管理し、HTML はブラウザ確認用、PDF は配布用として出力します。

## 最小 command

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## 関連 example

- [Hello Screen](../../../examples/showcase/hello-screen.html)

## 関連 reference

- [Export Start](../start/export.md)
- [Reference](../reference/index.md)

## 確認方法

- HTML export が `hello-screen.html` を作る。
- PDF export には Chrome 互換ブラウザが必要。
- CI や release 用には HTML export を先に確認する。
