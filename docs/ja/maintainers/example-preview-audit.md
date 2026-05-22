# Example Preview Audit

## Docs-Site Showcase 方針

public な example route は `/examples/showcase/<slug>.html` とする。showcase page は
dynamic rendering first へ移行する。JavaScript 有効時は、公開済み `.vspec.md` source と
dependency manifest から browser runtime で preview を描画する。generated
`/examples/generated/<slug>.html` artifact は fallback、export、print、regression
comparison のために維持するが、通常閲覧 route とは扱わない。`/examples/dynamic/<slug>.html`
は互換および runtime 検証 route であり、catalog と Pagefind の主導線から除外する。

docs-site examples または browser renderer を変更するチケットでは、次の代表 showcase page を
確認する。

- `hello-screen`
- `login-basic`
- `history-and-errors`
- `profile-page-with-template`
- `responsive-profile`

dynamic-first 関連の検証記録では、どの example が dynamic rendering で表示されたか、
どの fallback path を強制または観測したか、build 済み `_site` artifact に source asset、
dependency manifest、generated fallback、runtime bundle asset が揃っていたかを記録する。

`npm run check:docs-site` は、全 catalog example について semantic parity check を実行する。
browser dynamic output と generated HTML artifact を比較する際、script / style / runtime wrapper は
正規化して比較対象外とし、dynamic wireframe、marker ID、marker category、generated key section、
validation status、key rendered text を確認する。完全な HTML 一致や pixel equality は要求しない。
既知差分は script の allowlist に理由と解除条件を添えて残す。現在の allowlist は
`source-kind-metadata` だけで、generated State Views は Preview Scenario sample values を描画する一方、
browser dynamic preview は baseline source values を描画するためである。

dynamic-first showcase 関連チケットの完了前には、browser regression を実行する。

```bash
npm run check:showcase-browser
```

このコマンドは Pages site を build し、`_site` を local 配信し、Chrome/Chromium を
DevTools Protocol 経由で起動して代表 showcase page を desktop / mobile の両方で確認する。
自動検査対象は `hello-screen`、`login-basic`、`history-and-errors`、
`profile-page-with-template` とし、responsive 挙動に影響する変更では上記の broader な代表リストを
手動 spot check に使う。browser-rendered preview DOM が空でないこと、source pane と preview pane が
重ならないこと、公開 source fetch を abort したときに generated fallback が表示されることを検査する。
この検査は local browser binary に依存するため、GitHub Pages deploy job には含めない。
Chrome または Chromium が標準の場所にない場合は `CHROME_BIN` を指定する。Pages workflow は
static artifact gate として、`_site` を build し、`npm run check:pages-site` で dynamic runtime asset、
public source asset、dependency manifest、generated fallback、security boundary、dynamic/generated parity を
確認してから upload する。実ブラウザ DOM と fallback path を確認する必要がある release または
browser-runtime acceptance では、`npm run check:showcase-browser` を実行する。

## Dynamic Preview Security Boundary

showcase runtime は author-controlled な `.vspec.md` source と dependency source を
fetch してよいが、`[data-dynamic-preview-output]` に挿入してよい HTML は
`renderMarkVSpecHtml()` が返したものだけとする。status、diagnostics、metrics、fetch error は
`textContent` または DOM node で書き込む。fetch した source text、dependency text、
diagnostic message、configuration value を直接 `innerHTML` に渡してはならない。

browser-safe renderer は、wireframe output に到達する author-controlled label、message、
Markdown prose、Mermaid source text、element value を escape する責務を持つ。Link 系 element の
URL は、render 前に `javascript:`、`vbscript:`、`data:` scheme を拒否する。
`npm run check:core-browser` にはこの境界用の dangerous-source fixture を含める。HTML block、
inline HTML、Markdown link、display/message/content text、link URL、dependency-compatible source が、
dynamic preview output 内で executable tag、event handler attribute、危険な `href`、iframe を生成しないことを確認する。

generated fallback artifact は、controlled exporter が生成する same-origin HTML として iframe に残す。
fallback / export / print / regression comparison のための artifact である。現時点では iframe sandbox は採用しない。
generated artifact が controlled Mermaid runtime で図を描画するためであり、代わりに exporter は Mermaid を
strict security で初期化し、dynamic path は escaped renderer output に依存する。任意 plugin、外部 renderer asset、
user-provided runtime script を許可する前に、CSP または iframe sandbox を再検討する。

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
