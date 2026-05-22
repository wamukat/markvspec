# History Reference

History は 2 つの canonical section で構成されます。

- `## History Fields`: History entry の metadata field を定義します。
- `## History`: revision entry を定義します。

canonical section heading は `## History Fields` と `## History` です。現行 parser は
これらの heading に対する日本語 alias を定義していません。

## History Fields

`## History Fields` は任意です。標準 field の label、required、type を変えたい場合、
または document 固有の metadata field を追加したい場合に使います。

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string
```

### field bullet

top-level bullet 1 つが field key 1 つを定義します。

| Syntax | 意味 |
| --- | --- |
| `- ticket` | field key `ticket` を定義する |
| `label: Ticket` | preview/export table で使う表示 label |
| `required: true` | entry にこの field が必要 |
| `type: date` | field value は `YYYY-MM-DD` |

field property:

| Property | 必須 | Values | Default |
| --- | --- | --- | --- |
| `label` | no | text | field key |
| `required` | no | `true` またはそれ以外 | `false` |
| `type` | no | `string`, `date` | `string` |

history field 配下の未知 property は output に表現されません。

### 標準 field

有効な History Fields は、常に次の標準 field から始まります。

| Field | Label | Required | Type |
| --- | --- | --- | --- |
| `date` | `Date` | yes | `date` |
| `author` | `Author` | yes | `string` |
| `reviewer` | `Reviewer` | no | `string` |
| `reason` | `Reason` | no | `string` |

custom field は key で merge されます。custom field が標準 field と同じ key を使う場合、
その標準 field definition を置き換えます。

## History

`## History` には revision entry を書きます。`### <version>` heading 1 つが entry 1 つを
作り、heading text が entry の `Version` になります。

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string

## History

### 0.2

- date: 2026-05-15
- author: Docs Team
- reviewer: QA Lead
- ticket: DOC-118
- reason: Added release review metadata.

Added custom History Fields for release review.
```

### entry metadata

metadata bullet として読まれるのは、entry heading の直後から entry body が始まる前までです。

| Syntax | 意味 |
| --- | --- |
| `### 0.2` | entry version。History Field ではない |
| `- date: 2026-05-15` | `date` field の metadata value |
| `- ticket: DOC-118` | custom `ticket` field の metadata value |

entry metadata の field key は `## History Fields` で定義されるため、構文上は任意 key を
受け取ります。未定義 key は parser が保持しますが、warning diagnostic になります。

最初の non-metadata body line 以降は entry body です。entry body は `Changes` 列に
Markdown として表示されます。

## Validation

validator は次を確認します。

| Case | Severity | Message shape |
| --- | --- | --- |
| custom field key の重複 | error | duplicate history field |
| 未知の field `type` | warning | use `string` or `date` |
| required field の欠落 | error | `History <version> is missing required field <key>.` |
| 未定義 entry metadata field | warning | `History <version> uses undefined field <key>.` |
| `date` field が `YYYY-MM-DD` ではない | warning | `History <version> field <key> must be a date in YYYY-MM-DD format.` |

`date` validation は、custom field を含む有効 field のうち `type: date` の field に適用されます。

## Rendering

preview と static export は History を table として表示します。

- `Version`
- 有効な History Field label
- `Changes`

文書上部の Basic Info は、source order で最後に書かれた History entry から値を取ります。

- `Version`: entry heading text
- `Date`: entry の `date` field
- `Author`: entry の `author` field

project `document-list` export の `lastUpdated` は、source order ではなく、空ではない
`date` metadata value のうち最大の値を使います。parse できる値は date として並べ、
parse できない値がある場合は文字列順に fallback します。無効な date value は diagnostic
の対象です。

## Generated Grammar

生成される grammar page は、canonical section order に `History Fields` と `History` を
含め、History entry field key を represented extension として扱います。

- [Grammar](grammar.md)
- [Sections](sections.md)

## Example

- Source: `examples/06-structured-sections/history-and-errors.vspec.md`
- Showcase: [History And Errors](../../../examples/showcase/history-and-errors.html)
