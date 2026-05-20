import assert from "node:assert/strict";
import test from "node:test";
import {
  activeControlledPanelReferences,
  anchoredOverlayReference,
  controlledPanelReferences,
  displayLabelForElement,
  displaySummaryForElement,
  displaySummaryForElementProperties,
  displayValueForElement,
  elementAllowedProperties,
  elementDomainFor,
  elementSizePreset,
  elementWidthPreset,
  formControlDisplayValue,
  formControlSpecForElement,
  isChoiceControlElement,
  isContentDisplayElement,
  isControlledPanelElement,
  isElementDisplaySampleValue,
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
  assert.equal(
    displayLabelForElement(element("Text", { text: "Title" }), undefined, (candidate, property) => String(candidate.properties[property] ?? "")),
    "Title"
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

test("element domain resolves active controlled panel references", () => {
  const tabs = element("Tabs", { active: "Fallback" });
  tabs.tabs.push({
    label: "Details",
    panel: "L-DetailsPanel",
    activeWhen: ["details"],
    openWhen: [],
    propertyLocations: { panel: [{ line: 10 }], action: [], "active when": [{ line: 12 }], "open when": [] },
    location: { line: 9 },
    raw: "Details"
  });
  tabs.tabs.push({
    label: "Fallback",
    panel: "L-FallbackPanel",
    activeWhen: [],
    openWhen: [],
    propertyLocations: { panel: [{ line: 14 }], action: [], "active when": [], "open when": [] },
    location: { line: 13 },
    raw: "Fallback"
  });

  assert.deepEqual(
    activeControlledPanelReferences(tabs, { isConditionActive: (condition) => condition === "details" }).map((reference) => reference.panelId),
    ["L-DetailsPanel"]
  );
  assert.deepEqual(
    activeControlledPanelReferences(tabs, { isConditionActive: () => false }).map((reference) => reference.panelId),
    ["L-FallbackPanel"]
  );

  const disclosure = element("Disclosure", { panel: "L-MorePanel", open: "true" });
  assert.deepEqual(
    elementDomainFor(disclosure).activeControlledPanelReferences({ isConditionActive: () => false }).map((reference) => reference.panelId),
    ["L-MorePanel"]
  );

  const nonCanonicalOpen = element("Disclosure", { panel: "L-LegacyPanel", open: "yes" });
  assert.deepEqual(
    activeControlledPanelReferences(nonCanonicalOpen, { isConditionActive: () => false }),
    []
  );

  const bareOpen = element("Disclosure", { panel: "L-BareOpenPanel", open: true });
  assert.deepEqual(
    activeControlledPanelReferences(bareOpen, { isConditionActive: () => false }).map((reference) => reference.panelId),
    ["L-BareOpenPanel"]
  );
});

test("element domain exposes display value for non-form display elements", () => {
  assert.equal(displayValueForElement(element("Text", { value: "Published" })), "Published");
  assert.equal(displayValueForElement(element("Input", { value: "Jane" })), undefined);
  assert.equal(elementDomainFor(element("Badge", { value: "Paid" })).displayValue(), "Paid");
});

test("element domain builds display summary from semantic element properties", () => {
  assert.deepEqual(displaySummaryForElement(element("Badge", {
    marker: "Status",
    label: "Payment status",
    "label src": "i18n:payment.status",
    description: "Current payment state",
    source: "data",
    sample: "Paid",
    text: "Fallback",
    tone: "success",
    action: "A-OpenPayment",
    format: "currency"
  })), {
    marker: "Status",
    label: "Payment status",
    labelSource: "i18n:payment.status",
    description: "Current payment state",
    purpose: undefined,
    dataSample: "Paid",
    text: "Fallback",
    content: undefined,
    value: undefined,
    initialValue: undefined,
    src: undefined,
    format: "currency",
    tone: "success",
    actionId: "A-OpenPayment",
    active: undefined,
    open: undefined,
    panelId: undefined,
    placement: undefined,
    level: undefined,
    items: undefined,
    contentSummary: "Paid",
    valueSummary: undefined
  });
  assert.equal(isElementDisplaySampleValue(element("Badge", { source: "data", sample: "Paid", tone: "success" }), "Paid"), true);
  assert.equal(isElementDisplaySampleValue(element("Text", { source: "data", sample: "Paid" }), "Paid"), false);
  assert.equal(displaySummaryForElementProperties({ value: "Published", "initial value": "Draft" }).valueSummary, "Published {Draft}");
  assert.equal(displaySummaryForElementProperties({ label: "", text: "Title" }).contentSummary, "Title");
  assert.equal(displaySummaryForElementProperties({ value: "", "initial value": "Draft" }).valueSummary, "Draft");
});

test("element domain exposes form control display spec accessors", () => {
  const input = element("Input", {
    value: "${route.email}",
    "initial value": "guest@example.com",
    source: "route",
    type: "email",
    mode: "search",
    required: true,
    readonly: "preview",
    format: "lowercase",
    "min length": "3"
  });
  input.propertyMetadata.value = {
    kind: "route",
    source: "route:email",
    locations: {}
  };
  input.inputRules.push(
    { key: "required when", value: "${state.editing}", location: { line: 2 }, raw: "required when: ${state.editing}" },
    { key: "max length", value: "80", location: { line: 3 }, raw: "max length: 80" }
  );

  assert.deepEqual(formControlSpecForElement(input), {
    value: "${route.email}",
    initialValue: "guest@example.com",
    sourceKind: "route",
    sourceDetail: "route:email",
    required: true,
    requiredWhen: ["${state.editing}"],
    inputProperties: [
      { key: "type", value: "email" },
      { key: "mode", value: "search" }
    ],
    constraintProperties: [
      { key: "max length", value: "80" },
      { key: "min length", value: "3" }
    ],
    readonly: true,
    format: "lowercase",
    options: []
  });
  assert.equal(formControlDisplayValue(input), "guest@example.com");
  assert.equal(elementDomainFor(input).formControlSpec().sourceDetail, "route:email");
  assert.equal(formControlDisplayValue(input, "sample@example.com"), "sample@example.com");

  const bareInputMetadata = formControlSpecForElement(element("Input", { type: true, mode: true, multiple: true }));
  assert.deepEqual(bareInputMetadata.inputProperties, []);
  assert.deepEqual(bareInputMetadata.constraintProperties, [{ key: "multiple" }]);
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
