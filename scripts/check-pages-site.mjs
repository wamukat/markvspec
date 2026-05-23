import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import {
  composeMarkVSpecTemplate,
  evaluateMarkVSpecDiagnostics,
  parseMarkVSpec,
} from "@markvspec/core/browser";
import { renderBrowserDesignDocumentHtml } from "@markvspec/document-renderer/browser";
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
  "examples/dynamic/hello-screen.html/index.html",
  "examples/experimental/editor/hello-screen.html/index.html",
  "examples/project/account-project.html/index.html",
  "examples/showcase/hello-screen.html/index.html",
  "pagefind/pagefind.js",
  "pagefind/pagefind-entry.json",
  "ja/start/index.html",
  "en/start/index.html",
  "ja/guide/index.html",
  "en/guide/index.html",
  "ja/guide/project-documents/index.html",
  "en/guide/project-documents/index.html",
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
expectContains(examplesHtml, "Project-Level Examples", "_site/examples/index.html should expose project-level examples.");
expectContains(examplesHtml, "examples/07-project-documents/account-project.vspec.project.md", "_site/examples/index.html should show the project preview example source path.");
expectContains(examplesHtml, `${base}/examples/project/account-project.html`, "_site/examples/index.html should link project examples to the local project preview page.");
expectContains(examplesHtml, `${base}/examples/showcase/hello-screen.html`, "_site/examples/index.html should link to the Hello Screen showcase.");
expectNotContains(examplesHtml, "Source + Preview", "_site/examples/index.html should not duplicate showcase link labels on cards.");
expectNotContains(examplesHtml, ">Preview<", "_site/examples/index.html should not expose preview-only card links.");
expectNotContains(examplesHtml, ">PDF<", "_site/examples/index.html should not expose PDF card links.");
expectNotContains(examplesHtml, `${base}/examples/generated/`, "_site/examples/index.html should not link generated artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/dynamic/`, "_site/examples/index.html should not link compatibility dynamic preview routes from cards.");
expectNotContains(examplesHtml, `${base}/examples/generated/hello-screen.html`, "_site/examples/index.html should not link generated HTML artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/generated/hello-screen.pdf`, "_site/examples/index.html should not link generated PDF artifacts from cards.");
expectNotContains(examplesHtml, `${base}/examples/experimental/editor/`, "_site/examples/index.html should not expose the experimental editor route.");
expectNotContains(examplesHtml, "github.com/wamukat/markvspec/blob/", "_site/examples/index.html should not link GitHub source blobs from cards.");
expectNotContains(examplesHtml, "github.com/wamukat/markvspec/tree/main/examples/07-project-documents", "_site/examples/index.html should not send project example cards to GitHub.");
expectContains(examplesHtml, "Learning Path", "_site/examples/index.html should expose the catalog learning path.");
expectContains(examplesHtml, "Step 1", "_site/examples/index.html should number learning path examples.");
expectOrder(
  examplesHtml,
  ["Hello Screen", "Step 1", "Async Fetching", "Step 2", "Responsive Profile", "Step 3", "Form Submit Flow", "Step 4"],
  "_site/examples/index.html should order the learning path from catalog next links."
);

const generatedExamplesDir = join(siteDir, "examples", "generated");
const generatedHtml = existsSync(generatedExamplesDir)
  ? readdirSync(generatedExamplesDir).filter((entry) => entry.endsWith(".html") && !entry.endsWith(".pdf-source.html")).sort()
  : [];
const directExampleHtml = readdirSync(join(siteDir, "examples"))
  .filter((entry) => entry.endsWith(".html") && entry !== "index.html")
  .sort();
const generatedPdfArtifacts = collectFiles(join(siteDir, "examples"), (filePath) => filePath.endsWith(".pdf") || filePath.endsWith(".pdf-source.html"));
if (generatedHtml.length > 0) {
  failures.push(`_site/examples/generated should not contain per-example HTML artifacts: ${generatedHtml.join(", ")}`);
}
if (directExampleHtml.length > 0) {
  failures.push(`_site/examples should not contain duplicated direct example HTML artifacts: ${directExampleHtml.join(", ")}`);
}
if (generatedPdfArtifacts.length > 0) {
  failures.push(`_site/examples should not contain generated PDF artifacts: ${generatedPdfArtifacts.map((filePath) => toPosixPath(relative(siteDir, filePath))).join(", ")}`);
}
const sharedMermaidRuntime = readSiteFile("examples/assets/markvspec-mermaid-runtime.js");
expectContains(sharedMermaidRuntime, 'securityLevel: "strict"', "_site/examples/assets/markvspec-mermaid-runtime.js should initialize Mermaid with strict security.");
expectContains(sharedMermaidRuntime, "window.markVSpecRenderMermaidDiagrams = renderMermaidDiagrams;", "_site/examples/assets/markvspec-mermaid-runtime.js should expose a rerender hook for dynamic preview content.");

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
const projectPreviewHtml = readSiteFile("examples/project/account-project.html/index.html");
const enGuideHtml = readSiteFile("en/guide/index.html");
const jaGuideHtml = readSiteFile("ja/guide/index.html");
expectContains(enGuideHtml, `${base}/en/guide/project-documents/`, "_site/en/guide/index.html should include Project Documents in the Starlight guide navigation.");
expectContains(enGuideHtml, "Project Documents", "_site/en/guide/index.html should show the English Project Documents guide label.");
expectContains(jaGuideHtml, `${base}/ja/guide/project-documents/`, "_site/ja/guide/index.html should include Project Documents in the Starlight guide navigation.");
expectContains(jaGuideHtml, "プロジェクト文書", "_site/ja/guide/index.html should show the Japanese Project Documents guide label.");
expectContains(helloShowcaseHtml, "Project-Level Examples", "_site/examples/showcase/hello-screen.html should show project-level examples in the sidebar.");
expectContains(helloShowcaseHtml, "Project Documents", "_site/examples/showcase/hello-screen.html should link the project documents example in the sidebar.");
expectContains(helloShowcaseHtml, `${base}/examples/project/account-project.html`, "_site/examples/showcase/hello-screen.html should link project examples to the local project preview page.");
expectContains(helloShowcaseHtml, "Source and dynamic preview, side by side", "_site/examples/showcase/hello-screen.html should be a dynamic-first showcase page.");
expectContains(helloShowcaseHtml, "Dynamic preview", "_site/examples/showcase/hello-screen.html should label the main preview as dynamic.");
expectNotContains(helloShowcaseHtml, "Generated HTML Preview", "_site/examples/showcase/hello-screen.html should not label the main preview as generated HTML.");
expectNotContains(helloShowcaseHtml, "On this example", "_site/examples/showcase/hello-screen.html should not show the redundant local jump navigation.");
expectNotContains(helloShowcaseHtml, 'class="page-jump-nav"', "_site/examples/showcase/hello-screen.html should not render the redundant local jump navigation.");
expectNotContains(helloShowcaseHtml, ">Open source asset</a>", "_site/examples/showcase/hello-screen.html should not expose the internal source asset as normal navigation.");
expectNotContains(helloShowcaseHtml, ">Source</a>", "_site/examples/showcase/hello-screen.html should not duplicate the source link inside the source pane.");
expectNotContains(helloShowcaseHtml, ">Raw source</a>", "_site/examples/showcase/hello-screen.html should not expose raw source as normal navigation.");
expectContains(helloShowcaseHtml, 'class="example-sidebar ', "_site/examples/showcase/hello-screen.html should show example navigation.");
expectContains(helloShowcaseHtml, 'data-sidebar-toggle', "_site/examples/showcase/hello-screen.html should expose a sidebar collapse toggle.");
expectContains(helloShowcaseHtml, 'aria-controls="example-sidebar-content"', "_site/examples/showcase/hello-screen.html sidebar toggle should target the sidebar content.");
expectContains(helloShowcaseHtml, 'aria-label="Hide example navigation"', "_site/examples/showcase/hello-screen.html sidebar toggle should have an accessible label.");
expectContains(helloShowcaseHtml, 'aria-current="page"', "_site/examples/showcase/hello-screen.html sidebar should mark the current example.");
expectContains(helloShowcaseHtml, 'id="dynamic-preview-config"', "_site/examples/showcase/hello-screen.html should expose runtime configuration.");
expectContains(helloShowcaseHtml, 'href="/markvspec/examples/assets/markvspec-preview.css"', "_site/examples/showcase/hello-screen.html should load generated preview CSS for dynamic output.");
expectContains(helloShowcaseHtml, 'src="/markvspec/examples/assets/markvspec-mermaid.js"', "_site/examples/showcase/hello-screen.html should load Mermaid for dynamic output.");
expectContains(helloShowcaseHtml, 'src="/markvspec/examples/assets/markvspec-mermaid-runtime.js"', "_site/examples/showcase/hello-screen.html should load the Mermaid renderer for dynamic output.");
expectContains(helloShowcaseHtml, 'data-dynamic-preview-output', "_site/examples/showcase/hello-screen.html should include the dynamic preview output container.");
expectContains(helloShowcaseHtml, 'data-dynamic-preview-fallback', "_site/examples/showcase/hello-screen.html should include the runtime failure container.");
expectContains(helloShowcaseHtml, '"/markvspec/examples/source/01-basics/hello-screen.vspec.md"', "_site/examples/showcase/hello-screen.html should fetch the public source asset.");
expectContains(helloShowcaseHtml, '"rawSourceHref":"https://raw.githubusercontent.com/wamukat/markvspec/main/examples/01-basics/hello-screen.vspec.md"', "_site/examples/showcase/hello-screen.html should expose the raw source URL for runtime failure UI.");
expectContains(helloShowcaseHtml, '"dynamicPreviewEnabled":true', "_site/examples/showcase/hello-screen.html should enable browser dynamic rendering.");
expectNotContains(helloShowcaseHtml, '<iframe src="/markvspec/examples/generated/hello-screen.html"', "_site/examples/showcase/hello-screen.html should not embed the generated preview artifact as fallback.");
expectNotContains(helloShowcaseHtml, 'href="/markvspec/examples/generated/hello-screen.html"', "_site/examples/showcase/hello-screen.html should not link the generated preview artifact as fallback.");
expectNotContains(helloShowcaseHtml, 'href="/markvspec/examples/dynamic/hello-screen.html"', "_site/examples/showcase/hello-screen.html should not expose the compatibility dynamic route as primary navigation.");
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
expectContains(projectPreviewHtml, "MarkVSpec Project Preview", "_site/examples/project/account-project.html should be the project preview route.");
expectContains(projectPreviewHtml, "Project Preview", "_site/examples/project/account-project.html should label the generated preview pane.");
expectContains(projectPreviewHtml, "Account Portal Project", "_site/examples/project/account-project.html should render the project source/preview content.");
expectContains(projectPreviewHtml, "Project Transition Diagram", "_site/examples/project/account-project.html should render the VS Code project preview document.");
expectContains(projectPreviewHtml, "examples/07-project-documents/account-project.vspec.project.md", "_site/examples/project/account-project.html should show the project source path.");
expectContains(projectPreviewHtml, `${base}/examples/project/account-project.html`, "_site/examples/project/account-project.html should keep the project sidebar on the local preview page.");
const showcaseDynamicScriptPath = dynamicScriptArtifactPath(helloShowcaseHtml, join(siteDir, "examples", "showcase", "hello-screen.html", "index.html"));
if (!showcaseDynamicScriptPath) {
  failures.push("_site/examples/showcase/hello-screen.html should include the dynamic preview browser script.");
} else {
  const { gzipBytes } = moduleGraphSize(showcaseDynamicScriptPath);
  if (gzipBytes > 260 * 1024) {
    failures.push(`showcase dynamic generated document browser script gzip size should stay within 260 KiB (${formatKiB(gzipBytes)} found).`);
  }
}

const scenarioShowcaseHtml = readSiteFile("examples/showcase/scenario-samples.html/index.html");
expectContains(scenarioShowcaseHtml, "English: Guide / Scenarios", "_site/examples/showcase/scenario-samples.html should link the scenario guide.");
expectContains(scenarioShowcaseHtml, 'href="/markvspec/en/guide/scenarios/"', "_site/examples/showcase/scenario-samples.html should use the Starlight scenario URL.");

const templateShowcaseHtml = readSiteFile("examples/showcase/profile-page-with-template.html/index.html");
expectContains(templateShowcaseHtml, '"dynamicPreviewEnabled":true', "_site/examples/showcase/profile-page-with-template.html should enable browser dynamic rendering.");
expectContains(templateShowcaseHtml, '"/markvspec/examples/source/05-reuse/template-shell.vspec.md"', "_site/examples/showcase/profile-page-with-template.html should publish the template dependency source.");
expectContains(templateShowcaseHtml, '"/markvspec/examples/source/05-reuse/profile-summary.partial.vspec.md"', "_site/examples/showcase/profile-page-with-template.html should publish the partial dependency source.");
expectNotContains(templateShowcaseHtml, '<iframe src="/markvspec/examples/generated/profile-page-with-template.html"', "_site/examples/showcase/profile-page-with-template.html should not embed the composed generated preview fallback.");

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
expectContains(helloDynamicHtml, '<meta name="robots" content="noindex">', "_site/examples/dynamic/hello-screen.html should keep the compatibility route out of search indexing.");
expectContains(helloDynamicHtml, '<link rel="canonical" href="/markvspec/examples/showcase/hello-screen.html">', "_site/examples/dynamic/hello-screen.html should canonicalize to the public showcase route.");
expectContains(helloDynamicHtml, 'data-pagefind-ignore', "_site/examples/dynamic/hello-screen.html should keep runtime preview content out of Pagefind indexing.");
expectContains(helloDynamicHtml, 'data-sidebar-toggle', "_site/examples/dynamic/hello-screen.html should expose a sidebar collapse toggle.");
expectContains(helloDynamicHtml, 'aria-controls="example-sidebar-content"', "_site/examples/dynamic/hello-screen.html sidebar toggle should target the sidebar content.");
expectContains(helloDynamicHtml, 'aria-label="Hide example navigation"', "_site/examples/dynamic/hello-screen.html sidebar toggle should have an accessible label.");
expectContains(helloDynamicHtml, 'id="dynamic-preview-config"', "_site/examples/dynamic/hello-screen.html should expose runtime configuration.");
expectContains(helloDynamicHtml, 'href="/markvspec/examples/assets/markvspec-preview.css"', "_site/examples/dynamic/hello-screen.html should load generated preview CSS for dynamic output.");
expectContains(helloDynamicHtml, 'src="/markvspec/examples/assets/markvspec-mermaid.js"', "_site/examples/dynamic/hello-screen.html should load Mermaid for dynamic output.");
expectContains(helloDynamicHtml, 'src="/markvspec/examples/assets/markvspec-mermaid-runtime.js"', "_site/examples/dynamic/hello-screen.html should load the Mermaid renderer for dynamic output.");
expectContains(helloDynamicHtml, '"/markvspec/examples/source/01-basics/hello-screen.vspec.md"', "_site/examples/dynamic/hello-screen.html should fetch the public source asset.");
expectNotContains(helloDynamicHtml, '"/markvspec/examples/generated/hello-screen.html"', "_site/examples/dynamic/hello-screen.html should not keep the generated preview fallback.");
expectNotContains(helloDynamicHtml, ">Raw source</a>", "_site/examples/dynamic/hello-screen.html should not expose raw source as normal navigation.");
expectContains(helloDynamicHtml, 'href="/markvspec/examples/showcase/hello-screen.html"', "_site/examples/dynamic/hello-screen.html should provide a route back to the public showcase.");
expectContains(helloDynamicHtml, ">Open showcase</a>", "_site/examples/dynamic/hello-screen.html should label the public route as the showcase.");
const dynamicScriptPath = dynamicScriptArtifactPath(helloDynamicHtml, join(siteDir, "examples", "dynamic", "hello-screen.html", "index.html"));
if (!dynamicScriptPath) {
  failures.push("_site/examples/dynamic/hello-screen.html should include the dynamic preview browser script.");
} else {
  const { gzipBytes } = moduleGraphSize(dynamicScriptPath);
  if (gzipBytes > 260 * 1024) {
    failures.push(`dynamic generated document browser script gzip size should stay within 260 KiB (${formatKiB(gzipBytes)} found).`);
  }
}

const templateDynamicHtml = readSiteFile("examples/dynamic/profile-page-with-template.html/index.html");
expectContains(templateDynamicHtml, '"/markvspec/examples/source/05-reuse/template-shell.vspec.md"', "_site/examples/dynamic/profile-page-with-template.html should publish the template dependency source.");
expectContains(templateDynamicHtml, '"/markvspec/examples/source/05-reuse/profile-summary.partial.vspec.md"', "_site/examples/dynamic/profile-page-with-template.html should publish the partial dependency source.");

const dynamicCoverage = checkDynamicShowcaseCoverage();
const dynamicParity = checkDynamicExportStructureParity();
const dynamicRuntimeSource = readFileSync(join(root, "docs-site", "src", "lib", "dynamic-preview.js"), "utf8");
expectContains(dynamicRuntimeSource, "renderDynamicPreview().catch((error) => {", "dynamic preview runtime should catch render failures.");
expectContains(dynamicRuntimeSource, "showRuntimeFailure(error, config);", "dynamic preview runtime should show runtime failure UI on render failures.");
expectContains(dynamicRuntimeSource, "Dynamic preview failed:", "dynamic preview runtime should report runtime failure without generated fallback.");
expectContains(dynamicRuntimeSource, "previewElement.innerHTML = html;", "dynamic preview runtime should only insert trusted renderer output.");
const dynamicRuntimeInnerHtmlAssignments = [...dynamicRuntimeSource.matchAll(/\binnerHTML\s*=/gu)];
if (dynamicRuntimeInnerHtmlAssignments.length !== 1) {
  failures.push(`dynamic preview runtime should have exactly one innerHTML assignment for trusted renderer output (${dynamicRuntimeInnerHtmlAssignments.length} found).`);
}
checkDynamicSecurityBoundary();

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

console.log(`Pages site check passed (${generatedHtml.length} generated example pages, ${showcaseFiles.length} showcase pages, ${dynamicCoverage.rendered} dynamic smoke renders, ${dynamicCoverage.dynamicDocumentsChecked} dynamic document checks, ${dynamicParity.checked} export/dynamic structure parity checks).`);

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

function checkDynamicShowcaseCoverage() {
  let rendered = 0;
  let dynamicDocumentsChecked = 0;
  const seenSlugs = new Set();
  for (const entry of catalog.examples) {
    const slug = basename(entry.path, ".vspec.md");
    seenSlugs.add(slug);
    const showcasePath = `examples/showcase/${slug}.html/index.html`;
    const dynamicPath = `examples/dynamic/${slug}.html/index.html`;
    expectFile(showcasePath);
    expectFile(dynamicPath);

    const showcaseHtml = readSiteFile(showcasePath);
    expectContains(showcaseHtml, 'data-dynamic-preview-output', `${showcasePath} should include the dynamic preview output container.`);
    expectContains(showcaseHtml, 'data-dynamic-preview-fallback', `${showcasePath} should include the runtime failure container.`);
    expectNotContains(showcaseHtml, "/markvspec/examples/generated/", `${showcasePath} should not link or embed generated example artifacts.`);
    const config = dynamicPreviewConfig(showcaseHtml, showcasePath);
    if (!config) {
      continue;
    }
    if (config.dynamicPreviewEnabled !== true) {
      failures.push(`${showcasePath} should enable dynamic preview instead of staying on fallback.`);
    }
    const dynamicSmoke = smokeRenderDynamicConfig(config, showcasePath);
    if (dynamicSmoke) {
      checkDynamicDocumentSmoke({
        dynamicHtml: dynamicSmoke.html,
        filePath: showcasePath,
        slug,
        validation: dynamicSmoke.validation,
      });
      dynamicDocumentsChecked += 1;
    }
    rendered += 1;
  }

  return { dynamicDocumentsChecked, rendered };
}

function checkDynamicExportStructureParity() {
  let checked = 0;
  const workRoot = join(root, ".work");
  mkdirSync(workRoot, { recursive: true });
  const generatedDir = mkdtempSync(join(workRoot, "dynamic-preview-parity-"));
  try {
    for (const entry of catalog.examples) {
      const slug = basename(entry.path, ".vspec.md");
      const sourcePath = join(root, entry.path);
      const showcasePath = `examples/showcase/${slug}.html/index.html`;
      const showcaseHtml = readSiteFile(showcasePath);
      const config = dynamicPreviewConfig(showcaseHtml, showcasePath);
      if (!config) {
        continue;
      }
      const dynamicSmoke = smokeRenderDynamicConfig(config, showcasePath);
      if (!dynamicSmoke) {
        continue;
      }

      execFileSync("node", [join(root, "packages", "cli", "dist", "index.js"), "export", "html", sourcePath, "--out", generatedDir], {
        cwd: root,
        stdio: "pipe",
      });
      const generatedHtmlPath = join(generatedDir, `${slug}.html`);
      if (!existsSync(generatedHtmlPath)) {
        failures.push(`${showcasePath} export/dynamic parity could not find generated HTML: ${toPosixPath(relative(root, generatedHtmlPath))}`);
        continue;
      }

      const generatedArticle = extractDocumentArticle(readFileSync(generatedHtmlPath, "utf8"), `${slug}.html`);
      if (!generatedArticle) {
        continue;
      }
      compareHtmlStructureFingerprint({
        dynamicHtml: dynamicSmoke.html,
        filePath: showcasePath,
        generatedHtml: generatedArticle,
      });
      checked += 1;
    }
  } finally {
    rmSync(generatedDir, { force: true, recursive: true });
  }
  return { checked };
}

function extractDocumentArticle(html, label) {
  const openMatch = /<article\b[^>]*\bclass="[^"]*\bdocument\b[^"]*"[^>]*>/iu.exec(html);
  if (!openMatch) {
    failures.push(`${label} export/dynamic parity could not find <article class="document">.`);
    return "";
  }
  const articlePattern = /<\/?article\b[^>]*>/giu;
  articlePattern.lastIndex = openMatch.index;
  let depth = 0;
  for (const match of html.matchAll(articlePattern)) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(openMatch.index, match.index + match[0].length);
      }
    } else {
      depth += 1;
    }
  }
  failures.push(`${label} export/dynamic parity could not find the matching </article> for <article class="document">.`);
  return "";
}

function compareHtmlStructureFingerprint({ dynamicHtml, filePath, generatedHtml }) {
  const generated = htmlStructureFingerprint(generatedHtml);
  const dynamic = htmlStructureFingerprint(dynamicHtml);
  const tagDiffs = diffCountMaps(generated.tags, dynamic.tags);
  const classDiffs = diffCountMaps(generated.classes, dynamic.classes);
  const dataAttributeDiffs = diffCountMaps(generated.dataAttributes, dynamic.dataAttributes);
  if (tagDiffs.length > 0 || classDiffs.length > 0 || dataAttributeDiffs.length > 0) {
    failures.push(`${filePath} dynamic preview should keep export HTML tag/class/data-attribute structure. tagDiffs=${formatDiffs(tagDiffs)} classDiffs=${formatDiffs(classDiffs)} dataAttributeDiffs=${formatDiffs(dataAttributeDiffs)}`);
  }
}

function htmlStructureFingerprint(html) {
  return {
    classes: countMatches([...html.matchAll(/\bclass="([^"]*)"/gu)].flatMap((match) => match[1].split(/\s+/u).filter(Boolean))),
    dataAttributes: countMatches([...html.matchAll(/\s(data-[a-z0-9:-]+)(?:=|\s|>)/giu)].map((match) => match[1])),
    tags: countMatches([...html.matchAll(/<\s*([a-z][a-z0-9:-]*)\b/giu)].map((match) => match[1].toLowerCase())),
  };
}

function countMatches(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function diffCountMaps(expected, actual) {
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  const diffs = [];
  for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
    const expectedCount = expected.get(key) ?? 0;
    const actualCount = actual.get(key) ?? 0;
    if (expectedCount !== actualCount) {
      diffs.push(`${key}:${expectedCount}->${actualCount}`);
    }
  }
  return diffs;
}

function formatDiffs(diffs) {
  if (diffs.length === 0) {
    return "none";
  }
  const visible = diffs.slice(0, 12).join(", ");
  return diffs.length > 12 ? `${visible}, ... +${diffs.length - 12}` : visible;
}

function dynamicPreviewConfig(html, filePath) {
  const match = html.match(/<script id="dynamic-preview-config" type="application\/json">([\s\S]*?)<\/script>/u);
  if (!match) {
    failures.push(`${filePath} should include dynamic preview runtime configuration.`);
    return undefined;
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    failures.push(`${filePath} should include valid dynamic preview JSON configuration: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function smokeRenderDynamicConfig(config, filePath) {
  const source = readTextAssetForConfig(config.sourceHref, filePath, "source");
  if (source === undefined) {
    return;
  }
  const result = parseMarkVSpec(source);
  const dependencies = loadDynamicDependencies(config.dependencies, filePath);
  const renderResult = dependencies.template
    ? composeMarkVSpecTemplate(dependencies.template.result, result)
    : result;
  const diagnostics = [
    ...renderResult.diagnostics,
    ...dependencies.partials.flatMap((partial) => partial.result.diagnostics),
  ];
  const validation = evaluateMarkVSpecDiagnostics(diagnostics);
  const html = renderBrowserDesignDocumentHtml(renderResult);
  if (validation.diagnostics.length > 0) {
    failures.push(`${filePath} dynamic smoke should validate without diagnostics (${validation.diagnostics.length} found).`);
  }
  if (!validation.passed) {
    failures.push(`${filePath} dynamic smoke should pass validation.`);
  }
  if (!html.trim()) {
    failures.push(`${filePath} dynamic smoke should render non-empty HTML.`);
  }
  return { html, renderResult, validation };
}

function checkDynamicDocumentSmoke({ dynamicHtml, filePath, slug, validation }) {
  const dynamicFingerprint = semanticPreviewFingerprint(dynamicHtml);

  if (!dynamicFingerprint.hasWireframe) {
    failures.push(`${filePath} dynamic generated document should include a wireframe root.`);
  }
  if (!dynamicFingerprint.sectionIds.has("screen") || !dynamicFingerprint.sectionIds.has("state-views")) {
    failures.push(`${filePath} dynamic generated document should include generated Screen and State Views sections.`);
  }
  if (!dynamicFingerprint.sectionIds.has("action-details") && dynamicHtml.includes("Action Details")) {
    failures.push(`${filePath} dynamic generated document should expose the Action Details section anchor when action details are rendered.`);
  }
  if (validation.passed && dynamicFingerprint.sectionIds.has("diagnostics")) {
    failures.push(`${filePath} dynamic generated document expected no Diagnostics section when dynamic validation passes.`);
  }
  if (!validation.passed && !dynamicFingerprint.sectionIds.has("diagnostics")) {
    failures.push(`${filePath} dynamic generated document expected a Diagnostics section when dynamic validation fails.`);
  }
  if (slug === "source-kind-metadata") {
    checkSourceKindSampleSelection(dynamicHtml, filePath);
  }
}

function checkSourceKindSampleSelection(html, filePath) {
  const expectations = [
    {
      pattern: /data-mm-id="E-MemberId"[^>]*>M-200</u,
      message: "route sample memberId should render in State Views"
    },
    {
      pattern: /data-mm-id="E-DisplayName"[^>]*>Taylor Stone</u,
      message: "element sample E-DisplayName should render in State Views"
    },
    {
      pattern: /data-mm-id="E-EmailInput"[^>]*value="taylor@example\.com"/u,
      message: "element sample E-EmailInput should render in State Views"
    },
    {
      pattern: /data-mm-id="E-Subtotal"[^>]*>USD 240\.00</u,
      message: "element sample E-Subtotal should render in State Views"
    },
    {
      pattern: /<td>Team plan<\/td><td>USD 200\.00<\/td>/u,
      message: "table sample row Team plan should render in State Views"
    },
    {
      pattern: /<td>Support add-on<\/td><td>USD 40\.00<\/td>/u,
      message: "table sample row Support add-on should render in State Views"
    }
  ];

  for (const expectation of expectations) {
    if (!expectation.pattern.test(html)) {
      failures.push(`${filePath} source-kind-metadata sample selection regression: ${expectation.message}.`);
    }
  }
}

function semanticPreviewFingerprint(html) {
  const markerIds = new Set([...html.matchAll(/\bdata-mm-id="([^"]+)"/gu)].map((match) => decodeHtmlText(match[1])));
  const markerCategories = new Set([...html.matchAll(/\bdata-mm-marker-category="([^"]+)"/gu)].map((match) => decodeHtmlText(match[1])));
  const sectionIds = new Set([...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => decodeHtmlText(match[1])));
  return {
    hasWireframe: html.includes("mm-wireframe"),
    markerCategories,
    markerIds,
    sectionIds,
    text: normalizeParityText(html),
  };
}

function normalizeParityText(html) {
  return decodeHtmlText(html
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, " ")
    .replace(/<[^>]+>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeHtmlText(value) {
  return value
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/giu, (_match, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal ?? "0", hex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");
}

function checkDynamicSecurityBoundary() {
  const source = `---
id: SCR-DYNAMIC-XSS
type: screen
title: Dynamic XSS Fixture
route: /dynamic/:payload
---

# SCR-DYNAMIC-XSS Dynamic XSS Fixture

<script>globalThis.__markvspecXss = true</script>

Inline [bad](javascript:globalThis.__markvspecXss = true) text.

## States

- idle*

## Layout: desktop

### L-Root Root

- stack

#### Items

- E-Title
- E-JavaScriptLink
- E-EncodedLink
- E-EncodedControlLink
- E-ControlLink
- E-VbScriptLink
- E-DataLink
- E-SafeLink
- E-Banner
- E-Dialog

## Elements

### E-Title Heading

- level: 1
- text: <script>globalThis.__markvspecXss = true</script>

### E-JavaScriptLink Link

- label: Dangerous <img src=x onerror="globalThis.__markvspecXss = true">
- href: javascript:globalThis.__markvspecXss = true

### E-EncodedLink Link

- label: Encoded dangerous link
- href: java&#x73;cript:globalThis.__markvspecXss = true

### E-EncodedControlLink Link

- label: Encoded control dangerous link
- href: java&#10;script:globalThis.__markvspecXss = true

### E-ControlLink Link

- label: Control dangerous link
- href: java	script:globalThis.__markvspecXss = true

### E-VbScriptLink Link

- label: VBScript dangerous link
- href: vbscript:globalThis.__markvspecXss = true

### E-DataLink Link

- label: Data dangerous link
- href: data:text/html,<script>globalThis.__markvspecXss = true</script>

### E-SafeLink Link

- label: Safe relative link
- href: /safe/path

### E-Banner Banner

- message: <iframe srcdoc="<script>globalThis.__markvspecXss = true</script>"></iframe>

### E-Dialog Dialog

- title: Dialog
- content: <svg onload="globalThis.__markvspecXss = true"></svg>
`;
  const result = parseMarkVSpec(source);
  const html = renderBrowserDesignDocumentHtml(result);

  if (/<script\b|<iframe\b|<svg\b|<[^>]+\son[a-z]+\s*=|href="(?:javascript|vbscript|data):/iu.test(html)) {
    failures.push("dynamic generated document security fixture should not render executable tags, event handler attributes, iframes, or dangerous href values.");
  }
  if (!html.includes('href="#"')) {
    failures.push("dynamic generated document security fixture should neutralize dangerous Link href values.");
  }
  if (!html.includes('href="/safe/path"')) {
    failures.push("dynamic generated document security fixture should preserve safe relative Link href values.");
  }
  if (!html.includes("&lt;script&gt;globalThis.__markvspecXss = true&lt;/script&gt;")) {
    failures.push("dynamic generated document security fixture should keep dangerous text escaped for review.");
  }
}

function loadDynamicDependencies(dependencies = {}, filePath) {
  return {
    template: dependencies.template ? loadDynamicDependency(dependencies.template, filePath, "template") : undefined,
    partials: (dependencies.partials ?? []).map((partial) => loadDynamicDependency(partial, filePath, `partial ${partial.id || partial.href}`)).filter(Boolean),
  };
}

function loadDynamicDependency(dependency, filePath, label) {
  if (!dependency?.href) {
    failures.push(`${filePath} dynamic dependency is missing an href for ${label}.`);
    return undefined;
  }
  const source = readTextAssetForConfig(dependency.href, filePath, label);
  if (source === undefined) {
    return undefined;
  }
  const result = parseMarkVSpec(source);
  if (dependency.id && result.screen.id && dependency.id !== result.screen.id) {
    failures.push(`${filePath} dynamic dependency ${label} expected ${dependency.id} but parsed ${result.screen.id}.`);
  }
  return {
    ...dependency,
    result,
  };
}

function readTextAssetForConfig(href, filePath, label) {
  if (!href) {
    failures.push(`${filePath} dynamic config is missing ${label} href.`);
    return undefined;
  }
  const assetPath = artifactPathForHref(href, join(siteDir, filePath));
  if (!assetPath || !existsSync(assetPath)) {
    failures.push(`${filePath} dynamic config ${label} href points to a missing artifact: ${href}`);
    return undefined;
  }
  return readFileSync(assetPath, "utf8");
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

function dynamicScriptArtifactPath(html, sourcePath) {
  const scriptMatch = html.match(/<script type="module" src="([^"]*dynamic-preview[^"]*|[^"]*_slug_[^"]*\.js)"><\/script>/u);
  if (!scriptMatch) {
    return undefined;
  }
  return artifactPathForHref(scriptMatch[1], sourcePath);
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
