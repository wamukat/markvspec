# プレビュー情報設計

## この文書の位置づけ

この文書は、MarkVSpec preview / generated document の情報設計を記録する内部設計文書です。
利用者向けの操作手順ではありません。出力や印刷の確認は [PDF 出力と共有](../user/pdf-export.md) と
[印刷回帰チェック](print-regression.md) を参照してください。

MarkVSpec のプレビューは、生成された画面設計書です。上から下まで読めて、
そのまま印刷/PDF化できる成果物として扱います。多少の情報重複は許容しますが、
各セクションには 1 つの主目的を持たせます。

## 原則

- 概要を先に置き、詳細は後に置く。
- 一覧表は、読者が素早く俯瞰できる粒度に留める。
- 振る舞いの本体は詳細セクションに集約する。
- パーサー都合の内部メタデータは、読者の確認に必要な場合だけ表示する。
- 同じ情報を複数箇所に出す場合は、概要、配置、遷移、通信契約、詳細のように表示目的を変える。

## セクション責務

| セクション | 主目的 | 表示するもの | 表示しないもの |
|---|---|---|---|
| Screen | 設計書の入口 | 文書ID、タイトル、種別、route、viewport、解決済み参照 | default-state、locale、partial state map、action結果、element詳細 |
| Wireframe | 画面構造と状態別の見え方 | Element samples、対象stateのscenario samples、Layout構造、Element配置、marker、自動イベント、partial preview配置、viewport/stateごとの現在仕様 | Element全プロパティ、Action内部処理、通信詳細 |
| Layouts | 現在のワイヤーフレーム文脈で表示されるLayout | marker、名前、種別、layoutプロパティ、item参照 | Elementの振る舞い、Action詳細 |
| 画面要素サマリー | 現在のワイヤーフレーム文脈の要素カタログ | marker、ID、type、関連Action、説明 | 表示文言、入力制約、visible/disabled条件、Action処理詳細 |
| 入力フォーム仕様 | ユーザーが入力できる値と制約 | 入力要素側の必須、値の初期値/取得元、入力詳細、readonly を含む制約、表示形式、表示/有効をまとめた Condition 列 | label、placeholder、option label、validation required rule、独立した bind 列など |
| 表示内容仕様 | 要素に表示される文言・値と取得元 | label、placeholder、help、sample、option label、src/i18n/model参照、format、表示/有効をまとめた Condition 列 | 入力制約、Action内部処理、validation条件 |
| Action Summary | 操作一覧の俯瞰 | marker、name、trigger、kind、著者が書いた overview | case別request params、response body、update target詳細、Action の availability、自動要約 |
| Action Details | 振る舞い仕様の本体 | 著者が書いた概要、種別、trigger、from、process、request、params、response、cases、partial updates、update、transition、route params、notes | 画面レイアウト詳細、Action レベルの guard、自動要約 |
| State Flow | 状態遷移の全体像 | Mermaid state diagram、状態遷移表へのリンク | request parameter、UI要素プロパティ |
| Screen Transitions | 別画面への遷移 | action、trigger、case、遷移先種別、遷移先target | 画面内状態遷移、partial update、request parameter詳細 |
| 状態遷移表 | 画面内状態の移動 | from-state x to-state の matrix、Action marker、result、Action名 | Action内部処理、trigger、response payload詳細 |
| States | 状態語彙の定義 | state name、initial、説明 | Action一覧、API契約 |
| Validations / Business Rules | 業務制約 | target、condition、message、notes | Layout配置 |
| 説明文 / 自由記述セクション / Diagnostics | 文書入口の説明、補足、ツールフィードバック | H1直下の説明本文、人間向けメモ、diagnostics | 構造化セクションに書くべき正規の振る舞い |

## 一覧と詳細の分担

一覧セクションは「何があり、次にどこを見ればよいか」を示します。
詳細セクションは「正確に何が起きるか」を示します。

- 画面要素サマリーは「何があるか」に絞り、表示内容や入力仕様を持ち込まない。
- 入力フォーム仕様は、ユーザーが入力できる値、入力要素側の必須、初期値/取得元、入力詳細、入力制約、表示形式、表示/有効をまとめた単一 Condition 列を扱う。readonly は制約として表示し、独立した bind 列は持たない。入力要素側の必須情報は必須列に集約し、仕様セルには表示しない。product validation の required rule は Validations に置く。
- 表示内容仕様は、`label`、`placeholder`、`source`、`sample`、`src`、`value`、`format`、`option label` を表示箇所ごとに扱い、表示文言を持つ非入力要素の表示/有効条件も単一 Condition 列で確認できるようにする。
- Validations は client/server と単項目/複合項目で表を分け、1つの表に責務を混在させない。
- Action Summary は 1 Action 1 行を維持し、著者が Action 見出し直下に書いた概要だけを表示する。処理内容から overview を自動生成しない。
- Action Details は、著者が書いた概要、種別、trigger、from、process、request、
  parameters、response、cases、partial updates、update、transition、
  route parameters の順で振る舞いを読むための本体を持つ。Element 参照は
  marker と ID を併記し、Layout 参照は marker と Layout name、Action 参照は
  marker と Action name を表示して、Layout ID や Action ID だけの表示に戻さない。
- 部分更新は Action Details 内に置き、request、response、case と同じ Action 文脈で target、fragment/content、結果の違いを確認できるようにする。
- Element samples と Preview Scenario samples は、wireframe で使う実サンプル値を示す。Scenario override は該当 wireframe の下に小さな `Scenario Preview Data` 表として表示する。
- Action から `${data.value}` へ代入する model mutation は canonical DSL ではないため、独立した preview section として集計しない。表示値の由来参照は State Views、表示内容仕様、入力フォーム仕様で確認する。

## 推奨出力順

1. Screen
2. 構造化された History
3. Table of Contents
4. States
5. State Flow
6. Viewport / State Wireframes（scenario samples がある場合は wireframe 下に Scenario Preview Data）
7. Screen Transitions
8. 状態遷移表
9. Action Details
10. Validations / Business Rules
11. Error Codes
12. 自由記述セクション
13. Diagnostics

参照設計書は Screen 内の文書依存関係として表形式で表示し、種別、ID、タイトル、
状態の対応関係を読めるようにする。この順序により、状態語彙と
状態遷移の前提を読んでから、各 state の表示サンプルとワイヤーフレームを近い位置で確認し、
振る舞いの横断表と詳細へ進める。

## 出力ルール

- 状態別プレビューの出力順は、初期状態と `States` の記載順で決める。`default-state` は単体ワイヤーフレームや partial 埋め込みの既定表示として扱う。
- 状態別プレビューは、各 viewport/state の現在仕様をそのまま表示する。同じ仕様が前の状態にも出ている行は repeated として示し、add/remove の差分表にはしない。
- 画面要素に紐づかない Action は、該当 state の Wireframe 直下に自動イベントとして表示する。要素上に Action marker を置ける Action は従来どおり要素側に表示する。
- 状態別の画面要素テーブルも、通常表示と同じく画面要素サマリー、入力フォーム仕様、表示内容仕様を主分類にする。
- preview の label、badge、chip、セグメント操作の active 表現は淡色背景、枠線、読みやすい文字色で統一する。state、event、partial、repeated のラベルは HTML と印刷/PDF で同じ視覚体系に見えるよう、黒背景ラベルを使わない。
- `locale` は authoring/rendering 設定であり、読者向けの画面メタ情報としては表示しない。
- `result` や response case は Action Details、状態遷移表、Screen Transitions に置く。Action Summary の横長な result 列にはしない。
- template/partial 参照は、Screen では文書依存関係、Wireframe では配置/preview、Action Details では DOM置換対象として分けて扱う。
- 生成表では読みやすさのため marker を使う。内部IDは、読者が安定参照を必要とする箇所に限定する。
