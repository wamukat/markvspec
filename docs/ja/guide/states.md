# States

States は、同じ画面が取りうる表示状態を名前で分けるためのセクションです。loading、empty、error、success のような状態を source 上で明示します。

## 最小例

```markdown
## States

### idle

### loading

### error
```

## 書き方

- state 名は画面内で意味が分かる短い名前にする。
- layout や element の条件は state 名を参照して説明する。
- 非同期処理では action の case と state を対応させる。

## 関連 example

- [Async Fetching](../../../examples/showcase/async-loading.html)

## 関連 reference

- [Reference](../reference/index.md)
