import { sourceTypeForElement, type MarkVSpecSourceType } from "./source-types.js";
import type { MarkVSpecParseResult } from "./types.js";

type ParsedElement = MarkVSpecParseResult["elements"][number];

export type DisplayContentSpecRow = {
  element: ParsedElement;
  location: string;
  value: string;
  source?: string | true;
  format?: string;
};

export function buildDisplayContentSpecRows(elements: ParsedElement[]): DisplayContentSpecRow[] {
  return elements.flatMap((element) => {
    const properties = element.properties;
    const rows: DisplayContentSpecRow[] = [];
    const displaySource = properties["src"];
    const sourceType = sourceTypeForElement(element);
    const displaySample = sourceType === "data" ? properties["sample"] : undefined;
    if (element.type === "Table") {
      pushDisplayPropertyRow(rows, element, "table rows", "see wireframe", sourceType);
      pushDisplayPropertyRow(rows, element, "rows", properties["rows"], sourceType);
      for (const column of element.tableColumns) {
        pushDisplayPropertyRow(rows, element, `column: ${column.label}`, column.label, sourceType);
        pushDisplayPropertyRow(rows, element, `column source: ${column.label}`, column.source, sourceType);
      }
    }
    pushDisplayPropertyRow(rows, element, "label", properties["label"], sourceType);
    pushDisplayPropertyRow(rows, element, "label src", properties["label src"], sourceType);
    pushDisplayPropertyRow(rows, element, "placeholder", properties["placeholder"], sourceType);
    pushDisplayPropertyRow(rows, element, "placeholder src", properties["placeholder src"], sourceType);
    pushDisplayPropertyRow(rows, element, "help", properties["help"], sourceType);
    pushDisplayPropertyRow(rows, element, "help src", properties["help src"], sourceType);
    pushDisplayPropertyRow(rows, element, "hint", properties["hint"], sourceType);
    pushDisplayPropertyRow(rows, element, "message", properties["message"], sourceType);
    pushDisplayPropertyRow(rows, element, "message src", properties["message src"], sourceType);
    pushDisplayPropertyRow(rows, element, "error text", properties["error text"], sourceType);
    pushDisplayPropertyRow(rows, element, "sample", displaySample, sourceType, rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "src", displaySource, sourceType, rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "value", displayValueProperty(element), sourceType, rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "content", properties["content"], sourceType);
    pushDisplayPropertyRow(rows, element, "text", properties["text"], sourceType);
    pushDisplayPropertyRow(rows, element, "title", properties["title"], sourceType);
    pushDisplayPropertyRow(rows, element, "alt", properties["alt"], sourceType);
    pushDisplayPropertyRow(rows, element, "name", properties["name"], sourceType);
    pushDisplayPropertyRow(rows, element, "items", properties["items"], sourceType);
    for (const option of element.selectOptions) {
      rows.push({
        element,
        location: "option label",
        value: option.label,
        source: sourceType
      });
      pushDisplayPropertyRow(rows, element, "option source", option.source, sourceType);
    }
    return rows;
  });
}

export function isFormControlElement(type: string): boolean {
  return ["Input", "Textarea", "Select", "MultiSelect", "Checkbox", "CheckboxGroup", "Switch", "RadioGroup", "DatePicker", "DateInput", "TimeInput", "NumberInput", "FileUpload", "FileInput"].includes(type);
}

function pushDisplayPropertyRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  location: string,
  value: string | true | undefined,
  source?: MarkVSpecSourceType,
  format?: string
): void {
  const stringValue = rawStringProperty(value);
  if (!stringValue) {
    return;
  }
  rows.push({ element, location, value: stringValue, source, format });
}

function displayValueProperty(element: ParsedElement): string | undefined {
  const value = rawStringProperty(element.properties["value"]);
  if (!value || isFormControlElement(element.type)) {
    return undefined;
  }
  return value;
}

function rawStringProperty(value: string | true | undefined): string {
  return typeof value === "string" ? value : "";
}
