# MarkVSpec 設計方針

## この文書の位置づけ

この文書は、MarkVSpec の実装寄り設計を記録する内部設計文書です。利用者向けの記法確認は
[DSL リファレンス](../user/dsl.md)、サンプル確認は [サンプルギャラリー](../user/example-gallery.md) を参照してください。

MarkVSpec は、Markdown を画面設計書の canonical source として扱うためのフォーマットです。画面設計書として読めることを優先しつつ、パーサー、バリデーター、Live Preview が扱えるだけの構造を持たせます。

生成プレビューの情報設計は [preview-information-architecture.md](preview-information-architecture.md) に従います。

## プロダクト方針

MarkVSpec は画面ファーストですが、設計書の単位は `template` / `screen` / `partial` の 3 つに分けます。

1 つの `.vspec.md` ファイルは 1 つの設計対象を表します。再利用可能な実装コンポーネントは後から導出できますが、設計書の記述者に部品ファイルの合成を要求しません。

- `template`: 共通 shell や slot を持つ画面枠。単独でもプレビュー / 印刷できます。
- `screen`: URL で到達する初期画面。template の利用、初期 DOM、HTMX などによる partial 呼び出し、画面内状態遷移を記述します。
- `partial`: サーバから返される部分 HTML。単独でもプレビュー / 印刷でき、返却 HTML のレイアウト、要素、サーバ側処理、空 / エラー状態を記述します。

## 記述モデル

MarkVSpec は 3 つの層で記述します。

- YAML Front Matter: 文書全体のメタデータ。
- Markdown 見出し: 画面、レイアウト、要素、アクション、ルール。
- Markdown 箇条書き: プロパティ、条件、処理、遷移、補足。

Markdown テーブルは canonical source にしません。表は生成ビューとして使います。

## ID と marker

ID は、人間、レンダラー、テスト、実装タスクが同じ対象を参照するために使います。

- `SCR-*`: 画面。
- `TPL-*`: テンプレート。
- `PRT-*`: partial。
- `L-*`: レイアウトグループ。
- `E-*`: 画面要素。
- `A-*`: アクション。
- `R-*`: ルール。

ID の prefix より後ろには日本語を使えます。

```markdown
### 1:E-ページヘッダ Heading

- level: 1
- label: ログイン
```

`1` や `A1` のような marker はプレビュー表示用の短い番号です。参照には `E-ページヘッダ` のような ID を使います。現在の英語版サンプルでは ASCII marker を優先します。

## Front Matter

Front Matter は文書全体の構造メタデータを表します。

```markdown
---
id: SCR-MYPAGE-HOME
type: screen
title: マイページ ホーム
route: /mypage
owner: end-user
viewport: mobile
default-state: idle
status: draft
---
```

`default-state` は、単体ワイヤーフレームや partial 埋め込みで既定表示に使う状態です。
設計書の状態別プレビューは `States` の初期状態と記載順を優先して表示します。

## レイアウト

レイアウトは画面上の並び、まとまり、表示条件を表します。実装コンポーネント境界ではありません。
`## Layout: mobile` のようにビューポート単位で定義します。単独の
`## Layout` は使いません。

```markdown
## Layout: mobile

### L1:L-Page Page

- stack
- align: center
- gap: md

#### Items

- E-Heading
- L-EmailField
- E-SignInButton
```

設計書ビューでは、印刷や PDF 化を前提にすべてのビューポートを表示します。
各状態/ビューポートでは、レイアウト、要素、アクションを現在の仕様として一覧表示します。
同じ仕様が前の状態にも出ている行には repeated マーカーを付けることで、差分表ではなく
現在値の確認として読めるようにします。
export 用の印刷 CSS は全ビューポート/状態セクションを印刷対象にし、追加の
ビューポート/状態画面はページを分け、長い表セルを折り返し、State Flow は
Mermaid の SVG が利用できる場合はその SVG を印刷します。
同じ layout ID を複数ビューポートに書く場合、marker は同じ値に揃えます。

現行リリースのレイアウト種別は次の通りです。

- `stack`
- `row`
- `grid`
- `inline`

横寄せ、中央寄せ、余白は次のように表します。

```markdown
- align: start|center|end|stretch
- justify: start|center|end|between|around
- gap: none|xs|sm|md|lg|xl
- overlay: area|screen
```

`justify` は主軸、`align` は交差軸を表します。

`overlay: area` はフォームやパネルなど特定領域を覆う表示、`overlay: screen` は全画面を覆う表示です。対象領域の操作を止めたい場合は、そのレイアウトグループに `disabled when: wait-auth` のような条件を付けます。

## フィールドレイアウト

ラベルと入力欄を並べる場合は、`#### Items` の中で quoted field mapping を使います。

```markdown
### L2:L-EmailField メールアドレス欄

- row
- gap: sm

#### Items

- "Email": E-EmailInput
```

ラベルは必ず引用符で囲みます。`row` なら横並び、`stack` なら縦並び、`grid` なら複数行のフォームとして解釈できます。

## 要素

要素は、画面に表示されるもの、または操作や検証に関係するものです。

現行リリースの要素種別は次の通りです。

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Button`
- `Link`
- `Select`
- `Checkbox`
- `RadioGroup`
- `List`
- `Table`
- `Banner`
- `Dialog`
- `Badge`
- `Image`
- `Icon`
- `Spinner`
- `Divider`
- `FileUpload`
- `FileInput`
- `DatePicker`
- `DateInput`
- `TimeInput`
- `NumberInput`

`H1` から `H6` のような型は使わず、`Heading` と `level` で表します。

`Spinner` は `wait-auth` のような待機状態に紐づくローディング表示に使います。

```markdown
### 1:E-Heading Heading

- level: 1
- label: ログイン
```

必須入力の product validation は `## Validations` の `rules: required` に書きます。
Element heading は control type に集中させます。

```markdown
### 3:E-EmailInput Input

- value: ${model.email}
- initial value: "test@example.com"
```

`value` は画面データ `${model.email}` を表し、`initial value` は初期表示値 `test@example.com` を表します。
`Checkbox` でも同じ `initial value` property を初期チェック状態として使えます。

## variant と tone

MarkVSpec はデザインシステム DSL ではありません。サイズ、色、CSS class、幅、高さのような低レベルの見た目は原則として書きません。

意味が設計上重要な場合だけ、`variant` と `tone` を使います。

`variant` は優先度を表します。

- `primary`
- `secondary`
- `tertiary`

`tone` は意味的な意図を表します。

- `neutral`
- `info`
- `success`
- `warning`
- `danger`

```markdown
### E-DeleteButton Button

- label: Delete
- variant: primary
- tone: danger
```

## 状態とデータ

MarkVSpec では言葉を分けます。

- `state`: 画面内状態。例: `idle`, `wait-auth`, `auth-error`。
- `model`: 画面データ。例: `${model.email}`。

```markdown
## States

- idle*
- validation-error
  - クライアント側の入力検証でエラーを表示する状態。
- wait-auth
- auth-error
  - 認証失敗メッセージを表示する状態。
```

状態は画面の見え方や遷移を表す抽象的なものです。`email-required` と `password-required` のようにフィールドごとの状態を増やしすぎず、詳細はアクションの case や update に書きます。

## アクション

アクションは、ユーザー操作やシステムイベントをトリガーとして、処理、効果、結果を記述します。
Action レベルの guard / `When` は使わず、操作可否は要素の `disabled when`、入力検証は
`Validations` と process-scoped `receive: V-....result` に分離します。

```markdown
### A1:A-SubmitLogin ログイン送信

- Triggered
  - E-SignInButton.click
- From
  - idle
  - auth-error
- Process P1: Validate login form
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - Effects
      - state: validation-error
    - stop
  - case: valid
    - continue
- Process P2: Clear stale message
  - when: ${state.auth-error}
  - Effects
    - display:
      - target: L-MessageArea
      - element: E-EmptyMessage
- Process P3: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - case: sent
    - Effects
      - state: wait-auth
  - case: send-failed
    - Effects
      - state: auth-error
```

処理ステップには `when` や `skip when` を置けます。これにより、同じアクションでも状態や条件に応じた前処理を表現できます。

HTTP request のクリック Action では、送信できたかどうかを request step の
`cases:` に書きます。レスポンス完了後の画面遷移や partial update は、
`A-SubmitLogin.P3.response` を trigger にする別 Action に分けます。

```markdown
### A2:A-HandleLoginResponse ログイン応答処理

- Triggered
  - A-SubmitLogin.P3.response
- From
  - wait-auth
- Process P1: Receive auth response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthenticationErrorMessage
```

`navigate: SCR-*` は別画面への遷移です。状態遷移図では画面内状態のノードとして扱わず、終端への遷移として描画します。

## Thymeleaf と htmx

MarkVSpec は htmx 属性そのものを書く場所ではありません。部分更新は意味として表します。

- screen 側の `Process` / `HttpRequest`: HTTP method、path、パラメータ、送信結果。
- response handler Action の `cases:` / `update`: レスポンス結果ごとの部分更新。
- `target`: 更新対象の layout または element。
- `content`: 差し替える内容の意味。
- `mode`: 必要な場合の差し替え方法。
- `fragment`: 実装上 Thymeleaf fragment を指定したい場合の補足。

アクションはビューポート非依存です。そのため、アクションの update が layout ID
を target にする場合、その layout はすべてのビューポートに存在するべきです。
存在しないビューポートがある場合、ツールは warning を出します。element target
はこのビューポート網羅ルールの対象外です。

ログイン成功は画面遷移、失敗はメッセージ領域の部分更新、というように結果ごとに書き分けます。

partial が独立した設計書として必要な場合は、screen 側には「どの領域をどの
partial で置き換えるか」までを書きます。partial 側には返却 HTML の構造と、
サーバ側で必要なデータ取得、空表示、エラー表示を書きます。

```markdown
---
id: PRT-NOTICE-LIST-CARD
type: partial
title: お知らせカード
route: /mypage/partials/notices
---

# PRT-NOTICE-LIST-CARD お知らせカード

## States

- loading*
- loaded
- empty
- load-error

## Layout: mobile

### L-NoticeCard Notice Card

- stack

#### Items

- E-NoticeHeading
- E-NoticeList

## Actions

### A-BuildNoticeList Build notice list

- Triggered
  - partial.render
- From
  - loading
- Process P1: Find latest notices
  - server:
    - NoticeQueryService.findLatest()
  - case: success
    - Effects
      - model: ${model.notices.items} = result.items
      - model: ${model.notice} = ${model.notices.items} の現在行
      - state: loaded
  - case: empty
    - Effects
      - state: empty
  - case: failure
    - Effects
      - state: load-error
```

`partial.render` は partial 文書がサーバ側で描画される契機です。`ServerCall`
などの処理ステップ名はプロジェクトごとに選べます。`bridge` のような特定
アーキテクチャの語は MarkVSpec の予約語にせず、必要な場合だけ処理詳細として
書きます。

## 生成される設計書ビュー

MarkVSpec ツールは、Markdown の本文から次のようなビューを生成します。

- Screen: Front Matter と画面概要。
- Default: 初期状態のワイヤーフレーム。状態が未定義の場合は通常のワイヤーフレーム。
- Elements: 初期状態で表示される画面要素一覧。
- Actions: 初期状態に関係するアクション一覧。概要は著者が Action 見出し直下に書いた場合だけ表示する。
- State Views: 状態ごとのワイヤーフレーム、現在のレイアウト、現在の画面要素、現在のアクション。
- モデル更新処理: Action 内に散らばる `${model.value}` 形式の代入と結果ごとの side effect の横断一覧。
- Action Details: 著者が書いた概要、対象状態、処理、リクエスト、結果、更新、備考。
- State Flow: Mermaid の状態遷移図。
- Business Rules / 自由記述セクション。
- Diagnostics: パースエラーや参照エラー。

PDF 出力を考慮し、タブではなく上から下まで読める設計書ビューを基本にします。
全要素をまとめて表示するモードは設計書ビューには持たせません。権限や入力値など、画面状態ではない条件はワイヤーフレームから消さず、Layouts、入力フォーム仕様、表示内容仕様、Action Details 側で確認できるようにします。

## リリーススコープ

- 1 画面の `.vspec.md` をパースする。
- ID、参照、重複 marker、アクションを検証する。
- VS Code で Live Preview を表示する。
- Diagnostics を VS Code Problems とプレビュー下部に表示する。
- 状態遷移図と状態別ワイヤーフレームを表示する。
- `.vspec.md` の syntax highlight を提供する。
