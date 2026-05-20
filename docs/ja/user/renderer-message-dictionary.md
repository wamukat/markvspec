# MarkVSpec レンダラーメッセージ辞書

> 新しい仕様確認の入口は [Reference](../reference/index.md) です。
> この旧ページは互換用に残しています。

## この文書の位置づけ

この文書は、preview / HTML / PDF に表示される MarkVSpec 固定文言を差し替えるための
利用者・運用者向けガイドです。詳細な解決順と API 仕様は後半にまとめています。
画面内の業務ラベル管理とは別物です。

## 目的

MarkVSpec レンダラーメッセージ辞書は、MarkVSpec が生成する preview / HTML / PDF / design document の固定表示文言をプロジェクトごとに上書きするための辞書です。

これは業務画面内のラベルやメッセージ本文とは別物です。業務画面仕様では、翻訳管理対象の文言であることを `source: i18n` で示せますが、実装上の message key は MarkVSpec 文書には書きません。一方でレンダラーメッセージ辞書は、MarkVSpec 自体が出力する見出し、表名、列名、条件ラベル、空表示、印刷補足などを扱います。

## まず差し替える

対象ファイルと同じディレクトリ、または親ディレクトリに `markvspec.messages.ja.yml`
を置くと、preview / HTML / PDF の固定文言を差し替えられます。

```yaml
locale: ja
messages:
  formControls: 入力値
  conditionHiddenShort: 非表示
  noVisibleElements: 表示される要素はありません
  wireframe: ワイヤーフレーム
```

HTML / PDF export で辞書ファイルを明示する場合は、`--messages <path>` を指定します。
npm registry から `@markvspec/cli` を解決できる環境では、次のコマンドをそのまま使えます。

```bash
npx @markvspec/cli@latest export html examples/04-real-world-screens/login-basic.vspec.md --out dist --messages markvspec.messages.ja.yml
npx @markvspec/cli@latest export pdf examples/04-real-world-screens/login-basic.vspec.md --out dist --messages markvspec.messages.ja.yml
```

リポジトリ checkout から直接確認する場合は、先に `npm run build -w @markvspec/cli`
を実行し、`node packages/cli/dist/index.js export ...` を使います。

`--messages` を指定しない場合は、front matter `messages`、default file、built-in dictionary の順で解決します。不正な辞書ファイルや未知の key は warning diagnostic として CLI に表示し、定義済み key は fallback して export を継続します。

## 対象範囲

対象に含めるもの:

- design document の章見出し
- preview / generated document の表名、列名、固定ラベル
- `visible` / `hidden` / `disabled` などの条件表示ラベル
- `None.`、scenario sample の空行メッセージ、空の wireframe に表示する `No visible elements` などの MarkVSpec が生成する補助文言

対象外:

- 業務画面上のボタン名、項目名、メッセージ本文
- 業務画面用の i18n 辞書や実装上の message key
- DSL キーワードそのもの
- VS Code コマンド名、通知文、エラー文など editor UI 専用の文言

## ファイル形式

標準形式は YAML とし、JSON も同じ loader で許容します。

推奨ファイル名:

- `markvspec.messages.yml`
- `markvspec.messages.ja.yml`
- `markvspec.messages.en.yml`

構造:

```yaml
locale: ja
messages:
  formControls: 入力値
  conditionHiddenShort: 非表示
  noVisibleElements: 表示される要素はありません
  wireframe: ワイヤーフレーム
```

`locale` は任意です。省略時は対象ドキュメントの front matter `locale`、または既定 locale に従います。

## 詳細仕様

### キー一覧

key は flat camelCase で管理します。source of truth は core の built-in dictionary 型です。

- built-in dictionary はすべての supported key を `Record<RendererMessageKey, string>` として持ちます。
- 外部辞書の `messages` はその部分上書きです。
- renderer が built-in dictionary に存在しない key を要求する状態は実装バグとして扱い、外部辞書 warning では扱いません。

### 探索順

辞書の優先順位は次の通りです。

1. CLI 明示指定 `--messages <path>`
2. front matter `messages: <path>`
3. workspace / project default
   - 対象ファイルと同じディレクトリから親方向に `markvspec.messages.<locale>.yml` / `.yaml` / `.json`
   - 見つからない場合は `markvspec.messages.yml` / `.yaml` / `.json`
4. built-in dictionary

同じ key が複数の辞書で定義された場合、より優先度の高い辞書の値を使います。

default 探索の停止境界:

- VS Code preview は workspace root で停止します。
- CLI / export は project index を読み込んでいる場合は project file のディレクトリで停止します。
- CLI / export で単体 `.vspec.md` を入力している場合は、現在の作業ディレクトリで停止します。入力ファイルが現在の作業ディレクトリ外にある場合は、その入力ファイルの所在ディレクトリだけを確認します。

### パス解決

- CLI 明示指定は現在の作業ディレクトリ基準で解決します。
- front matter `messages` は、その MarkVSpec ファイルの所在ディレクトリ基準で解決します。
- workspace / project default の探索は、対象 MarkVSpec ファイルの所在ディレクトリから親方向へ進みます。
- VS Code preview では workspace 外の相対探索は行いません。明示指定または front matter で workspace 外を指す場合は読み込みを拒否し、warning diagnostic を返します。
- CLI / export では明示指定された絶対パスを許容します。front matter と default 探索は入力ファイル起点に限定します。

### fallback ルール

- 外部辞書で未定義の key は built-in dictionary に fallback します。
- 外部辞書に built-in dictionary へ存在しない key がある場合は unknown key として warning diagnostic を返し、その key は無視します。
- 値が文字列ではない key は invalid value として warning diagnostic を返し、その key は無視します。
- 外部辞書ファイルが存在しない、読めない、または YAML / JSON として不正な場合は warning diagnostic を返し、built-in dictionary だけで描画を継続します。

### locale

MarkVSpec の locale は表示文言の built-in dictionary 選択に使います。

- `locale: ja` は built-in ja を使います。
- `locale: en` または未指定は built-in en を使います。
- 外部辞書の `locale` が指定されている場合、対象ドキュメントの resolved locale と一致しないと warning diagnostic を返します。ただし辞書の値は明示上書きとして適用します。
- locale 別 default file は `markvspec.messages.<locale>.yml` を優先します。

### 共有 API

共通 loader は core 側に置きます。VS Code extension、document-renderer、exporter、CLI は同じ API を使います。

想定 API:

```ts
resolveRendererMessages({
  locale,
  sourcePath,
  explicitPath,
  frontMatterPath,
  readFile,
  fileExists,
  workspaceRoot
})
```

戻り値は次を含みます。

- resolved `messages`
- `locale`
- 使用した external file path
- diagnostics / warnings

### export 再現性

HTML export では、使用した external message file がある場合に metadata comment として出力します。

```html
<!-- MarkVSpec messages: /path/to/markvspec.messages.ja.yml -->
```

PDF export は HTML を経由するため、同じ metadata comment を保持します。CLI では diagnostics と同じ経路で warning を表示します。
