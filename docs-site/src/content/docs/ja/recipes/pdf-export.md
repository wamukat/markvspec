---
title: "PDF出力"
---

## いつ使うか

`.vspec.md` を review、共有、添付、release note のために HTML / PDF として出力したいときに使います。source は Git で管理し、HTML はブラウザで確認しやすい成果物、PDF は配布しやすい固定レイアウトの成果物として扱います。

VS Code 拡張を使っている場合は、まず拡張から HTML / PDF を出力するのが一番シンプルです。CLI は CI、スクリプト、複数ファイルの一括出力で使います。

## 完成イメージ

1つの `.vspec.md` を正本として、VS Code プレビューで確認する。同じソースから HTML を出力してブラウザでレビューし、必要に応じて PDF を出力して配布します。

## VS Code から出力する

1. `.vspec.md` を VS Code で開く。
2. `MarkVSpec: Open Preview` でプレビューを確認する。
3. command palette から HTML または PDF export を実行する。
4. 出力された HTML / PDF を開き、screen title、state、wireframe、message が読めることを確認する。

VS Code から出力すると、プレビューで見たものと出力結果の対応を確認しやすくなります。手元で1画面を共有したい場合はこの方法を優先してください。

## CLI で出力する

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

CLI は次の場面に向いています。

- CI で自分の `.vspec.md` を検証する。
- review 用 HTML をまとめて生成する。
- release artifact として PDF を作る。
- ローカルプレビューを使わずに出力だけ確認する。

CI では先に validate し、入力は明示します。

```bash
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html
```

出力画面の label に custom message file が必要な場合は `--messages <path>` を使います。
`diagnose input`、input pattern、message file、出力名、PDF ブラウザの詳細は
[CLI リファレンス](/markvspec/ja/reference/cli/) を参照してください。

MarkVSpec リポジトリを checkout している場合は `examples/` 配下の path も渡せます。通常の利用では、自分の workspace にある `.vspec.md` を指定してください。

## よくある落とし穴

- PDF だけを確認すると、layout 崩れの原因を追いにくくなります。まず HTML export を確認します。
- source と export を別々に修正しない。修正は `.vspec.md` に戻してから再 export します。
- PDF export には Chrome、Edge、Brave、Chromium のいずれかが必要です。CI では browser dependency を事前に用意します。
- export artifact はレビュー用です。canonical source は `.vspec.md` です。
- ファイルパスや出力ディレクトリを README に固定で書く場合は、その workspace に実在するファイルと一致させます。
- 2つの source が同じ export base name になる場合は、出力先を分けるか source 名を変えます。

## 関連サンプル

- [Hello Screen](/markvspec/examples/showcase/hello-screen.html): 最小構成の出力結果。
- [Login](/markvspec/examples/showcase/login-basic.html): フォームとアクションを含む画面の出力結果。
- [Async Fetching](/markvspec/examples/showcase/async-loading.html): 複数状態を含む画面の出力結果。

## 関連リファレンス

- [出力](/markvspec/ja/start/export/)
- [CLI リファレンス](/markvspec/ja/reference/cli/)
- [ファイル形式リファレンス](/markvspec/ja/reference/file-format/)
- [制限事項リファレンス](/markvspec/ja/reference/limitations/)

## 確認方法

- HTML export が対象 screen の `.html` を作る。
- HTML をブラウザで開き、title、state、wireframe、action が読める。
- PDF export で page break や text overflow が目立たない。
- CI で使う場合、command、output directory、browser dependency が明確になっている。
- 共有先には export artifact だけでなく、必要なら source `.vspec.md` への link も添える。
