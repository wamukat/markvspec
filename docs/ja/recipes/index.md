# Recipes

Recipes は、よくある UI 仕様パターンを目的から選ぶ入口です。

MarkVSpec は screen state、elements、actions、outcome を semantic に書くための形式です。実装 code や framework 固有 attribute を書く場所ではありません。迷ったときは、近い recipe を開き、最小形から自分の画面に置き換えてください。

## 目的別

| 目的 | Recipe | 主な概念 |
| --- | --- | --- |
| login、validation、authentication request を1画面に書く | [Login Form](login-form.md) | `Elements`, `Business Rules`, `Actions`, `case:` |
| initial loading、loading、empty、error、success を扱う | [Loading And Error](loading-error.md) | `States`, `page.load`, `case:` |
| server-rendered partial replacement を指定する | [Server Partial Update](server-partial-update.md) | `request`, `display`, `target`, `partial` |
| `.vspec.md` を HTML / PDF として共有する | [PDF Export](pdf-export.md) | VS Code export, CLI export |

## 読む順番

1. 画面の目的に近い recipe を選ぶ。
2. `Minimal Shape` をそのまま写さず、ID、label、path、state name を自分の画面の言葉に置き換える。
3. `Common Pitfalls` を確認し、implementation detail や CSS が spec に漏れていないか見る。
4. 関連 example を開き、preview の見え方を確認する。
5. 追加の detail が必要なときだけ guide / reference を引く。

## Example で見る

- [Hello Screen](../../../examples/showcase/hello-screen.html): 最小 document structure。
- [Login](../../../examples/showcase/login-basic.html): form、validation、authentication flow。
- [Async Fetching](../../../examples/showcase/async-loading.html): loading / empty / error state transitions。
- [Display Updates](../../../examples/showcase/display-effects.html): messages、toasts、dialogs、field feedback。
- [Profile Home](../../../examples/showcase/profile-page-with-template.html): template と partial refresh behavior。

## Reference で引く

- [Guide](../guide/index.md): authoring flow を学ぶ。
- [Actions Guide](../guide/actions.md): requests、cases、effects。
- [Partial Updates Guide](../guide/partial-updates.md): server-rendered partial update model。
- [CLI Reference](../reference/cli.md): CLI からの HTML / PDF export。
- [Reference](../reference/index.md): sections、IDs、elements、rules。

## Recipe の使い方

- screen specification の粒度で書く。implementation code、CSS classes、raw framework attributes は書かない。
- `SCR-*`、`L-*`、`E-*`、`A-*`、`R-*` IDs を使い、screen、layout、element、action、rule を追跡できるようにする。
- state を変える behavior は `Actions` と `case:` に置く。
- user-visible result は `state`、`update`、`display`、`navigate` で明示する。
- preview と export の source of truth は、1つの `.vspec.md` にする。
