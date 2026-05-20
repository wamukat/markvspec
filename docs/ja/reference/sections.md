# Sections

Sections は `.vspec.md` の本文を分割する top-level heading です。MarkVSpec は section 名から、後続の object をどう読むかを判断します。

## 書ける構文

```markdown
## States

- idle
- loading
- error

## Layout: mobile

### L-Page Page layout

- stack
- gap: md

#### Items

- E-Title
- E-Submit
```

認識される top-level section は次の通りです。

| Section | 書く内容 |
| --- | --- |
| `## States` | screen state の名前 |
| `## Layout: mobile` | layout group と item の並び |
| `## Elements` | UI element の意味、label、value、action |
| `## Actions` | trigger、request、effect、case |
| `## Business Rules` | business rule と画面固有の判断条件 |
| `## Notes` | 補足、実装メモ、意図 |
| `## Open Questions` | 未決事項 |

## 小さな例

```markdown
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen の section 構成と生成 preview](../../assets/vscode-previews/hello-screen-sections-vscode-preview.png)

## 注意点

- section heading は英語の固定名を使います。日本語文書でも `## Elements` のように書きます。
- Markdown 見出しは object 宣言です。見た目の見出し装飾ではありません。
- object は通常 `### ID Name` の形で宣言します。
- `#### Items` などの subsection は、直前の object に属します。
- 未認識 section は prose として扱われる可能性があり、preview や validation の対象にならない場合があります。

## 関連ページ

- [File Format](file-format.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
