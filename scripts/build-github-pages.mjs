import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { loadExampleCatalog, resolveDocKey, validateExampleCatalog } from "./example-catalog.mjs";

const root = process.cwd();
const githubBlobBaseUrl = "https://github.com/wamukat/markvspec/blob/main/";
const outputDir = join(root, "_site");
const siteSourceDir = join(root, "site");
const brandAssetsDir = join(root, "assets");
const examplesDir = join(root, "examples");
const docsDir = join(root, "docs");
const docsAssetsDir = join(root, "docs", "assets");
const examplesOutDir = join(outputDir, "examples");
const examplesShowcaseOutDir = join(examplesOutDir, "showcase");
const brandIconPath = join("assets", "markvspec-icon.svg");

function collectVspecFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVspecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".vspec.md")) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function collectFiles(dir, predicate) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function frontMatterValue(markdown, key) {
  const frontMatter = markdown.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const line = frontMatter.split(/\r?\n/u).find((item) => item.startsWith(`${key}:`));
  if (!line) {
    return "";
  }
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/gu, "");
}

function titleFromFile(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  return frontMatterValue(markdown, "title") || frontMatterValue(markdown, "id") || basename(filePath, ".vspec.md");
}

function exampleMetadata(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  return {
    id: frontMatterValue(markdown, "id"),
    type: frontMatterValue(markdown, "type"),
    title: frontMatterValue(markdown, "title") || frontMatterValue(markdown, "id") || basename(filePath, ".vspec.md"),
    route: frontMatterValue(markdown, "route"),
    locale: frontMatterValue(markdown, "locale")
  };
}

function htmlFileName(filePath) {
  return `${basename(filePath, ".vspec.md")}.html`;
}

function assertUniqueOutputNames(files) {
  const ownersByName = new Map();
  for (const filePath of files) {
    const outputName = htmlFileName(filePath);
    const existingOwner = ownersByName.get(outputName);
    if (existingOwner) {
      throw new Error(`Example output name collision: ${outputName} is used by ${existingOwner} and ${filePath}.`);
    }
    ownersByName.set(outputName, filePath);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function outputRelativeHref(fromOutputPath, targetOutputPath) {
  return toPosixPath(relative(dirname(fromOutputPath), targetOutputPath)) || basename(targetOutputPath);
}

function renderExamplesIndex(files, catalogIndex) {
  const learningPathFiles = orderLearningPathFiles(files, catalogIndex);
  const learningPathItems = learningPathFiles.map((filePath, index) => renderExampleIndexCard(filePath, catalogIndex, { step: index + 1 })).join("\n");
  const stageSections = groupExampleFilesByStage(files, catalogIndex)
    .map(({ label, files: stageFiles }) => {
      const kindGroups = groupFilesByKind(stageFiles, catalogIndex)
        .map(({ label: kindLabel, files: kindFiles }) => {
          const links = kindFiles.map((filePath) => renderExampleIndexCard(filePath, catalogIndex)).join("\n");
          return `<div class="kind-group">
        <h3>${escapeHtml(kindLabel)}</h3>
        <ul>
${links}
        </ul>
      </div>`;
        })
        .join("\n");

      return `<section>
      <h2>${escapeHtml(label)}</h2>
      ${kindGroups}
    </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkVSpec Examples</title>
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <style>
    :root {
      color: #1f2937;
      background: #f8fafc;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
    }
    main {
      margin: 0 auto;
      max-width: 960px;
      padding: 40px 24px 64px;
    }
    h1 {
      font-size: 32px;
      line-height: 1.2;
      margin: 0 0 8px;
    }
    .page-title {
      align-items: center;
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }
    .page-title img {
      border-radius: 8px;
      display: block;
      height: 38px;
      width: 38px;
    }
    p {
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    section {
      margin-top: 28px;
    }
    h2 {
      border-bottom: 1px solid #d1d5db;
      font-size: 18px;
      margin: 0 0 12px;
      padding-bottom: 8px;
    }
    h3 {
      color: #374151;
      font-size: 13px;
      letter-spacing: .02em;
      margin: 16px 0 8px;
      text-transform: uppercase;
    }
    ul {
      display: grid;
      gap: 10px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      display: grid;
      gap: 6px;
      grid-template-columns: 1fr;
      padding: 14px 16px;
    }
    .card-title {
      align-items: baseline;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .summary {
      color: #4b5563;
      font-size: 13px;
      margin: 0;
    }
    .teaches {
      color: #6b7280;
      font-size: 12px;
      margin: 0;
    }
    .pill {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 999px;
      color: #3730a3;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
    }
    a {
      color: #0f766e;
      font-weight: 700;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .source {
      font-size: 13px;
      font-weight: 700;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      grid-column: 1 / -1;
    }
    .primary {
      color: #115e59;
    }
    span {
      color: #6b7280;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      grid-column: 1 / -1;
    }
  </style>
</head>
<body>
  <main>
    <div class="page-title">
      <img src="../assets/markvspec-icon.svg" alt="" width="38" height="38">
      <h1>MarkVSpec Examples</h1>
    </div>
    <p>Generated example showcases for the shipped MarkVSpec examples. Open Source + Preview to compare the Markdown source with the generated HTML output, or use Preview when you only need the rendered document.</p>
    <section>
      <h2>Learning Path</h2>
      <ul>
${learningPathItems}
      </ul>
    </section>
    ${stageSections}
  </main>
</body>
</html>
`;
}

function renderExampleIndexCard(filePath, catalogIndex, { step } = {}) {
  const repoPath = toPosixPath(relative(root, filePath));
  const entry = catalogEntryForFile(catalogIndex, filePath);
  const title = entry?.title ?? titleFromFile(filePath);
  const href = htmlFileName(filePath);
  const showcaseHref = `showcase/${href}`;
  const pdfHref = pdfFileName(filePath);
  const pdfLink = existsSync(join(examplesOutDir, pdfHref))
    ? `<a class="source" href="${escapeHtml(pdfHref)}">PDF</a>`
    : "";
  const stepPill = step ? `<span class="pill">Step ${step}</span>` : "";
  const kindPill = entry?.kind ? `<span class="pill">${escapeHtml(entry.kind)}</span>` : "";
  const summary = entry?.summary ? `<p class="summary">${escapeHtml(entry.summary)}</p>` : "";
  const teaches = entry?.teaches?.length
    ? `<p class="teaches">Teaches: ${escapeHtml(entry.teaches.join(", "))}</p>`
    : "";

  return `<li>
        <div class="card-title"><a href="${escapeHtml(showcaseHref)}">${escapeHtml(title)}</a>${stepPill}${kindPill}</div>
        ${summary}
        ${teaches}
        <span>${escapeHtml(repoPath)}</span>
        <div class="actions"><a class="source primary" href="${escapeHtml(showcaseHref)}">Source + Preview</a><a class="source" href="${escapeHtml(href)}">Preview</a>${pdfLink}<a class="source" href="${githubBlobBaseUrl}${escapeHtml(repoPath)}">Source</a></div>
      </li>`;
}

function pdfFileName(filePath) {
  return `${basename(filePath, ".vspec.md")}.pdf`;
}

function renderShowcasePage(filePath, files, catalogIndex) {
  const markdown = readFileSync(filePath, "utf8");
  const repoPath = toPosixPath(relative(root, filePath));
  const relativeExamplePath = toPosixPath(relative(examplesDir, filePath));
  const metadata = exampleMetadata(filePath);
  const catalogEntry = catalogEntryForFile(catalogIndex, filePath);
  const previewHref = `../${htmlFileName(filePath)}`;
  const pdfHref = `../${pdfFileName(filePath)}`;
  const pdfLink = existsSync(join(examplesOutDir, pdfFileName(filePath)))
    ? `<a class="button-link" href="${escapeHtml(pdfHref)}">Download PDF</a>`
    : "";
  const metaPills = [
    metadata.id,
    metadata.type,
    catalogEntry?.kind ? `kind ${catalogEntry.kind}` : "",
    catalogEntry?.stage ? `stage ${catalogEntry.stage}` : "",
    metadata.route ? `route ${metadata.route}` : "",
    metadata.locale ? `locale ${metadata.locale}` : ""
  ]
    .filter(Boolean)
      .map((value) => `<span class="pill">${escapeHtml(value)}</span>`)
      .join("\n          ");
  const learningPanel = renderShowcaseLearningPanel(catalogEntry, catalogIndex);
  const exampleSidebar = renderExampleSidebar(filePath, files, catalogIndex);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metadata.title)} - MarkVSpec Example Showcase</title>
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg">
  <style>
    :root {
      --page: #f6f7f9;
      --paper: #ffffff;
      --ink: #172033;
      --muted: #617083;
      --line: #d6dde8;
      --line-soft: #e9edf3;
      --accent: #2563eb;
      --code-bg: #101827;
      --code-ink: #e8eef8;
      --code-muted: #95a3b8;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--page);
      color: var(--ink);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .site-header {
      background: var(--paper);
      border-bottom: 1px solid var(--line);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .site-header-inner {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin: 0 auto;
      max-width: 1440px;
      padding: 12px 24px;
    }
    .brand {
      align-items: center;
      display: grid;
      gap: 2px 9px;
      grid-template-columns: 30px 1fr;
    }
    .brand img {
      border-radius: 7px;
      grid-row: 1 / span 2;
      height: 30px;
      width: 30px;
    }
    .brand strong { font-size: 15px; }
    .brand span { color: var(--muted); font-size: 12px; }
    .top-nav,
    .example-actions,
    .pane-tools {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .nav-link,
    .button-link,
    .small-link {
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 650;
      gap: 6px;
      line-height: 1.2;
      padding: 7px 11px;
      text-decoration: none;
      white-space: nowrap;
    }
    .nav-link,
    .small-link {
      background: #fff;
      color: #334155;
    }
    .button-link {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    main {
      display: grid;
      gap: 18px;
      grid-template-columns: 260px minmax(0, 1fr);
      margin: 0 auto;
      max-width: 1440px;
      padding: 22px 24px 40px;
    }
    .example-sidebar {
      align-self: start;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      max-height: calc(100vh - 92px);
      overflow: auto;
      padding: 14px;
      position: sticky;
      top: 70px;
    }
    .example-sidebar-title {
      color: var(--ink);
      display: block;
      font-size: 14px;
      font-weight: 750;
      margin-bottom: 12px;
    }
    .example-sidebar-section {
      border-top: 1px solid var(--line-soft);
      padding: 12px 0;
    }
    .example-sidebar-section:first-of-type {
      border-top: 0;
      padding-top: 0;
    }
    .example-sidebar-heading {
      color: var(--muted);
      font-size: 11px;
      font-weight: 750;
      letter-spacing: .04em;
      margin: 0 0 7px;
      text-transform: uppercase;
    }
    .example-sidebar ul {
      display: grid;
      gap: 3px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .example-sidebar a {
      border-radius: 6px;
      color: #334155;
      display: block;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.35;
      padding: 6px 8px;
    }
    .example-sidebar a[aria-current="page"] {
      background: #eaf1ff;
      color: var(--accent);
    }
    .example-main {
      min-width: 0;
    }
    .example-header {
      align-items: end;
      display: grid;
      gap: 14px;
      grid-template-columns: minmax(0, 1fr) auto;
      margin-bottom: 18px;
    }
    .breadcrumb {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 26px;
      letter-spacing: 0;
      line-height: 1.25;
      margin: 0;
    }
    .subtitle {
      color: var(--muted);
      margin: 8px 0 0;
      max-width: 760px;
    }
    .meta-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .pill {
      align-items: center;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: #334155;
      display: inline-flex;
      font-size: 12px;
      font-weight: 650;
      gap: 5px;
      padding: 4px 9px;
    }
    .split {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(360px, .9fr) minmax(520px, 1.1fr);
      min-height: calc(100vh - 185px);
    }
    .learning-panel {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 18px;
    }
    .learning-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .learning-card h2 {
      font-size: 13px;
      margin: 0 0 8px;
    }
    .learning-card ul {
      display: grid;
      gap: 6px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .learning-card li {
      color: var(--muted);
      font-size: 13px;
    }
    .pane {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .05);
      min-width: 0;
      overflow: hidden;
    }
    .pane-header {
      align-items: center;
      background: #fbfcfe;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      min-height: 48px;
      padding: 10px 14px;
    }
    .pane-title { display: grid; gap: 1px; }
    .pane-title strong { font-size: 13px; }
    .pane-title span { color: var(--muted); font-size: 11px; }
    .source-wrap {
      background: var(--code-bg);
      color: var(--code-ink);
      height: calc(100vh - 252px);
      min-height: 520px;
      overflow: auto;
      scrollbar-color: #64748b #111827;
      scrollbar-width: thin;
    }
    .source-wrap::-webkit-scrollbar,
    .preview-frame-wrap::-webkit-scrollbar {
      height: 10px;
      width: 10px;
    }
    .source-wrap::-webkit-scrollbar-track { background: #111827; }
    .source-wrap::-webkit-scrollbar-thumb {
      background: #64748b;
      border: 2px solid #111827;
      border-radius: 999px;
    }
    pre {
      font-size: 0;
      line-height: 0;
      margin: 0;
      min-width: 620px;
      padding: 12px 0;
      tab-size: 2;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0;
      line-height: 0;
    }
    .line {
      display: grid;
      font-size: 12px;
      grid-template-columns: 44px minmax(0, 1fr);
      height: 18px;
      line-height: 18px;
    }
    .line-no {
      color: var(--code-muted);
      padding-right: 12px;
      text-align: right;
      user-select: none;
    }
    .line-code {
      border-left: 1px solid rgba(148, 163, 184, .22);
      padding: 0 18px;
      white-space: pre;
    }
    .line-no,
    .line-code {
      display: block;
      min-width: 0;
    }
    .preview-frame-wrap {
      background: #eef2f7;
      height: calc(100vh - 252px);
      min-height: 520px;
      overflow: auto;
      padding: 0;
      scrollbar-color: #94a3b8 #eef2f7;
      scrollbar-width: thin;
    }
    .preview-frame-wrap::-webkit-scrollbar-track { background: #eef2f7; }
    .preview-frame-wrap::-webkit-scrollbar-thumb {
      background: #94a3b8;
      border: 2px solid #eef2f7;
      border-radius: 999px;
    }
    iframe {
      background: #fff;
      border: 0;
      display: block;
      height: 100%;
      min-height: 520px;
      width: 100%;
    }
    @media (max-width: 1000px) {
      main {
        grid-template-columns: 1fr;
      }
      .example-sidebar {
        max-height: none;
        position: static;
      }
      .example-header {
        align-items: start;
        grid-template-columns: 1fr;
      }
      .example-actions { justify-content: flex-start; }
      .learning-panel { grid-template-columns: 1fr; }
      .split { grid-template-columns: 1fr; }
      .source-wrap,
      .preview-frame-wrap {
        height: auto;
        max-height: 680px;
      }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="site-header-inner">
      <div class="brand">
        <img src="../../assets/markvspec-icon.svg" alt="" width="30" height="30">
        <strong>MarkVSpec Examples</strong>
        <span>Source and generated preview, side by side</span>
      </div>
      <nav class="top-nav" aria-label="Example navigation">
        <a class="nav-link" href="../">Examples</a>
        <a class="nav-link" href="../../docs/en/start/">Start</a>
        <a class="nav-link" href="../../docs/en/guide/">Guide</a>
        <a class="nav-link" href="../../docs/en/reference/">Reference</a>
      </nav>
    </div>
  </header>

  <main>
    ${exampleSidebar}
    <div class="example-main">
      <section class="example-header">
        <div>
          <div class="breadcrumb">Examples / ${escapeHtml(relativeExamplePath)}</div>
          <h1>${escapeHtml(metadata.title)}</h1>
          <p class="subtitle">${escapeHtml(catalogEntry?.summary ?? "Compare the MarkVSpec Markdown source on the left with the generated HTML preview on the right.")}</p>
          <div class="meta-row" aria-label="Example metadata">
            ${metaPills}
          </div>
        </div>
        <div class="example-actions">
          ${pdfLink}
          <a class="nav-link" href="${escapeHtml(previewHref)}">Open preview only</a>
          <a class="nav-link" href="${githubBlobBaseUrl}${escapeHtml(repoPath)}">View on GitHub</a>
        </div>
      </section>

      ${learningPanel}

      <section class="split" aria-label="Source and generated preview">
        <article class="pane" aria-label="VSpec source">
          <div class="pane-header">
            <div class="pane-title">
              <strong>${escapeHtml(basename(filePath))}</strong>
              <span>Markdown source</span>
            </div>
            <div class="pane-tools">
              <a class="small-link" href="${githubBlobBaseUrl}${escapeHtml(repoPath)}">Source</a>
            </div>
          </div>
          <div class="source-wrap">
            <pre><code>${renderSourceLines(markdown)}</code></pre>
          </div>
        </article>

        <article class="pane" aria-label="Generated HTML preview">
          <div class="pane-header">
            <div class="pane-title">
              <strong>Generated HTML Preview</strong>
              <span>Latest output from the same Pages build</span>
            </div>
            <div class="pane-tools">
              <a class="small-link" href="${escapeHtml(previewHref)}">Open full page</a>
            </div>
          </div>
          <div class="preview-frame-wrap">
            <iframe src="${escapeHtml(previewHref)}" title="${escapeHtml(metadata.title)} generated HTML preview"></iframe>
          </div>
        </article>
      </section>
    </div>
  </main>
</body>
</html>
`;
}

function renderShowcaseLearningPanel(entry, catalogIndex) {
  if (!entry) {
    return "";
  }

  const teaches = entry.teaches?.length
    ? entry.teaches.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")
    : `<li>No catalog teaches metadata.</li>`;
  const docs = renderRelatedDocLinks(entry, "../../");
  const next = renderNextExampleLinks(entry, catalogIndex);

  return `<section class="learning-panel" aria-label="Learning links">
      <article class="learning-card">
        <h2>What this teaches</h2>
        <ul>
          ${teaches}
        </ul>
      </article>
      <article class="learning-card">
        <h2>Related docs</h2>
        <ul>
          ${docs || "<li>No related docs.</li>"}
        </ul>
      </article>
      <article class="learning-card">
        <h2>Next examples</h2>
        <ul>
          ${next || "<li>No next example.</li>"}
        </ul>
      </article>
    </section>`;
}

function renderExampleSidebar(currentFilePath, files, catalogIndex) {
  const groups = groupExampleFilesByStage(files, catalogIndex)
    .map(({ label, files: stageFiles }) => {
      const items = stageFiles
        .map((filePath) => {
          const entry = catalogEntryForFile(catalogIndex, filePath);
          const title = entry?.title ?? titleFromFile(filePath);
          const ariaCurrent = filePath === currentFilePath ? ' aria-current="page"' : "";
          return `<li><a href="${escapeHtml(htmlFileName(filePath))}"${ariaCurrent}>${escapeHtml(title)}</a></li>`;
        })
        .join("\n          ");

      return `<section class="example-sidebar-section">
        <p class="example-sidebar-heading">${escapeHtml(label)}</p>
        <ul>
          ${items}
        </ul>
      </section>`;
    })
    .join("\n      ");

  return `<aside class="example-sidebar" aria-label="Example navigation">
      <a class="example-sidebar-title" href="../">All Examples</a>
      ${groups}
    </aside>`;
}

function renderRelatedDocLinks(entry, prefix) {
  if (!entry.docs) {
    return "";
  }

  const links = [];
  for (const [group, keys] of Object.entries(entry.docs)) {
    for (const key of keys) {
      const resolved = resolveDocKey(root, "en", group, key);
      if (!resolved) {
        continue;
      }
      const relativeDocPath = toPosixPath(relative(docsDir, resolved.path));
      const href = `${prefix}docs/${toPosixPath(markdownOutputPath(relativeDocPath))}`;
      links.push(`<li><a href="${escapeHtml(href)}">${escapeHtml(`${titleize(group)}: ${titleize(key)}`)}</a></li>`);
    }
  }
  return links.join("\n          ");
}

function renderNextExampleLinks(entry, catalogIndex) {
  if (!entry.next?.length) {
    return "";
  }

  return entry.next
    .map((nextPath) => {
      const nextEntry = catalogIndex.get(nextPath);
      const href = htmlFileName(nextPath);
      const title = nextEntry?.title ?? basename(nextPath, ".vspec.md");
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></li>`;
    })
    .join("\n          ");
}

function renderSourceLines(markdown) {
  return markdown
    .split(/\r?\n/u)
    .map((line, index) => {
      const lineNumber = index + 1;
      return `<span class="line"><span class="line-no">${lineNumber}</span><span class="line-code">${escapeHtml(line)}</span></span>`;
    })
    .join("");
}

function buildCatalogIndex(catalog) {
  return new Map(catalog.examples.map((entry) => [entry.path, entry]));
}

function catalogEntryForFile(catalogIndex, filePath) {
  return catalogIndex.get(toPosixPath(relative(root, filePath)));
}

function orderLearningPathFiles(files, catalogIndex) {
  const filesByRepoPath = new Map(files.map((filePath) => [toPosixPath(relative(root, filePath)), filePath]));
  const learningPathEntries = [...catalogIndex.values()].filter((entry) => entry.learningPath && filesByRepoPath.has(entry.path));
  const learningPathPaths = new Set(learningPathEntries.map((entry) => entry.path));
  const pointedTo = new Set();
  for (const entry of learningPathEntries) {
    for (const nextPath of entry.next ?? []) {
      if (learningPathPaths.has(nextPath)) {
        pointedTo.add(nextPath);
      }
    }
  }

  const orderedPaths = [];
  const visited = new Set();
  const starts = learningPathEntries.filter((entry) => !pointedTo.has(entry.path));
  for (const start of starts) {
    let current = start;
    while (current && !visited.has(current.path)) {
      orderedPaths.push(current.path);
      visited.add(current.path);
      const nextPath = (current.next ?? []).find((path) => learningPathPaths.has(path) && !visited.has(path));
      current = nextPath ? catalogIndex.get(nextPath) : undefined;
    }
  }

  for (const entry of learningPathEntries) {
    if (!visited.has(entry.path)) {
      orderedPaths.push(entry.path);
    }
  }

  return orderedPaths.map((repoPath) => filesByRepoPath.get(repoPath)).filter(Boolean);
}

function groupExampleFilesByStage(files, catalogIndex) {
  const groups = new Map();
  for (const filePath of files) {
    const entry = catalogEntryForFile(catalogIndex, filePath);
    const relativeExamplePath = toPosixPath(relative(examplesDir, filePath));
    const [folder = "examples"] = relativeExamplePath.split("/");
    const label = titleize(entry?.stage ?? folder.replace(/^\d+-/u, ""));
    const group = groups.get(label) ?? [];
    group.push(filePath);
    groups.set(label, group);
  }

  return [...groups.entries()].map(([label, groupFiles]) => ({ label, files: groupFiles }));
}

function groupFilesByKind(files, catalogIndex) {
  const groups = new Map();
  for (const filePath of files) {
    const label = catalogEntryForFile(catalogIndex, filePath)?.kind ?? "screen";
    const group = groups.get(label) ?? [];
    group.push(filePath);
    groups.set(label, group);
  }
  return [...groups.entries()].map(([label, groupFiles]) => ({ label, files: groupFiles }));
}

function titleize(value) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (match) => match.toUpperCase());
}

function copySiteFiles() {
  const siteFiles = collectFiles(siteSourceDir, (filePath) => {
    return filePath.endsWith(".html")
      || filePath.endsWith(".png")
      || filePath.endsWith(".svg")
      || filePath.endsWith(".css")
      || filePath.endsWith(".js");
  });

  for (const filePath of siteFiles) {
    const targetPath = join(outputDir, relative(siteSourceDir, filePath));
    mkdirSync(dirname(targetPath), { recursive: true });
    if (filePath.endsWith(".html")) {
      writeFileSync(targetPath, rewriteHtmlMarkdownLinks(filePath, readFileSync(filePath, "utf8")), "utf8");
    } else {
      copyFileSync(filePath, targetPath);
    }
  }
}

function copyDocsAssets() {
  const assetFiles = collectFiles(docsAssetsDir, (filePath) => {
    return filePath.endsWith(".png")
      || filePath.endsWith(".svg")
      || filePath.endsWith(".css")
      || filePath.endsWith(".js");
  });

  for (const filePath of assetFiles) {
    const targetPath = join(outputDir, "docs", "assets", relative(docsAssetsDir, filePath));
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(filePath, targetPath);
  }
}

function copyBrandAssets() {
  const assetFiles = collectFiles(brandAssetsDir, (filePath) => {
    return filePath.endsWith(".png") || filePath.endsWith(".svg");
  });

  for (const filePath of assetFiles) {
    const targetPath = join(outputDir, "assets", relative(brandAssetsDir, filePath));
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(filePath, targetPath);
  }

  copyFileSync(join(brandAssetsDir, "markvspec-icon.svg"), join(outputDir, "favicon.svg"));
}

function renderMarkdownDocs() {
  const markdownFiles = collectFiles(docsDir, (filePath) => {
    return filePath.endsWith(".md");
  });

  for (const filePath of markdownFiles) {
    const relativeDocPath = relative(docsDir, filePath);
    const targetPath = join(outputDir, "docs", markdownOutputPath(relativeDocPath));
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, renderMarkdownPage(filePath, readFileSync(filePath, "utf8")), "utf8");
  }
}

function markdownOutputPath(relativeDocPath) {
  return basename(relativeDocPath) === "README.md"
    ? join(dirname(relativeDocPath), "index.html")
    : relativeDocPath.replace(/\.md$/u, ".html");
}

const docsNavigation = [
  {
    title: "Start",
    paths: ["README.md", "start/index.md", "start/first-screen.md", "start/preview.md", "start/export.md"]
  },
  {
    title: "Guide",
    paths: ["guide/index.md", "guide/markdown-model.md", "guide/document-structure.html", "guide/states.md", "guide/layout.md", "guide/elements.md", "guide/actions.md", "guide/validation.md", "guide/partial-updates.md"]
  },
  {
    title: "Reference",
    paths: ["reference/index.md", "reference/file-format.md", "reference/sections.md", "reference/elements.md", "reference/actions.md", "reference/validations.md", "reference/rules.md", "reference/ids.md", "reference/cli.md", "reference/limitations.md"]
  },
  {
    title: "Recipes",
    paths: ["recipes/index.md", "recipes/login-form.md", "recipes/loading-error.md", "recipes/server-partial-update.md", "recipes/pdf-export.md"]
  },
  {
    title: "More",
    paths: ["examples/index.md", "concepts/index.md"]
  }
];

function renderDocsSidebar(filePath) {
  const relativeDocPath = toPosixPath(relative(docsDir, filePath));
  const [lang] = relativeDocPath.split("/");
  if (!["ja", "en"].includes(lang)) {
    return "";
  }

  const currentWithinLang = relativeDocPath.slice(lang.length + 1);
  const sourceOutputPath = join("docs", markdownOutputPath(relative(docsDir, filePath)));
  const iconHref = outputRelativeHref(sourceOutputPath, brandIconPath);
  const sections = docsNavigation
    .map((section) => {
      const items = section.paths
        .map((path) => {
          const isStaticHtml = path.endsWith(".html");
          const sourcePath = isStaticHtml ? join(siteSourceDir, "docs", lang, path) : join(docsDir, lang, path);
          if (!existsSync(sourcePath)) {
            return "";
          }

          const targetOutputPath = join("docs", isStaticHtml ? join(lang, path) : markdownOutputPath(join(lang, path)));
          const href = toPosixPath(relative(dirname(sourceOutputPath), targetOutputPath)) || "index.html";
          const ariaCurrent = path === currentWithinLang ? ' aria-current="page"' : "";
          const title = isStaticHtml ? htmlPageTitle(sourcePath) : markdownPageTitle(sourcePath);
          return `<li><a href="${escapeHtml(href)}"${ariaCurrent}>${escapeHtml(title)}</a></li>`;
        })
        .filter(Boolean)
        .join("\n          ");

      return `<section class="docs-sidebar-section">
        <p class="docs-sidebar-heading">${escapeHtml(section.title)}</p>
        <ul>
          ${items}
        </ul>
      </section>`;
    })
    .join("\n      ");

  const homeHref = toPosixPath(relative(dirname(sourceOutputPath), join("docs", lang, "index.html"))) || "index.html";
  return `<aside class="docs-sidebar" aria-label="Documentation navigation">
      <a class="docs-sidebar-title" href="${escapeHtml(homeHref)}"><img src="${escapeHtml(iconHref)}" alt="" width="26" height="26"> MarkVSpec Docs</a>
      ${sections}
    </aside>`;
}

function htmlPageTitle(filePath) {
  const html = readFileSync(filePath, "utf8");
  return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/iu)?.[1]?.replace(/<[^>]+>/gu, "").trim()
    ?? html.match(/<title>([\s\S]*?)<\/title>/iu)?.[1]?.trim()
    ?? basename(filePath, ".html");
}

function markdownPageTitle(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  const title = markdown.match(/^#\s+(.+)$/mu)?.[1] ?? basename(filePath, ".md");
  return stripMarkdownInline(title);
}

function renderMarkdownPage(filePath, markdown) {
  const title = markdown.match(/^#\s+(.+)$/mu)?.[1] ?? basename(filePath, ".md");
  const sidebar = renderDocsSidebar(filePath);
  const outputPath = join("docs", markdownOutputPath(relative(docsDir, filePath)));
  const faviconHref = outputRelativeHref(outputPath, "favicon.svg");
  return `<!doctype html>
<html lang="${filePath.includes(`${docsDir}/ja/`) ? "ja" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(stripMarkdownInline(title))} - MarkVSpec Docs</title>
  <link rel="icon" type="image/svg+xml" href="${escapeHtml(faviconHref)}">
  <style>
    :root {
      color: #172033;
      background: #f8fafc;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
    }
    .docs-shell {
      display: grid;
      gap: 24px;
      grid-template-columns: 260px minmax(0, 880px);
      margin: 32px auto 64px;
      max-width: 1180px;
      padding: 0 24px;
    }
    .docs-sidebar {
      align-self: start;
      background: #fff;
      border: 1px solid #d7dee8;
      border-radius: 8px;
      max-height: calc(100vh - 64px);
      overflow: auto;
      padding: 18px;
      position: sticky;
      top: 32px;
    }
    .docs-sidebar-title {
      align-items: center;
      color: #172033;
      display: flex;
      font-size: 15px;
      font-weight: 800;
      gap: 8px;
      margin-bottom: 14px;
    }
    .docs-sidebar-title img {
      border-radius: 6px;
      display: block;
      flex: none;
    }
    .docs-sidebar-section {
      border-top: 1px solid #e5eaf1;
      padding: 12px 0;
    }
    .docs-sidebar-section:first-of-type {
      border-top: 0;
      padding-top: 0;
    }
    .docs-sidebar-heading {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .04em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }
    .docs-sidebar ul {
      display: grid;
      gap: 3px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .docs-sidebar a {
      border-radius: 6px;
      color: #334155;
      display: block;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.35;
      padding: 6px 8px;
    }
    .docs-sidebar a[aria-current="page"] {
      background: #e8f7f4;
      color: #0f766e;
    }
    .docs-content {
      background: #fff;
      border: 1px solid #d7dee8;
      border-radius: 8px;
      padding: 32px;
    }
    h1 {
      font-size: 34px;
      line-height: 1.2;
      margin: 0 0 20px;
    }
    h2 {
      border-top: 1px solid #e5eaf1;
      font-size: 22px;
      margin: 30px 0 12px;
      padding-top: 22px;
    }
    h3 {
      font-size: 18px;
      margin: 24px 0 10px;
    }
    p,
    li {
      color: #44546a;
      line-height: 1.7;
    }
    a {
      color: #0f766e;
      font-weight: 700;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    blockquote {
      background: #f1f5f9;
      border-left: 4px solid #0f766e;
      margin: 18px 0;
      padding: 10px 16px;
    }
    code {
      background: #edf2f7;
      border-radius: 4px;
      padding: 2px 5px;
    }
    pre {
      background: #101827;
      border-radius: 8px;
      color: #e8eef8;
      overflow-x: auto;
      padding: 16px;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    figure {
      margin: 18px 0 24px;
    }
    figure img {
      border: 1px solid #d7dee8;
      border-radius: 8px;
      display: block;
      height: auto;
      max-width: 100%;
    }
    @media (max-width: 720px) {
      .docs-shell {
        display: block;
        margin: 0;
        padding: 0;
      }
      .docs-sidebar {
        border-left: 0;
        border-radius: 0;
        border-right: 0;
        max-height: none;
        position: static;
      }
      .docs-content {
        border-left: 0;
        border-radius: 0;
        border-right: 0;
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="docs-shell">
    ${sidebar}
    <main class="docs-content">
${renderMarkdownBody(filePath, markdown)}
    </main>
  </div>
</body>
</html>
`;
}

function stripMarkdownInline(value) {
  return value.replace(/`([^`]+)`/gu, "$1").replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1");
}

function renderMarkdownBody(filePath, markdown) {
  const lines = markdown.split(/\r?\n/u);
  const html = [];
  let paragraph = [];
  let listItems = [];
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${renderMarkdownInline(filePath, paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      html.push("<ul>");
      for (const item of listItems) {
        html.push(`  <li>${renderMarkdownInline(filePath, item)}</li>`);
      }
      html.push("</ul>");
      listItems = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/u);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderMarkdownInline(filePath, heading[2])}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/u);
    if (image) {
      flushParagraph();
      flushList();
      html.push(`<figure><img src="${escapeHtml(resolveMarkdownHref(filePath, image[2]))}" alt="${escapeHtml(image[1])}"></figure>`);
      continue;
    }

    const listItem = line.match(/^-\s+(.+)$/u);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/u);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${renderMarkdownInline(filePath, quote[1])}</p></blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return html.join("\n");
}

function renderMarkdownInline(filePath, value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/gu, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, (_match, label, href) => {
      return `<a href="${escapeHtml(resolveMarkdownHref(filePath, href))}">${label}</a>`;
    });
}

function resolveMarkdownHref(filePath, href) {
  if (/^[a-z][a-z0-9+.-]*:/iu.test(href) || href.startsWith("#")) {
    return href;
  }

  const [pathPart, hashPart = ""] = href.split("#", 2);
  const absoluteTarget = resolve(dirname(filePath), pathPart);
  const relativeTarget = toPosixPath(relative(root, absoluteTarget));
  const hash = hashPart ? `#${hashPart}` : "";

  if (relativeTarget.startsWith("docs/") && pathPart.endsWith(".md")) {
    const targetHtml = join("docs", markdownOutputPath(relative("docs", relativeTarget)));
    const sourceHtml = join(outputDir, "docs", markdownOutputPath(relative(docsDir, filePath)));
    return toPosixPath(relative(dirname(sourceHtml), join(outputDir, targetHtml))) + hash;
  }

  if (pathPart.endsWith(".md")) {
    return `${githubBlobBaseUrl}${relativeTarget}${hash}`;
  }

  return href;
}

function rewriteHtmlMarkdownLinks(htmlPath, html) {
  return html.replace(/\bhref="([^"]+\.md(?:#[^"]*)?)"/gu, (match, href) => {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(href) || href.startsWith("#")) {
      return match;
    }

    const [pathPart, hashPart = ""] = href.split("#", 2);
    const absoluteTarget = resolve(dirname(htmlPath), pathPart);
    const relativeTarget = toRepositoryPath(absoluteTarget);
    if (relativeTarget.startsWith("../")) {
      return match;
    }

    const hash = hashPart ? `#${hashPart}` : "";
    return `href="${githubBlobBaseUrl}${relativeTarget}${hash}"`;
  });
}

function toRepositoryPath(absolutePath) {
  const relativeTarget = toPosixPath(relative(root, absolutePath));
  return relativeTarget.startsWith("site/") ? relativeTarget.slice("site/".length) : relativeTarget;
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(examplesOutDir, { recursive: true });
mkdirSync(examplesShowcaseOutDir, { recursive: true });

const files = collectVspecFiles(examplesDir);
assertUniqueOutputNames(files);
const catalog = loadExampleCatalog(root);
const { errors: catalogErrors, warnings: catalogWarnings } = validateExampleCatalog(catalog, { root, exampleFiles: files });
if (catalogErrors.length > 0) {
  throw new Error(`Example catalog validation failed:\n- ${catalogErrors.join("\n- ")}`);
}
for (const warning of catalogWarnings) {
  console.warn(`Example catalog warning: ${warning}`);
}
console.log(`Loaded ${catalog.examples.length} example catalog entries.`);
const catalogIndex = buildCatalogIndex(catalog);
execFileSync("node", ["packages/cli/dist/index.js", "export", "html", "examples/**/*.vspec.md", "--out", examplesOutDir], {
  stdio: "inherit"
});
for (const filePath of files) {
  writeFileSync(join(examplesShowcaseOutDir, htmlFileName(filePath)), renderShowcasePage(filePath, files, catalogIndex), "utf8");
}
renderMarkdownDocs();
copySiteFiles();
copyDocsAssets();
copyBrandAssets();
writeFileSync(join(examplesOutDir, "index.html"), renderExamplesIndex(files, catalogIndex));
