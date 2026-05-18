import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.cwd();
const siteDir = join(root, "_site");
const examplesDir = join(root, "examples");
const examplesOutDir = join(siteDir, "examples");

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

function htmlFileName(filePath) {
  return `${basename(filePath, ".vspec.md")}.html`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderIndex(files) {
  const links = files
    .map((filePath) => {
      const repoPath = relative(root, filePath);
      const title = titleFromFile(filePath);
      const href = `examples/${htmlFileName(filePath)}`;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a><span>${escapeHtml(repoPath)}</span></li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkVSpec Examples</title>
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
    p {
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 24px;
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
      gap: 4px;
      padding: 14px 16px;
    }
    a {
      color: #0f766e;
      font-weight: 700;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    span {
      color: #6b7280;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <main>
    <h1>MarkVSpec Examples</h1>
    <p>Generated static HTML previews for the shipped MarkVSpec examples.</p>
    <ul>
${links}
    </ul>
  </main>
</body>
</html>
`;
}

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(examplesOutDir, { recursive: true });

const files = collectVspecFiles(examplesDir);
execFileSync("node", ["packages/cli/dist/index.js", "export", "html", "examples/**/*.vspec.md", "--out", examplesOutDir], {
  stdio: "inherit"
});
writeFileSync(join(siteDir, "index.html"), renderIndex(files));
