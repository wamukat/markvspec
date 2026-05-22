import { elementIdPattern, opaqueExpressionBody } from "./ids.js";
import { createRepresentedExtensionItemDiagnostic } from "./source-text-diagnostics.js";
import { isMarkVSpecSourceType } from "./source-types.js";
import { propertyString } from "./property-accessor.js";
import {
  commonElementProperties,
  elementAcceptsOptions,
  elementAllowedProperties,
  isFormControlElement,
  isKnownElementType as isKnownElementTypeFromDomain
} from "./element-domain.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecParseResult
} from "./types.js";

const elementWidthTypes = new Set(["Input", "Textarea", "Select", "MultiSelect", "DatePicker", "DateInput", "TimeInput", "NumberInput", "FileUpload", "FileInput"]);
const elementWidthPresets = new Set(["short", "medium", "long", "full"]);
const buttonSizePresets = new Set(["small", "medium", "large"]);
const toastPlacementPresets = new Set(["top-right", "top-left", "bottom-right", "bottom-left", "top", "bottom"]);
const toastDurationPresets = new Set(["short", "medium", "long", "manual"]);

export function isKnownElementType(type: string): boolean {
  return isKnownElementTypeFromDomain(type);
}

export function isInputElementType(type: string): boolean {
  return isFormControlElement(type);
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
  const typeProperties = elementAllowedProperties(element.type);
  for (const key of Object.keys(element.properties)) {
    if (elementAcceptsOptions(element.type) && key === "options" && element.properties[key] === true) {
      continue;
    }

    if (key.startsWith("route param ")) {
      continue;
    }

    if (commonElementProperties.has(key) || typeProperties.has(key)) {
      continue;
    }

    diagnostics.push(createRepresentedExtensionItemDiagnostic({
      context: `Element ${element.id}`,
      text: elementPropertyDiagnosticText(key, element.properties[key]),
      location: { line: firstPropertyLine(element, key) ?? element.location.line }
    }));
  }
}

function elementPropertyDiagnosticText(key: string, value: MarkVSpecElement["properties"][string]): string {
  if (value === true) {
    return key;
  }
  if (Array.isArray(value)) {
    return `${key}: ${value.join(", ")}`;
  }
  return `${key}: ${value}`;
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
