# 更新履歴

`## History Fields` と `## History` は、画面仕様書そのものにレビュー履歴を残し、
preview、export、PDF で読めるようにするための section です。

Git の commit history とは役割が違います。Git は source file がどう変わったかを
追います。MarkVSpec の History は、レビュー対象の仕様 version、変更日、作成者、
レビュー担当、変更理由を、仕様書の一部として読める状態にします。

## 書く流れ

1. 標準 field だけでは足りない場合、`## History Fields` で metadata の列を定義します。
2. `## History` に revision entry を書きます。
3. entry heading の `### <version>` が Version です。`version` を history field として
   定義しません。
4. entry heading の直後に metadata bullet を書きます。
5. metadata bullet の後に、変更内容を Markdown prose として書きます。

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string

- approvedBy
  label: Approved By
  required: false
  type: string

## History

### 0.2

- date: 2026-05-15
- author: Docs Team
- reviewer: QA Lead
- ticket: DOC-118
- approvedBy: QA Lead
- reason: Added release review metadata.

Added custom History Fields so release reviewers can track ticket and approval
metadata inside the generated design document.
```

## 標準 field

`## History Fields` を省略しても、次の field は有効な History field として扱われます。

| Field | 必須 | Type | 用途 |
| --- | --- | --- | --- |
| `date` | yes | `date` | revision date。`YYYY-MM-DD` 形式 |
| `author` | yes | `string` | revision の作成者または team |
| `reviewer` | no | `string` | revision のレビュー担当者または team |
| `reason` | no | `string` | revision の理由 |

`ticket` や `approvedBy` のような custom field は、この標準 field に追加されます。
custom field が標準 field と同じ key を使う場合、その field の label、required、type を
上書きします。

## entry body

metadata bullet の後に書いた本文は Markdown prose として保持されます。追加の metadata
ではなく、読者向けの変更内容として使います。

```markdown markvspec-fragment section=history
### 1.0

- date: 2026-05-20
- author: Product Design
- reason: Release candidate for account settings.

Released the first reviewed account settings specification.

- Added required-field validation.
- Added save failure handling.
```

## Basic Info と preview

preview と static export では、`## History` は `Version`、有効な field label、
`Changes` を列に持つ table として表示されます。

文書上部の Basic Info は、source order で最後に書かれた History entry から値を取ります。

- `Version` は entry heading 由来です。
- `Date` は entry の `date` metadata 由来です。
- `Author` は entry の `author` metadata 由来です。

project document-list export の `lastUpdated` は、空ではない `date` metadata value のうち
最大の値を使います。parse できる値は date として並べ、parse できない値がある場合は
文字列順に fallback します。無効な date value は diagnostic の対象です。

## いつ使うか

release spec、承認 workflow、監査対象の画面、共有する product document のように、
仕様書自体がレビュー成果物になる場合に History を追加します。短期の draft や探索用の
screen では、Git history だけで十分なこともあります。

## Example

Error Codes、custom History Fields、History entries を含む完全な例は
[History And Errors](../../../examples/showcase/history-and-errors.html) を参照してください。

## 次に読む

- [History Reference](../reference/history.md)
- [Sections Reference](../reference/sections.md)
- [CLI Reference](../reference/cli.md)
