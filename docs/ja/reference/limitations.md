# Limitations

MarkVSpec は text-first の screen specification format です。visual design tool や実装コードの置き換えではありません。

## 書ける構文

MarkVSpec では、実装詳細ではなく意味を持つ DSL を書きます。

```markdown
### E-Submit Button

- label: Submit
- variant: primary
- tone: neutral
- action: A-Submit
```

### 書かないもの

| 対象 | 理由 | 代わりに書くもの |
| --- | --- | --- |
| raw color | design token や実装 theme に依存するため | `tone: danger` などの semantic intent |
| CSS class | 実装詳細であり spec の stable contract ではないため | element type、variant、tone |
| width/height/pixel | layout 実装に依存するため | `stack`、`row`、`gap`、`align` などの意味 |
| JSON source | authoring format ではないため | Markdown headings と bullets |
| Markdown table as source | parse 対象の canonical structure にしないため | headings、bullets、subsections |
| component implementation | primary model は screen-first のため | screen、layout group、element、action |

## 小さな例

避ける例:

```markdown
### E-Submit Button

- class: btn btn-blue w-240
- color: #0066ff
- width: 240px
```

推奨:

```markdown
### E-Submit Button

- label: Submit
- variant: primary
- action: A-Submit
```

![Source Kind Metadata の semantic DSL preview](../../assets/vscode-previews/source-kind-metadata-vscode-preview.png)

## 注意点

- MarkVSpec は low-fidelity wireframe と仕様確認に向いた形式です。
- pixel-perfect な visual design は別の design system や UI 実装で扱います。
- JSON は parser/export の内部表現として使われることがありますが、利用者が source として書く形式ではありません。
- Markdown table は補足説明には使えますが、element/action/rule の canonical source にはしません。
- componentization は実装側の関心です。MarkVSpec の primary authoring model は screen-first です。

## 関連ページ

- [File Format](file-format.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Guide](../guide/index.md)
