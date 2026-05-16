import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildStateScreenReadModels,
  buildViewportStateScreenReadModels,
  parseMarkVSpec,
  renderMarkVSpecHtml,
  stateViewLayoutSignature,
  STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS
} from "@markvspec/core";
import { renderDesignDocumentHtml } from "./extension.js";
import { renderStateScreenReadModel, type StateViewsRenderContext } from "./state-views-renderer.js";

const extensionRoot = resolve(".");

function markerBadge(value: string, category: "layout" | "element" | "action", linked = category === "action", anchorValue = value): string {
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeRegExp(value)}</code>`;
  return linked ? `<a class="mm-marker-link" href="#action-detail-${escapeRegExp(encodeURIComponent(anchorValue))}">${badge}</a>` : badge;
}

function actionBadge(marker: string, actionId: string, linked = true): string {
  return markerBadge(marker, "action", linked, actionId);
}

function detailIdRef(id: string): string {
  return `<span class="mm-detail-ref-id">${escapeRegExp(id)}</span>`;
}

function repeatedBadge(label = "Repeated"): string {
  return `<span class="mm-chip mm-repeated-badge">${escapeRegExp(label)}</span>`;
}

function docLabel(value: string, kind: "state" | "trigger" | "result", extraClass = ""): string {
  const classes = ["mm-doc-label", `mm-doc-label-${kind}`, extraClass].filter(Boolean).join(" ");
  return `<code class="${escapeRegExp(classes)}">${escapeRegExp(value)}</code>`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceCodePattern(value: string): string {
  return inlineTokenPattern(value);
}

function inlineTokenPattern(value: string): string {
  return `<span class="mm-inline-token">${escapeRegExp(value)}</span>`;
}

function stateSection(html: string, state: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function viewportStateSection(html: string, state: string, viewport: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")(?=[^>]*\\bdata-viewport="${escapeRegExp(viewport)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${viewport}:${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function stateWireframeSection(section: string): string {
  const startMarker = `<section class="wireframe-section">`;
  const start = section.indexOf(startMarker);
  assert.notEqual(start, -1, "missing wireframe section");
  const nextH3 = section.indexOf("<h3>", start + startMarker.length);
  const nextH5 = section.indexOf('<h5 class="state-screen-subheading"', start + startMarker.length);
  const candidates = [nextH3, nextH5].filter((index) => index !== -1);
  const nextHeading = candidates.length > 0 ? Math.min(...candidates) : -1;
  return nextHeading === -1 ? section.slice(start) : section.slice(start, nextHeading);
}

function stateSectionContaining(html: string, state: string, text: string): string {
  const sectionPattern = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>[\\s\\S]*?(?=<section class="doc-section state-screen-section"|$)`, "gu");
  const sections = [...html.matchAll(sectionPattern)].map((match) => match[0]);
  const section = sections.find((candidate) => candidate.includes(text));
  assert(section, `missing state section ${state} containing ${text}`);
  return section;
}

test("keeps State Views prose lookup separate from spec fragment rendering", () => {
  const source = `---
id: SCR-STATE-VIEWS-PROSE
type: screen
title: State Views Prose
viewport: mobile
---

# SCR-STATE-VIEWS-PROSE State Views Prose

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Title

## Elements

Elements overview.

### E-Title Heading

- value: Title
`;
  const result = parseMarkVSpec(source);
  const model = buildStateScreenReadModels(result, result, "mobile", undefined, { label: (key) => key })[0];
  assert(model);
  let receivedOverview: string[] | undefined;
  const context: StateViewsRenderContext = {
    format: {
      label: (key) => key,
      text: (value) => value ?? "",
      escapeHtml: (value) => value,
      renderSectionNumber: (value) => value,
      renderStateLabel: (value) => value,
      renderTrigger: (value) => value ?? ""
    },
    prose: {
      sectionProseForKind: (kind) => result.sectionProse.filter((candidate) => candidate.kind === kind)
    },
    specFragments: {
      renderModelSamplesForState: () => "",
      renderLayoutSpecFragment: () => "",
      renderElementSpecFragment: (_heading, _content, sectionProse) => {
        receivedOverview = sectionProse.flatMap((candidate) => candidate.overview);
        return "<div data-test-element-fragment></div>";
      },
      renderActionSpecFragment: () => ""
    },
    specTables: {
      renderElementsTable: () => "<table></table>",
      renderLayoutsTable: () => "",
      renderActionsTable: () => "",
      renderRepeatedMarkerCell: (id) => id
    }
  };

  const html = renderStateScreenReadModel(result, context, model, "<div></div>");

  assert.deepEqual(receivedOverview, ["Elements overview."]);
  assert.match(html, /data-test-element-fragment/);
});

test("renders preview scenario display effects and scenario titles", () => {
  const source = `---
id: SCR-SCENARIO-DISPLAY
type: screen
title: Scenario Display
viewport: mobile
---
# SCR-SCENARIO-DISPLAY Scenario Display

## States

- idle*
- editing

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Status
- L-Message

### L-Message Message area

- stack

## Elements

### E-Status Banner

- sample: Editing normally.

### E-HelpText Text

- sample: Delivery cadence help text.

### E-StatusDraft Banner

- sample: Status replaced by scenario.

### E-StatusFinal Banner

- sample: Status replaced by later scenario case.

### E-ShowButton Button

- label: Show

## Actions

### A-ShowHelp Show help

- Triggered
  - E-ShowButton.click
- From
  - editing
- Process P1: Show help
  - case: help
    - Effects
      - display:
        - target: L-Message
        - element: E-HelpText

### A-ReplaceStatus Replace status

- Triggered
  - E-ShowButton.click
- From
  - editing
- Process P1: Replace status
  - case: changed
    - Effects
      - display:
        - target: E-Status
        - element: E-StatusDraft

### A-ReplaceStatusAgain Replace status again

- Triggered
  - E-ShowButton.click
- From
  - editing
- Process P1: Replace status again
  - case: changed
    - Effects
      - display:
        - target: E-Status
        - element: E-StatusFinal

## Preview Scenarios

### editing-help

- state: editing
- cases:
  - A-ShowHelp.P1.help

### editing-status

- state: editing
- cases:
  - A-ReplaceStatus.P1.changed
  - A-ReplaceStatusAgain.P1.changed
`;
  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, "mobile");
  const helpModel = models.find((model) => model.title === "editing-help");
  const statusModel = models.find((model) => model.title === "editing-status");
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const helpSection = stateSectionContaining(html, "editing", "editing-help");
  const statusSection = stateSectionContaining(html, "editing", "editing-status");
  const statusWireframe = stateWireframeSection(statusSection);

  assert.deepEqual(result.diagnostics, []);
  assert(helpModel?.renderedIds.elementIds.has("E-HelpText"));
  assert(statusModel?.renderedIds.elementIds.has("E-StatusFinal"));
  assert.match(helpSection, /<span class="state-badge">editing-help<\/span>/);
  assert.match(helpSection, /data-state-view-title="editing \/ editing-help"/);
  assert.match(helpSection, /Delivery cadence help text\./);
  assert.match(helpSection, /data-mm-display-preview="true"/);
  assert.match(statusSection, /<span class="state-badge">editing-status<\/span>/);
  assert.match(statusSection, /data-state-view-title="editing \/ editing-status"/);
  assert.doesNotMatch(statusWireframe, /Status replaced by scenario\./);
  assert.match(statusWireframe, /Status replaced by later scenario case\./);
  assert.match(statusSection, /data-mm-display-preview="true"/);
});

test("shows subsequent viewport initial state as current state with repeated rows", () => {
  const source = `---
id: SCR-RESPONSIVE-DIFF
type: screen
title: Responsive Diff
viewport: mobile
---

# SCR-RESPONSIVE-DIFF Responsive Diff

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- L-MobileOnly
- E-Title

### L9:L-MobileOnly Mobile Only

- stack
- gap: sm

#### Items

- E-Title

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- L-DesktopOnly
- E-Title

### L8:L-DesktopOnly Desktop Only

- stack
- gap: lg

#### Items

- E-DesktopOnly

## Elements

### E-Title Heading

- value: Title

### E-DesktopOnly Heading

- value: Desktop only
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const desktopSection = viewportStateSection(html, "idle", "desktop");

  assert.doesNotMatch(desktopSection, /<h5 class="state-screen-subheading">Layout Changes<\/h5>/);
  assert.match(desktopSection, /<h5 class="state-screen-subheading">Layouts<\/h5>/);
  assert.doesNotMatch(desktopSection, new RegExp(`<td>${markerBadge("L9", "layout")}</td><td>${detailIdRef("L-MobileOnly")}`));
  assert.match(desktopSection, new RegExp(`<td>${markerBadge("L8", "layout")}</td><td>${detailIdRef("L-DesktopOnly")}`));
  assert.match(desktopSection, new RegExp(`<td>${markerBadge("E-DesktopOnly", "element")}</td><td>${detailIdRef("E-DesktopOnly")}</td>`));
  assert.match(desktopSection, new RegExp(repeatedBadge()));
  assert.match(html, /mm-gap-sm/);
  assert.match(html, /mm-gap-lg/);
});

test("deduplicates repeated current state specs across viewports", () => {
  const source = `---
id: SCR-RESPONSIVE-STATE-DEDUP
type: screen
title: Responsive State Dedup
viewport: mobile
---

# SCR-RESPONSIVE-STATE-DEDUP Responsive State Dedup

## States

- init*
- idle

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-CommonInit
- E-CommonIdle

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- E-CommonInit
- E-CommonIdle
- E-DesktopInit
- E-DesktopIdle

## Elements

### E-CommonInit Text

- value: Common init
- visible when: init

### E-CommonIdle Text

- value: Common idle
- visible when: idle

### E-DesktopInit Text

- value: Desktop init
- visible when: init

### E-DesktopIdle Text

- value: Desktop idle
- visible when: idle

## Actions

### A1:A-Ready Ready

- From
  - init
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopInitSection = viewportStateSection(html, "init", "desktop");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");

  assert.doesNotMatch(mobileIdleSection, new RegExp(`<td>${markerBadge("E-CommonInit", "element")}</td><td>${detailIdRef("E-CommonInit")}</td>`));
  assert.match(mobileIdleSection, new RegExp(`<td>${markerBadge("E-CommonIdle", "element")}</td><td>${detailIdRef("E-CommonIdle")}</td>`));
  assert.match(desktopInitSection, new RegExp(`<td>${markerBadge("E-DesktopInit", "element")}</td><td>${detailIdRef("E-DesktopInit")}</td>`));
  assert.match(desktopInitSection, new RegExp(`<td>${markerBadge("E-CommonInit", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-CommonInit")}</td>`));
  assert.doesNotMatch(desktopInitSection, new RegExp(`<td>${markerBadge("E-CommonIdle", "element")}</td><td>${detailIdRef("E-CommonIdle")}</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${markerBadge("E-CommonInit", "element")}(?: ${repeatedBadge()})?</td><td>${detailIdRef("E-CommonInit")}</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${markerBadge("E-CommonIdle", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-CommonIdle")}</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${markerBadge("E-DesktopInit", "element")}</td><td>${detailIdRef("E-DesktopInit")}</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${markerBadge("E-DesktopIdle", "element")}</td><td>${detailIdRef("E-DesktopIdle")}</td>`));
  assert.match(stateWireframeSection(mobileIdleSection), />E-CommonIdle<\/code>/);
  assert.match(stateWireframeSection(desktopIdleSection), />E-CommonIdle<\/code>/);
  assert.match(stateWireframeSection(desktopIdleSection), />E-DesktopIdle<\/code>/);
  assert.match(stateWireframeSection(desktopIdleSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-element" data-mm-marker-category="element" data-mm-repeated-marker="true">E-CommonIdle<\/code>/);
  assert.doesNotMatch(desktopIdleSection, /data-repeated-layout-only-message/);
  assert.doesNotMatch(desktopIdleSection, /<h5 class="state-screen-subheading">Available Actions<\/h5>/);
});

test("deduplicates repeated current state specs across later states in the same viewport", () => {
  const source = `---
id: SCR-SAME-VIEWPORT-STATE-DEDUP
type: screen
title: Same Viewport State Dedup
viewport: mobile
---

# SCR-SAME-VIEWPORT-STATE-DEDUP Same Viewport State Dedup

## States

- idle*
- loading

## Layout: mobile

### L1:L-Page Page

- stack
- disabled when: loading

#### Items

- E-NameInput
- E-LoadingOnly

## Elements

### E-NameInput Input

- label: Name
- value: \${model.name}
- disabled when: loading

### E-LoadingOnly Text

- value: Loading
- visible when: loading
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = viewportStateSection(html, "idle", "mobile");
  const loadingSection = viewportStateSection(html, "loading", "mobile");

  assert.match(idleSection, new RegExp(`<td>${markerBadge("L1", "layout")}</td><td>${detailIdRef("L-Page")}</td><td>stack</td>`));
  assert.match(idleSection, new RegExp(`<td>${markerBadge("E-NameInput", "element")}</td><td>${detailIdRef("E-NameInput")}</td><td>Input</td>`));
  assert.match(loadingSection, new RegExp(`<td>${markerBadge("L1", "layout")} ${repeatedBadge()}</td><td>${detailIdRef("L-Page")}</td><td>stack</td>`));
  assert.match(loadingSection, new RegExp(`<td>${markerBadge("E-NameInput", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-NameInput")}</td><td>Input</td>`));
  assert.match(loadingSection, new RegExp(`<td>${markerBadge("E-LoadingOnly", "element")}</td><td>${detailIdRef("E-LoadingOnly")}</td><td>Text</td>`));
  assert.match(stateWireframeSection(loadingSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-layout" data-mm-marker-category="layout" data-mm-repeated-marker="true">L1<\/code>/);
  assert.match(stateWireframeSection(loadingSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-element" data-mm-marker-category="element" data-mm-repeated-marker="true">E-NameInput<\/code>/);
});

test("marks all-repeated state view spec fragments empty when repeated rows are hidden", () => {
  const source = `---
id: SCR-ALL-REPEATED-STATE-SPECS
type: screen
title: All Repeated State Specs
viewport: mobile
---

# SCR-ALL-REPEATED-STATE-SPECS All Repeated State Specs

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Title
- E-Submit

## Elements

### E-Title Heading

- value: Profile

### E-Submit Button

- label: Refresh
- action: A-Refresh

## Actions

### A1:A-Refresh Refresh profile

- Triggered
  - E-Submit.click
- From
  - idle
  - loaded
- Process: Immediate
  - Effects
    - state: loaded
`;
  const result = parseMarkVSpec(source);
  const loadedModel = buildViewportStateScreenReadModels(result, result)
    .find((viewport) => viewport.viewport === "mobile")
    ?.models.find((model) => model.stateName === "loaded");
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = viewportStateSection(html, "loaded", "mobile");

  assert.equal(loadedModel?.repeatedContent.layoutSpecEmptyWhenRepeatedHidden, true);
  assert.equal(loadedModel?.repeatedContent.elementSummaryEmptyWhenRepeatedHidden, true);
  assert.equal(loadedModel?.repeatedContent.actionSpecEmptyWhenRepeatedHidden, true);
  assert.equal(loadedModel?.repeatedContent.hasSuppressedRepeatedContent, true);
  assert.equal(loadedModel?.repeatedContent.hasVisibleStateSpecWhenRepeatedHidden, false);
  assert.match(loadedSection, /<div class="layout-spec-fragment" data-mm-render-key="layouts:list" data-mm-repeated-empty="true">/);
  assert.match(loadedSection, /<div class="element-spec-fragment" data-mm-render-key="elements:list" data-mm-repeated-empty="true">/);
  assert.match(loadedSection, /<div class="action-spec-fragment" data-mm-repeated-empty="true">/);
  assert.match(loadedSection, new RegExp(`<td>${markerBadge("L1", "layout")} ${repeatedBadge()}</td><td>${detailIdRef("L-Page")}</td>`));
  assert.match(loadedSection, new RegExp(`<td>${markerBadge("E-Title", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-Title")}</td>`));
  assert.match(loadedSection, new RegExp(`<td><a class="mm-marker-link" href="#action-detail-A-Refresh"><code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">A1</code></a> ${repeatedBadge()}</td><td>Refresh profile</td>`));
  assert.doesNotMatch(loadedSection, /<p class="spec-empty" data-mm-repeated-empty="true">None\.<\/p>/);
});

test("marks repeated State View specs when no viewport layout exists", () => {
  const source = `---
id: SCR-NO-VIEWPORT-REPEATED
type: screen
title: No Viewport Repeated
---

# SCR-NO-VIEWPORT-REPEATED No Viewport Repeated

## States

- idle*
- loaded

## Elements

### E-Title Heading

- value: Title
`;
  const result = parseMarkVSpec(source);
  const viewports = buildViewportStateScreenReadModels(result, result);
  const loaded = viewports[0]?.models.find((model) => model.stateName === "loaded");

  assert.ok(loaded);
  assert.ok(loaded.repeatedElementIds?.has("E-Title"));
});

test("marks login authenticating common specs as repeated while keeping progress specs new", () => {
  const source = readFileSync(resolve(extensionRoot, "../../examples/01-basics/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const waitAuthSection = viewportStateSection(html, "authenticating", "mobile");

  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("L1", "layout")} ${repeatedBadge()}</td><td>${detailIdRef("L-Page")}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("L2", "layout")} ${repeatedBadge()}</td><td>${detailIdRef("L-LoginForm")}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("1", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-PageTitle")}</td><td>Heading</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("7", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-SignInButton")}</td><td>Button</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("L7", "layout")}</td><td>${detailIdRef("L-AuthProgress")}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${markerBadge("11", "element")}</td><td>${detailIdRef("E-AuthSpinner")}</td><td>Spinner</td>`));
  assert.doesNotMatch(waitAuthSection, new RegExp(`<td>${markerBadge("L7", "layout")} ${repeatedBadge()}</td><td>${detailIdRef("L-AuthProgress")}`));
  assert.doesNotMatch(waitAuthSection, new RegExp(`<td>${markerBadge("11", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-AuthSpinner")}`));
});

test("builds State Views ids from the read model", () => {
  const source = readFileSync(resolve(extensionRoot, "../../examples/01-basics/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, "mobile");
  const waitAuth = models.find((model) => model.stateName === "authenticating");

  assert.ok(waitAuth);
  assert.ok(waitAuth.renderedIds.layoutIds.has("L-LoginForm"));
  assert.ok(waitAuth.renderedIds.layoutIds.has("L-AuthProgress"));
  assert.ok(waitAuth.renderedIds.elementIds.has("E-SignInButton"));
  assert.ok(waitAuth.renderedIds.elementIds.has("E-AuthSpinner"));
});

test("computes repeated hidden empty flags from the rendered spec result", () => {
  const specSource = `---
id: SCR-SPEC-ONLY
type: screen
title: Spec Only
viewport: mobile
---

# SCR-SPEC-ONLY Spec Only

## States

- idle*
`;
  const wireframeSource = `---
id: SCR-WIREFRAME
type: screen
title: Wireframe
viewport: mobile
---

# SCR-WIREFRAME Wireframe

## States

- idle*

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- E-Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- E-Shell

## Elements

### E-Shell Text

- value: Shell
`;
  const specResult = parseMarkVSpec(specSource);
  const wireframeResult = parseMarkVSpec(wireframeSource);
  const desktopModel = buildViewportStateScreenReadModels(specResult, wireframeResult)
    .find((viewport) => viewport.viewport === "desktop")
    ?.models.find((model) => model.stateName === "idle");

  assert.ok(desktopModel?.repeatedLayoutIds?.has("L-Shell"));
  assert.ok(desktopModel?.repeatedElementIds?.has("E-Shell"));
  assert.equal(desktopModel?.repeatedContent.hasSuppressedRepeatedContent, false);
  assert.equal(desktopModel?.repeatedContent.layoutSpecEmptyWhenRepeatedHidden, false);
  assert.equal(desktopModel?.repeatedContent.elementSummaryEmptyWhenRepeatedHidden, false);
});

test("does not treat empty state detail categories as repeated content", () => {
  const source = `---
id: SCR-EMPTY-DETAIL-CATEGORIES
type: screen
title: Empty Detail Categories
viewport: mobile
---

# SCR-EMPTY-DETAIL-CATEGORIES Empty Detail Categories

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-OpenButton

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- E-OpenButton

## Elements

### E-OpenButton Button

- label: Open
`;
  const result = parseMarkVSpec(source);
  const desktopModel = buildViewportStateScreenReadModels(result, result)
    .find((viewport) => viewport.viewport === "desktop")
    ?.models.find((model) => model.stateName === "idle");
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");

  assert.doesNotMatch(mobileIdleSection, /<h6 class="state-screen-detail-heading">Input Form Spec<\/h6>/);
  assert.doesNotMatch(desktopIdleSection, /<h6 class="state-screen-detail-heading">Input Form Spec<\/h6>/);
  assert.doesNotMatch(desktopIdleSection, /<div class="element-detail-group" data-mm-repeated-empty="true"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6><p class="spec-empty" data-mm-repeated-empty="true">None\.<\/p><\/div>/);
  assert.equal(desktopModel?.repeatedContent.inputFormSpecEmptyWhenRepeatedHidden, false);
  assert.equal(desktopModel?.repeatedContent.displayContentSpecEmptyWhenRepeatedHidden, true);
  assert.match(desktopIdleSection, /<div class="element-detail-group" data-mm-repeated-empty="true"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.match(desktopIdleSection, new RegExp(`<td>${markerBadge("E-OpenButton", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-OpenButton")}</td>`));
});

test("marks repeated system events in state screens without DOM emptiness inference", () => {
  const source = `---
id: SCR-REPEATED-SYSTEM-EVENTS
type: screen
title: Repeated System Events
viewport: mobile
---

# SCR-REPEATED-SYSTEM-EVENTS Repeated System Events

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

## Layout: desktop

### L-Page Page

- stack

## Actions

### A1:A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process: ServerCall
  - LoadService.fetch()
`;
  const result = parseMarkVSpec(source);
  const desktopModel = buildViewportStateScreenReadModels(result, result)
    .find((viewport) => viewport.viewport === "desktop")
    ?.models.find((model) => model.stateName === "idle");
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");
  const mobileSystemEvents = mobileIdleSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";
  const desktopSystemEvents = desktopIdleSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.equal(desktopModel?.repeatedContent.systemEventsEmptyWhenRepeatedHidden, true);
  assert.match(mobileSystemEvents, /<aside class="system-events-box">/);
  assert.match(mobileSystemEvents, new RegExp(`<li>${actionBadge("A1", "A-Load")} Load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
  assert.match(desktopSystemEvents, /<aside class="system-events-box" data-mm-repeated-empty="true">/);
  assert.match(desktopSystemEvents, new RegExp(`<li>${actionBadge("A1", "A-Load")} ${repeatedBadge()} Load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
});

test("uses explicit From states for system event relevance", () => {
  const source = `---
id: SCR-SYSTEM-EVENT-FROM
type: screen
title: System Event From
viewport: mobile
---

# SCR-SYSTEM-EVENT-FROM System Event From

## States

- idle*
- loading

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Idle
- E-Loading

## Elements

### E-Idle Text

- value: Idle
- visible when: idle

### E-Loading Text

- value: Loading
- visible when: loading

## Actions

### A1:A-SystemEvent System event

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - case: background
    - from: loading
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = viewportStateSection(html, "idle", "mobile");
  const loadingSection = viewportStateSection(html, "loading", "mobile");

  assert.match(idleSection, new RegExp(`<li>${actionBadge("A1", "A-SystemEvent")} System event<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
  assert.doesNotMatch(loadingSection, /system-events-box/);
  assert.match(loadingSection, /<h5 class="state-screen-subheading">Actions<\/h5>\s*<p class="spec-empty">None\.<\/p>/);
});

test("excludes hidden viewport-specific element triggers from system events", () => {
  const source = `---
id: SCR-HIDDEN-ELEMENT-TRIGGER
type: screen
title: Hidden Element Trigger
viewport: mobile
---

# SCR-HIDDEN-ELEMENT-TRIGGER Hidden Element Trigger

## States

- idle*

## Layout: mobile

### L-MobilePage Mobile page

- stack

#### Items

- E-MobileTitle

## Layout: desktop

### L-DesktopPage Desktop page

- stack

#### Items

- E-MobileTitle
- E-DesktopOnlyLink

## Elements

### E-MobileTitle Heading

- level: 1
- label: Account

### E-DesktopOnlyLink Link

- label: Open password reset
- action: A-ForgotPassword

## Actions

### A1:A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process P1: Load
  - case: done
    - Effects
      - state: idle

### A2:A-ForgotPassword Open password reset

- Triggered
  - E-DesktopOnlyLink.click
- From
  - idle
- Process P1: Navigate
  - Effects
    - navigate: SCR-PASSWORD-RESET
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");
  const mobileSystemEvents = mobileIdleSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";
  const desktopSystemEvents = desktopIdleSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.match(mobileSystemEvents, /<aside class="system-events-box">/);
  assert.match(mobileSystemEvents, new RegExp(`<li>${actionBadge("A1", "A-Load")} Load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
  assert.doesNotMatch(mobileSystemEvents, /A-ForgotPassword|Open password reset|E-DesktopOnlyLink\.click/);
  assert.doesNotMatch(desktopSystemEvents, /A-ForgotPassword|Open password reset|E-DesktopOnlyLink\.click/);
});

test("marks repeated system events from later current states", () => {
  const source = `---
id: SCR-REPEATED-DIFF-SYSTEM-EVENTS
type: screen
title: Repeated Diff System Events
viewport: mobile
---

# SCR-REPEATED-DIFF-SYSTEM-EVENTS Repeated Diff System Events

## States

- idle*
- loading

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-IdleText
- E-LoadingText

## Layout: desktop

### L-Page Page

- stack

#### Items

- E-IdleText
- E-LoadingText

## Elements

### E-IdleText Text

- value: Idle
- visible when: idle

### E-LoadingText Text

- value: Loading
- visible when: loading

## Actions

### A1:A-Submit Submit

- Triggered
  - E-IdleText.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: loading

### A2:A-HandleSubmitResponse Handle submit response

- Triggered
  - A-Submit.response
- From
  - loading
- Process: Immediate
  - case: success
    - response: 200
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileLoadingSection = viewportStateSection(html, "loading", "mobile");
  const desktopLoadingSection = viewportStateSection(html, "loading", "desktop");
  const mobileSystemEvents = mobileLoadingSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";
  const desktopSystemEvents = desktopLoadingSection.match(/<aside class="system-events-box"[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.match(mobileSystemEvents, /<aside class="system-events-box">/);
  assert.match(mobileSystemEvents, new RegExp(`<li>${actionBadge("A2", "A-HandleSubmitResponse")} Handle submit response<span class="system-event-trigger">（Trigger: ${actionBadge("A1", "A-Submit")}\\.response）</span></li>`));
  assert.match(desktopSystemEvents, /<aside class="system-events-box" data-mm-repeated-empty="true">/);
  assert.match(desktopSystemEvents, new RegExp(`<li>${actionBadge("A2", "A-HandleSubmitResponse")} ${repeatedBadge()} Handle submit response<span class="system-event-trigger">（Trigger: ${actionBadge("A1", "A-Submit")}\\.response）</span></li>`));
});

test("keeps viewport-specific current layouts after cross-viewport dedupe", () => {
  const source = `---
id: SCR-RESPONSIVE-REMOVED-LAYOUT
type: screen
title: Responsive Removed Layout
viewport: mobile
---

# SCR-RESPONSIVE-REMOVED-LAYOUT Responsive Removed Layout

## States

- init*
- idle

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- L-ModePanel
- E-Idle

### L2:L-ModePanel Mode Panel

- stack
- gap: sm
- visible when: init

#### Items

- E-MobileOnly

## Layout: desktop

### L1:L-Page Page

- stack

#### Items

- L-ModePanel
- E-Idle

### L2:L-ModePanel Mode Panel

- row
- gap: lg
- visible when: init

#### Items

- E-DesktopOnly

## Elements

### E-MobileOnly Text

- value: Mobile only

### E-DesktopOnly Text

- value: Desktop only

### E-Idle Text

- value: Idle
- visible when: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");

  assert.doesNotMatch(mobileIdleSection, new RegExp(`<td>${markerBadge("L2", "layout")}</td><td>${detailIdRef("L-ModePanel")}</td><td>stack</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${markerBadge("L2", "layout")}</td><td>${detailIdRef("L-ModePanel")}</td><td>row</td>`));
  assert.match(mobileIdleSection, new RegExp(`<td>${markerBadge("E-Idle", "element")}</td><td>${detailIdRef("E-Idle")}</td><td>Text</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${markerBadge("E-Idle", "element")} ${repeatedBadge()}</td><td>${detailIdRef("E-Idle")}</td><td>Text</td>`));
});

test("limits State Views layout signatures to state-view-affecting properties and child structure", () => {
  assert.deepEqual([...STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS], [
    "active when",
    "align",
    "disabled when",
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
viewport: mobile
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

  const changedNotes = parseMarkVSpec(equivalentSource
    .replace("- E-Title\n\n## Layout: desktop", "- E-Title\n\nMobile note.\n\n## Layout: desktop")
    .replace("- E-Title\n\n## Elements", "- E-Title\n\nDesktop note.\n\n## Elements"));
  assert.notEqual(
    stateViewLayoutSignature(changedNotes, "L-Page", "mobile"),
    stateViewLayoutSignature(changedNotes, "L-Page", "desktop")
  );
});

test("falls back to internal IDs when design document markers are absent", () => {
  const source = `---
id: SCR-MARKERLESS
type: screen
title: Markerless
---

# SCR-MARKERLESS Markerless

## States

- idle*
- authenticating

## Layout: mobile

### L-Form Form

- stack
- visible when: user.role is admin
- visible when: user.can access login

#### Items

- "Email": E-メールアドレス入力
- E-SubmitButton

## Elements

### E-メールアドレス入力 Input*

- value: \${model.email}
- initial value: "a@example.com"
- validation: Must be valid.

### E-SubmitButton Button

- label: Submit & Continue
- action: A-Submit
- disabled when: E-メールアドレス入力 is empty

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: HttpRequest
  - POST /login
    - email: E-メールアドレス入力.value
- Process: Immediate
  - Effects
    - state: authenticating
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);

  assert.match(html, /<h6 class="state-screen-detail-heading">Element Summary<\/h6>/);
  assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>/);
  assert.match(html, new RegExp(`<td>${markerBadge("E-メールアドレス入力", "element")}</td><td>${detailIdRef("E-メールアドレス入力")}</td><td>Input</td><td>yes</td><td><ul class="spec-list"><li>a@example\\.com</li><li>${sourceCodePattern("${model.email}")}</li></ul></td><td></td><td></td><td></td><td></td><td></td>`));
  assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.doesNotMatch(html, /<div class="element-detail-group"><h4>Actionable<\/h4>/);
  assert.match(html, new RegExp(`<td>${markerBadge("E-SubmitButton", "element")}</td><td>${detailIdRef("E-SubmitButton")}</td><td>Button</td><td><ul class="spec-list"><li>${markerBadge("A-Submit", "action")}</li></ul></td><td></td>`));
  assert.match(html, new RegExp(`<td>${markerBadge("E-SubmitButton", "element")}</td><td>${detailIdRef("E-SubmitButton")}</td><td>label</td><td>Submit &amp; Continue</td><td></td><td></td><td></td><td><ul class="spec-list"><li>enabled: not ${markerBadge("E-メールアドレス入力", "element")} is empty</li></ul></td>`));
  assert.doesNotMatch(html, /<h2>Visibility \/ Availability<\/h2>/);
  assert.match(html, new RegExp(`<td>${markerBadge("L-Form", "layout")}</td><td>${detailIdRef("L-Form")}</td><td>stack</td><td><ul class="spec-list"><li>visible: user\\.role is admin, user\\.can access login</li></ul></td><td><ul class="spec-list"><li>Email: ${detailIdRef("E-メールアドレス入力")}</li><li>${detailIdRef("E-SubmitButton")}</li></ul></td>`));
  assert.match(html, /email: <span class="mm-detail-ref-id">E-メールアドレス入力<\/span>\.value/);
  assert.match(html, /<dt>Trigger<\/dt><dd><span class="mm-detail-ref-id">E-SubmitButton<\/span>\.click<\/dd>/);
  assert.match(html, /S0 --&gt; S1: Submit/);
  const idleSection = stateSection(html, "idle");
  assert.doesNotMatch(idleSection, /system-events-box/);
});
