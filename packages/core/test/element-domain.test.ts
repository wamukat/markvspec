import assert from "node:assert/strict";
import test from "node:test";
import {
  anchoredOverlayReference,
  controlledPanelReferences,
  displayLabelForElement,
  elementAllowedProperties,
  elementDomainFor,
  elementSizePreset,
  elementWidthPreset,
  isChoiceControlElement,
  isContentDisplayElement,
  isControlledPanelElement,
  isFormControlElement,
  isKnownElementType,
  isOverlayElement
} from "../src/element-domain.js";
import type { MarkVSpecElement } from "../src/types.js";

test("element domain classifies known element categories", () => {
  assert.equal(isKnownElementType("Input"), true);
  assert.equal(isKnownElementType("custom:Chart"), true);
  assert.equal(isKnownElementType("Unknown"), false);
  assert.equal(isFormControlElement("Input"), true);
  assert.equal(isFormControlElement("Select"), true);
  assert.equal(isChoiceControlElement("Select"), true);
  assert.equal(isControlledPanelElement("Tabs"), true);
  assert.equal(isOverlayElement("Popover"), true);
  assert.equal(isContentDisplayElement("Text"), true);
});

test("element domain exposes allowed properties and presets", () => {
  assert.equal(elementAllowedProperties("Input").has("placeholder"), true);
  assert.equal(elementAllowedProperties("Input").has("size"), false);
  assert.equal(elementWidthPreset(element("Input", { width: "medium" })), "medium");
  assert.equal(elementWidthPreset(element("Input", { width: "wide" })), undefined);
  assert.equal(elementWidthPreset(element("Button", { width: "medium" })), undefined);
  assert.equal(elementSizePreset(element("Button", { size: "small" })), "small");
});

test("element domain resolves display label fallback without treating empty labels as content", () => {
  assert.equal(displayLabelForElement(element("Text", { label: "", text: "Title" })), "Title");
  assert.equal(displayLabelForElement(element("Text", { label: true, value: "Value" })), "Value");
  assert.equal(displayLabelForElement(element("Text"), "E-Example"), "E-Example");
  assert.equal(
    displayLabelForElement(element("Text", { label: "${route.title}" }), undefined, () => "Resolved title"),
    "Resolved title"
  );
});

test("element domain exposes controlled panel references", () => {
  const tabs = element("Tabs");
  tabs.tabs.push({
    label: "Details",
    panel: "L-DetailsPanel",
    action: "A-OpenDetails",
    activeWhen: ["details"],
    openWhen: [],
    propertyLocations: { panel: [{ line: 10 }], action: [{ line: 11 }], "active when": [{ line: 12 }], "open when": [] },
    location: { line: 9 },
    raw: "Details"
  });
  tabs.tabs.push({
    label: "No panel action",
    action: "A-NoPanelAction",
    activeWhen: [],
    openWhen: [],
    propertyLocations: { panel: [], action: [{ line: 14 }], "active when": [], "open when": [] },
    location: { line: 13 },
    raw: "No panel action"
  });

  assert.deepEqual(controlledPanelReferences(tabs), [
    {
      kind: "tabs",
      label: "Details",
      panelId: "L-DetailsPanel",
      actionId: "A-OpenDetails",
      activeWhen: ["details"],
      openWhen: [],
      location: { line: 10 }
    },
    {
      kind: "tabs",
      label: "No panel action",
      panelId: undefined,
      actionId: "A-NoPanelAction",
      activeWhen: [],
      openWhen: [],
      location: { line: 13 }
    }
  ]);

  const disclosure = element("Disclosure", { label: "More", panel: "L-MorePanel" });
  assert.deepEqual(elementDomainFor(disclosure).controlledPanelReferences(), [{
    kind: "disclosure",
    label: "More",
    panelId: "L-MorePanel",
    activeWhen: [],
    openWhen: [],
    location: { line: 1 }
  }]);
});

test("element domain exposes anchored overlay references", () => {
  assert.deepEqual(anchoredOverlayReference(element("Tooltip", { anchor: "E-Name", placement: "top" })), {
    anchorId: "E-Name",
    placement: "top"
  });
  assert.equal(anchoredOverlayReference(element("Text")), undefined);
});

function element(type: string, properties: Record<string, string | true> = {}, id = `E-${type}`): MarkVSpecElement {
  return {
    id,
    type,
    properties,
    propertyMetadata: {},
    propertyLocations: Object.fromEntries(Object.keys(properties).map((key) => [key, [{ line: 1 }]])),
    routeParams: [],
    selectOptions: [],
    tabs: [],
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
