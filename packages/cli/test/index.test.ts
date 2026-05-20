import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main } from "../src/index.js";

test("validate returns zero for valid files and non-zero for invalid files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-"));
  try {
    const okPath = join(dir, "ok.vspec.md");
    const brokenPath = join(dir, "broken.vspec.md");
    writeFileSync(okPath, validScreen("SCR-OK", "OK"));
    writeFileSync(brokenPath, "# Missing Front Matter\n");

    assert.equal(await main(["validate", okPath]), 0);
    assert.equal(await main(["validate", brokenPath]), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate prints diagnostics using the document locale", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-ja-diagnostics-"));
  const originalLog = console.log;
  const logs: string[] = [];
  try {
    const sourcePath = join(dir, "ja.vspec.md");
    writeFileSync(sourcePath, `---
id: SCR-JA-DIAG
type: screen
title: Japanese Diagnostics
locale: ja
---
# SCR-JA-DIAG Japanese Diagnostics

## Actions

### A-Save Save

- From
  - idle
`);
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };

    assert.equal(await main(["validate", sourcePath]), 0);
    assert(logs.some((line) => line.includes("Action A-Save に trigger がありません")));
    assert(!logs.some((line) => line.includes("Action A-Save has no trigger")));
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate prints unrepresented source text warnings and fail-on-warnings fails", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-unrepresented-text-"));
  const originalLog = console.log;
  const logs: string[] = [];
  try {
    const sourcePath = join(dir, "unrepresented.vspec.md");
    writeFileSync(sourcePath, screenWithUnrepresentedProcessText("SCR-CLI-UNREPRESENTED", "CLI Unrepresented", "Encode request body"));
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };

    assert.equal(await main(["validate", sourcePath]), 0);
    assert(logs.some((line) => line.includes("warning: This source line is not represented in MarkVSpec output: Encode request body.")));
    assert(logs.some((line) => line.includes("0 error(s), 1 warning(s).")));

    logs.length = 0;
    assert.equal(await main(["validate", sourcePath, "--fail-on-warnings"]), 1);
    assert(logs.some((line) => line.includes("0 error(s), 1 warning(s).")));
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export html writes an HTML file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-html-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));

    assert.equal(await main(["export", "html", sourcePath, "--out", outDir]), 0);
    assert(existsSync(join(outDir, "sample.html")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export html accepts explicit renderer messages", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-html-messages-"));
  const originalLog = console.log;
  const logs: string[] = [];
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const messagesPath = join(dir, "markvspec.messages.yml");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));
    writeFileSync(messagesPath, `messages:
  wireframe: Canvas
`);
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };

    assert.equal(await main(["export", "html", sourcePath, "--out", outDir, "--messages", messagesPath]), 0);
    assert.match(readFileSync(join(outDir, "sample.html"), "utf8"), /<h5 class="state-screen-subheading">Canvas<\/h5>/);
    assert(logs.some((line) => line === `messages: ${messagesPath}`));
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export html returns non-zero for invalid files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-html-invalid-"));
  try {
    const sourcePath = join(dir, "broken.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, "# Missing Front Matter\n");

    assert.equal(await main(["export", "html", sourcePath, "--out", outDir]), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export document-list writes a project document list", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-document-list-"));
  try {
    const projectPath = join(dir, "markvspec.project.md");
    const screenPath = join(dir, "home.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(projectPath, `---
id: PRJ-CLI-DOC-LIST
type: project
title: CLI Document List
screens:
  - id: SCR-HOME
    path: home.vspec.md
---

# PRJ-CLI-DOC-LIST CLI Document List
`);
    writeFileSync(screenPath, `---
id: SCR-HOME
type: screen
title: Home
route: /
---

# SCR-HOME Home

Home screen.

## States

- idle*
`);

    assert.equal(await main(["export", "document-list", projectPath, "--out", outDir]), 0);
    const output = readFileSync(join(outDir, "document-list.md"), "utf8");
    assert.match(output, /\| 1 \| Screen \| SCR-HOME \| Home \| Home screen\. \| \/ \| - \| home\.vspec\.md \| 0 errors \/ 0 warnings \|/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export pdf reports missing browser clearly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-pdf-"));
  try {
    const sourcePath = join(dir, "sample.vspec.md");
    const outDir = join(dir, "out");
    writeFileSync(sourcePath, validScreen("SCR-SAMPLE", "Sample"));
    const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "aix" });
    try {
      assert.equal(await main(["export", "pdf", sourcePath, "--out", outDir]), 1);
    } finally {
      if (originalPlatform) {
        Object.defineProperty(process, "platform", originalPlatform);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnose input prints an AI input readiness report", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-diagnose-"));
  const originalLog = console.log;
  const logs: string[] = [];
  try {
    const sourcePath = join(dir, "requirements.md");
    writeFileSync(sourcePath, `# Checkout Requirements

## Purpose

Let users buy items.

## Scope

- Checkout form

## Users

- Shopper

## Functional Requirements

- User can submit an order.
`);
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };

    assert.equal(await main(["diagnose", "input", sourcePath]), 1);
    const report = JSON.parse(logs.join("\n")) as { schemaVersion: string; sourcePath: string; questions: unknown[] };
    assert.equal(report.schemaVersion, "ai-input-diagnostics/v1");
    assert.equal(report.sourcePath, sourcePath);
    assert(report.questions.length > 0);
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnose input returns zero when the input is ready enough", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-diagnose-ready-"));
  const originalLog = console.log;
  try {
    const sourcePath = join(dir, "ready-requirements.md");
    writeFileSync(sourcePath, `# Checkout Requirements

## Purpose

Let users buy items.

## Scope

- Checkout form

## Out of Scope

- Subscription management

## Users

- Shopper

## User Flow

- Shopper opens cart, submits payment, and sees a receipt.

## Functional Requirements

- User can submit an order.

## Non Functional Requirements

- Checkout response completes within 2 seconds.

## Acceptance Criteria

- A successful payment creates an order.

## Terms

- Order: a completed checkout.

## States

- draft
- paid

## Permissions and Errors

- Shopper can submit only their own cart.
- Payment failures show an inline error.

## Existing Systems

- Payment API: POST /payments

## API and DB

- Orders table stores checkout result.

## Constraints

- PCI data is not stored.

## Decisions

- Use the existing payment provider.

## Open Questions

- None for the first release.

## Change History

- 2026-05-12 initial draft.
`);
    console.log = () => undefined;

    assert.equal(await main(["diagnose", "input", sourcePath]), 0);
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

function validScreen(id: string, title: string): string {
  return `---
id: ${id}
type: screen
title: ${title}
---

# ${id} ${title}

## States

- idle*

## Elements

### E-Title Heading

- text: ${title}
`;
}

function screenWithUnrepresentedProcessText(id: string, title: string, prose: string): string {
  return `---
id: ${id}
type: screen
title: ${title}
---

# ${id} ${title}

## States

- idle*
- authenticating

## Layout: mobile

### L-Page

- stack

#### Items

- E-SubmitButton

## Elements

### E-SubmitButton Button

- label: Submit
- action: A-Submit

## Actions

### A-Submit Submit

- From
  - idle
- Process P1: Submit login
  - ${prose}
  - request:
    - method: POST
    - path: /login
  - result:
    - login submission request
  - case: sent
    - state: authenticating
`;
}
