# シナリオ

Preview Scenarios は、1つの画面に複数のレビュー用プレビューケースを付けるために使います。
エラー、空表示、トースト、ダイアログ、直接リンクを見せるためだけに、画面仕様全体を複製しないでください。

## 使う場面

- バリデーションエラーを、画面全体を書き直さずに見せる。
- 同じ状態の空表示、エラー、読み込み中データを見せる。
- アクション結果で出るトースト、ダイアログ、メッセージを見せる。
- ルートパラメータやハッシュ付きの直接リンクを見せる。
- プレビューや HTML 出力でレビューしやすい名前付きケースを作る。

State は画面の表示モードに名前を付けるものです。Preview Scenarios は、その状態の中で
レビューしたい具体的な表示ケースに名前を付けるものです。

## 最小例

```markdown
## Preview Scenarios

### invalid-email

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

このシナリオは、`idle` 状態を表示し、送信失敗ケースを適用し、
メール入力にプレビューデータを入れ、`token=expired` があるルートとして表示する、という意味です。

## どこに何を書くか

| 目的 | 書くもの |
| --- | --- |
| 表示する状態 | `state:` |
| 表示したい Action の case 結果。バリデーション表示も Action の case として参照する | `cases:` |
| 要素ごとのプレビュー値 | `samples:` |
| ルートパラメータやハッシュ | `route:` |
| 表示文脈のサンプル | `view:` |
| このシナリオをその前に表示したい状態またはシナリオ | `before:` |

Preview Scenarios はプレビューデータです。新しい画面、状態、アクションを作るものではありません。
実際の画面挙動は `## States`、`## Elements`、`## Actions` に書き、シナリオはレビューしたい見え方に名前を付けるために使います。

## 状態そのもののサンプル

状態名と同じ名前のシナリオで `state:` を省略すると、その状態の通常プレビューにサンプル値を足せます。

```markdown
## States

- idle*
- loaded

## Preview Scenarios

### loaded

- samples:
  - E-Title: 読み込み済み
  - E-Users:
    - rows:
      - row:
        - name: Alice
```

この `loaded` は追加シナリオではありません。State Views の `loaded` に使う基準データです。
この書き方で使えるのは `samples:` と `route:` だけです。

同じ `loaded` 状態で空表示やエラー表示も見せたい場合は、別名のシナリオにして `state:` を書きます。

```markdown
### loaded-empty

- state: loaded
- samples:
  - E-Users:
    - rows: []
```

## サンプル値

通常の要素には、要素 ID と値を書きます。

```markdown
- samples:
  - E-EmailInput: invalid@example
```

`Table` や `List` のような繰り返し表示には `rows:` を使います。空表示を見せる場合は
`rows: []` と書きます。

```markdown
- samples:
  - E-Users:
    - rows:
      - row:
        - name: Alice
        - role: Admin
```

## ケースとルート

`cases:` は Action の処理結果を参照します。形式は `A-ActionId.P-marker.case-name` です。

```markdown
- cases:
  - A-SubmitLogin.P1.invalid
```

`route:` はブロックで書きます。`hash` 以外のキーは、画面の `route:` にある `:param` と
対応している必要があります。

```markdown
- route:
  - memberId: M-100
  - hash: details
```

## 次に読むもの

- [状態](./states.md)
- [アクション](./actions.md)
- [バリデーション](./validation.md)
- [Preview Scenarios リファレンス](../reference/sections.md)
- [Scenario Preview Data Example](../../../examples/showcase/scenario-samples.html)
