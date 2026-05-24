import assert from "node:assert/strict";
import test from "node:test";
import * as vscode from "vscode";
import { createMarkVSpecCodeActions } from "../src/quick-fixes.js";

function createTextDocument(source: string, filePath = "/workspace/example.vspec.md") {
  const lines = source.split(/\r?\n/);
  return {
    getText: () => source,
    lineAt: (line: number) => ({ text: lines[line] ?? "" }),
    lineCount: lines.length,
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markvspec",
    fileName: filePath
  };
}

function createDiagnostic(source: string, lineText: string, message: string): vscode.Diagnostic {
  const line = source.split(/\r?\n/).findIndex((candidate) => candidate === lineText);
  assert.notEqual(line, -1, lineText);
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(line, 0, line, lineText.length),
    message,
    vscode.DiagnosticSeverity.Warning
  );
  diagnostic.source = "MarkVSpec";
  return diagnostic;
}

test("creates a quick fix for missing action triggers", () => {
  const source = `---
id: SCR-QUICKFIX
type: screen
title: Quick Fix
---

# SCR-QUICKFIX Quick Fix

## States

- idle*

## Actions

### A-Submit Submit

#### From
- idle
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "### A-Submit Submit",
    "Action A-Submit has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Add page.load event for A-Submit");
  assert.equal(actions[0]?.isPreferred, undefined);
  assert.equal(edits.edits.length, 1);
  assert.equal(edits.edits[0]?.kind, "insert");
  assert.deepEqual(edits.edits[0]?.uri, (document as { uri: unknown }).uri);
  assert.equal(edits.edits[0]?.position?.line, 19);
  assert.equal(edits.edits[0]?.position?.character, 0);
  assert.equal(edits.edits[0]?.newText, "\n## Events\n\n- page.load: A-Submit\n");
});

test("does not create a missing trigger quick fix when the diagnostic range is stale", () => {
  const source = `---
id: SCR-STALE
type: screen
title: Stale
---

# SCR-STALE Stale

## Actions

Not an action heading
`;
  const diagnostic = createDiagnostic(
    source,
    "Not an action heading",
    "Action A-Submit has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response."
  );

  assert.deepEqual(createMarkVSpecCodeActions(createTextDocument(source) as never, [diagnostic]), []);
});

test("creates a quick fix for bare Layout sections when a default viewport is known", () => {
  const source = `---
id: SCR-LAYOUT-FIX
type: screen
title: Layout Fix
---

# SCR-LAYOUT-FIX Layout Fix

## Layout: mobile

### L-Existing Existing

- stack

## Layout
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "## Layout",
    "Layout section must specify a viewport, for example ## Layout: mobile."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Change to ## Layout: mobile");
  assert.equal(edits.edits[0]?.kind, "replace");
  assert.equal(edits.edits[0]?.newText, "## Layout: mobile");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 14, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 14, character: 9 });
});

test("does not create a Layout viewport quick fix without a known default viewport", () => {
  const source = `---
id: SCR-LAYOUT-NO-FIX
type: screen
title: Layout No Fix
---

# SCR-LAYOUT-NO-FIX Layout No Fix

## Layout
`;
  const diagnostic = createDiagnostic(
    source,
    "## Layout",
    "Layout section must specify a viewport, for example ## Layout: mobile."
  );

  assert.deepEqual(createMarkVSpecCodeActions(createTextDocument(source) as never, [diagnostic]), []);
});

test("creates a quick fix to move direct layout child references under Items", () => {
  const source = `---
id: SCR-ITEM-FIX
type: screen
title: Item Fix
---

# SCR-ITEM-FIX Item Fix

## Layout: mobile

### L-Page Page

- stack
- E-Title
- gap: md

## Elements

### E-Title Heading

- value: Title
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Title",
    "Layout L-Page uses a direct child reference; place E-Title under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Move E-Title under #### Items");
  assert.equal(edits.edits[0]?.kind, "delete");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 13, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 14, character: 0 });
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.deepEqual(edits.edits[1]?.uri, (document as { uri: unknown }).uri);
  assert.equal(edits.edits[1]?.position?.line, 16);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "\n#### Items\n\n- E-Title\n");
});

test("moves direct layout child references before existing Items without merging lines", () => {
  const source = `---
id: SCR-ITEM-FIX-EXISTING
type: screen
title: Item Fix Existing
---

# SCR-ITEM-FIX-EXISTING Item Fix Existing

## Layout: mobile

### L-Page Page

- stack
- E-Moved

#### Items
- E-Existing

## Elements

### E-Moved Heading

- value: Moved

### E-Existing Heading

- value: Existing
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Moved",
    "Layout L-Page uses a direct child reference; place E-Moved under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.equal(edits.edits[1]?.position?.line, 16);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "- E-Moved\n");
});

test("removes direct layout child references at end of file", () => {
  const source = `---
id: SCR-ITEM-FIX-EOF
type: screen
title: Item Fix EOF
---

# SCR-ITEM-FIX-EOF Item Fix EOF

## Layout: mobile

### L-Page Page

- stack
- E-Title`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Title",
    "Layout L-Page uses a direct child reference; place E-Title under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number } }> };

  assert.equal(actions.length, 1);
  assert.equal(edits.edits[0]?.kind, "delete");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 13, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 13, character: 9 });
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.equal(edits.edits[1]?.position?.line, 14);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "\n#### Items\n\n- E-Title\n");
});
