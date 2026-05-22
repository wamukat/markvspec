# Grammar Definition の保守

`packages/core/src/grammar-definition.ts` は、認識する section と structured item
key の source of truth です。parser behavior、diagnostics、生成 grammar docs、
生成 reference table は、この file と同期している必要があります。

## Grammar Definition を変更するとき

1. `packages/core/src/grammar-definition.ts` を更新する。
2. 変更した section / structured item を読む parser、validator、renderer、examples、
   tests を更新する。
3. `npm run docs:grammar` と `npm run docs:reference` を実行する。
4. root docs と docs-site docs の generated block を確認する。
5. release または handoff 前に、以下の check を実行する。

```bash
npm run check:generated-docs
npm test
npm run audit:examples
npm run check:docs-site
```

`docs:grammar` は grammar reference page 全体を再生成します。`docs:reference` は
`markvspec-generated:*:start` と `markvspec-generated:*:end` の間にある
reference table だけを再生成します。

生成 grammar page と生成 reference block は手編集しません。生成 table が間違って
いる場合は、grammar definition または generator script を修正してから再生成します。

## Release Gate

`npm run check:release` には次が含まれます。

- `npm run check:generated-docs`
- `npm test`
- `npm run audit:examples`
- `npm run check:docs-site`
- print regression と README release check

これにより、grammar docs、reference docs、parser contract tests、examples、
docs site を 1 つの release gate に固定します。
