import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkVSpec } from "./index.js";
import { buildDisplayContentSpecRows } from "./display-content-spec.js";

test("builds Display Content Spec rows for source data and fixed content cases", () => {
  const result = parseMarkVSpec(`---
id: SCR-DISPLAY-CONTENT
type: screen
title: Display Content
---

## States

- initial: loaded

## Elements

### E-Users Table

- source: data
- src: \${model.users}
- sample rows:
  - row:
    - name: Taylor Stone
    - role: Administrator
- Columns:
  - Name: name
  - Role: role

### E-StatusList List

- items: Open, Closed

### E-RoleSelect Select

- options:
  - Viewer: \${copy.roles.viewer}
  - Administrator: \${copy.roles.administrator}

### E-StatusBadge Badge

- text: Active
- tone: success

### E-FixedInput Input

- sample: Should not be display data
`);

  const rows = buildDisplayContentSpecRows(result.elements);
  const rowKeys = rows.map((row) => `${row.element.id}:${row.location}:${row.value}:${row.source ?? ""}`);

  assert(rowKeys.includes("E-Users:table rows:see wireframe:data"));
  assert(rowKeys.includes("E-Users:column: name:name:data"));
  assert(rowKeys.includes("E-Users:column source: name:Name:data"));
  assert(rowKeys.includes("E-StatusList:items:Open, Closed:fixed"));
  assert(rowKeys.includes("E-RoleSelect:option label:Viewer:fixed"));
  assert(rowKeys.includes("E-RoleSelect:option source:${copy.roles.viewer}:fixed"));
  assert(rowKeys.includes("E-StatusBadge:text:Active:fixed"));
  assert(!rowKeys.some((key) => key.startsWith("E-FixedInput:sample:")));
});
