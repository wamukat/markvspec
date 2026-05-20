# Recipes

Recipes は、実務でよく出る UI 仕様の書き方を目的から選ぶ入口です。

MarkVSpec では、実装コードやフレームワーク固有属性ではなく、画面の状態、要素、操作、結果を semantic に書きます。迷ったときは、まず近い recipe を開き、最小の書き方から始めてください。

## 目的別に選ぶ

| やりたいこと | Recipe | 使う主な概念 |
| --- | --- | --- |
| ログイン、入力検証、認証 request を1画面にまとめる | [Login Form](login-form.md) | `Elements`, `Business Rules`, `Actions`, `Cases` |
| 初期読み込み、loading、empty、error、success を整理する | [Loading And Error](loading-error.md) | `States`, `screen.load`, `Cases` |
| server-rendered partial の差し替えを仕様化する | [Server Partial Update](server-partial-update.md) | `HttpRequest`, `update`, `mode: replace` |
| `.vspec.md` を HTML / PDF として共有する | [PDF Export](pdf-export.md) | VS Code export, CLI export |

## まず読む順番

1. 画面の目的に近い recipe を選ぶ。
2. `最小の書き方` をコピーせず、自分の画面の ID、label、path、state 名に置き換える。
3. `よくある落とし穴` を見て、実装都合の詳細や CSS を混ぜていないか確認する。
4. 関連 example で preview の出方を確認する。
5. 詳細が必要になったら guide / reference を読む。

## Example から探す

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小構成を確認する。
- [Login](../../../examples/showcase/login-basic.html): form、validation、authentication flow を確認する。
- [Async Fetching](../../../examples/showcase/async-loading.html): loading / empty / error の state 遷移を確認する。
- [Display Effects](../../../examples/showcase/display-effects.html): message、toast、dialog、field feedback の出し方を確認する。
- [Profile Home](../../../examples/showcase/profile-page-with-template.html): template と partial refresh の関係を確認する。

## Reference から探す

- [Guide](../guide/index.md): 書き方を順に学ぶ。
- [Actions Guide](../guide/actions.md): request、case、effect の書き方。
- [Partial Updates Guide](../guide/partial-updates.md): server-rendered partial update の考え方。
- [CLI Reference](../reference/cli.md): CLI で HTML / PDF を出力する場合。
- [Reference](../reference/index.md): section、ID、element、rule の詳細。

## Recipe を使うときの基準

- 画面仕様として読める粒度で書く。実装コード、CSS class、raw framework attribute は書かない。
- `SCR-*`, `L-*`, `E-*`, `A-*`, `R-*` の ID で、画面、layout、element、action、rule を追えるようにする。
- 状態が変わる操作は `Actions` と `Cases` に書く。
- user に表示される結果は、`state`、`update`、`display`、`navigate` のどれで表すかを明確にする。
- preview と export で共有できるように、1つの `.vspec.md` を source of truth にする。
