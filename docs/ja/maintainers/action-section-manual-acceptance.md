# Action Section 手動受入

Action section-based syntax の変更を VS Code extension で受け入れるときは、
この checklist を使います。この変更の受入対象は docs-site だけではありません。
live preview update、Problems、underline diagnostics、exported HTML を含む
authoring 体験を確認します。

## VS Code を起動する

実際の `.vspec.md` を開いた Extension Development Host を起動します。

```bash
npm run smoke:vscode-devhost -- examples/03-actions/form-submit-flow.vspec.md
```

Extension Development Host で Command Palette から
`MarkVSpec: Open Preview` を実行します。source editor と preview を横に並べて
確認します。

## 正常系の section syntax

`examples/03-actions/form-submit-flow.vspec.md` を使います。

1. `A-SubmitRequest` の `#### P1: Process Check validation` 直下に prose note を追加する。
2. file を保存する。auto update が有効なら更新を待つ。
3. preview の Action Details で、その note が Process card 内に表示されることを確認する。
4. note の文言を変更する。
5. preview を開き直さずに表示が更新されることを確認する。

期待結果:

- `#### From`、`#### P1: Process ...`、`#### Otherwise` では Problems が出ない。
- Process heading が process label として表示される。
- Process note が preview に表示され、編集後も更新される。

## exported HTML

同じ file を開いた状態で確認します。

1. `MarkVSpec: Export Static HTML` を実行する。
2. repository 外、または temporary directory に exported file を保存する。
3. exported HTML を browser で開く。
4. 編集した Process note が exported Action Details に表示されることを確認する。

期待結果:

- exported HTML に VS Code preview と同じ Process note が表示される。
- exported Action Details で From states、Process heading、request、case、
  state transition が失われていない。

## legacy syntax diagnostics

file の temporary copy で、いずれかの Action を次の旧構文に置き換えます。

```markdown
### A-LegacySubmit Legacy submit

- From
  - idle
- Process P1: Send request
  - request:
    - POST /legacy
```

期待結果:

- Problems に legacy list-based `From` と list-based `Process` syntax の warning が出る。
- editor 上で旧 `- From` と `- Process P1:` の source line に underline が出る。
- diagnostic message が `#### From` と `#### P1: Process ...` を使うよう案内する。

## unknown key diagnostics

valid な process subsection に key-like typo を追加します。

```markdown
#### P1: Process Send request
- requset:
  - POST /broken
```

期待結果:

- Problems に `requset:` の warning が出る。
- editor 上で typo line に underline が出る。
- 周囲の valid な `#### P1: Process ...` subsection は Process step として解釈される。

## duplicate / unsupported heading diagnostics

次の temporary action を使います。

```markdown
### A-BrokenSections Broken sections

#### From
- idle
#### From
- submitting
#### P1: Send request
- request:
  - POST /broken
```

期待結果:

- Problems に duplicate `#### From` の warning が出る。
- Problems に unsupported process heading `#### P1: Send request` の warning が出る。
- unsupported heading の message が `#### P1: Process <name>` を使うよう案内する。

## review record

Action section syntax を変更する ticket を受け入れるときは、実際に開いた VS Code
target file、編集した case、各確認結果を Kanbalone comment に残します。
docs-site output だけでは受け入れません。
