# Concepts

このセクションでは、MarkVSpec の背後にある考え方を説明します。

MarkVSpec は screen specification のための Markdown-first format です。
画面仕様を、人が読みやすく、レビューしやすく、Git で管理しやすく、preview/export
でき、AI でも編集しやすい text source として扱うことを重視します。

## Visual-first ではなく Text-first

一般的な UI design tool は canvas から始まります。MarkVSpec は text から始まります。
この選択により、source は次の用途に向きます。

- pull request review と line diff
- Git history と local-first workflow
- 構造を保った AI edits
- VS Code での lightweight authoring
- 同じ source からの low-fidelity preview と export

Markdown は読めますが、それ自体は visual design surface ではありません。そのため
VS Code preview で即時に見た目を確認しつつ、Markdown を canonical source として
維持します。

## Screen-first Authoring

1 つの `.vspec.md` file は 1 つの screen を記述します。Componentization は実装側の
関心として扱い、authoring model は screen-oriented に保ちます。これにより product、
design、engineering の reviewer が behavior を 1 箇所で議論できます。

## Semantic UI Specs

MarkVSpec は raw CSS や framework attribute ではなく、意図を記述します。

- `variant` は `primary` / `secondary` のような priority を表す。
- `tone` は `warning` / `danger` のような semantic intent を表す。
- `Process` と `HttpRequest` は action が何をするかを表す。
- `Cases` と `update` は state change と partial update を表す。

この方針により、特定の implementation stack に寄せすぎず、validation と rendering
に必要な構造も保てます。

## 次に読むもの

- [Start](../start/)
- [Guide: Markdown Model](../guide/markdown-model.md)
- [Guide: Actions](../guide/actions.md)
- [Reference](../reference/)
- [Examples](../examples/)
