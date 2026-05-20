# ユーザー向けドキュメント棚卸し

作成日: 2026-05-20

この文書は、MarkVSpec の公開ドキュメントを「OSS 利用者が MarkVSpec を使うための情報」として見直すための棚卸しです。

対象は次の範囲です。

- `README.md`
- `README.ja.md`
- `docs/en/` と `docs/ja/` のユーザー向け文書
- `docs/en/maintainers/` と `docs/ja/maintainers/` は、ユーザー導線へ漏れていないかだけを見る
- `examples/`
- `site/index.html`
- 生成サイトでの主要導線

## 改善方針

ドキュメントは、実装者の設計メモではなく、利用者が次の判断をできるようにする。

1. 何をインストールすればよいか。
2. 最初の `.vspec.md` をどう書けばよいか。
3. VS Code preview で何を確認できるか。
4. HTML / PDF をどう出力するか。
5. 自分の画面に近い example をどこで見ればよいか。
6. 正確な DSL をどこで引けばよいか。

そのため、公開導線では以下を優先する。

- Start は clone 不要で完結させる。
- Guide は「何を書けば preview で何が見えるか」を短く説明する。
- Reference は正確な構文だけを引ける形にする。
- Recipes は利用目的から入れる形にする。
- Examples は、利用者が真似できる画面パターンとして整理する。
- Maintainer / contributor 情報は通常のユーザー導線から外す。

## 20の見直し観点

| # | 観点 | 判定 | 棚卸し結果 |
| --- | --- | --- | --- |
| 1 | README と docs root が OSS 利用者向けの入口になっているか | 要修正 | `README.md` / `README.ja.md` に contributor command と maintainer directory へのリンクが残っている。`docs/en/README.md` / `docs/ja/README.md` も maintainer links を前面に出している。通常の利用者にはノイズ。 |
| 2 | clone 不要の初回体験が成立しているか | 概ねOK | Start は Marketplace install、任意 folder、`hello.vspec.md`、preview、export の流れになっている。README も clone 不要を明記している。 |
| 3 | 最初のサンプルが警告や未定義参照を出さないか | 修正済み | Start の Hello Screen と `examples/01-basics/hello-screen.vspec.md` は外部 screen ID を参照せず、同じ `idle` state に留まる最小 action に揃えた。 |
| 4 | Canonical DSL が README / Guide / Reference / Examples で一致しているか | 修正済み | marker 付き heading を `### marker:ID Name` として Reference に明記した。marker は preview 表示用で、参照に使う安定 ID は `:` より後ろ。 |
| 5 | State の書き方が一貫しているか | 修正済み | Start / Guide / Reference の基本例を `## States` 配下の bullet に揃え、初期 state は `- idle*` のように `*` で示すと明記した。 |
| 6 | Action / HTTP request syntax が正確か | 概ねOK | ユーザー向け docs は HTTP method/path を `request:` に統一済み。`server:` は HTTP そのものではない server-side service call の説明としてだけ残っている。 |
| 7 | Action caller と結果が追えるか | 一部要修正 | Actions は概ね `action: A-*`、`From`、`Process Pn:`、`case:` で追える。Partial Updates guide の最小例は「refresh button をクリック」と説明するが、例の中に button / caller がない。 |
| 8 | Validation と Business Rules の境界が明確か | 修正済み | field constraints、cross-field rules、server field validation、server business checks の4分類を日英 guide / reference / recipes で揃えた。required / format / range は input element 近くに置き、Business Rules は cross-field や product decision に限定する方針へ更新済み。 |
| 9 | Form Groups など examples が使う section が Reference に載っているか | 修正済み | `## Form Groups`、`## Events`、`## Preview Scenarios`、`## Field Validations`、`## Cross-field Validations`、`## Slots` / `## Slot: name`、`## Error Codes`、`## History Fields` / `## History` を Sections Reference に追加した。 |
| 10 | Element type / property が Reference に載っているか | 修正済み | Reference に `Spinner`、`Banner`、`Table`、`Badge`、`Select`、`Dialog`、`Toast`、`Tabs`、`ActionMenu` と showcase の specialized controls を追加した。`Message` は新規 source では使わず、`Banner` / `Text` / `Paragraph` / `Toast` に分ける方針を明記した。 |
| 11 | Element property の使い方が一貫しているか | 修正済み | `text` は read-only display copy、`label` は control/link 名、`value` は入力値や binding 名として使う方針を Reference に明記した。Heading は新規 source では `level` + `text` を使う。 |
| 12 | Partial Update が semantic に説明されているか | 修正済み | canonical syntax は result case の `display` に `target` と `message` / `element` / `partial` のいずれかを書く形に統一した。`display.partial` 表現は examples README から除去した。 |
| 13 | Guide / Reference / Recipes の役割分担が守られているか | 概ねOK | Guide は概念と最小例、Reference は構文、Recipes は目的別に分かれている。ただし一部 Guide の最小例が説明不足で、Reference に未掲載の構文へ飛ぶ。 |
| 14 | Examples が利用者向けの学習順になっているか | 修正済み | `examples/README.md`、docs examples index、generated examples index を beginner / form-validation / loading-empty-error / partial-update / navigation-overlay / reuse-template などの利用者タスク分類へ整理した。 |
| 15 | Screenshots がページの目的に合っているか | 概ねOK | Start、Guide、Reference に VS Code / preview screenshot が置かれている。最近差し替えた actions screenshot は source と preview の対応が取れている。今後は全 screenshot を「何を理解させる画像か」で継続監査する。 |
| 16 | 日本語と英語で同じ情報を得られるか | 修正済み | 日本語 Recipes index を英語版と同等の構造へ拡充し、生成 showcase の related docs は English / Japanese の両方を明示する導線へ変更した。 |
| 17 | ユーザー導線から maintainer / implementation detail が分離されているか | 要修正 | README と docs root に maintainer links がある。`docs/en/README.md` / `docs/ja/README.md` はユーザー入口として再設計し、maintainers は明示的な contributor path に隔離する。 |
| 18 | 「旧」「移行済み」「互換」「実装者メモ」のノイズが公開導線に残っていないか | 修正済み | 旧ドキュメント警告や移行済み文書のノイズは見つからない。user-facing docs に残っていた実装者寄り表現は、利用者が preview / review で判断できる表現へ言い換えた。 |
| 19 | CLI が VS Code-first workflow を邪魔していないか | 修正済み | CLI reference / recipes は `hello.vspec.md` を基本例にし、repository checkout 前提の `examples/` path はその前提を明記した。 |
| 20 | site/index.html が最初の選択を単純にしているか | 一部要修正 | root で日英 docs / examples へ進める点は良い。より user-first にするなら CTA は「Start in 5 minutes / 5分で試す」を第一にし、言語切替と examples を整理する。 |

## 優先度付き改善項目

### P0: 正確性

1. Reference と examples の DSL 表記差を解消する。
   - 対応済み: marker 付き heading を正式構文として文書化した。
   - 対応済み: 初期 state は `## States` 配下の bullet に `*` を付ける形に揃えた。
2. examples が使う section / element type / property を Reference に追加する。
   - 対応済み: `Form Groups`
   - 対応済み: `Events`
   - 対応済み: `Preview Scenarios`
   - 対応済み: `Field Validations`
   - 対応済み: `Cross-field Validations`
   - 対応済み: `Slots` / `Slot: name`
   - 対応済み: `Error Codes`
   - 対応済み: `History Fields` / `History`
   - 対応済み: `Spinner`、`Banner`、`Table`、`Badge`、`Select`、`Dialog`、`Toast`、`Tabs`、`ActionMenu`
   - 対応済み: `Message` type の扱い、`text` / `label` / `value` の使い分け
3. Partial Update の canonical syntax を1つに決めて揃える。
   - 対応済み: `display` の下で `message` / `element` / `partial` をどう使い分けるかを Reference に書いた。
   - 対応済み: `display.partial` のような曖昧な説明を避ける。

### P1: 初回利用体験

4. README から contributor / maintainer 情報を通常導線から外す。
   - 必要なら末尾に短い `Contributing` link だけ置く。
   - maintainer directory への直接リンクは user README から外す。
5. Start の Hello Screen が未定義参照で不安を生まないようにする。
   - 対応済み: `SCR-NEXT` を使わない最小 action に変更した。
6. CLI 例を clone 不要の利用者向けと repository checkout 向けに分ける。

### P2: 情報設計

7. `docs/en/README.md` / `docs/ja/README.md` をユーザー向け docs index として作り直す。
   - Start
   - Guide
   - Recipes
   - Reference
   - Examples
   - CLI
   - Maintainer links は通常導線から外す。
8. Examples を「真似できる画面パターン」として再分類する。
   - 初心者向け
   - form / validation
   - loading / empty / error
   - partial update
   - navigation / overlay
   - reuse / template
9. 日本語と英語の深さを揃える。
   - 特に Recipes と Examples の導入文。
   - generated showcase からの related docs を現在の言語に合わせる。

### P3: 表現品質

10. 実装者目線の文をユーザーの目的に言い換える。
    - 「実装者にも伝わる」より「仕様レビューで判断できる」。
    - 内部カバレッジ目線より「画面パターンを確認する」。
11. Screenshot は「説明したい判断」と対応させる。
    - state ページなら状態遷移または state view。
    - action ページなら caller、process、display update の対応。
    - validation ページなら入力制約とエラー表示。

## 実装者目線表現の検索結果

2026-05-20 時点で次を検索した。

```sh
rg -n -i "renderer coverage|implementation task|implementer|実装タスク|実装者にも" docs/en docs/ja --glob '!**/maintainers/**'
```

user-facing docs に残っていた該当表現は次のように修正した。

| File | Before | After |
| --- | --- | --- |
| `docs/en/recipes/loading-error.md` | implementation tasks can follow it | reviewers can see the user-visible result |
| `docs/ja/recipes/loading-error.md` | preview、review、実装タスクへつなげやすい | preview と review で user-visible result を判断しやすい |
| `docs/ja/guide/validation.md` | 実装者にも AI にも伝わる | 仕様レビューで validation の判断と表示位置を確認できる |

maintainers 配下には、過去の監査観点や設計意図として同じ語が残る場合がある。これは通常の user-facing 導線ではなく、変更理由の記録として扱う。

## Screenshot 対応表

Guide / Reference の screenshot は、「そのページで何を判断させるか」と対応させる。

| Area | Page | Screenshot | 目的 | 状態 |
| --- | --- | --- | --- | --- |
| Guide | `guide/index.md` | `assets/start/vscode-preview-clean.png` | VS Code source と preview を並べて確認できることを示す | OK |
| Guide | `guide/markdown-model.md` | `assets/vscode-previews/hello-screen-vscode-preview.png` | Markdown source が preview へ変換される関係を示す | OK |
| Guide | `guide/states.md` | `assets/vscode-previews/async-loading-vscode-preview.png` | state 一覧と state view の切り替えを示す | OK |
| Guide | `guide/layout.md` | `assets/vscode-previews/responsive-profile-vscode-preview.png` | mobile / desktop layout の違いを示す | OK |
| Guide | `guide/elements.md` | `assets/vscode-previews/source-kind-metadata-vscode-preview.png` | element と表示 content metadata の対応を示す | OK |
| Guide | `guide/actions.md` | `assets/vscode-previews/form-submit-flow-vscode-preview.png` | caller、process、display update の関係を示す | OK |
| Guide | `guide/validation.md` | `assets/vscode-previews/single-field-validation-vscode-preview.png` | input constraint と error 表示を示す | OK |
| Guide | `guide/partial-updates.md` | `assets/vscode-previews/profile-page-with-template-vscode-preview.png` | host screen と partial refresh の関係を示す | OK |
| Reference | `reference/index.md` / `file-format.md` | `assets/vscode-previews/hello-screen-vscode-preview.png` | 最小 `.vspec.md` と生成 preview の全体像を示す | OK |
| Reference | `reference/sections.md` | `assets/vscode-previews/hello-screen-sections-vscode-preview.png` | section 構成が preview にどう表れるかを示す | OK |
| Reference | `reference/ids.md` | `assets/vscode-previews/hello-screen-ids-vscode-preview.png` | stable ID が source と preview の対応点になることを示す | OK |
| Reference | `reference/elements.md` / `limitations.md` | `assets/vscode-previews/source-kind-metadata-vscode-preview.png` | semantic element metadata と制限事項を示す | OK |
| Reference | `reference/actions.md` | `assets/vscode-previews/form-submit-flow-vscode-preview.png` | action case と screen update の追跡点を示す | OK |
| Reference | `reference/validations.md` | `assets/vscode-previews/single-field-validation-vscode-preview.png` | validation syntax と error display の対応を示す | OK |
| Reference | `reference/rules.md` | `assets/vscode-previews/history-and-errors-vscode-preview.png` | business rule / structured sections の参照先を示す | OK |

## サブエージェントからの主な指摘

- 対応済み: README と docs root の通常導線から maintainer / contributor 情報を外した。
- 対応済み: Reference に marker-prefixed heading syntax を追加し、examples の表記と揃えた。
- 対応済み: `Form Groups`、`Slots`、`Error Codes` など、examples が使う section を Sections Reference に追加した。
- 対応済み: Element Reference に showcase element type と `text` / `label` / `value` の使い分けを追加した。
- 対応済み: Partial update は `display` + `target` + `message` / `element` / `partial` に揃えた。
- Japanese examples 導線から generated showcase に進むと、related docs が English に寄る。
- `document-structure.html` のように、source browsing では存在しない `.html` link が混ざる箇所がある。

## 監査時に実行した確認

```sh
find README.md README.ja.md docs examples site -maxdepth 3 -type f \( -name '*.md' -o -name '*.html' -o -name '*.vspec.md' \) | sort
rg -n "server:|Triggered|Effects|Cases|旧|legacy|移行済み|分割済み|TODO|FIXME|coming soon|placeholder|draft|実装|internal|maintainer|developer|release|A-Save|A-SubmitProfile|A-SubmitLogin|WireMD" README.md README.ja.md docs examples site --glob '!docs/**/maintainers/**'
rg -n "!\[|<img|\.png|\.jpg|\.svg|preview" README.md README.ja.md docs/ja docs/en --glob '!**/maintainers/**'
rg -n "request:|server:|sync:|receive:|case:|display:|mode: replace|HttpRequest|ServerCall|Process:" docs/ja docs/en examples --glob '!**/maintainers/**'
npm run build:pages
npm run check:pages-site
```
