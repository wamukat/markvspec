---
title: "シナリオ"
---

Preview Scenarios は、1つの画面に複数のレビュー用プレビューケースを付けるために使います。
error、empty、toast、dialog、direct link を見せるためだけに、画面仕様全体を複製しないでください。

## 使う場面

- validation error を、画面全体を書き直さずに見せる。
- 同じ state の empty / error / loading data を見せる。
- action result で出る toast、dialog、message を見せる。
- route parameter や hash fragment 付きの direct link を見せる。
- プレビューや HTML 出力でレビューしやすい名前付きケースを作る。

State は画面の表示モードに名前を付けるものです。Preview Scenarios は、その state の中で
review したい具体的な表示 case に名前を付けるものです。

## 最小例

```markdown
## Preview Scenarios

### invalid-email

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

この scenario は、`idle` state を表示し、submit invalid case を適用し、
email input にプレビューデータを入れ、`token=expired` がある route として表示する、という意味です。

## どこに何を書くか

| 目的 | 書くもの |
| --- | --- |
| 表示する state | `state:` |
| 表示したい action / validation result | `cases:` |
| Element ごとのプレビュー値 | `samples:` |
| route parameter や hash fragment | `route:` |

Preview Scenarios はプレビューデータです。新しい画面、状態、アクションを作るものではありません。
実際の画面挙動は `## States`、`## Elements`、`## Actions` に書き、scenarios は review したい見え方に名前を付けるために使います。

## 次に読むもの

- [States](/markvspec/ja/guide/states/)
- [Actions](/markvspec/ja/guide/actions/)
- [Validation](/markvspec/ja/guide/validation/)
- [Preview Scenarios リファレンス](/markvspec/ja/reference/sections/)
- [Scenario Preview Data Example](/markvspec/examples/showcase/scenario-samples.html)
