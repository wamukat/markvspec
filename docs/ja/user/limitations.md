# 既知の制限

このページは、初回利用やリリース判定に影響する現在の制限事項をまとめます。
実装メモや将来設計ではなく、利用者が公開品質を誤解しないための内容に絞ります。

## プレビューと出力

- PDF 出力は、インストール済みの Chrome、Edge、Brave、Chromium のいずれかを使います。
  出力品質は、そのブラウザの印刷エンジンに依存します。
- VS Code preview、standalone HTML、PDF export では、余白、改ページ、Mermaid 表示が
  少し異なる場合があります。
- 大きな wireframe、横幅の広い表、複雑な State Flow 図は PDF で読みづらくなる場合があります。
  固定ページより読みやすさを優先する場合は standalone HTML を使ってください。

## 対象範囲

- MarkVSpec は画面ファーストです。画面構造、状態、操作、検証、引き継ぎ用 ID を記述しますが、
  高忠実度のビジュアルデザインを作るツールではありません。
- project-wide な index や transition diagram はリリース対象ですが、初回利用の導線は
  単一の `.vspec.md` 画面ファイルから始めます。
- template と partial は基本機能に含みます。ただし、最初は standalone screen の例を理解してから
  導入する方が読みやすくなります。

## 記述支援

- formatter と quick fix は保守的に動作します。構造を整える補助であり、設計書全体を
  完成されたスタイルガイドへ自動変換するものではありません。
- 補足 prose 内の外部 Markdown 画像はレンダリング時にブロックされます。画像が必要な場合は、
  確認可能な product / screen asset をリポジトリ内に置いてください。
