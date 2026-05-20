# PDF Export

## いつ使うか

`.vspec.md` を review、共有、添付、release note のために HTML / PDF として出力したいときに使います。source は Git で管理し、HTML はブラウザで確認しやすい成果物、PDF は配布しやすい固定レイアウトの成果物として扱います。

VS Code 拡張を使っている場合は、まず拡張から HTML / PDF を出力するのが一番シンプルです。CLI は CI、script、複数 file の一括出力で使います。

## 完成イメージ

1つの `.vspec.md` を source of truth として、VS Code preview で確認する。同じ source から HTML を出力して browser review し、必要に応じて PDF を出力して配布します。

## VS Code から出力する

1. `.vspec.md` を VS Code で開く。
2. `MarkVSpec: Open Preview` で preview を確認する。
3. command palette から HTML または PDF export を実行する。
4. 出力された HTML / PDF を開き、screen title、state、wireframe、message が読めることを確認する。

VS Code から出力すると、preview で見たものと export の対応を確認しやすくなります。手元で1画面を共有したい場合はこの方法を優先してください。

## CLI で出力する

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

CLI は次の場面に向いています。

- CI で自分の `.vspec.md` を検証する。
- review 用 HTML をまとめて生成する。
- release artifact として PDF を作る。
- local preview を使わずに出力だけ確認する。

詳細は [CLI Reference](../reference/cli.md) を参照してください。

MarkVSpec repository を checkout している場合は `examples/` 配下の path も渡せます。通常の利用では、自分の workspace にある `.vspec.md` を指定してください。

## よくある落とし穴

- PDF だけを確認すると、layout 崩れの原因を追いにくくなります。まず HTML export を確認します。
- source と export を別々に修正しない。修正は `.vspec.md` に戻してから再 export します。
- PDF export には Chrome 互換ブラウザが必要です。CI では browser dependency を事前に用意します。
- export artifact はレビュー用です。canonical source は `.vspec.md` です。
- file path や output directory を README に固定で書く場合は、その workspace に実在する file と一致させます。

## 関連 example

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小構成の export 結果。
- [Login](../../../examples/showcase/login-basic.html): form と action を含む画面の export 結果。
- [Async Fetching](../../../examples/showcase/async-loading.html): 複数 state を含む画面の export 結果。

## 関連 reference

- [Export Start](../start/export.md)
- [CLI Reference](../reference/cli.md)
- [File Format Reference](../reference/file-format.md)
- [Limitations Reference](../reference/limitations.md)

## 確認方法

- HTML export が対象 screen の `.html` を作る。
- HTML をブラウザで開き、title、state、wireframe、action が読める。
- PDF export で page break や text overflow が目立たない。
- CI で使う場合、command、output directory、browser dependency が明確になっている。
- 共有先には export artifact だけでなく、必要なら source `.vspec.md` への link も添える。
