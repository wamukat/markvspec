---
title: "バリデーション"
---

Validations は入力値の制約とエラー表示を扱います。フィールドバリデーションは要素の近くに書き、画面や業務の判断条件は [ビジネスルール](/markvspec/ja/reference/rules/) に分けます。

## 境界

| 判定対象 | 書く場所 |
| --- | --- |
| 必須入力 | `Input` 要素 |
| 形式、長さ、範囲、パターン | `Input` 要素の `constraints` |
| 複数フィールドの比較 | `## Business Rules` または送信前アクション |
| サーバー応答で決まるフィールドエラー | `## Actions` の `case:` とフィールドエラーへの `display` |
| 権限、在庫、契約状態などの業務判断 | `## Business Rules` とサーバー応答の `case:` |

## 書ける構文

```markdown
## Elements

### E-EmailInput Input

- label: Email
- value: email
- required
- constraints
  - format: email
  - maxLength: 255
- error:
  - required: Email is required.
  - format: Enter a valid email address.
```

### 主な制約

| Constraint | 例 | 用途 |
| --- | --- | --- |
| `required` | `- required` | 空欄を許可しない |
| `format` | `- format: email` | email、url などの形式 |
| `minLength` | `- minLength: 8` | 最小文字数 |
| `maxLength` | `- maxLength: 255` | 最大文字数 |
| `min` | `- min: 1` | 数値や件数の下限 |
| `max` | `- max: 99` | 数値や件数の上限 |
| `pattern` | `- pattern: ^[A-Z0-9]+$` | domain 固有の入力形式 |

### エラーメッセージ

エラーメッセージは制約と対応する形で書けます。

```markdown
- error:
  - required: Password is required.
  - minLength: Use at least 8 characters.
```

## 小さな例

```markdown
### E-QuantityInput Input

- label: Quantity
- value: quantity
- required
- constraints
  - min: 1
  - max: 10
- error:
  - min: Quantity must be at least 1.
  - max: Quantity must be 10 or less.
```

![Single Field Validation のバリデーションプレビュー](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## 注意点

- バリデーションはフィールドの形式、必須、範囲などを扱います。
- `## Business Rules` はビジネスルールや画面固有条件を扱います。
- バリデーション診断はツール出力であり、ソースに書くバリデーション仕様とは別です。
- エラー表示用の要素がある場合は、`tone: danger` の `Paragraph` や `Text` として `## Elements` に書けます。
- サーバー応答によるエラー表示は `## Actions` の `case:` と `display` で書くと、リクエストとの関係が明確になります。
- ユーザーに見えるエラー文は `display` の `message` に書きます。既存要素や partial を表示する場合は `element` または `partial` を使います。

## 関連ページ

- [ガイド: バリデーション](/markvspec/ja/guide/validation/)
- [要素](/markvspec/ja/reference/elements/)
- [アクション](/markvspec/ja/reference/actions/)
- [ビジネスルール](/markvspec/ja/reference/rules/)
- [Single Field Validation](/markvspec/examples/showcase/single-field-validation.html)
- [Login](/markvspec/examples/showcase/login-basic.html)
