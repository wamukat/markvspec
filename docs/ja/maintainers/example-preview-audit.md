# Example Preview Audit

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
