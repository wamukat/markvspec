import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarAllowedStructuredItemKeys,
  grammarDefinitionHardCodeInventory,
  grammarStructuredItemContexts,
  grammarStructuredItemForContext,
  parseMarkVSpec
} from "../src/index.js";

test("grammar definition has no parser-local structured item inventory left", () => {
  assert.deepEqual(grammarDefinitionHardCodeInventory, []);
});

test("grammar structured item contexts expose parser contract keys", () => {
  const expectedContexts = [
    "action.top-level",
    "action.process-detail",
    "action.process-syntax",
    "element.common-property",
    "element.tab-item.property",
    "element.accordion-item.property",
    "element.action-menu-item.property",
    "element.display-value-property",
    "element.display-value-metadata",
    "form-group.property",
    "view-context.property",
    "view-context-sample.property",
    "preview-scenario.property",
    "preview-scenario.route-property",
    "preview-scenario.sample-property",
    "validation.property",
    "business-rule.property",
    "error-code.property",
    "history-field.property",
    "history-entry.property",
    "layout.metadata",
    "slot.definition"
  ] as const;

  assert.deepEqual([...grammarStructuredItemContexts()].sort(), [...expectedContexts].sort());

  for (const context of expectedContexts) {
    assert.ok(grammarStructuredItemContexts().includes(context), `${context} is registered`);
    assert.ok(grammarAllowedStructuredItemKeys(context).length > 0, `${context} has allowed keys`);
  }

  assert.equal(grammarStructuredItemForContext("action.top-level", "Triggered").diagnosticSeverity, "warning");
  assert.equal(grammarStructuredItemForContext("history-entry.property", "field key").diagnosticSeverity, "info");
  assert.equal(grammarStructuredItemForContext("slot.definition", "unexpected").diagnosticSeverity, "warning");
});

test("semantic parser keeps canonical, represented-extension, and non-canonical boundaries", () => {
  const result = parseMarkVSpec(`---
id: SCR-GRAMMAR-BOUNDARIES
type: screen
title: Grammar Boundaries
---
# SCR-GRAMMAR-BOUNDARIES Grammar Boundaries

## States

- idle*

## Layout

### L-Page Page

- stack

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit
- analytics event: submit_clicked

## Actions

### A-Submit Submit

- Tliggered
- From
  - idle
- Process P1: Submit
  - request:
    - POST /submit
  - correlation id: request.id
`);

  const infoMessages = result.diagnostics.filter((diagnostic) => diagnostic.severity === "info").map((diagnostic) => diagnostic.message);
  const warningMessages = result.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").map((diagnostic) => diagnostic.message);

  assert(infoMessages.includes("Extension item in Element E-Submit: analytics event: submit_clicked. This is not a standard MarkVSpec key, but it is preserved in MarkVSpec output."));
  assert(infoMessages.includes("Extension item in Action A-Submit process step Submit: correlation id: request.id. This is not a standard MarkVSpec key, but it is preserved in MarkVSpec output."));
  assert(warningMessages.includes("Unknown structured item in Action A-Submit: Tliggered. This item is not represented in MarkVSpec output. Use From, Process P1: <name>, or Otherwise."));
  assert.equal(warningMessages.some((message) => message.includes("request:")), false);
});

test("semantic parser diagnostics use grammar definition allowed keys across section groups", () => {
  const result = parseMarkVSpec(`---
id: SCR-GRAMMAR-CONTRACT
type: screen
title: Grammar Contract
---
# SCR-GRAMMAR-CONTRACT Grammar Contract

## States

- idle*

## Slots

### main Main

- unexpected: slot

## Elements

### E-Name Input

- label: Name

## Form Groups

### F-Login Login

- fields: E-Name
- unexpected: form

## View Context

### isAdmin Admin

- type: boolean
- unexpected: view

## Preview Scenarios

### Baseline

- state: idle
- unexpected: scenario

## Validations

### V-Name Name

- target: E-Name
- unexpected: validation

## Business Rules

### R-Policy Policy

- unexpected: rule

## Error Codes

### ERR-NAME Name error

- target: E-Name
- unexpected: error
`);

  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
  assert(messages.includes(`Unknown structured item in Slot main: unexpected: slot. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("slot.definition").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in FormGroup F-Login: unexpected: form. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("form-group.property").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in View Context isAdmin Admin: unexpected: view. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("view-context.property").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in Preview Scenario Baseline: unexpected: scenario. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("preview-scenario.property").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in Validation V-Name: unexpected: validation. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("validation.property").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in Business Rule R-Policy: unexpected: rule. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("business-rule.property").join(", ")}.`));
  assert(messages.includes(`Unknown structured item in Error Code ERR-NAME: unexpected: error. This item is not represented in MarkVSpec output. Use ${grammarAllowedStructuredItemKeys("error-code.property").join(", ")}.`));
});
