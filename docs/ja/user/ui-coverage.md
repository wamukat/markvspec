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
| テキスト入力 | 対応済み | `Input`, `Input*` | `value`, `initial value`, `placeholder`, validation, error text を書けます。 |
| 日付 / 時刻 / 数値入力 | 対応済み | `DateInput`, `TimeInput`, `NumberInput`, `DatePicker` | `value: ${model.value}` と `initial value`、必要に応じて `min`, `max`, `step` を書きます。 |
| ファイル入力 | 対応済み | `FileInput`, `FileUpload` | `accept`, `multiple`, `label`, `sample` で制約や補助文を表現します。 |
| ボタン / リンク | 対応済み | `Button`, `Link` | `variant`, `tone`, `action`, `href`, route params を書けます。 |
| Select / Checkbox / RadioGroup | 対応済み | `Select`, `MultiSelect`, `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup` | 選択肢は Markdown のネストリストで書きます。排他的な値域は `RadioGroup`、複数値は `CheckboxGroup` または `MultiSelect`、boolean 設定は `Switch` で表します。 |
| Banner / Badge | 対応済み | `Banner`, `Badge` | `tone` で danger や success などの意味を表現します。 |
| List / Table | 対応済み | `List`, `Table` | Table は列とサンプル行を Markdown のネストリストで書きます。 |
| Dialog / Overlay | 対応済み | `Dialog` と overlay layout | `overlay: area` / `overlay: screen` で重ね合わせを表します。 |
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
| 編集フォーム | 対応済み | `Input*`、`DateInput`、`TimeInput`、`NumberInput`、`Textarea`、`FileInput`、`Select`、`MultiSelect`、`Checkbox`、`CheckboxGroup`、`Switch`、`DatePicker`、`FileUpload`、validation state、保存 lifecycle action。 |
| 確認フロー | 対応済み | `Dialog`、`overlay`、confirm/cancel action、danger tone。 |
| 承認フロー | 代替表現あり | 詳細 / 編集パターンに action と rule を明示します。 |
| 履歴 / 監査ログ | 対応済み | `Table` または `List` にサンプル行を記載します。 |
| 権限別表示 | 代替表現あり | `visible when` / `hidden when` に role 条件を意味として書きます。 |
| 非同期 partial update | 対応済み | `PartialRequest`、partial document、`update` target、partial render state。 |
| エラー復旧 | 対応済み | error state、retry action、partial update outcome。 |

## 優先ギャップ

1. ルート階層や現在位置の表現が重要になったら Breadcrumb を canonical 化する。
2. tab content と selected-tab の仕様出力が必要になったら Tabs を追加する。
3. 展開 / 折りたたみ状態を validation したくなったら Accordion を追加する。
4. row layout による Pagination 表現が冗長になったら専用要素を追加する。
5. state-flow 記法が固まった後、複数ステップ申込向けに Stepper を追加する。
