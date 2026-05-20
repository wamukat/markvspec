# Guide

Guide は、OSS 利用者が `.vspec.md` を自分で書けるようになるための読み物です。MarkVSpec は text-first の UI specification なので、最初から完全な画面設計を書こうとせず、Markdown で「画面の状態」「配置」「要素」「操作」「検証」を少しずつ足していきます。

詳細な構文一覧は [Reference](../reference/index.md) に置き、Guide では画面仕様を書くための考え方、最小例、よくある書き方に絞ります。VS Code preview で確認しながら書き、必要になったら同じ source から HTML/PDF を出力する流れを前提にしています。

## 読む順番

1. [Markdown Model](markdown-model.md): `.vspec.md` の基本構造を理解します。metadata、見出し、箇条書きの役割を先に押さえます。
2. [Document Structure](document-structure.html): prose と構造化 DSL をどこに置くかを確認します。人が読む説明と parser が読む構造を混ぜすぎないための前提です。
3. [States](states.md): 画面状態を名前で分けます。preview で状態ごとの見え方を確認しやすくなります。
4. [Layout](layout.md): layout group と items で画面の骨格を作ります。CSS ではなく、UI の意味と順序を書きます。
5. [Elements](elements.md): Heading、Input、Button などの UI element を書きます。見た目ではなく、役割、label、action を優先します。
6. [Actions](actions.md): trigger、process、case で操作と結果をつなぎます。API、画面遷移、状態変化を review しやすくします。
7. [Validation](validation.md): 入力制約とエラー表示を source に残します。field rule と business rule を分けて扱います。
8. [Partial Updates](partial-updates.md): server-rendered partial update を意味として書きます。raw attribute ではなく、request と update の意図を書きます。

## 使い方

まずは [Markdown Model](markdown-model.md) の最小例を `.vspec.md` として作り、VS Code preview で表示できることを確認してください。次に、実際の画面に合わせて state、layout、element、action を追加します。迷ったら、先に自然な日本語でメモを書き、その下に構造化された MarkVSpec の section を足すと破綻しにくくなります。

MarkVSpec の source は plain text です。Git diff で review でき、AI に変更依頼を出しやすく、HTML/PDF export でも同じ source を使えます。Guide の各ページは、この text-first workflow に沿って小さく書き始めるための入口です。

## Examples

- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Profile Page With Template](../../../examples/showcase/profile-page-with-template.html)

## 次に読むもの

- [Reference](../reference/index.md)
