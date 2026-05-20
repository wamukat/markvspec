import assert from "node:assert/strict";
import test from "node:test";
import {
  addDocumentSectionNumberHtml,
  appendHtmlBeforeClosingRootDiv,
  demoteHtmlHeadings,
  insertHtmlIntoElementRenderKey,
  markRepeatedHiddenEmptyHtml,
  markRepeatedMarkerCodeHtml,
  namespacePreviewRenderKeys,
  numberDocumentSectionsHtml,
  prependHtmlInsideFirstTag
} from "../src/preview-html-postprocess.js";

function sectionNumber(value: string): string {
  return `<span>${value}.</span>`;
}

test("numbers generated document sections while returning the next section number", () => {
  const numbered = numberDocumentSectionsHtml(
    `<section class="doc-section"><h2>First</h2></section>
<section class="doc-section doc-section-notes" data-x="1"><h2 id="notes">Notes</h2></section>`,
    3,
    sectionNumber
  );

  assert.equal(numbered.nextNumber, 5);
  assert.match(numbered.html, /data-section-number="3"[\s\S]*<h2><span>3\.<\/span> First/);
  assert.match(numbered.html, /data-section-number="4" data-x="1"[\s\S]*<h2 id="notes"><span>4\.<\/span> Notes/);
});

test("adds a section number to a generated document section", () => {
  const html = addDocumentSectionNumberHtml(`<section class="doc-section"><h2 id="rules">Rules</h2></section>`, "7", sectionNumber);

  assert.equal(html, `<section class="doc-section" data-section-number="7"><h2 id="rules"><span>7.</span> Rules</h2></section>`);
});

test("demotes generated headings and preserves existing classes", () => {
  const html = demoteHtmlHeadings(`<h4 id="a">A</h4><h4 class="existing" data-x="1">B</h4>`, 4, 6, "detail-heading");

  assert.equal(html, `<h6 class="detail-heading" id="a">A</h6><h6 class="existing detail-heading" data-x="1">B</h6>`);
});

test("marks repeated hidden empty fragments once", () => {
  const table = markRepeatedHiddenEmptyHtml(`<div class="spec-table-wrap"></div>`, true);
  const empty = markRepeatedHiddenEmptyHtml(`<p class="spec-empty">None</p>`, true);

  assert.equal(table, `<div class="spec-table-wrap" data-mm-repeated-empty="true"></div>`);
  assert.equal(markRepeatedHiddenEmptyHtml(table, true), table);
  assert.equal(empty, `<p class="spec-empty" data-mm-repeated-empty="true">None</p>`);
  assert.equal(markRepeatedHiddenEmptyHtml(`<p class="spec-empty">None</p>`, false), `<p class="spec-empty">None</p>`);
});

test("marks only repeated marker chips in generated HTML", () => {
  const html = markRepeatedMarkerCodeHtml(
    `<code class="mm-id mm-marker mm-marker-layout" data-mm-marker-category="layout">L-Root</code>
<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">E-Other</code>`,
    {
      action: new Set(),
      element: new Set(),
      layout: new Set(["L-Root"])
    }
  );

  assert.match(html, /mm-marker-repeated/);
  assert.match(html, /data-mm-marker-category="layout" data-mm-repeated-marker="true"/);
  assert.match(html, /mm-marker-element" data-mm-marker-category="element">E-Other/);
});

test("postprocesses generated preview fragments for partial updates", () => {
  const namespaced = namespacePreviewRenderKeys(
    `<div data-mm-render-key="element:E-Name">Name</div><!--mm-render-key:layout:mobile:L-Root-->`,
    "partial:PRT-Profile:"
  );
  const inserted = insertHtmlIntoElementRenderKey(
    `<div class="mm-element-wrap" data-mm-render-key="element:E-Name"><input></div>`,
    "element:E-Name",
    `<p>Error</p>`
  );

  assert.match(namespaced, /data-mm-render-key="partial:PRT-Profile:element:E-Name"/);
  assert.match(namespaced, /<!--mm-render-key:partial:PRT-Profile:layout:mobile:L-Root-->/);
  assert.equal(appendHtmlBeforeClosingRootDiv(`<div class="root"><p>A</p></div>`, `<aside>B</aside>`), `<div class="root"><p>A</p><aside>B</aside></div>`);
  assert.equal(inserted, `<div class="mm-element-wrap" data-mm-render-key="element:E-Name"><input><p>Error</p></div>`);
});

test("prepends generated content inside the first HTML tag", () => {
  assert.equal(prependHtmlInsideFirstTag(`<a href="#x">Rows</a>`, `<svg></svg>`), `<a href="#x"><svg></svg>Rows</a>`);
});
