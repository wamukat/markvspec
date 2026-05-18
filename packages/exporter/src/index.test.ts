import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  defaultExportHtmlBaseName,
  expandMarkVSpecFiles,
  exportMarkVSpecPdfFiles,
  exportMarkVSpecHtmlFiles,
  pdfBrowserArgs,
  pdfBrowserCandidates,
  resolvePdfBrowserCommands,
  validateMarkVSpecFiles
} from "./index.js";

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
    const loadedScenario = stateViewSection(html, "loaded / loaded-standard-account");
    const emptyScenario = stateViewSection(html, "loaded / loaded-empty-account");
    const renewalScenario = stateViewSection(html, "loaded / loaded-renewal-risk");

    assert.match(loadedScenario, /<span class="state-badge">loaded-standard-account<\/span>/);
    assert.match(loadedScenario, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
    assert.match(loadedScenario, /E-SubscriptionTable/);
    assert.match(loadedScenario, /2 rows/);
    assert.match(emptyScenario, /0 seats/);
    assert.match(emptyScenario, /<code>rows: \[\]<\/code>/);
    assert.match(renewalScenario, /98 seats/);
    assert.doesNotMatch(emptyScenario, /Renewal attention required\./);
    assert.doesNotMatch(baselineLoaded, /Scenario Samples/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exports localized scenario sample row counts in standalone HTML", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-html-scenarios-ja-"));
  try {
    const sourcePath = join(dir, "scenario-samples-ja.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, `---
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

    assert.match(scenarioSection, /<h6 class="state-screen-detail-heading">シナリオサンプル<\/h6>/);
    assert.match(scenarioSection, /2 行/);
    assert.doesNotMatch(scenarioSection, /2 rows/);
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
