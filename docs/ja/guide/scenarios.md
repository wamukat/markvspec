# シナリオ

Preview Scenarios は、1つの画面に複数の review 用 preview case を付けるために使います。
error、empty、toast、dialog、direct link を見せるためだけに、画面仕様全体を複製しないでください。

## 使う場面

- validation error を、画面全体を書き直さずに見せる。
- 同じ state の empty / error / loading data を見せる。
- action result で出る toast、dialog、message を見せる。
- route parameter や hash fragment 付きの direct link を見せる。
- preview や HTML export で review しやすい名前付き case を作る。

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
email input に preview data を入れ、`token=expired` がある route として表示する、という意味です。

## どこに何を書くか

| 目的 | 書くもの |
| --- | --- |
| 表示する state | `state:` |
| 表示したい action / validation result | `cases:` |
| Element ごとの preview value | `samples:` |
| route parameter や hash fragment | `route:` |

Preview Scenarios は preview data です。新しい screen、state、action を作るものではありません。
実際の画面挙動は `## States`、`## Elements`、`## Actions` に書き、scenarios は review したい見え方に名前を付けるために使います。

## 次に読むもの

- [States](states.md)
- [Actions](actions.md)
- [Validation](validation.md)
- [Preview Scenarios Reference](../reference/sections.md)
- [Scenario Preview Data Example](../../../examples/showcase/scenario-samples.html)
