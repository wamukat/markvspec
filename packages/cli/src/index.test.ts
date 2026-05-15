import assert from "node:assert/strict";
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

- sample: ${title}
`;
}
