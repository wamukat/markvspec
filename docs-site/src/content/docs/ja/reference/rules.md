---
title: "ビジネスルール"
---

`## Business Rules` は、ビジネスルールや画面固有の判断条件を書くセクションです。入力形式のバリデーション、ツールが出す診断、実装コードの if 文とは分けて扱います。

権限、アカウント状態、プラン制約、在庫、日付の関係、複数フィールドの関係など、プロダクト上の意味によって決まる条件を書く場所です。required、format、min、max のような入力値そのものの形はここに置きません。

## 書ける構文

```markdown
## Business Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked.

### R-AccountRequiresMfa Account requires MFA

- when:
  - account.mfaRequired is true
  - device is not trusted
- effect: show E-MfaStep
- message: Additional verification is required.
```

### ルール見出し

Rule は `### R-* Name` の形で宣言します。

```markdown
### R-PasswordPolicy Password policy
```

### 主な項目

<!-- markvspec-generated:reference-rules:start -->
この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。

#### Business Rule property

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | 出力対象 | - | Business Rule property。 |
| `description` | `canonical` | 出力対象 | - | Business Rule property。 |
| `when` | `canonical` | 出力対象 | - | Business Rule property。 |
| `effect` | `canonical` | 出力対象 | - | Business Rule property。 |
| `message` | `canonical` | 出力対象 | - | Business Rule property。 |
| `messages` | `canonical` | 出力対象 | - | Business Rule property。 |
| `appliesTo` | `canonical` | 出力対象 | - | Business Rule property。 |
| `priority` | `canonical` | 出力対象 | - | Business Rule property。 |

#### Error Code property

| Item | 分類 | 出力 | 診断 | 説明 |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | 出力対象 | - | Error Code property。 |
| `business rule` | `canonical` | 出力対象 | - | Error Code property。 |
| `target` | `canonical` | 出力対象 | - | Error Code property。 |
| `message` | `canonical` | 出力対象 | - | Error Code property。 |
| `display` | `canonical` | 出力対象 | - | Error Code property。 |
| `tone` | `canonical` | 出力対象 | - | Error Code property。 |
| `description` | `canonical` | 出力対象 | - | Error Code property。 |
<!-- markvspec-generated:reference-rules:end -->

## 小さな例

```markdown
### R-EmptyResult Empty search result

- when: search returns no items
- effect: show E-EmptyMessage
- message: No matching results.
```

![History And Errors のビジネスルールプレビュー](../../assets/vscode-previews/history-and-errors-vscode-preview.png)

## バリデーション診断との違い

バリデーション診断は、パーサーやバリデーターがソースの不足や矛盾を見つけて出すツール出力です。`## Business Rules` は、作成者が画面仕様として書く判断条件です。

## 注意点

- フィールドの必須、format、range は [バリデーション](/markvspec/ja/reference/validations/) に書きます。
- サーバー応答によるエラーは [アクション](/markvspec/ja/reference/actions/) の response `case:` と `display` に書きます。
- アクションのリクエスト/応答分岐は [アクション](/markvspec/ja/reference/actions/) の `case:` に書きます。
- `## Business Rules` は人が読む仕様です。バリデーション診断の出力先ではありません。
- ルールから要素やアクションを参照するときは `E-*`、`A-*` などの安定した ID を使います。
- CSS や実装分岐の詳細ではなく、画面仕様として意味のある条件を書きます。

## 関連ページ

- [アクション](/markvspec/ja/reference/actions/)
- [バリデーション](/markvspec/ja/reference/validations/)
- [ID](/markvspec/ja/reference/ids/)
- [制限事項](/markvspec/ja/reference/limitations/)
- [Account Settings](/markvspec/examples/showcase/history-and-errors.html)
