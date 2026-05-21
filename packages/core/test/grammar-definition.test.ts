import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarAllowedStructuredItemKeys,
  grammarDefinitionHardCodeInventory,
  grammarStructuredItemContexts,
  grammarStructuredItemForContext,
  isGrammarStructuredItemCanonical
} from "../src/grammar-definition.js";

test("grammarStructuredItemForContext classifies canonical and legacy action items", () => {
  const from = grammarStructuredItemForContext("action.top-level", "From");
  assert.equal(from.known, true);
  assert.equal(from.classification, "canonical");
  assert.equal(from.represented, true);
  assert.equal(from.diagnosticSeverity, undefined);

  const triggered = grammarStructuredItemForContext("action.top-level", "Triggered");
  assert.equal(triggered.known, true);
  assert.equal(triggered.classification, "non-canonical");
  assert.equal(triggered.represented, false);
  assert.equal(triggered.diagnosticSeverity, "warning");
});

test("grammarStructuredItemForContext returns unsupported diagnostics metadata for unknown keys", () => {
  const unknown = grammarStructuredItemForContext("slot.definition", "unexpected");
  assert.equal(unknown.known, false);
  assert.equal(unknown.classification, "unsupported");
  assert.equal(unknown.represented, false);
  assert.equal(unknown.diagnosticSeverity, "warning");
});

test("grammar query API exposes allowed keys and canonical checks by context", () => {
  assert.deepEqual(grammarAllowedStructuredItemKeys("slot.definition"), ["required", "default", "purpose", "description"]);
  assert.equal(isGrammarStructuredItemCanonical("action.process-detail", "request"), true);
  assert.equal(isGrammarStructuredItemCanonical("action.process-detail", "Effects"), false);
  assert.ok(grammarStructuredItemContexts().includes("element.common-property"));
});

test("grammar hard-code inventory maps parser-local structured items to follow-up tickets", () => {
  assert.ok(grammarDefinitionHardCodeInventory.length >= 1);
  for (const entry of grammarDefinitionHardCodeInventory) {
    assert.match(entry.source, /^packages\/core\/src\//);
    assert.match(entry.owner, /\S/);
    assert.ok(entry.targetTicket >= 1371);
    assert.match(entry.scope, /\S/);
    assert.match(entry.note, /\S/);
  }

  assert.ok(
    grammarDefinitionHardCodeInventory.some((entry) =>
      entry.source === "packages/core/src/validation-section-semantic.ts" && entry.owner === "validationPropertyKeys"
    )
  );
  assert.ok(
    grammarDefinitionHardCodeInventory.some((entry) =>
      entry.source === "packages/core/src/preview-scenario-section-semantic.ts" && entry.owner === "previewScenarioPropertyKeys"
    )
  );
});
