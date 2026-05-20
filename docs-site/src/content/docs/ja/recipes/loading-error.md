---
title: "Loading And Error"
---

## いつ使うか

画面表示時や検索条件変更時に data を読み込み、loading、loaded、empty、error を user に見せ分ける画面で使います。非同期処理を prose で説明するだけではなく、screen state と action case に分けて書くことで、preview と review で user-visible result を判断しやすくします。

## 完成イメージ

画面表示時に request を開始する。待機中は loading state を表示し、data があれば loaded state、data がなければ empty state、request が失敗したら error state を表示します。Retry button がある場合は、同じ load action を再実行できるようにします。

## 最小の書き方

```markdown
## States

### loading

### loaded

### empty

### error

## Layout: mobile

### L-Content Content area

- stack
- gap: md

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

- Process P1: Request items
  - request:
    - GET /items
  - case: sent
    - state: loading

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

- `loading` は request 前後の一時状態として明示する。
- empty は failure ではありません。data がない正常系として別 `case:` にします。
- error message、empty message、retry button は element として置き場所を分かるようにします。
- retry がある場合は、Retry button の `action: A-*` で同じ load action に接続します。
- 初期表示で読み込む場合は `## Events` に `page.load` を書きます。

## よくある落とし穴

- loading を省くと、request 中の画面が未定義になります。
- empty と error を同じ state にすると、user に出す message と実装時の response handling が曖昧になります。
- `success` だけを書いて失敗時を prose に逃がすと、review で failure path が抜けます。
- spinner のサイズや animation duration は MarkVSpec の主目的ではありません。user に見える意味を `E-LoadingMessage` や `state: loading` で表します。
- response の詳細を API 仕様のように書き込みすぎず、画面の分岐に必要な条件へ絞ります。

## 関連 example

- [Async Fetching](/markvspec/examples/showcase/async-loading.html): request、loading、loaded、empty、error の state を一通り確認する例。
- [Display Updates](/markvspec/examples/showcase/display-effects.html): message、toast、dialog などの user-visible feedback を確認する例。

## 関連 reference

- [States Guide](/markvspec/ja/guide/states/)
- [Actions Guide](/markvspec/ja/guide/actions/)
- [Elements Reference](/markvspec/ja/reference/elements/)
- [Actions Reference](/markvspec/ja/reference/actions/)
- [Limitations Reference](/markvspec/ja/reference/limitations/)

## 確認方法

- request 前後の state が読める。
- loading、loaded、empty、error が別々に追える。
- empty と failure が別 case になっている。
- user に表示される message と retry の置き場所が分かる。
- 初期表示、retry、検索条件変更など trigger が必要な分だけ書かれている。
