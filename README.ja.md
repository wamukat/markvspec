# MarkVSpec

<p>
  <img src="assets/markvspec-icon.svg" alt="MarkVSpec" width="96">
</p>

MarkVSpec は、Markdown で画面仕様を書き、VS Code でプレビューし、
HTML/PDF として共有できる画面仕様ツールです。

Figma のような高忠実度デザインツールではなく、実装に必要な
画面・状態・操作・検証ルールを、Git 管理できるテキストとして扱うために作られています。
`.vspec.md` は人が読める設計書でありながら、ツールが構造を解釈できる Markdown です。

Markdown のまま管理できるので、差分レビューしやすく、AI にも読ませやすく、
VS Code 上でプレビュー、検証、HTML/PDF 出力までつなげられます。

English documentation starts at [README.md](README.md).

## プレビュー

次の画像は、[Hello Screen](examples/01-basics/hello-screen.vspec.md) の Markdown
source と、そこから生成した static HTML preview のワイヤーフレームを並べたものです。
同じ `.vspec.md` から VS Code preview、HTML export、PDF export を確認できます。

![Hello Screen の Markdown source と MarkVSpec static HTML preview](docs/assets/readme-hello-screen-preview.png)

生成済み static HTML のサンプルは GitHub Pages で開けます:
[MarkVSpec Examples](https://wamukat.github.io/markvspec/)。

## 何が嬉しいか

- 画面仕様を Markdown として Git 管理できる。
- 画面、レイアウト、要素、アクションを安定 ID で参照できる。
- VS Code で書きながら、状態別プレビューと生成された設計書を確認できる。
- レビューコメント、実装タスク、HTML/PDF 出力で同じ ID を使える。
- 人間にも AI エージェントにも読みやすい、テキスト中心の仕様として扱える。

MarkVSpec には、VS Code 拡張と CLI があります。CLI コマンドは `markvspec` です。

## 向いている用途

MarkVSpec は、画面仕様を Markdown で保ちつつ、レビュー、実装、出力に同じ情報を渡したいチーム向けです。

- 画面、状態、操作、検証ルールを一つの設計書で管理したい。
- レビューコメントや実装タスクで、画面要素を安定 ID で参照したい。
- VS Code で書きながらプレビューし、HTML/PDF として共有したい。
- AI に仕様を読ませたり、差分を説明させたり、実装タスク化したい。

MarkVSpec は、ビジュアルデザインツールではありません。
ピクセル単位の UI デザインよりも、画面仕様・状態・操作・検証ルールを
テキストで正確に管理することを重視します。

次の用途には向きません。

- 高忠実度のビジュアルデザインを作る。
- Figma の代替としてピクセル単位の見た目を詰める。
- 実装コンポーネントの分割を設計書の主目的にする。

## まず試す

最短ルートは、VS Code Marketplace から MarkVSpec を入れて、`.vspec.md` を作り、
Preview を開くことです。CLI の詳細は後段にまとめています。

### 1. Marketplace から入れる

VS Code で
[Marketplace の MarkVSpec](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec)
をインストールします。

```sh
code --install-extension wamukat.markvspec
```

### 2. `login.vspec.md` を作る

次の最小例を貼り付けます。状態、画面要素、操作、検証を1つの Markdown に書けます。

```markdown
---
id: SCR-LOGIN
type: screen
title: ログイン画面
route: /login
---

# SCR-LOGIN ログイン画面

## States

- idle*
- wait-auth

## Layout: mobile

### L1:L-Page ページ

- stack
- align: center
- gap: md

#### Items

- E-PageTitle
- L-MessageArea
- E-EmailInput
- E-SignInButton

### L2:L-MessageArea メッセージ領域

- stack

## Elements

### 1:E-PageTitle Heading

- level: 1
- value: ログイン

### 2:E-EmailInput Input

- initial value: "test@example.com"
- input rule:
  - type: email

### 3:E-SignInButton Button

- label: ログイン
- variant: primary
- action: A-SubmitLogin

### 4:E-SendErrorBanner Banner

- value: ログインリクエストを送信できませんでした。
- tone: danger

## Form Groups

### F-LoginForm ログインフォーム

- fields:
  - E-EmailInput
- submit: A-SubmitLogin

## Actions

### A1:A-SubmitLogin ログイン送信

- From
  - idle
- Process P1: Validate login form
  - receive:
    - validation: V-EmailRequired.result
  - case: invalid
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: V-EmailRequired.messages
    - stop
  - case: valid
    - continue
- Process P2: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
  - case: sent
    - Effects
      - state: wait-auth
  - case: send-failed
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-SendErrorBanner

## Field Validations

### V1:V-EmailRequired メールアドレス必須

- target: E-EmailInput
- constraints:
  - required:
    - message: メールアドレスを入力してください。
```

より実務寄りの例は [Login Basic](examples/04-real-world-screens/login-basic.vspec.md) と
[サンプルギャラリー](docs/ja/user/example-gallery.md) にあります。

### 3. プレビューを開く

`.vspec.md` ファイルを開いた状態で、次のいずれかを実行します。

- コマンドパレットから `MarkVSpec: Open Preview`
- エディタ右上のプレビューアイコン
- Explorer の右クリックメニューから `Open Preview`

プレビューで画面構造と状態別の設計書ビューを確認できます。

## インストールと利用パス

### 前提

- VS Code 1.100.0 以降。
- CLI を使う場合、またはソースからビルドする場合は Node.js 22 以降。
- コマンドラインから拡張をインストールする場合は、VS Code の `code` コマンドを有効にしておく。

### 現在の配布状態

- VS Code 拡張: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec) から `wamukat.markvspec` をインストールします。
- CLI: npm から `npx` または `@markvspec/cli` のインストールで使います。

リリース担当者は tag 作成前に `npm run check:readme-release` を実行します。この
チェックは、README の package version や Marketplace link が release metadata と
ずれている場合に失敗します。

### 利用パスを選ぶ

| 目的 | 最初に読む場所 |
| --- | --- |
| 最短で1画面をプレビューする | [Marketplace から入れる](#1-marketplace-から入れる)、[`login.vspec.md` を作る](#2-loginvspecmd-を作る)、[プレビューを開く](#3-プレビューを開く) |
| source / preview / 生成設計書の関係を理解する | [HTML Authoring Guide](https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html) |
| Guide の後に実ファイルを試す | [サンプルギャラリー](docs/ja/user/example-gallery.md) |
| 書きながら記法を引く | [Reference documents](#reference-documents) |
| VS Code 拡張を入れる | [Marketplace から入れる](#1-marketplace-から入れる) |
| CLI で検証や出力を試す | [CLI](#cli) |
| サンプルから探す | [サンプル](#サンプル) |

初めて読む場合のおすすめ順です。

1. [HTML Authoring Guide](https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html): MarkVSpec source が preview と生成設計書にどうつながるかを HTML の視覚的説明で見る。
2. [サンプルギャラリー](docs/ja/user/example-gallery.md): 実際の `.vspec.md` を開いて preview する。
3. [Reference documents](#reference-documents): DSL、構造化セクション、partial、export の詳細を必要なときに引く。

## よく使う作業

CLI コマンドは、`npx @markvspec/cli@latest` で実行するか、npm から
`@markvspec/cli` をインストールして使います。

| やりたいこと | 操作 |
| --- | --- |
| 書きながら確認する | VS Code で `.vspec.md` を開き、`MarkVSpec: Open Preview` を実行する。 |
| 構文を確認する | `npx @markvspec/cli@latest validate <file>` を実行する。 |
| HTML を共有する | `MarkVSpec: Export Static HTML` または `npx @markvspec/cli@latest export html <file> --out <dir>` を使う。 |
| PDF を作る | `MarkVSpec: Export PDF` または `npx @markvspec/cli@latest export pdf <file> --out <dir>` を使う。 |

## CLI

CLI は Node.js 22 以降で動作します。

### npm から使う

手元の `login.vspec.md` に対して次のように実行できます。

```sh
npx @markvspec/cli@latest validate login.vspec.md
npx @markvspec/cli@latest export html login.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf login.vspec.md --out markvspec-pdf
```

ローカルに固定したい場合は、`@markvspec/cli` を dev dependency として追加し、
利用している package manager 経由で実行してください。

## ID と marker

`E-EmailInput` や `A-SubmitLogin` は、レビューや実装タスクから参照するための
安定 ID です。`1:`、`L1:`、`A1:` のような prefix は、プレビュー上で短く表示する
marker です。参照には marker ではなく ID を使います。

```markdown
### L1:L-Page ページ
### 1:E-PageTitle Heading
### A1:A-SubmitLogin ログイン送信
```

## サンプル

`examples/` は学習順に整理しています。現在のサンプル本文は英語ですが、
構文、レイアウト、状態、アクション、再利用の基本を確認できます。

生成済み HTML preview は
[GitHub Pages](https://wamukat.github.io/markvspec/) で確認できます。下の preview
リンクを開くと、生成済み HTML をブラウザで確認できます。

- [Hello Screen](https://wamukat.github.io/markvspec/examples/hello-screen.html): 最小の画面。([source](examples/01-basics/hello-screen.vspec.md))
- [Async Loading](https://wamukat.github.io/markvspec/examples/async-loading.html): request send と response states。([source](examples/02-states/async-loading.vspec.md))
- [Scenario Samples](https://wamukat.github.io/markvspec/examples/scenario-samples.html): baseline Element samples に対する Preview Scenario data variation。([source](examples/02-states/scenario-samples.vspec.md))
- [Responsive Profile](https://wamukat.github.io/markvspec/examples/responsive-profile.html): mobile / desktop layout。([source](examples/02-states/responsive-profile.vspec.md))
- [Event Triggers](https://wamukat.github.io/markvspec/examples/event-triggers.html): click 以外の element event と lifecycle trigger。([source](examples/03-actions/event-triggers.vspec.md))
- [Form Submit Flow](https://wamukat.github.io/markvspec/examples/form-submit-flow.html): validate、model update、server call、navigation。([source](examples/03-actions/form-submit-flow.vspec.md))
- [Single-field Validation](https://wamukat.github.io/markvspec/examples/single-field-validation.html): 単項目 validation contract。([source](examples/03-actions/single-field-validation.vspec.md))
- [Toast Feedback](https://wamukat.github.io/markvspec/examples/toast-feedback.html): non-modal toast feedback と target なしの toast display。([source](examples/03-actions/toast-feedback.vspec.md))
- [Parallel Initial Load](https://wamukat.github.io/markvspec/examples/parallel-initial-load.html): parallel server call と `Resolve`。([source](examples/03-actions/parallel-initial-load.vspec.md))
- [Notice Detail](https://wamukat.github.io/markvspec/examples/notice-detail.html): Display Content Spec の文言、データソース、format、value、params。([source](examples/04-real-world-screens/notice-detail.vspec.md))
- [Profile Edit Rich](https://wamukat.github.io/markvspec/examples/profile-edit-rich.html): 拡張 form、media、list、dialog 系 Element Type。([source](examples/04-real-world-screens/profile-edit-rich.vspec.md))
- [Search List](https://wamukat.github.io/markvspec/examples/search-list.html): search、filter、pagination、empty result、result replacement。([source](examples/04-real-world-screens/search-list.vspec.md))
- [Login Basic](https://wamukat.github.io/markvspec/examples/login-basic.html): form layout、validation feedback scenario、authentication progress。([source](examples/04-real-world-screens/login-basic.vspec.md))
- [Template Shell](https://wamukat.github.io/markvspec/examples/template-shell.html): template shell と slot の基本。([source](examples/05-reuse/template-shell.vspec.md))
- [Profile Page With Template](https://wamukat.github.io/markvspec/examples/profile-page-with-template.html): template 合成、route params、partial host metadata、`display.partial` refresh。([source](examples/05-reuse/profile-page-with-template.vspec.md))
- [Profile Summary Partial](https://wamukat.github.io/markvspec/examples/profile-summary.partial.html): partial route と partial-local state。([source](examples/05-reuse/profile-summary.partial.vspec.md))
- [History And Errors](https://wamukat.github.io/markvspec/examples/history-and-errors.html): Error Codes、History Fields、History。([source](examples/06-structured-sections/history-and-errors.vspec.md))

詳しくは [日本語 サンプルギャラリー](docs/ja/user/example-gallery.md) を参照してください。

## Reference Documents

HTML Authoring Guide や実ファイルを見た後、具体的に書くときに参照します。

| 知りたいこと | Reference |
| --- | --- |
| 正確な DSL 記法 | [DSL リファレンス](docs/ja/user/dsl.md) |
| section の責務と prose の扱い | [構造化セクションリファレンス](docs/ja/user/structured-section-reference.md) |
| server-rendered partial の modeling | [サーバレンダリング部分更新](docs/ja/user/server-partials.md) |
| HTML/PDF export の制約 | [PDF 出力と共有](docs/ja/user/pdf-export.md) |
| 現在の制限事項 | [既知の制限](docs/ja/user/limitations.md) |

## 困ったとき

| 症状 | 確認すること |
| --- | --- |
| `code` コマンドが見つからない | VS Code で `Shell Command: Install 'code' command in PATH` を実行する。 |
| VS Code 拡張のインストールに失敗する | VS Code 1.100.0 以降であることと、Marketplace extension ID `wamukat.markvspec` が利用できることを確認する。 |
| `npm install` や build が失敗する | Node.js 22 以降を使っているか確認する。 |
| `npx @markvspec/cli@latest` が見つからない | npm registry から `@markvspec/cli` を解決できるか確認する。 |
| PDF export が失敗する | [既知の制限](docs/ja/user/limitations.md) を確認し、環境上 PDF 出力が難しい場合は static HTML を出力する。 |
| プレビューが出ない | ファイル名が `.vspec.md` または `.vspec.project.md` であることを確認する。 |
| ID 参照の診断が出る | `Items`、`action`、`Events` などで marker ではなく `E-*` / `L-*` / `A-*` の ID を参照しているか確認する。 |

## 次に読むもの

| 目的 | ドキュメント |
| --- | --- |
| 日本語ドキュメント全体から探す | [日本語ドキュメント索引](docs/ja/README.md) |
| HTML authoring の導線から始める | [HTML Authoring Guide](https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html) |
| 実例から探す | [サンプルギャラリー](docs/ja/user/example-gallery.md) |
| 記法全体を確認する | [DSL リファレンス](docs/ja/user/dsl.md) |
| PDF 出力の制約を見る | [PDF 出力と共有](docs/ja/user/pdf-export.md) |
| 現在の制限事項を確認する | [既知の制限](docs/ja/user/limitations.md) |
| リリース内容を見る | [Changelog（英語）](CHANGELOG.md) |

## 開発者向け

```sh
npm run typecheck
npm test
npm run build
```

内部設計やリリース作業に関するドキュメントは `docs/ja/maintainers/` と
`docs/en/maintainers/` にあります。

MarkVSpec は画面ファーストです。部品化や実装コンポーネント分割は、設計書の主目的
ではなく実装側の関心として扱います。Markdown テーブルや巨大な YAML を主要な
記述面にはせず、人間が読み書きしやすい本文を canonical source とします。
