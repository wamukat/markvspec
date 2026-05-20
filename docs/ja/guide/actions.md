# Actions

Action は「操作したら何が起きるか」を書く場所です。

button や link には `action: A-*` を付けます。`## Actions` には、その action が state を変えるのか、request を送るのか、別画面へ移るのかを書きます。

## まずこれだけ

```markdown
### E-SubmitButton Button

- label: Submit
- action: A-SubmitRequest

## Actions

### A-SubmitRequest Submit request

- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-SubmitRequest.result
  - case: invalid
    - display:
      - target: E-EmailInput.error
      - message: V-SubmitRequest.messages
    - stop
- Process P2: Submit subscription
  - case: sent
    - state: submitting
```

preview では、`Submit` button と `A-SubmitRequest` のつながり、validation error の表示差し替え、`idle` から `submitting` への変化を確認できます。

![Form Submit Flow の action preview](../../assets/vscode-previews/form-submit-flow-vscode-preview.png)

## 書く判断

- button から action を呼ぶ: element の `action: A-*`。
- 画面読み込みで action を呼ぶ: `## Events`。
- action が有効な state を絞る: `From`。
- request を書く: `Process Pn:` の `server:`。
- 結果で分岐する: `case:`。
- 表示を差し替える: `display`。
- 画面を移動する: `navigate`。

## よく使う形

```markdown
### A-HandleSubmitResponse Handle submit response

- From
  - submitting
- Process P1: Handle server response
  - receive:
    - response: A-SubmitRequest.P2.response
  - case: success
    - navigate: SCR-THANK-YOU
  - case: failure
    - state: idle
    - display:
      - target: L-MessageArea
      - element: E-SubmitError
```

ここで重要なのは、実装関数名ではなく「ユーザーに見える結果」が読めることです。

## 見る例

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Display Updates](../../../examples/showcase/display-effects.html)
- [Actions Reference](../reference/actions.md)
