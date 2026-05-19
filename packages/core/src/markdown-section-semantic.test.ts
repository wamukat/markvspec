import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownDocument } from "./markdown-document.js";
import { collectSectionAst } from "./markdown-section-ast.js";
import { parseActionSectionSemantics, parseElementSectionSemantics, parseLayoutSectionSemantics, parseSmallSectionSemantics } from "./markdown-section-semantic.js";
import { parseMarkVSpec } from "./index.js";
import type { MarkVSpecDiagnostic } from "./types.js";

test("collects SectionAst and BlockAst without changing parser output", () => {
  const source = `---
id: SCR-AST
type: screen
title: AST Test
---

# SCR-AST AST Test

## States

- idle*
  - Initial state

## Layout: mobile

### main:L-001 Page

- stack

#### Items

- "Name": E-001

## Elements

### E-001 Select*

- label: Name
- options:
  - Active
  - Inactive

## Form Groups

### F-001 Search form

- fields:
  - E-001

## Notes

Free-form note.

\`\`\`txt
code block
\`\`\`
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const sections = collectSectionAst(document);

  assert.deepEqual(diagnostics, []);
  assert.deepEqual(sections.map((section) => [section.id, section.kind, section.title]), [
    ["section:States", "States", "States"],
    ["section:Layout:mobile", "Layout", "Layout: mobile"],
    ["section:Elements", "Elements", "Elements"],
    ["section:FormGroups", "FormGroups", "Form Groups"],
    [`section:${lineNumber(source, "## Notes")}:Notes`, "Unknown", "Notes"]
  ]);

  const states = sections[0];
  assert.equal(states.range.start.line, lineNumber(source, "## States"));
  assert.equal(states.range.end.line, lineNumber(source, "  - Initial state"));
  assert.equal(states.blocks[0].type, "list");
  assert.equal(states.blocks[0].children[0].type, "listItem");
  assert.equal(states.blocks[0].children[0].text, "idle*");
  assert.equal(states.blocks[0].children[0].children[1].type, "list");

  const layout = sections[1];
  assert.equal(layout.viewport, "mobile");
  assert.deepEqual(layout.blocks.map((block) => block.type), ["heading", "list", "heading", "list"]);

  const notes = sections[4];
  assert.deepEqual(notes.blocks.map((block) => block.type), ["paragraph", "code"]);
  assert.equal(notes.blocks[0].text, "Free-form note.");
  assert.equal(notes.blocks[1].text, "code block");

  const parseResult = parseMarkVSpec(source);
  assert.deepEqual(parseResult.diagnostics, []);
  assert.deepEqual(parseResult.states.map((state) => state.name), ["idle"]);
  assert.deepEqual(parseResult.layoutGroups.map((group) => group.id), ["L-001"]);
  assert.deepEqual(parseResult.layoutGroups.map((group) => group.name), ["Page"]);
  assert.deepEqual(parseResult.elements.map((element) => element.id), ["E-001"]);
  assert.deepEqual(parseResult.formGroups.map((formGroup) => formGroup.id), ["F-001"]);
});

test("collects unique section IDs and pipe table blocks", () => {
  const source = `---
id: SCR-AST-TABLE
type: screen
title: AST Table
---

# SCR-AST-TABLE AST Table

## Model Samples

### idle

#### users

| id | name |
| --- | --- |
| 1 | Alice |

## Model Samples

### loaded

#### users

| id | name |
| --- | --- |
| 2 | Bob |
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const sections = collectSectionAst(document);

  assert.deepEqual(diagnostics, []);
  assert.deepEqual(sections.map((section) => section.id), ["section:ModelSamples", "section:ModelSamples:2"]);

  const firstTable = sections[0].blocks.find((block) => block.type === "table");
  assert.ok(firstTable);
  assert.deepEqual(firstTable.rows, [
    ["id", "name"],
    ["1", "Alice"]
  ]);
  assert.equal(firstTable.range?.start.line, lineNumber(source, "| id | name |"));

  const secondTable = sections[1].blocks.find((block) => block.type === "table");
  assert.ok(secondTable);
  assert.deepEqual(secondTable.rows, [
    ["id", "name"],
    ["2", "Bob"]
  ]);
});

test("parses small sections through AST semantics compatibly", () => {
  const source = `---
id: SCR-SMALL-AST
type: screen
title: Small AST
---

# SCR-SMALL-AST Small AST

## States

- idle*
  - Ready to edit.
- invalid
  - Validation failed.

## Form Groups

### F1:F-ProfileForm Profile form

- fields:
  - E-Name
  - E-Status, E-Role、E-Region
- submit: A-Save

## Model Samples

### idle

#### user

| id | name |
| --- | --- |
| 1 | Alice |

## Validations

### V-REQUIRED Required fields

- target: E-Name
- message: Name is required.

## Business Rules

### spec:R-AUTH

- Authenticated users can edit.

## History Fields

- date
  label: Date
  required: true
  type: date

- author
  label: Author
  required: true
  type: string

- ticket
  label: Ticket
  required: false
  type: string

## History

### ver 1.0

- date: 2026-05-13
- author: Alice
- ticket: MM-1

Initial draft.

## Notes

Free-form note.

## Custom Section

Custom detail.
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseSmallSectionSemantics(document);

  assert.deepEqual(diagnostics, []);
  assert.deepEqual(astResult.states, [
    {
      name: "idle",
      initial: true,
      message: "Ready to edit.",
      location: { line: lineNumber(source, "- idle*") },
      raw: "idle*"
    },
    {
      name: "invalid",
      initial: false,
      message: "Validation failed.",
      location: { line: lineNumber(source, "- invalid") },
      raw: "invalid"
    }
  ]);
  assert.deepEqual(astResult.modelSamples, []);
  assert(astResult.diagnostics.some((diagnostic) =>
    diagnostic.message === "## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead."
  ));
  assert.deepEqual(astResult.formGroups, [
    {
      id: "F-ProfileForm",
      name: "Profile form",
      fields: [
        {
          elementId: "E-Name",
          location: { line: lineNumber(source, "  - E-Name") },
          raw: "E-Name"
        },
        {
          elementId: "E-Status",
          location: { line: lineNumber(source, "  - E-Status, E-Role、E-Region") },
          raw: "E-Status"
        },
        {
          elementId: "E-Role",
          location: { line: lineNumber(source, "  - E-Status, E-Role、E-Region") },
          raw: "E-Role"
        },
        {
          elementId: "E-Region",
          location: { line: lineNumber(source, "  - E-Status, E-Role、E-Region") },
          raw: "E-Region"
        }
      ],
      submit: {
        actionId: "A-Save",
        location: { line: lineNumber(source, "- submit: A-Save") },
        raw: "submit: A-Save"
      },
      properties: {
        marker: "F1",
        fields: "",
        submit: "A-Save"
      },
      propertyLocations: {
        marker: [{ line: lineNumber(source, "### F1:F-ProfileForm Profile form") }],
        fields: [{ line: lineNumber(source, "- fields:") }],
        submit: [{ line: lineNumber(source, "- submit: A-Save") }]
      },
      bullets: [
        { text: "fields:", location: { line: lineNumber(source, "- fields:") } },
        { text: "submit: A-Save", location: { line: lineNumber(source, "- submit: A-Save") } }
      ],
      location: { line: lineNumber(source, "### F1:F-ProfileForm Profile form") }
    }
  ]);
  assert.deepEqual(astResult.validations, [
    {
      id: "V-REQUIRED",
      name: "Required fields",
      bullets: [
        { text: "target: E-Name", location: { line: lineNumber(source, "- target: E-Name") } },
        { text: "message: Name is required.", location: { line: lineNumber(source, "- message: Name is required.") } }
      ],
      rules: [],
      properties: { target: "E-Name", message: "Name is required." },
      propertyLocations: {
        target: [{ line: lineNumber(source, "- target: E-Name") }],
        message: [{ line: lineNumber(source, "- message: Name is required.") }]
      },
      location: { line: lineNumber(source, "### V-REQUIRED Required fields") }
    }
  ]);
  assert.deepEqual(astResult.rules, [
    {
      id: "R-AUTH",
      name: undefined,
      bodyLines: [
        "- Authenticated users can edit."
      ],
      bullets: [
        { text: "Authenticated users can edit.", location: { line: lineNumber(source, "- Authenticated users can edit.") } }
      ],
      properties: { marker: "spec" },
      propertyLocations: { marker: [{ line: lineNumber(source, "### spec:R-AUTH") }] },
      location: { line: lineNumber(source, "### spec:R-AUTH") }
    }
  ]);
  assert.deepEqual(astResult.historyFields, [
    {
      key: "date",
      label: "Date",
      required: true,
      type: "date",
      rawType: "date",
      location: { line: lineNumber(source, "- date") },
      raw: "- date"
    },
    {
      key: "author",
      label: "Author",
      required: true,
      type: "string",
      rawType: "string",
      location: { line: lineNumber(source, "- author") },
      raw: "- author"
    },
    {
      key: "ticket",
      label: "Ticket",
      required: false,
      type: "string",
      rawType: "string",
      location: { line: lineNumber(source, "- ticket") },
      raw: "- ticket"
    }
  ]);
  assert.deepEqual(astResult.historyEntries, [
    {
      version: "ver 1.0",
      fields: {
        date: "2026-05-13",
        author: "Alice",
        ticket: "MM-1"
      },
      fieldLocations: {
        date: [{ line: lineNumber(source, "- date: 2026-05-13") }],
        author: [{ line: lineNumber(source, "- author: Alice") }],
        ticket: [{ line: lineNumber(source, "- ticket: MM-1") }]
      },
      bodyLines: ["Initial draft."],
      location: { line: lineNumber(source, "### ver 1.0") },
      raw: "### ver 1.0\n- date: 2026-05-13\n- author: Alice\n- ticket: MM-1\nInitial draft.\n"
    }
  ]);
  assert.deepEqual(astResult.notes, [
    {
      title: "Notes",
      line: lineNumber(source, "## Notes"),
      lines: ["", "Free-form note.", ""]
    },
    {
      title: "Custom Section",
      line: lineNumber(source, "## Custom Section"),
      lines: ["", "Custom detail.", ""]
    }
  ]);
  assert.deepEqual(astResult.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]), [
    [
      "warning",
      "## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead.",
      lineNumber(source, "## Model Samples")
    ]
  ]);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.sectionId, result.renderKeys]), [
    ["section:States", ["states:list"]],
    ["section:FormGroups", ["form-groups:list"]],
    ["section:ModelSamples", ["unsupported:model-samples"]],
    ["section:Validations", ["validations:list"]],
    ["section:BusinessRules", ["rules:list"]],
    ["section:HistoryFields", ["history-fields:list"]],
    ["section:History", ["history:list"]],
    [`section:${lineNumber(source, "## Notes")}:Notes`, [`notes:section:${lineNumber(source, "## Notes")}:Notes`]],
    [`section:${lineNumber(source, "## Custom Section")}:Custom-Section`, [`notes:section:${lineNumber(source, "## Custom Section")}:Custom-Section`]]
  ]);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.sectionId, result.payload.type]), [
    ["section:States", "states"],
    ["section:FormGroups", "formGroups"],
    ["section:ModelSamples", "modelSamples"],
    ["section:Validations", "validations"],
    ["section:BusinessRules", "rules"],
    ["section:HistoryFields", "historyFields"],
    ["section:History", "historyEntries"],
    [`section:${lineNumber(source, "## Notes")}:Notes`, "notes"],
    [`section:${lineNumber(source, "## Custom Section")}:Custom-Section`, "notes"]
  ]);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.metadata.sectionId, result.metadata.kind, result.metadata.renderKeys]), [
    ["section:States", "States", ["states:list"]],
    ["section:FormGroups", "FormGroups", ["form-groups:list"]],
    ["section:ModelSamples", "ModelSamples", ["unsupported:model-samples"]],
    ["section:Validations", "Validations", ["validations:list"]],
    ["section:BusinessRules", "BusinessRules", ["rules:list"]],
    ["section:HistoryFields", "HistoryFields", ["history-fields:list"]],
    ["section:History", "History", ["history:list"]],
    [`section:${lineNumber(source, "## Notes")}:Notes`, "Unknown", [`notes:section:${lineNumber(source, "## Notes")}:Notes`]],
    [`section:${lineNumber(source, "## Custom Section")}:Custom-Section`, "Unknown", [`notes:section:${lineNumber(source, "## Custom Section")}:Custom-Section`]]
  ]);
  const statesSection = astResult.sectionResults.find((result) => result.payload.type === "states");
  assert.equal(statesSection?.payload.type, "states");
  assert.deepEqual(statesSection.payload.states.map((state) => state.name), ["idle", "invalid"]);
  assert.deepEqual(statesSection.states.map((state) => state.name), ["idle", "invalid"]);
  const formGroupsSection = astResult.sectionResults.find((result) => result.payload.type === "formGroups");
  assert.equal(formGroupsSection?.payload.type, "formGroups");
  assert.deepEqual(formGroupsSection.payload.formGroups.map((formGroup) => formGroup.id), ["F-ProfileForm"]);
  assert.deepEqual(formGroupsSection.formGroups.map((formGroup) => formGroup.id), ["F-ProfileForm"]);
  assert.deepEqual(astResult.sectionResults.flatMap((result) => result.dependencies).map((dependency) => [dependency.source, dependency.target, dependency.kind]), [
    [{ type: "section", id: "section:States" }, { type: "render", id: "states:list" }, "renders"],
    [{ type: "section", id: "section:FormGroups" }, { type: "render", id: "form-groups:list" }, "renders"],
    [{ type: "entity", id: "F-ProfileForm" }, { type: "entity", id: "E-Name" }, "references"],
    [{ type: "entity", id: "F-ProfileForm" }, { type: "entity", id: "E-Status" }, "references"],
    [{ type: "entity", id: "F-ProfileForm" }, { type: "entity", id: "E-Role" }, "references"],
    [{ type: "entity", id: "F-ProfileForm" }, { type: "entity", id: "E-Region" }, "references"],
    [{ type: "entity", id: "F-ProfileForm" }, { type: "entity", id: "A-Save" }, "references"],
    [{ type: "section", id: "section:ModelSamples" }, { type: "render", id: "unsupported:model-samples" }, "renders"],
    [{ type: "section", id: "section:Validations" }, { type: "render", id: "validations:list" }, "renders"],
    [{ type: "entity", id: "V-REQUIRED" }, { type: "entity", id: "E-Name" }, "references"],
    [{ type: "section", id: "section:BusinessRules" }, { type: "render", id: "rules:list" }, "renders"],
    [{ type: "section", id: "section:HistoryFields" }, { type: "render", id: "history-fields:list" }, "renders"],
    [{ type: "section", id: "section:History" }, { type: "render", id: "history:list" }, "renders"],
    [{ type: "section", id: `section:${lineNumber(source, "## Notes")}:Notes` }, { type: "render", id: `notes:section:${lineNumber(source, "## Notes")}:Notes` }, "renders"],
    [{ type: "section", id: `section:${lineNumber(source, "## Custom Section")}:Custom-Section` }, { type: "render", id: `notes:section:${lineNumber(source, "## Custom Section")}:Custom-Section` }, "renders"]
  ]);
});

test("validates history metadata with standard and custom fields", () => {
  const source = `---
id: SCR-HISTORY
type: screen
title: History
---

# SCR-HISTORY History

## States

- idle*

## History Fields

- date
  label: Published
  required: true
  type: date

- ticket
  label: Ticket
  required: true
  type: string

- bad
  type: number

## History

### ver 1.0

- date: 2026-02-31
- author: Alice
- ticket: MM-1
- unknown: value

- Initial release.

### ver 1.1

- date: 2026-05-13
- author: Bob
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(result.historyEntries[0]?.version, "ver 1.0");
  assert.deepEqual(result.historyEntries[0]?.bodyLines, ["- Initial release."]);
  assert(messages.includes("History field bad type number is not recognized. Use string or date."));
  assert(messages.includes("History ver 1.0 field date must be a date in YYYY-MM-DD format."));
  assert(messages.includes("History ver 1.0 uses undefined field unknown."));
  assert(messages.includes("History ver 1.1 is missing required field ticket."));
});

test("reports small-section diagnostics from AST semantics", () => {
  const source = `---
id: SCR-SMALL-AST-DIAG
type: screen
title: Small AST Diagnostics
---

# SCR-SMALL-AST-DIAG Small AST Diagnostics

## States

  - Orphan description
- loa*ding

## Model Samples

#### user

| id |
| --- |
| 1 |
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseSmallSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);

  const expectedDiagnostics = [
    ["error", "State description has no parent state: Orphan description.", lineNumber(source, "  - Orphan description")],
    ["error", "State loa*ding uses * outside the end of the state name.", lineNumber(source, "- loa*ding")],
    ["warning", "## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead.", lineNumber(source, "## Model Samples")]
  ];
  assert.deepEqual(
    astResult.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    expectedDiagnostics
  );
  for (const expected of expectedDiagnostics) {
    assert.ok(
      parseResult.diagnostics.some((diagnostic) => diagnostic.severity === expected[0] && diagnostic.message === expected[1] && diagnostic.line === expected[2]),
      `missing parseMarkVSpec diagnostic ${expected.join(" | ")}`
    );
  }
});

test("preserves States section overview and notes separately from state descriptions", () => {
  const source = `---
id: SCR-STATE-PROSE
type: screen
title: State Prose
---

# SCR-STATE-PROSE State Prose

## States

This screen keeps authentication progress in state.

- idle*
- authenticating
- validation-error
  - Client-side validation has found missing or malformed input.
- auth-error

auth-error keeps the entered form values.

## Implementation Memo

Free-form section body.
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseSmallSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);

  assert.deepEqual(diagnostics, []);
  assert.deepEqual(astResult.diagnostics, []);
  assert.deepEqual(astResult.states.map((state) => [state.name, state.message ?? ""]), [
    ["idle", ""],
    ["authenticating", ""],
    ["validation-error", "Client-side validation has found missing or malformed input."],
    ["auth-error", ""]
  ]);
  assert.deepEqual(astResult.sectionProse, [
    {
      sectionId: "section:States",
      title: "States",
      kind: "States",
      overview: ["This screen keeps authentication progress in state."],
      notes: ["auth-error keeps the entered form values."],
      location: { line: lineNumber(source, "## States") },
      renderKeys: ["states:list"]
    }
  ]);
  assert.deepEqual(parseResult.sectionProse, astResult.sectionProse);
  assert.deepEqual(parseResult.notes, [
    {
      title: "Implementation Memo",
      line: lineNumber(source, "## Implementation Memo"),
      lines: ["", "Free-form section body.", ""]
    }
  ]);
});

test("parses pre-initial States suffixes and validates conflicting suffix markers", () => {
  const source = `---
id: SCR-PRE-INITIAL-STATES
type: screen
title: Pre Initial States
---

# SCR-PRE-INITIAL-STATES Pre Initial States

## States

- before-load+
- initializing*
- invalid+*
- lo+ading
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.states.map((state) => [state.name, state.initial, state.preInitial]), [
    ["before-load", false, true],
    ["initializing", true, undefined],
    ["invalid", true, true],
    ["lo+ading", false, undefined]
  ]);
  assert.ok(result.diagnostics.some((diagnostic) =>
    diagnostic.severity === "error" &&
    diagnostic.message === "State invalid+* cannot be marked both pre-initial and initial." &&
    diagnostic.line === lineNumber(source, "- invalid+*")
  ));
  assert.ok(result.diagnostics.some((diagnostic) =>
    diagnostic.severity === "error" &&
    diagnostic.message === "State lo+ading uses + outside the end of the state name." &&
    diagnostic.line === lineNumber(source, "- lo+ading")
  ));
});

test("parses layout sections through BlockAst traversal semantics", () => {
  const source = `---
id: SCR-LAYOUT-AST
type: screen
title: Layout AST
references:
  partials:
    PRT-NOTICE-LIST: ../partials/notice-list.vspec.md
---

# SCR-LAYOUT-AST Layout AST

## Layout: mobile

### main:L-Page Page

- stack
- partial:
  - id: PRT-NOTICE-LIST
  - states:
    - idle: loaded

#### Items

- "Name": E-Name
- L-Child
- slot: content

### L-Child Child

- row

## Slot: content

### L-Content Content

- stack

#### Items

- E-Title

## Slots

### content Main Content

- purpose: Page-specific content.
- required
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseLayoutSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const page = astResult.layoutGroups.find((group) => group.id === "L-Page");
  const slotContent = astResult.slotContents[0];

  assert.deepEqual(diagnostics, []);
  assert.equal(page?.viewport, "mobile");
  assert.equal(page?.kind, "stack");
  assert.equal(page?.properties["marker"], "main");
  assert.deepEqual(page?.partial?.states, { idle: "loaded" });
  assert.deepEqual(page?.items.map((item) => item.type), ["flag", "property", "property", "property", "property", "field", "contains", "slot"]);
  assert.equal(slotContent?.name, "content");
  assert.equal(slotContent?.viewport, undefined);
  assert.equal(slotContent?.layoutGroups[0]?.id, "L-Content");
  assert.deepEqual(astResult.slotDefinitions, [
    {
      name: "content",
      title: "Main Content",
      properties: {
        purpose: "Page-specific content.",
        required: true
      },
      propertyLocations: {
        purpose: [{ line: lineNumber(source, "- purpose: Page-specific content.") }],
        required: [{ line: lineNumber(source, "- required") }]
      },
      location: { line: lineNumber(source, "### content Main Content") }
    }
  ]);
  assert.deepEqual(parseResult.layoutGroups, astResult.layoutGroups);
  assert.deepEqual(parseResult.slotContents, astResult.slotContents);
  assert.deepEqual(parseResult.slotDefinitions, astResult.slotDefinitions);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.sectionId, result.renderKeys]), [
    ["section:Layout:mobile", ["layout:mobile:L-Page", "layout:mobile:L-Child"]],
    ["section:Slot:content", ["slot-content:content:default:L-Content", "slot:content"]],
    ["section:Slots", ["slots:list", "slot-definition:content"]]
  ]);
  assert.deepEqual(astResult.sectionResults.flatMap((result) => result.dependencies).map((dependency) => [dependency.source, dependency.target, dependency.kind]), [
    [{ type: "section", id: "section:Layout:mobile" }, { type: "render", id: "layout:mobile:L-Page" }, "renders"],
    [{ type: "entity", id: "L-Page" }, { type: "entity", id: "PRT-NOTICE-LIST" }, "references"],
    [{ type: "entity", id: "L-Page" }, { type: "entity", id: "E-Name" }, "references"],
    [{ type: "entity", id: "L-Page" }, { type: "entity", id: "L-Child" }, "references"],
    [{ type: "entity", id: "L-Page" }, { type: "entity", id: "slot:content" }, "references"],
    [{ type: "section", id: "section:Layout:mobile" }, { type: "render", id: "layout:mobile:L-Child" }, "renders"],
    [{ type: "section", id: "section:Slot:content" }, { type: "render", id: "slot-content:content:default:L-Content" }, "renders"],
    [{ type: "entity", id: "L-Content" }, { type: "entity", id: "E-Title" }, "references"],
    [{ type: "section", id: "section:Slots" }, { type: "render", id: "slots:list" }, "renders"],
    [{ type: "section", id: "section:Slots" }, { type: "entity", id: "slot:content" }, "derives"],
    [{ type: "section", id: "section:Slots" }, { type: "render", id: "slot-definition:content" }, "renders"]
  ]);
});

test("reports layout diagnostics from AST semantics", () => {
  const source = `---
id: SCR-LAYOUT-AST-DIAG
type: screen
title: Layout AST Diagnostics
---

# SCR-LAYOUT-AST-DIAG Layout AST Diagnostics

## Layout:

### L-Ignored Ignored

- stack

## Layout: mobile

### Invalid

### L-Repeat Repeat

- stack

#### Repeat

- source: \${model.items}

## Slot:

### L-SlotContent Slot Content
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseLayoutSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const expectedDiagnostics = [
    ["warning", "Layout section must specify a viewport, for example ## Layout: mobile.", lineNumber(source, "## Layout:")],
    ["warning", "Layout group is ignored because its Layout section has no viewport.", lineNumber(source, "### L-Ignored Ignored")],
    [
      "warning",
      "Malformed Layout heading. Expected ### [<marker>:]L-* [name] or ### P-* [name].",
      lineNumber(source, "### Invalid"),
    ],
    ["error", "Layout L-Repeat uses removed Repeat subsection. Use Element sample rows or Preview Scenario samples instead.", lineNumber(source, "#### Repeat")],
    ["warning", "Slot section must specify a slot name, for example ## Slot: content.", lineNumber(source, "## Slot:")],
    ["warning", "Slot layout group is ignored because its Slot section has no name.", lineNumber(source, "### L-SlotContent Slot Content")]
  ];

  assert.deepEqual(
    astResult.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    expectedDiagnostics
  );
  for (const expected of expectedDiagnostics) {
    assert.ok(
      parseResult.diagnostics.some((diagnostic) => diagnostic.severity === expected[0] && diagnostic.message === expected[1] && diagnostic.line === expected[2]),
      `missing parseMarkVSpec diagnostic ${expected.join(" | ")}`
    );
  }
});

test("parses elements through BlockAst traversal semantics", () => {
  const source = `---
id: SCR-ELEMENT-AST
type: screen
title: Element AST
---

# SCR-ELEMENT-AST Element AST

## Elements

### form:E-氏名入力 Input*

- label: Name
- value: \${model.name}
- initial value: "Alice"
- visible when: idle
- validation: V-NameRequired
- params:
  - noticeId: E-お知らせリンク.id

### E-ロール選択 Select

- options:
  - Viewer: viewer
  - Admin: admin

### E-Users Table

- Columns:
  - Name: \${model.name}
  - Role: \${model.role}
- Sample Rows:
  - Row
    - Name: Alice
    - Role: Admin
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseElementSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const [input, select, table] = astResult.elements;

  assert.deepEqual(diagnostics, []);
  assert.equal(input?.id, "E-氏名入力");
  assert.equal(input?.type, "Input");
  assert.equal(input?.properties["marker"], "form");
  assert.equal(input?.properties["required"], true);
  assert.equal(input?.properties["value"], "\${model.name}");
  assert.equal(input?.properties["initial value"], "Alice");
  assert.deepEqual(input?.propertyLocations, {
    marker: [{ line: lineNumber(source, "### form:E-氏名入力 Input*") }],
    required: [{ line: lineNumber(source, "### form:E-氏名入力 Input*") }],
    label: [{ line: lineNumber(source, "- label: Name") }],
    "initial value": [{ line: lineNumber(source, '- initial value: "Alice"') }],
    value: [{ line: lineNumber(source, "- value: \${model.name}") }],
    "visible when": [{ line: lineNumber(source, "- visible when: idle") }],
    validation: [{ line: lineNumber(source, "- validation: V-NameRequired") }],
    "route param noticeId": [{ line: lineNumber(source, "  - noticeId: E-お知らせリンク.id") }]
  });
  assert.deepEqual(input?.visibleWhen, ["idle"]);
  assert.deepEqual(input?.validations, ["V-NameRequired"]);
  assert.deepEqual(input?.routeParams, [
    { name: "noticeId", source: "E-お知らせリンク.id", location: { line: lineNumber(source, "  - noticeId: E-お知らせリンク.id") } }
  ]);
  assert.deepEqual(select?.selectOptions, [
    { label: "Viewer", source: "viewer", location: { line: lineNumber(source, "  - Viewer: viewer") }, raw: "Viewer: viewer" },
    { label: "Admin", source: "admin", location: { line: lineNumber(source, "  - Admin: admin") }, raw: "Admin: admin" }
  ]);
  assert.deepEqual(table?.tableColumns, [
    { label: "Name", source: "\${model.name}", location: { line: lineNumber(source, "  - Name: \${model.name}") }, raw: "Name: \${model.name}" },
    { label: "Role", source: "\${model.role}", location: { line: lineNumber(source, "  - Role: \${model.role}") }, raw: "Role: \${model.role}" }
  ]);
  assert.deepEqual(table?.tableRows, [
    {
      cells: [
        { column: "Name", value: "Alice", location: { line: lineNumber(source, "    - Name: Alice") }, raw: "Name: Alice" },
        { column: "Role", value: "Admin", location: { line: lineNumber(source, "    - Role: Admin") }, raw: "Role: Admin" }
      ],
      location: { line: lineNumber(source, "  - Row") },
      raw: "Row"
    }
  ]);
  assert.deepEqual(parseResult.elements, astResult.elements);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.sectionId, result.renderKeys]), [
    ["section:Elements", ["elements:list", "element:E-氏名入力", "element:E-ロール選択", "element:E-Users"]]
  ]);
  assert.deepEqual(astResult.sectionResults.flatMap((result) => result.dependencies).map((dependency) => [dependency.source, dependency.target, dependency.kind]), [
    [{ type: "section", id: "section:Elements" }, { type: "render", id: "elements:list" }, "renders"],
    [{ type: "section", id: "section:Elements" }, { type: "render", id: "element:E-氏名入力" }, "renders"],
    [{ type: "entity", id: "E-氏名入力" }, { type: "entity", id: "idle" }, "references"],
    [{ type: "entity", id: "E-氏名入力" }, { type: "entity", id: "V-NameRequired" }, "validates"],
    [{ type: "entity", id: "E-氏名入力" }, { type: "entity", id: "E-お知らせリンク.id" }, "references"],
    [{ type: "section", id: "section:Elements" }, { type: "render", id: "element:E-ロール選択" }, "renders"],
    [{ type: "section", id: "section:Elements" }, { type: "render", id: "element:E-Users" }, "renders"]
  ]);
});

test("reports element diagnostics from AST semantics", () => {
  const source = `---
id: SCR-ELEMENT-AST-DIAG
type: screen
title: Element AST Diagnostics
---

# SCR-ELEMENT-AST-DIAG Element AST Diagnostics

## Elements

### Message Text

### E-氏名入力 Input

- label: Name
  - unexpected child
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseElementSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const expectedDiagnostics = [
    ["warning", "Malformed Element heading. Expected ### [<marker>:]E-* <type>.", lineNumber(source, "### Message Text")],
    ["warning", "Element E-氏名入力 has indented property entry: unexpected child. Use an unindented list item.", lineNumber(source, "  - unexpected child")]
  ];

  assert.deepEqual(
    astResult.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    expectedDiagnostics
  );
  for (const expected of expectedDiagnostics) {
    assert.ok(
      parseResult.diagnostics.some((diagnostic) => diagnostic.severity === expected[0] && diagnostic.message === expected[1] && diagnostic.line === expected[2]),
      `missing parseMarkVSpec diagnostic ${expected.join(" | ")}`
    );
  }
});

test("parses actions through BlockAst traversal semantics", () => {
  const source = `---
id: SCR-ACTION-AST
type: screen
title: Action AST
---

# SCR-ACTION-AST Action AST

## Actions

### main:A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: HttpRequest
  - POST /login
    - email: E-メールアドレス入力.value
  - case: success
    - response: 2xx authenticated
    - params:
      - id: E-UserId.value
    - Effects
      - state: done
      - update:
        - target: L-Message
        - mode: replace
        - content: PRT-SUCCESS
  - case: failure
    - from: idle
    - Effects
      - state: error
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseActionSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const action = astResult.actions[0];

  assert.deepEqual(diagnostics, []);
  assert.equal(action?.id, "A-Submit");
  assert.equal(action?.name, "Submit");
  assert.equal(action?.properties["marker"], "main");
  assert.equal(action?.triggeredBy, "E-SubmitButton.click");
  assert.deepEqual(action?.trigger, { elementId: "E-SubmitButton", event: "click" });
  assert.deepEqual(action?.fromStates, ["idle"]);
  assert.deepEqual(action?.processSteps.map((step) => [step.name, step.details.map((detail) => [detail.key, detail.value])]), [
    ["HttpRequest", [["request", "POST /login"], ["email", "E-メールアドレス入力.value"]]]
  ]);
  assert.deepEqual(action?.responses, []);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["idle", "success", "done"],
    ["idle", "failure", "error"]
  ]);
  assert.deepEqual(action?.outcomes, []);
  assert.deepEqual(action?.processSteps[0]?.outcomes.map((outcome) => [outcome.result, outcome.target, outcome.mode, outcome.content]), [
    ["success", "L-Message", "replace", "PRT-SUCCESS"],
    ["failure", undefined, undefined, undefined]
  ]);
  assert.deepEqual(action?.processSteps[0]?.outcomes.find((outcome) => outcome.result === "success")?.routeParams, [
    { name: "id", source: "E-UserId.value", location: { line: lineNumber(source, "      - id: E-UserId.value") } }
  ]);
  assert.deepEqual(action?.propertyLocations["marker"], [{ line: lineNumber(source, "### main:A-Submit Submit") }]);
  assert.equal(action?.propertyLocations["request"], undefined);
  assert.equal(action?.propertyLocations["param email"], undefined);
  assert.deepEqual(action?.processSteps[0]?.propertyLocations["request"], [{ line: lineNumber(source, "  - POST /login") }]);
  assert.deepEqual(action?.processSteps[0]?.propertyLocations["email"], [{ line: lineNumber(source, "    - email: E-メールアドレス入力.value") }]);
  assert.deepEqual(parseResult.actions, astResult.actions);
  assert.deepEqual(astResult.sectionResults.map((result) => [result.sectionId, result.renderKeys]), [
    ["section:Actions", ["actions:list", "action:A-Submit"]]
  ]);
  assert.deepEqual(astResult.sectionResults.flatMap((result) => result.dependencies).map((dependency) => [dependency.source, dependency.target, dependency.kind]), [
    [{ type: "section", id: "section:Actions" }, { type: "render", id: "actions:list" }, "renders"],
    [{ type: "section", id: "section:Actions" }, { type: "render", id: "action:A-Submit" }, "renders"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "E-SubmitButton" }, "references"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "state:idle" }, "references"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "state:done" }, "derives"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "state:error" }, "derives"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "L-Message" }, "references"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "PRT-SUCCESS" }, "references"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "E-メールアドレス入力.value" }, "references"],
    [{ type: "entity", id: "A-Submit" }, { type: "entity", id: "E-UserId.value" }, "references"]
  ]);
});

test("reports action diagnostics from AST semantics", () => {
  const source = `---
id: SCR-ACTION-AST-DIAG
type: screen
title: Action AST Diagnostics
---

# SCR-ACTION-AST-DIAG Action AST Diagnostics

## Actions

### Submit without ID

### A-Submit Submit

- request: POST /login
  - E-メールアドレス入力.click
- Process: POST /login
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const astResult = parseActionSectionSemantics(document);
  const parseResult = parseMarkVSpec(source);
  const expectedDiagnostics = [
    ["warning", "Malformed Action heading. Expected ### [<marker>:]A-* <name>.", lineNumber(source, "### Submit without ID")],
    ["warning", "Action A-Submit has unsupported top-level entry: request: POST /login. Use From, Process P1: <name>, or Otherwise.", lineNumber(source, "- request: POST /login")],
    ["warning", "Action A-Submit has nested entry outside a recognized block: E-メールアドレス入力.click.", lineNumber(source, "  - E-メールアドレス入力.click")],
    ["warning", "Action A-Submit has malformed Process entry: POST /login. Put request lines under a marked process such as Process P1: Submit request.", lineNumber(source, "- Process: POST /login")]
  ];

  assert.deepEqual(
    astResult.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    expectedDiagnostics
  );
  for (const expected of expectedDiagnostics) {
    assert.ok(
      parseResult.diagnostics.some((diagnostic) => diagnostic.severity === expected[0] && diagnostic.message === expected[1] && diagnostic.line === expected[2]),
      `missing parseMarkVSpec diagnostic ${expected.join(" | ")}`
    );
  }
});
function lineNumber(source: string, needle: string, occurrence = 1): number {
  let matches = 0;
  const index = source.split(/\r?\n/).findIndex((line) => {
    if (line !== needle) {
      return false;
    }

    matches += 1;
    return matches === occurrence;
  });
  assert.notEqual(index, -1);
  return index + 1;
}
