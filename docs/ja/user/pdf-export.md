# PDF 出力と共有

## この文書の位置づけ

この文書は、VS Code 拡張や CLI で HTML/PDF を出力し、レビュー相手へ共有する利用者向けです。
リリース作業向けの印刷回帰確認は扱いません。

MarkVSpec は、2つの export path を提供します。

## まず出力する

VS Code で `.vspec.md` を開いている場合は、Command Palette から次を実行します。

- `MarkVSpec: Export Static HTML` は standalone HTML の設計書を出力する。
- `MarkVSpec: Export PDF` は、インストール済みの Chrome、Microsoft Edge、
  Brave、Chromium を使って PDF を出力する。

CLI で出力する場合は、npm registry から `@markvspec/cli` を解決できる環境で次を実行します。

```sh
npx @markvspec/cli@latest export html examples/04-real-world-screens/login-basic.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/04-real-world-screens/login-basic.vspec.md --out markvspec-pdf
```

`--out` には出力先ディレクトリを指定します。既存の CI やレビュー用成果物置き場へ出す場合は、
プロジェクトの出力ルールに合わせてディレクトリ名を変えてください。

リポジトリ checkout から直接確認する場合だけ、先に `npm run build -w @markvspec/cli`
を実行し、`node packages/cli/dist/index.js export ...` を使います。

## PDF が出ないとき

- Chrome、Microsoft Edge、Brave、Chromium のいずれかがインストールされているか確認します。
- PDF export が失敗する場合は、`MarkVSpec: Export Static HTML` または
  `npx @markvspec/cli@latest export html ...` で HTML を出力し、ブラウザから印刷します。
- Mermaid の rendering に失敗しても、設計書には読み取り可能な Mermaid source が残ります。
- 表や wireframe がページをまたぐ場合は、HTML 出力で該当箇所を確認してから PDF を作り直します。

## 印刷ポリシー

- PDF export は Chrome、Edge、Brave、Chromium を探します。
- 互換ブラウザが見つからない場合は、`MarkVSpec: Export Static HTML` で出力し、
  ブラウザから印刷します。
- Mermaid は bundled extension asset がある場合に埋め込みます。Mermaid の
  rendering に失敗しても、設計書には読み取り可能な Mermaid source を残します。
- MarkVSpec は標準 print policy を適用します。inline 目次の後と History の前は
  章区切りとして改ページします。
- 各 state、Layouts、Elements、Actions は必ず新ページから始めるのではなく、
  ワイヤーフレーム、状態説明、関連表を同じ流れで読めるよう通常フローで配置します。
- wireframe 導入部、action detail、process card、note block には
  `break-inside: avoid` と旧 `page-break-*` fallback を指定します。table は全体を
  固定せず、ヘッダと行単位で印刷しやすくします。
