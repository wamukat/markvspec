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
| Tabs | 対応済み | `Tabs` | `active` で要素内の初期選択 tab を示します。各 item は `panel: L-*` と `action: A-*` を参照でき、生成仕様では item label を集約し、action link を辿れます。 |
| Banner / Badge | 対応済み | `Banner`, `Badge` | `tone` で danger や success などの意味を表現します。 |
| List / Table | 対応済み | `List`, `Table` | Table は列とサンプル行を Markdown のネストリストで書きます。 |
| Dialog / Overlay | 対応済み | `Dialog` と target なしの `display.element` | Dialog は既定で modal overlay です。`actions:` で cancel / confirm button を定義し、Preview Scenario または action case から layout target なしで表示します。 |
| Popover / Tooltip | 対応済み | `Popover`, `Tooltip` | anchored non-modal help です。`anchor` は `E-*` 参照必須で、`placement`、`text`、visibility condition は preview と生成仕様に表示されます。hover / focus runtime behavior と interactive popover content は初期契約の対象外です。 |
| Accordion / Disclosure | 対応済み | `Accordion`, `Disclosure` | 画面内の局所的な展開 / 折りたたみです。`open` は Element 内の初期表示状態で、panel は `L-*` layout group を参照し、任意 action も追跡できます。 |
| Action menu | 対応済み | `ActionMenu` | 行アクションや三点メニュー向けの action 専用 menu です。各 item は `action: A-*` 必須で、任意の `tone` と `disabled when` も生成仕様に表示されます。汎用 `Menu`、selection menu、nested menu は対象外です。 |
| Toast 通知 | 対応済み | `Toast` と target なしの `display.element` | Toast は non-modal overlay です。`message`、`tone`、`placement`、`duration` を使い、複数表示時は toast region に stack 表示します。 |
| Spinner / Loading mask | 対応済み | `Spinner` と状態表示 layout | 待機状態や partial loading に使います。 |
| Divider | 対応済み | `Divider` | フォームや詳細画面内のグループ区切りに使います。 |
| Empty state | 対応済み | `visible when: empty` を持つ `Paragraph` | 空状態は専用 element ではなく、empty state に紐づく文章として表します。 |
| Breadcrumb | 代替表現あり | row layout 内の `Link` | 専用セマンティクスは未定義です。 |
| Pagination | 代替表現あり | row layout と paging button / page text | 専用要素はまだ canonical ではありません。 |
| Stepper | 今後対応 | 未定義 | current / completed / error step の意味付けが必要です。 |
| Skeleton | 代替表現あり | `Spinner`, `Text`, placeholder layout | 専用セマンティクスは未定義です。 |

## 画面パターンの対応範囲

| パターン | 状態 | 推奨表現 |
| --- | --- | --- |
| 検索 / 一覧 | 対応済み | toolbar layout、`Table`、空状態 `Paragraph`、paging button、`fetching` / `fetch-error` state。 |
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
2. row layout による Pagination 表現が冗長になったら専用要素を追加する。
3. state-flow 記法が固まった後、複数ステップ申込向けに Stepper を追加する。

## 不足候補の分類

ここでは見た目としてよく使われるかではなく、画面仕様として意味を持つかで分類します。
選択状態、開閉状態、overlay、進捗、階層ナビゲーション、ページ移動などを持ち、
Layout と既存 Element の組み合わせだけではレビューしにくいものを canonical 化候補とします。

| 候補 | 分類 | 判断 | 理由 |
| --- | --- | --- | --- |
| Menu / DropdownMenu | 追加候補 | 後続で canonical semantics を定義する | action 専用の `ActionMenu` では扱わない navigation / selection menu の意味論が残っています。 |
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

## Element 構文メモ

実装済み Element の構文メモと、まだ設計が必要な候補構文をまとめます。
実装済みかどうかは周辺の説明に明記します。

### Tabs

```markdown
### E-SettingsTabs Tabs

- active: Profile
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab
```

`Tabs` は実装済みです。preview は tab strip と active item、active panel 参照を表示します。
生成仕様では tab item を集約し、Element Summary から item action を辿れるようにします。

### Menu / DropdownMenu / ActionMenu

候補構文案:

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
- visible when: help-open
- text: Password must be at least 12 characters.
```

`Popover` と `Tooltip` は実装済みです。preview では anchored non-modal help として表示し、
anchor、placement、visibility、text を Display Content Spec で確認できます。
Tooltip の hover / focus runtime behavior と interactive Popover content は対象外です。

### Accordion / Disclosure

```markdown
### E-AdvancedFilters Accordion

- open: Advanced filters
- items:
  - Advanced filters
    - panel: L-AdvancedFilterPanel
    - action: A-ToggleAdvancedFilters
  - Saved filters
    - panel: L-SavedFiltersPanel
```

```markdown
### E-ShippingDetails Disclosure

- label: Shipping details
- open: true
- panel: L-ShippingDetailsPanel
- action: A-ToggleShippingDetails
```

`Accordion` と `Disclosure` は実装済みです。preview では header と開いている
panel 参照を表示します。Display Content Spec では panel / action link を集約し、
局所的な展開動作を screen state と分けて確認できます。

### ActionMenu

```markdown
### E-RowActions ActionMenu

- label: More actions
- placement: bottom-end
- open: false
- items:
  - Edit
    - action: A-EditRow
  - Disable
    - action: A-DisableRow
    - tone: danger
    - disabled when: selected-row-locked
```

`ActionMenu` は action 専用 menu として実装済みです。preview では trigger を表示し、
`open: true` の場合は anchored item list を表示します。Display Content Spec では
item label、action link、tone、disabled condition を集約します。汎用 `Menu`、
selection menu、nested menu はこの Element の対象外です。

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

- Pagination は row layout 代替表現が生成仕様上うるさくなった段階で、検索一覧 example に追加する。
- Popover / Tooltip は focused example を追加済みです。Dialog / Toast との比較は、
  overlay 利用がさらに増えた段階で広げます。
- Stepper は screen state ではない UI 局所値が必要になり得るので、View Context Samples と合わせて example 化する。
- Skeleton / Card / Toolbar / SearchBox / EmptyState / Avatar は、当面 canonical Element ではなく Layout/content pattern の example として扱う。
