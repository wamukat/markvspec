---
title: "Guide"
---

MarkVSpec は、画面仕様を Markdown で書き、すぐ preview で確認するための形式です。

Guide では細かい構文を説明しません。まず「何を書くと、preview で何が見えるか」を掴んでください。詳しい項目名や制約は [Reference](/markvspec/ja/reference/) で確認します。

![VS Code で hello.vspec.md と MarkVSpec preview を並べて表示している画面](../../assets/start/vscode-preview-clean.png)

## まず覚えること

- `## States`: 画面の状態。まずは [States](/markvspec/ja/guide/states/)。
- `## Layout`: 画面の骨格。まずは [Layout](/markvspec/ja/guide/layout/)。
- `## Elements`: 表示される部品。まずは [Elements](/markvspec/ja/guide/elements/)。
- `## Actions`: 操作と結果。まずは [Actions](/markvspec/ja/guide/actions/)。
- `## Business Rules`: 画面固有の判断条件。まずは [Validation](/markvspec/ja/guide/validation/)。
- `## Preview Scenarios`: review したい表示 case。まずは [シナリオ](/markvspec/ja/guide/scenarios/)。

## 読み方

1. source を見る。
2. preview で結果を見る。
3. 足りない state、element、action を足す。
4. 詳細が必要になったら Reference を引く。

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
- [Scenario Preview Data](/markvspec/examples/showcase/scenario-samples.html): 同じ画面の preview case。
- [Profile Page With Template](/markvspec/examples/showcase/profile-page-with-template.html): partial update。

## 詳細を引く

- [Reference](/markvspec/ja/reference/): 正確な構文。
- [Recipes](/markvspec/ja/recipes/): よくある画面パターン。
