import { propertyBoolean, propertyFirstString, propertyString } from "./property-accessor.js";
import { sourceTypeForElement } from "./source-types.js";
import type { MarkVSpecElement, SourceLocation } from "./types.js";

export type MarkVSpecElementKind =
  | "form-control"
  | "choice-control"
  | "controlled-panel"
  | "overlay"
  | "content-display"
  | "action"
  | "feedback"
  | "media"
  | "structure"
  | "custom";

export interface ElementTypeDefinition {
  kind: MarkVSpecElementKind;
  properties: ReadonlySet<string>;
  width?: boolean;
  size?: boolean;
}

export interface ControlledPanelReference {
  kind: "tabs" | "accordion" | "disclosure";
  label: string;
  panelId?: string;
  actionId?: string;
  activeWhen: readonly string[];
  openWhen: readonly string[];
  location?: SourceLocation;
}

export interface AnchoredOverlayReference {
  anchorId?: string;
  placement?: string;
}

export interface ElementDisplaySummary {
  marker?: string;
  label?: string;
  labelSource?: string;
  description?: string;
  purpose?: string;
  dataSample?: string;
  text?: string;
  content?: string;
  value?: string;
  initialValue?: string;
  src?: string;
  format?: string;
  tone?: string;
  actionId?: string;
  active?: string;
  open?: string;
  panelId?: string;
  placement?: string;
  level?: string;
  items?: string;
  contentSummary?: string;
  valueSummary?: string;
}

export interface ElementFormControlSpecProperty {
  key: string;
  value?: string;
}

export interface ElementFormControlSpec {
  value?: string;
  initialValue?: string;
  sourceKind: string;
  sourceDetail?: string;
  required: boolean;
  requiredWhen: string[];
  inputProperties: ElementFormControlSpecProperty[];
  constraintProperties: ElementFormControlSpecProperty[];
  readonly: boolean;
  format?: string;
  options: MarkVSpecElement["selectOptions"];
}

export interface ActiveControlledPanelOptions {
  isConditionActive(condition: string): boolean;
}

const customElementTypeRegex = /^custom:[A-Za-z][A-Za-z0-9_-]*$/u;

export const commonElementProperties = new Set([
  "marker",
  "label",
  "label src",
  "placeholder src",
  "description",
  "help",
  "help src",
  "hint",
  "message",
  "message src",
  "sample",
  "source",
  "purpose",
  "text",
  "value",
  "src",
  "format",
  "initial value",
  "required",
  "readonly",
  "optional",
  "visible when",
  "hidden when",
  "disabled when",
  "variant",
  "tone",
  "validation",
  "input rule",
  "error text",
  "action",
  "action event"
]);

const emptyProperties = new Set<string>();

export const elementTypeRegistry = new Map<string, ElementTypeDefinition>([
  ["Heading", elementDefinition("content-display", ["level"])],
  ["Paragraph", elementDefinition("content-display")],
  ["Text", elementDefinition("content-display")],
  ["Input", elementDefinition("form-control", ["type", "placeholder", "width"], { width: true })],
  ["Textarea", elementDefinition("form-control", ["placeholder", "rows", "width"], { width: true })],
  ["Button", elementDefinition("action", ["size"], { size: true })],
  ["Link", elementDefinition("action", ["href"])],
  ["Select", elementDefinition("choice-control", ["width"], { width: true })],
  ["MultiSelect", elementDefinition("choice-control", ["width"], { width: true })],
  ["Checkbox", elementDefinition("choice-control", ["checked"])],
  ["CheckboxGroup", elementDefinition("choice-control", ["name"])],
  ["Switch", elementDefinition("choice-control", ["checked"])],
  ["RadioGroup", elementDefinition("choice-control", ["name"])],
  ["List", elementDefinition("content-display", ["items", "sample rows"])],
  ["Table", elementDefinition("content-display", ["sample rows"])],
  ["Banner", elementDefinition("feedback")],
  ["Dialog", elementDefinition("feedback", ["title", "content", "actions"])],
  ["Toast", elementDefinition("feedback", ["placement", "duration"])],
  ["Badge", elementDefinition("content-display")],
  ["Popover", elementDefinition("overlay", ["anchor", "placement"])],
  ["Tooltip", elementDefinition("overlay", ["anchor", "placement"])],
  ["Image", elementDefinition("media", ["src", "alt"])],
  ["Icon", elementDefinition("media", ["name"])],
  ["Spinner", elementDefinition("feedback")],
  ["Tabs", elementDefinition("controlled-panel", ["active", "items"])],
  ["Accordion", elementDefinition("controlled-panel", ["open", "items"])],
  ["Disclosure", elementDefinition("controlled-panel", ["open", "open when", "panel"])],
  ["ActionMenu", elementDefinition("controlled-panel", ["open", "open when", "placement", "items"])],
  ["Divider", elementDefinition("structure")],
  ["FileUpload", elementDefinition("form-control", ["accept", "multiple", "width"], { width: true })],
  ["FileInput", elementDefinition("form-control", ["accept", "multiple", "width"], { width: true })],
  ["DatePicker", elementDefinition("form-control", ["min", "max", "placeholder", "width"], { width: true })],
  ["DateInput", elementDefinition("form-control", ["min", "max", "placeholder", "width"], { width: true })],
  ["TimeInput", elementDefinition("form-control", ["min", "max", "placeholder", "width"], { width: true })],
  ["NumberInput", elementDefinition("form-control", ["min", "max", "step", "placeholder", "width"], { width: true })]
]);

const optionElementTypes = new Set(["Select", "MultiSelect", "RadioGroup", "CheckboxGroup"]);
const widthPresets = new Set(["short", "medium", "long", "full"]);
const sizePresets = new Set(["small", "medium", "large"]);
const formControlInputPropertyKeys = ["type", "mode"] as const;
const formControlConstraintPropertyKeys = ["min", "max", "step", "min length", "max length", "accept", "multiple"] as const;

function elementDefinition(kind: MarkVSpecElementKind, properties: string[] = [], options: Pick<ElementTypeDefinition, "width" | "size"> = {}): ElementTypeDefinition {
  return {
    kind,
    properties: properties.length > 0 ? new Set(properties) : emptyProperties,
    ...options
  };
}

export function elementDomainFor(element: MarkVSpecElement): ElementDomain {
  return new ElementDomain(element);
}

export function isKnownElementType(type: string): boolean {
  return elementTypeRegistry.has(type) || customElementTypeRegex.test(type);
}

export function elementKindForType(type: string): MarkVSpecElementKind {
  return elementTypeRegistry.get(type)?.kind ?? (customElementTypeRegex.test(type) ? "custom" : "custom");
}

export function elementAllowedProperties(type: string): ReadonlySet<string> {
  return elementTypeRegistry.get(type)?.properties ?? emptyProperties;
}

export function elementAcceptsOptions(type: string): boolean {
  return optionElementTypes.has(type);
}

export function isFormControlElement(elementOrType: MarkVSpecElement | string): boolean {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType.type;
  const kind = elementKindForType(type);
  return kind === "form-control" || kind === "choice-control";
}

export function isChoiceControlElement(elementOrType: MarkVSpecElement | string): boolean {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType.type;
  return elementKindForType(type) === "choice-control";
}

export function isControlledPanelElement(elementOrType: MarkVSpecElement | string): boolean {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType.type;
  return elementKindForType(type) === "controlled-panel";
}

export function isOverlayElement(elementOrType: MarkVSpecElement | string): boolean {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType.type;
  return elementKindForType(type) === "overlay";
}

export function isContentDisplayElement(elementOrType: MarkVSpecElement | string): boolean {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType.type;
  return elementKindForType(type) === "content-display";
}

export function elementWidthPreset(element: MarkVSpecElement): string | undefined {
  if (!elementTypeRegistry.get(element.type)?.width) {
    return undefined;
  }
  const width = propertyString(element, "width");
  return width && widthPresets.has(width) ? width : undefined;
}

export function elementSizePreset(element: MarkVSpecElement): string | undefined {
  if (!elementTypeRegistry.get(element.type)?.size) {
    return undefined;
  }
  const size = propertyString(element, "size");
  return size && sizePresets.has(size) ? size : undefined;
}

export function displayLabelForElement(
  element: MarkVSpecElement,
  fallback?: string,
  propertyValue: (element: MarkVSpecElement, property: string) => string | undefined = propertyFirstString
): string | undefined {
  return nonEmpty(propertyValue(element, "label"))
    ?? nonEmpty(propertyValue(element, "text"))
    ?? nonEmpty(propertyValue(element, "title"))
    ?? nonEmpty(propertyValue(element, "value"))
    ?? fallback;
}

export function displayValueForElement(element: MarkVSpecElement): string | undefined {
  const value = propertyString(element, "value");
  return value && !isFormControlElement(element) ? value : undefined;
}

export function displaySummaryForElement(element: MarkVSpecElement): ElementDisplaySummary {
  return displaySummaryForElementProperties(element.properties);
}

export function displaySummaryForElementProperties(properties: MarkVSpecElement["properties"]): ElementDisplaySummary {
  const owner = { properties };
  const dataSample = propertyString(owner, "source") === "data" ? nonEmpty(propertyString(owner, "sample")) : undefined;
  const value = nonEmpty(propertyString(owner, "value"));
  const initialValue = nonEmpty(propertyString(owner, "initial value"));
  const contentSummary = dataSample
    ?? nonEmpty(propertyString(owner, "label"))
    ?? value
    ?? nonEmpty(propertyString(owner, "content"))
    ?? nonEmpty(propertyString(owner, "text"))
    ?? nonEmpty(propertyString(owner, "alt"))
    ?? nonEmpty(propertyString(owner, "name"))
    ?? nonEmpty(propertyString(owner, "title"))
    ?? nonEmpty(propertyString(owner, "active"));
  const valueSummary = value && initialValue ? `${value} {${initialValue}}` : value ?? initialValue;

  return {
    marker: propertyString(owner, "marker"),
    label: propertyString(owner, "label"),
    labelSource: propertyString(owner, "label src"),
    description: propertyString(owner, "description"),
    purpose: propertyString(owner, "purpose"),
    dataSample,
    text: propertyString(owner, "text"),
    content: propertyString(owner, "content"),
    value,
    initialValue,
    src: propertyString(owner, "src"),
    format: propertyString(owner, "format"),
    tone: propertyString(owner, "tone"),
    actionId: propertyString(owner, "action"),
    active: propertyString(owner, "active"),
    open: propertyString(owner, "open"),
    panelId: propertyString(owner, "panel"),
    placement: propertyString(owner, "placement"),
    level: propertyString(owner, "level"),
    items: propertyString(owner, "items"),
    contentSummary,
    valueSummary
  };
}

export function isElementDisplaySampleValue(element: MarkVSpecElement, value: string): boolean {
  const summary = displaySummaryForElement(element);
  return element.type === "Badge" && (value === summary.dataSample || value === summary.text);
}

export function formControlSpecForElement(element: MarkVSpecElement): ElementFormControlSpec {
  const summary = displaySummaryForElement(element);
  return {
    value: summary.value,
    initialValue: summary.initialValue,
    sourceKind: element.propertyMetadata["value"]?.kind ?? sourceTypeForElement(element),
    sourceDetail: element.propertyMetadata["value"]?.source,
    required: propertyBoolean(element, "required") || element.inputRules.some(isRequiredBooleanInputRule),
    requiredWhen: element.inputRules.map(requiredWhenValue).filter((value): value is string => Boolean(value)),
    inputProperties: formControlInputPropertyKeys.flatMap((key) => specProperty(element, key, { allowBare: false })),
    constraintProperties: [
      ...element.inputRules
        .filter((rule) => !isRequiredInputRule(rule))
        .map((rule) => ({ key: rule.key, ...(rule.value ? { value: rule.value } : {}) })),
      ...formControlConstraintPropertyKeys.flatMap((key) => specProperty(element, key, { allowBare: true }))
    ],
    readonly: propertyBoolean(element, "readonly") || Boolean(propertyString(element, "readonly")),
    format: summary.format,
    options: element.selectOptions
  };
}

export function formControlDisplayValue(element: MarkVSpecElement, sampleValue?: string): string | undefined {
  const spec = formControlSpecForElement(element);
  return sampleValue ?? spec.initialValue ?? spec.value;
}

function specProperty(element: MarkVSpecElement, key: string, options: { allowBare: boolean }): ElementFormControlSpecProperty[] {
  const value = propertyString(element, key);
  if (value) {
    return [{ key, value }];
  }
  return options.allowBare && element.properties[key] === true ? [{ key }] : [];
}

function isRequiredInputRule(rule: MarkVSpecElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" || isRequiredWhenInputRule(rule);
}

function isRequiredBooleanInputRule(rule: MarkVSpecElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" && (!rule.value || rule.value.trim().toLowerCase() === "true");
}

function isRequiredWhenInputRule(rule: MarkVSpecElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required when" || rule.key.trim().toLowerCase().startsWith("required when ");
}

function requiredWhenValue(rule: MarkVSpecElement["inputRules"][number]): string | undefined {
  const key = rule.key.trim();
  if (key.toLowerCase() === "required when") {
    return rule.value.trim();
  }
  return key.toLowerCase().startsWith("required when ") ? key.slice("required when".length).trim() : undefined;
}

function nonEmpty(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

export function controlledPanelReferences(element: MarkVSpecElement): ControlledPanelReference[] {
  if (element.type === "Tabs") {
    return element.tabs
      .map((item) => ({
        kind: "tabs",
        label: item.label,
        panelId: item.panel,
        actionId: item.action,
        activeWhen: item.activeWhen,
        openWhen: item.openWhen,
        location: item.propertyLocations.panel[0] ?? item.location
      }));
  }

  if (element.type === "Accordion") {
    return element.accordionItems
      .map((item) => ({
        kind: "accordion",
        label: item.label,
        panelId: item.panel,
        actionId: item.action,
        activeWhen: item.activeWhen,
        openWhen: item.openWhen,
        location: item.propertyLocations.panel[0] ?? item.location
      }));
  }

  if (element.type === "Disclosure") {
    const panel = propertyString(element, "panel");
    return panel ? [{
      kind: "disclosure",
      label: displayLabelForElement(element, element.id) ?? element.id,
      panelId: panel,
      activeWhen: [],
      openWhen: element.openWhen,
      location: element.propertyLocations.panel?.[0] ?? element.location
    }] : [];
  }

  return [];
}

export function activeControlledPanelReferences(
  element: MarkVSpecElement,
  options: ActiveControlledPanelOptions
): ControlledPanelReference[] {
  const references = controlledPanelReferences(element);

  if (element.type === "Tabs") {
    const activeReference = references.find((reference) =>
      reference.activeWhen.some((condition) => options.isConditionActive(condition))
    ) ?? references.find((reference) => reference.label === propertyString(element, "active"))
      ?? references[0];
    return activeReference ? [activeReference] : [];
  }

  if (element.type === "Accordion") {
    const openReference = references.find((reference) =>
      reference.openWhen.some((condition) => options.isConditionActive(condition))
    ) ?? references.find((reference) => reference.label === propertyString(element, "open"));
    return openReference ? [openReference] : [];
  }

  if (element.type === "Disclosure") {
    const reference = references[0];
    if (!reference) {
      return [];
    }
    const openByCondition = reference.openWhen.some((condition) => options.isConditionActive(condition));
    return openByCondition || String(element.properties["open"] ?? "").toLowerCase() === "true" ? [reference] : [];
  }

  return [];
}

export function anchoredOverlayReference(element: MarkVSpecElement): AnchoredOverlayReference | undefined {
  if (!isOverlayElement(element)) {
    return undefined;
  }
  return {
    anchorId: propertyString(element, "anchor"),
    placement: propertyString(element, "placement")
  };
}

export class ElementDomain {
  constructor(readonly element: MarkVSpecElement) {}

  get type(): string {
    return this.element.type;
  }

  get kind(): MarkVSpecElementKind {
    return elementKindForType(this.element.type);
  }

  is(type: string): boolean {
    return this.element.type === type;
  }

  isKnown(): boolean {
    return isKnownElementType(this.element.type);
  }

  isFormControl(): boolean {
    return isFormControlElement(this.element);
  }

  isChoiceControl(): boolean {
    return isChoiceControlElement(this.element);
  }

  isControlledPanel(): boolean {
    return isControlledPanelElement(this.element);
  }

  isOverlay(): boolean {
    return isOverlayElement(this.element);
  }

  isContentDisplay(): boolean {
    return isContentDisplayElement(this.element);
  }

  displayLabel(fallback?: string): string | undefined {
    return displayLabelForElement(this.element, fallback);
  }

  widthPreset(): string | undefined {
    return elementWidthPreset(this.element);
  }

  sizePreset(): string | undefined {
    return elementSizePreset(this.element);
  }

  controlledPanelReferences(): ControlledPanelReference[] {
    return controlledPanelReferences(this.element);
  }

  activeControlledPanelReferences(options: ActiveControlledPanelOptions): ControlledPanelReference[] {
    return activeControlledPanelReferences(this.element, options);
  }

  displayValue(): string | undefined {
    return displayValueForElement(this.element);
  }

  displaySummary(): ElementDisplaySummary {
    return displaySummaryForElement(this.element);
  }

  formControlSpec(): ElementFormControlSpec {
    return formControlSpecForElement(this.element);
  }

  anchoredOverlay(): AnchoredOverlayReference | undefined {
    return anchoredOverlayReference(this.element);
  }
}
