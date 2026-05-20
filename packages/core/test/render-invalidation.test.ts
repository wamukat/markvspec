import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMarkVSpecRenderInvalidation,
  parseMarkVSpec,
  renderMarkVSpecHtml,
  renderMarkVSpecHtmlFragment,
  renderMarkVSpecHtmlWithInvalidation
} from "../src/index.js";

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
- Process P1: Call server service
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
