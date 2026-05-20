# States

States は、同じ画面が取りうる表示状態を名前で分けるためのセクションです。loading、empty、error、success のような状態を source 上で明示します。

## 考え方

画面は 1 つでも、表示状態は複数あります。初期表示、読み込み中、入力エラー、送信中、保存済み、空結果などを state として分けると、仕様 review で「どの状態の話をしているのか」が明確になります。

State は実装の boolean 名ではなく、ユーザーから見た画面の状態名にします。たとえば `isLoading` ではなく `loading`、`hasError` ではなく `auth-error` のように書くと、layout、element、action の case から参照しやすくなります。

## 最小例

```markdown
## States

### idle

### loading

### error
```

この最小例では、通常状態、読み込み中、エラー状態だけを定義しています。まだ見た目の差分を書いていなくても、action の結果や preview の切り替え対象として state 名を先に置けます。

## よくある書き方

- state 名は画面内で意味が分かる短い名前にする。
- layout や element の条件は state 名を参照して説明する。
- 非同期処理では action の case と state を対応させる。
- `idle`、`loading`、`empty`、`error`、`success` のような一般名から始め、必要なときだけ `auth-error` や `permission-denied` のように具体化する。
- API request 中の状態は `submitting` や `refreshing` のように、ユーザーが待っている対象が分かる名前にする。
- state ごとの差分は、すべてを複製せず、差分が出る layout、element、message、action case に寄せる。

## 例: action と state をつなぐ

```markdown
## Actions

### A-LoadOrders Load orders

- Triggered
  - screen.load
- From
  - idle
- Process
  - HttpRequest
    - GET /orders
- Effects
  - state: loading
- Cases
  - success:
    - state: success
  - empty:
    - state: empty
  - failure:
    - state: error
```

`Effects` には処理開始時の状態変化を、`Cases` には結果ごとの状態変化を書きます。これにより、preview と review の両方で「どの操作がどの state を作るのか」を追いやすくなります。

## 次に読むもの

- [Layout](layout.md)
- [Actions](actions.md)
- [Async Fetching](../../../examples/showcase/async-loading.html)
- [Reference](../reference/index.md)
