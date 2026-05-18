# サンプルギャラリー

## この文書の位置づけ

この文書は、`examples/` にある MarkVSpec サンプルを目的別に探すための入口です。
構文そのものを確認したい場合は [DSL リファレンス](dsl.md) を参照してください。

現在 git 管理下にある `examples/` は、MarkVSpec の機能を学ぶための英語版サンプルギャラリーです。
このギャラリーは、VS Code preview、static HTML export、印刷回帰チェックでそのまま使える
リリース対象サンプルとして扱います。

## 方針

- 段階順に読み、最小画面から状態、アクション、実務寄りの一覧、再利用へ進める。
- 1つのサンプルで学ぶ主題を絞り、複数機能を詰め込みすぎない。
- `States`、responsive layout、slot、主要 element type、Action の Element `action:` / `## Events` / `Process <marker>: <name>`、process step の `case: <name>`、scenario samples を段階的にカバーする。
- `display:` は専用の基本例から読み、validation message、business rule message、targetless display、partial update の順に理解できるようにする。

## marker 方針

プレビューで読みやすくするため、layout / element / action の見出しには短い表示 marker を付けます。

```markdown
### L1:L-AccountShell Account shell
### 1:E-PageTitle Heading
### A1:A-LoadProfile Load profile partial
```

marker は表示用です。layout item、action trigger、display target、実装メモなどの参照には、
`L-AccountShell`、`E-PageTitle`、`A-LoadProfile` のような安定 ID を使います。短い marker は参照 ID として使いません。

rule と validation の見出しは、document symbol と parser test が曖昧にならないように
`### R-AccessControl Access control`、`### V-RequiredEmail Required email` のように安定 ID を直接書きます。

F-* / V-* を参照 chip として読みやすく見せたい場合は、安定 ID を変えずに `marker: F1` や
`marker: V1` のような marker property を使います。

## 主なサンプル

| サンプル | 用途 |
| --- | --- |
| [Hello Screen](../../../examples/01-basics/hello-screen.vspec.md) | metadata、1 state、1 viewport、layout、element、click action marker の最小例。 |
| [Async Fetching](../../../examples/02-states/async-loading.vspec.md) | request 送信、response handling、fetching/empty/fetch-error state、table sample rows の例。 |
| [Scenario Samples](../../../examples/02-states/scenario-samples.vspec.md) | baseline の Element `sample` / `sample rows:` と、同じ loaded state に対する Preview Scenario data variation / `rows: []` の例。 |
| [Responsive Profile](../../../examples/02-states/responsive-profile.vspec.md) | mobile / desktop viewport で同じ情報を異なる配置にする例。 |
| [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md) | `page.load`、`.change` の未保存通知、`.blur` validation、`.focus` help、`.submit`、dialog click / `close` と Preview Scenarios の例。 |
| [Display Effects](../../../examples/03-actions/display-effects.vspec.md) | `target: L-*` + `element:`、`target: E-*.error` + `message: V-*.messages`、`message: R-*.messages`、targetless Dialog / Toast を1画面で比較する display 基本例。 |
| [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md) | validation receive source、request parameters、server process detail、成功時 navigation の例。 |
| [Single Field Validation](../../../examples/03-actions/single-field-validation.vspec.md) | 単項目 validation contract と、length / pattern / type / range / step などの element 入力仕様の対応例。 |
| [Toast Feedback](../../../examples/03-actions/toast-feedback.vspec.md) | `Toast`、target なしの `display.element`、toast stack、success/error tone、`display: toast` の Error Codes の例。 |
| [Parallel Initial Load](../../../examples/03-actions/parallel-initial-load.vspec.md) | parallel server call と `Resolve` の例。 |
| [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md) | Display Content Spec の `label`、`sample`、`src`、`format`、`value`、`params` を確認する例。 |
| [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md) | 拡張 form、media、list、dialog 系 Element Type をまとめて確認する例。 |
| [Search List](../../../examples/04-real-world-screens/search-list.vspec.md) | filter、Table、paging、empty/error state、result replacement の例。 |
| [Login Basic](../../../examples/04-real-world-screens/login-basic.vspec.md) | responsive layout、required validation、message display scenario、request parameters、response cases、disabled control、navigation を含む実践的な login flow。 |
| [Template Shell](../../../examples/05-reuse/template-shell.vspec.md) | template document と slot の基本例。 |
| [Basic Slot Page](../../../examples/05-reuse/basic-slot-page.vspec.md) | template の `content` slot を埋める最小 screen の例。 |
| [Responsive Template Shell](../../../examples/05-reuse/responsive-template-shell.vspec.md) | mobile / desktop の template layout が同じ slot を描画する例。 |
| [Responsive Slot Page](../../../examples/05-reuse/responsive-slot-page.vspec.md) | viewport 未指定 slot fallback と desktop 固有 slot override の例。 |
| [Default Slot Page](../../../examples/05-reuse/default-slot-page.vspec.md) | screen が slot content を提供しない場合の template default fallback の例。 |
| [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md) | template 合成、route params、partial host metadata、`display.partial` refresh の例。 |
| [Profile Summary Partial](../../../examples/05-reuse/profile-summary.partial.vspec.md) | `type: partial`、partial route、partial-local state の例。 |
| [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md) | Error Codes、History Fields、History の例。 |

## 確認手順

1. [Login Basic](../../../examples/04-real-world-screens/login-basic.vspec.md) を開き、mobile / desktop の preview を確認する。
2. marker 表示、viewport filter、state 切替を確認する。
3. [Scenario Samples](../../../examples/02-states/scenario-samples.vspec.md) で scenario sample override の表示を確認する。
4. [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md) で click 以外の event と lifecycle trigger を確認する。
5. [Display Effects](../../../examples/03-actions/display-effects.vspec.md) で display target の違いを Preview Scenarios ごとに確認する。
6. [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md) で Display Content Spec の文言、表示値、データソース、format、value、params を確認する。
7. [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md) で拡張 Element Type の preview 表示を確認する。
8. [Basic Slot Page](../../../examples/05-reuse/basic-slot-page.vspec.md)、[Responsive Slot Page](../../../examples/05-reuse/responsive-slot-page.vspec.md)、[Default Slot Page](../../../examples/05-reuse/default-slot-page.vspec.md) で template slot content、viewport 固有 slot override、default fallback を確認する。
9. [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md) で template 合成、partial host、`display.partial` を確認する。
10. [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md) で構造化された履歴とエラーコードを確認する。
