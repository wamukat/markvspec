import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { mkdirSync } from "node:fs";

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return process.argv[index + 1];
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractFirstWireframeSection(html) {
  const start = html.indexOf('<section class="wireframe-print-section">');
  if (start === -1) {
    throw new Error("Could not find the first wireframe-print-section in generated HTML.");
  }

  const sectionPattern = /<\/?section\b[^>]*>/giu;
  sectionPattern.lastIndex = start;
  let depth = 0;
  let sawStart = false;

  for (const match of html.matchAll(sectionPattern)) {
    if (match.index < start) {
      continue;
    }
    const tag = match[0];
    if (!tag.startsWith("</")) {
      depth += 1;
      sawStart = true;
    } else {
      depth -= 1;
    }
    if (sawStart && depth === 0) {
      return html.slice(start, match.index + tag.length);
    }
  }

  throw new Error("Could not find the end of the first wireframe-print-section.");
}

function sourceExcerpt(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const endMarkers = ["## Actions", "## Validations", "## Display Content Spec"];
  const endIndex = lines.findIndex((line) => endMarkers.includes(line.trim()));
  const selected = lines.slice(0, endIndex === -1 ? 90 : Math.min(endIndex, 120));
  return selected.join("\n").trimEnd();
}

const sourcePath = argValue("--source");
const htmlPath = argValue("--html");
const outPath = argValue("--out");

const markdown = readFileSync(sourcePath, "utf8");
const generatedHtml = readFileSync(htmlPath, "utf8");
const wireframeSection = extractFirstWireframeSection(generatedHtml);
const source = escapeHtml(sourceExcerpt(markdown));
const sourceFileName = escapeHtml(basename(sourcePath));

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkVSpec README Preview Capture</title>
  <style>
    :root {
      color: #111827;
      background: #f3f4f6;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f3f4f6; }
    .capture {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 20px;
      min-height: 100vh;
      padding: 24px;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
      min-width: 0;
      overflow: hidden;
    }
    .panel-header {
      align-items: center;
      background: #111827;
      color: #f9fafb;
      display: flex;
      font-size: 14px;
      font-weight: 700;
      height: 42px;
      justify-content: space-between;
      letter-spacing: 0;
      padding: 0 16px;
    }
    .panel-header span:last-child {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 600;
    }
    pre {
      background: #0f172a;
      color: #e5e7eb;
      font: 12px/1.45 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      height: calc(100vh - 90px);
      margin: 0;
      overflow: hidden;
      padding: 16px 18px;
      white-space: pre-wrap;
    }
    .wireframe-host {
      height: calc(100vh - 90px);
      overflow: hidden;
      padding: 20px 24px;
    }
    .wireframe-host h4 {
      font-size: 15px;
      margin: 0 0 8px;
    }
    .wireframe-host h5 {
      color: #374151;
      font-size: 13px;
      margin: 0 0 12px;
    }
    .wireframe-host .wireframe-section {
      overflow: visible;
    }
    .wireframe-host .mm-wireframe {
      margin: 0 auto;
      transform: scale(0.96);
      transform-origin: top center;
    }
  </style>
</head>
<body>
  <main class="capture">
    <section class="panel">
      <div class="panel-header"><span>Markdown source</span><span>${sourceFileName}</span></div>
      <pre>${source}</pre>
    </section>
    <section class="panel">
      <div class="panel-header"><span>Generated preview</span><span>State View wireframe</span></div>
      <div class="wireframe-host">
        ${wireframeSection}
      </div>
    </section>
  </main>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, page);
