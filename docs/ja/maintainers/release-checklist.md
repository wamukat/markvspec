# リリースチェックリスト

## この文書の位置づけ

この文書は MarkVSpec をリリースする担当者向けのチェックリストです。通常利用者が
MarkVSpec 設計書を書くための文書ではありません。

このドキュメントは、MarkVSpec `0.3.0` リリースの確認手順を定義します。
対象は VS Code Marketplace 向けパッケージと、npm package `@markvspec/cli` です。

## 初回公開で伝える体験

Markdown で画面仕様を書き、VS Code で状態別プレビューと生成された設計書を確認し、
HTML/PDF として共有できることを、初回公開で利用者に伝える中心体験にする。

## リリーススコープ

- 1つの `.vspec.md` 画面ファイルをパースする。
- ID、参照、重複 marker、レイアウトのビューポート網羅、アクション構造を検証する。
- 低忠実度のワイヤーフレームと生成された設計書ビューを表示する。
- 状態別の現在仕様ビューと Mermaid の状態遷移図を表示する。
- VS Code Live Preview、syntax highlight、diagnostics、marker toggle を提供する。
- `## Layout: <viewport>` によるレスポンシブレイアウト定義を扱う。
- VS Code 拡張を Marketplace 公開およびローカルインストール用 VSIX として package する。
- CLI を npm package `@markvspec/cli` として package / publish する。
- 現在の MarkVSpec 設計書を standalone static HTML として export する。
- インストール済み Chrome/Chromium 互換ブラウザを使って、現在の MarkVSpec
  設計書を PDF として export する。

## Phase 4 代表 example

VS Code preview、standalone HTML、PDF export のリリース前目視確認では、次の
example を代表セットとして使う。

- `examples/01-basics/hello-screen.vspec.md`: 最小構成、Front Matter、1画面の基本表示。
- `examples/01-basics/login-basic.vspec.md`: form layout、Form Groups、validation、認証状態。
- `examples/02-states/model-samples.vspec.md`: list 形式中心の Model Samples と空配列用 table 記法。
- `examples/02-states/responsive-profile.vspec.md`: mobile / desktop のレスポンシブ layout と状態別表示。
- `examples/03-actions/event-triggers.vspec.md`: click 以外の element event と lifecycle trigger。
- `examples/03-actions/form-submit-flow.vspec.md`: validation、model update、server call、navigation を含む action flow。
- `examples/03-actions/parallel-initial-load.vspec.md`: parallel server call と Resolve の action flow。
- `examples/04-real-world-screens/notice-detail.vspec.md`: Display Content Spec の文言、データソース、format、value、params。
- `examples/04-real-world-screens/profile-edit-rich.vspec.md`: 拡張 form、media、list、dialog 系 Element Type。
- `examples/04-real-world-screens/search-list.vspec.md`: 検索、filter、pagination、Model Samples を含む実務寄り画面。
- `examples/05-reuse/template-shell.vspec.md`: template shell、slot、再利用構造。
- `examples/05-reuse/profile-page-with-template.vspec.md`: template 合成、route params、partial refresh。
- `examples/05-reuse/profile-summary.partial.vspec.md`: partial route、partial-local state。
- `examples/06-structured-sections/history-and-errors.vspec.md`: Error Codes、History Fields、History。

## リリースチェックリスト

- [ ] clean checkout から `npm install` が完了する。
- [ ] `npm run typecheck` が通る。
- [ ] `npm test` が通る。
- [ ] `npm run build` が通る。
- [ ] `npm run check:readme-release` が通る。
- [ ] root、core、document-renderer、exporter、CLI、VS Code extension の package
  version が意図した release version と一致している。
- [ ] VS Code Marketplace の extension ID が `wamukat.markvspec` であることを確認する。
  以前の ID が既に公開済みの場合は、この package の公開前に deprecate、unpublish、
  または移行案内の方針を決めている。
- [ ] package metadata と VSIX packaging script が、このリリース用の
  `dist/markvspec-0.3.0.vsix` artifact を生成する。
- [ ] `npm run package:vsix -w packages/vscode-extension` で期待する
  `dist/markvspec-<version>.vsix` artifact が作成される。
- [ ] `npm run smoke:vscode-vsix` で、生成済み VSIX を clean な VS Code
  profile / extensions dir に install し、packaged extension の activation、
  command registration、preview 起動、diagnostics 発行を確認する。
- [ ] `@markvspec/cli` の package metadata、`bin.markvspec`、`files`、
  repository、homepage、bugs、`publishConfig.access=public` が公開向けに妥当。
- [ ] `npm pack --dry-run -w @markvspec/cli` で、公開物が `dist/index.js` と
  package metadata に絞られている。
- [ ] CLI package 内容に `.work`、test fixture、不要な source、旧 `MarkMock` /
  `markmock` 名が含まれていない。
- [ ] pack 済み CLI で `markvspec validate`、`markvspec export html`、
  `markvspec export pdf` の smoke test が代表 example で通る。
- [ ] tag 名と package version が tag 作成前に一致している。
- [ ] npm registry 側の `@markvspec` scope、2FA、`access public`、npm token
  または login 状態を確認する。
- [ ] 生成された VSIX を VS Code に install できる。
- [ ] `examples/01-basics/login-basic.vspec.md` が MarkVSpec document として開ける。
- [ ] エディタタイトルの action から preview を開ける。
- [ ] Explorer context menu から preview を開ける。
- [ ] MarkVSpec ファイルを切り替えると preview 対象も切り替わる。
- [ ] 壊れた MarkVSpec 入力に対して VS Code Problems に diagnostics が表示される。
- [ ] ログインサンプルで全ビューポート/状態の設計書セクションが表示される。
- [ ] State Flow が Mermaid 図として表示される。
- [ ] `MarkVSpec: Export Static HTML` で VS Code webview 外でも開ける standalone
  HTML が出力される。
- [ ] 互換ブラウザがある環境で `MarkVSpec: Export PDF` から PDF を出力できる。
- [ ] README と docs のリンクが英日で最新になっている。
- [ ] README 冒頭の preview screenshot
  `docs/assets/readme-login-basic-html-preview.png` が現在の
  `examples/01-basics/login-basic.vspec.md` のMarkdown sourceと生成HTMLから作った
  左右並びの実キャプチャである。
- [ ] npm publish 後に `npx @markvspec/cli@latest validate ...` と
  `npx @markvspec/cli@latest export html ...` で公開済み package を確認する。
- [ ] Done チケットのプロセスを守る。実装、検証、独立レビュー、
  Kanbalone の review/verification summary comment、その後 Kanbalone `done` と
  `isResolved: true` の順に進める。

## CLI npm package 手動スモーク手順

1. `npm run build -w @markvspec/cli` を実行する。
2. `npm pack --dry-run -w @markvspec/cli` で package 内容を確認する。
3. 一時ディレクトリに `npm pack -w @markvspec/cli --pack-destination <dir>` で
   tarball を作成する。
4. `tar -tf <dir>/markvspec-cli-<version>.tgz` で `.work`、test fixture、不要な
   source、旧 `MarkMock` / `markmock` 名が含まれないことを確認する。
5. 別の一時ディレクトリへ tarball を install し、リポジトリ root から
   `<tmp>/node_modules/.bin/markvspec` として実行する。
6. 代表 example で `<tmp>/node_modules/.bin/markvspec validate examples/01-basics/login-basic.vspec.md` を実行する。
7. 代表 example で `<tmp>/node_modules/.bin/markvspec export html examples/01-basics/login-basic.vspec.md --out <dir>` を実行する。
8. PDF 出力可能なブラウザがある環境で
   `<tmp>/node_modules/.bin/markvspec export pdf examples/01-basics/login-basic.vspec.md --out <dir>` を実行する。
9. `npm publish -w @markvspec/cli --access public` は VSIX smoke test と同じ version
   確認が終わってから実行する。
10. publish 後に `npx @markvspec/cli@latest validate examples/01-basics/login-basic.vspec.md`
    を実行し、registry から取得した package が動くことを確認する。

## VS Code 手動スモーク手順

1. 拡張を build して package する。
2. `npm run smoke:vscode-vsix` で packaged VSIX を clean profile / extensions dir
   上で確認する。
3. 生成された VSIX を VS Code に install する。
4. このリポジトリを VS Code で開く。
5. `examples/01-basics/login-basic.vspec.md` を開く。
6. エディタタイトルの action から preview を開く。
7. toolbar に対象ファイルパスが表示されていることを確認する。
8. Layout、Element、Action の marker toggle を操作する。
9. viewport filter を `All`、`mobile`、`desktop` に切り替える。
10. 別の `.vspec.md` example を開き、preview 対象が切り替わることを確認する。
11. 一時的に壊れた参照を入れ、VS Code Problems に MarkVSpec diagnostic が
    表示されることを確認する。
12. `MarkVSpec: Export Static HTML` を実行し、生成されたファイルをブラウザで開いて
    設計書と State Flow が読めることを確認する。
13. `MarkVSpec: Export PDF` を実行し、PDF に全ビューポート/状態セクションと
    読みやすい State Flow が含まれることを確認する。

自動 VSIX smoke のログは `.work/vscode-vsix-smoke/` 配下に残る。通常は
`dist/markvspec-<version>.vsix` を使う。別 artifact を検証する場合は
`MARKVSPEC_VSIX_PATH` を指定する。

## README preview screenshot 更新手順

README に掲載する screenshot は、手で描いたモックではなく、実際のMarkdown sourceと
MarkVSpec が生成した static HTML preview から作る。左にMarkdown、右に生成された
ワイヤーフレームが見える構図にする。

```bash
rm -rf .work/readme-preview
mkdir -p .work/readme-preview docs/assets
node packages/cli/dist/index.js export html examples/01-basics/login-basic.vspec.md --out .work/readme-preview
node scripts/create-readme-preview-page.mjs \
  --source examples/01-basics/login-basic.vspec.md \
  --html .work/readme-preview/login-basic.html \
  --out .work/readme-preview/readme-preview-capture.html
agent-browser --session markvspec-readme open "file://$PWD/.work/readme-preview/readme-preview-capture.html"
agent-browser --session markvspec-readme wait --load networkidle
agent-browser --session markvspec-readme screenshot "$PWD/docs/assets/readme-login-basic-html-preview.png"
agent-browser --session markvspec-readme close
```

取得後は画像を目視し、左側に `Login Basic` のMarkdown source、右側に生成HTMLの
ワイヤーフレームが一目で分かること、README 上の説明が VS Code preview そのものでは
なく static HTML preview として正確であることを確認する。

Extension Development Host で直接スモークする場合は、拡張を build してから次の
コマンドを使う。

```bash
npm run build -w packages/vscode-extension
npm run smoke:vscode-devhost
```

この手順は isolated profile、空の extensions dir、`--skip-welcome`、
`--disable-workspace-trust` を使う。検証後は Extension Development Host の
ウィンドウを通常操作で閉じる。`pkill` / `kill` で終了すると、VS Code のログに
`crashed with code 15` と記録され、実際の extension host crash と区別しにくくなる。

## 既知の制限

- PDF export には、インストール済み Chrome、Edge、Brave、Chromium のいずれかが
  必要。見つからない場合は static HTML を出力してブラウザから印刷する。
- MarkVSpec は単一画面ファースト。クロスファイルの screen index や
  project-wide な遷移図は project index document で扱える。
- 部品化は authoring format の対象外。実装コンポーネントは後から導出する。
- renderer は低忠実度を意図しており、デザインシステム renderer ではない。
- PDF 品質はインストール済みブラウザの print engine に依存する。特に巨大な
  wireframe や state-flow diagram では差が出る。
- プレビューと static HTML export の Mermaid 表示は bundled Mermaid asset に
  依存する。レンダリングに失敗しても、設計書には読み取り可能な Mermaid source を
  fallback として残す。
- formatter、snippets、document symbols、quick fixes は VS Code 拡張に含まれる。
