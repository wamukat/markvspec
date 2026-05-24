# Source Text Diagnostics

MarkVSpec は meaningful な source text を silently drop しない。source line が
parse されたにもかかわらず、render model、preview/export の semantic model、
diagnostic、または明示的な ignore rule のどれにも分類されない場合は warning にする。

## coverage

最初の実装対象は `## Actions` の `#### Pn: Process ...` subsection です。value-less な
process bullet が認識済み block label ではない場合、unrepresented source text
として分類し、diagnostic code `unrepresented-source-text` の warning を出す。

例:

```markdown
#### P1: Process Submit login
- Encode request body
- request:
  - method: POST
  - path: /login
```

`Encode request body` は著者が書いた meaningful text だが、サポート済み process
property ではなく、render もされない。そのため parser は silently drop せず
warning として報告する。

次の coverage は `## Preview Scenarios` の scalar scenario entry 配下の nested
bullet です。`state:`、`view:`、`model:`、`before:` の child bullet は scenario
model に寄与しないため、同じ diagnostic code で報告する。

例:

```markdown
### loaded

- state: loaded
  - Explain why loaded data is visible here
```

`Explain why loaded data is visible here` は scalar scenario property 配下の
author text だが、preview scenario model に表現されない。そのため
unrepresented source text として報告する。

Layout metadata coverage は `## Layout:*` または `## Slot:*` の layout group
直下にある value-less unknown bullet を対象にする。`stack`、`row`、`grid`、
`inline` のような canonical value-less layout flag は layout kind として表現されるため
warning 対象外です。`gap: md` のような key/value metadata も表現される。unsupported
な key/value metadata は extension item として保持されるため、この warning ではなく
`info` diagnostic になる。

例:

```markdown
## Layout: mobile

### L-Page

- stack
- gap: md
- unsupported layout sentence
```

`unsupported layout sentence` は meaningful な author text に見えるが、サポート済みの
layout flag/property ではなく、render もされない。そのため parser は対象 bullet 行に
unrepresented source text warning を出す。

## coverage matrix

分類:

- `represented`: source が semantic model、render model、generated document、
  preview、static export のいずれかに表現される。
- `represented-extension`: 標準 DSL ではないが保持され、extension `info`
  diagnostic として報告される。
- `unrepresented`: source は parse されたが出力に表現されないため、
  `unrepresented-source-text` warning になる。
- `unsupported`: malformed または unsupported な structured item として warning
  または error になる。
- `intentional-ignore`: syntax marker、空行、standalone authoring comment など、
  表示しないことが明示されている。
- `unknown`: 現在の tests / docs だけでは十分に分類できていない。

### cross-cutting block coverage

| source shape | classification | 根拠 / rule |
| --- | --- | --- |
| YAML Front Matter の required / known field | `represented` | `parseMarkVSpec` / `parseMarkVSpecProject` で parse され、required field と reference の test が missing / malformed value を確認している。 |
| YAML Front Matter の unknown field | `represented-extension` / `unsupported` | `x-owner: team-a` のような unknown scalar top-level key は Front Matter metadata として保持し、source line に `frontMatter.representedExtension` info diagnostic を出す。unknown non-scalar field は public `frontMatter` metadata map に保持できないため `unsupported`。 |
| `# SCR-*` screen heading | `represented` | heading の ID/title は Front Matter と照合され、screen metadata になる。 |
| 最初の `##` section より前の top-level prose | `represented` | screen description として保持される。`uses top-level prose as the screen description` で確認済み。 |
| unknown / free-form `##` section | `represented` | free-form Markdown section として保持され、semantic section ordering には影響しない。 |
| Section lead、entity lead、entity notes、`### Section Notes` | `represented` | `sectionProse`、`overview`、`notes` として preview / static export に表示される。structured-section-prose tests で確認済み。 |
| standalone HTML comment block | `intentional-ignore` | file-format と document-structure docs で source-only authoring comment と定義し、prose と render invalidation から除外する test がある。 |
| paragraph 内の inline HTML comment | `represented` | hidden authoring comment ではなく、paragraph source の一部として扱う。 |
| prose / notes 内の Markdown table | `represented` | section grammar が consume する場合を除き、`isEntityNoteBlock` と structured prose docs で supplemental Markdown として保持する。 |
| prose / notes 内の fenced code block | `represented` | entity prose tests が overview / notes 内の code fence 保持を確認している。 |
| prose / notes 内の blockquote | `represented` | `isEntityNoteBlock` が blockquote を supplemental Markdown として扱う。 |
| standalone comment 以外の raw HTML block | `unknown` | 現在の diagnostic では報告しないが、paragraph/table/code/blockquote prose より表示方針の根拠が弱い。具体的な出力期待を定義した時点で `represented` または `unsupported` に分類する。 |
| structured prose 内の thematic break | `unknown` | note block として受け入れるが、source text diagnostic 固有の assertion はない。出力欠落が確認されたら raw HTML と同じ follow-up に含める。 |

### section coverage

| section / area | heading and prose | top-level list / table entry | nested list entry | current classification and follow-up |
| --- | --- | --- | --- | --- |
| Front Matter | N/A | YAML field は `represented`。malformed YAML / missing required field は `unsupported`。unknown scalar top-level key は `represented-extension`。unknown non-scalar top-level key は `unsupported`。 | `references.*` の nested value は template / partial 定義として `represented`。 | unknown scalar YAML key は `frontMatter.representedExtension` info diagnostic になり、`unrepresented-source-text` warning にはしない。unknown non-scalar key は `frontMatter.unsupportedExtension`。 |
| top-level overview prose | 最初の `##` より前の paragraph は `represented`。 | N/A | N/A | standalone comment は `intentional-ignore`。 |
| unknown / free-form sections | `##` heading と Markdown body は `represented`。 | list / table / code は free-form Markdown として `represented`。 | nested list は Markdown として `represented`。 | structured diagnostic は期待しない。 |
| `## States` | section lead / notes は `represented`。 | state bullet は `represented`。malformed suffix marker は `unsupported`。 | state 配下の nested bullet は state message として `represented`。parent state がない nested bullet は `unsupported`。 | state parser tests と structured prose tests で確認済み。 |
| `## Layout:*` | section lead、layout group heading、layout overview、notes は `represented`。 | canonical metadata (`stack`, `row`, `grid`, `inline`, `gap: md`) は `represented`。unknown key/value metadata は `represented-extension`。`#### Items` 外の direct `L-*` / `E-*` child ref は `unsupported`。unknown value-less metadata は `unrepresented` (#1453)。 | `partial:` child は `represented`。その他の indented metadata は `unsupported`。 | `#### Items` は layout metadata diagnostic ではなく layout item classifier が扱う。 |
| `## Slot:*` | `## Layout:*` と同じ。slot content に scope される。 | `## Layout:*` と同じ。#1453 の test は Slot unknown value-less metadata も含む。 | `## Layout:*` と同じ。 | Layout と同じ parser path で確認済み。 |
| `## Slots` | section lead / notes と slot definition heading は `represented`。 | slot definition key/value bullet は `represented`。unsupported key は `unsupported`。 | unexpected nested entry は slot-definition classifier により `unsupported` または ignore される。 | 現時点で `unrepresented-source-text` coverage は不要。 |
| `## Elements` | section/entity lead と notes は `represented`。malformed heading は `unsupported`。 | canonical element property は `represented`。unknown element property は `represented-extension`。malformed structured data は `unsupported`。 | option/table/sample/control など認識済み nested entry は `represented`。malformed nested entry は `unsupported`。 | element validator と structured prose tests で確認済み。 |
| `## Actions` | section/action lead と notes は `represented`。malformed heading は `unsupported`。 | `#### From` と section-based process heading は `represented`。unsupported action/process structured item は `unsupported`。 | process detail、result entry、case、effect、syntax label は `represented` または `intentional-ignore`。value-less unsupported process text は `unrepresented` (#1325/#1332)。 | `unrepresented-source-text` の最初の coverage はここ。 |
| `## Events` | section lead / notes は `represented`。 | `event: A-ActionId` entry は `represented`。malformed value-less / empty action entry は `unsupported`。 | nested event entry は ignored content として `unsupported`。 | `parseEventsSection` で確認済み。text-specific warning は現時点で不要。 |
| `## Preview Scenarios` | section/scenario lead と notes、scenario heading は `represented`。 | canonical scalar property (`state`, `view`, `model`, `before`) は `represented`。unknown value-less / unsupported key は `unsupported`。 | `route`、`samples`、`cases` 配下は `represented`。scalar entry 配下の child は `unrepresented` (#1332)。 | `route:`、`samples:`、`cases:` の syntax-only label は `intentional-ignore`。 |
| `## Field Validations` / `## Cross-field Validations` / `## Validations` | section/validation lead と notes は `represented`。 | validation heading と canonical rule/property は `represented`。valid heading 前の structured-looking list item は `unsupported`。 | rule target と nested rule metadata は accepted syntax なら `represented`。unsupported nested validation item は `unsupported`。 | validation-section semantic tests で確認済み。 |
| `## Business Rules` | section/rule lead と notes は `represented`。 | `### R-*` rule と free-form rule bullet は `represented`。unsupported rule property は `unsupported`。 | rule parser が受け入れる nested body/property は `represented`。 | list-only Business Rules は意図的に `R-BusinessRules` として `represented`。 |
| `## Error Codes` | section/error-code lead と notes は `represented`。 | `ERR-*` heading と key/value property は `represented`。unsupported key は `unsupported`。 | nested metadata は error-code structured item parser に従う。 | error-code parser と reference coverage docs で確認済み。 |
| `## History Fields` | section overview / trailing notes は `represented`。 | field schema bullet は `represented`。 | accepted schema metadata は `represented`。structured content 後のその他 content は notes になる。 | raw-line section prose を使う。history tests で確認済み。 |
| `## History` | section overview / notes は `represented`。 | history entry heading、metadata bullet、body paragraph/list は `represented`。 | nested body list は history body Markdown として `represented`。 | history tests で確認済み。 |
| `## Notes` | section heading と Markdown body は `represented`。 | list / table / code は note Markdown として `represented`。 | nested list は `represented`。 | DSL semantics ではない author text の推奨配置先。 |
| `## Open Questions` | section heading と Markdown body は `represented`。 | list / table / code は note Markdown として `represented`。 | nested list は `represented`。 | Notes と同じ扱い。 |

### unknown と follow-up 方針

現在の `unknown` entry は既知の false negative ではなく、source text diagnostics
contract がまだ十分に具体化されていない領域です。該当ケースの issue が出た場合は、
次の内容で follow-up ticket を作る。

- exact source example
- 期待する分類が `represented` / `unsupported` / `unrepresented` のどれか
- 期待する diagnostic code、severity、source line
- text が表示されるべき preview / export / generated document surface、または
  warning すべき理由

既知の follow-up 候補:

- structured prose 内の raw HTML block と thematic break: renderer が一貫して
  表現しているか、または `unsupported` diagnostic にするべきかを確認する。

## intentional ignore

classifier は `request:`、`params:`、`result:`、`case:`、`display:`、
`update:` のような syntax-only label を warning 対象にしない。意味はその child
entry が担う。

Preview Scenario の `route:`、`samples:`、`cases:` も syntax-only label として
扱う。意味は route sample、element sample、case reference の child entry が担う。

サポート済み process detail、result entry、case entry、state effect、layout item、
element property、section prose/notes は既存 model に表現されるため、この warning
を出さない。

layout group 配下の `#### Items` entry は layout metadata classifier ではなく layout
item classifier が扱う。`#### Items` 配下の element reference、layout group reference、
field mapping、slot reference はこの warning 対象にしない。

## 既知の制限

これは document 内の全 Markdown text node に対する完全な soundness guarantee
ではない。現在の coverage は確認済みの `Actions > Process`、`Preview Scenarios`、
Layout metadata の blind spot に限定する。今後拡張する場合は、rendered HTML の raw
string 検索ではなく、section ごとの classifier を追加する。
