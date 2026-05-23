# 外部入力と設定

<!-- markvspec-coverage:reference.page.configuration -->

MarkVSpec が外部から受け取る入力は限られています。多くの挙動は `.vspec.md`
source 自体から決まります。設定は、文書メタデータ、project 構成、renderer label、
command option、export 環境のために使います。

このページでは、MarkVSpec 文書の読み取り、preview、validation、export に影響する
外部入力を整理します。

## 入力の一覧

| 入力 | 書く場所 | 使う機能 |
| --- | --- | --- |
| 画面文書メタデータ | `.vspec.md` の YAML Front Matter | parser、preview、export |
| project file | `.vspec.project.md` | project preview、project HTML/PDF export、`export document-list` |
| renderer messages | CLI `--messages`、Front Matter `messages`、近傍の `markvspec.messages.*` file | HTML/PDF export、VS Code preview label |
| CLI options | `--out`、`--messages`、`--fail-on-warnings` などの command line flag | CLI validation / export |
| VS Code commands | extension が提供する Command Palette command | VS Code preview、format、export、refresh |
| PDF browser | インストール済み Chrome-compatible browser | PDF export |

## Front Matter

<!-- markvspec-coverage:external-input.front-matter-fields -->

YAML Front Matter は `.vspec.md` file の document-level input です。代表的な
field は `id`、`type`、`title`、`route`、`locale` です。

element property、action behavior、layout item、rule、validation detail は
Markdown body に書きます。Front Matter は document-level metadata と file-level
reference のためだけに使います。

現在の Front Matter field と source の形は [ファイル形式](file-format.md) を参照してください。

## Project Files

<!-- markvspec-coverage:external-input.project-file-fields -->

`.vspec.project.md` は関連する screen file と template file を列挙します。project
preview は、project overview、notes、screen list、template list、transition、
diagnostics を表示するために使います。CLI の `export document-list` command も、
project file を単一入力として使います。

project file は任意 directory を自動 scan しません。project に含める file を明示的に
列挙します。

project file の例と export 挙動は [ファイル形式](file-format.md) と [CLI](cli.md) を参照してください。

## Renderer Message Files

<!-- markvspec-coverage:external-input.renderer-message-resolution -->

Renderer messages は、生成 preview / export の label を差し替えるための入力です。
localized label や product-specific label が必要な場合に使います。

message file の解決順は次の通りです。

1. CLI `--messages <path>`。
2. Front Matter `messages: ./file.yml`。
3. source 近傍の default file: `markvspec.messages.<locale>.yml`、
   `markvspec.messages.<locale>.yaml`、`markvspec.messages.<locale>.json`、
   `markvspec.messages.yml`、`markvspec.messages.yaml`、`markvspec.messages.json`。

renderer message file が存在しない、invalid、または許可された場所の外にある場合、
MarkVSpec は built-in label に fallback し、warning を出します。file に未対応 key
または string ではない message key が含まれる場合、その key だけを無視し、同じ file
内の valid な override は使い、warning を出します。

command 例と正確な export 挙動は [CLI](cli.md#renderer-messages) を参照してください。

## CLI Options

<!-- markvspec-coverage:external-input.cli-options -->

CLI の validation / export は source file、directory、glob を受け取ります。主な option は
次の通りです。

| Option | 意味 |
| --- | --- |
| `--out <dir>` | export command の出力 directory。 |
| `--messages <path>` | HTML/PDF export で明示的に使う renderer message file。 |
| `--fail-on-warnings` | `validate` で warning も失敗扱いにする。 |
| `--version` / `-v` | インストール済み CLI version を表示する。 |

command syntax と入力は [CLI](cli.md) を参照してください。

## VS Code Extension Settings

<!-- markvspec-coverage:external-input.vscode-commands -->
<!-- markvspec-coverage:external-input.vscode-settings -->

VS Code extension は、現時点では VS Code Settings に MarkVSpec 固有の user setting を
提供していません。ユーザーが与える主な入力は、開いている `.vspec.md` または
`.vspec.project.md`、参照される message file、参照される partial file、そして
`MarkVSpec: Open Preview`、`MarkVSpec: Format Structure`、
`MarkVSpec: Export Static HTML`、`MarkVSpec: Export PDF`、
`MarkVSpec: Refresh Preview` などの Command Palette command です。

現在の command list は [Preview](../start/preview.md) を参照してください。

## PDF Export Environment

PDF export には Chrome-compatible browser が必要です。CLI と extension は OS に応じて
Chrome、Edge、Brave、Chromium を探します。これは MarkVSpec source syntax ではなく、
実行環境への依存です。

PDF export が失敗する場合は、まず HTML export を行い、生成 HTML を確認してから
browser-specific な page break、font、print 挙動を調べます。

## 注意点

- MarkVSpec は JSON を authoring configuration format として要求しません。
- canonical input は source file です。外部入力で Markdown body の screen structure、
  action behavior、validation rule を置き換えないでください。
- implementation framework settings は、明示的に implementation mapping を説明する場合を
  除き、MarkVSpec source の外に置きます。

## 関連ページ

- [ファイル形式](file-format.md)
- [CLI](cli.md)
- [Preview](../start/preview.md)
- [制限事項](limitations.md)
