# PDF出力

## いつ使うか

`.vspec.md` をレビュー、共有、添付、リリースノートのために HTML / PDF として出力したいときに使います。ソースは Git で管理し、HTML はブラウザで確認しやすい成果物、PDF は配布しやすい固定レイアウトの成果物として扱います。

VS Code 拡張を使っている場合は、まず拡張から HTML / PDF を出力するのが一番シンプルです。CLI は CI、スクリプト、複数ファイルの一括出力で使います。

## 完成イメージ

1つの `.vspec.md` を正本として、VS Code プレビューで確認する。同じソースから HTML を出力してブラウザでレビューし、必要に応じて PDF を出力して配布します。

## VS Code から出力する

1. `.vspec.md` を VS Code で開く。
2. `MarkVSpec: Open Preview` でプレビューを確認する。
3. コマンドパレットから HTML または PDF 出力を実行する。
4. 出力された HTML / PDF を開き、画面タイトル、状態、ワイヤーフレーム、メッセージが読めることを確認する。

VS Code から出力すると、プレビューで見たものと出力結果の対応を確認しやすくなります。手元で1画面を共有したい場合はこの方法を優先してください。

## CLI で出力する

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

CLI は次の場面に向いています。

- CI で自分の `.vspec.md` を検証する。
- レビュー用 HTML をまとめて生成する。
- リリース成果物として PDF を作る。
- ローカルプレビューを使わずに出力だけ確認する。

CI では先に validate し、入力は明示します。

```bash
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html
```

出力画面のラベルに独自メッセージファイルが必要な場合は `--messages <path>` を使います。
`diagnose input`、入力パターン、メッセージファイル、出力名、PDF ブラウザの詳細は
[CLI リファレンス](../reference/cli.md) を参照してください。

MarkVSpec リポジトリを checkout している場合は `examples/` 配下のパスも渡せます。通常の利用では、自分の作業ディレクトリにある `.vspec.md` を指定してください。

## よくある落とし穴

- PDF だけを確認すると、レイアウト崩れの原因を追いにくくなります。まず HTML 出力を確認します。
- ソースと出力物を別々に修正しない。修正は `.vspec.md` に戻してから再出力します。
- PDF 出力には Chrome、Edge、Brave、Chromium のいずれかが必要です。CI ではブラウザ依存を事前に用意します。
- 出力物はレビュー用です。正本は `.vspec.md` です。
- ファイルパスや出力ディレクトリを README に固定で書く場合は、その作業ディレクトリに実在するファイルと一致させます。
- 2つのソースが同じ出力ベース名になる場合は、出力先を分けるかソース名を変えます。

## 関連サンプル

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小構成の出力結果。
- [Login](../../../examples/showcase/login-basic.html): フォームとアクションを含む画面の出力結果。
- [Async Fetching](../../../examples/showcase/async-loading.html): 複数状態を含む画面の出力結果。

## 関連リファレンス

- [出力](../start/export.md)
- [CLI リファレンス](../reference/cli.md)
- [ファイル形式リファレンス](../reference/file-format.md)
- [制限事項リファレンス](../reference/limitations.md)

## 確認方法

- HTML 出力が対象画面の `.html` を作る。
- HTML をブラウザで開き、タイトル、状態、ワイヤーフレーム、アクションが読める。
- PDF 出力で改ページやテキストのはみ出しが目立たない。
- CI で使う場合、コマンド、出力ディレクトリ、ブラウザ依存が明確になっている。
- 共有先には出力物だけでなく、必要ならソース `.vspec.md` へのリンクも添える。
