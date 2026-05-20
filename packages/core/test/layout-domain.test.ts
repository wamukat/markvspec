import assert from "node:assert/strict";
import test from "node:test";
import {
  layoutConditionValues,
  layoutDisplaySettings,
  layoutDomainFor,
  layoutHasVisibilityConditions,
  layoutMetadataPropertyValues
} from "../src/layout-domain.js";
import type { MarkVSpecLayoutGroup } from "../src/types.js";

test("layout domain exposes display settings from flattened properties", () => {
  assert.deepEqual(layoutDisplaySettings(layout({
    marker: "Main",
    align: "center",
    justify: "between",
    gap: "md",
    overlay: "modal",
    variant: "surface"
  })), {
    marker: "Main",
    align: "center",
    justify: "between",
    gap: "md",
    overlay: "modal",
    variant: "surface"
  });
});

test("layout domain resolves condition values with metadata items taking precedence", () => {
  const group = layout({
    "visible when": "fallback",
    "hidden when": "closed"
  });
  group.items.push({
    type: "property",
    key: "visible when",
    value: "ready",
    scope: "metadata",
    location: { line: 2 },
    raw: "- visible when: ready"
  });

  assert.deepEqual(layoutConditionValues(group, "visible when"), ["ready"]);
  assert.deepEqual(layoutDomainFor(group).conditionValues("hidden when"), ["closed"]);
  assert.equal(layoutHasVisibilityConditions(group), true);
  assert.deepEqual(layoutMetadataPropertyValues(layout(), "visible when"), []);
});

function layout(properties: Record<string, string> = {}): MarkVSpecLayoutGroup {
  return {
    id: "L-Main",
    name: "Main",
    viewport: "desktop",
    items: [],
    properties,
    propertyLocations: {},
    location: { line: 1 }
  };
}
