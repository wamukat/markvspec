import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const siteDir = join(root, "_site");
const pagesOrigin = "https://wamukat.github.io/markvspec";
const requiredFiles = [
  "index.html",
  "examples/index.html",
  "examples/hello-screen.html",
  "docs/ja/user/authoring-guide.html",
  "docs/en/user/authoring-guide.html",
  "docs/ja/user/document-structure.html",
  "docs/en/user/document-structure.html",
  "docs/ja/user/structured-section-reference.html",
  "docs/en/user/structured-section-reference.html",
  "docs/assets/readme-hello-screen-preview.png"
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

const examplesHtml = readSiteFile("examples/index.html");
expectContains(examplesHtml, "MarkVSpec Examples", "_site/examples/index.html should be the examples index.");
expectContains(examplesHtml, "hello-screen.html", "_site/examples/index.html should link to Hello Screen.");
expectContains(examplesHtml, "examples/01-basics/hello-screen.vspec.md", "_site/examples/index.html should show the source path.");

const generatedExamples = readdirSync(join(siteDir, "examples")).filter((entry) => entry.endsWith(".html") && entry !== "index.html");
if (generatedExamples.length === 0) {
  failures.push("_site/examples should contain generated example HTML files.");
}

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
