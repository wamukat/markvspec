# MarkVSpec Agent Notes

## Project Summary

MarkVSpec is a Markdown-first screen specification format for AI-assisted product
work. A `.vspec.md` file should read like a human screen design document while
remaining structured enough for parsing, validation, live preview, and AI edits.

## Current Product Direction

- Screen-first: one `.vspec.md` file describes one screen.
- Componentization is an implementation concern, not part of the primary authoring model.
- Live Preview is essential because the DSL is readable Markdown, not a WireMD-style visual notation.
- The first implementation target is a VS Code extension with live preview.
- The implementation stack should start with TypeScript.

## Key Docs

- `README.md`: English project overview and quick start.
- `README.ja.md`: Japanese project overview and quick start.
- `docs/en/`: English documentation set.
- `docs/ja/`: Japanese documentation set with the same file structure as `docs/en/`.
- `docs/en/design-spec.md` / `docs/ja/design-spec.md`: product-level design specification.
- `docs/en/dsl.md` / `docs/ja/dsl.md`: MVP DSL rules.
- `docs/en/maintainers/markvspec-concept.md` / `docs/ja/maintainers/markvspec-concept.md`: concept and positioning.
- `examples/01-basics/login-basic.vspec.md`: current basic example screen.

## DSL Principles

- YAML Front Matter is only for document-level metadata.
- Markdown headings declare objects.
- Markdown bullets declare properties, rules, conditions, and transitions.
- Markdown tables are not canonical source.
- JSON is an internal/export representation, not an authoring format.

## ID Model

- `SCR-*`: screen
- `L-*`: layout group
- `E-*`: element
- `A-*`: action
- `R-*`: rule

## Authoring Model

Recognized sections:

- `## States`
- `## Layout`
- `## Elements`
- `## Actions`
- `## Rules`
- `## Notes`
- `## Open Questions`

Important syntax:

```markdown
### L-EmailField Email Field

- row
- gap: sm

#### Items

- "Email": E-EmailInput
```

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
```

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Effects
  - state: wait-auth
- Cases
  - success:
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
```

## Element Policy

- Use `Heading` plus `level: 1..6`, not `H1` through `H6` element types.
- Use `Paragraph` for prose.
- Use `Text` for short labels, values, and compact text.
- Do not add `size`, raw colors, CSS classes, width, height, or low-level styling.
- `variant` means priority: `primary`, `secondary`, `tertiary`.
- `tone` means semantic intent: `neutral`, `info`, `success`, `warning`, `danger`.

## Thymeleaf And Htmx

The user's product uses Thymeleaf and plans to support htmx partial updates.
MarkVSpec actions should model this with:

- `Process` / `HttpRequest` for method, path, and request parameters.
- `Cases` / `update` for result-specific partial updates.
- `target` and `content` under `update` for semantic update details.
- Use `mode: replace` for partial update replacement semantics.
  it is not an instruction to write raw `hx-*` attributes into the design doc.

Keep MarkVSpec semantic. Do not turn it into htmx attribute syntax.

## Implementation Target

Initial implementation should be:

- `packages/core`: parser, validator, render model.
- `packages/vscode-extension`: VS Code command, webview live preview, diagnostics.

MVP user story:

Open `examples/01-basics/login-basic.vspec.md` in VS Code and run `MarkVSpec: Open Preview`.
The webview should show a low-fidelity wireframe and update as the document changes.

## Agent Roles

ユーザーが「あなたは企画／受入のロールです」または「あなたは開発のロールです」と
指示した場合は、以下の該当ロールに従うこと。ロールが明示されていない場合は、
依頼内容から推定し、目的を満たせる範囲でより影響の小さいロールを選ぶ。

### 企画／受入ロール

このロールは、プロダクト企画、DSL/設計の議論、チケット作成、Kanbalone 整理、
受け入れレビュー、リリース前確認、フォローアップ整理で使う。

責務:

- プロダクト意図、DSL の意味、記法ルール、preview 挙動、受入条件を明確化する。
- Kanbalone チケットを作成、更新、分割、優先度調整、レーン移動する。
- `acceptance` の完了チケットを確認し、`done` に移動できるか判断する。
- UI、文書、marker/chip、表、印刷、PDF、i18n、example、preview 表示に関わる
  変更では、実際の preview/export/PDF 出力を確認する。テスト通過や実装者コメント
  だけでは受け入れ完了にしない。
- 完了チケット自体は受け入れ可能だが関連する残課題がある場合は、フォローアップ
  チケットを作成する。
- 元の受入条件を満たしていない、または実装が誤解を招く/壊れている場合だけ
  `todo` に戻す。残課題が別フォローアップとして扱える場合は、元チケットは
  受け入れ済みとし、新しい作業を別チケットで管理する。
- MarkVSpec の Kanbalone チケットのタイトル、本文、コメントは原則として日本語で
  書く。
- Kanbalone チケットを新規作成、または実装者に渡す前提で本文を大きく更新する
  場合は、登録前に独立した sub-agent review を受ける。ユーザーが毎回明示しなくても、
  チケット本文、実装指示、受入条件、関連チケット、blocker の妥当性をレビュー済みに
  してから Kanbalone に登録または更新する。
- sub-agent review が利用できない場合は、Kanbalone へ登録せず、レビュー未実施で
  登録できない旨と暫定案をユーザーに報告する。ただし、ユーザーが明示的に
  「レビューなしで登録してよい」と指示した場合だけ例外とする。

制約:

- このロールでは、ユーザーが明示的に実装を依頼しない限り、プロダクトコードを
  変更しない。
- 他のエージェントが作業している可能性がある場合、メイン workspace でテストを
  実行しない。検証には別の git worktree を使う。
- project-local の done review policy を満たしていないチケットを `done` に
  移動しない。
- `done` に移動するときも `isResolved: false` を維持する。チケットを resolve
  するのはユーザーの役割とする。

受け入れレビューのチェックリスト:

- チケット本文と実装コメントを読む。
- 独立した sub-agent review が記録されていることを確認する。
- コメント要約だけでなく、関連 diff または commit を確認する。
- 必要に応じて、隔離した worktree で検証する。
- visual/document 変更では、代表的な HTML preview/export と PDF/print 成果物を
  生成または確認する。
- 横断的な変更では、明らかに関連する example や表/セクション群も確認する。
- Kanbalone コメントには、実行したコマンドだけでなく、確認した実際の出力や
  セクションも記録する。

### 開発ロール

このロールは、ユーザーが実装、修正、リファクタリング、テスト、todo チケットの
完了を依頼したときに使う。

標準フロー:

1. Kanbalone の `todo` lane を確認し、優先順位、position、blocker を見て次に
   実行可能なチケットを選ぶ。blocker が未完了のチケットは拾わない。
2. 対象チケットの本文、コメント、remote issue、受入条件、関連資料を読み直す。
   remote body やコメントが更新されている可能性がある場合は、必ず最新内容を
   取得してから着手する。
3. 対象チケットを `doing` lane に移動し、作業開始コメントを残す。
4. 実装する。変更範囲は対象チケットに必要な parser、validator、renderer、
   VS Code extension、docs、examples、tests に絞る。
5. 自己チェックとして、受入条件に対応する検索、生成物確認、preview/export/PDF
   確認、関連 test、`npm run audit:examples`、`npm test` などを必要な粒度で実行する。
6. チケットに対応する commit を作る。外部 issue 連携があるチケットでは、commit
   message body に `Refs #<ticket>` などの参照を入れる。
7. 独立した sub-agent review を依頼する。blocking finding があれば修正、再検証、
   必要に応じて追加 commit を行い、blocking finding がなくなるまで review を
   繰り返す。
8. 対応内容、commit SHA、実行した検証、確認した生成物、sub-agent review 結果を
   Kanbalone コメントに記録する。
9. blocking finding がなく、自己チェックと受入条件確認が完了したら、チケットを
   `acceptance` lane に移動する。このとき `isResolved: false` は維持する。
10. `todo` lane に戻り、同じ基準で次の実行可能チケットを選ぶ。

責務:

- Kanbalone の `todo` チケットを blocker 順に選び、実装前に対象チケットを
  `doing` に移動する。
- 強く結合した変更としてまとめる合理性がある場合を除き、変更範囲を対象チケットに
  限定する。
- 既存のプロジェクトパターンに従って parser、validator、renderer、VS Code
  extension、docs、examples、tests を実装する。
- 関連する検証を実行し、まとまりのあるチケットまたはチケット群ごとに commit する。
- `acceptance` に移動する前に、独立した sub-agent review を依頼する。
- 完了前に blocking review finding を解消する。
- Kanbalone コメントに commit SHA、review 結果、修正内容、検証コマンドを明確に
  残す。

制約:

- 挙動が変わった場合、テストを省略したり型チェックだけで済ませたりしない。
- ユーザーが他のエージェントが作業中だと言っている場合、メイン workspace で
  テストを実行しない。別の git worktree を使う。
- 無関係なリファクタリングを実装チケットに混ぜない。
- 独立した sub-agent review なしに review 済み作業を `acceptance` に移動しない。
- ユーザーが明示的に resolve を依頼しない限り、`acceptance` に移動するときも
  `isResolved: false` を維持する。ユーザー確認後の `done` 移動でも同様に
  `isResolved: false` を維持する。

## Kanban

Use Kanbalone for project task tracking.

- Board URL: `http://localhost:3470/boards/7`
- Board ID: `7`
- Lanes: `backlog`, `todo`, `doing`, `acceptance`, `done`
- Use the `kanbalone-api` skill and HTTP API only.
- Installed skill path: `~/.codex/skills/kanbalone-api`
- Write MarkVSpec Kanbalone ticket titles, bodies, and comments in Japanese by
  default.
- Before creating a Kanbalone ticket or substantially updating a ticket body for
  implementer handoff, obtain an independent sub-agent review of the proposed
  ticket content. Do not rely on the user to repeat this requirement.

The requested GitHub skill source was:

`https://github.com/wamukat/kanbalone/tree/main/skills/kanbalone-api`

It was already installed in this environment.

## Completion Review Policy

Before moving any MarkVSpec Kanbalone ticket out of `doing` as implementation-complete,
use the project-local skill:

`skills/markvspec-done-review/SKILL.md`

Hard rule: every ticket must receive an independent sub-agent review before it is
moved to `acceptance` or `done`.

Codex is responsible for moving reviewed implementation work to the `acceptance`
lane, but must leave `isResolved: false`. The user will verify the result and
decide whether it can later move to `done` and whether the resolve flag should be
set.

If sub-agents are unavailable, leave the ticket in `doing` and add a Kanbalone
comment explaining that the ticket is blocked from completion until review is
available.

## GitHub Issue Triage

MarkVSpec の GitHub issue を棚卸しし、検討結果コメントを残して close する場合は、
project-local skill を使うこと:

`skills/markvspec-github-issue-triage/SKILL.md`

この作業では、GitHub issue に残っている古い設計案をそのまま正とせず、Kanbalone 側の
現在方針と照合する。別手段で対策することに決まった issue は、検討結果をコメントに
残してから `not planned` で close する。具体的な bug、release tracking、まだ
Kanbalone に移管されていない実装課題は close しない。
