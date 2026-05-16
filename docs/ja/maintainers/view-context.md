# View Context 設計メモ

## この文書の位置づけ

この文書は、`## States` にダイアログ表示、ヘルプ表示、選択中タブなどの一時的な UI 表示状態を詰め込みすぎないための設計メモです。

`View Context` と `Preview Scenarios` は DSL と preview/export の責務に反映済みです。この文書は、状態数を増やさずに表示文脈を扱うための設計判断と、Action DSL の canonical form を説明する内部設計メモです。

## 背景

現在の `## States` は、画面内の業務状態、通信状態、エラー状態を表すために使っています。

```markdown
## States

- idle*
- loading
- loaded
- validation-error
- auth-error
```

一方で、実際の画面仕様では次のような表示状態も書きたくなります。

- ヘルプパネルが開いている。
- 削除確認ダイアログが表示されている。
- 検索条件パネルが展開されている。
- タブ `billing` が選択されている。
- 表示形式が `list` / `grid` のどちらかである。

これらをすべて `## States` に入れると、状態数が掛け算で増えます。

```text
loaded
loaded-help-open
loaded-delete-dialog-open
loaded-billing-tab
loaded-billing-tab-help-open
```

この形は、状態遷移図を読みにくくし、`State Flow` が本来示したい画面内の業務・処理状態を隠してしまいます。

## 決定案

MarkVSpec では、業務・データ・処理状態と、表示を決める一時的な UI 文脈を分けます。

- `## States`: 画面内の業務状態、通信状態、データ取得状態、エラー状態。
- `## Model Samples`: 画面が扱うデータの状態別サンプル。
- `## View Context`: 同じ state / model の中で、表示の開閉、選択、表示モードを決める値。

`View Context` は実装上の境界ではありません。React などで実装するとき、`Model Samples` 由来のデータと `View Context` 由来の値が同じ component state や store に置かれても構いません。

MarkVSpec で分ける理由は、仕様上の役割が違うためです。`Model Samples` は「何を表示するか」の材料であり、`View Context` は「どのように見せるか、どの補助 UI を出すか」を決める文脈です。

## 責務の境界

### States

`States` は、画面内の主要な状態遷移を表します。

例です。

- 初期表示。
- API request 中。
- API response 後にデータがある。
- API response 後に空である。
- 検証エラー。
- 認可エラー。

`State Flow` 図には、原則として `States` の state-to-state 遷移だけを表示します。自己ループ、別画面遷移、`View Context` の変更は、状態遷移図を複雑にするため表示しません。

### Model Samples

`Model Samples` は、state ごとの画面データ例です。

例です。

```markdown
## Model Samples

### loaded

#### ${model.member}

- name: Jane Doe
  role: Admin
```

これは画面が扱うデータの例であり、ヘルプパネルが開いているか、どのタブが選択されているかは表しません。

### View Context

`View Context` は、画面データそのものではなく、表示条件を決める UI 局所値です。

boolean だけに限定しません。少なくとも次の型を想定します。

- `boolean`: `isHelpPanelOpen` のように、名前だけで `true` / `false` の意味が自然に読める補助条件。
- `enum`: 選択中タブ、表示モード、ソート方向など、取り得る値名を明示したい条件。

将来必要になる可能性はありますが、初期設計では `string`、`number`、任意 object は慎重に扱います。入力中の検索語、ページ番号、カーソルなどは、画面仕様上の表示文脈なのか、フォーム入力・URL・モデルデータなのかを個別に判断する必要があります。

## 記法案

`## View Context` を level-2 section として追加します。

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
  - profile
  - billing
  - security
```

boolean は `true` / `false` に限定します。`isHelpPanelOpen` のように名前を肯定形の条件にすると、`visible when: ${view.isHelpPanelOpen}` と自然に読めます。`list` / `grid` のように `true` / `false` では意味が落ちる値は、2 値であっても `enum` として表します。

view context の既定値は `values` の `*` で示します。`*` がない場合は `values` の先頭を既定値として扱います。`## View Context Samples` がない場合でも、各 view context 定義の既定値から default view context を組み立てられるようにします。`*` を複数付けた場合は diagnostic error です。

## View Context Samples

`View Context` も、`Model Samples` と同様に設計書上でサンプル値を登録できるようにします。

`## View Context` は view context の schema を定義します。`## View Context Samples` は named value set を定義します。View Context sample 自体は state と直接結びつけません。

```markdown
## View Context Samples

### default

- ${view.isHelpPanelOpen}: false
- ${view.selectedTab}: results

### help-open

- ${view.isHelpPanelOpen}: true
- ${view.selectedTab}: results

### billing-tab

- ${view.isHelpPanelOpen}: false
- ${view.selectedTab}: billing
```

`### <name>` は view context sample の名前です。`default` は標準の view context sample として扱えます。`help-open` や `billing-tab` は、state とは独立した表示文脈の値セットです。

これにより、state 自体は増やさずに、ヘルプ表示、ダイアログ表示、選択中タブなどの見え方を設計書上で名前付きデータとして持てます。`Model Samples` は表示データ、`View Context Samples` は表示条件の値です。

`Preview Scenarios` がない場合は、すべての state を baseline preview / export に表示します。各 state の wireframe は `default` view context sample があればそれを使います。`View Context Samples` がない、または `default` sample がない場合は、`## View Context` の既定値から組み立てた view context を使います。既定値は `*` 付き値を優先し、`*` がなければ `values` の先頭を使います。

## Preview Scenarios

`State`、`Model Samples`、`View Context Samples` の組み合わせは `Preview Scenarios` として明示できます。

```markdown
## Preview Scenarios

### loaded

- state: loaded
- model: loaded
- view: default

### loaded-help

- state: loaded
- model: loaded
- view: help-open

### loaded-billing-tab

- state: loaded
- model: loaded
- view: billing-tab
```

`Preview Scenarios` は preview / export の追加表示単位です。state 一覧を絞り込むためのものではありません。`View Context Samples` や `Model Samples` に state との関連を持たせず、scenario が `state` / `model` / `view` を束ねます。これにより、状態、表示データ、表示文脈の責務を分離したまま、レビューしたい追加画面状態だけを明示できます。

`Preview Scenarios` が存在する場合は、preview / export は `Preview Scenarios` に従います。その代わり、書き漏らしを防ぐため、`## States` に存在するすべての state が少なくとも 1 つの scenario に登場しなければ diagnostic error にします。同じ state に複数 scenario を定義することはできます。存在しない state / model sample / view context sample の参照も diagnostic error です。全組み合わせの自動生成は行いません。

`Preview Scenarios` が存在しない場合だけ、MarkVSpec が全 state の baseline scenario を自動生成します。この fallback により、シンプルな画面では追加記述なしで全 state preview を維持できます。一方、`Preview Scenarios` を書いた画面では、それが preview / export の source of truth になります。

## Elements からの参照

要素やレイアウトは、`visible when` などの条件から state、model、view context を参照できます。条件式では値の出所を明示するため、`${state...}`、`${model...}`、`${view...}` の名前空間付き参照を使います。

```markdown
### E-HelpPanel Panel

- visible when: ${view.isHelpPanelOpen}

### E-BillingPanel Panel

- visible when: ${view.selectedTab} = billing

### E-LoadedSummary Panel

- visible when: ${state.loaded}
```

`${state.loaded}` は現在 state が `loaded` であることを表す boolean 条件です。Action の `From` や `state:` effect は state 名そのものを列挙・設定する場所なので、そこでは従来どおり `loaded` と書きます。

## Actions からの更新

Action の効果は `model`、`state`、`view` の 3 種類として並べられます。Action 直下の `Effects` と旧 `cases:` block は canonical authoring から外し、効果は必ず `Process:` または `case:` 配下に書きます。

`Process: <process-type>` と `case: <case-name>` を使い、複数 step は `Process:` を複数並べます。記載順を process order として扱います。

```markdown
### A-SubmitSearch Submit search

- Triggered
  - E-SearchButton.click
- From
  - idle
  - loaded
- Process: Immediate
  - Effects
    - view: ${view.isHelpPanelOpen} = false
    - view: ${view.selectedTab} = results
- Process: Validate
  - target: V-SearchForm
  - case: invalid
    - response: invalid search condition
    - Effects
      - state: validation-error
    - stop
  - case: valid
    - continue
- Process: HttpRequest
  - GET /search
    - keyword: E-KeywordInput.value
    - page: ${model.searchRequest.page}
  - case: sent
    - Effects
      - state: loading
    - stop
  - case: send-failed
    - response: request could not be sent
    - Effects
      - state: load-error
    - stop

### A-ApplySearchResult Apply search result

- Triggered
  - A-SubmitSearch.response
- From
  - loading
- Process: HttpResponse
  - case: success
    - response: 200 search result
    - Effects
      - model: ${model.searchResult.items} = response.items
      - model: ${model.searchResult.totalCount} = response.totalCount
      - state: loaded
      - view: ${view.selectedTab} = results
      - view: ${view.isHelpPanelOpen} = false
  - case: failure
    - response: 5xx or timeout
    - Effects
      - state: load-error
      - view: ${view.isHelpPanelOpen} = false
```

この整理案では、`model: ...` は画面データの更新、`state: loaded` は業務・処理 state の変更、`view: ${view.selectedTab} = results` や `view: ${view.isHelpPanelOpen} = false` は表示文脈の変更として扱います。

この形で破綻しないための前提は次の通りです。

- `Process: <process-type>` は Action 直下の process step を表す。`Process:` を複数書ける。
- `case: <case-name>` は直近の `Process:` の結果分岐を表す。旧 `cases:` block は canonical form から外す。
- `response`、`when`、`skip when`、request parameter、service call などの step detail は `Process:` 直下、または該当する `case:` 直下に置く。
- `Effects` は `Process:` 直下、または `case:` 直下にだけ置ける。
- `Validate` や `Resolve` のように引数が必要な process は、`Process: Validate` + `target: V-...`、`Process: Resolve` + `group: initial-load` のように detail として表す。
- `Resolve: <group>` のような Action 直下の `Resolve` group は canonical form では廃止する。`Resolve` も処理列の一部として `Process: Resolve` に統一する。

並列 process と resolve は次のように表します。並列に参加する process は同じ `group` を持ち、各 case は結果や model 更新だけを残して `continue` します。最終的な `state` / `navigate` は `Process: Resolve` に寄せます。

```markdown
### A-InitialLoad Initial dashboard load

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - group: initial-load
  - MemberQueryService.findSelfProfile()
  - case: success
    - response: 200 member profile
    - Effects
      - model: ${model.memberProfile.loaded} = true
      - model: ${model.memberProfile.name} = result.name
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.memberProfile.loaded} = false
    - continue
- Process: ServerCall
  - group: initial-load
  - PointQueryService.findSelfPoints()
  - case: success
    - response: 200 points
    - Effects
      - model: ${model.points.loaded} = true
      - model: ${model.points.balance} = result.balance
    - continue
  - case: failure
    - response: 5xx or timeout
    - Effects
      - model: ${model.points.loaded} = false
    - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - response: profile and points loaded
    - Effects
      - state: idle
    - stop
  - case: failed
    - response: one or more calls failed
    - Effects
      - state: load-error
    - stop
```

`group` を持つ `Process:` の `case:` では、`state` や `navigate` を直接書きません。並列 process の完了条件と最終遷移を `Process: Resolve` に集約することで、State Flow の分岐点を 1 箇所に保ちます。`Resolve` は外部呼び出しではなく、同じ Action 内の parallel group を集約する control process です。`Process: Resolve` は後続の `Process:` へ `continue` できるため、resolve 後に整形や追加判定を続ける Action も処理順どおりに読めます。

`view` 変更だけの Action は `State Flow` 図に表示しません。必要であれば、将来 `View Context` 専用の一覧または小さな matrix を生成します。

短縮形として Action 直下 `Effects` を残す案は採用しません。書きやすくはなりますが、レビュー時に「処理」と「結果」の対応が見えにくくなり、parser も複数の等価表現を正規化する必要が出ます。MarkVSpec では、読み書きの省略よりも、レビューしやすい単一の canonical form を優先します。

## プレビューと生成設計書

初期実装では、次の出力方針を想定します。

- `Screen` 概要または専用セクションに `View Context` の一覧を表示する。
- `Wireframe` は default view context を使って表示する。
- state 別 wireframe は、state と default view context の組み合わせを表示する。
- `Display Content Spec` では、条件付き表示の要素に `visible when` を表示する。
- `State Flow` 図には `View Context` の値変更を含めない。

将来、選択中タブやダイアログ表示をレビューしやすくする必要が出た場合は、state ごとの全組み合わせを自動展開するのではなく、明示的な preview scenario を別概念として追加する方がよいです。

## 診断

`View Context` を導入する場合、少なくとも次の warning / error が必要です。

- view context 定義の `values` が空である。
- 条件式が存在しない `${state...}` / `${view...}` / `${model...}` path を参照している。
- `view: ${view.selectedTab} = billing` が存在しない enum value を代入している。
- boolean view context に `open` などの enum 風の値を代入している。
- view context 定義の `values` に `*` が複数ある。

## 決定済み

- セクション名は `## View Context` とする。
- View Context の型は初期実装では `boolean` と `enum` だけにする。
- 条件式の値参照は `${state...}` / `${view...}` / `${model...}` の名前空間を使う。state 条件は `${state.loaded}` のように書く。
- View Context の既定値は `values` の `*` で示せる。`*` がない場合は `values` の先頭に fallback する。複数 `*` は diagnostic error とする。
- `## View Context Samples` は state と直接結びつけない named value set とする。
- `## Preview Scenarios` がない場合は、全 state の baseline scenario を自動生成する。
- `## Preview Scenarios` がある場合は、それを preview / export の source of truth とする。ただし、すべての state が少なくとも 1 scenario に登場しない場合は diagnostic error とする。
- `View Context` の全組み合わせは自動生成しない。
- Action DSL は compact canonical syntax に移行する。Action 直下 `Effects` と legacy `Process` -> step -> `cases:` は canonical form から外す。
- `Resolve` は `Process: Resolve` に統一する。
- 2 値 enum と boolean の使い分けは warning 中心にする。`type: enum` の値が `true` / `false` だけの場合は warning、`type: boolean` に `open` / `closed` のような enum 風値を入れた場合は error とする。
- 条件式の初期実装は単項条件、`not`、enum equality までに絞る。`and` / `or`、比較演算、`in` などは初期実装では扱わない。
- `visible when`、`hidden when`、`disabled when`、`selected when`、`active when` は同じ条件解決に乗せる。
- URL query、フォーム入力中の値、ページング cursor は `View Context` に含めない。URL query は将来の `${query...}`、フォーム入力中の値は element value または form model、ページング cursor は model または request model に逃がす。

## 残課題

- URL query / form model / request model の正式な DSL 位置づけ。
- 複合条件が必要になった場合の条件式拡張方針。

## レビュー観点

- `States` から一時的 UI 表示状態を分離できているか。
- `Model Samples` と `View Context` の境界が作者に説明できるか。
- React などの実装 state と MarkVSpec の仕様概念を混同させない説明になっているか。
- state diagram を複雑にしない方針が明確か。
- 初期実装の範囲が広がりすぎていないか。
