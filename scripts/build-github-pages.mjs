import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { loadExampleCatalog, validateExampleCatalog } from "./example-catalog.mjs";

const root = process.cwd();
const outputDir = join(root, "_site");
const docsSiteDir = join(root, "docs-site");
const docsSiteDistDir = join(docsSiteDir, "dist");
const publicExamplesDir = join(docsSiteDir, "public", "examples");
const publicAssetsDir = join(docsSiteDir, "public", "assets");
const workDir = join(root, ".work");
const generatedExamplesWorkDirPrefix = join(workDir, "docs-site-generated-examples-");
const sourceExamplesDir = join(publicExamplesDir, "source");
const exampleAssetsDir = join(publicExamplesDir, "assets");
const examplesDir = join(root, "examples");
const brandAssetsDir = join(root, "assets");
const buildLockDir = join(workDir, "build-github-pages.lock");

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

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function prepareExampleArtifacts(files) {
  rmSync(publicExamplesDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  const generatedExamplesWorkDir = mkdtempSync(generatedExamplesWorkDirPrefix);
  mkdirSync(generatedExamplesWorkDir, { recursive: true });
  mkdirSync(sourceExamplesDir, { recursive: true });

  execFileSync("node", ["packages/cli/dist/index.js", "export", "html", "examples/**/*.vspec.md", "--out", generatedExamplesWorkDir], {
    stdio: "inherit",
  });

  for (const filePath of files) {
    const relativeExamplePath = relative(examplesDir, filePath);
    const outputPath = join(sourceExamplesDir, relativeExamplePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    cpSync(filePath, outputPath);
  }

  execFileSync("node", ["scripts/lighten-docs-example-previews.mjs", generatedExamplesWorkDir, exampleAssetsDir], {
    stdio: "inherit",
  });

  rmSync(generatedExamplesWorkDir, { recursive: true, force: true });
}

function buildExampleExportTooling() {
  execFileSync("npm", ["run", "build:example-export-tooling"], { stdio: "inherit" });
}

function prepareBrandAssets() {
  rmSync(publicAssetsDir, { recursive: true, force: true });
  cpSync(brandAssetsDir, publicAssetsDir, { recursive: true });
}

function validateCatalog(files) {
  const catalog = loadExampleCatalog(root);
  const { errors, warnings } = validateExampleCatalog(catalog, { root, exampleFiles: files });
  if (errors.length > 0) {
    throw new Error(`Example catalog validation failed:\n- ${errors.join("\n- ")}`);
  }
  for (const warning of warnings) {
    console.warn(`Example catalog warning: ${warning}`);
  }
  console.log(`Loaded ${catalog.examples.length} example catalog entries.`);
}

function copyBuiltDocsSite() {
  rmSync(outputDir, { recursive: true, force: true });
  cpSync(docsSiteDistDir, outputDir, { recursive: true });
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function acquireBuildLock() {
  mkdirSync(workDir, { recursive: true });
  const startedAt = Date.now();
  while (true) {
    try {
      mkdirSync(buildLockDir);
      return () => rmSync(buildLockDir, { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      const lockAge = Date.now() - statSync(buildLockDir).mtimeMs;
      if (lockAge > 300_000) {
        rmSync(buildLockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() - startedAt > 120_000) {
        throw new Error(`Timed out waiting for Pages build lock at ${buildLockDir}.`);
      }
      sleep(250);
    }
  }
}

const releaseBuildLock = acquireBuildLock();
try {
  const files = collectVspecFiles(examplesDir);
  assertUniqueOutputNames(files);
  validateCatalog(files);
  buildExampleExportTooling();
  console.log(`Preparing ${files.length} example source assets and shared preview assets.`);
  prepareExampleArtifacts(files);
  prepareBrandAssets();

  execFileSync("npm", ["run", "docs:grammar"], {
    stdio: "inherit",
  });

  execFileSync("npm", ["run", "docs:reference"], {
    stdio: "inherit",
  });

  execFileSync("node", ["scripts/sync-docs-site-content.mjs"], {
    stdio: "inherit",
  });

  execFileSync("npm", ["--prefix", "docs-site", "run", "build"], {
    stdio: "inherit",
  });

  copyBuiltDocsSite();

  console.log(`Pages site built in ${toPosixPath(relative(root, outputDir))}.`);
} finally {
  releaseBuildLock();
}
