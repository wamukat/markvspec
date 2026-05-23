# Grammar

<!-- markvspec-coverage:reference.page.grammar -->

This page defines the canonical MarkVSpec grammar used as the reference for
parser, validator, diagnostics, documentation, and examples.

MarkVSpec is Markdown-first. The grammar below starts after a CommonMark-style
Markdown parser has already identified headings, bullet lists, tables, and
paragraphs. Raw indentation, line wrapping, and inline Markdown formatting are
Markdown concerns; MarkVSpec semantics are derived from the resulting heading
levels, section titles, list item text, and nesting.

This page is generated from `packages/core/src/grammar-definition.ts`. Do not
hand-edit it; update the grammar definition and regenerate the docs.

## EBNF Notation

All productions on this page use EBNF:

- `=` defines a production.
- `;` ends a production.
- `"literal"` is exact source text after Markdown block parsing.
- `|` separates alternatives.
- `[ x ]` means optional.
- `{ x }` means zero or more repetitions.
- Parentheses group alternatives.

Tokens such as `inline_text` and `prose_line` are natural-language tokens.
They are intentionally bounded by Markdown block parsing and the semantic rules
below, rather than by a character-level lexer.

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

`unknown_section` is preserved as source text where possible, but it does not enter the canonical render model or validation model.

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

The recommended section order is:

`States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History`

## Entity Headings

```ebnf
entity_heading = h3 , [ marker , ":" ] , object_id , [ inline_text ] ;
named_heading = h3 , name , [ inline_text ] ;
subsection_heading = h4 , inline_text ;
```

The marker prefix is optional. It is used when previews or generated reference views should display a short marker.

## Structured Item Classification

This section is generated from `packages/core/src/grammar-definition.ts`. Definition coverage spans every structured section. Semantic parser migration is incremental; migrated scopes use the same definition.

### Action Top-Level Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `From` | canonical | yes | - | Action source states. |
| `Process Pn:` | canonical | yes | - | Marked process step. |
| `Otherwise` | canonical | yes | - | Fallback outcome. |
| `Triggered` | non-canonical | no | warning | Legacy trigger wrapper. Use Element action or Events. |

### Action Process Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `request` | canonical | yes | - | HTTP request block. |
| `receive` | canonical | yes | - | External result block. |
| `sync` | canonical | yes | - | Synchronous service or calculation detail. |
| `server` | canonical | yes | - | Server-side service call detail. HTTP method/path belongs under request. |
| `response` | canonical | yes | - | Response classification detail. |
| `validation` | canonical | yes | - | Validation process detail. |
| `when` | canonical | yes | - | Process guard. |
| `skip when` | canonical | yes | - | Skip guard. |
| `parallel` | canonical | yes | - | Parallel process group. |
| `resolve` | canonical | yes | - | Resolve process group. |
| `case` | canonical | yes | - | Process result branch. |
| `state` | canonical | yes | - | Immediate state transition effect. |
| `navigate` | canonical | yes | - | Immediate navigation effect. |
| `display` | canonical | yes | - | Display effect block. |
| `update` | canonical | yes | - | Partial update effect block. |
| `model` | canonical | yes | - | Structured model side effect. |
| `view` | canonical | yes | - | Structured view side effect. |
| `stop` | canonical | yes | - | Process case flow directive. |
| `continue` | canonical | yes | - | Process case flow directive. |
| `Effects` | non-canonical | no | warning | Legacy effect wrapper. |
| `input` | non-canonical | no | warning | Old process wrapper label. |
| `inputs` | non-canonical | no | warning | Old process wrapper label. |
| `condition` | non-canonical | no | warning | Old process wrapper label. |
| `conditions` | non-canonical | no | warning | Old process wrapper label. |
| `cases` | non-canonical | no | warning | Old process wrapper label. |

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

Element type-specific properties are handled from `elementTypeRegistry` together with this grammar definition. Undefined properties are preserved extension items and receive information diagnostics.

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

Undefined layout metadata is a preserved extension item and receives an information diagnostic.

### Slot Definition Properties

- `required`
- `default`
- `purpose`
- `description`

Undefined slot definition properties do not enter the render model and receive warning diagnostics.

### Section Structured Items

#### Form Groups

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | canonical | yes | - | Form Group property. |
| `description` | canonical | yes | - | Form Group property. |
| `purpose` | canonical | yes | - | Form Group property. |
| `fields` | canonical | yes | - | Form Group property. |
| `submit` | canonical | yes | - | Form Group property. |

#### View Context

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `type` | canonical | yes | - | View Context property. |
| `values` | canonical | yes | - | View Context property. |

#### View Context Samples

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `view context key` | represented-extension | yes | info | Sample value keyed by View Context definition. |

#### Preview Scenarios

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `state` | canonical | yes | - | Preview Scenario property. |
| `model` | canonical | yes | - | Preview Scenario property. |
| `view` | canonical | yes | - | Preview Scenario property. |
| `route` | canonical | yes | - | Preview Scenario property. |
| `samples` | canonical | yes | - | Preview Scenario property. |
| `before` | canonical | yes | - | Preview Scenario property. |
| `cases` | canonical | yes | - | Preview Scenario property. |

#### Preview Scenario Route Entries

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `route parameter key` | represented-extension | yes | info | Route sample value keyed by screen route parameters. |

#### Preview Scenario Sample Entries

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `element id` | represented-extension | yes | info | Sample value keyed by Element id. |
| `source row key` | represented-extension | yes | info | Sample row value keyed by source data columns. |

#### Validations

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | canonical | yes | - | Validation property. |
| `description` | canonical | yes | - | Validation property. |
| `target` | canonical | yes | - | Validation property. |
| `scope` | canonical | yes | - | Validation property. |
| `run` | canonical | yes | - | Validation property. |
| `inputs` | canonical | yes | - | Validation property. |
| `rules` | canonical | yes | - | Validation property. |
| `constraints` | canonical | yes | - | Validation property. |
| `check` | canonical | yes | - | Validation property. |
| `when` | canonical | yes | - | Validation property. |
| `message` | canonical | yes | - | Validation property. |
| `messages` | canonical | yes | - | Validation property. |
| `error code` | canonical | yes | - | Validation property. |

#### Business Rules

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | canonical | yes | - | Business Rule property. |
| `description` | canonical | yes | - | Business Rule property. |
| `when` | canonical | yes | - | Business Rule property. |
| `effect` | canonical | yes | - | Business Rule property. |
| `message` | canonical | yes | - | Business Rule property. |
| `messages` | canonical | yes | - | Business Rule property. |
| `appliesTo` | canonical | yes | - | Business Rule property. |
| `priority` | canonical | yes | - | Business Rule property. |

#### Error Codes

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | canonical | yes | - | Error Code property. |
| `business rule` | canonical | yes | - | Error Code property. |
| `target` | canonical | yes | - | Error Code property. |
| `message` | canonical | yes | - | Error Code property. |
| `display` | canonical | yes | - | Error Code property. |
| `tone` | canonical | yes | - | Error Code property. |
| `description` | canonical | yes | - | Error Code property. |

#### Element Tabs Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `panel` | canonical | yes | - | Tabs item property. |
| `action` | canonical | yes | - | Tabs item property. |
| `active when` | canonical | yes | - | Tabs item property. |

#### Element Accordion Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `panel` | canonical | yes | - | Accordion item property. |
| `action` | canonical | yes | - | Accordion item property. |
| `open when` | canonical | yes | - | Accordion item property. |

#### Element ActionMenu Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `action` | canonical | yes | - | ActionMenu item property. |
| `tone` | canonical | yes | - | ActionMenu item property. |
| `disabled when` | canonical | yes | - | ActionMenu item property. |

#### Element Display Value Properties

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `value` | canonical | yes | - | Display value property. |
| `label` | canonical | yes | - | Display value property. |
| `placeholder` | canonical | yes | - | Display value property. |
| `text` | canonical | yes | - | Display value property. |
| `message` | canonical | yes | - | Display value property. |
| `hint` | canonical | yes | - | Display value property. |
| `href` | canonical | yes | - | Display value property. |
| `src` | canonical | yes | - | Display value property. |
| `alt` | canonical | yes | - | Display value property. |

#### Element Display Value Metadata

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `kind` | canonical | yes | - | Display value metadata property. |
| `source` | canonical | yes | - | Display value metadata property. |
| `format` | canonical | yes | - | Display value metadata property. |

#### History Fields

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `label` | canonical | yes | - | History Field property. |
| `required` | canonical | yes | - | History Field property. |
| `type` | canonical | yes | - | History Field property. |

#### History

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `field key` | represented-extension | yes | info | History entry metadata keyed by History Fields. |

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

The following forms are recognized only for diagnostics or compatibility and are not canonical grammar:

- `Triggered`: Legacy trigger wrapper. Use Element action or Events.
- `Effects`: Legacy effect wrapper.
- `input`: Old process wrapper label.
- `inputs`: Old process wrapper label.
- `condition`: Old process wrapper label.
- `conditions`: Old process wrapper label.
- `cases`: Old process wrapper label.
- HTTP method/path entries such as `POST /login` under `server:`. Put them under `request:`.
- Raw htmx attributes, CSS selectors, raw colors, widths, heights, classes, and implementation-level styling in authored DSL.

## Semantic Constraints

These constraints are intentionally outside the EBNF body:

- One document represents one screen.
- Only one state may be marked as initial with `*`.
- Referenced `E-*`, `L-*`, `A-*`, `R-*`, `V-*`, `ERR-*`, and `SCR-*` IDs should exist in the related document set.
- `Heading` uses `level: 1` through `level: 6`.
- `variant` is priority: `primary`, `secondary`, or `tertiary`.
- `tone` is semantic intent: `neutral`, `info`, `success`, `warning`, or `danger`.
- `display` and `update` describe user-visible results and partial replacement semantics, not raw framework attributes.
- View Context definitions are limited to `boolean` or `enum`.
- `server:` does not represent an HTTP request. HTTP requests are written under `request:`.

## Sync Diagnostics

`sync:` is canonical in this grammar and in the Actions reference. Value-less service or calculation entries and key/value entries under `sync:` are standard process details, not extension item information diagnostics. Unknown process detail blocks outside the canonical Action EBNF may still be retained as extension data with information diagnostics.
