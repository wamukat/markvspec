import type { MarkVSpecParseResult, MessageKey } from "@markvspec/core";
import {
  consecutiveRowspans,
  rowspanPrefixCells,
  stringProperty,
  type TableCell
} from "./design-document-renderer.js";
import {
  stateScreenElementGroups,
  stateScreenLayoutsForModel,
  stateScreenUnplacedLayoutIdsForModel,
  type DisplayContentSpecRow,
  type StateScreenReadModel
} from "@markvspec/core";

type ParsedElement = MarkVSpecParseResult["elements"][number];
type ParsedAction = MarkVSpecParseResult["actions"][number];
type ParsedLayout = MarkVSpecParseResult["layoutGroups"][number];

export interface StateViewSpecTableHelpers {
  label(key: MessageKey): string;
  conditionLabel(key: string): string;
  text(value: string | undefined): string;
  renderLocalizedTable(headers: string[], rows: Array<Array<string | undefined>>): string;
  renderLocalizedTableWithCells(headers: string[], rows: TableCell[][]): string;
  markerBadgeForId(id: string | undefined, linkAction?: boolean): string;
  renderDetailRefId(id: string): string;
  renderEntityNotes(notes: string[]): string;
  renderElementTypeSummary(element: ParsedElement): string;
  renderElementActionReferences(element: ParsedElement): string;
  renderElementDescription(element: ParsedElement): string;
  renderRequiredSpec(element: ParsedElement): string;
  renderFormControlInitialValueSource(element: ParsedElement): string;
  renderInputSpec(element: ParsedElement): string;
  renderFormControlBind(element: ParsedElement): string;
  renderContentElementState(element: ParsedElement): string;
  renderEnabledConditionList(element: ParsedElement): string;
  renderDisplayContentValue(element: ParsedElement, value: string): string;
  renderSourceSummary(value: string | true | undefined): string;
  renderElementLabelSummary(properties: Record<string, string | true>): string;
  renderElementValueSummary(properties: Record<string, string | true>): string;
  renderConditionList(groups: Array<[string, string[]]>): string;
  actionKind(action: ParsedAction): string;
  renderActionOverview(action: ParsedAction): string;
  renderTrigger(trigger: string | undefined): string;
}

export interface StateViewSpecTableRenderer {
  renderElementsTable(
    elements: ParsedElement[],
    layoutIds: ReadonlySet<string>,
    viewport: string | undefined,
    stateName: string | undefined,
    repeatedElementIds: ReadonlySet<string> | undefined,
    model: StateScreenReadModel
  ): string;
  renderLayoutsTable(
    model: StateScreenReadModel,
    repeatedLayoutIds: ReadonlySet<string> | undefined
  ): string;
  renderActionsTable(
    actions: ParsedAction[],
    stateName: string | undefined,
    stateNames: ReadonlySet<string>,
    repeatedActionIds: ReadonlySet<string> | undefined,
    emptyWhenRepeatedHidden: boolean
  ): string;
  renderRepeatedMarkerCell(id: string, repeated: boolean): string;
}

export function createStateViewSpecTableRenderer(
  result: MarkVSpecParseResult,
  helpers: StateViewSpecTableHelpers
): StateViewSpecTableRenderer {
  const renderRepeatedLabel = () => `<span class="mm-chip mm-repeated-badge">${helpers.text(helpers.label("repeated"))}</span>`;
  const renderUnplacedLabel = () => `<span class="mm-chip mm-unplaced-badge" title="${helpers.text(helpers.label("notPlacedInCurrentLayout"))}"><span class="mm-unplaced-icon" aria-hidden="true"></span>${helpers.text(helpers.label("notPlacedInCurrentLayout"))}</span>`;
  const renderRepeatedMarkerCell = (id: string, repeated: boolean): string => {
    const marker = helpers.markerBadgeForId(id);
    return repeated ? `${marker} ${renderRepeatedLabel()}` : marker;
  };
  const renderLayoutMarkerCell = (id: string, repeated: boolean, unplaced: boolean): string => {
    const marker = renderRepeatedMarkerCell(id, repeated);
    return unplaced ? `${marker} ${renderUnplacedLabel()}` : marker;
  };

  const renderElementDetailGroup = (title: string, content: string, emptyWhenRepeatedHidden = false): string =>
    `<div class="element-detail-group"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}><h4>${helpers.text(title)}</h4>${markRepeatedHiddenEmptyHtml(content, emptyWhenRepeatedHidden)}</div>`;

  const renderElementsTable = (
    elements: ParsedElement[],
    _layoutIds: ReadonlySet<string> = new Set(),
    _viewport?: string,
    _stateName?: string,
    repeatedElementIds?: ReadonlySet<string>,
    model?: StateScreenReadModel
  ): string => {
    if (elements.length === 0) {
      return "";
    }

    const { formControls, displayContentRows } = stateScreenElementGroups(elements, result, model?.stateName);
    const repeatedContent = model?.repeatedContent;

    return [
      `<h4>${helpers.label("elementSummary")}</h4>`,
      renderElementSummaryTable(elements, repeatedElementIds, repeatedContent?.elementSummaryEmptyWhenRepeatedHidden ?? false),
      formControls.length > 0 ? renderElementDetailGroup(helpers.label("inputFormSpec"), renderFormControlElementsTable(formControls, repeatedElementIds, repeatedContent?.inputFormSpecEmptyWhenRepeatedHidden ?? false), repeatedContent?.inputFormSpecEmptyWhenRepeatedHidden ?? false) : "",
      displayContentRows.length > 0 ? renderElementDetailGroup(helpers.label("displayContentSpec"), renderDisplayContentSpecTable(displayContentRows, repeatedElementIds, repeatedContent?.displayContentSpecEmptyWhenRepeatedHidden ?? false), repeatedContent?.displayContentSpecEmptyWhenRepeatedHidden ?? false) : ""
    ].filter(Boolean).join("");
  };

  const renderElementSummaryTable = (elements: ParsedElement[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean): string =>
    markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [helpers.label("marker"), helpers.label("id"), helpers.label("type"), helpers.label("triggeredActions"), helpers.label("description")],
      elements.map((element) => [
        renderRepeatedMarkerCell(element.id, Boolean(repeatedElementIds?.has(element.id))),
        helpers.renderDetailRefId(element.id),
        helpers.renderElementTypeSummary(element),
        helpers.renderElementActionReferences(element),
        helpers.renderElementDescription(element)
      ])
    ), emptyWhenRepeatedHidden);

  const renderFormControlElementsTable = (elements: ParsedElement[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean): string =>
    markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [helpers.label("marker"), helpers.label("id"), helpers.label("type"), helpers.label("inputRequired"), helpers.label("initialValueSource"), helpers.label("inputSpec"), helpers.label("visibleWhen"), helpers.label("enabledWhen"), helpers.label("readonly"), helpers.label("bind")],
      elements.map((element) => [
        renderRepeatedMarkerCell(element.id, Boolean(repeatedElementIds?.has(element.id))),
        helpers.renderDetailRefId(element.id),
        helpers.text(element.type),
        helpers.renderRequiredSpec(element),
        helpers.renderFormControlInitialValueSource(element),
        helpers.renderInputSpec(element),
        helpers.renderContentElementState(element),
        helpers.renderEnabledConditionList(element),
        element.properties["readonly"] === true || stringProperty(element.properties["readonly"]) ? helpers.text(helpers.label("requiredYes")) : "",
        helpers.renderFormControlBind(element)
      ])
    ), emptyWhenRepeatedHidden);

  const renderDisplayContentSpecTable = (rows: DisplayContentSpecRow[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean): string => {
    const spans = consecutiveRowspans(rows, (row, index) => repeatedElementIds?.has(row.element.id) ? `${row.element.id}\u0000${index}` : row.element.id);
    return markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTableWithCells(
      [helpers.label("marker"), helpers.label("id"), helpers.label("displayLocation"), helpers.label("displayValue"), helpers.label("displaySource"), helpers.label("format"), helpers.label("displayCondition"), helpers.label("enabledWhen")],
      rows.map((row, index) => [
        ...rowspanPrefixCells(spans[index] ?? 0, [
          renderRepeatedMarkerCell(row.element.id, Boolean(repeatedElementIds?.has(row.element.id))),
          helpers.renderDetailRefId(row.element.id)
        ]),
        helpers.text(row.location),
        helpers.renderDisplayContentValue(row.element, row.value),
        helpers.renderSourceSummary(row.source),
        row.format ? helpers.text(row.format) : "",
        helpers.renderContentElementState(row.element),
        helpers.renderEnabledConditionList(row.element)
      ])
    ), emptyWhenRepeatedHidden);
  };

  const renderLayoutsTable = (
    model: StateScreenReadModel,
    repeatedLayoutIds?: ReadonlySet<string>
  ): string => {
    const layouts = stateScreenLayoutsForModel(result, model);
    const unplacedLayoutIds = stateScreenUnplacedLayoutIdsForModel(result, model);
    const rows = layouts.map((layout) => [
      renderLayoutMarkerCell(layout.id, Boolean(repeatedLayoutIds?.has(layout.id)), unplacedLayoutIds.has(layout.id)),
      helpers.renderDetailRefId(layout.id),
      helpers.text(layout.kind || ""),
      renderLayoutPropertySummary(layout),
      renderLayoutItemSummary(layout)
    ]);

    if (rows.length === 0) {
      return "";
    }

    return markRepeatedHiddenEmptyHtml(
      helpers.renderLocalizedTable([helpers.label("marker"), helpers.label("id"), helpers.label("kind"), helpers.label("properties"), helpers.label("items")], rows),
      model.repeatedContent.layoutSpecEmptyWhenRepeatedHidden
    );
  };

  const renderActionsTable = (
    actions: ParsedAction[],
    state: string | undefined = undefined,
    stateNames: ReadonlySet<string> = new Set(),
    repeatedActionIds?: ReadonlySet<string>,
    emptyWhenRepeatedHidden = false
  ): string =>
    markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [helpers.label("marker"), helpers.label("name"), helpers.label("trigger"), helpers.label("kind"), helpers.label("overview")],
      actions.map((action) => renderActionRow(action, state, stateNames, Boolean(repeatedActionIds?.has(action.id))))
    ), emptyWhenRepeatedHidden);

  const renderActionRow = (
    action: ParsedAction,
    _state: string | undefined,
    _stateNames: ReadonlySet<string>,
    repeated = false
  ): string[] => [
    renderRepeatedMarkerCell(action.id, repeated),
    helpers.text(action.name),
    helpers.renderTrigger(action.triggeredBy),
    helpers.text(helpers.actionKind(action)),
    helpers.renderActionOverview(action)
  ];

  const renderLayoutPropertySummary = (layout: ParsedLayout): string => {
    const properties = [
      ["align", layout.properties["align"]],
      ["justify", layout.properties["justify"]],
      ["overlay", layout.properties["overlay"]],
      [helpers.conditionLabel("visible"), layoutPropertyList(layout, "visible when").join(", ")],
      [helpers.conditionLabel("hidden"), layoutPropertyList(layout, "hidden when").join(", ")],
      [helpers.conditionLabel("disabled"), layoutPropertyList(layout, "disabled when").join(", ")],
      [helpers.conditionLabel("selected"), layoutPropertyList(layout, "selected when").join(", ")],
      [helpers.conditionLabel("active"), layoutPropertyList(layout, "active when").join(", ")]
    ].filter(([, value]) => value);
    const notes = helpers.renderEntityNotes(layout.notes ?? []);
    const items = [
      ...properties.map(([key, value]) => `<li>${helpers.text(key)}: ${helpers.text(value)}</li>`),
      notes ? `<li>${helpers.label("notes")}: ${notes}</li>` : ""
    ].filter(Boolean);
    return items.length > 0
      ? `<ul class="spec-list">${items.join("")}</ul>`
      : "";
  };

  const renderLayoutItemSummary = (layout: ParsedLayout): string => {
    const items = layout.items.flatMap((item) => {
      if (item.type === "contains") {
        if (isPresentationPanelId(item.targetId)) {
          return [];
        }
        return [helpers.renderDetailRefId(item.targetId)];
      }
      if (item.type === "field") {
        return [`${helpers.text(item.label)}: ${helpers.renderDetailRefId(item.elementId)}`];
      }
      if (item.type === "slot") {
        return [`slot: ${helpers.text(item.name)}`];
      }
      return [];
    });
    return items.length > 0
      ? `<ul class="spec-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
      : "";
  };

  return {
    renderElementsTable,
    renderLayoutsTable,
    renderActionsTable,
    renderRepeatedMarkerCell
  };
}

function repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden: boolean): string {
  return emptyWhenRepeatedHidden ? ` data-mm-repeated-empty="true"` : "";
}

function markRepeatedHiddenEmptyHtml(html: string, emptyWhenRepeatedHidden: boolean): string {
  if (!emptyWhenRepeatedHidden) {
    return html;
  }
  if (html.includes(`data-mm-repeated-empty="true"`)) {
    return html;
  }
  return html
    .replace(`<div class="spec-table-wrap"`, `<div class="spec-table-wrap" data-mm-repeated-empty="true"`)
    .replace(`<p class="spec-empty"`, `<p class="spec-empty" data-mm-repeated-empty="true"`);
}

function layoutPropertyList(layout: ParsedLayout, key: string): string[] {
  return layout.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "");
}

function isPresentationPanelId(id: string): boolean {
  return /^P-[\p{L}\p{N}-]+$/u.test(id);
}
