# Sample Data Model 撤廃設計

対象 ticket: #1136

## 結論

`## Model Samples` / Sample Data Model は canonical DSL から撤廃する。`Data Samples` へ
rename する案は採用しない。MarkVSpec は画面仕様 DSL なので、preview のために
`${model.*}` や `${data.*}` の data path を先に定義し、それを画面へ流し込む構造を
authoring model に残さない。

表示サンプルは残す。残す場所は以下の2つに寄せる。

- Element の代表表示値: `sample`
- Preview Scenario の表示値 override: `samples`

`source: data` は値の由来分類として残す。これは data path ではなく、「この表示値が
業務データ/API応答/サーバ側モデルなどの外部データ由来である」という分類を示すだけにする。

## 廃止対象

- `## Model Samples`
- `#### ${model.path}` による sample set
- `${model.*}` / `${data.*}` を preview sample 解決の canonical path として扱うこと
- Model Samples path と Element `value` / `src` / `rows` を照合する validation
- state wireframe 直前に表示している Model Samples block
- docs/examples で Model Samples を推奨する説明

## 残す対象

- Element の `source: data`
- Element の `sample`
- Table/List の複数行サンプル
- Preview Scenario による state/scenario 別表示サンプル
- preview 補助としての未指定 placeholder

## 構文

### Element の代表 sample

Element が通常表示で使う代表値は `sample` に書く。

```markdown
### E-ProfileName Text

- source: data
- sample: Taylor Stone
```

`sample` は preview/export に表示する代表表示内容であり、実装上の store path ではない。

### Table/List の Element sample rows

Table/List の静的な代表行は、Element の `sample rows:` に list 記法で書く。
Markdown table は canonical にしない。行境界を曖昧にしないため、各行は `row:` item とし、
各 field も list item として書く。YAML 風の継続行には依存しない。

```markdown
### E-NoticeTable Table

- source: data
- Columns:
  - title: Title
  - publishedAt: Published
- sample rows:
  - row:
    - title: Maintenance notice
    - publishedAt: 2026-05-01
  - row:
    - title: Invoice update
    - publishedAt: 2026-04-22
```

Element 側の明示的な0件 sample は `sample rows: []` と書く。

### Preview Scenario の samples

state/scenario ごとの表示値は、`## Preview Scenarios` の `samples` に書く。

```markdown
## Preview Scenarios

### idle-loaded

- state: idle
- samples:
  - E-ProfileName: Taylor Stone
  - E-PointsBalance: 12,400
```

Table/List の行は `rows` に list 記法で書く。
Scenario 側も Element 側と同じく、各行は `row:` item とし、各 field は list item として書く。

```markdown
## Preview Scenarios

### idle-with-results

- state: idle
- samples:
  - E-NoticeTable:
    - rows:
      - row:
        - title: Maintenance notice
        - publishedAt: 2026-05-01
      - row:
        - title: Invoice update
        - publishedAt: 2026-04-22

### idle-empty

- state: idle
- samples:
  - E-NoticeTable:
    - rows: []
```

### state scoped samples の扱い

state 定義そのものに `samples` は持たせない。`## States` は state vocabulary を宣言する
場所であり、preview data を混ぜると責務が曖昧になるため。

state scoped sample は、`state: <state>` を持つ Preview Scenario の `samples` として表す。
その state の baseline preview に値を与えたい場合も、同じ state を指す scenario を定義する。
Preview Scenario は「レビューしたい画面状態」を束ねる単位であり、state / view context /
sample override を同じ場所で読める。

### common / cross-state samples の扱い

画面全体に共通の表示サンプルは、まず Element `sample` / `sample rows:` に置く。
複数 Element をまとめて scenario 側で共有したい場合は、将来の `samples profile`
または `extends samples` を検討するが、Phase 1 では導入しない。

Phase 1 での解決優先順位は次の通り。

1. Preview Scenario `samples`
2. Element `sample` / `sample rows:`
3. Element の `label` / `placeholder` / options など既存 fallback
4. 未指定 placeholder

ticket 本文にある `State scoped samples` と `Common / cross-state samples` は、Phase 1 では
それぞれ Preview Scenario と Element sample で実現する。独立した data model section は作らない。
重複が大きくなった場合だけ、Phase 2 で sample profile を検討する。

## `rows: []` と未指定 rows

`rows: []` は「0件である」ことを明示する canonical 表現とする。

Table preview は `rows: []` の場合でも Table 部品自体を配置し、columns が定義されていれば
header を表示する。body には muted text で `(no data)` を1行表示する。

`(no data)` は業務文言ではない。empty state の設計漏れを発見するための preview 補助表示であり、
実際の画面で `No notices found.` のような文言や別 UI を出す場合は、作者が Layout / Element /
display / Preview Scenario として明示する。

Table/List が `source: data` かつ rows/sample が未指定の場合は warning とする。これは
「データ由来の繰り返し要素なのに代表表示がない」状態を見つけるための診断である。
Element 側では `sample rows: []`、Scenario 側では `rows: []` が指定されていれば、
0件 sample が明示されているので warning にはしない。

## `value` / `src` の扱い

`value` は廃止候補だが、この設計 ticket では即時全面廃止しない。責務は次のように分ける。

- `sample`: preview/export に表示する代表表示内容
- `source`: 値の由来分類
- `initial value`: 入力要素の初期値
- `value`: 既存互換のため残すが、表示サンプルの推奨記法にはしない
- `src`: Image などのリソース参照用に残すが、`${model.*}` sample path ではなく具体的な placeholder/sample resource を推奨する

Phase 1 では `value: ${model.*}` / `src: ${model.*}` を canonical sample 解決として扱わない。
Phase 2 で `value` を Input 系に限定するか、display element では `sample` へ移行するかを決める。

## Preview 表示

Model Samples block は state wireframe 直前に表示しない。

Scenario によって注入された値は、wireframe 下に小さな `Scenario Samples` 表として表示する。
この表は「この scenario で何を override したか」を確認するための補助表示であり、
Model Samples のような独立 data model block ではない。

表示例:

| Target | Sample |
|---|---|
| E-ProfileName | Taylor Stone |
| E-NoticeTable.rows | 2 rows |

`Scenario Samples` は scenario samples がある場合だけ表示する。Element `sample` だけで
描画している通常 preview では、必要以上に表を増やさない。

## Parser / Validator 方針

- `## Model Samples` は unsupported section として診断する。
- 互換 alias として `## Data Samples` は作らない。
- Preview Scenario `samples` を parser の構造化データとして持つ。
- `samples` の target は既存 Element ID を参照する。
- unknown target は error。
- scalar sample は Text / Paragraph / Heading / Button / Badge など単一表示要素に適用できる。
- object sample の `rows` は Table/List に適用できる。
- Element の `sample rows:` と Scenario の `rows:` は、どちらも `row:` item の配列として parse する。
- `row:` 内の field は `- key: value` の list item として parse する。
- Element の `sample rows: []` と Scenario の `rows: []` は valid な0件 sample とする。
- Table/List に `source: data` があり、Element `sample rows:` も Scenario `rows` もない場合は warning。
- Markdown table による sample rows は canonical ではない。Phase 1 で unsupported にする。

## Renderer 方針

- state/scenario render context に resolved samples を持たせる。
- wireframe renderer は Element ID から sample を引く。
- Scenario sample があれば Element sample より優先する。
- Element `sample rows:` は Scenario `rows` がない場合の fallback として使う。
- Table/List は `rows` を展開する。
- `rows: []` の Table は header + `(no data)` fallback を表示する。
- Scenario sample override は `Scenario Samples` 表にも表示する。

## Docs / Examples 方針

`examples/02-states/model-samples.vspec.md` はそのまま残さない。役割を
`scenario-samples.vspec.md` などに改め、Element `sample` と Preview Scenario `samples`
を説明する例に置き換える。

Model Samples を前提にしている既存 examples は、次の方向で移行する。

- `async-loading`: state/scenario 別の loading/empty/error sample を Preview Scenarios へ移す。
- `parallel-initial-load`: `idle` 表示値を Element sample または Preview Scenario samples へ移す。
- `search-list`: Table rows を Scenario samples の `rows` へ移す。
- partial/template examples: screen-specific sample は screen 側の scenario samples に寄せる。

docs は英日を揃えて更新する。

## 実装分割

### Ticket A: Scenario samples parser / validator

- Preview Scenario `samples` を parser で構造化する。
- scalar / `rows` / `rows: []` を扱う。
- Element `sample rows:` / `sample rows: []` を扱う。
- `row:` item と field list item の文法を test する。
- target validation と `source: data` rows 未指定 warning を追加する。
- `## Model Samples` を unsupported として診断する。
- parser / validator test は、scalar sample、row sample、0件 rows、missing target、missing rows warning を含める。

### Ticket B: Renderer / preview

- resolved samples を render context に追加する。
- Element `sample` / `sample rows:` と Scenario `samples` の優先順位を実装する。
- Table/List rows と `rows: []` fallback を wireframe に反映する。
- wireframe 下に `Scenario Samples` 表を表示する。
- renderer / preview test は、scenario override precedence、Element sample fallback、`rows: []` の `(no data)` 表示、`Scenario Samples` 表の有無を含める。

### Ticket C: Docs / examples migration

- docs/en と docs/ja の Model Samples 説明を削除し、Scenario samples へ置き換える。
- examples から `## Model Samples` と `${model.*}` sample path を削除する。
- `model-samples.vspec.md` を scenario samples の例へ置き換える。
- release checklist / gallery / structured section reference / preview IA を更新する。
- docs/example test は、examples 全体に `## Model Samples` が残らないこと、Scenario samples 代表例が parse / preview regression に入ることを含める。

### Ticket D: Cleanup and compatibility removal

- Model Samples 用の renderer messages / prose handling / validation path matching を削除する。
- Model Samples 専用テストを削除または新方針へ置換する。
- `value` property の残存用途を棚卸し、Phase 2 の廃止・限定方針を確定する。
- cleanup test は、Model Samples の肯定的な実装/説明が残っていないことを `rg` で確認し、core / extension test を通すことを含める。

## Phase 2 論点

- `value` property を display element から廃止するか。
- `src` に data path を許容し続けるか、具体 resource/sample だけにするか。
- common sample profile を導入するか。
- `source: data` の warning 対象をどこまで広げるか。
