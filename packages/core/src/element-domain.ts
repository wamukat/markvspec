import { propertyFirstString, propertyString } from "./property-accessor.js";
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
  ["Table", elementDefinition("content-display", ["rows", "sample rows"])],
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
  return propertyValue(element, "label")
    ?? propertyValue(element, "text")
    ?? propertyValue(element, "title")
    ?? propertyValue(element, "value")
    ?? fallback;
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

  anchoredOverlay(): AnchoredOverlayReference | undefined {
    return anchoredOverlayReference(this.element);
  }
}
