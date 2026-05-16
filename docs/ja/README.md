# MarkVSpec 日本語ドキュメント

<p>
  <img src="../../assets/markvspec-icon.svg" alt="MarkVSpec" width="80">
</p>

このディレクトリは、日本語で MarkVSpec を使うためのドキュメントポータルです。
リリース利用者が読む文書、出力・運用で使う文書、内部設計の記録を分けています。

MarkVSpec では、Markdown で画面仕様を書き、VS Code で状態別プレビューと生成された
設計書を確認し、HTML/PDF として共有できます。

このページでは日本語版だけを案内します。英語版ドキュメントは [docs/en/README.md](../en/README.md) にあります。

ディレクトリは、利用者向けの `user/`、保守者向けの `maintainers/` に分けています。

## 最短ルート

| やりたいこと | 読む順番 |
| --- | --- |
| 初めて画面仕様を書く | [DSL リファレンス](user/dsl.md) を読み、その後 [サンプルギャラリー](user/example-gallery.md) を見る |
| HTML/PDF で共有する | [PDF 出力と共有](user/pdf-export.md) を読む |

## 文書種別

| 種別 | 位置づけ |
| --- | --- |
| 利用者向け | 設計書を書く人、レビューする人、共有する人が読む文書。 |
| 出力・運用向け | HTML/PDF export、部分更新、表示文言の差し替えなど、機能を使う人が読む文書。 |
| 内部設計向け | MarkVSpec 自体を開発・保守する人向けの設計判断と将来設計。 |
| リリース作業向け | リリース前の確認や回帰チェックで使う文書。 |

## 用途別

### 設計書を書く

- [DSL リファレンス](user/dsl.md): ファイル構造、Front Matter、Layout、Elements、Actions などの基本記法。
- [UI 部品・画面パターン対応範囲](user/ui-coverage.md): 対応している UI 部品と画面パターン。

### サンプルを見る

- [サンプルギャラリー](user/example-gallery.md): `examples/` の画面、template、partial を目的別に探す入口。
- [サーバレンダリング部分更新](user/server-partials.md): partial、partial request、response modeling の考え方。

### 出力とプレビューを見る

- [PDF 出力と共有](user/pdf-export.md): HTML/PDF export の手順、制約、fallback。
- [既知の制限](user/limitations.md): 初回利用やリリース判定に影響する現在の制限事項。
- [レンダラーメッセージ辞書](user/renderer-message-dictionary.md): preview/export の表示文言を差し替える方法。

### 内部設計・リリース作業

- [MarkVSpec コンセプト](maintainers/markvspec-concept.md): プロダクトの位置づけと設計原則。内部設計寄りです。
- [MarkVSpec 設計方針](maintainers/design-spec.md): 実装寄りの設計仕様。利用者向けの入門ではありません。
- [書きやすさと品質](maintainers/authoring-quality.md): lint、formatter、validation gate の考え方。
- [HTML と Markdown 記述の比較](maintainers/html-vs-markdown.md): HTML を主記法にしない理由と使い分け。
- [プレビュー情報設計](maintainers/preview-information-architecture.md): preview の情報構造を決める内部設計。
- [View Context 設計メモ](maintainers/view-context.md): `States` からダイアログ表示、選択中タブなどの UI 表示文脈を分離する設計案。
- [プロジェクト索引設計](maintainers/project-index.md): 複数画面 project index の将来設計。
- [プロジェクト遷移図](maintainers/project-transition-diagrams.md): project transition diagram の将来設計。
- [印刷回帰チェック](maintainers/print-regression.md): 印刷・PDF 回帰確認の手順。
- [ブランドアセット](maintainers/brand-assets.md): アイコンとアセットの利用方針。
- [リリースチェックリスト](maintainers/release-checklist.md): リリース前の確認項目。

## 迷ったとき

- 設計書を書き始めるなら、[DSL リファレンス](user/dsl.md) と [サンプルギャラリー](user/example-gallery.md)。
- export や印刷で詰まったら、[PDF 出力と共有](user/pdf-export.md)。
- どの文書も内部実装向けに見える場合は、まずリポジトリルートの [README.ja.md](../../README.ja.md) に戻ってください。
