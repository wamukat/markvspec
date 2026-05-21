---
title: "ビジネスルール"
---

`## Business Rules` は、ビジネスルールや画面固有の判断条件を書くセクションです。入力形式のバリデーション、ツールが出す診断、実装コードの if 文とは分けて扱います。

権限、アカウント状態、プラン制約、在庫、複数値を読んで決める業務判断など、プロダクト上の意味によって決まる条件を書く場所です。required、format、min、max、単純なフィールド比較はここに置きません。そうしたチェックは [バリデーション](/markvspec/ja/reference/validations/) に書きます。

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

| 項目 | 用途 |
| --- | --- |
| `when` | 条件。単一行または nested bullet で書く |
| `effect` | 条件が満たされたときの画面上の影響 |
| `message` | 利用者に見せる説明やエラー |
| `appliesTo` | 対象要素、レイアウト、アクション |
| `priority` | ルールが複数ある場合の優先度 |

## 小さな例

```markdown
### R-EmptyResult Empty search result

- when: search returns no items
- effect: show E-EmptyMessage
- message: No matching results.
```

![History And Errors のビジネスルールプレビュー](../../assets/vscode-previews/history-and-errors-vscode-preview.png)

## アクション結果ケース

アクション結果がビジネスルール違反の場合は、`business rule:` を
`case: business-rule-violation` の下に書きます。他の case 名で
`business rule:` を書くと、非 canonical な記述として診断されます。

```markdown
## Actions

### A-Submit Submit

- Process P1: Submit request
  - case: business-rule-violation
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - display:
      - target: E-EmailInput.error
      - message: R-EmailMustBeUnique.messages
```

## バリデーション診断との違い

バリデーション診断は、パーサーやバリデーターがソースの不足や矛盾を見つけて出すツール出力です。`## Business Rules` は、作成者が画面仕様として書く判断条件です。

## 注意点

- フィールドの必須、format、range は [バリデーション](/markvspec/ja/reference/validations/) に書きます。
- 単純な複数フィールド比較は [バリデーション](/markvspec/ja/reference/validations/) の `## Cross-field Validations` に書きます。
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
