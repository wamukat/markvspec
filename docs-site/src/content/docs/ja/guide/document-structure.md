---
title: "Document Structure"
---

MarkVSpec の文書は、読める Markdown と構造化された DSL section を同じ file に置きます。

## 役割

- 前半の文章は、人が screen の目的と判断を読むために使います。
- `## States`、`## Layout`、`## Elements`、`## Actions` などの section は preview と validation に使います。
- 詳細な構文を探すときは [Reference](/markvspec/ja/reference/) を見ます。

## 書く順番

1. 画面の目的を短く書く。
2. state を決める。
3. layout と element を足す。
4. action、validation、scenario を必要な分だけ足す。
5. VS Code preview で結果を見る。

関連: [Markdown Model](/markvspec/ja/guide/markdown-model/)

