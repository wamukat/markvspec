# MarkVSpec コンセプト

## この文書の位置づけ

この文書は、MarkVSpec 自体の設計思想とプロダクト判断を記録する内部設計寄りの文書です。
利用者が設計書を書くための手順は [DSL リファレンス](../reference/index.md) と
[サンプルギャラリー](../examples/index.md) を参照してください。

MarkVSpec は、プロダクト開発のための Markdown-first な画面仕様フォーマットです。source document はまず画面設計書として読めるべきであり、そのうえでワイヤーフレームのレンダリングや機械可読データの export に十分な構造を持ちます。

## 位置づけ

Wireframe Markdown 系のツールは、UI スケッチをテキストの近くに保てる点で便利です。MarkVSpec はそこから一段深く、Markdown ファイルを単なる視覚スケッチではなく、エンジニア、デザイナー、レビュー担当者が確認し変更できる canonical screen design document として扱います。

## 設計原則

MarkVSpec は screen-first です。

部品化は実装上の関心事です。MarkVSpec 文書は、後から再利用可能な実装コンポーネントを見つける助けにはなりますが、記述者に部品ファイルを合成して画面を書くことを要求しません。

## 目標

- Markdown として読める文書を保つ。
- 同じ source から low-fidelity wireframe をレンダリングする。
- 画面、レイアウトグループ、要素、アクション、状態、ルールに安定した ID を付ける。
- 画面状態と遷移を明示的に定義する。
- 要素に要求、バリデーション、実装メモを紐づける。
- テスト、実装タスク、レビュー checklist のための構造化データを export できるようにする。

## 対象外

- ピクセルパーフェクトな UI デザイン。
- Figma や full design system の置き換え。
- frontend component boundary のエンコード。
- 再利用可能な component file から画面を合成すること。
- Markdown の中に汎用プログラミング言語を作ること。

## 文書の形

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
---

# SCR-LOGIN Login

## States

- idle*
- wait-auth
- auth-error
  - 認証失敗メッセージを表示する状態。

## Layout: mobile

### L1:L-LoginForm Login Form

- stack

#### Items

- E-Heading
- L-EmailField
- L-PasswordField
- E-SignInButton
- E-ForgotPasswordLink

## Elements

### 1:E-Heading Heading

- level: 1
- label: ログイン

### 3:E-EmailInput Input

- value: ${data.email}
- input rule:
  - type: email

### 5:E-SignInButton Button

- label: ログイン
- action: A-SubmitLogin

## Actions

### A1:A-SubmitLogin ログイン送信

#### From
- idle
#### P1: Process Send login request
- request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
- case: sent
    - state: wait-auth
- case: send-failed
    - state: auth-error
```

## Front Matter

Front Matter は文書全体の機械向けメタデータです。小さく、構造的な情報に留めます。

よく使う項目です。

- `id`
- `type`
- `title`
- `route`
- `viewport`
- `tags`
- `version`

画面設計全体を Front Matter に入れません。人間が読み、レビューし、編集する内容は Markdown body に書きます。

## 中核モデル

### Project

project は screen document の集合です。

例です。

```text
markvspec/
  screens/
    login.vspec.md
    users-index.vspec.md
    user-detail.vspec.md
    user-edit.vspec.md
    dashboard.vspec.md
    account-settings.vspec.md
```

このリポジトリでは `examples/` に英語版の実用サンプルギャラリーを置いています。これらの例は parser test の対象であり、リリース済み DSL と同期している必要があります。

### Screen

screen は top-level unit です。1 つの route、modal、flow step、または主要 view に対応します。

screen ID の例です。

- `SCR-LOGIN`
- `SCR-DASHBOARD`
- `SCR-USER-DETAIL`

必須情報です。

- Front Matter: `id`, `type`, `title`
- Body: `States`, `Layout: <viewport>`, `Elements`, `Actions`

### Layout Group

layout group は、実装コンポーネント境界を強制せず、見える構造を表します。
Layout は `## Layout: mobile` のようにビューポート単位で定義します。

ID 例です。

- `L-LoginForm`
- `L-EmailField`
- `L-MessageArea`

### Element

element は user-visible または interaction-relevant な対象です。各 element は安定した ID を持つべきです。

ID 例です。

- `E-EmailInput`
- `E-SignInButton`
- `E-ErrorBanner`

代表的な element type です。

- `Heading`
- `Paragraph`
- `Text`
- `Input`
- `Button`
- `Link`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Table`
- `List`
- `Dialog`
- `Banner`
- `Badge`
- `Image`
- `Icon`
- `Spinner`

### State

state は実装 framework の状態変数ではなく、画面の状態を表します。

例です。

- `idle`
- `fetching`
- `empty`
- `error`
- `success`
- `editing`
- `confirming-delete`

### Action

action は、状態変更、画面遷移、データ送信、二次的な surface の表示などを定義します。

ID 例です。

- `A-SubmitLogin`
- `A-ValidateEmail`

主な action field です。

- `From`
- `Process`
- `state` / `display` / `navigate`
- process `case`

Action の呼び出し元は Action の外側で定義します。ユーザー操作は Element の
`action:` / `action event:`、ライフサイクルイベントは `## Events`、process
response は `receive:` で接続します。

### Rule

rule は複数の element や state にまたがる振る舞いを表します。

ID 例です。

- `R-RequiredFields`
- `R-Authorization`

## 記述構文

素早く書ける Markdown を優先します。

- Front Matter は文書全体の機械向けメタデータ。
- 見出しは major object。例: `# SCR-LOGIN Login`, `### 7:E-SignInButton Button`, `### A1:A-SubmitLogin Submit login`。
- 箇条書きは property や rule。例: `- label: ログイン`。
- ネストした箇条書きは `#### From`, `#### Pn: Process ...`, 直接の state/display 変更、process step 直下の `case:` などの詳細。

`7` や `A1` のような短い heading marker は preview 表示用です。参照には `E-SignInButton` や `A-SubmitLogin` のような安定 ID を使います。

Markdown table や大きな YAML block を primary authoring surface にしません。表は生成ビューとしては使えますが、canonical source にはしません。

具体的なリリース構文は [dsl.md](../reference/index.md)、現在の product-level design は [design-spec.md](design-spec.md) に定義します。

## レンダリングルール

renderer は `Layout` と `Elements` を visual source of truth として扱います。`Actions`, `States`, `Business Rules` は annotation、overlay、inspector panel、validation warning としてレンダリング結果を補強します。

想定する view です。

- `wireframe`: 視覚レイアウトのみ。必要に応じて marker を表示。
- `spec`: wireframe と element/action inspector。
- `state`: state を選び、適用される要素だけを表示。
- `flow`: action/state transition graph。
- `checklist`: 生成される review / implementation checklist。
- `json`: 下流 tool 向けの normalized export。

## 実装コンポーネント

実装コンポーネントは後から layout group や繰り返しパターンから導出できます。MarkVSpec の first-class authoring model にはしません。

たとえば `L-LoginForm Login Form` を `AuthForm.tsx` として抽出することはありますが、画面設計書は screen-oriented のまま保ちます。

## リリーススコープ

1. 1 画面の `.vspec.md` ファイルを parse する。
2. screen ID、layout ID、element ID、action ID、重複参照、missing action を validate する。
3. simple screen wireframe preview を render する。
4. wireframe、elements、actions、transitions、notes、diagnostics、state flow を含む scrollable design document view を生成する。
5. syntax highlighting と VS Code diagnostics を提供する。
6. VS Code 拡張を Marketplace / VSIX インストール用に package する。

## 未解決の質問

- 生成コードは ID を `data-testid`、コメント、またはその両方として保持すべきか。
- state-specific visibility は element、layout group、またはその両方に置くべきか。
- MarkVSpec が Markdown らしさを失わない範囲で、どこまで visual layout をエンコードすべきか。
