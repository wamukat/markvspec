import { buildMarkVSpecDocumentComposition } from "@markvspec/core";
import type {
  MarkVSpecDocumentComposition,
  MarkVSpecParseResult
} from "@markvspec/core";
import type { FocusScope } from "@markvspec/core";

export interface DocumentScopeItemIds {
  readonly layoutIds: Set<string>;
  readonly elementIds: Set<string>;
  readonly actionIds: Set<string>;
  readonly formGroupIds: Set<string>;
  readonly sectionProseRenderKeys: Set<string>;
}

export interface DocumentScope {
  readonly sourceResult: MarkVSpecParseResult;
  readonly specResult: MarkVSpecParseResult;
  readonly wireframeResult: MarkVSpecParseResult;
  readonly composition: MarkVSpecDocumentComposition;
  readonly focus?: FocusScope;
  readonly specItemIds: DocumentScopeItemIds;
  readonly wireframeItemIds: DocumentScopeItemIds;
}

export interface BuildDocumentScopeOptions {
  readonly focus?: FocusScope;
  readonly partialPreviews?: ReadonlyMap<string, MarkVSpecParseResult>;
  readonly partialPaths?: ReadonlyMap<string, string>;
}

export function createDocumentScope(result: MarkVSpecParseResult, options: BuildDocumentScopeOptions = {}): DocumentScope {
  const specResult = documentContentResultForSpecs(result, options.focus);
  const wireframeResult = options.focus ? focusResultForWireframe(result, options.focus) : result;
  const composition = buildMarkVSpecDocumentComposition(result, {
    partialPreviews: options.partialPreviews,
    partialPaths: options.partialPaths
  });
  return {
    sourceResult: result,
    specResult,
    wireframeResult,
    composition,
    focus: options.focus,
    specItemIds: documentScopeItemIds(specResult, composition, { includeTemplateItems: false, includePartialItems: false }),
    wireframeItemIds: documentScopeItemIds(wireframeResult, composition, { includePartialItems: true })
  };
}

export function documentScopeItemIds(
  result: MarkVSpecParseResult,
  composition?: MarkVSpecDocumentComposition,
  options: { includeTemplateItems?: boolean; includePartialItems?: boolean } = {}
): DocumentScopeItemIds {
  const baseIds = {
    layoutIds: new Set([
      ...result.layoutGroups.map((layout) => layout.id),
      ...result.slotContents.flatMap((slot) => slot.layoutGroups.map((layout) => layout.id))
    ]),
    elementIds: new Set(result.elements.map((element) => element.id)),
    actionIds: new Set(result.actions.map((action) => action.id)),
    formGroupIds: new Set(result.formGroups.map((formGroup) => formGroup.id))
  };
  if (composition && options.includePartialItems) {
    for (const entry of composition.layouts) {
      if (entry.origin.kind === "partial") {
        baseIds.layoutIds.add(entry.id);
      }
    }
    for (const entry of composition.elements) {
      if (entry.origin.kind === "partial") {
        baseIds.elementIds.add(entry.id);
      }
    }
    for (const entry of composition.actions) {
      if (entry.origin.kind === "partial") {
        baseIds.actionIds.add(entry.id);
      }
    }
    for (const entry of composition.formGroups) {
      if (entry.origin.kind === "partial") {
        baseIds.formGroupIds.add(entry.id);
      }
    }
  }
  return {
    ...baseIds,
    sectionProseRenderKeys: new Set(result.sectionProse.flatMap((sectionProse) => sectionProse.renderKeys))
  };
}

function documentContentResultForSpecs(result: MarkVSpecParseResult, focus?: FocusScope): MarkVSpecParseResult {
  const allEntityRenderKeys = detailEntityRenderKeySet(result);
  const documentContent = {
    ...result,
    layoutGroups: result.layoutGroups.filter((layout) => !isTemplateDocumentItem(layout)),
    elements: result.elements.filter((element) => !isTemplateDocumentItem(element)),
    actions: result.actions.filter((action) => !isTemplateDocumentItem(action))
  };
  const elementIds = new Set(documentContent.elements.map((element) => element.id));
  const actionIds = new Set(documentContent.actions.map((action) => action.id));
  documentContent.formGroups = result.formGroups.filter((formGroup) => {
    const referencesDocumentElement = formGroup.fields.some((field) => elementIds.has(field.elementId));
    const referencesDocumentAction = formGroup.submit ? actionIds.has(formGroup.submit.actionId) : false;
    return referencesDocumentElement || referencesDocumentAction;
  });
  documentContent.sectionProse = filterSectionProseForDetails(documentContent, allEntityRenderKeys);
  return focus ? focusResultForDetails(documentContent, focus) : documentContent;
}

function focusResultForDetails(result: MarkVSpecParseResult, focus: FocusScope): MarkVSpecParseResult {
  const allEntityRenderKeys = detailEntityRenderKeySet(result);
  const focused = {
    ...result,
    layoutGroups: result.layoutGroups.filter((layout) => focus.layoutIds.has(layout.id)),
    slotDefinitions: result.slotDefinitions.filter((slot) => result.slotContents.some((content) => content.name === slot.name && content.layoutGroups.some((layout) => focus.layoutIds.has(layout.id)))),
    slotContents: result.slotContents
      .map((slot) => ({
        ...slot,
        layoutGroups: slot.layoutGroups.filter((layout) => focus.layoutIds.has(layout.id))
      }))
      .filter((slot) => slot.layoutGroups.length > 0),
    elements: result.elements.filter((element) => focus.elementIds.has(element.id)),
    actions: result.actions.filter((action) => focus.actionIds.has(action.id)),
    formGroups: result.formGroups.filter((formGroup) => formGroupMatchesFocus(formGroup, focus))
  };
  return {
    ...focused,
    sectionProse: filterSectionProseForDetails(focused, allEntityRenderKeys)
  };
}

function filterSectionProseForDetails(
  result: MarkVSpecParseResult,
  allEntityRenderKeys: Set<string> = detailEntityRenderKeySet(result)
): MarkVSpecParseResult["sectionProse"] {
  const inScopeEntityRenderKeys = detailEntityRenderKeySet(result);
  return result.sectionProse.filter((sectionProse) => {
    const ownedRenderKeys = sectionProse.renderKeys.filter((renderKey) => allEntityRenderKeys.has(renderKey));
    if (ownedRenderKeys.length > 0) {
      return ownedRenderKeys.some((renderKey) => inScopeEntityRenderKeys.has(renderKey));
    }
    switch (sectionProse.kind) {
      case "States":
        return result.states.length > 0;
      case "Layout":
      case "Slots":
      case "Slot":
        return result.layoutGroups.length > 0 || result.slotDefinitions.length > 0 || result.slotContents.length > 0;
      case "Elements":
        return result.elements.length > 0;
      case "Actions":
        return result.actions.length > 0;
      case "ModelSamples":
        return result.modelSamples.length > 0;
      case "FormGroups":
        return result.formGroups.length > 0;
      case "Validations":
        return result.validations.length > 0;
      case "BusinessRules":
        return result.rules.length > 0;
      case "ErrorCodes":
        return result.errorCodes.length > 0;
      case "HistoryFields":
        return result.historyFields.length > 0;
      case "History":
        return result.historyEntries.length > 0;
      default:
        return true;
    }
  });
}

function detailEntityRenderKeySet(result: MarkVSpecParseResult): Set<string> {
  return new Set([
    ...result.elements.map((element) => `element:${element.id}`),
    ...result.actions.map((action) => `action:${action.id}`),
    ...result.formGroups.map((formGroup) => `form-group:${formGroup.id}`),
    ...result.validations.map((validation) => `validation:${validation.id}`),
    ...result.rules.map((rule) => `rule:${rule.id}`),
    ...result.errorCodes.map((errorCode) => `error-code:${errorCode.id}`)
  ]);
}

function formGroupMatchesFocus(
  formGroup: MarkVSpecParseResult["formGroups"][number],
  focus: FocusScope
): boolean {
  return formGroup.fields.some((field) => focus.elementIds.has(field.elementId))
    || Boolean(formGroup.submit && focus.actionIds.has(formGroup.submit.actionId));
}

function focusResultForWireframe(result: MarkVSpecParseResult, focus: FocusScope): MarkVSpecParseResult {
  const layoutById = new Map(result.layoutGroups.map((layout) => [layout.id, layout]));
  const focusedSlotNames = new Set(
    result.slotContents
      .filter((slot) => slot.layoutGroups.some((layout) => focus.layoutIds.has(layout.id)))
      .map((slot) => slot.name)
  );
  const descendantMemo = new Map<string, boolean>();
  const layoutHasFocusedDescendant = (layoutId: string): boolean => {
    const memo = descendantMemo.get(layoutId);
    if (memo !== undefined) {
      return memo;
    }

    const layout = layoutById.get(layoutId);
    const hasDescendant = Boolean(layout && layout.items.some((item) => {
      if (item.type === "slot") {
        return focusedSlotNames.has(item.name);
      }
      if (item.type === "contains") {
        return focus.layoutIds.has(item.targetId) || layoutHasFocusedDescendant(item.targetId);
      }
      return false;
    }));
    descendantMemo.set(layoutId, hasDescendant);
    return hasDescendant;
  };
  const includedLayoutIds = new Set<string>();
  for (const layout of result.layoutGroups) {
    if (layoutHasFocusedDescendant(layout.id)) {
      includedLayoutIds.add(layout.id);
      for (const item of layout.items) {
        if (item.type === "contains" && layoutById.has(item.targetId)) {
          includedLayoutIds.add(item.targetId);
        }
      }
    }
  }

  const layoutGroups = result.layoutGroups.filter((layout) => includedLayoutIds.has(layout.id)).map((layout) => {
    const properties = focus.layoutIds.has(layout.id) && !isTemplateDocumentItem(layout)
      ? layout.properties
      : Object.fromEntries(Object.entries(layout.properties).filter(([key]) => key !== "marker"));
    const keepChildren = layoutHasFocusedDescendant(layout.id);
    if (!keepChildren) {
      return { ...layout, properties, items: [] };
    }

    return {
      ...layout,
      properties,
      items: layout.items.filter((item) => {
        if (item.type === "slot") {
          return focusedSlotNames.has(item.name);
        }
        if (item.type === "contains" && layoutById.has(item.targetId)) {
          return includedLayoutIds.has(item.targetId);
        }
        if (item.type === "contains") {
          return focus.elementIds.has(item.targetId);
        }
        if (item.type === "field") {
          return focus.elementIds.has(item.elementId);
        }
        return item.type === "property";
      })
    };
  });

  return {
    ...result,
    layoutGroups,
    slotContents: result.slotContents
      .map((slot) => ({
        ...slot,
        layoutGroups: slot.layoutGroups.filter((layout) => focus.layoutIds.has(layout.id))
      }))
      .filter((slot) => focusedSlotNames.has(slot.name)),
    elements: result.elements.filter((element) => focus.elementIds.has(element.id)),
    actions: result.actions.filter((action) => focus.actionIds.has(action.id))
  };
}

function isTemplateDocumentItem(item: { documentRole?: string }): boolean {
  return item.documentRole === "template";
}
