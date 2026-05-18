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
    - email: taylor@example.com
- Columns:
  - name: Name
  - role: Role
  - Email: \${model.users.email}

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
  const userColumnRows = rows.filter((row) => row.element.id === "E-Users" && row.location === "column");
  const roleOptionsRow = rows.find((row) => row.element.id === "E-RoleSelect" && row.location === "options");
  const statusItemsRow = rows.find((row) => row.element.id === "E-StatusList" && row.location === "items");

  assert(rowKeys.includes("E-Users:table rows:see wireframe:data"));
  assert.deepEqual(userColumnRows.map((row) => row.contentSections), [
    [
      { title: "Label", rows: ["Name"] },
      { title: "Field", rows: ["name"] }
    ],
    [
      { title: "Label", rows: ["Role"] },
      { title: "Field", rows: ["role"] }
    ],
    [
      { title: "Label", rows: ["Email"] },
      { title: "Field", rows: ["${model.users.email}"] }
    ]
  ]);
  assert(!rowKeys.some((key) => key.startsWith("E-Users:column source:")));
  assert(rowKeys.includes("E-StatusList:items:Open, Closed:fixed"));
  assert.deepEqual(statusItemsRow?.contentSections, [{ title: "Items", rows: ["Open", "Closed"] }]);
  assert.deepEqual(roleOptionsRow?.contentSections, [
    { title: "Options", rows: ["Viewer (${copy.roles.viewer})", "Administrator (${copy.roles.administrator})"] }
  ]);
  assert(!rowKeys.some((key) => key.startsWith("E-RoleSelect:option label:")));
  assert(!rowKeys.some((key) => key.startsWith("E-RoleSelect:option source:")));
  assert(rowKeys.includes("E-StatusBadge:text:Active:fixed"));
  assert(!rowKeys.some((key) => key.startsWith("E-FixedInput:sample:")));
});
