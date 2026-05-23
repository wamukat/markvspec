# Reference Coverage Audit

この文書は、MarkVSpec Reference が product-facing な全機能を網羅しているかを
maintainer が判定するための方針です。将来の checker 設計と review 観点を定義します。
既存の generated docs check や vocabulary audit を置き換えるものではありません。

## 目的

user-visible feature は、少なくとも 1 つの Reference entry で canonical syntax、
semantic boundary、必要な diagnostic、確認できる example を説明します。Guide、Recipes、
Examples は使い方を教える場所ですが、Reference coverage の代替にはしません。

## feature inventory class

| Class | Examples | Required Coverage |
| --- | --- | --- |
| DSL section | `## Actions`, `## Error Codes`, `## History` | Reference 必須、generated grammar row 必須、example 推奨 |
| structured item / property | `Process P1:`, `request`, `label`, `required` | Reference 必須。structured item は grammar-definition coverage 必須 |
| element type | `Heading`, `Input`, `Tabs`, `ActionMenu` | Reference 必須。非自明な control は example 必須 |
| element property | `text`, `label`, `value`, `action event` | 出力に表れるものは Reference 必須。混同しやすいものは Guide 推奨 |
| validation / diagnostic behavior | duplicate ID、non-canonical item、required field | source author が起こせるものは Reference 必須 |
| renderer / preview output feature | Basic Info、History table、state views、marker chip | review semantics に影響するものは Reference 必須 |
| CLI command / option | `validate`, `export html`, `export document-list` | CLI Reference 必須、example 推奨 |
| VS Code command / UI feature | Open Preview、diagnostics、export command | user task に応じて Start/Guide または Reference 必須 |
| example-supported pattern | partial update、loading/error state、history | Example 必須。使う syntax はすべて Reference 必須 |

## coverage level

| Level | 意味 | Minimum Evidence |
| --- | --- | --- |
| Reference required | 正確な syntax / behavior がないと authoring できない | 専用 Reference page または section、canonical example、diagnostics / renderer notes |
| Guide recommended | workflow や判断基準が必要 | Reference から到達できる Guide page または subsection |
| Recipe optional | 複数機能を組み合わせる task pattern | 繰り返し使う workflow なら Recipe |
| Example required | output を見た方が理解しやすい | catalog example または showcase link |
| Maintainer-only | internal または release/process-only | maintainer doc。public sidebar には出さない |

Guide や Examples に出ているのに Reference がない feature は
`Guide-only Reference gap` として扱います。#1386 前の History がこの状態でした。

## source inventory

| Source | Decision | Reason |
| --- | --- | --- |
| `packages/core/src/grammar-definition.ts` | 採用 | recognized sections、section order、structured item keys、generated grammar/reference table の source of truth。 |
| `packages/core/src/element-domain.ts` と element validators | 採用 | element type behavior と type-specific property の source。 |
| `packages/core/src/markdown-section-semantic.ts` | 採用 | まだ完全に table-driven ではない parser behavior の source。 |
| `packages/core/src/validator.ts` と focused validators | 採用 | author-visible diagnostics と severity の source。 |
| `packages/core/src/project-loader.ts` | 採用 | template/screen composition の visible docs への影響を確認する source。 |
| renderer、document-renderer、exporter、VS Code preview | 採用 | Basic Info、History table、state views、export behavior など visible output semantics の source。 |
| `packages/cli/src/index.ts` | 採用 | CLI commands/options の source of truth。 |
| `packages/vscode-extension/package.json` と command handlers | 採用 | VS Code command と user-visible entry point の source。 |
| `examples/catalog.yml` と `examples/**/*.vspec.md` | 採用 | users が copy する pattern と、documented であるべき syntax の source。 |
| generated Reference docs | evidence として採用 | generated block の存在を示すが、source は grammar definition と implementation。 |
| `docs/*/maintainers/*audit*` | historical evidence として採用 | 過去の gap と check を記録する。現在の DSL syntax を単独では定義しない。 |
| この repository にまだ実装されていない future integrations | 保留 | product plan に入った後で future source として記録する。現時点の Reference coverage 判定には使わない。 |
| rendered `docs-site/src/content/docs/` | 非採用 | `docs/` からの生成物であり、documentation source of truth ではない。 |

`Hold` / 保留は、将来 relevant になる可能性はあるが、現時点では coverage を定義するには
不安定な source に使います。たとえば Online Editor の保存モデルや将来の外部連携です。
保留 source は、その product feature が implementation scope として受け入れられるまで、
release-blocking な Reference gap を作りません。

## coverage extraction

自動抽出できるもの:

- `grammar-definition.ts` から section と structured item。
- `markvspec-generated:*` marker 間の generated grammar/reference rows。
- element domain / validator から element type と type-specific property。
- `packages/cli/src/index.ts` から CLI commands/options。
- `packages/vscode-extension/package.json` から VS Code commands。
- `examples/catalog.yml` から example feature tags と source path。
- docs link check から英日 Reference page presence と link graph。

人手 review が必要なもの:

- Reference prose が semantic boundary を十分に説明しているか。
- Guide-only topic に Reference page が必要か。
- renderer output behavior が user-visible で Reference 必須か。
- 英日が link だけでなく説明の深さまで揃っているか。
- example が incidental ではなく代表例になっているか。

## diff category

| Category | 意味 | Action |
| --- | --- | --- |
| Missing Reference | feature に Reference entry がない | Reference page/section を追加 |
| Thin Reference | 名前だけあり、syntax / behavior / diagnostics が薄い | Reference を拡充 |
| Implementation mismatch | docs が実装と違う挙動を説明している | docs または implementation を修正 |
| Guide-only Reference gap | Guide に説明があるが Reference に正確な syntax がない | Reference coverage を追加 |
| Example-only Reference gap | example が Reference 未記載 syntax を使う | Reference を追加、または example を修正 |
| English/Japanese depth gap | 片方の locale が明らかに薄い | 薄い locale を更新 |
| Generated-doc drift | generated block が grammar definition と違う | generator を実行、または source/generator を修正 |

## existing checks

| Check | Current Role | Gap |
| --- | --- | --- |
| `npm run check:generated-docs` | grammar と generated Reference blocks が `grammar-definition.ts` と一致することを確認 | 全 feature に手書き Reference coverage があるかは判定しない |
| `npm run audit:docs-code` | user docs の MarkVSpec fenced examples を検証 | product feature inventory は作らない |
| `npm run audit:docs-reference-vocabulary` | Reference fenced examples と generated tables を grammar vocabulary と照合 | prose や renderer/CLI/extension feature は見ない |
| `npm run check:docs-links` | docs links と catalog links を確認 | conceptual coverage の不足は検出しない |
| `npm run audit:examples` | examples を VS Code audit tests で確認 | example が使う syntax がすべて文書化されているかは確認しない |

`scripts/generate-grammar-docs.mjs` は `npm run docs:grammar` と
`npm run check:grammar-docs` が使う full grammar page を生成します。
`scripts/generate-reference-docs.mjs` は `npm run docs:reference` と
`npm run check:reference-docs` が使う generated Reference table を更新します。
`npm run check:generated-docs` は両方の check を実行します。

## minimal checker

`npm run audit:reference-coverage` は、grammar section、structured context、
element type/property、diagnostic code と機械的に検出できる diagnostic push site、
renderer/exporter/preview の visible output feature、CLI command、VS Code command、
Reference page structure、generated Reference marker、example catalog entry から
deterministic な inventory/report を作る。

初期 checker は report-first とする。fail するのは audit の前提が壊れている場合に
限定する。

- 必須 inventory category が空。
- English/Japanese の Reference page set が非対称。
- 必須 generated Reference marker が欠落。
- 既存 Reference page structure が report を信頼できないほど壊れている。

feature-to-Reference mapping がまだ手動、coverage marker が未整備、prose depth が
薄い可能性、Guide-only / Example-only coverage の疑い、diagnostic/renderer/export
coverage をまだ機械判定できない場合は warn に留め、release は fail させない。

`npm run audit:reference-coverage` はまだ `npm run check:release` には含めない。
missing Reference page/section は、初回 report の triage と stable feature ID /
coverage marker 整備が終わってから、warning から release-blocking failure へ昇格する。

## coverage marker

Reference coverage marker は次の HTML comment 形式で書きます。

```html
<!-- markvspec-coverage:reference.page.actions -->
```

marker ID は stable な lowercase feature ID とし、区切りには `.` と `-` を使います。
`markvspec-generated:*` marker は coverage marker として再利用しません。generated
marker は generated table の存在証明、coverage marker は product feature と説明 prose
の対応付けです。

最初に対応する marker family は `reference.page.<basename>` です。`index.md` 以外の
Reference page ごとに、English と Japanese の両方へ 1 つずつ marker を置きます。
たとえば `reference.page.actions` は `docs/en/reference/actions.md` と
`docs/ja/reference/actions.md` の両方に必要です。

`npm run audit:reference-coverage` は feature ID と Reference marker の対応を report
し、必要な locale marker が欠けている場合は warning を出します。coverage model を
導入している間、marker 欠落は warning に留めます。個別 feature family を
release-blocking に昇格するのは、期待 marker set が安定し triage 済みになってからです。

## diagnostic coverage matrix

diagnostic coverage は `supportedDiagnosticMessageCodes()` を起点にします。この matrix
は diagnostic prose 自体を canonical source にするものではなく、author が各 diagnostic
を理解し修正するための参照先を記録します。

| Diagnostic Code | Severity | Trigger Category | User-Facing Coverage | Status |
| --- | --- | --- | --- | --- |
| `frontMatter.missingYaml` | warning | YAML Front Matter block がない。 | [ファイル形式](../reference/file-format.md)、[はじめる](../start/index.md) | Covered |
| `frontMatter.missingRequired` | error | 必須 Front Matter field `id`、`type`、`title` がない。 | [ファイル形式](../reference/file-format.md)、[はじめる](../start/index.md) | Covered |
| `section.recommendedOrder` | warning | recognized section が推奨順より後にある。 | [Sections](../reference/sections.md)、[Grammar](../reference/grammar.md) | Covered |
| `layout.missingViewport` | warning | `## Layout` section に viewport suffix がない。 | [Sections](../reference/sections.md)、[Grammar](../reference/grammar.md) | Covered |
| `layout.groupIgnoredWithoutViewport` | warning | viewport のない Layout section 配下に layout group がある。 | [Sections](../reference/sections.md) | Covered |
| `layout.unsupportedItemsEntry` | warning | `#### Items` に `L-*` / `E-*` 以外の entry がある。 | [Sections](../reference/sections.md)、[ID](../reference/ids.md) | Covered |
| `element.unknownType` | warning | Element heading が unsupported element type を使っている。 | [Elements](../reference/elements.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.missingTrigger` | warning | Action に element action、event、response receive trigger がない。 | [Actions](../reference/actions.md)、[Elements](../reference/elements.md)、[Sections](../reference/sections.md) | Covered |
| `action.invalidTrigger` | warning | Action trigger が unsupported trigger shape。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.process.multipleExecutionDetails` | warning | 1つの Process step に複数の execution detail block がある。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.process.mixesExecutionDetailAndImmediateEffects` | warning | 1つの Process step で execution detail と direct immediate effect が混在。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.process.mixesResultClassificationAndImmediateEffects` | warning | 1つの Process step で result classification と direct immediate effect が混在。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.parallelProcess.caseShouldNotSetStateOrNavigate` | warning | parallel Process case が Resolve ではなく final state / navigation を設定している。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `action.process.caseResponseWithoutReceive` | warning | `receive: response` なしで Process case が `response` を使っている。 | [Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | Covered |
| `unrepresented-source-text` | warning | source prose / list item が保持されるが MarkVSpec output に表現されない。 | [Grammar](../reference/grammar.md)、[制限事項](../reference/limitations.md) | Covered |
| `partial.referenceMissing` | error | partial reference が Front Matter `references.partials` に宣言されていない。 | [ファイル形式](../reference/file-format.md)、[Sections](../reference/sections.md) | Covered |
| `validation.ruleMissingElement` | error | validation rule が存在しない `E-*` element を target にしている。 | [Validations](../reference/validations.md)、[Elements](../reference/elements.md)、[ID](../reference/ids.md) | Covered |
| `previewScenario.missingState` | error | Preview Scenario に `state` がない。 | [Sections](../reference/sections.md) | Covered |
| `previewScenario.samplesMissingElement` | error | Preview Scenario sample row が存在しない `E-*` element を target にしている。 | [Sections](../reference/sections.md)、[Elements](../reference/elements.md)、[ID](../reference/ids.md) | Covered |

将来の machine-readable mapping は source に近い形で次を持つようにします。

- `code`: `supportedDiagnosticMessageCodes()` の値。
- `severity`: source push site で期待する severity。
- `category`: front matter、section order、layout、element、action process、
  partial、validation、preview scenario、output representation など。
- `coverageMarkers`: 修正方法を説明する Reference coverage feature ID。
- `followUp`: Reference 説明が薄い場合の Kanbalone ticket。

この matrix pass では新しい blocking docs gap は見つけていません。残る automation gap
は、`audit:reference-coverage` が diagnostic code と push site を inventory する一方、
この matrix との照合まではまだ行わないことです。

## renderer / export output coverage matrix

renderer / export coverage は、個別 CSS selector や implementation helper ではなく、
user-visible output から始めます。reviewer がその output を見て product 判断をするなら、
その cluster には Reference または Start の coverage が必要です。

この matrix は、VS Code live preview だけでは見つからず、static HTML、PDF、project
`document-list` export でだけ見える mismatch の checklist でもあります。各 row では
同じ source file を該当 artifact で確認し、ID、marker、label、順序、diagnostic、
省略/compact 表示が documented semantics を保っているかを確認します。

| Output Cluster | Source Of Truth | User-Facing Coverage | Representative Example | Artifact To Verify |
| --- | --- | --- | --- | --- |
| Screen Basic Info | Front Matter と、source order の `## History` entries に対する `latestHistoryBasicInfo()` | [ファイル形式](../reference/file-format.md)、[History](../reference/history.md)、[はじめる](../start/index.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview、`export html`、`export pdf` |
| static document section order と table of contents | `renderStaticDesignDocumentHtml()` の section list と generated grammar section order | [Sections](../reference/sections.md)、[Grammar](../reference/grammar.md) | `examples/01-basics/hello-screen.vspec.md` | `export html`、`export pdf` |
| States、state flow、action transition tables | `## States`、action `From`、process result case、Mermaid state graph generation | [Sections](../reference/sections.md)、[Actions](../reference/actions.md)、[Grammar](../reference/grammar.md) | `examples/03-actions/form-submit-flow.vspec.md` | VS Code preview、`export html`、`export pdf` |
| State Views と Preview Scenarios | `## Layout`、`## Elements`、`## View Context`、`## View Context Samples`、`## Preview Scenarios` | [Sections](../reference/sections.md)、[Elements](../reference/elements.md)、[Grammar](../reference/grammar.md) | `examples/02-states/source-kind-metadata.vspec.md`、`examples/02-states/responsive-profile.vspec.md` | VS Code preview state views、`export html`、`export pdf` |
| Marker/ID cells と entity reference chips | canonical IDs と optional `marker` property を entity reference presenter が解決したもの | [ファイル形式](../reference/file-format.md)、[ID](../reference/ids.md)、[Elements](../reference/elements.md)、[Actions](../reference/actions.md) | `examples/01-basics/hello-screen.vspec.md`、`examples/02-states/presentation-panel.vspec.md` | VS Code preview、static HTML tables、PDF tables |
| Element display source metadata と Display Content Spec | element-level `source` fallback と、nested `kind`、`source`、`format` display value metadata | [Elements](../reference/elements.md)、[Grammar](../reference/grammar.md)、[制限事項](../reference/limitations.md) | `examples/02-states/source-kind-metadata.vspec.md`、`examples/04-real-world-screens/notice-detail.vspec.md` | VS Code preview element details、static HTML Display Content Spec、PDF tables |
| Form Groups と input specification tables | `## Form Groups`、element type/property、required/value/source/spec columns | [Elements](../reference/elements.md)、[Sections](../reference/sections.md)、[Validations](../reference/validations.md) | `examples/03-actions/form-submit-flow.vspec.md` | VS Code preview、static HTML、PDF |
| Business Rules、Validations、Error Codes sections | Rule / validation / error-code structured sections と validation renderer helpers | [Rules](../reference/rules.md)、[Validations](../reference/validations.md)、[Sections](../reference/sections.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview、static HTML、PDF |
| History table | `## History Fields`、standard field、custom entry metadata、`## History` entries | [History](../reference/history.md)、[Sections](../reference/sections.md)、[Grammar](../reference/grammar.md) | `examples/06-structured-sections/history-and-errors.vspec.md` | VS Code preview、static HTML、PDF |
| Export diagnostics section | parser/project diagnostics と `renderDiagnostics()` の message localization | [CLI](../reference/cli.md)、[Validations](../reference/validations.md)、この文書の diagnostic coverage matrix | `examples/06-structured-sections/history-and-errors.vspec.md` | warning/error fixture に対する `validate`、`export html`、`export pdf` |
| Project preview overview、notes、templates、screens、transitions | `.vspec.project.md` Front Matter/body、project loader、project transition graph | [ファイル形式](../reference/file-format.md)、[Preview](../start/preview.md)、[Export](../start/export.md) | `packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md` | VS Code project preview、project `export html`、project `export pdf` |
| Project `document-list` export | project screens/templates/partials と per-document diagnostics に対する `exportDocumentList()` | [CLI](../reference/cli.md)、[ファイル形式](../reference/file-format.md)、[History](../reference/history.md) | `packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md` | `export document-list` の Markdown output |
| Renderer messages と localized labels | built-in locale messages、Front Matter `messages`、CLI `--messages`、message-file diagnostics | [CLI](../reference/cli.md)、[ファイル形式](../reference/file-format.md) | `markvspec.messages.yml` 付きで export する任意 source | VS Code preview labels、`export html`、`export pdf` |

static HTML または PDF を含む row は、source や unit test だけでなく、生成 artifact を
実際に確認します。Marker/ID と Display Content Spec の row は特に注意します。live
preview では readable chip に見えていても、static table 側で canonical ID や source
metadata の代わりに label、marker、sample value を出してしまう mismatch が起きやすい
ためです。

この matrix pass では、既に track 済みの source metadata / Marker/ID work 以外に、
新しい focused docs gap または render/export mismatch は見つけていません。#1417 で追加の
follow-up ticket は不要でした。残る automation gap は、`audit:reference-coverage` が
renderer/export output feature を inventory する一方、この matrix や生成 artifact との
照合まではまだ行わないことです。

## first generated report

#1412 で最初の checked report として `npm run audit:reference-coverage` を実行した。
結果は `Failures: 0`。

| Inventory | Count |
| --- | ---: |
| Grammar sections | 18 |
| Structured item contexts | 22 |
| Structured items | 158 |
| Element types | 35 |
| Element properties | 95 |
| Diagnostic codes | 19 |
| Diagnostic push sites | 17 |
| Renderer output features | 189 |
| Generated Reference marker files | 24 |
| English Reference pages | 12 |
| Japanese Reference pages | 12 |
| VS Code commands | 5 |
| CLI commands | 11 |
| Example catalog entries | 28 |
| Example files | 28 |

初回 report の warning:

| Warning | Classification | Next Action |
| --- | --- | --- |
| `rules.md` の English/Japanese key heading count が異なる (`9` vs `8`) | English/Japanese depth gap candidate | #1413 で triage する。実際の content asymmetry なら focused docs ticket を作成する。 |
| Reference coverage marker がまだない | Follow-up infrastructure gap | #1413 で triage する。missing coverage を release-blocking にする前に stable feature ID または coverage marker の ticket 化を検討する。 |
| Feature-to-Reference mapping が report-only | Expected skeleton limitation | missing Reference page/section を failure に昇格する前に #1413 で triage する。 |
| Diagnostic と renderer/export output coverage は manual review が必要 | Expected skeleton limitation | #1413 で diagnostics、renderer/export output、CLI、VS Code、examples の cluster ごとに triage する。 |

これらの warning は初回 report では release-blocking にしない。#1413 の triage input
として扱い、#1412 では広範な Reference prose 修正を行わない。

## initial gaps to track

| Gap | Why It Matters | Suggested Follow-up |
| --- | --- | --- |
| machine-readable feature inventory がない | coverage を一貫して判定できない | grammar、element、CLI、VS Code、examples の inventory extractor を追加 |
| Reference coverage の明示 marker がない | checker が feature ID と prose を安定して対応付けにくい | optional coverage marker または generated inventory table を追加 |
| renderer output semantics が散在している | Basic Info、History、state views、chips、document tables が docs とずれやすい | renderer-output coverage table を Reference または maintainer inventory に追加 |
| 英日 depth が手動確認のみ | link check では同じ深さで説明しているか分からない | locale heading / coverage comparison report を追加 |

History の Guide / Reference coverage は #1386 で完了しました。今後の Guide-only gap の
モデルとして扱います。

## follow-up ticket ideas

- 最初の generated coverage report を triage し、missing / thin area ごとの docs ticket を
  作成する。
- feature ID 用 Reference coverage marker と generated inventory table を追加する。
- Basic Info、State Views、History、marker/chip display、export-only fields の
  renderer-output coverage inventory を追加する。
- 英日 Reference の page presence と key headings を比較する coverage report を追加する。

## maintenance rule

user-visible feature を追加するときは、merge 前に次のいずれかを更新します。

- exact syntax / behavior を説明する Reference page/section。
- workflow context が必要なら Guide または Recipe。
- output inspection が重要なら Example。
- user-facing でない場合だけ maintainer-only doc。

feature が `grammar-definition.ts` に表現される場合は、release 前に generated grammar /
reference docs を regenerate または check します。
