import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const generatedDir = process.argv[2];
const assetsDir = process.argv[3];

if (!generatedDir || !assetsDir) {
  console.error("Usage: node scripts/lighten-docs-example-previews.mjs <generated-dir> <assets-dir>");
  process.exit(1);
}

const stylesheetHref = "../assets/markvspec-preview.css";
const mermaidScriptHref = "../assets/markvspec-mermaid.js";
const mermaidRuntimeHref = "../assets/markvspec-mermaid-runtime.js";

const headStylePattern = /\n    <style>\n([\s\S]*?)\n    <\/style>/u;
const printStylePattern = /\n    <style>\n      @media print \{[\s\S]*?\n    <\/style>\n  <\/body>/u;
const postMainScriptPattern = /\n    <script>\n([\s\S]*?)\n    <\/script>/gu;

const htmlFiles = readdirSync(generatedDir)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

if (htmlFiles.length === 0) {
  throw new Error(`No generated HTML files found in ${generatedDir}.`);
}

mkdirSync(assetsDir, { recursive: true });

let sharedHeadStyle = "";
let sharedPrintStyle = "";
let sharedMermaidScript = "";
let sharedMermaidRuntime = "";
let originalBytes = 0;
let optimizedBytes = 0;

for (const fileName of htmlFiles) {
  const filePath = join(generatedDir, fileName);
  const originalHtml = readFileSync(filePath, "utf8");
  originalBytes += statSync(filePath).size;

  const headStyleMatch = originalHtml.match(headStylePattern);
  if (!headStyleMatch) {
    throw new Error(`Unable to find head stylesheet in ${filePath}.`);
  }
  if (headStyleMatch[1].length > sharedHeadStyle.length) {
    sharedHeadStyle = headStyleMatch[1];
  }

  const printStyleMatch = originalHtml.match(printStylePattern);
  if (printStyleMatch) {
    const printStyle = printStyleMatch[0]
      .replace(/^\n    <style>\n/u, "")
      .replace(/\n    <\/style>\n  <\/body>$/u, "");
    if (printStyle.length > sharedPrintStyle.length) {
      sharedPrintStyle = printStyle;
    }
  }

  const postMainStart = originalHtml.indexOf("\n    </main>");
  const postMainHtml = postMainStart >= 0 ? originalHtml.slice(postMainStart) : "";
  const postMainScripts = [...postMainHtml.matchAll(postMainScriptPattern)].map((match) => match[1]);
  const mermaidScript = postMainScripts.find((script) => script.includes("mermaidAPI") || script.includes("mermaid.version"));
  const mermaidRuntime = postMainScripts.find((script) => script.includes("renderMermaidDiagrams"));
  if (mermaidScript && mermaidScript.length > sharedMermaidScript.length) {
    sharedMermaidScript = mermaidScript;
  }
  if (mermaidRuntime && mermaidRuntime.length > sharedMermaidRuntime.length) {
    sharedMermaidRuntime = mermaidRuntime;
  }
}

if (!sharedHeadStyle) {
  throw new Error("Unable to build shared preview stylesheet.");
}

writeFileSync(
  join(assetsDir, "markvspec-preview.css"),
  `${sharedHeadStyle}\n${sharedPrintStyle ? `\n${sharedPrintStyle}\n` : ""}`,
  "utf8"
);

if (sharedMermaidScript) {
  writeFileSync(join(assetsDir, "markvspec-mermaid.js"), sharedMermaidScript, "utf8");
}
if (sharedMermaidRuntime) {
  writeFileSync(join(assetsDir, "markvspec-mermaid-runtime.js"), sharedMermaidRuntime, "utf8");
}

for (const fileName of htmlFiles) {
  const filePath = join(generatedDir, fileName);
  let html = readFileSync(filePath, "utf8");
  const postMainStart = html.indexOf("\n    </main>");
  const postMainHtml = postMainStart >= 0 ? html.slice(postMainStart) : "";
  const hasMermaidScripts = postMainHtml.includes("renderMermaidDiagrams");
  const scriptTags = hasMermaidScripts
    ? `\n    <script src="${mermaidScriptHref}"></script>\n    <script src="${mermaidRuntimeHref}"></script>`
    : "";

  html = html.replace(
    headStylePattern,
    `\n    <link rel="stylesheet" href="${stylesheetHref}">`
  );

  if (hasMermaidScripts) {
    html = html.replace(
      /(\n    <script>\n[\s\S]*?\n    <\/script>){2}/u,
      scriptTags
    );
  }

  html = html.replace(printStylePattern, "\n  </body>");
  writeFileSync(filePath, html, "utf8");
  optimizedBytes += Buffer.byteLength(html, "utf8");
}

console.log(
  `Optimized ${htmlFiles.length} docs-site preview HTML artifact(s): ${formatBytes(originalBytes)} -> ${formatBytes(optimizedBytes)} plus shared assets in ${basename(assetsDir)}.`
);

function formatBytes(value) {
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}
