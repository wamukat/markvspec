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
  renderEntityRef(id: string, linkAction?: boolean): string;
  renderLayoutRef(layout: ParsedLayout): string;
  renderEntityNotes(notes: string[]): string;
  renderElementTypeSummary(element: ParsedElement): string;
  renderElementActionReferences(element: ParsedElement): string;
  renderElementDescription(element: ParsedElement): string;
  renderRequiredSpec(element: ParsedElement): string;
  renderFormControlValue(element: ParsedElement, sampleValue: string | undefined): string;
  renderFormControlSource(element: ParsedElement): string;
  renderInputSpec(element: ParsedElement): string;
  renderElementConditionSummary(element: ParsedElement): string;
  renderContentElementState(element: ParsedElement): string;
  renderDisplayContentValue(element: ParsedElement, value: string, sections?: DisplayContentSpecRow["contentSections"], sampleRowsRef?: DisplayContentSpecRow["sampleRowsRef"]): string;
  renderSourceSummary(value: string | true | undefined): string;
  renderElementLabelSummary(properties: Record<string, string | true>): string;
  renderElementValueSummary(properties: Record<string, string | true>): string;
  renderConditionList(groups: Array<[string, string[]]>): string;
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
  const markerIdHeader = () => `${helpers.label("marker")}/${helpers.label("id")}`;
  const renderRepeatedLabel = () => `<span class="mm-chip mm-repeated-badge">${helpers.text(helpers.label("repeated"))}</span>`;
  const renderUnplacedLabel = () => `<span class="mm-chip mm-unplaced-badge" title="${helpers.text(helpers.label("notPlacedInCurrentLayout"))}"><span class="mm-unplaced-icon" aria-hidden="true"></span>${helpers.text(helpers.label("notPlacedInCurrentLayout"))}</span>`;
  const renderRepeatedMarkerCell = (id: string, repeated: boolean): string => {
    const marker = helpers.markerBadgeForId(id);
    return repeated ? `${marker} ${renderRepeatedLabel()}` : marker;
  };
  const renderRepeatedEntityRefCell = (id: string, repeated: boolean, linkAction = true): string => {
    const ref = helpers.renderEntityRef(id, linkAction);
    return repeated ? `${ref} ${renderRepeatedLabel()}` : ref;
  };
  const renderLayoutEntityRefCell = (layout: ParsedLayout, repeated: boolean, unplaced: boolean): string => {
    const ref = helpers.renderLayoutRef(layout);
    const withRepeated = repeated ? `${ref} ${renderRepeatedLabel()}` : ref;
    return unplaced ? `${withRepeated} ${renderUnplacedLabel()}` : withRepeated;
  };
  const renderDefaultAlways = (): string =>
    `<span class="spec-default-always">${helpers.text(helpers.label("always"))}</span>`;

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

    const { formControls, displayContentRows } = stateScreenElementGroups(elements, result, model?.stateName, model);
    const repeatedContent = model?.repeatedContent;

    return [
      `<h4>${helpers.label("elementSummary")}</h4>`,
      renderElementSummaryTable(elements, repeatedElementIds, repeatedContent?.elementSummaryEmptyWhenRepeatedHidden ?? false),
      formControls.length > 0 ? renderElementDetailGroup(helpers.label("inputFormSpec"), renderFormControlElementsTable(formControls, repeatedElementIds, repeatedContent?.inputFormSpecEmptyWhenRepeatedHidden ?? false, model), repeatedContent?.inputFormSpecEmptyWhenRepeatedHidden ?? false) : "",
      displayContentRows.length > 0 ? renderElementDetailGroup(helpers.label("displayContentSpec"), renderDisplayContentSpecTable(displayContentRows, repeatedElementIds, repeatedContent?.displayContentSpecEmptyWhenRepeatedHidden ?? false), repeatedContent?.displayContentSpecEmptyWhenRepeatedHidden ?? false) : ""
    ].filter(Boolean).join("");
  };

  const renderElementSummaryTable = (elements: ParsedElement[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean): string =>
    markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [markerIdHeader(), helpers.label("type"), helpers.label("triggeredActions"), helpers.label("description")],
      elements.map((element) => [
        renderRepeatedEntityRefCell(element.id, Boolean(repeatedElementIds?.has(element.id))),
        helpers.renderElementTypeSummary(element),
        helpers.renderElementActionReferences(element),
        helpers.renderElementDescription(element)
      ])
    ), emptyWhenRepeatedHidden);

  const renderFormControlElementsTable = (elements: ParsedElement[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean, model?: StateScreenReadModel): string =>
    markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [markerIdHeader(), helpers.label("type"), helpers.label("inputRequired"), helpers.label("initialValueSource"), helpers.label("displaySource"), helpers.label("inputSpec"), helpers.label("condition")],
      elements.map((element) => {
        const sampleValue = model?.scenarioSamples.find((sample) => sample.elementId === element.id && sample.value !== undefined)?.value
          ?? routeResolvedValue(stringProperty(element.properties["value"]), model);
        return [
          renderRepeatedEntityRefCell(element.id, Boolean(repeatedElementIds?.has(element.id))),
          helpers.text(element.type),
          helpers.renderRequiredSpec(element),
          helpers.renderFormControlValue(element, sampleValue),
          helpers.renderFormControlSource(element),
          helpers.renderInputSpec(element),
          helpers.renderElementConditionSummary(element)
        ];
      })
    ), emptyWhenRepeatedHidden);

  const renderDisplayContentSpecTable = (rows: DisplayContentSpecRow[], repeatedElementIds: ReadonlySet<string> | undefined, emptyWhenRepeatedHidden: boolean): string => {
    const spans = consecutiveRowspans(rows, (row, index) => repeatedElementIds?.has(row.element.id) ? `${row.element.id}\u0000${index}` : row.element.id);
    return markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTableWithCells(
      [markerIdHeader(), helpers.label("displayLocation"), helpers.label("displayValue"), helpers.label("format"), helpers.label("displaySource"), helpers.label("condition")],
      rows.map((row, index) => [
        ...rowspanPrefixCells(spans[index] ?? 0, [
          renderRepeatedEntityRefCell(row.element.id, Boolean(repeatedElementIds?.has(row.element.id)))
        ]),
        helpers.text(row.location),
        helpers.renderDisplayContentValue(row.element, row.value, row.contentSections, row.sampleRowsRef),
        row.format ? helpers.text(row.format) : "",
        helpers.renderSourceSummary(row.source),
        helpers.renderElementConditionSummary(row.element)
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
      renderLayoutEntityRefCell(layout, Boolean(repeatedLayoutIds?.has(layout.id)), unplacedLayoutIds.has(layout.id)),
      helpers.text(layout.kind || ""),
      renderLayoutSettingItemsSummary(layout),
      renderLayoutConditionsSummary(layout),
      renderLayoutNotesSummary(layout)
    ]);

    if (rows.length === 0) {
      return "";
    }

    return markRepeatedHiddenEmptyHtml(
      helpers.renderLocalizedTable([markerIdHeader(), helpers.label("kind"), helpers.label("settingItems"), helpers.label("condition"), helpers.label("notes")], rows),
      model.repeatedContent.layoutSpecEmptyWhenRepeatedHidden
    );
  };

  const renderActionsTable = (
    actions: ParsedAction[],
    state: string | undefined = undefined,
    stateNames: ReadonlySet<string> = new Set(),
    repeatedActionIds?: ReadonlySet<string>,
    emptyWhenRepeatedHidden = false
  ): string => {
    const rows = actions.map((action) => {
      const overview = helpers.renderActionOverview(action);
      return {
        action,
        overview,
        repeated: Boolean(repeatedActionIds?.has(action.id))
      };
    });
    const showOverview = rows.some((row) => row.overview.trim().length > 0);

    return markRepeatedHiddenEmptyHtml(helpers.renderLocalizedTable(
      [
        helpers.label("action"),
        helpers.label("trigger"),
        ...(showOverview ? [helpers.label("overview")] : [])
      ],
      rows.map((row) => renderActionRow(row.action, state, stateNames, row.repeated, showOverview, row.overview))
    ), emptyWhenRepeatedHidden);
  };

  const renderActionRow = (
    action: ParsedAction,
    _state: string | undefined,
    _stateNames: ReadonlySet<string>,
    repeated = false,
    showOverview = false,
    overview = ""
  ): string[] => [
    renderRepeatedEntityRefCell(action.id, repeated),
    helpers.renderTrigger(action.triggeredBy),
    ...(showOverview ? [overview] : [])
  ];

  const renderLayoutSettingItemsSummary = (layout: ParsedLayout): string =>
    renderSpecSections([
      [helpers.label("setting"), layoutSettingSummaryItems(layout)],
      [helpers.label("items"), layoutItemSummaryItems(layout)]
    ]);

  const layoutSettingSummaryItems = (layout: ParsedLayout): string[] =>
    [
      ["align", layout.properties["align"]],
      ["justify", layout.properties["justify"]],
      ["overlay", layout.properties["overlay"]],
      ["gap", layout.properties["gap"]]
    ]
      .filter(([, value]) => value)
      .map(([key, value]) => `${helpers.text(key)}: ${helpers.text(value)}`);

  const renderLayoutConditionsSummary = (layout: ParsedLayout): string => {
    const conditions = [
      [helpers.conditionLabel("visible"), layoutPropertyList(layout, "visible when").join(", ")],
      [helpers.conditionLabel("hidden"), layoutPropertyList(layout, "hidden when").join(", ")],
      [helpers.conditionLabel("disabled"), layoutPropertyList(layout, "disabled when").join(", ")],
      [helpers.conditionLabel("enabled"), layoutPropertyList(layout, "enabled when").join(", ")],
      [helpers.conditionLabel("selected"), layoutPropertyList(layout, "selected when").join(", ")],
      [helpers.conditionLabel("active"), layoutPropertyList(layout, "active when").join(", ")]
    ].filter(([, value]) => value);
    return conditions.length > 0
      ? renderSpecList(conditions.map(([key, value]) => `${helpers.text(key)}: ${helpers.text(value)}`))
      : renderDefaultAlways();
  };

  const layoutItemSummaryItems = (layout: ParsedLayout): string[] =>
    layout.items.flatMap((item) => {
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

  const renderLayoutNotesSummary = (layout: ParsedLayout): string => {
    return helpers.renderEntityNotes(layout.notes ?? []);
  };

  return {
    renderElementsTable,
    renderLayoutsTable,
    renderActionsTable,
    renderRepeatedMarkerCell
  };
}

function routeResolvedValue(value: string, model: StateScreenReadModel | undefined): string | undefined {
  if (!value || !model) {
    return undefined;
  }
  const match = /^\$\{\s*route\.([A-Za-z][A-Za-z0-9_-]*)\s*\}$/u.exec(value);
  if (!match) {
    return undefined;
  }
  return model.scenarioRoute.find((sample) => sample.key === match[1])?.value;
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

function renderSpecList(items: string[]): string {
  return items.length > 0
    ? `<ul class="spec-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
}

function renderSpecSections(sections: Array<[string, string[]]>): string {
  return sections
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => `<div class="spec-section"><strong>${title}</strong>${renderSpecList(items)}</div>`)
    .join("");
}

function layoutPropertyList(layout: ParsedLayout, key: string): string[] {
  return layout.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "");
}

function isPresentationPanelId(id: string): boolean {
  return /^P-[\p{L}\p{N}-]+$/u.test(id);
}
