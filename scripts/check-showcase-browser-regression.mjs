import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, relative, sep } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const siteDir = join(root, "_site");
const examples = [
  "hello-screen",
  "login-basic",
  "history-and-errors",
  "profile-page-with-template",
];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const failures = [];
const checks = [];

if (!existsSync(join(siteDir, "examples", "showcase", "hello-screen.html", "index.html"))) {
  throw new Error("Missing _site showcase artifacts. Run `npm run check:docs-site` before this script.");
}

const server = createServer((request, response) => {
  try {
    serveStatic(request.url || "/", response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : String(error));
  }
});
let baseUrl = "";
let browser;

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}/markvspec`;
  browser = await launchChrome();

  try {
    for (const viewport of viewports) {
      for (const slug of examples) {
        await checkDynamicShowcase(slug, viewport);
      }
    }
    await checkFallbackPath();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length > 0) {
    console.error("Showcase browser regression failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Showcase browser regression passed (${checks.length} browser checks).`);
  for (const check of checks) {
    console.log(`- ${check}`);
  }
}

async function checkDynamicShowcase(slug, viewport) {
  const label = `${slug} ${viewport.name}`;
  console.log(`Checking ${label}...`);
  const page = await browser.newPage({ viewport });
  try {
    await page.navigate(`${baseUrl}/examples/showcase/${slug}.html`);
    const result = await waitForShowcaseResult(page, slug, (current) => current.status !== "loading" && current.status !== "" && mermaidSettled(current));

    if (result.status !== "ready" && result.status !== "diagnostics") {
      failures.push(`${label}: expected dynamic preview status ready/diagnostics, got ${result.status || "missing"}.`);
    }
    if (result.outputHidden) {
      failures.push(`${label}: dynamic preview output should be visible.`);
    }
    if (!result.fallbackHidden) {
      failures.push(`${label}: runtime failure UI should be hidden after successful dynamic render.`);
    }
    if (result.outputHtmlLength <= 0 || result.outputTextLength <= 0) {
      failures.push(`${label}: dynamic preview DOM should be non-empty.`);
    }
    if (!result.hasWireframeRoot) {
      failures.push(`${label}: dynamic preview should contain a rendered wireframe root.`);
    }
    if (!result.hasGeneratedDocumentSections) {
      failures.push(`${label}: dynamic preview should contain generated design document sections.`);
    }
    if (!result.sectionOrderValid) {
      failures.push(`${label}: dynamic preview section order should match VS Code preview order (${(result.sectionOrder ?? []).join(" > ")}).`);
    }
    if (!result.previewStylesApplied) {
      failures.push(`${label}: dynamic preview should apply the generated preview stylesheet.`);
    }
    if (!result.previewSurfaceBackgroundsApplied) {
      failures.push(`${label}: generated document tables and wireframes should have opaque surface backgrounds.`);
    }
    if ((result.mermaidSourceCount ?? 0) > 0 && (result.mermaidSvgCount ?? 0) < result.mermaidSourceCount) {
      failures.push(`${label}: dynamic preview should render Mermaid sources to SVG (${result.mermaidSvgCount ?? 0}/${result.mermaidSourceCount} rendered).`);
    }
    if (result.mermaidFailed) {
      failures.push(`${label}: dynamic preview should not leave Mermaid diagrams in the failed source state.`);
    }
    if (result.sourcePreviewOverlap) {
      failures.push(`${label}: source panel and dynamic preview panel should not overlap.`);
    }
    if (result.statusActionOverlap) {
      failures.push(`${label}: status label and preview action should not overlap.`);
    }
    if (result.horizontalOverflow) {
      failures.push(`${label}: page should not overflow horizontally at ${result.viewport.width}px.`);
    }
    const viewportLabel = result.viewport ? `${result.viewport.width}x${result.viewport.height}` : "unknown";
    checks.push(`${label}: status=${result.status || "missing"}, output=${result.outputTextLength ?? 0} chars, mermaid=${result.mermaidSvgCount ?? 0}/${result.mermaidSourceCount ?? 0}, viewport=${viewportLabel}`);
  } finally {
    await page.close();
  }
}

async function checkFallbackPath() {
  const slug = "hello-screen";
  console.log(`Checking fallback ${slug}...`);
  const page = await browser.newPage({
    abortUrlPart: "/examples/source/01-basics/hello-screen.vspec.md",
    viewport: { width: 1440, height: 1000 },
  });
  try {
    await page.navigate(`${baseUrl}/examples/showcase/${slug}.html`);
    const result = await waitForShowcaseResult(page, slug, (current) => current.status === "fallback");

    if (result.status !== "fallback") {
      failures.push(`fallback ${slug}: expected fallback status, got ${result.status || "missing"}.`);
    }
    if (!result.outputHidden) {
      failures.push(`fallback ${slug}: dynamic output should be hidden when source fetch fails.`);
    }
    if (result.fallbackHidden) {
      failures.push(`fallback ${slug}: runtime failure UI should be visible when source fetch fails.`);
    }
    if (result.fallbackIframe) {
      failures.push(`fallback ${slug}: generated fallback iframe should not be mounted.`);
    }
    if (!/Dynamic preview failed/u.test(result.statusTitle)) {
      failures.push(`fallback ${slug}: status should explain dynamic preview failure.`);
    }
    if (!result.failureHasSourceLinks) {
      failures.push(`fallback ${slug}: runtime failure UI should expose source links.`);
    }
    checks.push(`fallback ${slug}: status=${result.status || "missing"}, failureLinks=${result.failureHasSourceLinks ? "present" : "missing"}`);
  } finally {
    await page.close();
  }
}

function inspectShowcaseScript() {
  return String.raw`
(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return undefined;
    const box = element.getBoundingClientRect();
    return {
      bottom: box.bottom,
      height: box.height,
      left: box.left,
      right: box.right,
      top: box.top,
      width: box.width
    };
  };
  const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
  const status = document.querySelector('[data-dynamic-preview-status]');
  const output = document.querySelector('[data-dynamic-preview-output]');
  const fallback = document.querySelector('[data-dynamic-preview-fallback]');
  const previewAction = document.querySelector('#dynamic-preview .pane-tools a');
  const documentSectionHeading = output?.querySelector('.document .doc-section h2');
  const documentToc = output?.querySelector('.document .toc-inline');
  const documentTable = output?.querySelector('.document .spec-table');
  const documentTableWrap = output?.querySelector('.document .spec-table-wrap');
  const documentWireframe = output?.querySelector('.document .wireframe-section .mm-wireframe');
  const documentWireframeSection = output?.querySelector('.document .wireframe-section');
  const documentTocStyle = documentToc ? getComputedStyle(documentToc) : undefined;
  const documentSectionHeadingStyle = documentSectionHeading ? getComputedStyle(documentSectionHeading) : undefined;
  const documentTableStyle = documentTable ? getComputedStyle(documentTable) : undefined;
  const documentTableWrapStyle = documentTableWrap ? getComputedStyle(documentTableWrap) : undefined;
  const documentWireframeStyle = documentWireframe ? getComputedStyle(documentWireframe) : undefined;
  const documentWireframeSectionStyle = documentWireframeSection ? getComputedStyle(documentWireframeSection) : undefined;
  const mermaidSourceCount = output?.querySelectorAll('[data-mermaid-source]').length ?? 0;
  const mermaidSvgCount = output?.querySelectorAll('.mermaid-render svg').length ?? 0;
  const sectionOrder = Array.from(output?.querySelectorAll('.document > .doc-section') ?? []).map((section) => section.id || section.querySelector('h2')?.id || '');
  return {
    fallbackHidden: fallback ? fallback.hidden : true,
    fallbackIframe: Boolean(fallback?.querySelector('iframe')),
    failureHasSourceLinks: Boolean(fallback?.querySelector('a[href*="/examples/source/"]') && fallback?.querySelector('a[href^="https://raw.githubusercontent.com/"]')),
    hasGeneratedDocumentSections: Boolean(output?.querySelector('.document #screen') && output?.querySelector('.document #state-views') && output?.querySelector('.toc-inline')),
    hasWireframeRoot: Boolean(output?.querySelector('.markvspec-preview, .mm-wireframe, .mm-screen')),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    mermaidFailed: Boolean(output?.querySelector('.mermaid-block.is-source-visible .mermaid-placeholder')),
    mermaidSourceCount,
    mermaidSvgCount,
    outputHidden: output ? output.hidden : true,
    outputHtmlLength: output?.innerHTML.trim().length ?? 0,
    outputTextLength: output?.innerText.trim().length ?? 0,
    pagePath: window.location.pathname,
    previewStylesApplied: Boolean(
      documentTocStyle
        && documentTocStyle.backgroundColor === 'rgb(255, 255, 255)'
        && documentTocStyle.borderTopStyle !== 'none'
        && documentSectionHeadingStyle
        && documentSectionHeadingStyle.borderBottomStyle !== 'none'
        && documentSectionHeadingStyle.borderBottomWidth !== '0px'
    ),
    previewSurfaceBackgroundsApplied: Boolean(
      (!documentTableStyle || documentTableStyle.backgroundColor === 'rgb(255, 255, 255)')
        && (!documentTableWrapStyle || documentTableWrapStyle.backgroundColor === 'rgb(255, 255, 255)')
        && (!documentWireframeStyle || documentWireframeStyle.backgroundColor === 'rgb(255, 255, 255)')
        && (!documentWireframeSectionStyle || documentWireframeSectionStyle.backgroundColor === 'rgb(255, 255, 255)')
    ),
    sectionOrder,
    sectionOrderValid: sectionOrderMatchesVsCodePreview(sectionOrder),
    sourcePreviewOverlap: overlaps(rect('#source'), rect('#dynamic-preview')),
    status: status?.dataset.status ?? '',
    statusActionOverlap: overlaps(rect('[data-dynamic-preview-status]'), previewAction ? previewAction.getBoundingClientRect() : undefined),
    statusText: status?.textContent ?? '',
    statusTitle: status?.getAttribute('title') ?? '',
    viewport: {
      height: window.innerHeight,
      width: window.innerWidth
    }
  };

  function sectionOrderMatchesVsCodePreview(order) {
    const expectations = [
      ['screen', 'history'],
      ['history', 'states'],
      ['screen', 'states'],
      ['states', 'state-flow'],
      ['state-flow', 'state-views'],
      ['state-views', 'action-details'],
      ['state-views', 'form-groups'],
      ['action-details', 'form-groups'],
      ['form-groups', 'validations'],
      ['validations', 'business-rules'],
      ['business-rules', 'error-codes'],
      ['error-codes', 'notes'],
      ['notes', 'state-transition-table'],
      ['state-views', 'state-transition-table']
    ];
    return expectations.every(([before, after]) => {
      const beforeIndex = order.indexOf(before);
      const afterIndex = order.indexOf(after);
      return beforeIndex === -1 || afterIndex === -1 || beforeIndex < afterIndex;
    });
  }
})()
`;
}

function mermaidSettled(result) {
  const sourceCount = result?.mermaidSourceCount ?? 0;
  if (sourceCount === 0) {
    return true;
  }
  return (result?.mermaidSvgCount ?? 0) >= sourceCount || result?.mermaidFailed;
}

async function waitForShowcaseResult(page, slug, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastResult = {};
  while (Date.now() < deadline) {
    try {
      const current = await page.evaluate(inspectShowcaseScript());
      lastResult = current;
      if (current?.pagePath?.endsWith(`/examples/showcase/${slug}.html`) && predicate(current)) {
        return current;
      }
    } catch {
      // Navigation can briefly make the runtime unavailable.
    }
    await delay(500);
  }
  return lastResult;
}

async function launchChrome() {
  const chromePath = findChrome();
  const remotePort = await reservePort();
  const userDataDir = mkdtempSync(join(tmpdir(), "markvspec-showcase-chrome-"));
  const process = spawn(chromePath, [
    `--remote-debugging-port=${remotePort}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-translate",
    "--window-size=1440,1000",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], { stdio: "ignore" });

  process.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      failures.push(`Chrome exited unexpectedly: code=${code ?? "none"} signal=${signal ?? "none"}.`);
    }
  });

  await waitForChrome(remotePort);

  return {
    async close() {
      process.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => process.once("exit", resolve)),
        delay(2000),
      ]);
      rmSync(userDataDir, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
    },
    async newPage(options) {
      const target = await createTarget(remotePort);
      const client = await CdpClient.connect(target.webSocketDebuggerUrl);
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      await client.send("Network.enable");
      await client.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1,
        height: options.viewport.height,
        mobile: options.viewport.width < 700,
        width: options.viewport.width,
      });
      if (options.abortUrlPart) {
        client.on("Fetch.requestPaused", async (event) => {
          if (event.request.url.includes(options.abortUrlPart)) {
            await client.send("Fetch.failRequest", { errorReason: "Aborted", requestId: event.requestId });
          } else {
            await client.send("Fetch.continueRequest", { requestId: event.requestId });
          }
        });
        await client.send("Fetch.enable", {
          patterns: [{ requestStage: "Request", urlPattern: "*" }],
        });
      }
      return {
        async close() {
          client.close();
          await fetchJson(`http://127.0.0.1:${remotePort}/json/close/${target.id}`, { allowFailure: true });
        },
        async evaluate(expression) {
          const result = await client.send("Runtime.evaluate", {
            awaitPromise: true,
            expression,
            returnByValue: true,
          });
          if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed.");
          }
          return result.result.value;
        },
        async navigate(url) {
          const load = client.waitFor("Page.loadEventFired", 10000).catch(() => undefined);
          await client.send("Page.navigate", { url });
          await load;
        },
      };
    },
  };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    throw new Error("Chrome or Chromium is required for `npm run check:showcase-browser`. Set CHROME_BIN to the browser executable path.");
  }
  return chromePath;
}

async function createTarget(remotePort) {
  const encodedUrl = encodeURIComponent("about:blank");
  return fetchJson(`http://127.0.0.1:${remotePort}/json/new?${encodedUrl}`, { method: "PUT" });
}

async function waitForChrome(remotePort) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      await fetchJson(`http://127.0.0.1:${remotePort}/json/version`);
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error("Timed out waiting for Chrome DevTools endpoint.");
}

async function reservePort() {
  const portServer = createServer();
  await new Promise((resolve) => portServer.listen(0, "127.0.0.1", resolve));
  const address = portServer.address();
  const freePort = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => portServer.close(resolve));
  return freePort;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { method: options.method || "GET" });
  if (!response.ok && !options.allowFailure) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  if (!response.ok) {
    return undefined;
  }
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

class CdpClient {
  constructor(socket) {
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.socket = socket;
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpClient(socket);
  }

  close() {
    this.socket.close();
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
      return;
    }
    const handlers = this.waiters.get(message.method) || [];
    this.waiters.set(message.method, []);
    for (const handler of handlers) {
      handler.resolve(message.params);
    }
    const listeners = this.listeners?.get(message.method) || [];
    for (const listener of listeners) {
      listener(message.params);
    }
  }

  on(method, listener) {
    this.listeners ??= new Map();
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      this.socket.send(payload);
    });
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}.`)), timeoutMs);
      const waiters = this.waiters.get(method) || [];
      waiters.push({
        resolve(value) {
          clearTimeout(timeout);
          resolve(value);
        },
      });
      this.waiters.set(method, waiters);
    });
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serveStatic(rawUrl, response) {
  const requestUrl = new URL(rawUrl, "http://127.0.0.1");
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/markvspec") {
    pathname = "/";
  } else if (pathname.startsWith("/markvspec/")) {
    pathname = pathname.slice("/markvspec".length);
  }

  let filePath = normalize(join(siteDir, pathname));
  if (!isInsideSite(filePath)) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  } else if (!existsSync(filePath) && !extname(filePath)) {
    filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

function isInsideSite(filePath) {
  const rel = relative(siteDir, filePath);
  return rel === "" || (!rel.startsWith("..") && !rel.split(sep).includes(".."));
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

await main();
