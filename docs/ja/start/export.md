# Export

MarkVSpec は `.vspec.md` から HTML / PDF を出力できます。

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

出力先には `hello-screen.html` が作られます。レビューや共有用に、source と別の静的成果物として扱えます。

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。環境にブラウザが見つからない場合は、HTML export を使って内容を確認してください。

## 次

- [Examples](../examples/index.md)
- [Guide](../guide/index.md)
