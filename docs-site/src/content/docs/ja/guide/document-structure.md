---
title: "文書構造"
---

MarkVSpec の文書は、読める Markdown と構造化された DSL セクションを同じファイルに置きます。

## 役割

- 前半の文章は、人が画面の目的と判断を読むために使います。
- `## States`、`## Layout`、`## Elements`、`## Actions` などのセクションはプレビューとバリデーションに使います。
- 詳細な構文を探すときは [リファレンス](/markvspec/ja/reference/) を見ます。

## 書く順番

1. 画面の目的を短く書く。
2. 状態を決める。
3. レイアウトと要素を足す。
4. アクション、バリデーション、シナリオを必要な分だけ足す。
5. VS Code プレビューで結果を見る。

関連: [Markdownモデル](/markvspec/ja/guide/markdown-model/)
