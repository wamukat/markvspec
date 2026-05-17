# 印刷回帰チェック

## この文書の位置づけ

この文書は、リリース前や renderer 変更後に HTML/PDF 出力を確認する開発者向けの
回帰確認手順です。利用者向けの PDF 出力概要は [PDF 出力と共有](../user/pdf-export.md) を参照してください。

DSL、renderer、sample を変更した後も実務サンプルを印刷可能な状態に保つための
チェックです。PDF export の実装方針とは別に、現在のサンプル一式に対する
回帰確認手順を定義します。

## コマンド

```sh
npm run check:print-regression
```

成果物は `.markvspec-regression/` に出力されます。

- `html/`: `examples/**/*.vspec.md` の standalone HTML export。
- `pdf/`: 互換 Chrome、Edge、Brave、Chromium がある場合の PDF export。
- `html-files.txt` / `pdf-files.txt`: 生成成果物の一覧。
- `print-regression.log`: validate / export の実行ログ。

PDF export はローカルブラウザに依存します。標準では PDF export が使えない場合も
HTML 成果物を残し、ログに理由を出します。PDF 生成を必須にしたい場合は
`MARKVSPEC_REQUIRE_PDF=1` を指定します。

```sh
MARKVSPEC_REQUIRE_PDF=1 npm run check:print-regression
```

## 対象サンプル

回帰対象は同梱されているすべての MarkVSpec document です。

- `examples/01-basics/hello-screen.vspec.md`
- `examples/04-real-world-screens/login-basic.vspec.md`
- `examples/02-states/async-loading.vspec.md`
- `examples/02-states/scenario-samples.vspec.md`
- `examples/02-states/responsive-profile.vspec.md`
- `examples/03-actions/event-triggers.vspec.md`
- `examples/03-actions/form-submit-flow.vspec.md`
- `examples/03-actions/single-field-validation.vspec.md`
- `examples/03-actions/toast-feedback.vspec.md`
- `examples/03-actions/parallel-initial-load.vspec.md`
- `examples/04-real-world-screens/notice-detail.vspec.md`
- `examples/04-real-world-screens/profile-edit-rich.vspec.md`
- `examples/04-real-world-screens/search-list.vspec.md`
- `examples/05-reuse/profile-page-with-template.vspec.md`
- `examples/05-reuse/profile-summary.partial.vspec.md`
- `examples/05-reuse/template-shell.vspec.md`
- `examples/06-structured-sections/history-and-errors.vspec.md`

## 目視チェックリスト

生成された HTML または PDF で以下を確認します。

- responsive なログイン画面やマイページ partial の state を含め、すべての
  viewport / state section が印刷順で表示される。
- 項目定義、action detail、API 契約、message table などの横長 table が、
  列を隠さずに折り返しまたはスクロールできる。
- 長いセルが隣の内容と重ならずに折り返される。
- Mermaid の状態遷移図 / 画面遷移図が SVG として描画される。描画できない場合も
  Mermaid source が読める。
- wireframe の marker badge が正しい layout / element / action target に
  紐づいて表示される。
- Element の `sample rows:` と scenario samples は、繰り返し構造を示しつつ、各サンプルデータ行に個別 marker を要求しない。
- partial placeholder と埋め込み partial preview が区別して読める。
- i18n label reference、URL parameter 付き遷移、`PartialRequest` section が読める。
- Front Matter metadata が表示される。
- page break によって見出しと最初の本文が読みにくく分断されない。
- inline 目次の後と History の前は、章区切りとして改ページされる。
- 各 state、Layouts、Elements、Actions は必ず新ページ開始にならず、
  wireframe、状態説明、関連表を同じ流れで読める。
- wireframe 導入部、action detail、process card、scenario sample block は、
  ブラウザが対応できる範囲で内部改ページされにくい。
- table は全体を 1 ブロックとして固定せず、ヘッダと行単位で読みやすく印刷される。

## 実行タイミング

以下を変更したときは、このチェックを実行します。

- `examples/**/*.vspec.md`
- `packages/core/src/renderer.ts`
- `packages/vscode-extension/src/extension.ts`
- `packages/exporter/src/index.ts`
- print CSS、marker badge CSS、Mermaid rendering、table rendering、partial composition。
