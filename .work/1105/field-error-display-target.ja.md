# 1105 Field error display target

## 目的

Input 系 element が暗黙に持つ field-level error slot を MarkVSpec の display target として扱えるようにする。
単純な validation error 文言は表示専用 `E-*` element を作らず、`display.message` で `V-*.messages` を表示できるようにする。

## Canonical syntax

```markdown
- Effects
  - display:
    - target: E-EmailInput.error
    - message: V-EmailRules.messages
```

`E-EmailInput.error` は `E-EmailInput` の置換ではない。`E-EmailInput` に付属する field-level error slot への表示を意味する。

## 対象 element

初期対応で `E-*.error` を許可する element type:

- `Input`
- `Textarea`
- `NumberInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `Select`
- `MultiSelect`
- `Checkbox`
- `CheckboxGroup`
- `RadioGroup`
- `Switch`
- `FileUpload`
- `FileInput`

非入力 element への `E-*.error` は warning とする。存在しない `E-*` への `E-*.error` は error とする。

## display.message

`display` は `element:` または `message:` のどちらか一方を持てる。

- `element:` は authored UI (`E-*` / `L-*`) を表示する。
- `message:` は simple message group reference を表示する。

初期対応する参照形:

- `V-FieldRules.messages`
- `V-CrossFieldRules.messages`
- `R-BusinessRule.messages`

`message:` が `V-*` / `R-*` の `.messages` 参照でなければ warning。
存在しない `V-*` / `R-*`、または message text を持たない source を参照した場合も warning。
fallback text は表示しない。

## Preview

Preview Scenario が `E-*.error` へ `display.message` または `display.element` を出した場合、wireframe では対象 input の直下に field error として表示する。
`E-*.error` は layout item ではないため、Layout table の未配置 layout / element として扱わない。

## 実装分解

1. Core parser
   - display payload の `message:` を `MarkVSpecDisplayEffect.message` として読む。
2. Core validator
   - `display.target: E-*.error` を認識する。
   - target element が存在しない場合は error。
   - target element が入力系でない場合は warning。
   - `display.element` と `display.message` の同時指定は warning。
   - `display.message` の missing source / missing message / unsupported reference は warning。
3. Preview renderer
   - `E-*.error` target を通常の partial/display replacement から除外する。
   - `E-*.error` target は対象 input の wrapper 内に field error content として挿入する。
4. Docs / examples
   - DSL docs に `E-*.error` と `display.message` を記載する。
   - `examples/03-actions/form-submit-flow.vspec.md` に simple field error display の例を追加する。
