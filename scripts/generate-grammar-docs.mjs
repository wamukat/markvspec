import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  actionProcessDetailItemDefinitions,
  actionTopLevelItemDefinitions,
  commonElementPropertyKeys,
  grammarSectionDefinitions,
  grammarSectionOrderText,
  layoutGroupMetadataPropertyKeys,
  slotDefinitionPropertyKeys
} from "../packages/core/dist/grammar-definition.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");

const targets = [
  { locale: "en", path: "docs/en/reference/grammar.md", site: false },
  { locale: "ja", path: "docs/ja/reference/grammar.md", site: false },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/grammar.md", site: true },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/grammar.md", site: true }
];

const mismatches = [];
for (const target of targets) {
  const content = grammarPage(target.locale, target.site);
  const absolutePath = join(rootDir, target.path);
  if (check) {
    const current = readFileSync(absolutePath, "utf8");
    if (current !== content) {
      mismatches.push(target.path);
    }
    continue;
  }
  writeFileSync(absolutePath, content);
}

if (mismatches.length > 0) {
  console.error(`Grammar docs are not generated from the current grammar definition:\n${mismatches.map((path) => `- ${path}`).join("\n")}`);
  process.exit(1);
}

function grammarPage(locale, site) {
  const ja = locale === "ja";
  const fence = site ? "text" : "ebnf";
  const title = site ? "---\ntitle: \"Grammar\"\n---\n\n" : "# Grammar\n\n";
  return `${title}${intro(ja)}

## EBNF Notation

${notation(ja)}

## Lexical Tokens

\`\`\`${fence}
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
inline_text = ? non-empty Markdown inline text after trimming ? ;
prose_line = ? Markdown paragraph text not consumed as a structured item ? ;
expression = ? non-empty semantic expression text ? ;
reference = object_id , [ "." , name , { "." , name } ] ;
value_ref = element_id , ".value" ;
\`\`\`

## Document

\`\`\`${fence}
document = [ front_matter ] , screen_heading , { top_level_block } ;
front_matter = "---" , yaml_mapping , "---" ;
yaml_mapping = ? YAML mapping used only for document metadata ? ;
screen_heading = h1 , screen_id , [ inline_text ] ;

top_level_block = section | prose_line ;
section = recognized_section | unknown_section ;
unknown_section = h2 , inline_text , { markdown_block } ;
\`\`\`

${ja
    ? "`unknown_section` は可能な範囲で source text として保持されますが、canonical render model や validation model には入りません。"
    : "`unknown_section` is preserved as source text where possible, but it does not enter the canonical render model or validation model."}

## Recognized Sections

\`\`\`${fence}
recognized_section = ${grammarSectionDefinitions.map((section) => `${snake(section.kind)}_section`).join("\n                   | ")} ;

${grammarSectionDefinitions.map((section) => `${snake(section.kind)}_section = h2 , ( ${section.heading.pattern} ) , { section_block } ;`).join("\n")}
\`\`\`

${ja ? "推奨 section order は次の通りです。" : "The recommended section order is:"}

\`${grammarSectionOrderText}\`

## Entity Headings

\`\`\`${fence}
entity_heading = h3 , [ marker , ":" ] , object_id , [ inline_text ] ;
named_heading = h3 , name , [ inline_text ] ;
subsection_heading = h4 , inline_text ;
\`\`\`

${ja
    ? "marker prefix は任意です。preview や generated reference views に短い marker を表示したい場合に使います。"
    : "The marker prefix is optional. It is used when previews or generated reference views should display a short marker."}

## Structured Item Classification

${ja
    ? "この節は `packages/core/src/grammar-definition.ts` から生成されます。semantic parser は対象範囲の structured item 判定で同じ definition を参照します。"
    : "This section is generated from `packages/core/src/grammar-definition.ts`. Semantic parsers use the same definition for structured item classification in the scoped areas."}

### Action Top-Level Items

${itemTable(actionTopLevelItemDefinitions, ja)}

### Action Process Items

${itemTable(actionProcessDetailItemDefinitions, ja)}

### Element Structured Properties

${keyList(commonElementPropertyKeys)}

${ja
    ? "Element type 固有 property は `elementTypeRegistry` とこの grammar definition から扱います。未定義 property は保持される extension item として information diagnostic の対象です。"
    : "Element type-specific properties are handled from `elementTypeRegistry` together with this grammar definition. Undefined properties are preserved extension items and receive information diagnostics."}

### Layout Metadata Properties

${keyList(layoutGroupMetadataPropertyKeys)}

${ja
    ? "未定義 layout metadata は保持される extension item として information diagnostic の対象です。"
    : "Undefined layout metadata is a preserved extension item and receives an information diagnostic."}

### Slot Definition Properties

${keyList(slotDefinitionPropertyKeys)}

${ja
    ? "未定義 slot definition property は render model に入らないため warning diagnostic の対象です。"
    : "Undefined slot definition properties do not enter the render model and receive warning diagnostics."}

## Action Grammar

\`\`\`${fence}
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
process_case = bullet , "case:" , name , { outcome_item | flow_directive } ;
flow_directive = bullet , "stop" | bullet , "continue" ;
immediate_effect = bullet , ( "state:" | "navigate:" | "display:" | "update:" | "model:" | "view:" ) , expression ;
\`\`\`

## Non-Canonical Forms

${nonCanonicalList(ja)}

## Semantic Constraints

${semanticConstraints(ja)}

## Sync Diagnostics

${ja
    ? "`sync:` はこの grammar と Actions reference の canonical syntax です。`sync:` 配下の value-less service / calculation entry と key/value entry は standard process detail であり、extension item information diagnostic の対象にしません。canonical Action EBNF 外の未知 process detail block は、引き続き extension data として保持し、information diagnostic を出力できます。"
    : "`sync:` is canonical in this grammar and in the Actions reference. Value-less service or calculation entries and key/value entries under `sync:` are standard process details, not extension item information diagnostics. Unknown process detail blocks outside the canonical Action EBNF may still be retained as extension data with information diagnostics."}
`;
}

function intro(ja) {
  return ja
    ? `このページは、parser、validator、diagnostics、documentation、examples の基準にする
MarkVSpec の canonical grammar を定義します。

MarkVSpec は Markdown-first です。以下の grammar は、CommonMark 相当の Markdown
parser が headings、bullet lists、tables、paragraphs を識別した後の段階から始まり
ます。生の indentation、line wrapping、inline Markdown formatting は Markdown の
責務であり、MarkVSpec の意味は heading level、section title、list item text、list
nesting から読み取ります。

このページは \`packages/core/src/grammar-definition.ts\` から生成されます。手編集
ではなく、grammar definition を更新して再生成します。`
    : `This page defines the canonical MarkVSpec grammar used as the reference for
parser, validator, diagnostics, documentation, and examples.

MarkVSpec is Markdown-first. The grammar below starts after a CommonMark-style
Markdown parser has already identified headings, bullet lists, tables, and
paragraphs. Raw indentation, line wrapping, and inline Markdown formatting are
Markdown concerns; MarkVSpec semantics are derived from the resulting heading
levels, section titles, list item text, and nesting.

This page is generated from \`packages/core/src/grammar-definition.ts\`. Do not
hand-edit it; update the grammar definition and regenerate the docs.`;
}

function notation(ja) {
  return ja
    ? `このページの production はすべて EBNF で書きます。

- \`=\` は production の定義です。
- \`;\` は production の終端です。
- \`"literal"\` は Markdown block parsing 後の正確な文字列です。
- \`|\` は alternative です。
- \`[ x ]\` は optional です。
- \`{ x }\` は zero or more repetitions です。
- parentheses は alternatives の grouping です。

\`inline_text\` や \`prose_line\` のような token は natural-language token です。
文字単位の lexer ではなく、Markdown block parsing と後述の semantic rules によって
境界づけます。`
    : `All productions on this page use EBNF:

- \`=\` defines a production.
- \`;\` ends a production.
- \`"literal"\` is exact source text after Markdown block parsing.
- \`|\` separates alternatives.
- \`[ x ]\` means optional.
- \`{ x }\` means zero or more repetitions.
- Parentheses group alternatives.

Tokens such as \`inline_text\` and \`prose_line\` are natural-language tokens.
They are intentionally bounded by Markdown block parsing and the semantic rules
below, rather than by a character-level lexer.`;
}

function itemTable(items, ja) {
  const rows = items.map((item) => `| \`${item.key}\` | ${item.classification} | ${item.represented ? "yes" : "no"} | ${item.diagnosticSeverity ?? "-"} | ${item.description[ja ? "ja" : "en"]} |`);
  return `${ja ? "| item | classification | output | diagnostic | 説明 |" : "| Item | Classification | Output | Diagnostic | Description |"}
| --- | --- | --- | --- | --- |
${rows.join("\n")}`;
}

function keyList(keys) {
  return keys.map((key) => `- \`${key}\``).join("\n");
}

function nonCanonicalList(ja) {
  const lines = actionTopLevelItemDefinitions.concat(actionProcessDetailItemDefinitions)
    .filter((item) => item.classification === "non-canonical")
    .map((item) => `- \`${item.key}\`: ${item.description[ja ? "ja" : "en"]}`);
  const extra = ja
    ? [
      "- `server:` 配下の `POST /login` のような HTTP method/path entry。これは `request:` 配下に書きます。",
      "- authored DSL 内の raw htmx attributes、CSS selectors、raw colors、widths、heights、classes、implementation-level styling。"
    ]
    : [
      "- HTTP method/path entries such as `POST /login` under `server:`. Put them under `request:`.",
      "- Raw htmx attributes, CSS selectors, raw colors, widths, heights, classes, and implementation-level styling in authored DSL."
    ];
  return ja
    ? `以下は diagnostics または compatibility のために認識されるだけで、canonical grammar ではありません。\n\n${lines.concat(extra).join("\n")}`
    : `The following forms are recognized only for diagnostics or compatibility and are not canonical grammar:\n\n${lines.concat(extra).join("\n")}`;
}

function semanticConstraints(ja) {
  const lines = ja
    ? [
      "1 document は 1 screen を表します。",
      "`*` で initial state として mark できる state は 1 つだけです。",
      "参照される `E-*`, `L-*`, `A-*`, `R-*`, `V-*`, `ERR-*`, `SCR-*` ID は、関連する document set 内に存在しているべきです。",
      "`Heading` は `level: 1` から `level: 6` を使います。",
      "`variant` は priority です。値は `primary`, `secondary`, `tertiary` です。",
      "`tone` は semantic intent です。値は `neutral`, `info`, `success`, `warning`, `danger` です。",
      "`display` と `update` は user-visible result と partial replacement semantics を表します。raw framework attributes ではありません。",
      "View Context definition は `boolean` または `enum` に限定します。",
      "`server:` は HTTP request を表しません。HTTP request は `request:` で表します。"
    ]
    : [
      "One document represents one screen.",
      "Only one state may be marked as initial with `*`.",
      "Referenced `E-*`, `L-*`, `A-*`, `R-*`, `V-*`, `ERR-*`, and `SCR-*` IDs should exist in the related document set.",
      "`Heading` uses `level: 1` through `level: 6`.",
      "`variant` is priority: `primary`, `secondary`, or `tertiary`.",
      "`tone` is semantic intent: `neutral`, `info`, `success`, `warning`, or `danger`.",
      "`display` and `update` describe user-visible results and partial replacement semantics, not raw framework attributes.",
      "View Context definitions are limited to `boolean` or `enum`.",
      "`server:` does not represent an HTTP request. HTTP requests are written under `request:`."
    ];
  return `${ja ? "以下の制約は EBNF body の外に置きます。" : "These constraints are intentionally outside the EBNF body:"}\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function snake(value) {
  return value.replace(/[A-Z]/g, (char, index) => `${index === 0 ? "" : "_"}${char.toLowerCase()}`);
}
