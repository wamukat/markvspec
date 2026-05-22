# Docs Code Audit

`npm run audit:docs-code` は、ドキュメント正本に載せた MarkVSpec 例示を検証します。
対象は `docs/`、`README.md`、`README.ja.md` です。`docs-site/src/content/docs/`
は生成物なので監査対象にしません。

## Fence marker

MarkVSpec source を含む Markdown fence には、次のいずれかを付けます。

- `markdown markvspec`: 完全な `.vspec.md` document。audit は
  `markvspec validate --fail-on-warnings` と同じ診断 gate で検証します。
- `markdown markvspec-fragment section=screen`: すでに 1 つ以上の `##`
  section を含む本文 fragment。audit は一時的な front matter と screen heading を
  補ってから検証します。front matter を含む snippet には使いません。その場合は
  `markdown markvspec` を使います。
- `markdown markvspec-fragment section=elements`: Elements section の fragment。
- `markdown markvspec-fragment section=business-rules`: Business Rules section の
  fragment。
- `markdown markvspec-skip reason=<specific-reason>`: 単体では検証しない文脈依存、
  negative、または non-canonical な例。

MarkVSpec に見える `markdown` fence を無印のまま残してはいけません。audit は
無印の MarkVSpec 風 fence を失敗させます。

## Skip reason

skip reason は具体名にします。`reason=context` は、何の文脈が欠けているかを
説明しないため禁止です。

現在の reason は次のとおりです。

- `requires-action-heading`
- `requires-action-definitions`
- `requires-actions-context`
- `requires-cross-section-context`
- `requires-element-definitions`
- `requires-elements-context`
- `requires-layout-context`
- `requires-partial-context`
- `requires-preview-context`
- `requires-preview-scenario-heading`
- `requires-preview-scenarios-context`
- `requires-rule-error-context`
- `requires-state-action-definitions`
- `requires-validation-context`
- `noncanonical-example`
- `project-file-example`
- `non-markvspec`

基本は validate 対象にします。周辺定義を足すと例の焦点がぼやける断片、意図的な
partial、non-canonical な例だけ skip にします。

## Release check

`npm run check:release` には `npm run audit:docs-code` を含めます。

audit は validated、fragment-validated、explicit-skip、non-MarkVSpec-skip の件数と
file:line を出します。warning / error diagnostic があれば失敗します。
