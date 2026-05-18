import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const githubBlobBaseUrl = "https://github.com/wamukat/markvspec/blob/main/";
const outputDir = join(root, "_site");
const siteSourceDir = join(root, "site");
const examplesDir = join(root, "examples");
const docsAssetsDir = join(root, "docs", "assets");
const examplesOutDir = join(outputDir, "examples");

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

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function renderExamplesIndex(files) {
  const groups = groupExampleFiles(files);
  const sections = groups
    .map(({ label, files: groupFiles }) => {
      const links = groupFiles
        .map((filePath) => {
          const repoPath = toPosixPath(relative(root, filePath));
          const title = titleFromFile(filePath);
          const href = htmlFileName(filePath);
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a><span>${escapeHtml(repoPath)}</span><a class="source" href="${githubBlobBaseUrl}${escapeHtml(repoPath)}">source</a></li>`;
        })
        .join("\n");

      return `<section>
      <h2>${escapeHtml(label)}</h2>
      <ul>
${links}
      </ul>
    </section>`;
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
    section {
      margin-top: 28px;
    }
    h2 {
      border-bottom: 1px solid #d1d5db;
      font-size: 18px;
      margin: 0 0 12px;
      padding-bottom: 8px;
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
      grid-template-columns: 1fr auto;
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
    .source {
      font-size: 13px;
      font-weight: 700;
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
    <h1>MarkVSpec Examples</h1>
    <p>Generated static HTML previews for the shipped MarkVSpec examples. Use the source links when you want to inspect the Markdown that produced each page.</p>
    ${sections}
  </main>
</body>
</html>
`;
}

function groupExampleFiles(files) {
  const groups = new Map();
  for (const filePath of files) {
    const relativeExamplePath = toPosixPath(relative(examplesDir, filePath));
    const [folder = "examples"] = relativeExamplePath.split("/");
    const label = folder.replace(/^\d+-/u, "").replaceAll("-", " ").replace(/\b\w/gu, (match) => match.toUpperCase());
    const group = groups.get(label) ?? [];
    group.push(filePath);
    groups.set(label, group);
  }

  return [...groups.entries()].map(([label, groupFiles]) => ({ label, files: groupFiles }));
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

const files = collectVspecFiles(examplesDir);
execFileSync("node", ["packages/cli/dist/index.js", "export", "html", "examples/**/*.vspec.md", "--out", examplesOutDir], {
  stdio: "inherit"
});
copySiteFiles();
copyDocsAssets();
writeFileSync(join(examplesOutDir, "index.html"), renderExamplesIndex(files));
