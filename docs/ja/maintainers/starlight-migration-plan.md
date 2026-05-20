# Astro Starlight 移行設計

## 目的

MarkVSpec の公開ドキュメントサイトを、独自 generator 中心の構成から Astro Starlight 中心の構成へ移す。

現行の `scripts/build-github-pages.mjs` は、Markdown rendering、docs navigation、root page、examples showcase、assets copy、GitHub Pages 出力を1つの script で抱えている。今後ドキュメントを継続的に育てるには、汎用的な documentation site の責務は Starlight に寄せ、MarkVSpec 固有の処理だけを小さな script として残す。

この文書は実装方針を決めるための設計書であり、移行実装そのものは別 ticket に分割する。

## 採用方針

Astro Starlight を採用候補の第一順位とする。

理由:

- Markdown docs、sidebar、i18n、search、GitHub Pages deploy を標準機能に寄せられる。
- Starlight は sidebar を設定で管理でき、link / slug / group / autogenerate を組み合わせられる。
- Starlight は multilingual site を locales / defaultLocale で扱える。
- Starlight は Pagefind search を標準で使える。
- Astro は GitHub Pages で repository base path を `base` として設定できる。

参考:

- Astro GitHub Pages deploy: `https://docs.astro.build/en/guides/deploy/github/`
- Starlight configuration: `https://starlight.astro.build/reference/configuration/`
- Starlight i18n: `https://starlight.astro.build/guides/i18n/`
- Starlight sidebar: `https://starlight.astro.build/guides/sidebar/`
- Starlight site search: `https://starlight.astro.build/guides/site-search/`

## 現行責務の棚卸し

### Starlight へ移す

- Markdown docs の HTML rendering。
- docs sidebar と現在位置表示。
- 日英 docs の言語切替。
- docs page の table of contents。
- search UI と search index。
- docs assets の処理。
- favicon / logo / site title / social links などの site chrome。
- GitHub Pages 用の base path 設定。

### MarkVSpec 固有 script として残す

- `examples/**/*.vspec.md` から standalone preview HTML / PDF を生成する処理。
- `examples/catalog.yml` の validation。
- generated examples gallery の metadata 作成。
- example showcase の Source + Preview 比較ページ生成。
- README / docs から example showcase へ張る link の整合チェック。
- `audit:examples` による VS Code preview / parser 互換確認。
- release / print regression 系の MarkVSpec 固有チェック。

### 廃止する

- 独自 Markdown renderer と docs page wrapper。
- 独自 docs sidebar HTML 生成。
- 独自 docs index / section navigation 生成。
- root page 以外の汎用 site layout CSS。
- `check-pages-site` 内の、Starlight が構造として保証できる sidebar / current page / table rendering の細かい文字列検査。

## 推奨ディレクトリ構成

Starlight app は `docs-site/` に置く。

`site/` は現在 root landing page の source 置き場として使われているため、同じ名前を Starlight app に転用すると移行差分が読みにくくなる。`docs-site/` を新設し、移行完了後に必要なら `site/` の root page を Starlight 側へ移す。

推奨構成:

```text
docs-site/
  astro.config.mjs
  package.json
  src/
    content/
      docs/
        ja/
        en/
    assets/
    components/
    pages/
```

初期移行では、既存の `docs/ja` と `docs/en` を直接動かさず、Starlight content へ同期またはコピーする script を用意する。全面移行後に source of truth を `docs-site/src/content/docs` へ寄せるか判断する。

## URL 方針

結論: Starlight 標準 i18n path へ寄せる。ただし、既存公開 URL は redirect stub で維持する。

新 URL:

- `/markvspec/ja/start/`
- `/markvspec/en/start/`
- `/markvspec/ja/guide/scenarios/`
- `/markvspec/en/reference/cli/`

既存 URL:

- `/markvspec/docs/ja/start/`
- `/markvspec/docs/en/start/`
- `/markvspec/docs/ja/guide/scenarios.html`
- `/markvspec/docs/en/reference/cli.html`

既存 URL はすでに公開済みで、README、検索結果、外部リンクから到達する可能性がある。破壊的に捨てると利用者にとって不親切なので、移行時は旧 URL へ静的 redirect page を生成する。

redirect 方針:

- maintained URL は旧 path に HTML redirect stub を置く。
- redirect 先は Starlight 標準 path にする。
- canonical は新 URL に寄せる。
- README / site root / docs 内 link は新 URL に更新する。
- release note で URL 変更を告知する。
- 旧 URL redirect は少なくとも1 minor release 以上維持する。

GitHub Pages base path:

- repository Pages は `/markvspec/` 配下で公開する。
- Astro config では `site: "https://wamukat.github.io"` と `base: "/markvspec"` を設定する。
- 手書き absolute link は避け、Starlight / Astro の link helper または root-relative path policy に寄せる。

## i18n 方針

Starlight の locales を使う。

```js
starlight({
  title: "MarkVSpec",
  defaultLocale: "ja",
  locales: {
    ja: { label: "日本語", lang: "ja" },
    en: { label: "English", lang: "en" }
  }
})
```

日英は同じ情報設計を保つ。filename / slug は ja/en で揃え、本文の完全直訳までは要求しない。

root `/markvspec/` は landing page とし、ユーザーが日本語 / English / Examples を選べるようにする。docs 下層で日英リンクを重複配置しない。

## Sidebar / Search 方針

sidebar は手動設定を基本にする。

理由:

- 現行 docs は Start / Guide / Reference / Recipes / Examples / Concepts の学習順が重要。
- filename alphabetical では、読み手に必要な順番にならない。
- 日英で同じ navigation structure を保つ必要がある。

Starlight の `sidebar` 設定に Start / Guide / Reference / Recipes / Examples / Concepts を明示し、label translation を使う。

search は Starlight 標準の Pagefind を使う。初期移行では Algolia 等は採用しない。

検索対象:

- user docs は index する。
- maintainer docs は公開 docs に含める場合でも検索優先度を下げるか、必要に応じて `pagefind: false` を検討する。
- generated example preview は初期移行では Starlight search 対象外でもよい。必要なら後続 ticket で Pagefind index 統合を検討する。

## Examples 方針

examples showcase は Starlight へ直接移さない。MarkVSpec 固有の生成物として残す。

理由:

- `.vspec.md` source と generated preview を横並びで見せる UI は Starlight docs page ではなく product-specific showcase。
- preview HTML / PDF generation は MarkVSpec CLI / renderer の regression 対象でもある。
- examples catalog は docs navigation ではなく、DSL coverage と学習順の metadata を持つ。

移行後の配置:

- Starlight docs: `/markvspec/ja/examples/` / `/markvspec/en/examples/`
- generated examples index: `/markvspec/examples/`
- generated showcase: `/markvspec/examples/showcase/<name>.html`
- source preview output: `/markvspec/examples/<name>.html`

Starlight build 前に `examples/catalog.yml` を検証し、Starlight build 後または前処理で `_site/examples/` 相当の成果物を `dist/examples/` へコピーする。

## npm scripts 方針

移行期間:

- `npm run build:pages`: Starlight build と examples generation をまとめる互換 entrypoint として維持する。
- `npm run check:pages-site`: Starlight 移行後の URL / redirect / examples / essential content check に作り替える。
- `npm run audit:examples`: 維持する。
- `npm run check:release`: `build:pages` と `check:pages-site` を含めるかは release checklist で決める。

移行後の候補:

```json
{
  "build:docs": "npm --prefix docs-site run build",
  "build:examples-site": "node scripts/build-example-showcase.mjs",
  "build:pages": "npm run build:examples-site && npm run build:docs && node scripts/compose-pages-site.mjs",
  "check:pages-site": "node scripts/check-pages-site.mjs"
}
```

`build-github-pages.mjs` は段階的に分割し、最終的に削除する。

## GitHub Pages workflow 方針

`.github/workflows/pages.yml` は維持するが、build step を変更する。

現行:

- `npm ci`
- `npm run build -w @markvspec/cli`
- `npm run build:pages`
- `npm run check:pages-site`
- `_site` を upload

移行後:

- `npm ci`
- `npm run build -w @markvspec/cli`
- `npm run build:pages`
- `npm run check:pages-site`
- Starlight / compose 後の publish directory を upload

publish directory は当面 `_site` のまま維持する。workflow と local preview 手順の変更を小さくするため。

## 検証方針

移行 ticket では次を確認する。

- `npm run build:pages`
- `npm run check:pages-site`
- `npm run audit:examples`
- 代表 URL の browser snapshot
  - `/`
  - `/ja/start/`
  - `/en/start/`
  - `/ja/guide/scenarios/`
  - `/en/reference/cli/`
  - `/examples/`
  - `/examples/showcase/hello-screen.html`
  - 旧 URL redirect: `/docs/ja/start/`
- Pagefind search が build artifact に生成されていること。
- GitHub Pages base path `/markvspec/` で assets / links が壊れないこと。

## Follow-up tickets

### 1. Starlight app を `docs-site/` に scaffold する

目的:

- Starlight の最小 app を追加し、base path、i18n、sidebar、logo、favicon、Pagefind search の基本設定を入れる。

対象:

- `docs-site/`
- `package.json`
- `package-lock.json`

受入条件:

- `npm --prefix docs-site run build` が通る。
- `ja` / `en` の最小 page が Starlight layout で生成される。
- `base: "/markvspec"`、`locales`、manual sidebar、Pagefind が設定されている。
- 既存 `build-github-pages.mjs` は削除しない。

依存:

- なし。

### 2. 既存 docs を Starlight content へ移す

目的:

- `docs/ja` / `docs/en` の user docs を Starlight content structure へ移し、日英 slug と sidebar を揃える。

対象:

- `docs-site/src/content/docs/ja/`
- `docs-site/src/content/docs/en/`
- `docs-site/astro.config.mjs`
- docs assets

受入条件:

- Start / Guide / Reference / Recipes / Examples / Concepts が Starlight 上で読める。
- 日英で同じ page set が存在する。
- maintainer docs は user navigation に混ぜない。
- root から日本語 / English / Examples を選べる。

依存:

- ticket 1。

### 3. examples showcase 生成を Starlight build と分離する

目的:

- `build-github-pages.mjs` から examples showcase generation を切り出し、Starlight build と合成できるようにする。

対象:

- `scripts/build-github-pages.mjs`
- `scripts/build-example-showcase.mjs`
- `scripts/example-catalog.mjs`
- `examples/catalog.yml`

受入条件:

- `examples/` と `examples/showcase/` の既存公開 path が維持される。
- Source + Preview、Preview、PDF、GitHub source link が維持される。
- showcase の Related docs link が Starlight 新 URL に解決される。
- `examples/catalog.yml` の docs key validation が Starlight の Start / Guide / Reference / Recipes 構成と一致する。
- `examples/catalog.yml` validation が `build:pages` または `check:pages-site` で実行される。
- `npm run audit:examples` は維持される。

依存:

- ticket 1。

### 4. Pages build / workflow / checks を Starlight 構成へ切り替える

目的:

- `npm run build:pages`、`check:pages-site`、GitHub Pages workflow を Starlight + examples composition に切り替える。

対象:

- `package.json`
- `.github/workflows/pages.yml`
- `scripts/check-pages-site.mjs`
- 必要なら `scripts/compose-pages-site.mjs`

受入条件:

- `npm run build:pages` が Starlight docs と generated examples を1つの publish directory に出力する。
- `npm run check:pages-site` が新 URL、旧 URL redirect、examples、assets、search artifact を確認する。
- `npm run check:pages-site` が examples showcase から Starlight docs への Related docs link を確認する。
- workflow が publish directory を GitHub Pages artifact として upload する。
- local preview 手順が README または maintainer docs に残る。

依存:

- tickets 2, 3。

### 5. 旧 URL redirect と公開告知を追加する

目的:

- 既存 `/docs/ja/...` / `/docs/en/...` の外部 link を壊さず、新 Starlight URL へ移行する。

対象:

- redirect generation script
- `README.md`
- `README.ja.md`
- release checklist
- docs root links

受入条件:

- `check-pages-site` の maintained URL list に載っている旧 `/docs/ja/` / `/docs/en/` URL が新 URL へ redirect する。
- docs source から生成できる旧 `/docs/{ja,en}/**/*.html` は、可能な範囲で一括 redirect stub を生成する。
- canonical は新 URL を指す。
- README / root page / docs 内 link は新 URL を使う。
- release checklist に URL 変更の確認項目がある。

依存:

- ticket 4。

### 6. 独自 docs generator を削除する

目的:

- Starlight 移行後に不要になった docs generator 責務を削除し、保守対象を減らす。

対象:

- `scripts/build-github-pages.mjs`
- docs wrapper CSS / HTML generation code
- obsolete checks

受入条件:

- Starlight build と examples generation だけで公開 site が再現できる。
- `build-github-pages.mjs` に残っていた必要機能が別 script に移管済み。
- `npm run build:pages`、`npm run check:pages-site`、`npm run audit:examples` が通る。

依存:

- tickets 4, 5。
