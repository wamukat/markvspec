# ドキュメント仕様監査サマリ

## この文書の位置づけ

この文書は、2026-05-21 に実施した MarkVSpec 利用者向けドキュメントの
仕様一致性監査の結果をまとめる保守者向け記録です。

対象は `docs-site/src/content/docs/{ja,en}`、`docs/{ja,en}`、README、
examples showcase への導線です。公開サイトの正本は
`docs-site/src/content/docs/` であり、`docs/` は repository 上で読める
Markdown mirror として扱います。
README.md / README.ja.md は旧構文、未実装構文、利用者入口としての表現を
検索対象に含め、必要な日本語表現とリンクラベルを修正しました。

## 監査方針

- ドキュメントの記述を、実装、テスト、examples、または生成 preview のいずれかに照合する。
- 未実装構文、古い構文、創作 DSL、実装予定を現在仕様として書かない。
- 完全な `.vspec.md` 例は、parse、validate、preview、export のいずれかで確認する。
- 断片例は、対応する parser、validator、renderer、test、example の根拠を明記する。
- 日本語と英語で同じ仕様を説明し、`docs-site` と `docs/` の同名内容を矛盾させない。

## 領域別結果

| Ticket | 領域 | 主な主張 | 根拠 | 修正 | 残リスク |
| --- | --- | --- | --- | --- | --- |
| #1339 | docs source of truth | 公開サイトの正本は `docs-site`、`docs/` は mirror。 | `scripts/build-github-pages.mjs`, `scripts/check-pages-site.mjs`, `scripts/example-catalog.mjs` | `docs/ja/maintainers/documentation-architecture.md` に方針を追記。 | なし。 |
| #1340 | Elements | 要素は意味で書き、低レベル styling や raw width を仕様化しない。 | element parser / renderer / examples | Element docs を実装済み type/property に合わせ、raw width の扱いを制限事項へ整理。 | なし。 |
| #1341 | Layout / Slots / Templates | `stack`, `row`, `grid`, `inline` と `Items` / `Slots` / `P-*` を現在仕様として扱う。 | layout renderer / presentation panel example / targeted tests | 未対応の `column` などを除去し、P-* と mirror docs を同期。 | なし。 |
| #1342 | Actions / Events / Process / case | Action は `Process Pn:`、`request`、`receive`、`case:`、`display` で操作と結果を書く。 | action process read model tests / examples | `request: POST /login` など、実装と合わない説明を修正。 | なし。 |
| #1343 | Field Validations / Cross-field Validations | 単項目は `## Field Validations`、複合項目は `## Cross-field Validations` と `F-*` を使う。 | validation-domain tests / markdown-section-semantic tests | Element に validation rule があるように見える説明を整理し、Business Rules との境界を明確化。 | なし。 |
| #1344 | Business Rules / Error Codes | 業務判断は `## Business Rules`、Action 結果は `case: business-rule-violation` と `business rule:` で参照する。 | validation-domain / action process tests | Error Codes の required fields と display 値を実装に合わせた。 | なし。 |
| #1345 | Preview Scenarios / State Views | state と同名 scenario、`samples:`、`rows:`、`route:`、Action case 参照を現在仕様として扱う。 | preview scenario tests / sample rows tests | `before:` の意味、validation result と action case の混同を修正。 | なし。 |
| #1346 | CLI / Export / VS Code | CLI は `--version`, `validate`, `diagnose input`, `export html/pdf`, `export document-list` を説明対象にする。 | CLI 実行結果 / targeted export commands | CLI reference と start/recipes の説明を実装済みコマンドへ追従。 | example PDF 配布物は別途 #1351 で削除済み。 |
| #1347 | Examples と docs | examples は学習順と画面パターンから探す導線として扱う。 | `examples/catalog.yml`, `scripts/example-catalog.mjs`, `npm run audit:examples` | 日本語入口文と examples link を整理し、部分更新の入口を `Profile Home` に統一。 | なし。 |
| #1348 | 英日差分 / mirror | `docs-site` と `docs/` の user-facing 同名ページは矛盾させない。 | file list comparison / docs mirror link check / HTTP 200 | `docs/{ja,en}` を `docs-site` 正本へ同期し、`guide/document-structure.md` を mirror に追加。 | `document-structure.md` は raw `<style>` を含むため、GitHub Markdown では Starlight 表示と完全一致しない。mirror としては許容。 |
| #1351 | build 軽量化 | example PDF 配布物は docs-site build 成果物に含めない。 | build/check-pages / link search | PDF artifacts と example からの PDF link を削除。 | CLI / VS Code の PDF 出力機能自体は残す。 |

## 確認したコマンド

代表的な確認は各チケットコメントに残しています。横断確認として次を実行しました。

```sh
git diff --check
npm run audit:examples
node packages/cli/dist/index.js --version
node packages/cli/dist/index.js validate examples/01-basics/hello-screen.vspec.md
node packages/cli/dist/index.js export html examples/01-basics/hello-screen.vspec.md --out .work/audit-cli-html
node packages/cli/dist/index.js export document-list packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md --out .work/audit-cli-docs
```

Starlight のフル build は、設計書監査中の反復では時間短縮のため常用しませんでした。
代わりに対象ページの HTTP 200、targeted unit tests、examples audit、CLI 実行、
リンク検索で確認しました。

## 残リスクとフォローアップ

- #1352: example HTML の動的レンダリング化は、今回の仕様記述監査完了後に設計検討する。
- `docs/{ja,en}/guide/document-structure.md`: GitHub Markdown では Starlight の CSS 変数が完全には効かない可能性がある。公開サイトでは Starlight で確認する。
- `packages/core` の全体 `index.test.js` には、既知の stale release example expected list 差分が残っている。今回の監査では対象領域ごとの targeted tests と examples audit で確認した。

## 現時点の判断

今回確認した範囲では、利用者向けドキュメントに、現在仕様として読める未実装構文、
古い `Triggered` / `Effects` / `Cases` 形式、創作 DSL、または実装予定を
現在仕様として扱う記述は確認していません。

今後ドキュメントを更新する場合は、`docs-site/src/content/docs/` を先に直し、
同じ commit で `docs/` mirror を追従させます。仕様を追加する場合は、対応する
実装、test、example、または明示的な follow-up ticket を根拠として残します。
