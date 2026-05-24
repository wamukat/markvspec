import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkVSpec, renderMarkVSpecHtml } from "@markvspec/core";
import { renderDesignDocumentHtml } from "../src/extension.js";
import { sourceAnchorTargetForLine } from "../src/source-anchor.js";

test("adds stable source anchors to representative preview blocks", () => {
  const source = `---
id: SCR-SOURCE-ANCHOR
type: screen
title: Source Anchor
---

# SCR-SOURCE-ANCHOR Source Anchor

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- level: 1
- text: Hello

## Actions

### A-Continue Continue

#### From

- idle

#### P1: Process Continue

- navigate: SCR-NEXT
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));

  assert.match(html, /<section class="doc-section screen-spec-section"(?=[^>]*data-mm-source-anchor="screen:SCR-SOURCE-ANCHOR")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
  assert.match(html, /<section class="doc-section"(?=[^>]*data-mm-source-anchor="section:States")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
  assert.match(html, /<div class="element-spec-fragment"(?=[^>]*data-mm-source-anchor="section:Elements")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
  assert.match(html, /<span class="mm-ref-chip mm-ref-chip-element"(?=[^>]*data-mm-ref-id="E-Title")(?=[^>]*data-mm-source-anchor="element:E-Title")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
  assert.match(html, /<article class="action-detail"(?=[^>]*data-mm-source-anchor="action:A-Continue")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-action"(?=[^>]*data-mm-ref-id="A-Continue")(?=[^>]*data-mm-source-anchor="action:A-Continue")(?=[^>]*data-mm-source-start-line="\d+")(?=[^>]*data-mm-source-end-line="\d+")/);
});

test("resolves source lines to the nearest preview source anchor target", () => {
  const source = `---
id: SCR-SOURCE-SYNC
type: screen
title: Source Sync
---

# SCR-SOURCE-SYNC Source Sync

## States

- idle*

## Elements

### E-Title Heading

- level: 1
- text: Hello

## Actions

### A-Continue Continue

#### From

- idle
`;
  const result = parseMarkVSpec(source);
  const lineOf = (text: string) => source.split("\n").findIndex((line) => line === text) + 1;

  assert.equal(sourceAnchorTargetForLine(result, lineOf("- text: Hello"))?.sourceAnchor, "element:E-Title");
  assert.equal(sourceAnchorTargetForLine(result, lineOf("- idle"))?.sourceAnchor, "action:A-Continue");
  assert.equal(sourceAnchorTargetForLine(result, lineOf("- idle*"))?.sourceAnchor, "section:States");
  assert.equal(sourceAnchorTargetForLine(result, 0), undefined);
});
