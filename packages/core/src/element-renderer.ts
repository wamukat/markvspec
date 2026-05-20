import { opaqueExpressionBody } from "./ids.js";
import { tableColumnSampleKeys } from "./table-columns.js";
import { sourceTypeForElement } from "./source-types.js";
import { propertyString } from "./property-accessor.js";
import {
  anchoredOverlayReference,
  displayLabelForElement,
  elementSizePreset,
  elementWidthPreset
} from "./element-domain.js";
import type { MarkVSpecElement, MarkVSpecParseResult, MarkVSpecRenderOptions } from "./types.js";

export interface ElementActionMarkerReference {
  id: string;
  marker: string;
}

export interface ElementRenderContext {
  sampleOverrides: Record<string, MarkVSpecParseResult["previewScenarios"][number]["samples"][number]>;
  routeValues: Record<string, string>;
  elementById?: Map<string, MarkVSpecElement>;
  actionMarkersByElementId?: Map<string, ElementActionMarkerReference[]>;
  suppressMarkers?: boolean;
  result?: MarkVSpecParseResult;
  layoutById?: unknown;
  slotContentsByName?: unknown;
  normallyContainedLayoutIds?: ReadonlySet<string>;
  controlledPanelLayoutIds?: ReadonlySet<string>;
  slotName?: string;
  slotRenderViewport?: string;
  slotViewport?: string;
  renderControlledPanelLayout?: (
    panelId: string,
    activeState: string | undefined,
    stateNames: Set<string>,
    options: MarkVSpecRenderOptions,
    parentDisabled: boolean,
    context: ElementRenderContext,
    kind: "tabs" | "accordion" | "disclosure"
  ) => string;
}

function emptyRenderContext(): ElementRenderContext {
  return { sampleOverrides: {}, routeValues: {} };
}

export function renderElement(
  element: MarkVSpecElement,
  actionMarkersByElementId: Map<string, ElementActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  forceDisabled = false,
  context: ElementRenderContext = emptyRenderContext()
): string {
  if (!options.includeConditionalContent && !isElementVisible(element, activeState, stateNames, options)) {
    return "";
  }

  const classes = [
    "mm-element",
    cssClass("mm-element", element.type.toLowerCase()),
    typeof element.properties["variant"] === "string" ? cssClass("mm-variant", element.properties["variant"]) : "",
    typeof element.properties["tone"] === "string" ? cssClass("mm-tone", element.properties["tone"]) : "",
    elementWidthPreset(element) ? cssClass("mm-width", elementWidthPreset(element) ?? "") : "",
    elementSizePreset(element) ? cssClass("mm-size", elementSizePreset(element) ?? "") : ""
  ].filter(Boolean).join(" ");

  const sourceValue = sourceTypeForElement(element) === "element" ? elementValueFromElementSource(element, context, new Set()) : undefined;
  const formattedSourceValue = sourceValue === undefined ? "" : formatModelValue(sourceValue, stringProperty(element, "format"));
  const sampleOverride = context.sampleOverrides[element.id];
  const sourceDataSample = sourceTypeForElement(element) === "data" ? routeResolvedStringProperty(element, "sample", context) : "";
  const sample = sampleOverride?.value ?? (formattedSourceValue || sourceDataSample);
  const value = routeResolvedStringProperty(element, "value", context);
  const label = routeResolvedStringProperty(element, "label", context);
  const textValue = routeResolvedStringProperty(element, "text", context);
  const staticLabel = label || textValue || sample || value;
  const displayValue = sample || textValue || value || label;
  const displayLabel = displayLabelForElement(
    element,
    undefined,
    (candidate, property) => property === "title" ? undefined : routeResolvedStringProperty(candidate, property, context)
  ) || sample;
  const disabled = forceDisabled || isElementDisabled(element, activeState, stateNames, options);
  const disabledAttribute = disabled ? " disabled" : "";
  const ariaDisabled = disabled ? ` aria-disabled="true"` : "";
  const marker = context.suppressMarkers || element.documentRole === "template" ? "" : renderMarker(element.id, stringProperty(element, "marker"), "element", options);
  const actionMarkers = context.suppressMarkers
    ? ""
    : (actionMarkersByElementId.get(element.id) ?? [])
      .map((actionMarker) => renderMarker(actionMarker.id, actionMarker.marker, "action", options))
      .join("");
  const markers = `${marker}${actionMarkers}`;

  if (element.type === "Heading") {
    const level = normalizeHeadingLevel(stringProperty(element, "level"));
    return renderAnnotatedElement(markers, element.type, `<h${level} class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(staticLabel)}</h${level}>`);
  }

  if (element.type === "Paragraph") {
    return renderAnnotatedElement(markers, element.type, `<p class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</p>`);
  }

  if (element.type === "Text") {
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</span>`);
  }

  if (element.type === "Input") {
    const type = stringProperty(element, "type") || "text";
    const placeholder = routeResolvedStringProperty(element, "placeholder", context);
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    return renderAnnotatedElement(markers, element.type, `<input class="${classes}" data-mm-id="${escapeHtml(element.id)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(inputValue)}"${disabledAttribute}>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Textarea") {
    const placeholder = routeResolvedStringProperty(element, "placeholder", context);
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    const rows = normalizePositiveInteger(stringProperty(element, "rows"), 3);
    return renderAnnotatedElement(markers, element.type, `<textarea class="${classes}" data-mm-id="${escapeHtml(element.id)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"${disabledAttribute}>${escapeHtml(inputValue)}</textarea>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "DatePicker" || element.type === "DateInput" || element.type === "TimeInput" || element.type === "NumberInput") {
    const placeholder = routeResolvedStringProperty(element, "placeholder", context);
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    const min = stringProperty(element, "min");
    const max = stringProperty(element, "max");
    const step = stringProperty(element, "step");
    const type = element.type === "TimeInput" ? "time" : element.type === "NumberInput" ? "number" : "date";
    const minAttribute = min ? ` min="${escapeHtml(min)}"` : "";
    const maxAttribute = max ? ` max="${escapeHtml(max)}"` : "";
    const stepAttribute = step ? ` step="${escapeHtml(step)}"` : "";
    return renderAnnotatedElement(markers, element.type, `<input class="${classes}" data-mm-id="${escapeHtml(element.id)}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(inputValue)}"${minAttribute}${maxAttribute}${stepAttribute}${disabledAttribute}>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "FileUpload" || element.type === "FileInput") {
    const accept = stringProperty(element, "accept");
    const acceptAttribute = accept ? ` accept="${escapeHtml(accept)}"` : "";
    const multipleAttribute = element.properties["multiple"] === true ? " multiple" : "";
    const helperText = routeResolvedStringProperty(element, "hint", context) || sample;
    const helper = helperText ? `<span class="mm-file-upload-helper">${escapeHtml(helperText)}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="file"${acceptAttribute}${multipleAttribute}${disabledAttribute}>${escapeHtml(displayLabel || "Select file")}${helper}</label>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Select") {
    const selectedValue = stringProperty(element, "initial value") || inputLiteralValue(value);
    const options = element.selectOptions.map((option) => ({ value: option.label, label: option.label }));
    const optionHtml = options.length > 0
      ? options.map((option) => renderSelectOption(option, selectedValue)).join("")
      : renderSelectOption({ value: selectedValue, label: selectedValue || "Select" }, selectedValue);
    return renderAnnotatedElement(markers, element.type, `<select class="${classes}" data-mm-id="${escapeHtml(element.id)}"${disabledAttribute}>${optionHtml}</select>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "MultiSelect") {
    const selectedValues = selectedValueSet(stringProperty(element, "initial value") || inputLiteralValue(value));
    const options = element.selectOptions.map((option) => ({ value: option.label, label: option.label }));
    const optionHtml = options.length > 0
      ? options.map((option) => renderMultiSelectOption(option, selectedValues)).join("")
      : renderMultiSelectOption({ value: displayLabel || "Option", label: displayLabel || "Option" }, selectedValues);
    return renderAnnotatedElement(markers, element.type, `<select class="${classes}" data-mm-id="${escapeHtml(element.id)}" multiple size="${Math.min(Math.max(options.length, 2), 5)}"${disabledAttribute}>${optionHtml}</select>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Checkbox") {
    const checked = element.properties["checked"] === true || isTruthyInitialValue(stringProperty(element, "initial value")) ? " checked" : "";
    const inputValue = value ? ` value="${escapeHtml(value)}"` : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="checkbox"${inputValue}${checked}${disabledAttribute}>${escapeHtml(displayLabel || element.id)}</label>`);
  }

  if (element.type === "Switch") {
    const checked = element.properties["checked"] === true || isTruthyInitialValue(stringProperty(element, "initial value")) ? " checked" : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="checkbox" role="switch"${checked}${disabledAttribute}><span class="mm-switch-track"><span class="mm-switch-thumb"></span></span>${escapeHtml(displayLabel || element.id)}</label>`);
  }

  if (element.type === "RadioGroup" || element.type === "CheckboxGroup") {
    const selectedValue = stringProperty(element, "initial value") || inputLiteralValue(value);
    const selectedValues = selectedValueSet(selectedValue);
    const name = stringProperty(element, "name") || element.id;
    const options = element.selectOptions.length > 0 ? element.selectOptions.map((option) => option.label) : [selectedValue || displayLabel || "Option"];
    const inputType = element.type === "CheckboxGroup" ? "checkbox" : "radio";
    const optionHtml = options
      .map((option) => {
        const checked = element.type === "CheckboxGroup"
          ? selectedValues.has(option) ? " checked" : ""
          : option === selectedValue ? " checked" : "";
        return `<label class="mm-choice-group-option"><input type="${inputType}" name="${escapeHtml(name)}"${checked}${disabledAttribute}>${escapeHtml(option)}</label>`;
      })
      .join("");
    const legend = displayLabel ? `<legend>${escapeHtml(displayLabel)}</legend>` : "";
    return renderAnnotatedElement(markers, element.type, `<fieldset class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}>${legend}${optionHtml}</fieldset>`);
  }

  if (element.type === "Tabs") {
    const active = stringProperty(element, "active");
    const items = element.tabs.length > 0 ? element.tabs : [{ label: active || displayLabel || "Tab", activeWhen: [], openWhen: [], propertyLocations: { panel: [], action: [], "active when": [], "open when": [] }, location: element.location, raw: active || displayLabel || "Tab" }];
    const activeItem = resolveActiveTabItem(items, active, activeState, stateNames, options);
    const activeLabel = activeItem?.label || "";
    const tabs = items
      .map((item) => {
        const selected = item.label === activeLabel;
        const classes = ["mm-tab-item", selected ? "mm-tab-item-active" : ""].filter(Boolean).join(" ");
        const panel = item.panel ? ` data-mm-tab-panel="${escapeHtml(item.panel)}"` : "";
        const action = item.action ? ` data-mm-tab-action="${escapeHtml(item.action)}"` : "";
        return `<span class="${classes}"${selected ? " aria-selected=\"true\"" : ""}${panel}${action}>${escapeHtml(item.label)}</span>`;
      })
      .join("");
    const panel = activeItem?.panel;
    const panelBody = panel ? context.renderControlledPanelLayout?.(panel, activeState, stateNames, options, disabled, context, "tabs") ?? "" : "";
    const panelNote = panel && !panelBody ? `<div class="mm-tabs-panel-note">panel: ${escapeHtml(panel)}</div>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}"><div class="mm-tab-strip">${tabs}</div>${panelBody || panelNote}</div>`);
  }

  if (element.type === "Accordion") {
    const open = stringProperty(element, "open");
    const items = element.accordionItems.length > 0 ? element.accordionItems : [{ label: open || displayLabel || "Section", activeWhen: [], openWhen: [], propertyLocations: { panel: [], action: [], "active when": [], "open when": [] }, location: element.location, raw: open || displayLabel || "Section" }];
    const openItem = resolveOpenAccordionItem(items, open, activeState, stateNames, options);
    const openLabel = openItem?.label || "";
    const itemHtml = items.map((item) => {
      const expanded = item.label === openLabel;
      const panel = item.panel ? ` data-mm-accordion-panel="${escapeHtml(item.panel)}"` : "";
      const action = item.action ? ` data-mm-accordion-action="${escapeHtml(item.action)}"` : "";
      const panelBody = expanded && item.panel ? context.renderControlledPanelLayout?.(item.panel, activeState, stateNames, options, disabled, context, "accordion") ?? "" : "";
      const panelNote = expanded && item.panel && !panelBody ? `<div class="mm-accordion-panel-note">panel: ${escapeHtml(item.panel)}</div>` : "";
      return `<div class="mm-accordion-item${expanded ? " mm-accordion-item-open" : ""}"${panel}${action}><div class="mm-accordion-header">${expanded ? "v" : ">"} ${escapeHtml(item.label)}</div>${panelBody || panelNote}</div>`;
    }).join("");
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}">${itemHtml}</div>`);
  }

  if (element.type === "Disclosure") {
    const open = isDisclosureOpen(element, activeState, stateNames, options);
    const panel = stringProperty(element, "panel");
    const panelAttr = panel ? ` data-mm-disclosure-panel="${escapeHtml(panel)}"` : "";
    const panelBody = open && panel ? context.renderControlledPanelLayout?.(panel, activeState, stateNames, options, disabled, context, "disclosure") ?? "" : "";
    const panelNote = open && panel && !panelBody ? `<div class="mm-accordion-panel-note">panel: ${escapeHtml(panel)}</div>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes} ${open ? "mm-disclosure-open" : "mm-disclosure-closed"}" data-mm-id="${escapeHtml(element.id)}"${panelAttr}><div class="mm-accordion-header">${open ? "v" : ">"} ${escapeHtml(displayLabel || element.id)}</div>${panelBody || panelNote}</div>`);
  }

  if (element.type === "ActionMenu") {
    const open = isActionMenuOpen(element, activeState, stateNames, options);
    const placement = stringProperty(element, "placement");
    const placementAttr = placement ? ` data-mm-placement="${escapeHtml(placement)}"` : "";
    const items = open
      ? `<div class="mm-action-menu-panel">${element.actionMenuItems.map((item) => {
        const action = item.action ? ` data-mm-action-menu-action="${escapeHtml(item.action)}"` : "";
        const disabled = item.disabledWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options)) ? " mm-action-menu-item-disabled" : "";
        const tone = item.tone ? ` mm-action-menu-item-${sanitizeClassToken(item.tone)}` : "";
        const meta = [
          item.action ? `action: ${escapeHtml(item.action)}` : "",
          item.disabledWhen.length > 0 ? `disabled when: ${escapeHtml(item.disabledWhen.join(", "))}` : ""
        ].filter(Boolean).join(" / ");
        return `<div class="mm-action-menu-item${disabled}${tone}"${action}><span>${escapeHtml(item.label)}</span>${meta ? `<span class="mm-action-menu-meta">${meta}</span>` : ""}</div>`;
      }).join("")}</div>`
      : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes} ${open ? "mm-action-menu-open" : "mm-action-menu-closed"}" data-mm-id="${escapeHtml(element.id)}"${placementAttr}><button class="mm-action-menu-trigger" type="button">${escapeHtml(displayLabel || element.id)} ...</button>${items}</div>`);
  }

  if (element.type === "Button") {
    return renderAnnotatedElement(markers, element.type, `<button class="${classes}" data-mm-id="${escapeHtml(element.id)}"${disabledAttribute}>${escapeHtml(displayLabel || element.id)}</button>`);
  }

  if (element.type === "Link") {
    const href = routeResolvedStringProperty(element, "href", context) || "#";
    return renderAnnotatedElement(markers, element.type, `<a class="${classes}" data-mm-id="${escapeHtml(element.id)}" href="${escapeHtml(href)}"${ariaDisabled}>${escapeHtml(displayLabel || href)}</a>`);
  }

  if (element.type === "Banner") {
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status">${escapeHtml(displayValue)}</div>`);
  }

  if (element.type === "Toast") {
    const message = routeResolvedStringProperty(element, "message", context) || displayValue || element.id;
    const placement = stringProperty(element, "placement") || "top-right";
    const duration = stringProperty(element, "duration") || "medium";
    const actionLabel = stringProperty(element, "action") ? `<span class="mm-toast-action">${escapeHtml(label || "Action")}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status" data-mm-toast-placement="${escapeHtml(placement)}" data-mm-toast-duration="${escapeHtml(duration)}"><span class="mm-toast-message">${escapeHtml(message)}</span>${actionLabel}</div>`);
  }

  if (element.type === "Popover" || element.type === "Tooltip") {
    const overlayText = textValue || routeResolvedStringProperty(element, "content", context) || displayValue || element.id;
    const overlay = anchoredOverlayReference(element);
    const anchor = overlay?.anchorId ?? "";
    const placement = overlay?.placement || "auto";
    const meta = [anchor ? `anchor: ${anchor}` : "", placement ? `placement: ${placement}` : ""].filter(Boolean).join(" / ");
    const body = element.type === "Tooltip"
      ? `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" data-mm-anchor="${escapeHtml(anchor)}" data-mm-placement="${escapeHtml(placement)}"><span class="mm-overlay-meta">${escapeHtml(meta)}</span><span class="mm-tooltip-bubble">${escapeHtml(overlayText)}</span></div>`
      : `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" data-mm-anchor="${escapeHtml(anchor)}" data-mm-placement="${escapeHtml(placement)}"><div class="mm-overlay-meta">${escapeHtml(meta)}</div><div class="mm-popover-panel">${escapeHtml(overlayText)}</div></div>`;
    return renderAnnotatedElement(markers, element.type, body);
  }

  if (element.type === "Badge") {
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</span>`);
  }

  if (element.type === "List") {
    const items = listItemsForElement(element, context);
    const itemHtml = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return renderAnnotatedElement(markers, element.type, `<ul class="${classes}" data-mm-id="${escapeHtml(element.id)}">${itemHtml}</ul>`);
  }

  if (element.type === "Table") {
    const columns = element.tableColumns;
    const rowSet = tableRowsForElement(element, columns, context);
    const rows = rowSet.rows;
    const columnWidth = columns.length > 0 ? `${100 / columns.length}%` : "";
    const colgroupHtml = columns.length > 0
      ? `<colgroup>${columns.map(() => `<col style="width:${columnWidth}">`).join("")}</colgroup>`
      : "";
    const headerHtml = columns.length > 0
      ? `<thead><tr>${columns.map((column) => `<th>${renderTableColumnHeader(column)}</th>`).join("")}</tr></thead>`
      : "";
    const bodyHtml = rows.length > 0
      ? rows.map((row) => `<tr>${renderTableCells(columns, row.cells)}</tr>`).join("")
      : rowSet.explicitEmpty
        ? `<tr><td class="mm-table-empty" colspan="${Math.max(columns.length, 1)}">(no data)</td></tr>`
        : "";
    return renderAnnotatedElement(
      markers,
      element.type,
      `<table class="${classes}" data-mm-id="${escapeHtml(element.id)}"><caption>${escapeHtml(displayLabel || element.id)}</caption>${colgroupHtml}${headerHtml}<tbody>${bodyHtml}</tbody></table>`,
      "display:block;max-width:100%;min-width:0;width:100%"
    );
  }

  if (element.type === "Dialog") {
    const title = routeResolvedStringProperty(element, "title", context) || displayLabel || element.id;
    const content = routeResolvedStringProperty(element, "message", context) || routeResolvedStringProperty(element, "content", context) || displayValue;
    const actions = renderDialogActionButtons(element, actionMarkersByElementId, activeState, stateNames, options, context);
    const actionHtml = actions ? `<div class="mm-dialog-actions">${actions}</div>` : "";
    return renderAnnotatedElement(markers, element.type, `<section class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="mm-dialog-title">${escapeHtml(title)}</div><div class="mm-dialog-body">${escapeHtml(content)}</div>${actionHtml}</section>`);
  }

  if (element.type === "Image") {
    const src = routeResolvedStringProperty(element, "src", context);
    const alt = routeResolvedStringProperty(element, "alt", context) || displayLabel || element.id;
    return renderAnnotatedElement(markers, element.type, `<figure class="${classes}" data-mm-id="${escapeHtml(element.id)}"><div class="mm-image-placeholder">${escapeHtml(alt)}</div>${src ? `<figcaption>${escapeHtml(src)}</figcaption>` : ""}</figure>`);
  }

  if (element.type === "Icon") {
    const name = routeResolvedStringProperty(element, "name", context) || displayValue || element.id;
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}" aria-label="${escapeHtml(displayLabel || name)}"><span class="mm-icon-symbol">${escapeHtml(name)}</span></span>`);
  }

  if (element.type === "Spinner") {
    const spinnerLabel = displayLabel || "Loading";
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status" aria-label="${escapeHtml(spinnerLabel)}"><span class="mm-spinner-symbol" aria-hidden="true"></span><span class="mm-spinner-label">${escapeHtml(spinnerLabel)}</span></span>`);
  }

  if (element.type === "Divider") {
    const dividerLabel = displayLabel || sample;
    const labelHtml = dividerLabel ? `<span class="mm-divider-label">${escapeHtml(dividerLabel)}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="separator">${labelHtml}</div>`);
  }

  return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayLabel || element.type)}</div>`);
}

function elementWidthWrapperStyle(element: MarkVSpecElement): string | undefined {
  const width = elementWidthPreset(element);
  if (!width) {
    return undefined;
  }
  const widthValue = width === "short" ? "120px" : width === "medium" ? "220px" : width === "long" ? "360px" : "100%";
  return `width:min(${widthValue},100%)`;
}


function renderDialogActionButtons(
  element: MarkVSpecElement,
  actionMarkersByElementId: Map<string, ElementActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  context: ElementRenderContext
): string {
  const buttonIds = parseDelimitedList(stringProperty(element, "actions"), ",");
  if (buttonIds.length === 0 || !context.elementById) {
    return "";
  }

  return buttonIds
    .map((buttonId) => context.elementById?.get(buttonId))
    .filter((button): button is MarkVSpecElement => button?.type === "Button")
    .map((button) => renderElement(
      button,
      context.actionMarkersByElementId ?? actionMarkersByElementId,
      activeState,
      stateNames,
      options,
      false,
      {
        ...context,
        suppressMarkers: context.suppressMarkers
      }
    ))
    .join("");
}

function isElementVisible(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (element.visibleWhen.length > 0 && !element.visibleWhen.some((condition) => isShownForCondition(condition, activeState, stateNames, options))) {
    return false;
  }

  if (element.hiddenWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options))) {
    return false;
  }

  return true;
}

function isElementDisabled(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  return element.disabledWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options));
}

function resolveActiveTabItem(
  items: MarkVSpecElement["tabs"],
  active: string,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions
): MarkVSpecElement["tabs"][number] | undefined {
  return items.find((item) => item.activeWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options)))
    ?? items.find((item) => item.label === active)
    ?? items[0];
}

function resolveOpenAccordionItem(
  items: MarkVSpecElement["accordionItems"],
  open: string,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions
): MarkVSpecElement["accordionItems"][number] | undefined {
  return items.find((item) => item.openWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options)))
    ?? items.find((item) => item.label === open);
}

function isDisclosureOpen(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  return element.openWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options))
    || isTruthyInitialValue(stringProperty(element, "open"));
}

function isActionMenuOpen(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  return element.openWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options))
    || isTruthyInitialValue(stringProperty(element, "open"));
}



function isShownForCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (!condition) {
    return true;
  }

  if (isNamespacedCondition(condition)) {
    return isActiveNamespacedCondition(condition, activeState, options);
  }

  if (!isStateScopedCondition(condition, stateNames)) {
    return true;
  }

  return isActiveStateCondition(condition, activeState, stateNames);
}

function isActiveCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (!condition) {
    return false;
  }

  if (isNamespacedCondition(condition)) {
    return isActiveNamespacedCondition(condition, activeState, options);
  }

  return isActiveStateCondition(condition, activeState, stateNames);
}

function isActiveStateCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>): boolean {
  if (!condition) {
    return false;
  }

  const normalized = condition.trim();
  if (!activeState) {
    return false;
  }

  return normalized === activeState || normalized === `state is ${activeState}`;
}

function isStateScopedCondition(condition: string, stateNames: Set<string>): boolean {
  const normalized = condition.trim();
  return normalized.startsWith("state is ") || stateNames.has(normalized);
}

function isPreviewEvaluableCondition(condition: string, stateNames: Set<string>): boolean {
  return isNamespacedCondition(condition) || isStateScopedCondition(condition, stateNames);
}

function isNamespacedCondition(condition: string): boolean {
  return /^(not\s+)?\$\{(?:model|view|state|route)\.[^}]+\}(?:\s*=\s*[^=].*)?$/u.test(condition.trim());
}

function isActiveNamespacedCondition(condition: string, activeState: string | undefined, options: MarkVSpecRenderOptions): boolean {
  const normalized = condition.trim();
  const negated = normalized.startsWith("not ");
  const expression = negated ? normalized.slice(4).trim() : normalized;
  const equality = /^(\$\{(?:model|view|state|route)\.[^}]+\})\s*=\s*(.+)$/u.exec(expression);
  const key = equality?.[1] ?? expression;
  const expected = equality?.[2]?.trim();
  const body = opaqueExpressionBody(key) ?? key;
  let value: boolean | number | string | undefined;
  if (body.startsWith("model.")) {
    value = options.modelValues?.[key] ?? options.modelValues?.[body];
  } else if (body.startsWith("view.")) {
    const viewKey = body.slice("view.".length);
    value = options.viewValues?.[key] ?? options.viewValues?.[body] ?? options.viewValues?.[viewKey];
  } else if (body.startsWith("state.")) {
    const stateName = body.slice("state.".length);
    value = activeState === stateName;
  } else if (body.startsWith("route.")) {
    const routeKey = body.slice("route.".length);
    value = options.routeValues?.[key] ?? options.routeValues?.[body] ?? options.routeValues?.[routeKey];
  }
  const active = expected === undefined
    ? (value === undefined ? false : Boolean(value))
    : String(value) === expected;
  return negated ? !active : active;
}


function stringProperty(element: MarkVSpecElement, key: string): string {
  return propertyString(element, key) ?? "";
}

function routeResolvedStringProperty(element: MarkVSpecElement, key: string, context: ElementRenderContext): string {
  return resolveRouteExpressionValue(stringProperty(element, key), context.routeValues);
}

function resolveRouteExpressionValue(value: string, routeValues: Record<string, string>): string {
  const match = /^\$\{\s*route\.([A-Za-z][A-Za-z0-9_-]*)\s*\}$/u.exec(value);
  if (!match) {
    return value;
  }
  return routeValues[match[1]] ?? value;
}

function elementValueFromElementSource(
  element: MarkVSpecElement,
  context: ElementRenderContext,
  visited: Set<string>
): string | undefined {
  if (visited.has(element.id)) {
    return undefined;
  }
  visited.add(element.id);

  const targetId = elementValueReferenceId(stringProperty(element, "value"));
  const target = targetId ? context.elementById?.get(targetId) : undefined;
  if (!target) {
    return undefined;
  }

  if (sourceTypeForElement(target) === "element") {
    const nested = elementValueFromElementSource(target, context, visited);
    if (nested !== undefined) {
      return nested;
    }
  }

  return stringProperty(target, "initial value")
    ?? stringProperty(target, "sample")
    ?? inputLiteralValue(stringProperty(target, "value"))
    ?? undefined;
}

function elementValueReferenceId(value: string): string | undefined {
  const match = /^(E-[\p{L}\p{N}-]+)\.value$/u.exec(value);
  return match?.[1];
}

function formatModelValue(value: string, format: string): string {
  if (format.trim() === "date yyyy/MM/dd") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }
  }
  const mapping = parseFormatMapping(format);
  return mapping.get(value) ?? value;
}

function parseFormatMapping(format: string): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const part of format.split(",")) {
    const [from, to] = part.split("->").map((value) => value?.trim());
    if (from && to) {
      mapping.set(from, to);
    }
  }
  return mapping;
}

function inputLiteralValue(value: string): string {
  return /^model\.[^\s]+$/.test(value) ? "" : value;
}

function isTruthyInitialValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && normalized !== "false" && normalized !== "0" && normalized !== "no" && normalized !== "off");
}

function parseDelimitedList(value: string, delimiter: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function renderSelectOption(option: { value: string; label: string }, selectedValue: string): string {
  const selected = option.value === selectedValue ? " selected" : "";
  return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
}

function renderMultiSelectOption(option: { value: string; label: string }, selectedValues: Set<string>): string {
  const selected = selectedValues.has(option.value) ? " selected" : "";
  return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
}

function selectedValueSet(value: string): Set<string> {
  return new Set(parseDelimitedList(value, ","));
}

function normalizePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function renderTableCells(
  columns: MarkVSpecElement["tableColumns"],
  cells: MarkVSpecElement["tableRows"][number]["cells"]
): string {
  if (columns.length === 0) {
    return cells.map((cell) => `<td>${escapeHtml(cell.value)}</td>`).join("");
  }

  return columns
    .map((column) => {
      const columnKeys = tableColumnSampleKeys(column);
      const cell = cells.find((candidate) => candidate.column === column.label || columnKeys.includes(candidate.column));
      return `<td>${escapeHtml(cell?.value ?? "")}</td>`;
    })
    .join("");
}

function listItemsForElement(element: MarkVSpecElement, context: ElementRenderContext): string[] {
  const overrideRows = context.sampleOverrides[element.id]?.rows;
  const sourceDataRows = sourceTypeForElement(element) === "data" ? element.sampleRows : undefined;
  const rows = overrideRows ?? sourceDataRows;
  if (rows) {
    if (rows.explicitEmpty && rows.rows.length === 0) {
      return ["(no data)"];
    }
    return rows.rows.map((row) => Object.values(row.fields).filter(Boolean).join(" / ")).filter(Boolean);
  }
  return parseDelimitedList(stringProperty(element, "items"), ",");
}

function renderTableColumnHeader(column: MarkVSpecElement["tableColumns"][number]): string {
  const sortLabel = column.sort === "asc" ? " &#8593;" : column.sort === "desc" ? " &#8595;" : column.sortable ? " &#8597;" : "";
  return `${escapeHtml(column.label)}${sortLabel}`;
}

interface RenderedTableRows {
  rows: MarkVSpecElement["tableRows"];
  explicitEmpty: boolean;
}

function tableRowsForElement(
  element: MarkVSpecElement,
  columns: MarkVSpecElement["tableColumns"],
  context: ElementRenderContext
): RenderedTableRows {
  const overrideRows = context.sampleOverrides[element.id]?.rows;
  if (overrideRows) {
    return {
      rows: sampleRowsToTableRows(overrideRows.rows, columns),
      explicitEmpty: overrideRows.explicitEmpty
    };
  }

  if (sourceTypeForElement(element) === "data" && element.sampleRows) {
    return {
      rows: sampleRowsToTableRows(element.sampleRows.rows, columns),
      explicitEmpty: element.sampleRows.explicitEmpty
    };
  }

  return { rows: element.tableRows, explicitEmpty: false };
}

function sampleRowsToTableRows(
  rows: NonNullable<MarkVSpecElement["sampleRows"]>["rows"],
  columns: MarkVSpecElement["tableColumns"]
): MarkVSpecElement["tableRows"] {
  return rows.map((row) => ({
    location: row.location,
    raw: row.raw,
    cells: columns.length > 0
      ? columns.map((column) => {
          const key = tableColumnSampleKeys(column).find((candidate) => row.fields[candidate] !== undefined) ?? column.label;
          return {
            column: key,
            value: row.fields[key] ?? row.fields[column.label] ?? "",
            location: row.fieldLocations[key]?.[0] ?? row.location,
            raw: `${key}: ${row.fields[key] ?? ""}`
          };
        })
      : Object.entries(row.fields).map(([key, value]) => ({
          column: key,
          value,
          location: row.fieldLocations[key]?.[0] ?? row.location,
          raw: `${key}: ${value}`
        }))
  }));
}

function normalizeHeadingLevel(value: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const level = Number.parseInt(value, 10);
  if (level >= 1 && level <= 6) {
    return level as 1 | 2 | 3 | 4 | 5 | 6;
  }

  return 2;
}

function renderMarker(
  id: string,
  marker: string | undefined,
  category: "layout" | "element" | "action" | "form-group",
  options: MarkVSpecRenderOptions
): string {
  if (!isMarkerVisible(category, options)) {
    return "";
  }
  if (options.markerFilter && !options.markerFilter(id, category)) {
    return "";
  }

  const value = marker?.trim() || id;
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeHtml(value)}</code>`;
  const href = options.markerLink?.(id, category);
  return href ? `<a class="mm-marker-link" href="${escapeHtml(href)}">${badge}</a>` : badge;
}

function renderAnnotatedElement(markers: string, elementType: string, elementHtml: string, wrapperStyle?: string): string {
  const classes = [
    "mm-element-wrap",
    cssClass("mm-element-wrap", elementType),
    markers ? "mm-element-wrap-annotated" : ""
  ].filter(Boolean).join(" ");
  const styleAttribute = wrapperStyle ? ` style="${escapeHtml(wrapperStyle)}"` : "";
  const elementId = /\sdata-mm-id="([^"]+)"/u.exec(elementHtml)?.[1];
  const renderKey = elementId ? `<!--mm-render-key:element:${elementId}-->` : "";
  const renderKeyAttribute = elementId ? ` data-mm-render-key="${escapeHtml(`element:${elementId}`)}"` : "";
  return `${renderKey}<div class="${classes}"${styleAttribute}${renderKeyAttribute}>${elementHtml}<span class="mm-annotation-row">${markers}</span></div>`;
}

function isMarkerVisible(category: "layout" | "element" | "action" | "form-group", options: MarkVSpecRenderOptions): boolean {
  if (category === "form-group") {
    return options.markerVisibility?.formGroup ?? options.markerVisibility?.layout ?? options.showIds ?? false;
  }
  return options.markerVisibility?.[category] ?? options.showIds ?? false;
}


function cssClass(prefix: string, value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${token || "unknown"}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function sanitizeClassToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "custom";
}
