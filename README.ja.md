# MarkVSpec

Markdown で UI 仕様を書く。

- VS Code ライブプレビュー
- ワイヤーフレーム表示
- HTML / PDF エクスポート
- AI が読みやすいテキスト形式
- Git で管理しやすい UI 仕様

English documentation starts at [README.md](README.md).

![Hello Screen の Markdown source と MarkVSpec VS Code preview](docs/assets/start/vscode-preview-clean.png)

## まず試す

repository を clone していなくても試せます。

1. [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec)
   から VS Code 拡張を入れます。

   ```sh
   code --install-extension wamukat.markvspec
   ```

2. VS Code で任意の folder を開き、`hello.vspec.md` を作ります。

3. [Start guide](https://wamukat.github.io/markvspec/docs/ja/start/) の Hello Screen source を貼り付けて保存します。

4. 次のコマンドを実行します。

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

## 開発者向け

repository を clone して開発する人向けです。利用者が preview を試すだけなら、この section は不要です。

```sh
npm run typecheck
npm test
npm run build
```

保守者向けの記録は [docs/ja/maintainers/](docs/ja/maintainers/) と
[docs/en/maintainers/](docs/en/maintainers/) にあります。
