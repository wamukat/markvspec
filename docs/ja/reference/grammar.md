# Grammar

このページは、parser、validator、diagnostics、documentation、examples の基準にする
MarkVSpec の canonical grammar を定義します。

MarkVSpec は Markdown-first です。以下の grammar は、CommonMark 相当の Markdown
parser が headings、bullet lists、tables、paragraphs を識別した後の段階から始まり
ます。生の indentation、line wrapping、inline Markdown formatting は Markdown の
責務であり、MarkVSpec の意味は heading level、section title、list item text、list
nesting から読み取ります。

このページは `packages/core/src/grammar-definition.ts` から生成されます。手編集
ではなく、grammar definition を更新して再生成します。

## EBNF Notation

このページの production はすべて EBNF で書きます。

- `=` は production の定義です。
- `;` は production の終端です。
- `"literal"` は Markdown block parsing 後の正確な文字列です。
- `|` は alternative です。
- `[ x ]` は optional です。
- `{ x }` は zero or more repetitions です。
- parentheses は alternatives の grouping です。

`inline_text` や `prose_line` のような token は natural-language token です。
文字単位の lexer ではなく、Markdown block parsing と後述の semantic rules によって
境界づけます。

## Lexical Tokens

```ebnf
letter = "A" | ... | "Z" | "a" | ... | "z" ;
digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
name_char = letter | digit | "-" | "_" ;
name = name_char , { name_char } ;

screen_id = "SCR-" , name ;
layout_id = "L-" , name ;
element_id = "E-" , name ;
action_id = "A-" , name ;
rule_id = "R-" , name ;
validation_id = "V-" , name ;
form_group_id = "F-" , name ;
partial_id = "PRT-" , name ;
template_id = "TPL-" , name ;
error_code = "ERR-" , name ;
object_id = screen_id | layout_id | element_id | action_id | rule_id
          | validation_id | form_group_id | partial_id | template_id | error_code ;

marker = name ;
viewport = name ;
state_name = name ;
slot_name = name ;
process_marker = "P" , digit , { digit } ;
http_method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" ;
property_key = letter , { letter | digit | "-" | "_" | " " } ;
h1 = ? Markdown level-1 heading block ? ;
h2 = ? Markdown level-2 heading block ? ;
h3 = ? Markdown level-3 heading block ? ;
h4 = ? Markdown level-4 heading block ? ;
bullet = ? Markdown bullet list item at the current semantic nesting level ? ;
heading = h1 | h2 | h3 | h4 | ? Markdown heading level 5 or 6 ? ;
list = ? Markdown list block ? ;
table = ? Markdown table block ? ;
inline_text = ? non-empty Markdown inline text after trimming ? ;
prose_line = ? Markdown paragraph text not consumed as a structured item ? ;
markdown_block = heading | list | table | prose_line | ? fenced code, block quote, or other preserved Markdown block ? ;
section_block = entity_heading | named_heading | subsection_heading | bullet | markdown_block ;
section_prose = prose_line | markdown_block ;
entity_prose = prose_line | markdown_block ;
expression = ? non-empty semantic expression text ? ;
reference = object_id , [ "." , name , { "." , name } ] ;
value_ref = element_id , ".value" ;
key_value = property_key , ":" , inline_text ;
outcome_item = bullet , key_value | bullet , flow_directive ;
request_item = bullet , http_method , inline_text
             | bullet , "params:" , { bullet , key_value }
             | bullet , key_value ;
sync_detail = service_call | expression ;
service_call = service_name , [ "(" , [ inline_text ] , ")" ] ;
service_name = name , { "." , name } ;
```

## Document

```ebnf
document = [ front_matter ] , screen_heading , { top_level_block } ;
front_matter = "---" , yaml_mapping , "---" ;
yaml_mapping = ? YAML mapping used only for document metadata ? ;
screen_heading = h1 , screen_id , [ inline_text ] ;

top_level_block = section | prose_line ;
section = recognized_section | unknown_section ;
unknown_section = h2 , inline_text , { markdown_block } ;
```

`unknown_section` は可能な範囲で source text として保持されますが、canonical render model や validation model には入りません。

## Recognized Sections

```ebnf
recognized_section = states_section
                   | layout_section
                   | slot_section
                   | slots_section
                   | elements_section
                   | form_groups_section
                   | events_section
                   | actions_section
                   | view_context_section
                   | view_context_samples_section
                   | preview_scenarios_section
                   | field_validations_section
                   | cross_field_validations_section
                   | validations_section
                   | business_rules_section
                   | error_codes_section
                   | history_fields_section
                   | history_section ;

states_section = h2 , ( "States" ) , { section_block } ;
layout_section = h2 , ( "Layout" | "Layout:" viewport ) , { section_block } ;
slot_section = h2 , ( "Slot:" slot_name [":" viewport] ) , { section_block } ;
slots_section = h2 , ( "Slots" ) , { section_block } ;
elements_section = h2 , ( "Elements" ) , { section_block } ;
form_groups_section = h2 , ( "Form Groups" ) , { section_block } ;
events_section = h2 , ( "Events" ) , { section_block } ;
actions_section = h2 , ( "Actions" ) , { section_block } ;
view_context_section = h2 , ( "View Context" ) , { section_block } ;
view_context_samples_section = h2 , ( "View Context Samples" ) , { section_block } ;
preview_scenarios_section = h2 , ( "Preview Scenarios" ) , { section_block } ;
field_validations_section = h2 , ( "Field Validations" ) , { section_block } ;
cross_field_validations_section = h2 , ( "Cross-field Validations" ) , { section_block } ;
validations_section = h2 , ( "Validations" ) , { section_block } ;
business_rules_section = h2 , ( "Business Rules" ) , { section_block } ;
error_codes_section = h2 , ( "Error Codes" ) , { section_block } ;
history_fields_section = h2 , ( "History Fields" ) , { section_block } ;
history_section = h2 , ( "History" ) , { section_block } ;
```

推奨 section order は次の通りです。

`States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History`

## Entity Headings

```ebnf
entity_heading = h3 , [ marker , ":" ] , object_id , [ inline_text ] ;
named_heading = h3 , name , [ inline_text ] ;
subsection_heading = h4 , inline_text ;
```

marker prefix は任意です。preview や generated reference views に短い marker を表示したい場合に使います。

## Structured Item Classification

この節は `packages/core/src/grammar-definition.ts` から生成されます。semantic parser は対象範囲の structured item 判定で同じ definition を参照します。

### Action Top-Level Items

| item | classification | output | diagnostic | 説明 |
| --- | --- | --- | --- | --- |
| `From` | canonical | yes | - | Action の遷移元 state。 |
| `Process Pn:` | canonical | yes | - | marker 付き process step。 |
| `Otherwise` | canonical | yes | - | fallback outcome。 |
| `Triggered` | non-canonical | no | warning | legacy trigger wrapper。Element の action または Events を使います。 |

### Action Process Items

| item | classification | output | diagnostic | 説明 |
| --- | --- | --- | --- | --- |
| `request` | canonical | yes | - | HTTP request block。 |
| `receive` | canonical | yes | - | 外部 result block。 |
| `sync` | canonical | yes | - | 同期 service / calculation detail。 |
| `server` | canonical | yes | - | server-side service call detail。HTTP method/path は request 配下に置きます。 |
| `response` | canonical | yes | - | response classification detail。 |
| `validation` | canonical | yes | - | validation process detail。 |
| `when` | canonical | yes | - | process guard。 |
| `skip when` | canonical | yes | - | skip guard。 |
| `parallel` | canonical | yes | - | parallel process group。 |
| `resolve` | canonical | yes | - | resolve process group。 |
| `case` | canonical | yes | - | process result branch。 |
| `state` | canonical | yes | - | immediate state transition effect。 |
| `navigate` | canonical | yes | - | immediate navigation effect。 |
| `display` | canonical | yes | - | display effect block。 |
| `update` | canonical | yes | - | partial update effect block。 |
| `model` | canonical | yes | - | structured model side effect。 |
| `view` | canonical | yes | - | structured view side effect。 |
| `stop` | canonical | yes | - | process case flow directive。 |
| `continue` | canonical | yes | - | process case flow directive。 |
| `Effects` | non-canonical | no | warning | legacy effect wrapper。 |
| `input` | non-canonical | no | warning | 古い process wrapper label。 |
| `inputs` | non-canonical | no | warning | 古い process wrapper label。 |
| `condition` | non-canonical | no | warning | 古い process wrapper label。 |
| `conditions` | non-canonical | no | warning | 古い process wrapper label。 |
| `cases` | non-canonical | no | warning | 古い process wrapper label。 |

### Element Structured Properties

- `marker`
- `label`
- `label src`
- `placeholder src`
- `description`
- `help`
- `help src`
- `hint`
- `message`
- `message src`
- `sample`
- `source`
- `purpose`
- `text`
- `value`
- `src`
- `format`
- `initial value`
- `required`
- `readonly`
- `optional`
- `visible when`
- `hidden when`
- `disabled when`
- `variant`
- `tone`
- `validation`
- `input rule`
- `error text`
- `action`
- `action event`

Element type 固有 property は `elementTypeRegistry` とこの grammar definition から扱います。未定義 property は保持される extension item として information diagnostic の対象です。

### Layout Metadata Properties

- `active when`
- `align`
- `columns`
- `description`
- `disabled when`
- `enabled when`
- `gap`
- `hidden when`
- `justify`
- `marker`
- `overlay`
- `partial`
- `purpose`
- `selected when`
- `variant`
- `visible when`

未定義 layout metadata は保持される extension item として information diagnostic の対象です。

### Slot Definition Properties

- `required`
- `default`
- `purpose`
- `description`

未定義 slot definition property は render model に入らないため warning diagnostic の対象です。

## Action Grammar

```ebnf
actions_section = h2 , "Actions" , { action_entity | section_prose } ;
action_entity = action_heading , { action_item | entity_prose } ;
action_heading = h3 , [ marker , ":" ] , action_id , [ inline_text ] ;

action_item = from_block | process_block | otherwise_block ;
from_block = bullet , "From" , { bullet , state_name } ;
otherwise_block = bullet , "Otherwise" , { outcome_item } ;

process_block = bullet , "Process" , process_marker , ":" , inline_text ,
                { process_item | process_case | immediate_effect } ;
process_item = request_block | receive_block | sync_block | server_block
             | when_item | skip_when_item | parallel_group | resolve_group ;
request_block = bullet , "request:" , { request_item } ;
receive_block = bullet , "receive:" , { bullet , key_value | bullet , reference } ;
sync_block = bullet , "sync:" , { bullet , sync_detail | bullet , key_value } ;
server_block = bullet , "server:" , { bullet , service_call | bullet , key_value } ;
when_item = bullet , "when:" , expression ;
skip_when_item = bullet , "skip when:" , expression ;
parallel_group = bullet , "parallel:" , name ;
resolve_group = bullet , "resolve:" , name ;
process_case = bullet , "case:" , name , { outcome_item | flow_directive } ;
flow_directive = bullet , "stop" | bullet , "continue" ;
immediate_effect = bullet , ( "state:" | "navigate:" | "display:" | "update:" | "model:" | "view:" ) , expression ;
```

## Non-Canonical Forms

以下は diagnostics または compatibility のために認識されるだけで、canonical grammar ではありません。

- `Triggered`: legacy trigger wrapper。Element の action または Events を使います。
- `Effects`: legacy effect wrapper。
- `input`: 古い process wrapper label。
- `inputs`: 古い process wrapper label。
- `condition`: 古い process wrapper label。
- `conditions`: 古い process wrapper label。
- `cases`: 古い process wrapper label。
- `server:` 配下の `POST /login` のような HTTP method/path entry。これは `request:` 配下に書きます。
- authored DSL 内の raw htmx attributes、CSS selectors、raw colors、widths、heights、classes、implementation-level styling。

## Semantic Constraints

以下の制約は EBNF body の外に置きます。

- 1 document は 1 screen を表します。
- `*` で initial state として mark できる state は 1 つだけです。
- 参照される `E-*`, `L-*`, `A-*`, `R-*`, `V-*`, `ERR-*`, `SCR-*` ID は、関連する document set 内に存在しているべきです。
- `Heading` は `level: 1` から `level: 6` を使います。
- `variant` は priority です。値は `primary`, `secondary`, `tertiary` です。
- `tone` は semantic intent です。値は `neutral`, `info`, `success`, `warning`, `danger` です。
- `display` と `update` は user-visible result と partial replacement semantics を表します。raw framework attributes ではありません。
- View Context definition は `boolean` または `enum` に限定します。
- `server:` は HTTP request を表しません。HTTP request は `request:` で表します。

## Sync Diagnostics

`sync:` はこの grammar と Actions reference の canonical syntax です。`sync:` 配下の value-less service / calculation entry と key/value entry は standard process detail であり、extension item information diagnostic の対象にしません。canonical Action EBNF 外の未知 process detail block は、引き続き extension data として保持し、information diagnostic を出力できます。
