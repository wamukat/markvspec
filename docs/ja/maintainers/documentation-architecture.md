# ドキュメント構成管理設計

## この文書の位置づけ

この文書は、MarkVSpec の README、公開サイト、利用者向けドキュメント、
サンプル、内部設計文書を有機的につなぐための情報設計を記録する内部設計文書です。

利用者向けの導入文ではありません。利用者の入口は repository root の
[README.ja.md](../../../README.ja.md)、公開サイト、生成済み examples とします。
この文書は、今後の documentation IA、移行 ticket、Pages 生成、example catalog
整備の判断基準として使います。

## 背景

現状の repository には、`README.md` / `README.ja.md`、`docs-site/`、`docs/`、
`examples/` が存在します。個別の内容はあるものの、読者が
「知る、試す、書く、調べる、応用する」という順序で移動できる構造になっていません。

主な問題は次の通りです。

- README、公開サイト、docs、examples がそれぞれ別の入口として振る舞っている。
- `docs/ja/README.md` が利用者向けと保守者向けを同じ強さで案内している。
- `docs/ja/user/dsl.md` が巨大な Reference になっており、初学者の導線に近すぎる。
- `examples/` は実用的な教材だが、Guide、Reference、Recipe との接続情報を持っていない。
- 生成済み example showcase は有用だが、次に読む文書や関連例へ移動しにくい。
- 公開サイトは外向け top page であり、学習ポータルとしての地図が弱い。

このため、コンテンツを増やす前に、各置き場の責務と相互リンクの設計を固定します。

## 目的

- repository 来訪者が README から 5 分以内に preview まで到達できる。
- 公開サイトから Guide、Examples、Reference、Recipes へ迷わず移動できる。
- examples を、単なるファイル一覧ではなく学習教材として扱う。
- Reference は正確性を優先し、初学者向け Guide から分離する。
- 保守者向け文書は残すが、利用者導線からは明確に隔離する。
- README、公開サイト、docs、examples が同じ情報構造を共有する。

## 読者モデル

| 読者 | 知りたいこと | 主な入口 |
| --- | --- | --- |
| 初回利用者 | MarkVSpec が何か、どう試すか | README、site、Getting Started |
| 仕様を書く人 | `.vspec.md` の基本、画面・状態・操作の書き方 | Guide、Examples |
| 実務で使う人 | よくある画面や操作をどう表現するか | Recipes、Examples |
| 正確な記法を引く人 | DSL の構文、制約、対応範囲 | Reference |
| AI / 実装担当 | 例、ID、Action、Validation の意味 | Examples、Reference |
| 保守者 | 設計判断、生成、回帰、リリース手順 | Maintainers |

## 置き場の責務

### README

`README.md` と `README.ja.md` は GitHub repository 来訪者の入口です。
README は全情報を説明する場所ではなく、最初の分岐器として扱います。

README に置くもの:

- MarkVSpec の一文説明。
- 主要機能の短い箇条書き。
- screenshot。
- 5 分で試す手順。
- 公開サイト、Examples、Guide、Reference、Marketplace、npm への入口。
- contributor 向けの最小導線。

README に置かないもの:

- 長い思想説明。
- 巨大な DSL 詳細。
- 保守者向け設計判断。
- 目的別リンク表の過剰な網羅。

### 公開サイト

`docs-site/` は Astro Starlight による公開ドキュメント site です。
外向け landing page だけではなく、公開された学習ポータルとして扱います。

site top に置くもの:

- MarkVSpec の短い説明。
- Start / Learn / Examples / Reference / Recipes の主要導線。
- 代表 screenshot。
- VS Code Marketplace、npm、GitHub へのリンク。

site top は、README と同じ IA を共有します。ただし、README より視覚的に案内し、
生成済み HTML docs と examples へ直接移動できることを優先します。

### 現在の source of truth

2026-05-21 時点では、公開サイトに出る user-facing docs の source of truth は
`docs-site/src/content/docs/` です。

根拠:

- `scripts/build-github-pages.mjs` は `docs-site` を build し、`docs-site/dist` を
  `_site` にコピーする。
- `scripts/check-pages-site.mjs` は `docs-site/src/content/docs/{ja,en}` の対応関係と
  `_site` artifact を確認する。
- `scripts/example-catalog.mjs` の related docs 解決は
  `docs-site/src/content/docs/<lang>/<group>/...` を参照する。
- `_site/docs` は生成しないことを `check-pages-site` が確認している。

したがって、利用者が読む公開サイトの内容を修正する場合は、
`docs-site/src/content/docs/` を第一に編集する。`docs/ja` / `docs/en` に同名の
user-facing Markdown が残っている場合は、repository 上で矛盾した仕様書が残らないよう
同じ commit で追従させる。

`docs/ja/maintainers` と `docs/en/maintainers` は保守者向け記録として `docs/` 配下に
残す。通常の利用者導線には出さない。

### docs

`docs/` は repository 内で読める Markdown mirror と保守者向け記録です。
利用者向け文書と保守者向け文書を分けます。

推奨構成:

```text
docs/ja/
  README.md
  start/
  guide/
  reference/
  recipes/
  examples/
  concepts/
  maintainers/
```

各ディレクトリの責務:

| ディレクトリ | 責務 |
| --- | --- |
| `start/` | 初回成功体験。install、first screen、preview、export。 |
| `guide/` | 順番に学ぶ説明。概念を小さな例で段階的に説明する。 |
| `reference/` | 正確な仕様。網羅性を優先し、初学者導線から分離する。 |
| `recipes/` | 目的別の自己完結ページ。login form、loading/error、partial update など。 |
| `examples/` | examples catalog の読み物版。目的別・学習順の入口。 |
| `concepts/` | text-first、AI-readable、Figma との違いなどの位置づけ。 |
| `maintainers/` | 内部設計、回帰確認、リリース、将来設計。 |

### examples

`examples/` は実行可能な教材です。
単なる source 置き場ではなく、Guide / Reference / Recipes と相互リンクする
学習コンテンツとして扱います。

各 example は次の情報を持つべきです。

- 何を学ぶ例か。
- 関連 Guide。
- 関連 Reference。
- 関連 Recipe。
- 次に見る example。
- 生成 HTML preview。
- showcase page。
- repository source。

この情報は、Front Matter に詰め込みすぎず、`examples/catalog.yml` のような
catalog file で管理することを第一候補とします。

## 情報構造

全体の導線は次の形に揃えます。

```text
README
  -> site
  -> Start
  -> Examples
  -> Guide
  -> Reference
  -> Contributor / Maintainers

site
  -> Start
  -> Learn by Example
  -> Guide
  -> Recipes
  -> Reference

Guide
  -> minimal example
  -> related showcase
  -> related reference
  -> next guide

Example showcase
  -> source
  -> preview
  -> teaches
  -> related guide
  -> related reference
  -> related recipe
  -> next examples

Reference
  -> exact syntax
  -> related examples
  -> related recipes
```

README と site は入口、docs は本文、examples は動く証拠として扱います。

## 推奨ページ構成

初期移行では、すべての既存文書を一度に書き換えません。
まず次のページを作り、そこへ導線を集約します。

```text
docs/ja/start/index.md
docs/ja/start/first-screen.md
docs/ja/start/preview.md
docs/ja/start/export.md

docs/ja/guide/index.md
docs/ja/guide/markdown-model.md
docs/ja/guide/states.md
docs/ja/guide/layout.md
docs/ja/guide/elements.md
docs/ja/guide/actions.md
docs/ja/guide/validation.md
docs/ja/guide/partial-updates.md

docs/ja/reference/index.md
docs/ja/reference/file-format.md
docs/ja/reference/sections.md
docs/ja/reference/elements.md
docs/ja/reference/actions.md
docs/ja/reference/validations.md
docs/ja/reference/ids.md
docs/ja/reference/cli.md
docs/ja/reference/limitations.md

docs/ja/recipes/index.md
docs/ja/recipes/login-form.md
docs/ja/recipes/loading-error.md
docs/ja/recipes/server-partial-update.md
docs/ja/recipes/pdf-export.md
```

日本語版と英語版は、最終的に同じファイル構造を維持します。移行中に日本語版を
先行して本文化する場合でも、同じ path の英語版には暫定 stub、案内ページ、または
追従 ticket への参照を置きます。構造差分を許すのは、同一 Kanbalone epic 内で
追従 ticket が明示され、Pages check の対象から一時除外する理由が記録されている
場合に限ります。

ja/en の本文品質は段階的に揃えてよいですが、directory / filename の構造差分は
短期間の移行状態として扱います。構造追加 ticket の受入条件には、対応する
`docs/en/` path の作成または追従 ticket の登録を含めます。

## 既存文書の移行方針

| 既存文書 | 移行先 | 方針 |
| --- | --- | --- |
| `docs/ja/user/dsl.md` | `reference/` | 章ごとに分割し、移行後の旧ページは削除する。 |
| `docs/ja/user/structured-section-reference.md` | `reference/sections.md` | Reference として維持する。Guide には短い説明だけ置く。 |
| `docs/ja/user/server-partials.md` | `guide/partial-updates.md` / `recipes/server-partial-update.md` | 概念説明と実務手順に分ける。 |
| `docs/ja/user/pdf-export.md` | `start/export.md` / `recipes/pdf-export.md` / `reference/cli.md` | 初回手順、実務共有、CLI 詳細を分ける。 |
| `docs/ja/user/example-gallery.md` | `examples/index.md` | catalog から生成または同期する。 |
| `docs/ja/user/ui-coverage.md` | `reference/elements.md` | Element Reference の一部として扱う。 |
| `docs/ja/user/limitations.md` | `reference/limitations.md` | Reference として維持する。 |
| `docs/ja/maintainers/*` | `maintainers/` | 原則維持。利用者ポータルからは別枠で案内する。 |

移行済みの旧ページは、互換導線として残さず削除します。利用者には Start / Guide / Reference / Recipes / Examples の現行導線だけを見せます。

## Example catalog

`examples/catalog.yml` は、examples と docs/site を接続する source of truth です。

想定フォーマット:

```yaml
examples:
  - path: examples/01-basics/hello-screen.vspec.md
    title: Hello Screen
    kind: screen
    stage: basics
    summary: 最小の画面仕様。
    showcase: true
    learningPath: true
    teaches:
      - Front Matter
      - States
      - Layout
      - Elements
      - Button action
    docs:
      guide:
        - markdown-model
        - actions
      reference:
        - file-format
        - actions
      recipes: []
    next:
      - examples/02-states/async-loading.vspec.md
```

`docs` 配下は、`docs/ja/...` のような言語固定 path ではなく、言語非依存の
document key を持ちます。Pages 生成時に `ja` / `en` の実 path へ解決します。
言語ごとに対応ページが未作成の場合は、その言語の stub または index page に
fallback し、欠落を check 結果に出します。

catalog の初期 schema は次を想定します。

| field | 必須 | 用途 |
| --- | --- | --- |
| `path` | 必須 | source `.vspec.md` の repository path。 |
| `title` | 必須 | index と showcase の表示名。 |
| `kind` | 必須 | `screen`、`template`、`partial` などの文書種別。 |
| `stage` | 必須 | 学習段階や grouping。 |
| `summary` | 必須 | 1 文の説明。 |
| `showcase` | 必須 | showcase page を出すかどうか。 |
| `learningPath` | 必須 | 学習順の主導線に出すかどうか。 |
| `teaches` | 必須 | この例で学ぶ項目。 |
| `docs.guide` | 任意 | 関連 Guide の document key。 |
| `docs.reference` | 任意 | 関連 Reference の document key。 |
| `docs.recipes` | 任意 | 関連 Recipe の document key。 |
| `next` | 任意 | 次に見る examples の path。 |

catalog は次の出力に使います。

- `examples/index.html`
- `examples/showcase/*.html`
- `docs/ja/examples/index.md` / `docs/en/examples/index.md`
- README の代表 example リンク
- Pages site の example 導線

最初の実装では、catalog と実ファイルの存在確認、document key の解決、
`kind` / `showcase` / `learningPath` の妥当性確認だけを行います。
将来、Front Matter の title/id と catalog の不一致を check することも検討します。

## リンク方針

- repository 内 Markdown では相対リンクを使う。
- GitHub Pages に公開する主要導線では `.html` リンクを使う。
- README からは、公開 site URL と repository 内 source のどちらへ飛ぶかを明確にする。
- example showcase には、preview、source、PDF、関連 docs を並べる。
- Reference ページは、該当構文を使う examples へ必ず戻れるようにする。
- Maintainers 文書は、利用者向けページから通常導線では露出しない。

## Pages 生成方針

`scripts/build-github-pages.mjs` は、site、docs、examples を同じ IA で出力します。

必要な拡張:

- `examples/catalog.yml` を読み込む。
- example index を stage / learning path 別に表示する。
- showcase page に teaches、related guide、related reference、related recipes、next examples を表示する。
- site top から Start / Guide / Recipes / Reference / Examples へリンクする。
- docs の Markdown 変換時に、README、site、examples、docs index の主要導線が切れていないか check する。
- 移行済みの `user/` artifact が再生成されていないことを check する。

`scripts/check-pages-site.mjs` は次を確認します。

- site top に主要導線がある。
- examples index に catalog metadata が表示される。
- showcase に source、preview、related docs、next examples がある。
- README の Pages URL が存在する artifact を指している。
- 主要な Start / Guide / Reference / Recipes ページが出力されている。

## 移行ステップ

1. この設計書を追加する。
2. `docs/ja/` と `docs/en/` に新 IA の index / stub を同時に作る。
3. `docs/ja/README.md` と `docs/en/README.md` を新 IA の入口に書き換える。
4. `examples/catalog.yml` を追加する。
5. Pages 生成で catalog を読み込み、example index / showcase に関連リンクを出す。
6. `docs/ja/start/` の最小ページを本文化し、`docs/en/start/` に対応 stub または本文を置く。
7. `docs/ja/guide/` の主要ページを本文化し、`docs/en/guide/` に対応 stub または本文を置く。
8. `docs/ja/recipes/` の主要ページを本文化し、`docs/en/recipes/` に対応 stub または本文を置く。
9. `docs/ja/reference/` と `docs/en/reference/` を作り、巨大な `dsl.md` を段階的に分割する。
10. README と site top を新 IA に合わせる。
11. 英語版 stub を本文へ追従させる。
12. 移行済みの旧 `docs/*/user/` ページを削除し、利用者導線を新体系へ一本化する。

## Ticket 分割方針

Kanbalone ticket は、利用者に見える導線単位で分けます。

- IA 設計と docs portal 更新。
- Example catalog の導入。
- Pages 生成の catalog 対応。
- Start pages 作成。
- Guide pages 作成。
- Recipes pages 作成。
- Reference 分割。
- README / site top の導線更新。
- 旧リンク互換と Pages check 強化。
- 英語版 stub 作成と本文追従。

各 ticket は、対象ファイル、受入条件、確認すべき Pages 出力、関連 examples を明示します。
UI、文書、example、preview 表示に関わる ticket では、生成済み HTML または Pages artifact
を確認対象に含めます。

各 ticket の検証には、原則として次を含めます。

- `npm run build:pages`
- `npm run check:pages-site`
- 変更した主要 Pages artifact の目視確認、または HTML 内容確認。
- VS Code live preview 導線を変更した場合は、Marketplace link、
  `MarkVSpec: Open Preview`、対象 example source へのリンク確認。

## 非目標

- すべての文書を一度に削除すること。
- 保守者向けの設計記録を利用者向け Guide に混ぜること。
- README を詳細 Reference にすること。
- examples の source に大量の navigation metadata を直接埋め込むこと。
- site top を marketing landing page として肥大化させること。

## 判断基準

新しい文書やリンクを追加するときは、次の質問で判断します。

1. 初回利用者、仕様を書く人、実務利用者、Reference 利用者、保守者の誰のためか。
2. その読者は README、site、Guide、Recipe、Reference、Example のどこから来るか。
3. 読み終えた後、次にどこへ進むべきか。
4. 同じ内容をより適切な場所に置けないか。
5. example と結びつけられるか。
6. Pages と repository の両方でリンクが成立するか。

この判断基準に合わない文書は、追加せず、既存文書の統合または catalog metadata で
表現できないかを先に検討します。
