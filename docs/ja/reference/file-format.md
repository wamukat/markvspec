# File Format

## 対象

MarkVSpec の source file は `.vspec.md` です。1ファイルは1つの screen、template、partial を表します。

## Front Matter

```yaml
---
id: SCR-LOGIN
type: screen
title: ログイン
route: /login
---
```

必須 metadata は `id`、`type`、`title` です。`type` は `screen`、`template`、`partial` のいずれかです。

## 本文

Front Matter の後に Markdown 見出しと箇条書きで仕様を書きます。JSON は authoring format ではなく、内部表現または export 用の形式です。

## 関連 example

- [Hello Screen](../../../examples/showcase/hello-screen.html)
