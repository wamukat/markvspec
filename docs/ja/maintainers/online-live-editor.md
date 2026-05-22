# Online Live Editor 方針

このメモは、Online Live Editor を MarkVSpec の中でどう位置づけるかを定める。
対象は MVP から最初の公開判断までであり、VS Code extension や CLI export の代替を
すぐに作るものではない。

## 目的

Online Live Editor の主目的は、MarkVSpec の記法を試しながら preview と diagnostics を
即時確認できる入口を作ることである。初期段階では、設計書の本格運用環境ではなく、
学習、評価、example の編集実験、短い画面仕様の共有を支援する。

## 初期対象ユーザー

- docs-site の examples を見て MarkVSpec を試したい利用者
- VS Code extension を導入する前に記法と preview の感触を確認したい評価者
- 短い `.vspec.md` を貼り付けて診断結果や wireframe を確認したい開発者
- チーム内で MarkVSpec の書き方を説明したいメンバー

長期的な screen spec の作成・保守、複数ファイル project、template / partial を含む
本格編集は、当面 VS Code extension と CLI を主導線とする。

## MVP スコープ

MVP に含める。

- 単一 `.vspec.md` source の編集
- parse / validate / render の即時更新
- diagnostics の表示
- docs-site example から source を読み込む導線
- preview の表示
- source の reset
- source の copy または download
- runtime failure diagnostics と source/raw link の表示

MVP に含めない。

- 認証
- サーバ保存
- 複数人同時編集
- project index を起点にした複数ファイル編集
- template / partial の編集 UI
- GitHub 連携
- 共有 URL の恒久保存
- VS Code extension と同等のファイル監視、workspace boundary、外部 message file lookup

template / partial を使う例は、MVP では read-only preview の対象にできるが、編集対象は
まず単一 screen source に限定する。

## VS Code Extension との役割分担

VS Code extension は、実プロジェクト内の設計書を継続的に編集するための主導線である。
workspace のファイル参照、template / partial、project preview、diagnostics、export
を含め、ローカル開発環境に根ざした機能を持つ。

Online Live Editor は、ブラウザだけで試せる軽量入口である。workspace を持たないため、
filesystem lookup や project-wide validation を前提にしない。Online Live Editor に
入れる API は、browser-safe な parser / renderer / diagnostics に限定する。

## Docs-Site 導線

初期導線は docs-site 内の実験 route とする。read-only dynamic preview は examples の
表示改善として段階的に入れられる。最終的には showcase page の本番方針を
dynamic rendering first にする。一方で、editable editor は本番 examples 導線へ直結しない。
最初は明示的な experimental route、feature flag、または非公開 route に限定する。

docs-site の最終目標は、`/examples/showcase/<slug>.html` を dynamic rendering first
にすることである。この URL は public な example route として維持する。showcase は公開済みの
`.vspec.md` source asset を fetch し、同じ Pages build で公開された dependency source を解決し、
browser-safe document renderer で generated design document を描画する。source fetch、dependency fetch、
parse、validate、render、JavaScript 実行のいずれかに失敗した場合は、事前生成済み HTML fallback
artifact へ戻さず、diagnostics と source/raw link を page 内に表示する。

route の責務は次の通り固定する。

- `/examples/showcase/<slug>.html`: public example page であり、docs/catalog の通常導線。
  JavaScript 有効時は dynamic rendering を主 generated-document preview とする。source panel、
  related docs、adjacent examples、preview diagnostics、runtime failure status はこの page に集約する。
- `/examples/dynamic/<slug>.html`: 互換および runtime 検証 route。移行期間中は残してよいが、
  noindex または Pagefind / catalog の主導線から除外する。将来削除する場合は dead URL にせず、
  対応する showcase URL へ redirect する。

indexing も同じ責務境界に従う。検索対象として扱う public surface は showcase page である。
dynamic 互換 page は Pagefind の主要 indexing 対象にしない。docs/catalog から pre-generated preview へ
直接開く通常導線は増やさない。CLI/exported HTML は docs-site browsing fallback ではなく、
別の明示的な export workflow として扱う。

dynamic-first の代表検証 example は次の通り。

- `hello-screen`: 最小 source と baseline rendering。
- `login-basic`: form layout、validation、actions、複数 state。
- `history-and-errors`: structured sections、History Fields、History、Error Codes、
  密度の高い generated document section。
- `profile-page-with-template`: template composition、slot content、partial host metadata、
  複数ファイル dependency resolution。
- `responsive-profile`: viewport-specific layout と mobile / desktop 表示。

本番導線へ昇格する条件は次の通り。

- source fetch / parse / render 失敗時に runtime failure UI を表示できる
- template、partial、project 参照を使う example では dependency manifest または同等の
  published source map がある
- JavaScript 無効環境でも docs-site の主要情報が読める
- bundle size と初回表示時間が docs-site の閲覧体験を壊さない
- diagnostics と preview が VS Code extension と矛盾しない
- 実ブラウザで代表 example の render が検証されている

## 保存・共有モデル

MVP ではサーバ保存を行わない。候補は次の順で検討する。

1. Local only: ブラウザ内で編集し、copy / download で持ち帰る。
2. URL encoded snapshot: 短い source だけを URL fragment に載せる。
3. Gist / GitHub handoff: ユーザー操作で外部保存へ渡す。
4. Server persistence: 認証、公開範囲、削除、監査が必要になってから検討する。

初期実装では 1 を採用し、2 以降は別チケットに分ける。

## Editable PoC

editable Online Live Editor の PoC は `/examples/experimental/editor/<slug>.html` に置く。
これは direct access の実験 route であり、examples catalog、showcase、docs navigation から
は導線を張らない。

初期 editor は native `textarea` とする。CodeMirror などの editor library は、syntax
highlight、line gutter、diagnostic underline、large document performance が必要になった時点で
改めて比較する。PoC 段階では、bundle size、keyboard 操作、screen reader、mobile fallback の
確認を優先する。

保存・共有は、本格実装しない。PoC では copy と download だけを提供し、URL fragment snapshot、
Gist / GitHub handoff、server persistence は別チケットで判断する。

## Browser-Safe Core API

#1381 の PoC では、`packages/core/dist/browser.js` から browser bundle を作れることを
確認した。minified bundle は 412.9 KiB、gzip は 112.8 KiB、Node built-in input は 0 件だった。

Online Live Editor 向けの正式 API は `@markvspec/core/browser` とする。browser entry は
`parseMarkVSpec`、`validateMarkVSpec`、`evaluateMarkVSpecDiagnostics`、
`renderDiagnosticMessageForLocale`、`renderMarkVSpecHtml`、HTML fragment renderer、
`renderMarkVSpecHtmlWithInvalidation`、built-in locale message resolver を公開する。

root entry は Node-only renderer message file loading を含むため、browser-safe API として
扱わない。filesystem lookup を伴う renderer message override、project loader、workspace
参照は browser entry に入れず、browser caller は built-in locale messages または明示的に
渡した messages を使う。

`npm run check:core-browser` は `@markvspec/core/browser` を browser target で bundle し、
Node built-in input が混入していないことと gzip size budget を検証する。この check は
release check に含める。

また、docs-site で dynamic preview を行うには、`.vspec.md` source を公開 asset として
配布するか、同等の source endpoint を用意する必要がある。

## 後続チケットへの接続

- #1383: `@markvspec/core/browser` を正式な public subpath として定義し、browser-safe API
  の契約と Node-only API の境界を固定した。
- #1384: docs-site examples で read-only dynamic preview を追加し、source fetch と
  runtime failure handling を検証した。
- #1385: editable Online Live Editor の PoC を、experimental / feature flag / 非公開 route
  のいずれかで作った。
