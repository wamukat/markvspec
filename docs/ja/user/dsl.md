# MarkVSpec DSL リファレンス

## この文書の位置づけ

この文書は、MarkVSpec の記法を確認するための主リファレンスです。設計書を書き始める人、
レビューする人、実装・共有に必要な入力を整える人が対象です。

最初に全体像を見たい場合は [日本語ドキュメント索引](../README.md) に戻ってください。
実例から探す場合は [サンプルギャラリー](example-gallery.md) を先に読むと早いです。

この文書は MarkVSpec リリース版の日本語リファレンスです。通常の設計作業では、この文書を入口にできます。

MarkVSpec DSL は、普通の Markdown を制約付きで解釈する形式です。作者は Markdown を書き、ツールはルールに合う部分だけを構造化して読み取ります。
formatter と lint の方針は [書きやすさと品質](../maintainers/authoring-quality.md) に記録しています。

## ファイル

1 ファイルは 1 つの設計対象を表します。設計対象は `screen`、`template`、`partial` のいずれかです。

```text
*.vspec.md
```

基本形です。

```markdown
---
id: SCR-LOGIN
type: screen
title: ログイン画面
route: /login
---

# SCR-LOGIN ログイン画面

## States

## Layout: mobile

## Elements

## Actions
```

## Front Matter

Front Matter は YAML です。文書全体のメタデータだけを書きます。

必須項目です。

- `id`: 画面 ID、テンプレート ID、partial ID。例: `SCR-LOGIN`、`TPL-MYPAGE-SHELL`、`PRT-NOTICE-LIST-CARD`。
- `type`: `screen`、`template`、`partial`。
- `title`: 人間向けの設計対象名。

任意項目です。

- `template`: 画面が利用するテンプレート参照。`id` と `src` を持つ map として指定します。
- `references`: 画面が参照する設計書 ID とファイルパスの対応表。`partials` をサポートします。
- `route`: 画面の URL パス。動的 segment は `/users/:userId` のように `:param` で書きます。
- `viewport`
- `locale`: 生成される設計書の表示言語。`en` と `ja` をサポートします。
- `tags`
- `version`

`owner`、`status`、`viewport` は canonical な Front Matter ではありません。
残っている場合は警告し、プレビューや export のメタデータ表示、default viewport 判定では無視します。

画面が利用する template は `template.id` / `template.src` で指定します。Partial は設計書 ID で読みやすく書き、
プレビューでは実ファイルを読み込みたい場合に `references.partials` を使います。
`references.partials` は partial 文書 ID とファイルパスの対応表であり、partial を
どこに表示するかは表しません。

```yaml
---
id: SCR-MYPAGE-HOME
type: screen
title: マイページ ホーム
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
references:
  partials:
    PRT-MEMBER-PROFILE-CARD: ../partials/mypage-member-profile-card.vspec.md
---
```

### route と route parameter

`route` は画面の URL パスです。動的 segment は `:param` で書きます。
旧来の `{param}` 形式はサポートしません。

```yaml
route: /users/:userId
```

対象画面内で route parameter を参照する場合は、`${route.userId}` のように
`route` 名前空間の不透明な式として書きます。API request の path も同じ
`:param` 記法に揃え、実際に渡す値は直後の parameter 行に書きます。

```markdown
- Process P1: ユーザー取得
  - request:
    - method: GET
    - path: /users/:userId
    - params:
      - userId: ${route.userId}
  - result:
    - user request result
```

別画面へ遷移するときは、遷移先 screen ID と `params` を併記します。
`params` のキーは遷移先 route の `:param` 名と一致している必要があります。
また、`${route.userId}` の `userId` が現在の画面 route に存在しない場合は
diagnostic warning の対象です。

```markdown
- navigate: SCR-USER-DETAIL
- params:
  - userId: ${model.user.userId}
```

partial ホストのネストした `partial` ブロックは、まず `references.partials`
の対応先を読み込みます。対応ファイルが存在しない、ID が一致しない、`type:
partial` ではない場合は VS Code プレビューで diagnostic を表示します。画面要素
サマリの partial ID は、VS Code プレビュー上で参照先ファイルへ遷移できるリンクになります。

partial 文書は再利用可能な HTML fragment です。`type: partial` の文書も
`references.partials` を持ち、Layout 内の partial host から child partial を
参照できます。プレビューは依存 partial を再帰的に解決し、見つからない child
partial は diagnostic と placeholder で示します。循環参照は diagnostic として
止めます。partial nesting の最大深さは 10 階層です。

`locale` は生成される設計書の見出し、表ヘッダなどの
固定文言を切り替えます。`## Elements` や Action のグループ名などの DSL
キーワードは、パースとサンプル共有を安定させるため翻訳しません。

## 文書単位

MarkVSpec の設計書単位です。

- `template`: 共通 shell、slot、共通ナビゲーションなどを表します。単独でプレビュー / 印刷できます。
- `screen`: URL で到達する初期画面を表します。template の利用、初期 DOM、partial 呼び出し、画面内状態遷移を書きます。
- `partial`: 再利用可能なサーバレンダリング HTML fragment を表します。返却 HTML のレイアウト、要素、サーバ側処理、空 / エラー状態を書きます。`references.partials` で child partial を合成できます。

screen から partial を呼ぶ場合、screen 側は「どのアクションで、どの領域を、どの
partial 由来の内容で置き換えるか」を書きます。partial 側は「返却される HTML
そのものの仕様」を書きます。
Action の `request:` は通信契約だけを表します。Layout の `partial:` は partial host
contract を表します。`display.partial` は、参照済み `PRT-*` 文書由来の content を
その host に表示することを表します。

## セクション

現行リリースが構造として認識する level-2 セクションです。

- `## States`
- `## Layout: <viewport>`
- `## Slot: <name>`
- `## Slots`
- `## Elements`
- `## Form Groups`
- `## Actions`
- `## View Context`
- `## View Context Samples`
- `## Preview Scenarios`
- `## Field Validations`
- `## Cross-field Validations`
- `## Validations` (legacy-compatible)
- `## Business Rules`
- `## Error Codes`
- `## History Fields`
- `## History`

`# <ID> <Title>` 直後から最初の level-2 セクションまでの本文は、画面または
パーシャル自体の説明として扱います。下の文書構造用語では、この領域を
`Document Lead` と呼びます。上記以外の level-2 セクションは自由記述
セクションです。MarkVSpec は内容を意味解釈せず、通常の Markdown として
生成される設計書ビューに残します。

履歴は `History` と `History Fields` を使うと構造化して扱えます。
業務ルールは `Business Rules`、エラー表示契約は `Error Codes` に書きます。
項目定義、メッセージ、権限、API 契約、テスト観点は、構造化記法を
定義してから改めて追加します。現時点ではそれらの標準セクション名はありません。

### 文書構造の用語

Preview、parser、docs、ticket で MarkVSpec 文書内の位置を議論するときは、
次の用語を使います。英語名を canonical とし、日本語文書でも同じ英語名を使います。

各領域を視覚的に確認する annotated skeleton は
[文書構造](document-structure.html) を参照してください。

- `Document Header`: YAML Front Matter と最初の level-1 見出しです。文書全体の
  メタデータと設計対象名を書く入口です。
- `Document Lead`: level-1 見出しの直下から最初の level-2 セクションまでの
  Markdown 本文です。画面、template、partial、example の目的を書きます。
- `Section`: `## States` や `## Actions` のような level-2 見出しです。
  認識済み section は parser が解釈し、未認識 section は自由記述として残します。
- `Section Lead`: section 冒頭、最初の `Entity Block` または構造化定義より前の
  Markdown 本文です。
- `Entity Block`: `### A1:A-Submit Submit` や `### E-EmailInput Input` のような
  level-3 見出しで始まる ID 付き定義単位です。
- `Entity Lead`: entity 見出し直後、entity の `Structured Body` より前の
  Markdown 本文です。
- `Structured Body`: parser、validator、preview が MarkVSpec の意味として解釈する
  bullet、nested list、サポート対象の table です。
- `Entity Notes`: entity の `Structured Body` の後ろにあり、同じ entity に属する
  補足 Markdown です。
- `Section Notes`: section の entity 群または構造化定義の後ろにある補足
  Markdown です。
- `Free-form Section`: 未認識の level-2 section、または `## Notes` /
  `## Open Questions` のように Markdown として保持し、構造化 DSL としては
  解釈しない section です。

`Lead` は対象の前に表示します。たとえば `Section Lead` はその section の表、
一覧、entity summary の前に表示し、`Entity Lead` は entity 詳細の冒頭に表示します。
`Notes` は対象の後に表示します。たとえば `Entity Notes` は entity の構造化内容の後、
`Section Notes` は section の構造化内容の後に表示します。

`Structured Body` は構造化 section の正規データであり、機械的に解釈する領域です。
`Document Lead`、`Section Lead`、`Entity Lead`、`Entity Notes`、`Section Notes`
などの prose 領域には通常の Markdown を書けますが、DSL の意味としては解釈しません。
prose 領域内の HTML コメント `<!-- -->` は authoring comment として扱い、
preview や export には表示しません。

### 構造化セクション内の説明文

構造化セクションでも、Markdown の本文、表、コードブロックを補足説明として書けます。
ただし、どこに所属する説明かを安定して判断できる位置に置く必要があります。

セクション全体の説明です。

- `## States` のような構造化セクション見出しの直後、最初の構造化データより前に置いた本文は `Section Lead` です。
- 構造化データの後に置いた本文は、`Section Notes` として表示します。
- `Elements`、`Actions`、`Form Groups`、`Validations`、
  `Business Rules`、`Error Codes` のように `###` entity 見出しを持つセクションで、セクション全体の後置補足を書きたい場合は
  `### Section Notes` 見出しを使います。

entity ごとの説明です。

- `### E-*`、`### A-*`、`### V-*` などの entity 見出し直下、最初の構造化リストより前の本文は `Entity Lead` です。
- 構造化リストの後に置いた本文は `Entity Notes` です。
- Action の Overview は自動生成しません。Action の要約を出したい場合は、Action 見出し直下に `Entity Lead` として書きます。
- Action の補足、設計上の注意、記法で表しきれない背景は、Action の構造化リストの後に `Entity Notes` として書きます。

次の例では、`States` の前置本文が `Section Lead`、状態リスト後の本文が `Section Notes` です。

```markdown
## States

ログイン画面は、未入力、認証待ち、認証済みなどの画面状態を state として扱います。
入力エラーや認証エラーメッセージの表示は、Action の `display:` と Preview Scenario で表します。

- idle*
- authenticating
- signed-in

`authenticating` 中はフォームを無効化し、二重送信を防ぎます。
```

次の例では、Action 見出し直下の本文が `Entity Lead`、構造化リスト後の本文が `Entity Notes` です。

```markdown
## Actions

### A1:A-SubmitLogin Submit login

入力内容を検証し、送信できた場合だけ認証待ちへ遷移します。

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
  - case: sent
    - Effects
      - state: authenticating
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-RequestErrorBanner

送信失敗は HTTP response ではなく、request を送信できなかったケースとして扱います。
```

所有先が曖昧な説明文は warning の対象です。たとえば、entity 型セクションで不正な
`###` 見出しの後に本文を書くと、その本文をどの entity に属させるか判断できません。
また、構造化セクション内の HTML block、水平線、未知の Markdown block は、プレビューや
印刷で安定して扱えないため warning の対象です。`Notes` のような未予約セクション内の
通常本文に、`error`、`transition`、`validation` などの語が含まれるだけでは warning になりません。

## 予約語

MarkVSpec が構造として解釈する語です。通常の本文や説明文では自由に使えますが、
見出し、箇条書きのグループ名、プロパティ名、型名として書いた場合は DSL の意味を持ちます。

level-2 セクション名です。

- `States`
- `Layout`
- `Elements`
- `Form Groups`
- `Actions`
- `Validations`
- `Business Rules`
- `Error Codes`
- `History Fields`
- `History`

Template / Slot のセクション名です。

- `Slot`
- `Slots`

Front Matter の主なキーです。

- `id`
- `type`
- `title`
- `route`
- `viewport`
- `default-state`
- `template`
- `locale`

Action のグループ名です。

- `Triggered`
- `From`
- `Process`
- `Effects`

Action の処理詳細、結果、表示更新で使う主な語です。

- `input`
- `receive`
- `result`
- `request`
- `server`
- `response`
- `validation`
- `state`
- `navigate`
- `display`
- `target`
- `content`

イベント名です。`E-SignInButton.click` のようなイベント参照では、`.` は ID と
イベント名を区切る構文文字で、予約語は `click` 側です。

- `click`
- `blur`
- `change`
- `submit`

Layout kind です。

- `stack`
- `row`
- `grid`
- `inline`

Element type です。

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Textarea`
- `Button`
- `Link`
- `Select`
- `MultiSelect`
- `Checkbox`
- `CheckboxGroup`
- `Switch`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Toast`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

Element property の主なキーです。

- `marker`
- `sample`
- `label`
- `label src`
- `value`
- `src`
- `format`
- `initial value`
- `required`
- `visible when`
- `hidden when`
- `disabled when`
- `variant`
- `tone`
- `validation`
- `error text`
- `action`

Element のリストグループ名です。

- `options`
- `Columns`
- `Sample Rows`
- `Row`

共通プロパティ名です。

- `marker`
- `value`
- `label`
- `variant`
- `tone`
- `visible when`
- `hidden when`
- `disabled when`

レイアウト用プロパティ名です。

- `gap`
- `align`
- `justify`
- `overlay`
- `partial`
- `id`
- `states`

`variant` と `tone` の値です。

- `primary`
- `danger`
- `success`
- `warning`
- `info`

## ID

ID prefix は次の通りです。

- `SCR-*`: 画面。
- `TPL-*`: テンプレート。
- `PRT-*`: partial。
- `L-*`: レイアウトグループ。
- `P-*`: 表示調整だけの presentation panel。
- `E-*`: 画面要素。
- `A-*`: アクション。
- `R-*`: ルール。

ID は通し番号ではなく意味のある名前にします。

```text
L-LoginForm
P-LoginFields
E-EmailInput
A-SubmitLogin
R-RequiredFields
```

prefix の後ろには日本語も使えます。

```text
E-ページヘッダ
A-ログイン実行
L-メッセージ領域
```

ID にはスペース、`.`、`:` を入れません。これらは MarkVSpec の構文上の区切りに使います。

## marker

marker はプレビューや設計書上に表示する短い番号です。ID とは別物です。現在の英語版サンプルでは、
Mermaid label、document symbol、plain text review comment で読みやすいように `1`、`L1`、`A1` のような ASCII marker を優先します。

```markdown
### 2:E-EmailInput Input

- value: ${model.email}
- initial value: "test@example.com"
```

ルールです。

- 見出しでは `<marker>:<id>` と書きます。Layout、Element、Action、
  FormGroup、Validation、Business Rule の ID に指定できます。
- 推奨 marker は、英数字、underscore、hyphen で構成する 1-12 文字です。先頭は英数字にします。それ以外の marker は互換のため読み取りますが warning にします。
- 参照には marker ではなく ID を使います。
- marker 表示は Layout、Element、Action ごとに ON / OFF できる想定です。
  FormGroup marker は解決された Layout 範囲に表示するため、Layout marker の表示設定に従います。
- marker の重複は少なくとも同じカテゴリ内で警告します。
- rule と validation の見出しは、`### R-AccessControl Access control` や
  `### V-RequiredEmail Required email` のように安定 ID を直接使います。

## States

画面内状態を箇条書きで書きます。

```markdown
## States

- idle*
- authenticating
- signed-in
- recovered
  - 認証失敗後に復帰した状態。
```

形式です。

```text
- <state>
- <state>*
- <state>
  - <description>
```

`state` は画面内状態です。フォーム値のような画面データは `${model.email}` のような不透明な式として扱います。
初期状態は状態名末尾の `*` で示します。説明は状態の下にネストしたリストとして書きます。
state 配下のネストした箇条書きは自由記述の説明です。プレビューの基準状態は定義しません。

example の state 名は、画面上の lifecycle 意図が分かる名前に揃えます。

- `initializing` は初期表示時の bootstrap / 初期データ取得に使います。
- `idle` は初期化済みで通常操作できる基準状態に使います。
- `loading` は検索、ページング、再読込など、画面操作後の読み込みに使います。
- `saving`、`submitting`、`authenticating` のような domain-specific state は、保存や送信などの待機状態に使います。
- `initialize-error` は初期化失敗、`load-error` は操作後の読み込み失敗に使い分けます。
- `loaded` は、読み込み済みデータの variant や visible result state を説明する example に限って使います。
- `editing` は非編集 mode から編集 mode へ明示的に遷移する screen に限って使います。
- help、dialog、banner のような表示だけの差分は、永続 state ではなく `display:` と Preview Scenarios を優先します。

## Layout

Layout はビューポート単位で書きます。`## Layout: mobile` や
`## Layout: desktop` のように、必ずビューポート名を付けます。
単独の `## Layout` はリリース構文ではありません。

レイアウトグループは level-3 見出しで書きます。

```markdown
## Layout: mobile

### L1:L-Page Page

- stack
- align: center
- gap: md

#### Items

- E-ページヘッダ
- L-EmailField
- E-SignInButton
```

文書中で最初に出現する `## Layout: <viewport>` を基準ビューポートとして扱います。
設計書出力では印刷や PDF 化を前提にすべてのビューポートを表示し、
各ビューポート/状態ごとの現在の仕様として要素一覧とアクション一覧を表示します。
同じ内容が前の状態にも出ている行には repeated マーカーが付くことがあります。
同じ layout ID を複数ビューポートに書く場合、marker は同じ値に揃えます。

## Template と Slot

Template は、共通のページ枠を表す独立した設計書です。`type: template`
の文書は、共通 shell の Layout、shell 要素、shell Action、screen が埋める
`## Slots` contract を所有します。Template 単体でもプレビュー／印刷でき、
その単体プレビューでは template 自身を主対象として扱い、未解決の slot は
プレースホルダーとして表示します。

Screen は画面固有の設計書です。`type: screen` の文書は Front Matter の
`template.id` と `template.src` で 1 つの template を参照し、
`## Slot: <name>` または `## Slot: <name>: <viewport>` に screen 固有の
slot content だけを書きます。Partial は server-rendered fragment を再利用する
文書です。Template はページ枠、screen はページ固有の content と behavior、
partial は再利用 fragment を担当します。

```markdown
---
id: TPL-MYPAGE-SHELL
type: template
title: マイページ共通レイアウト
---

# TPL-MYPAGE-SHELL マイページ共通レイアウト

## Layout: desktop

### L-Shell Page Shell

- row

#### Items

- L-LeftPane
- L-RightPane

### L-RightPane Right Pane

- stack

#### Items

- L-Header
- slot: content
- L-Footer

## Slots

### content Main Content

- purpose: Page-specific main content.
- required
- default: E-EmptySlotMessage

## Elements

### E-EmptySlotMessage Paragraph

- text: No content has been assigned to this slot.
```

画面側は Front Matter で `template` ファイルを指定し、`## Slot: <name>` に
差し込むコンテンツだけを書きます。viewport 別に差し替える場合は
`## Slot: <name>: <viewport>` と書きます。

```markdown
---
id: SCR-MYPAGE-HOME
type: screen
title: マイページ ホーム
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME マイページ ホーム

## Slot: content

### L-HomeContent Home Content

- stack

#### Items

- E-PageTitle

## Slot: content: desktop

### L-DesktopHomeContent Desktop Home Content

- grid

#### Items

- E-PageTitle
```

画面ファイルを直接プレビューすると、template ファイルを読み込んで slot content を
shell に合成します。生成される設計書では、画面側の slot content を主な仕様対象とし、
template 側の要素やアクションは共通 shell の文脈として扱います。Slot 定義や
slot content の一覧表は読者向けプレビュー章としては表示せず、合成結果を
ワイヤーフレーム上で確認します。Screen preview では template shell を
wireframe context として表示しますが、template marker、template details、
template spec table は screen の主対象としては前面に出しません。

Template 合成で使う viewport は、template 自身の `## Layout:<viewport>` から
決まります。Screen slot content は、それらの template viewport に対する
viewport 別差し替えを提供できますが、それだけで合成対象 viewport を増やすことは
ありません。

template layout が `slot: content` を描画するとき、MarkVSpec は次の順で slot を
解決します。

1. 現在描画している template viewport に一致する `## Slot: content: <viewport>`。
2. viewport 未指定の `## Slot: content`。
3. template 側 `## Slots` contract の有効な `default: <ID>`。

`## Slots` は template 側の slot contract です。各 slot entry には `required`、
`purpose`、`default: <ID>` などの metadata を書けます。`default: <ID>` は
template 文書が所有する fallback content を参照し、その ID は同じ template 内で
定義された `E-*` 要素または `L-*` Layout でなければなりません。有効な default を
持つ `required` slot は、screen 側 content がなくても missing content 診断を出しません。
screen 側 content がなく、有効な default もない `required` slot は診断対象です。
default ID が存在しない、または無効な場合、MarkVSpec は fallback content を
捏造しません。

同じ slot 名と viewport の slot content を複数定義すると診断が出ます。
Template を参照する screen に top-level の `## Layout` または `## Layout:<viewport>`
を書くことは非 canonical であり、warning 対象です。それらは合成 screen preview では
別の shell や別 frame として描画しません。描画結果は template shell と解決済み
slot content です。template content は canonical な `## Slot:<name>` または
`## Slot:<name>:<viewport>` section で指定します。

template layout ID と screen slot content の layout ID は、template 合成時には別スコープとして扱います。
この境界をまたいで同じ layout ID があっても重複診断にはしません。Element、Action、Validation、
Business Rule、Error Code の ID は合成後の画面で同じ名前空間として扱います。

見出し形式です。

```text
### [<marker>:]<layout-id> <name>
### P-<panel-id> <name>
```

末尾の文字列は Layout name です。Layout は構造であり、画面上の表示文言では
ないことが多いため、生成される Action Details では Layout target を
Layout marker とこの name で参照します。その箇所では Layout ID を重複表示しません。

見た目の配置だけに使うコンテナは `P-*` の presentation panel として書きます。
presentation panel は layout 種別と `#### Items` を持てますが、ワイヤーフレームでは
border、padding、layout marker を表示しません。生成される Layout 一覧にも出しません。
`visible when`、`hidden when`、`disabled when`、partial host、validation、error code、
action update の target には使えません。表示制御や仕様上の意味を持たせたい場合は
`L-*` の Layout を使います。

レイアウト種別です。

- `stack`
- `row`
- `grid`
- `inline`

配置です。

```markdown
- align: start|center|end|stretch
- justify: start|center|end|between|around
- gap: none|xs|sm|md|lg|xl
- overlay: area|screen
- partial:
  - id: PRT-*
  - states:
    - <screen-state>: <partial-state>
```

`gap` はワイヤーフレーム描画の余白を整える visual hint です。DSL では許容され、
プレビューのワイヤーフレームには反映されますが、生成される設計書のレイアウト属性表や
サマリでは主要仕様として表示しません。配置や構造の意味を表す属性は `align`、
`justify`、`overlay`、`visible when` / `hidden when` / `disabled when` を使います。

`overlay: area` は親レイアウト領域を覆う待機表示、`overlay: screen` は全画面を覆う待機表示を表します。通常は `visible when` と組み合わせて、特定の画面内状態のときだけ表示します。

待機中にフォーム全体を操作不可にする場合は、対象レイアウトに `disabled when` を書きます。

screen 側で partial のプレビューを埋め込む場合は、置き換え先 layout に
ネストした `partial` ブロックを書きます。これは、その `L-*` layout が partial host
であることを表します。初期仕様では 1 host は 1 つの partial ID だけを持ち、
1 host = 1 `PRT-*` 文書として扱います。画面状態ごとに partial の表示状態を
変えたい場合は `states` に対応を書きます。左側は screen state、右側は
partial 文書内で使う render state です。

```markdown
### L-MemberProfilePartial Member Profile Partial

- stack
- partial:
  - id: PRT-MEMBER-PROFILE-CARD
  - states:
    - initializing: loading
    - idle: loaded
```

```markdown
### L-LoginControls Login Controls

- stack
- disabled when: authenticating

#### Items

- L-EmailField
- L-PasswordField
- E-SignInButton
- L-AuthProgress

### L-AuthProgress Auth Progress

- stack
- overlay: area
- visible when: authenticating

#### Items

- E-AuthSpinner
```

子要素や子レイアウトは必ず `#### Items` の下に書きます。

```markdown
#### Items

- E-Heading
- L-EmailField
```

ラベルと入力欄の組み合わせは quoted field mapping で書きます。

```markdown
#### Items

- "メールアドレス": E-EmailInput
```

ラベルは引用符で囲みます。

## Elements

画面要素は level-3 見出しで書きます。

```markdown
## Elements

### 5:E-SignInButton Button

- label: ログイン
- variant: primary
- action: A-SubmitLogin
```

見出し形式です。

```text
### [<marker>:]<element-id> <element-type>[*]
```

末尾の文字列は Element name ではなく element type です。MarkVSpec は
Element の表示名を別途定義しません。Element の `name` property は form field
name など要素固有の property として扱います。生成される Action Details では、
Element 参照を Element marker と Element ID で識別し、element type や
表示内容要約は原則として足しません。

`*` は Element 自体に input-level の required metadata がある場合だけ使います。
たとえば `Input*` は Input Form Spec の `必須` 列に出る required flag と
同じ意味です。これは product validation を定義する canonical syntax では
ありません。必須入力の validation contract は `## Field Validations` の
`required` constraint に書きます。
wireframe preview では native `required` attribute や自動の `*` marker としては
描画しません。画面上に必須マークを見せたい場合は、label 文字列に自分で書きます。

```markdown
### 3:E-EmailInput Input
```

現行リリースの要素種別です。

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Textarea`
- `Button`
- `Link`
- `Select`
- `MultiSelect`
- `Checkbox`
- `CheckboxGroup`
- `Switch`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Toast`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

未知の Element type は warning です。カスタムの要素を意図して使う場合は、
`custom:Map` のような `custom:*` 形式を使います。

`Paragraph` は説明文、本文、空状態メッセージなどの block の文章に使います。
`Text` は短いラベル、値、日時、件数などの inline またはコンパクトな表示に使います。

主なプロパティです。

```markdown
- label: ログイン
- source: i18n
- type: password
- visible when: loading
- hidden when: idle
- disabled when: E-EmailInput is empty
- disabled when: E-PasswordInput is empty
- variant: primary
- tone: danger
- validation: メールアドレス形式であること。
- error text: 正しいメールアドレスを入力してください。
```

`Heading` は `level` で見出しレベルを表します。

```markdown
### E-Heading Heading

- level: 1
- label: ログイン
```

同じオブジェクトに同じ condition key を複数行書いた場合、その行は OR として結合します。
上の例では、email input または password input のどちらかが空なら要素は disabled です。

1 行の condition 内にある `and` / `or` は、人間が読むための条件文の一部です。
初期 DSL では構造化された論理式として parse / evaluate しません。OR の意図を明確にしたい場合は、
同じ key を複数行に分けます。`email is present and valid` のように 1 つの不可分な条件として読ませたい場合は、
1 行の読みやすい文として書きます。

この condition の結合規則と可読 text の扱いは、Element の `visible when` / `hidden when` /
`disabled when`、Layout の `visible when` / `hidden when` / `disabled when` /
`enabled when` / `selected when` / `active when`、Process step の `when` /
`skip when`、Validation constraint の `when`、legacy `condition` に適用します。

preview が評価できる条件は意図的に限定します。`loading` のような state 名、`state is loading`、
`${view.isHelpPanelOpen}`、`not ${view.isHelpPanelOpen}`、
`${view.selectedTab} = results` のような対応済み opaque expression は評価してよい対象です。
field の空判定、role、authorization text、`and` / `or` を含む 1 行 condition などは、
runtime 値を捏造せず、設計情報として表示します。

`visible when` / `hidden when` / `disabled when` には画面内状態だけでなく
`${model.memberProfile.loaded}` のような不透明な式も書けます。API 取得後に Loading 表示から実値表示へ
切り替えるような場合は、画面状態ではなくデータ条件で表します。

```markdown
### E-Greeting Text

- source: data
- sample: こんにちは「山田 太郎さん」
- src: ${model.memberProfile.displayName}
- format: こんにちは「{displayName}さん」
- visible when: ${model.memberProfile.loaded}

### E-GreetingLoading Text

- text: 読み込み中...
- visible when: not ${model.memberProfile.loaded}
```

表示値まわりの責務は次のように分けます。

- `label`: 見出し、ボタン、リンク、フォーム項目名など、ユーザーに見せる静的な文言。
- `label src`: `label` の任意の不透明な取得元。実装上の i18n key には使いません。翻訳管理対象であることは `source: i18n` で示します。
- `placeholder`: 入力欄などに表示する補助文言。
- `placeholder src`: `placeholder` の任意の不透明な取得元。実装上の i18n key には使いません。
- `text`: `Paragraph`、`Text`、`Banner`、`Badge` などの固定本文・固定表示文言。
- `hint`: `FileUpload` / `FileInput` の固定補足文。
- `sample`: `source: data` の Element で、動的データが実際に表示される時の preview 代表値。固定文言には使いません。
- `src`: `sample` の取得元。`${model.notice.title}` や `${route.noticeId}` のような不透明な式。
- `value`: 送信値、選択肢値、hidden value などの機械的な値。単なる表示サンプルには使いません。

`format` は `src` の値を `sample` の形へ整形する規則です。wireframe preview は
固定文言を `text` / `hint` から表示し、`sample` は `source: data` の baseline preview 値として使います。
生成される設計書では
`label src`、`placeholder src`、`src`、`sample`、`text`、`hint`、`value`、`format` を
`表示内容仕様` に分離して表示します。入力フォーム仕様には入力制約を置き、
label、placeholder、option label などの文言取得元は混ぜません。

`validation` と `error text` は generated Elements table に表示するための
仕様情報です。wireframe preview では form control の近くに自動表示しません。
画面上に validation message や error message を出したい場合は、`visible when`
を持つ `Text` や `Banner` として明示的に定義します。

## Form Groups

`## Form Groups` は、フォーム単位の入力検証や送信責務を表す意味的なグループです。
画面上の見た目や DOM の置き換え対象ではありません。FormGroup ID は `F-*` で書きます。

```markdown
## Form Groups

### F1:F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin
```

`fields` には FormGroup に含める入力 Element ID を並べます。`submit` は送信
Action を示します。FormGroup には Layout との紐づけを書きません。表示・更新対象は
`L-*`、検証対象は `F-*` として分けます。

`F1:` の marker は省略できます。省略した場合、preview の表や参照 chip では
FormGroup ID を fallback marker label として使います。wireframe では、列挙された
input elements をすべて含む最小の Layout 範囲に FormGroup marker を表示します。
範囲を解決できない場合は wireframe には表示せず、warning を出します。

`F-*` は Validation の `target` としてだけ使います。Action の update target や
partial update target には `L-*` の Layout ID を使います。複数項目にまたがる
フォーム検証は `target: F-LoginForm` のように FormGroup を対象にすると、どの
入力群に対する検証かが設計書上で明確になります。

## データ式と初期値

入力値は `${model.email}` のような不透明な式として表します。

```markdown
### 3:E-EmailInput Input

- value: ${model.email}
- initial value: "test@example.com"
```

これは次を意味します。

- 画面データ: `${model.email}`
- 初期表示値: `test@example.com`

独立した `bind` property はサポート対象外です。入力値の由来は `value` や
`source`、初期表示値は `initial value`、リクエストパラメータは
`E-EmailInput.value` のような明示的な要素値参照、または実際の由来である
model 値として書き分けます。

初期値が不要な場合は次のように書けます。

```markdown
- value: ${model.email}
```

`Checkbox` でも同じ `initial value` property を使えます。

```markdown
### 10:E-RememberMe Checkbox

- label: Remember me
- value: ${model.rememberMe}
- initial value: ${cookie.remember.present}
```

排他的な選択肢は `RadioGroup` として書きます。値域は `options` の下に
Markdown のネストリストで書き、初期選択は `{初期値}` で表します。
選択肢の表示名が i18n などの参照元を持つ場合は、項目の後ろに `:` で
参照元を書けます。

```markdown
### 4:E-ReadStatusFilter RadioGroup

- label: 既読状態
- source: i18n
- name: readStatus
- value: ${model.noticeSearch.readStatus}
- initial value: "すべて"
- options:
  - すべて
  - 未読のみ
  - 既読のみ
```

単体の `Radio` 要素は廃止しました。排他的な選択肢は常に `RadioGroup` で表し、
値の参照元、初期値、選択肢一覧を 1 つの要素にまとめます。

`Select` の選択肢は `options:` の下に Markdown のリストとして書きます。
各項目は表示ラベルを書き、プレビューでは同じ文字列を option value として扱います。
表示ラベルに参照元がある場合は、項目の後ろに `:` で書きます。

```markdown
### E-RoleSelect Select

- value: ${model.role}
- initial value: "Administrator"
- options:
  - 閲覧者
  - 管理者
  - オーナー
```

`source` は値や文言の由来分類です。参照パスや i18n key は書きません。
許可値は `fixed`, `i18n`, `data`, `route`, `element`, `asset`, `external`, `computed` です。
未指定時は `fixed` と同義で、`source: fixed` の明示も許可されます。

- `fixed`: MarkVSpec 文書内に直接書いた固定値、固定文言、固定表示内容。
- `i18n`: 国際化リソースで管理する表示文言。`source` に i18n key、namespace、bundle 名、翻訳ファイル名は書きません。
- `data`: 業務データ、画面データ、API 応答、サーバ側モデルなどから来る生値。
- `route`: URL path parameter、query string、route parameter などのルーティング由来の値。
- `element`: `value: E-EmailInput.value` のように別 property で参照した他要素の現在値。双方向 binding ではありません。
- `asset`: アプリ管理下の画像、アイコン、静的ファイルなど。
- `external`: アプリ管理外の URL、外部サービス、外部埋め込み、外部配信リソースなど。
- `computed`: 他の値を加工、結合、計算して得る導出値。

データソースから来る生値は `data`、加工・結合・計算した表示値は `computed` とします。
他要素の値をそのまま表示する場合は `element`、加工する場合は `computed` とします。
アプリ管理下のリソースは `asset`、アプリ管理外のリソースは `external` とします。
`source: document` や `source: ${model.users.items}` のような旧来の参照パス指定は不許可です。

`Table` は Markdown table ではなく、ネストした Markdown リストで列とサンプル行を書きます。
区切り文字を使った文字列操作を避け、設計書として読みやすい形を優先します。データ由来のテーブルは
由来分類として `source: data` を書き、preview 用の行は `sample rows:` または Preview Scenario の `rows:` に書きます。

ネストした Element ブロックの開始は `options:`, `Columns:`, `Sample Rows:`, `params:`, `input rule:` のようにコロン付きで書きます。

```markdown
### E-Users Table

- label: Users
- source: data
- Columns:
  - name: 名前
    sortable: true
    sort: asc
  - email: メール
    sortable: true
  - role: 権限

- sample rows:
  - row:
    - name: Alice
    - email: alice@example.com
    - role: Admin
  - row:
    - name: Bob
    - email: bob@example.com
    - role: Viewer
```

`Columns:` では `- key: 表示名` と書くことで、サンプルデータの key と表示ヘッダーを分けられます。
`sortable: true` は sort 可能な列、`sort: asc` / `sort: desc` は現在の sort 方向を preview に表示します。
従来の `Sample Rows:` ブロックも互換として利用できますが、新しい例では `sample rows:` を使います。

`Dialog` は既定で modal overlay として扱います。Dialog 表示のためだけに
通常 Layout へ `L-DialogArea` のような専用領域を置くのは canonical ではありません。
Dialog 内の操作は通常の `Button` element として定義し、Dialog の `actions:` に
カンマ区切りで並べます。各 Button はそれぞれの `action:` から Action へ辿れるようにします。
`Toast` は non-modal overlay 通知です。`message`、`tone`、`placement`、
`duration` で表示内容と出し方を表します。Dialog と違い、画面操作をブロックせず、
操作 button も必須ではありません。

```markdown
### E-ConfirmDialog Dialog

- title: 削除しますか？
- message: この操作は取り消せません。
- tone: warning
- actions: E-CancelDeleteButton, E-ConfirmDeleteButton

### E-CancelDeleteButton Button

- label: キャンセル
- variant: secondary
- action: A-CancelDelete

### E-ConfirmDeleteButton Button

- label: 削除
- variant: primary
- tone: danger
- action: A-ConfirmDelete
```

```markdown
### E-SavedToast Toast

- message: 保存しました。
- tone: success
- placement: top-right
- duration: short
```

## variant と tone

`variant` は表示優先度、`tone` は意味的な意図です。

```markdown
### E-SubmitButton Button

- label: 送信
- variant: primary

### E-ErrorBanner Banner

- tone: danger
- text: メールアドレスまたはパスワードが正しくありません。
```

現行リリースの `variant` です。

- `primary`
- `secondary`
- `tertiary`

現行リリースの `tone` です。

- `neutral`
- `info`
- `success`
- `warning`
- `danger`

サイズ、色、CSS class のようなデザインシステム詳細は書きません。

## Spinner

`Spinner` は、認証待ちや検索中のような待機状態を表す要素です。

```markdown
### E-AuthSpinner Spinner

- label: Signing in...
- visible when: authenticating
```

`label` は読み上げや低 fidelity preview の表示に使います。

`Textarea`、`MultiSelect`、`CheckboxGroup`、`Switch` は、汎用 custom element
に逃がすと入力仕様が曖昧になりやすいフォームプリミティブです。`MultiSelect` は
コンパクトな複数選択、`CheckboxGroup` は選択肢を常時見せたい複数選択、`Switch`
は boolean 設定に使います。

```markdown
### E-Notes Textarea

- label: メモ
- width: full
- rows: 4
- placeholder: 内部メモ

### E-Permissions MultiSelect

- label: 権限
- initial value: ユーザー管理, レポート出力
- options:
  - ユーザー管理
  - レポート出力
  - 請求

### E-Notifications CheckboxGroup

- label: 通知
- initial value: プロダクト更新, セキュリティ通知
- options:
  - プロダクト更新
  - セキュリティ通知
  - 請求通知

### E-EmailSwitch Switch

- label: メール通知
- initial value: true
```

## 実務補助要素

`Divider`、`FileUpload`、`FileInput`、`DatePicker`、`DateInput`、`TimeInput`、
`NumberInput` は、実務画面でよく出る細かな
UI 部品を、フレームワーク固有の widget 名に寄せずに表現するための要素です。

```markdown
### E-ProfileDivider Divider

- label: プロフィール設定

### E-EmptyUsers Paragraph

- text: 該当するユーザーはありません。条件を変更して再検索してください。
- visible when: empty

### E-AvatarUpload FileUpload

- label: アバターをアップロード
- accept: image/png,image/jpeg
- hint: PNG または JPEG、2 MB まで。

### E-StartDate DatePicker

- value: ${model.startDate}
- initial value: 2026-05-01
- min: 2020-01-01
- max: 2030-12-31

### E-RequestedDate DateInput

- value: ${model.requestedDate}
- initial value: 2026-06-01
- min: 2026-05-13
- max: 2026-12-31

### E-StartTime TimeInput

- value: ${model.startTime}
- initial value: 09:30
- min: 09:00
- max: 18:00

### E-Headcount NumberInput

- value: ${model.headcount}
- initial value: 2
- min: 1
- max: 20
- step: 1

### E-Evidence FileInput

- label: 証憑ファイル
- accept: application/pdf,image/png,image/jpeg
- hint: PDF または画像を添付します。
```

## Actions

アクションは level-3 見出しで書きます。

```markdown
## Actions

アクションは level-3 見出しで書きます。Action は、何を契機に動くか、どの画面状態から実行できるか、どの Process を経て、画面にどの結果が出るかを記述します。DOM replace、component rerender、返却 HTML、htmx swap などの実装差分は generator / adapter 側の解釈に下げ、authoring DSL では `display:` で画面上の表示結果を書きます。

Process は Action 内で一意な marker と、人間が読む process name を持ちます。

```text
- Process <marker>: <process name>
```

`P1`、`P2` のような marker は Preview Scenarios や後続 Process から参照するための安定 ID です。process name は任意の説明文であり、固定 enum ではありません。`request:`、`server:`、`response:`、`validation:` は既知の process detail であり、Process type ではありません。プロジェクト固有の実行メモを残したい場合は、`sync:` のような custom process detail block も使えます。MarkVSpec は custom detail の構造を保持しますが、generator が明示的に対応しない限り portable な意味は割り当てません。

Process は、1つの意味のある処理単位として扱います。1つの Process に入れられる execution detail block は、`request:`、`server:`、`sync:`、その他の project-specific custom detail のうち最大1つです。1つの Action で独立した呼び出しを2つ行う場合は、Process を分け、必要に応じて `continue` / `receive` / 後段の Resolve process で接続します。

Process が request、server call、project-specific execution detail へ渡す値は、`request.params`、`server.params`、または `<custom detail>.params` を一次情報として書きます。`receive:` は外部 event、validation result、または前段 Process の結果を受け取って分類する場合に使います。Validation contract は `V-LoginForm.result` のような opaque source として受け取ります。

Process が編集可能な画面要素に現在表示されている値を読む場合は、`${model.email}` ではなく `E-EmailInput.value` のような element value source を優先します。`${model.*}` を execution params で使うのは、現在ページ番号や計算済みの次ページ番号のように、要素値ではなく派生済みまたは保持済みの model state を意図的に読む場合に限ります。

実行 Process は、`request/server/custom detail -> result -> case` の順に書きます。外部データを受け取る Process は `receive -> case` として書きます。`prepare:` は現時点の DSL には導入しません。将来、送信前の意味的な導出を表す必要が出た場合でも、params と同じ値を重複して書く場所にはしません。

execution detail も result classification も持たない、決定的な即時効果だけの Process では、`case:` と `Effects` を省略し、効果を Process 直下に書けます。

```markdown
- Process P1: Open password reset
  - navigate: SCR-PASSWORD-RESET
```

この短縮形は、即時の screen/data effect だけに使います。Process が `request:`、`server:`、`sync:`、`receive:`、`result:`、または `case:` を持つ場合は、結果ごとの効果をその case の `Effects` 配下に書きます。

```markdown
### A1:A-SubmitLogin ログイン送信

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Check login form
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - description: required fields are missing
    - Effects
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage
    - stop
  - case: valid
    - description: all required fields are valid
    - continue
- Process P2: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
  - case: sent
    - Effects
      - state: authenticating
    - stop
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-RequestErrorBanner
    - stop

### A2:A-HandleLoginResponse ログイン応答処理

- Triggered
  - A-SubmitLogin.P2.response
- From
  - authenticating
- Process P1: Handle login response
  - receive:
    - response: A-SubmitLogin.P2.response
  - case: success
    - response: 2xx 認証成功
    - Effects
      - navigate: SCR-DASHBOARD
    - stop
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
    - stop
```

主な `Effects` entry は `view:`、`state:`、`navigate:`、`display:` です。Action の `Effects` で `${model.*}` に代入する `model:` mutation は canonical DSL ではありません。`${model.*}` は、Element の `value:` / `src:` や request parameter などの読み取り参照として使い、Action では実装内部の store や server-side model への代入を書かないようにします。preview / export 用の表示例は Element の `sample` / `sample rows:` または Preview Scenarios の `samples` に書きます。`stop` / `continue` は case-level の制御フローなので、`Effects` の外で case の最後に書きます。`display.target` は表示先の既存 `L-*` layout または `E-*` element を指します。また、Input 系 element に付属する field-level error slot として `E-*.error` も指定できます。`display.element` はその表示先に挿入または表示する既存の `E-*` element または `L-*` layout を1つだけ指します。`display.message` は `V-EmailRules.messages` のような validation / business rule の message group を指します。`display.partial` は、既存の `L-*` partial host に表示する参照済み `PRT-*` 文書を指します。直接の `display.content` と複数形の `display.elements` はサポートしません。例外として、`display.element` が `Dialog` の場合は `target` を省略でき、preview scenario では modal overlay として表示します。`display.element` が `Toast` の場合も `target` を省略でき、non-modal toast region に表示します。同じ display effect では、`element`、`message`、`partial` のいずれか 1 つだけを使います。

```markdown
- display:
  - target: L-SearchResultsArea
  - element: L-SearchResultsList
```

`display.target` は、存在する `L-*` layout または `E-*` element を指します。`L-*` は message area、result area、help area、slot のような display container を表します。layout は、scenario や action の display effect から内容を受け取る空の display container として使う場合、`#### Items` を省略できます。`E-*` target も、既存 element の表示内容や設定を置き換える用途として有効です。

`E-*.error` は input element にだけ使います。これは input 本体の置換ではなく、その input に付属する field-level error slot への表示です。非入力 element に対する `E-*.error` は warning、存在しない target element は error です。

```markdown
- display:
  - target: E-EmailInput.error
  - message: V-EmailRules.messages
```

単純な validation message は `display.message` を使い、rich な UI を表示する場合だけ `display.element` を使います。同じ `display` に `element:` と `message:` を同時に書いた場合は warning です。

preview では、`display.message` に表示先ごとの独自 marker は付けず、参照元 validation
または business rule の marker を表示します。同じ `V-*` message を複数の target に
表示する場合も、各表示位置に同じ marker を出します。State View の wireframe 説明では、
displayed message を source 単位でまとめ、表示先と発生元 scenario case を列挙します。
constraint の詳細は `V-*` 定義側に残します。

```markdown
- display:
  - element: E-ConfirmDialog
```

```markdown
- display:
  - element: E-SavedToast
```

複数の処理を並列に開始し、全完了後にまとめて判定する場合は、各 process に `group: <group-id>` を書き、同じ group を持つ Resolve process で集約します。

```markdown
- Process P1: Load profile
  - group: initial-load
  - server:
    - call: MemberQueryService.findSelfProfile()
  - case: success
    - description: 200 member profile
    - continue
- Process P2: Load points
  - group: initial-load
  - server:
    - call: PointQueryService.findSelfPoints()
  - case: success
    - description: 200 points
    - continue
- Process P3: Resolve initial load
  - group: initial-load
  - case: ready
    - description: profile and points loaded
    - Effects
      - state: idle
    - stop
```

Action レベルの `When` / guard はサポートしません。操作可否は要素の `disabled when` に寄せ、入力検証は `Validations` に書きます。

イベント例は `E-SignInButton.click`、`E-EmailInput.blur`、`A-SubmitLogin.P2.response`、`screen.load`、`partial.render` です。現行リリースの要素イベントは `click`、`change`、`submit`、`focus`、`blur`、`open`、`close` です。Action lifecycle event は `response` です。

## Cases

処理ステップの結果は、該当する process step の `case: <name>` に書きます。`case` 名は、その Process が生成した result の分類です。case の補足説明が必要な場合は `description:` を使います。`result:` は Process level にだけ書き、case 直下には書きません。

`response:` は、実際に受け取った response を分類する case に限って使います。典型的には `receive:` block を持つ process step の case です。`sent`、`send-failed`、validation、branching case の一般的な説明として `response:` を使わず、`description:` を使います。各 case には、`description`、`response`、`state`、`navigate`、`display` effect など、意味が分かる detail を書きます。

## Preview Scenarios

`## Preview Scenarios` は、preview/export で使う state、model、view、Action process case の組み合わせを明示したい場合に使います。Preview Scenarios は追加プレビューです。`## States` から作る baseline preview は常に表示され、scenario はその上に追加されます。

```markdown
## Preview Scenarios

### idle-auth-error

- state: idle
- cases:
  - A-HandleLoginResponse.P1.failure
```

`before:` を使うと、baseline state preview または別の preview scenario の前に scenario を挿入できます。並び順指定は `before:` だけをサポートします。`after:` は使いません。`before:` を省略した場合、その scenario は base state preview の後に挿入されます。

`## Preview Scenarios` がない場合も、preview/export は全 state を baseline として表示し、View Context は default 値を使います。

## 部分更新

Thymeleaf や htmx による部分更新は、実装属性ではなく意味として `display:` に書きます。

```markdown
- Effects
  - display:
    - target: L-MessageArea
    - element: E-AuthErrorBanner
```

複数要素をまとめて表示する場合は layout として定義し、`element:` から参照します。

```markdown
- Effects
  - display:
    - target: L-SearchResultsArea
    - element: L-SearchResultsList
```

これは SPA rerender、MPA の returned HTML、MPA+htmx partial replacement のいずれにも解釈できます。MarkVSpec authoring DSL には `hx-*` 属性や swap mode を出しません。

`type: partial` 文書から返る content を表示する更新は、既存の `L-*` partial host を
target にし、display effect の中に `partial:` を書きます。

```markdown
### L-ProfileSummaryHost Profile summary host

- stack
- partial:
  - id: PRT-PROFILE-SUMMARY
  - states:
    - idle: loaded
    - loading: loading
    - load-error: load-error
```

```markdown
- Process P1: Profile summary response を処理
  - receive:
    - response: A-RefreshProfile.P1.response
  - case: success
    - description: 200 profile summary partial
    - Effects
      - state: idle
      - display:
        - target: L-ProfileSummaryHost
        - partial: PRT-PROFILE-SUMMARY
    - stop
```

`request:` は endpoint と parameter の通信契約だけを表します。Action Process 直下に
`partial:` を置きません。Process 直下の `partial:` は unsupported authoring syntax
であり、`display.partial` の互換 alias としては扱いません。canonical では、request
送信直後の `case: sent` は `state: loading` などに留め、返却 partial content の
表示は response success 側で表現します。

## データ由来とサンプル

`source: data` は、値が業務データ、API 応答、サーバ側モデルなどに由来することを示す分類です。データパスではありません。baseline preview の表示値は Element の `sample` / `sample rows:` に書き、state/scenario 固有の表示値は Preview Scenario の `samples` に書きます。

Action の `Effects` に `${model.*}` への代入を書く model mutation は canonical DSL ではありません。生成される設計書ビューにも、横断的なモデル更新セクションは表示しません。

`input:` は legacy syntax です。実行に渡す値は `request.params`、`server.params`、または `<custom detail>.params` に書きます。

```markdown
- Process P1: Submit login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
```

各 section を `Section Lead`、`Entity Block`、`Structured Body`、`Entity Notes`
などの用語で確認したい場合は、[構造化セクションリファレンス](structured-section-reference.html)
を参照してください。

## Field Validations / Cross-field Validations

`## Field Validations` と `## Cross-field Validations` は client-side / screen-local な
検証契約を書きます。`V-*` は何を検証するかの contract であり、Action をいつ起動するかは
定義しません。Element 側の入力 metadata は type、長さ、範囲、pattern、IME、accept、step
などの入力 UI 仕様に限定し、検証 constraint、message、error code はこの章に置きます。

必須入力は Validation 側が canonical です。`"Email*"` のような layout label や
`Input*` のような element heading に required の意図を重ねず、validation constraint
として `required` を書きます。

```markdown
## Field Validations

### V1:V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
  - email:
    - message: Enter a valid email address.
  - length: element
    - when: E-EmailInput.value is present
    - message: Email length must follow the input specification.
```

Validation heading form:

```text
### [marker:]<validation-id> [name]
```

preview では `### V1:V-EmailRules` の `V1:` のような heading marker を表示します。
marker がない場合、validator は warning を出し、validation ID を marker label として
使います。marker は表示用 label であり、参照 ID ではありません。参照には
`V-EmailRules.result` のような `V-*` ID を使います。summary key は `target`、`run`、
`constraints` を使います。通常 `run` は省略し、初期対応値は `client` です。`scope` は書かず、
section 名で field / cross-field を判定します。
生成 preview の field validation 表は `ID`、`名前`、`対象`、`ルール`、`条件`、
`メッセージ`、`エラーコード` を表示します。複数 constraint を持つ Validation は
constraint ごとに 1 行で表示し、Validation の識別列は結合します。

`length: element` は target Element の min/max length 入力 metadata を再利用します。
`range: element` は target Element の min/max value 入力 metadata を再利用します。
参照先 Element に必要な入力 metadata がなければ warning とし、preview は fallback
message を作りません。
これらのショートハンドを使った場合、preview は作者が書いたショートハンドを残しつつ、
Element 側の実値を補足します。たとえば
`length: element (min length: 3, max length: 40)` や
`range: element (min: 13, max: 120, step: 1)` のように表示します。

複数 input または form 全体にまたがる検証契約は `## Cross-field Validations` に書きます。

```markdown
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin

## Cross-field Validations

### V2:V-LoginForm Login form validation

- target: F-LoginForm
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: E-EmailInput.value is present and E-PasswordInput.value is present
- message: Email and password are required.
```

フォーム全体の検証は `## Form Groups` で `F-*` を定義し、validation の `target`
に FormGroup ID を指定します。`target: L-*` は表示レイアウトと検証責務が混ざるため、
cross-field validation の対象としては使いません。

summary key は `target`、`run`、`inputs`、`check`、`when`、`message` を使います。
`check` と `when` は初期 DSL では人間可読 text であり、構造化 expression ではありません。
`check` 内の `and` / `or` は説明文であり、`when` は上記の condition 結合規則に従います。
`condition:` と `group:` は canonical syntax では使いません。
生成 preview の cross-field validation 表は `ID`、`名前`、`対象`、`入力`、`チェック`、
`条件`、`メッセージ`、`エラーコード` を表示します。`check` は検証内容、`when` は
適用条件を表します。

各 Validation は `<validation-id>.result` と `<validation-id>.messages` という暗黙の
opaque reference を公開します。初期 Action contract では result value は `valid` /
`invalid` に限定します。validation result をいつ消費し、message をどこに表示するかは
Action が決めます。

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - Effects
      - display:
        - target: L-MessageArea
        - message: V-LoginForm.messages
    - stop
  - case: valid
    - continue
```

`display.message` が message を持たない validation を参照した場合は warning とし、
preview は fallback text を表示しません。Validation 定義には `attach` を書かず、
表示先は Action の `Effects` にある `display.target` で指定します。`display.target`
は通常の `L-*` / `E-*` target rule と、`E-EmailInput.error` のような input field error
target rule に従います。

`display.message` が heading marker を持たない `V-*` validation を参照した場合、
validator は warning を出し、preview は validation ID を fallback marker label として
使います。

## Business Rules

Business Rules は業務制約を書きます。サーバ要求の結果として初めて判明する業務エラーも
`Validation` には混ぜず、Business Rule violation として扱います。画面内で判定できる
client-side / screen-local な入力検証は `V-*`、業務制約は `R-*`、API が返す具体的な
エラーコードは必要な場合だけ `ERR-*` に置きます。

```markdown
## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- description: Subscription email must not already be registered.
- messages:
  - This email address is already registered.
```

Rule heading form:

```text
### [marker:]<rule-id> [name]
```

`messages:` は `<rule-id>.messages` として参照できる message group です。
Action が `R-*.messages` を表示するとき、preview は `V-*` message と同じく
`R-*` heading marker を表示します。marker がなければ validator は warning を出し、
preview は rule ID を fallback marker label として使います。

Business Rule violation は、通常 `request:` または `server:` process の `case:` で受けます。
canonical case name は `business-rule-violation` です。サーバ応答で判明する業務エラーに
`validation-error` を使うと `V-*` Validation と混ざるため避けます。

```markdown
- Process P2: Submit subscription
  - server:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - result:
    - subscription creation request
  - case: business-rule-violation
    - description: email is already registered
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: R-EmailMustBeUnique.messages
    - stop
```

`business rule:` は `case:` 配下に置き、`receive:` や `result:` には混ぜません。
表示先は通常の `display.target` rule に従い、`E-*.error` field slot と `L-*`
summary area のどちらにも表示できます。`R-*.messages` の参照先に `messages:` または
`message` がなければ warning とし、preview fallback text は表示しません。

`ERR-*` は API 対応確認用の補助情報です。画面表示の意味は `business rule:` を正にします。

## Error Codes

`## Error Codes` はサーバ応答や検証失敗を UI 表示契約に対応付けます。

```markdown
## Error Codes

### ERR-PASSWORD-CONFIRMATION パスワード確認

- business rule: R-RequiredFields
- target: E-PasswordConfirmInput
- message: パスワードと確認用パスワードが一致していること。
- display: inline
```

Validation は `error code` でエラーコードを参照できます。Action の応答ケースにも
`error code: ERR-*` を書くことで、サーバ応答と UI メッセージ契約を接続できます。

## History

`## History` は仕様書の変更履歴を構造化して扱います。`###` 見出しを履歴 entry の
version / ID とし、entry 冒頭の metadata bullet を schema に従って検証します。
標準 schema は次の通りです。

- `date`: 必須。`YYYY-MM-DD`
- `author`: 必須文字列
- `reviewer`: 任意文字列
- `reason`: 任意文字列

metadata の後に書いた本文は自由 Markdown として生成設計書に表示されます。

```markdown
## History

### ver 1.0

- date: 2026-05-13
- author: 佐藤
- reviewer: 田中
- reason: 初版作成

初版としてログイン画面を追加しました。

- ログインフォーム
- エラー表示
```

プロジェクトで履歴列を増やしたい場合は `## History Fields` を定義します。同じ key
を定義すると標準 schema を上書きし、それ以外は追加 field になります。

```markdown
## History Fields

- date
  label: Date
  required: true
  type: date

- author
  label: Author
  required: true
  type: string

- ticket
  label: Ticket
  required: false
  type: string

- approvedBy
  label: Approved By
  required: false
  type: string
```

## View Context セクション

`## View Context` は、画面 state ではないが表示を変える UI ローカルな文脈を定義します。
例として、選択中のタブ、表示モード、ヘルプパネルの開閉があります。表示データは
Element samples または Preview Scenario samples に置き、View Context は一時的な UI 文脈に限定します。

```markdown
## View Context

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true

### selectedTab

- type: enum
- values:
  - results*
  - billing
```

定義できる型は `boolean` と `enum` です。`boolean` の値は `true` / `false` のみです。
`*` はデフォルト値を示します。`*` がない場合、MarkVSpec は先頭の値を fallback として使います。

Elements、Layouts、Actions から View Context を参照するときは `${view.<name>}` を使います。

```markdown
- visible when: ${view.isHelpPanelOpen}
```

Action から View Context を更新するときは、process case の中に `view:` effect を書きます。

```markdown
- Process P1: Open help panel
  - case: opened
    - Effects
      - view: ${view.isHelpPanelOpen} = true
      - view: ${view.selectedTab} = results
```

## View Context Samples セクション

`## View Context Samples` は、preview/export で利用する View Context の値セットに名前を付けます。

```markdown
## View Context Samples

### default

- ${view.isHelpPanelOpen}: false
- ${view.selectedTab}: results

### help-open

- ${view.isHelpPanelOpen}: true
- ${view.selectedTab}: billing
```

Preview Scenario が `view` を指定しない場合、preview/export はまず
`View Context Samples.default` を使います。それがなければ `## View Context` のデフォルト値を使い、
`*` がない View Context 定義では先頭の値を使います。

## Preview Scenarios セクション

`## Preview Scenarios` は、state preview に使う `state`、`model`、`view` の組み合わせを明示します。Preview Scenarios は追加プレビューです。`## States` から作る baseline preview は常に表示され、scenario はその上に追加されます。

```markdown
## Preview Scenarios

### loaded-help

- state: loaded
- model: loaded
- view: help-open
- before: saved
```

`before:` を使うと、baseline state preview または別の preview scenario の前に scenario を挿入できます。並び順指定は `before:` だけをサポートします。`after:` は使いません。`before:` を省略した場合、その scenario は base state preview の後に挿入されます。

`## Preview Scenarios` がない場合、preview/export はすべての state を表示します。
View Context の fallback は、`View Context Samples.default`、View Context のデフォルト値、
`*` がない View Context 定義の先頭値の順です。

## 説明文と自由記述セクション

`# <ID> <Title>` 直後から最初の `##` 見出しまでの本文は、画面または
パーシャル自体の説明です。生成設計書では Screen / Partial の説明として表示し、
自由記述セクションにはしません。

```markdown
# PRT-POINTS-CONTENT ポイントコンテンツ

HTMX の `hx-get="/points/content"` に応答して返される部分 HTML。
ポイント残高サマリーを提供する。

## States
```

MarkVSpec は、予約されていない level-2 見出しを自由記述セクションとして扱います。
自由記述セクションは Markdown として保持し、生成される設計書ビューに表示しますが、
MarkVSpec は内容を検証、集計、実装契約として解釈しません。

```markdown
## Project Memo

- Error copy still needs product review.
- First release uses server-side rendering.
```

上の `Project Memo` は例示用の自由記述セクション名です。MarkVSpec の標準セクション名ではありません。
未決事項を自由記述として残すことはできます。ただし、未決事項がある設計書をそのまま
実装や受け入れ判定の入力にしないでください。実装契約として扱う情報は、
`Actions`、`Validations`、`Business Rules`、`Error Codes` など、
構造化された該当セクションへ移します。

## サンプル

実際にパーサーで検証されるサンプルは `examples/` に学習順で配置しています。

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
- `examples/05-reuse/template-shell.vspec.md`
- `examples/05-reuse/profile-page-with-template.vspec.md`
- `examples/05-reuse/profile-summary.partial.vspec.md`
- `examples/06-structured-sections/history-and-errors.vspec.md`
