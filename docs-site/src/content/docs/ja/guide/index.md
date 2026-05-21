---
title: "ガイド"
---

MarkVSpec は、画面仕様を Markdown で書き、すぐプレビューで確認するための形式です。

ガイドでは細かい構文を説明しません。まず「何を書くと、プレビューで何が見えるか」を掴んでください。詳しい項目名や制約は [リファレンス](/markvspec/ja/reference/) で確認します。

![VS Code で hello.vspec.md と MarkVSpec preview を並べて表示している画面](../../assets/start/vscode-preview-clean.png)

## まず覚えること

- 文書全体の置き方: [文書構造](/markvspec/ja/guide/document-structure/)。
- `## States`: 画面の状態。まずは [状態](/markvspec/ja/guide/states/)。
- `## Layout`: 画面の骨格。まずは [レイアウト](/markvspec/ja/guide/layout/)。
- `## Elements`: 表示される部品。まずは [要素](/markvspec/ja/guide/elements/)。
- `## Actions`: 操作と結果。まずは [アクション](/markvspec/ja/guide/actions/)。
- `## Business Rules`: 画面固有の判断条件。まずは [バリデーション](/markvspec/ja/guide/validation/)。
- `## Preview Scenarios`: 確認したい表示パターン。まずは [シナリオ](/markvspec/ja/guide/scenarios/)。

## 読み方

1. ソースを見る。
2. プレビューで結果を見る。
3. 足りない状態、要素、アクションを足す。
4. 詳細が必要になったらリファレンスを引く。

## 最小の流れ

```markdown
## States

- idle*

## Elements

### E-Continue Button

- label: Continue
- action: A-Continue

## Actions

### A-Continue Continue

- Process P1: Navigate
  - state: idle
```

このくらいから始めます。最初から完全な仕様にしようとしないでください。

## 見て理解する

- [Hello Screen](/markvspec/examples/showcase/hello-screen.html): 最小構成。
- [Form Submit Flow](/markvspec/examples/showcase/form-submit-flow.html): form submit と error 表示。
- [Async Fetching](/markvspec/examples/showcase/async-loading.html): loading / empty / error。
- [Scenario Preview Data](/markvspec/examples/showcase/scenario-samples.html): 同じ画面の確認パターン。
- [Profile Page With Template](/markvspec/examples/showcase/profile-page-with-template.html): 部分更新。

## 詳細を引く

- [リファレンス](/markvspec/ja/reference/): 正確な構文。
- [レシピ](/markvspec/ja/recipes/): よくある画面パターン。
