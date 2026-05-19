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

function iconPattern(name: string): RegExp {
  return new RegExp(`<svg class="mm-icon mm-icon-${name}" aria-hidden="true" viewBox="0 0 24 24">[\\s\\S]*?</svg>`);
}

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

test("renders static controlled panel rows only for active state view panels", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-CONTROLLED-PANELS
type: screen
title: Static Controlled Panels
---

# SCR-STATIC-CONTROLLED-PANELS Static Controlled Panels

## States

- profile-tab*
- billing-tab

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- E-SettingsTabs

### L2:L-ProfilePanel Profile panel

- stack

#### Items

- E-ProfileHeading

### L3:L-BillingPanel Billing panel

- stack

#### Items

- E-BillingHeading

## Elements

### 1:E-SettingsTabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile-tab
  - Billing
    - panel: L-BillingPanel
    - active when: billing-tab

### E-ProfileHeading Heading

- sample: Profile

### E-BillingHeading Heading

- sample: Billing
`);
  const html = renderStaticDesignDocumentHtml(result);
  const profileSection = html.match(/<section class="doc-section state-screen-section"(?=[^>]*\bdata-state="profile-tab")[\s\S]*?(?=<section class="doc-section state-screen-section"|$)/)?.[0] ?? "";
  const billingSection = html.match(/<section class="doc-section state-screen-section"(?=[^>]*\bdata-state="billing-tab")[\s\S]*?(?=<section class="doc-section state-screen-section"|$)/)?.[0] ?? "";
  const profileRows = profileSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const billingRows = billingSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const profilePanelRow = profileRows.find((row) => row.includes(`data-mm-ref-id="L-ProfilePanel"`)) ?? "";
  const billingPanelRow = billingRows.find((row) => row.includes(`data-mm-ref-id="L-BillingPanel"`)) ?? "";

  assert.match(profilePanelRow, /<div class="mm-controlled-panel-via">\(via: <a class="mm-ref-chip mm-ref-chip-element"[^>]*data-mm-ref-id="E-SettingsTabs"[\s\S]*?<span class="mm-detail-ref-id">E-SettingsTabs<\/span><\/a>\)<\/div>/);
  assert.match(billingPanelRow, /<div class="mm-controlled-panel-via">\(via: <a class="mm-ref-chip mm-ref-chip-element"[^>]*data-mm-ref-id="E-SettingsTabs"[\s\S]*?<span class="mm-detail-ref-id">E-SettingsTabs<\/span><\/a>\)<\/div>/);
  assert.doesNotMatch(profileSection, /mm-controlled-panel-badge|controlled by|inactive in this state|data-mm-ref-id="L-BillingPanel"|data-mm-ref-id="E-BillingHeading"/);
  assert.doesNotMatch(billingSection, /mm-controlled-panel-badge|controlled by|inactive in this state|data-mm-ref-id="L-ProfilePanel"|data-mm-ref-id="E-ProfileHeading"/);
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

test("renders static Layouts table with combined Setting/Items column", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-LAYOUT-COLUMNS
type: screen
title: Static Layout Columns
locale: en
---

# SCR-STATIC-LAYOUT-COLUMNS Static Layout Columns

## States

- idle*

## Layout: desktop

### L1:L-Page Page

- row
- align: center
- gap: md
- visible when: idle

Layout note.

#### Items

- "Title": E-Title
- L-Child
- slot: content

### L2:L-SettingsOnly Settings Only

- stack
- gap: sm

### L3:L-ItemsOnly Items Only

- stack

#### Items

- E-Title

### L4:L-Empty Empty

- stack

## Elements

### E-Title Text

- value: Title
`);
  const html = renderStaticDesignDocumentHtml(result);
  const layouts = html.match(/<h5 class="state-screen-subheading">Layouts<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(layouts, /<th>Marker\/ID<\/th><th>Kind<\/th><th>Setting\/Items<\/th><th>Condition<\/th><th>Notes<\/th>/);
  assert.doesNotMatch(layouts, /<th>Settings<\/th>|<th>Conditions<\/th>|<th>Items<\/th>/);
  assert.match(layouts, /<strong>Setting<\/strong><ul class="spec-list"><li>align: center<\/li><li>gap: md<\/li><\/ul>/);
  assert.match(layouts, /<strong>Items<\/strong><ul class="spec-list"><li>Title: <a class="mm-ref-chip mm-ref-chip-element"[^>]*data-mm-ref-id="E-Title"[\s\S]*<\/a><\/li><li><code>L-Child<\/code><\/li><li>slot: content<\/li><\/ul>/);
  assert.match(layouts, /<td><span class="spec-default-always">always<\/span><\/td>/);
  assert.match(layouts, /<td><p>Layout note\.<\/p><\/td>/);
  assert.match(layouts, /<strong>Setting<\/strong><ul class="spec-list"><li>gap: sm<\/li><\/ul>/);
  assert.match(layouts, /<strong>Items<\/strong><ul class="spec-list"><li><a class="mm-ref-chip mm-ref-chip-element"[^>]*data-mm-ref-id="E-Title"/);
  assert.match(layouts, /data-mm-ref-id="L-Empty"[\s\S]*<td>stack<\/td><td>-<\/td><td><span class="spec-default-always">always<\/span><\/td><td>-<\/td>/);
});

test("localizes static Layouts table columns and empty conditions", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-LAYOUT-JA
type: screen
title: Static Layout JA
locale: ja
---

# SCR-STATIC-LAYOUT-JA Static Layout JA

## States

- idle*

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`);
  const html = renderStaticDesignDocumentHtml(result);
  const layouts = html.match(/<h5 class="state-screen-subheading">レイアウト<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(layouts, /<th>番号\/ID<\/th><th>種別<\/th><th>設定\/項目<\/th><th>条件<\/th><th>備考<\/th>/);
  assert.match(layouts, /<strong>項目<\/strong>/);
  assert.match(layouts, /<span class="spec-default-always">常に<\/span>/);
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
  - Product: \${model.subscriptions.product}
  - Seats: \${model.subscriptions.seats}
- sample rows:
  - row:
    - product: Workspace
    - seats: 8
- visible when: loaded

## Preview Scenarios

### loaded

- samples:
  - E-SeatCount: 10 seats
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Baseline workspace
        - seats: 10

### loaded-renewal-risk

- state: loaded
- samples:
  - E-SeatCount: 12 seats
  - E-SubscriptionTable:
    - rows:
      - row:
        - product: Workspace
        - seats: 8
        - renewal: 2026-06-30
      - row:
        - product: Analytics
        - seats: 4
        - renewal: 2026-07-15

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
  assert.doesNotMatch(html, /data-state-view-title="loaded \/ loaded"/);
  assert.match(baselineLoaded, /10 seats/);
  assert.match(baselineLoaded, /<td>Baseline workspace<\/td><td>10<\/td>/);
  assert.match(baselineLoaded, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
  assert.match(loadedScenario, /<span class="state-badge">loaded-renewal-risk<\/span>/);
  assert.match(loadedScenario, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
  assert.match(loadedScenario, /E-SubscriptionTable/);
  assert.match(loadedScenario, /<code>rows: 2 rows<\/code>/);
  assert.match(loadedScenario, /<section class="scenario-sample-rows-block" id="sample-rows-desktop-loaded.20.2F.20loaded-renewal-risk-E-SubscriptionTable">/);
  assert.match(loadedScenario, /<h6 class="scenario-sample-rows-heading">Sample Rows: [\s\S]*E-SubscriptionTable/);
  assert.match(loadedScenario, /<table class="spec-table scenario-sample-rows-table">/);
  assert.match(loadedScenario, /<th>Product<\/th><th>Seats<\/th><th>renewal<\/th>/);
  assert.match(loadedScenario, /<td>Workspace<\/td><td>8<\/td><td>2026-06-30<\/td>/);
  assert.match(loadedScenario, /<td>Analytics<\/td><td>4<\/td><td>2026-07-15<\/td>/);
  assert.match(loadedScenario, /<td>table rows<\/td><td>Sample rows: <a class="mm-ref-chip mm-ref-chip-element" href="#sample-rows-desktop-loaded.20.2F.20loaded-renewal-risk-E-SubscriptionTable"[^>]*data-mm-ref-id="E-SubscriptionTable"[\s\S]*?mm-icon-table[\s\S]*?<\/a><\/td><td>-<\/td><td><span class="mm-chip mm-source-chip mm-source-chip-data">[\s\S]*?data<\/span><\/td>/);
  assert.doesNotMatch(loadedScenario, /<td>table rows<\/td><td>see wireframe<\/td>/);
  assert(loadedScenario.indexOf('<section class="scenario-sample-rows-block"') > loadedScenario.indexOf("</table></div>"));
  assert.match(emptyScenario, /0 seats/);
  assert.match(emptyScenario, /<code>rows: \[\]<\/code>/);
  assert.match(emptyScenario, /<section class="scenario-sample-rows-block" id="sample-rows-desktop-loaded.20.2F.20loaded-empty-account-E-SubscriptionTable">/);
  assert.match(emptyScenario, /<td class="mm-table-empty" colspan="2">\(no data\)<\/td>/);
});

test("renders preview scenario route samples in static state views", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-ROUTE-SAMPLES
type: screen
title: Static Route Samples
route: /members/:memberId
---

# SCR-STATIC-ROUTE-SAMPLES Static Route Samples

## States

- loaded*

## Layout: desktop

### L-Page Page

#### Items

- E-MemberId

## Elements

### E-MemberId Text

- label: Member ID
- value: \${route.memberId}
  - kind: route
  - source: \${route.memberId}

## Preview Scenarios

### loaded

- route:
  - memberId: M-200
`);
  const html = renderStaticDesignDocumentHtml(result);
  const loaded = stateViewSection(html, "loaded");

  assert.match(loaded, /M-200/);
  assert.match(loaded, /<strong>Route Parameters<\/strong>/);
  assert.match(loaded, /<td>memberId<\/td><td>M-200<\/td>/);
  assert.match(loaded, /<div class="spec-section"><strong>Value<\/strong><ul class="spec-list"><li>M-200<\/li><\/ul><\/div>/);
  assert.match(loaded, /<strong>Source<\/strong><ul class="spec-list"><li><span class="mm-inline-token">\${route.memberId}<\/span><\/li><\/ul>/);
});

test("renders lifecycle origin chains in static state transitions", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-TRANSITIONS
type: screen
title: Static Transitions
---

# SCR-STATIC-TRANSITIONS Static Transitions

## States

- before-load+
- initializing*
- loaded
- initialize-error

## Events

- page.load: A-LoadAccount
- page.load: A-PrimeTelemetry

## Actions

### A1:A-LoadAccount Load account

- From
  - before-load
- Process P1: Send request
  - request:
    - method: GET
    - path: /account
  - case: sent
    - response: account request sent
    - Effects
      - state: initializing

### A2:A-PrimeTelemetry Prime telemetry

- From
  - before-load
- Process: Immediate
  - Effects
    - state: initializing
    - display: E-TelemetryStatus = ready

### A3:A-HandleAccountResponse Handle account response

- From
  - initializing
- Process P1: Apply response
  - receive:
    - response: A-LoadAccount.P1.response
  - case: success
    - response: 200
    - Effects
      - state: loaded
  - case: failure
    - response: 500
    - Effects
      - state: initialize-error
`);
  const html = renderStaticDesignDocumentHtml(result);
  const loadAction = result.actions.find((action) => action.id === "A-LoadAccount");
  const telemetryAction = result.actions.find((action) => action.id === "A-PrimeTelemetry");
  const responseAction = result.actions.find((action) => action.id === "A-HandleAccountResponse");

  assert.deepEqual(loadAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["before-load", "sent", "initializing"]
  ]);
  assert.deepEqual(telemetryAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["before-load", undefined, "initializing"]
  ]);
  assert.deepEqual(responseAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["initializing", "success", "loaded"],
    ["initializing", "failure", "initialize-error"]
  ]);
  assert.match(html, /<h2>State Flow<\/h2>/);
  assert.doesNotMatch(html, /\[\*\] --&gt;/);
  assert.match(html, /<h2>State Transitions<\/h2>/);
  assert.match(html, /<td><code class="mm-doc-label mm-doc-label-state">before-load<\/code><\/td><td><code class="mm-doc-label mm-doc-label-state">initializing<\/code><\/td><td><code class="mm-doc-label mm-doc-label-result">sent<\/code><\/td><td><a class="mm-ref-chip mm-ref-chip-action" href="#state-views" data-mm-ref-id="A-LoadAccount"><code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1<\/code> Load account<\/a><div class="mm-ref-chip-note">page\.load<\/div><\/td>/);
  assert.match(html, /<td><code class="mm-doc-label mm-doc-label-state">before-load<\/code><\/td><td><code class="mm-doc-label mm-doc-label-state">initializing<\/code><\/td><td>-<\/td><td><a class="mm-ref-chip mm-ref-chip-action" href="#state-views" data-mm-ref-id="A-PrimeTelemetry"><code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A2<\/code> Prime telemetry<\/a><div class="mm-ref-chip-note">page\.load<\/div><\/td>/);
  assert.doesNotMatch(html, /\(\*\)/);
  assert.doesNotMatch(html, /id="state-view-before-load"/);
  assert.match(html, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.success/);
  assert.match(html, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.failure/);
  assert.doesNotMatch(html, /A-LoadAccount\.transitions/);
});

test("renders selected process kind icons in static action details", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-PROCESS-ICONS
type: screen
title: Static Process Icons
---

# SCR-STATIC-PROCESS-ICONS Static Process Icons

## States

- idle*
- loaded

## Elements

### E-Run Button

- label: Run

### E-Status Text

- value: Ready

## Actions

### A-Run Run

- Triggered
  - E-Run.click
- From
  - idle
- Process P1: Check validation
  - validation: V-Email.result
- Process P2: HttpRequest
  - request:
    - method: GET
    - path: /account
- Process P3: ServerCall
  - call: AccountService.load()
- Process P4: Receive response
  - receive:
    - response: A-Run.P2.response
- Process P5: Show display
  - display: E-Status = Loaded
- Process P6: Navigate away
  - navigate: SCR-NEXT
- Process P7: Set loaded
  - state: loaded
- Process P8: Failure handler
- Process: ServerCall
  - group: initial-load
  - ProfileService.load()
  - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - Effects
      - state: loaded
    - stop
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /<h2>Action Details<\/h2>/);
  for (const name of ["square-check-big", "unplug", "cog", "satellite-dish", "panels-top-left", "waypoints", "refresh-cw", "circle-x", "split", "merge"]) {
    assert.match(html, iconPattern(name), name);
  }
});

test("renders property-level display metadata in static display content spec", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-DISPLAY-METADATA
type: screen
title: Static Display Metadata
---

# SCR-STATIC-DISPLAY-METADATA Static Display Metadata

## States

- loaded*

## Elements

### 1:E-PublishedAt Text

- value: 2026/05/01
  - kind: data
  - source: ${"${data.notice.publishedAt}"}
  - format: date yyyy/MM/dd
- label: Published
  - kind: i18n

### 2:E-Avatar Image

- src: /assets/avatar.png
  - kind: asset
  - source: asset catalog: member-avatar
- alt: Current member avatar
  - kind: i18n

### 3:E-StatusLink Link

- href: https://status.example.com
  - kind: external
  - source: external status URL

### 4:E-Total Text

- value: USD 128.40
  - kind: computed
  - source: ${"${data.invoice.subtotalCents}"} formatted as currency
  - format: currency USD

### 5:E-RoleSelect Select

- value: member
  - kind: data
  - source: ${"${data.member.role}"}
- options:
  - Member
    - kind: i18n
  - Administrator
    - kind: i18n
    - source: copy.roles.admin
  - System role
    - kind: data
    - source: ${"${data.role}"}

### 6:E-UsersTable Table

- source: data
- Columns:
  - name: Name
    sortable: true
  - Email: ${"${model.users.email}"}
`);
  const html = renderStaticDesignDocumentHtml(result);
  const loadedSection = stateViewSection(html, "loaded");
  const displayContent = loadedSection.match(/<div class="element-detail-group">\s*<h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, /<th>Marker\/ID<\/th><th>Location<\/th><th>Content<\/th><th>Format<\/th><th>Source<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(displayContent, /<th>Enabled When<\/th>/);
  for (const kind of ["i18n", "data", "asset", "external", "computed"]) {
    assert.match(displayContent, new RegExp(`mm-source-chip-${kind}`), kind);
  }
  assert.match(displayContent, /<strong>Value<\/strong>/);
  assert.match(displayContent, /<strong>Source<\/strong>/);
  assert.match(displayContent, /<span class="mm-inline-token">\$\{data\.notice\.publishedAt\}<\/span>/);
  assert.match(displayContent, /asset catalog: member-avatar/);
  assert.match(displayContent, /external status URL/);
  assert.match(displayContent, /currency USD/);
  assert.match(displayContent, /options[\s\S]*<strong>Options<\/strong>[\s\S]*Member \(i18n\)[\s\S]*Administrator \(i18n; copy\.roles\.admin\)[\s\S]*System role \(data; <span class="mm-inline-token">\$\{data\.role\}<\/span>\)/);
  assert.match(displayContent, /options[\s\S]*<td>-<\/td><td><code>mixed<\/code><\/td>/);
  assert.match(displayContent, /columns[\s\S]*<strong>Columns<\/strong>[\s\S]*Name \(field: name; sortable: true\)[\s\S]*Email \(field: <span class="mm-inline-token">\$\{model\.users\.email\}<\/span>\)/);
  assert.doesNotMatch(displayContent, /<td>column<\/td>/);
  assert.doesNotMatch(displayContent, /option label/);
});

test("renders static input form value and source as separate columns", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-INPUT-SOURCE
type: screen
title: Static Input Source
---

# SCR-STATIC-INPUT-SOURCE Static Input Source

## States

- loaded*

## Layout

### L-Page Page

- stack

#### Items

- E-EmailInput
- E-RoleSelect

## Elements

### E-EmailInput Input

- value: morgan@example.com
  - kind: data
- type: email

### E-RoleSelect Select

- value: member
  - kind: data
  - source: ${"${data.member.role}"}
- options:
  - Member
  - Administrator

## Preview Scenarios

### loaded-override

- state: loaded
- samples:
  - E-EmailInput: taylor@example.com
  - E-RoleSelect: administrator
`);
  const html = renderStaticDesignDocumentHtml(result);

  assert.match(html, /<th>Marker\/ID<\/th><th>Type<\/th><th>Required<\/th><th>Value<\/th><th>Source<\/th><th>Spec<\/th><th>Condition<\/th>/);
  assert.match(html, /<td><a class="mm-ref-chip mm-ref-chip-element" href="#state-views" data-mm-ref-id="E-EmailInput"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">E-EmailInput<\/code><\/a><\/td><td>Input<\/td><td>no<\/td><td>morgan@example\.com<\/td><td><span class="mm-chip mm-source-chip mm-source-chip-data">[\s\S]*?data<\/span><\/td><td><div class="spec-section"><strong>Input<\/strong><ul class="spec-list"><li>type: email<\/li><\/ul><\/div><\/td><td><span class="spec-default-always">always<\/span><\/td>/);
  assert.match(html, /<td><a class="mm-ref-chip mm-ref-chip-element" href="#state-views" data-mm-ref-id="E-RoleSelect"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">E-RoleSelect<\/code><\/a><\/td><td>Select<\/td><td>no<\/td><td>member<\/td><td><span class="mm-chip mm-source-chip mm-source-chip-data">[\s\S]*?data<\/span><br><span class="mm-inline-token">\$\{data.member.role\}<\/span><\/td>/);
  assert.match(html, /<td>taylor@example.com<\/td><td><span class="mm-chip mm-source-chip mm-source-chip-data">[\s\S]*?data<\/span><\/td>/);
  assert.match(html, /<td>administrator<\/td><td><span class="mm-chip mm-source-chip mm-source-chip-data">[\s\S]*?data<\/span><br><span class="mm-inline-token">\$\{data.member.role\}<\/span><\/td>/);
});

test("combines static input and display conditions into one condition column", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-CONDITION-COLUMNS
type: screen
title: Static Condition Columns
---

# SCR-STATIC-CONDITION-COLUMNS Static Condition Columns

## States

- idle*

## Layout

### L-Page Page

- stack

#### Items

- E-NameInput
- E-SaveButton

## Elements

### E-NameInput Input

- value: ${"${model.name}"}
- visible when: idle
- disabled when: ${"${model.saving}"}

### E-SaveButton Button

- label: Save
- visible when: idle
- disabled when: ${"${model.saving}"}
`);
  const html = renderStaticDesignDocumentHtml(result);
  const loadedSection = stateViewSection(html, "idle");
  const inputForm = loadedSection.match(/<div class="element-detail-group">\s*<h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = loadedSection.match(/<div class="element-detail-group">\s*<h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(inputForm, /<th>Marker\/ID<\/th><th>Type<\/th><th>Required<\/th><th>Value<\/th><th>Source<\/th><th>Spec<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(inputForm, /<th>Enabled When<\/th>/);
  assert.match(inputForm, /<strong>Visible<\/strong><ul class="spec-list"><li>visible: idle<\/li><\/ul>/);
  assert.match(inputForm, /<strong>Enabled<\/strong><ul class="spec-list"><li>not <span class="mm-inline-token">\$\{model\.saving\}<\/span><\/li><\/ul>/);
  assert.match(displayContent, /<th>Marker\/ID<\/th><th>Location<\/th><th>Content<\/th><th>Format<\/th><th>Source<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(displayContent, /<th>Enabled When<\/th>/);
  assert.match(displayContent, /<strong>Visible<\/strong><ul class="spec-list"><li>visible: idle<\/li><\/ul>/);
  assert.match(displayContent, /<strong>Enabled<\/strong><ul class="spec-list"><li>not <span class="mm-inline-token">\$\{model\.saving\}<\/span><\/li><\/ul>/);
});

test("renders static select initial value from matching option labels", () => {
  const result = parseMarkVSpec(`---
id: SCR-STATIC-SELECT
type: screen
title: Static Select
---

# SCR-STATIC-SELECT Static Select

## States

- idle*

## Layout: mobile

### L-Form Form

- stack

#### Items

- E-LanguageSelect

## Elements

### E-LanguageSelect Select

- initial value: English
- options:
  - English
  - Japanese
`);
  const html = renderStaticDesignDocumentHtml(result);
  const idleSection = stateViewSection(html, "idle");
  const inputForm = idleSection.match(/<div class="element-detail-group">\s*<h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.deepEqual(result.diagnostics, []);
  assert.match(idleSection, /<select class="mm-element mm-element-select" data-mm-id="E-LanguageSelect">/);
  assert.match(idleSection, /<option value="English" selected>English<\/option>/);
  assert.match(inputForm, /E-LanguageSelect[\s\S]*<td>English<\/td>/);
  assert.doesNotMatch(idleSection, /<option value="en" selected>en<\/option>/);
});

test("renders wide scenario rows as independent readable blocks", () => {
  const columns = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    return `  - Column ${number}: \${model.wide.c${number}}`;
  }).join("\n");
  const rowFields = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    return `        - c${number}: value-${number}`;
  }).join("\n");
  const result = parseMarkVSpec(`---
id: SCR-WIDE-SCENARIO-ROWS
type: screen
title: Wide Scenario Rows
---

# SCR-WIDE-SCENARIO-ROWS Wide Scenario Rows

## States

- loaded*

## Layout: desktop

### L-Page Page

#### Items

- E-WideTable

## Elements

### E-WideTable Table

- marker: 6
- source: data
- Columns:
${columns}

## Preview Scenarios

### loaded-wide

- state: loaded
- samples:
  - E-WideTable:
    - rows:
      - row:
${rowFields}
`);
  const html = renderStaticDesignDocumentHtml(result);
  const scenarioSection = stateViewSection(html, "loaded / loaded-wide");

  assert.match(scenarioSection, /<code>rows: 1 rows<\/code>/);
  assert.match(scenarioSection, /<h6 class="scenario-sample-rows-heading">Sample Rows: [\s\S]*data-mm-ref-id="E-WideTable"[\s\S]*<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">6<\/code>/);
  assert(scenarioSection.indexOf('<section class="scenario-sample-rows-block"') > scenarioSection.indexOf("</table></div>"));
  for (let index = 1; index <= 10; index += 1) {
    assert.match(scenarioSection, new RegExp(`<th>Column ${index}</th>`));
    assert.match(scenarioSection, new RegExp(`<td>value-${index}</td>`));
  }
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
  assert.match(scenarioSection, /<code>rows: 2 行<\/code>/);
  assert.match(scenarioSection, /<h6 class="scenario-sample-rows-heading">サンプル 行数:/);
  assert.match(scenarioSection, /<table class="spec-table scenario-sample-rows-table">/);
  assert.match(scenarioSection, /<th>名前<\/th>/);
  assert.match(scenarioSection, /<td>一郎<\/td>/);
  assert.match(scenarioSection, /<td>二郎<\/td>/);
  assert.doesNotMatch(scenarioSection, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>|<th>Sample<\/th>/);
});

function stateViewSection(html: string, title: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state-view-title="${title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}")`, "u").exec(html);
  assert(startMatch, `Missing state view ${title}`);
  const start = startMatch.index;
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + startMatch[0].length);
  return html.slice(start, next === -1 ? undefined : next);
}
