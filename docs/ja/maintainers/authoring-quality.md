# MarkVSpec の書きやすさと品質

## この文書の位置づけ

この文書は、MarkVSpec の lint、formatter、validation gate の判断を確認するための
運用・開発者向け文書です。通常の記法確認は [DSL リファレンス](../user/dsl.md) を参照してください。

この文書は formatter と lint に関するリリース時点の判断を記録します。

## 推奨方針

MarkVSpec では、自動 formatter よりも先に structural lint diagnostics を優先します。

DSL はまだ変化しており、MarkVSpec ファイルはツール入力であると同時に、人間が読む
Markdown 設計書でもあります。formatter は空行、文章、未知の Markdown セクションを
書き換えてしまい、レビューしにくい文書にするリスクがあります。lint は作者のテキストを
変更せず、構造上の問題だけを示せるため、低リスクです。

## lint 範囲

lint は、パース、プレビュー、ナビゲーション、設計レビューに影響する問題に絞ります。

- 必須 Front Matter の不足。
- Front Matter と level-1 heading の不一致。
- 初期状態の不足や重複。
- ID の重複、marker の重複。
- `## Layout: <viewport>` ではなく単独の `## Layout` を使っている。
- 推奨順序から外れた semantic section。
- `#### Items` の外にある layout item 参照。
- 存在しない layout、element、action、rule、state への参照。
- 未対応の element type、layout kind、action event、element property。
- `Triggered` block がないなど、読み取れない Action 構造。
- Layout や partial update action で使っている partial ID が
  `references.partials` に定義されていない。
- 参照先 template/partial ファイルが存在しない、ID が一致しない、または document type が
  合っていない。
- 現行の `PartialRequest` と `mode: replace` 構造ではない partial update を使っている。

## Validation gate

core package は、CLI と editor integration で共有する validation gate として
`evaluateMarkVSpecDiagnostics()` を提供します。この gate は error / warning の件数を数え、
CI でそのまま使える `exitCode` を返します。

デフォルト動作:

- `error` diagnostic がある場合は exit code `1` で失敗。
- `warning` diagnostic は報告するが失敗扱いにしない。

strict 動作:

- `failOnWarnings` を指定すると warning も失敗扱いにする。
- release check や、実装前に設計書を warning-free にしたい repository で使う想定です。

## formatter の位置づけ

format-on-save や自動 document formatting は、このリリースでは保守的に扱います。

VS Code 拡張では、明示的に実行する `MarkVSpec: Format Structure` コマンドを提供します。
これは意図的に保守的な cleanup です。

- 認識済みの MarkVSpec block だけを整形する。
- 未知の Markdown セクションは byte-for-byte で保持する。
- 文章は書き換えない。
- list indentation は変更しない。
- 認識済みセクション内の空行と末尾空白だけを整える。

## リスク

- Markdown の表、文章、メモは parser input ではなく設計書本文でもある。
- 未知のセクションには判断やレビュー文脈が含まれるため、ツールが消してはいけない。
- DSL が変化している段階で自動整形を入れると、差分が大きくなりやすい。
- lint を厳しくしすぎると、試行錯誤しながら書く体験を悪くする。

## 含まれる authoring helper

VS Code 拡張は、現在の lint 範囲に対する authoring helper を含みます。

- よくある structural lint に対する quick fix。
- action process と case 構造について、ドキュメントに基づく lint rule。
