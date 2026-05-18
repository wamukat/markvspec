import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkVSpec } from "./index.js";
import {
  parseDisplayMessageReference,
  resolveDisplayMessageReference,
  resolveDisplayTarget
} from "./display-effect.js";

test("parses display.message references for validation and business rule messages", () => {
  assert.deepEqual(parseDisplayMessageReference("V-Required.messages"), {
    sourceId: "V-Required",
    sourceKind: "validation",
    messagePath: "messages"
  });
  assert.deepEqual(parseDisplayMessageReference("R-PasswordPolicy.messages"), {
    sourceId: "R-PasswordPolicy",
    sourceKind: "business-rule",
    messagePath: "messages"
  });
  assert.equal(parseDisplayMessageReference("EmailRules.messages"), undefined);
});

test("resolves display.message marker and text through the display effect domain object", () => {
  const result = parseMarkVSpec(`---
id: SCR-DISPLAY
type: screen
title: Display
---

## States

- initial: idle

## Elements

### E-NameInput Input

- label: Name

## Business Rules

### R-PasswordPolicy Password Policy

- marker: PW
- messages:
  - Password is too short

## Field Validations

### V-Required Required Name

- target: E-NameInput
- marker: required
- message: Name is required
`);

  assert.deepEqual(resolveDisplayMessageReference("V-Required.messages", result), {
    sourceId: "V-Required",
    sourceKind: "validation",
    messagePath: "messages",
    sourceName: "Required Name",
    marker: "required",
    textSummary: ["Name is required"]
  });
  assert.deepEqual(resolveDisplayMessageReference("R-PasswordPolicy.messages", result), {
    sourceId: "R-PasswordPolicy",
    sourceKind: "business-rule",
    messagePath: "messages",
    sourceName: "Password Policy",
    marker: "PW",
    textSummary: ["Password is too short"]
  });
});

test("classifies display targets for validation and preview consumers", () => {
  const result = parseMarkVSpec(`---
id: SCR-DISPLAY-TARGETS
type: screen
title: Display Targets
---

## States

- idle*

## Layout: default

### L-Form Stack

- stack

#### Items

- E-NameInput

## Elements

### E-NameInput Input

- label: Name

### E-Title Text

- text: Title

### E-Dialog Dialog

- title: Confirm

## Form Groups

### F-NameField Form Group

- label: Name
- input: E-NameInput
`);
  const layoutIds = new Set(result.layoutGroups.map((layout) => layout.id));
  const elementIds = new Set(result.elements.map((element) => element.id));
  const elementsById = new Map(result.elements.map((element) => [element.id, element]));
  const context = { layoutIds, elementIds, elementsById };

  assert.equal(resolveDisplayTarget({ element: "E-Dialog" }, context).kind, "targetless-overlay");
  assert.equal(resolveDisplayTarget({ element: "E-Title" }, context).kind, "none");
  assert.equal(resolveDisplayTarget({ target: "E-NameInput.error" }, context).kind, "field-error");
  assert.equal(resolveDisplayTarget({ target: "E-Title.error" }, context).fieldErrorElement?.type, "Text");
  assert.equal(resolveDisplayTarget({ target: "F-NameField" }, context).kind, "form-group");
  assert.equal(resolveDisplayTarget({ target: "L-Form" }, context).kind, "layout");
  assert.equal(resolveDisplayTarget({ target: "E-NameInput" }, context).kind, "element");
  assert.equal(resolveDisplayTarget({ target: "E-Missing" }, context).kind, "missing-local");
  assert.equal(resolveDisplayTarget({ target: "external-slot" }, context).kind, "external");
});
