# 1106 display.message / field error marker 設計メモ

## 方針

- `display.message: V-*.messages` は、表示先ごとの独自マーカーではなく、参照元 Validation の heading marker を表示する。
- 同じ `V-*` message を複数箇所に表示する場合も、同じ marker を各表示位置に出す。
- `E-*.error` は input 本体とは別の field-level error slot として扱い、message marker も input marker とは分離する。
- `L-*` / `E-*` target への `display.message` は、container marker ではなく、挿入された message content 側に marker を付ける。
- State View の wireframe 下に表示説明を追加し、`Source` / `Displayed at` / `Triggered by` / `Kind` / message text を追跡できるようにする。

## Read Model

- Preview HTML の後処理だけに閉じず、`StateScreenReadModel.displayExplanations` に表示説明の構造を持たせる。
- `displayExplanations` は source と content kind 単位で grouping し、同じ `V-*` message が複数 target に出る場合は `Displayed at` に集約する。
- `Triggered by` は preview scenario の case reference から `A-*.P*.case` 形式で保持する。

## Validation Marker

- Validation heading は `### V1:V-EmailRules Email rules` のような marker prefix を受け付ける。
- marker がない `V-*` を `display.message` から参照した場合は warning とし、preview は `V-*` ID を fallback marker として表示する。
- constraint-level の詳細説明は `V-*` 定義側に残す。wireframe の表示説明は「どの message がどこに出たか」を説明する。

## Business Rule

- `R-*.messages` の marker 表示基盤は同じ read model に載せる。
- `R-*` の明示 marker 設計は後続 ticket #1107 に委ね、この ticket では ID fallback を使う。
