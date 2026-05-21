---
title: "考え方"
---

このセクションでは、MarkVSpec の背後にある考え方を説明します。

MarkVSpec は画面仕様のための Markdown-first format です。
画面仕様を、人が読みやすく、レビューしやすく、Git で管理しやすく、プレビュー/出力
でき、AI でも編集しやすいテキストとして扱うことを重視します。

## Visual-first ではなく Text-first

一般的な UI design tool は canvas から始まります。MarkVSpec は text から始まります。
この選択により、ソースは次の用途に向きます。

- pull request review と line diff
- Git history と local-first workflow
- 構造を保った AI edits
- VS Code での lightweight authoring
- 同じソースからの低忠実度プレビューと出力

Markdown は読めますが、それ自体は visual design surface ではありません。そのため
VS Code プレビューで即時に見た目を確認しつつ、Markdown を正本として
維持します。

## Screen-first Authoring

1 つの `.vspec.md` ファイルは 1 つの画面を記述します。コンポーネント化は実装側の
関心として扱い、作成モデルは画面中心に保ちます。これにより product、
design、engineering のレビュー担当者が振る舞いを 1 箇所で議論できます。

screen-first とは、部品を再利用しないという意味ではありません。画面仕様を書く段階では、
まず利用者が見る画面、画面状態、主な操作、サーバーとのやり取りを 1 ファイルに集めます。
実装時に component、partial、template へ分けるかどうかは、実装側の設計判断として扱います。

## What MarkVSpec Is Not

MarkVSpec は次のものではありません。

- pixel-perfect な design tool。
- CSS、HTML、フレームワークコンポーネントの置き換え。
- API schema や database schema の定義場所。
- 実装 attribute をそのまま貼るための wrapper。

MarkVSpec が扱うのは、screen spec として合意したい情報です。画面に何があり、どの状態があり、
どの操作で何が起きるかを、Markdown として review できる粒度で書きます。

## Semantic UI Specs

MarkVSpec は生の CSS やフレームワーク属性ではなく、意図を記述します。

- `variant` は `primary` / `secondary` のような priority を表す。
- `tone` は `warning` / `danger` のような意味上の意図を表す。
- `Process Pn:` と `request` / `receive` は action が何をするかを表す。
- `case:` と `display` は state change と partial update を表す。

この方針により、特定の implementation stack に寄せすぎず、validation と rendering
に必要な構造も保てます。

## AI と Git に向いた形式

MarkVSpec の source は plain text です。これは、人間だけでなく AI と Git にとっても扱いやすい形です。

- reviewer は pull request 上で行単位の差分を読める。
- AI は Markdown heading と ID を手がかりに、対象範囲を限定して編集できる。
- formatter や export の結果ではなく、source を canonical にできる。
- ローカルフォルダと VS Code だけで作成とプレビューができる。

ただし、AI が編集しやすいからといって曖昧な本文だけに寄せると、プレビューとバリデーションが弱くなります。
人が読む説明と、tool が読む structured body の両方を保つことが重要です。

## 次に読むもの

- [はじめる](../start/)
- [ガイド: 文書構造](/markvspec/ja/guide/document-structure/)
- [ガイド: Markdownモデル](/markvspec/ja/guide/markdown-model/)
- [ガイド: アクション](/markvspec/ja/guide/actions/)
- [リファレンス](../reference/)
- [サンプル](/markvspec/examples/)
