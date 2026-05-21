# Grammar

This page defines the canonical MarkVSpec grammar used as the reference for
parser, validator, diagnostics, documentation, and examples.

MarkVSpec is Markdown-first. The grammar below starts after a CommonMark-style
Markdown parser has already identified headings, bullet lists, tables, and
paragraphs. Raw indentation, line wrapping, and inline Markdown formatting are
Markdown concerns; MarkVSpec semantics are derived from the resulting heading
levels, section titles, list item text, and nesting.

## EBNF Notation

All productions on this page use EBNF:

- `=` defines a production.
- `;` ends a production.
- `"literal"` is exact source text after Markdown block parsing.
- `|` separates alternatives.
- `[ x ]` means optional.
- `{ x }` means zero or more repetitions.
- Parentheses group alternatives.

Tokens such as `inline_text` and `prose_line` are natural-language tokens. They
are intentionally bounded by Markdown block parsing and the semantic rules
below, rather than by a character-level lexer.

## Lexical Tokens

```ebnf
letter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M"
       | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
       | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
       | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" ;
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
expression = ? non-empty semantic expression text ? ;
reference = object_id , [ "." , name , { "." , name } ] ;
value_ref = element_id , ".value" ;
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

`unknown_section` is preserved as source text where possible, but it is not part
of the canonical render or validation model.

## Recognized Sections

```ebnf
recognized_section = states_section
                   | layout_section
                   | slots_section
                   | slot_section
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
                   | history_section
                   | notes_section
                   | open_questions_section ;

states_section = h2 , "States" , { state_item } ;
state_item = bullet , state_name , [ "*" ] ;

notes_section = h2 , "Notes" , { markdown_block } ;
open_questions_section = h2 , "Open Questions" , { markdown_block } ;
```

Recommended section order is:

`States`, `Layout:<viewport>` / `Slot:<name>`, `Slots`, `Elements`, `Form Groups`,
`Events`, `Actions`, `View Context`, `View Context Samples`, `Preview Scenarios`,
`Field Validations`, `Cross-field Validations`, `Validations`, `Business Rules`,
`Error Codes`, `History Fields`, `History`.

## Entity Headings

```ebnf
entity_heading = h3 , [ marker , ":" ] , object_id , [ inline_text ] ;
named_heading = h3 , name , [ inline_text ] ;
subsection_heading = h4 , inline_text ;
```

The marker prefix is optional and is used when authors want a compact visual
marker in preview or generated reference views.

## Layout And Slots

```ebnf
layout_section = h2 , "Layout" , [ ":" , viewport ] , { layout_entity | section_prose } ;
layout_entity = layout_heading , { layout_item | layout_subsection | entity_prose } ;
layout_heading = h3 , [ marker , ":" ] , layout_id , [ inline_text ] ;
layout_item = bullet , ( layout_flag | key_value | reference ) ;
layout_flag = "row" | "column" | "stack" | "grid" | "wrap" ;
layout_subsection = h4 , "Items" , { layout_child_item } ;
layout_child_item = bullet , ( reference | quoted_label_mapping ) ;
quoted_label_mapping = quoted_text , ":" , reference ;

slots_section = h2 , "Slots" , { slot_declaration | section_prose } ;
slot_declaration = h3 , [ marker , ":" ] , slot_name , [ inline_text ] ,
                   { slot_property | entity_prose } ;
slot_property = bullet , ( "required" | "optional" | key_value ) ;

slot_section = h2 , "Slot:" , slot_name , [ ":" , viewport ] ,
               { layout_entity | element_entity | section_prose } ;
```

## Elements

```ebnf
elements_section = h2 , "Elements" , { element_entity | section_prose } ;
element_entity = element_heading , { element_item | entity_prose } ;
element_heading = h3 , [ marker , ":" ] , element_id , element_type , [ inline_text ] ;
element_type = "Heading" | "Paragraph" | "Text" | "Button" | "Input" | "Link"
             | "Image" | "Select" | "Checkbox" | "Radio" | "Table" | inline_text ;
element_item = bullet , ( key_value | sample_rows_block | visibility_item ) ;
sample_rows_block = "sample rows:" , { nested_key_value } ;
visibility_item = "visible when:" , expression ;
```

Element types are semantic UI roles. `Heading` with `level: 1` through
`level: 6` is canonical; `H1` through `H6` are not canonical element types.

## Form Groups And Events

```ebnf
form_groups_section = h2 , "Form Groups" , { form_group_entity | section_prose } ;
form_group_entity = h3 , [ marker , ":" ] , form_group_id , [ inline_text ] ,
                    { form_group_item | entity_prose } ;
form_group_item = bullet , ( fields_block | key_value ) ;
fields_block = "fields:" , { bullet , element_id } ;

events_section = h2 , "Events" , { event_item | section_prose } ;
event_item = bullet , event_name , ":" , action_id ;
event_name = name , "." , name ;
```

## Actions

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
request_item = bullet , http_method , inline_text
             | bullet , "params:" , { nested_key_value }
             | bullet , key_value ;
receive_block = bullet , "receive:" , { bullet , key_value | bullet , reference } ;
sync_block = bullet , "sync:" , { bullet , sync_detail | bullet , key_value } ;
server_block = bullet , "server:" , { bullet , service_call | bullet , key_value } ;
sync_detail = service_call | expression ;
service_call = service_name , [ "(" , [ inline_text ] , ")" ] ;
service_name = name , { "." , name } ;
when_item = bullet , "when:" , expression ;
skip_when_item = bullet , "skip when:" , expression ;
parallel_group = bullet , "parallel:" , name ;
resolve_group = bullet , "resolve:" , name ;

process_case = bullet , "case:" , name , { outcome_item } ;
outcome_item = from_item | response_item | request_item | flow_item | immediate_effect
             | business_rule_ref | error_code_ref | route_param_block | description_item ;
from_item = bullet , "from:" , state_name ;
response_item = bullet , "response:" , inline_text ;
flow_item = bullet , ( "stop" | "continue" ) ;
business_rule_ref = bullet , "business rule:" , rule_id ;
error_code_ref = bullet , "error code:" , error_code ;
route_param_block = bullet , "route:" , { nested_key_value } ;
description_item = bullet , "description:" , inline_text ;

immediate_effect = state_effect | navigate_effect | display_effect | update_effect | view_effect ;
state_effect = bullet , "state:" , state_name ;
navigate_effect = bullet , "navigate:" , screen_id ;
view_effect = bullet , "view:" , expression ;
display_effect = bullet , "display:" , { display_item } ;
update_effect = bullet , "update:" , { display_item } ;
display_item = bullet , ( "target:" , object_id
                       | "message:" , inline_text
                       | "content:" , inline_text
                       | "element:" , element_id
                       | "partial:" , partial_id
                       | "mode:" , name ) ;
```

HTTP method and path entries are canonical only under `request:`. `server:` is
for server-side service calls that are not the HTTP request itself.

## View Context And Preview Scenarios

```ebnf
view_context_section = h2 , "View Context" , { view_context_entity | section_prose } ;
view_context_entity = named_heading , { view_context_item | entity_prose } ;
view_context_item = bullet , ( "type:" , ( "boolean" | "enum" )
                             | "values:" , { bullet , [ "*" ] , name } ) ;

view_context_samples_section = h2 , "View Context Samples" ,
                               { view_context_sample | section_prose } ;
view_context_sample = named_heading , { bullet , name , ":" , name | entity_prose } ;

preview_scenarios_section = h2 , "Preview Scenarios" ,
                            { preview_scenario | section_prose } ;
preview_scenario = named_heading , { scenario_item | entity_prose } ;
scenario_item = bullet , ( "state:" , state_name
                         | "view:" , name
                         | "cases:" , { bullet , action_id , "." , process_marker , "." , name }
                         | "samples:" , { nested_key_value }
                         | "route:" , { nested_key_value } ) ;
```

Only the rendering inputs needed by wireframe and State Views should use
composed template/page results. History and other document metadata remain owned
by the viewed design document.

## Validations And Rules

```ebnf
field_validations_section = h2 , "Field Validations" ,
                            { validation_entity | section_prose } ;
cross_field_validations_section = h2 , "Cross-field Validations" ,
                                  { validation_entity | section_prose } ;
validations_section = h2 , "Validations" , { validation_entity | section_prose } ;
validation_entity = h3 , [ marker , ":" ] , validation_id , [ inline_text ] ,
                    { validation_item | entity_prose } ;
validation_item = bullet , ( "target:" , object_id
                           | "inputs:" , { bullet , object_id }
                           | "check:" , inline_text
                           | "message:" , inline_text
                           | "constraints:" , { constraint_item }
                           | key_value ) ;
constraint_item = bullet , property_key , ":" , [ inline_text ] , { nested_key_value } ;

business_rules_section = h2 , "Business Rules" , { rule_entity | section_prose } ;
rule_entity = h3 , [ marker , ":" ] , rule_id , [ inline_text ] ,
              { rule_item | entity_prose } ;
rule_item = bullet , ( "statement:" , inline_text
                     | "when:" , expression
                     | "then:" , expression
                     | key_value ) ;
```

## Error Codes And History

```ebnf
error_codes_section = h2 , "Error Codes" , { error_code_entity | section_prose } ;
error_code_entity = h3 , [ marker , ":" ] , error_code , [ inline_text ] ,
                    { error_code_item | entity_prose } ;
error_code_item = bullet , ( "business rule:" , rule_id
                           | "target:" , object_id
                           | "message:" , inline_text
                           | "display:" , inline_text
                           | key_value ) ;

history_fields_section = h2 , "History Fields" , { history_field | section_prose } ;
history_field = bullet , property_key , { nested_key_value } ;

history_section = h2 , "History" , { history_entry | section_prose } ;
history_entry = h3 , inline_text , { bullet , key_value | entity_prose } ;
```

## Shared Structured Items

```ebnf
key_value = property_key , ":" , inline_text ;
nested_key_value = bullet , property_key , ":" , inline_text ;
section_prose = prose_line ;
entity_prose = prose_line ;
markdown_block = heading | list | table | prose_line ;
quoted_text = "\"" , inline_text , "\"" ;
```

Structured sections may allow extension keys in section-specific places. Those
extension keys are retained and should produce information diagnostics, not
warnings. Unknown structured items that are not retained are output-excluded and
should produce warning diagnostics.

Extension process detail blocks are not part of the canonical Action EBNF above.
When the parser retains them for compatibility, they should be represented as
extension data and produce information diagnostics.

## Non-Canonical Forms

The following forms are recognized only for diagnostics or compatibility and
are not canonical grammar:

- `- Triggered` under `## Actions`. Connect click or lifecycle triggers through
  `action: A-*` on elements or `## Events`.
- `- Effects` wrappers under action process steps or cases. Put `state:`,
  `display:`, `update:`, `navigate:`, or `view:` directly under the process or
  `case:`.
- Old action process labels such as `input`, `inputs`, `condition`,
  `conditions`, `case`, and `cases` when used as wrapper blocks instead of the
  canonical process items above.
- HTTP method/path entries such as `POST /login` under `server:`. Put them
  under `request:`.
- Raw htmx attributes, CSS selectors, raw colors, widths, heights, classes, and
  implementation-level styling in authored DSL.

## Semantic Constraints

These constraints are intentionally outside the EBNF body:

- A document describes one screen.
- Exactly one state may be marked with `*`.
- Referenced `E-*`, `L-*`, `A-*`, `R-*`, `V-*`, `ERR-*`, and `SCR-*` IDs should
  exist in the relevant document set.
- `Heading` uses `level: 1` through `level: 6`.
- `variant` is priority (`primary`, `secondary`, `tertiary`).
- `tone` is semantic intent (`neutral`, `info`, `success`, `warning`, `danger`).
- `display` and `update` describe user-visible results and partial replacement
  semantics; they are not raw framework attributes.
- View Context definitions are limited to `boolean` or `enum`.
- `server:` does not model an HTTP request; `request:` does.

## Current Follow-Up

`sync:` is canonical in this grammar and in the Actions reference, but the
current diagnostics can still classify some `sync:` process details as extension
items. Track that as a parser/diagnostics synchronization task rather than
changing parser behavior in this documentation ticket.
