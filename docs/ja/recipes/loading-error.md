# Loading And Error

## 目的

非同期読み込みの loading、empty、error、success を screen state と action case で整理します。

## 完成イメージ

画面表示時に request を開始し、読み込み中は loading state、データがなければ empty state、失敗したら error state、成功したら loaded state を表示します。

## 最小 snippet

```markdown
## States

### loading

### loaded

### empty

### error

## Actions

### A-LoadItems Load items

- Triggered
  - screen.load
- Process
  - HttpRequest
    - GET /items
- Cases
  - success:
    - state: loaded
  - empty:
    - state: empty
  - failure:
    - state: error
```

## 関連 example

- [Async Fetching](../../../examples/showcase/async-loading.html)
- [Display Effects](../../../examples/showcase/display-effects.html)

## 関連 reference

- [States Guide](../guide/states.md)
- [Actions Guide](../guide/actions.md)
- [Reference](../reference/index.md)

## 確認方法

- request 前後の state が読める。
- empty と failure が別 case になっている。
- user に表示される message の置き場所が分かる。
