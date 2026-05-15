import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function normalizedText(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function includesTextIgnoringWhitespace(haystack, needle) {
  return normalizedText(haystack).includes(normalizedText(needle));
}

function fail(message) {
  failures.push(message);
}

const rootPackage = readJson("package.json");
const extensionPackage = readJson("packages/vscode-extension/package.json");
const packagePaths = [
  "packages/core/package.json",
  "packages/document-renderer/package.json",
  "packages/exporter/package.json",
  "packages/cli/package.json",
  "packages/vscode-extension/package.json"
];
const releaseVersion = rootPackage.version;
const expectedVsix = `markvspec-${extensionPackage.version}.vsix`;
const expectedDistVsix = `dist/${expectedVsix}`;
const expectedMarketplaceUrl = `https://marketplace.visualstudio.com/items?itemName=${extensionPackage.publisher}.${extensionPackage.name}`;
const expectedExtensionId = `${extensionPackage.publisher}.${extensionPackage.name}`;

if (extensionPackage.version !== releaseVersion) {
  fail(`Root package version ${releaseVersion} does not match VS Code extension version ${extensionPackage.version}.`);
}

for (const packagePath of packagePaths) {
  const packageJson = readJson(packagePath);
  if (packageJson.version !== releaseVersion) {
    fail(`${packagePath} version ${packageJson.version} does not match root version ${releaseVersion}.`);
  }
}

if (!extensionPackage.scripts?.["package:vsix"]?.includes("--out ../../dist/markvspec-${npm_package_version}.vsix")) {
  fail("packages/vscode-extension package:vsix script must output ../../dist/markvspec-${npm_package_version}.vsix.");
}

const readmeExpectations = [
  {
    path: "README.md"
  },
  {
    path: "README.ja.md"
  }
];

for (const { path: readmePath } of readmeExpectations) {
  const readme = readText(readmePath);
  if (!readme.includes(expectedMarketplaceUrl)) {
    fail(`${readmePath} must link to the VS Code Marketplace listing: ${expectedMarketplaceUrl}`);
  }
  if (!readme.includes(expectedExtensionId)) {
    fail(`${readmePath} must mention the VS Code Marketplace extension ID ${expectedExtensionId}.`);
  }
  const deprecatedVsixInstallMentions = [
    "code --install-extension ~/Downloads/",
    "Download `markvspec-",
    "VSIX を入れる",
    "Install the VSIX"
  ];
  for (const deprecatedText of deprecatedVsixInstallMentions) {
    if (includesTextIgnoringWhitespace(readme, deprecatedText)) {
      fail(`${readmePath} must not present VSIX as the user-facing install path: ${deprecatedText}`);
    }
  }
  if (!readme.includes("npm run check:readme-release")) {
    fail(`${readmePath} must document the README release-state check.`);
  }
}

for (const checklistPath of ["docs/en/maintainers/release-checklist.md", "docs/ja/maintainers/release-checklist.md"]) {
  const checklist = readText(checklistPath);
  if (!checklist.includes("npm run check:readme-release")) {
    fail(`${checklistPath} must include npm run check:readme-release in the release checklist.`);
  }
  if (!checklist.includes(expectedDistVsix)) {
    fail(`${checklistPath} must mention the current VSIX artifact path ${expectedDistVsix}.`);
  }
}

if (failures.length > 0) {
  console.error("README release-state check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`README release-state check passed for ${releaseVersion} (${expectedExtensionId}).`);
