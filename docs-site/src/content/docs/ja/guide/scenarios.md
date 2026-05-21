---
title: "シナリオ"
---

Preview Scenarios は、1つの画面に複数のレビュー用プレビューケースを付けるために使います。
エラー、空表示、トースト、ダイアログ、直接リンクを見せるためだけに、画面仕様全体を複製しないでください。

## 使う場面

- バリデーションエラーを、画面全体を書き直さずに見せる。
- 同じ状態の空表示、エラー、読み込み中データを見せる。
- アクション結果で出るトースト、ダイアログ、メッセージを見せる。
- ルートパラメータやハッシュ付きの直接リンクを見せる。
- プレビューや HTML 出力でレビューしやすい名前付きケースを作る。

State は画面の表示モードに名前を付けるものです。Preview Scenarios は、その状態の中で
レビューしたい具体的な表示ケースに名前を付けるものです。

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

このシナリオは、`idle` 状態を表示し、送信失敗ケースを適用し、
メール入力にプレビューデータを入れ、`token=expired` があるルートとして表示する、という意味です。

## どこに何を書くか

| 目的 | 書くもの |
| --- | --- |
| 表示する状態 | `state:` |
| 表示したいアクション / バリデーション結果 | `cases:` |
| 要素ごとのプレビュー値 | `samples:` |
| ルートパラメータやハッシュ | `route:` |

Preview Scenarios はプレビューデータです。新しい画面、状態、アクションを作るものではありません。
実際の画面挙動は `## States`、`## Elements`、`## Actions` に書き、scenarios はレビューしたい見え方に名前を付けるために使います。

## 次に読むもの

- [状態](/markvspec/ja/guide/states/)
- [アクション](/markvspec/ja/guide/actions/)
- [バリデーション](/markvspec/ja/guide/validation/)
- [Preview Scenarios リファレンス](/markvspec/ja/reference/sections/)
- [Scenario Preview Data Example](/markvspec/examples/showcase/scenario-samples.html)
