import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const workDir = join(root, ".work", "core-browser-entry-check");
const entryPath = join(workDir, "entry.js");
const bundlePath = join(workDir, "markvspec-core-browser.js");
const metafilePath = join(workDir, "metafile.json");
const reportPath = join(workDir, "report.md");
const maxGzipBytes = 140 * 1024;

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function posix(path) {
  return path.split(/[\\/]/u).join("/");
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

run("npm", ["run", "build", "-w", "@markvspec/core"]);

const browserModule = await import("@markvspec/core/browser");
const source = `---
id: SCR-BROWSER-CHECK
type: screen
title: Browser Check
---

# SCR-BROWSER-CHECK Browser Check

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- level: 1
- text: Browser check
`;
const result = browserModule.parseMarkVSpec(source);
const html = browserModule.renderMarkVSpecHtml(result, { showIds: true });
const dangerousSource = `---
id: SCR-BROWSER-XSS
type: screen
title: Browser XSS Check
route: /browser/:payload
---

# SCR-BROWSER-XSS Browser XSS Check

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
`;
const dangerousResult = browserModule.parseMarkVSpec(dangerousSource);
const dangerousHtml = browserModule.renderMarkVSpecHtml(dangerousResult, {
  includeStyles: false,
  routeValues: { payload: "javascript:globalThis.__markvspecXss = true" },
  showIds: true,
  state: "idle",
  viewport: "desktop"
});

if (result.diagnostics.length !== 0) {
  throw new Error(`Browser entry smoke failed: expected 0 diagnostics, got ${result.diagnostics.length}.`);
}
if (!html.includes("mm-wireframe") || !html.includes("Browser check")) {
  throw new Error("Browser entry smoke failed: rendered HTML does not include the expected wireframe content.");
}
if (/<script\b|<iframe\b|<svg\b|<[^>]+\son[a-z]+\s*=|href="(?:javascript|vbscript|data):/iu.test(dangerousHtml)) {
  throw new Error("Browser entry smoke failed: dangerous author-controlled HTML or URL reached rendered output.");
}
if (!dangerousHtml.includes("href=\"#\"") || !dangerousHtml.includes("href=\"/safe/path\"")) {
  throw new Error("Browser entry smoke failed: dangerous links should be neutralized while safe relative links remain.");
}

writeFileSync(entryPath, `import {
  composeMarkVSpecTemplate,
  evaluateMarkVSpecDiagnostics,
  messagesForLocale,
  parseMarkVSpec,
  renderDiagnosticMessageForLocale,
  renderMarkVSpecHtml,
  renderMarkVSpecHtmlWithInvalidation,
  validateMarkVSpec
} from "@markvspec/core/browser";

const source = ${JSON.stringify(source)};
const result = parseMarkVSpec(source);
const composed = composeMarkVSpecTemplate(result, result);
validateMarkVSpec(result);
const diagnostics = evaluateMarkVSpecDiagnostics(result.diagnostics);
const html = renderMarkVSpecHtml(result, { showIds: true });
const dangerousSource = ${JSON.stringify(dangerousSource)};
const dangerousResult = parseMarkVSpec(dangerousSource);
const dangerousHtml = renderMarkVSpecHtml(dangerousResult, {
  includeStyles: false,
  routeValues: { payload: "javascript:globalThis.__markvspecXss = true" },
  showIds: true,
  state: "idle",
  viewport: "desktop"
});
const update = renderMarkVSpecHtmlWithInvalidation(source, source, { showIds: true });

globalThis.__markvspecBrowserCheck = {
  diagnostics,
  composedId: composed.screen.id,
  dangerousHtml,
  html,
  label: messagesForLocale("en").preview,
  message: result.diagnostics[0] ? renderDiagnosticMessageForLocale(result.diagnostics[0], "en") : "",
  update
};
`);

run("node_modules/.bin/esbuild", [
  entryPath,
  "--bundle",
  "--format=esm",
  "--platform=browser",
  "--minify",
  `--outfile=${bundlePath}`,
  `--metafile=${metafilePath}`
]);

const bundle = readFileSync(bundlePath);
const gzipBytes = gzipSync(bundle).byteLength;
const metafile = JSON.parse(readFileSync(metafilePath, "utf8"));
const nodeInputs = Object.keys(metafile.inputs).filter((input) => input.startsWith("node:") || input.includes("/node:"));

if (nodeInputs.length > 0) {
  throw new Error(`Browser entry bundle includes Node built-ins:\n- ${nodeInputs.join("\n- ")}`);
}
if (gzipBytes > maxGzipBytes) {
  throw new Error(`Browser entry bundle gzip size ${formatKiB(gzipBytes)} exceeds ${formatKiB(maxGzipBytes)}.`);
}

const report = `# Core Browser Entry Check

Generated by \`scripts/check-core-browser-entry.mjs\`.

## Result

- Package subpath: \`@markvspec/core/browser\`
- Browser bundle: pass
- Node built-in inputs: ${nodeInputs.length}
- Smoke diagnostics: ${result.diagnostics.length}
- Dangerous author-controlled HTML fixture: pass

## Artifacts

- Entry: \`${posix(relative(root, entryPath))}\`
- Bundle: \`${posix(relative(root, bundlePath))}\`
- Metafile: \`${posix(relative(root, metafilePath))}\`

## Metrics

- Bundle size: ${formatKiB(bundle.byteLength)}
- Gzip size: ${formatKiB(gzipBytes)}
- Gzip budget: ${formatKiB(maxGzipBytes)}
`;

writeFileSync(reportPath, report);
console.log(report);
