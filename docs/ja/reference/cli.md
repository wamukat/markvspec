# CLI

CLI は、VS Code 拡張の外で `.vspec.md` を検証または export したいときに使います。

基本の流れは次のままです。

1. VS Code で `hello.vspec.md` を書く。
2. `MarkVSpec: Open Preview` で確認する。
3. 1画面を共有するだけなら VS Code から export する。
4. CI、script、複数 file の一括 export では CLI を使う。

自分の `.vspec.md` に対して CLI を使うだけなら、この repository を clone する必要はありません。

## 書ける構文

### Validate

```bash
npx @markvspec/cli@latest validate hello.vspec.md
```

source file を parse/validate し、構文上の不足や参照の問題を確認します。CI では export 前に実行します。

### Export HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

preview と共有に使える静的 HTML を出力します。

### Export PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。

## 小さな例

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

## 注意点

- CLI は authoring source として JSON を要求しません。入力は `.vspec.md` です。
- CI ではまず `validate` を実行し、成功した source だけを export します。
- `--out` は出力先 directory です。既存成果物の扱いは実行環境の運用に合わせて管理してください。
- PDF はブラウザ実行環境の差で font や page break が変わる場合があります。
- VS Code extension から HTML/PDF を出力できる場合、個人作業では extension の export の方が簡単です。
- `examples/` 配下の path は MarkVSpec repository を checkout している前提です。自分の作業では、workspace 内の `.vspec.md` path を渡してください。

## 関連ページ

- [File Format](file-format.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
