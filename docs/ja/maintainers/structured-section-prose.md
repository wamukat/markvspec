# 構造化セクション内の任意本文設計

## この文書の位置づけ

この文書は、MarkVSpec の構造化セクション内に書かれた paragraph、table、code block を
どの semantic owner に所属させ、preview / generated document にどう表示するかを定義する内部設計です。

利用者向けの DSL 説明は、この設計が実装された後に [DSL リファレンス](../reference/index.md) へ反映します。
プレビュー上の表示責務は [プレビュー情報設計](preview-information-architecture.md) と整合させます。

## 背景

MarkVSpec は制約付き DSL であると同時に Markdown です。利用者は構造化リストの前後に自然文を置くことがあります。
現状は、セクションによって任意本文の扱いがばらついています。

- `Actions` では、構造化リスト前の本文が `Entity Lead`、後ろの本文が `Entity Notes` として保持されます。
- `Layout` や `Elements` では、entity 配下の本文が notes として保持されます。
- `States`、`Validations`、`Form Groups`、`Error Codes` などでは、任意本文が黙って無視される場合があります。

最終仕様では、利用者が書いた本文を黙って捨てません。
ただし、構造化データとして解釈できない本文を勝手に実装契約として扱うこともしません。

## 用語

- Section Lead
  - `##` セクション内で、最初の構造化データより前にある任意本文。
  - セクション全体の説明です。
- Section Notes
  - `##` セクション内で、セクションレベルの構造化データより後にある任意本文。
  - セクション全体の補足です。
- Entity Lead
  - `###` entity 内で、最初の構造化データより前にある任意本文。
  - その entity の説明です。
- Entity Notes
  - `###` entity 内で、構造化データより後にある任意本文。
  - その entity の補足です。
- 任意本文
  - paragraph、Markdown table、code block を指します。
  - list item と heading は構造化候補として扱うため、この分類には含めません。
  - Markdown table は、セクション文法が構造化データとして要求する場所では構造化データを優先します。
    例えば Element の `sample rows:` 直下にある table は sample row であり、任意本文ではありません。
  - HTML block、thematic break、未知の Markdown block は任意本文として保持しません。対応するまでは diagnostic の対象です。
- 構造化データ
  - セクションごとの DSL として解釈される heading、list、table などです。

## 原則

- 任意本文を黙って破棄しません。
- 構造化データより前の任意本文は lead として保持します。
- 構造化データより後の任意本文は notes として保持します。
- preview / generated document では、lead と notes を表示します。
- 未予約 `##` セクションは自由記述セクションのまま扱い、lead / notes に分割しません。
- warning は「本文が存在すること」自体には出しません。所有先を決められない本文、または構造化データの書き損じに見えるものだけ診断します。
- 既存挙動からの破壊的変更を許容します。これまで notes として扱っていた本文が lead に移る場合があります。

## 共通構文

```markdown
## States

この画面は認証処理の進行状況を state で表す。

- idle*
- wait-auth
- auth-error

auth-error では入力値を保持する。
```

扱いは次の通りです。

- `この画面は...`
  - `States` の Section Lead。
- state list
  - `States` の構造化データ。
- `auth-error では...`
  - `States` の Section Notes。

## 所属判定

### セクションレベル

構造化 `##` セクションは、Section Lead と Section Notes を持てます。

- 最初のセクションレベル構造化データより前の任意本文
  - Section Lead。
- 最後のセクションレベル構造化データより後の任意本文
  - Section Notes。
- entity 型セクションで、最初の `###` entity より前の任意本文
  - Section Lead。
- entity 型セクションで、最初の `###` entity 以降にある任意本文
  - 原則として直前の entity に所属します。
  - Markdown だけでは「最後の entity が終わった後の section notes」を安定して判定できないためです。
- entity 型セクションで Section Notes を書きたい場合
  - 予約された `### Section Notes` を使います。
  - `### Section Notes` は entity ではなく、その `##` セクションの notes 開始 marker です。
  - parser は通常の entity heading 判定より先に `### Section Notes` を判定します。

### Entity レベル

`###` heading で始まる entity は、Entity Lead と Entity Notes を持てます。

- `###` heading の直後、最初の entity 内構造化データより前の任意本文
  - Entity Lead。
- entity 内構造化データより後、次の `###` heading または次の `##` section までの任意本文
  - Entity Notes。
- ただし `### Section Notes` が現れた場合
  - 以降の任意本文は Section Notes として扱い、entity には所属させません。

### 構造化データの開始

「構造化データの開始」は、現在のセクション文法で有効に解釈できる最初の block です。
malformed heading や malformed list item は構造化データの開始とはみなしません。
その後に続く任意本文は、所有先が曖昧になるため diagnostic の対象です。

## セクション別ルール

### States

- 構造化データの開始
  - 最初の top-level list item。
- Section Lead
  - state 一覧の説明として表示します。
- Section Notes
  - state 一覧の補足として表示します。
- list item の子リスト
  - 親 state の description として扱います。
- entity はありません。

### Layout / Slot

- 構造化データの開始
  - 最初の `### L-*` または `### P-*`。
- Section Lead
  - viewport または slot content 全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた viewport または slot content 全体の補足として表示します。
- Entity Lead
  - `### L-*` / `### P-*` 配下で、最初の layout property または `#### Items` より前の任意本文。
- Entity Notes
  - layout property または `#### Items` 後の任意本文。
- `#### Items` 配下の list item
  - layout items として扱います。

### Slots

- 構造化データの開始
  - 最初の `### <slot-name>`。
- Section Lead
  - slot 定義一覧の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた slot 定義一覧の補足として表示します。
- Entity Lead
  - slot definition の説明として表示します。
- Entity Notes
  - slot definition の補足として表示します。

### Elements

- 構造化データの開始
  - 最初の `### E-*`。
- Section Lead
  - element カタログ全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた element カタログ全体の補足として表示します。
- Entity Lead
  - Element Summary の Description と element detail に表示します。
- Entity Notes
  - element detail に表示します。Element Summary へ出す場合は lead より控えめに扱います。
- `description` / `purpose` property との関係
  - `description` / `purpose` は短い一覧説明です。
  - Entity Lead は詳細説明です。
  - Element Summary の Description は、`description`、`purpose`、Entity Lead の先頭段落の順で最初に存在するものを表示します。
  - element detail では `description` / `purpose` と Entity Lead の両方を表示します。

### Form Groups

- 構造化データの開始
  - 最初の `### F-*`。
- Section Lead
  - form group 一覧の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた form group 一覧の補足として表示します。
- Entity Lead
  - form group の意味単位の説明として表示します。
- Entity Notes
  - form group の補足として表示します。

### Actions

Actions は既存方針を正式仕様にします。

- 構造化データの開始
  - 最初の `### A-*`。
- Section Lead
  - action 一覧全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた action 一覧全体の補足として表示します。
- Entity Lead
  - action heading 直下で、最初の `#### From` / `#### Pn: Process ...` / process `case:` / 直接の state/display 変更などの構造化 block より前の任意本文。
  - Action Summary と Action Details に表示します。
- Entity Notes
  - action の構造化 list 後の任意本文。
  - Action Details に表示します。Action Summary には表示しません。

### Preview Scenarios

Preview Scenarios は section と scenario ごとに lead / notes を持てます。

- 構造化データの開始
  - 最初の `### <scenario-name>`。
- Section Lead
  - scenario 一覧全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた scenario 一覧全体の補足として表示します。
- Scenario lead
  - `### <scenario-name>` 直下、最初の scenario property より前の任意本文。
- Scenario notes
  - scenario property 後の任意本文。
- `samples` と `display` の子リスト
  - scenario の構造化データとして扱います。

### Validations

- 構造化データの開始
  - 最初の `### V-*`。
- Section Lead
  - validation 一覧の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた validation 一覧の補足として表示します。
- Entity Lead
  - validation の目的説明として表示します。
- Entity Notes
  - validation の補足として表示します。

### Business Rules

- 構造化データの開始
  - 最初の top-level list item または `### R-*`。
- Section Lead
  - rule 全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた rule 全体の補足として表示します。
- `### R-*` がある場合
  - Entity Lead / Entity Notes を持てます。
- `### R-*` がなく list item だけの場合
  - list item は `R-BusinessRules` の freeform rule として扱います。

### Error Codes

- 構造化データの開始
  - 最初の `### ERR-*`。
- Section Lead
  - error code 一覧の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた error code 一覧の補足として表示します。
- Entity Lead
  - error code の意図説明として表示します。
- Entity Notes
  - error code の補足として表示します。

### History Fields

- 構造化データの開始
  - 最初の field list item。
- Section Lead
  - history metadata schema 全体の説明として表示します。
- Section Notes
  - history metadata schema 全体の補足として表示します。
  - `History Fields` は field 単位の entity を持たないため、field list 後の任意本文を Section Notes として扱います。
- field 単位の lead / notes は持ちません。

### History

History は entry 本文が changes として意味を持つため、他の entity 型セクションと分けます。

- 構造化データの開始
  - 最初の `### <version>`。
- Section Lead
  - history 全体の説明として表示します。
- Section Notes
  - `### Section Notes` に書かれた history 全体の補足として表示します。
- `### <version>` 後の metadata list
  - history entry metadata として扱います。
- metadata list 後の任意本文
  - すべて history entry の changes として扱います。
- history entry に Entity Lead / Entity Notes は作りません。

## 自由記述セクション

未予約 `##` セクションは、これまでどおり Markdown として丸ごと保持します。
構造化 DSL として解釈しないため、Section Lead / Section Notes には分割しません。

```markdown
## Implementation Memo

- 初回リリースでは server-side rendering に寄せる。
```

## 表示ルール

- Section Lead
  - 該当する構造化セクションの見出し直下に表示します。
- Section Notes
  - 該当する構造化セクションの末尾に表示します。
- Entity Lead
  - entity の詳細表示位置に表示します。
  - 一覧に出すかは entity 種別ごとに決めます。
- Entity Notes
  - entity の詳細表示位置に表示します。
  - 一覧には原則表示しません。

一覧表示の方針です。

- Action Summary
  - `Entity Lead` を表示します。
  - `Entity Notes` は表示しません。
- Element Summary
  - `Entity Lead` を Description として表示します。
  - `Entity Notes` は入力フォーム仕様や表示内容仕様など、該当 element を扱う詳細表示側を主表示とします。
- Validation summary
  - `Entity Lead` を既存表の補足列へ表示します。
  - `Entity Notes` も同じ表内で lead より控えめに表示します。
  - 専用 detail article は初期実装では追加しません。
- Form Groups
  - `Entity Lead` を説明列として表示します。
  - `Entity Notes` も同じ表内で lead より控えめに表示します。
- Error Codes
  - `Entity Lead` / `Entity Notes` を既存表の補足列へ表示します。
  - 専用 detail article は初期実装では追加しません。

## 診断ルール

任意本文が lead / notes として所属できる場合は warning を出しません。

warning にするケースです。

- 構造化セクション内で、どの lead / notes にも所属できない任意本文。
- malformed heading の後に続く任意本文。
- 構造化データに見えるが、現在のセクションでは解釈できない top-level list item。
- HTML block、thematic break、未知の Markdown block のように、preview 表示方針が未定の block。

`Notes` 側に仕様条件らしい語が含まれる場合の診断は、初期実装には含めません。
`遷移` や `エラー` は通常の補足説明でも頻出するため、単語だけで警告すると過剰です。
将来追加する場合は、必須項目の欠落など、構造化データ不足と組み合わせた stronger pattern に限定します。

## データモデル方針

既存の `notes` / `overview` を entity に持たせるだけでは、section overview / notes を表現できません。
core の parse result には、構造化セクションごとの補足情報を追加します。

候補です。

```ts
interface MarkVSpecSectionProse {
  sectionId: string;
  title: string;
  kind: SectionKind;
  viewport?: string;
  slotName?: string;
  overview: string[];
  notes: string[];
  location: SourceLocation;
  renderKeys: string[];
}
```

entity 型は既存の `overview?: string[]` / `notes?: string[]` を拡張して使います。
Preview Scenarios は scenario entry へ prose を持たせるため、専用の型拡張が必要です。
History entry は `bodyLines` を changes として維持し、entry overview / notes は追加しません。

複数インスタンスを持つセクションでは、prose も該当インスタンスに紐づけます。

- `Layout: <viewport>`
  - `sectionId` と `viewport` を持ち、該当 viewport の表示にだけ使います。
- `Slot: <name>`
  - `sectionId` と `slotName`、必要に応じて `viewport` を持ちます。
- template 合成後の画面
  - template 由来 prose と screen 由来 prose は、既存の template item 除外ルールと同じ粒度で扱います。
- partial / focused preview
  - focus 対象外の section prose は表示しません。

## 実装分割

1. Core parser の section prose 抽出基盤
   - Section Lead / Section Notes を parse result に保持する。
   - 既存の自由記述セクションとは別管理にする。
   - render invalidation 用の render key を付与する。
2. Entity prose の統一
   - Layout、Slots、Elements、Form Groups、Actions、Validations、Business Rules、Error Codes に overview / notes を持たせる。
   - Action の既存 overview / notes 挙動を canonical として整理する。
3. Preview Scenarios の階層 prose
   - section、scenario entry の overview / notes を表現する。
4. History / History Fields の prose
   - raw line parser を使うため、他セクションとは別チケットで実装する。
   - History entry の changes との境界を regression test で固定する。
5. Preview / generated document 表示
   - Section Lead / Notes と Entity Lead / Notes を該当セクションに表示する。
   - 一覧への表示は表示ルールに従って最小限にする。
6. Diagnostics
   - 所属不能本文、malformed heading 後本文、構造化データの書き損じ、未対応 Markdown block を診断する。
7. Documentation / examples
   - DSL リファレンスとサンプルへ反映する。

## 受け入れ条件

- `## States` の list 前本文が Section Lead として表示される。
- `## States` の list 後本文が Section Notes として表示される。
- state 子リストは従来どおり state description として表示される。
- `## Actions` の `Entity Lead` / `Entity Notes` は既存挙動と互換である。
- `## Elements` の entity lead / notes が detail に表示される。
- `## Validations`、`## Form Groups`、`## Error Codes` の任意本文が黙って消えない。
- 未予約 `##` は自由記述セクションとして丸ごと表示される。
- 所属不能な本文は diagnostic に出る。
- 既存の構造化データの parse 結果は regress しない。
