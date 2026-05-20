import {
  formControlDisplayValue,
  formControlSpecForElement,
  isMarkVSpecSourceType,
  propertyString as corePropertyString,
  stateScreenElementGroups,
  stateScreenElementsForModel
} from "@markvspec/core";
import type {
  DisplayContentSpecRow,
  DisplayContentSpecSampleRowsRef,
  MarkVSpecParseResult,
  RendererMessages,
  StateScreenReadModel
} from "@markvspec/core";
import { renderStaticElementSampleRowsReference } from "./static-entity-reference-presenter.js";

type StaticElement = MarkVSpecParseResult["elements"][number];
type StaticTableCell = string | undefined | null | {
  html: string | undefined;
  rowspan?: number;
};
type StaticElementSpecIconName = "database" | "languages" | "route" | "table";

export interface StaticElementSpecRenderingSupport {
  code(value: string | undefined): string;
  consecutiveRowspans<T>(rows: T[], keyFor: (row: T, index: number) => string): number[];
  escapeHtml(value: string): string;
  renderCondition(condition: string): string;
  renderElementConditionSummary(element: StaticElement, messages: RendererMessages): string;
  renderExpressionTokens(source: string): string;
  renderPreviewIcon(name: StaticElementSpecIconName): string;
  renderScenarioSampleElementRef(result: MarkVSpecParseResult, elementId: string): string;
  renderSemanticChip(value: string, tone: string | undefined): string;
  renderSpecSections(sections: Array<{ title: string; rows: string[] }>): string;
  renderStaticSpecList(items: string[]): string;
  renderStaticSpecSections(sections: Array<[string, string[]]>): string;
  renderTable(headers: string[], rows: Array<Array<string | undefined>>, emptyLabel?: string): string;
  renderTableWithCells(headers: string[], rows: StaticTableCell[][], emptyLabel?: string): string;
  rowspanPrefixCells(rowspan: number, htmlCells: string[]): StaticTableCell[];
}

export function renderInputFormSpecBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  support: StaticElementSpecRenderingSupport
): string {
  const elements = stateScreenElementsForModel(result, model);
  const { formControls } = stateScreenElementGroups(elements, result, model.stateName, model);
  if (formControls.length === 0) {
    return "";
  }

  const markerIdHeader = `${messages.marker}/${messages.id}`;
  const rows = formControls.map((element) => [
    support.renderScenarioSampleElementRef(result, element.id),
    support.escapeHtml(element.type),
    renderStaticRequiredSpec(element, messages, support),
    renderStaticFormControlValue(element, model, support),
    renderStaticFormControlSource(element, support),
    renderStaticInputSpec(element, messages, support),
    support.renderElementConditionSummary(element, messages)
  ]);
  return `<div class="element-detail-group">
    <h6 class="state-screen-detail-heading">${support.escapeHtml(messages.inputFormSpec)}</h6>
    ${support.renderTable([markerIdHeader, messages.type, messages.required, messages.initialValueSource, messages.displaySource, messages.inputSpec, messages.condition], rows, messages.none)}
  </div>`;
}

export function renderStaticFormControlValue(
  element: StaticElement,
  model: StateScreenReadModel,
  support: StaticElementSpecRenderingSupport
): string {
  const spec = formControlSpecForElement(element);
  const sampleValue = model.scenarioSamples.find((sample) => sample.elementId === element.id && sample.value !== undefined)?.value
    ?? routeResolvedValue(spec.value ?? "", model);
  const renderedValue = formControlDisplayValue(element, sampleValue);
  return renderedValue ? support.renderExpressionTokens(renderedValue) : "";
}

function routeResolvedValue(value: string, model: StateScreenReadModel): string | undefined {
  const match = /^\$\{\s*route\.([A-Za-z][A-Za-z0-9_-]*)\s*\}$/u.exec(value);
  if (!match) {
    return undefined;
  }
  return model.scenarioRoute.find((sample) => sample.key === match[1])?.value;
}

export function renderStaticFormControlSource(
  element: StaticElement,
  support: StaticElementSpecRenderingSupport
): string {
  const spec = formControlSpecForElement(element);
  return [renderSourceSummary(spec.sourceKind, support), spec.sourceDetail ? renderSourceSummary(spec.sourceDetail, support) : ""].filter(Boolean).join("<br>");
}

export function renderStaticRequiredSpec(
  element: StaticElement,
  messages: RendererMessages,
  support: StaticElementSpecRenderingSupport
): string {
  const spec = formControlSpecForElement(element);
  const requiredWhenRows = spec.requiredWhen
    .map((condition) => `${support.escapeHtml(messages.conditionWhenShort)}: ${support.renderCondition(condition)}`);
  const rows = [
    spec.required ? support.escapeHtml(messages.requiredYes) : requiredWhenRows.length === 0 ? support.escapeHtml(messages.requiredNo) : "",
    ...requiredWhenRows
  ].filter(Boolean);
  return rows.length === 1 ? rows[0] ?? "" : support.renderStaticSpecList(rows);
}

export function renderStaticInputSpec(
  element: StaticElement,
  messages: RendererMessages,
  support: StaticElementSpecRenderingSupport
): string {
  const spec = formControlSpecForElement(element);
  const inputRows = [
    ...spec.inputProperties.map((property) => `${support.escapeHtml(property.key)}: ${support.renderExpressionTokens(property.value ?? "")}`),
    spec.options.length > 0
      ? `${support.escapeHtml(messages.options)}: ${spec.options.map((option) => renderStaticValueWithOptionalSource(option.label, option.source, support)).join(", ")}`
      : ""
  ].filter(Boolean);
  const constraintRows = [
    ...spec.constraintProperties.map((property) => property.value ? `${support.escapeHtml(property.key)}: ${support.renderExpressionTokens(property.value)}` : support.escapeHtml(property.key)),
    spec.readonly ? support.escapeHtml(messages.readonly).toLowerCase() : ""
  ].filter(Boolean);
  return support.renderStaticSpecSections([
    [messages.input, inputRows],
    [messages.constraints, constraintRows],
    [messages.format, spec.format ? [support.renderExpressionTokens(spec.format)] : []]
  ]);
}

function renderStaticValueWithOptionalSource(
  value: string,
  source: string | true | undefined,
  support: StaticElementSpecRenderingSupport
): string {
  const renderedSource = renderSourceSummary(source, support);
  return renderedSource ? `${support.escapeHtml(value)} (${renderedSource})` : support.escapeHtml(value);
}

export function renderDisplayContentSpecBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  support: StaticElementSpecRenderingSupport
): string {
  const elements = stateScreenElementsForModel(result, model);
  const { displayContentRows } = stateScreenElementGroups(elements, result, model.stateName, model);
  if (displayContentRows.length === 0) {
    return "";
  }

  return `<div class="element-detail-group">
    <h6 class="state-screen-detail-heading">${support.escapeHtml(messages.displayContentSpec)}</h6>
    ${renderDisplayContentSpecTable(result, displayContentRows, messages, support)}
  </div>`;
}

export function renderDisplayContentSpecTable(
  result: MarkVSpecParseResult,
  rows: DisplayContentSpecRow[],
  messages: RendererMessages,
  support: StaticElementSpecRenderingSupport
): string {
  const spans = support.consecutiveRowspans(rows, (row) => row.element.id);
  const markerIdHeader = `${messages.marker}/${messages.id}`;
  return support.renderTableWithCells(
    [markerIdHeader, messages.displayLocation, messages.displayValue, messages.format, messages.displaySource, messages.condition],
    rows.map((row, index) => [
      ...support.rowspanPrefixCells(spans[index] ?? 0, [
        support.renderScenarioSampleElementRef(result, row.element.id)
      ]),
      support.escapeHtml(row.location),
      renderDisplayContentValue(row.element, row.value, row.contentSections, row.sampleRowsRef, support),
      row.format ? support.escapeHtml(row.format) : "",
      renderSourceSummary(row.source, support),
      support.renderElementConditionSummary(row.element, messages)
    ])
  );
}

function renderDisplayContentValue(
  element: StaticElement,
  value: string,
  sections: DisplayContentSpecRow["contentSections"] | undefined,
  sampleRowsRef: DisplayContentSpecSampleRowsRef | undefined,
  support: StaticElementSpecRenderingSupport
): string {
  if (sampleRowsRef) {
    return `${support.escapeHtml(value)}: ${renderSampleRowsReference(element, sampleRowsRef, support)}`;
  }
  if (sections && sections.length > 0) {
    return support.renderSpecSections(sections.map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => support.renderExpressionTokens(row))
    })));
  }
  if (hasOpaqueExpression(value)) {
    return support.renderExpressionTokens(value);
  }
  const dataSample = element.properties["source"] === "data" ? rawStringProperty(element.properties["sample"]) : "";
  return element.type === "Badge" && (value === dataSample || value === rawStringProperty(element.properties["text"]))
    ? support.renderSemanticChip(value, rawStringProperty(element.properties["tone"]))
    : support.escapeHtml(value);
}

function renderSampleRowsReference(
  element: StaticElement,
  sampleRowsRef: DisplayContentSpecSampleRowsRef,
  support: StaticElementSpecRenderingSupport
): string {
  const marker = rawStringProperty(element.properties["marker"]) || sampleRowsRef.elementId;
  return renderStaticElementSampleRowsReference({
    anchorId: sampleRowsRef.anchorId,
    elementId: sampleRowsRef.elementId,
    marker
  }, support);
}

function renderSourceSummary(value: string | true | undefined, support: StaticElementSpecRenderingSupport): string {
  const source = rawStringProperty(value);
  if (!source) {
    return "";
  }
  if (isMarkVSpecSourceType(source)) {
    return `<span class="mm-chip mm-source-chip mm-source-chip-${support.escapeHtml(source)}">${renderSourceKindIcon(source, support)}${support.escapeHtml(source)}</span>`;
  }
  return hasOpaqueExpression(source) ? support.renderExpressionTokens(source) : support.code(source);
}

function renderSourceKindIcon(source: string, support: StaticElementSpecRenderingSupport): string {
  if (source === "data") {
    return support.renderPreviewIcon("database");
  }
  if (source === "route") {
    return support.renderPreviewIcon("route");
  }
  if (source === "i18n") {
    return support.renderPreviewIcon("languages");
  }
  return "";
}

function rawStringProperty(value: string | true | undefined): string {
  return corePropertyString({ properties: { value } }, "value") ?? "";
}

function hasOpaqueExpression(value: string): boolean {
  return /\$\{[^}]+\}/u.test(value);
}
