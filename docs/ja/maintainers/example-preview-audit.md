# Example Preview Audit

## Docs-Site Showcase 方針

public な example route は `/examples/showcase/<slug>.html` とする。JavaScript 有効時は、
公開済み `.vspec.md` source と dependency manifest から browser runtime で generated design
document を描画する。docs-site build は showcase fallback として per-example の
`/examples/generated/<slug>.html` artifact を配布しない。runtime failure 時は、事前生成済み
HTML preview を埋め込まず、page 内に diagnostics と source/raw link を表示する。
`/examples/dynamic/<slug>.html` は互換および runtime 検証 route であり、catalog と Pagefind の
主導線から除外する。

docs-site examples または browser renderer を変更するチケットでは、次の代表 showcase page を
確認する。

- `hello-screen`
- `login-basic`
- `history-and-errors`
- `profile-page-with-template`
- `responsive-profile`

dynamic generated-document 関連の検証記録では、どの example が browser-side rendering で
表示されたか、どの runtime failure path を強制または観測したか、build 済み `_site` artifact で
source asset、dependency manifest、runtime bundle asset、no-generated-artifact check が通ったかを
記録する。

`npm run check:docs-site` は、全 catalog example について dynamic generated-document smoke check を
実行する。build 済み `_site` に per-example generated HTML preview artifact が存在しないことを確認したうえで、
各 example を browser-safe document renderer で描画し、generated-document section、wireframe、
marker ID、marker category、validation status、key rendered text、security boundary を確認する。
`source-kind-metadata` では State Views の sample selection も直接検査し、Preview Scenario sample values が
dynamic document に出ることを固定する。generated artifact parity allowlist は持たない。

dynamic-first showcase 関連チケットの完了前には、browser regression を実行する。

```bash
npm run check:showcase-browser
```

このコマンドは Pages site を build し、`_site` を local 配信し、Chrome/Chromium を
DevTools Protocol 経由で起動して代表 showcase page を desktop / mobile の両方で確認する。
自動検査対象は `hello-screen`、`login-basic`、`history-and-errors`、
`profile-page-with-template` とし、responsive 挙動に影響する変更では上記の broader な代表リストを
手動 spot check に使う。browser-rendered document DOM が空でないこと、source pane と preview pane が
重ならないこと、公開 source fetch を abort したときに runtime failure diagnostics と source/raw link が
表示されることを検査する。
この検査は local browser binary に依存するため、GitHub Pages deploy job には含めない。
Chrome または Chromium が標準の場所にない場合は `CHROME_BIN` を指定する。Pages workflow は
static artifact gate として、`_site` を build し、`npm run check:pages-site` で dynamic runtime asset、
public source asset、dependency manifest、no-generated-artifact check、security boundary、
dynamic generated-document smoke check を確認してから upload する。実ブラウザ DOM と runtime failure path を
確認する必要がある release または
browser-runtime acceptance では、`npm run check:showcase-browser` を実行する。

## Dynamic Preview Security Boundary

showcase runtime は author-controlled な `.vspec.md` source と dependency source を
fetch してよいが、`[data-dynamic-preview-output]` に挿入してよい HTML は
`renderBrowserDesignDocumentHtml()` が返したものだけとする。status、diagnostics、metrics、fetch error は
`textContent` または DOM node で書き込む。fetch した source text、dependency text、
diagnostic message、configuration value を直接 `innerHTML` に渡してはならない。

browser-safe renderer は、wireframe output に到達する author-controlled label、message、
Markdown prose、Mermaid source text、element value を escape する責務を持つ。Link 系 element の
URL は、render 前に `javascript:`、`vbscript:`、`data:` scheme を拒否する。
`npm run check:core-browser` にはこの境界用の dangerous-source fixture を含める。HTML block、
inline HTML、Markdown link、display/message/content text、link URL、dependency-compatible source が、
dynamic preview output 内で executable tag、event handler attribute、危険な `href`、iframe を生成しないことを確認する。

showcase fallback として same-origin generated preview iframe を再導入してはならない。CLI/export HTML は
docs-site showcase route とは別の明示的な export workflow として維持する。任意 plugin、外部 renderer asset、
user-provided runtime script を許可する前に、CSP、iframe sandbox、runtime asset policy を再検討する。

## VS Code Preview Audit

example、State Views、Action Details、display effects、template composition、
wireframe rendering を変更するチケットでは、完了前に shipped example preview audit を実行する。

```bash
npm run audit:examples
```

この audit は `examples/**/*.vspec.md` を VS Code preview document 経路で描画する。
template / partial 参照がある場合も、可能な範囲で実際の preview に近い合成結果を検査する。
検査対象は次の通り。

- 全 example が parser diagnostics や preview 例外なしに render できること
- wireframe に表示されている layout に `not placed in current layout` が付かないこと
- trigger element が見えていない element-trigger action が State View Actions に出ないこと
- Preview Scenario の display effect が wireframe または overlay に反映されること
- 日本語 Action Details に既知の英語生成文が残っていることを検出できること
- target なしの Toast display effect が modal overlay ではなく toast region に描画されること

既知不具合は、解除する Kanbalone ticket、理由、解除条件を明示した allowlist がある場合だけ許容する。
未知の finding は audit を失敗させ、出力には対象 file、state/scenario、ID、期待挙動を含める。
audit が新しい product bug を見つけた場合は、audit ticket に修正を含めず、日本語の Kanbalone ticket を作成する。

現在の既知 allowlist:

- `MarkVSpec#1072`: 日本語 Action Details に英語生成文が残る。
