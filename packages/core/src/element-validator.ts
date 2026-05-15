import { opaqueExpressionBody } from "./ids.js";
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
  "Badge",
  "Image",
  "Icon",
  "Spinner",
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
  "message",
  "message src",
  "sample",
  "purpose",
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
  "bind"
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
  ["List", new Set(["items"])],
  ["Table", new Set(["source"])],
  ["Banner", new Set()],
  ["Dialog", new Set(["title", "content"])],
  ["Badge", new Set()],
  ["Image", new Set(["src", "alt"])],
  ["Icon", new Set(["name"])],
  ["Spinner", new Set()],
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
  checkTableProperties(element, result, diagnostics);
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

    if (commonElementProperties.has(key) || typeProperties.has(key)) {
      continue;
    }

    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} of type ${element.type} uses unsupported property ${key}.`,
      line: firstPropertyLine(element, key) ?? element.location.line
    });
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
}

function checkTableProperties(element: MarkVSpecElement, result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  if (element.type !== "Table") {
    return;
  }

  const source = stringProperty(element, "source");
  if (source) {
    const sourceKey = opaqueExpressionBody(source) ?? source;
    const hasSample = result.modelSamples.some((sample) => (opaqueExpressionBody(sample.path) ?? sample.path) === sourceKey);
    if (!hasSample) {
      diagnostics.push({
        severity: "warning",
        message: `Element ${element.id} source ${source} does not match any Model Samples path.`,
        line: firstPropertyLine(element, "source") ?? element.location.line
      });
    }
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

function stringProperty(element: MarkVSpecElement, key: string): string {
  const value = element.properties[key];
  return typeof value === "string" ? value : "";
}

function firstPropertyLine(
  owner: { propertyLocations: Record<string, Array<{ line: number }>> },
  key: string
): number | undefined {
  return owner.propertyLocations[key]?.[0]?.line;
}
