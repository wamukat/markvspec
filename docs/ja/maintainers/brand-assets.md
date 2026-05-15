# MarkVSpec ブランドアセット

## この文書の位置づけ

この文書は、MarkVSpec のアイコンとブランドアセットを扱う開発・リリース担当者向けの文書です。
通常の設計書作成手順ではありません。

## アイコン

<p>
  <img src="../../../assets/markvspec-icon.svg" alt="MarkVSpec" width="128">
</p>

一次ソースです。

- `assets/markvspec-icon.svg`
- `assets/markvspec-icon.png`

このアイコンは、MarkVSpec の 3 つの考え方を組み合わせています。

- Markdown 文書を canonical source として扱う。
- ワイヤーフレームブロックを生成される設計画面として扱う。
- ポインター形状で Live Preview とインタラクティブな確認を表す。

## 利用方針

デモページ、ドキュメント、生成するビットマップ画像では SVG を source of truth として使います。ラスター画像が必要な場所では、リポジトリにある PNG を使います。VS Code 拡張の marketplace 用画像やソーシャルプレビュー用 PNG を書き出す場合も、正方形の構図を維持します。

推奨する書き出しサイズです。

- `128x128` PNG: VS Code 拡張アイコン。
- `256x256` PNG: ドキュメントやデモサイトのカード。
- `512x512` PNG: 高解像度プレビュー。

VS Code 拡張で使う場合は、書き出した `128x128` PNG を `packages/vscode-extension/` 配下に置き、`packages/vscode-extension/package.json` の manifest `icon` フィールドから参照します。リポジトリルートのアセットは、自動的には拡張アイコンとしてパッケージされません。

Web サイトでは、アイコンがブランドリンクとして機能する場合は `MarkVSpec` のような意味のある alt text を付けます。同じラベルが隣に表示されている装飾用途の場合だけ、空の alt text を使います。

## メモ

現在のアセットはリリース用のシンプルなベクターアイコンです。ブランド作業では、色、タイポグラフィ、小さいサイズでの見え方を調整できます。
