import { sourceTypeForElement, type MarkVSpecSourceType } from "./source-types.js";
import { tableColumnSampleKeys } from "./table-columns.js";
import type { MarkVSpecParseResult } from "./types.js";

type ParsedElement = MarkVSpecParseResult["elements"][number];
type ScenarioSample = MarkVSpecParseResult["previewScenarios"][number]["samples"][number];

export type DisplayContentSpecContext = {
  scenarioSamples?: readonly ScenarioSample[];
  routeValues?: Record<string, string>;
  sampleRowsAnchorId?: (elementId: string) => string;
};

export type DisplayContentSpecRow = {
  element: ParsedElement;
  location: string;
  value: string;
  contentSections?: DisplayContentSpecSection[];
  sampleRowsRef?: DisplayContentSpecSampleRowsRef;
  source?: string | true;
  format?: string;
};

export type DisplayContentSpecSampleRowsRef = {
  elementId: string;
  anchorId?: string;
};

export type DisplayContentSpecSection = {
  title: string;
  rows: string[];
};

export function buildDisplayContentSpecRows(elements: ParsedElement[], context: DisplayContentSpecContext = {}): DisplayContentSpecRow[] {
  return elements.flatMap((element) => {
    const properties = element.properties;
    const rows: DisplayContentSpecRow[] = [];
    const displaySource = properties["src"];
    const sourceType = sourceTypeForElement(element);
    const displaySample = sourceType === "data" ? properties["sample"] : undefined;
    if (element.type === "Table") {
      pushTableRowsReferenceRow(rows, element, sourceType, context);
      pushDisplayPropertyRow(rows, element, "rows", properties["rows"], sourceType, undefined, context);
      pushTableColumnRows(rows, element, sourceType);
    }
    pushDisplayPropertyRow(rows, element, "label", properties["label"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "label src", properties["label src"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "placeholder", properties["placeholder"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "placeholder src", properties["placeholder src"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "help", properties["help"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "help src", properties["help src"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "hint", properties["hint"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "message", properties["message"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "message src", properties["message src"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "error text", properties["error text"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "sample", displaySample, sourceType, rawStringProperty(properties["format"]), context);
    pushDisplayPropertyRow(rows, element, "src", displaySource, sourceType, rawStringProperty(properties["format"]), context);
    pushDisplayPropertyRow(rows, element, "href", properties["href"], sourceType, rawStringProperty(properties["format"]), context);
    pushDisplayPropertyRow(rows, element, "value", displayValueProperty(element), sourceType, rawStringProperty(properties["format"]), context);
    pushDisplayPropertyRow(rows, element, "content", properties["content"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "text", properties["text"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "title", properties["title"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "alt", properties["alt"], sourceType, undefined, context);
    pushDisplayPropertyRow(rows, element, "name", properties["name"], sourceType, undefined, context);
    pushListItemsRow(rows, element, sourceType, context);
    pushSelectOptionsRow(rows, element, sourceType);
    pushTabsRow(rows, element, sourceType);
    pushAccordionDisclosureRows(rows, element, sourceType);
    pushActionMenuRows(rows, element, sourceType);
    pushAnchoredOverlayRow(rows, element, sourceType);
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
  format?: string,
  context: DisplayContentSpecContext = {}
): void {
  const stringValue = rawStringProperty(value);
  if (!stringValue) {
    return;
  }
  const resolvedValue = resolveRouteValue(stringValue, context.routeValues);
  const metadata = element.propertyMetadata[location];
  const contentSections = metadata?.source
    ? [
        { title: "Value", rows: [resolvedValue] },
        { title: "Source", rows: [metadata.source] }
      ]
    : undefined;
  rows.push({
    element,
    location,
    value: resolvedValue,
    ...(contentSections ? { contentSections } : {}),
    source: metadata?.kind ?? source,
    format: metadata?.format ?? format
  });
}

function resolveRouteValue(value: string, routeValues: Record<string, string> | undefined): string {
  if (!routeValues) {
    return value;
  }
  const match = /^\$\{\s*route\.([A-Za-z][A-Za-z0-9_-]*)\s*\}$/u.exec(value);
  if (!match) {
    return value;
  }
  return routeValues[match[1]] ?? value;
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

function pushTableRowsReferenceRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType,
  context: DisplayContentSpecContext
): void {
  const scenarioRows = sampleRowsForElement(context, element.id);
  if (scenarioRows) {
    rows.push(sampleRowsReferenceRow(element, "table rows", "data", context));
    return;
  }

  const metadata = element.propertyMetadata["rows"] ?? element.propertyMetadata["sample rows"];
  if (metadata?.kind) {
    rows.push(sampleRowsReferenceRow(element, "table rows", metadata.kind, context));
    return;
  }

  if (element.tableRows.length > 0) {
    rows.push({
      element,
      location: "table rows",
      value: `fixed rows: ${element.tableRows.length}`,
      source: "fixed"
    });
    return;
  }

  if (source === "data" && element.sampleRows && (element.sampleRows.rows.length > 0 || element.sampleRows.explicitEmpty)) {
    rows.push(sampleRowsReferenceRow(element, "table rows", "data", context));
  }
}

function pushSelectOptionsRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  _source: MarkVSpecSourceType
): void {
  if (element.selectOptions.length === 0) {
    return;
  }
  const optionFormats = element.selectOptions.map((option) => option.metadata?.format ?? "");
  const source = aggregateSelectOptionSource(element.selectOptions);
  const format = aggregateDisplayMetadata(optionFormats, { includeEmpty: true });
  rows.push({
    element,
    location: "options",
    value: element.selectOptions.map((option) => option.label).join(", "),
    contentSections: [
      {
        title: "Options",
        rows: element.selectOptions.map(formatSelectOptionContentRow)
      }
    ],
    source,
    ...(format ? { format } : {})
  });
}

function aggregateDisplayMetadata(values: string[], options: { includeEmpty?: boolean } = {}): string | undefined {
  if (values.every((value) => !value)) {
    return undefined;
  }
  const unique = Array.from(new Set(options.includeEmpty ? values : values.filter(Boolean)));
  if (unique.length === 0) {
    return undefined;
  }
  return unique.length === 1 ? unique[0] : "mixed";
}

function aggregateSelectOptionSource(options: ParsedElement["selectOptions"]): string | undefined {
  const signatures = options.map((option) => {
    const kind = option.metadata?.kind ?? "fixed";
    const source = option.metadata?.source ?? option.source ?? "";
    return source ? `${kind}:${source}` : kind;
  });
  const unique = Array.from(new Set(signatures));
  if (unique.length === 0) {
    return undefined;
  }
  if (unique.length > 1) {
    return "mixed";
  }
  return options[0]?.metadata?.kind ?? "fixed";
}

function formatSelectOptionContentRow(option: ParsedElement["selectOptions"][number]): string {
  const details = [
    option.metadata?.kind,
    option.metadata?.source ?? option.source,
    option.metadata?.format ? `format: ${option.metadata.format}` : ""
  ].filter(Boolean);
  return details.length > 0 ? `${option.label} (${details.join("; ")})` : option.label;
}

function pushListItemsRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType,
  context: DisplayContentSpecContext
): void {
  if (element.type !== "List") {
    return;
  }

  const scenarioRows = sampleRowsForElement(context, element.id);
  if (scenarioRows) {
    rows.push(sampleRowsReferenceRow(element, "list items", "data", context));
    return;
  }

  if (source === "data" && element.sampleRows && (element.sampleRows.rows.length > 0 || element.sampleRows.explicitEmpty)) {
    rows.push(sampleRowsReferenceRow(element, "list items", "data", context));
    return;
  }

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
    source: source === "data" ? undefined : source
  });
}

function pushTabsRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  if (element.type !== "Tabs" || element.tabs.length === 0) {
    return;
  }
  rows.push({
    element,
    location: "tabs",
    value: element.tabs.map((item) => item.label).join(", "),
    contentSections: [
      { title: "Tabs", rows: element.tabs.map(formatTabItemContentRow) }
    ],
    source
  });
}

function formatTabItemContentRow(item: ParsedElement["tabs"][number]): string {
  const details = [
    item.panel ? `panel: ${item.panel}` : "",
    item.action ? `action: ${item.action}` : ""
  ].filter(Boolean);
  return details.length > 0 ? `${item.label} (${details.join("; ")})` : item.label;
}

function pushAccordionDisclosureRows(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  if (element.type === "Accordion" && element.accordionItems.length > 0) {
    rows.push({
      element,
      location: "accordion",
      value: element.accordionItems.map((item) => item.label).join(", "),
      contentSections: [
        { title: "Accordion", rows: element.accordionItems.map(formatPanelItemContentRow) }
      ],
      source
    });
    return;
  }

  if (element.type !== "Disclosure") {
    return;
  }

  const label = rawStringProperty(element.properties["label"]);
  const open = rawStringProperty(element.properties["open"]);
  const panel = rawStringProperty(element.properties["panel"]);
  const action = rawStringProperty(element.properties["action"]);
  const rowsValue = [
    label ? `label: ${label}` : "",
    open ? `open: ${open}` : "",
    panel ? `panel: ${panel}` : "",
    action ? `action: ${action}` : ""
  ].filter(Boolean);
  if (rowsValue.length === 0) {
    return;
  }
  rows.push({
    element,
    location: "disclosure",
    value: label || panel || open || action,
    contentSections: [
      { title: "Disclosure", rows: rowsValue }
    ],
    source
  });
}

function formatPanelItemContentRow(item: ParsedElement["accordionItems"][number]): string {
  const details = [
    item.panel ? `panel: ${item.panel}` : "",
    item.action ? `action: ${item.action}` : ""
  ].filter(Boolean);
  return details.length > 0 ? `${item.label} (${details.join("; ")})` : item.label;
}

function pushActionMenuRows(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  if (element.type !== "ActionMenu" || element.actionMenuItems.length === 0) {
    return;
  }
  rows.push({
    element,
    location: "action menu",
    value: element.actionMenuItems.map((item) => item.label).join(", "),
    contentSections: [
      { title: "Action Menu", rows: element.actionMenuItems.map(formatActionMenuItemContentRow) }
    ],
    source
  });
}

function formatActionMenuItemContentRow(item: ParsedElement["actionMenuItems"][number]): string {
  const details = [
    item.action ? `action: ${item.action}` : "",
    item.tone ? `tone: ${item.tone}` : "",
    ...item.disabledWhen.map((condition) => `disabled when: ${condition}`)
  ].filter(Boolean);
  return details.length > 0 ? `${item.label} (${details.join("; ")})` : item.label;
}

function pushAnchoredOverlayRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  source: MarkVSpecSourceType
): void {
  if (element.type !== "Popover" && element.type !== "Tooltip") {
    return;
  }

  const text = rawStringProperty(element.properties["text"]) || rawStringProperty(element.properties["content"]);
  const anchor = rawStringProperty(element.properties["anchor"]);
  const placement = rawStringProperty(element.properties["placement"]);
  const visibility = element.visibleWhen.length > 0 ? element.visibleWhen.join(", ") : "";
  const value = text || anchor || placement || visibility;
  if (!value) {
    return;
  }

  rows.push({
    element,
    location: "overlay",
    value,
    contentSections: [
      { title: "Overlay", rows: [
        anchor ? `anchor: ${anchor}` : "",
        placement ? `placement: ${placement}` : "",
        text ? `text: ${text}` : "",
        visibility ? `visible when: ${visibility}` : ""
      ].filter(Boolean) }
    ],
    source
  });
}

function sampleRowsReferenceRow(
  element: ParsedElement,
  location: string,
  source: string,
  context: DisplayContentSpecContext
): DisplayContentSpecRow {
  return {
    element,
    location,
    value: "Sample rows",
    sampleRowsRef: {
      elementId: element.id,
      ...(context.sampleRowsAnchorId ? { anchorId: context.sampleRowsAnchorId(element.id) } : {})
    },
    source
  };
}

function sampleRowsForElement(context: DisplayContentSpecContext, elementId: string): ScenarioSample["rows"] | undefined {
  return context.scenarioSamples?.find((sample) => sample.elementId === elementId && sample.rows)?.rows;
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
