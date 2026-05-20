# MarkVSpec

Markdown で UI 仕様を書く。

- VS Code ライブプレビュー
- ワイヤーフレーム表示
- HTML / PDF エクスポート
- AI が読みやすいテキスト形式
- Git で管理しやすい UI 仕様

English documentation starts at [README.md](README.md).

![Hello Screen の Markdown source と MarkVSpec static HTML preview](docs/assets/readme-hello-screen-preview.png)

## まず試す

1. [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec)
   から VS Code 拡張を入れます。

   ```sh
   code --install-extension wamukat.markvspec
   ```

2. VS Code で [Hello Screen](examples/01-basics/hello-screen.vspec.md) を開きます。

3. 次のコマンドを実行します。

   ```text
   MarkVSpec: Open Preview
   ```

## 次に読むもの

- [Website](https://wamukat.github.io/markvspec/)
- [Start guide](https://wamukat.github.io/markvspec/docs/ja/start/)
- [Examples](https://wamukat.github.io/markvspec/examples/)
- [Guide](https://wamukat.github.io/markvspec/docs/ja/guide/)
- [Reference](https://wamukat.github.io/markvspec/docs/ja/reference/)
- [Recipes](https://wamukat.github.io/markvspec/docs/ja/recipes/)

## Tools

- VS Code 拡張: `wamukat.markvspec`
- CLI package: `@markvspec/cli`

```sh
npx @markvspec/cli@latest validate examples/01-basics/hello-screen.vspec.md
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## 開発者向け

```sh
npm run typecheck
npm test
npm run build
```

保守者向けの記録は [docs/ja/maintainers/](docs/ja/maintainers/) と
[docs/en/maintainers/](docs/en/maintainers/) にあります。

リリース担当者は tag 作成前に `npm run check:readme-release` を実行します。
