# ガイド

MarkVSpec は、画面仕様を Markdown で書き、すぐプレビューで確認するための形式です。

ガイドでは細かい構文を説明しません。まず「何を書くと、プレビューで何が見えるか」を掴んでください。詳しい項目名や制約は [リファレンス](../reference/index.md) で確認します。

![VS Code で hello.vspec.md と MarkVSpec プレビューを並べて表示している画面](../../assets/start/vscode-preview-clean.png)

## まず覚えること

- 文書全体の置き方: [文書構造](./document-structure.md)。
- `## States`: 画面の状態。まずは [状態](./states.md)。
- `## Layout`: 画面の骨格。まずは [レイアウト](./layout.md)。
- `## Elements`: 表示される部品。まずは [要素](./elements.md)。
- `## Actions`: 操作と結果。まずは [アクション](./actions.md)。
- `## Business Rules`: 画面固有の判断条件。まずは [バリデーション](./validation.md)。
- `## Preview Scenarios`: 確認したい表示パターン。まずは [シナリオ](./scenarios.md)。
- `## History Fields` / `## History`: 仕様書に残す更新履歴。まずは [更新履歴](./history.md)。

## 読み方

1. ソースを見る。
2. プレビューで結果を見る。
3. 足りない状態、要素、アクションを足す。
4. 詳細が必要になったらリファレンスを引く。

## 最小の流れ

```markdown markvspec-fragment section=screen
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

以下のリンクは showcase page を開きます。JavaScript が有効なブラウザでは、公開済みの
`.vspec.md` source から generated design document を dynamic に描画します。runtime
failure 時は事前生成済み example HTML artifact へ fallback せず、diagnostics と
source/raw link を表示します。

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小構成。
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html): フォーム送信とエラー表示。
- [Async Fetching](../../../examples/showcase/async-loading.html): 読み込み中 / 空表示 / エラー。
- [Scenario Preview Data](../../../examples/showcase/scenario-samples.html): 同じ画面の確認パターン。
- [Profile Page With Template](../../../examples/showcase/profile-page-with-template.html): 部分更新。
- [History And Errors](../../../examples/showcase/history-and-errors.html): Error Codes と更新履歴。

## 詳細を引く

- [リファレンス](../reference/index.md): 正確な構文。
- [レシピ](../recipes/index.md): よくある画面パターン。
