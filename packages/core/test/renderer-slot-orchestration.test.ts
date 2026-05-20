import test from "node:test";
import assert from "node:assert/strict";
import { slotContentLayoutPlan } from "../src/renderer-slot-orchestration.js";
import type { MarkVSpecElement, MarkVSpecLayoutGroup, MarkVSpecParseResult } from "../src/types.js";

test("plans slot controlled panel layouts as expansion-only when not normally contained", () => {
  const plan = slotContentLayoutPlan(
    slotContent([
      layout("L-Content", [{ type: "contains", targetId: "L-TabsHost", location: { line: 4 }, raw: "L-TabsHost" }]),
      layout("L-TabsHost"),
      layout("L-ProfilePanel")
    ]),
    [tabsElement()]
  );

  assert.deepEqual([...plan.controlledPanelLayoutIds], ["L-ProfilePanel"]);
  assert.equal(plan.normallyContainedLayoutIds.has("L-ProfilePanel"), false);
  assert.equal(plan.containedLayoutIds.has("L-ProfilePanel"), true);
  assert.deepEqual(plan.rootGroups.map((group) => group.id), ["L-Content"]);
});

test("keeps normally contained slot controlled panel layouts out of expansion-only handling", () => {
  const plan = slotContentLayoutPlan(
    slotContent([
      layout("L-Content", [
        { type: "contains", targetId: "L-TabsHost", location: { line: 4 }, raw: "L-TabsHost" },
        { type: "contains", targetId: "L-ProfilePanel", location: { line: 5 }, raw: "L-ProfilePanel" }
      ]),
      layout("L-TabsHost"),
      layout("L-ProfilePanel")
    ]),
    [tabsElement()]
  );

  assert.deepEqual([...plan.controlledPanelLayoutIds], ["L-ProfilePanel"]);
  assert.equal(plan.normallyContainedLayoutIds.has("L-ProfilePanel"), true);
  assert.equal(plan.containedLayoutIds.has("L-ProfilePanel"), true);
  assert.deepEqual(plan.rootGroups.map((group) => group.id), ["L-Content"]);
});

function slotContent(layoutGroups: MarkVSpecLayoutGroup[]): MarkVSpecParseResult["slotContents"][number] {
  return {
    name: "content",
    layoutGroups,
    location: { line: 1 }
  };
}

function layout(id: string, items: MarkVSpecLayoutGroup["items"] = []): MarkVSpecLayoutGroup {
  return {
    id,
    name: id,
    viewport: "desktop",
    items,
    properties: {},
    propertyLocations: {},
    location: { line: 1 }
  };
}

function tabsElement(): MarkVSpecElement {
  return {
    id: "E-Tabs",
    type: "Tabs",
    properties: {},
    propertyMetadata: {},
    propertyLocations: {},
    routeParams: [],
    selectOptions: [],
    tabs: [
      {
        label: "Profile",
        panel: "L-ProfilePanel",
        activeWhen: [],
        openWhen: [],
        location: { line: 2 },
        propertyLocations: { panel: [{ line: 2 }], action: [], "active when": [], "open when": [] },
        raw: "Profile"
      }
    ],
    accordionItems: [],
    actionMenuItems: [],
    tableColumns: [],
    tableRows: [],
    visibleWhen: [],
    hiddenWhen: [],
    disabledWhen: [],
    openWhen: [],
    validations: [],
    inputRules: [],
    location: { line: 1 }
  };
}
