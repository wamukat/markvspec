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
  if (!linked) {
    return badge;
  }
  const href = `#action-detail-${escapeRegExp(encodeURIComponent(anchorValue))}`;
  return category === "action"
    ? `(?:<a class="mm-marker-link" href="${href}">${badge}</a>|<a class="mm-ref-chip mm-ref-chip-action" href="${href}"[^>]*>${badge})`
    : `<a class="mm-marker-link" href="${href}">${badge}</a>`;
}

function actionBadge(marker: string, actionId: string, linked = true): string {
  return markerBadge(marker, "action", linked, actionId);
}

function detailIdRef(id: string): string {
  return `<span class="mm-detail-ref-id">${escapeRegExp(id)}</span>`;
}

function detailElementRef(marker: string, elementId: string): string {
  return `(?:<span class="mm-ref-chip mm-ref-chip-element"[^>]*>)?${markerBadge(marker, "element")} ${detailIdRef(elementId)}(?:</span>)?`;
}

function detailLayoutRef(marker: string, layoutName: string): string {
  return `(?:<span class="mm-ref-chip mm-ref-chip-layout"[^>]*>)?${markerBadge(marker, "layout")} ${escapeRegExp(layoutName)}(?:</span>)?`;
}

function detailLayoutRefById(marker: string, layoutId: string): string {
  return `<span class="mm-ref-chip mm-ref-chip-layout"[^>]*data-mm-ref-id="${escapeRegExp(layoutId)}"[^>]*>${markerBadge(marker, "layout")} [^<]+</span>`;
}

function refActionChip(marker: string, actionId: string, actionName: string): string {
  return `<a class="mm-ref-chip mm-ref-chip-action" href="#action-detail-${escapeRegExp(encodeURIComponent(actionId))}"[^>]*><code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">${escapeRegExp(marker)}</code> ${escapeRegExp(actionName)}</a>`;
}

function refMessageChip(marker: string, id: string, label: string): string {
  return `<span class="mm-ref-chip mm-ref-chip-message"[^>]*><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="${escapeRegExp(id)}">${escapeRegExp(marker)}</code> ${escapeRegExp(label)}</span>`;
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

function plainCodePattern(value: string): string {
  return `<code>${escapeRegExp(value)}</code>`;
}

function sourceTypeChipPattern(value: string): string {
  return `<span class="mm-chip mm-source-chip mm-source-chip-${escapeRegExp(value)}">${escapeRegExp(value)}</span>`;
}

function defaultAlwaysPattern(value = "always"): string {
  return `<span class="spec-default-always">${escapeRegExp(value)}</span>`;
}

function inlineTokenPattern(value: string): string {
  return `<span class="mm-inline-token">${escapeRegExp(value)}</span>`;
}

function specSectionPattern(title: string, rows: string[]): string {
  return `<div class="spec-section"><strong>${escapeRegExp(title)}</strong><ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`;
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
      renderTrigger: (value) => value ?? "",
      renderEntityRef: ({ marker, label, id }) => [marker, label ?? id].filter(Boolean).join(" ")
    },
    prose: {
      sectionProseForKind: (kind) => result.sectionProse.filter((candidate) => candidate.kind === kind)
    },
    specFragments: {
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

- text: Editing normally.

### E-HelpText Text

- text: Delivery cadence help text.

### E-StatusDraft Banner

- text: Status replaced by scenario.

### E-StatusFinal Banner

- text: Status replaced by later scenario case.

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

test("renders preview scenario field error display messages near inputs", () => {
  const source = `---
id: SCR-FIELD-ERROR-PREVIEW
type: screen
title: Field Error Preview
---
# SCR-FIELD-ERROR-PREVIEW Field Error Preview

## States

- idle*

## Layout: mobile

### L-Form Form

- stack

#### Items

- E-EmailInput
- L-MessageArea
- E-SubmitButton

### L-MessageArea Message area

- stack

## Elements

### E-EmailInput Input

- label: Email

### E-SubmitButton Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-EmailRequired.result
  - case: invalid
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: V-EmailRequired.messages
  - case: invalid-summary
    - Effects
      - display:
        - target: L-MessageArea
        - message: V-EmailRequired.messages

## Preview Scenarios

### idle-validation-error

- state: idle
- cases:
  - A-Submit.P1.invalid
  - A-Submit.P1.invalid-summary

## Field Validations

### V1:V-EmailRequired Email required

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const scenarioSection = stateSectionContaining(html, "idle", "idle-validation-error");
  const wireframe = stateWireframeSection(scenarioSection);

  assert.deepEqual(result.diagnostics, []);
  assert.match(wireframe, /data-mm-render-key="element:E-EmailInput"/);
  assert.match(wireframe, /<div class="mm-field-error" data-mm-field-error-for="E-EmailInput"><div class="mm-field-error-message" data-mm-display-source="V-EmailRequired"><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="V-EmailRequired">V1<\/code>Email is required\.<\/div><\/div>/);
  assert.match(wireframe, /data-mm-render-key="layout:mobile:L-MessageArea"[\s\S]*<div class="mm-display-message" data-mm-display-source="V-EmailRequired"><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="V-EmailRequired">V1<\/code>Email is required\.<\/div>/);
  assert.doesNotMatch(scenarioSection, /Displayed messages/);
  const displayUpdates = scenarioSection.match(/<aside class="display-explanations-box display-updates-box">[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.match(displayUpdates, /<h6 class="state-screen-detail-heading">Display updates<\/h6>/);
  assert.match(displayUpdates, /<th>Triggered by<\/th><th>Update<\/th>/);
  assert.match(displayUpdates, new RegExp(`${refActionChip("A-Submit", "A-Submit", "Submit")}[\\s\\S]*P1\\.invalid[\\s\\S]*${detailElementRef("E-EmailInput", "E-EmailInput")}<span class="display-update-suffix">\\.error</span>[\\s\\S]*receives[\\s\\S]*${refMessageChip("V1", "V-EmailRequired", "Email required")}<span class="display-update-suffix">\\.messages</span>`));
  assert.match(displayUpdates, new RegExp(`${refActionChip("A-Submit", "A-Submit", "Submit")}[\\s\\S]*P1\\.invalid-summary[\\s\\S]*${detailLayoutRef("L-MessageArea", "Message area")}[\\s\\S]*receives[\\s\\S]*${refMessageChip("V1", "V-EmailRequired", "Email required")}<span class="display-update-suffix">\\.messages</span>`));
  assert.doesNotMatch(scenarioSection, /not placed in current layout[\s\S]*E-EmailInput\.error/);
});

test("renders preview scenario cross-field display messages with explanations", () => {
  const source = `---
id: SCR-CROSS-FIELD-PREVIEW
type: screen
title: Cross-field Preview
---
# SCR-CROSS-FIELD-PREVIEW Cross-field Preview

## States

- idle*

## Layout: desktop

### L-Form Desktop form

- stack

#### Items

- E-EmailInput
- E-PasswordInput
- L-MessageArea
- E-SubmitButton

### L-MessageArea Desktop message area

- stack
- marker: MSG

## Layout: mobile

### L-Form Form

- stack

#### Items

- E-EmailInput
- E-PasswordInput
- L-MessageArea
- E-SubmitButton

### L-MessageArea Mobile message area

- stack
- marker: MSG

## Elements

### E-EmailInput Input

- label: Email

### E-PasswordInput Input

- label: Password

### E-SubmitButton Button

- label: Submit

## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Check validation
  - receive:
    - validation: V-LoginFormRequired.result
  - case: invalid
    - Effects
      - display:
        - target: L-MessageArea
        - message: V-LoginFormRequired.messages

## Preview Scenarios

### idle-cross-field-error

- state: idle
- cases:
  - A-Submit.P1.invalid

## Cross-field Validations

### V2:V-LoginFormRequired Login form required

- target: F-LoginForm
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: E-EmailInput.value is present and E-PasswordInput.value is present
- message: Email and password are required.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const scenarioSection = stateSectionContaining(html, "idle", "idle-cross-field-error");
  const wireframe = stateWireframeSection(scenarioSection);

  assert.deepEqual(result.diagnostics, []);
  assert.match(wireframe, /data-mm-render-key="layout:desktop:L-MessageArea"[\s\S]*<div class="mm-display-message" data-mm-display-source="V-LoginFormRequired"><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="V-LoginFormRequired">V2<\/code>Email and password are required\.<\/div>/);
  assert.doesNotMatch(scenarioSection, /Displayed messages/);
  const displayUpdates = scenarioSection.match(/<aside class="display-explanations-box display-updates-box">[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.match(displayUpdates, new RegExp(`${refActionChip("A-Submit", "A-Submit", "Submit")}[\\s\\S]*P1\\.invalid[\\s\\S]*${detailLayoutRef("MSG", "Desktop message area")}[\\s\\S]*receives[\\s\\S]*${refMessageChip("V2", "V-LoginFormRequired", "Login form required")}<span class="display-update-suffix">\\.messages</span>`));
  assert.doesNotMatch(displayUpdates, /Mobile message area/);
});

test("renders business rule display message markers in scenario wireframes and action details", () => {
  const source = `---
id: SCR-BUSINESS-RULE-DISPLAY
type: screen
title: Business Rule Display
---
# SCR-BUSINESS-RULE-DISPLAY Business Rule Display

## States

- idle*

## Layout: mobile

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
- action: A-Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Submit subscription
  - server:
    - SubscriptionService.create()
  - result:
    - subscription creation request
  - case: business-rule-violation
    - description: 409 duplicate email
    - business rule: R-EmailMustBeUnique
    - Effects
      - display:
        - target: E-EmailInput.error
        - message: R-EmailMustBeUnique.messages

## Preview Scenarios

### idle-duplicate-email

- state: idle
- cases:
  - A-Submit.P1.business-rule-violation

## Business Rules

### R1:R-EmailMustBeUnique Email must be unique

- description: Subscription email must not already be registered.
- messages:
  - This email address is already registered.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const scenarioSection = stateSectionContaining(html, "idle", "idle-duplicate-email");
  const wireframe = stateWireframeSection(scenarioSection);

  assert.deepEqual(result.diagnostics, []);
  assert.match(wireframe, /<div class="mm-field-error" data-mm-field-error-for="E-EmailInput"><div class="mm-field-error-message" data-mm-display-source="R-EmailMustBeUnique"><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="R-EmailMustBeUnique">R1<\/code>This email address is already registered\.<\/div><\/div>/);
  assert.doesNotMatch(scenarioSection, /Displayed messages/);
  const displayUpdates = scenarioSection.match(/<aside class="display-explanations-box display-updates-box">[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.match(displayUpdates, new RegExp(`${refActionChip("A-Submit", "A-Submit", "Submit")}[\\s\\S]*P1\\.business-rule-violation[\\s\\S]*${detailElementRef("E-EmailInput", "E-EmailInput")}<span class="display-update-suffix">\\.error</span>[\\s\\S]*receives[\\s\\S]*${refMessageChip("R1", "R-EmailMustBeUnique", "Email must be unique")}<span class="display-update-suffix">\\.messages</span>`));
  assert.match(html, new RegExp(`<li>Business Rule ${refMessageChip("R1", "R-EmailMustBeUnique", "Email must be unique")}</li>`));
  assert.match(html, new RegExp(`message ${refMessageChip("R1", "R-EmailMustBeUnique", "Email must be unique")}<span class="mm-detail-ref-suffix">\\.messages</span>`));
  assert.doesNotMatch(html, new RegExp(`message <code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="R-EmailMustBeUnique">R1</code> ${refMessageChip("R1", "R-EmailMustBeUnique", "Email must be unique")}`));
});

test("shows subsequent viewport initial state without cross-viewport repeated rows", () => {
  const source = `---
id: SCR-RESPONSIVE-DIFF
type: screen
title: Responsive Diff
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
  assert.doesNotMatch(desktopSection, new RegExp(`<td>${detailLayoutRefById("L9", "L-MobileOnly")}`));
  assert.match(desktopSection, new RegExp(`<td>${detailLayoutRefById("L8", "L-DesktopOnly")}`));
  assert.match(desktopSection, new RegExp(`<td>${detailElementRef("E-DesktopOnly", "E-DesktopOnly")}</td>`));
  assert.doesNotMatch(desktopSection, new RegExp(repeatedBadge()));
  assert.match(html, /mm-gap-sm/);
  assert.match(html, /mm-gap-lg/);
});

test("keeps repeated current state specs scoped to each viewport", () => {
  const source = `---
id: SCR-RESPONSIVE-STATE-DEDUP
type: screen
title: Responsive State Dedup
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
- Process P1: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileIdleSection = viewportStateSection(html, "idle", "mobile");
  const desktopInitSection = viewportStateSection(html, "init", "desktop");
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");

  assert.doesNotMatch(mobileIdleSection, new RegExp(`<td>${detailElementRef("E-CommonInit", "E-CommonInit")}</td>`));
  assert.match(mobileIdleSection, new RegExp(`<td>${detailElementRef("E-CommonIdle", "E-CommonIdle")}</td>`));
  assert.match(desktopInitSection, new RegExp(`<td>${detailElementRef("E-DesktopInit", "E-DesktopInit")}</td>`));
  assert.match(desktopInitSection, new RegExp(`<td>${detailElementRef("E-CommonInit", "E-CommonInit")}</td>`));
  assert.doesNotMatch(desktopInitSection, new RegExp(`<td>${detailElementRef("E-CommonIdle", "E-CommonIdle")}</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-CommonInit", "E-CommonInit")}(?: ${repeatedBadge()})?</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-CommonIdle", "E-CommonIdle")}</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-DesktopInit", "E-DesktopInit")}</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-DesktopIdle", "E-DesktopIdle")}</td>`));
  assert.match(stateWireframeSection(mobileIdleSection), />E-CommonIdle<\/code>/);
  assert.match(stateWireframeSection(desktopIdleSection), />E-CommonIdle<\/code>/);
  assert.match(stateWireframeSection(desktopIdleSection), />E-DesktopIdle<\/code>/);
  assert.doesNotMatch(stateWireframeSection(desktopIdleSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-element" data-mm-marker-category="element" data-mm-repeated-marker="true">E-CommonIdle<\/code>/);
  assert.doesNotMatch(desktopIdleSection, /data-repeated-layout-only-message/);
  assert.doesNotMatch(desktopIdleSection, /<h5 class="state-screen-subheading">Available Actions<\/h5>/);
});

test("deduplicates repeated current state specs across later states in the same viewport", () => {
  const source = `---
id: SCR-SAME-VIEWPORT-STATE-DEDUP
type: screen
title: Same Viewport State Dedup
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

  assert.match(idleSection, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")}</td><td>stack</td>`));
  assert.match(idleSection, new RegExp(`<td>${detailElementRef("E-NameInput", "E-NameInput")}</td><td>Input</td>`));
  assert.match(loadingSection, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")} ${repeatedBadge()}</td><td>stack</td>`));
  assert.match(loadingSection, new RegExp(`<td>${detailElementRef("E-NameInput", "E-NameInput")} ${repeatedBadge()}</td><td>Input</td>`));
  assert.match(loadingSection, new RegExp(`<td>${detailElementRef("E-LoadingOnly", "E-LoadingOnly")}</td><td>Text</td>`));
  assert.match(stateWireframeSection(loadingSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-layout" data-mm-marker-category="layout" data-mm-repeated-marker="true">L1<\/code>/);
  assert.match(stateWireframeSection(loadingSection), /class="mm-id mm-marker mm-marker-repeated mm-marker-element" data-mm-marker-category="element" data-mm-repeated-marker="true">E-NameInput<\/code>/);
});

test("classifies preview scenario views and selects repeated bases from metadata", () => {
  const source = `---
id: SCR-SCENARIO-BASE-SELECTION
type: screen
title: Scenario Base Selection
---

# SCR-SCENARIO-BASE-SELECTION Scenario Base Selection

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Shared
- E-Loaded

## Elements

### E-Shared Text

- value: Shared

### E-Loaded Text

- value: Loaded
- visible when: loaded

## Actions

### A1:A-Submit Submit

- Triggered
  - E-Shared.click
- From
  - idle
- Process P1: Immediate
  - case: success
    - from: idle
    - state: loaded

## Preview Scenarios

### loaded

- samples:
  - E-Shared: Baseline shared

### loaded-overlay

- state: loaded

### submit-loaded

- state: loaded
- cases:
  - A-Submit.P1.success
`;
  const result = parseMarkVSpec(source);
  const models = buildViewportStateScreenReadModels(result, result)
    .find((viewport) => viewport.viewport === "mobile")
    ?.models ?? [];
  const loaded = models.find((model) => model.stateViewTitle === "loaded");
  const overlap = models.find((model) => model.stateViewTitle === "loaded / loaded-overlay");
  const override = models.find((model) => model.stateViewTitle === "loaded / submit-loaded");

  assert.equal(loaded?.viewKind, "baseline");
  assert.equal(loaded?.sourceStateId, "loaded");
  assert.equal(loaded?.displayStateId, "loaded");
  assert.equal(overlap?.viewKind, "scenario");
  assert.equal(overlap?.sourceStateId, "loaded");
  assert.equal(overlap?.displayStateId, "loaded");
  assert.equal(overlap?.scenarioMode, "overlap");
  assert.ok(overlap?.repeatedElementIds?.has("E-Loaded"));
  assert.ok(overlap?.repeatedElementIds?.has("E-Shared"));
  assert.deepEqual(overlap?.scenarioSamples.map((sample) => [sample.elementId, sample.value]), [
    ["E-Shared", "Baseline shared"]
  ]);
  assert.deepEqual(overlap?.scenarioInputSamples, []);
  assert.equal(override?.viewKind, "scenario");
  assert.equal(override?.sourceStateId, "idle");
  assert.equal(override?.displayStateId, "loaded");
  assert.equal(override?.scenarioMode, "state-override");
  assert.ok(override?.repeatedElementIds?.has("E-Loaded"));

  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const overlapSection = stateSectionContaining(html, "loaded", "loaded-overlay");
  assert.doesNotMatch(overlapSection, /Scenario Samples/);
});

test("uses source state base for overlap scenario inserted before baseline state view", () => {
  const source = `---
id: SCR-SCENARIO-BEFORE-BASE
type: screen
title: Scenario Before Base
---

# SCR-SCENARIO-BEFORE-BASE Scenario Before Base

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Shared
- E-Loaded

## Elements

### E-Shared Text

- value: Shared

### E-Loaded Text

- value: Loaded
- visible when: loaded

## Preview Scenarios

### loaded

- samples:
  - E-Shared: Baseline shared

### loaded-before

- state: loaded
- before: loaded
`;
  const result = parseMarkVSpec(source);
  const models = buildViewportStateScreenReadModels(result, result)
    .find((viewport) => viewport.viewport === "mobile")
    ?.models ?? [];
  const before = models.find((model) => model.stateViewTitle === "loaded / loaded-before");
  const loaded = models.find((model) => model.stateViewTitle === "loaded");

  assert.ok(before, "expected scenario inserted before the loaded baseline view");
  assert.ok(loaded, "expected loaded baseline view");
  assert.ok(models.indexOf(before) < models.indexOf(loaded));
  assert.equal(before.viewKind, "scenario");
  assert.equal(before.scenarioMode, "overlap");
  assert.equal(before.sourceStateId, "loaded");
  assert.ok(before.repeatedElementIds?.has("E-Loaded"));
});

test("marks all-repeated state view spec fragments empty when repeated rows are hidden", () => {
  const source = `---
id: SCR-ALL-REPEATED-STATE-SPECS
type: screen
title: All Repeated State Specs
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
  assert.match(loadedSection, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")} ${repeatedBadge()}</td>`));
  assert.match(loadedSection, new RegExp(`<td>${detailElementRef("E-Title", "E-Title")} ${repeatedBadge()}</td>`));
  assert.match(loadedSection, new RegExp(`<td>${refActionChip("A1", "A-Refresh", "Refresh profile")} ${repeatedBadge()}</td>`));
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
  const source = readFileSync(resolve(extensionRoot, "../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const waitAuthSection = viewportStateSection(html, "authenticating", "mobile");

  assert.match(waitAuthSection, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")} ${repeatedBadge()}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${detailLayoutRefById("L2", "L-LoginForm")} ${repeatedBadge()}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${detailElementRef("1", "E-PageTitle")} ${repeatedBadge()}</td><td>Heading</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${detailElementRef("7", "E-SignInButton")} ${repeatedBadge()}</td><td>Button</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${detailLayoutRefById("L7", "L-AuthProgress")}</td><td>stack</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${detailElementRef("11", "E-AuthSpinner")}</td><td>Spinner</td>`));
  assert.doesNotMatch(waitAuthSection, new RegExp(`<td>${detailLayoutRefById("L7", "L-AuthProgress")} ${repeatedBadge()}</td>`));
  assert.doesNotMatch(waitAuthSection, new RegExp(`<td>${detailElementRef("11", "E-AuthSpinner")} ${repeatedBadge()}</td>`));
});

test("builds State Views ids from the read model", () => {
  const source = readFileSync(resolve(extensionRoot, "../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
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
---

# SCR-SPEC-ONLY Spec Only

## States

- idle*
`;
  const wireframeSource = `---
id: SCR-WIREFRAME
type: screen
title: Wireframe
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

  assert.equal(desktopModel?.repeatedLayoutIds, undefined);
  assert.equal(desktopModel?.repeatedElementIds, undefined);
  assert.equal(desktopModel?.repeatedContent.hasSuppressedRepeatedContent, false);
  assert.equal(desktopModel?.repeatedContent.layoutSpecEmptyWhenRepeatedHidden, false);
  assert.equal(desktopModel?.repeatedContent.elementSummaryEmptyWhenRepeatedHidden, false);
});

test("does not treat empty state detail categories as repeated content", () => {
  const source = `---
id: SCR-EMPTY-DETAIL-CATEGORIES
type: screen
title: Empty Detail Categories
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
  assert.equal(desktopModel?.repeatedContent.displayContentSpecEmptyWhenRepeatedHidden, false);
  assert.doesNotMatch(desktopIdleSection, /<div class="element-detail-group" data-mm-repeated-empty="true"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.match(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-OpenButton", "E-OpenButton")}</td>`));
});

test("marks repeated system events in state screens without DOM emptiness inference", () => {
  const source = `---
id: SCR-REPEATED-SYSTEM-EVENTS
type: screen
title: Repeated System Events
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

  assert.equal(desktopModel?.repeatedContent.systemEventsEmptyWhenRepeatedHidden, false);
  assert.match(mobileSystemEvents, /<aside class="system-events-box">/);
  assert.match(mobileSystemEvents, new RegExp(`<li>${actionBadge("A1", "A-Load")} Load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
  assert.match(desktopSystemEvents, /<aside class="system-events-box">/);
  assert.match(desktopSystemEvents, new RegExp(`<li>${actionBadge("A1", "A-Load")} Load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
});

test("uses explicit From states for system event relevance", () => {
  const source = `---
id: SCR-SYSTEM-EVENT-FROM
type: screen
title: System Event From
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
  - A-Submit.P1.response
- From
  - loading
- Process P1: Immediate
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
  assert.match(mobileSystemEvents, new RegExp(`<li>${actionBadge("A2", "A-HandleSubmitResponse")} Handle submit response<span class="system-event-trigger">（Trigger: ${docLabel("A-Submit.P1.response", "trigger")}）</span></li>`));
  assert.match(desktopSystemEvents, /<aside class="system-events-box">/);
  assert.match(desktopSystemEvents, new RegExp(`<li>${actionBadge("A2", "A-HandleSubmitResponse")} Handle submit response<span class="system-event-trigger">（Trigger: ${docLabel("A-Submit.P1.response", "trigger")}）</span></li>`));
});

test("keeps viewport-specific current layouts without cross-viewport element dedupe", () => {
  const source = `---
id: SCR-RESPONSIVE-REMOVED-LAYOUT
type: screen
title: Responsive Removed Layout
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

  assert.doesNotMatch(mobileIdleSection, new RegExp(`<td>${detailLayoutRefById("L2", "L-ModePanel")}</td><td>stack</td>`));
  assert.doesNotMatch(desktopIdleSection, new RegExp(`<td>${detailLayoutRefById("L2", "L-ModePanel")}</td><td>row</td>`));
  assert.match(mobileIdleSection, new RegExp(`<td>${detailElementRef("E-Idle", "E-Idle")}</td><td>Text</td>`));
  assert.match(desktopIdleSection, new RegExp(`<td>${detailElementRef("E-Idle", "E-Idle")}</td><td>Text</td>`));
});

test("limits State Views layout signatures to state-view-affecting properties and child structure", () => {
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
  assert.match(html, new RegExp(`<td>${detailElementRef("E-メールアドレス入力", "E-メールアドレス入力")}</td><td>Input</td><td>yes</td><td>a@example\\.com</td><td>${sourceTypeChipPattern("fixed")}</td><td>-</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.doesNotMatch(html, /<div class="element-detail-group"><h4>Actionable<\/h4>/);
  assert.match(html, new RegExp(`<td>${detailElementRef("E-SubmitButton", "E-SubmitButton")}</td><td>Button</td><td><ul class="spec-list"><li>${refActionChip("A-Submit", "A-Submit", "Submit")}</li></ul></td><td>-</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-SubmitButton", "E-SubmitButton")}</td><td>label</td><td>Submit &amp; Continue</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Enabled", [`not ${markerBadge("E-メールアドレス入力", "element")} is empty`])}</td>`));
  assert.doesNotMatch(html, /<h2>Visibility \/ Availability<\/h2>/);
  assert.match(html, new RegExp(`<td>${detailLayoutRefById("L-Form", "L-Form")}</td><td>stack</td><td>${specSectionPattern("Items", [`Email: ${detailIdRef("E-メールアドレス入力")}`, detailIdRef("E-SubmitButton")])}</td><td><ul class="spec-list"><li>visible: user\\.role is admin, user\\.can access login</li></ul></td><td>-</td>`));
  assert.match(html, new RegExp(`email: ${detailElementRef("E-メールアドレス入力", "E-メールアドレス入力")}\\.value`));
  assert.match(html, new RegExp(`<dt>Trigger</dt><dd>${detailElementRef("E-SubmitButton", "E-SubmitButton")}\\.click</dd>`));
  assert.match(html, /S0 --&gt; S1: Submit/);
  const idleSection = stateSection(html, "idle");
  assert.doesNotMatch(idleSection, /system-events-box/);
});
