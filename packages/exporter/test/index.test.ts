import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  defaultExportHtmlBaseName,
  expandMarkVSpecFiles,
  exportMarkVSpecDocumentList,
  exportMarkVSpecPdfFiles,
  exportMarkVSpecHtmlFiles,
  pdfBrowserArgs,
  pdfBrowserCandidates,
  renderStandaloneHtmlForFile,
  resolvePdfBrowserCommands,
  validateMarkVSpecFiles
} from "../src/index.js";

test("expands MarkVSpec file patterns", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-exporter-"));
  try {
    writeFileSync(join(dir, "a.vspec.md"), validScreen("SCR-A", "A"));
    writeFileSync(join(dir, "b.txt"), "ignore");
    assert.deepEqual(expandMarkVSpecFiles([join(dir, "*.vspec.md")]), [join(dir, "a.vspec.md")]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validates files with CI-ready exit code", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-validate-"));
  try {
    const okPath = join(dir, "ok.vspec.md");
    const brokenPath = join(dir, "broken.vspec.md");
    writeFileSync(okPath, validScreen("SCR-OK", "OK"));
    writeFileSync(brokenPath, `# Missing Front Matter\n`);

    assert.equal(validateMarkVSpecFiles([okPath]).exitCode, 0);
    const broken = validateMarkVSpecFiles([brokenPath]);
    assert.equal(broken.exitCode, 1);
    assert(broken.errorCount > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validation fails for missing or unmatched inputs", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-missing-"));
  try {
    const missing = validateMarkVSpecFiles([join(dir, "missing.vspec.md")]);
    assert.equal(missing.exitCode, 1);
    assert.match(missing.files[0]?.diagnostics[0]?.message ?? "", /does not exist/);

    const unmatched = validateMarkVSpecFiles([join(dir, "*.vspec.md")]);
    assert.equal(unmatched.exitCode, 1);
    assert.match(unmatched.files[0]?.diagnostics[0]?.message ?? "", /No MarkVSpec files matched/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports diagnostics using the document locale", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-localized-diagnostics-"));
  try {
    const sourcePath = join(dir, "ja.vspec.md");
    writeFileSync(sourcePath, `---
id: SCR-JA-DIAG
type: screen
title: Japanese Diagnostics
locale: ja
---
# SCR-JA-DIAG Japanese Diagnostics

## Actions

### A-Save Save

- From
  - idle
`);

    const result = renderStandaloneHtmlForFile(sourcePath);

    assert.match(result.html, /Action A-Save に trigger がありません/);
    assert.match(result.html, /<span class="mm-diagnostic-severity mm-diagnostic-severity-warning"><svg class="mm-icon mm-icon-triangle-alert" aria-hidden="true" viewBox="0 0 24 24">[\s\S]*?<\/svg>warning<\/span>/);
    assert.doesNotMatch(result.html, /Action A-Save has no trigger/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validation reports broken standalone template references", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-template-"));
  try {
    const sourcePath = join(dir, "screen.vspec.md");
    writeFileSync(sourcePath, `---
id: SCR-TEMPLATE
type: screen
title: Template screen
template:
  id: TPL-MISSING
  src: ./missing-template.vspec.md
---

# SCR-TEMPLATE Template screen
`);

    const result = validateMarkVSpecFiles([sourcePath]);
    assert.equal(result.exitCode, 1);
    assert(result.files[0]?.diagnostics.some((diagnostic) => diagnostic.message.includes("Template file")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validation reports standalone template ID mismatches", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-template-mismatch-"));
  try {
    const templatePath = join(dir, "template.vspec.md");
    const sourcePath = join(dir, "screen.vspec.md");
    writeFileSync(templatePath, `---
id: TPL-OTHER
type: template
title: Other template
---

# TPL-OTHER Other template
`);
    writeFileSync(sourcePath, `---
id: SCR-TEMPLATE
type: screen
title: Template screen
template:
  id: TPL-SHELL
  src: ./template.vspec.md
---

# SCR-TEMPLATE Template screen
`);

    const result = validateMarkVSpecFiles([sourcePath]);
    assert.equal(result.exitCode, 1);
    assert(result.files[0]?.diagnostics.some((diagnostic) => diagnostic.message.includes("Template reference TPL-SHELL points to file with template ID TPL-OTHER")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports standalone HTML with canonical template references", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-template-html-"));
  try {
    const templatePath = join(dir, "template.vspec.md");
    const sourcePath = join(dir, "screen.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(templatePath, templateShell());
    writeFileSync(sourcePath, `---
id: SCR-TEMPLATE
type: screen
title: Template screen
template:
  id: TPL-SHELL
  src: ./template.vspec.md
---

# SCR-TEMPLATE Template screen

## Slot: content

### L-Content Content

- stack
`);

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results.length, 1);
    const html = readFileSync(join(outDir, "screen.html"), "utf8");
    assert.match(html, /data-mm-id="L-Shell"/);
    assert.match(html, /data-mm-id="L-Content"/);
    assert.doesNotMatch(html, /<h2>Slots<\/h2>/);
    assert(!results[0]?.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports standalone HTML files", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));
    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results.length, 1);
    assert.equal(results[0]?.outputPath, join(outDir, "sample.html"));
    assert(existsSync(join(outDir, "sample.html")));
    const html = readFileSync(join(outDir, "sample.html"), "utf8");
    assert.match(html, /Sample/);
    assert.match(html, /class="doc-section state-screen-section"(?=[^>]*\bdata-state="idle")/);
    assert.match(html, /<section class="doc-section state-views-section">\s*<h2 id="state-views">State Views<\/h2>/);
    assert.match(html, /<h4 class="state-screen-heading">State: idle initial<\/h4>/);
    assert.match(html, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
    assert.match(html, /:root \{ --markvspec-heading-state-views: 20px; --markvspec-heading-viewport: 17px; --markvspec-heading-state: 15px; --markvspec-heading-detail: 13px; --markvspec-heading-badge: 11px; \}/);
    assert.match(html, /\.doc-section h2 \{ align-items: center; border-bottom: 1px solid #d1d5db; display: flex;/);
    assert.match(html, /\.state-viewport-section > h3 \{ align-items: center; display: flex; flex-wrap: wrap; font-size: var\(--markvspec-heading-viewport\); gap: 8px; margin: 22px 0 8px; \}/);
    assert.match(html, /\.state-screen-heading \{ align-items: center; display: flex; flex-wrap: wrap; font-size: var\(--markvspec-heading-state\); gap: 8px; margin: 0 0 12px; \}/);
    assert.match(html, /\.mm-inline-token \{ color: #0f766e; font-family: inherit; font-weight: 650; padding: 0 1px; \}/);
    assert.match(html, /@media print \{[\s\S]*:root \{ --markvspec-heading-state-views: 15pt; --markvspec-heading-viewport: 12\.5pt; --markvspec-heading-state: 11\.5pt; --markvspec-heading-detail: 10pt; --markvspec-heading-badge: 8\.5pt; \}/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports preview scenarios and scenario samples in standalone HTML", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-scenarios-"));
  try {
    const sourcePath = resolve("../../examples/02-states/scenario-samples.vspec.md");
    const outDir = join(dir, "out");
    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results.length, 1);
    assert(!results[0]?.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
    const html = readFileSync(join(outDir, "scenario-samples.html"), "utf8");
    const baselineLoaded = stateViewSection(html, "loaded");
    const emptyScenario = stateViewSection(html, "loaded / loaded-empty-account");
    const renewalScenario = stateViewSection(html, "loaded / loaded-renewal-risk");

    assert.match(html, /<h2>State Transitions<\/h2>/);
    assert.match(html, /initializing/);
    assert.match(html, /has-subscriptions/);
    assert.match(html, /empty/);
    assert.match(html, /initialize-error/);
    assert.match(html, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.has-subscriptions/);
    assert.match(html, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.empty/);
    assert.match(html, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.failure/);
    assert.doesNotMatch(html, /data-state-view-title="loaded \/ loaded"/);
    assert.match(baselineLoaded, /Morgan Lee/);
    assert.match(baselineLoaded, /Team Pro/);
    assert.match(baselineLoaded, /<h6 class="state-screen-detail-heading">Scenario Preview Data<\/h6>/);
    assert.match(baselineLoaded, /E-SubscriptionTable/);
    assert.match(baselineLoaded, /<code>rows: 2 rows<\/code>/);
    assert.match(baselineLoaded, /<section class="scenario-sample-rows-block" id="sample-rows-desktop-loaded-E-SubscriptionTable">/);
    assert.match(baselineLoaded, /<table class="spec-table scenario-sample-rows-table">/);
    assert.match(html, /\.scenario-sample-rows-table \{ font-size: 7pt; min-width: 0; table-layout: fixed; width: 100%; \}/);
    assert.match(baselineLoaded, /<th>Product<\/th><th>Seats<\/th><th>Renewal<\/th>/);
    assert.match(baselineLoaded, /<td>Workspace<\/td><td>8<\/td><td>2026-06-30<\/td>/);
    assert.match(baselineLoaded, /<td>Analytics<\/td><td>4<\/td><td>2026-07-15<\/td>/);
    assert(baselineLoaded.indexOf('<section class="scenario-sample-rows-block"') > baselineLoaded.indexOf("</table></div>"));
    assert.match(emptyScenario, /0 seats/);
    assert.match(emptyScenario, /<code>rows: \[\]<\/code>/);
    assert.match(emptyScenario, /<section class="scenario-sample-rows-block" id="sample-rows-desktop-loaded.20.2F.20loaded-empty-account-E-SubscriptionTable">/);
    assert.match(emptyScenario, /<td class="mm-table-empty" colspan="3">\(no data\)<\/td>/);
    assert.match(renewalScenario, /98 seats/);
    assert.doesNotMatch(emptyScenario, /Renewal attention required\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports source-kind metadata example in standalone HTML", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-source-kind-"));
  try {
    const sourcePath = resolve("../../examples/02-states/source-kind-metadata.vspec.md");
    const outDir = join(dir, "out");
    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results.length, 1);
    assert(!results[0]?.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
    const html = readFileSync(join(outDir, "source-kind-metadata.html"), "utf8");
    const loadedSection = stateViewSection(html, "loaded");
    assert.match(loadedSection, /Member source kinds/);
    assert.match(loadedSection, /Taylor Stone/);
    assert.match(loadedSection, /taylor@example\.com/);
    assert.match(loadedSection, /<h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
    assert.match(loadedSection, /<th>Marker\/ID<\/th><th>Location<\/th><th>Content<\/th><th>Format<\/th><th>Source<\/th><th>Condition<\/th>/);
    assert.doesNotMatch(loadedSection, /<th>Enabled When<\/th>/);
    for (const kind of ["fixed", "i18n", "data", "route", "element", "asset", "external", "computed"]) {
      assert.match(loadedSection, new RegExp(`mm-source-chip-${kind}`), kind);
    }
    assert.match(loadedSection, /asset catalog: member-avatar/);
    assert.match(loadedSection, /external status page URL/);
    assert.match(loadedSection, /currency USD/);
    assert.match(loadedSection, /date yyyy\/MM\/dd/);
    assert.match(loadedSection, /options[\s\S]*<strong>Options<\/strong>[\s\S]*Member \(i18n\)[\s\S]*Administrator \(i18n\)[\s\S]*mm-source-chip-i18n/);
    assert.doesNotMatch(loadedSection, /option label/);
    assert.doesNotMatch(html, /data-state-view-title="loaded \/ loaded-admin"/);
    assert.doesNotMatch(html, /data-state-view-title="loaded \/ loaded"/);
    assert.match(html, /Scenario Preview Data/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports localized scenario sample rows in standalone HTML", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-scenarios-ja-"));
  try {
    const sourcePath = join(dir, "scenario-samples-ja.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, `---
id: SCR-SCENARIO-SAMPLES-JA
type: screen
title: シナリオプレビューデータ
locale: ja
---

# SCR-SCENARIO-SAMPLES-JA シナリオプレビューデータ

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-Users

## Elements

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
  - E-Users:
    - rows:
      - row:
        - name: 一郎
      - row:
        - name: 二郎
`);

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results.length, 1);
    assert(!results[0]?.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
    const html = readFileSync(join(outDir, "scenario-samples-ja.html"), "utf8");
    const scenarioSection = stateViewSection(html, "loaded / loaded-special");

    assert.match(scenarioSection, /<h6 class="state-screen-detail-heading">シナリオプレビューデータ<\/h6>/);
    assert.match(scenarioSection, /<code>rows: 2 行<\/code>/);
    assert.match(scenarioSection, /<h6 class="scenario-sample-rows-heading">サンプル 行数:/);
    assert.match(scenarioSection, /<table class="spec-table scenario-sample-rows-table">/);
    assert.match(scenarioSection, /<th>名前<\/th>/);
    assert.match(scenarioSection, /<td>一郎<\/td>/);
    assert.match(scenarioSection, /<td>二郎<\/td>/);
    assert.doesNotMatch(scenarioSection, /2 rows/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports a project document list from screens templates and referenced partials", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-document-list-"));
  try {
    mkdirSync(join(dir, "screens"));
    mkdirSync(join(dir, "templates"));
    mkdirSync(join(dir, "partials"));
    const projectPath = join(dir, "markvspec.project.md");
    const outDir = join(dir, "out");
    writeFileSync(projectPath, `---
id: PRJ-DOC-LIST
type: project
title: Document List Project
templates:
  - id: TPL-SHELL
    path: templates/shell.vspec.md
screens:
  - id: SCR-SEARCH
    path: screens/search.vspec.md
---

# PRJ-DOC-LIST Document List Project
`);
    writeFileSync(join(dir, "screens", "search.vspec.md"), `---
id: SCR-SEARCH
type: screen
title: Search List
route: /members
references:
  partials:
    PRT-SUMMARY: ../partials/summary.partial.vspec.md
---

# SCR-SEARCH Search List

Search and **filter** [members](https://example.com) before opening a profile.

## States

- idle*

## History

### v0.1

- date: 2026-05-18
- author: Product

### v0.2

- date: 2026-05-17
- author: Product
`);
    writeFileSync(join(dir, "templates", "shell.vspec.md"), `---
id: TPL-SHELL
type: template
title: App Shell
references:
  partials:
    PRT-SUMMARY: ../partials/summary.partial.vspec.md
    PRT-ALERTS: ../partials/alerts.partial.vspec.md
---

# TPL-SHELL App Shell

Shared shell.

## States

- idle*
`);
    writeFileSync(join(dir, "partials", "summary.partial.vspec.md"), `---
id: PRT-SUMMARY
type: partial
title: Profile Summary
route: /members/:memberId/profile-summary
---

# PRT-SUMMARY Profile Summary

Refreshable profile summary partial.

## States

- loaded*
`);
    writeFileSync(join(dir, "partials", "alerts.partial.vspec.md"), `---
id: PRT-ALERTS
type: partial
title: Alerts
---

# PRT-ALERTS Alerts

## States

- loaded*
`);

    const result = exportMarkVSpecDocumentList(projectPath, outDir);
    assert.equal(result.outputPath, join(outDir, "document-list.md"));
    assert.equal(result.diagnostics.length, 0);
    assert.equal(readFileSync(result.outputPath, "utf8"), `# Document List

| No. | Kind | ID | Title | Summary | Route | Last Updated | File | Diagnostics |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Screen | SCR-SEARCH | Search List | Search and filter members before opening a profile. | /members | 2026-05-18 | screens/search.vspec.md | 0 errors / 0 warnings |
| 2 | Template | TPL-SHELL | App Shell | Shared shell. | - | - | templates/shell.vspec.md | 0 errors / 0 warnings |
| 3 | Partial | PRT-SUMMARY | Profile Summary | Refreshable profile summary partial. | /members/:memberId/profile-summary | - | partials/summary.partial.vspec.md | 0 errors / 0 warnings |
| 4 | Partial | PRT-ALERTS | Alerts | - | - | - | partials/alerts.partial.vspec.md | 0 errors / 0 warnings |
`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports parse coverage project sentinel in document list", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-coverage-document-list-"));
  try {
    const projectPath = resolve("../core/test-fixtures/parse-output-coverage/project/markvspec.project.md");
    const outDir = join(dir, "out");
    const result = exportMarkVSpecDocumentList(projectPath, outDir);
    const markdown = readFileSync(result.outputPath, "utf8");

    assert.equal(result.diagnostics.length, 0);
    assert.match(markdown, /SCR-COVERAGE-PROJECT \| Coverage Project Screen \| Project screen summary sentinel for document-list export\. \| \/coverage\/project/);
    assert.match(markdown, /TPL-COVERAGE-SHELL \| Coverage Shell Template \| Template summary sentinel for document-list export\./);
    assert.match(markdown, /PRT-COVERAGE-SUMMARY \| Coverage Summary Partial \| Partial summary sentinel for document-list export\. \| \/coverage\/summary/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("includes project load diagnostics in document list rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-document-list-diagnostics-"));
  try {
    mkdirSync(join(dir, "screens"));
    const projectPath = join(dir, "markvspec.project.md");
    const outDir = join(dir, "out");
    writeFileSync(projectPath, `---
id: PRJ-DOC-LIST-DIAG
type: project
title: Document List Diagnostics
screens:
  - id: SCR-MISSING
    path: screens/missing.vspec.md
---

# PRJ-DOC-LIST-DIAG Document List Diagnostics
`);

    const result = exportMarkVSpecDocumentList(projectPath, outDir);
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.diagnostics[0]?.message ?? "", /file not found/);
    assert.equal(readFileSync(result.outputPath, "utf8"), `# Document List

| No. | Kind | ID | Title | Summary | Route | Last Updated | File | Diagnostics |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Screen | SCR-MISSING | - | - | - | - | screens/missing.vspec.md | 1 errors / 0 warnings |
`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deduplicates missing referenced partial diagnostics in document list rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-document-list-partial-diagnostics-"));
  try {
    const projectPath = join(dir, "markvspec.project.md");
    const screenPath = join(dir, "screen.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(projectPath, `---
id: PRJ-DOC-LIST-PARTIAL-DIAG
type: project
title: Document List Partial Diagnostics
screens:
  - id: SCR-HOST
    path: screen.vspec.md
---

# PRJ-DOC-LIST-PARTIAL-DIAG Document List Partial Diagnostics
`);
    writeFileSync(screenPath, `---
id: SCR-HOST
type: screen
title: Host
references:
  partials:
    PRT-MISSING: missing.partial.vspec.md
---

# SCR-HOST Host

## States

- idle*

## Layout: desktop

### L-Host Host

- stack
- partial:
  - id: PRT-MISSING
  - states:
    - idle: loaded
`);

    const result = exportMarkVSpecDocumentList(projectPath, outDir);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(readFileSync(result.outputPath, "utf8"), `# Document List

| No. | Kind | ID | Title | Summary | Route | Last Updated | File | Diagnostics |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Screen | SCR-HOST | Host | - | - | - | screen.vspec.md | 0 errors / 0 warnings |
| 2 | Partial | PRT-MISSING | - | - | - | - | missing.partial.vspec.md | 1 errors / 0 warnings |
`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports standalone HTML with explicit renderer messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-messages-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const messagesPath = join(dir, "markvspec.messages.ja.yml");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));
    writeFileSync(messagesPath, `locale: ja
messages:
  wireframe: キャンバス
`);

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir, { messagesPath });

    assert.equal(results[0]?.messageSourcePath, messagesPath);
    const html = readFileSync(join(outDir, "sample.html"), "utf8");
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<!-- MarkVSpec messages: .*markvspec\.messages\.ja\.yml -->/);
    assert.match(html, /<h5 class="state-screen-subheading">キャンバス<\/h5>/);
    assert(results[0]?.diagnostics.some((diagnostic) => diagnostic.message.includes("does not match document locale")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports standalone HTML with front matter renderer messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-frontmatter-messages-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const messagesPath = join(dir, "screen.messages.yml");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, `---
id: SCR-SAMPLE
type: screen
title: Sample
messages: ./screen.messages.yml
---

# SCR-SAMPLE Sample

## States

- idle*

## Elements

### E-Title Heading

- sample: Sample
`);
    writeFileSync(messagesPath, `messages:
  wireframe: Canvas
`);

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);

    assert.equal(results[0]?.messageSourcePath, messagesPath);
    const html = readFileSync(join(outDir, "sample.html"), "utf8");
    assert.match(html, /<h5 class="state-screen-subheading">Canvas<\/h5>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects front matter renderer messages outside the MarkVSpec file directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-frontmatter-outside-"));
  try {
    const screenDir = join(dir, "screens");
    mkdirSync(screenDir);
    const sourcePath = join(screenDir, "sample.vspec.md");
    const messagesPath = join(dir, "markvspec.messages.yml");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, `---
id: SCR-SAMPLE
type: screen
title: Sample
messages: ../markvspec.messages.yml
---

# SCR-SAMPLE Sample

## States

- idle*

## Elements

### E-Title Heading

- sample: Sample
`);
    writeFileSync(messagesPath, `messages:
  wireframe: Canvas
`);

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir);
    const html = readFileSync(join(outDir, "sample.html"), "utf8");

    assert.equal(results[0]?.messageSourcePath, undefined);
    assert.match(html, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
    assert(results[0]?.diagnostics.some((diagnostic) => diagnostic.message.includes("outside the MarkVSpec file directory")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reports invalid renderer message files during HTML export", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-invalid-messages-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const messagesPath = join(dir, "markvspec.messages.yml");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));
    writeFileSync(messagesPath, "messages: [");

    const results = exportMarkVSpecHtmlFiles([sourcePath], outDir, { messagesPath });
    const html = readFileSync(join(outDir, "sample.html"), "utf8");

    assert.equal(results[0]?.messageSourcePath, undefined);
    assert.match(html, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
    assert.match(html, /Invalid renderer message YAML/);
    assert(results[0]?.diagnostics.some((diagnostic) => diagnostic.message.includes("Invalid renderer message YAML")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports state sections from the initial state even when default-state is set", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-initial-state-html-"));
  try {
    const sourcePath = join(dir, "state-order.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, defaultStateScreen());

    exportMarkVSpecHtmlFiles([sourcePath], outDir);
    const html = readFileSync(join(outDir, "state-order.html"), "utf8");
    const states = [...html.matchAll(/<section class="doc-section state-screen-section"[^>]*\bdata-state="([^"]+)"/g)].map((match) => match[1]);

    assert.deepEqual(states.slice(0, 3), ["initializing", "loading", "loaded"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports responsive design document sections for every viewport", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-responsive-html-"));
  try {
    const sourcePath = join(dir, "responsive.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, responsiveScreen());

    exportMarkVSpecHtmlFiles([sourcePath], outDir);
    const html = readFileSync(join(outDir, "responsive.html"), "utf8");

    assert.match(html, /<section class="doc-section state-screen-section"(?=[^>]*\bdata-state="idle")(?=[^>]*\bdata-viewport="mobile")(?=[^>]*\bstyle="--markvspec-viewport-width:390px;--markvspec-print-scale:1")/);
    assert.match(html, /<section class="doc-section state-screen-section"(?=[^>]*\bdata-state="idle")(?=[^>]*\bdata-viewport="desktop")(?=[^>]*\bstyle="--markvspec-viewport-width:960px;--markvspec-print-scale:1")/);
    assert.match(html, /@page \{ margin: 14mm; size: A4 landscape; \}/);
    assert.match(html, /\.toc-inline \{ break-after: page; break-inside: avoid; page-break-after: always; page-break-inside: avoid; \}/);
    assert.match(html, /\.history-section \{ break-before: page; page-break-before: always; \}/);
    assert.doesNotMatch(html, /\.state-screen-section \{ break-before: page; page-break-before: always; \}/);
    assert.doesNotMatch(html, /\.layout-spec-fragment, \.element-spec-fragment, \.action-spec-fragment \{ break-before: page; page-break-before: always; \}/);
    assert.match(html, /\.wireframe-print-section, \.action-detail, \.note-block, \.process-card \{ break-inside: avoid; page-break-inside: avoid; \}/);
    assert.match(html, /\.spec-table tr \{ break-inside: avoid; page-break-inside: avoid; \}/);
    assert.doesNotMatch(html, /\.spec-table-wrap, \.spec-table \{ break-inside: avoid; page-break-inside: avoid; \}/);
    assert.match(html, /\.spec-table \{ font-size: 8\.5pt; table-layout: auto; width: 100%; \}/);
    assert.match(html, /\.spec-table th,\s+\.spec-table td \{ box-sizing: border-box; overflow-wrap: break-word; padding: 4pt 5pt; word-break: normal; \}/);
    assert.match(html, /\.spec-table col\.spec-table-col-marker-id \{ width: 20%; \}/);
    assert.match(html, /\.spec-table col\.spec-table-col-id \{ width: 16%; \}/);
    assert.match(html, /\.spec-table \.mm-ref-chip, \.spec-table \.mm-chip, \.spec-table \.mm-detail-ref-id, \.spec-table \.mm-id \{ box-sizing: border-box; max-width: 100%; min-width: 0; overflow-wrap: break-word; white-space: normal; word-break: normal; \}/);
    assert.match(html, /\.spec-table \.mm-ref-chip \.mm-id \{ flex: 0 0 auto; overflow-wrap: normal; white-space: nowrap; width: auto; \}/);
    assert.match(html, /\.spec-table td > \.mm-ref-chip, \.spec-table td > \.mm-chip \{ display: flex; margin: 0 0 2pt; width: fit-content; \}/);
    assert.doesNotMatch(html, /\.state-screen-section:first-of-type/);
    assert.doesNotMatch(html, /@page markvspec-landscape/);
    assert.match(html, /\.wireframe-section \{ max-width: 100%; overflow-x: auto; overflow-y: visible; padding-bottom: 4px; scrollbar-color: #9ca3af #f3f4f6; scrollbar-width: thin; \}/);
    assert.match(html, /\.wireframe-section::-webkit-scrollbar-thumb \{ background: #9ca3af; border: 2px solid #f3f4f6; border-radius: 999px; \}/);
    assert.match(html, /@media print \{[\s\S]*html,\s+body,\s+main,\s+\.content,\s+\.preview,\s+\.document,\s+\.spec-table-wrap,\s+\.wireframe-section,\s+\.mermaid-render,\s+\.mermaid-source,\s+\.note-content,\s+\.entity-notes pre,\s+\.entity-overview pre \{ overflow: visible !important; scrollbar-width: none !important; -ms-overflow-style: none !important; \}/);
    assert.match(html, /@media print \{[\s\S]*html::-webkit-scrollbar,\s+body::-webkit-scrollbar,\s+main::-webkit-scrollbar,\s+\.content::-webkit-scrollbar,\s+\.preview::-webkit-scrollbar,\s+\.document::-webkit-scrollbar,\s+\.spec-table-wrap::-webkit-scrollbar,\s+\.wireframe-section::-webkit-scrollbar,\s+\.mermaid-render::-webkit-scrollbar,\s+\.mermaid-source::-webkit-scrollbar,\s+\.note-content::-webkit-scrollbar,\s+\.entity-notes pre::-webkit-scrollbar,\s+\.entity-overview pre::-webkit-scrollbar \{ display: none !important; height: 0 !important; width: 0 !important; \}/);
    assert.match(html, /\.wireframe-print-section \{ box-sizing: border-box; max-width: 100%; width: 100%; \}/);
    assert.doesNotMatch(html, /page: markvspec-landscape/);
    assert.doesNotMatch(html, /max-width: 269mm/);
    assert.match(html, /\.wireframe-section \.mm-wireframe \{ border: 1px solid #d1d5db; box-shadow: none; box-sizing: border-box; max-width: 100% !important; min-width: 0 !important; outline: 0; width: 100% !important; \}/);
    assert.match(html, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\) \{ max-width: none !important; width: var\(--markvspec-viewport-width, 100%\) !important; zoom: var\(--markvspec-print-scale, 1\); \}/);
    assert.match(html, /\.wireframe-section \.mm-element-wrap-table \{ align-self: stretch !important; box-sizing: border-box !important; display: block !important; max-width: 100% !important; min-width: 0 !important; width: 100% !important; \}/);
    assert.match(html, /\.wireframe-section \.mm-element-table \{ max-width: 100% !important; min-width: 0 !important; table-layout: fixed !important; width: 100% !important; \}/);
    assert.match(html, /<style>\s*@media print \{\s*\.wireframe-section \.mm-wireframe \{ border: 1px solid #d1d5db !important; box-shadow: none !important; box-sizing: border-box !important; max-width: 100% !important; min-width: 0 !important; outline: 0 !important; width: 100% !important; \}/);
    assert.match(html, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\) \{ max-width: none !important; width: var\(--markvspec-viewport-width, 100%\) !important; zoom: var\(--markvspec-print-scale, 1\) !important; \}/);
    assert.match(html, /\.wireframe-section \.mm-element-table th,\s+\.wireframe-section \.mm-element-table td \{ box-sizing: border-box; overflow-wrap: anywhere; word-break: break-word; \}/);
    assert.doesNotMatch(html, /<h2>Model Samples<\/h2>|Rows:|Sample Data/);
    assert.doesNotMatch(html, /model-sample-path-heading|U-001|U-002|Empty array/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export fails on output basename collisions", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-collision-"));
  try {
    const firstDir = join(dir, "first");
    const secondDir = join(dir, "second");
    const outDir = join(dir, "out");
    mkdirSync(firstDir);
    mkdirSync(secondDir);
    const firstPath = join(firstDir, "login.vspec.md");
    const secondPath = join(secondDir, "login.vspec.md");
    writeFileSync(firstPath, validScreen("SCR-LOGIN1", "Login One"));
    writeFileSync(secondPath, validScreen("SCR-LOGIN2", "Login Two"));

    assert.throws(() => exportMarkVSpecHtmlFiles([firstPath, secondPath], outDir), /Export output collision/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports PDF browser candidates and arguments", () => {
  assert(pdfBrowserCandidates("darwin").some((candidate) => candidate.command.includes("Google Chrome.app")));
  assert(pdfBrowserCandidates("linux").some((candidate) => candidate.command === "google-chrome"));
  assert.deepEqual(pdfBrowserArgs("/tmp/markvspec.html", "/tmp/markvspec.pdf"), [
    "--headless=new",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    "--no-pdf-header-footer",
    "--print-to-pdf=/tmp/markvspec.pdf",
    "file:///tmp/markvspec.html"
  ]);
});

test("exports all PDF pages in landscape orientation when a compatible browser is available", { skip: resolvePdfBrowserCommands(process.platform).length === 0 ? "No compatible browser available for PDF orientation regression." : false }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-responsive-pdf-"));
  try {
    const sourcePath = join(dir, "responsive.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, responsiveScreen());

    await exportMarkVSpecPdfFiles([sourcePath], outDir);

    const orientations = pdfPageOrientations(join(outDir, "responsive.pdf"));
    assert(orientations.length >= 3);
    assert(orientations.every((orientation) => orientation === "landscape"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("derives export base names", () => {
  assert.equal(defaultExportHtmlBaseName("/workspace/login.vspec.md"), "login");
  assert.equal(defaultExportHtmlBaseName("/workspace/admin.vspec.project.md"), "admin.project");
  assert.equal(defaultExportHtmlBaseName("/workspace/vspec.project.md"), "vspec.project");
});

function validScreen(id: string, title: string): string {
  return `---
id: ${id}
type: screen
title: ${title}
---

# ${id} ${title}

## States

- idle*

## Elements

### E-Title Heading

- sample: ${title}
`;
}

function templateShell(): string {
  return `---
id: TPL-SHELL
type: template
title: Shell
---

# TPL-SHELL Shell

## Layout: desktop

### L-Shell Shell wrapper

- stack

#### Items

- slot: content

## Slots

### content Main Content
`;
}

function defaultStateScreen(): string {
  return `---
id: SCR-STATE-ORDER
type: screen
title: State Order
default-state: loaded
---

# SCR-STATE-ORDER State Order

## States

- initializing*
- loading
- loaded

## Elements

### E-Message Text

- sample: State order
`;
}

function responsiveScreen(): string {
  return `---
id: SCR-RESPONSIVE
type: screen
title: Responsive
---

# SCR-RESPONSIVE Responsive

## States

- idle*
- loaded
- empty

## Layout: mobile

### L-Mobile Mobile

- stack

#### Items

- E-Title

## Layout: desktop

### L-Desktop Desktop

- stack

#### Items

- E-Title

## Elements

### 1:E-Title Heading

- sample: Responsive

`;
}

function stateViewSection(html: string, title: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state-view-title="${escapeRegExp(title)}")`, "u").exec(html);
  assert(startMatch, `Missing state view ${title}`);
  const start = startMatch.index;
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + startMatch[0].length);
  return html.slice(start, next === -1 ? undefined : next);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function pdfPageOrientations(pdfPath: string): Array<"portrait" | "landscape"> {
  const pdf = readFileSync(pdfPath, "latin1");
  const mediaBoxes = [...pdf.matchAll(/\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/gu)];
  return mediaBoxes.map((match) => {
    const width = Number(match[3]) - Number(match[1]);
    const height = Number(match[4]) - Number(match[2]);
    return width > height ? "landscape" : "portrait";
  });
}
