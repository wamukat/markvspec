import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { loadExampleCatalog, validateExampleCatalog } from "./example-catalog.mjs";

const root = process.cwd();
const siteDir = join(root, "_site");
const pagesOrigin = "https://wamukat.github.io/markvspec";
const newIaSourceSections = ["start", "guide", "reference", "recipes", "examples", "concepts"];
const requiredFiles = [
  "index.html",
  "favicon.svg",
  "assets/markvspec-icon.svg",
  "assets/markvspec-icon.png",
  "examples/index.html",
  "examples/hello-screen.html",
  "examples/showcase/hello-screen.html",
  "docs/ja/index.html",
  "docs/en/index.html",
  "docs/ja/start/index.html",
  "docs/ja/start/first-screen.html",
  "docs/ja/start/preview.html",
  "docs/ja/start/export.html",
  "docs/en/start/index.html",
  "docs/en/start/first-screen.html",
  "docs/en/start/preview.html",
  "docs/en/start/export.html",
  "docs/ja/guide/index.html",
  "docs/ja/guide/document-structure.html",
  "docs/ja/guide/markdown-model.html",
  "docs/ja/guide/states.html",
  "docs/ja/guide/layout.html",
  "docs/ja/guide/elements.html",
  "docs/ja/guide/actions.html",
  "docs/ja/guide/validation.html",
  "docs/ja/guide/partial-updates.html",
  "docs/en/guide/index.html",
  "docs/en/guide/document-structure.html",
  "docs/en/guide/markdown-model.html",
  "docs/en/guide/states.html",
  "docs/en/guide/layout.html",
  "docs/en/guide/elements.html",
  "docs/en/guide/actions.html",
  "docs/en/guide/validation.html",
  "docs/en/guide/partial-updates.html",
  "docs/ja/reference/index.html",
  "docs/ja/reference/file-format.html",
  "docs/ja/reference/sections.html",
  "docs/ja/reference/elements.html",
  "docs/ja/reference/actions.html",
  "docs/ja/reference/validations.html",
  "docs/ja/reference/rules.html",
  "docs/ja/reference/ids.html",
  "docs/ja/reference/cli.html",
  "docs/ja/reference/limitations.html",
  "docs/en/reference/index.html",
  "docs/en/reference/file-format.html",
  "docs/en/reference/sections.html",
  "docs/en/reference/elements.html",
  "docs/en/reference/actions.html",
  "docs/en/reference/validations.html",
  "docs/en/reference/rules.html",
  "docs/en/reference/ids.html",
  "docs/en/reference/cli.html",
  "docs/en/reference/limitations.html",
  "docs/ja/recipes/index.html",
  "docs/ja/recipes/login-form.html",
  "docs/ja/recipes/loading-error.html",
  "docs/ja/recipes/server-partial-update.html",
  "docs/ja/recipes/pdf-export.html",
  "docs/en/recipes/index.html",
  "docs/en/recipes/login-form.html",
  "docs/en/recipes/loading-error.html",
  "docs/en/recipes/server-partial-update.html",
  "docs/en/recipes/pdf-export.html",
  "docs/ja/examples/index.html",
  "docs/en/examples/index.html",
  "docs/ja/concepts/index.html",
  "docs/en/concepts/index.html",
  "docs/assets/readme-hello-screen-preview.png",
  "docs/assets/start/vscode-preview-clean.png",
  "docs/assets/start/vscode-export-command.png"
];

const newIaIndexFiles = [
  "docs/ja/index.html",
  "docs/en/index.html",
  "docs/ja/start/index.html",
  "docs/ja/start/first-screen.html",
  "docs/ja/start/preview.html",
  "docs/ja/start/export.html",
  "docs/en/start/index.html",
  "docs/en/start/first-screen.html",
  "docs/en/start/preview.html",
  "docs/en/start/export.html",
  "docs/ja/guide/index.html",
  "docs/en/guide/index.html",
  "docs/ja/reference/index.html",
  "docs/en/reference/index.html",
  "docs/ja/recipes/index.html",
  "docs/en/recipes/index.html",
  "docs/ja/examples/index.html",
  "docs/en/examples/index.html",
  "docs/ja/concepts/index.html",
  "docs/en/concepts/index.html"
];

const maintainedPagesUrls = [
  "https://wamukat.github.io/markvspec/",
  "https://wamukat.github.io/markvspec/examples/",
  "https://wamukat.github.io/markvspec/examples/showcase/hello-screen.html",
  "https://wamukat.github.io/markvspec/examples/showcase/login-basic.html",
  "https://wamukat.github.io/markvspec/docs/ja/",
  "https://wamukat.github.io/markvspec/docs/en/",
  "https://wamukat.github.io/markvspec/docs/ja/start/",
  "https://wamukat.github.io/markvspec/docs/en/start/",
  "https://wamukat.github.io/markvspec/docs/ja/guide/",
  "https://wamukat.github.io/markvspec/docs/en/guide/",
  "https://wamukat.github.io/markvspec/docs/ja/reference/",
  "https://wamukat.github.io/markvspec/docs/en/reference/",
  "https://wamukat.github.io/markvspec/docs/ja/recipes/",
  "https://wamukat.github.io/markvspec/docs/en/recipes/"
];

const failures = [];

const jaNewIaSourceFiles = collectNewIaSourceFiles("ja");
const enNewIaSourceFiles = collectNewIaSourceFiles("en");
expectSameList(
  jaNewIaSourceFiles,
  enNewIaSourceFiles,
  "docs/en and docs/ja new IA Markdown paths should match"
);

for (const filePath of [
  "docs/en/README.md",
  ...enNewIaSourceFiles.map((relativePath) => `docs/en/${relativePath}`)
]) {
  expectNoStubMarker(filePath);
}

const catalog = loadExampleCatalog(root);
const exampleSources = collectFiles(join(root, "examples"), (filePath) => filePath.endsWith(".vspec.md"));
const { errors: catalogErrors, warnings: catalogWarnings } = validateExampleCatalog(catalog, { root, exampleFiles: exampleSources });
for (const failure of catalogErrors) {
  failures.push(`examples/catalog.yml: ${failure}`);
}
for (const warning of catalogWarnings) {
  console.warn(`examples/catalog.yml warning: ${warning}`);
}

for (const filePath of requiredFiles) {
  expectFile(filePath);
}

for (const url of maintainedPagesUrls) {
  const artifactPath = artifactPathForPagesUrl(url);
  if (!artifactPath) {
    failures.push(`Maintained Pages URL could not be mapped to an artifact: ${url}`);
    continue;
  }
  expectFile(artifactPath, `Maintained Pages URL points to missing artifact: ${url}`);
}

const rootHtml = readSiteFile("index.html");
if (!rootHtml.includes("data-markvspec-home")) {
  failures.push("_site/index.html must be the static MarkVSpec top page.");
}
if (rootHtml.includes("Generated static HTML previews for the shipped MarkVSpec examples.")) {
  failures.push("_site/index.html must not be the generated examples index.");
}
expectContains(rootHtml, 'href="examples/"', "_site/index.html should link to /examples/.");
expectContains(rootHtml, 'href="docs/ja/"', "_site/index.html should link to the Japanese documentation root.");
expectContains(rootHtml, 'href="docs/en/"', "_site/index.html should link to the English documentation root.");
expectContains(rootHtml, 'href="favicon.svg"', "_site/index.html should set the MarkVSpec favicon.");
expectContains(rootHtml, 'src="assets/markvspec-icon.svg"', "_site/index.html should show the MarkVSpec icon.");
expectOccurrenceCount(rootHtml, 'href="docs/ja/"', 1, "_site/index.html should expose the Japanese documentation link once.");
expectOccurrenceCount(rootHtml, 'href="docs/en/"', 1, "_site/index.html should expose the English documentation link once.");
expectOccurrenceCount(rootHtml, 'href="examples/"', 1, "_site/index.html should expose the examples link once.");
for (const languageDeepLink of [
  'href="docs/ja/start/"',
  'href="docs/en/start/"',
  'href="docs/ja/guide/"',
  'href="docs/en/guide/"',
  'href="docs/ja/recipes/"',
  'href="docs/en/recipes/"',
  'href="docs/ja/reference/"',
  'href="docs/en/reference/"'
]) {
  expectNotContains(rootHtml, languageDeepLink, "_site/index.html should keep language switching at the documentation root.");
}

const jaStartHtml = readSiteFile("docs/ja/start/index.html");
expectContains(jaStartHtml, 'class="docs-sidebar"', "_site/docs/ja/start/index.html should show documentation navigation.");
expectContains(jaStartHtml, 'href="../../../favicon.svg"', "_site/docs/ja/start/index.html should set the MarkVSpec favicon.");
expectContains(jaStartHtml, 'src="../../../assets/markvspec-icon.svg"', "_site/docs/ja/start/index.html should show the MarkVSpec icon in navigation.");
expectContains(jaStartHtml, 'href="../guide/index.html"', "_site/docs/ja/start/index.html sidebar should link to guide.");
expectContains(jaStartHtml, 'href="../reference/index.html"', "_site/docs/ja/start/index.html sidebar should link to reference.");
expectContains(jaStartHtml, 'aria-current="page">Start</a>', "_site/docs/ja/start/index.html sidebar should mark the current page.");
expectContains(jaStartHtml, "5分で試す", "_site/docs/ja/start/index.html should provide a short quick start.");
expectContains(jaStartHtml, "<h3>Step 1: 拡張を入れる</h3>", "_site/docs/ja/start/index.html should render quick start steps as headings.");
expectContains(jaStartHtml, "VS Code Marketplace", "_site/docs/ja/start/index.html should mention marketplace install.");
expectContains(jaStartHtml, "<h3>Step 2: Hello Screen を作る</h3>", "_site/docs/ja/start/index.html should ask users to create the first file.");
expectContains(jaStartHtml, "hello.vspec.md", "_site/docs/ja/start/index.html should use a user-created local file.");
expectContains(jaStartHtml, "MarkVSpec: Open Preview", "_site/docs/ja/start/index.html should mention the preview command.");
expectContains(jaStartHtml, "../../assets/start/vscode-preview-clean.png", "_site/docs/ja/start/index.html should show the preview screenshot.");
expectContains(jaStartHtml, "MarkVSpec: Export Static HTML", "_site/docs/ja/start/index.html should mention the VS Code HTML export command.");
expectContains(jaStartHtml, "MarkVSpec: Export PDF", "_site/docs/ja/start/index.html should mention the VS Code PDF export command.");
expectContains(jaStartHtml, "../../assets/start/vscode-export-command.png", "_site/docs/ja/start/index.html should show the export command screenshot.");
expectContains(jaStartHtml, "export html", "_site/docs/ja/start/index.html should mention HTML export.");
expectContains(jaStartHtml, "export pdf", "_site/docs/ja/start/index.html should mention PDF export.");
expectNotContains(jaStartHtml, "code examples/", "_site/docs/ja/start/index.html should not require cloned repository examples.");

const enStartHtml = readSiteFile("docs/en/start/index.html");
expectContains(enStartHtml, 'class="docs-sidebar"', "_site/docs/en/start/index.html should show documentation navigation.");
expectContains(enStartHtml, 'href="../guide/index.html"', "_site/docs/en/start/index.html sidebar should link to guide.");
expectContains(enStartHtml, 'href="../reference/index.html"', "_site/docs/en/start/index.html sidebar should link to reference.");
expectContains(enStartHtml, 'aria-current="page">Start</a>', "_site/docs/en/start/index.html sidebar should mark the current page.");
expectContains(enStartHtml, "Try It In 5 Minutes", "_site/docs/en/start/index.html should provide a short quick start.");
expectContains(enStartHtml, "<h3>Step 1: Install The Extension</h3>", "_site/docs/en/start/index.html should render quick start steps as headings.");
expectContains(enStartHtml, "VS Code Marketplace", "_site/docs/en/start/index.html should mention marketplace install.");
expectContains(enStartHtml, "<h3>Step 2: Create Hello Screen</h3>", "_site/docs/en/start/index.html should ask users to create the first file.");
expectContains(enStartHtml, "hello.vspec.md", "_site/docs/en/start/index.html should use a user-created local file.");
expectContains(enStartHtml, "MarkVSpec: Open Preview", "_site/docs/en/start/index.html should mention the preview command.");
expectContains(enStartHtml, "../../assets/start/vscode-preview-clean.png", "_site/docs/en/start/index.html should show the preview screenshot.");
expectContains(enStartHtml, "MarkVSpec: Export Static HTML", "_site/docs/en/start/index.html should mention the VS Code HTML export command.");
expectContains(enStartHtml, "MarkVSpec: Export PDF", "_site/docs/en/start/index.html should mention the VS Code PDF export command.");
expectContains(enStartHtml, "../../assets/start/vscode-export-command.png", "_site/docs/en/start/index.html should show the export command screenshot.");
expectContains(enStartHtml, "export html", "_site/docs/en/start/index.html should mention HTML export.");
expectContains(enStartHtml, "export pdf", "_site/docs/en/start/index.html should mention PDF export.");
expectNotContains(enStartHtml, "code examples/", "_site/docs/en/start/index.html should not require cloned repository examples.");

expectContains(readSiteFile("docs/ja/start/first-screen.html"), "Hello Screen", "_site/docs/ja/start/first-screen.html should explain the first screen.");
expectContains(readSiteFile("docs/ja/start/preview.html"), "MarkVSpec: Open Preview", "_site/docs/ja/start/preview.html should explain live preview.");
expectContains(readSiteFile("docs/ja/start/export.html"), "Chrome", "_site/docs/ja/start/export.html should mention PDF browser requirements.");
expectContains(readSiteFile("docs/en/start/first-screen.html"), "Hello Screen", "_site/docs/en/start/first-screen.html should explain the first screen.");
expectContains(readSiteFile("docs/en/start/preview.html"), "MarkVSpec: Open Preview", "_site/docs/en/start/preview.html should explain live preview.");
expectContains(readSiteFile("docs/en/start/export.html"), "Chrome", "_site/docs/en/start/export.html should mention PDF browser requirements.");
for (const startPath of [
  "docs/ja/start/index.html",
  "docs/ja/start/preview.html",
  "docs/en/start/index.html",
  "docs/en/start/preview.html"
]) {
  expectNotContains(readSiteFile(startPath), "<p>1. ", `${startPath} should not render ordered Markdown steps as plain paragraphs.`);
}

const guideIndexHtml = readSiteFile("docs/ja/guide/index.html");
expectContains(guideIndexHtml, "markdown-model.html", "_site/docs/ja/guide/index.html should link to markdown-model guide.");
expectContains(guideIndexHtml, "document-structure.html", "_site/docs/ja/guide/index.html should link to document structure guide.");
expectContains(guideIndexHtml, "partial-updates.html", "_site/docs/ja/guide/index.html should link to partial-updates guide.");
expectContains(guideIndexHtml, "examples/showcase/hello-screen.html", "_site/docs/ja/guide/index.html should link to example showcases.");
const guideDocumentStructureHtml = readSiteFile("docs/ja/guide/document-structure.html");
expectContains(guideDocumentStructureHtml, "MarkVSpec 文書構造", "_site/docs/ja/guide/document-structure.html should preserve the visual document structure guide.");
expectContains(guideDocumentStructureHtml, 'class="docs-sidebar"', "_site/docs/ja/guide/document-structure.html should use the standard docs sidebar.");
expectContains(guideDocumentStructureHtml, 'aria-current="page">MarkVSpec 文書構造</a>', "_site/docs/ja/guide/document-structure.html sidebar should mark the current page.");
expectNotContains(guideDocumentStructureHtml, "* { box-sizing: border-box; }", "_site/docs/ja/guide/document-structure.html should not override the standard docs shell width model.");
expectNotContains(guideDocumentStructureHtml, "旧", "_site/docs/ja/guide/document-structure.html should not describe itself as an old document.");
expectNotContains(guideDocumentStructureHtml, "docs/user", "_site/docs/ja/guide/document-structure.html should not point readers to the removed user path.");
const guideActionsHtml = readSiteFile("docs/ja/guide/actions.html");
expectContains(guideActionsHtml, "A-Save", "_site/docs/ja/guide/actions.html should include a minimal action example.");
expectContains(guideActionsHtml, "examples/showcase/form-submit-flow.html", "_site/docs/ja/guide/actions.html should link to the form submit showcase.");
expectContains(guideActionsHtml, "reference/index.html", "_site/docs/ja/guide/actions.html should link to reference.");
const guidePartialsHtml = readSiteFile("docs/ja/guide/partial-updates.html");
expectContains(guidePartialsHtml, "mode: replace", "_site/docs/ja/guide/partial-updates.html should include partial update replacement semantics.");
expectContains(guidePartialsHtml, "profile-summary.partial.html", "_site/docs/ja/guide/partial-updates.html should link to the partial showcase.");
expectContains(readSiteFile("docs/en/guide/actions.html"), "A-SubmitLogin", "_site/docs/en/guide/actions.html should include a minimal action example.");
const enGuideDocumentStructureHtml = readSiteFile("docs/en/guide/document-structure.html");
expectContains(enGuideDocumentStructureHtml, "MarkVSpec Document Structure", "_site/docs/en/guide/document-structure.html should preserve the visual document structure guide.");
expectContains(enGuideDocumentStructureHtml, 'aria-current="page">MarkVSpec Document Structure</a>', "_site/docs/en/guide/document-structure.html sidebar should mark the current page.");
expectNotContains(enGuideDocumentStructureHtml, "* { box-sizing: border-box; }", "_site/docs/en/guide/document-structure.html should not override the standard docs shell width model.");
expectNotContains(enGuideDocumentStructureHtml, "docs/user", "_site/docs/en/guide/document-structure.html should not point readers to the removed user path.");
expectContains(readSiteFile("docs/en/guide/actions.html"), "examples/showcase/form-submit-flow.html", "_site/docs/en/guide/actions.html should link to the form submit showcase.");
expectContains(readSiteFile("docs/en/guide/partial-updates.html"), "mode: replace", "_site/docs/en/guide/partial-updates.html should include partial update replacement semantics.");
expectContains(readSiteFile("docs/en/guide/partial-updates.html"), "profile-summary.partial.html", "_site/docs/en/guide/partial-updates.html should link to the partial showcase.");

const recipeIndexHtml = readSiteFile("docs/ja/recipes/index.html");
expectContains(recipeIndexHtml, "login-form.html", "_site/docs/ja/recipes/index.html should link to login form recipe.");
expectContains(recipeIndexHtml, "server-partial-update.html", "_site/docs/ja/recipes/index.html should link to server partial update recipe.");
const loginRecipeHtml = readSiteFile("docs/ja/recipes/login-form.html");
expectContains(loginRecipeHtml, "examples/showcase/login-basic.html", "_site/docs/ja/recipes/login-form.html should link to Login Basic showcase.");
expectContains(loginRecipeHtml, "guide/actions.html", "_site/docs/ja/recipes/login-form.html should link to actions guide.");
expectContains(loginRecipeHtml, "guide/validation.html", "_site/docs/ja/recipes/login-form.html should link to validation guide.");
const partialRecipeHtml = readSiteFile("docs/ja/recipes/server-partial-update.html");
expectContains(partialRecipeHtml, "semantic action/display change", "_site/docs/ja/recipes/server-partial-update.html should explain semantic partial updates.");
expectContains(partialRecipeHtml, "mode: replace", "_site/docs/ja/recipes/server-partial-update.html should include replacement semantics.");
expectContains(partialRecipeHtml, "hx-get", "_site/docs/ja/recipes/server-partial-update.html should explicitly avoid raw htmx attributes.");
expectOrder(
  readSiteFile("docs/ja/recipes/loading-error.html"),
  ["## States", "### error", "## Actions", "### A-LoadItems Load items"],
  "_site/docs/ja/recipes/loading-error.html should place loading action under Actions."
);
expectContains(readSiteFile("docs/en/recipes/login-form.html"), "examples/showcase/login-basic.html", "_site/docs/en/recipes/login-form.html should link to Login Basic showcase.");
expectContains(readSiteFile("docs/en/recipes/server-partial-update.html"), "semantic action/display change", "_site/docs/en/recipes/server-partial-update.html should explain semantic partial updates.");
expectOrder(
  readSiteFile("docs/en/recipes/loading-error.html"),
  ["## States", "### error", "## Actions", "### A-LoadItems Load items"],
  "_site/docs/en/recipes/loading-error.html should place loading action under Actions."
);

const referenceIndexHtml = readSiteFile("docs/ja/reference/index.html");
expectContains(referenceIndexHtml, "file-format.html", "_site/docs/ja/reference/index.html should link to file format reference.");
expectContains(referenceIndexHtml, "validations.html", "_site/docs/ja/reference/index.html should link to validations reference.");
expectContains(referenceIndexHtml, "rules.html", "_site/docs/ja/reference/index.html should link to rules reference.");
expectContains(referenceIndexHtml, "<table>", "_site/docs/ja/reference/index.html should render reference pages as an HTML table.");
expectNotContains(referenceIndexHtml, "<p>| Page |", "_site/docs/ja/reference/index.html should not render Markdown table syntax as text.");
expectContains(readSiteFile("docs/ja/guide/index.html"), "<ol>", "_site/docs/ja/guide/index.html should render ordered reading steps as an ordered list.");
const referenceActionsHtml = readSiteFile("docs/ja/reference/actions.html");
expectContains(referenceActionsHtml, "server:", "_site/docs/ja/reference/actions.html should document request process syntax.");
expectContains(referenceActionsHtml, "mode: replace", "_site/docs/ja/reference/actions.html should document update replacement semantics.");
expectContains(referenceActionsHtml, "examples/showcase/form-submit-flow.html", "_site/docs/ja/reference/actions.html should link back to action example.");
const referenceElementsHtml = readSiteFile("docs/ja/reference/elements.html");
expectContains(referenceElementsHtml, "variant", "_site/docs/ja/reference/elements.html should document element properties.");
expectContains(referenceElementsHtml, "raw color", "_site/docs/ja/reference/elements.html should discourage low-level visual styling.");
const referenceRulesHtml = readSiteFile("docs/ja/reference/rules.html");
expectContains(referenceRulesHtml, "Validator Diagnostics", "_site/docs/ja/reference/rules.html should separate rules from validator diagnostics.");
expectContains(readSiteFile("docs/en/reference/actions.html"), "server:", "_site/docs/en/reference/actions.html should document request process syntax.");
expectContains(readSiteFile("docs/en/reference/rules.html"), "Validator Diagnostics", "_site/docs/en/reference/rules.html should separate rules from validator diagnostics.");
for (const removedUserDir of ["docs/ja/user", "docs/en/user"]) {
  if (existsSync(join(siteDir, removedUserDir))) {
    failures.push(`${removedUserDir} should not be generated after the new documentation structure replaced it.`);
  }
}

const examplesHtml = readSiteFile("examples/index.html");
expectContains(examplesHtml, "MarkVSpec Examples", "_site/examples/index.html should be the examples index.");
expectContains(examplesHtml, 'href="../favicon.svg"', "_site/examples/index.html should set the MarkVSpec favicon.");
expectContains(examplesHtml, 'src="../assets/markvspec-icon.svg"', "_site/examples/index.html should show the MarkVSpec icon.");
expectContains(examplesHtml, "hello-screen.html", "_site/examples/index.html should link to Hello Screen.");
expectContains(examplesHtml, "showcase/hello-screen.html", "_site/examples/index.html should link to the Hello Screen showcase.");
expectContains(examplesHtml, "Source + Preview", "_site/examples/index.html should label showcase links.");
expectContains(examplesHtml, ">Preview<", "_site/examples/index.html should keep preview-only links.");
expectContains(examplesHtml, "examples/01-basics/hello-screen.vspec.md", "_site/examples/index.html should show the source path.");
expectContains(examplesHtml, "Learning Path", "_site/examples/index.html should expose the catalog learning path.");
expectContains(examplesHtml, "Step 1", "_site/examples/index.html should number learning path examples.");
expectOrder(
  examplesHtml,
  ["Hello Screen", "Step 1", "Async Fetching", "Step 2", "Responsive Profile", "Step 3", "Form Submit Flow", "Step 4", "Single Field Validation", "Step 5", "Display Updates", "Step 6"],
  "_site/examples/index.html should order the learning path from catalog next links."
);
expectOrder(
  examplesHtml,
  ["Search List", "Step 8", "Account Shell", "Step 9", "Basic Slot Page", "Step 10"],
  "_site/examples/index.html should not fall back to alphabetical order inside the learning path."
);
expectContains(examplesHtml, "Teaches: Front Matter", "_site/examples/index.html should show teaches metadata.");
expectContains(examplesHtml, '<span class="pill">template</span>', "_site/examples/index.html should identify template examples.");
expectContains(examplesHtml, '<span class="pill">partial</span>', "_site/examples/index.html should identify partial examples.");

const docsEnExamplesHtml = readSiteFile("docs/en/examples/index.html");
expectNotContains(docsEnExamplesHtml, "Stub", "_site/docs/en/examples/index.html should not be a stub.");
expectContains(docsEnExamplesHtml, "../../../examples/", "_site/docs/en/examples/index.html should link to the generated example catalog.");
expectContains(docsEnExamplesHtml, "../../../examples/showcase/hello-screen.html", "_site/docs/en/examples/index.html should link to English example showcases.");

for (const filePath of [
  "docs/en/start/index.html",
  "docs/en/start/first-screen.html",
  "docs/en/start/preview.html",
  "docs/en/start/export.html",
  "docs/en/guide/index.html",
  "docs/en/guide/markdown-model.html",
  "docs/en/guide/states.html",
  "docs/en/guide/layout.html",
  "docs/en/guide/elements.html",
  "docs/en/guide/actions.html",
  "docs/en/guide/validation.html",
  "docs/en/guide/partial-updates.html",
  "docs/en/reference/index.html",
  "docs/en/reference/file-format.html",
  "docs/en/reference/sections.html",
  "docs/en/reference/elements.html",
  "docs/en/reference/actions.html",
  "docs/en/reference/validations.html",
  "docs/en/reference/rules.html",
  "docs/en/reference/ids.html",
  "docs/en/reference/cli.html",
  "docs/en/reference/limitations.html",
  "docs/en/recipes/index.html",
  "docs/en/recipes/login-form.html",
  "docs/en/recipes/loading-error.html",
  "docs/en/recipes/server-partial-update.html",
  "docs/en/recipes/pdf-export.html",
  "docs/en/examples/index.html",
  "docs/en/concepts/index.html"
]) {
  expectNotContains(readSiteFile(filePath), 'href="../ja/', `${filePath} should keep English IA navigation in English.`);
  expectNotContains(readSiteFile(filePath), 'href="../../ja/', `${filePath} should keep English IA navigation in English.`);
  expectNotContains(readSiteFile(filePath), "/docs/ja/", `${filePath} should not route English IA readers to Japanese docs.`);
}

for (const filePath of [
  "docs/ja/guide/document-structure.html",
  "docs/en/guide/document-structure.html"
]) {
  expectLocalLinks(filePath);
}

const generatedExamples = readdirSync(join(siteDir, "examples")).filter((entry) => entry.endsWith(".html") && entry !== "index.html");
if (generatedExamples.length === 0) {
  failures.push("_site/examples should contain generated example HTML files.");
}

const generatedShowcases = readdirSync(join(siteDir, "examples", "showcase")).filter((entry) => entry.endsWith(".html"));
if (generatedShowcases.length !== generatedExamples.length) {
  failures.push(`_site/examples/showcase should contain one showcase per generated example (${generatedExamples.length} expected, ${generatedShowcases.length} found).`);
}

for (const filePath of ["examples/index.html", ...generatedShowcases.map((entry) => `examples/showcase/${entry}`)]) {
  expectLocalLinks(filePath);
}

for (const filePath of [
  "index.html",
  "docs/ja/index.html",
  "docs/en/index.html",
  ...newIaIndexFiles
]) {
  expectLocalLinks(filePath);
}

const helloShowcaseHtml = readSiteFile("examples/showcase/hello-screen.html");
expectContains(helloShowcaseHtml, 'href="../../favicon.svg"', "_site/examples/showcase/hello-screen.html should set the MarkVSpec favicon.");
expectContains(helloShowcaseHtml, 'src="../../assets/markvspec-icon.svg"', "_site/examples/showcase/hello-screen.html should show the MarkVSpec icon.");
expectContains(helloShowcaseHtml, 'class="example-sidebar"', "_site/examples/showcase/hello-screen.html should show example navigation.");
expectContains(helloShowcaseHtml, 'href="login-basic.html"', "_site/examples/showcase/hello-screen.html sidebar should link to other showcases.");
expectContains(helloShowcaseHtml, 'aria-current="page">Hello Screen</a>', "_site/examples/showcase/hello-screen.html sidebar should mark the current example.");
expectContains(helloShowcaseHtml, "Source and generated preview, side by side", "_site/examples/showcase/hello-screen.html should be a showcase page.");
expectContains(helloShowcaseHtml, '<iframe src="../hello-screen.html"', "_site/examples/showcase/hello-screen.html should embed the generated preview.");
expectContains(helloShowcaseHtml, '<span class="line-no">1</span>', "_site/examples/showcase/hello-screen.html should show source line numbers.");
expectContains(helloShowcaseHtml, "SCR-HELLO", "_site/examples/showcase/hello-screen.html should render escaped source lines as HTML elements.");
expectContains(helloShowcaseHtml, "Open preview only", "_site/examples/showcase/hello-screen.html should keep a preview-only link.");
expectContains(helloShowcaseHtml, "What this teaches", "_site/examples/showcase/hello-screen.html should show teaches metadata.");
expectContains(helloShowcaseHtml, "Guide: Markdown Model", "_site/examples/showcase/hello-screen.html should link to related guide docs.");
expectContains(helloShowcaseHtml, "Reference: File Format", "_site/examples/showcase/hello-screen.html should link to related reference docs.");
expectContains(helloShowcaseHtml, "Async Fetching", "_site/examples/showcase/hello-screen.html should link to the next example.");

const loginShowcaseHtml = readSiteFile("examples/showcase/login-basic.html");
expectContains(loginShowcaseHtml, 'class="example-sidebar"', "_site/examples/showcase/login-basic.html should show example navigation.");
expectContains(loginShowcaseHtml, 'href="hello-screen.html"', "_site/examples/showcase/login-basic.html sidebar should link back to other showcases.");
expectContains(loginShowcaseHtml, 'aria-current="page">Login</a>', "_site/examples/showcase/login-basic.html sidebar should mark the current example.");
expectContains(loginShowcaseHtml, "Recipes: Login Form", "_site/examples/showcase/login-basic.html should link to the login recipe.");
expectContains(loginShowcaseHtml, '<span class="pill">kind screen</span>', "_site/examples/showcase/login-basic.html should show the example kind.");

for (const readmePath of ["README.md", "README.ja.md"]) {
  const readme = readFileSync(join(root, readmePath), "utf8");
  for (const url of findPagesUrls(readme)) {
    const artifactPath = artifactPathForPagesUrl(url);
    if (artifactPath) {
      expectFile(artifactPath, `${readmePath} links to missing Pages artifact: ${url}`);
    }
  }
}

for (const htmlPath of collectFiles(siteDir, (filePath) => filePath.endsWith(".html"))) {
  const relativePath = htmlPath.slice(siteDir.length + 1);
  const html = readFileSync(htmlPath, "utf8");
  if (/<p>\s*\|/u.test(html)) {
    failures.push(`${relativePath} should not render Markdown table syntax as paragraph text.`);
  }
  if (/<p>\s*\d+\.\s/u.test(html)) {
    failures.push(`${relativePath} should not render ordered Markdown list syntax as paragraph text.`);
  }
  if (/<p>\s*[-*+]\s/u.test(html)) {
    failures.push(`${relativePath} should not render unordered Markdown list syntax as paragraph text.`);
  }
}

if (failures.length > 0) {
  console.error("Pages site check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Pages site check passed (${generatedExamples.length} generated example pages).`);

function expectFile(filePath, message = `Missing _site artifact: ${filePath}`) {
  if (!existsSync(join(siteDir, filePath))) {
    failures.push(message);
  }
}

function readSiteFile(filePath) {
  const absolutePath = join(siteDir, filePath);
  if (!existsSync(absolutePath)) {
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function expectContains(content, needle, message) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function expectNotContains(content, needle, message) {
  if (content.includes(needle)) {
    failures.push(message);
  }
}

function expectOccurrenceCount(content, needle, expectedCount, message) {
  const actualCount = content.split(needle).length - 1;
  if (actualCount !== expectedCount) {
    failures.push(`${message} Expected ${expectedCount}, found ${actualCount}.`);
  }
}

function expectNoStubMarker(filePath) {
  const content = readFileSync(join(root, filePath), "utf8");
  if (/\b(?:Stub|TODO|TBD|coming soon)\b/iu.test(content)) {
    failures.push(`${filePath} should contain finished English documentation, not stub markers.`);
  }
}

function expectSameList(left, right, message) {
  const leftOnly = left.filter((entry) => !right.includes(entry));
  const rightOnly = right.filter((entry) => !left.includes(entry));
  if (leftOnly.length > 0 || rightOnly.length > 0) {
    failures.push(`${message}. ja-only: ${leftOnly.join(", ") || "-"}; en-only: ${rightOnly.join(", ") || "-"}`);
  }
}

function expectOrder(content, needles, message) {
  let offset = -1;
  for (const needle of needles) {
    const nextOffset = content.indexOf(needle, offset + 1);
    if (nextOffset === -1) {
      failures.push(`${message} Missing or out of order: ${needle}`);
      return;
    }
    offset = nextOffset;
  }
}

function expectLocalLinks(filePath) {
  const html = readSiteFile(filePath);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gu)) {
    const href = match[1];
    if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(href)) {
      continue;
    }

    const [pathPart] = href.split(/[?#]/u, 1);
    if (!pathPart) {
      continue;
    }

    const targetPath = normalize(join(dirname(filePath), pathPart.endsWith("/") ? `${pathPart}index.html` : pathPart));
    if (targetPath.startsWith("..")) {
      failures.push(`${filePath} links outside _site: ${href}`);
      continue;
    }

    expectFile(targetPath, `${filePath} links to missing local artifact: ${href}`);
  }
}

function findPagesUrls(markdown) {
  return [...markdown.matchAll(/https:\/\/wamukat\.github\.io\/markvspec[^\s)"]*/gu)]
    .map((match) => match[0].replace(/[.,;:]$/u, ""));
}

function artifactPathForPagesUrl(url) {
  const parsed = new URL(url);
  if (parsed.origin + "/markvspec" !== pagesOrigin) {
    return undefined;
  }

  const relativePath = decodeURIComponent(parsed.pathname.replace(/^\/markvspec\/?/u, ""));
  if (!relativePath || relativePath.endsWith("/")) {
    return `${relativePath}index.html`;
  }
  if (relativePath.endsWith(".html")) {
    return relativePath;
  }
  return undefined;
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

function collectNewIaSourceFiles(lang) {
  const baseDir = join(root, "docs", lang);
  return newIaSourceSections.flatMap((section) => {
    const sectionDir = join(baseDir, section);
    return collectFiles(sectionDir, (filePath) => filePath.endsWith(".md"))
      .map((filePath) => filePath.slice(baseDir.length + 1));
  }).sort((a, b) => a.localeCompare(b));
}
