import { sourceTypeForElement, type MarkVSpecSourceType } from "./source-types.js";
import { tableColumnSampleKeys } from "./table-columns.js";
import type { MarkVSpecParseResult } from "./types.js";

type ParsedElement = MarkVSpecParseResult["elements"][number];

export type DisplayContentSpecRow = {
  element: ParsedElement;
  location: string;
  value: string;
  contentSections?: DisplayContentSpecSection[];
  source?: string | true;
  format?: string;
};

export type DisplayContentSpecSection = {
  title: string;
  rows: string[];
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
      pushTableColumnRows(rows, element, sourceType);
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
    pushDisplayPropertyRow(rows, element, "href", properties["href"], sourceType, rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "value", displayValueProperty(element), sourceType, rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "content", properties["content"], sourceType);
    pushDisplayPropertyRow(rows, element, "text", properties["text"], sourceType);
    pushDisplayPropertyRow(rows, element, "title", properties["title"], sourceType);
    pushDisplayPropertyRow(rows, element, "alt", properties["alt"], sourceType);
    pushDisplayPropertyRow(rows, element, "name", properties["name"], sourceType);
    pushListItemsRow(rows, element, sourceType);
    pushSelectOptionsRow(rows, element, sourceType);
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
  const metadata = element.propertyMetadata[location];
  const contentSections = metadata?.source
    ? [
        { title: "Value", rows: [stringValue] },
        { title: "Source", rows: [metadata.source] }
      ]
    : undefined;
  rows.push({
    element,
    location,
    value: stringValue,
    ...(contentSections ? { contentSections } : {}),
    source: metadata?.kind ?? source,
    format: metadata?.format ?? format
  });
}

function pushTableColumnRows(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  const knownKeys = new Set<string>();
  for (const column of element.tableColumns) {
    const field = tableColumnField(column);
    for (const key of tableColumnSampleKeys(column)) {
      knownKeys.add(key);
    }
    rows.push({
      element,
      location: "column",
      value: column.label,
      contentSections: [
        { title: "Label", rows: [column.label] },
        ...(field ? [{ title: "Field", rows: [field] }] : [])
      ],
      source,
      format: tableColumnMetadataValue(column, "format")
    });
  }

  for (const key of sampleRowFieldKeys(element)) {
    if (knownKeys.has(key)) {
      continue;
    }
    knownKeys.add(key);
    rows.push({
      element,
      location: "column",
      value: key,
      contentSections: [
        { title: "Field", rows: [key] }
      ],
      source
    });
  }
}

function pushSelectOptionsRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  if (element.selectOptions.length === 0) {
    return;
  }
  const optionRows = element.selectOptions.map((option) => {
    if (!option.metadata) {
      return option.source ? `${option.label} (${option.source})` : option.label;
    }
    const source = option.metadata.source ?? option.source;
    const kind = option.metadata?.kind;
    const format = option.metadata?.format;
    return [option.label, kind, source, format].filter(Boolean).join(" / ");
  });
  rows.push({
    element,
    location: "options",
    value: optionRows.join(", "),
    contentSections: [
      { title: "Options", rows: optionRows }
    ],
    source
  });
}

function pushListItemsRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  const items = splitListValue(rawStringProperty(element.properties["items"]));
  if (items.length === 0) {
    return;
  }
  rows.push({
    element,
    location: "items",
    value: items.join(", "),
    contentSections: [
      { title: "Items", rows: items }
    ],
    source
  });
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

function tableColumnField(column: ParsedElement["tableColumns"][number]): string {
  return column.key ?? column.source ?? column.label ?? "";
}

function tableColumnMetadataValue(column: ParsedElement["tableColumns"][number], key: string): string | undefined {
  return column.metadata?.find((metadata) => metadata.key === key)?.value;
}

function sampleRowFieldKeys(element: ParsedElement): string[] {
  const keys = new Set<string>();
  for (const row of element.sampleRows?.rows ?? []) {
    for (const key of Object.keys(row.fields)) {
      keys.add(key);
    }
  }
  return [...keys];
}

function splitListValue(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
