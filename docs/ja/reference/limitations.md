# 制限事項

<!-- markvspec-coverage:reference.page.limitations -->

MarkVSpec はテキストから書く画面仕様フォーマットです。視覚デザインツールや実装コードの置き換えではありません。

## 書ける構文

MarkVSpec では、実装詳細ではなく意味を持つ DSL を書きます。

```markdown markvspec-skip reason=requires-elements-context
### E-Submit Button

- label: Submit
- variant: primary
- tone: neutral
- action: A-Submit
```

### 書かないもの

| 対象 | 理由 | 代わりに書くもの |
| --- | --- | --- |
| 生の色指定 | デザイントークンや実装テーマに依存するため | `tone: danger` などの意味上の意図 |
| CSS class | 実装詳細であり仕様の安定した約束ではないため | 要素の種類、variant、tone |
| 生の width / height / pixel 値 | レイアウト実装に依存するため | `stack`、`row`、`gap`、`align` などの意味。入力幅が必要な場合は `width: short` / `medium` / `long` / `full` |
| JSON ソース | 作成用フォーマットではないため | Markdown の見出しと箇条書き |
| Markdown table をソースにすること | 解析対象の正本構造にしないため | 見出し、箇条書き、サブセクション |
| component implementation | 主要なモデルは画面単位のため | 画面、レイアウトグループ、要素、アクション |

## 小さな例

避ける例:

```markdown markvspec-skip reason=noncanonical-example
### E-Submit Button

- class: btn btn-blue w-240
- color: #0066ff
- width: 240px
```

推奨:

```markdown markvspec-skip reason=requires-elements-context
### E-Submit Button

- label: Submit
- variant: primary
- action: A-Submit
```

![Source Kind Metadata の意味的な DSL プレビュー](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## 注意点

- MarkVSpec は低忠実度ワイヤーフレームと仕様確認に向いた形式です。
- 細かな視覚デザインは別のデザインシステムや UI 実装で扱います。
- JSON は解析や出力の内部表現として使われることがありますが、利用者がソースとして書く形式ではありません。
- Markdown table は補足説明には使えますが、要素、アクション、ルールの正本にはしません。
- コンポーネント化は実装側の関心です。MarkVSpec の主要な作成モデルは画面単位です。

## 関連ページ

- [ファイル形式](./file-format.md)
- [要素](./elements.md)
- [アクション](./actions.md)
- [ガイド](../guide/index.md)
