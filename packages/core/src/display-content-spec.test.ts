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

  assert(rowKeys.includes("E-Users:table rows:Sample rows:data"));
  assert.deepEqual(rows.find((row) => row.element.id === "E-Users" && row.location === "table rows")?.sampleRowsRef, {
    elementId: "E-Users"
  });
  const rowsWithAnchorContext = buildDisplayContentSpecRows(result.elements, {
    sampleRowsAnchorId: (elementId) => `sample-rows-loaded-${elementId}`
  });
  assert.deepEqual(rowsWithAnchorContext.find((row) => row.element.id === "E-Users" && row.location === "table rows")?.sampleRowsRef, {
    elementId: "E-Users"
  });
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
  assert.deepEqual([roleOptionsRow?.value, roleOptionsRow?.source, roleOptionsRow?.format, roleOptionsRow?.contentSections], [
    "Viewer, Administrator",
    "mixed",
    undefined,
    [
      { title: "Options", rows: ["Viewer (${copy.roles.viewer})", "Administrator (${copy.roles.administrator})"] }
    ]
  ]);
  assert(rowKeys.includes("E-RoleSelect:options:Viewer, Administrator:mixed"));
  assert(!rowKeys.some((key) => key.startsWith("E-RoleSelect:option label:")));
  assert(!rowKeys.some((key) => key.startsWith("E-RoleSelect:option source:")));
  assert(rowKeys.includes("E-StatusBadge:text:Active:fixed"));
  assert(!rowKeys.some((key) => key.startsWith("E-FixedInput:sample:")));
});

test("builds Display Content Spec row data references from preview scenario sample rows", () => {
  const result = parseMarkVSpec(`---
id: SCR-SAMPLE-ROWS
type: screen
title: Sample Rows
---

## States

- loaded*

## Elements

### E-Users Table

- source: data
- Columns:
  - name: Name

### E-UserList List

- source: data

### E-FixedRows Table

- Columns:
  - Name: name
- Sample Rows:
  - Row
    - name: Fixed User

### E-UnknownRows Table

- Columns:
  - name: Name

## Preview Scenarios

### loaded

- samples:
  - E-Users:
    - rows:
      - row:
        - name: Scenario User
  - E-UserList:
    - rows:
      - row:
        - label: Scenario Item
`);

  const rows = buildDisplayContentSpecRows(result.elements, {
    scenarioSamples: result.previewScenarios[0]?.samples,
    sampleRowsAnchorId: (elementId) => `sample-rows-loaded-${elementId}`
  });
  const tableRows = rows.find((row) => row.element.id === "E-Users" && row.location === "table rows");
  const listRows = rows.find((row) => row.element.id === "E-UserList" && row.location === "list items");
  const fixedRows = rows.find((row) => row.element.id === "E-FixedRows" && row.location === "table rows");
  const unknownRows = rows.find((row) => row.element.id === "E-UnknownRows" && row.location === "table rows");

  assert.deepEqual([tableRows?.value, tableRows?.source, tableRows?.sampleRowsRef], ["Sample rows", "data", {
    elementId: "E-Users",
    anchorId: "sample-rows-loaded-E-Users"
  }]);
  assert.deepEqual([listRows?.value, listRows?.source, listRows?.sampleRowsRef], ["Sample rows", "data", {
    elementId: "E-UserList",
    anchorId: "sample-rows-loaded-E-UserList"
  }]);
  assert.deepEqual([fixedRows?.value, fixedRows?.source], ["fixed rows: 1", "fixed"]);
  assert.equal(unknownRows, undefined);
});

test("builds Display Content Spec rows from property-level metadata", () => {
  const result = parseMarkVSpec(`---
id: SCR-PROPERTY-METADATA
type: screen
title: Property Metadata
---

## Elements

### E-PublishedAt Text

- value: 2026/05/01
  - kind: data
  - source: notice published date
  - format: date yyyy/MM/dd
- label: Published
  - kind: i18n

### E-AvatarPreview Image

- src: /assets/avatar.png
  - kind: asset
  - source: asset catalog: member-avatar
- alt: Current member avatar
  - kind: i18n

### E-NoticeLink Link

- href: /notices/123
  - kind: route
  - source: notice detail route

### E-RoleSelect Select

- options:
  - Viewer
    - kind: i18n
    - format: title case
  - Administrator
    - kind: i18n
    - source: copy.roles.admin
  - System role
    - kind: data
    - source: \${data.role}

### E-Broken Text

- value: Broken
  - kind: unknown
  - source:
- type: email
  - kind: data
`);

  const rows = buildDisplayContentSpecRows(result.elements);
  const publishedValue = rows.find((row) => row.element.id === "E-PublishedAt" && row.location === "value");
  const publishedLabel = rows.find((row) => row.element.id === "E-PublishedAt" && row.location === "label");
  const avatarSrc = rows.find((row) => row.element.id === "E-AvatarPreview" && row.location === "src");
  const noticeHref = rows.find((row) => row.element.id === "E-NoticeLink" && row.location === "href");
  const roleOptions = rows.find((row) => row.element.id === "E-RoleSelect" && row.location === "options");
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(publishedValue?.source, "data");
  assert.equal(publishedValue?.format, "date yyyy/MM/dd");
  assert.deepEqual(publishedValue?.contentSections, [
    { title: "Value", rows: ["2026/05/01"] },
    { title: "Source", rows: ["notice published date"] }
  ]);
  assert.equal(publishedLabel?.source, "i18n");
  assert.equal(avatarSrc?.source, "asset");
  assert.deepEqual(avatarSrc?.contentSections, [
    { title: "Value", rows: ["/assets/avatar.png"] },
    { title: "Source", rows: ["asset catalog: member-avatar"] }
  ]);
  assert.equal(noticeHref?.source, "route");
  assert.deepEqual(noticeHref?.contentSections, [
    { title: "Value", rows: ["/notices/123"] },
    { title: "Source", rows: ["notice detail route"] }
  ]);
  assert.deepEqual([roleOptions?.value, roleOptions?.source, roleOptions?.format, roleOptions?.contentSections], [
    "Viewer, Administrator, System role",
    "mixed",
    "mixed",
    [
      { title: "Options", rows: ["Viewer (i18n; format: title case)", "Administrator (i18n; copy.roles.admin)", "System role (data; ${data.role})"] }
    ]
  ]);
  assert(messages.includes("Element E-Broken display value property value has unknown kind unknown. Use fixed, i18n, data, route, element, asset, external, or computed."));
  assert(messages.includes("Element E-Broken display value property value has empty source metadata."));
  assert(messages.includes("Element E-Broken metadata kind must be nested under a display value property such as value, label, placeholder, text, message, hint, href, src, or alt."));
});
