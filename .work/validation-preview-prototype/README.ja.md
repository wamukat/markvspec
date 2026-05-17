# Validation Preview Prototype

このディレクトリは MarkVSpec#1108 の検討用プロトタイプです。

production renderer の実装ではありません。`V-*.messages` / `R-*.messages`、
`E-*.error`、`L-*` summary、marker 集約表示、ワイヤーフレーム下説明の見え方を
実物ベースで確認するための静的 HTML です。

## 確認したいこと

- `V-*` marker が field error と summary の両方に出たときに読めるか。
- `R-*` marker が Business Rule violation の表示として自然か。
- 同じ marker が複数箇所に出る場合、ワイヤーフレーム下の説明を1つに集約して混乱しないか。
- `Displayed at` / `Triggered by` / `Rules` / `Messages` の情報量が多すぎないか。
- Field Validations、Cross-field Validations、Business Rules の一覧との対応が追いやすいか。
- marker 未指定の `V-*` が fallback label として ID 表示されたときに、通常 marker と区別しつつ読めるか。

## 開き方

ブラウザで次を開きます。

```text
.work/validation-preview-prototype/index.html
```
