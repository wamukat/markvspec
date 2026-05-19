import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main } from "./index.js";

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

test("skill install downloads the version tag archive and installs the authoring skill", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-skill-install-"));
  const originalLog = console.log;
  const logs: string[] = [];
  const urls: string[] = [];
  try {
    const installDir = join(dir, "skills");
    writeFileSync(join(dir, "AGENTS.md"), "# Agent Notes\n");
    console.log = (message?: unknown) => {
      logs.push(String(message ?? ""));
    };

    const archive = createTarGzArchive({
      "markvspec-release-0.5.0/skills/markvspec-authoring/SKILL.md": "# MarkVSpec Authoring\n",
      "markvspec-release-0.5.0/skills/markvspec-authoring/references/workflow.md": "Use the CLI.\n",
      "markvspec-release-0.5.0/docs/en/user/dsl.md": "# MarkVSpec DSL\n\nEnglish canonical DSL.\n",
      "markvspec-release-0.5.0/docs/ja/user/dsl.md": "# MarkVSpec DSL\n\nJapanese canonical DSL.\n",
      "markvspec-release-0.5.0/README.md": "Not installed.\n"
    });

    assert.equal(
      await main(["skill", "install", "--path", installDir], {
        downloadArchive: async (url) => {
          urls.push(url);
          return archive;
        }
      }),
      0
    );

    assert.deepEqual(urls, ["https://github.com/wamukat/markvspec/archive/refs/tags/v0.5.0.tar.gz"]);
    assert.equal(readFileSync(join(installDir, "markvspec-authoring", "SKILL.md"), "utf8"), "# MarkVSpec Authoring\n");
    assert.equal(readFileSync(join(installDir, "markvspec-authoring", "references", "workflow.md"), "utf8"), "Use the CLI.\n");
    assert.equal(readFileSync(join(installDir, "markvspec-authoring", "references", "dsl.en.md"), "utf8"), "# MarkVSpec DSL\n\nEnglish canonical DSL.\n");
    assert.equal(readFileSync(join(installDir, "markvspec-authoring", "references", "dsl.ja.md"), "utf8"), "# MarkVSpec DSL\n\nJapanese canonical DSL.\n");
    assert(!existsSync(join(installDir, "README.md")));
    assert.equal(readFileSync(join(dir, "AGENTS.md"), "utf8"), "# Agent Notes\n");
    assert(logs.some((line) => line.includes("Installed markvspec-authoring from v0.5.0")));
    assert(logs.some((line) => line.includes("markvspec diagnose input <markdown-file>")));
    assert(logs.some((line) => line.includes("markvspec validate <file-or-glob> --fail-on-warnings")));
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skill install reports tag and source URL when the archive has no authoring skill", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-skill-missing-"));
  const originalLog = console.log;
  const originalError = console.error;
  const logs: string[] = [];
  const errors: string[] = [];
  try {
    console.log = (message?: unknown) => {
      logs.push(String(message ?? ""));
    };
    console.error = (message?: unknown) => {
      errors.push(String(message ?? ""));
    };

    assert.equal(
      await main(["skill", "install", "--path", join(dir, "skills")], {
        downloadArchive: async () => createTarGzArchive({
          "markvspec-release-0.5.0/README.md": "No skill here.\n"
        })
      }),
      1
    );

    assert(errors.some((line) => line.includes("v0.5.0")));
    assert(errors.some((line) => line.includes("https://github.com/wamukat/markvspec/archive/refs/tags/v0.5.0.tar.gz")));
    assert(errors.some((line) => line.includes("skills/markvspec-authoring")));
    assert(!logs.some((line) => line.includes("Add this to AGENTS.md")));
  } finally {
    console.log = originalLog;
    console.error = originalError;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skill install requires release-matched DSL references", async () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-cli-skill-missing-reference-"));
  const originalError = console.error;
  const errors: string[] = [];
  try {
    console.error = (message?: unknown) => {
      errors.push(String(message ?? ""));
    };

    assert.equal(
      await main(["skill", "install", "--path", join(dir, "skills")], {
        downloadArchive: async () => createTarGzArchive({
          "markvspec-release-0.5.0/skills/markvspec-authoring/SKILL.md": "# MarkVSpec Authoring\n"
        })
      }),
      1
    );

    assert(errors.some((line) => line.includes("required authoring skill reference")));
    assert(errors.some((line) => line.includes("docs/en/user/dsl.md")));
    assert(errors.some((line) => line.includes("v0.5.0")));
  } finally {
    console.error = originalError;
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

function createTarGzArchive(files: Record<string, string>): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const body = Buffer.from(content, "utf8");
    chunks.push(createTarHeader(name, body.length));
    chunks.push(body);
    chunks.push(Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks));
}

function createTarHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(" ", 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}
