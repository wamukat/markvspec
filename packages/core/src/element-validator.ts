import { elementIdPattern, opaqueExpressionBody } from "./ids.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import { isMarkVSpecSourceType } from "./source-types.js";
import { propertyString } from "./property-accessor.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecParseResult
} from "./types.js";

const customElementTypeRegex = /^custom:[A-Za-z][A-Za-z0-9_-]*$/u;
const elementTypes = new Set([
  "Heading",
  "Paragraph",
  "Text",
  "Input",
  "Textarea",
  "Button",
  "Link",
  "Select",
  "MultiSelect",
  "Checkbox",
  "CheckboxGroup",
  "Switch",
  "RadioGroup",
  "List",
  "Table",
  "Banner",
  "Dialog",
  "Toast",
  "Badge",
  "Popover",
  "Tooltip",
  "Image",
  "Icon",
  "Spinner",
  "Tabs",
  "Accordion",
  "Disclosure",
  "ActionMenu",
  "Divider",
  "FileUpload",
  "FileInput",
  "DatePicker",
  "DateInput",
  "TimeInput",
  "NumberInput"
]);

const commonElementProperties = new Set([
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

const elementTypeProperties = new Map<string, Set<string>>([
  ["Heading", new Set(["level"])],
  ["Paragraph", new Set()],
  ["Text", new Set()],
  ["Input", new Set(["type", "placeholder", "width"])],
  ["Textarea", new Set(["placeholder", "rows", "width"])],
  ["Button", new Set(["size"])],
  ["Link", new Set(["href"])],
  ["Select", new Set(["width"])],
  ["MultiSelect", new Set(["width"])],
  ["Checkbox", new Set(["checked"])],
  ["CheckboxGroup", new Set(["name"])],
  ["Switch", new Set(["checked"])],
  ["RadioGroup", new Set(["name"])],
  ["List", new Set(["items", "sample rows"])],
  ["Table", new Set(["rows", "sample rows"])],
  ["Banner", new Set()],
  ["Dialog", new Set(["title", "content", "actions"])],
  ["Toast", new Set(["placement", "duration"])],
  ["Badge", new Set()],
  ["Popover", new Set(["anchor", "placement"])],
  ["Tooltip", new Set(["anchor", "placement"])],
  ["Image", new Set(["src", "alt"])],
  ["Icon", new Set(["name"])],
  ["Spinner", new Set()],
  ["Tabs", new Set(["active", "items"])],
  ["Accordion", new Set(["open", "items"])],
  ["Disclosure", new Set(["open", "open when", "panel"])],
  ["ActionMenu", new Set(["open", "open when", "placement", "items"])],
  ["Divider", new Set()],
  ["FileUpload", new Set(["accept", "multiple", "width"])],
  ["FileInput", new Set(["accept", "multiple", "width"])],
  ["DatePicker", new Set(["min", "max", "placeholder", "width"])],
  ["DateInput", new Set(["min", "max", "placeholder", "width"])],
  ["TimeInput", new Set(["min", "max", "placeholder", "width"])],
  ["NumberInput", new Set(["min", "max", "step", "placeholder", "width"])]
]);

const elementWidthTypes = new Set(["Input", "Textarea", "Select", "MultiSelect", "DatePicker", "DateInput", "TimeInput", "NumberInput", "FileUpload", "FileInput"]);
const elementWidthPresets = new Set(["short", "medium", "long", "full"]);
const buttonSizePresets = new Set(["small", "medium", "large"]);
const toastPlacementPresets = new Set(["top-right", "top-left", "bottom-right", "bottom-left", "top", "bottom"]);
const toastDurationPresets = new Set(["short", "medium", "long", "manual"]);
const optionElementTypes = new Set(["Select", "MultiSelect", "RadioGroup", "CheckboxGroup"]);
const inputElementTypes = new Set([
  "Input",
  "Textarea",
  "Select",
  "MultiSelect",
  "Checkbox",
  "CheckboxGroup",
  "Switch",
  "RadioGroup",
  "FileUpload",
  "FileInput",
  "DatePicker",
  "DateInput",
  "TimeInput",
  "NumberInput"
]);

export function isKnownElementType(type: string): boolean {
  return elementTypes.has(type) || customElementTypeRegex.test(type);
}

export function isInputElementType(type: string): boolean {
  return inputElementTypes.has(type);
}

export function validateElementProperties(
  element: MarkVSpecElement,
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  checkUnsupportedElementProperties(element, diagnostics);
  checkElementPresetProperties(element, diagnostics);
  checkElementSource(element, result, diagnostics);
  checkSampleSource(element, diagnostics);
  checkTableProperties(element, diagnostics);
}

function checkUnsupportedElementProperties(element: MarkVSpecElement, diagnostics: MarkVSpecDiagnostic[]): void {
  const typeProperties = elementTypeProperties.get(element.type) ?? new Set<string>();
  for (const key of Object.keys(element.properties)) {
    if (optionElementTypes.has(element.type) && key === "options" && element.properties[key] === true) {
      continue;
    }

    if (key.startsWith("route param ")) {
      continue;
    }

    if (key === "bind") {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "element.unsupportedLegacyBind",
        { elementId: element.id },
        firstPropertyLine(element, key) ?? element.location.line
      ));
      continue;
    }

    if (commonElementProperties.has(key) || typeProperties.has(key)) {
      continue;
    }

    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "element.unsupportedProperty",
      { elementId: element.id, type: element.type, property: key },
      firstPropertyLine(element, key) ?? element.location.line
    ));
  }
}

function checkElementPresetProperties(element: MarkVSpecElement, diagnostics: MarkVSpecDiagnostic[]): void {
  const width = element.properties["width"];
  if (typeof width === "string" && elementWidthTypes.has(element.type) && !elementWidthPresets.has(width)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} width must be one of short, medium, long, full.`,
      line: firstPropertyLine(element, "width") ?? element.location.line
    });
  }

  const size = element.properties["size"];
  if (typeof size === "string" && element.type === "Button" && !buttonSizePresets.has(size)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} size must be one of small, medium, large.`,
      line: firstPropertyLine(element, "size") ?? element.location.line
    });
  }

  const placement = element.properties["placement"];
  if (typeof placement === "string" && element.type === "Toast" && !toastPlacementPresets.has(placement)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} placement must be one of top-right, top-left, bottom-right, bottom-left, top, bottom.`,
      line: firstPropertyLine(element, "placement") ?? element.location.line
    });
  }

  const duration = element.properties["duration"];
  if (typeof duration === "string" && element.type === "Toast" && !toastDurationPresets.has(duration)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} duration must be one of short, medium, long, manual.`,
      line: firstPropertyLine(element, "duration") ?? element.location.line
    });
  }
}

function checkTableProperties(element: MarkVSpecElement, diagnostics: MarkVSpecDiagnostic[]): void {
  if (element.type !== "Table") {
    return;
  }

  const rows = stringProperty(element, "rows");
  if (rows) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} rows is not canonical. Use sample rows or Preview Scenario samples instead.`,
      line: firstPropertyLine(element, "rows") ?? element.location.line
    });
  }

  for (const column of element.tableColumns) {
    for (const metadata of column.metadata ?? []) {
      if (metadata.key === "sortable" && metadata.value !== "true" && metadata.value !== "false") {
        diagnostics.push({
          severity: "warning",
          message: `Element ${element.id} table column ${column.label} sortable must be true or false.`,
          line: metadata.location.line
        });
      }
      if (metadata.key === "sort" && metadata.value !== "asc" && metadata.value !== "desc") {
        diagnostics.push({
          severity: "warning",
          message: `Element ${element.id} table column ${column.label} sort must be asc or desc.`,
          line: metadata.location.line
        });
      }
    }
  }
}

function checkElementSource(element: MarkVSpecElement, result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  const source = element.properties["source"];
  if (source === undefined) {
    return;
  }

  const line = firstPropertyLine(element, "source") ?? element.location.line;
  if (source === true) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} source must be one of fixed, i18n, data, route, element, asset, external, computed.`,
      line
    });
    return;
  }

  if (opaqueExpressionBody(source)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} source must be a source type, not a reference expression. Use rows, src, value, or another property for ${source}.`,
      line
    });
    return;
  }

  if (!isMarkVSpecSourceType(source)) {
    diagnostics.push({
      severity: "warning",
      message: source === "document"
        ? `Element ${element.id} source document is not supported. Use fixed for document-authored content.`
        : `Element ${element.id} source must be one of fixed, i18n, data, route, element, asset, external, computed.`,
      line
    });
    return;
  }

  if (source === "element") {
    checkElementSourceReference(element, result, diagnostics);
  }
}

function checkSampleSource(element: MarkVSpecElement, diagnostics: MarkVSpecDiagnostic[]): void {
  const source = stringProperty(element, "source") || "fixed";
  const sample = stringProperty(element, "sample");
  const src = stringProperty(element, "src");
  if (sample && src.startsWith("${model.") && source !== "data") {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} uses a model src with sample. Add source: data for data-derived preview values.`,
      line: firstPropertyLine(element, "src") ?? firstPropertyLine(element, "sample") ?? element.location.line
    });
  } else if (sample && source !== "data") {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} sample is only for source data preview values. Use text, label, message, or hint for fixed content.`,
      line: firstPropertyLine(element, "sample") ?? element.location.line
    });
  }

  if (element.sampleRows && source !== "data") {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} sample rows is only for source data preview rows. Add source: data or remove sample rows.`,
      line: firstPropertyLine(element, "sample rows") ?? element.location.line
    });
  }
}

const elementValueReferenceRegex = new RegExp(String.raw`^(${elementIdPattern})\.value$`, "u");

function checkElementSourceReference(element: MarkVSpecElement, result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  const value = stringProperty(element, "value");
  const line = firstPropertyLine(element, "value") ?? firstPropertyLine(element, "source") ?? element.location.line;
  const match = elementValueReferenceRegex.exec(value);
  if (!match) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} source element requires value: E-*.value.`,
      line
    });
    return;
  }

  const elementsById = new Map(result.elements.map((candidate) => [candidate.id, candidate]));
  const targetId = match[1];
  if (!elementsById.has(targetId)) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} value references missing element ${targetId}.`,
      line
    });
    return;
  }

  const cycle = elementSourceCycleFor(element.id, elementsById);
  if (cycle) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} source element has circular value reference: ${cycle.join(" -> ")}.`,
      line
    });
  }
}

function elementSourceCycleFor(
  startId: string,
  elementsById: Map<string, MarkVSpecElement>
): string[] | undefined {
  const seen = new Set<string>();
  const path: string[] = [];
  let currentId: string | undefined = startId;
  while (currentId) {
    if (seen.has(currentId)) {
      const cycleStart = path.indexOf(currentId);
      return [...path.slice(cycleStart), currentId];
    }
    seen.add(currentId);
    path.push(currentId);
    const current = elementsById.get(currentId);
    if (!current || current.properties["source"] !== "element") {
      return undefined;
    }
    const match = elementValueReferenceRegex.exec(stringProperty(current, "value"));
    currentId = match?.[1];
  }
  return undefined;
}

function stringProperty(element: MarkVSpecElement, key: string): string {
  return propertyString(element, key) ?? "";
}

function firstPropertyLine(
  owner: { propertyLocations: Record<string, Array<{ line: number }>> },
  key: string
): number | undefined {
  return owner.propertyLocations[key]?.[0]?.line;
}
