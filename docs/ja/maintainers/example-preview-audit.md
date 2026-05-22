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
この検査は local browser binary に依存するため、現時点では default release gate には含めない。
Chrome または Chromium が標準の場所にない場合は `CHROME_BIN` を指定する。Pages deploy gate が
明示的に採用するまでは、browser runtime を触る showcase 作業で手動実行する。

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
