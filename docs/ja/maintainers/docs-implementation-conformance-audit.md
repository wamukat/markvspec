# 利用者向けドキュメント実装一致性監査

## 位置づけ

この文書は #1355 の監査記録です。`docs/` を正本とし、README と
`docs/{ja,en}` の利用者向け本文にある主要な仕様主張を、実装、tests、examples、
CLI 実行結果に照合しました。

`docs-site/src/content/docs/` は `npm run sync:docs-site` の生成先であり、
Git では管理しません。この監査では正本として直接編集しません。

## 対象

- `README.md` / `README.ja.md`
- `docs/{ja,en}/README.md`
- `docs/{ja,en}/start/**/*.md`
- `docs/{ja,en}/guide/**/*.md`
- `docs/{ja,en}/reference/**/*.md`
- `docs/{ja,en}/recipes/**/*.md`
- `docs/{ja,en}/examples/**/*.md`
- `docs/{ja,en}/concepts/**/*.md`

## 継続監査

#1356 で Reference の主要な仕様主張を自動監査する `npm run audit:docs-reference`
を追加しました。このコマンドは、次の観点を `packages/core` の実装または CLI
validate と照合します。

- Reference に書かれた section 名が parser の認識 section と合っていること。
- Reference に書かれた element type と主要 property が element domain と合っていること。
- Actions / Validations / Business Rules の主要 key が現行構文と合っていること。
- Markdown code block を完全な `.vspec.md` 例と断片例に分け、完全例は CLI validate に通すこと。

`docs/` を正本にする運用を保つため、Pages CI でも `npm run audit:docs-reference`
を実行します。

## 照合した根拠

| 領域 | docs の主張 | 根拠 |
| --- | --- | --- |
| File format | `.vspec.md` は screen / partial / template、`.vspec.project.md` は project index | `packages/core/src/project-loader.ts`, `packages/core/test/index.test.ts`, `packages/exporter/src/index.ts` |
| Section | `States`, `Layout`, `Elements`, `Actions`, `Events`, `Form Groups`, `Field Validations`, `Cross-field Validations`, `Preview Scenarios`, `Business Rules`, `Error Codes`, `Slots`, `History` | `packages/core/src/markdown-section-ast.ts`, `packages/core/src/markdown-section-semantic.ts`, `packages/core/test/markdown-section-semantic.test.ts`, `examples/**/*.vspec.md` |
| ID | `SCR-*`, `L-*`, `E-*`, `A-*`, `R-*`, `F-*`, `V-*`, `P-*`, `PRT-*` | `packages/core/src/ids.ts`, `packages/core/src/entity-reference.ts`, `packages/core/test/entity-marker-read-model.test.ts`, shipped examples |
| Elements | `Heading`, `Paragraph`, `Text`, `Input`, `Button`, `Link`, `Image`, `Table`, `Select`, `Dialog`, `Toast`, `Tabs`, `ActionMenu` など | `packages/core/src/element-domain.ts`, `packages/core/test/element-domain.test.ts`, `packages/core/test/index.test.ts`, `examples/catalog.yml` |
| Element properties | `text`, `label`, `value`, `placeholder`, `required`, `variant`, `tone`, `width`, `size`, `action`, `href`, `options`, `columns`, `sample rows`, 状態条件 | `packages/core/src/element-domain.ts`, `packages/core/src/markdown-section-semantic.ts`, `packages/core/test/index.test.ts` |
| Layout | `stack`, `row`, `grid`, `inline`, `presentation`, `overlay`, `Items`, `Slots`, `Slot: name` | `packages/core/src/layout-domain.ts`, `packages/core/src/layout-section-semantic.ts`, `packages/core/test/layout-domain.test.ts`, `packages/core/test/renderer-slot.test.ts` |
| Actions | `Process Pn:`, `request:`, `server:`, `sync:`, `receive:`, `case:`, `display`, `state`, `navigate`, `partial` | `packages/core/src/action-parser.ts`, `packages/core/src/action-process-read-model.ts`, `packages/core/src/action-process-validator.ts`, `packages/core/test/action-process-read-model.test.ts` |
| Validation | `## Field Validations`, `## Cross-field Validations`, `input rule`, `constraints`, `target`, `inputs`, `check`, `message` | `packages/core/src/validation-section-semantic.ts`, `packages/core/src/validation-domain.ts`, `packages/core/test/validation-domain.test.ts`, `examples/03-actions/single-field-validation.vspec.md` |
| Business rules | `## Business Rules` と `case: business-rule-violation` の対応 | `packages/core/src/validation-diagnostics-validator.ts`, `packages/core/test/index.test.ts`, `examples/03-actions/form-submit-flow.vspec.md` |
| Preview scenarios | `## Preview Scenarios`, `samples`, `rows`, `route`, action case 由来の表示 | `packages/core/src/preview-scenario-section-semantic.ts`, `packages/core/src/state-screen-scenario-model.ts`, `packages/core/test/index.test.ts`, `examples/02-states/scenario-samples.vspec.md` |
| CLI | `--version`, `validate`, `diagnose input`, `export html`, `export pdf`, `export document-list` | `packages/cli/src/index.ts`, `packages/exporter/src/index.ts`, CLI 実行結果 |
| VS Code preview / export | live preview、HTML/PDF export、project preview | `packages/vscode-extension/src/extension.ts`, `packages/vscode-extension/src/export-commands.ts`, `packages/vscode-extension/src/project-preview-document.ts`, `npm run audit:examples` |
| VS Code extension distribution | README の Marketplace install 導線 | `packages/vscode-extension/package.json`, `https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec` の HTTP 200 確認 |

## 実施した検索

利用者向け docs で、古いまたは誤解を招きやすい語を検索しました。

```sh
rg -n "server:|HttpRequest|Triggered|Effects|Cases|旧ドキュメント|legacy|移行済み|分割済み|TODO|FIXME|coming soon|placeholder|draft|実装予定|未実装|developer|maintainer|release" README.md README.ja.md docs/ja docs/en --glob '!docs/**/maintainers/**'
```

確認結果:

- `Triggered` / `Effects` / `Cases` は利用者向け docs には現在仕様として残っていない。
- `HttpRequest` は利用者向け docs には残っていない。
- `server:` は `request:` とは別の server-side service call として説明されており、`packages/core/src/action-process-read-model.ts` の `ServerCall` 分類と一致する。
- `placeholder` は `Input` のプロパティとして出ており、旧文書の placeholder ではない。
- `legacy` / `旧ドキュメント` / `移行済み` / `分割済み` は利用者向け docs には残っていない。

## 実行した検証

```sh
npm run audit:examples
npm run build -w @markvspec/cli
node packages/cli/dist/index.js --version
node packages/cli/dist/index.js validate examples/01-basics/hello-screen.vspec.md
node packages/cli/dist/index.js export html examples/01-basics/hello-screen.vspec.md --out .work/1355-cli-html
node packages/cli/dist/index.js export pdf examples/01-basics/hello-screen.vspec.md --out .work/1355-cli-pdf
node packages/cli/dist/index.js export document-list packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md --out .work/1355-cli-docs
npm run sync:docs-site
npm run check:docs-links
python3 - <<'PY'
from urllib.request import Request, urlopen
url = "https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec"
with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=15) as response:
    print(response.status, response.geturl())
PY
```

確認結果:

- shipped examples の preview audit は pass。
- CLI `--version` は `0.6.0` を出力。
- `validate` は `hello-screen.vspec.md` を 0 error / 0 warning で通過。
- `export html` は `hello-screen.html` を生成。
- `export pdf` は `hello-screen.pdf` を生成。
- `export document-list` は `document-list.md` を生成。
- `docs-site/src/content/docs` を生成し、docs link check は pass。
- VS Code Marketplace の `wamukat.markvspec` 直接 URL は HTTP 200。

## 修正した内容

| ファイル | 修正 |
| --- | --- |
| `docs/ja/guide/validation.md` | 「5つに分ける」を、実際の表に合わせて「6つに分ける」へ修正。 |
| `docs/en/guide/validation.md` | `Five Buckets` を `Six Buckets` へ修正。 |
| `docs/ja/concepts/index.md` / `docs/en/concepts/index.md` | screen-first の説明を、実装済みの `type: template` / `type: partial` と矛盾しない表現へ修正。 |
| `docs/en/examples/index.md` | partial update の入口を、部分更新の主例である `Profile Home` に統一。 |
| `docs/ja/recipes/login-form.md` / `docs/en/recipes/login-form.md` | `## States` を箇条書き構文に直し、`display.target` が参照する `L-MessageArea` を例内で定義。 |
| `docs/ja/reference/sections.md` / `docs/en/reference/sections.md` | 実装が認識する `View Context` / `View Context Samples` / `Validations` を最上位セクション表に追加。 |

## Sub-agent review

3つの範囲に分けて独立レビューを受けました。

- README / Concepts / Examples: `type: template` / `type: partial` と screen-first 説明の矛盾、英語 Examples の partial update 入口、Marketplace 公開根拠の確認不足を指摘。Marketplace は HTTP 200 を確認し、docs 表現の矛盾を修正。
- Reference: blocking なし。`View Context` / `View Context Samples` / 互換用 `Validations` が表にない点を non-blocking として指摘されたため修正。
- Start / Guide / Recipes: Login recipe の `## States` 例が heading 形式で parser と合わない点、`L-MessageArea` 未定義を blocking として指摘。日英で修正。

## 判断

今回確認した範囲では、README と `docs/{ja,en}` の利用者向け本文に、
現在仕様として読める未実装構文、古い `Triggered` / `Effects` / `Cases` 形式、
創作 DSL、または `docs-site` 正本前提の運用記述は確認していません。

Reference の仕様主張はおおむね実装に対応しています。ただし、この監査は人手棚卸しです。
Reference の drift を継続的に検出する仕組みは #1356、公開 site の生成・リンク監視は #1357 で扱います。
