# UI 部品・画面パターン対応範囲

## この文書の位置づけ

この文書は、MarkVSpec が現行リリースで表現しやすい UI 部品と画面パターンを確認するための
利用者・開発者向け補助資料です。具体的な書き方は [サンプルギャラリー](example-gallery.md)
と [DSL リファレンス](dsl.md) を参照してください。

このページは、MarkVSpec が実務の画面仕様として何を表現できるかを整理するための
棚卸しです。デザインシステムの部品カタログではなく、業務画面を曖昧な文章に逃げず
に書き、プレビューし、印刷し、実装へ渡せるかを判断するための一覧です。

## UI 部品の対応範囲

| 部品 | 状態 | MarkVSpec での表現 | 補足 |
| --- | --- | --- | --- |
| 見出し / 段落 / テキスト | 対応済み | `Heading`, `Paragraph`, `Text` | 静的文言と model 由来のサンプル値は `label`, `sample`, `src`, `format` で分けます。 |
| テキスト入力 | 対応済み | `Input` | `value`, `initial value`, `placeholder`, input rule、validation contract を書けます。必須判定は `## Validations` に書きます。 |
| 日付 / 時刻 / 数値入力 | 対応済み | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | `value: ${data.value}` と `initial value`、必要に応じて `min`, `max`, `step` を書きます。 |
| ファイル入力 | 対応済み | `FileInput`, `FileUpload` | `accept`, `multiple`, `label`, `sample` で制約や補助文を表現します。 |
| ボタン / リンク | 対応済み | `Button`, `Link` | `variant`, `tone`, `action`, `href`, route params を書けます。 |
| Select / Checkbox / RadioGroup | 対応済み | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | 選択肢は Markdown のネストリストで書きます。排他的な値域は `RadioGroup`、複数値は `CheckboxGroup` または `MultiSelect`、boolean 設定は `Switch` で表します。 |
| Banner / Badge | 対応済み | `Banner`, `Badge` | `tone` で danger や success などの意味を表現します。 |
| List / Table | 対応済み | `List`, `Table` | Table は列とサンプル行を Markdown のネストリストで書きます。 |
| Dialog / Overlay | 対応済み | `Dialog` と target なしの `display.element` | Dialog は既定で modal overlay です。`actions:` で cancel / confirm button を定義し、Preview Scenario または action case から layout target なしで表示します。 |
| Toast 通知 | 対応済み | `Toast` と target なしの `display.element` | Toast は non-modal overlay です。`message`、`tone`、`placement`、`duration` を使い、複数表示時は toast region に stack 表示します。 |
| Spinner / Loading mask | 対応済み | `Spinner` と状態表示 layout | 待機状態や partial loading に使います。 |
| Divider | 対応済み | `Divider` | フォームや詳細画面内のグループ区切りに使います。 |
| Empty state | 対応済み | `visible when: empty` を持つ `Paragraph` | 空状態は専用 element ではなく、empty state に紐づく文章として表します。 |
| Breadcrumb | 代替表現あり | row layout 内の `Link` | 専用セマンティクスは未定義です。 |
| Tabs | 代替表現あり | row layout 内の `Button` / `Link` | 選択中 tab の専用表現は未定義です。 |
| Accordion | 今後対応 | 未定義 | 展開 / 折りたたみ状態の意味付けが必要です。 |
| Pagination | 代替表現あり | row layout と paging button / page text | 専用要素はまだ canonical ではありません。 |
| Stepper | 今後対応 | 未定義 | current / completed / error step の意味付けが必要です。 |
| Skeleton | 代替表現あり | `Spinner`, `Text`, placeholder layout | 専用セマンティクスは未定義です。 |

## 画面パターンの対応範囲

| パターン | 状態 | 推奨表現 |
| --- | --- | --- |
| 検索 / 一覧 | 対応済み | toolbar layout、`Table`、空状態 `Paragraph`、paging button、`loading` / `load-error` state。 |
| 詳細 | 対応済み | stack/grid layout、`Badge`、`List`、read-only text、必要に応じて dialog action。 |
| 編集フォーム | 対応済み | `Input`、`DateInput`、`TimeInput`、`NumberInput`、`Textarea`、`FileInput`、`Select`、`MultiSelect`、`Checkbox`、`CheckboxGroup`、`Switch`、`DatePicker`、`FileUpload`、validation feedback、保存 lifecycle action。 |
| 確認フロー | 対応済み | `Dialog`、target なしの `display.element`、confirm/cancel action、danger tone。 |
| 保存フィードバック | 対応済み | `Toast`、target なしの `display.element`、success/error tone、`display: toast` の Error Codes。 |
| 承認フロー | 代替表現あり | 詳細 / 編集パターンに action と rule を明示します。 |
| 履歴 / 監査ログ | 対応済み | `Table` または `List` にサンプル行を記載します。 |
| 権限別表示 | 代替表現あり | `visible when` / `hidden when` に role 条件を意味として書きます。 |
| 非同期 partial update | 対応済み | 名前付き request process、partial document、`display.target`、partial render state。 |
| エラー復旧 | 対応済み | error state、retry action、display outcome。 |

## 優先ギャップ

1. ルート階層や現在位置の表現が重要になったら Breadcrumb を canonical 化する。
2. tab content と selected-tab の仕様出力が必要になったら Tabs を追加する。
3. 展開 / 折りたたみ状態を validation したくなったら Accordion を追加する。
4. row layout による Pagination 表現が冗長になったら専用要素を追加する。
5. state-flow 記法が固まった後、複数ステップ申込向けに Stepper を追加する。

## 不足候補の分類

ここでは見た目としてよく使われるかではなく、画面仕様として意味を持つかで分類します。
選択状態、開閉状態、overlay、進捗、階層ナビゲーション、ページ移動などを持ち、
Layout と既存 Element の組み合わせだけではレビューしにくいものを canonical 化候補とします。

| 候補 | 分類 | 判断 | 理由 |
| --- | --- | --- | --- |
| Tabs | 追加候補 | canonical semantics を定義する | selected tab と tab panel の表示を View Context / Preview Scenarios と接続したい。 |
| Menu / DropdownMenu / ActionMenu | 追加候補 | canonical semantics を定義する | item ごとの action と open/closed overlay 状態が Button 群だけでは埋もれる。 |
| Popover / Tooltip | 追加候補 | anchored overlay として定義する | Dialog より軽い overlay で、anchor と表示条件が必要。 |
| Accordion / Disclosure | 追加候補 | canonical semantics を定義する | 展開 / 折りたたみ対象を state 名の発明なしでレビューしたい。 |
| ProgressBar | 追加候補 | canonical semantics を定義する | Spinner では表せない value/max/tone を持つ。 |
| Stepper | 追加候補 | canonical semantics を定義する | current/completed/error step を持つ複数ステップ画面で必要。 |
| Breadcrumb | 追加候補 | canonical semantics を定義する | 階層ナビゲーションでは current item と遷移先の区別が必要。 |
| Pagination | 追加候補 | canonical semantics を定義する | 検索 / 一覧で page、total、next、previous、page size action が頻出する。 |
| Skeleton | Layout pattern | まだ Element にはしない | loading placeholder は named skeleton region が必要になるまでは layout variant で足りる。 |
| Card | Layout pattern | Layout variant のままにする | 画面上の container style であり、独立した仕様対象ではない。 |
| Toolbar | Layout pattern | Layout + Button/Link 群で表す | action は通常の Element として並べた方が読みやすい。 |
| SearchBox | Layout pattern | Input + Button + Action で表す | 既存の form/action primitive の組み合わせで意味が残る。 |
| EmptyState | Layout/content pattern | Paragraph/Banner + visibility で表す | empty state は state/scenario に紐づく表示内容として扱う。 |
| Avatar | Layout/content pattern | Image + Text で表す | 画像と名前を別々にレビューできる。 |
| Chart / Map / RichTextEditor / Calendar / TreeView | custom/domain-specific | 反復する具体需要が出るまで `custom:*` | domain と interaction detail への依存が強い。 |

## 最小構文案

以下は未実装の構文案です。実装前に必要な最小形を記録するためのものです。

### Tabs

```markdown
### E-SettingsTabs Tabs

- value: ${view.selectedSettingsTab}
- items:
  - Profile: profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing: billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab
```

Preview 方針: tab strip を表示し、選択中 item を示す。各 item が制御する panel は
Element Summary または専用の behavior 行で確認できるようにする。

### Menu / DropdownMenu / ActionMenu

```markdown
### E-RowActions ActionMenu

- label: More actions
- open when: ${view.openActionMenuRowId} == ${data.row.id}
- items:
  - Edit: A-EditRow
  - Disable: A-DisableRow
```

Preview 方針: trigger と item action を表示する。Preview Scenario で open の場合は
anchored overlay として表示する。

### Popover / Tooltip

```markdown
### E-PasswordHelp Popover

- anchor: E-PasswordHelpButton
- placement: bottom-start
- visible when: ${view.isPasswordHelpOpen}
- content: Password must be at least 12 characters.
```

Preview 方針: non-modal anchored overlay として表示し、anchor、placement、visibility、
content を Display Content Spec で確認できるようにする。

### Accordion / Disclosure

```markdown
### E-AdvancedFilters Accordion

- value: ${view.expandedSections}
- items:
  - Advanced filters: filters
    - panel: L-AdvancedFilterPanel
```

Preview 方針: active な View Context に応じて header と expanded panel を表示する。
展開状態は screen state ではなく UI 局所値として扱う。

### ProgressBar

```markdown
### E-UploadProgress ProgressBar

- value: ${data.upload.percent}
- max: 100
- tone: info
```

Preview 方針: low-fidelity な bar を表示し、value/max/source を Display Content Spec に出す。

### Stepper

```markdown
### E-ApplicationSteps Stepper

- value: ${view.currentStep}
- items:
  - Profile: profile
  - Confirm: confirm
  - Complete: complete
```

Preview 方針: View Context または model 値から current/completed/pending/error を表示し、
各 step を要約する。

### Breadcrumb

```markdown
### E-AccountBreadcrumb Breadcrumb

- items:
  - Accounts: SCR-ACCOUNT-LIST
  - Account detail
```

Preview 方針: compact path を表示し、遷移できる item と current item を分けて示す。

### Pagination

```markdown
### E-SearchPagination Pagination

- page: ${data.search.page}
- total pages: ${data.search.totalPages}
- page size: ${data.search.pageSize}
- previous action: A-PreviousPage
- next action: A-NextPage
```

Preview 方針: previous/next control、current page、total pages、page size を表示する。
page 変更 action は Action Summary でも確認できるようにする。

## Example 作成方針

- Tabs は View Context の example 拡充時に focused example を追加する。
- Pagination は row layout 代替表現が生成仕様上うるさくなった段階で、検索一覧 example に追加する。
- Popover / Tooltip は Dialog / Toast との違いを示す overlay example として設計する。
- Accordion / Stepper はどちらも screen state ではない UI 局所値が必要なので、View Context Samples と合わせて example 化する。
- Skeleton / Card / Toolbar / SearchBox / EmptyState / Avatar は、当面 canonical Element ではなく Layout/content pattern の example として扱う。
