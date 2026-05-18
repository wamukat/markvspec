import assert from "node:assert/strict";
import test from "node:test";
import { messagesForLocale, parseMarkVSpec } from "@markvspec/core";
import {
  baseWireframeViewportCss,
  printScrollbarSuppressCss,
  printSpecTableChipCss,
  printWireframeViewportCss,
  renderDesignDocumentSections,
  renderTable,
  renderTableWithCells,
  renderStaticDesignDocumentHtml,
  standardPrintPolicyCss,
  viewportCanvasWidth,
  viewportPrintScale,
  viewportPrintStyle,
  wireframePrintSectionCss
} from "./index.js";

test("resolves shared viewport canvas widths and print scale", () => {
  assert.equal(viewportCanvasWidth("mobile"), "390px");
  assert.equal(viewportCanvasWidth("tablet"), "768px");
  assert.equal(viewportCanvasWidth("desktop"), "960px");
  assert.equal(viewportCanvasWidth("unknown"), "760px");
  assert.equal(viewportPrintScale("desktop"), "1");
  assert.equal(viewportPrintStyle("desktop"), "--markvspec-viewport-width:960px;--markvspec-print-scale:1");
});

test("renders shared wireframe print selectors for compact and static HTML CSS", () => {
  assert.match(baseWireframeViewportCss(), /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none/);
  assert.match(baseWireframeViewportCss({ spaced: true }), /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\) \{ max-width: none/);
  assert.match(wireframePrintSectionCss(), /\.wireframe-print-section\{box-sizing:border-box;max-width:100%;width:100%\}/);
  assert.match(printWireframeViewportCss(), /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe/);
  assert.match(printWireframeViewportCss({ includeMinWidth: true }), /min-width:0!important/);
  assert.match(printWireframeViewportCss({ importantZoom: true, spaced: true }), /zoom: var\(--markvspec-print-scale, 1\) !important/);
  assert.match(standardPrintPolicyCss(), /\.toc-inline\{break-after:page;break-inside:avoid;page-break-after:always;page-break-inside:avoid\}/);
  assert.match(standardPrintPolicyCss(), /\.history-section\{break-before:page;page-break-before:always\}/);
  assert.doesNotMatch(standardPrintPolicyCss(), /\.state-screen-section\{break-before:page/);
  assert.doesNotMatch(standardPrintPolicyCss(), /\.layout-spec-fragment, \.element-spec-fragment, \.action-spec-fragment\{break-before:page/);
  assert.match(standardPrintPolicyCss({ spaced: true }), /\.wireframe-print-section, \.action-detail, \.note-block, \.process-card \{ break-inside: avoid; page-break-inside: avoid; \}/);
  assert.doesNotMatch(standardPrintPolicyCss({ spaced: true }), /\.spec-table-wrap, \.spec-table \{ break-inside: avoid/);
  assert.match(standardPrintPolicyCss({ spaced: true }), /\.spec-table tr \{ break-inside: avoid; page-break-inside: avoid; \}/);
  assert.match(printSpecTableChipCss(), /\.spec-table col\.spec-table-col-marker-id\{width:20%\}/);
  assert.match(printSpecTableChipCss(), /\.spec-table col\.spec-table-col-id\{width:16%\}/);
  assert.match(printSpecTableChipCss(), /\.spec-table \.mm-ref-chip, \.spec-table \.mm-chip, \.spec-table \.mm-detail-ref-id, \.spec-table \.mm-id\{box-sizing:border-box;max-width:100%;min-width:0;overflow-wrap:break-word;white-space:normal;word-break:normal\}/);
  assert.match(printSpecTableChipCss(), /\.spec-table \.mm-ref-chip \.mm-id\{flex:0 0 auto;overflow-wrap:normal;white-space:nowrap;width:auto\}/);
  assert.match(printSpecTableChipCss(), /\.spec-table td > \.mm-ref-chip, \.spec-table td > \.mm-chip\{display:flex;margin:0 0 2pt;width:fit-content\}/);
  assert.match(printScrollbarSuppressCss(), /html,body,main,\.content,\.preview,\.document,\.spec-table-wrap,\.wireframe-section,\.mermaid-render,\.mermaid-source,\.note-content,\.entity-notes pre,\.entity-overview pre\{overflow:visible!important;scrollbar-width:none!important;-ms-overflow-style:none!important\}/);
  assert.match(printScrollbarSuppressCss(), /html::-webkit-scrollbar,body::-webkit-scrollbar,main::-webkit-scrollbar,\.content::-webkit-scrollbar,\.preview::-webkit-scrollbar,\.document::-webkit-scrollbar,\.spec-table-wrap::-webkit-scrollbar,\.wireframe-section::-webkit-scrollbar,\.mermaid-render::-webkit-scrollbar,\.mermaid-source::-webkit-scrollbar,\.note-content::-webkit-scrollbar,\.entity-notes pre::-webkit-scrollbar,\.entity-overview pre::-webkit-scrollbar\{display:none!important;height:0!important;width:0!important\}/);
  assert.match(printScrollbarSuppressCss({ spaced: true }), /html,\n\s+body,\n\s+main,\n\s+\.content,\n\s+\.preview,\n\s+\.document,\n\s+\.spec-table-wrap,/);
  assert.match(printScrollbarSuppressCss({ spaced: true }), /::-webkit-scrollbar \{ display: none !important; height: 0 !important; width: 0 !important; \}/);
});

test("renders unspecified table cells as dashes while preserving concrete falsy text", () => {
  const html = renderTable(["Unset", "Blank", "Whitespace", "False", "Zero"], [[undefined, "", "   ", "false", "0"]]);

  assert.match(html, /<td>-<\/td><td>-<\/td><td>-<\/td><td>false<\/td><td>0<\/td>/);
});

test("renders semantic spec table columns for marker and id tables", () => {
  const markerTable = renderTable(["Marker/ID", "Type", "Condition"], [["E1", "Input", "always"]]);
  const idTable = renderTable(["ID", "Name", "Target"], [["ERR-001", "Error", "E-Input.error"]]);
  const plainTable = renderTable(["Field", "Value"], [["title", "Profile"]]);

  assert.match(markerTable, /<colgroup><col class="spec-table-col spec-table-col-marker-id"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><\/colgroup>/);
  assert.match(idTable, /<colgroup><col class="spec-table-col spec-table-col-id"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><\/colgroup>/);
  assert.doesNotMatch(plainTable, /<colgroup>/);

  const localizedMarkerTable = renderTableWithCells(["番号/ID", "種別"], [["E1", "Input"]]);
  assert.match(localizedMarkerTable, /<colgroup><col class="spec-table-col spec-table-col-marker-id"><col class="spec-table-col spec-table-col-default"><\/colgroup>/);
});

test("renders empty state placeholders in static state previews", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-EMPTY
type: screen
title: Static Empty
locale: ja
---

# SCR-STATIC-EMPTY Static Empty

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
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /class="mm-wireframe mm-wireframe-empty"/);
  assert.match(html, /表示される要素はありません/);
  assert.match(html, /data-state="loaded" data-viewport="desktop"/);
  assert.match(html, /data-mm-id="L-Loaded"/);
});

test("renders reusable design document sections and static state previews", () => {
  assert.equal(renderDesignDocumentSections(["<section>A</section>", ""]), `<article class="document">
    <section>A</section>
  </article>`);

  const result = parseMarkVSpec(`---
id: SCR-STATIC
type: screen
title: Static
---

# SCR-STATIC Static

Static screen overview.

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Title

## Elements

### 1:E-Title Heading

- sample: Hello

## History Fields

- ticket
  label: Ticket
  required: false
  type: string

## History

### ver 1.0

- date: 2026-05-13
- author: Alice
- ticket: MM-1

Initial \`static\` release.

- Added export history.
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /<article class="document">/);
  assert.match(html, /<section class="doc-section screen-spec-section"><h2 id="screen">Screen<\/h2>/);
  assert.match(html, /<div class="screen-description"><p>Static screen overview\.<\/p><\/div>/);
  assert.match(html, /<th>Field<\/th><th>Value<\/th>/);
  assert.match(html, /<td>ID<\/td><td>SCR-STATIC<\/td>/);
  assert.match(html, /<td>Version<\/td><td>ver 1\.0<\/td>/);
  assert.match(html, /<td>Date<\/td><td>2026-05-13<\/td>/);
  assert.match(html, /<td>Author<\/td><td>Alice<\/td>/);
  assert.match(html, /<section class="doc-section history-section"><h2>History<\/h2>/);
  assert.match(html, /<th>Version<\/th><th>Date<\/th><th>Author<\/th><th>Reviewer<\/th><th>Reason<\/th><th>Ticket<\/th><th>Changes<\/th>/);
  assert.match(html, /<td>ver 1\.0<\/td><td>2026-05-13<\/td><td>Alice<\/td><td>-<\/td><td>-<\/td><td>MM-1<\/td>/);
  assert.match(html, /Initial <span class="mm-inline-token">static<\/span> release\./);
  assert.match(html, /<li>Added export history\.<\/li>/);
  assert.match(html, /<section class="doc-section state-views-section">\s*<h2 id="state-views">State Views<\/h2>/);
  assert.match(html, /<section class="state-viewport-section" data-viewport="mobile">\s*<h3>Viewport mobile <span class="state-badge">Default<\/span><\/h3>/);
  assert.match(html, /<section class="doc-section state-screen-section"(?=[^>]*\bdata-state="idle")(?=[^>]*\bdata-viewport="mobile")(?=[^>]*\bstyle="--markvspec-viewport-width:390px;--markvspec-print-scale:1")/);
  assert.match(html, /<h4 class="state-screen-heading">State: idle initial<\/h4>/);
  assert.match(html, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
});

test("renders MarkVSpec entity references in static markdown prose", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-ENTITY-REFS
type: screen
title: Static Entity Refs
---

See #{R-Eligibility}, #{E-NameInput}, \`#{R-Code}\`, \`\`#{E-Code}\`\`, and \`\`literal \` #{R-ShortRun}\`\`.

\`\`\`
#{R-Fenced}
\`\`\`

## States

- idle*

## Layout: desktop

### L-Form Form

- stack

#### Items

- E-NameInput

## Elements

### E-NameInput Input

- marker: E1
- label: Name

## Business Rules

### R-Eligibility Eligibility

- marker: R1
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-message" href="#state-views"[^>]*data-mm-ref-id="R-Eligibility"[^>]*>[\s\S]*>R1<\/code> Eligibility<\/a>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-element" href="#state-views"[^>]*data-mm-ref-id="E-NameInput"[^>]*>[\s\S]*>E1<\/code> Name<\/a>/);
  assert.match(html, /<span class="mm-inline-token">#\{R-Code\}<\/span>/);
  assert.match(html, /<span class="mm-inline-token">#\{E-Code\}<\/span>/);
  assert.match(html, /<span class="mm-inline-token">literal ` #\{R-ShortRun\}<\/span>/);
  assert.match(html, /<pre><code>#\{R-Fenced\}<\/code><\/pre>/);
});

test("omits standalone HTML comments from static screen descriptions", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-COMMENT
type: screen
title: Static Comment
---

# SCR-STATIC-COMMENT Static Comment

Visible description before.

<!-- hidden one-line comment -->

<!--
hidden multi-line comment
-->

Visible description after.

## States

- idle*
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.equal(result.screen.description, "Visible description before.\n\nVisible description after.");
  assert.match(html, /Visible description before/);
  assert.match(html, /Visible description after/);
  assert.doesNotMatch(html, /hidden one-line comment|hidden multi-line comment/);
});

test("renders static design document labels from renderer messages", () => {
  const result = parseMarkVSpec(`---
id: SCR-MESSAGES
type: screen
title: Messages
---

# SCR-MESSAGES Messages

## States

- idle*

## Elements

### E-Title Heading

- sample: Hello

`);
  const html = renderStaticDesignDocumentHtml(result, {
    messages: {
      ...messagesForLocale("en"),
      default: "Base",
      initial: "start",
      view: "View",
      wireframe: "Canvas"
    }
  });

  assert.match(html, /<h3>Base View<\/h3>/);
  assert.match(html, /<h4 class="state-screen-heading">State: idle start<\/h4>/);
  assert.match(html, /<h5 class="state-screen-subheading">Canvas<\/h5>/);
  assert.doesNotMatch(html, /<h2>Samples<\/h2>|Rows:|Sample Data|Count: 0/);
});

test("renders missing static table sample values as empty wireframe cells", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-SAMPLES
type: screen
title: Static Samples
---

# SCR-STATIC-SAMPLES Static Samples

## States

- loaded*

## Elements

### E-Members Table

- source: data
- Columns:
  - name: Name
  - role: Role
- sample rows:
  - row:
    - name: Jane
    - role:
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /<th>Name<\/th><th>Role<\/th>/);
  assert.match(html, /<td>Jane<\/td><td><\/td>/);
});

test("renders preview scenarios and scenario samples in static state views", () => {
  const result = parseMarkVSpec(`---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
---

# SCR-SCENARIO-SAMPLES Scenario Samples

## States

- loading*
- loaded
- load-error

## Layout: desktop

### L-Page Page

- stack

#### Items

- E-SeatCount
- E-SubscriptionTable

## Elements

### E-SeatCount Text

- source: data
- sample: 1 seat

### E-SubscriptionTable Table

- source: data
- Columns:
  - product: Product
  - seats: Seats
- sample rows:
  - row:
    - product: Workspace
    - seats: 8
- visible when: loaded

## Preview Scenarios

### loaded-renewal-risk

- state: loaded
- samples:
  - E-SeatCount: 12 seats
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Workspace
        - seats: 8
      - row:
        - product: Analytics
        - seats: 4

### loaded-empty-account

- state: loaded
- samples:
  - E-SeatCount: 0 seats
  - E-SubscriptionTable:
    - rows: []
`);
  const html = renderStaticDesignDocumentHtml(result);
  const baselineLoaded = stateViewSection(html, "loaded");
  const loadedScenario = stateViewSection(html, "loaded / loaded-renewal-risk");
  const emptyScenario = stateViewSection(html, "loaded / loaded-empty-account");

  assert.match(html, /data-state-view-title="loaded \/ loaded-renewal-risk"/);
  assert.match(html, /data-state-view-title="loaded \/ loaded-empty-account"/);
  assert.doesNotMatch(baselineLoaded, /Scenario Samples/);
  assert.match(loadedScenario, /<span class="state-badge">loaded-renewal-risk<\/span>/);
  assert.match(loadedScenario, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
  assert.match(loadedScenario, /E-SubscriptionTable/);
  assert.match(loadedScenario, /2 rows/);
  assert.match(emptyScenario, /0 seats/);
  assert.match(emptyScenario, /<code>rows: \[\]<\/code>/);
});

test("localizes scenario samples labels in static state views", () => {
  const result = parseMarkVSpec(`---
id: SCR-SCENARIO-SAMPLES-JA
type: screen
title: シナリオサンプル
locale: ja
---

# SCR-SCENARIO-SAMPLES-JA シナリオサンプル

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-Title
- E-Users

## Elements

### E-Title Text

- sample: 通常タイトル

### E-Users Table

- Columns:
  - name: 名前
- sample rows:
  - row:
    - name: 通常

## Preview Scenarios

### loaded-special

- state: loaded
- samples:
  - E-Title: 特別タイトル
  - E-Users:
    - rows:
      - row:
        - name: 一郎
      - row:
        - name: 二郎
`);
  const html = renderStaticDesignDocumentHtml(result);
  const scenarioSection = stateViewSection(html, "loaded / loaded-special");

  assert.match(scenarioSection, /<h6 class="state-screen-detail-heading">シナリオサンプル<\/h6>/);
  assert.match(scenarioSection, /<th>画面要素<\/th>/);
  assert.match(scenarioSection, /<th>サンプル<\/th>/);
  assert.match(scenarioSection, /2 行/);
  assert.doesNotMatch(scenarioSection, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>|<th>Sample<\/th>/);
  assert.doesNotMatch(scenarioSection, /2 rows/);
});

function stateViewSection(html: string, title: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state-view-title="${title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}")`, "u").exec(html);
  assert(startMatch, `Missing state view ${title}`);
  const start = startMatch.index;
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + startMatch[0].length);
  return html.slice(start, next === -1 ? undefined : next);
}
