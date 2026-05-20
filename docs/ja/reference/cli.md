# CLI

CLI は `.vspec.md` の検証と export に使います。VS Code preview で確認しながら書き、必要に応じて CLI で CI や静的成果物出力に組み込めます。

## 書ける構文

### Validate

```bash
npx @markvspec/cli@latest validate examples/01-basics/hello-screen.vspec.md
```

source file を parse/validate し、構文上の不足や参照の問題を確認します。

### Export HTML

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
```

preview と共有に使える静的 HTML を出力します。

### Export PDF

```bash
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。

## 小さな例

```bash
npx @markvspec/cli@latest validate ./screens/login.vspec.md
npx @markvspec/cli@latest export html ./screens/login.vspec.md --out ./dist/markvspec
```

## 注意点

- CLI は authoring source として JSON を要求しません。入力は `.vspec.md` です。
- CI ではまず `validate` を実行し、成功した source だけを export します。
- `--out` は出力先 directory です。既存成果物の扱いは実行環境の運用に合わせて管理してください。
- PDF はブラウザ実行環境の差で font や page break が変わる場合があります。
- VS Code extension から HTML/PDF を出力できる場合、個人作業では extension の export の方が簡単です。

## 関連ページ

- [File Format](file-format.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
