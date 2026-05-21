# 読み込みとエラー

## いつ使うか

画面表示時や検索条件変更時にデータを読み込み、読み込み中、取得済み、空、エラーをユーザーに見せ分ける画面で使います。非同期処理を文章で説明するだけではなく、画面状態とアクション分岐に分けて書くことで、プレビューとレビューでユーザーに見える結果を判断しやすくします。

## 完成イメージ

画面表示時にリクエストを開始します。待機中は読み込み中の状態を表示し、データがあれば取得済み、データがなければ空、リクエストが失敗したらエラーの状態を表示します。再試行ボタンがある場合は、同じ読み込みアクションを再実行できるようにします。

## 最小の書き方

以下は画面本文の例です。新規 `.vspec.md` では、先頭メタデータと `# SCR-* ...` の下に置きます。

```markdown markvspec-fragment
## States

- before-load+
- loading*
- loaded
- empty
- error

## Layout: mobile

### L-Content Content area

- stack
- gap: md

#### Items

- E-LoadingMessage
- E-EmptyMessage
- E-ErrorMessage
- E-RetryButton

## Elements

### E-LoadingMessage Text

- visible when: loading
- text: Loading items

### E-EmptyMessage Text

- visible when: empty
- text: No items yet

### E-ErrorMessage Text

- visible when: error
- text: Could not load items
- tone: danger

### E-RetryButton Button

- label: Retry
- action: A-LoadItems

## Events

- page.load: A-LoadItems

## Actions

### A-LoadItems Load items

- From
  - before-load
  - loaded
  - empty
  - error
- Process P1: Request items
  - request:
    - GET /items
  - case: sent
    - state: loading
  - case: send-failed
    - state: error

### A-HandleItemsResponse Handle items response

- From
  - loading
- Process P1: Apply items response
  - receive:
    - response: A-LoadItems.P1.response
  - case: success
    - response: 200 item list
    - state: loaded
  - case: empty
    - response: 200 empty list
    - state: empty
  - case: failure
    - response: network error or 5xx
    - state: error
```

## 書き方の要点

- `loading` はリクエスト前後の一時状態として明示する。
- empty は failure ではありません。データがない正常系として別 `case:` にします。
- エラーメッセージ、空表示メッセージ、再試行ボタンは要素として置き場所を分かるようにします。
- 再試行がある場合は、再試行ボタンの `action: A-*` で同じ読み込みアクションに接続します。
- 初期表示で読み込む場合は `## Events` に `page.load` を書きます。

## よくある落とし穴

- loading を省くと、リクエスト中の画面が未定義になります。
- empty と error を同じ状態にすると、ユーザーに出すメッセージと実装時の応答処理が曖昧になります。
- `success` だけを書いて失敗時を文章に逃がすと、レビューで失敗経路が抜けます。
- spinner のサイズやアニメーション時間は MarkVSpec の主目的ではありません。ユーザーに見える意味を `E-LoadingMessage` や `state: loading` で表します。
- 応答の詳細を API 仕様のように書き込みすぎず、画面の分岐に必要な条件へ絞ります。

## 関連サンプル

- [Async Fetching](../../../examples/showcase/async-loading.html): リクエスト、読み込み中、取得済み、空、エラーの状態を一通り確認する例。
- [Display Updates](../../../examples/showcase/display-effects.html): メッセージ、トースト、ダイアログなどのユーザーに見えるフィードバックを確認する例。

## 関連リファレンス

- [状態ガイド](../guide/states.md)
- [アクションガイド](../guide/actions.md)
- [要素リファレンス](../reference/elements.md)
- [アクションリファレンス](../reference/actions.md)
- [制限事項リファレンス](../reference/limitations.md)

## 確認方法

- リクエスト前後の状態が読める。
- loading、loaded、empty、error が別々に追える。
- empty と failure が別 case になっている。
- ユーザーに表示されるメッセージと再試行の置き場所が分かる。
- 初期表示、再試行、検索条件変更などのトリガーが必要な分だけ書かれている。
