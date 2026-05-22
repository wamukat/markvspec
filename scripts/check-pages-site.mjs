import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { loadExampleCatalog, validateExampleCatalog } from "./example-catalog.mjs";

const root = process.cwd();
const siteDir = join(root, "_site");
const failures = [];
const base = "/markvspec";

const requiredFiles = [
  "index.html",
  "favicon.svg",
  "assets/markvspec-icon.svg",
  "examples/index.html",
  "examples/assets/markvspec-preview.css",
  "examples/assets/markvspec-mermaid.js",
  "examples/assets/markvspec-mermaid-runtime.js",
  "examples/source/01-basics/hello-screen.vspec.md",
  "examples/generated/hello-screen.html",
  "examples/dynamic/hello-screen.html/index.html",
  "examples/experimental/editor/hello-screen.html/index.html",
  "examples/showcase/hello-screen.html/index.html",
  "pagefind/pagefind.js",
  "pagefind/pagefind-entry.json",
  "ja/start/index.html",
  "en/start/index.html",
  "ja/guide/index.html",
  "en/guide/index.html",
  "ja/reference/index.html",
  "en/reference/index.html",
  "ja/recipes/index.html",
  "en/recipes/index.html",
  "ja/examples/index.html",
  "en/examples/index.html",
  "ja/concepts/index.html",
  "en/concepts/index.html",
];

const catalog = loadExampleCatalog(root);
const exampleSources = collectFiles(join(root, "examples"), (filePath) => filePath.endsWith(".vspec.md"));
const { errors: catalogErrors, warnings: catalogWarnings } = validateExampleCatalog(catalog, { root, exampleFiles: exampleSources });
for (const error of catalogErrors) {
  failures.push(`examples/catalog.yml: ${error}`);
}
for (const warning of catalogWarnings) {
  console.warn(`examples/catalog.yml warning: ${warning}`);
}

for (const filePath of requiredFiles) {
  expectFile(filePath);
}

const jaDocs = collectDocsMarkdown("ja");
const enDocs = collectDocsMarkdown("en");
expectSameList(jaDocs, enDocs, "docs-site ja/en content paths should match");

const examplesHtml = readSiteFile("examples/index.html");
expectContains(examplesHtml, "MarkVSpec Examples", "_site/examples/index.html should be the examples index.");
expectContains(examplesHtml, "examples/01-basics/hello-screen.vspec.md", "_site/examples/index.html should show the source path.");
expectContains(examplesHtml, `${base}/examples/showcase/hello-screen.html`, "_site/examples/index.html should link to the Hello Screen showcase.");
expectNotContains(examplesHtml, "Source + Preview", "_site/examples/index.html should not duplicate showcase link labels on cards.");
expectNotContains(examplesHtml, ">Preview<", "_site/examples/index.html should not expose preview-only card links.");
expectNotContains(examplesHtml, ">PDF<", "_site/examples/index.html should not expose PDF card links.");
expectNotContains(examplesHtml, `${base}/examples/generated/`, "_site/examples/index.html should not link generated artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/generated/hello-screen.html`, "_site/examples/index.html should not link generated HTML artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/generated/hello-screen.pdf`, "_site/examples/index.html should not link generated PDF artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/experimental/editor/`, "_site/examples/index.html should not expose the experimental editor route.");
expectNotContains(examplesHtml, "github.com/wamukat/markvspec/blob/", "_site/examples/index.html should not link GitHub source blobs from cards.");
expectContains(examplesHtml, "Learning Path", "_site/examples/index.html should expose the catalog learning path.");
expectContains(examplesHtml, "Step 1", "_site/examples/index.html should number learning path examples.");
expectOrder(
  examplesHtml,
  ["Hello Screen", "Step 1", "Async Fetching", "Step 2", "Responsive Profile", "Step 3", "Form Submit Flow", "Step 4"],
  "_site/examples/index.html should order the learning path from catalog next links."
);

const generatedExamplesDir = join(siteDir, "examples", "generated");
const generatedHtml = readdirSync(generatedExamplesDir).filter((entry) => entry.endsWith(".html") && !entry.endsWith(".pdf-source.html")).sort();
const directExampleHtml = readdirSync(join(siteDir, "examples"))
  .filter((entry) => entry.endsWith(".html") && entry !== "index.html")
  .sort();
const generatedPdfArtifacts = collectFiles(join(siteDir, "examples"), (filePath) => filePath.endsWith(".pdf") || filePath.endsWith(".pdf-source.html"));
if (generatedHtml.length !== exampleSources.length) {
  failures.push(`_site/examples/generated should contain one HTML artifact per example (${exampleSources.length} expected, ${generatedHtml.length} found).`);
}
if (directExampleHtml.length > 0) {
  failures.push(`_site/examples should not contain duplicated direct example HTML artifacts: ${directExampleHtml.join(", ")}`);
}
if (generatedPdfArtifacts.length > 0) {
  failures.push(`_site/examples should not contain generated PDF artifacts: ${generatedPdfArtifacts.map((filePath) => toPosixPath(relative(siteDir, filePath))).join(", ")}`);
}
for (const fileName of generatedHtml) {
  const html = readSiteFile(join("examples", "generated", fileName));
  expectContains(html, '<link rel="stylesheet" href="../assets/markvspec-preview.css">', `_site/examples/generated/${fileName} should use the shared preview stylesheet.`);
  expectContains(html, '<script src="../assets/markvspec-mermaid.js"></script>', `_site/examples/generated/${fileName} should use the shared Mermaid runtime asset.`);
  expectContains(html, '<script src="../assets/markvspec-mermaid-runtime.js"></script>', `_site/examples/generated/${fileName} should use the shared Mermaid initializer asset.`);
  expectContains(html, '<nav class="toc-inline"', `_site/examples/generated/${fileName} should include an inline table of contents.`);
  expectContains(html, 'href="#state-views"', `_site/examples/generated/${fileName} table of contents should link to state views.`);
  expectNotContains(html, "function prepareBlock(block)", `_site/examples/generated/${fileName} should not inline the Mermaid initializer runtime.`);
}

const pagefindIndexDir = join(siteDir, "pagefind", "index");
const pagefindIndexFiles = existsSync(pagefindIndexDir)
  ? collectFiles(pagefindIndexDir, (filePath) => filePath.endsWith(".pf_index"))
  : [];
if (pagefindIndexFiles.length === 0) {
  failures.push("_site/pagefind/index should contain Pagefind search index artifacts.");
}

const showcaseFiles = collectFiles(join(siteDir, "examples", "showcase"), (filePath) => filePath.endsWith("index.html"));
if (showcaseFiles.length !== exampleSources.length) {
  failures.push(`_site/examples/showcase should contain one Astro showcase per example (${exampleSources.length} expected, ${showcaseFiles.length} found).`);
}

const helloShowcaseHtml = readSiteFile("examples/showcase/hello-screen.html/index.html");
expectContains(helloShowcaseHtml, "Source and dynamic preview, side by side", "_site/examples/showcase/hello-screen.html should be a dynamic-first showcase page.");
expectContains(helloShowcaseHtml, 'class="example-sidebar ', "_site/examples/showcase/hello-screen.html should show example navigation.");
expectContains(helloShowcaseHtml, 'data-sidebar-toggle', "_site/examples/showcase/hello-screen.html should expose a sidebar collapse toggle.");
expectContains(helloShowcaseHtml, 'aria-controls="example-sidebar-content"', "_site/examples/showcase/hello-screen.html sidebar toggle should target the sidebar content.");
expectContains(helloShowcaseHtml, 'aria-label="Hide example navigation"', "_site/examples/showcase/hello-screen.html sidebar toggle should have an accessible label.");
expectContains(helloShowcaseHtml, 'aria-current="page"', "_site/examples/showcase/hello-screen.html sidebar should mark the current example.");
expectContains(helloShowcaseHtml, 'id="dynamic-preview-config"', "_site/examples/showcase/hello-screen.html should expose runtime configuration.");
expectContains(helloShowcaseHtml, 'data-dynamic-preview-output', "_site/examples/showcase/hello-screen.html should include the dynamic preview output container.");
expectContains(helloShowcaseHtml, 'data-dynamic-preview-fallback', "_site/examples/showcase/hello-screen.html should include the generated preview fallback container.");
expectContains(helloShowcaseHtml, '"/markvspec/examples/source/01-basics/hello-screen.vspec.md"', "_site/examples/showcase/hello-screen.html should fetch the public source asset.");
expectContains(helloShowcaseHtml, '"dynamicPreviewEnabled":true', "_site/examples/showcase/hello-screen.html should enable browser dynamic rendering.");
expectContains(helloShowcaseHtml, '<iframe src="/markvspec/examples/generated/hello-screen.html"', "_site/examples/showcase/hello-screen.html should embed the generated preview artifact as fallback.");
expectNotContains(helloShowcaseHtml, 'href="/markvspec/examples/dynamic/hello-screen.html"', "_site/examples/showcase/hello-screen.html should not expose the compatibility dynamic route as primary navigation.");
expectContains(helloShowcaseHtml, 'href="https://raw.githubusercontent.com/wamukat/markvspec/main/examples/01-basics/hello-screen.vspec.md"', "_site/examples/showcase/hello-screen.html Source link should use the raw GitHub URL.");
expectContains(helloShowcaseHtml, 'href="https://github.com/wamukat/markvspec/blob/main/examples/01-basics/hello-screen.vspec.md"', "_site/examples/showcase/hello-screen.html should keep a normal GitHub view link.");
expectNotContains(helloShowcaseHtml, 'href="/markvspec/examples/experimental/editor/hello-screen.html"', "_site/examples/showcase/hello-screen.html should not expose the experimental editor route.");
expectNotContains(helloShowcaseHtml, 'href="/markvspec/examples/generated/hello-screen.pdf"', "_site/examples/showcase/hello-screen.html should not link generated PDF artifacts.");
expectContains(helloShowcaseHtml, '<span class="line-no ', "_site/examples/showcase/hello-screen.html should show source line numbers.");
expectContains(helloShowcaseHtml, "SCR-HELLO", "_site/examples/showcase/hello-screen.html should render source text.");
expectContains(helloShowcaseHtml, "English: Guide / Markdown Model", "_site/examples/showcase/hello-screen.html should link to related English guide docs.");
expectContains(helloShowcaseHtml, "Japanese: Guide / Markdown Model", "_site/examples/showcase/hello-screen.html should link to related Japanese guide docs.");
expectContains(helloShowcaseHtml, 'href="/markvspec/en/guide/markdown-model/"', "_site/examples/showcase/hello-screen.html should use the Starlight English guide URL.");
expectContains(helloShowcaseHtml, 'href="/markvspec/ja/guide/markdown-model/"', "_site/examples/showcase/hello-screen.html should use the Starlight Japanese guide URL.");
expectContains(helloShowcaseHtml, "Async Fetching", "_site/examples/showcase/hello-screen.html should link to the next example.");

const scenarioShowcaseHtml = readSiteFile("examples/showcase/scenario-samples.html/index.html");
expectContains(scenarioShowcaseHtml, "English: Guide / Scenarios", "_site/examples/showcase/scenario-samples.html should link the scenario guide.");
expectContains(scenarioShowcaseHtml, 'href="/markvspec/en/guide/scenarios/"', "_site/examples/showcase/scenario-samples.html should use the Starlight scenario URL.");

const templateShowcaseHtml = readSiteFile("examples/showcase/profile-page-with-template.html/index.html");
expectContains(templateShowcaseHtml, '"dynamicPreviewEnabled":false', "_site/examples/showcase/profile-page-with-template.html should keep generated fallback primary until browser composition is available.");
expectContains(templateShowcaseHtml, 'source composition is not available in the browser runtime yet', "_site/examples/showcase/profile-page-with-template.html should explain why it uses the generated fallback.");
expectContains(templateShowcaseHtml, '<iframe src="/markvspec/examples/generated/profile-page-with-template.html"', "_site/examples/showcase/profile-page-with-template.html should embed the composed generated preview fallback.");

const dynamicExamplesDir = join(siteDir, "examples", "dynamic");
const editorExamplesDir = join(siteDir, "examples", "experimental", "editor");
const sourceExamplesDir = join(siteDir, "examples", "source");
const dynamicPages = collectFiles(dynamicExamplesDir, (filePath) => filePath.endsWith("index.html"));
const editorPages = collectFiles(editorExamplesDir, (filePath) => filePath.endsWith("index.html"));
const sourceArtifacts = collectFiles(sourceExamplesDir, (filePath) => filePath.endsWith(".vspec.md"));
if (dynamicPages.length !== exampleSources.length) {
  failures.push(`_site/examples/dynamic should contain one dynamic preview page per example (${exampleSources.length} expected, ${dynamicPages.length} found).`);
}
if (editorPages.length !== exampleSources.length) {
  failures.push(`_site/examples/experimental/editor should contain one editor PoC page per example (${exampleSources.length} expected, ${editorPages.length} found).`);
}
if (sourceArtifacts.length !== exampleSources.length) {
  failures.push(`_site/examples/source should contain one source asset per example (${exampleSources.length} expected, ${sourceArtifacts.length} found).`);
}

const helloDynamicHtml = readSiteFile("examples/dynamic/hello-screen.html/index.html");
expectContains(helloDynamicHtml, "Read-only Dynamic Preview", "_site/examples/dynamic/hello-screen.html should be the dynamic preview page.");
expectContains(helloDynamicHtml, 'data-pagefind-ignore', "_site/examples/dynamic/hello-screen.html should keep runtime preview content out of Pagefind indexing.");
expectContains(helloDynamicHtml, 'data-sidebar-toggle', "_site/examples/dynamic/hello-screen.html should expose a sidebar collapse toggle.");
expectContains(helloDynamicHtml, 'aria-controls="example-sidebar-content"', "_site/examples/dynamic/hello-screen.html sidebar toggle should target the sidebar content.");
expectContains(helloDynamicHtml, 'aria-label="Hide example navigation"', "_site/examples/dynamic/hello-screen.html sidebar toggle should have an accessible label.");
expectContains(helloDynamicHtml, 'id="dynamic-preview-config"', "_site/examples/dynamic/hello-screen.html should expose runtime configuration.");
expectContains(helloDynamicHtml, '"/markvspec/examples/source/01-basics/hello-screen.vspec.md"', "_site/examples/dynamic/hello-screen.html should fetch the public source asset.");
expectContains(helloDynamicHtml, '"/markvspec/examples/generated/hello-screen.html"', "_site/examples/dynamic/hello-screen.html should keep the generated preview fallback.");
expectContains(helloDynamicHtml, 'href="https://raw.githubusercontent.com/wamukat/markvspec/main/examples/01-basics/hello-screen.vspec.md"', "_site/examples/dynamic/hello-screen.html Source link should use the raw GitHub URL.");
const dynamicScriptPath = dynamicScriptArtifactPath(helloDynamicHtml);
if (!dynamicScriptPath) {
  failures.push("_site/examples/dynamic/hello-screen.html should include the dynamic preview browser script.");
} else {
  const { gzipBytes } = moduleGraphSize(dynamicScriptPath);
  if (gzipBytes > 140 * 1024) {
    failures.push(`dynamic preview browser script gzip size should stay within 140 KiB (${formatKiB(gzipBytes)} found).`);
  }
}

const helloEditorHtml = readSiteFile("examples/experimental/editor/hello-screen.html/index.html");
expectContains(helloEditorHtml, "Online Live Editor PoC", "_site/examples/experimental/editor/hello-screen.html should be the editor PoC page.");
expectContains(helloEditorHtml, 'data-pagefind-ignore', "_site/examples/experimental/editor/hello-screen.html should keep the editor PoC out of Pagefind indexing.");
expectContains(helloEditorHtml, 'id="online-live-editor-config"', "_site/examples/experimental/editor/hello-screen.html should expose editor runtime configuration.");
expectContains(helloEditorHtml, 'data-online-editor-source', "_site/examples/experimental/editor/hello-screen.html should include the source editor.");
expectContains(helloEditorHtml, 'data-online-editor-preview', "_site/examples/experimental/editor/hello-screen.html should include the live preview pane.");
expectContains(helloEditorHtml, 'data-online-editor-diagnostics', "_site/examples/experimental/editor/hello-screen.html should include diagnostics.");
expectContains(helloEditorHtml, 'Native textarea for this PoC', "_site/examples/experimental/editor/hello-screen.html should record the editor library decision.");
expectContains(helloEditorHtml, '"/markvspec/examples/source/01-basics/hello-screen.vspec.md"', "_site/examples/experimental/editor/hello-screen.html should load the public source asset.");
expectContains(helloEditorHtml, 'href="https://raw.githubusercontent.com/wamukat/markvspec/main/examples/01-basics/hello-screen.vspec.md"', "_site/examples/experimental/editor/hello-screen.html Source link should use the raw GitHub URL.");
const editorScriptPath = editorScriptArtifactPath(helloEditorHtml);
if (!editorScriptPath) {
  failures.push("_site/examples/experimental/editor/hello-screen.html should include the online live editor browser script.");
} else {
  const { gzipBytes } = moduleGraphSize(editorScriptPath);
  if (gzipBytes > 150 * 1024) {
    failures.push(`online live editor browser script gzip size should stay within 150 KiB (${formatKiB(gzipBytes)} found).`);
  }
}

for (const docsExamplesPath of ["ja/examples/index.html", "en/examples/index.html"]) {
  const html = readSiteFile(docsExamplesPath);
  expectContains(html, "/markvspec/examples/", `${docsExamplesPath} should link to the generated example catalog.`);
  expectContains(html, "/markvspec/examples/showcase/hello-screen.html", `${docsExamplesPath} should link to example showcases.`);
}

for (const filePath of [
  "index.html",
  "examples/index.html",
  "examples/showcase/hello-screen.html/index.html",
  "examples/showcase/scenario-samples.html/index.html",
  "ja/start/index.html",
  "en/start/index.html",
  "ja/guide/index.html",
  "en/guide/index.html",
  "ja/reference/index.html",
  "en/reference/index.html",
]) {
  expectLocalLinks(filePath);
}

if (existsSync(join(siteDir, "docs"))) {
  failures.push("_site/docs should not be generated by the Starlight Pages build.");
}

if (failures.length > 0) {
  console.error("Pages site check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Pages site check passed (${generatedHtml.length} generated example pages, ${showcaseFiles.length} showcase pages).`);

function expectFile(filePath, message = `Missing _site artifact: ${filePath}`) {
  if (!existsSync(join(siteDir, filePath))) {
    failures.push(message);
  }
}

function readSiteFile(filePath) {
  const absolutePath = join(siteDir, filePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing _site artifact: ${filePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function expectContains(value, expected, message) {
  if (!value.includes(expected)) {
    failures.push(message);
  }
}

function expectNotContains(value, expected, message) {
  if (value.includes(expected)) {
    failures.push(message);
  }
}

function expectOrder(value, expectedParts, message) {
  let lastIndex = -1;
  for (const part of expectedParts) {
    const index = value.indexOf(part, lastIndex + 1);
    if (index === -1 || index < lastIndex) {
      failures.push(message);
      return;
    }
    lastIndex = index;
  }
}

function expectSameList(left, right, message) {
  const leftOnly = left.filter((item) => !right.includes(item));
  const rightOnly = right.filter((item) => !left.includes(item));
  if (leftOnly.length > 0 || rightOnly.length > 0) {
    failures.push(`${message}. leftOnly=${JSON.stringify(leftOnly)} rightOnly=${JSON.stringify(rightOnly)}`);
  }
}

function collectDocsMarkdown(lang) {
  const docsRoot = join(root, "docs-site", "src", "content", "docs", lang);
  return collectFiles(docsRoot, (filePath) => filePath.endsWith(".md"))
    .map((filePath) => toPosixPath(relative(docsRoot, filePath)))
    .sort();
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

function expectLocalLinks(filePath) {
  const absolutePath = join(siteDir, filePath);
  const html = readSiteFile(filePath);
  const hrefPattern = /\bhref="([^"]+)"/gu;
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1];
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("data:")) {
      continue;
    }
    if (href.includes("/_astro/") || href.includes("/pagefind/")) {
      continue;
    }
    const target = artifactPathForHref(href, absolutePath);
    if (target && !existsSync(target)) {
      failures.push(`${filePath} links to missing local artifact: ${href}`);
    }
  }
}

function artifactPathForHref(href, sourcePath) {
  const [withoutHash] = href.split("#", 1);
  const [pathPart] = withoutHash.split("?", 1);
  if (!pathPart) {
    return undefined;
  }

  if (pathPart.startsWith(base)) {
    return artifactPathForSitePath(pathPart.slice(base.length));
  }

  if (pathPart.startsWith("/")) {
    return artifactPathForSitePath(pathPart);
  }

  return artifactPathForSitePath(toPosixPath(`/${relative(siteDir, join(dirname(sourcePath), pathPart))}`));
}

function artifactPathForSitePath(sitePath) {
  let normalized = sitePath;
  if (normalized === "" || normalized === "/") {
    normalized = "/index.html";
  } else if (normalized.endsWith("/")) {
    normalized += "index.html";
  } else if (!extname(normalized)) {
    normalized += "/index.html";
  }

  const directPath = join(siteDir, normalized);
  if (existsSync(directPath)) {
    return directPath;
  }

  const directoryIndexPath = join(siteDir, `${normalized}/index.html`);
  if (existsSync(directoryIndexPath)) {
    return directoryIndexPath;
  }

  return directPath;
}

function dynamicScriptArtifactPath(html) {
  const scriptMatch = html.match(/<script type="module" src="([^"]*dynamic-preview[^"]*|[^"]*_slug_[^"]*\.js)"><\/script>/u);
  if (!scriptMatch) {
    return undefined;
  }
  return artifactPathForHref(scriptMatch[1], join(siteDir, "examples", "dynamic", "hello-screen.html", "index.html"));
}

function editorScriptArtifactPath(html) {
  const scriptMatch = html.match(/<script type="module" src="([^"]*online-live-editor[^"]*|[^"]*_slug_[^"]*\.js)"><\/script>/u);
  if (!scriptMatch) {
    return undefined;
  }
  return artifactPathForHref(scriptMatch[1], join(siteDir, "examples", "experimental", "editor", "hello-screen.html", "index.html"));
}

function moduleGraphSize(entryPath, visited = new Set()) {
  if (visited.has(entryPath)) {
    return { bytes: 0, gzipBytes: 0 };
  }
  visited.add(entryPath);

  const source = readFileSync(entryPath);
  const text = source.toString("utf8");
  let bytes = source.byteLength;
  let gzipBytes = gzipSync(source).byteLength;
  const importPattern = /\b(?:import|from)\s*(?:\([^)]*\)|[^'"]*)['"](\.\/[^'"]+)['"]/gu;
  for (const match of text.matchAll(importPattern)) {
    const childPath = artifactPathForHref(match[1], entryPath);
    if (childPath && existsSync(childPath)) {
      const childSize = moduleGraphSize(childPath, visited);
      bytes += childSize.bytes;
      gzipBytes += childSize.gzipBytes;
    }
  }
  return { bytes, gzipBytes };
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}
