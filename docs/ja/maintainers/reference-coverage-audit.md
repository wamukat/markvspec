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

## proposed minimal checker

将来の `npm run audit:reference-coverage` は、まず noise の少ない deterministic check から始めます。

1. grammar sections、structured contexts、element types、CLI commands、VS Code commands、
   examples catalog から feature inventory JSON を作る。
2. Reference headings、generated block markers、maintainer-owned coverage markers から
   Reference coverage を抽出する。
3. Reference-required feature に Reference page/section がなければ fail する。
4. Guide-only / Example-only feature に Reference link がなければ warning にする。
5. 英日で page presence と key heading の非対称を report する。

prose-depth scoring は、少なくとも 1 release cycle は手動確認してから release gate の
failure にします。

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

- `audit:reference-coverage` の inventory extraction と report output を実装する。
- feature ID 用 Reference coverage marker と generated inventory table を追加する。
- Basic Info、State Views、History、marker/chip display、export-only fields の
  renderer-output coverage inventory を追加する。
- 英日 Reference の page presence と key headings を比較する coverage report を追加する。
- 最初の generated coverage report を triage し、missing / thin area ごとの docs ticket を
  作成する。

## maintenance rule

user-visible feature を追加するときは、merge 前に次のいずれかを更新します。

- exact syntax / behavior を説明する Reference page/section。
- workflow context が必要なら Guide または Recipe。
- output inspection が重要なら Example。
- user-facing でない場合だけ maintainer-only doc。

feature が `grammar-definition.ts` に表現される場合は、release 前に generated grammar /
reference docs を regenerate または check します。
