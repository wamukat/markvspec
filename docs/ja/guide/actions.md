# Actions

Action は「操作したら何が起きるか」を書く場所です。

button や link には `action: A-*` を付けます。`## Actions` には、その action が state を変えるのか、request を送るのか、別画面へ移るのかを書きます。

## まずこれだけ

```markdown
### E-SaveButton Button

- label: Save
- action: A-Save

## Actions

### A-Save Save

- From
  - idle
- Process P1: Send save request
  - server:
    - POST /settings
  - case: sent
    - state: saving
```

preview では、`Save` button と `A-Save` のつながり、`idle` から `saving` への変化を確認できます。

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
### A-HandleSaveResponse Handle save response

- From
  - saving
- Process P1: Apply response
  - receive:
    - response: A-Save.P1.response
  - case: success
    - state: saved
    - display:
      - target: L-MessageArea
      - content: Saved message
  - case: failure
    - state: error
    - display:
      - target: L-MessageArea
      - content: Save error message
```

ここで重要なのは、実装関数名ではなく「ユーザーに見える結果」が読めることです。

## 見る例

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Display Updates](../../../examples/showcase/display-effects.html)
- [Actions Reference](../reference/actions.md)
