# Reference Vocabulary Audit

`npm run audit:docs-reference-vocabulary` は、Reference ページを grammar definition
と照合します。

対象は `docs/{en,ja}/reference/**/*.md` です。生成物である
`docs-site/src/content/docs/` は読みません。

## Scope

初期対象は Reference ページに限定します。

監査するもの:

- Reference ページ内の MarkVSpec 風 fenced code block。
- その code block 内の section heading。
- structured item key を列挙する generated Reference table。
- parser の vocabulary diagnostic。通常 validate では `info` になり得る extension
  item や unknown structured item も、Reference では仕様語彙の逸脱として扱います。

任意の prose は走査しません。prose には例示、比較、自然言語が混ざるため、inline
code をすべて grammar claim とみなすとノイズになります。prose 領域を厳密に監査したい
場合は、まず fenced code block か generated Reference table に寄せます。

## Source Of Truth

監査は `packages/core/src/grammar-definition.ts` から生成された
`packages/core/dist/grammar-definition.js` を使います。表示用の BNF Markdown は parse
しません。

`npm run check:generated-docs` は generated Reference block が最新であることを確認します。
`audit:docs-reference-vocabulary` は、手書き Reference 例と generated table vocabulary の
追加 guard です。

## Release Check

`npm run check:release` には `npm run audit:docs-reference-vocabulary` を含めます。
