import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { parseMarkVSpec, renderMarkVSpecHtml, renderMarkVSpecHtmlFragment } from "../src/index.js";

function examplePath(relativePath: string): string {
  return resolve("../../examples", relativePath);
}

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
