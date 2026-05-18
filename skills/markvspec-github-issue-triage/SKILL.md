---
name: markvspec-github-issue-triage
description: MarkVSpec 固有の GitHub issue 棚卸し、検討結果コメント、close 判定を行うための手順。
---

# MarkVSpec GitHub Issue Triage

この skill は、MarkVSpec リポジトリの GitHub issue を棚卸しするときに使う。
対象リポジトリは原則として `wamukat/markvspec` とする。

## 基本方針

- GitHub issue は、外部に残すべき具体的な bug / feature / release tracking に使う。
- Kanbalone で設計・実装を進めることに決めた論点は、GitHub issue 側に検討結果を
  コメントして close する。
- close 理由は、原則として `not planned` を使う。これは「不要」ではなく、
  「GitHub issue ではなく Kanbalone の後続チケットを正にする」という意味で使う。
- close する前に、issue 本文に現在採用していない語彙、構文、設計案が残っていないか
  確認する。
- 具体的な再現条件がある bug、まだ Kanbalone に移管されていない作業、release tracking
  として意味がある issue は close しない。

## 正規手順

1. 対象リポジトリを確認する。

   ```bash
   git remote -v
   ```

   `origin` が `git@github.com:wamukat/markvspec.git` であることを確認する。

2. open issue を JSON で取得する。

   ```bash
   gh issue list \
     --repo wamukat/markvspec \
     --state open \
     --limit 100 \
     --json number,title,labels,updatedAt,createdAt,body,url
   ```

3. issue を分類する。

   - `close 候補`: Kanbalone の後続チケットで別手段の対策に切り替えたもの。
   - `残す`: 具体的な bug、partial / preview / exporter などの再現可能な実装課題、
     project transition など release tracking として残す意味があるもの。
   - `要相談`: close してよいか判断するには、現在方針や Kanbalone 側の対応状況が
     足りないもの。

4. close 候補には、先に検討結果コメントを残す。

   コメントには最低限以下を書く。

   - なぜ GitHub issue としては閉じるのか。
   - どの設計方針または Kanbalone 側の後続チケット群を正とするのか。
   - issue 本文に含まれる古い語彙や構文が、現在方針では採用されないこと。

5. コメント後に close する。

   ```bash
   gh issue comment <number> \
     --repo wamukat/markvspec \
     --body '<検討結果コメント>'

   gh issue close <number> \
     --repo wamukat/markvspec \
     --reason 'not planned'
   ```

6. 最後に open issue を再確認する。

   ```bash
   gh issue list \
     --repo wamukat/markvspec \
     --state open \
     --limit 100 \
     --json number,title,updatedAt,url
   ```

## 判断基準

close してよい例:

- 初期 DSL 案の語彙が残っているが、現在は Kanbalone 側で別の語彙・構造に整理した。
- GitHub issue の scope が大きすぎ、すでに Kanbalone で複数の実装チケットに分割した。
- issue 本文の例が現在の canonical syntax と矛盾し、残すと実装者を混乱させる。

close しない例:

- 再現可能な bug としてまだ有効。
- partial preview、viewport fallback、exporter など、具体的な実装修正対象が明確。
- release tracking として、どの機能が入ったかを外部から辿る価値がある。
- Kanbalone 側でまだ代替チケットが作られていない。

## コメント例

```text
棚卸し結果として close します。

この issue で扱っていた <論点> は、その後 GitHub issue ではなく Kanbalone 側の
設計・実装チケットで分割して進める方針に変更しました。

特に、当初案に含まれていた <古い語彙や構文> は、そのまま canonical DSL として
採用せず、現在は <現在方針> として整理しています。

この issue を開いたままにすると、古い語彙案が現在方針として残っているように
見えるため、検討結果を記録したうえで close します。今後の実作業は Kanbalone の
該当チケットを正とします。
```
