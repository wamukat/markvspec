import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const root = process.cwd();
const siteDir = join(root, "_site");
const pagesOrigin = "https://wamukat.github.io/markvspec";
const requiredFiles = [
  "index.html",
  "examples/index.html",
  "examples/hello-screen.html",
  "examples/showcase/hello-screen.html",
  "docs/ja/user/authoring-guide.html",
  "docs/en/user/authoring-guide.html",
  "docs/ja/user/document-structure.html",
  "docs/en/user/document-structure.html",
  "docs/ja/user/structured-section-reference.html",
  "docs/en/user/structured-section-reference.html",
  "docs/ja/user/ui-coverage.html",
  "docs/en/user/ui-coverage.html",
  "docs/ja/start/index.html",
  "docs/en/start/index.html",
  "docs/ja/guide/index.html",
  "docs/en/guide/index.html",
  "docs/ja/reference/index.html",
  "docs/en/reference/index.html",
  "docs/ja/recipes/index.html",
  "docs/en/recipes/index.html",
  "docs/ja/examples/index.html",
  "docs/en/examples/index.html",
  "docs/ja/concepts/index.html",
  "docs/en/concepts/index.html",
  "docs/assets/readme-hello-screen-preview.png"
];

const newIaIndexFiles = [
  "docs/ja/start/index.html",
  "docs/en/start/index.html",
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

const failures = [];

for (const filePath of requiredFiles) {
  expectFile(filePath);
}

const rootHtml = readSiteFile("index.html");
if (!rootHtml.includes("data-markvspec-home")) {
  failures.push("_site/index.html must be the static MarkVSpec top page.");
}
if (rootHtml.includes("Generated static HTML previews for the shipped MarkVSpec examples.")) {
  failures.push("_site/index.html must not be the generated examples index.");
}
expectContains(rootHtml, 'href="examples/"', "_site/index.html should link to /examples/.");
expectContains(rootHtml, 'href="docs/ja/user/authoring-guide.html"', "_site/index.html should link to the Japanese authoring guide.");
expectContains(rootHtml, 'href="docs/en/user/authoring-guide.html"', "_site/index.html should link to the English authoring guide.");
expectContains(rootHtml, 'href="docs/ja/user/ui-coverage.html"', "_site/index.html should link to the Japanese UI coverage page.");
expectContains(rootHtml, 'href="docs/en/user/ui-coverage.html"', "_site/index.html should link to the English UI coverage page.");

const examplesHtml = readSiteFile("examples/index.html");
expectContains(examplesHtml, "MarkVSpec Examples", "_site/examples/index.html should be the examples index.");
expectContains(examplesHtml, "hello-screen.html", "_site/examples/index.html should link to Hello Screen.");
expectContains(examplesHtml, "showcase/hello-screen.html", "_site/examples/index.html should link to the Hello Screen showcase.");
expectContains(examplesHtml, "Source + Preview", "_site/examples/index.html should label showcase links.");
expectContains(examplesHtml, ">Preview<", "_site/examples/index.html should keep preview-only links.");
expectContains(examplesHtml, "examples/01-basics/hello-screen.vspec.md", "_site/examples/index.html should show the source path.");

for (const coveragePath of ["docs/ja/user/ui-coverage.html", "docs/en/user/ui-coverage.html"]) {
  const coverageHtml = readSiteFile(coveragePath);
  for (const term of ["Tabs", "Popover", "Tooltip", "Accordion", "Disclosure", "ActionMenu"]) {
    expectContains(coverageHtml, term, `${coveragePath} should mention ${term}.`);
  }
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

for (const filePath of newIaIndexFiles) {
  expectLocalLinks(filePath);
}

const helloShowcaseHtml = readSiteFile("examples/showcase/hello-screen.html");
expectContains(helloShowcaseHtml, "Source and generated preview, side by side", "_site/examples/showcase/hello-screen.html should be a showcase page.");
expectContains(helloShowcaseHtml, '<iframe src="../hello-screen.html"', "_site/examples/showcase/hello-screen.html should embed the generated preview.");
expectContains(helloShowcaseHtml, '<span class="line-no">1</span>', "_site/examples/showcase/hello-screen.html should show source line numbers.");
expectContains(helloShowcaseHtml, "SCR-HELLO", "_site/examples/showcase/hello-screen.html should render escaped source lines as HTML elements.");
expectContains(helloShowcaseHtml, "Open preview only", "_site/examples/showcase/hello-screen.html should keep a preview-only link.");

for (const readmePath of ["README.md", "README.ja.md"]) {
  const readme = readFileSync(join(root, readmePath), "utf8");
  for (const url of findPagesUrls(readme)) {
    const artifactPath = artifactPathForPagesUrl(url);
    if (artifactPath) {
      expectFile(artifactPath, `${readmePath} links to missing Pages artifact: ${url}`);
    }
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
