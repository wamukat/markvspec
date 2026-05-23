# HTML と Markdown 記述の比較

## この文書の位置づけ

この文書は、MarkVSpec が HTML ではなく Markdown を主な記述面にする理由を記録する
設計判断メモです。実際の記法は [DSL リファレンス](../reference/index.md) を参照してください。

## 決定

MarkVSpec では、Markdown DSL を canonical authoring source とします。HTML はレンダー対象、プレビュー形式、import/export 形式、または実装成果物として扱い、主要な設計書記述言語にはしません。

## 背景

HTML はツリー構造を持ち、エディタサポートも一般的で、ブラウザで直接レンダリングできます。Thymeleaf と htmx を含む一部の実装対象にも近い形式です。

一方で MarkVSpec が目指しているのは、実装前に人間が読めてレビューできる画面設計書です。設計書の source は、DOM の詳細を考えなくても、画面意図、状態、アクション、遷移、バリデーション、部分更新を表せる必要があります。

## 判断理由

Markdown DSL を canonical source とする理由です。

- 通常の Markdown viewer やコードレビューで読みやすい。
- DOM 構造、CSS class、Thymeleaf 属性、htmx 属性のような実装詳細から設計意図を分離できる。
- 安定した ID、marker、state、action、rule を文書内の一級概念として扱える。
- 生成ビュー側で、用途ごとに適切な表現を選べる。例: wireframe HTML、印刷用 spec HTML、Mermaid 図、diagnostics、static HTML export、PDF export。

HTML を canonical source にしない理由です。

- HTML は見た目の構造を書きやすい一方、ワークフローの意味が DOM ノード上のカスタム属性に散らばりやすい。
- 大きなフォームやアクションフローは、現在の見出しと箇条書きの構造より読みにくくなる。
- Thymeleaf や htmx の詳細に早く結びつきすぎる。
- ルール、未決事項、レスポンス case、状態遷移のような非視覚的情報が後付けに見えやすい。

## HTML の位置づけ

HTML は MarkVSpec でも有用です。

- Live Preview と印刷可能な設計書ビュー。
- 生成された仕様を共有するための static HTML export。
- インストール済み Chrome/Chromium 互換ブラウザを使った PDF export。
- MarkVSpec の action や layout から、Thymeleaf fragment や htmx 属性などの framework details への実装マッピング。

## ガイドライン

「HTML で表現できるか」という問いに対する答えは、多くの場合 yes です。MarkVSpec でより重要なのは、「人間が設計書として素早く読んで変更できるか」です。その目的に対して Markdown DSL を主 source にする方が適しています。
