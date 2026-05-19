import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { parseMarkdownDocument } from "./markdown-document.js";
import { collectSectionAst } from "./markdown-section-ast.js";
import { parseActionSectionSemantics, parseElementSectionSemantics, parseLayoutSectionSemantics, parseSmallSectionSemantics } from "./markdown-section-semantic.js";
import { buildDisplayContentSpecRows } from "./display-content-spec.js";
import { sourcePathKey } from "./model-paths.js";
import { parseProjectDocumentSemantics } from "./project-parser.js";
import type { MarkVSpecDiagnostic } from "./types.js";
import * as coreApi from "./index.js";
import {
  affectedProjectScreenPathsForDocumentChange,
  actionAppliesToState,
  buildProjectTransitionGraph,
  buildStateScreenReadModels,
  composeMarkVSpecTemplate,
  computeMarkVSpecRenderInvalidation,
  diagnoseAiDesignInputDocument,
  evaluateMarkVSpecDiagnostics,
  isProjectReferenceAllowed,
  latestHistoryBasicInfo,
  loadMarkVSpecProject,
  modelValuesForState,
  parseMarkVSpec,
  parseMarkVSpecProject,
  buildMarkVSpecDocumentComposition,
  documentCompositionItemIds,
  stateViewLayoutSignature,
  STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS,
  resolveDocumentCompositionLayoutsForViewport,
  resolveLayoutGroupsForViewport,
  renderMarkVSpecHtmlFragment,
  renderMarkVSpecHtml,
  renderMarkVSpecHtmlWithInvalidation,
  renderDiagnosticMessageForLocale,
  renderProjectTransitionMermaid,
  resolveRendererMessages,
  resolveProjectPath,
  scenarioRouteValues,
  stateScreenElementGroups,
  stateScreenLayoutsForModel,
  supportedDiagnosticMessageCodes
} from "./index.js";

test("keeps internal State Views helpers out of the root API", () => {
  assert.equal("actionHasVisibleElementMarker" in coreApi, false);
  assert.equal("relevantActionIdsForState" in coreApi, false);
  assert.equal("stateScreenRenderedIdsFromReadModel" in coreApi, false);
});

function examplePath(relativePath: string): string {
  return resolve("../../examples", relativePath);
}

function listExampleVspecFiles(relativeDir = "."): string[] {
  const root = examplePath(relativeDir);
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".vspec.md")) {
      return [];
    }
    return [fullPath.slice(root.length + 1).split("\\").join("/")];
  });
  return walk(root).sort();
}

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

test("allows layout headings without duplicated display names", () => {
  const source = `---
id: SCR-LAYOUT-ID-ONLY
type: screen
title: Layout ID Only
---

# SCR-LAYOUT-ID-ONLY Layout ID Only

## States

- idle*

## Layout: mobile

### L-Page

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- label: Title
`;

  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.layoutGroups[0]?.id, "L-Page");
  assert.equal(result.layoutGroups[0]?.name, "");
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

test("limits State Views layout signatures to state-view-affecting properties in core", () => {
  assert.deepEqual([...STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS], [
    "active when",
    "align",
    "disabled when",
    "enabled when",
    "gap",
    "hidden when",
    "justify",
    "overlay",
    "selected when",
    "variant",
    "visible when"
  ]);

  const equivalentSource = `---
id: SCR-LAYOUT-SIGNATURE
type: screen
title: Layout Signature
---

# SCR-LAYOUT-SIGNATURE Layout Signature

## Layout: mobile

### L1:L-Page Page

- stack
- gap: md
- marker: M1
- description: mobile-only documentation

#### Items

- E-Title

## Layout: desktop

### L1:L-Page Page

- stack
- marker: M2
- description: desktop-only documentation
- gap: md

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Title
`;
  const equivalent = parseMarkVSpec(equivalentSource);
  assert.equal(
    stateViewLayoutSignature(equivalent, "L-Page", "mobile"),
    stateViewLayoutSignature(equivalent, "L-Page", "desktop")
  );

  const changedProperty = parseMarkVSpec(equivalentSource.replace("- description: desktop-only documentation\n- gap: md", "- description: desktop-only documentation\n- gap: lg"));
  assert.notEqual(
    stateViewLayoutSignature(changedProperty, "L-Page", "mobile"),
    stateViewLayoutSignature(changedProperty, "L-Page", "desktop")
  );

  const changedItems = parseMarkVSpec(equivalentSource.replace("- E-Title\n\n## Elements", "- E-Title\n- E-Subtitle\n\n## Elements"));
  assert.notEqual(
    stateViewLayoutSignature(changedItems, "L-Page", "mobile"),
    stateViewLayoutSignature(changedItems, "L-Page", "desktop")
  );

  const changedPartial = parseMarkVSpec(equivalentSource
    .replace("- description: mobile-only documentation", "- description: mobile-only documentation\n- partial:\n  - id: PRT-SUMMARY\n  - states:\n    - idle: loaded")
    .replace("- description: desktop-only documentation", "- description: desktop-only documentation\n- partial:\n  - id: PRT-DETAILS\n  - states:\n    - idle: loaded"));
  assert.notEqual(
    stateViewLayoutSignature(changedPartial, "L-Page", "mobile"),
    stateViewLayoutSignature(changedPartial, "L-Page", "desktop")
  );
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

test("resolves spec layouts by viewport, slot content, and document role", () => {
  const template = parseMarkVSpec(`---
id: TPL-SHELL
type: template
title: Shell
---

# TPL-SHELL Shell

## States

- idle*

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- slot: content
`);
  const screen = parseMarkVSpec(`---
id: SCR-SLOT-LAYOUTS
type: screen
title: Slot Layouts
---

# SCR-SLOT-LAYOUTS Slot Layouts

## States

- idle*

## Slot: content

### L-Shared Shared

- row

#### Items

- E-Name

## Slot: content: mobile

### L-Shared Shared Mobile

- stack

#### Items

- E-Name

## Slot: content: desktop

### L-Shell Screen Shell

- row

#### Items

- E-Name

## Elements

### E-Name Text

- sample: Alice
`);
  const composed = composeMarkVSpecTemplate(template, screen);

  assert.deepEqual(
    resolveLayoutGroupsForViewport(composed, {
      layoutIds: new Set(["L-Shell", "L-Shared"]),
      viewport: "mobile"
    }).map((layout) => [layout.id, layout.kind, layout.viewport ?? ""]),
    [["L-Shared", "stack", "mobile"]]
  );
  assert.deepEqual(
    resolveLayoutGroupsForViewport(composed, {
      layoutIds: new Set(["L-Shared"]),
      viewport: "desktop"
    }).map((layout) => [layout.id, layout.kind, layout.viewport ?? ""]),
    [["L-Shared", "row", ""]]
  );
  assert.deepEqual(
    resolveLayoutGroupsForViewport(composed, {
      layoutIds: new Set(["L-Shell"]),
      viewport: "mobile",
      includeTemplateLayouts: true
    }).map((layout) => [layout.id, layout.kind, layout.viewport ?? "", layout.documentRole ?? ""]),
    [["L-Shell", "stack", "mobile", "template"]]
  );
  assert.deepEqual(
    resolveLayoutGroupsForViewport(composed, {
      layoutIds: new Set(["L-Shell"]),
      viewport: "desktop",
      includeTemplateLayouts: true
    }).map((layout) => [layout.id, layout.kind, layout.viewport ?? "", layout.documentRole ?? ""]),
    [["L-Shell", "row", "desktop", ""]]
  );
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

test("reports duplicate viewport-scoped slot content", () => {
  const source = `---
id: SCR-DUPLICATE-SLOT
type: screen
title: Duplicate Slot
---

# SCR-DUPLICATE-SLOT Duplicate Slot

## States

- idle*

## Slot: content: mobile

### L-MobileOne Mobile One

- stack

## Slot: content: mobile

### L-MobileTwo Mobile Two

- stack

## Slot: content

### L-CommonOne Common One

- stack

## Slot: content

### L-CommonTwo Common Two

- stack
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Duplicate slot content for content in viewport mobile."));
  assert(messages.includes("Duplicate slot content for content."));
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

test("does not parse removed inline initial value syntax", () => {
  const source = `---
id: SCR-INLINE-INITIAL
type: screen
title: Inline Initial
---

# SCR-INLINE-INITIAL Inline Initial

## States

- idle*

## Elements

### E-EmailInput Input

- value: \${model.email}{"test@example.com"}
`;
  const result = parseMarkVSpec(source);
  const element = result.elements.find((item) => item.id === "E-EmailInput");

  assert.equal(element?.properties["value"], '\${model.email}{"test@example.com"}');
  assert.equal(element?.properties["initial value"], undefined);
  assert.deepEqual(result.diagnostics, []);
});

test("does not parse removed inline initial value syntax on extended form primitives", () => {
  const source = `---
id: SCR-EXTENDED-INLINE-INITIAL
type: screen
title: Extended Inline Initial
---

# SCR-EXTENDED-INLINE-INITIAL Extended Inline Initial

## States

- idle*

## Elements

### E-Notes Textarea

- value: \${model.notes}{Call before renewal.}

### E-Permissions MultiSelect

- value: \${model.permissions}{Manage users, Export reports}

### E-Notifications CheckboxGroup

- value: \${model.notifications}{Security alerts}

### E-EmailSwitch Switch

- value: \${model.emailNotifications}{true}

### E-DueDate DateInput

- value: \${model.dueDate}{2026-05-13}

### E-StartTime TimeInput

- value: \${model.startTime}{09:30}

### E-Headcount NumberInput

- value: \${model.headcount}{2}
`;
  const result = parseMarkVSpec(source);
  const byId = new Map(result.elements.map((element) => [element.id, element]));

  assert.equal(byId.get("E-Notes")?.properties["value"], "\${model.notes}{Call before renewal.}");
  assert.equal(byId.get("E-Notes")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-Permissions")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-Notifications")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-EmailSwitch")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-DueDate")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-StartTime")?.properties["initial value"], undefined);
  assert.equal(byId.get("E-Headcount")?.properties["initial value"], undefined);
  assert.deepEqual(result.diagnostics, []);
});

test("does not parse removed colonless element block starters", () => {
  const source = `---
id: SCR-COLONLESS-BLOCKS
type: screen
title: Colonless Blocks
---

# SCR-COLONLESS-BLOCKS Colonless Blocks

## States

- idle*

## Elements

### E-RoleSelect Select

- options
  - Viewer
  - Administrator
`;
  const result = parseMarkVSpec(source);
  const select = result.elements.find((item) => item.id === "E-RoleSelect");
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.deepEqual(select?.selectOptions, []);
  assert.equal(select?.properties["options"], true);
  assert(messages.includes("Element E-RoleSelect has indented property entry: Viewer. Use an unindented list item."));
  assert(messages.includes("Element E-RoleSelect has indented property entry: Administrator. Use an unindented list item."));
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

test("keeps each HttpRequest detail on its own process step", () => {
  const source = `---
id: SCR-MULTI-REQUEST
type: screen
title: Multi Request
---

# SCR-MULTI-REQUEST Multi Request

## Actions

### A-NextPage Next page

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process: PreparePage
  - Effects
    - view: \${view.selectedTab} = users
- Process: HttpRequest
  - GET /users
    - page: \${model.requestedPage}
- Process: HttpRequest
  - GET /roles
    - userId: \${model.userId}
`;
  const result = parseMarkVSpec(source);
  const action = result.actions[0];

  assert.deepEqual(action?.processSteps.map((step) => [step.name, step.details.map((detail) => [detail.key, detail.value])]), [
    ["PreparePage", []],
    ["HttpRequest", [["request", "GET /users"], ["page", "${model.requestedPage}"]]],
    ["HttpRequest", [["request", "GET /roles"], ["userId", "${model.userId}"]]]
  ]);
});

test("preserves entity-level supplemental notes", () => {
  const source = `---
id: SCR-ENTITY-NOTES
type: screen
title: Entity Notes
---

# SCR-ENTITY-NOTES Entity Notes

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

このレイアウトは初期リリースでは固定配置にする。

#### Items

- E-NextPageButton

## Elements

### E-NextPageButton Button

- label: Next

このボタンは二重クリック対策を実装側で行う。

## Actions

### A3:A-NextPage Next page

次ページへ移動するための一覧取得を開始する。

\`\`\`text
overview code block
\`\`\`

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process: HttpRequest
  - GET /users
    - page: \${model.requestedPage}
- Process P1: Submit request
  - case: success
    - Effects
      - state: loading

備考をこういうところに書きたいよね。
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.layoutGroups[0]?.notes, ["このレイアウトは初期リリースでは固定配置にする。"]);
  assert.deepEqual(result.elements[0]?.notes, ["このボタンは二重クリック対策を実装側で行う。"]);
  assert.deepEqual(result.actions[0]?.overview, ["次ページへ移動するための一覧取得を開始する。", "", "```text", "overview code block", "```"]);
  assert.deepEqual(result.actions[0]?.notes, ["備考をこういうところに書きたいよね。"]);
});

test("preserves markdown source in entity prose blocks", () => {
  const source = `---
id: SCR-MARKDOWN-PROSE
type: screen
title: Markdown Prose
---

# SCR-MARKDOWN-PROSE Markdown Prose

## States

- idle*

## Elements

### E-SubmitButton Button

- label: Submit

## Actions

### A-Submit Submit

Use **strong** text and [help](./help.md).

- first item
  - nested item
- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Submit request
  - Effects
    - state: idle

#### Additional note

![Diagram](./diagram.png)
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.actions[0]?.overview, [
    "Use **strong** text and [help](./help.md).",
    "",
    "- first item",
    "  - nested item"
  ]);
  assert.deepEqual(result.actions[0]?.notes, ["#### Additional note", "", "![Diagram](./diagram.png)"]);
  assert.equal(result.actions[0]?.triggeredBy, "E-SubmitButton.click");
  assert.deepEqual(result.actions[0]?.fromStates, ["idle"]);
  assert.deepEqual(result.diagnostics, []);
});

test("ignores standalone HTML comments in structured prose areas", () => {
  const source = `---
id: SCR-COMMENT-PROSE
type: screen
title: Comment Prose
---

# SCR-COMMENT-PROSE Comment Prose

## States

- idle*

## Elements

<!-- section overview hidden -->

Elements overview stays visible.

### E-SubmitButton Button

- label: Submit

### Section Notes

<!--
section notes hidden
-->

Elements section notes stay visible.

## Actions

### A-Submit Submit

<!-- action overview hidden -->

<!--
multi-line hidden action note
-->

Visible action overview <!-- inline comment remains visible source -->.

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Submit request
  - Effects
    - state: idle

<div>non-comment html keeps existing prose behavior</div>

## Notes

Visible note.

<!-- generated notes hidden -->
`;
  const result = parseMarkVSpec(source);
  const elementsProse = result.sectionProse.find((candidate) => candidate.title === "Elements");

  assert.deepEqual(elementsProse?.overview, ["Elements overview stays visible."]);
  assert.deepEqual(elementsProse?.notes, ["Elements section notes stay visible."]);
  assert.deepEqual(result.actions[0]?.overview, ["Visible action overview <!-- inline comment remains visible source -->."]);
  assert.deepEqual(result.actions[0]?.notes, ["<div>non-comment html keeps existing prose behavior</div>"]);
  assert(result.notes[0]?.lines.includes("Visible note."));
  assert(!result.diagnostics.some((diagnostic) => diagnostic.message.includes("unsupported Markdown block html")));
  assert(!JSON.stringify(result.sectionProse).includes("hidden"));
  assert(!JSON.stringify(result.actions[0]).includes("hidden"));
  assert(!JSON.stringify(result.notes).includes("hidden"));
});

test("unifies entity overview and notes across structured entity sections", () => {
  const source = `---
id: SCR-ENTITY-PROSE
type: screen
title: Entity Prose
---

# SCR-ENTITY-PROSE Entity Prose

## States

- idle*

## Layout: mobile

Layout section overview.

### L-Page Page

Layout entity overview.

- stack

#### Items

- E-Name

Layout entity notes.

### Section Notes

Layout section notes.

## Slots

Slots section overview.

### content Main Content

Slot definition overview.

- required: true

Slot definition notes.

### Section Notes

Slots section notes.

## Elements

Elements section overview.

### E-Name Input

Element entity overview.

- description: Short description
- purpose: Purpose fallback

Element entity notes.

### Section Notes

Elements section notes.

## Form Groups

Form Groups section overview.

### F-ProfileForm Profile form

Form group overview.

- fields:
  - E-Name

Form group notes.

### Section Notes

Form Groups section notes.

## Actions

Actions section overview.

### A-Save Save

Action overview.

- Triggered
  - E-Name.change

Action notes.

### Section Notes

Actions section notes.

## Validations

Validations section overview.

### V-NameRequired Name required

Validation overview.

- target: F-ProfileForm
- rules:
  - required:
    - E-Name

Validation notes.

### Section Notes

Validations section notes.

## Business Rules

Business Rules section overview.

### R-NamePolicy Name policy

Rule overview.

- Name must be readable.

Rule notes.

### Section Notes

Business Rules section notes.

## Error Codes

Error Codes section overview.

### ERR-NAME-REQUIRED Name required

Error code overview.

- target: F-ProfileForm
- business rule: R-NamePolicy
- display: inline
- message: Name is required.

Error code notes.

### Section Notes

Error Codes section notes.
`;
  const result = parseMarkVSpec(source);
  const sectionProseByTitle = new Map(result.sectionProse.map((sectionProse) => [sectionProse.title, sectionProse]));

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.layoutGroups[0]?.overview, ["Layout entity overview."]);
  assert.deepEqual(result.layoutGroups[0]?.notes, ["Layout entity notes."]);
  assert.deepEqual(result.slotDefinitions[0]?.overview, ["Slot definition overview."]);
  assert.deepEqual(result.slotDefinitions[0]?.notes, ["Slot definition notes."]);
  assert.deepEqual(result.elements[0]?.overview, ["Element entity overview."]);
  assert.equal(result.elements[0]?.properties["description"], "Short description");
  assert.equal(result.elements[0]?.properties["purpose"], "Purpose fallback");
  assert.deepEqual(result.elements[0]?.notes, ["Element entity notes."]);
  assert.deepEqual(result.formGroups[0]?.overview, ["Form group overview."]);
  assert.deepEqual(result.formGroups[0]?.notes, ["Form group notes."]);
  assert.deepEqual(result.actions[0]?.overview, ["Action overview."]);
  assert.deepEqual(result.actions[0]?.notes, ["Action notes."]);
  assert.deepEqual(result.validations[0]?.overview, ["Validation overview."]);
  assert.deepEqual(result.validations[0]?.notes, ["Validation notes."]);
  assert.deepEqual(result.rules[0]?.overview, ["Rule overview."]);
  assert.deepEqual(result.rules[0]?.notes, ["Rule notes."]);
  assert.deepEqual(result.errorCodes[0]?.overview, ["Error code overview."]);
  assert.deepEqual(result.errorCodes[0]?.notes, ["Error code notes."]);
  assert.deepEqual(sectionProseByTitle.get("Layout: mobile")?.overview, ["Layout section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Layout: mobile")?.notes, ["Layout section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Slots")?.overview, ["Slots section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Slots")?.notes, ["Slots section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Elements")?.overview, ["Elements section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Elements")?.notes, ["Elements section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Form Groups")?.overview, ["Form Groups section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Form Groups")?.notes, ["Form Groups section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Actions")?.overview, ["Actions section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Actions")?.notes, ["Actions section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Validations")?.overview, ["Validations section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Validations")?.notes, ["Validations section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Business Rules")?.overview, ["Business Rules section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Business Rules")?.notes, ["Business Rules section notes."]);
  assert.deepEqual(sectionProseByTitle.get("Error Codes")?.overview, ["Error Codes section overview."]);
  assert.deepEqual(sectionProseByTitle.get("Error Codes")?.notes, ["Error Codes section notes."]);
});

test("treats Model Samples as unsupported and does not parse legacy sample prose", () => {
  const source = `---
id: SCR-MODEL-SAMPLE-PROSE
type: screen
title: Model Sample Prose
---

# SCR-MODEL-SAMPLE-PROSE Model Sample Prose

## States

- loaded*

## Model Samples

Model Samples section overview.

### loaded

Loaded state group overview.

#### \${model.users.items}

Users table overview.

| id | name |
| --- | ---- |
| u1 | Alice |

Users table notes.

#### \${model.roles.items}

Roles list overview.

- id: admin
  name: Admin

Roles list notes.

#### State Notes

Loaded state group notes.

### Section Notes

Model Samples section notes.
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.modelSampleGroups, []);
  assert.deepEqual(result.modelSamples, []);
  assert(!result.sectionProse.some((candidate) => candidate.title === "Model Samples"));
  assert(result.diagnostics.some((diagnostic) =>
    diagnostic.message === "## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead." &&
    diagnostic.line === lineNumber(source, "## Model Samples")
  ));
});

test("preserves History Fields and History section prose around structured data", () => {
  const source = `---
id: SCR-HISTORY-PROSE
type: screen
title: History prose
---

# SCR-HISTORY-PROSE History prose

## States

- idle*

## History Fields

<!-- history fields overview hidden -->

History fields overview.

- ticket
  label: Ticket
  required: false
  type: string

History fields trailing note.

type: date

### Section Notes

<!-- history fields notes hidden -->

History fields section notes.

## History

<!-- history overview hidden -->

History section overview.

### ver 1.0

- date: 2026-05-14
- author: Alice
- ticket: MM-1

Initial release.

- Added the first screen.

### Section Notes

<!-- history notes hidden -->

History section notes.
`;
  const result = parseMarkVSpec(source);
  const historyFieldsProse = result.sectionProse.find((candidate) => candidate.title === "History Fields");
  const historyProse = result.sectionProse.find((candidate) => candidate.title === "History");

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.historyFields.map((field) => field.key), ["ticket"]);
  assert.equal(result.historyFields[0]?.type, "string");
  assert.deepEqual(historyFieldsProse?.overview, ["History fields overview."]);
  assert.deepEqual(historyFieldsProse?.notes, ["History fields trailing note.", "", "type: date", "", "History fields section notes."]);
  assert.deepEqual(result.historyEntries.map((entry) => entry.version), ["ver 1.0"]);
  assert.deepEqual(result.historyEntries[0]?.bodyLines, ["Initial release.", "", "- Added the first screen."]);
  assert.deepEqual(historyProse?.overview, ["History section overview."]);
  assert.deepEqual(historyProse?.notes, ["History section notes."]);
  assert(!JSON.stringify(result.sectionProse).includes("hidden"));
});

test("warns for unowned structured section prose and unsupported prose blocks", () => {
  const source = `---
id: SCR-PROSE-DIAGNOSTICS
type: screen
title: Prose Diagnostics
---

# SCR-PROSE-DIAGNOSTICS Prose Diagnostics

## States

- idle*

## Elements

Elements overview is valid.

### NotAnElement

This prose cannot be owned.

<div>unsupported html</div>

---

- label: Missing owner

### E-NameInput Input

- value: \${model.name}

### Section Notes

Section notes are valid.

## Validations

- target: E-NameInput

### V-NameRequired Name required

- target: E-NameInput
- condition: E-NameInput.value is empty
- message: Name is required.

## Notes

This note mentions error, transition, and validation without requiring a warning.
`;
  const result = parseMarkVSpec(source);
  const warnings = result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]);

  assert(warnings.some(([severity, message, line]) =>
    severity === "warning"
      && String(message).includes("Malformed Element heading")
      && line === lineNumber(source, "### NotAnElement")
  ));
  assert(warnings.some(([severity, message, line]) =>
    severity === "warning"
      && String(message).includes("Section Elements has prose after malformed heading NotAnElement")
      && line === lineNumber(source, "This prose cannot be owned.")
  ));
  assert(!warnings.some(([, message]) => String(message).includes("unsupported Markdown block html")));
  assert(!warnings.some(([, message]) => String(message).includes("unsupported Markdown block thematicBreak")));
  assert(warnings.some(([severity, message, line]) =>
    severity === "warning"
      && String(message).includes("Section Validations has structured-looking list item before a valid entity heading: target: E-NameInput")
      && line === lineNumber(source, "- target: E-NameInput")
  ));
  assert(!warnings.some(([, message]) => String(message).includes("This note mentions error")));
  assert(!warnings.some(([, message]) => String(message).includes("Section notes are valid")));
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

test("allows safe element display property changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION
type: screen
title: Invalidation
---

# SCR-INVALIDATION Invalidation

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Input

- placeholder: Before
`;
  const current = previous.replace("- placeholder: Before", "- placeholder: After");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);
  const fullHtml = renderMarkVSpecHtml(parseMarkVSpec(current), { includeStyles: false });
  const update = renderMarkVSpecHtmlWithInvalidation(previous, current, { includeStyles: false });

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.deepEqual(invalidation.wireframeRenderKeys, ["element:E-Title"]);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, ["elements:list"]);
  assert.deepEqual(invalidation.diagnosticsRenderKeys, []);
  assert.equal(invalidation.diagnosticsMayChange, false);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
  assert.equal(update.html, fullHtml);
  assert.deepEqual(update.invalidation, invalidation);
  assert.deepEqual(update.fragments, [{
    renderKey: "element:E-Title",
    html: '<!--mm-render-key:element:E-Title--><div class="mm-element-wrap mm-element-wrap-input" data-mm-render-key="element:E-Title"><input class="mm-element mm-element-input" data-mm-id="E-Title" type="text" placeholder="After" value=""><span class="mm-annotation-row"></span></div>'
  }]);
  assert.deepEqual(renderMarkVSpecHtmlFragment(parseMarkVSpec(current), "element:E-Title", { includeStyles: false }), {
    renderKey: "element:E-Title",
    html: '<!--mm-render-key:element:E-Title--><div class="mm-element-wrap mm-element-wrap-input" data-mm-render-key="element:E-Title"><input class="mm-element mm-element-input" data-mm-id="E-Title" type="text" placeholder="After" value=""><span class="mm-annotation-row"></span></div>'
  });
  assert.match(renderMarkVSpecHtmlFragment(parseMarkVSpec(current), "layout:mobile:L-Page", { includeStyles: false })?.html ?? "", /data-mm-render-key="layout:mobile:L-Page"/);
  assert.match(fullHtml, /data-mm-render-key="screen:SCR-INVALIDATION"/);
  assert.match(fullHtml, /<!--mm-render-key:layout:mobile:L-Page-->/);
  assert.match(fullHtml, /<!--mm-render-key:element:E-Title-->/);
});

test("includes document and slot content render boundaries in invalidation", () => {
  const previous = `---
id: SCR-SLOT
type: screen
title: Slot Before
---

# SCR-SLOT Slot Before

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- slot: header

## Slot: header

### L-Header Header

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Header
`;
  const current = previous.replace("title: Slot Before", "title: Slot After");
  const screenInvalidation = computeMarkVSpecRenderInvalidation(previous, current);
  const html = renderMarkVSpecHtml(parseMarkVSpec(previous), { includeStyles: false });

  assert.deepEqual(screenInvalidation.changedSectionIds, ["section:Screen"]);
  assert.deepEqual(screenInvalidation.impactedRenderKeys, ["screen:SCR-SLOT"]);
  assert.equal(screenInvalidation.requiresFullRender, true);
  assert.deepEqual(screenInvalidation.fullRenderReasons, ["Changed sections are not limited to Elements or a safe Layout."]);
  assert.match(html, /<!--mm-render-key:slot-content:header:default:L-Header-->/);

  const descriptionInvalidation = computeMarkVSpecRenderInvalidation(
    previous.replace("# SCR-SLOT Slot Before", "# SCR-SLOT Slot Before\n\nBefore description."),
    previous.replace("# SCR-SLOT Slot Before", "# SCR-SLOT Slot Before\n\nAfter description.")
  );
  assert.deepEqual(descriptionInvalidation.changedSectionIds, ["section:Screen"]);
  assert.equal(descriptionInvalidation.requiresFullRender, true);
});

test("ignores top-level standalone HTML comments in render invalidation", () => {
  const previous = `---
id: SCR-COMMENT-INVALIDATION
type: screen
title: Comment Invalidation
---

# SCR-COMMENT-INVALIDATION Comment Invalidation

Visible description.

<!-- hidden before -->

## States

- idle*
`;
  const textEdit = computeMarkVSpecRenderInvalidation(previous, previous.replace("hidden before", "hidden after"));
  const expandedComment = computeMarkVSpecRenderInvalidation(
    previous,
    previous.replace("<!-- hidden before -->", "<!--\nhidden before\nnew hidden line\n-->")
  );
  const removedComment = computeMarkVSpecRenderInvalidation(previous, previous.replace("\n<!-- hidden before -->\n", "\n"));

  for (const invalidation of [textEdit, expandedComment, removedComment]) {
    assert.deepEqual(invalidation.changedSectionIds, []);
    assert.deepEqual(invalidation.impactedRenderKeys, []);
    assert.equal(invalidation.requiresFullRender, false);
  }
});

test("keeps unsafe element invalidation on full render fallback", () => {
  const previous = `---
id: SCR-INVALIDATION-UNSAFE
type: screen
title: Invalidation Unsafe
---

# SCR-INVALIDATION-UNSAFE Invalidation Unsafe

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Before
- visible when: idle
`;
  const current = previous.replace("- visible when: idle", "- visible when: loaded");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.deepEqual(invalidation.wireframeRenderKeys, []);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, []);
  assert.equal(invalidation.requiresFullRender, true);
  assert.deepEqual(invalidation.fullRenderReasons, ["Element conditional visibility or disabled state changed."]);
});

test("keeps design table element display changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION-TABLE
type: screen
title: Invalidation Table
---

# SCR-INVALIDATION-TABLE Invalidation Table

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Before
`;
  const current = previous.replace("- value: Before", "- value: After");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.deepEqual(invalidation.wireframeRenderKeys, ["element:E-Title"]);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, ["elements:list"]);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
});

test("keeps unsupported safe-name element properties on full render fallback", () => {
  const previous = `---
id: SCR-INVALIDATION-UNSUPPORTED-PROP
type: screen
title: Invalidation Unsupported Property
---

# SCR-INVALIDATION-UNSUPPORTED-PROP Invalidation Unsupported Property

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Save

## Elements

### E-Save Button

- label: Save
`;
  const current = previous.replace("- label: Save", "- label: Save\n- href: /ignored");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Save", "elements:list"]);
  assert.deepEqual(invalidation.diagnosticsRenderKeys, ["diagnostics:list"]);
  assert.equal(invalidation.diagnosticsMayChange, true);
  assert.equal(invalidation.requiresFullRender, true);
  assert.deepEqual(invalidation.fullRenderReasons, ["Element properties require full render: href."]);
});

test("allows multiple state safe element display changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION-MULTI-STATE
type: screen
title: Invalidation Multi State
---

# SCR-INVALIDATION-MULTI-STATE Invalidation Multi State

## States

- idle*
- error

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Input

- placeholder: Before
`;
  const current = previous.replace("- placeholder: Before", "- placeholder: After");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.deepEqual(invalidation.wireframeRenderKeys, ["element:E-Title"]);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, ["elements:list"]);
  assert.deepEqual(invalidation.diagnosticsRenderKeys, []);
  assert.equal(invalidation.diagnosticsMayChange, false);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
});

test("keeps parent layout context element changes on full render fallback", () => {
  const previous = `---
id: SCR-INVALIDATION-LAYOUT-CONTEXT
type: screen
title: Invalidation Layout Context
---

# SCR-INVALIDATION-LAYOUT-CONTEXT Invalidation Layout Context

## States

- idle*

## Layout: mobile

### L-Form Form

- stack
- disabled when: idle

#### Items

- E-Email

## Elements

### E-Email Input

- placeholder: Before
`;
  const current = previous.replace("- placeholder: Before", "- placeholder: After");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Email", "elements:list"]);
  assert.equal(invalidation.requiresFullRender, true);
  assert.deepEqual(invalidation.fullRenderReasons, ["Element is inside layout context requiring full render: L-Form."]);
});

test("allows opaque model source element changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION-SRC
type: screen
title: Invalidation Source
---

# SCR-INVALIDATION-SRC Invalidation Source

## States

- idle*

## Layout: mobile

### L-Card Card

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- src: \${model.card.title}
- value: Fallback

## Model Samples

### idle

#### \${model.cards.items}

| title |
| --- |
| Alpha |
| Beta |
`;
  const current = previous.replace("- src: \${model.card.title}", "- src: \${model.account.title}");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.deepEqual(invalidation.diagnosticsRenderKeys, []);
  assert.equal(invalidation.diagnosticsMayChange, false);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
});

test("allows valid single-row model source element changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION-SRC-SAFE
type: screen
title: Invalidation Source Safe
---

# SCR-INVALIDATION-SRC-SAFE Invalidation Source Safe

## States

- idle*

## Layout: mobile

### L-Card Card

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- src: \${model.profile.name}
- value: Fallback

## Model Samples

### idle

#### \${model.profile}

| name | display |
| --- | --- |
| Alpha | Beta |
`;
  const current = previous.replace("- src: \${model.profile.name}", "- src: \${model.profile.display}");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Elements"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["element:E-Title", "elements:list"]);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
});

test("keeps action semantic changes on full render fallback", () => {
  const previous = `---
id: SCR-INVALIDATION-ACTION
type: screen
title: Invalidation Action
---

# SCR-INVALIDATION-ACTION Invalidation Action

## States

- idle*

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: ServerCall
  - submit form
`;
  const current = previous.replace("  - submit form", "  - submit updated form");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Actions"]);
  assert(invalidation.impactedRenderKeys.includes("actions:list"));
  assert(invalidation.impactedRenderKeys.includes("action:A-Submit"));
  assert.equal(invalidation.requiresFullRender, true);
  assert.deepEqual(invalidation.fullRenderReasons, ["Changed sections are not limited to Elements or a safe Layout."]);
});

test("allows safe leaf layout changes on partial update", () => {
  const previous = `---
id: SCR-INVALIDATION-LAYOUT
type: screen
title: Invalidation Layout
---

# SCR-INVALIDATION-LAYOUT Invalidation Layout

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const current = previous.replace("- stack", "- grid");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Layout:mobile"]);
  assert.deepEqual(invalidation.impactedRenderKeys, ["layout:mobile:L-Page", "layouts:list"]);
  assert.deepEqual(invalidation.wireframeRenderKeys, ["layout:mobile:L-Page"]);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, ["layouts:list"]);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.fullRenderReasons, []);
  assert.match(renderMarkVSpecHtmlFragment(parseMarkVSpec(current), "layout:mobile:L-Page", { includeStyles: false })?.html ?? "", /mm-layout-grid/);
});

test("keeps layout membership changes on full render fallback", () => {
  const previous = `---
id: SCR-INVALIDATION-LAYOUT-MEMBERSHIP
type: screen
title: Invalidation Layout Membership
---

# SCR-INVALIDATION-LAYOUT-MEMBERSHIP Invalidation Layout Membership

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title
- E-Subtitle

## Elements

### E-Title Text

- value: Title

### E-Subtitle Text

- value: Subtitle
`;
  const current = previous.replace("- E-Title\n- E-Subtitle", "- E-Subtitle\n- E-Title");
  const invalidation = computeMarkVSpecRenderInvalidation(previous, current);

  assert.deepEqual(invalidation.changedSectionIds, ["section:Layout:mobile"]);
  assert(invalidation.impactedRenderKeys.includes("layout:mobile:L-Page"));
  assert.equal(invalidation.requiresFullRender, true);
  assert.deepEqual(invalidation.fullRenderReasons, ["Layout membership changed."]);
});

test("renders empty-viewport layout fragment keys", () => {
  const source = `---
id: SCR-INVALIDATION-DEFAULT-LAYOUT
type: screen
title: Invalidation Default Layout
---

# SCR-INVALIDATION-DEFAULT-LAYOUT Invalidation Default Layout

## Layout: mobile

### L-Page Page

- row

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const result = parseMarkVSpec(source);
  result.layoutGroups[0]!.viewport = "";

  assert.deepEqual(renderMarkVSpecHtmlFragment(result, "layout::L-Page", { includeStyles: false }), {
    renderKey: "layout::L-Page",
    html: '<!--mm-render-key:layout::L-Page--><section class="mm-layout mm-layout-row" data-mm-id="L-Page" data-mm-render-key="layout::L-Page"><!--mm-render-key:element:E-Title--><div class="mm-element-wrap mm-element-wrap-text" data-mm-render-key="element:E-Title"><span class="mm-element mm-element-text" data-mm-id="E-Title">Title</span><span class="mm-annotation-row"></span></div></section>'
  });
});

test("keeps nested layout depth styling in layout fragments", () => {
  const source = `---
id: SCR-NESTED-FRAGMENT
type: screen
title: Nested Fragment
---

# SCR-NESTED-FRAGMENT Nested Fragment

## Layout: mobile

### L-Page Page

- stack

#### Items

- L-Panel

### L-Panel Panel

- stack

#### Items

- L-Inner

### L-Inner Inner

- row

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const result = parseMarkVSpec(source);
  const fullHtml = renderMarkVSpecHtml(result, { includeStyles: false });
  const fragment = renderMarkVSpecHtmlFragment(result, "layout:mobile:L-Inner", { includeStyles: false });
  const depthTwoStyle = 'class="mm-layout mm-layout-row mm-layout-depth-2" style="--mm-layout-margin-block:4px;--mm-layout-padding:10px;--mm-gap-xs:2px;--mm-gap-sm:5px;--mm-gap-md:7px;--mm-gap-lg:10px;--mm-gap-xl:14px" data-mm-id="L-Inner"';

  assert.ok(fullHtml.includes(depthTwoStyle));
  assert.ok(fragment?.html.includes(depthTwoStyle));
});

test("parses a MarkVSpec project index", () => {
  const source = `---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: examples/04-real-world-screens/search-list.vspec.md
    title: Users
  - id: SCR-USER-DETAIL
    path: examples/03-actions/form-submit-flow.vspec.md
---

# PRJ-ADMIN Admin Console

## Notes

- User management screens are owned by admin.
`;
  const result = parseMarkVSpecProject(source);

  assert.equal(result.project.id, "PRJ-ADMIN");
  assert.equal(result.project.title, "Admin Console");
  assert.deepEqual(
    result.screens.map((screen) => [screen.id, screen.path, screen.title]),
    [
      ["SCR-USERS", "examples/04-real-world-screens/search-list.vspec.md", "Users"],
      ["SCR-USER-DETAIL", "examples/03-actions/form-submit-flow.vspec.md", undefined]
    ]
  );
  assert.deepEqual(result.notes.map((note) => [note.title, note.line]), [["Notes", lineNumber(source, "## Notes")]]);
  assert.deepEqual(result.diagnostics, []);
});

test("warns and ignores removed Front Matter owner, status, and viewport metadata", () => {
  const source = `---
id: SCR-REMOVED-META
type: screen
title: Removed Metadata
owner: docs
status: draft
viewport: mobile
---

# SCR-REMOVED-META Removed Metadata
`;
  const result = parseMarkVSpec(source);

  assert.equal((result.screen as { viewport?: unknown }).viewport, undefined);
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "Front Matter field owner is no longer canonical and is ignored.", 1],
      ["warning", "Front Matter field status is no longer canonical and is ignored.", 1],
      ["warning", "Front Matter field viewport is no longer canonical and is ignored.", 1]
    ]
  );
});

test("warns and ignores removed project status and screen owner metadata", () => {
  const source = `---
id: PRJ-REMOVED-META
type: project
title: Removed Metadata Project
status: draft
screens:
  - id: SCR-USERS
    path: examples/04-real-world-screens/search-list.vspec.md
    owner: admin
---

# PRJ-REMOVED-META Removed Metadata Project
`;
  const result = parseMarkVSpecProject(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "Project screen entry uses unsupported field owner.", lineNumber(source, "    owner: admin")],
      ["warning", "Front Matter field status is no longer canonical and is ignored.", 1]
    ]
  );
});

test("derives Basic Info history values from the latest history entry only", () => {
  const source = `---
id: SCR-HISTORY-BASIC-INFO
type: screen
title: History Basic Info
---

# SCR-HISTORY-BASIC-INFO History Basic Info

## History

### ver 2.0

- date: 2026-05-14
- author: Alice

### ver 1.0

- reason: Backfilled historical note
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(latestHistoryBasicInfo(result.historyEntries), {
    version: "ver 1.0",
    date: undefined,
    author: undefined
  });
});

test("derives project semantics from shared AST utilities", () => {
  const source = `---
id: PRJ-AST
type: project
title: AST Project
templates:
  - id: TPL-SHELL
    path: templates/shell.vspec.md
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
    template: TPL-SHELL
---

# PRJ-AST AST Project

## Notes

<!-- hidden project note -->

- Keep project notes.

## Open Questions

<!--
hidden project question
-->

- Which users route is canonical?
`;
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const parsed = parseMarkVSpecProject(source);
  const semantics = parseProjectDocumentSemantics(document, parsed.templates, parsed.screens);

  assert.deepEqual(diagnostics, []);
  assert.deepEqual(parsed.notes, semantics.notes);
  assert.deepEqual(semantics.notes, [
    {
      title: "Notes",
      line: lineNumber(source, "## Notes"),
      lines: ["", "- Keep project notes.", ""]
    },
    {
      title: "Open Questions",
      line: lineNumber(source, "## Open Questions"),
      lines: ["", "- Which users route is canonical?", ""]
    }
  ]);
  assert.deepEqual(semantics.renderKeys, [
    "project:index",
    "project:templates",
    "project:screens",
    "project:notes",
    "project:template:TPL-SHELL",
    "project:screen:SCR-USERS"
  ]);
  assert.deepEqual(semantics.references.map((reference) => [reference.kind, reference.id, reference.path, reference.range.start.line]), [
    ["template", "TPL-SHELL", "templates/shell.vspec.md", lineNumber(source, "  - id: TPL-SHELL")],
    ["screen", "SCR-USERS", "screens/users.vspec.md", lineNumber(source, "  - id: SCR-USERS")]
  ]);
  assert.deepEqual(semantics.references[1]?.propertyRanges["template"], [
    {
      start: { line: lineNumber(source, "    template: TPL-SHELL"), column: 1 },
      end: { line: lineNumber(source, "    template: TPL-SHELL"), column: 1 }
    }
  ]);
});

test("parses project Front Matter arrays through YAML", () => {
  const source = `---
id: PRJ-YAML
type: project
title: "YAML: Project"
screens:
  - id: SCR-USERS
    path: "examples/04-real-world-screens/search-list.vspec.md"
    title: "Users: Index"
---

# PRJ-YAML YAML: Project
`;
  const result = parseMarkVSpecProject(source);

  assert.equal(result.project.title, "YAML: Project");
  assert.equal(result.project.location?.line, lineNumber(source, "# PRJ-YAML YAML: Project"));
  assert.deepEqual(result.screens.map((screen) => [screen.id, screen.path, screen.title]), [
    ["SCR-USERS", "examples/04-real-world-screens/search-list.vspec.md", "Users: Index"]
  ]);
  assert.deepEqual(result.diagnostics, []);
});

test("preserves project entry locations for bare YAML list entries", () => {
  const source = `---
id: PRJ-YAML
type: project
title: YAML Project
screens:
  -
    id: SCR-USERS
    title: Users
    route: /users
  -
    path: examples/99-invalid/missing-id.vspec.md
---

# PRJ-YAML YAML Project
`;
  const result = parseMarkVSpecProject(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "Project screen entry uses unsupported field route.", lineNumber(source, "    route: /users")],
      ["error", "Project screen SCR-USERS is missing required field: path.", lineNumber(source, "  -")],
      ["error", "Project screen entry is missing required field: id.", lineNumber(source, "  -", 2)]
    ]
  );
});

test("reports malformed MarkVSpec project indexes", () => {
  const source = `---
id: PRJ-BROKEN
type: screen
screens:
  - id: SCR-USERS
    title: Users
    route: /users
  - path: examples/99-invalid/missing-id.vspec.md
---

# PRJ-MISMATCH Broken Project
`;
  const result = parseMarkVSpecProject(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "Project screen entry uses unsupported field route.", lineNumber(source, "    route: /users")],
      ["warning", "Heading project ID PRJ-MISMATCH differs from Front Matter ID PRJ-BROKEN.", lineNumber(source, "# PRJ-MISMATCH Broken Project")],
      ["error", "Missing required Front Matter field: title.", 1],
      ["error", "Front Matter field type must be project.", 1],
      ["error", "Project screen SCR-USERS is missing required field: path.", lineNumber(source, "  - id: SCR-USERS")],
      ["error", "Project screen entry is missing required field: id.", lineNumber(source, "  - path: examples/99-invalid/missing-id.vspec.md")]
    ]
  );
});

test("reports duplicate project screen IDs", () => {
  const source = `---
id: PRJ-DUPLICATE
type: project
title: Duplicate Project
screens:
  - id: SCR-USERS
    path: examples/04-real-world-screens/search-list.vspec.md
  - id: SCR-USERS
    path: examples/03-actions/form-submit-flow.vspec.md
---

# PRJ-DUPLICATE Duplicate Project
`;
  const result = parseMarkVSpecProject(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Duplicate project screen ID: SCR-USERS.", lineNumber(source, "  - id: SCR-USERS", 2)]
    ]
  );
});

test("loads project screen files and validates screen navigations", () => {
  const projectSource = `---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
  - id: SCR-USER-DETAIL
    path: screens/user-detail.vspec.md
---

# PRJ-ADMIN Admin Console
`;
  const usersSource = `---
id: SCR-USERS
type: screen
title: Users
---

# SCR-USERS Users

## States

- idle*

## Elements

### E-OpenDetail Link

- label: Detail

## Actions

### A-OpenDetail Open detail

- Triggered
  - E-OpenDetail.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-USER-DETAIL
`;
  const detailSource = `---
id: SCR-USER-DETAIL
type: screen
title: User Detail
---

# SCR-USER-DETAIL User Detail

## States

- idle*
`;
  const files = new Map([
    ["project/screens/users.vspec.md", usersSource],
    ["project/screens/user-detail.vspec.md", detailSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.deepEqual(result.screens.map((screen) => [screen.index.id, screen.resolvedPath, screen.result?.screen.id]), [
    ["SCR-USERS", "project/screens/users.vspec.md", "SCR-USERS"],
    ["SCR-USER-DETAIL", "project/screens/user-detail.vspec.md", "SCR-USER-DETAIL"]
  ]);
  assert.deepEqual(result.diagnostics, []);
});

test("loads partial documents with self PartialRequest without circular dependency diagnostics", () => {
  const projectSource = `---
id: PRJ-PARTIAL-SELF
type: project
title: Partial Self Refresh
screens:
  - id: SCR-POINTS
    path: screens/points.vspec.md
---

# PRJ-PARTIAL-SELF Partial Self Refresh
`;
  const screenSource = `---
id: SCR-POINTS
type: screen
title: Points
references:
  partials:
    PRT-POINTS-CONTENT: ../partials/points-content.vspec.md
---

# SCR-POINTS Points

## States

- idle*

## Layout: mobile

### L-PointsHost Points Host

- stack
- partial:
  - id: PRT-POINTS-CONTENT
`;
  const partialSource = `---
id: PRT-POINTS-CONTENT
type: partial
title: Points Content
---

# PRT-POINTS-CONTENT Points Content

## States

- loaded*

## Layout: mobile

### L-PointsContent Points Content

- stack

#### Items

- E-Refresh

## Elements

### E-Refresh Button

- label: Refresh

## Actions

### A-Refresh Refresh

- Triggered
  - E-Refresh.click
- From
  - loaded
- Process: PartialRequest
  - request: GET /points/content
  - partial: PRT-POINTS-CONTENT
- Process: Immediate
  - update:
    - target: L-PointsContent
    - mode: replace
`;
  const files = new Map([
    ["project/screens/points.vspec.md", screenSource],
    ["project/partials/points-content.vspec.md", partialSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    result.documentGraph.edges.filter((edge) => edge.kind === "document-partial").map((edge) => [edge.fromPath, edge.toPath, edge.documentId]),
    [["project/screens/points.vspec.md", "project/partials/points-content.vspec.md", "PRT-POINTS-CONTENT"]]
  );
});

test("loads project templates and composes screen slot content", () => {
  const projectSource = `---
id: PRJ-MYPAGE
type: project
title: My Page
templates:
  - id: TPL-MYPAGE-SHELL
    path: templates/mypage-shell.vspec.md
screens:
  - id: SCR-MYPAGE-HOME
    path: screens/home.vspec.md
---

# PRJ-MYPAGE My Page
`;
  const templateSource = `---
id: TPL-MYPAGE-SHELL
type: template
title: My Page Shell
---

# TPL-MYPAGE-SHELL My Page Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- E-Header
- slot: content

## Slots

### content Main Content

## Elements

### E-Header Text

- value: Member ID
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: Home
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME Home

## States

- idle*

## Slot: content

### L-Content Content

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Home
`;
  const files = new Map([
    ["project/templates/mypage-shell.vspec.md", templateSource],
    ["project/screens/home.vspec.md", screenSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.deepEqual(result.templates.map((template) => [template.index.id, template.result?.screen.type]), [["TPL-MYPAGE-SHELL", "template"]]);
  assert.equal(result.screens[0]?.sourceResult?.layoutGroups.length, 0);
  assert.equal(result.screens[0]?.result?.layoutGroups[0]?.id, "L-Shell");
  assert.equal(result.screens[0]?.result?.slotContents[0]?.layoutGroups[0]?.id, "L-Content");
  assert.deepEqual(result.diagnostics, []);
});

test("loads project screen template object without a project template alias", () => {
  const projectSource = `---
id: PRJ-MYPAGE
type: project
title: My Page
screens:
  - id: SCR-MYPAGE-HOME
    path: screens/home.vspec.md
---

# PRJ-MYPAGE My Page
`;
  const templateSource = `---
id: TPL-MYPAGE-SHELL
type: template
title: My Page Shell
---

# TPL-MYPAGE-SHELL My Page Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content

## Slots

### content Main Content
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: Home
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME Home

## Slot: content

### L-Content Content

- stack
`;
  const files = new Map([
    ["project/templates/mypage-shell.vspec.md", templateSource],
    ["project/screens/home.vspec.md", screenSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.equal(result.templates.length, 0);
  assert.equal(result.screens[0]?.result?.screen.template, "TPL-MYPAGE-SHELL");
  assert.equal(result.screens[0]?.result?.screen.templateSrc, "../templates/mypage-shell.vspec.md");
  assert.equal(result.screens[0]?.result?.layoutGroups[0]?.id, "L-Shell");
  assert.equal(result.screens[0]?.result?.slotContents[0]?.layoutGroups[0]?.id, "L-Content");
  assert.deepEqual(result.diagnostics, []);
});

test("validates template slot contracts during project composition", () => {
  const projectSource = `---
id: PRJ-SLOT-CONTRACT
type: project
title: Slot Contract
screens:
  - id: SCR-SLOT-CONTRACT
    path: screens/home.vspec.md
---

# PRJ-SLOT-CONTRACT Slot Contract
`;
  const templateSource = `---
id: TPL-SLOT-CONTRACT
type: template
title: Slot Contract Shell
---

# TPL-SLOT-CONTRACT Slot Contract Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content
- slot: missingContract

## Layout: mobile

### L-MobileShell Mobile Shell

- stack

#### Items

- slot: content
- slot: viewportRequired

## Slots

### content Main Content

- required

### requiredWithDefault Required With Default

- required
- default: E-DefaultMessage

### requiredWithoutDefault Required Without Default

- required

### requiredPropertyWithoutDefault Required Property Without Default

- required: true

### missingDefault Missing Default

- default: E-MissingDefault

### wrongDefaultKind Wrong Default Kind

- default: A-NotAllowed

### screenDefault Screen Default

- default: E-ScreenOnly

### screenLayoutDefault Screen Layout Default

- default: L-ScreenTop

### viewportRequired Viewport Required

- required

### optional Optional

## Elements

### E-DefaultMessage Paragraph

- value: Default content
`;
  const screenSource = `---
id: SCR-SLOT-CONTRACT
type: screen
title: Slot Contract Home
template:
  id: TPL-SLOT-CONTRACT
  src: ../templates/shell.vspec.md
---

# SCR-SLOT-CONTRACT Slot Contract Home

## Layout: desktop

### L-ScreenTop Screen Top

- stack

## Slot: content

### L-Content Content

- stack

## Slot: content: print

### L-PrintContent Print Content

- stack

## Slot: unknownSlot: mobile

### L-Unknown Unknown

- stack

## Slot: viewportRequired: desktop

### L-DesktopOnly Desktop Only

- stack

## Elements

### E-ScreenOnly Paragraph

- value: Screen-only content
`;
  const files = new Map([
    ["project/templates/shell.vspec.md", templateSource],
    ["project/screens/home.vspec.md", screenSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.some((message) => message.includes("Screen SCR-SLOT-CONTRACT defines slot unknownSlot for viewport mobile, but template TPL-SLOT-CONTRACT does not declare it in ## Slots.")));
  assert(messages.some((message) => message.includes("Screen SCR-SLOT-CONTRACT defines slot content for viewport print, but template TPL-SLOT-CONTRACT has no Layout:print.")));
  assert(messages.some((message) => message.includes("Template TPL-SLOT-CONTRACT layout L-Shell renders slot missingContract, but ## Slots does not declare it for screen SCR-SLOT-CONTRACT.")));
  assert(messages.some((message) => message.includes("Required slot requiredWithoutDefault in template TPL-SLOT-CONTRACT has no content in screen SCR-SLOT-CONTRACT and no valid default.")));
  assert(messages.some((message) => message.includes("Required slot requiredPropertyWithoutDefault in template TPL-SLOT-CONTRACT has no content in screen SCR-SLOT-CONTRACT and no valid default.")));
  assert(messages.some((message) => message.includes("Required slot viewportRequired for viewport mobile in template TPL-SLOT-CONTRACT has no content in screen SCR-SLOT-CONTRACT and no valid default.")));
  assert(messages.some((message) => message.includes("Slot missingDefault in template TPL-SLOT-CONTRACT references missing default E-MissingDefault for screen SCR-SLOT-CONTRACT.")));
  assert(messages.some((message) => message.includes("Slot wrongDefaultKind in template TPL-SLOT-CONTRACT uses invalid default A-NotAllowed for screen SCR-SLOT-CONTRACT.")));
  assert(messages.some((message) => message.includes("Slot screenDefault in template TPL-SLOT-CONTRACT uses default E-ScreenOnly, but that ID belongs to screen SCR-SLOT-CONTRACT.")));
  assert(messages.some((message) => message.includes("Slot screenLayoutDefault in template TPL-SLOT-CONTRACT uses default L-ScreenTop, but that ID belongs to screen SCR-SLOT-CONTRACT.")));
  assert(!messages.some((message) => message.includes("requiredWithDefault") && message.includes("no content")));
  assert(!messages.some((message) => message.includes("optional") && message.includes("no content")));
});

test("rejects project references outside the workspace boundary", () => {
  const workspace = mkdtempSync(join(tmpdir(), "markvspec-project-workspace-"));
  const outside = mkdtempSync(join(tmpdir(), "markvspec-project-outside-"));
  try {
    const outsideScreenPath = join(outside, "outside.vspec.md");
    const outsideTemplatePath = join(outside, "template.vspec.md");
    const projectSource = `---
id: PRJ-BOUNDARY
type: project
title: Boundary
templates:
  - id: TPL-OUTSIDE
    path: ${outsideTemplatePath}
screens:
  - id: SCR-OUTSIDE
    path: ${outsideScreenPath}
---

# PRJ-BOUNDARY Boundary
`;
    const readPaths: string[] = [];
    const result = loadMarkVSpecProject(projectSource, {
      projectPath: join(workspace, "vspec.project.md"),
      workspaceRoot: workspace,
      readFile: (path) => {
        readPaths.push(path);
        return "";
      }
    });

    assert.deepEqual(readPaths, []);
    assert.equal(isProjectReferenceAllowed(join(workspace, "screens/home.vspec.md"), workspace), true);
    assert.equal(isProjectReferenceAllowed(`${workspace}2/screens/home.vspec.md`, workspace), false);
    assert.equal(isProjectReferenceAllowed(join(workspace, "link.vspec.md"), workspace, (path) =>
      path.endsWith("link.vspec.md") ? join(outside, "outside.vspec.md") : path
    ), false);
    assert(result.diagnostics.some((diagnostic) => diagnostic.message === `Project template TPL-OUTSIDE is outside the workspace: ${outsideTemplatePath}.`));
    assert(result.diagnostics.some((diagnostic) => diagnostic.message === `Project screen SCR-OUTSIDE is outside the workspace: ${outsideScreenPath}.`));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("reports mismatched template id for screen template object", () => {
  const projectSource = `---
id: PRJ-MYPAGE
type: project
title: My Page
screens:
  - id: SCR-MYPAGE-HOME
    path: screens/home.vspec.md
---

# PRJ-MYPAGE My Page
`;
  const templateSource = `---
id: TPL-ACTUAL-SHELL
type: template
title: Actual Shell
---

# TPL-ACTUAL-SHELL Actual Shell

## Layout: desktop

### L-Shell Shell

- stack
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: Home
template:
  id: TPL-EXPECTED-SHELL
  src: ../templates/actual-shell.vspec.md
---

# SCR-MYPAGE-HOME Home

## States

- idle*
`;
  const files = new Map([
    ["project/templates/actual-shell.vspec.md", templateSource],
    ["project/screens/home.vspec.md", screenSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.message === "Template reference TPL-EXPECTED-SHELL points to file with template ID TPL-ACTUAL-SHELL."));
  assert.equal(result.screens[0]?.result?.layoutGroups.some((group) => group.id === "L-Shell"), false);
});

test("loads and validates Front Matter document references", () => {
  const projectSource = `---
id: PRJ-REFERENCES
type: project
title: References
screens:
  - id: SCR-HOME
    path: screens/home.vspec.md
---

# PRJ-REFERENCES References
`;
  const screenSource = `---
id: SCR-HOME
type: screen
title: Home
template:
  id: TPL-SHELL
  src: ../templates/shell.vspec.md
references:
  partials:
    PRT-GOOD: ../partials/good.vspec.md
    PRT-MISSING: ../partials/missing.vspec.md
    PRT-WRONG-ID: ../partials/wrong-id.vspec.md
    PRT-NOT-PARTIAL: ../partials/not-partial.vspec.md
---

# SCR-HOME Home

## States

- idle*

## Slot: content

### L-Content Content

- stack
- partial:
  - id: PRT-GOOD
  - states:
    - idle: loaded

### L-Missing Missing

- stack
- partial:
  - id: PRT-MISSING
  - states:
    - idle: loaded

### L-WrongId Wrong ID

- stack
- partial:
  - id: PRT-WRONG-ID
  - states:
    - idle: loaded

### L-NotPartial Not Partial

- stack
- partial:
  - id: PRT-NOT-PARTIAL
  - states:
    - idle: loaded
`;
const templateSource = `---
id: TPL-SHELL
type: template
title: Shell
references:
  partials:
    PRT-TEMPLATE: ../partials/template.vspec.md
---

# TPL-SHELL Shell

## Layout: mobile

### L-Shell Shell

- stack
- partial:
  - id: PRT-TEMPLATE
  - states:
    - idle: loaded

#### Items

- slot: content

## Slots

### content Main Content
`;
  const goodPartialSource = `---
id: PRT-GOOD
type: partial
title: Good
references:
  partials:
    PRT-CHILD: child.vspec.md
---

# PRT-GOOD Good

## Layout: mobile

### L-Good Good

- stack
- partial:
  - id: PRT-CHILD

#### Items
`;
  const childPartialSource = `---
id: PRT-CHILD
type: partial
title: Child
---

# PRT-CHILD Child
`;
  const templatePartialSource = `---
id: PRT-TEMPLATE
type: partial
title: Template Partial
---

# PRT-TEMPLATE Template Partial
`;
  const wrongIdPartialSource = `---
id: PRT-ACTUAL
type: partial
title: Wrong
---

# PRT-ACTUAL Wrong
`;
  const nonPartialSource = `---
id: PRT-NOT-PARTIAL
type: screen
title: Not Partial
---

# PRT-NOT-PARTIAL Not Partial
`;
  const files = new Map([
    ["project/screens/home.vspec.md", screenSource],
    ["project/templates/shell.vspec.md", templateSource],
    ["project/partials/child.vspec.md", childPartialSource],
    ["project/partials/good.vspec.md", goodPartialSource],
    ["project/partials/template.vspec.md", templatePartialSource],
    ["project/partials/wrong-id.vspec.md", wrongIdPartialSource],
    ["project/partials/not-partial.vspec.md", nonPartialSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.equal(result.screens[0]?.result?.layoutGroups[0]?.id, "L-Shell");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message]),
    [
      ["error", "Partial reference PRT-MISSING file not found: ../partials/missing.vspec.md."],
      ["error", "Partial reference PRT-WRONG-ID points to file with partial ID PRT-ACTUAL."],
      ["error", "Partial reference PRT-NOT-PARTIAL points to a non-partial document."]
    ]
  );
  assert.deepEqual([...result.documentGraph.nodes].sort((a, b) => a.path.localeCompare(b.path)), [
    { path: "project/partials/child.vspec.md", kind: "partial", documentId: "PRT-CHILD" },
    { path: "project/partials/good.vspec.md", kind: "partial", documentId: "PRT-GOOD" },
    { path: "project/partials/missing.vspec.md", kind: "partial", documentId: "PRT-MISSING" },
    { path: "project/partials/not-partial.vspec.md", kind: "partial", documentId: "PRT-NOT-PARTIAL" },
    { path: "project/partials/template.vspec.md", kind: "partial", documentId: "PRT-TEMPLATE" },
    { path: "project/partials/wrong-id.vspec.md", kind: "partial", documentId: "PRT-WRONG-ID" },
    { path: "project/screens/home.vspec.md", kind: "screen", documentId: "SCR-HOME" },
    { path: "project/templates/shell.vspec.md", kind: "template", documentId: "TPL-SHELL" },
    { path: "project/vspec.project.md", kind: "project" }
  ]);
  assert.deepEqual(
    affectedProjectScreenPathsForDocumentChange(result.documentGraph, "project/partials/good.vspec.md"),
    ["project/screens/home.vspec.md"]
  );
  assert.deepEqual(
    affectedProjectScreenPathsForDocumentChange(result.documentGraph, "project/partials/child.vspec.md"),
    ["project/screens/home.vspec.md"]
  );
  assert.deepEqual(
    affectedProjectScreenPathsForDocumentChange(result.documentGraph, "project/templates/shell.vspec.md"),
    ["project/screens/home.vspec.md"]
  );
  assert.deepEqual(
    affectedProjectScreenPathsForDocumentChange(result.documentGraph, "project/partials/template.vspec.md"),
    ["project/screens/home.vspec.md"]
  );
  assert.deepEqual(
    affectedProjectScreenPathsForDocumentChange(result.documentGraph, "project/vspec.project.md"),
    ["project/screens/home.vspec.md"]
  );
});

test("reports non-template documents referenced by screen template paths", () => {
  const projectSource = `---
id: PRJ-MYPAGE
type: project
title: My Page
screens:
  - id: SCR-MYPAGE-HOME
    path: screens/home.vspec.md
---

# PRJ-MYPAGE My Page
`;
  const templateSource = `---
id: SCR-NOT-TEMPLATE
type: screen
title: Not Template
---

# SCR-NOT-TEMPLATE Not Template
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: Home
template:
  id: SCR-NOT-TEMPLATE
  src: ../templates/not-template.vspec.md
---

# SCR-MYPAGE-HOME Home
`;
  const files = new Map([
    ["project/templates/not-template.vspec.md", templateSource],
    ["project/screens/home.vspec.md", screenSource]
  ]);
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });

  assert.equal(result.screens[0]?.result?.screen.id, "SCR-MYPAGE-HOME");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message]),
    [["error", "Template path ../templates/not-template.vspec.md points to a non-template document."]]
  );
});

test("reports project loader and cross-file validation errors", () => {
  const projectSource = `---
id: PRJ-BROKEN
type: project
title: Broken Project
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
  - id: SCR-MISSING-FILE
    path: screens/missing.vspec.md
---

# PRJ-BROKEN Broken Project
`;
  const usersSource = `---
id: SCR-USERS-ACTUAL
type: screen
title: Users Actual
---

# SCR-USERS-ACTUAL Users Actual

## States

- idle*

## Elements

### E-OpenMissing Link

- label: Missing

## Actions

### A-OpenMissing Open missing

- Triggered
  - E-OpenMissing.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-NOT-IN-PROJECT
`;
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => path === "project/screens/users.vspec.md" ? usersSource : undefined
  });

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Project screen SCR-USERS points to file with screen ID SCR-USERS-ACTUAL.", lineNumber(projectSource, "  - id: SCR-USERS")],
      ["error", "Project screen SCR-MISSING-FILE file not found: screens/missing.vspec.md.", lineNumber(projectSource, "    path: screens/missing.vspec.md")],
      ["error", "Project transition from SCR-USERS-ACTUAL action A-OpenMissing targets missing screen SCR-NOT-IN-PROJECT.", lineNumber(usersSource, "    - navigate: SCR-NOT-IN-PROJECT")]
    ]
  );
});

test("validates screen navigation params against target routes", () => {
  const projectSource = `---
id: PRJ-NAV
type: project
title: Navigation Project
screens:
  - id: SCR-LIST
    path: screens/list.vspec.md
  - id: SCR-DETAIL
    path: screens/detail.vspec.md
---

# PRJ-NAV Navigation Project
`;
  const listSource = `---
id: SCR-LIST
type: screen
title: List
---

# SCR-LIST List

## States

- idle*

## Elements

### E-お知らせリンク Link

- text: Notice
- href: SCR-DETAIL
- params:
  - extra: \${model.notice.extra}

## Actions

### A-OpenNotice Open notice

- Triggered
  - E-お知らせリンク.click
- From
  - idle
- Process: Immediate
  - case: success
    - params:
      - noticeId: \${model.notice.noticeId}
    - Effects
      - navigate: SCR-DETAIL

### A-StepOpenNotice Open notice after request

- Triggered
  - E-お知らせリンク.click
- From
  - idle
- Process: HttpRequest
  - GET /notices/current
  - case: success
    - params:
      - extra: \${model.notice.extra}
    - Effects
      - navigate: SCR-DETAIL
`;
  const detailSource = `---
id: SCR-DETAIL
type: screen
title: Detail
route: /notices/:noticeId
---

# SCR-DETAIL Detail
`;
  const result = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => {
      if (path === "project/screens/list.vspec.md") {
        return listSource;
      }
      if (path === "project/screens/detail.vspec.md") {
        return detailSource;
      }
      return undefined;
    }
  });

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Project navigation from SCR-LIST element E-お知らせリンク to SCR-DETAIL is missing route parameter noticeId.", lineNumber(listSource, "  - extra: \${model.notice.extra}")],
      ["warning", "Project navigation from SCR-LIST element E-お知らせリンク to SCR-DETAIL defines route parameter extra, but target route /notices/:noticeId has no matching placeholder.", lineNumber(listSource, "  - extra: \${model.notice.extra}")],
      ["error", "Project navigation from SCR-LIST action A-StepOpenNotice to SCR-DETAIL is missing route parameter noticeId.", lineNumber(listSource, "      - navigate: SCR-DETAIL", 2)],
      ["warning", "Project navigation from SCR-LIST action A-StepOpenNotice to SCR-DETAIL defines route parameter extra, but target route /notices/:noticeId has no matching placeholder.", lineNumber(listSource, "      - extra: \${model.notice.extra}")]
    ]
  );
});

test("rejects brace route placeholder syntax", () => {
  const source = `---
id: SCR-LEGACY-ROUTE
type: screen
title: Legacy Route
route: /users/{userId}
---

# SCR-LEGACY-ROUTE Legacy Route

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Screen route uses unsupported {param} placeholder syntax. Use :param, for example /users/:userId.", 1]
    ]
  );
});

test("warns for route parameter references missing from screen route", () => {
  const source = `---
id: SCR-ROUTE-REFS
type: screen
title: Route References
route: /users/:userId
---

# SCR-ROUTE-REFS Route References

## States

- loading*

## Elements

### E-Title Text

- src: \${route.accountId}

### E-RouteTable Table

- Columns:
  - Route ID: \${route.tableUserId}

## Actions

### A-Load Load user

- Triggered
  - screen.load
- From
  - loading
- Process: HttpRequest
  - GET /users/:userId
    - userId: \${route.missingUserId}

## Validations

### V-RouteCheck Route check

- target: E-Title
- rules:
  - required:
    - E-Title
- condition: \${route.validationUserId}
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "Route parameter reference ${route.accountId} does not match any :param in screen route.", lineNumber(source, "- src: ${route.accountId}")],
      ["warning", "Route parameter reference ${route.tableUserId} does not match any :param in screen route.", lineNumber(source, "  - Route ID: ${route.tableUserId}")],
      ["warning", "Route parameter reference ${route.missingUserId} does not match any :param in screen route.", lineNumber(source, "    - userId: ${route.missingUserId}")],
      ["warning", "Route parameter reference ${route.validationUserId} does not match any :param in screen route.", lineNumber(source, "- condition: ${route.validationUserId}")]
    ]
  );
});

test("does not validate route parameter references in partials", () => {
  const source = `---
id: PRT-ROUTE-CONTEXT
type: partial
title: Route Context Partial
---

# PRT-ROUTE-CONTEXT Route Context Partial

## States

- idle*

## Elements

### E-Title Text

- src: \${route.userId}
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("resolves project paths relative to the project index", () => {
  assert.equal(resolveProjectPath("project/vspec.project.md", "screens/users.vspec.md"), "project/screens/users.vspec.md");
  assert.equal(resolveProjectPath("project/specs/vspec.project.md", "../screens/users.vspec.md"), "project/screens/users.vspec.md");
  assert.equal(resolveProjectPath(undefined, "./screens/users.vspec.md"), "screens/users.vspec.md");
});

test("builds project transition graph and Mermaid diagram", () => {
  const projectSource = `---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
  - id: SCR-USER-DETAIL
    path: screens/user-detail.vspec.md
---

# PRJ-ADMIN Admin Console
`;
  const usersSource = `---
id: SCR-USERS
type: screen
title: Users
---

# SCR-USERS Users

## States

- idle*

## Elements

### E-OpenDetail Link

- label: Detail

### E-NewUser Button

- label: New user

## Actions

### A5:A-OpenDetail Open detail

- Triggered
  - E-OpenDetail.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-USER-DETAIL

### A6:A-OpenNewUser Open new user

- Triggered
  - E-NewUser.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: /users/new
`;
  const detailSource = `---
id: SCR-USER-DETAIL
type: screen
title: User Detail
---

# SCR-USER-DETAIL User Detail

## States

- idle*
`;
  const files = new Map([
    ["project/screens/users.vspec.md", usersSource],
    ["project/screens/user-detail.vspec.md", detailSource]
  ]);
  const project = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => files.get(path)
  });
  const graph = buildProjectTransitionGraph(project);
  const mermaid = renderProjectTransitionMermaid(graph);

  assert.deepEqual(graph.nodes.map((node) => [node.id, node.title]), [
    ["SCR-USERS", "Users"],
    ["SCR-USER-DETAIL", "User Detail"]
  ]);
  assert.deepEqual(graph.edges.map((edge) => [
    edge.sourceScreenId,
    edge.actionId,
    edge.actionMarker,
    edge.actionName,
    edge.fromState,
    edge.result,
    edge.target,
    edge.targetType
  ]), [
    ["SCR-USERS", "A-OpenDetail", "A5", "Open detail", "idle", undefined, "SCR-USER-DETAIL", "screen"],
    ["SCR-USERS", "A-OpenNewUser", "A6", "Open new user", "idle", undefined, "/users/new", "external"]
  ]);
  assert.match(mermaid, /^flowchart LR/u);
  assert.match(mermaid, /SCR_USERS\["Users"\]/u);
  assert.match(mermaid, /SCR_USER_DETAIL\["User Detail"\]/u);
  assert.match(mermaid, /SCR_USERS -->\|"A5 Open detail"\| SCR_USER_DETAIL/u);
  assert.match(mermaid, /_USERS_NEW\["\/users\/new"\]/u);
  assert.match(mermaid, /SCR_USERS -->\|"A6 Open new user"\| _USERS_NEW/u);
});

test("includes missing screen edges in project transition graph", () => {
  const projectSource = `---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
---

# PRJ-ADMIN Admin Console
`;
  const usersSource = `---
id: SCR-USERS
type: screen
title: Users
---

# SCR-USERS Users

## States

- idle*

## Elements

### E-OpenMissing Link

- label: Missing

## Actions

### A-OpenMissing Open missing

- Triggered
  - E-OpenMissing.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-MISSING
`;
  const project = loadMarkVSpecProject(projectSource, {
    projectPath: "project/vspec.project.md",
    readFile: (path) => path === "project/screens/users.vspec.md" ? usersSource : undefined
  });
  const graph = buildProjectTransitionGraph(project);
  const mermaid = renderProjectTransitionMermaid(graph);

  assert.deepEqual(graph.edges.map((edge) => [edge.target, edge.targetType]), [["SCR-MISSING", "missing-screen"]]);
  assert.match(mermaid, /SCR_USERS -\. "A-OpenMissing Open missing" \.-> SCR_MISSING\["SCR-MISSING"\]/u);
});

test("renders template slots standalone and composes screen slot content", () => {
  const templateSource = `---
id: TPL-MYPAGE-SHELL
type: template
title: マイページ共通レイアウト
---

# TPL-MYPAGE-SHELL マイページ共通レイアウト

## Layout: desktop

### TL1:L-Shell Page Shell

- row

#### Items

- L-LeftPane
- L-RightPane

### TL2:L-LeftPane Left Pane

- stack

#### Items

- E-ロゴ
- E-ログアウトボタン

### TL3:L-RightPane Right Pane

- stack

#### Items

- E-Header
- slot: content
- E-Footer

## Slots

### content Main Content

- purpose: Page-specific main content.
- required

## Elements

### TE1:E-ロゴ Image

- alt: Service logo

### TE2:E-ログアウトボタン Button

- label: Logout

### TE3:E-Header Text

- value: Member ID: M-001

### TE4:E-Footer Text

- value: Copyright
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: マイページホーム
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME マイページホーム

## States

- idle*

## Slot: content

### L1:L-HomeContent Home Content

- stack

#### Items

- E-ページタイトル

## Elements

### 1:E-ページタイトル Heading

- level: 1
- value: Home
`;
  const template = parseMarkVSpec(templateSource);
  const screen = parseMarkVSpec(screenSource);
  const templateHtml = renderMarkVSpecHtml(template, { includeStyles: false, viewport: "desktop" });
  const composed = composeMarkVSpecTemplate(template, screen);
  const composedHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });

  assert.equal(template.screen.type, "template");
  assert.equal(template.diagnostics.length, 0);
  assert.equal(template.slotDefinitions[0]?.name, "content");
  assert.match(templateHtml, /<div class="mm-slot-placeholder" data-mm-slot="content" data-mm-render-key="slot:content">Slot: content<\/div>/);
  assert.equal(screen.slotContents[0]?.layoutGroups[0]?.id, "L-HomeContent");
  assert.equal(composed.screen.id, "SCR-MYPAGE-HOME");
  assert.equal(composed.layoutGroups.find((group) => group.id === "L-Shell")?.documentRole, "template");
  assert.equal(composed.layoutGroups.find((group) => group.id === "L-Shell")?.properties["marker"], undefined);
  assert.equal(composed.elements.find((element) => element.id === "E-ロゴ")?.documentRole, "template");
  assert.equal(composed.elements.find((element) => element.id === "E-ロゴ")?.properties["marker"], undefined);
  assert.equal(composed.slotContents[0]?.layoutGroups[0]?.properties["marker"], "L1");
  assert.match(composedHtml, /data-mm-id="L-LeftPane"/);
  assert.match(composedHtml, /data-mm-id="L-HomeContent"/);
  assert.match(composedHtml, /Home<\/h1>/);
  assert.doesNotMatch(composedHtml, /mm-slot-placeholder/);
  assert.doesNotMatch(renderMarkVSpecHtml(composed, {
    includeStyles: false,
    viewport: "desktop",
    markerVisibility: { layout: true, element: true, action: true }
  }), />TL1<\/code>|>TE1<\/code>/);
});

test("builds document composition origins for template, slot, and partial items", () => {
  const template = parseMarkVSpec(`---
id: TPL-COMPOSITION
type: template
title: Composition Shell
---

# TPL-COMPOSITION Composition Shell

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- slot:content

## Elements

### E-Nav Text

- value: Nav

## Form Groups

### F-TemplateNav Template nav form

- fields: E-Nav
`);
  const screen = parseMarkVSpec(`---
id: SCR-COMPOSITION
type: screen
title: Composition
references:
  partials:
    PRT-SUMMARY: ./summary.vspec.md
---

# SCR-COMPOSITION Composition

## States

- idle*

## Slot: content

### L-Content Content

- stack
- partial:
  - id: PRT-SUMMARY
  - states:
    - idle: loaded

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Title
`);
  const partial = parseMarkVSpec(`---
id: PRT-SUMMARY
type: partial
title: Summary
---

# PRT-SUMMARY Summary

## States

- loaded*

## Layout: mobile

### L-PartialSummary Summary

- stack
- gap: lg

#### Items

- E-PartialTitle

## Layout: mobile

### L-PartialSummary Common Summary

- stack
- gap: sm

#### Items

- E-PartialTitle

## Elements

### E-PartialTitle Text

- value: Summary
`);
  const composed = composeMarkVSpecTemplate(template, screen);
  const composition = buildMarkVSpecDocumentComposition(composed, {
    partialPreviews: new Map([["PRT-SUMMARY", partial]]),
    partialPaths: new Map([["PRT-SUMMARY", "/docs/summary.vspec.md"]])
  });

  assert.equal(composition.layouts.find((entry) => entry.id === "L-Shell")?.origin.kind, "template");
  assert.deepEqual(composition.layouts.find((entry) => entry.id === "L-Content")?.origin, {
    kind: "slot",
    slotName: "content",
    viewport: undefined
  });
  assert.deepEqual(composition.layouts.find((entry) => entry.id === "L-PartialSummary")?.origin, {
    kind: "partial",
    partialId: "PRT-SUMMARY",
    path: "/docs/summary.vspec.md"
  });
  assert.equal(composition.elements.find((entry) => entry.id === "E-Nav")?.origin.kind, "template");
  assert.equal(composition.elements.find((entry) => entry.id === "E-Title")?.origin.kind, "screen");
  assert.equal(composition.elements.find((entry) => entry.id === "E-PartialTitle")?.origin.kind, "partial");
  assert.equal(composition.formGroups.find((entry) => entry.id === "F-TemplateNav")?.origin.kind, "template");

  const specIds = documentCompositionItemIds(composition, { includeTemplateItems: false, includePartialItems: false });
  assert.deepEqual([...specIds.layoutIds].sort(), ["L-Content"]);
  assert.deepEqual([...specIds.elementIds].sort(), ["E-Title"]);
  assert.deepEqual([...specIds.formGroupIds].sort(), []);

  const resolved = resolveDocumentCompositionLayoutsForViewport(composition, {
    viewport: "mobile",
    includeTemplateLayouts: true,
    includePartialLayouts: true
  });
  assert.deepEqual(resolved.map((entry) => [entry.id, entry.origin.kind]), [
    ["L-Shell", "template"],
    ["L-Content", "slot"],
    ["L-PartialSummary", "partial"]
  ]);
  assert.equal(resolved.find((entry) => entry.id === "L-PartialSummary")?.item.viewport, "mobile");
});

test("counts slot content depth from the template insertion point", () => {
  const templateSource = `---
id: TPL-NESTED-SHELL
type: template
title: Nested Shell
---

# TPL-NESTED-SHELL Nested Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- L-Body

### L-Body Body

- stack

#### Items

- slot: content
`;
  const screenSource = `---
id: SCR-NESTED-HOME
type: screen
title: Nested Home
template:
  id: TPL-NESTED-SHELL
---

# SCR-NESTED-HOME Nested Home

## Slot: content

### L-Content Content

- row

#### Items

- E-Title

## Elements

### E-Title Text

- value: Home
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const fullHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const fragment = renderMarkVSpecHtmlFragment(composed, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" });
  const slotContentStyle = 'class="mm-layout mm-layout-row mm-layout-depth-2" style="--mm-layout-margin-block:4px;--mm-layout-padding:10px;--mm-gap-xs:2px;--mm-gap-sm:5px;--mm-gap-md:7px;--mm-gap-lg:10px;--mm-gap-xl:14px" data-mm-id="L-Content"';

  assert.ok(fullHtml.includes(slotContentStyle));
  assert.ok(fragment?.html.includes(slotContentStyle));
});

test("skips slot content fragments for multiple template insertion points", () => {
  const templateSource = `---
id: TPL-MULTI-SLOT
type: template
title: Multi Slot
---

# TPL-MULTI-SLOT Multi Slot

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content
- L-Aside

### L-Aside Aside

- stack

#### Items

- slot: content
`;
  const screenSource = `---
id: SCR-MULTI-SLOT
type: screen
title: Multi Slot
template:
  id: TPL-MULTI-SLOT
---

# SCR-MULTI-SLOT Multi Slot

## Slot: content

### L-Content Content

- row
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));

  assert.equal(renderMarkVSpecHtmlFragment(composed, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" }), undefined);
});

test("composes States section prose with the same owner as composed states", () => {
  const templateSource = `---
id: TPL-STATE-PROSE
type: template
title: State Prose Template
---

# TPL-STATE-PROSE State Prose Template

## States

Template state overview.

- shell-idle*
`;
  const screenSource = `---
id: SCR-STATE-PROSE
type: screen
title: State Prose Screen
---

# SCR-STATE-PROSE State Prose Screen

## States

Screen state overview.

- idle*
`;

  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));

  assert.deepEqual(composed.states.map((state) => state.name), ["idle"]);
  assert.deepEqual(composed.sectionProse, [
    {
      sectionId: "section:States",
      title: "States",
      kind: "States",
      overview: ["Screen state overview."],
      notes: [],
      location: { line: lineNumber(screenSource, "## States") },
      renderKeys: ["states:list"]
    }
  ]);
});

test("renders viewport-specific slot content with common fallback", () => {
  const templateSource = `---
id: TPL-RESPONSIVE-SHELL
type: template
title: Responsive Shell
---

# TPL-RESPONSIVE-SHELL Responsive Shell

## Layout: mobile

### L-MobileShell Mobile Shell

- stack

#### Items

- slot: content
- slot: aside

## Layout: desktop

### L-DesktopShell Desktop Shell

- stack

#### Items

- slot: content
- slot: aside

## Layout: tablet

### L-TabletShell Tablet Shell

- stack

#### Items

- slot: content

## Slots

### content Main Content
`;
  const screenSource = `---
id: SCR-RESPONSIVE-HOME
type: screen
title: Responsive Home
template:
  id: TPL-RESPONSIVE-SHELL
  src: ../templates/responsive-shell.vspec.md
---

# SCR-RESPONSIVE-HOME Responsive Home

## States

- idle*

## Slot: content

### L-CommonContent Common Content

- stack
- source: \${model.cards.items}
- as: card

#### Items

- E-CommonTitle
- slot: sidebar

## Slot: sidebar

### L-CommonSidebar Common Sidebar

- stack

#### Items

- E-CommonSidebar

## Slot: sidebar: tablet

### L-TabletSidebar Tablet Sidebar

- stack

#### Items

- E-TabletSidebar

## Slot: aside

### L-CommonAside Common Aside

- stack

#### Items

- E-CommonAside

## Slot: aside: desktop

### L-DesktopAside Desktop Aside

- stack

#### Items

- E-DesktopAside

## Slot: content: mobile

### L-MobileContent Mobile Content

- stack

#### Items

- E-MobileTitle

## Slot: content: desktop

### L-DesktopContent Desktop Content

- stack

#### Items

- E-DesktopTitle

## Elements

### E-CommonTitle Heading

- value: Common content {card.title}
- src: \${model.card.title}

### E-MobileTitle Heading

- value: Mobile content

### E-DesktopTitle Heading

- value: Desktop content

### E-CommonSidebar Text

- value: Common sidebar

### E-TabletSidebar Text

- value: Tablet sidebar

### E-CommonAside Text

- value: Common aside

### E-DesktopAside Text

- value: Desktop aside

## Model Samples

### idle

#### \${model.cards.items}

| title |
| --- |
| Alpha |
| Beta |
`;
  const template = parseMarkVSpec(templateSource);
  const screen = parseMarkVSpec(screenSource);
  const composed = composeMarkVSpecTemplate(template, screen);
  const mobileHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "mobile" });
  const desktopHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const tabletHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "tablet" });

  assert.equal(screen.slotContents.find((slot) => slot.name === "content" && slot.viewport === "mobile")?.layoutGroups[0]?.id, "L-MobileContent");
  assert.equal(screen.slotContents.find((slot) => slot.name === "content" && slot.viewport === "desktop")?.layoutGroups[0]?.id, "L-DesktopContent");
  assert.match(mobileHtml, /data-mm-id="L-MobileContent"/);
  assert.match(mobileHtml, /Mobile content/);
  assert.match(mobileHtml, /data-mm-id="L-CommonAside"/);
  assert.match(mobileHtml, /Common aside/);
  assert.doesNotMatch(mobileHtml, /Desktop aside/);
  assert.doesNotMatch(mobileHtml, /Desktop content/);
  assert.match(desktopHtml, /data-mm-id="L-DesktopContent"/);
  assert.match(desktopHtml, /Desktop content/);
  assert.match(desktopHtml, /data-mm-id="L-DesktopAside"/);
  assert.match(desktopHtml, /Desktop aside/);
  assert.doesNotMatch(desktopHtml, /Common aside/);
  assert.doesNotMatch(desktopHtml, /Mobile content/);
  assert.match(tabletHtml, /data-mm-id="L-CommonContent"/);
  assert.match(tabletHtml, /Common content \{card\.title\}/);
  assert.doesNotMatch(tabletHtml, /Alpha/);
  assert.doesNotMatch(tabletHtml, /Beta/);
  assert.equal((tabletHtml.match(/data-mm-id="L-TabletSidebar"/g) ?? []).length, 1);
  assert.equal((tabletHtml.match(/Tablet sidebar/g) ?? []).length, 1);
  assert.doesNotMatch(tabletHtml, /Common sidebar/);
});

test("renders template slot defaults without treating them as screen content", () => {
  const templateSource = `---
id: TPL-DEFAULT-SHELL
type: template
title: Default Shell
---

# TPL-DEFAULT-SHELL Default Shell

## Layout: mobile

### L-MobileShell Mobile Shell

- stack

#### Items

- slot: hero
- slot: notice
- slot: action

### L-DefaultNotice Default Notice

- stack

#### Items

- E-DefaultNoticeText

### L-DefaultAction Default Action

- stack

#### Items

- E-DefaultActionText

## Layout: desktop

### L-DesktopShell Desktop Shell

- stack

#### Items

- slot: hero
- slot: notice
- slot: action

### L-DefaultNotice Default Notice

- stack

#### Items

- E-DefaultNoticeText

### L-DefaultAction Default Action

- stack

#### Items

- E-DefaultActionText

## Slots

### hero Hero

- default: E-DefaultHero

### notice Notice

- default: L-DefaultNotice

### action Action

- default: L-DefaultAction

## Elements

### E-DefaultHero Heading

- value: Template hero

### E-DefaultNoticeText Text

- value: Template notice

### E-DefaultActionText Text

- value: Template action
`;
  const screenSource = `---
id: SCR-DEFAULT-HOME
type: screen
title: Default Home
template:
  id: TPL-DEFAULT-SHELL
  src: ../templates/default-shell.vspec.md
---

# SCR-DEFAULT-HOME Default Home

## States

- idle*

## Slot: action

### L-CommonAction Common Action

- stack

#### Items

- E-CommonAction

## Slot: action: desktop

### L-DesktopAction Desktop Action

- stack

#### Items

- E-DesktopAction

## Elements

### E-CommonAction Button

- label: Common action

### E-DesktopAction Button

- label: Desktop action
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const mobileHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "mobile" });
  const desktopHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const heroFragment = renderMarkVSpecHtmlFragment(composed, "slot-default:hero:mobile:E-DefaultHero", { includeStyles: false, viewport: "mobile" });
  const mobileModels = buildStateScreenReadModels(composed, composed, "mobile");
  const desktopModels = buildStateScreenReadModels(composed, composed, "desktop");

  assert.match(mobileHtml, /Default: E-DefaultHero/);
  assert.match(mobileHtml, /Template hero/);
  assert.match(mobileHtml, /Default: L-DefaultNotice/);
  assert.match(mobileHtml, /Template notice/);
  assert.match(mobileHtml, /Common action/);
  assert.doesNotMatch(mobileHtml, /Template action/);
  assert.doesNotMatch(mobileHtml, /Desktop action/);
  assert.match(desktopHtml, /Desktop action/);
  assert.doesNotMatch(desktopHtml, /Common action/);
  assert.doesNotMatch(desktopHtml, /Template action/);
  assert.match(heroFragment?.html ?? "", /Template hero/);
  assert(!mobileModels[0]?.renderedIds.elementIds.has("E-DefaultHero"));
  assert(!mobileModels[0]?.renderedIds.layoutIds.has("L-DefaultNotice"));
  assert(!stateScreenLayoutsForModel(composed, mobileModels[0]!).some((layout) => layout.id === "L-DefaultNotice"));
  assert(mobileModels[0]?.renderedIds.elementIds.has("E-CommonAction"));
  assert(desktopModels[0]?.renderedIds.elementIds.has("E-DesktopAction"));
});

test("warns when template screens define top-level Layout sections", () => {
  const templateSource = `---
id: TPL-WARNING-SHELL
type: template
title: Warning Shell
---

# TPL-WARNING-SHELL Warning Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content

## Slots

### content Content

- required
`;
  const mixedScreenSource = `---
id: SCR-MIXED-LAYOUT
type: screen
title: Mixed Layout
template:
  id: TPL-WARNING-SHELL
  src: ../templates/warning-shell.vspec.md
---

# SCR-MIXED-LAYOUT Mixed Layout

## States

- idle*

## Layout: desktop

### L-IgnoredScreenShell Ignored screen shell

- stack

#### Items

- E-IgnoredScreenOnly

## Slot: content

### L-Content Content

- stack

#### Items

- E-VisibleContent

## Elements

### E-IgnoredScreenOnly Text

- value: Ignored screen-only layout content

### E-VisibleContent Text

- value: Visible slot content
`;
  const normalScreenSource = `---
id: SCR-NORMAL-LAYOUT
type: screen
title: Normal Layout
---

# SCR-NORMAL-LAYOUT Normal Layout

## States

- idle*

## Layout: desktop

### L-NormalShell Normal shell

- stack
`;
  const partialSource = `---
id: PRT-LAYOUT
type: partial
title: Layout Partial
---

# PRT-LAYOUT Layout Partial

## States

- idle*

## Layout: desktop

### L-PartialShell Partial shell

- stack
`;
  const slotOnlySource = `---
id: SCR-SLOT-ONLY
type: screen
title: Slot Only
template:
  id: TPL-WARNING-SHELL
  src: ../templates/warning-shell.vspec.md
---

# SCR-SLOT-ONLY Slot Only

## States

- idle*

## Slot: content

### L-Content Content

- stack

#### Items

- E-VisibleContent

## Elements

### E-VisibleContent Text

- value: Visible slot content
`;
  const template = parseMarkVSpec(templateSource);
  const mixedScreen = parseMarkVSpec(mixedScreenSource);
  const composed = composeMarkVSpecTemplate(template, mixedScreen);
  const html = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });

  assert(mixedScreen.diagnostics.some((diagnostic) =>
    diagnostic.severity === "warning" &&
    diagnostic.message === "Screen SCR-MIXED-LAYOUT references a template but defines top-level ## Layout: desktop. Use canonical ## Slot:<name> / ## Slot:<name>:<viewport> sections for template content; top-level Layout sections are ignored in composed screen preview."
  ));
  assert(!parseMarkVSpec(normalScreenSource).diagnostics.some((diagnostic) => diagnostic.message.includes("top-level ## Layout")));
  assert(!parseMarkVSpec(partialSource).diagnostics.some((diagnostic) => diagnostic.message.includes("top-level ## Layout")));
  assert(!parseMarkVSpec(slotOnlySource).diagnostics.some((diagnostic) => diagnostic.message.includes("top-level ## Layout")));
  assert.match(html, /Visible slot content/);
  assert.doesNotMatch(html, /Ignored screen-only layout content/);
});

test("reports duplicate IDs between template and composed screen content", () => {
  const template = parseMarkVSpec(`---
id: TPL-SHELL
type: template
title: Shell
---

# TPL-SHELL Shell

## Layout: desktop

### L-Content Content

- stack

## Elements

### E-Title Text

- value: Template title

## Form Groups

### F-SearchForm Search form

- fields: E-Title

## Actions

### A-TemplateLoad Template load

Template action overview.

- Triggered
  - screen.load

`);
  const screen = parseMarkVSpec(`---
id: SCR-HOME
type: screen
title: Home
template:
  id: TPL-SHELL
  src: ../templates/shell.vspec.md
---

# SCR-HOME Home

## Slot: content

### L-Content Content

- stack

## Elements

### E-Title Heading

- value: Screen title

## Form Groups

### F-SearchForm Search form

- fields: E-Title
`);
  const composed = composeMarkVSpecTemplate(template, screen);

  assert(!composed.diagnostics.some((diagnostic) => diagnostic.message === "Screen layout ID L-Content duplicates a template layout ID."));
  assert(composed.diagnostics.some((diagnostic) => diagnostic.message === "Screen element ID E-Title duplicates a template element ID."));
  assert(composed.diagnostics.some((diagnostic) => diagnostic.message === "Screen form group ID F-SearchForm duplicates a template form group ID."));
  assert.deepEqual(composed.formGroups.map((formGroup) => formGroup.id), ["F-SearchForm", "F-SearchForm"]);
  assert.deepEqual(composed.actions.find((action) => action.id === "A-TemplateLoad")?.overview, ["Template action overview."]);
});

test("parses the login screen example", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.id, "SCR-LOGIN");
  assert.equal(result.screen.title, "Login");
  assert.equal(result.screen.route, "/login");
  assert.equal(result.diagnostics.length, 0);

  assert.deepEqual(
    result.states.map((state) => [state.name, state.initial, state.message]),
    [
      ["idle", true, undefined],
      ["authenticating", false, "The login request was sent and the screen is waiting for the authentication response."]
    ]
  );

  const page = result.layoutGroups.find((group) => group.id === "L-Page");
  assert.equal(page?.viewport, "mobile");
  assert.equal(page?.kind, "stack");
  assert.equal(page?.properties["marker"], "L1");
  assert.equal(page?.properties["align"], "center");
  assert.equal(page?.properties["gap"], "md");

  const loginForm = result.layoutGroups.find((group) => group.id === "L-LoginForm" && group.viewport === "mobile");
  const emailFieldItem = loginForm?.items.find((item) => item.type === "field" && item.elementId === "E-EmailInput");
  assert.deepEqual(emailFieldItem && {
    ...emailFieldItem,
    location: { line: emailFieldItem.location.line }
  }, {
    type: "field",
    label: "Email",
    elementId: "E-EmailInput",
    location: { line: emailFieldItem?.location.line },
    raw: "\"Email\": E-EmailInput"
  });
  assert.equal(typeof emailFieldItem?.location.line, "number");

  const desktopActions = result.layoutGroups.find((group) => group.id === "L-DesktopActions" && group.viewport === "desktop");
  assert.equal(desktopActions?.kind, "row");

  const heading = result.elements.find((element) => element.id === "E-PageTitle");
  assert.equal(heading?.type, "Heading");
  assert.equal(heading?.properties["marker"], "1");
  assert.equal(heading?.properties["level"], "1");

  const paragraph = result.elements.find((element) => element.id === "E-LeadText");
  assert.equal(paragraph?.type, "Paragraph");

  const validationMessage = result.elements.find((element) => element.id === "E-ValidationMessage");
  assert.equal(validationMessage?.properties["tone"], "danger");
  assert.deepEqual(validationMessage?.visibleWhen, []);

  const emailInput = result.elements.find((element) => element.id === "E-EmailInput");
  assert.equal(emailInput?.type, "Input");
  assert.equal(emailInput?.properties["marker"], "3");
  assert.equal(emailInput?.properties["value"], "\${data.email}");
  assert.equal(emailInput?.properties["required"], undefined);

  const passwordInput = result.elements.find((element) => element.id === "E-PasswordInput");
  assert.equal(passwordInput?.properties["value"], "\${data.password}");

  const rememberMe = result.elements.find((element) => element.id === "E-RememberMe");
  assert.equal(rememberMe?.type, "Checkbox");
  assert.equal(rememberMe?.properties["marker"], "6");
  assert.equal(rememberMe?.properties["value"], "\${data.rememberMe}");

  const button = result.elements.find((element) => element.id === "E-SignInButton");
  assert.equal(button?.properties["variant"], "primary");
  assert.deepEqual(button?.disabledWhen, ["E-EmailInput is empty", "E-PasswordInput is empty"]);

  const forgotPasswordLink = result.elements.find((element) => element.id === "E-ForgotPasswordLink");
  assert.equal(forgotPasswordLink?.properties["action"], "A-ForgotPassword");

  const banner = result.elements.find((element) => element.id === "E-AuthErrorBanner");
  assert.equal(banner?.properties["tone"], "danger");
  const requestErrorBanner = result.elements.find((element) => element.id === "E-RequestErrorBanner");
  assert.equal(requestErrorBanner?.properties["marker"], "10");
  assert.deepEqual(requestErrorBanner?.visibleWhen, []);

  const action = result.actions.find((candidate) => candidate.id === "A-SubmitLogin");
  assert.equal(action?.properties["marker"], "A1");
  assert.equal(action?.triggeredBy, "E-SignInButton.click");
  assert.deepEqual(action?.trigger, { elementId: "E-SignInButton", event: "click" });
  assert.deepEqual(action?.processSteps.find((step) => step.marker === "P2")?.inputs, []);
  assert.deepEqual(action?.processSteps.find((step) => step.marker === "P2")?.results.map((result) => result.value), [
    "login submission request"
  ]);
  assert.deepEqual(action?.processSteps.find((step) => step.marker === "P2")?.details.map((detail) => [detail.key, detail.value]), [
    ["request.method", "POST"],
    ["request.path", "/login"],
    ["request.params.email", "E-EmailInput.value"],
    ["request.params.password", "E-PasswordInput.value"],
    ["request.params.rememberMe", "E-RememberMe.value"]
  ]);
  assert.equal(action?.target, undefined);
  assert.equal(action?.fragment, undefined);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["idle", "sent", "authenticating"],
    ["idle", "send-failed", "idle"]
  ]);
  assert.deepEqual(action?.processSteps.find((step) => step.marker === "P2")?.outcomes.map((outcome) => [outcome.result, outcome.response?.definition, outcome.to]), [
    ["sent", undefined, "authenticating"],
    ["send-failed", undefined, "idle"]
  ]);
  assert.deepEqual(action?.processSteps.map((step) => [step.name, step.when, step.target, step.content]), [
    ["Check validation", [], undefined, undefined],
    ["Submit login", [], undefined, undefined]
  ]);

  const responseAction = result.actions.find((candidate) => candidate.id === "A-HandleLoginResponse");
  assert.equal(responseAction?.triggeredBy, "A-SubmitLogin.P2.response");
  assert.deepEqual(responseAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["authenticating", "success", "SCR-HOME"],
    ["authenticating", "failure", "idle"]
  ]);

  assert.deepEqual(result.previewScenarios.map((scenario) => [
    scenario.name,
    scenario.state,
    scenario.cases.map((caseRef) => [caseRef.actionId, caseRef.processMarker, caseRef.caseName])
  ]), [
    ["idle-validation-error", "idle", [["A-SubmitLogin", "P1", "invalid"]]],
    ["idle-request-error", "idle", [["A-SubmitLogin", "P2", "send-failed"]]],
    ["idle-auth-error", "idle", [["A-HandleLoginResponse", "P1", "failure"]]]
  ]);

  const forgotPasswordAction = result.actions.find((candidate) => candidate.id === "A-ForgotPassword");
  assert.equal(forgotPasswordAction?.properties["marker"], "A3");
  assert.equal(forgotPasswordAction?.triggeredBy, "E-ForgotPasswordLink.click");
  assert.deepEqual(forgotPasswordAction?.trigger, { elementId: "E-ForgotPasswordLink", event: "click" });
  assert.deepEqual(forgotPasswordAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["idle", undefined, "SCR-PASSWORD-RESET"]
  ]);
});

test("parses every release example without diagnostics", () => {
  const exampleFiles = listExampleVspecFiles();

  assert.deepEqual(exampleFiles, [
    "01-basics/hello-screen.vspec.md",
    "02-states/async-loading.vspec.md",
    "02-states/responsive-profile.vspec.md",
    "02-states/scenario-samples.vspec.md",
    "02-states/source-kind-metadata.vspec.md",
    "03-actions/display-effects.vspec.md",
    "03-actions/event-triggers.vspec.md",
    "03-actions/form-submit-flow.vspec.md",
    "03-actions/parallel-initial-load.vspec.md",
    "03-actions/single-field-validation.vspec.md",
    "03-actions/toast-feedback.vspec.md",
    "04-real-world-screens/accordion-disclosure.vspec.md",
    "04-real-world-screens/action-menu.vspec.md",
    "04-real-world-screens/anchored-help.vspec.md",
    "04-real-world-screens/login-basic.vspec.md",
    "04-real-world-screens/notice-detail.vspec.md",
    "04-real-world-screens/profile-edit-rich.vspec.md",
    "04-real-world-screens/search-list.vspec.md",
    "04-real-world-screens/tabs-settings.vspec.md",
    "05-reuse/basic-slot-page.vspec.md",
    "05-reuse/default-slot-page.vspec.md",
    "05-reuse/profile-page-with-template.vspec.md",
    "05-reuse/profile-summary.partial.vspec.md",
    "05-reuse/responsive-slot-page.vspec.md",
    "05-reuse/responsive-template-shell.vspec.md",
    "05-reuse/template-shell.vspec.md",
    "06-structured-sections/history-and-errors.vspec.md"
  ]);

  for (const file of exampleFiles) {
    const source = readFileSync(examplePath(file), "utf8");
    const result = parseMarkVSpec(source);
    assert.deepEqual(result.diagnostics, [], file);
    assert.ok(result.layoutGroups.length > 0 || result.slotContents.length > 0 || Boolean(result.screen.template || result.screen.templateSrc), file);
    assert.ok(result.elements.length > 0 || Boolean(result.screen.template || result.screen.templateSrc), file);
    if (result.screen.type === "template") {
      assert.ok(result.slotDefinitions.length > 0, file);
    }
  }
});

test("keeps profile partial example on response-side display.partial syntax", () => {
  const source = readFileSync(examplePath("05-reuse/profile-page-with-template.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const refresh = result.actions.find((action) => action.id === "A-RefreshProfile");
  const response = result.actions.find((action) => action.id === "A-HandleProfileSummaryResponse");

  assert(refresh);
  assert(response);
  assert.equal(refresh.processSteps.some((step) => step.details.some((detail) => detail.key === "partial")), false);
  const successDisplay = response.processSteps[0]?.outcomes.find((outcome) => outcome.result === "success")?.display;
  assert.equal(successDisplay?.target, "L-ProfileSummaryHost");
  assert.equal(successDisplay?.partial, "PRT-PROFILE-SUMMARY");
  const slotLayoutGroups = result.slotContents.flatMap((slot) => slot.layoutGroups);
  assert.equal(slotLayoutGroups.find((group) => group.id === "L-ProfileSummaryHost")?.partial?.id, "PRT-PROFILE-SUMMARY");
});

test("keeps release examples migrated to scenario sample data", () => {
  const exampleFiles = listExampleVspecFiles();

  assert.ok(exampleFiles.includes("02-states/scenario-samples.vspec.md"));
  assert.ok(!exampleFiles.includes("02-states/model-samples.vspec.md"));

  for (const file of exampleFiles) {
    const source = readFileSync(examplePath(file), "utf8");
    assert.ok(!source.includes("## Model Samples"), file);
    assert.ok(!/rows:\s*\$\{model\./.test(source), file);
  }
});

test("renders realistic examples with canonical property encodings", () => {
  const usersSource = readFileSync(examplePath("04-real-world-screens/search-list.vspec.md"), "utf8");
  const usersResult = parseMarkVSpec(usersSource);
  const usersHtml = renderMarkVSpecHtml(usersResult, { includeStyles: false });
  assert.match(usersHtml, /<option value="Active">Active<\/option>/);
  const nextPageResponse = usersResult.actions.find((action) => action.id === "A-HandleNextPageResponse");
  assert.equal(nextPageResponse?.triggeredBy, "A-NextPage.P1.response");
  assert.deepEqual(nextPageResponse?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["fetching", "success", "idle"],
    ["fetching", "empty", "empty"],
    ["fetching", "failure", "fetch-error"]
  ]);
  const previousPageResponse = usersResult.actions.find((action) => action.id === "A-HandlePreviousPageResponse");
  assert.equal(previousPageResponse?.triggeredBy, "A-PreviousPage.P1.response");
  assert.deepEqual(previousPageResponse?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["fetching", "success", "idle"],
    ["fetching", "empty", "empty"],
    ["fetching", "failure", "fetch-error"]
  ]);

  const asyncSource = readFileSync(examplePath("02-states/async-loading.vspec.md"), "utf8");
  const asyncHtml = renderMarkVSpecHtml(parseMarkVSpec(asyncSource), { includeStyles: false, state: "loaded" });
  assert.match(asyncHtml, /Account setup/);
  assert.match(asyncHtml, /Billing review/);
  assert.doesNotMatch(asyncHtml, /model\.items\.rows\.0\.name/);

  const templateSource = readFileSync(examplePath("05-reuse/template-shell.vspec.md"), "utf8");
  const templateResult = parseMarkVSpec(templateSource);
  assert.equal(templateResult.screen.type, "template");
  assert.equal(templateResult.slotDefinitions[0]?.name, "content");

  const responsiveTemplate = parseMarkVSpec(readFileSync(examplePath("05-reuse/responsive-template-shell.vspec.md"), "utf8"));
  const responsiveScreen = parseMarkVSpec(readFileSync(examplePath("05-reuse/responsive-slot-page.vspec.md"), "utf8"));
  const responsiveHtmlMobile = renderMarkVSpecHtml(composeMarkVSpecTemplate(responsiveTemplate, responsiveScreen), { includeStyles: false, viewport: "mobile" });
  const responsiveHtmlDesktop = renderMarkVSpecHtml(composeMarkVSpecTemplate(responsiveTemplate, responsiveScreen), { includeStyles: false, viewport: "desktop" });
  assert.match(responsiveHtmlMobile, /Mobile overview/);
  assert.doesNotMatch(responsiveHtmlMobile, /Desktop overview/);
  assert.match(responsiveHtmlDesktop, /Desktop overview/);
  assert.doesNotMatch(responsiveHtmlDesktop, /Mobile overview/);

  const defaultSlotScreen = parseMarkVSpec(readFileSync(examplePath("05-reuse/default-slot-page.vspec.md"), "utf8"));
  const defaultSlotHtml = renderMarkVSpecHtml(composeMarkVSpecTemplate(templateResult, defaultSlotScreen), { includeStyles: false, viewport: "desktop" });
  assert.match(defaultSlotHtml, /No content has been assigned to this template slot/);
});

test("preserves unknown sections as notes", () => {
  const source = `---
id: SCR-UNKNOWN
type: screen
title: Unknown
---

# SCR-UNKNOWN Unknown

## States

- idle*

## Implementation Notes

This section is not semantic yet.
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0]?.title, "Implementation Notes");
  assert.deepEqual(result.notes[0]?.lines, ["", "This section is not semantic yet.", ""]);
});

test("unquotes simple Front Matter scalars", () => {
  const source = `---
id: SCR-QUOTED
type: screen
title: "Quoted Login"
route: '/quoted-login'
---

# SCR-QUOTED Quoted Login

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.title, "Quoted Login");
  assert.equal(result.screen.route, "/quoted-login");
  assert.equal(result.diagnostics.length, 0);
});

test("parses Front Matter through YAML and Markdown AST headings", () => {
  const source = `---
id: SCR-YAML
type: screen
title: "Settings: Account"
route: "/settings/account"
tags:
  - account
  - settings
---

# SCR-YAML Settings: Account

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.title, "Settings: Account");
  assert.equal(result.screen.route, "/settings/account");
  assert.equal(result.screen.heading, "# SCR-YAML Settings: Account");
  assert.equal(result.screen.location?.line, lineNumber(source, "# SCR-YAML Settings: Account"));
  assert.deepEqual(result.screen.frontMatter["tags"], undefined);
  assert.deepEqual(result.diagnostics, []);
});

test("reports YAML Front Matter parser errors", () => {
  const source = `---
id: SCR-BROKEN
type: screen
title: [Broken
---

# SCR-BROKEN Broken
`;
  const result = parseMarkVSpec(source);

  assert(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.message.startsWith("Invalid YAML Front Matter:")));
  assert(result.diagnostics.some((diagnostic) => diagnostic.message.startsWith("Invalid YAML Front Matter:") && diagnostic.line === lineNumber(source, "title: [Broken")));
  assert(result.diagnostics.some((diagnostic) => diagnostic.message === "Missing required Front Matter field: id."));
});

test("parses Front Matter document reference mappings", () => {
  const source = `---
id: SCR-REFERENCES
type: screen
title: References
template:
  id: TPL-SHELL
  src: ../templates/shell.vspec.md
references:
  partials:
    PRT-PROFILE: "../partials/profile.vspec.md"
    PRT-NOTICES: '../partials/notices.vspec.md'
---

# SCR-REFERENCES References

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.template, "TPL-SHELL");
  assert.equal(result.screen.templateSrc, "../templates/shell.vspec.md");
  assert.deepEqual(result.screen.references.templates, {});
  assert.deepEqual(result.screen.references.partials, {
    "PRT-PROFILE": "../partials/profile.vspec.md",
    "PRT-NOTICES": "../partials/notices.vspec.md"
  });
  assert.equal(result.diagnostics.length, 0);
});

test("reports removed Front Matter template reference syntax", () => {
  const source = `---
id: SCR-OLD-REFERENCES
type: screen
title: Old References
template: TPL-SHELL
references:
  templates:
    TPL-SHELL: ../templates/shell.vspec.md
---

# SCR-OLD-REFERENCES Old References

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.template, undefined);
  assert.equal(result.screen.templateSrc, undefined);
  assert(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.message === "template must be a map with id and src."));
  assert(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.message === "references.templates has been removed. Use template.id and template.src."));
});

test("reports path-only Front Matter template syntax", () => {
  const source = `---
id: SCR-PATH-TEMPLATE
type: screen
title: Path Template
template: ../templates/shell.vspec.md
---

# SCR-PATH-TEMPLATE Path Template

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.template, undefined);
  assert.equal(result.screen.templateSrc, undefined);
  assert(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.message === "template must be a map with id and src."));
});

test("allows Japanese local ID names", () => {
  const source = `---
id: SCR-JA-ID
type: screen
title: Japanese IDs
---

# SCR-JA-ID Japanese IDs

## States

- idle*
- validation-error

## Layout: mobile

### L-ページ Page

- stack

#### Items

- E-ページヘッダ
- "メール": E-メール入力

## Elements

### 1:E-ページヘッダ Heading

- level: 1
- value: ログイン

### 2:E-メール入力 Input*

- label: メール
- value: \${model.email}
- initial value: "taro@example.com"
- disabled when: E-ページヘッダ is hidden

### 3:E-保存ボタン Button

- label: 保存
- action: A-保存

## Actions

### A-保存 save

- Triggered
  - E-保存ボタン.click
- From
  - idle
- Process: HttpRequest
  - POST /save
    - email: E-メール入力.value
- Process: Immediate
  - Effects
    - state: validation-error
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.diagnostics.length, 0);
  assert(result.layoutGroups.some((group) => group.id === "L-ページ"));
  assert.equal(result.elements.find((element) => element.id === "E-ページヘッダ")?.type, "Heading");
  assert.equal(result.elements.find((element) => element.id === "E-ページヘッダ")?.properties["marker"], "1");
  assert.equal(result.elements.find((element) => element.id === "E-メール入力")?.properties["required"], true);
  assert.equal(result.elements.find((element) => element.id === "E-メール入力")?.properties["value"], "\${model.email}");
  assert.equal(result.elements.find((element) => element.id === "E-メール入力")?.properties["initial value"], "taro@example.com");
  assert.deepEqual(result.actions[0]?.trigger, { elementId: "E-保存ボタン", event: "click" });
  assert.deepEqual(result.actions[0]?.processSteps.find((step) => step.name === "HttpRequest")?.details.filter((detail) => detail.key !== "request").map((detail) => [detail.key, detail.value]), [
    ["email", "E-メール入力.value"]
  ]);
});

test("keeps brace-containing literal text values unchanged", () => {
  const source = `---
id: SCR-BRACES
type: screen
title: Braces
---

# SCR-BRACES Braces

## States

- idle*

## Elements

### E-Message Text

- value: Use {name}
`;
  const result = parseMarkVSpec(source);
  const message = result.elements.find((element) => element.id === "E-Message");

  assert.equal(result.diagnostics.length, 0);
  assert.equal(message?.properties["value"], "Use {name}");
  assert.equal(message?.properties["initial value"], undefined);
});

test("uses top-level prose as the screen description without creating a free-form section", () => {
  const source = `---
id: SCR-NOTES
type: screen
title: Notes
---

# SCR-NOTES Notes

This screen has top-level prose.

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.description, "This screen has top-level prose.");
  assert.equal(result.notes.length, 0);
});

test("ignores standalone HTML comments in top-level screen description", () => {
  const source = `---
id: SCR-COMMENT-DESCRIPTION
type: screen
title: Comment Description
---

# SCR-COMMENT-DESCRIPTION Comment Description

Visible description before.

<!-- hidden one-line comment -->

<!--
hidden multi-line comment
-->

Visible description after.

## States

- idle*
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.screen.description, "Visible description before.\n\nVisible description after.");
  assert.deepEqual(result.diagnostics, []);
});

test("preserves named free-form sections with heading lines", () => {
  const source = `---
id: SCR-NOTES-SECTIONS
type: screen
title: Notes Sections
---

# SCR-NOTES-SECTIONS Notes Sections

## Notes

- Confirm copy.

## Open Questions

- Should this be inline?
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.notes.map((note) => [note.title, note.line]), [
    ["Notes", lineNumber(source, "## Notes")],
    ["Open Questions", lineNumber(source, "## Open Questions")]
  ]);
  assert.deepEqual(result.notes[0]?.lines, ["", "- Confirm copy.", ""]);
  assert.deepEqual(result.notes[1]?.lines, ["", "- Should this be inline?", ""]);
});

test("reports missing element and action references", () => {
  const source = `---
id: SCR-BROKEN
type: screen
title: Broken
---

# SCR-BROKEN Broken

## States

- idle*

## Layout: mobile

### L-001 Page

- stack

#### Items

- E-999

## Elements

### E-001 Button

- label: Save
- action: A-999
- disabled when: E-404 is empty

## Form Groups

### F-001 Save form

- fields: E-001

## Actions

### A-001 save

- Triggered
  - E-999.click
- From
  - idle
- Process: Preprocess
  - update:
    - target: L-999
    - content: Missing
- Process: Render
  - update:
    - target: F-001
    - content: Invalid form target
- Process: Immediate
  - Effects
    - state: missing
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Layout L-001 contains missing target E-999."));
  assert(messages.includes("Element E-001 references missing action A-999."));
  assert(messages.includes("Action A-001 trigger references missing element E-999."));
  assert(messages.includes("Action A-001 process step Preprocess targets missing layout or element L-999."));
  assert(messages.includes("Action A-001 process step Render cannot target FormGroup F-001. Use an L-* layout target for updates."));
  assert(messages.includes("Condition references missing ID E-404."));
  assert(messages.includes("Transition references missing target state missing."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Element E-001 references missing action A-999.")
      ?.line,
    lineNumber(source, "- action: A-999")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-001 process step Preprocess targets missing layout or element L-999.")
      ?.line,
    lineNumber(source, "    - target: L-999")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-001 process step Render cannot target FormGroup F-001. Use an L-* layout target for updates.")
      ?.line,
    lineNumber(source, "    - target: F-001")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Condition references missing ID E-404.")?.severity,
    "warning"
  );
  assert(result.diagnostics.every((diagnostic) => typeof diagnostic.line === "number"));
});

test("warns for missing initial state and unknown semantic kinds", () => {
  const source = `---
id: SCR-WARN
type: screen
title: Warn
---

# SCR-WARN Warn

## States

- idle

## Layout: mobile

### L-001 Page

- carousel

## Elements

### E-001 CustomThing

- value: Example
`;
  const result = parseMarkVSpec(source);
  const diagnostics = result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message]);

  assert.deepEqual(diagnostics, [
    ["warning", "No initial state is marked; the first state will be treated as initial."],
    ["warning", "Unknown layout kind: carousel."],
    ["warning", "Unknown element type: CustomThing."]
  ]);
});

test("allows explicit custom element types", () => {
  const source = `---
id: SCR-CUSTOM-ELEMENT
type: screen
title: Custom Element
---

# SCR-CUSTOM-ELEMENT Custom Element

## States

- idle*

## Elements

### E-Map custom:Map

- value: Example
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.elements[0]?.type, "custom:Map");
});

test("reports removed region layout kind as an error", () => {
  const source = `---
id: SCR-REGION
type: screen
title: Region
---

# SCR-REGION Region

## States

- idle*

## Layout: mobile

### L-Message Message Area

- region
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message]), [
    ["error", "Layout kind region is no longer supported. Use stack, row, grid, or inline."]
  ]);
});

test("warns when semantic sections are out of recommended order", () => {
  const source = `---
id: SCR-SECTION-ORDER
type: screen
title: Section Order
---

# SCR-SECTION-ORDER Section Order

## States

- idle*

## Elements

### E-Title Heading

- value: Title

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Actions
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [[
      "warning",
      "Section ## Layout: mobile appears after a later section. Recommended order is States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History.",
      lineNumber(source, "## Layout: mobile")
    ]]
  );
});

test("parses composite validations section", () => {
  const source = `---
id: SCR-VALIDATIONS
type: screen
title: Validations
---

# SCR-VALIDATIONS Validations

## States

- idle*

## Elements

### E-パスワード入力 Input

- value: \${model.password}

### E-PasswordConfirmInput Input

- value: \${model.passwordConfirm}

## Actions

### A-SaveUser Save user

- Triggered
  - E-パスワード入力.submit

## Validations

### V-PasswordConfirmation Password confirmation

- target: E-パスワード入力
- target: E-PasswordConfirmInput
- rules:
  - same-as:
    - E-パスワード入力
    - E-PasswordConfirmInput
- condition: E-パスワード入力.value equals E-PasswordConfirmInput.value
- message: Password and confirmation must match.
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.validations.length, 1);
  assert.equal(result.validations[0]?.id, "V-PasswordConfirmation");
  assert.equal(result.validations[0]?.name, "Password confirmation");
  assert.deepEqual(result.validations[0]?.properties["target"], ["E-パスワード入力", "E-PasswordConfirmInput"]);
  assert.deepEqual(result.validations[0]?.rules, [
    {
      name: "same-as",
      targets: ["E-パスワード入力", "E-PasswordConfirmInput"],
      location: { line: lineNumber(source, "  - same-as:") },
      raw: "same-as:"
    }
  ]);
  assert.equal(result.validations[0]?.properties["condition"], "E-パスワード入力.value equals E-PasswordConfirmInput.value");
  assert.equal(result.validations[0]?.properties["message"], "Password and confirmation must match.");
});

test("validates composite validation references", () => {
  const source = `---
id: SCR-VALIDATION-DIAGNOSTICS
type: screen
title: Validation Diagnostics
---

# SCR-VALIDATION-DIAGNOSTICS Validation Diagnostics

## States

- idle*

## Validations

### V-CrossField Cross-field validation

- target: E-MissingInput
- trigger: A-MissingSave
- trigger: E-メールアドレス入力
- condition: E-MissingInput.value equals E-OtherInput.value
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Validation V-CrossField targets missing element E-MissingInput.", lineNumber(source, "- target: E-MissingInput")],
      ["warning", "Validation V-CrossField trigger is not canonical. Actions should consume V-CrossField.result instead of defining validation triggers.", lineNumber(source, "- trigger: A-MissingSave")],
      ["warning", "Validation V-CrossField trigger is not canonical. Actions should consume V-CrossField.result instead of defining validation triggers.", lineNumber(source, "- trigger: E-メールアドレス入力")],
      ["warning", "Condition references missing ID E-MissingInput.", lineNumber(source, "- condition: E-MissingInput.value equals E-OtherInput.value")],
      ["warning", "Condition references missing ID E-OtherInput.", lineNumber(source, "- condition: E-MissingInput.value equals E-OtherInput.value")]
    ]
  );
});

test("validates FormGroup references and composite layout validation targets", () => {
  const source = `---
id: SCR-FORMGROUP-DIAGNOSTICS
type: screen
title: FormGroup Diagnostics
---

# SCR-FORMGROUP-DIAGNOSTICS FormGroup Diagnostics

## States

- idle*

## Layout: mobile

### L-LoginForm Login form layout

- stack

## Elements

### E-EmailInput Input

- value: \${model.email}

### E-Title Heading

- value: Login

## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-MissingInput
  - E-Title
- submit: A-MissingSubmit

## Validations

### V-LoginForm Login form validation

- target: L-LoginForm
- rules:
  - required:
    - E-EmailInput
  - form-ready:
    - F-MissingRuleForm
- scope: composite
- message: Email is required.

### V-MissingFormGroup Missing form group validation

- target: F-MissingForm
- rules:
  - required:
    - E-EmailInput

### V-MultipleElements Existing multiple element targets

- target: E-EmailInput
- target: E-Title
- rules:
  - required:
    - E-EmailInput
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "FormGroup F-LoginForm field references missing element E-MissingInput.", lineNumber(source, "  - E-MissingInput")],
      ["warning", "FormGroup F-LoginForm field E-Title is Heading, which is not an input element.", lineNumber(source, "  - E-Title")],
      ["error", "FormGroup F-LoginForm submit references missing action A-MissingSubmit.", lineNumber(source, "- submit: A-MissingSubmit")],
      ["warning", "Validation V-LoginForm targets layout L-LoginForm for composite validation. Use a FormGroup target such as F-LoginForm instead.", lineNumber(source, "- target: L-LoginForm")],
      ["error", "Validation V-LoginForm rule form-ready references missing form group F-MissingRuleForm.", lineNumber(source, "  - form-ready:")],
      ["warning", "Validation V-LoginForm must not define scope; use Field Validations or Cross-field Validations section instead.", lineNumber(source, "- scope: composite")],
      ["error", "Validation V-MissingFormGroup targets missing form group F-MissingForm.", lineNumber(source, "- target: F-MissingForm")]
    ]
  );
});

test("warns when a FormGroup scope cannot be resolved to a layout group", () => {
  const source = `---
id: SCR-FORMGROUP-SCOPE
type: screen
title: FormGroup Scope
---

# SCR-FORMGROUP-SCOPE FormGroup Scope

## States

- idle*

## Layout: mobile

### L-Other Other

- stack

## Elements

### E-Email Input

- value: \${model.email}

## Form Groups

### F-LoginForm Login form

- fields: E-Email
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["warning", "FormGroup F-LoginForm scope cannot be resolved to a layout group. Preview will show the form group only in details.", lineNumber(source, "### F-LoginForm Login form")]
    ]
  );
});

test("diagnoses unsupported validation run values", () => {
  const source = `---
id: SCR-VALIDATION-GROUPS
type: screen
title: Validation Groups
---

# SCR-VALIDATION-GROUPS Validation Groups

## States

- idle*

## Elements

### E-メールアドレス入力 Input

- value: \${model.email}

### E-パスワード入力 Input

- value: \${model.password}

### E-PasswordConfirmInput Input

- value: \${model.passwordConfirm}

## Actions

### A-SaveUser Save user

- Triggered
  - E-メールアドレス入力.submit

## Field Validations

### V-EmailRequired Email required

- target: E-メールアドレス入力
- rules:
  - required:
    - E-メールアドレス入力
- run: client
- condition: E-メールアドレス入力.value is empty

## Cross-field Validations

### V-PasswordConfirmation Password confirmation

- target: E-パスワード入力
- target: E-PasswordConfirmInput
- rules:
  - same-as:
    - E-パスワード入力
    - E-PasswordConfirmInput
- run: server
- condition: E-パスワード入力.value equals E-PasswordConfirmInput.value
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [["warning", "Validation V-PasswordConfirmation run server is not supported. Use client.", lineNumber(source, "- run: server")]]
  );
});

test("parses canonical field and cross-field validation sections", () => {
  const source = `---
id: SCR-CANONICAL-VALIDATIONS
type: screen
title: Canonical Validations
---

# SCR-CANONICAL-VALIDATIONS Canonical Validations

## States

- idle*

## Layout: mobile

### L-PasswordForm Password form layout

- stack

#### Items

- E-PasswordInput
- E-PasswordConfirmInput

## Elements

### E-EmailInput Input

- value: \${model.email}
- input rule:
  - min length: 3
  - max length: 120

### E-PasswordInput Input

- value: \${model.password}

### E-PasswordConfirmInput Input

- value: \${model.passwordConfirm}

## Form Groups

### F-PasswordForm Password form

- fields:
  - E-PasswordInput
  - E-PasswordConfirmInput

## Field Validations

### V1:V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
  - length: element
    - message: Email length must follow the input specification.
  - email:
    - message: Enter a valid email address.

## Cross-field Validations

### V2:V-PasswordConfirmation Password confirmation

- target: F-PasswordForm
- inputs:
  - E-PasswordInput
  - E-PasswordConfirmInput
- check: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password and confirmation must match.
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.validations.length, 2);
  assert.equal(result.validations[0]?.properties["scope"], "field");
  assert.equal(result.validations[0]?.properties["run"], "client");
  assert.deepEqual(result.validations[0]?.rules.map((rule) => [rule.name, rule.targets]), [
    ["required", []],
    ["length", ["element"]],
    ["email", []]
  ]);
  assert.deepEqual(result.validations[0]?.properties["message"], [
    "Email is required.",
    "Email length must follow the input specification.",
    "Enter a valid email address."
  ]);
  assert.equal(result.validations[1]?.properties["scope"], "cross-field");
  assert.deepEqual(result.validations[1]?.properties["input"], ["E-PasswordInput", "E-PasswordConfirmInput"]);
  assert.equal(result.validations[1]?.properties["check"], "E-PasswordInput.value equals E-PasswordConfirmInput.value");
  assert.equal(result.validations[1]?.properties["message"], "Password and confirmation must match.");
});

test("diagnoses authored validation scope in canonical split sections", () => {
  const source = `---
id: SCR-VALIDATION-SCOPE
type: screen
title: Validation Scope
---

# SCR-VALIDATION-SCOPE Validation Scope

## States

- idle*

## Elements

### E-EmailInput Input

- value: \${model.email}

## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- scope: composite
- constraints:
  - required:
    - message: Email is required.
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [["warning", "Validation V-EmailRules must not define scope; use Field Validations or Cross-field Validations section instead.", lineNumber(source, "- scope: composite")]]
  );
});

test("parses input rules and error code contracts", () => {
  const source = `---
id: SCR-INPUT-CONTRACT
type: screen
title: Input Contract
---

# SCR-INPUT-CONTRACT Input Contract

## States

- idle*

## Elements

### E-メールアドレス入力 Input*

- label: Email
- value: \${model.email}
- input rule:
  - type: email
  - max length: 255

## Actions

### A-Save Save

- Triggered
  - E-メールアドレス入力.submit
- From
  - idle
- Process: Validate: V-メール形式.result
- Process: Immediate
  - case: validationError
    - error code: ERR-EMAIL-FORMAT
    - Effects
      - state: idle

## Field Validations

### V-メール形式 Email format

- target: E-メールアドレス入力
- rules:
  - email:
    - E-メールアドレス入力
- condition: E-メールアドレス入力.value matches email
- message: Email format is invalid.
- error code: ERR-EMAIL-FORMAT

## Business Rules

### R1:R-EMAIL Email rule

- description: Email must use a valid mailbox format.
- messages:
  - Email format is invalid.

## Error Codes

### ER1:ERR-EMAIL-FORMAT Email format

- business rule: R-EMAIL
- target: E-メールアドレス入力
- message: Email format is invalid.
- display: inline
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.elements[0]?.inputRules.map((rule) => [rule.key, rule.value]), [
    ["type", "email"],
    ["max length", "255"]
  ]);
  assert.equal(result.validations[0]?.properties["error code"], "ERR-EMAIL-FORMAT");
  assert.deepEqual(result.rules[0]?.properties, {
    marker: "R1",
    description: "Email must use a valid mailbox format.",
    messages: "Email format is invalid."
  });
  assert.equal(result.errorCodes[0]?.id, "ERR-EMAIL-FORMAT");
  assert.equal(result.errorCodes[0]?.properties["marker"], "ER1");
  assert.equal(result.errorCodes[0]?.properties["business rule"], "R-EMAIL");
  assert.equal(result.actions[0]?.processSteps[0]?.details[0]?.value, "V-メール形式.result");
  assert.deepEqual(result.actions[0]?.processSteps.find((step) => step.name === "Immediate")?.outcomes[0]?.errorCodes, ["ERR-EMAIL-FORMAT"]);
});

test("preserves free-form business rules and validates error code contract fields", () => {
  const source = `---
id: SCR-ERROR-CODE-DIAGNOSTICS
type: screen
title: Error Code Diagnostics
---

# SCR-ERROR-CODE-DIAGNOSTICS Error Code Diagnostics

## States

- idle*

## Business Rules

- Server validation errors replace the form error area.

## Error Codes

### ERR-INCOMPLETE Incomplete contract

- business rule: R-BusinessRules
- display: modal
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.rules[0]?.id, "R-BusinessRules");
  assert.deepEqual(result.rules[0]?.bullets.map((bullet) => bullet.text), [
    "Server validation errors replace the form error area."
  ]);
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      ["error", "Error code ERR-INCOMPLETE must define target.", lineNumber(source, "### ERR-INCOMPLETE Incomplete contract")],
      ["error", "Error code ERR-INCOMPLETE must define message.", lineNumber(source, "### ERR-INCOMPLETE Incomplete contract")],
      ["warning", "Error code ERR-INCOMPLETE display modal is not recognized. Use inline, form, global, banner, toast, dialog, or none.", lineNumber(source, "- display: modal")]
    ]
  );
});

test("preserves business rule body markdown lines for generated documents", () => {
  const source = `---
id: SCR-BUSINESS-RULE-MARKDOWN
type: screen
title: Business Rule Markdown
---

# SCR-BUSINESS-RULE-MARKDOWN Business Rule Markdown

## States

- idle*

## Business Rules

### R-BalanceVisibility Display rule

- \`\${model.pointInfo}\` が null の場合は残高サマリーを非表示にする。
- \`\${model.errorMessage}\` が **null でない** 場合は load-error 状態として扱う。
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.rules[0]?.id, "R-BalanceVisibility");
  assert.deepEqual(result.rules[0]?.bodyLines, [
    "- `${model.pointInfo}` が null の場合は残高サマリーを非表示にする。",
    "- `${model.errorMessage}` が **null でない** 場合は load-error 状態として扱う。"
  ]);
  assert.deepEqual(result.rules[0]?.bullets.map((bullet) => bullet.text), [
    "${model.pointInfo} が null の場合は残高サマリーを非表示にする。",
    "${model.errorMessage} が null でない 場合は load-error 状態として扱う。"
  ]);
});

test("does not parse Rules section as business rules", () => {
  const source = `---
id: SCR-RULES-REMOVED
type: screen
title: Rules Removed
---

# SCR-RULES-REMOVED Rules Removed

## States

- idle*

## Rules

### R-Legacy Legacy rule

- Legacy rule text.
`;
  const result = parseMarkVSpec(source);
  const notes = result.notes.find((note) => note.title === "Rules");

  assert.deepEqual(result.rules, []);
  assert(notes);
  assert(notes.lines.some((line) => line.includes("R-Legacy Legacy rule")));
});

test("does not let unknown sections affect semantic section order lint", () => {
  const source = `---
id: SCR-UNKNOWN-SECTION-ORDER
type: screen
title: Unknown Section Order
---

# SCR-UNKNOWN-SECTION-ORDER Unknown Section Order

## States

- idle*

## Draft Notes

This exploratory section should stay plain Markdown.

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Title
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("preserves free-form sections in any order", () => {
  const source = `---
id: SCR-NOTE-ORDER
type: screen
title: Note Order
---

# SCR-NOTE-ORDER Note Order

## States

- idle*

## Open Questions

- Is this enough?

## Notes

- Keep this note.
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("warns when an action has no trigger", () => {
  const source = `---
id: SCR-MISSING-TRIGGER
type: screen
title: Missing Trigger
---

# SCR-MISSING-TRIGGER Missing Trigger

## States

- idle*

## Actions

### A-Submit Submit

- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [[
      "warning",
      "Action A-Submit has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response.",
      lineNumber(source, "### A-Submit Submit")
    ]]
  );
});

test("reports removed Radio and EmptyState element types as unknown", () => {
  const source = `---
id: SCR-REMOVED-ELEMENTS
type: screen
title: Removed Elements
---

# SCR-REMOVED-ELEMENTS Removed Elements

## States

- idle*

## Elements

### E-Plan Radio

- label: Pro

### E-Empty EmptyState

- sample: No records
`;
  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Unknown element type: Radio."));
  assert(messages.includes("Unknown element type: EmptyState."));
});

test("reports duplicate IDs", () => {
  const source = `---
id: SCR-DUP
type: screen
title: Dup
---

# SCR-DUP Dup

## States

- idle*

## Elements

### E-001 Text

- value: One

### E-001 Text

- value: Two
`;
  const result = parseMarkVSpec(source);

  assert(result.diagnostics.some((diagnostic) => diagnostic.message === "Duplicate element ID: E-001."));
});

test("warns for unsupported action events", () => {
  const source = `---
id: SCR-EVENT
type: screen
title: Event
---

# SCR-EVENT Event

## States

- idle*

## Elements

### E-001 Button

- label: Save

## Actions

### A-001 save

- Triggered
  - E-001.hover
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [["warning", "Action A-001 uses unsupported event hover.", lineNumber(source, "  - E-001.hover")]]
  );
});

test("warns when outcome details do not match transition results", () => {
  const source = `---
id: SCR-OUTCOME
type: screen
title: Outcome
---

# SCR-OUTCOME Outcome

## States

- idle*
- loading
- error

## Layout: mobile

### L-Message Message

- stack

## Actions

### A-Submit submit

- Triggered
  - service.response
- Process: Immediate
  - case: failure
    - Effects
      - update:
        - target: L-Message
        - content: Failure message
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-Submit has invalid trigger service.response. Expected Element action:, ## Events page.load or partial.render, or A-ActionId.P-marker.response.",
        lineNumber(source, "  - service.response")
      ],
      [
        "warning",
        "Action A-Submit process step Immediate defines failure outcome details but has no failure transition.",
        lineNumber(source, "        - target: L-Message")
      ]
    ]
  );
});

test("parses canonical action groups with four-space indentation", () => {
  const source = `---
id: SCR-NESTED-ACTION
type: screen
title: Nested Action
---

# SCR-NESTED-ACTION Nested Action

## States

- idle*
- error

## Layout: mobile

### L-MessageArea Message Area

- stack

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit submit

- Triggered
    - E-Submit.click
- From
    - idle
- Process: HttpRequest
    - POST /submit
        - email: E-Submit.value
- Process: Immediate
    - case: failure
        - description: 400
        - Effects
            - state: error
            - update:
                - target: L-MessageArea
                - content: Failure message
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Submit");

  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(action?.processSteps.find((step) => step.name === "HttpRequest")?.details.filter((detail) => detail.key !== "request").map((detail) => [detail.key, detail.value]), [["email", "E-Submit.value"]]);
  assert.deepEqual(action?.responses, []);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [["idle", "failure", "error"]]);
  assert.deepEqual(action?.processSteps.find((step) => step.name === "Immediate")?.outcomes.map((outcome) => [outcome.result, outcome.target, outcome.content]), [
    ["failure", "L-MessageArea", "Failure message"]
  ]);
});

test("parses Otherwise as an action fallback branch", () => {
  const source = `---
id: SCR-OTHERWISE
type: screen
title: Otherwise
---

# SCR-OTHERWISE Otherwise

## States

- idle*
- validation-error
- authenticating

## Layout: mobile

### L-MessageArea Message Area

- stack

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process P1: Submit request
  - Effects
    - state: authenticating
- Otherwise
  - state: validation-error
  - update:
    - target: L-MessageArea
    - content: Validation message
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Submit");

  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["idle", undefined, "authenticating"],
    ["idle", "otherwise", "validation-error"]
  ]);
  assert.deepEqual(action?.outcomes.map((outcome) => [outcome.result, outcome.target, outcome.content]), [
    ["otherwise", "L-MessageArea", "Validation message"]
  ]);
});

test("rejects action-level When blocks", () => {
  const source = `---
id: SCR-CONDITIONS
type: screen
title: Conditions
---

# SCR-CONDITIONS Conditions

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

## Elements

### E-メールアドレス入力 Input

### E-パスワード入力 Input

### E-入力省略チェック Checkbox

### E-Submit Button

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- When
  - all:
    - E-メールアドレス入力 is not empty
    - any:
      - E-パスワード入力 is not empty
      - E-入力省略チェック is checked
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Submit");
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Submit has unsupported top-level entry: When. Use From, Process P1: <name>, or Otherwise."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-Submit has unsupported top-level entry: When. Use From, Process P1: <name>, or Otherwise.")?.line,
    lineNumber(source, "- When")
  );
  assert.equal(action?.id, "A-Submit");
});

test("rejects singular action group aliases", () => {
  const source = `---
id: SCR-ACTION-ALIASES
type: screen
title: Action Aliases
---

# SCR-ACTION-ALIASES Action Aliases

## States

- idle*

## Actions

### A-Submit Submit

- Triggered
  - screen.load
- From
  - idle
- Effect
  - state: loading
- Case
  - success:
    - state: idle
- Else
  - state: idle
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Submit has unsupported top-level entry: Effect. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Submit has unsupported top-level entry: Case. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Submit has unsupported top-level entry: Else. Use From, Process P1: <name>, or Otherwise."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-Submit has unsupported top-level entry: Effect. Use From, Process P1: <name>, or Otherwise.")?.line,
    lineNumber(source, "- Effect")
  );
});

test("rejects removed action groups when they are the only action list", () => {
  const source = `---
id: SCR-REMOVED-ACTION-GROUP
type: screen
title: Removed Action Group
---

# SCR-REMOVED-ACTION-GROUP Removed Action Group

## States

- idle*

## Actions

### A-Submit Submit

- When
  - E-Input is not empty
`;
  const result = parseMarkVSpec(source);

  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-Submit has unsupported top-level entry: When. Use From, Process P1: <name>, or Otherwise.")?.line,
    lineNumber(source, "- When")
  );
  assert.equal(result.actions.find((candidate) => candidate.id === "A-Submit")?.overview?.length ?? 0, 0);
});

test("rejects removed legacy action DSL forms directly", () => {
  const source = `---
id: SCR-LEGACY-ACTION-DSL
type: screen
title: Legacy Action DSL
---

# SCR-LEGACY-ACTION-DSL Legacy Action DSL

## States

- idle*
- loading
- done

## Actions

### A-Legacy Legacy

- Triggered
  - E-Submit.click
- From
  - idle
- Effects
  - state: loading
- Cases
  - success:
    - state: done
- Process
  - HttpRequest
    - POST /legacy
    - cases:
      - sent:
        - state: loading
- Resolve: load-group
- Process: ServerCall
  - Service.call()
  - case: success
    - \${model.member.loaded}: true
  - cases:
    - old:
      - state: done
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Legacy");
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Legacy has unsupported top-level entry: Effects. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Legacy has unsupported top-level entry: Cases. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Legacy has unsupported top-level entry: Process. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Legacy has unsupported top-level entry: Resolve: load-group. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Legacy process step ServerCall uses removed cases block syntax. Use direct case: <name> entries under Process: ServerCall."));
  assert(messages.includes("Action A-Legacy has unsupported process step ServerCall case success entry: ${model.member.loaded}: true. Use description, state, navigate, response, from, params, update, stop, or continue."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("unsupported top-level entry: Effects"))?.line,
    lineNumber(source, "- Effects")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("removed cases block syntax"))?.line,
    lineNumber(source, "  - cases:")
  );
  assert.deepEqual(action?.transitions, []);
  assert.deepEqual(action?.sideEffects, []);
  assert.deepEqual(action?.outcomes, []);
  assert.deepEqual(action?.processSteps.find((step) => step.name === "ServerCall")?.outcomes.find((outcome) => outcome.result === "success")?.sideEffects, []);
});

test("reports process condition references on the leaf line", () => {
  const source = `---
id: SCR-CONDITION-REF
type: screen
title: Condition Ref
---

# SCR-CONDITION-REF Condition Ref

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

## Elements

### E-Submit Button

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: Preprocess
  - when: E-Missing is not empty
`;
  const result = parseMarkVSpec(source);
  const diagnostic = result.diagnostics.find((candidate) => candidate.message === "Condition references missing ID E-Missing.");

  assert.equal(diagnostic?.line, lineNumber(source, "  - when: E-Missing is not empty"));
});

test("parses screen load server call actions", () => {
  const source = `---
id: SCR-SERVER-CALL
type: screen
title: Server Call
---

# SCR-SERVER-CALL Server Call

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

## Elements

### E-Title Heading

- value: Server Call

## Actions

### A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process: ServerCall
  - MemberQueryService.findSelfProfile()
    - includePreferences: true
  - case: success
    - description: ApiBridgeResult.Success<MemberProfileDto>
    - Effects
      - state: idle
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Load");
  const clientCall = action?.processSteps[0];
  const success = clientCall?.outcomes.find((outcome) => outcome.result === "success");

  assert.equal(result.diagnostics.length, 0);
  assert.equal(action?.triggeredBy, "screen.load");
  assert.equal(clientCall?.name, "ServerCall");
  assert.deepEqual(clientCall?.details.map((detail) => [detail.key, detail.value]), [
    ["call", "MemberQueryService.findSelfProfile()"],
    ["includePreferences", "true"]
  ]);
  assert.deepEqual(success?.description ? [["success", success.description]] : [], [
    ["success", "ApiBridgeResult.Success<MemberProfileDto>"]
  ]);
});

test("parses built-in Events lifecycle dispatches", () => {
  const source = `---
id: SCR-EVENTS
type: screen
title: Events
---

# SCR-EVENTS Events

## States

- before-load+
- initializing*
- idle

## Events

- page.load: A-Load
- partial.render: A-RefreshPartial

## Actions

### A-Load Load

- From
  - before-load
- Process P1: Load
  - request:
    - method: GET
    - path: /items
  - case: sent
    - Effects
      - state: initializing
  - case: success
    - Effects
      - state: idle

### A-RefreshPartial Refresh partial

- From
  - idle
- Process P1: Refresh partial
  - request:
    - method: GET
    - path: /summary
  - case: success
    - Effects
      - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.events.map((event) => [event.event, event.actionId]), [
    ["page.load", "A-Load"],
    ["partial.render", "A-RefreshPartial"]
  ]);
  assert.equal(result.actions.find((action) => action.id === "A-Load")?.triggeredBy, "page.load");
  assert.equal(result.actions.find((action) => action.id === "A-RefreshPartial")?.triggeredBy, "partial.render");
});

test("infers action callers from Element action events", () => {
  const source = `---
id: SCR-ACTION-EVENTS
type: screen
title: Action Events
---

# SCR-ACTION-EVENTS Action Events

## States

- idle*

## Layout: desktop

### L-ProfilePanel Profile panel

- stack

### L-BillingPanel Billing panel

- stack

## Elements

### E-SearchInput Input

- action: A-MarkChanged
- action event: change

### E-EmailInput Input

- action: A-ValidateEmail
- action event: blur

### E-PreferencesForm custom:Form

- action: A-SubmitPreferences
- action event: submit

### E-HelpIcon Icon

- action: A-ShowHelp
- action event: focus

### E-ConfirmDialog Dialog

- actions: E-CloseButton
- action: A-CloseDialog
- action event: close

### E-CloseButton Button

- action: A-CloseDialog

### E-SettingsTabs Tabs

- active: Profile
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - action: A-SelectBillingTab

### E-KeyboardTabs Tabs

- active: Profile
- action event: change
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-SelectKeyboardProfileTab

### E-AdvancedFilters Accordion

- open: Profile
- items:
  - Profile
    - panel: L-ProfilePanel
    - action: A-ToggleProfileFilters

### E-ShippingDetails Disclosure

- label: Shipping details
- open: true
- panel: L-BillingPanel
- action: A-ToggleShippingDetails

### E-RowActions ActionMenu

- label: More actions
- open: true
- items:
  - Edit
    - action: A-EditRow

## Actions

### A-MarkChanged Mark changed

- Process P1: Immediate
  - Effects
    - state: idle

### A-ValidateEmail Validate email

- Process P1: Immediate
  - Effects
    - state: idle

### A-SubmitPreferences Submit preferences

- Process P1: Immediate
  - Effects
    - state: idle

### A-ShowHelp Show help

- Process P1: Immediate
  - Effects
    - state: idle

### A-CloseDialog Close dialog

- Process P1: Immediate
  - Effects
    - state: idle

### A-SelectProfileTab Select profile tab

- Process P1: Immediate
  - Effects
    - state: idle

### A-SelectBillingTab Select billing tab

- Process P1: Immediate
  - Effects
    - state: idle

### A-SelectKeyboardProfileTab Select keyboard profile tab

- Process P1: Immediate
  - Effects
    - state: idle

### A-ToggleProfileFilters Toggle profile filters

- Process P1: Immediate
  - Effects
    - state: idle

### A-ToggleShippingDetails Toggle shipping details

- Process P1: Immediate
  - Effects
    - state: idle

### A-EditRow Edit row

- Process P1: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const triggers = new Map(result.actions.map((action) => [action.id, action.triggeredBy]));

  assert.equal(result.diagnostics.length, 0);
  assert.equal(triggers.get("A-MarkChanged"), "E-SearchInput.change");
  assert.equal(triggers.get("A-ValidateEmail"), "E-EmailInput.blur");
  assert.equal(triggers.get("A-SubmitPreferences"), "E-PreferencesForm.submit");
  assert.equal(triggers.get("A-ShowHelp"), "E-HelpIcon.focus");
  assert.equal(triggers.get("A-CloseDialog"), "E-ConfirmDialog.close");
  assert.equal(triggers.get("A-SelectProfileTab"), "E-SettingsTabs.click");
  assert.equal(triggers.get("A-SelectBillingTab"), "E-SettingsTabs.click");
  assert.equal(triggers.get("A-SelectKeyboardProfileTab"), "E-KeyboardTabs.change");
  assert.equal(triggers.get("A-ToggleProfileFilters"), "E-AdvancedFilters.click");
  assert.equal(triggers.get("A-ToggleShippingDetails"), "E-ShippingDetails.click");
  assert.equal(triggers.get("A-EditRow"), "E-RowActions.click");
});

test("validates built-in Events dispatches", () => {
  const source = `---
id: SCR-EVENTS-DIAGNOSTICS
type: screen
title: Events Diagnostics
---

# SCR-EVENTS-DIAGNOSTICS Events Diagnostics

## Events

- page.load: A-Missing
- partial.render: A-Load
- timer.elapsed: A-Load
- E-SubmitButton.click: A-Load

## Actions

### A-Load Load

- Process P1: Load
  - request:
    - method: GET
    - path: /items
`;
  const result = parseMarkVSpec(source);
  const diagnostics = result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]);

  assert.deepEqual(diagnostics, [
    [
      "warning",
      "page.load event has no pre-initial state. Add a + state such as before-load+ to show lifecycle entry transitions.",
      lineNumber(source, "- page.load: A-Missing")
    ],
    ["error", "Event page.load references missing action A-Missing.", lineNumber(source, "- page.load: A-Missing")],
    ["error", "Event timer.elapsed is not supported. Use page.load or partial.render.", lineNumber(source, "- timer.elapsed: A-Load")],
    ["error", "Event E-SubmitButton.click is not supported. Use page.load or partial.render.", lineNumber(source, "- E-SubmitButton.click: A-Load")],
    ["error", "Event E-SubmitButton.click is a user operation. Connect user operations with Element action: instead of ## Events.", lineNumber(source, "- E-SubmitButton.click: A-Load")]
  ]);
});

test("validates page.load pre-initial lifecycle entries", () => {
  const source = `---
id: SCR-PAGE-LOAD-PRE-INITIAL
type: screen
title: Page Load Pre Initial
---

# SCR-PAGE-LOAD-PRE-INITIAL Page Load Pre Initial

## States

- before-load+
- initializing*
- loaded

## Events

- page.load: A-Load
- page.load: A-MissingFrom
- page.load: A-MissingInitial

## Actions

### A-Load Load

- From
  - before-load
- Process: Immediate
  - Effects
    - state: initializing

### A-MissingFrom Missing From

- From
  - initializing
- Process: Immediate
  - Effects
    - state: loaded

### A-MissingInitial Missing Initial

- From
  - before-load
- Process: Immediate
  - Effects
    - state: loaded
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]), [
    [
      "warning",
      "page.load action A-MissingFrom should include pre-initial state before-load in From.",
      lineNumber(source, "- page.load: A-MissingFrom")
    ],
    [
      "warning",
      "page.load action A-MissingFrom should transition from before-load to initial state initializing.",
      lineNumber(source, "- page.load: A-MissingFrom")
    ],
    [
      "warning",
      "page.load action A-MissingInitial should transition from before-load to initial state initializing.",
      lineNumber(source, "- page.load: A-MissingInitial")
    ]
  ]);
});

test("warns when page.load has no pre-initial state marker", () => {
  const source = `---
id: SCR-PAGE-LOAD-NO-PRE-INITIAL
type: screen
title: Page Load No Pre Initial
---

# SCR-PAGE-LOAD-NO-PRE-INITIAL Page Load No Pre Initial

## States

- initializing*

## Events

- page.load: A-Load

## Actions

### A-Load Load

- From
  - initializing
- Process: Immediate
  - Effects
    - state: initializing
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]), [
    [
      "warning",
      "page.load event has no pre-initial state. Add a + state such as before-load+ to show lifecycle entry transitions.",
      lineNumber(source, "- page.load: A-Load")
    ]
  ]);
});

test("rejects removed ClientCall process step alias", () => {
  const source = `---
id: SCR-CLIENT-CALL-REMOVED
type: screen
title: Client Call Removed
---

# SCR-CLIENT-CALL-REMOVED Client Call Removed

## Actions

### A-Load Load

- Process: ClientCall
  - MemberQueryService.findSelfProfile()
  - includePreferences: true
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Load");

  assert.equal(action?.processSteps.length, 0);
  assert(result.diagnostics.some((diagnostic) => diagnostic.message === "Action A-Load process step ClientCall is not supported. Use ServerCall instead."));
});

test("rejects labeled ServerCall client entries", () => {
  const source = `---
id: SCR-SERVER-CALL-CLIENT-LABEL
type: screen
title: Server Call Client Label
---

# SCR-SERVER-CALL-CLIENT-LABEL Server Call Client Label

## Actions

### A-Load Load

- Process: ServerCall
  - client: MemberQueryService.findSelfProfile()
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Load");

  assert.deepEqual(action?.processSteps[0]?.details, []);
  assert(result.diagnostics.some((diagnostic) => diagnostic.message === "Action A-Load process step ServerCall has unsupported entry: client: MemberQueryService.findSelfProfile(). Use an unlabeled call line such as Service.method()."));
});

test("parses partial documents with partial render actions", () => {
  const source = `---
id: PRT-NOTICE-CARD
type: partial
title: Notice Card
route: /mypage/partials/notices
---

# PRT-NOTICE-CARD Notice Card

## States

- loaded*

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Notices

## Actions

### A-Build Build notices

- Triggered
  - partial.render
- From
  - loaded
- Process: ServerCall
  - NoticeQueryService.findLatest()
  - case: success
    - description: 200 notices
    - Effects
      - state: loaded
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Build");
  const success = action?.processSteps[0]?.outcomes.find((outcome) => outcome.result === "success");

  assert.equal(result.screen.type, "partial");
  assert.equal(result.diagnostics.length, 0);
  assert.equal(action?.triggeredBy, "partial.render");
  assert.deepEqual(success?.sideEffects, []);
});

test("reports missing process step references", () => {
  const source = `---
id: SCR-PROCESS-REFS
type: screen
title: Process Refs
---

# SCR-PROCESS-REFS Process Refs

## States

- idle*
- done

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: Preprocess
  - when: E-Missing is present
  - skip when: E-Other is hidden
  - update:
    - target: L-Missing
    - content: Missing
- Process: Immediate
  - Effects
    - state: done
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Condition references missing ID E-Missing."));
  assert(messages.includes("Condition references missing ID E-Other."));
  assert(messages.includes("Action A-Submit process step Preprocess targets missing layout or element L-Missing."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message === "Action A-Submit process step Preprocess targets missing layout or element L-Missing.")?.line,
    lineNumber(source, "    - target: L-Missing")
  );
});

test("warns when action layout targets are missing from a viewport", () => {
  const source = `---
id: SCR-VIEWPORT-TARGETS
type: screen
title: Viewport Targets
---

# SCR-VIEWPORT-TARGETS Viewport Targets

## States

- idle*
- error

## Layout: mobile

### L-Page Page

- stack

#### Items

- L-Message
- E-Submit

### L-Message Message

- stack

## Layout: desktop

### L-Page Page

- stack

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: Preprocess
  - update:
    - target: L-Message
    - content: Clear
- Process: Immediate
  - Effects
    - state: error
- Process: Immediate
  - case: failure
    - transition: idle -> error
    - Effects
      - update:
        - target: L-Message
        - content: Failed
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Submit process step Preprocess targets layout L-Message, but it is missing from viewport desktop."));
  assert(messages.includes("Action A-Submit process step Immediate failure outcome targets layout L-Message, but it is missing from viewport desktop."));
});

test("allows action partial update targets inside slot content", () => {
  const source = `---
id: SCR-SLOT-TARGET
type: screen
title: Slot Target
---

# SCR-SLOT-TARGET Slot Target

## States

- initializing*
- idle

## Slot: content

### L-Card Card

- stack

#### Items

- E-Loading
- E-Ready

## Elements

### E-Loading Text

- value: Loading...
- visible when: initializing

### E-Ready Text

- value: Ready
- visible when: idle

## Actions

### A-Load Load

- Triggered
  - screen.load
- From
  - initializing
- Process: Immediate
  - case: success
    - description: ok
    - Effects
      - state: idle
      - update:
        - target: L-Card
        - content: Ready content
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("reports missing request parameter source references", () => {
  const source = `---
id: SCR-PARAMS
type: screen
title: Params
---

# SCR-PARAMS Params

## States

- idle*

## Actions

### A-Submit submit

- Triggered
  - service.submit
- From
  - idle
- Process: HttpRequest
  - POST /login
    - email: E-Missing.value
- Process: Submit account
  - server:
    - AccountService.save()
    - params:
      - email: E-ServerMissing.value
- Process: SyncService
  - sync:
    - AccountSync.push()
    - params:
      - email: E-CustomMissing.value
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-Submit has invalid trigger service.submit. Expected Element action:, ## Events page.load or partial.render, or A-ActionId.P-marker.response.",
        lineNumber(source, "  - service.submit")
      ],
      [
        "error",
        "Action A-Submit process step HttpRequest parameter email references missing source E-Missing.",
        lineNumber(source, "    - email: E-Missing.value")
      ],
      [
        "error",
        "Action A-Submit process step Submit account parameter server.params.email references missing source E-ServerMissing.",
        lineNumber(source, "      - email: E-ServerMissing.value")
      ],
      [
        "error",
        "Action A-Submit process step SyncService parameter sync.params.email references missing source E-CustomMissing.",
        lineNumber(source, "      - email: E-CustomMissing.value")
      ]
    ]
  );
});

test("reports missing route parameter source references in action cases", () => {
  const source = `---
id: SCR-ROUTE-PARAMS
type: screen
title: Route Params
---

# SCR-ROUTE-PARAMS Route Params

## States

- idle*

## Elements

### E-Link Link

- text: Detail

## Actions

### A-Open open

- Triggered
  - E-Link.click
- From
  - idle
- Process: Immediate
  - case: success
    - params:
      - id: E-Missing.value
    - Effects
      - navigate: SCR-DETAIL
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "error",
        "Action A-Open process step Immediate case success route parameter id references missing source E-Missing.",
        lineNumber(source, "      - id: E-Missing.value")
      ]
    ]
  );
});

test("warns when response definitions do not match transition results", () => {
  const source = `---
id: SCR-RESPONSE
type: screen
title: Response
---

# SCR-RESPONSE Response

## States

- idle*

## Actions

### A-Submit submit

- Triggered
  - service.response
- From
  - idle
- Process: Immediate
  - case: success
    - response: 2xx
  - case: failure
    - Effects
      - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-Submit has invalid trigger service.response. Expected Element action:, ## Events page.load or partial.render, or A-ActionId.P-marker.response.",
        lineNumber(source, "  - service.response")
      ],
      [
        "warning",
        "Action A-Submit process step Immediate case success uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations.",
        lineNumber(source, "    - response: 2xx")
      ],
      [
        "warning",
        "Action A-Submit process step Immediate defines success response but has no success transition.",
        lineNumber(source, "    - response: 2xx")
      ]
    ]
  );
});

test("warns when action cases and request steps are structurally incomplete", () => {
  const source = `---
id: SCR-INCOMPLETE-ACTION
type: screen
title: Incomplete Action
---

# SCR-INCOMPLETE-ACTION Incomplete Action

## States

- idle*

## Elements

### E-Submit Button

- label: Submit

### E-メールアドレス入力 Input

- value: \${model.email}

## Actions

### A-Submit submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: HttpRequest
  - email: E-メールアドレス入力.value
- Process: Immediate
  - case: success
    - stop
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-Submit");

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-Submit HttpRequest step has no request line such as POST /path.",
        lineNumber(source, "- Process: HttpRequest")
      ]
    ]
  );
  assert.equal(action?.processSteps.find((step) => step.name === "Immediate")?.outcomes.find((outcome) => outcome.result === "success")?.flow, "stop");
});

test("validates process case flow directive placement", () => {
  const source = `---
id: SCR-FLOW-PLACEMENT
type: screen
title: Flow Placement
---

# SCR-FLOW-PLACEMENT Flow Placement

## States

- idle*
- done

## Actions

### A-Valid Valid flow

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - case: success
    - Effects
      - state: done
    - stop

### A-Invalid Invalid flow

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - case: under-effects
    - Effects
      - state: done
      - stop
  - case: non-final
    - stop
    - Effects
      - state: done
  - case: both
    - continue
    - stop
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(!messages.some((message) => message.includes("A-Valid") && message.includes("flow")));
  assert(messages.includes("Action A-Invalid process step Immediate case under-effects has stop under Effects. Put stop directly under the case as the final entry."));
  assert(messages.includes("Action A-Invalid process step Immediate case non-final has entries after stop. Put stop as the final entry in the case."));
  assert(messages.includes("Action A-Invalid process step Immediate case both has both stop and continue. Use only one flow directive."));
  assert(messages.includes("Action A-Invalid process step Immediate case both has entries after continue. Put continue as the final entry in the case."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("under-effects has stop under Effects"))?.line,
    lineNumber(source, "      - stop")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("non-final has entries after stop"))?.line,
    lineNumber(source, "      - state: done", 3)
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("both has both stop and continue"))?.line,
    lineNumber(source, "    - stop", 3)
  );
});

test("warns for an HttpRequest step without its own request line", () => {
  const source = `---
id: SCR-INCOMPLETE-REQUEST-STEP
type: screen
title: Incomplete Request Step
---

# SCR-INCOMPLETE-REQUEST-STEP Incomplete Request Step

## States

- idle*

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process: HttpRequest
  - page: \${model.page}
- Process: HttpRequest
  - GET /users
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-Submit HttpRequest step has no request line such as POST /path.",
        lineNumber(source, "- Process: HttpRequest")
      ]
    ]
  );
});

test("renders the login screen as low-fidelity HTML", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { showIds: true });

  assert.match(html, /class="mm-wireframe"/);
  assert.match(html, /Login/);
  assert.match(html, /Sign in to continue\./);
  assert.match(html, /<label class="mm-field-label">Email<\/label>/);
  assert.match(html, /data-mm-id="E-EmailInput"/);
  assert.match(html, /mm-variant-primary/);
  assert.match(html, /<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">7<\/code>/);
  assert.match(html, /<code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code>/);
  assert.doesNotMatch(html, /<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">E-SignInButton<\/code>/);
  assert.doesNotMatch(html, /state\.email/);
  assert.doesNotMatch(html, /The email address or password is incorrect\./);
  assert.doesNotMatch(html, />Page</);
  assert.doesNotMatch(html, />Email field</);
  assert.doesNotMatch(html, />パスワード欄</);
});

test("keeps FormGroup markers in layout fragments", () => {
  const source = `---
id: SCR-FORMGROUP-FRAGMENT
type: screen
title: FormGroup Fragment
---

# SCR-FORMGROUP-FRAGMENT FormGroup Fragment

## States

- idle*

## Layout: mobile

### L1:L-Form Form

- stack

#### Items

- E-Email

## Elements

### E1:E-Email Input

- value: \${model.email}

## Form Groups

### F1:F-LoginForm Login form

- fields: E-Email
`;
  const result = parseMarkVSpec(source);
  const fullHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    markerVisibility: { layout: true, element: true, action: true }
  });
  const fragment = renderMarkVSpecHtmlFragment(result, "layout:mobile:L-Form", {
    markerVisibility: { layout: true, element: true, action: true }
  });

  assert.match(fullHtml, /class="mm-id mm-marker mm-marker-form-group" data-mm-marker-category="form-group">F1<\/code>/);
  assert.match(fragment?.html ?? "", /class="mm-id mm-marker mm-marker-form-group" data-mm-marker-category="form-group">F1<\/code>/);
  assert.match(renderMarkVSpecHtml(result), /\.mm-layout > \.mm-marker-form-group\{left:24px;top:-9px\}/);
});

test("keeps annotated fallback elements in block flow without a layout", () => {
  const source = `---
id: SCR-FALLBACK
type: screen
title: Fallback
---

# SCR-FALLBACK Fallback

## States

- idle*

## Elements

### 1:E-Title Heading

- level: 1
- value: Title

### 2:E-Body Paragraph

- value: Body text
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { showIds: true });

  assert.match(html, /\.mm-element-wrap\{display:block;max-width:100%;min-width:0;position:relative;width:max-content\}/);
  assert.match(html, /\.mm-annotation-row\{align-items:center;display:inline-flex;flex-wrap:wrap;gap:2px;left:0;line-height:1;max-width:calc\(100% \+ 12px\);pointer-events:none;position:absolute;top:0;transform:translate\(-35%,-35%\);width:max-content;z-index:3\}/);
  assert.match(html, /\.mm-annotation-row \.mm-id\{margin-right:0;pointer-events:none\}/);
  assert.match(html, /\.mm-marker-link \.mm-id\{pointer-events:none\}/);
  assert.match(html, /\.mm-element-wrap-button \.mm-annotation-row,\.mm-element-wrap-link \.mm-annotation-row,\.mm-element-wrap-text \.mm-annotation-row,\.mm-element-wrap-badge \.mm-annotation-row\{left:auto;right:0;top:50%;transform:translate\(calc\(100% \+ 4px\),-50%\)\}/);
  assert.match(html, /\.mm-layout-row > \.mm-element-wrap-annotated > \.mm-annotation-row,\.mm-layout-grid > \.mm-element-wrap-annotated > \.mm-annotation-row,\.mm-layout-inline > \.mm-element-wrap-annotated > \.mm-annotation-row,\.mm-field-row > \.mm-element-wrap-annotated > \.mm-annotation-row,\.mm-dialog-actions > \.mm-element-wrap-annotated > \.mm-annotation-row\{left:50%;right:auto;top:0;transform:translate\(-50%,-55%\)\}/);
  assert.doesNotMatch(html, /padding-top:18px/);
  assert.doesNotMatch(html, /\.mm-element-wrap-annotated[^}]+\{[^}]*padding-top/);
  assert.doesNotMatch(html, /\.mm-element-wrap\{[^}]*display:inline-flex/);
  assert.match(html, /<!--mm-render-key:element:E-Title--><div class="mm-element-wrap mm-element-wrap-heading mm-element-wrap-annotated" data-mm-render-key="element:E-Title"><h1 class="mm-element mm-element-heading" data-mm-id="E-Title">Title<\/h1><span class="mm-annotation-row"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">1<\/code><\/span><\/div><!--mm-render-key:element:E-Body--><div class="mm-element-wrap mm-element-wrap-paragraph mm-element-wrap-annotated" data-mm-render-key="element:E-Body"><p class="mm-element mm-element-paragraph" data-mm-id="E-Body">Body text<\/p><span class="mm-annotation-row"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">2<\/code><\/span><\/div>/);
});

test("renders an empty wireframe placeholder when no layout or element is visible", () => {
  const source = `---
id: SCR-EMPTY-WIREFRAME
type: screen
title: Empty Wireframe
locale: ja
---

# SCR-EMPTY-WIREFRAME Empty Wireframe

## States

- loading*
- loaded

## Layout: desktop

### L-Loaded Loaded

- visible when: loaded

#### Items

- E-Title

## Elements

### E-Title Heading

- sample: Loaded
`;
  const result = parseMarkVSpec(source);
  const loadingHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "loading", viewport: "desktop" });
  const customMessageHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    messages: { noVisibleElements: "Nothing visible in this state" },
    state: "loading",
    viewport: "desktop"
  });
  const loadedHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "loaded", viewport: "desktop" });

  assert.match(loadingHtml, /class="mm-wireframe mm-wireframe-empty"/);
  assert.match(loadingHtml, /<div class="mm-empty-wireframe" role="note">表示される要素はありません<\/div>/);
  assert.match(customMessageHtml, /Nothing visible in this state/);
  assert.doesNotMatch(loadingHtml, /data-mm-id="L-Loaded"/);
  assert.doesNotMatch(loadedHtml, /mm-wireframe-empty/);
  assert.doesNotMatch(loadedHtml, /mm-empty-wireframe/);
  assert.match(loadedHtml, /data-mm-id="L-Loaded"/);
});

test("does not treat hidden markers as an empty wireframe", () => {
  const source = `---
id: SCR-HIDDEN-MARKERS
type: screen
title: Hidden Markers
---

# SCR-HIDDEN-MARKERS Hidden Markers

## States

- idle*

## Elements

### 1:E-Title Heading

- sample: Visible
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, {
    includeStyles: false,
    markerVisibility: { layout: false, element: false, action: false }
  });

  assert.match(html, /data-mm-id="E-Title"/);
  assert.doesNotMatch(html, /mm-wireframe-empty/);
  assert.doesNotMatch(html, /No visible elements/);
  assert.doesNotMatch(html, /mm-marker-element/);
});

test("renders Select elements with options and selected initial value", () => {
  const source = `---
id: SCR-SELECT
type: screen
title: Select
---

# SCR-SELECT Select

## States

- idle*

## Layout: mobile

### L-Form Form

- stack

#### Items

- "Role": E-ロール選択

## Elements

### 1:E-ロール選択 Select*

- value: \${model.role}
- initial value: "Administrator"
- options:
  - Viewer
  - Administrator
  - Owner
`;
  const result = parseMarkVSpec(source);
  const select = result.elements.find((element) => element.id === "E-ロール選択");
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.equal(select?.properties["value"], "\${model.role}");
  assert.equal(select?.properties["initial value"], "Administrator");
  assert.deepEqual(select?.selectOptions.map((option) => option.label), ["Viewer", "Administrator", "Owner"]);
  assert.match(html, /<label class="mm-field-label">Role<\/label>/);
  assert.match(html, /<select class="mm-element mm-element-select" data-mm-id="E-ロール選択">/);
  assert.match(html, /<option value="Viewer">Viewer<\/option>/);
  assert.match(html, /<option value="Administrator" selected>Administrator<\/option>/);
  assert.match(html, /<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">1<\/code>/);
});

test("parses validates renders and summarizes Tabs elements", () => {
  const source = `---
id: SCR-TABS
type: screen
title: Tabs
---

# SCR-TABS Tabs

## States

- profile-tab*
- billing-tab

## Layout: desktop

### L-Page Page

- stack

#### Items

- E-SettingsTabs

### L-ProfilePanel Profile panel

- stack

#### Items

- E-ProfileText

### L-BillingPanel Billing panel

- stack

#### Items

- E-BillingText

## Elements

### 12:E-SettingsTabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile-tab
    - action: A-SelectProfileTab
  - Billing
    - panel: L-BillingPanel
    - active when: billing-tab
    - action: A-SelectBillingTab

### E-ProfileText Text

- value: Profile details

### E-BillingText Text

- value: Billing details

## Actions

### A-SelectProfileTab Select profile tab

- From
  - billing-tab

### A-SelectBillingTab Select billing tab

- From
  - profile-tab
`;
  const result = parseMarkVSpec(source);
  const tabs = result.elements.find((element) => element.id === "E-SettingsTabs");
  const rows = buildDisplayContentSpecRows(result.elements);
  const tabsRow = rows.find((row) => row.element.id === "E-SettingsTabs" && row.location === "tabs");
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.deepEqual(result.diagnostics, []);
  assert.equal(tabs?.type, "Tabs");
  assert.deepEqual(tabs?.tabs.map((item) => [item.label, item.panel, item.action, item.activeWhen]), [
    ["Profile", "L-ProfilePanel", "A-SelectProfileTab", ["profile-tab"]],
    ["Billing", "L-BillingPanel", "A-SelectBillingTab", ["billing-tab"]]
  ]);
  assert.deepEqual([tabsRow?.value, tabsRow?.contentSections], [
    "Profile, Billing",
    [{ title: "Tabs", rows: ["Profile (panel: L-ProfilePanel; action: A-SelectProfileTab; active when: profile-tab)", "Billing (panel: L-BillingPanel; action: A-SelectBillingTab; active when: billing-tab)"] }]
  ]);
  assert.match(html, /<div class="mm-element mm-element-tabs" data-mm-id="E-SettingsTabs">/);
  assert.match(html, /<span class="mm-tab-item mm-tab-item-active" aria-selected="true" data-mm-tab-panel="L-ProfilePanel" data-mm-tab-action="A-SelectProfileTab">Profile<\/span>/);
  assert.match(html, /<span class="mm-tab-item" data-mm-tab-panel="L-BillingPanel" data-mm-tab-action="A-SelectBillingTab">Billing<\/span>/);
  assert.match(html, /<div class="mm-controlled-panel mm-controlled-panel-tabs" data-mm-controlled-panel="L-ProfilePanel">/);
  assert.match(html, /Profile details/);
  assert.doesNotMatch(html, /Billing details/);
  assert.doesNotMatch(html, /mm-tabs-panel-note/);

  const billingHtml = renderMarkVSpecHtml(result, { state: "billing-tab", includeStyles: false, showIds: true });
  assert.match(billingHtml, /<span class="mm-tab-item mm-tab-item-active" aria-selected="true" data-mm-tab-panel="L-BillingPanel" data-mm-tab-action="A-SelectBillingTab">Billing<\/span>/);
  assert.match(billingHtml, /Billing details/);
  assert.doesNotMatch(billingHtml, /Profile details/);
});

test("warns for invalid Tabs active panel and action references", () => {
  const source = `---
id: SCR-TABS-DIAGNOSTICS
type: screen
title: Tabs Diagnostics
---

# SCR-TABS-DIAGNOSTICS Tabs Diagnostics

## States

- idle*

## Elements

### E-SettingsTabs Tabs

- active: Security
- items:
  - Profile
    - panel: L-MissingPanel
    - action: A-MissingAction
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes('Element E-SettingsTabs active tab "Security" does not match any items.'));
  assert(messages.includes("Element E-SettingsTabs tab item Profile references missing panel L-MissingPanel."));
  assert(messages.includes("Element E-SettingsTabs tab item Profile references missing action A-MissingAction."));
});

test("warns for controlled panel layout conflicts and preview-unevaluable conditions", () => {
  const source = `---
id: SCR-CONTROLLED-PANEL-DIAGNOSTICS
type: screen
title: Controlled Panel Diagnostics
---

# SCR-CONTROLLED-PANEL-DIAGNOSTICS Controlled Panel Diagnostics

## States

- idle*

## Layout: desktop

### L-Page Page

- stack

#### Items

- E-SettingsTabs
- L-SharedPanel

### L-SharedPanel Shared panel

- stack

#### Items

- E-PanelText

## Elements

### E-SettingsTabs Tabs

- items:
  - Profile
    - panel: L-SharedPanel
    - active when: selected profile
    - active when: \${view.missingTab} = profile
    - open when: idle
  - Billing
    - panel: L-BillingPanel
    - active when: idle
  - Support
    - panel: L-SupportPanel
    - active when: idle

### E-PanelText Text

- value: Shared
- open when: idle
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes('Element E-SettingsTabs tab item Profile active when condition "selected profile" cannot be evaluated in preview. Use a state name, state is ..., or a namespaced condition such as ${state.*}, ${view.*}, or ${route.*}.'));
  assert(messages.includes("Condition references missing view context missingTab."));
  assert(messages.includes("Element E-SettingsTabs tab item Profile has unsupported property open when. Use panel, action, active when."));
  assert(messages.includes("Element E-PanelText of type Text uses unsupported property open when."));
  assert(messages.includes("Layout L-SharedPanel is used both as a controlled panel for Element E-SettingsTabs and as a normal layout item. Preview keeps the normal layout display and does not expand it inside the component."));
  assert(messages.includes("Element E-SettingsTabs Tabs active when matches multiple items for state idle: Billing, Support. Preview uses the first matching item."));
});

test("parses validates renders and summarizes Popover and Tooltip elements", () => {
  const source = `---
id: SCR-ANCHORED-OVERLAY
type: screen
title: Anchored Overlay
---

# SCR-ANCHORED-OVERLAY Anchored Overlay

## States

- idle*
- help-open

## Elements

### E-PasswordInput Input

- type: password

### E-PasswordHint Tooltip

- anchor: E-PasswordInput
- placement: top
- text: Use at least 12 characters.

### E-HelpButton Button

- label: Help

### E-PasswordHelp Popover

- anchor: E-HelpButton
- placement: bottom-start
- text: Password must include a number.
- visible when: help-open
`;
  const result = parseMarkVSpec(source);
  const rows = buildDisplayContentSpecRows(result.elements);
  const tooltipRow = rows.find((row) => row.element.id === "E-PasswordHint" && row.location === "overlay");
  const popoverRow = rows.find((row) => row.element.id === "E-PasswordHelp" && row.location === "overlay");
  const html = renderMarkVSpecHtml(result, { state: "help-open", includeStyles: false, showIds: true });

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual([tooltipRow?.value, tooltipRow?.contentSections], [
    "Use at least 12 characters.",
    [{ title: "Overlay", rows: ["anchor: E-PasswordInput", "placement: top", "text: Use at least 12 characters."] }]
  ]);
  assert.deepEqual([popoverRow?.value, popoverRow?.contentSections], [
    "Password must include a number.",
    [{ title: "Overlay", rows: ["anchor: E-HelpButton", "placement: bottom-start", "text: Password must include a number.", "visible when: help-open"] }]
  ]);
  assert.match(html, /<div class="mm-element mm-element-tooltip" data-mm-id="E-PasswordHint" data-mm-anchor="E-PasswordInput" data-mm-placement="top">/);
  assert.match(html, /<span class="mm-tooltip-bubble">Use at least 12 characters\.<\/span>/);
  assert.match(html, /<div class="mm-element mm-element-popover" data-mm-id="E-PasswordHelp" data-mm-anchor="E-HelpButton" data-mm-placement="bottom-start">/);
  assert.match(html, /<div class="mm-popover-panel">Password must include a number\.<\/div>/);
});

test("diagnoses invalid Popover and Tooltip anchors", () => {
  const source = `---
id: SCR-ANCHORED-OVERLAY-DIAGNOSTICS
type: screen
title: Anchored Overlay Diagnostics
---

# SCR-ANCHORED-OVERLAY-DIAGNOSTICS Anchored Overlay Diagnostics

## States

- idle*

## Layout: desktop

### L-HelpPanel Help panel

- stack

## Elements

### E-MissingAnchor Popover

- text: Missing anchor

### E-LayoutAnchor Tooltip

- anchor: L-HelpPanel
- text: Layout anchors are invalid.

### E-UnknownAnchor Tooltip

- anchor: E-NoSuchElement
- text: Unknown anchor
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Element E-MissingAnchor Popover requires anchor: E-*."));
  assert(messages.includes("Element E-LayoutAnchor anchor must reference an E-* element."));
  assert(messages.includes("Element E-UnknownAnchor anchor references missing element E-NoSuchElement."));
});

test("parses validates renders and summarizes Accordion and Disclosure elements", () => {
  const source = readFileSync(examplePath("04-real-world-screens/accordion-disclosure.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const rows = buildDisplayContentSpecRows(result.elements);
  const accordion = result.elements.find((element) => element.id === "E-AdvancedFilters");
  const disclosure = result.elements.find((element) => element.id === "E-ShippingDetails");
  const accordionRow = rows.find((row) => row.element.id === "E-AdvancedFilters" && row.location === "accordion");
  const disclosureRow = rows.find((row) => row.element.id === "E-ShippingDetails" && row.location === "disclosure");
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });
  const triggers = new Map(result.actions.map((action) => [action.id, action.triggeredBy]));

  assert.deepEqual(result.diagnostics, []);
  assert.equal(accordion?.type, "Accordion");
  assert.deepEqual(accordion?.accordionItems.map((item) => [item.label, item.panel, item.action, item.openWhen]), [
    ["Advanced filters", "L-AdvancedFilterPanel", "A-ToggleAdvancedFilters", ["advanced-filters-open"]],
    ["Saved filters", "L-SavedFiltersPanel", "A-OpenSavedFilters", ["saved-filters-open"]]
  ]);
  assert.deepEqual([accordionRow?.value, accordionRow?.contentSections], [
    "Advanced filters, Saved filters",
    [{ title: "Accordion", rows: ["Advanced filters (panel: L-AdvancedFilterPanel; action: A-ToggleAdvancedFilters; open when: advanced-filters-open)", "Saved filters (panel: L-SavedFiltersPanel; action: A-OpenSavedFilters; open when: saved-filters-open)"] }]
  ]);
  assert.equal(disclosure?.type, "Disclosure");
  assert.deepEqual([disclosureRow?.value, disclosureRow?.contentSections], [
    "Shipping details",
    [{ title: "Disclosure", rows: ["label: Shipping details", "open when: shipping-details-open", "panel: L-ShippingDetailsPanel", "action: A-ToggleShippingDetails"] }]
  ]);
  assert.equal(triggers.get("A-ToggleAdvancedFilters"), "E-AdvancedFilters.click");
  assert.equal(triggers.get("A-OpenSavedFilters"), "E-AdvancedFilters.click");
  assert.equal(triggers.get("A-ToggleShippingDetails"), "E-ShippingDetails.click");
  assert.match(html, /<div class="mm-element mm-element-accordion" data-mm-id="E-AdvancedFilters">/);
  assert.match(html, /<div class="mm-accordion-item mm-accordion-item-open" data-mm-accordion-panel="L-AdvancedFilterPanel" data-mm-accordion-action="A-ToggleAdvancedFilters">/);
  assert.match(html, /<div class="mm-controlled-panel mm-controlled-panel-accordion" data-mm-controlled-panel="L-AdvancedFilterPanel">/);
  assert.match(html, /Active/);
  assert.doesNotMatch(html, /Monthly review/);
  assert.match(html, /<div class="mm-element mm-element-disclosure mm-disclosure-closed" data-mm-id="E-ShippingDetails" data-mm-disclosure-panel="L-ShippingDetailsPanel">/);
  assert.doesNotMatch(html, /1 Market Street/);

  const disclosureHtml = renderMarkVSpecHtml(result, { state: "shipping-details-open", includeStyles: false, showIds: true });
  assert.match(disclosureHtml, /<div class="mm-element mm-element-disclosure mm-disclosure-open" data-mm-id="E-ShippingDetails" data-mm-disclosure-panel="L-ShippingDetailsPanel">/);
  assert.match(disclosureHtml, /<div class="mm-controlled-panel mm-controlled-panel-disclosure" data-mm-controlled-panel="L-ShippingDetailsPanel">/);
  assert.match(disclosureHtml, /1 Market Street/);
});

test("diagnoses invalid Accordion and Disclosure references", () => {
  const source = `---
id: SCR-ACCORDION-DIAGNOSTICS
type: screen
title: Accordion Diagnostics
---

# SCR-ACCORDION-DIAGNOSTICS Accordion Diagnostics

## States

- idle*

## Elements

### E-AdvancedFilters Accordion

- open: Saved filters
- items:
  - Advanced filters
    - panel: L-MissingPanel
    - action: A-MissingAction

### E-ShippingDetails Disclosure

- label: Shipping details
- open: maybe
- panel: L-MissingShippingPanel

### E-NoPanel Disclosure

- label: No panel
- open: true
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes('Element E-AdvancedFilters open item "Saved filters" does not match any items.'));
  assert(messages.includes("Element E-AdvancedFilters accordion item Advanced filters references missing panel L-MissingPanel."));
  assert(messages.includes("Element E-AdvancedFilters accordion item Advanced filters references missing action A-MissingAction."));
  assert(messages.includes("Element E-ShippingDetails Disclosure open must be true or false."));
  assert(messages.includes("Element E-ShippingDetails references missing panel L-MissingShippingPanel."));
  assert(messages.includes("Element E-NoPanel Disclosure requires panel: L-*."));
});

test("parses validates renders and summarizes ActionMenu elements", () => {
  const source = readFileSync(examplePath("04-real-world-screens/action-menu.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const rows = buildDisplayContentSpecRows(result.elements);
  const actionMenu = result.elements.find((element) => element.id === "E-RowActions");
  const actionMenuRow = rows.find((row) => row.element.id === "E-RowActions" && row.location === "action menu");
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });
  const openHtml = renderMarkVSpecHtml(result, { state: "menu-open", includeStyles: false, showIds: true });
  const triggers = new Map(result.actions.map((action) => [action.id, action.triggeredBy]));

  assert.deepEqual(result.diagnostics, []);
  assert.equal(actionMenu?.type, "ActionMenu");
  assert.deepEqual(actionMenu?.openWhen, ["menu-open", "menu-open-locked"]);
  assert.deepEqual(actionMenu?.actionMenuItems.map((item) => [item.label, item.action, item.tone, item.disabledWhen]), [
    ["Edit", "A-EditAccount", undefined, []],
    ["Disable", "A-DisableAccount", "danger", ["menu-open-locked"]]
  ]);
  assert.deepEqual([actionMenuRow?.value, actionMenuRow?.contentSections], [
    "Edit, Disable",
    [{ title: "Action Menu", rows: ["Edit (action: A-EditAccount)", "Disable (action: A-DisableAccount; tone: danger; disabled when: menu-open-locked)"] }]
  ]);
  assert.equal(triggers.get("A-EditAccount"), "E-RowActions.click");
  assert.equal(triggers.get("A-DisableAccount"), "E-RowActions.click");
  assert.match(html, /<div class="mm-element mm-element-actionmenu mm-action-menu-closed" data-mm-id="E-RowActions" data-mm-placement="bottom-end">/);
  assert.match(html, /<button class="mm-action-menu-trigger" type="button">More actions \.\.\.<\/button>/);
  assert.doesNotMatch(html, /mm-action-menu-panel/);
  assert.match(openHtml, /<div class="mm-element mm-element-actionmenu mm-action-menu-open" data-mm-id="E-RowActions" data-mm-placement="bottom-end">/);
  assert.match(openHtml, /<div class="mm-action-menu-item" data-mm-action-menu-action="A-EditAccount">/);
  assert.match(openHtml, /mm-action-menu-panel/);
  assert.doesNotMatch(html, /mm-action-menu-item-disabled mm-action-menu-item-danger/);

  const lockedHtml = renderMarkVSpecHtml(result, { state: "menu-open-locked", includeStyles: false, showIds: true });
  assert.match(lockedHtml, /<div class="mm-element mm-element-actionmenu mm-action-menu-open" data-mm-id="E-RowActions" data-mm-placement="bottom-end">/);
  assert.match(lockedHtml, /<div class="mm-action-menu-item mm-action-menu-item-disabled mm-action-menu-item-danger" data-mm-action-menu-action="A-DisableAccount">/);
});

test("diagnoses invalid ActionMenu items", () => {
  const source = `---
id: SCR-ACTION-MENU-DIAGNOSTICS
type: screen
title: Action Menu Diagnostics
---

# SCR-ACTION-MENU-DIAGNOSTICS Action Menu Diagnostics

## States

- idle*

## Elements

### E-RowActions ActionMenu

- label: More actions
- open: maybe
- items:
  - Edit
    - action: E-NotAction
  - Disable
    - action: A-MissingAction
  - Archive
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Element E-RowActions ActionMenu open must be true or false."));
  assert(messages.includes("Element E-RowActions action menu item Edit action must reference an A-* action."));
  assert(messages.includes("Element E-RowActions action menu item Disable references missing action A-MissingAction."));
  assert(messages.includes("Element E-RowActions action menu item Archive requires action: A-*."));
});

test("warns for unsupported compact Select options property", () => {
  const source = `---
id: SCR-COMPACT-SELECT
type: screen
title: Compact Select
---

# SCR-COMPACT-SELECT Compact Select

## States

- idle*

## Elements

### E-ロール選択 Select

- value: \${model.role}
- initial value: "admin"
- options: viewer=Viewer, admin=Administrator
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false });
  const diagnostic = result.diagnostics.find((item) => item.message === "Element E-ロール選択 of type Select uses unsupported property options.");

  assert(diagnostic);
  assert.equal(diagnostic.line, lineNumber(source, "- options: viewer=Viewer, admin=Administrator"));
  assert.equal(result.diagnostics.some((item) => item.message.includes("does not match any options")), false);
  assert.doesNotMatch(html, /Viewer/);
  assert.match(html, /<option value="admin" selected>admin<\/option>/);
});

test("warns when selection initial values do not match defined options", () => {
  const source = `---
id: SCR-SELECT-INITIAL
type: screen
title: Select Initial
---

# SCR-SELECT-INITIAL Select Initial

## States

- idle*

## Elements

### E-RoleSelect Select

- initial value: admin
- options:
  - Viewer
  - Administrator

### E-TeamSelect MultiSelect

- initial value: Viewer, Auditor
- options:
  - Viewer
  - Administrator

### E-NotifyGroup CheckboxGroup

- initial value: Email, Push
- options:
  - Email
  - SMS

### E-UnlistedSelect Select

- initial value: legacy

### E-PlanGroup RadioGroup

- initial value: Pro, Annual
- options:
  - Basic
  - Pro, Annual
`;
  const result = parseMarkVSpec(source);
  const optionDiagnostics = result.diagnostics.filter((item) => item.message.includes("does not match any options"));

  assert.deepEqual(optionDiagnostics.map((item) => item.message), [
    'Element E-RoleSelect initial value "admin" does not match any options.',
    'Element E-TeamSelect initial value "Auditor" does not match any options.',
    'Element E-NotifyGroup initial value "Push" does not match any options.'
  ]);
  assert.deepEqual(optionDiagnostics.map((item) => item.line), [
    lineNumber(source, "- initial value: admin"),
    lineNumber(source, "- initial value: Viewer, Auditor"),
    lineNumber(source, "- initial value: Email, Push")
  ]);
});

test("renders Checkbox and RadioGroup elements with checked state", () => {
  const source = `---
id: SCR-CHOICES
type: screen
title: Choices
---

# SCR-CHOICES Choices

## States

- idle*

## Layout: mobile

### L-Choices Choices

- stack

#### Items

- E-入力省略チェック
- E-RememberLater
- E-RememberNever
- E-PlanGroup

## Elements

### 1:E-入力省略チェック Checkbox

- label: Remember me
- value: remember
- checked

### 4:E-RememberLater Checkbox

- label: Remember later
- value: \${model.rememberLater}
- initial value: \${cookie.rememberLater}

### 5:E-RememberNever Checkbox

- label: Remember never
- value: \${model.rememberNever}
- initial value: false

### 6:E-PlanGroup RadioGroup

- label: Plan
- name: planGroup
- value: \${model.plan}
- initial value: "Pro"
- options:
  - Basic: \${copy.plan.basic}
  - Pro: \${copy.plan.pro}
  - Pro, Annual
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });
  const radioGroup = result.elements.find((element) => element.id === "E-PlanGroup");

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /<label class="mm-element mm-element-checkbox" data-mm-id="E-入力省略チェック">/);
  assert.match(html, /<input type="checkbox" value="remember" checked>Remember me/);
  assert.equal(result.elements.find((element) => element.id === "E-RememberLater")?.properties["value"], "\${model.rememberLater}");
  assert.equal(result.elements.find((element) => element.id === "E-RememberLater")?.properties["initial value"], "\${cookie.rememberLater}");
  assert.match(html, /<input type="checkbox" value="\$\{model\.rememberLater\}" checked>Remember later/);
  assert.equal(result.elements.find((element) => element.id === "E-RememberNever")?.properties["initial value"], "false");
  assert.match(html, /<input type="checkbox" value="\$\{model\.rememberNever\}">Remember never/);
  assert.equal(radioGroup?.properties["value"], "\${model.plan}");
  assert.equal(radioGroup?.properties["initial value"], "Pro");
  assert.deepEqual(radioGroup?.selectOptions.map((option) => option.label), ["Basic", "Pro", "Pro, Annual"]);
  assert.deepEqual(radioGroup?.selectOptions.map((option) => option.source), ["\${copy.plan.basic}", "\${copy.plan.pro}", undefined]);
  assert.match(html, /<fieldset class="mm-element mm-element-radiogroup" data-mm-id="E-PlanGroup"><legend>Plan<\/legend><label class="mm-choice-group-option"><input type="radio" name="planGroup">Basic<\/label><label class="mm-choice-group-option"><input type="radio" name="planGroup" checked>Pro<\/label><label class="mm-choice-group-option"><input type="radio" name="planGroup">Pro, Annual<\/label><\/fieldset>/);
  assert.doesNotMatch(html, /mm-element-radio"/);
});

test("keeps RadioGroup comma labels as single selected values", () => {
  const source = `---
id: SCR-RADIO-COMMA
type: screen
title: Radio Comma
---

# SCR-RADIO-COMMA Radio Comma

## States

- idle*

## Elements

### E-PlanGroup RadioGroup

- label: Plan
- initial value: Pro, Annual
- options:
  - Basic
  - Pro, Annual
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false });

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /<input type="radio" name="E-PlanGroup">Basic<\/label><label class="mm-choice-group-option"><input type="radio" name="E-PlanGroup" checked>Pro, Annual<\/label>/);
});

test("keeps form required metadata out of the wireframe rendering", () => {
  const source = `---
id: SCR-FORM-MESSAGES
type: screen
title: Form Messages
---

# SCR-FORM-MESSAGES Form Messages

## States

- idle*

## Layout: mobile

### L-Form Form

- stack

#### Items

- "Email": E-メールアドレス入力
- "Role": E-ロール選択
- E-AgreeTerms

## Elements

### 1:E-メールアドレス入力 Input*

- value: \${model.email}
- initial value: "bad@example.com"
- validation: Must be a valid email address.
- error text: Enter a valid email address.

### 2:E-ロール選択 Select*

- value: \${model.role}
- initial value: "Administrator"
- options:
  - User
  - Administrator
- validation: Choose one role.

### 3:E-AgreeTerms Checkbox*

- label: I agree
- error text: Agreement is required.

`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /<div class="mm-element-wrap mm-element-wrap-input mm-element-wrap-annotated" data-mm-render-key="element:E-メールアドレス入力"><input class="mm-element mm-element-input" data-mm-id="E-メールアドレス入力" type="text" placeholder="" value="bad@example.com"><span class="mm-annotation-row"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">1<\/code><\/span><\/div>/);
  assert.match(html, /<select class="mm-element mm-element-select" data-mm-id="E-ロール選択"><option value="User">User<\/option><option value="Administrator" selected>Administrator<\/option><\/select>/);
  assert.match(html, /<div class="mm-element-wrap mm-element-wrap-checkbox mm-element-wrap-annotated" data-mm-render-key="element:E-AgreeTerms"><label class="mm-element mm-element-checkbox" data-mm-id="E-AgreeTerms"><input type="checkbox">I agree<\/label><span class="mm-annotation-row"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">3<\/code><\/span><\/div>/);
  assert.doesNotMatch(html, /mm-required/);
  assert.doesNotMatch(html, / aria-label="required"/);
  assert.doesNotMatch(html, / required/);
  assert.doesNotMatch(html, /Must be a valid email address\./);
  assert.doesNotMatch(html, /Enter a valid email address\./);
  assert.doesNotMatch(html, /Choose one role\./);
  assert.doesNotMatch(html, /Agreement is required\./);
});

test("renders List and Table elements from simple content properties", () => {
  const source = `---
id: SCR-LIST-TABLE
type: screen
title: List Table
---

# SCR-LIST-TABLE List Table

## States

- idle*

## Layout: mobile

### L-Content Content

- stack

#### Items

- E-Steps
- E-Users

## Elements

### 1:E-Steps List

- items: Draft, Review & Approve, Publish

### 2:E-Users Table

- label: Users
- Columns:
  - Name
  - Role
- Sample Rows:
  - Row
    - Name: Alice
    - Role: Admin
  - Row
    - Name: Bob
    - Role:
  - Row
    - Name: Eve <Root>
    - Role: Owner & Admin
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /<div class="mm-element-wrap mm-element-wrap-list mm-element-wrap-annotated" data-mm-render-key="element:E-Steps"><ul class="mm-element mm-element-list" data-mm-id="E-Steps">/);
  assert.match(html, /<ul class="mm-element mm-element-list" data-mm-id="E-Steps">/);
  assert.match(html, /<li>Draft<\/li><li>Review &amp; Approve<\/li><li>Publish<\/li>/);
  assert.match(html, /<table class="mm-element mm-element-table" data-mm-id="E-Users">/);
  assert.match(html, /<table class="mm-element mm-element-table" data-mm-id="E-Users"><caption>Users<\/caption>[\s\S]*<\/table><span class="mm-annotation-row"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">2<\/code><\/span>/);
  assert.match(html, /<colgroup><col style="width:50%"><col style="width:50%"><\/colgroup>/);
  assert.match(html, /<thead><tr><th>Name<\/th><th>Role<\/th><\/tr><\/thead>/);
  assert.match(html, /<tbody><tr><td>Alice<\/td><td>Admin<\/td><\/tr><tr><td>Bob<\/td><td><\/td><\/tr><tr><td>Eve &lt;Root&gt;<\/td><td>Owner &amp; Admin<\/td><\/tr><\/tbody>/);
});

test("warns for unsupported compact Table columns and row sample shortcuts", () => {
  const source = `---
id: SCR-USERS
type: screen
title: Users
---

# SCR-USERS Users

## States

- idle*

## Elements

### E-Users Table

- columns: Name, Role
- rows: Alice|Admin; Bob|Viewer

### E-UsersTypo Table

- Columns: Name, Role
- Sample Rows: Alice|Admin
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert(result.diagnostics.some((item) => item.message === "Element E-Users of type Table uses unsupported property columns."));
  assert(result.diagnostics.some((item) => item.message === "Element E-Users rows is not canonical. Use sample rows or Preview Scenario samples instead."));
  assert(result.diagnostics.some((item) => item.message === "Element E-UsersTypo of type Table uses unsupported property Columns."));
  assert(result.diagnostics.some((item) => item.message === "Element E-UsersTypo of type Table uses unsupported property Sample Rows."));
  assert.doesNotMatch(html, /<th>Name<\/th>/);
  assert.doesNotMatch(html, /<td>Alice<\/td>/);
});

test("renders Dialog Toast Image Icon and Spinner elements", () => {
  const source = `---
id: SCR-MEDIA
type: screen
title: Media
---

# SCR-MEDIA Media

## States

- idle*

## Layout: mobile

### L-Media Media

- stack

#### Items

- E-ConfirmDialog
- E-SavedToast
- E-ProfileImage
- E-SearchIcon
- E-読込中スピナー

## Elements

### 1:E-ConfirmDialog Dialog

- title: Delete item
- message: This action cannot be undone.
- actions: E-CancelDeleteButton, E-ConfirmDeleteButton

### E-CancelDeleteButton Button

- label: Cancel
- variant: secondary
- action: A-CancelDelete

### E-ConfirmDeleteButton Button

- label: Delete
- variant: primary
- tone: danger
- action: A-ConfirmDelete

### 5:E-SavedToast Toast

- message: Settings saved.
- tone: success
- placement: top-right
- duration: short

### 2:E-ProfileImage Image

- src: /assets/profile.png
- alt: Profile photo

### 3:E-SearchIcon Icon

- name: search
- label: Search

### 4:E-読込中スピナー Spinner

- label: Loading results...

## Actions

### A-CancelDelete Cancel delete

- Triggered
  - E-CancelDeleteButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

### A-ConfirmDelete Confirm delete

- Triggered
  - E-ConfirmDeleteButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /<section class="mm-element mm-element-dialog" data-mm-id="E-ConfirmDialog" role="dialog" aria-modal="true" aria-label="Delete item">/);
  assert.match(html, /<div class="mm-dialog-actions">[\s\S]*<button class="mm-element mm-element-button mm-variant-primary mm-tone-danger" data-mm-id="E-ConfirmDeleteButton">Delete<\/button>/);
  assert.match(html, /<div class="mm-dialog-actions">[\s\S]*<div class="mm-element-wrap mm-element-wrap-button mm-element-wrap-annotated" data-mm-render-key="element:E-CancelDeleteButton">[\s\S]*<span class="mm-annotation-row">[\s\S]*mm-marker-action[\s\S]*A-CancelDelete[\s\S]*<\/span><\/div>[\s\S]*<div class="mm-element-wrap mm-element-wrap-button mm-element-wrap-annotated" data-mm-render-key="element:E-ConfirmDeleteButton">[\s\S]*<span class="mm-annotation-row">[\s\S]*mm-marker-action[\s\S]*A-ConfirmDelete[\s\S]*<\/span><\/div>/);
  assert.match(html, /<div class="mm-dialog-body">This action cannot be undone\.<\/div>/);
  assert.match(html, /<div class="mm-element mm-element-toast mm-tone-success" data-mm-id="E-SavedToast" role="status" data-mm-toast-placement="top-right" data-mm-toast-duration="short"><span class="mm-toast-message">Settings saved\.<\/span><\/div>/);
  assert.match(html, /<figure class="mm-element mm-element-image" data-mm-id="E-ProfileImage">/);
  assert.match(html, /<div class="mm-image-placeholder">Profile photo<\/div><figcaption>\/assets\/profile\.png<\/figcaption>/);
  assert.match(html, /<span class="mm-element mm-element-icon" data-mm-id="E-SearchIcon" aria-label="Search">/);
  assert.match(html, /<span class="mm-icon-symbol">search<\/span>/);
  assert.match(html, /<span class="mm-element mm-element-spinner" data-mm-id="E-読込中スピナー" role="status" aria-label="Loading results\.\.\.">/);
  assert.match(html, /<span class="mm-spinner-label">Loading results\.\.\.<\/span>/);
});

test("warns when Dialog elements have no action buttons", () => {
  const source = `---
id: SCR-DIALOG-WARNING
type: screen
title: Dialog Warning
---

# SCR-DIALOG-WARNING Dialog Warning

## States

- idle*

## Elements

### E-ConfirmDialog Dialog

- title: Continue?
- message: Confirm before continuing.
`;
  const result = parseMarkVSpec(source);

  assert(result.diagnostics.some((diagnostic) => diagnostic.message === "Dialog E-ConfirmDialog should define actions with at least one Button element."));
});

test("accepts targetless Toast display effects while keeping ordinary elements target-required", () => {
  const source = `---
id: SCR-TOAST-DISPLAY
type: screen
title: Toast Display
---

# SCR-TOAST-DISPLAY Toast Display

## States

- idle*

## Elements

### E-SaveButton Button

- label: Save

### E-SavedToast Toast

- message: Settings saved.
- tone: success
- placement: top-right
- duration: short

### E-OtherText Text

- sample: Other

### E-BadToast Toast

- message: Bad toast.
- placement: center
- duration: forever

## Actions

### A-Save Save

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Save
  - case: success
    - Effects
      - display:
        - element: E-SavedToast
    - stop

### A-Other Other

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Other
  - case: done
    - Effects
      - display:
        - element: E-OtherText
    - stop
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(!messages.includes("Action A-Save process step P1 Save case success display effect must define target."));
  assert(messages.includes("Action A-Other process step P1 Other case done display effect must define target."));
  assert(messages.includes("Element E-BadToast placement must be one of top-right, top-left, bottom-right, bottom-left, top, bottom."));
  assert(messages.includes("Element E-BadToast duration must be one of short, medium, long, manual."));
});

test("renders practical UI helper elements", () => {
  const source = `---
id: SCR-HELPERS
type: screen
title: Helpers
---

# SCR-HELPERS Helpers

## States

- idle*

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- E-StartDate
- E-EndDate
- E-StartTime
- E-Headcount
- E-Upload
- E-Attachment
- E-Divider
- E-Empty

## Elements

### E-StartDate DatePicker

- value: \${model.startDate}
- initial value: 2026-05-01
- min: 2026-01-01
- max: 2026-12-31

### E-EndDate DateInput

- value: \${model.endDate}
- initial value: 2026-05-02
- min: 2026-01-01
- max: 2026-12-31

### E-StartTime TimeInput

- value: \${model.startTime}
- initial value: 10:30
- min: 09:00
- max: 18:00

### E-Headcount NumberInput

- value: \${model.headcount}
- initial value: 4
- min: 1
- max: 12
- step: 1

### E-Upload FileUpload

- label: Upload CSV
- accept: .csv
- multiple
- hint: CSV files only

### E-Attachment FileInput

- label: Attach receipt
- accept: application/pdf
- hint: PDF only

### E-Divider Divider

- label: Attachments

### E-Empty Paragraph

- text: No records. Change filters and search again.
`;

  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderMarkVSpecHtml(result);

  assert.match(html, /<input class="mm-element mm-element-datepicker" data-mm-id="E-StartDate" type="date" placeholder="" value="2026-05-01" min="2026-01-01" max="2026-12-31">/);
  assert.match(html, /<input class="mm-element mm-element-dateinput" data-mm-id="E-EndDate" type="date" placeholder="" value="2026-05-02" min="2026-01-01" max="2026-12-31">/);
  assert.match(html, /<input class="mm-element mm-element-timeinput" data-mm-id="E-StartTime" type="time" placeholder="" value="10:30" min="09:00" max="18:00">/);
  assert.match(html, /<input class="mm-element mm-element-numberinput" data-mm-id="E-Headcount" type="number" placeholder="" value="4" min="1" max="12" step="1">/);
  assert.match(html, /class="mm-element mm-element-fileupload"[^>]*><input type="file" accept="\.csv" multiple>Upload CSV<span class="mm-file-upload-helper">CSV files only<\/span><\/label>/);
  assert.match(html, /class="mm-element mm-element-fileinput"[^>]*><input type="file" accept="application\/pdf">Attach receipt<span class="mm-file-upload-helper">PDF only<\/span><\/label>/);
  assert.match(html, /class="mm-element mm-element-divider"[^>]+role="separator"><span class="mm-divider-label">Attachments<\/span><\/div>/);
  assert.match(html, /<p class="mm-element mm-element-paragraph" data-mm-id="E-Empty">No records\. Change filters and search again\.<\/p>/);
});

test("renders extended form primitive elements", () => {
  const source = `---
id: SCR-FORM-PRIMITIVES
type: screen
title: Form Primitives
---

# SCR-FORM-PRIMITIVES Form Primitives

## States

- idle*

## Layout: mobile

### L-Form Form

- stack

#### Items

- E-Notes
- E-Permissions
- E-Notifications
- E-EmailSwitch

## Elements

### E-Notes Textarea

- label: Notes
- width: full
- rows: 4
- placeholder: Internal notes
- initial value: Call before renewal.

### E-Permissions MultiSelect

- label: Permissions
- width: medium
- initial value: Manage users, Export reports
- options:
  - Manage users
  - Export reports
  - Billing

### E-Notifications CheckboxGroup

- label: Notifications
- name: notification-preferences
- initial value: Product updates, Security alerts
- options:
  - Product updates
  - Security alerts
  - Billing notices

### E-EmailSwitch Switch

- label: Email notifications
- initial value: true
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /<textarea class="mm-element mm-element-textarea mm-width-full" data-mm-id="E-Notes" rows="4" placeholder="Internal notes">Call before renewal\.<\/textarea>/);
  assert.match(html, /<select class="mm-element mm-element-multiselect mm-width-medium" data-mm-id="E-Permissions" multiple size="3">/);
  assert.match(html, /<option value="Manage users" selected>Manage users<\/option><option value="Export reports" selected>Export reports<\/option><option value="Billing">Billing<\/option>/);
  assert.match(html, /<fieldset class="mm-element mm-element-checkboxgroup" data-mm-id="E-Notifications"><legend>Notifications<\/legend>/);
  assert.match(html, /<input type="checkbox" name="notification-preferences" checked>Product updates/);
  assert.match(html, /<input type="checkbox" role="switch" checked><span class="mm-switch-track"><span class="mm-switch-thumb"><\/span><\/span>Email notifications/);
});

test("toggles marker categories independently", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, {
    markerVisibility: {
      layout: false,
      element: true,
      action: false
    }
  });
  const body = html.replace(/<style>[\s\S]*?<\/style>/, "");

  assert.doesNotMatch(body, /mm-marker-layout/);
  assert.match(body, /mm-marker-element/);
  assert.doesNotMatch(body, /mm-marker-action/);
  assert.match(body, />5<\/code>/);
  assert.doesNotMatch(body, />A1<\/code>/);
});

test("renders the requested viewport layout", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const mobileHtml = renderMarkVSpecHtml(result, { includeStyles: false, viewport: "mobile" });
  const desktopHtml = renderMarkVSpecHtml(result, { includeStyles: false, viewport: "desktop" });

  assert.match(mobileHtml, /class="[^"]*mm-layout-stack[^"]*"[^>]*data-mm-id="L-LoginForm"/);
  assert.match(mobileHtml, /class="[^"]*mm-layout-stack[^"]*"[^>]*data-mm-id="L-MessageArea"/);
  assert.doesNotMatch(mobileHtml, /data-mm-id="P-EmailField"/);
  assert.match(desktopHtml, /class="[^"]*mm-layout-stack[^"]*"[^>]*data-mm-id="L-LoginForm"/);
  assert.match(desktopHtml, /class="[^"]*mm-layout-row[^"]*"[^>]*data-mm-id="L-DesktopActions"/);
});

test("renders presentation panels without layout chrome or markers", () => {
  const source = `---
id: SCR-PRESENTATION-PANEL
type: screen
title: Presentation Panel
---

# SCR-PRESENTATION-PANEL Presentation Panel

## States

- idle*

## Layout: mobile

### L-Page Page

- stack
- marker: L1

#### Items

- P-Fields

### P-Fields Fields

- row
- gap: sm

#### Items

- E-Email
- E-Password

## Elements

### E-Email Input

- label: Email

### E-Password Input

- label: Password
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /data-mm-id="P-Fields"/);
  assert.match(html, /class="[^"]*\bmm-layout-presentation\b[^"]*\bmm-layout-row\b/);
  assert.doesNotMatch(html, />P-Fields<\/code>/);
  assert.match(renderMarkVSpecHtml(result), /\.mm-layout-presentation\{border:0;margin:0;padding:0\}/);
});

test("rejects semantic controls on presentation panels", () => {
  const source = `---
id: SCR-BAD-PRESENTATION-PANEL
type: screen
title: Bad Presentation Panel
---

# SCR-BAD-PRESENTATION-PANEL Bad Presentation Panel

## States

- idle*
- ready

## Layout: mobile

### L-Page Page

- stack

#### Items

- P-Fields

### P-Fields Fields

- stack
- marker: P1
- visible when: ready
- disabled when: idle

#### Items

- E-Email

## Elements

### E-Email Input

- label: Email

## Actions

### A-Refresh Refresh

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - case: success
    - Effects
      - update:
        - target: P-Fields
        - content: refreshed fields
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Presentation panel P-Fields ignores marker. Use an L-* Layout when a layout marker is needed."));
  assert(messages.includes("Presentation panel P-Fields cannot use visible when. Use an L-* Layout when visibility or disabled control is needed."));
  assert(messages.includes("Presentation panel P-Fields cannot use disabled when. Use an L-* Layout when visibility or disabled control is needed."));
  assert(messages.includes("Action A-Refresh process step Immediate success outcome cannot target presentation panel P-Fields. Use an L-* Layout when a targetable layout is needed."));
});

test("keeps stack buttons and links from stretching without overriding row alignment", () => {
  const source = `---
id: SCR-BUTTON-LINK-SIZING
type: screen
title: Button Link Sizing
---

# SCR-BUTTON-LINK-SIZING Button Link Sizing

## States

- idle*

## Layout: mobile

### L-Stack Stack

- stack

#### Items

- E-StackButton
- E-StackLink

### L-Row Row

- row

#### Items

- E-RowButton
- E-RowLink

## Elements

### E-StackButton Button

- label: Stack Button

### E-StackLink Link

- label: Stack Link

### E-RowButton Button

- label: Row Button

### E-RowLink Link

- label: Row Link
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.match(html, /\.mm-element-button\{align-items:center;background:#f3f4f6;border-color:#9ca3af;box-shadow:inset 0 -1px 0 rgba\(17,24,39,\.18\);color:#111827;cursor:default;display:inline-flex;font-weight:600;justify-content:center;line-height:1\.2;min-height:34px;padding:8px 14px;text-align:center\}/);
  assert.match(html, /\.mm-element-link\{align-items:center;display:inline-flex;line-height:1\.2\}/);
  assert.match(html, /\.mm-layout-stack > \.mm-element-wrap\{align-self:stretch;width:auto\}/);
  assert.match(html, /\.mm-layout-stack\.mm-variant-navigation:not\(\.mm-gap-xs\):not\(\.mm-gap-sm\):not\(\.mm-gap-md\):not\(\.mm-gap-lg\):not\(\.mm-gap-xl\)\{gap:var\(--mm-gap-sm,8px\)\}/);
  assert.match(html, /\.mm-layout-stack > \.mm-element-button,\.mm-layout-stack > \.mm-element-link,\.mm-layout-stack > \.mm-element-wrap-button,\.mm-layout-stack > \.mm-element-wrap-link\{align-self:flex-start;max-width:100%;white-space:normal;width:max-content\}/);
  assert.match(html, /\.mm-layout-stack > \.mm-element-wrap-heading,\.mm-layout-stack > \.mm-element-wrap-paragraph,\.mm-layout-stack > \.mm-element-wrap-text,\.mm-layout-stack > \.mm-element-wrap-checkbox\{align-self:flex-start;max-width:100%;width:max-content\}/);
  assert.match(html, /\.mm-layout-stack > \.mm-element-wrap-button > \.mm-element-button,\.mm-layout-stack > \.mm-element-wrap-link > \.mm-element-link\{max-width:100%;white-space:normal;width:max-content\}/);
  assert.doesNotMatch(html, /\n\.mm-element-link\{align-self:flex-start/);
  assert.doesNotMatch(html, /\n\.mm-element-button\{align-self:flex-start/);
});

test("keeps mobile row fields within the viewport", () => {
  const source = `---
id: SCR-MOBILE-FIELD
type: screen
title: Mobile Field
---

# SCR-MOBILE-FIELD Mobile Field

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- L-EmailField

### L-EmailField Email Field

- row

#### Items

- "Long Email Label": E-メールアドレス入力

## Elements

### E-メールアドレス入力 Input

- value: \${model.email}
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.match(html, /\.mm-layout\{border:1px solid #d1d5db;border-radius:6px;margin:var\(--mm-layout-margin-block,10px\) 0;max-width:100%;overflow-wrap:anywhere;padding:var\(--mm-layout-padding,14px\);position:relative\}/);
  assert.match(html, /\.mm-layout-depth-1\{border-color:#cbd5e1;border-style:dashed\}/);
  assert.match(html, /\.mm-layout-depth-2\{border-color:#d7dde7;border-style:dotted\}/);
  assert.match(html, /\.mm-layout-depth-deep\{background:rgba\(248,250,252,\.55\);border-color:#e2e8f0;border-style:dotted\}/);
  assert.match(html, /\.mm-gap-xs\{gap:var\(--mm-gap-xs,4px\)\}\.mm-gap-sm\{gap:var\(--mm-gap-sm,8px\)\}\.mm-gap-md\{gap:var\(--mm-gap-md,12px\)\}/);
  assert.match(html, /class="mm-layout mm-layout-row mm-layout-depth-1" style="--mm-layout-margin-block:6px;--mm-layout-padding:12px;--mm-gap-xs:3px;--mm-gap-sm:6px;--mm-gap-md:9px;--mm-gap-lg:12px;--mm-gap-xl:18px"/);
  assert.match(html, /\.mm-layout-row\{align-items:center;display:flex;flex-direction:row;flex-wrap:wrap\}/);
  assert.match(html, /\.mm-field-row\{align-items:center;display:flex;flex-direction:row;flex-wrap:wrap\}/);
  assert.match(html, /\.mm-layout-row > \.mm-field-row\{flex:0 1 auto;max-width:100%;width:auto\}/);
  assert.match(html, /\.mm-field-label\{color:#374151;min-width:0\}/);
  assert.match(html, /\.mm-field-row \.mm-field-label\{flex:0 1 120px\}/);
  assert.match(html, /\.mm-element-input,\.mm-element-textarea,\.mm-element-select,\.mm-element-multiselect,\.mm-element-datepicker,\.mm-element-dateinput,\.mm-element-timeinput,\.mm-element-numberinput\{background:white;min-width:0;width:min\(220px,100%\)\}/);
});

test("renders semantic input widths and button sizes", () => {
  const source = `---
id: SCR-FORM-SIZING
type: screen
title: Form Sizing
---

# SCR-FORM-SIZING Form Sizing

## Layout: desktop

### L-Form Form

- stack

#### Items

- "Postal code": E-PostalCode
- "Address": E-Address
- E-Role
- E-SearchAddress
- E-Save

## Elements

### E-PostalCode Input

- width: short
- placeholder: 100-0001

### E-Address Input

- width: full
- placeholder: Street address

### E-Role Select

- width: medium
- options:
  - Administrator
  - Member

### E-SearchAddress Button

- label: Search address
- size: small

### E-Save Button

- label: Save
- size: large
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /<input class="mm-element mm-element-input mm-width-short" data-mm-id="E-PostalCode"[^>]*>/);
  assert.match(html, /<div class="mm-element-wrap mm-element-wrap-input" style="width:min\(120px,100%\)" data-mm-render-key="element:E-PostalCode">/);
  assert.match(html, /<input class="mm-element mm-element-input mm-width-full" data-mm-id="E-Address"[^>]*>/);
  assert.match(html, /<div class="mm-element-wrap mm-element-wrap-input" style="width:min\(100%,100%\)" data-mm-render-key="element:E-Address">/);
  assert.match(html, /<select class="mm-element mm-element-select mm-width-medium" data-mm-id="E-Role">/);
  assert.match(html, /<button class="mm-element mm-element-button mm-size-small" data-mm-id="E-SearchAddress">Search address<\/button>/);
  assert.match(html, /<button class="mm-element mm-element-button mm-size-large" data-mm-id="E-Save">Save<\/button>/);
  assert.match(html, /\.mm-width-short,\.mm-width-medium,\.mm-width-long,\.mm-width-full\{max-width:100%;width:100%\}/);
  assert.match(html, /\.mm-element-button\.mm-size-small\{font-size:12px;min-height:28px;padding:5px 10px\}/);
});

test("warns for duplicate markers within each category", () => {
  const source = `---
id: SCR-MARKERS
type: screen
title: Markers
---

# SCR-MARKERS Markers

## States

- idle*

## Layout: mobile

### L-One One

- marker: A
- stack

### L-Two Two

- marker: A
- stack

## Elements

### E-One Text

- marker: 1
- value: One

### E-Two Text

- marker: 1
- value: Two

## Form Groups

### FG:F-One One

### FG:F-Two Two

## Validations

### MSG:V-One One

### MSG:V-Two Two

## Business Rules

### MSG:R-One One

### MSG:R-Two Two

## Error Codes

### ER:ERR-One One

- business rule: R-One
- target: E-One
- message: One failed.
- display: inline

### ER:ERR-Two Two

- business rule: R-One
- target: E-Two
- message: Two failed.
- display: inline

## Actions

### Do:A-One one

- Triggered
  - E-One.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

### Do:A-Two two

- Triggered
  - E-Two.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Duplicate layout marker A in mobile: L-One and L-Two."));
  assert(messages.includes("Duplicate element marker 1: E-One and E-Two."));
  assert(messages.includes("Duplicate form group marker FG: F-One and F-Two."));
  assert(messages.includes("Duplicate message marker MSG: V-One and V-Two."));
  assert(messages.includes("Duplicate message marker MSG: V-One and R-One."));
  assert(messages.includes("Duplicate message marker MSG: V-One and R-Two."));
  assert(messages.includes("Duplicate error code marker ER: ERR-One and ERR-Two."));
  assert(messages.includes("Duplicate action marker Do: A-One and A-Two."));
});

test("warns for invalid marker shapes", () => {
  const source = `---
id: SCR-MARKER-SHAPE
type: screen
title: Marker Shape
---

# SCR-MARKER-SHAPE Marker Shape

## States

- idle*

## Layout: mobile

### L-Page Page

- marker: LayoutMarkerTooLong
- stack

## Slot: content

### bad.slot:L-SlotContent Slot Content

- stack

## Elements

### bad.marker:E-Title Heading

- level: 1
- value: Title

## Form Groups

### FormGroupMarkerTooLong:F-LoginForm Login form

## Validations

### bad.marker:V-Email Email validation

## Business Rules

### Bad!Rule:R-Policy Policy

## Error Codes

### Bad!Error:ERR-Policy Policy error

- business rule: R-Policy
- target: E-Title
- message: Policy failed.
- display: inline

## Actions

### Do!:A-Submit Submit

- Triggered
  - E-Title.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Invalid layout marker LayoutMarkerTooLong on L-Page. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid layout marker bad.slot on L-SlotContent. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid element marker bad.marker on E-Title. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid form group marker FormGroupMarkerTooLong on F-LoginForm. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid message marker bad.marker on V-Email. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid message marker Bad!Rule on R-Policy. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid error code marker Bad!Error on ERR-Policy. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
  assert(messages.includes("Invalid action marker Do! on A-Submit. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number."));
});

test("warns for inconsistent layout markers across viewports", () => {
  const source = `---
id: SCR-RESPONSIVE-MARKERS
type: screen
title: Responsive Markers
---

# SCR-RESPONSIVE-MARKERS Responsive Markers

## States

- idle*

## Layout: mobile

### L-Page Page

- marker: L1
- stack

## Layout: desktop

### L-Page Page

- marker: D1
- row
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Layout L-Page uses inconsistent markers across viewports: L1 and D1."));
});

test("does not treat marker values as ID references", () => {
  const source = `---
id: SCR-MARKER-REF
type: screen
title: Marker Ref
---

# SCR-MARKER-REF Marker Ref

## States

- idle*

## Layout: mobile

### L-LoginForm Login Form

- marker: L-001
- stack

#### Items

- E-メールアドレス入力

## Elements

### E-メールアドレス入力 Input

- marker: E-001
- value: \${model.email}
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("warns for direct layout item syntax outside Items subsection", () => {
  const source = `---
id: SCR-DIRECT-LAYOUT
type: screen
title: Direct Layout
---

# SCR-DIRECT-LAYOUT Direct Layout

## States

- idle*

## Layout: mobile

### L-LoginForm Login Form

- stack
- contains: E-メールアドレス入力
- E-メールアドレス入力
- "Email": E-メールアドレス入力

#### Items

- contains: E-メールアドレス入力

## Elements

### E-メールアドレス入力 Input

- value: \${model.email}
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(result.layoutGroups[0]?.items.some((item) => item.type === "contains"), false);
  assert(messages.includes("Layout L-LoginForm uses direct contains; place child references under #### Items."));
  assert(messages.includes("Layout L-LoginForm uses a direct child reference; place E-メールアドレス入力 under #### Items."));
  assert(messages.includes("Layout L-LoginForm uses contains inside Items; use a bare child reference such as - E-メールアドレス入力."));
  assert(messages.includes("Layout L-LoginForm uses a direct field mapping; place field mappings under #### Items."));
});

test("parses and validates nested partial layout metadata", () => {
  const source = `---
id: SCR-PARTIAL-META
type: screen
title: Partial Metadata
---

# SCR-PARTIAL-META Partial Metadata

## States

- initializing*
- idle

## Layout: mobile

### L-PartialHost Partial Host

- stack
- partial:
  - id: NOTICE-LIST
  - states:
    - idel: loaded
    - initializing:
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  const partial = result.layoutGroups[0]?.partial;

  assert.equal(partial?.id, "NOTICE-LIST");
  assert.deepEqual(partial?.states, { idel: "loaded", initializing: "" });
  assert(messages.includes("Layout L-PartialHost partial id must use a PRT-* partial ID."));
  assert(messages.includes("Layout L-PartialHost partial state mapping references missing screen state idel."));
  assert(messages.includes("Layout L-PartialHost partial state mapping has an empty partial state."));
});

test("parses nested partial id after states", () => {
  const source = `---
id: SCR-PARTIAL-ORDER
type: screen
title: Partial Order
references:
  partials:
    PRT-NOTICE-LIST: ../partials/notice-list.vspec.md
---

# SCR-PARTIAL-ORDER Partial Order

## States

- idle*

## Layout: mobile

### L-PartialHost Partial Host

- stack
- partial:
  - states:
    - idle: loaded
  - id: PRT-NOTICE-LIST
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.layoutGroups[0]?.partial?.id, "PRT-NOTICE-LIST");
  assert.deepEqual(result.layoutGroups[0]?.partial?.states, { idle: "loaded" });
  assert.deepEqual(result.diagnostics, []);
});

test("reports partial IDs missing from Front Matter references", () => {
  const source = `---
id: SCR-PARTIAL-REFERENCE
type: screen
title: Partial Reference
---

# SCR-PARTIAL-REFERENCE Partial Reference

## States

- idle*

## Layout: mobile

### L-PartialHost Partial Host

- stack
- partial:
  - id: PRT-NOTICE-LIST
  - states:
    - idle: loaded

## Actions

### A-LoadNotices Load notices

- Triggered
  - screen.load
- From
  - idle
- Process: PartialRequest
  - request: GET /partials/notices
  - partial: PRT-OTHER-LIST
- Process: Immediate
  - case: success
    - Effects
      - state: idle
      - update:
        - target: L-PartialHost
        - mode: replace
        - content: PRT-RESULT-LIST
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Partial reference PRT-NOTICE-LIST is not defined in Front Matter references.partials."));
  assert(messages.includes("Partial reference PRT-OTHER-LIST is not defined in Front Matter references.partials."));
  assert(messages.includes("Partial reference PRT-RESULT-LIST is not defined in Front Matter references.partials."));
});

test("allows partial documents to request themselves without Front Matter references", () => {
  const source = `---
id: PRT-SELF
type: partial
title: Self Partial
---

# PRT-SELF Self Partial

## States

- idle*
- loading

## Layout: mobile

### L-Self Self

- stack

#### Items

- E-Refresh

## Elements

### E-Refresh Button

- label: Refresh

## Actions

### A-Refresh Refresh

- Triggered
  - E-Refresh.click
- From
  - idle
- Process: PartialRequest
  - request: GET /partials/self
  - partial: PRT-SELF
- Process: Immediate
  - update:
    - target: L-Self
    - mode: replace
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
});

test("still requires Front Matter references for non-request self partial references", () => {
  const source = `---
id: PRT-SELF-HOST
type: partial
title: Self Partial Host
---

# PRT-SELF-HOST Self Partial Host

## States

- idle*

## Layout: mobile

### L-Self Self

- stack
- partial:
  - id: PRT-SELF-HOST
  - states:
    - idle: loaded
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Partial reference PRT-SELF-HOST is not defined in Front Matter references.partials."));
});

test("evaluates diagnostics as a CI-ready validation gate", () => {
  const diagnostics = [
    { severity: "warning" as const, message: "Review this." }
  ];

  assert.deepEqual(evaluateMarkVSpecDiagnostics(diagnostics), {
    diagnostics,
    errorCount: 0,
    warningCount: 1,
    passed: true,
    exitCode: 0
  });
  assert.deepEqual(evaluateMarkVSpecDiagnostics(diagnostics, { failOnWarnings: true }), {
    diagnostics,
    errorCount: 0,
    warningCount: 1,
    passed: false,
    exitCode: 1
  });
  assert.equal(evaluateMarkVSpecDiagnostics([{ severity: "error", message: "Broken." }]).exitCode, 1);
});

test("ignores layout groups in bare Layout sections", () => {
  const source = `---
id: SCR-BARE-LAYOUT
type: screen
title: Bare Layout
---

# SCR-BARE-LAYOUT Bare Layout

## States

- idle*

## Layout

### L-Page Page

- stack

#### Items

- E-Title

## Layout:

### L-Empty Empty

- stack

## Elements

### E-Title Heading

- value: Title
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(result.layoutGroups.length, 0);
  assert(messages.includes("Layout section must specify a viewport, for example ## Layout: mobile."));
  assert(messages.includes("Layout group is ignored because its Layout section has no viewport."));
});

test("reports removed Repeat layout subsection", () => {
  const source = `---
id: SCR-REMOVED-REPEAT
type: screen
title: Removed Repeat
---

# SCR-REMOVED-REPEAT Removed Repeat

## States

- loaded*

## Layout: mobile

### L-RemovedRepeat Removed Repeat

- stack

#### Repeat

- source: \${model.items}
- item: \${model.item}
- limit: 3

#### Items

- E-Title

## Elements

### E-Title Text

- sample: Title
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  const layout = result.layoutGroups.find((group) => group.id === "L-RemovedRepeat");

  assert(messages.includes("Layout L-RemovedRepeat uses removed Repeat subsection. Use Element sample rows or Preview Scenario samples instead."));
  assert.equal(layout?.properties["source"], undefined);
  assert.equal(layout?.properties["item"], undefined);
  assert.equal(layout?.properties["limit"], undefined);
});

test("normalizes opaque source paths for column matching", () => {
  assert.equal(sourcePathKey("${model.users.items}"), "model.users.items");
  assert.equal(sourcePathKey("plain.source"), "plain.source");
});

test("reports legacy Model Samples as unsupported without model-backed preview expansion", () => {
  const source = `---
id: SCR-MODEL-SAMPLES
type: screen
title: Model Samples
default-state: loaded
---

# SCR-MODEL-SAMPLES Model Samples

## States

- loaded*
- empty

## Layout: mobile

### L-Rows Rows

- stack
- visible when: loaded

#### Items

- L-NoticeRow

### L-NoticeRow Notice Row

- row
- gap: sm

#### Items

- E-NoticeBadge
- E-お知らせタイトル

## Elements

### 1:E-NoticeBadge Badge

- source: data
- sample: 未読
- src: \${model.notice.read}
- format: false -> 未読, true -> 既読

### 2:E-お知らせタイトル Link

- source: data
- sample: お知らせ
- src: \${model.notice.title}
- href: SCR-NOTICE-DETAIL

## Actions

### A1:A-OpenNotice Open notice

- Triggered
  - E-お知らせタイトル.click
- From
  - loaded
- Process: Immediate
  - Effects
    - navigate: SCR-NOTICE-DETAIL

## Model Samples

### empty

#### \${model.noticeList.items}

| noticeId | title | read |
|---|---|---|

### loaded

#### \${model.noticeList.items}

| noticeId | title | read |
|---|---|---|
| N-001 | メンテナンスのお知らせ | false |
| N-002 | 利用規約改定のお知らせ | true |
| N-003 | キャンペーン開始のお知らせ | false |
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  assert.deepEqual(result.modelSamples, []);
  assert(messages.includes("## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead."));

  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });
  assert.doesNotMatch(html, /メンテナンスのお知らせ/);
  assert.doesNotMatch(html, /利用規約改定のお知らせ/);
  assert.doesNotMatch(html, /キャンペーン開始のお知らせ/);
  assert.match(html, /未読/);
  assert.equal(html.match(/data-mm-marker-category="element">1<\/code>/g)?.length, 1);
  assert.equal(html.match(/data-mm-marker-category="element">2<\/code>/g)?.length, 1);

  const emptyHtml = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true, state: "empty" });
  assert.doesNotMatch(emptyHtml, /お知らせ/);
  assert.doesNotMatch(emptyHtml, /未読/);
});

test("uses element sample when legacy object model samples are present", () => {
  const source = `---
id: SCR-PROFILE
type: screen
title: Profile
---

# SCR-PROFILE Profile

## States

- loaded*

## Layout: mobile

### L-Profile Profile

- stack

#### Items

- E-MemberName

## Elements

### 1:E-MemberName Text

- source: data
- sample: 読み込み中
- src: \${model.profile.name}

## Model Samples

### loaded

#### \${model.profile}

| name |
|---|
| 山田 太郎 |
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead."));
  assert.doesNotMatch(html, /山田 太郎/);
  assert.match(html, /読み込み中/);
});

test("reports unsupported legacy model samples instead of validating legacy internals", () => {
  const source = `---
id: SCR-BAD-MODEL-SAMPLES
type: screen
title: Bad Model Samples
---

# SCR-BAD-MODEL-SAMPLES Bad Model Samples

## States

- loaded*

## Elements

### E-Title Text

- src: \${model.notice.title}

## Model Samples

#### \${model.noticeList.items}

| title |
|---|

### missing

#### noticeList.items
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead."));
  assert(!messages.some((message) => message.startsWith("Model Samples path ")));
  assert(!messages.some((message) => message.startsWith("Model Samples state ")));
});

test("renders Table columns from Element sample rows", () => {
  const source = `---
id: SCR-MODEL-TABLE
type: screen
title: Model Table
default-state: idle
---

# SCR-MODEL-TABLE Model Table

## States

- idle*

## Layout: mobile

### L-Content Content

- stack

#### Items

- E-UsersTable

## Elements

### 1:E-UsersTable Table

- label: Users
- source: data
- Columns:
  - name: Name
    sortable: true
    sort: asc
  - email: Email
    sortable: true
  - role: Role
- sample rows:
  - row:
    - name: Taylor Stone
    - email: taylor@example.com
    - role: Administrator
  - row:
    - name: Riley Chen
    - email: riley@example.com
    - role: Member
`;
  const result = parseMarkVSpec(source);
  const table = result.elements.find((element) => element.id === "E-UsersTable");
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.equal(table?.tableColumns[0]?.key, "name");
  assert.equal(table?.tableColumns[0]?.label, "Name");
  assert.equal(table?.tableColumns[0]?.sortable, true);
  assert.equal(table?.tableColumns[0]?.sort, "asc");
  assert.match(html, /<thead><tr><th>Name &#8593;<\/th><th>Email &#8597;<\/th><th>Role<\/th><\/tr><\/thead>/);
  assert.match(html, /<tbody><tr><td>Taylor Stone<\/td><td>taylor@example.com<\/td><td>Administrator<\/td><\/tr><tr><td>Riley Chen<\/td><td>riley@example.com<\/td><td>Member<\/td><\/tr><\/tbody>/);
});

test("renders display elements from element samples instead of object model samples", () => {
  const source = `---
id: SCR-MODEL-OBJECT
type: screen
title: Model Object
default-state: idle
---

# SCR-MODEL-OBJECT Model Object

## States

- idle*

## Elements

### E-MemberName Text

- src: \${model.member.name}
- source: data
- sample: Taylor Stone
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.modelSamples, []);
  assert.match(html, /Taylor Stone/);
});

test("keeps source-style Table columns compatible with Element sample rows", () => {
  const source = `---
id: SCR-SOURCE-TABLE
type: screen
title: Source Table
default-state: idle
---

# SCR-SOURCE-TABLE Source Table

## States

- idle*

## Elements

### E-UsersTable Table

- label: Users
- source: data
- Columns:
  - Name: \${model.user.name}
  - Role: \${model.user.role}
- sample rows:
  - row:
    - name: Taylor Stone
    - role: Administrator
  - row:
    - name: Riley Chen
    - role: Member
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true });

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /<thead><tr><th>Name<\/th><th>Role<\/th><\/tr><\/thead>/);
  assert.match(html, /<tbody><tr><td>Taylor Stone<\/td><td>Administrator<\/td><\/tr><tr><td>Riley Chen<\/td><td>Member<\/td><\/tr><\/tbody>/);
});

test("warns for invalid Table rows and sort metadata", () => {
  const source = `---
id: SCR-BAD-TABLE
type: screen
title: Bad Table
default-state: idle
---

# SCR-BAD-TABLE Bad Table

## States

- idle*

## Elements

### E-UsersTable Table

- rows: \${model.users.missing}
- source: data
- Columns:
  - name: Name
    sortable: yes
    sort: ascending
  - role: Role
    - sortable: maybe
    - sort: downward

## Model Samples

### idle

#### \${model.users.items}

- name: Taylor Stone
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Element E-UsersTable rows is not canonical. Use sample rows or Preview Scenario samples instead."));
  assert(messages.includes("Element E-UsersTable table column Name sortable must be true or false."));
  assert(messages.includes("Element E-UsersTable table column Name sort must be asc or desc."));
  assert(messages.includes("Element E-UsersTable table column Role sortable must be true or false."));
  assert(messages.includes("Element E-UsersTable table column Role sort must be asc or desc."));
});

test("validates element source types", () => {
  const source = `---
id: SCR-SOURCE-TYPES
type: screen
title: Source Types
---

# SCR-SOURCE-TYPES Source Types

## Elements

### E-Unsupported Text

- value: Unsupported
- source: cms

### E-Document Text

- value: Document
- source: document

### E-OldSource Text

- value: Old
- source: \${model.old.value}

### E-ElementMissingValue Text

- source: element

### E-ElementMissingTarget Text

- value: E-Missing.value
- source: element

### E-ExplicitFixed Text

- value: Fixed
- source: fixed

### E-FixedSample Text

- sample: Fixed sample

### E-ModelSample Text

- src: \${model.profile.name}
- sample: Taylor

### E-FixedRows Table

- Columns:
  - name: Name
- sample rows:
  - row:
    - name: Taylor
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Element E-Unsupported source must be one of fixed, i18n, data, route, element, asset, external, computed."));
  assert(messages.includes("Element E-Document source document is not supported. Use fixed for document-authored content."));
  assert(messages.includes("Element E-OldSource source must be a source type, not a reference expression. Use rows, src, value, or another property for \${model.old.value}."));
  assert(messages.includes("Element E-ElementMissingValue source element requires value: E-*.value."));
  assert(messages.includes("Element E-ElementMissingTarget value references missing element E-Missing."));
  assert(!messages.some((message) => message.includes("E-ExplicitFixed")));
  assert(messages.includes("Element E-FixedSample sample is only for source data preview values. Use text, label, message, or hint for fixed content."));
  assert(messages.includes("Element E-ModelSample uses a model src with sample. Add source: data for data-derived preview values."));
  assert(messages.includes("Element E-FixedRows sample rows is only for source data preview rows. Add source: data or remove sample rows."));
});

test("ignores fixed-source sample rows in baseline wireframes", () => {
  const source = `---
id: SCR-FIXED-SAMPLE-ROWS
type: screen
title: Fixed Sample Rows
---

# SCR-FIXED-SAMPLE-ROWS Fixed Sample Rows

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-FixedList
- E-FixedTable

## Elements

### E-FixedList List

- sample rows:
  - row:
    - label: Invalid list sample

### E-FixedTable Table

- Columns:
  - label: Label
- sample rows:
  - row:
    - label: Invalid table sample
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  const html = renderMarkVSpecHtml(result, { includeStyles: false });

  assert(messages.includes("Element E-FixedList sample rows is only for source data preview rows. Add source: data or remove sample rows."));
  assert(messages.includes("Element E-FixedTable sample rows is only for source data preview rows. Add source: data or remove sample rows."));
  assert.doesNotMatch(html, /Invalid list sample/);
  assert.doesNotMatch(html, /Invalid table sample/);
});

test("renders source element values from element source and initial values", () => {
  const source = `---
id: SCR-ELEMENT-SOURCE
type: screen
title: Element Source
default-state: loaded
---

# SCR-ELEMENT-SOURCE Element Source

## States

- loaded*

## Elements

### E-EmailInput Input

- value: \${model.email}
- sample: member@example.com
- source: data

### E-EmailPreview Text

- value: E-EmailInput.value
- source: element

### E-NameInput Input

- value: \${model.name}
- initial value: Fallback Name
- source: data

### E-NamePreview Text

- value: E-NameInput.value
- source: element

`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false });

  assert.equal(result.diagnostics.length, 0);
  assert.match(html, /member@example\.com/);
  assert.match(html, /Fallback Name/);
});

test("diagnoses circular source element values", () => {
  const source = `---
id: SCR-ELEMENT-SOURCE-CYCLE
type: screen
title: Element Source Cycle
---

# SCR-ELEMENT-SOURCE-CYCLE Element Source Cycle

## Elements

### E-First Text

- value: E-Second.value
- source: element

### E-Second Text

- value: E-First.value
- source: element
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Element E-First source element has circular value reference: E-First -> E-Second -> E-First."));
  assert(messages.includes("Element E-Second source element has circular value reference: E-Second -> E-First -> E-Second."));
});

test("does not validate opaque model expression sources against sample columns", () => {
  const source = `---
id: SCR-MODEL-SAMPLE-COLUMNS
type: screen
title: Model Sample Columns
---

# SCR-MODEL-SAMPLE-COLUMNS Model Sample Columns

## States

- loaded*

## Elements

### E-Title Text

- src: \${model.notice.title}

### E-Missing Text

- src: \${model.notice.missing}

`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(!messages.includes("Element E-Title src \${model.notice.title} does not match any Model Samples column."));
  assert(!messages.includes("Element E-Missing src \${model.notice.missing} does not match any Model Samples column."));
});

test("warns for unsupported properties on known element types", () => {
  const source = `---
id: SCR-UNSUPPORTED-PROPS
type: screen
title: Unsupported Props
---

# SCR-UNSUPPORTED-PROPS Unsupported Props

## States

- idle*

## Elements

### E-保存ボタン Button

- label: Save
- placeholder: Save button
`;
  const result = parseMarkVSpec(source);
  const diagnostic = result.diagnostics.find((item) => item.message === "Element E-保存ボタン of type Button uses unsupported property placeholder.");

  assert(diagnostic);
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.line, lineNumber(source, "- placeholder: Save button"));
});

test("warns for unsupported legacy bind element property", () => {
  const source = `---
id: SCR-UNSUPPORTED-BIND
type: screen
title: Unsupported Bind
---

# SCR-UNSUPPORTED-BIND Unsupported Bind

## States

- idle*

## Elements

### E-EmailInput Input

- label: Email
- value: \${model.email}
- bind: \${model.email}
`;
  const result = parseMarkVSpec(source);
  const diagnostic = result.diagnostics.find((item) => item.code === "element.unsupportedLegacyBind");
  const messages = result.diagnostics.map((item) => item.message);

  assert(diagnostic);
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.message, "Element E-EmailInput uses unsupported legacy bind property. Use value/source for value origin, initial value for initial display, and E-*.value in request params instead.");
  assert.equal(renderDiagnosticMessageForLocale(diagnostic, "ja"), "Element E-EmailInput はサポート対象外の旧 bind property を使用しています。入力値の由来は value/source、初期表示は initial value、送信値参照は E-*.value を使ってください。");
  assert.equal(diagnostic.line, lineNumber(source, "- bind: ${model.email}"));
  assert(!messages.includes("Element E-EmailInput of type Input uses unsupported property bind."));
});

test("allows label src opaque references on element labels", () => {
  const source = `---
id: SCR-I18N-LABEL
type: screen
title: I18n Label
---

# SCR-I18N-LABEL I18n Label

## States

- idle*

## Elements

### E-Title Heading

- label: マイページ
- label src: \${copy.mypage.title}
`;
  const result = parseMarkVSpec(source);

  assert.equal(result.elements[0]?.properties["label src"], "\${copy.mypage.title}");
  assert.equal(result.diagnostics.find((diagnostic) => diagnostic.message.includes("label src")), undefined);
});

test("warns for malformed Action structure", () => {
  const source = `---
id: SCR-MALFORMED-ACTION
type: screen
title: Malformed Action
---

# SCR-MALFORMED-ACTION Malformed Action

## States

- idle*

## Actions

### A-Submit Submit

- request: POST /login
  - E-メールアドレス入力.click
- Process: POST /login
- Process: email: E-メールアドレス入力.value
- Process: Preprocess
  - request: POST /unsupported
  - target: L-MessageArea
  - update:
    - target: L-FirstMessageArea
  - target: L-SecondMessageArea
- Process: HttpRequest
  - POST /submit
  - target: L-HttpMessageArea
  - message: E-メールアドレス入力.value
- Process: Immediate
  - response: 2xx authenticated user
  - case: success
  - state: done
- Process: Immediate
  - Effects
    - request: POST /unsupported
    - target: L-MessageArea
- Process: Immediate
  - case: failure
    - Effects
      - update:
        - target: L-FirstMessageArea
    - target: L-MessageArea
    - request: POST /unsupported
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Submit has unsupported top-level entry: request: POST /login. Use From, Process P1: <name>, or Otherwise."));
  assert(messages.includes("Action A-Submit has nested entry outside a recognized block: E-メールアドレス入力.click."));
  assert(messages.includes("Action A-Submit has malformed Process entry: POST /login. Put request lines under a marked process such as Process P1: Submit request."));
  assert(messages.includes("Action A-Submit has malformed Process entry: email: E-メールアドレス入力.value. Start with a marked process such as Process P1: Submit request."));
  assert(messages.includes("Action A-Submit process step Preprocess has unsupported entry: target: L-MessageArea. Put update details under an update block."));
  assert(messages.includes("Action A-Submit process step Preprocess has unsupported entry: target: L-SecondMessageArea. Put update details under an update block."));
  assert(messages.includes("Action A-Submit HttpRequest has unsupported entry: target: L-HttpMessageArea. Use request parameter entries or move update details under a case update block."));
  assert(messages.includes("Action A-Submit process step Immediate has unsupported Effects entry: request: POST /unsupported. Use model, view, state, navigate, or update."));
  assert(messages.includes("Action A-Submit process step Immediate has unsupported Effects entry: target: L-MessageArea. Put update details under an update block."));
  assert(messages.includes("Action A-Submit has unsupported process step Immediate case failure entry: target: L-MessageArea. Put update details under an update block."));
  assert(messages.includes("Action A-Submit has unsupported process step Immediate case failure entry: request: POST /unsupported. Use description, state, navigate, response, from, params, update, stop, or continue."));
  const action = result.actions.find((candidate) => candidate.id === "A-Submit");
  assert.equal(action?.target, undefined);
  assert.deepEqual(action?.processSteps.find((step) => step.name === "HttpRequest")?.details.map((detail) => [detail.key, detail.value]), [["request", "POST /submit"], ["message", "E-メールアドレス入力.value"]]);
  assert.deepEqual(action?.processSteps.find((step) => step.name === "Preprocess")?.details.map((detail) => [detail.key, detail.value]), [["request", "POST /unsupported"]]);
  assert.equal(action?.processSteps.find((step) => step.name === "Preprocess")?.target, "L-FirstMessageArea");
  assert.equal(action?.processSteps.flatMap((step) => step.outcomes).find((outcome) => outcome.result === "failure")?.target, "L-FirstMessageArea");
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.startsWith("Action A-Submit has unsupported top-level entry"))?.line,
    lineNumber(source, "- request: POST /login")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.startsWith("Action A-Submit has nested entry outside"))?.line,
    lineNumber(source, "  - E-メールアドレス入力.click")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("unsupported Effects entry: request: POST /unsupported"))?.line,
    lineNumber(source, "    - request: POST /unsupported")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("Put request lines under a marked process"))?.line,
    lineNumber(source, "- Process: POST /login")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("email: E-メールアドレス入力.value. Start with a marked process"))?.line,
    lineNumber(source, "- Process: email: E-メールアドレス入力.value")
  );
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("HttpRequest has unsupported entry: target: L-HttpMessageArea"))?.line,
    lineNumber(source, "  - target: L-HttpMessageArea")
  );
});

test("parses PartialRequest update effects", () => {
  const source = `---
id: SCR-PARTIAL-REQUEST
type: screen
title: Partial Request
references:
  partials:
    PRT-PROFILE: ../partials/profile.vspec.md
---

# SCR-PARTIAL-REQUEST Partial Request

## States

- initializing*

## Layout: mobile

### L-PartialHost Partial Host

- stack

## Actions

### A-LoadPartial Load partial

- Triggered
  - screen.load
- From
  - initializing
- Process: PartialRequest
  - request: GET /partials/profile
  - partial: PRT-PROFILE
- Process: Immediate
  - case: success
    - description: 200 partial HTML
    - Effects
      - state: initializing
      - update:
        - target: L-PartialHost
        - mode: replace
        - content: PRT-PROFILE
`;
  const result = parseMarkVSpec(source);
  const partialAction = result.actions.find((action) => action.id === "A-LoadPartial");

  assert.equal(partialAction?.processSteps[0]?.name, "PartialRequest");
  assert.deepEqual(partialAction?.processSteps[0]?.details.map((detail) => [detail.key, detail.value]), [
    ["request", "GET /partials/profile"],
    ["partial", "PRT-PROFILE"]
  ]);
  assert.equal(partialAction?.processSteps[1]?.outcomes.find((outcome) => outcome.result === "success")?.mode, "replace");
});

test("parses process step cases under request steps", () => {
  const source = `---
id: SCR-STEP-CASES
type: screen
title: Step Cases
references:
  partials:
    PRT-POINTS-PANEL: ../partials/points-panel.vspec.md
---

# SCR-STEP-CASES Step Cases

## States

- loading*
- idle
- empty
- load-error

## Layout: mobile

### L-PointsPanel Points Panel

- stack

## Actions

### A-LoadPoints Load points

- Triggered
  - screen.load
- From
  - loading
- Process: PartialRequest
  - request: GET /points/panel
  - partial: PRT-POINTS-PANEL
  - receive:
    - response: A-LoadPoints.response
  - params:
    - page: 1
  - case: success-items
    - response: HTTP 200 items > 0
    - Effects
      - state: idle
      - update:
        - target: L-PointsPanel
        - mode: replace
    - Stop
  - case: success-empty
    - response: HTTP 200 items = 0
    - Effects
      - state: empty
      - update:
        - target: L-PointsPanel
        - mode: replace
    - Continue
  - case: failure
    - response: HTTP error
    - Effects
      - state: load-error
      - update:
        - target: L-PointsPanel
        - mode: replace
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-LoadPoints");
  const step = action?.processSteps[0];

  assert.equal(result.diagnostics.length, 0);
  assert.equal(step?.name, "PartialRequest");
  assert.deepEqual(step?.outcomes.map((outcome) => [outcome.result, outcome.response?.definition]), [
    ["success-items", "HTTP 200 items > 0"],
    ["success-empty", "HTTP 200 items = 0"],
    ["failure", "HTTP error"]
  ]);
  assert.deepEqual(step?.outcomes.map((outcome) => [outcome.result, outcome.to]), [
    ["success-items", "idle"],
    ["success-empty", "empty"],
    ["failure", "load-error"]
  ]);
  assert.deepEqual(step?.outcomes.map((outcome) => [outcome.result, outcome.flow ?? "continue"]), [
    ["success-items", "stop"],
    ["success-empty", "continue"],
    ["failure", "continue"]
  ]);
  assert.deepEqual(action?.outcomes, []);
  assert.deepEqual(action?.responses, []);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["loading", "success-items", "idle"],
    ["loading", "success-empty", "empty"],
    ["loading", "failure", "load-error"]
  ]);
});

test("parses parallel process groups and resolve steps", () => {
  const source = `---
id: SCR-PARALLEL-PROCESS
type: screen
title: Parallel Process
---

# SCR-PARALLEL-PROCESS Parallel Process

## States

- loading*
- idle
- load-error

## Actions

### A-InitialLoad Initial load

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - group: initial-load
  - MemberQueryService.findSelfProfile()
  - case: success
    - description: 200 member profile
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process: ServerCall
  - group: initial-load
  - PointQueryService.findSelfPoints()
  - case: success
    - description: 200 points
    - continue
  - case: failure
    - description: 5xx or timeout
    - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - description: profile and points loaded
    - Effects
      - state: idle
    - stop
  - case: failed
    - description: one or more calls failed
    - Effects
      - state: load-error
    - stop
`;
  const result = parseMarkVSpec(source);
  const action = result.actions.find((candidate) => candidate.id === "A-InitialLoad");
  const [profile, points, resolve] = action?.processSteps ?? [];

  assert.deepEqual(result.diagnostics, []);
  assert.equal(profile?.parallelGroup, "initial-load");
  assert.equal(points?.parallelGroup, "initial-load");
  assert.equal(resolve?.name, "Resolve");
  assert.equal(resolve?.resolveGroup, "initial-load");
  assert.deepEqual(profile?.details.map((detail) => [detail.key, detail.value]), [
    ["call", "MemberQueryService.findSelfProfile()"]
  ]);
  assert.deepEqual(profile?.outcomes.find((outcome) => outcome.result === "success")?.sideEffects, []);
  assert.deepEqual(resolve?.outcomes.map((outcome) => [outcome.result, outcome.to, outcome.flow]), [
    ["ready", "idle", "stop"],
    ["failed", "load-error", "stop"]
  ]);
  assert.deepEqual(resolve?.outcomes.map((outcome) => [outcome.result, outcome.description]), [
    ["ready", "profile and points loaded"],
    ["failed", "one or more calls failed"]
  ]);
  assert.deepEqual(action?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["loading", "ready", "idle"],
    ["loading", "failed", "load-error"]
  ]);
});

test("parses case description and warns on case-level result or response without receive", () => {
  const source = `---
id: SCR-CASE-DESCRIPTION
type: screen
title: Case Description
---
# SCR-CASE-DESCRIPTION Case Description

## States

- idle*
- saving
- save-error
- validation-error

## Elements

### E-SaveButton Button

- label: Save

## Actions

### A-Save Save

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Send save request
  - request:
    - method: POST
    - path: /save
  - result:
    - save request send result
  - case: sent
    - description: request accepted for sending
    - Effects
      - state: saving
  - case: send-failed
    - response: network error
    - Effects
      - state: save-error
  - case: skipped
    - result: already clean
    - Effects
      - state: idle
- Process P2: Handle save response
  - receive:
    - response: A-Save.P1.response
  - case: failure
    - response: 500 save failed
    - Effects
      - state: save-error
- Process P3: Check validation result
  - receive:
    - validation: V-SaveForm.result
  - case: invalid
    - response: required field missing
    - Effects
      - state: validation-error
  - case: branch
    - response: branch selected
    - Effects
      - state: idle

## Validations

### V-SaveForm Save form validation

- target: E-SaveButton
- rules:
  - required:
    - E-SaveButton
`;

  const result = parseMarkVSpec(source);
  const action = result.actions[0];
  const [sendStep, receiveStep] = action.processSteps;
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(sendStep?.outcomes.find((outcome) => outcome.result === "sent")?.description, "request accepted for sending");
  assert(messages.includes("Action A-Save process step P1 Send save request case send-failed uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations."));
  assert(messages.includes("Action A-Save process step P3 Check validation result case invalid uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations."));
  assert(messages.includes("Action A-Save process step P3 Check validation result case branch uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations."));
  assert(messages.includes("Action A-Save has unsupported process step Send save request case skipped entry: result: already clean. Use description for case-level explanatory text; keep result at the Process level."));
  assert.equal(receiveStep?.outcomes.find((outcome) => outcome.result === "failure")?.response?.definition, "500 save failed");
});

test("warns for invalid parallel process decisions and missing resolve groups", () => {
  const source = `---
id: SCR-BAD-PARALLEL-PROCESS
type: screen
title: Bad Parallel Process
---

# SCR-BAD-PARALLEL-PROCESS Bad Parallel Process

## States

- loading*
- idle
- load-error

## Actions

### A-InitialLoad Initial load

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - group: initial-load
  - MemberQueryService.findSelfProfile()
  - case: success
    - response: 200 member profile
    - Effects
      - state: idle
    - stop
- Process: Resolve
  - group: missing-load
  - case: failed
    - description: missing group
    - Effects
      - state: load-error
    - stop
- Process: Resolve
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-InitialLoad parallel process step ServerCall case success should not set state or navigate. Use a Resolve step for final transitions."));
  assert(messages.includes("Action A-InitialLoad parallel process step ServerCall case success should continue and leave final state decisions to a Resolve step."));
  assert(messages.includes("Action A-InitialLoad Resolve step references missing parallel group missing-load."));
  assert(messages.includes("Action A-InitialLoad Resolve step must specify a parallel group with group: initial-load."));
});

test("warns for malformed headings and indented non-action bullets", () => {
  const source = `---
id: SCR-MALFORMED-SECTIONS
type: screen
title: Malformed Sections
---

# SCR-MALFORMED-SECTIONS Malformed Sections

## States

- idle*

## Layout: mobile

### Page Without ID

### L-Page Page

  - stack

#### Items

  - E-Message

## Elements

### Message Text

### E-Message Text

  - value: Hello

## Actions

### Submit without ID

### A-Submit Submit

- Triggered
  - A-Missing.response
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Malformed Layout heading. Expected ### [<marker>:]L-* [name] or ### P-* [name].",
        lineNumber(source, "### Page Without ID"),
      ],
      ["warning", "Layout L-Page has indented metadata entry: stack. Use an unindented list item.", lineNumber(source, "  - stack")],
      ["warning", "Layout L-Page has indented Items entry: E-Message. Use an unindented list item.", lineNumber(source, "  - E-Message")],
      ["warning", "Malformed Element heading. Expected ### [<marker>:]E-* <type>.", lineNumber(source, "### Message Text")],
      ["warning", "Element E-Message has indented property entry: value: Hello. Use an unindented list item.", lineNumber(source, "  - value: Hello")],
      ["warning", "Malformed Action heading. Expected ### [<marker>:]A-* <name>.", lineNumber(source, "### Submit without ID")],
      ["error", "Action A-Submit trigger references missing action A-Missing.", lineNumber(source, "  - A-Missing.response")]
    ]
  );
});

test("validates action lifecycle trigger events", () => {
  const source = `---
id: SCR-ACTION-LIFECYCLE
type: screen
title: Action Lifecycle
---

# SCR-ACTION-LIFECYCLE Action Lifecycle

## States

- idle*
- wait

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process P1: Submit request
  - Effects
    - state: wait

### A-HandleResponse Handle response

- Triggered
  - A-Submit.P1.response
- From
  - wait
- Process P1: Handle response
  - Effects
    - state: idle

### A-HandleProgress Handle progress

- Triggered
  - A-Submit.progress
- From
  - wait
- Process P1: Handle progress
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.message, diagnostic.line]),
    [
      [
        "warning",
        "Action A-HandleResponse is triggered by A-Submit.P1.response but no process receives that response.",
        lineNumber(source, "  - A-Submit.P1.response")
      ],
      ["warning", "Action A-HandleProgress uses unsupported action lifecycle event progress.", lineNumber(source, "  - A-Submit.progress")]
    ]
  );
});

test("keeps message-only banners out of baseline state rendering", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { state: "idle" });

  assert.doesNotMatch(html, /The email address or password is incorrect\./);
  assert.doesNotMatch(html, /data-mm-id="E-AuthErrorBanner"/);
});

test("renders action markers only in explicit From states", () => {
  const source = `---
id: SCR-ACTION-FROM
type: screen
title: Action From
---

# SCR-ACTION-FROM Action From

## States

- idle*
- editing

## Layout: desktop

### L-Root Root

#### Items

- E-EditButton

## Elements

### 1:E-EditButton Button

- label: Edit
- action: A-StartEdit

## Actions

### A1:A-StartEdit Start edit

- Triggered
  - E-EditButton.click
- From
  - idle
- Process P1: Immediate
  - case: done
    - Effects
      - state: editing
`;
  const result = parseMarkVSpec(source);
  const idleHtml = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true, state: "idle", viewport: "desktop" });
  const editingHtml = renderMarkVSpecHtml(result, { includeStyles: false, showIds: true, state: "editing", viewport: "desktop" });
  const idleFragment = renderMarkVSpecHtmlFragment(result, "layout:desktop:L-Root", { includeStyles: false, showIds: true, state: "idle" })?.html ?? "";
  const editingFragment = renderMarkVSpecHtmlFragment(result, "layout:desktop:L-Root", { includeStyles: false, showIds: true, state: "editing" })?.html ?? "";
  const startEditAction = result.actions.find((action) => action.id === "A-StartEdit");

  assert.match(idleHtml, /<code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code>/);
  assert.doesNotMatch(editingHtml, /<code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code>/);
  assert.match(editingHtml, /Edit/);
  assert.match(idleFragment, /<code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code>/);
  assert.doesNotMatch(editingFragment, /<code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code>/);
  assert.match(editingFragment, /Edit/);
  assert.ok(startEditAction);
  assert.equal(actionAppliesToState(startEditAction, undefined, { unscoped: "always" }), false);
});

test("honors layout hidden conditions for state-specific rendering", () => {
  const source = `---
id: SCR-LAYOUT-HIDDEN
type: screen
title: Layout Hidden
---

# SCR-LAYOUT-HIDDEN Layout Hidden

## States

- idle*
- blocked
- review

## Layout: mobile

### L-Page Page

- stack

#### Items

- L-BlockedOnly
- L-HiddenWhenBlocked
- L-StateEnabled
- L-HumanEnabled

### L-BlockedOnly Blocked Only

- stack
- visible when: blocked
- visible when: review

#### Items

- E-BlockedText

### L-HiddenWhenBlocked Hidden When Blocked

- stack
- hidden when: blocked
- hidden when: review

#### Items

- E-IdleText

### L-StateEnabled State Enabled

- stack
- enabled when: idle

#### Items

- E-StateSubmitButton

### L-HumanEnabled Human Enabled

- stack
- enabled when: user can edit

#### Items

- E-HumanSubmitButton

## Elements

### E-BlockedText Text

- value: Blocked content

### E-IdleText Text

- value: Idle content

### E-StateSubmitButton Button

- label: Submit

### E-HumanSubmitButton Button

- label: Human Submit
`;
  const result = parseMarkVSpec(source);
  const blockedHtml = renderMarkVSpecHtml(result, { state: "blocked" });
  const reviewHtml = renderMarkVSpecHtml(result, { state: "review" });
  const idleHtml = renderMarkVSpecHtml(result, { state: "idle" });

  assert.match(blockedHtml, /Blocked content/);
  assert.doesNotMatch(blockedHtml, /Idle content/);
  assert.match(blockedHtml, /<button[^>]*disabled[^>]*>Submit<\/button>/);
  assert.doesNotMatch(blockedHtml, /<button[^>]*disabled[^>]*>Human Submit<\/button>/);
  assert.match(reviewHtml, /Blocked content/);
  assert.doesNotMatch(reviewHtml, /Idle content/);
  assert.match(reviewHtml, /<button[^>]*disabled[^>]*>Submit<\/button>/);
  assert.doesNotMatch(reviewHtml, /<button[^>]*disabled[^>]*>Human Submit<\/button>/);
  assert.match(idleHtml, /Idle content/);
  assert.doesNotMatch(idleHtml, /Blocked content/);
  assert.doesNotMatch(idleHtml, /<button[^>]*disabled[^>]*>Submit<\/button>/);
  assert.doesNotMatch(idleHtml, /<button[^>]*disabled[^>]*>Human Submit<\/button>/);
});

test("renders overlay layouts and disabled controls for active states", () => {
  const source = `---
id: SCR-WAIT
type: screen
title: Wait
---

# SCR-WAIT Wait

## States

- idle*
- waiting

## Layout: mobile

### L-Form Form

- stack
- disabled when: waiting
- selected when: \${state.waiting}
- active when: \${state.waiting}

#### Items

- E-メールアドレス入力
- E-SubmitButton
- L-Progress

### L-Progress Progress

- stack
- overlay: area
- visible when: waiting

#### Items

- E-WaitSpinner

## Elements

### E-メールアドレス入力 Input

- value: \${model.email}

### E-SubmitButton Button

- label: Submit

### E-WaitSpinner Spinner

- label: Waiting
`;
  const result = parseMarkVSpec(source);
  const waitingHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "waiting" });
  const idleHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "idle" });
  const styledWaitingHtml = renderMarkVSpecHtml(result, { state: "waiting" });

  assert.equal(result.diagnostics.length, 0);
  assert.match(waitingHtml, /<section class="mm-layout mm-layout-stack mm-layout-disabled mm-layout-selected mm-layout-active" data-mm-id="L-Form" data-mm-render-key="layout:mobile:L-Form">/);
  assert.match(waitingHtml, /<input class="mm-element mm-element-input" data-mm-id="E-メールアドレス入力" type="text" placeholder="" value="\$\{model\.email\}" disabled>/);
  assert.match(waitingHtml, /<button class="mm-element mm-element-button" data-mm-id="E-SubmitButton" disabled>/);
  assert.match(waitingHtml, /<section class="[^"]*\bmm-layout-overlay-area\b[^"]*\bmm-layout-depth-1\b[^"]*"[^>]*style="--mm-layout-margin-block:6px;--mm-layout-padding:12px;--mm-gap-xs:3px;--mm-gap-sm:6px;--mm-gap-md:9px;--mm-gap-lg:12px;--mm-gap-xl:18px"[^>]*data-mm-id="L-Progress"[^>]*data-mm-render-key="layout:mobile:L-Progress"/);
  assert.match(waitingHtml, /<span class="mm-element mm-element-spinner" data-mm-id="E-WaitSpinner" role="status" aria-label="Waiting">/);
  assert.match(styledWaitingHtml, /\.mm-layout-overlay\{align-items:center;background:rgba\(249,250,251,\.82\);border-color:#d1d5db;border-style:dashed;display:flex;justify-content:center;margin:0;z-index:4\}/);
  assert.match(styledWaitingHtml, /\.mm-layout-selected\{border-color:#2563eb\}/);
  assert.match(styledWaitingHtml, /\.mm-layout-active\{box-shadow:inset 0 0 0 1px #2563eb\}/);
  assert.doesNotMatch(idleHtml, /mm-layout-overlay-area/);
  assert.doesNotMatch(idleHtml, / disabled>/);
});

test("can include conditional content for design document wireframes", () => {
  const source = readFileSync(examplePath("04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeConditionalContent: true, showIds: true });

  assert.match(html, /Signing in\.\.\./);
  assert.match(html, /<code class="mm-id mm-marker mm-marker-layout" data-mm-marker-category="layout">L7<\/code>/);
  assert.doesNotMatch(html, /<code class="mm-id mm-marker mm-marker-layout" data-mm-marker-category="layout">P-EmailField<\/code>/);
});

test("renders model flag visibility conditions with supplied model values", () => {
  const source = `---
id: SCR-MODEL-VISIBILITY
type: screen
title: Model Visibility
---

# SCR-MODEL-VISIBILITY Model Visibility

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Loading
- E-Ready

## Elements

### E-Loading Text

- value: Loading...
- visible when: not \${model.profile.loaded}

### E-Ready Text

- value: Ready
- visible when: \${model.profile.loaded}
`;
  const result = parseMarkVSpec(source);
  const loadingHtml = renderMarkVSpecHtml(result, { includeStyles: false });
  const readyHtml = renderMarkVSpecHtml(result, { includeStyles: false, modelValues: { "\${model.profile.loaded}": true } });

  assert.match(loadingHtml, /Loading\.\.\./);
  assert.doesNotMatch(loadingHtml, /Ready/);
  assert.match(readyHtml, /Ready/);
  assert.doesNotMatch(readyHtml, /Loading\.\.\./);
});

test("uses default-state for renderer default display without changing initial state", () => {
  const source = `---
id: PRT-DEFAULT-DISPLAY
type: partial
title: Default Display
default-state: loaded
---

# PRT-DEFAULT-DISPLAY Default Display

## States

- loading*
- loaded

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Loading
- E-Loaded

## Elements

### E-Loading Text

- text: Loading...
- visible when: loading

### E-Loaded Text

- text: Loaded content
- visible when: loaded
`;
  const result = parseMarkVSpec(source);
  const defaultHtml = renderMarkVSpecHtml(result, { includeStyles: false });
  const loadingHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "loading" });

  assert.equal(result.states.find((state) => state.name === "loading")?.initial, true);
  assert.match(defaultHtml, /Loaded content/);
  assert.doesNotMatch(defaultHtml, /Loading\.\.\./);
  assert.match(loadingHtml, /Loading\.\.\./);
});

test("renders field mappings according to layout kind", () => {
  const source = `---
id: SCR-FIELDS
type: screen
title: Fields
---

# SCR-FIELDS Fields

## States

- idle*

## Layout: mobile

### L-001 Stack Field

- stack

#### Items

- "Email": E-001
- L-002
- L-003

### L-002 Grid Field

- grid

#### Items

- "Role": E-002

### L-003 Row Field

- row

#### Items

- "Keyword": E-003
- E-004

## Elements

### E-001 Input

- placeholder: Email address

### E-002 Input

- placeholder: Role

### E-003 Input

- placeholder: Keyword

### E-004 Select

- options:
  - Active
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.match(html, /mm-field-stack/);
  assert.match(html, /mm-field-grid/);
  assert.match(html, /<section class="mm-layout mm-layout-row[^"]*"[^>]*data-mm-id="L-003"[\s\S]*<div class="mm-field mm-field-row"><label class="mm-field-label">Keyword<\/label>[\s\S]*data-mm-id="E-003"[\s\S]*data-mm-id="E-004"/);
  assert.match(html, /\.mm-layout-row > \.mm-field-row\{flex:0 1 auto;max-width:100%;width:auto\}/);
});

test("sanitizes class tokens from author-controlled values", () => {
  const source = `---
id: SCR-XSS
type: screen
title: XSS
---

# SCR-XSS XSS

## States

- idle*

## Layout: mobile

### L-001 Page

- stack" onclick="alert(1)

#### Items

- E-001

## Elements

### E-001 Button

- label: Save
- variant: primary" onclick="alert(1)
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.doesNotMatch(html, /onclick=/);
  assert.match(html, /mm-layout-stack-onclick-alert-1/);
  assert.match(html, /mm-variant-primary-onclick-alert-1/);
});

test("skips recursive layout cycles", () => {
  const source = `---
id: SCR-CYCLE
type: screen
title: Cycle
---

# SCR-CYCLE Cycle

## States

- idle*

## Layout: mobile

### L-001 One

- stack

#### Items

- L-002

### L-002 Two

- stack

#### Items

- L-001
`;
  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result);

  assert.match(html, /Layout cycle skipped: L-001/);
});

test("diagnoses AI design input readiness and questions", () => {
  const source = `# 会員ポータル要件

## 目的

会員がポイントとお知らせを確認できるようにする。

## スコープ

- ログイン後ホーム
- お知らせ一覧

## ユーザー

- 会員
- 管理者

## 機能要件

- 会員はポイント残高を確認できる。

## API

- GET /api/member

## 未決事項

- 権限は要確認。
- エラー時は適宜表示する。
`;
  const report = diagnoseAiDesignInputDocument(source, { sourcePath: "member-portal.md" });

  assert.equal(report.schemaVersion, "ai-input-diagnostics/v1");
  assert.equal(report.sourcePath, "member-portal.md");
  assert.equal(report.documentKind, "requirements");
  assert(report.supportedDocumentKinds.some((kind) => kind.kind === "requirements"));
  assert(report.readinessScore < 100);
  assert(report.missingInformation.some((item) => item.includes("非スコープ")));
  assert(report.findings.some((finding) => finding.message.includes("曖昧表現")));
  assert(report.questions.some((question) => question.rationale.includes("不足")));
});

test("resolves renderer messages with external overrides and built-in fallback", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-renderer-messages-"));
  try {
    const sourcePath = join(dir, "screen.vspec.md");
    const messagePath = join(dir, "markvspec.messages.ja.yml");
    writeFileSync(messagePath, `locale: ja
messages:
  formControls: 入力値
  conditionHiddenShort: 非表示
  scenarioSamples: シナリオ別サンプル
  scenarioSampleRowsUnit: 件
`);

    const result = resolveRendererMessages({ locale: "ja", sourcePath });

    assert.equal(result.sourcePath, messagePath);
    assert.equal(result.messages.formControls, "入力値");
    assert.equal(result.messages.conditionHiddenShort, "非表示");
    assert.equal(result.messages.scenarioSamples, "シナリオ別サンプル");
    assert.equal(result.messages.scenarioSampleRowsUnit, "件");
    assert.equal(result.messages.wireframe, "ワイヤーフレーム");
    assert.deepEqual(result.diagnostics, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnoses unknown and invalid renderer message keys", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-renderer-messages-invalid-"));
  try {
    const messagePath = join(dir, "custom.yml");
    writeFileSync(messagePath, `locale: en
messages:
  formControls: Inputs
  pdfExportNotes: Old note title
  unknownLabel: Unknown
  wireframe:
    nested: no
`);

    const result = resolveRendererMessages({ locale: "en", explicitPath: messagePath });

    assert.equal(result.messages.formControls, "Inputs");
    assert.equal(result.messages.wireframe, "Wireframe");
    assert(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Unknown renderer message key: unknownLabel")));
    assert(!result.diagnostics.some((diagnostic) => diagnostic.message.includes("pdfExportNotes")));
    assert(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Renderer message key wireframe must be a string")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("falls back to built-in renderer messages when external file is invalid", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-renderer-messages-broken-"));
  try {
    const messagePath = join(dir, "broken.yml");
    writeFileSync(messagePath, `messages:
  formControls: [`);

    const result = resolveRendererMessages({ locale: "ja", explicitPath: messagePath });

    assert.equal(result.messages.formControls, "フォーム要素");
    assert(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Invalid renderer message YAML")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects renderer message files outside the workspace boundary", () => {
  const workspace = mkdtempSync(join(tmpdir(), "markvspec-renderer-messages-workspace-"));
  const outside = mkdtempSync(join(tmpdir(), "markvspec-renderer-messages-outside-"));
  try {
    const messagePath = join(outside, "markvspec.messages.ja.yml");
    writeFileSync(messagePath, `locale: ja
messages:
  formControls: 入力値
`);

    const result = resolveRendererMessages({
      locale: "ja",
      explicitPath: messagePath,
      workspaceRoot: workspace
    });

    assert.equal(result.sourcePath, undefined);
    assert.equal(result.messages.formControls, "フォーム要素");
    assert(result.diagnostics.some((diagnostic) => diagnostic.message.includes("outside the workspace")));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("parses view context definitions, samples, and preview scenarios", () => {
  const source = `---
id: SCR-VIEW-CONTEXT
type: screen
title: View Context
---
# SCR-VIEW-CONTEXT View Context

## States

- idle*
- loaded

## View Context

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true

### selectedTab

- type: enum
- values:
  - results*
  - billing

## View Context Samples

### default

- \${view.isHelpPanelOpen}: false
- \${view.selectedTab}: results

### help-open

- \${view.isHelpPanelOpen}: true
- \${view.selectedTab}: billing

## Model Samples

### loaded

#### \${model.member}

- name: Jane Doe

## Preview Scenarios

### idle

- state: idle
- view: default

### loaded-help

- state: loaded
- model: loaded
- view: help-open
- before: idle
`;

  const result = parseMarkVSpec(source);

  assert.deepEqual(result.viewContexts.map((context) => [context.name, context.type, context.defaultValue]), [
    ["isHelpPanelOpen", "boolean", "false"],
    ["selectedTab", "enum", "results"]
  ]);
  assert.deepEqual(result.viewContextSamples.map((sample) => [sample.name, sample.values]), [
    ["default", { isHelpPanelOpen: "false", selectedTab: "results" }],
    ["help-open", { isHelpPanelOpen: "true", selectedTab: "billing" }]
  ]);
  assert.deepEqual(result.previewScenarios.map((scenario) => [scenario.name, scenario.state, scenario.model, scenario.view, scenario.before]), [
    ["idle", "idle", undefined, "default", undefined],
    ["loaded-help", "loaded", "loaded", "help-open", "idle"]
  ]);
  assert(!result.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
});

test("parses Preview Scenario samples and Element sample rows", () => {
  const source = `---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
---
# SCR-SCENARIO-SAMPLES Scenario Samples

## States

- idle*
- loaded

## Elements

### E-Title Text

- source: data
- sample: Fallback title

### E-Users Table

- source: data
- Columns:
  - name: Name
  - role: Role
- sample rows:
  - row:
    - name: Alice
    - role: Admin
  - row:
    - name: Bob
    - role: Viewer

### E-EmptyUsers Table

- source: data
- Columns:
  - name: Name
- sample rows: []

## Preview Scenarios

### loaded-users

- state: loaded
- samples:
  - E-Title: Scenario title
  - E-Users:
    - rows:
      - row:
        - name: Carol
        - role: Owner
      - row:
        - name: Dan
        - role: Reviewer

### loaded-empty

- state: loaded
- samples:
  - E-Users:
    - rows: []
`;

  const result = parseMarkVSpec(source);
  const users = result.elements.find((element) => element.id === "E-Users");
  const emptyUsers = result.elements.find((element) => element.id === "E-EmptyUsers");

  assert.deepEqual(users?.sampleRows?.rows.map((row) => row.fields), [
    { name: "Alice", role: "Admin" },
    { name: "Bob", role: "Viewer" }
  ]);
  assert.equal(emptyUsers?.sampleRows?.explicitEmpty, true);
  assert.deepEqual(result.previewScenarios.map((scenario) => [scenario.name, scenario.samples.length]), [
    ["loaded-users", 2],
    ["loaded-empty", 1]
  ]);
  assert.deepEqual(result.previewScenarios[0]?.samples[0], {
    elementId: "E-Title",
    value: "Scenario title",
    location: result.previewScenarios[0]?.samples[0]?.location
  });
  assert.deepEqual(result.previewScenarios[0]?.samples[1]?.rows?.rows.map((row) => row.fields), [
    { name: "Carol", role: "Owner" },
    { name: "Dan", role: "Reviewer" }
  ]);
  assert.equal(result.previewScenarios[1]?.samples[0]?.rows?.explicitEmpty, true);
  assert(!result.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
});

test("treats state-named Preview Scenario samples as baseline state samples", () => {
  const source = `---
id: SCR-BASELINE-SCENARIO-SAMPLES
type: screen
title: Baseline Scenario Samples
---
# SCR-BASELINE-SCENARIO-SAMPLES Baseline Scenario Samples

## States

- idle*
- loaded

## Layout: mobile

### L-Main Stack

#### Items

- E-Title
- E-Users

## Elements

### E-Title Text

- source: data
- sample: Fallback title

### E-Users Table

- source: data
- Columns:
  - name: Name
- sample rows:
  - row:
    - name: Alice

## Preview Scenarios

### loaded

- samples:
  - E-Title: Baseline loaded title
  - E-Users:
    - rows:
      - row:
        - name: Carol

### loaded-empty

- state: loaded
- samples:
  - E-Users:
    - rows: []
`;
  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, undefined);
  const loaded = models.find((model) => model.stateViewTitle === "loaded");
  const loadedEmpty = models.find((model) => model.stateViewTitle === "loaded / loaded-empty");

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(models.map((model) => model.stateViewTitle), ["idle", "loaded", "loaded / loaded-empty"]);
  assert.equal(loaded?.scenario, false);
  assert.deepEqual(loaded?.scenarioSamples.map((sample) => [sample.elementId, sample.value, sample.rows?.rows.map((row) => row.fields)]), [
    ["E-Title", "Baseline loaded title", undefined],
    ["E-Users", undefined, [{ name: "Carol" }]]
  ]);
  assert.deepEqual(loaded?.scenarioExplicitSamples.map((sample) => [sample.elementId, sample.value, sample.rows?.rows.map((row) => row.fields)]), [
    ["E-Title", "Baseline loaded title", undefined],
    ["E-Users", undefined, [{ name: "Carol" }]]
  ]);
  assert.deepEqual(loadedEmpty?.scenarioSamples.map((sample) => [sample.elementId, sample.value, sample.rows?.explicitEmpty]), [
    ["E-Title", "Baseline loaded title", undefined],
    ["E-Users", undefined, true]
  ]);
  assert.deepEqual(loadedEmpty?.scenarioExplicitSamples.map((sample) => [sample.elementId, sample.value, sample.rows?.explicitEmpty]), [
    ["E-Users", undefined, true]
  ]);
});

test("keeps Preview Scenario prose on baseline and additional state view models", () => {
  const source = `---
id: SCR-SCENARIO-PROSE
type: screen
title: Scenario Prose
---
# SCR-SCENARIO-PROSE Scenario Prose

## States

- idle*
- loaded

## Elements

### E-Title Text

- source: data
- sample: Fallback title

## Preview Scenarios

### loaded

Baseline scenario lead.

- samples:
  - E-Title: Baseline loaded title

Baseline scenario notes.

### loaded-empty

Additional scenario lead.

- state: loaded

Additional scenario notes.
`;
  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, undefined);
  const loaded = models.find((model) => model.stateViewTitle === "loaded");
  const loadedEmpty = models.find((model) => model.stateViewTitle === "loaded / loaded-empty");

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(loaded?.scenarioOverview, ["Baseline scenario lead."]);
  assert.deepEqual(loaded?.scenarioNotes, ["Baseline scenario notes."]);
  assert.deepEqual(loadedEmpty?.scenarioOverview, ["Additional scenario lead."]);
  assert.deepEqual(loadedEmpty?.scenarioNotes, ["Additional scenario notes."]);
});

test("validates baseline Preview Scenario state-name blocks", () => {
  const source = `---
id: SCR-BAD-BASELINE-SCENARIOS
type: screen
title: Bad Baseline Scenarios
---
# SCR-BAD-BASELINE-SCENARIOS Bad Baseline Scenarios

## States

- idle*
- loaded

## Preview Scenarios

### idle

- state: idle

### loaded

- view: default
- model: loaded
- before: idle
- cases:
  - A-Submit.P1.success

### ghost

- samples:
  - E-Missing: Ghost

### loaded

- samples:
  - E-Missing: Duplicate

### idle-mismatch

- state: loaded

### idle

- state: loaded
`;
  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Preview Scenario idle matches a state name and repeats state: idle. Omit state: to define baseline state samples."));
  assert(messages.includes("Preview Scenario loaded is a baseline state sample and cannot define view. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant."));
  assert(messages.includes("Preview Scenario loaded is a baseline state sample and cannot define model. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant."));
  assert(messages.includes("Preview Scenario loaded is a baseline state sample and cannot define before. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant."));
  assert(messages.includes("Preview Scenario loaded is a baseline state sample and cannot define cases. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant."));
  assert(messages.includes("Preview Scenario ghost must specify state."));
  assert(messages.includes("Duplicate preview scenario ID: loaded."));
  assert(messages.includes("Duplicate preview scenario ID: idle."));
  assert(messages.includes("Preview Scenario idle matches a state name but references state loaded. Use a different scenario name or omit state: for baseline state samples."));
});

test("diagnoses malformed Preview Scenario entries with samples guidance", () => {
  const source = `---
id: SCR-BAD-SCENARIO-ENTRY
type: screen
title: Bad Scenario Entry
---
# SCR-BAD-SCENARIO-ENTRY Bad Scenario Entry

## States

- idle*

## Preview Scenarios

### idle

- unexpected
- route: memberId: M-200
`;

  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Preview Scenario idle has malformed entry: unexpected. Use state, model, view, route, samples, before, or cases."));
  assert(messages.includes("Preview Scenario idle route must be a block with key: value entries."));
});

test("validates Preview Scenario sample targets and data source sample rows", () => {
  const source = `---
id: SCR-BAD-SCENARIO-SAMPLES
type: screen
title: Bad Scenario Samples
---
# SCR-BAD-SCENARIO-SAMPLES Bad Scenario Samples

## States

- idle*

## Elements

### E-Title Text

- source: data
- sample: Title

### E-Users Table

- source: data
- Columns:
  - name: Name

### E-StaticUsers Table

- source: data
- Columns:
  - name: Name
- sample rows: []

### E-LegacyUsers Table

- source: data
- rows: ${"${model.users.items}"}
- Columns:
  - name: Name

## Preview Scenarios

### idle

- state: idle
- samples:
  - E-Missing: Ghost
  - E-StaticUsers:
    - rows: []
  - E-Users: Scalar table sample
  - E-Title:
    - rows:
      - row:
        - value: Bad text rows

## Model Samples

### idle

#### ${"${model.users.items}"}

- name: Alice
`;

  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Preview Scenario idle samples references missing element E-Missing."));
  assert(messages.includes("Element E-Users source data should define sample rows or Preview Scenario rows."));
  assert(!messages.includes("Element E-StaticUsers source data should define sample rows or Preview Scenario rows."));
  assert(messages.includes("Element E-LegacyUsers rows is not canonical. Use sample rows or Preview Scenario samples instead."));
  assert(messages.includes("Element E-LegacyUsers source data should define sample rows or Preview Scenario rows."));
  assert(messages.includes("Preview Scenario idle scalar sample target E-Users should not be a Table or List element. Use rows instead."));
  assert(messages.includes("Preview Scenario idle rows sample target E-Title must be a Table or List element."));
});

test("renders Element and Preview Scenario samples in wireframes", () => {
  const source = `---
id: SCR-SAMPLE-WIREFRAME
type: screen
title: Sample Wireframe
---
# SCR-SAMPLE-WIREFRAME Sample Wireframe

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-Title
- E-Users
- E-Tags
- E-EmptyUsers

## Elements

### E-Title Text

- source: data
- sample: Fallback title

### E-Users Table

- source: data
- Columns:
  - name: Name
  - role: Role
- sample rows:
  - row:
    - name: Alice
    - role: Admin

### E-Tags List

- source: data
- sample rows:
  - row:
    - label: Stable
  - row:
    - label: Preview

### E-EmptyUsers Table

- source: data
- Columns:
  - name: Name
- sample rows: []

## Preview Scenarios

### loaded-users

- state: loaded
- samples:
  - E-Title: Scenario title
  - E-Users:
    - rows:
      - row:
        - name: Carol
        - role: Owner
  - E-Tags:
    - rows: []
  - E-EmptyUsers:
    - rows: []
`;
  const result = parseMarkVSpec(source);
  const scenario = result.previewScenarios.find((candidate) => candidate.name === "loaded-users");
  assert(scenario);
  const baselineHtml = renderMarkVSpecHtml(result, { includeStyles: false, state: "loaded" });
  const scenarioHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    state: "loaded",
    sampleOverrides: Object.fromEntries(scenario.samples.map((sample) => [sample.elementId, sample]))
  });

  assert.match(baselineHtml, /Fallback title/);
  assert.match(baselineHtml, /<td>Alice<\/td><td>Admin<\/td>/);
  assert.match(baselineHtml, /<li>Stable<\/li><li>Preview<\/li>/);
  assert.match(baselineHtml, /<td class="mm-table-empty" colspan="1">\(no data\)<\/td>/);
  assert.match(scenarioHtml, /Scenario title/);
  assert.match(scenarioHtml, /<td>Carol<\/td><td>Owner<\/td>/);
  assert.match(scenarioHtml, /<li>\(no data\)<\/li>/);
  assert.doesNotMatch(scenarioHtml, /Fallback title|<td>Alice<\/td><td>Admin<\/td>|<li>Stable<\/li>/);
});

test("applies Preview Scenario route samples to route expression display values", () => {
  const source = `---
id: SCR-ROUTE-SAMPLES
type: screen
title: Route Samples
route: /members/:memberId
---
# SCR-ROUTE-SAMPLES Route Samples

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-MemberId
- E-RoutePlaceholder
- E-RouteToast
- E-RouteLink
- E-SourceOnly

## Elements

### E-MemberId Text

- label: Member ID
- value: \${route.memberId}
  - kind: route
  - source: \${route.memberId}

### E-RoutePlaceholder Input

- label: Member search
- placeholder: \${route.memberId}

### E-RouteToast Toast

- message: \${route.memberId}

### E-RouteLink Link

- href: \${route.memberId}

### E-SourceOnly Text

- label: Source only
- value: Baseline source-only value
  - kind: route
  - source: \${route.memberId}

## Preview Scenarios

### loaded

- route:
  - memberId: M-200
  - unused: kept

### direct-sample

- state: loaded
- route:
  - memberId: M-300
- samples:
  - E-MemberId: Direct ID
`;
  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  assert(messages.includes("Preview Scenario loaded route sample unused does not match any :param in screen route."));
  assert.deepEqual(result.previewScenarios[0]?.route.map((sample) => [sample.key, sample.value]), [
    ["memberId", "M-200"],
    ["unused", "kept"]
  ]);

  const models = buildStateScreenReadModels(result, result, undefined);
  const loaded = models.find((model) => model.stateViewTitle === "loaded");
  const direct = models.find((model) => model.stateViewTitle === "loaded / direct-sample");
  assert(loaded);
  assert(direct);

  const loadedHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    state: "loaded",
    routeValues: scenarioRouteValues(loaded.scenarioRoute)
  });
  const directHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    state: "loaded",
    routeValues: scenarioRouteValues(direct.scenarioRoute),
    sampleOverrides: Object.fromEntries(direct.scenarioSamples.map((sample) => [sample.elementId, sample]))
  });
  assert.match(loadedHtml, /M-200/);
  assert.match(loadedHtml, /placeholder="M-200"/);
  assert.match(loadedHtml, /<span class="mm-toast-message">M-200<\/span>/);
  assert.match(loadedHtml, /href="M-200"/);
  assert.match(loadedHtml, /Baseline source-only value/);
  assert.doesNotMatch(loadedHtml, /M-300|Direct ID/);
  assert.match(directHtml, /<span class="mm-element mm-element-text" data-mm-id="E-MemberId">Direct ID<\/span>/);
  assert.match(directHtml, /placeholder="M-300"/);

  const rows = stateScreenElementGroups(result.elements, result, "loaded", loaded).displayContentRows;
  const memberValueRow = rows.find((row) => row.element.id === "E-MemberId" && row.location === "value");
  const sourceOnlyRow = rows.find((row) => row.element.id === "E-SourceOnly" && row.location === "value");
  assert.equal(memberValueRow?.value, "M-200");
  assert.deepEqual(memberValueRow?.contentSections?.map((section) => [section.title, section.rows]), [
    ["Value", ["M-200"]],
    ["Source", ["${route.memberId}"]]
  ]);
  assert.equal(sourceOnlyRow?.value, "Baseline source-only value");
});

test("applies route hash values to preview-evaluable conditions", () => {
  const source = `---
id: SCR-ROUTE-HASH-TABS
type: screen
title: Route Hash Tabs
route: /settings/tabs#billing
---
# SCR-ROUTE-HASH-TABS Route Hash Tabs

## States

- idle*

## Layout: desktop

### L-Page Stack

#### Items

- E-Tabs

### L-ProfilePanel Stack

#### Items

- E-ProfileText

### L-BillingPanel Stack

#### Items

- E-BillingText

## Elements

### E-Tabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: \${route.hash} = profile
  - Billing
    - panel: L-BillingPanel
    - active when: \${route.hash} = billing

### E-ProfileText Text

- value: Profile panel

### E-BillingText Text

- value: Billing panel

## Preview Scenarios

### profile-direct-link

- state: idle
- route:
  - hash: #profile
`;
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);

  const defaultHtml = renderMarkVSpecHtml(result, { includeStyles: false });
  assert.match(defaultHtml, /data-mm-tab-panel="L-BillingPanel"[^>]*>Billing<\/span>/);
  assert.match(defaultHtml, /<div class="mm-controlled-panel mm-controlled-panel-tabs" data-mm-controlled-panel="L-BillingPanel">/);
  assert.doesNotMatch(defaultHtml, /data-mm-controlled-panel="L-ProfilePanel"/);

  const models = buildStateScreenReadModels(result, result, undefined);
  const direct = models.find((model) => model.stateViewTitle === "idle / profile-direct-link");
  assert(direct);
  assert.deepEqual(direct.scenarioRoute.map((sample) => [sample.key, sample.value]), [["hash", "profile"]]);

  const directHtml = renderMarkVSpecHtml(result, {
    includeStyles: false,
    state: "idle",
    routeValues: scenarioRouteValues(direct.scenarioRoute)
  });
  assert.match(directHtml, /data-mm-tab-panel="L-ProfilePanel"[^>]*>Profile<\/span>/);
  assert.match(directHtml, /<div class="mm-controlled-panel mm-controlled-panel-tabs" data-mm-controlled-panel="L-ProfilePanel">/);
  assert.doesNotMatch(directHtml, /data-mm-controlled-panel="L-BillingPanel"/);
});

test("warns when Preview Scenario route samples are used without a screen route", () => {
  const source = `---
id: SCR-ROUTE-SAMPLE-NO-ROUTE
type: screen
title: Route Sample Without Route
---
# SCR-ROUTE-SAMPLE-NO-ROUTE Route Sample Without Route

## States

- loaded*

## Preview Scenarios

### loaded

- route:
  - memberId: M-200
`;
  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);
  assert(messages.includes("Preview Scenario loaded defines route samples, but screen route is not defined."));
});

test("validates view context values and preview scenario coverage", () => {
  const source = `---
id: SCR-BAD-VIEW-CONTEXT
type: screen
title: Bad View Context
---
# SCR-BAD-VIEW-CONTEXT Bad View Context

## States

- idle*
- loaded

## View Context

### isHelpPanelOpen

- type: boolean
- values:
  - open*
  - closed*

### trueFalseMode

- type: enum
- values:
  - true
  - false

## View Context Samples

### default

- \${view.isHelpPanelOpen}: maybe
- \${view.missing}: true

## Preview Scenarios

### idle

- state: idle
- view: missing
- before: missing-preview

## Actions

### A-ToggleHelp Toggle help

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - Effects
    - view: \${view.isHelpPanelOpen} = true
    - view: \${view.missingActionView} = true
`;

  const messages = parseMarkVSpec(source).diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("View Context isHelpPanelOpen has multiple default values marked with *."));
  assert(messages.includes("View Context isHelpPanelOpen boolean value must be true or false, not open."));
  assert(messages.includes("View Context isHelpPanelOpen boolean value must be true or false, not closed."));
  assert(messages.includes("View Context trueFalseMode enum only defines true and false. Use type: boolean for binary flags."));
  assert(messages.includes("View Context Sample default sets isHelpPanelOpen to unsupported value maybe."));
  assert(messages.includes("View Context Sample default references missing view context missing."));
  assert(messages.includes("Preview Scenario idle references missing view context sample missing."));
  assert(messages.includes("Preview Scenario idle references missing before target missing-preview."));
  assert(messages.includes("View effect sets isHelpPanelOpen to unsupported value true."));
  assert(messages.includes("View effect references missing view context missingActionView."));
});

test("adds preview scenarios to baseline state previews and orders before scenarios", () => {
  const source = `---
id: SCR-PREVIEW-SCENARIO-ORDER
type: screen
title: Preview Scenario Order
---
# SCR-PREVIEW-SCENARIO-ORDER Preview Scenario Order

## States

- idle*
- loaded
- saved

## Preview Scenarios

### idle-help

- state: idle

### idle-confirm-discard

- state: idle

### loaded-help

- state: loaded
- before: saved-help

### saved-help

- state: saved
- before: saved
`;

  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, undefined);

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(models.map((model) => model.title), [
    "idle",
    "idle-help",
    "idle-confirm-discard",
    "loaded",
    "loaded-help",
    "saved-help",
    "saved"
  ]);
  assert.deepEqual(models.map((model) => model.stateViewTitle), [
    "idle",
    "idle / idle-help",
    "idle / idle-confirm-discard",
    "loaded",
    "loaded / loaded-help",
    "saved / saved-help",
    "saved"
  ]);
});

test("limits response-trigger model propagation to the referenced process marker", () => {
  const source = `---
id: SCR-PROCESS-MODEL-PROPAGATION
type: screen
title: Process Model Propagation
---
# SCR-PROCESS-MODEL-PROPAGATION Process Model Propagation

## States

- idle*
- waiting
- ready

## Elements

### E-Submit Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
- Process P1: Prepare unrelated model flag
  - Effects
    - model: \${model.unrelated.ready} = true
- Process P2: Send request
  - request:
    - method: POST
    - path: /submit
  - case: sent
    - Effects
      - model: \${model.related.ready} = true
      - state: waiting

### A-HandleResponse Handle response

- Triggered
  - A-Submit.P2.response
- From
  - waiting
- Process P1: Receive response
  - receive:
    - response: A-Submit.P2.response
  - case: success
    - response: 200 submitted
    - Effects
      - state: ready
`;
  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(modelValuesForState(result, "ready")["${model.related.ready}"], true);
  assert.equal(modelValuesForState(result, "ready")["${model.unrelated.ready}"], undefined);
});

test("renders namespaced state and view conditions", () => {
  const source = `---
id: SCR-VIEW-RENDER
type: screen
title: View Render
---
# SCR-VIEW-RENDER View Render

## States

- idle*
- loaded

## Layout: desktop

### L-Root Root

#### Items

- E-IdleText
- E-HelpPanel

## Elements

### E-IdleText Paragraph

- sample: Idle
- visible when: \${state.idle}

### E-HelpPanel Paragraph

- sample: Help
- visible when: \${view.isHelpPanelOpen}

## View Context

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true

## View Context Samples

### default

- \${view.isHelpPanelOpen}: true
`;

  const result = parseMarkVSpec(source);
  const html = renderMarkVSpecHtml(result, { includeStyles: false });

  assert.match(html, /Idle/);
  assert.match(html, /Help/);
});

test("parses compact process syntax with process cases and view effects", () => {
  const source = `---
id: SCR-COMPACT-ACTION
type: screen
title: Compact Action
---
# SCR-COMPACT-ACTION Compact Action

## States

- idle*
- loading
- loaded

## Elements

### E-SearchButton Button

- label: Search

## Actions

### A-Search Search

- Triggered
  - E-SearchButton.click
- From
  - idle
- Process: Immediate
  - view: \${view.selectedTab} = results
- Process: UpdateView
  - view: \${view.selectedTab} = results
- Process: HttpRequest
  - GET /search
    - keyword: E-KeywordInput.value
  - case: success
    - description: 200 search result
    - Effects
      - state: loaded
`;

  const result = parseMarkVSpec(source);
  const action = result.actions[0];

  assert.deepEqual(action.processSteps.map((step) => step.name), ["Immediate", "UpdateView", "HttpRequest"]);
  assert.deepEqual(action.processSteps[0]?.sideEffects, ["view: ${view.selectedTab} = results"]);
  assert.deepEqual(action.processSteps[1]?.sideEffects, ["view: ${view.selectedTab} = results"]);
  assert.deepEqual(action.processSteps[2]?.details.map((detail) => [detail.key, detail.value]), [
    ["request", "GET /search"],
    ["keyword", "E-KeywordInput.value"]
  ]);
  assert.deepEqual(action.processSteps[2]?.outcomes[0]?.sideEffects, []);
  assert.deepEqual(action.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["idle", "success", "loaded"]
  ]);
});

test("validates process granularity and direct immediate effects", () => {
  const source = `---
id: SCR-PROCESS-GRANULARITY
type: screen
title: Process Granularity
---
# SCR-PROCESS-GRANULARITY Process Granularity

## States

- idle*
- opened

## Layout

### L-Message Message

- stack

## Elements

### E-OpenButton Button

- label: Open

### E-OpenedMessage Text

- sample: Opened message

## Actions

### A-Open Open

- Triggered
  - E-OpenButton.click
- From
  - idle
- Process P1: Open immediately
  - state: opened
  - display:
    - target: L-Message
    - element: E-OpenedMessage

### A-Invalid Invalid

- Triggered
  - E-OpenButton.click
- From
  - idle
- Process P1: Mixed request and direct effect
  - request:
    - method: POST
    - path: /open
  - state: opened
- Process P2: Multiple calls
  - request:
    - method: POST
    - path: /open
  - sync:
    - AuditService.record()
- Process P3: Custom detail and direct effect
  - audit:
    - AuditService.record()
  - state: opened
- Process P4: Request and custom detail
  - request:
    - method: POST
    - path: /open
  - audit:
    - AuditService.record()
`;

  const result = parseMarkVSpec(source);
  const validStep = result.actions.find((action) => action.id === "A-Open")?.processSteps[0];
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(validStep?.to, "opened");
  assert.equal(validStep?.display?.target, "L-Message");
  assert.equal(validStep?.display?.element, "E-OpenedMessage");
  assert.deepEqual(result.actions.find((action) => action.id === "A-Open")?.transitions.map((transition) => [transition.from, transition.to]), [["idle", "opened"]]);
  assert(!messages.some((message) => message.includes("unsupported Effects entry: display")));
  assert(messages.includes("Action A-Invalid process step P1 Mixed request and direct effect mixes an execution detail with direct immediate effects. Move effects under a case or split the Process."));
  assert(messages.includes("Action A-Invalid process step P2 Multiple calls contains multiple execution detail blocks (request, sync). Split them into separate Process steps."));
  assert(messages.includes("Action A-Invalid process step P3 Custom detail and direct effect mixes an execution detail with direct immediate effects. Move effects under a case or split the Process."));
  assert(messages.includes("Action A-Invalid process step P4 Request and custom detail contains multiple execution detail blocks (request, audit). Split them into separate Process steps."));
});

test("localizes Action/Process diagnostics while preserving English fallback", () => {
  const source = `---
id: SCR-DIAG-I18N
type: screen
title: Diagnostic i18n
locale: ja
---

# SCR-DIAG-I18N Diagnostic i18n

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit
- action: A-Invalid

## Actions

### A-Invalid Invalid

- Triggered
  - E-Submit.click
- From
  - idle
- Process P1: Validate and update
  - receive:
    - validation: V-Form.result
  - state: idle
- Process P2: Multiple calls
  - request:
    - method: POST
    - path: /submit
  - sync:
    - AuditService.record()
`;

  const result = parseMarkVSpec(source);
  const mixed = result.diagnostics.find((diagnostic) => diagnostic.code === "action.process.mixesResultClassificationAndImmediateEffects");
  const multiple = result.diagnostics.find((diagnostic) => diagnostic.code === "action.process.multipleExecutionDetails");

  assert.equal(mixed?.message, "Action A-Invalid process step P1 Validate and update mixes result classification with direct immediate effects. Use case Effects for classified results.");
  assert.equal(renderDiagnosticMessageForLocale(mixed!, result.screen.locale), "Action A-Invalid の Process step P1 Validate and update で、result 分類と直接の immediate effect が混在しています。分類された result には case Effects を使ってください。");
  assert.equal(renderDiagnosticMessageForLocale(multiple!, "en"), "Action A-Invalid process step P2 Multiple calls contains multiple execution detail blocks (request, sync). Split them into separate Process steps.");
  assert.deepEqual(
    supportedDiagnosticMessageCodes().sort(),
    [
      "action.invalidTrigger",
      "action.missingTrigger",
      "action.parallelProcess.caseShouldNotSetStateOrNavigate",
      "action.process.caseResponseWithoutReceive",
      "action.process.mixesExecutionDetailAndImmediateEffects",
      "action.process.mixesResultClassificationAndImmediateEffects",
      "action.process.multipleExecutionDetails",
      "element.unknownType",
      "element.unsupportedLegacyBind",
      "element.unsupportedProperty",
      "frontMatter.missingRequired",
      "frontMatter.missingYaml",
      "layout.groupIgnoredWithoutViewport",
      "layout.missingViewport",
      "layout.unsupportedItemsEntry",
      "partial.referenceMissing",
      "previewScenario.missingState",
      "previewScenario.samplesMissingElement",
      "section.recommendedOrder",
      "validation.ruleMissingElement"
    ].sort()
  );
});

test("localizes representative diagnostics across authoring categories", () => {
  const cases = [
    {
      code: "frontMatter.missingYaml",
      ja: "YAML Front Matter がありません",
      source: "# Missing Front Matter\n"
    },
    {
      code: "frontMatter.missingRequired",
      ja: "必須 Front Matter field id がありません",
      source: `---
type: screen
title: Missing ID
---
# SCR-MISSING-ID Missing ID
`
    },
    {
      code: "section.recommendedOrder",
      ja: "推奨順",
      source: `---
id: SCR-SECTION-ORDER
type: screen
title: Section Order
locale: ja
---
# SCR-SECTION-ORDER Section Order

## Elements

### E-Title Text

- value: Title

## States

- idle*
`
    },
    {
      code: "layout.missingViewport",
      ja: "Layout section に viewport がありません",
      source: `---
id: SCR-LAYOUT-MISSING-VIEWPORT
type: screen
title: Layout Missing Viewport
locale: ja
---
# SCR-LAYOUT-MISSING-VIEWPORT Layout Missing Viewport

## Layout
`
    },
    {
      code: "layout.groupIgnoredWithoutViewport",
      ja: "この Layout group は無視されます",
      source: `---
id: SCR-LAYOUT-GROUP-NO-VIEWPORT
type: screen
title: Layout Group No Viewport
locale: ja
---
# SCR-LAYOUT-GROUP-NO-VIEWPORT Layout Group No Viewport

## Layout

### L-Page Page

- stack
`
    },
    {
      code: "layout.unsupportedItemsEntry",
      ja: "Items には L-* または E-* を指定してください",
      source: `---
id: SCR-LAYOUT-DIAG
type: screen
title: Layout Diagnostic
locale: ja
---
# SCR-LAYOUT-DIAG Layout Diagnostic

## Layout: mobile

### L-Page Page

- stack

#### Items

- BadItem
`
    },
    {
      code: "element.unknownType",
      ja: "サポート済み type",
      source: `---
id: SCR-ELEMENT-TYPE-DIAG
type: screen
title: Element Type Diagnostic
locale: ja
---
# SCR-ELEMENT-TYPE-DIAG Element Type Diagnostic

## Elements

### E-Widget Widget

- value: Widget
`
    },
    {
      code: "element.unsupportedProperty",
      ja: "canonical property",
      source: `---
id: SCR-ELEMENT-PROP-DIAG
type: screen
title: Element Property Diagnostic
locale: ja
---
# SCR-ELEMENT-PROP-DIAG Element Property Diagnostic

## Elements

### E-Button Button

- placeholder: Bad
`
    },
    {
      code: "action.missingTrigger",
      ja: "Element action:",
      source: `---
id: SCR-ACTION-MISSING-TRIGGER
type: screen
title: Action Missing Trigger
locale: ja
---
# SCR-ACTION-MISSING-TRIGGER Action Missing Trigger

## Actions

### A-Save Save

- From
  - idle
`
    },
    {
      code: "action.invalidTrigger",
      ja: "trigger service.response は不正",
      source: `---
id: SCR-ACTION-INVALID-TRIGGER
type: screen
title: Action Invalid Trigger
locale: ja
---
# SCR-ACTION-INVALID-TRIGGER Action Invalid Trigger

## Actions

### A-Save Save

- Triggered
  - service.response
`
    },
    {
      code: "partial.referenceMissing",
      ja: "references.partials",
      source: `---
id: SCR-PARTIAL-REF
type: screen
title: Partial Ref
locale: ja
---
# SCR-PARTIAL-REF Partial Ref

## Layout: mobile

### L-Host Host

- partial:
  - id: PRT-MISSING
`
    },
    {
      code: "validation.ruleMissingElement",
      ja: "存在しない element E-Missing",
      source: `---
id: SCR-VALIDATION-DIAG
type: screen
title: Validation Diagnostic
locale: ja
---
# SCR-VALIDATION-DIAG Validation Diagnostic

## Field Validations

### V-Email Email

- rules:
  - required:
    - E-Missing
`
    },
    {
      code: "previewScenario.missingState",
      ja: "- state: <state-name>",
      source: `---
id: SCR-SCENARIO-STATE
type: screen
title: Scenario State
locale: ja
---
# SCR-SCENARIO-STATE Scenario State

## Preview Scenarios

### missing-state

- view: default
`
    },
    {
      code: "previewScenario.samplesMissingElement",
      ja: "samples が存在しない element E-Missing",
      source: `---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
locale: ja
---
# SCR-SCENARIO-SAMPLES Scenario Samples

## States

- idle*

## Preview Scenarios

### idle

- state: idle
- samples:
  - E-Missing: Ghost
`
    }
  ] as const;

  for (const entry of cases) {
    const result = parseMarkVSpec(entry.source);
    const diagnostic = result.diagnostics.find((candidate) => candidate.code === entry.code);

    assert(diagnostic, `Missing diagnostic ${entry.code}`);
    assert.equal(renderDiagnosticMessageForLocale(diagnostic, "en"), diagnostic.message);
    assert(renderDiagnosticMessageForLocale(diagnostic, "ja").includes(entry.ja));
  }
});

test("parses architecture-neutral process markers, display effects, and preview scenario cases", () => {
  const source = `---
id: SCR-ACTION-NEUTRAL
type: screen
title: Action Neutral
references:
  partials:
---
# SCR-ACTION-NEUTRAL Action Neutral

## States

- loaded*
- loading
- empty

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-NextPageButton
- L-SearchResultsArea
- L-MessageArea

### L-SearchResultsArea Search results area

- stack

### L-MessageArea Message area

- stack

### L-SearchResultsList Search results list

- stack

#### Items

- E-SearchResultRows

## Elements

### E-NextPageButton Button

- label: Next
- value: 2

### E-SearchResultRows Table

- label: Search results

### E-LoadingResults Banner

- text: Loading results.

### E-NoResults Banner

- text: No results

## Actions

### A-NextSearchPage Show next search page

- Triggered
  - E-NextPageButton.click
- From
  - loaded
- Process P1: Request next search page
  - request:
    - method: GET
    - path: /search/results
    - params:
      - page: E-NextPageButton.value
  - result:
    - next search page request
  - case: sent
    - description: request was sent
    - Effects
      - state: loading
      - display:
        - target: L-SearchResultsArea
        - element: E-LoadingResults
    - continue
- Process P2: Handle search results response
  - receive:
    - response: A-NextSearchPage.P1.response
    - validation: V-SearchResult.result
  - case: success
    - response: 200 search results partial
    - Effects
      - state: loaded
      - display:
        - target: L-SearchResultsArea
        - element: L-SearchResultsList
  - case: empty
    - response: 200 empty result partial
    - Effects
      - state: empty
      - display:
        - target: L-MessageArea
        - element: E-NoResults

## Preview Scenarios

### next-page-loaded

- state: loaded
- cases:
  - A-NextSearchPage.P2.success

### next-page-loading

- state: loading
- cases:
  - A-NextSearchPage.P1.sent

### next-page-empty

- state: empty
- before: loading
- cases:
  - A-NextSearchPage.P2.empty

## Validations

### V-SearchResult Search result validation

- target: E-NextPageButton
- rules:
  - required:
    - E-NextPageButton
`;

  const result = parseMarkVSpec(source);
  const action = result.actions[0];
  const [requestStep, responseStep] = action.processSteps;

  assert.deepEqual(result.diagnostics, []);
  assert.equal(requestStep?.marker, "P1");
  assert.equal(requestStep?.name, "Request next search page");
  assert.deepEqual(requestStep?.inputs, []);
  assert.deepEqual(requestStep?.results.map((detail) => [detail.key, detail.value]), [["result", "next search page request"]]);
  assert.deepEqual(requestStep?.details.map((detail) => [detail.key, detail.value]), [
    ["request.method", "GET"],
    ["request.path", "/search/results"],
    ["request.params.page", "E-NextPageButton.value"]
  ]);
  assert.equal(requestStep?.outcomes[0]?.display?.target, "L-SearchResultsArea");
  assert.equal(requestStep?.outcomes[0]?.display?.element, "E-LoadingResults");
  assert.equal(responseStep?.marker, "P2");
  assert.deepEqual(responseStep?.receives.map((detail) => [detail.key, detail.value]), [
    ["response", "A-NextSearchPage.P1.response"],
    ["validation", "V-SearchResult.result"]
  ]);
  assert.equal(responseStep?.outcomes.find((outcome) => outcome.result === "empty")?.display?.element, "E-NoResults");
  assert.deepEqual(result.previewScenarios[0]?.cases.map((caseRef) => [caseRef.actionId, caseRef.processMarker, caseRef.caseName]), [
    ["A-NextSearchPage", "P2", "success"]
  ]);
  const models = buildStateScreenReadModels(result, result, "mobile");
  assert.deepEqual(models.map((model) => model.title), [
    "default viewport mobile",
    "next-page-loaded",
    "next-page-empty",
    "loading",
    "next-page-loading",
    "empty"
  ]);
  const loadedScenario = models.find((model) => model.title === "next-page-loaded");
  const loadingScenario = models.find((model) => model.title === "next-page-loading");
  const emptyScenario = models.find((model) => model.title === "next-page-empty");
  assert.deepEqual(loadedScenario?.displayEffects.map((display) => [display.target, display.element]), [
    ["L-SearchResultsArea", "L-SearchResultsList"]
  ]);
  assert.deepEqual(loadingScenario?.displayEffects.map((display) => [display.target, display.element]), [
    ["L-SearchResultsArea", "E-LoadingResults"]
  ]);
  assert.deepEqual(emptyScenario?.displayEffects.map((display) => [display.target, display.element]), [
    ["L-MessageArea", "E-NoResults"]
  ]);
  assert(loadedScenario?.renderedIds.layoutIds.has("L-SearchResultsList"));
  assert(loadedScenario?.renderedIds.elementIds.has("E-SearchResultRows"));
  assert(loadingScenario?.renderedIds.elementIds.has("E-LoadingResults"));
  assert(emptyScenario?.renderedIds.elementIds.has("E-NoResults"));
});

test("parses display.partial effects for partial host updates", () => {
  const source = `---
id: SCR-PARTIAL-DISPLAY
type: screen
title: Partial Display
references:
  partials:
    PRT-PROFILE-SUMMARY: ../partials/profile-summary.vspec.md
---

# SCR-PARTIAL-DISPLAY Partial Display

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- L-ProfileSummaryHost

### L-ProfileSummaryHost Profile summary host

- stack
- partial:
  - id: PRT-PROFILE-SUMMARY
  - states:
    - idle: loaded

## Actions

### A-RefreshProfile Refresh profile

- Triggered
  - screen.load
- From
  - idle
- Process P1: Handle profile summary response
  - case: success
    - description: 200 profile summary partial
    - Effects
      - display:
        - target: L-ProfileSummaryHost
        - partial: PRT-PROFILE-SUMMARY

## Preview Scenarios

### profile-loaded

- state: idle
- cases:
  - A-RefreshProfile.P1.success
`;

  const result = parseMarkVSpec(source);

  assert.deepEqual(result.diagnostics, []);
  const display = result.actions[0]?.processSteps[0]?.outcomes[0]?.display;
  assert.equal(display?.target, "L-ProfileSummaryHost");
  assert.equal(display?.partial, "PRT-PROFILE-SUMMARY");
  assert.equal(display?.element, undefined);
  assert.equal(display?.message, undefined);

  const scenario = buildStateScreenReadModels(result, result, "mobile").find((model) => model.title === "profile-loaded");
  assert.deepEqual(scenario?.displayEffects.map((effect) => [effect.target, effect.partial]), [
    ["L-ProfileSummaryHost", "PRT-PROFILE-SUMMARY"]
  ]);
  assert.equal(scenario?.displayExplanations[0]?.contentKind, "partial");
  assert.equal(scenario?.displayExplanations[0]?.sourceId, "PRT-PROFILE-SUMMARY");
  assert.deepEqual(scenario?.displayExplanations[0]?.targetRefs, ["L-ProfileSummaryHost"]);
});

test("diagnoses invalid display.partial and process-level partial contracts", () => {
  const source = `---
id: SCR-PARTIAL-DIAGNOSTICS
type: screen
title: Partial Diagnostics
references:
  partials:
    PRT-PROFILE: ../partials/profile.vspec.md
    PRT-OTHER: ../partials/other.vspec.md
---

# SCR-PARTIAL-DIAGNOSTICS Partial Diagnostics

## States

- idle*

## Layout: mobile

### L-PlainHost Plain host

- stack

### L-OtherHost Other host

- stack
- partial:
  - id: PRT-OTHER
  - states:
    - idle: loaded

## Elements

### E-Target Button

- label: Target

## Validations

### V-Required Required

- target: E-Target
- message: Required.

## Actions

### A-InvalidPartial Invalid partial

- Triggered
  - screen.load
- From
  - idle
- Process P1: Direct partial alias
  - partial: PRT-PROFILE
- Process P2: Missing target
  - case: done
    - Effects
      - display:
        - partial: PRT-PROFILE
- Process P3: Element target
  - case: done
    - Effects
      - display:
        - target: E-Target
        - partial: PRT-PROFILE
- Process P4: Missing layout target
  - case: done
    - Effects
      - display:
        - target: L-Missing
        - partial: PRT-PROFILE
- Process P5: Non partial host
  - case: done
    - Effects
      - display:
        - target: L-PlainHost
        - partial: PRT-PROFILE
- Process P6: Mismatched partial host
  - case: done
    - Effects
      - display:
        - target: L-OtherHost
        - partial: PRT-PROFILE
- Process P7: Combined content sources
  - case: done
    - Effects
      - display:
        - target: L-OtherHost
        - partial: PRT-OTHER
        - element: E-Target
        - message: V-Required.messages
- Process P8: Invalid partial id
  - case: done
    - Effects
      - display:
        - target: L-OtherHost
        - partial: E-Target
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-InvalidPartial process step P1 Direct partial alias has unsupported process-level partial PRT-PROFILE. Put returned partial content under Effects display.partial on the response case."));
  assert(messages.includes("Action A-InvalidPartial process step P2 Missing target case done display.partial PRT-PROFILE requires target to reference an L-* partial host."));
  assert(messages.includes("Action A-InvalidPartial process step P3 Element target case done display.partial PRT-PROFILE targets E-Target, but target must be an existing L-* partial host (element)."));
  assert(messages.includes("Action A-InvalidPartial process step P4 Missing layout target case done display.partial PRT-PROFILE targets L-Missing, but target must be an existing L-* partial host (missing layout)."));
  assert(messages.includes("Action A-InvalidPartial process step P5 Non partial host case done display.partial PRT-PROFILE targets L-PlainHost, but layout L-PlainHost is not a partial host with partial.id."));
  assert(messages.includes("Action A-InvalidPartial process step P6 Mismatched partial host case done display.partial PRT-PROFILE targets L-OtherHost, but layout L-OtherHost declares partial.id PRT-OTHER."));
  assert(messages.includes("Action A-InvalidPartial process step P7 Combined content sources case done display.partial PRT-OTHER cannot be combined with display.element E-Target. Use exactly one display content source."));
  assert(messages.includes("Action A-InvalidPartial process step P7 Combined content sources case done display.partial PRT-OTHER cannot be combined with display.message V-Required.messages. Use exactly one display content source."));
  assert(messages.includes("Action A-InvalidPartial process step P8 Invalid partial id case done display.partial E-Target must use a PRT-* partial ID."));
  assert.equal(
    result.diagnostics.find((diagnostic) => diagnostic.message.includes("unsupported process-level partial"))?.line,
    lineNumber(source, "  - partial: PRT-PROFILE")
  );
});

test("preserves custom process details with nested params", () => {
  const source = `---
id: SCR-CUSTOM-PROCESS-DETAIL
type: screen
title: Custom Process Detail
---

# SCR-CUSTOM-PROCESS-DETAIL Custom Process Detail

## States

- idle*
- submitting

## Elements

### E-EmailInput Input

- value: \${model.email}

### E-SubmitButton Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Submit with project sync
  - sync:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
  - result:
    - subscription creation request
  - case: sent
    - Effects
      - state: submitting
`;
  const result = parseMarkVSpec(source);
  const step = result.actions[0]?.processSteps[0];

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(step?.details.map((detail) => [detail.key, detail.value]), [
    ["sync", "SubscriptionService.create()"],
    ["sync.params.email", "E-EmailInput.value"]
  ]);
});

test("parses and validates display message field error targets", () => {
  const source = `---
id: SCR-FIELD-ERROR-DISPLAY
type: screen
title: Field Error Display
---
# SCR-FIELD-ERROR-DISPLAY Field Error Display

## States

- idle*

## Layout

### L-Form Form

- stack

#### Items

- E-EmailInput
- E-SubmitButton

## Elements

### E-EmailInput Input

- label: Email

### E-SubmitButton Button

- label: Submit

### E-Title Heading

- level: 2
- text: Account

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-EmailRules.result
  - case: invalid
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: V-EmailRules.messages
  - case: invalid-rich
    - Effects
      - display:
        - target: E-Title.error
        - element: E-SubmitButton
        - message: V-Missing.messages
  - case: invalid-missing-target
    - Effects
      - display:
        - target: E-MissingInput.error
        - message: V-EmailRules.messages
  - case: invalid-business-rule
    - Effects
      - display:
        - target: L-Form
        - message: R-RequiredFields.messages
  - case: invalid-missing-rule
    - Effects
      - display:
        - target: L-Form
        - message: R-Missing.messages
  - case: invalid-validation-without-message
    - Effects
      - display:
        - target: L-Form
        - message: V-NoMessage.messages
  - case: invalid-rule-without-message
    - Effects
      - display:
        - target: L-Form
        - message: R-Empty.messages
  - case: invalid-unsupported-message
    - Effects
      - display:
        - target: L-Form
        - message: EmailRules.messages

## Field Validations

### V1:V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.

### V2:V-NoMessage No message

- target: E-EmailInput
- constraints:
  - required

## Business Rules

### R1:R-RequiredFields Required fields

- description: Submit is blocked when required fields are missing.
- messages:
  - Submit is blocked until required fields are valid.

### R2:R-Empty Empty rule
`;

  const result = parseMarkVSpec(source);
  const invalid = result.actions[0]?.processSteps[0]?.outcomes.find((outcome) => outcome.result === "invalid");
  const rich = result.actions[0]?.processSteps[0]?.outcomes.find((outcome) => outcome.result === "invalid-rich");
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(invalid?.display?.target, "E-EmailInput.error");
  assert.equal(invalid?.display?.message, "V-EmailRules.messages");
  assert.equal(rich?.display?.message, "V-Missing.messages");
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-rich display effect targets E-Title.error, but E-Title is Heading. Field error targets should use input elements."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-rich display effect defines both element and message. Use element: for rich UI or message: for simple validation text, but not both."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-rich display.message references missing validation V-Missing."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-missing-target display effect targets missing field error element E-MissingInput."));
  assert(!messages.some((message) => message.includes("case invalid-business-rule display.message")));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-missing-rule display.message references missing business rule R-Missing."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-validation-without-message display.message references validation V-NoMessage, but it defines no message."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-rule-without-message display.message references business rule R-Empty, but it defines no message text."));
  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid-unsupported-message display.message EmailRules.messages is not recognized. Use V-*.messages or R-*.messages."));
});

test("falls back to validation IDs for unmarked display messages", () => {
  const source = `---
id: SCR-UNMARKED-DISPLAY-MESSAGE
type: screen
title: Unmarked Display Message
---
# SCR-UNMARKED-DISPLAY-MESSAGE Unmarked Display Message

## States

- idle*

## Layout

### L-Message Message

- stack

## Elements

### E-Button Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Button.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-Unmarked.result
  - case: invalid
    - Effects
      - display:
        - target: L-Message
        - message: V-Unmarked.messages

## Preview Scenarios

### invalid

- state: idle
- cases:
  - A-Submit.P1.invalid

## Validations

### V-Unmarked Unmarked validation

- target: E-Button
- run: client
- message: Missing marker message.
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  const models = buildStateScreenReadModels(result, result, undefined);
  const scenario = models.find((model) => model.title === "invalid");

  assert(messages.includes("Action A-Submit process step P1 Check validation case invalid display.message references validation V-Unmarked, but it defines no marker. Preview will use the validation ID as the display marker."));
  assert.equal(scenario?.displayExplanations[0]?.markerId, "V-Unmarked");
  assert.equal(scenario?.displayExplanations[0]?.sourceId, "V-Unmarked");
});

test("falls back to business rule IDs for unmarked display messages", () => {
  const source = `---
id: SCR-UNMARKED-RULE-MESSAGE
type: screen
title: Unmarked Rule Message
---
# SCR-UNMARKED-RULE-MESSAGE Unmarked Rule Message

## States

- idle*

## Layout

### L-Message Message

- stack

## Elements

### E-Button Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-Button.click
- From
  - idle
- Process P1: Submit request
  - server:
    - SubscriptionService.create()
  - result:
    - subscription creation request
  - case: business-rule-violation
    - business rule: R-Unmarked
    - Effects
      - display:
        - target: L-Message
        - message: R-Unmarked.messages

## Preview Scenarios

### duplicate

- state: idle
- cases:
  - A-Submit.P1.business-rule-violation

## Business Rules

### R-Unmarked Unmarked business rule

- messages:
  - Business rule message.
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  const models = buildStateScreenReadModels(result, result, undefined);
  const scenario = models.find((model) => model.title === "duplicate");

  assert(messages.includes("Action A-Submit process step P1 Submit request case business-rule-violation display.message references business rule R-Unmarked, but it defines no marker. Preview will use the business rule ID as the display marker."));
  assert.equal(result.actions[0]?.processSteps[0]?.outcomes[0]?.businessRules[0], "R-Unmarked");
  assert.equal(scenario?.displayExplanations[0]?.markerId, "R-Unmarked");
  assert.equal(scenario?.displayExplanations[0]?.sourceId, "R-Unmarked");
});

test("diagnoses misplaced business rule declarations in process details and noncanonical cases", () => {
  const source = `---
id: SCR-BUSINESS-RULE-PLACEMENT
type: screen
title: Business Rule Placement
---
# SCR-BUSINESS-RULE-PLACEMENT Business Rule Placement

## States

- idle*

## Elements

### E-SubmitButton Button

- label: Submit
- action: A-Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Submit request
  - receive:
    - business rule: R-EmailMustBeUnique
  - result:
    - business rule: R-EmailMustBeUnique
  - case: duplicate-email
    - business rule: R-EmailMustBeUnique

## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- messages:
  - This email address is already registered.
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Submit process step P1 Submit request receive entry business rule: R-EmailMustBeUnique is not allowed. Put business rule: under case: business-rule-violation."));
  assert(messages.includes("Action A-Submit process step P1 Submit request result entry business rule: R-EmailMustBeUnique is not allowed. Put business rule: under case: business-rule-violation."));
  assert(messages.includes("Action A-Submit process step P1 Submit request case duplicate-email declares business rule R-EmailMustBeUnique. Use case: business-rule-violation for business rule violations."));
});

test("validates architecture-neutral process contracts and preview scenario cases", () => {
  const source = `---
id: SCR-ACTION-NEUTRAL-DIAGNOSTICS
type: screen
title: Action Neutral Diagnostics
---
# SCR-ACTION-NEUTRAL-DIAGNOSTICS Action Neutral Diagnostics

## States

- idle*
- loaded

## Layout

### L-Target Target

- stack

## Elements

### E-Button Button

- label: Run

### E-Other Text

- sample: Other

## Actions

### A-Run Run

- Triggered
  - E-Button.click
- From
  - idle
- Process P1: Missing result
  - input:
    - value: E-Missing.value
  - case: done
    - Effects
      - state: loaded
      - display:
        - target: L-Target
        - element: E-Button
        - element: E-Other
- Process P1: Duplicate marker
  - receive:
    - response: A-Run.P9.response
    - external: A-Other.P9.result
  - case: done
    - Effects
      - display:
        - target: L-Missing
        - element: E-Button E-Other
        - elements: E-Button, E-Other
        - content:
          - partial: PRT-Missing

### A-Other Other

- Triggered
  - A-Run.response
- From
  - idle
- Process P1: Other process
  - receive:
    - validation: V-SearchResult.result
  - case: done
    - Effects
      - state: loaded
      - display:
        - element: E-Other

## Preview Scenarios

### loaded

- state: loaded
- cases:
  - A-Run.P2.done
`;

  const result = parseMarkVSpec(source);
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert(messages.includes("Action A-Run process step Missing result uses legacy input block syntax. Put execution values under request.params, server.params, or custom detail params instead."));
  assert(messages.includes("Action A-Run process step P1 Missing result value references missing source E-Missing."));
  assert(messages.includes("Action A-Run has duplicate process marker P1."));
  assert(messages.includes("Action A-Run process step P1 Duplicate marker references missing process marker P9."));
  assert(messages.includes("Action A-Other trigger A-Run.response is ambiguous. Use A-ActionId.P-marker.response."));
  assert(messages.includes("Action A-Run process step P1 Missing result case done display effect must define exactly one element."));
  assert(messages.includes("Action A-Run process step P1 Duplicate marker case done display effect targets missing layout or element L-Missing."));
  assert(messages.includes("Action A-Run process step P1 Duplicate marker case done display effect element must reference one E-* element or L-* layout."));
  assert(messages.includes("Action A-Run process step P1 Duplicate marker case done display.elements is not supported. Use singular element: with one E-* element or L-* layout."));
  assert(messages.includes("Action A-Run process step P1 Duplicate marker case done display.content.partial is not supported. Define an E-* or L-* object and reference it with element:."));
  assert(messages.includes("Action A-Other process step P1 Other process case done display effect must define target."));
  assert(messages.includes("Partial reference PRT-Missing is not defined in Front Matter references.partials."));
  assert(messages.includes("Preview Scenario loaded references missing process marker P2 on action A-Run."));
});

test("warns for unresolved markdown entity references while ignoring code spans and fences", () => {
  const result = parseMarkVSpec(`---
id: SCR-ENTITY-REFS
type: screen
title: Entity refs
---

See #{R-Eligibility}, #{E-NameInput}, and #{L-SlotContent}.
Keep \`#{R-InlineCode}\`, \`\`#{E-MultiBacktickCode}\`\`, and \`\`literal \` #{A-Submit}\`\` literal.

\`\`\`markdown
#{R-CodeFence}
\`\`\`

## States

- idle*

## Layout: desktop

### L-Form Form

- stack

#### Items

- E-NameInput

## Slot: content

### L-SlotContent Slot content

Slot prose misses #{R-MissingSlotRule}.

- stack

## Elements

### E-NameInput Input

- label: Name

## Business Rules

### R-Eligibility Eligibility

- marker: R1

## Notes

Missing #{R-MissingRule}.
`);

  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  assert(messages.includes("Reference #{R-MissingRule} does not match any MarkVSpec entity."));
  assert(messages.includes("Reference #{R-MissingSlotRule} does not match any MarkVSpec entity."));
  assert(!messages.some((message) => message.includes("R-InlineCode")));
  assert(!messages.some((message) => message.includes("E-MultiBacktickCode")));
  assert(!messages.some((message) => message.includes("A-Submit")));
  assert(!messages.some((message) => message.includes("R-CodeFence")));
  assert(!messages.some((message) => message.includes("R-Eligibility")));
  assert(!messages.some((message) => message.includes("E-NameInput")));
  assert(!messages.some((message) => message.includes("L-SlotContent")));
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
