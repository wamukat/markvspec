# 1107 Business Rule violation 設計メモ

## 方針

- サーバ応答で判明する入力/業務エラーは、初期 Validation 構文には入れず Business Rule violation として扱う。
- `V-*` は client-side / screen-local な入力検証、`R-*` は業務制約、`ERR-*` は API エラーコードとの対応確認用の補助情報とする。
- Action case の canonical name は `business-rule-violation` とする。
- `business rule:` は `case:` 配下に置き、`receive:` / `result:` には混ぜない。

## DSL

```markdown
## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- description: Subscription email must not already be registered.
- messages:
  - This email address is already registered.
```

```markdown
- Process P2: Submit subscription
  - server:
    - SubscriptionService.create()
  - result:
    - subscription creation request
  - case: business-rule-violation
    - business rule: R-EmailMustBeUnique
    - error code: ERR-EMAIL-ALREADY-REGISTERED
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: R-EmailMustBeUnique.messages
    - stop
```

## Preview / Action Details

- `R-*.messages` は `V-*.messages` と同じ display message group として扱う。
- `R-*` heading marker を wireframe 上の message 表示箇所に出す。
- 同じ `R-*` が複数 target に表示される場合は、同じ marker を複数表示する。
- wireframe 下の説明は `R-*` 単位に集約し、`Displayed at` / `Triggered by` / `Kind` を表示する。
- Action Details は `business rule:` と `error code:` を case detail として表示し、`message: R-*.messages` には同じ marker を表示する。

## Diagnostics

- `business rule:` が存在しない `R-*` を参照した場合は error。
- `message: R-*.messages` の参照先に `messages:` / `message` がない場合は warning。
- `R-*` marker がない場合は warning。ただし preview は `R-*` ID を fallback marker として表示する。
