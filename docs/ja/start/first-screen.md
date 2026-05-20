# First Screen

最初に作る file は `hello.vspec.md` です。

このファイルは、1つの画面を Markdown で表す最小構成です。repository の `examples/` は追加学習用であり、最初に試すためには不要です。

## 確認すること

- YAML Front Matter に画面 ID と title がある。
- `## States` に画面状態がある。
- `## Layout: mobile` に画面内の並びがある。
- `## Elements` に表示要素とボタンがある。
- `## Actions` にクリック時の動きがある。

## この file が表しているもの

`hello.vspec.md` は「1つの画面を、レビュー可能な Markdown として書く」ための最小単位です。
実装用 component の分割や CSS の指定ではなく、画面に必要な情報を次の順に置きます。

- `id` / `type` / `title` / `route`: 文書全体の metadata。
- `# SCR-*`: 画面の見出し。人が読む title と画面 ID を合わせて確認できます。
- `States`: preview や action が参照する画面状態。
- `Layout`: 画面のまとまりと、表示要素の並び。
- `Elements`: 見出し、説明文、ボタンなどの意味。
- `Actions`: ユーザー操作で起きる変化。

最初は「完璧な仕様」を書く必要はありません。preview が意味のある wireframe を出せる程度に、
画面状態、主な要素、主な操作をそろえることを目標にします。

## 作る

VS Code で任意の folder を開き、`hello.vspec.md` を作ります。[Start](index.md) の Hello Screen source を貼り付けて保存してください。

`.vspec.md` は Markdown として読めます。まず source を読み、次に preview で構造を確認します。

## 次に直すとしたら

Hello Screen を自分の画面に変える場合は、次の順に変えると崩れにくくなります。

1. Front Matter の `id`、`title`、`route` を実画面に合わせる。
2. `Elements` の label と text を実画面の文言に変える。
3. `Layout` の `Items` を、表示したい順番に並べ直す。
4. ボタンやリンクの `action` を、画面で起きる動きに合わせる。

入力欄、validation、server request が必要になったら、Hello Screen に足し続けるより
[Guide](../guide/index.md) と [Recipes](../recipes/index.md) の該当ページを見ながら増やしてください。

## 次

- [Preview](preview.md)
