import {
  actionIdPattern,
  conditionReferenceRegex,
  elementIdPattern,
  formGroupIdPattern,
  idNamePattern,
  isLayoutItemId,
  isLocalId,
  isOpaqueExpression,
  isPresentationPanelId,
  requestParamSourceIdRegex,
  stripOpaqueExpressions
} from "./ids.js";
import { effectiveHistoryFields } from "./history.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import {
  isInputElementType,
  isKnownElementType,
  validateElementProperties
} from "./element-validator.js";
import {
  isInvalidFieldErrorElement,
  parseDisplayMessageReference,
  resolveDisplayTarget
} from "./display-effect.js";
import {
  findMarkdownEntityReferencesInLines,
  resolveMarkVSpecEntityReference
} from "./entity-reference.js";
import type {
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecDiagnosticSeverity,
  MarkVSpecElement,
  MarkVSpecFormGroup,
  MarkVSpecLayoutGroup,
  MarkVSpecParseResult,
  MarkVSpecProcessStep,
  MarkVSpecProcessStepDetail,
  MarkVSpecViewContextDefinition,
  SourceLocation
} from "./types.js";

const layoutKinds = new Set(["stack", "row", "grid", "inline"]);
const partialIdRegex = /^PRT-[\p{L}\p{N}-]+$/u;
const actionEvents = new Set(["click", "change", "submit", "focus", "blur", "open", "close"]);
const actionLifecycleEvents = new Set(["response"]);
const documentLifecycleTriggers = new Set(["page.load", "partial.render", "screen.load"]);
const canonicalDocumentLifecycleEvents = new Set(["page.load", "partial.render"]);
const actionLifecycleTriggerRegex = new RegExp(String.raw`^(${actionIdPattern})\.([A-Za-z][A-Za-z0-9_-]*)$`, "u");
const actionProcessLifecycleTriggerRegex = new RegExp(String.raw`^(${actionIdPattern})\.([A-Za-z0-9][A-Za-z0-9_-]{0,11})\.([A-Za-z][A-Za-z0-9_-]*)$`, "u");
const elementIdRegex = new RegExp(String.raw`^${elementIdPattern}$`, "u");
const formGroupIdRegex = new RegExp(String.raw`^${formGroupIdPattern}$`, "u");
const validationResultReferenceRegex = new RegExp(String.raw`^(V-${idNamePattern})\.result$`, "u");
const markerRegex = /^[A-Za-z0-9][A-Za-z0-9_-]{0,11}$/u;
const multiInitialValueOptionElementTypes = new Set(["MultiSelect", "CheckboxGroup"]);

export function validateMarkVSpec(result: MarkVSpecParseResult): MarkVSpecDiagnostic[] {
  const diagnostics = result.diagnostics;
  const layoutIds = new Set(result.layoutGroups.map((group) => group.id));
  const slotContentLayoutIds = new Set(result.slotContents.flatMap((slot) => slot.layoutGroups.map((group) => group.id)));
  const semanticLayoutIds = new Set(result.layoutGroups.filter((group) => !isPresentationPanelId(group.id)).map((group) => group.id));
  const semanticSlotContentLayoutIds = new Set(result.slotContents.flatMap((slot) => slot.layoutGroups.filter((group) => !isPresentationPanelId(group.id)).map((group) => group.id)));
  const targetLayoutIds = new Set([...semanticLayoutIds, ...semanticSlotContentLayoutIds]);
  const layoutIdsByViewport = mapLayoutIdsByViewport(result.layoutGroups);
  const elementIds = new Set(result.elements.map((element) => element.id));
  const elementsById = new Map(result.elements.map((element) => [element.id, element]));
  const formGroupIds = new Set(result.formGroups.map((formGroup) => formGroup.id));
  const actionIds = new Set(result.actions.map((action) => action.id));
  const ruleIds = new Set(result.rules.map((rule) => rule.id));
  const validationIds = new Set(result.validations.map((validation) => validation.id));
  const validationsById = new Map(result.validations.map((validation) => [validation.id, validation]));
  const rulesById = new Map(result.rules.map((rule) => [rule.id, rule]));
  const errorCodeIds = new Set(result.errorCodes.map((errorCode) => errorCode.id));
  const stateNames = new Set(result.states.map((state) => state.name));
  const viewContextNames = new Set(result.viewContexts.map((context) => context.name));
  const viewContextSampleNames = new Set(result.viewContextSamples.map((sample) => sample.name));
  const localIds = new Set([...semanticLayoutIds, ...semanticSlotContentLayoutIds, ...elementIds, ...actionIds, ...validationIds, ...ruleIds, ...errorCodeIds]);
  const processMarkersByAction = new Map(result.actions.map((action) => [
    action.id,
    new Set(action.processSteps.map((step) => step.marker).filter((marker): marker is string => Boolean(marker)))
  ]));
  const referencedPartialIds = new Map<string, SourceLocation>();
  const allLayoutGroups = [...result.layoutGroups, ...result.slotContents.flatMap((slot) => slot.layoutGroups)];
  const layoutsById = new Map(allLayoutGroups.map((group) => [group.id, group]));

  validateTemplateScreenTopLevelLayouts(result, diagnostics);
  checkDuplicateLayoutGroups(result.layoutGroups, diagnostics);
  checkDuplicates(result.elements, "element", diagnostics);
  checkDuplicates(result.formGroups, "form group", diagnostics);
  checkDuplicates(result.actions, "action", diagnostics);
  checkDuplicates(result.validations, "validation", diagnostics);
  checkDuplicates(result.rules, "rule", diagnostics);
  checkDuplicates(result.errorCodes, "error code", diagnostics);
  checkDuplicates(result.states.map((state) => ({ id: state.name, location: state.location })), "state", diagnostics);
  checkDuplicates(result.viewContexts.map((context) => ({ id: context.name, location: context.location })), "view context", diagnostics);
  checkDuplicates(result.viewContextSamples.map((sample) => ({ id: sample.name, location: sample.location })), "view context sample", diagnostics);
  checkDuplicates(result.previewScenarios.map((scenario) => ({ id: scenario.name, location: scenario.location })), "preview scenario", diagnostics);
  validateViewContexts(result, viewContextNames, viewContextSampleNames, stateNames, elementsById, diagnostics);
  checkDuplicateLayoutMarkers(result.layoutGroups.filter((group) => !isPresentationPanelId(group.id)), diagnostics);
  checkConsistentLayoutMarkers(result.layoutGroups.filter((group) => !isPresentationPanelId(group.id)), diagnostics);
  checkMarkers(
    allLayoutGroups.filter((group) => !isPresentationPanelId(group.id)).map((group) => ({
      id: group.id,
      marker: group.properties["marker"],
      location: firstPropertyLine(group, "marker") ? { line: firstPropertyLine(group, "marker") ?? group.location.line } : group.location
    })),
    "layout",
    diagnostics
  );
  checkMarkers(
    result.formGroups.map((formGroup) => ({
      id: formGroup.id,
      marker: firstStringProperty(formGroup.properties["marker"]),
      location: firstPropertyLine(formGroup, "marker") ? { line: firstPropertyLine(formGroup, "marker") ?? formGroup.location.line } : formGroup.location
    })),
    "form group",
    diagnostics
  );
  checkMarkers(
    [
      ...result.validations.map((validation) => ({
        id: validation.id,
        marker: firstStringProperty(validation.properties["marker"]),
        location: firstPropertyLine(validation, "marker") ? { line: firstPropertyLine(validation, "marker") ?? validation.location.line } : validation.location
      })),
      ...result.rules.map((rule) => ({
        id: rule.id,
        marker: firstStringProperty(rule.properties["marker"]),
        location: firstPropertyLine(rule, "marker") ? { line: firstPropertyLine(rule, "marker") ?? rule.location.line } : rule.location
      }))
    ],
    "message",
    diagnostics
  );
  checkMarkers(
    result.errorCodes.map((errorCode) => ({
      id: errorCode.id,
      marker: firstStringProperty(errorCode.properties["marker"]),
      location: firstPropertyLine(errorCode, "marker") ? { line: firstPropertyLine(errorCode, "marker") ?? errorCode.location.line } : errorCode.location
    })),
    "error code",
    diagnostics
  );
  checkMarkers(
    result.elements.map((element) => ({
      id: element.id,
      marker: stringProperty(element, "marker"),
      location: firstPropertyLine(element, "marker") ? { line: firstPropertyLine(element, "marker") ?? element.location.line } : element.location
    })),
    "element",
    diagnostics
  );
  checkMarkers(
    result.actions.map((action) => ({
      id: action.id,
      marker: action.properties["marker"],
      location: firstPropertyLine(action, "marker") ? { line: firstPropertyLine(action, "marker") ?? action.location.line } : action.location
    })),
    "action",
    diagnostics
  );
  checkDuplicateMarkers(
    result.formGroups.map((formGroup) => ({
      id: formGroup.id,
      marker: firstStringProperty(formGroup.properties["marker"]),
      location: firstPropertyLine(formGroup, "marker") ? { line: firstPropertyLine(formGroup, "marker") ?? formGroup.location.line } : formGroup.location
    })),
    "form group",
    diagnostics
  );
  checkDuplicateMarkers(
    [
      ...result.validations.map((validation) => ({
        id: validation.id,
        marker: firstStringProperty(validation.properties["marker"]),
        location: firstPropertyLine(validation, "marker") ? { line: firstPropertyLine(validation, "marker") ?? validation.location.line } : validation.location
      })),
      ...result.rules.map((rule) => ({
        id: rule.id,
        marker: firstStringProperty(rule.properties["marker"]),
        location: firstPropertyLine(rule, "marker") ? { line: firstPropertyLine(rule, "marker") ?? rule.location.line } : rule.location
      }))
    ],
    "message",
    diagnostics
  );
  checkDuplicateMarkers(
    result.errorCodes.map((errorCode) => ({
      id: errorCode.id,
      marker: firstStringProperty(errorCode.properties["marker"]),
      location: firstPropertyLine(errorCode, "marker") ? { line: firstPropertyLine(errorCode, "marker") ?? errorCode.location.line } : errorCode.location
    })),
    "error code",
    diagnostics
  );
  checkDuplicateMarkers(
    result.elements.map((element) => ({
      id: element.id,
      marker: stringProperty(element, "marker"),
      location: firstPropertyLine(element, "marker") ? { line: firstPropertyLine(element, "marker") ?? element.location.line } : element.location
    })),
    "element",
    diagnostics
  );
  checkDuplicateMarkers(
    result.actions.map((action) => ({
      id: action.id,
      marker: action.properties["marker"],
      location: firstPropertyLine(action, "marker") ? { line: firstPropertyLine(action, "marker") ?? action.location.line } : action.location
    })),
    "action",
    diagnostics
  );

  const initialStates = result.states.filter((state) => state.initial);
  if (result.screen.defaultState && !stateNames.has(result.screen.defaultState)) {
    diagnostics.push({
      severity: "warning",
      message: `Default display state ${result.screen.defaultState} is not defined in States.`,
      line: 1
    });
  }

  if (result.screen.route && /\{[A-Za-z][A-Za-z0-9_-]*\}/u.test(result.screen.route)) {
    diagnostics.push({
      severity: "error",
      message: "Screen route uses unsupported {param} placeholder syntax. Use :param, for example /users/:userId.",
      line: 1
    });
  }
  validateRouteParameterReferences(result, diagnostics);
  validateMarkdownEntityReferences(result, diagnostics);

  if (result.states.length > 0 && initialStates.length === 0) {
    diagnostics.push({
      severity: "warning",
      message: "No initial state is marked; the first state will be treated as initial.",
      line: result.states[0]?.location.line
    });
  } else if (initialStates.length > 1) {
    diagnostics.push({
      severity: "warning",
      message: "Multiple states are marked initial.",
      line: initialStates[1]?.location.line
    });
  }

  for (const group of result.layoutGroups) {
    validatePresentationPanelProperties(group, diagnostics);
    if (group.kind && !layoutKinds.has(group.kind)) {
      diagnostics.push(layoutKindDiagnostic(group));
    }
    validateLayoutPartialProperties(group, stateNames, diagnostics);
    if (!isPresentationPanelId(group.id)) {
      collectPartialReference(group.partial?.id, group.partial?.location ?? group.location, referencedPartialIds);
    }

    for (const item of group.items) {
      if (item.type === "contains" && !(layoutIdsByViewport.get(group.viewport)?.has(item.targetId)) && !elementIds.has(item.targetId)) {
        diagnostics.push({
          severity: "error",
          message: `Layout ${group.id} contains missing target ${item.targetId}.`,
          line: item.location.line
        });
      } else if (item.type === "field" && !elementIds.has(item.elementId)) {
        diagnostics.push({
          severity: "error",
          message: `Field ${item.label} references missing element ${item.elementId}.`,
          line: item.location.line
        });
      } else if (item.type === "property") {
        if (item.key === "contains") {
          if (item.scope === "items") {
            diagnostics.push({
              severity: "warning",
              message: `Layout ${group.id} uses contains inside Items; use a bare child reference such as - ${item.value}.`,
              line: item.location.line
            });
          } else {
            diagnostics.push({
              severity: "warning",
              message: `Layout ${group.id} uses direct contains; place child references under #### Items.`,
              line: item.location.line
            });
          }
        } else if (/^".+"$/.test(item.key)) {
          diagnostics.push({
            severity: "warning",
            message: `Layout ${group.id} uses a direct field mapping; place field mappings under #### Items.`,
            line: item.location.line
          });
        } else if (isConditionProperty(item.key)) {
          checkConditionReferences(item.value, localIds, diagnostics, item.location.line, "warning");
        }
      } else if (item.type === "flag" && item.scope === "metadata" && isLayoutItemId(item.value)) {
        diagnostics.push({
          severity: "warning",
          message: `Layout ${group.id} uses a direct child reference; place ${item.value} under #### Items.`,
          line: item.location.line
        });
      } else if (item.type === "flag" && item.scope === "items" && !isLayoutItemId(item.value)) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "warning",
          "layout.unsupportedItemsEntry",
          { layoutId: group.id, entry: item.value },
          item.location.line
        ));
      }
    }
  }

  const slotContentScopes = new Map<string, MarkVSpecParseResult["slotContents"][number]>();
  for (const slot of result.slotContents) {
    const scopeKey = `${slot.name}:${slot.viewport ?? ""}`;
    const existing = slotContentScopes.get(scopeKey);
    if (existing) {
      diagnostics.push({
        severity: "warning",
        message: `Duplicate slot content for ${slot.name}${slot.viewport ? ` in viewport ${slot.viewport}` : ""}.`,
        line: slot.location.line
      });
    } else {
      slotContentScopes.set(scopeKey, slot);
    }
    validateLayoutGroups(slot.layoutGroups, mapLayoutIdsByViewport(slot.layoutGroups), elementIds, localIds, stateNames, diagnostics);
    for (const group of slot.layoutGroups) {
      if (!isPresentationPanelId(group.id)) {
        collectPartialReference(group.partial?.id, group.partial?.location ?? group.location, referencedPartialIds);
      }
    }
  }

  for (const element of result.elements) {
    if (!isKnownElementType(element.type)) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "element.unknownType",
        { type: element.type },
        element.location.line
      ));
    } else {
      validateElementProperties(element, result, diagnostics);
    }

    const action = element.properties["action"];
    if (typeof action === "string" && !actionIds.has(action)) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} references missing action ${action}.`,
        line: firstPropertyLine(element, "action") ?? element.location.line
      });
    }
    validateDialogActions(element, elementsById, actionIds, diagnostics);
    validateSelectInitialValue(element, diagnostics);
    validateTabsElement(element, targetLayoutIds, actionIds, diagnostics);
    validateAnchoredOverlayElement(element, elementIds, diagnostics);
    validateAccordionDisclosureElement(element, targetLayoutIds, actionIds, diagnostics);

    for (const param of element.routeParams) {
      const sourceId = requestParamSourceId(param.source);
      if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
        diagnostics.push({
          severity: "error",
          message: `Element ${element.id} route parameter ${param.name} references missing source ${sourceId}.`,
          line: param.location.line
        });
      }
    }

    for (const [key, conditions] of [
      ["visible when", element.visibleWhen],
      ["hidden when", element.hiddenWhen],
      ["disabled when", element.disabledWhen]
    ] as const) {
      conditions.forEach((condition, index) => {
        checkConditionReferences(
          condition,
          localIds,
          diagnostics,
          element.propertyLocations[key]?.[index]?.line ?? element.location.line,
          "warning"
        );
      });
    }
  }

  for (const event of result.events) {
    if (!actionIds.has(event.actionId)) {
      diagnostics.push({
        severity: "error",
        message: `Event ${event.event} references missing action ${event.actionId}.`,
        line: event.location.line
      });
    }
    if (!canonicalDocumentLifecycleEvents.has(event.event)) {
      const severity = /^[A-Za-z][A-Za-z0-9_-]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(event.event) ? "error" : "warning";
      diagnostics.push({
        severity,
        message: `Event ${event.event} is not supported. Use page.load or partial.render.`,
        line: event.location.line
      });
    }
    if (/^E-[\p{L}\p{N}-]+\.[A-Za-z][A-Za-z0-9_-]*$/u.test(event.event)) {
      diagnostics.push({
        severity: "error",
        message: `Event ${event.event} is a user operation. Connect user operations with Element action: instead of ## Events.`,
        line: event.location.line
      });
    }
  }

  for (const action of result.actions) {
    const actionLifecycleTrigger = action.triggeredBy ? actionLifecycleTriggerRegex.exec(action.triggeredBy) : undefined;
    const actionProcessLifecycleTrigger = action.triggeredBy ? actionProcessLifecycleTriggerRegex.exec(action.triggeredBy) : undefined;
    if (!action.triggeredBy) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "action.missingTrigger",
        { actionId: action.id },
        action.location.line
      ));
    } else if (documentLifecycleTriggers.has(action.triggeredBy)) {
      // Valid document lifecycle trigger.
    } else if (action.triggeredBy.startsWith("E-") && !action.trigger) {
      diagnostics.push({
        severity: "error",
        message: `Action ${action.id} has invalid trigger ${action.triggeredBy}. Expected E-*.event.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (actionProcessLifecycleTrigger) {
      const [, sourceActionId, processMarker, event] = actionProcessLifecycleTrigger;
      const sourceAction = result.actions.find((candidate) => candidate.id === sourceActionId);
      if (!sourceAction) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} trigger references missing action ${sourceActionId}.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      } else if (!sourceAction.processSteps.some((step) => step.marker === processMarker)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} trigger references missing process ${sourceActionId}.${processMarker}.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      } else if (!actionLifecycleEvents.has(event)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} uses unsupported action lifecycle event ${event}.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      }
    } else if (actionLifecycleTrigger) {
      const [, sourceActionId, event] = actionLifecycleTrigger;
      if (!actionIds.has(sourceActionId)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} trigger references missing action ${sourceActionId}.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      } else if (event === "response") {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} trigger ${action.triggeredBy} is ambiguous. Use A-ActionId.P-marker.response.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      } else if (!actionLifecycleEvents.has(event)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} uses unsupported action lifecycle event ${event}.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      }
    } else if (action.trigger && !elementIds.has(action.trigger.elementId)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${action.id} trigger references missing element ${action.trigger.elementId}.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (action.trigger && !actionEvents.has(action.trigger.event)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} uses unsupported event ${action.trigger.event}.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (action.triggeredBy && !action.trigger) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "action.invalidTrigger",
        { actionId: action.id, trigger: action.triggeredBy },
        action.triggeredByLocation?.line ?? action.location.line
      ));
    }

    const processResponseTrigger = action.triggeredBy ? parseProcessOutputReference(action.triggeredBy) : undefined;
    if (processResponseTrigger?.kind === "response") {
      const receivesTriggeredResponse = action.processSteps.some((step) => step.receives.some((receive) => receive.value === action.triggeredBy));
      if (!receivesTriggeredResponse) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} is triggered by ${action.triggeredBy} but no process receives that response.`,
          line: action.triggeredByLocation?.line ?? action.location.line
        });
      }
    }

    if (action.target && isPresentationPanelId(action.target)) {
      diagnostics.push(presentationPanelTargetDiagnostic(`Action ${action.id}`, action.target, firstPropertyLine(action, "target") ?? action.location.line));
    } else if (action.target && formGroupIdRegex.test(action.target)) {
      diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${action.id}`, action.target, firstPropertyLine(action, "target") ?? action.location.line));
    } else if (action.target && isLocalId(action.target) && !targetLayoutIds.has(action.target) && !elementIds.has(action.target)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${action.id} targets missing layout or element ${action.target}.`,
        line: firstPropertyLine(action, "target") ?? action.location.line
      });
    } else if (action.target && layoutIds.has(action.target)) {
      checkLayoutTargetViewportCoverage(
        action.target,
        layoutIdsByViewport,
        diagnostics,
        firstPropertyLine(action, "target") ?? action.location.line,
        `Action ${action.id} targets layout`
      );
    }

    for (const param of action.routeParams) {
      const sourceId = requestParamSourceId(param.source);
      if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} route parameter ${param.name} references missing source ${sourceId}.`,
          line: param.location.line
        });
      }
    }

    for (const outcome of action.outcomes) {
      for (const param of outcome.routeParams) {
        const sourceId = requestParamSourceId(param.source);
        if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} case ${outcome.result} route parameter ${param.name} references missing source ${sourceId}.`,
            line: param.location.line
          });
        }
      }
    }
    for (const step of action.processSteps) {
      for (const outcome of step.outcomes) {
        for (const param of outcome.routeParams) {
          const sourceId = requestParamSourceId(param.source);
          if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
            diagnostics.push({
              severity: "error",
              message: `Action ${action.id} process step ${step.name} case ${outcome.result} route parameter ${param.name} references missing source ${sourceId}.`,
              line: param.location.line
            });
          }
        }
      }
    }

    const parallelGroups = new Set(action.processSteps.map((step) => step.parallelGroup).filter((group): group is string => Boolean(group)));
    const processMarkers = new Set(action.processSteps.map((step) => step.marker).filter((marker): marker is string => Boolean(marker)));
    const seenProcessMarkers = new Set<string>();

    for (const step of action.processSteps) {
      if (step.marker) {
        if (seenProcessMarkers.has(step.marker)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} has duplicate process marker ${step.marker}.`,
            line: step.location.line
          });
        }
        seenProcessMarkers.add(step.marker);
      }

      if (isHttpRequestStep(step.name) && !processStepDetail(step, "request")) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} HttpRequest step has no request line such as POST /path.`,
          line: step.location.line
        });
      }
      for (const detail of step.details.filter((detail) => isCanonicalProcessParamDetail(step, detail))) {
          const sourceId = requestParamSourceId(detail.value);
          if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
            diagnostics.push({
              severity: "error",
              message: `Action ${action.id} process step ${processStepLabel(step)} parameter ${detail.key} references missing source ${sourceId}.`,
              line: detail.location.line
            });
          }
      }

      if (isPartialRequestStep(step.name)) {
        validatePartialRequestStep(action.id, step, diagnostics);
        const partialDetail = step.details.find((detail) => detail.key === "partial");
        const isSelfPartialRequest = result.screen.type === "partial" && partialDetail?.value === result.screen.id;
        if (isSelfPartialRequest) {
          continue;
        }
        collectPartialReference(
          partialDetail?.value,
          partialDetail?.location ?? step.location,
          referencedPartialIds
        );
      }

      if (isResolveStep(step.name)) {
        if (!step.resolveGroup) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} Resolve step must specify a parallel group with group: initial-load.`,
            line: step.location.line
          });
        } else if (!parallelGroups.has(step.resolveGroup)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} Resolve step references missing parallel group ${step.resolveGroup}.`,
            line: firstPropertyLine(step, "resolve") ?? step.location.line
          });
        }
      }
    }

    const transitionResults = new Set(action.transitions.map((transition) => transition.result).filter((result): result is string => Boolean(result)));
    const responseResults = new Set(action.responses.map((response) => response.result));
    for (const response of action.responses) {
      if (!transitionResults.has(response.result)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} defines ${response.result} response but has no ${response.result} transition.`,
          line: response.location.line
        });
      }
    }

    for (const outcome of action.outcomes) {
      validateBusinessRuleOutcomeCaseName(action.id, undefined, outcome, diagnostics);

      if (!hasActionOutcomeDetails(outcome) && !outcome.to && !transitionResults.has(outcome.result) && !responseResults.has(outcome.result)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} defines ${outcome.result} case but it has no response, state, navigate, or update details.`,
          line: outcome.location?.line ?? firstOutcomeLine(outcome) ?? action.location.line
        });
      }

      if (hasOutcomeDetailsThatRequireTransition(outcome) && !outcome.to && !transitionResults.has(outcome.result)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} defines ${outcome.result} outcome details but has no ${outcome.result} transition.`,
          line: firstOutcomeLine(outcome) ?? action.location.line
        });
      }

      if (outcome.target && isPresentationPanelId(outcome.target)) {
        diagnostics.push(presentationPanelTargetDiagnostic(`Action ${action.id} ${outcome.result} outcome`, outcome.target, firstPropertyLine(outcome, "target") ?? action.location.line));
      } else if (outcome.target && formGroupIdRegex.test(outcome.target)) {
        diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${action.id} ${outcome.result} outcome`, outcome.target, firstPropertyLine(outcome, "target") ?? action.location.line));
      } else if (outcome.target && isLocalId(outcome.target) && !targetLayoutIds.has(outcome.target) && !elementIds.has(outcome.target)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} ${outcome.result} outcome targets missing layout or element ${outcome.target}.`,
          line: firstPropertyLine(outcome, "target") ?? action.location.line
        });
      } else if (outcome.target && layoutIds.has(outcome.target)) {
        checkLayoutTargetViewportCoverage(
          outcome.target,
          layoutIdsByViewport,
          diagnostics,
          firstPropertyLine(outcome, "target") ?? action.location.line,
          `Action ${action.id} ${outcome.result} outcome targets layout`
        );
      }

      validateOutcomeTransitionTarget(outcome, stateNames, diagnostics);
      validateUpdateMode(action.id, outcome, diagnostics, `case ${outcome.result}`);
      validateOutcomeErrorCodes(action.id, outcome, errorCodeIds, diagnostics);
      validateOutcomeBusinessRules(action.id, outcome, ruleIds, diagnostics);
      collectPartialReference(outcome.content, firstPropertyLocation(outcome, "content") ?? outcome.location ?? action.location, referencedPartialIds);
      validateDisplayEffect(action.id, `case ${outcome.result}`, outcome.display, targetLayoutIds, elementIds, layoutsById, elementsById, validationsById, rulesById, layoutIdsByViewport, diagnostics, referencedPartialIds);
    }

    for (const step of action.processSteps) {
      for (const [key, conditions] of [
        ["when", step.when],
        ["skip when", step.skipWhen]
      ] as const) {
        conditions.forEach((condition, index) => {
          checkConditionReferences(
            condition,
            localIds,
            diagnostics,
            step.propertyLocations[key]?.[index]?.line ?? step.location.line,
            "warning"
          );
        });
      }

      if (step.target && isPresentationPanelId(step.target)) {
        diagnostics.push(presentationPanelTargetDiagnostic(`Action ${action.id} process step ${step.name}`, step.target, firstPropertyLine(step, "target") ?? step.location.line));
      } else if (step.target && formGroupIdRegex.test(step.target)) {
        diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${action.id} process step ${step.name}`, step.target, firstPropertyLine(step, "target") ?? step.location.line));
      } else if (step.target && isLocalId(step.target) && !targetLayoutIds.has(step.target) && !elementIds.has(step.target)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${action.id} process step ${step.name} targets missing layout or element ${step.target}.`,
          line: firstPropertyLine(step, "target") ?? step.location.line
        });
      } else if (step.target && layoutIds.has(step.target)) {
        checkLayoutTargetViewportCoverage(
          step.target,
          layoutIdsByViewport,
          diagnostics,
          firstPropertyLine(step, "target") ?? step.location.line,
          `Action ${action.id} process step ${step.name} targets layout`
        );
      }

      validateUpdateMode(action.id, step, diagnostics, `process step ${step.name}`);
      validateProcessStepReferences(action.id, step, validationIds, errorCodeIds, diagnostics);
      validateProcessGranularity(action.id, step, diagnostics);
      validateUnsupportedProcessLevelPartial(action.id, step, diagnostics);
      validateProcessBusinessRulePlacement(action.id, step, diagnostics);
      validateProcessDataReferences(action.id, step, actionIds, processMarkersByAction, layoutIds, elementIds, diagnostics);
      collectPartialReference(step.content, firstPropertyLocation(step, "content") ?? step.location, referencedPartialIds);
      validateDisplayEffect(action.id, `process step ${processStepLabel(step)}`, step.display, targetLayoutIds, elementIds, layoutsById, elementsById, validationsById, rulesById, layoutIdsByViewport, diagnostics, referencedPartialIds);

      for (const outcome of step.outcomes) {
        validateBusinessRuleOutcomeCaseName(action.id, step, outcome, diagnostics);
        validateProcessCaseFlowPlacement(action.id, step, outcome, diagnostics);
        validateSuspiciousProcessCaseResponse(action.id, step, outcome, diagnostics);

        if (step.parallelGroup && outcome.flow === "stop") {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} parallel process step ${step.name} case ${outcome.result} should continue and leave final state decisions to a Resolve step.`,
            line: firstPropertyLine(outcome, "flow") ?? outcome.location?.line ?? step.location.line
          });
        }

        if (step.parallelGroup && outcome.to) {
          diagnostics.push(createMarkVSpecDiagnostic(
            "warning",
            "action.parallelProcess.caseShouldNotSetStateOrNavigate",
            { actionId: action.id, stepName: step.name, result: outcome.result },
            firstPropertyLine(outcome, "state") ?? firstPropertyLine(outcome, "navigate") ?? firstOutcomeLine(outcome) ?? step.location.line
          ));
        }

        if (!hasActionOutcomeDetails(outcome) && !outcome.to) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} process step ${step.name} defines ${outcome.result} case but it has no response, state, navigate, or update details.`,
            line: outcome.location?.line ?? firstOutcomeLine(outcome) ?? step.location.line
          });
        }

        if (!step.parallelGroup && hasOutcomeDetailsThatRequireTransition(outcome) && !outcome.to) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} process step ${step.name} defines ${outcome.result} outcome details but has no ${outcome.result} transition.`,
            line: firstOutcomeLine(outcome) ?? step.location.line
          });
        }

        if (isImmediateStep(step.name) && outcome.response && !transitionResults.has(outcome.result)) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} process step ${step.name} defines ${outcome.result} response but has no ${outcome.result} transition.`,
            line: outcome.response.location.line
          });
        }

        if (outcome.target && isPresentationPanelId(outcome.target)) {
          diagnostics.push(presentationPanelTargetDiagnostic(`Action ${action.id} process step ${step.name} ${outcome.result} outcome`, outcome.target, firstPropertyLine(outcome, "target") ?? step.location.line));
        } else if (outcome.target && formGroupIdRegex.test(outcome.target)) {
          diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${action.id} process step ${step.name} ${outcome.result} outcome`, outcome.target, firstPropertyLine(outcome, "target") ?? step.location.line));
        } else if (outcome.target && isLocalId(outcome.target) && !targetLayoutIds.has(outcome.target) && !elementIds.has(outcome.target)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} process step ${step.name} ${outcome.result} outcome targets missing layout or element ${outcome.target}.`,
            line: firstPropertyLine(outcome, "target") ?? step.location.line
          });
        } else if (outcome.target && layoutIds.has(outcome.target)) {
          checkLayoutTargetViewportCoverage(
            outcome.target,
            layoutIdsByViewport,
            diagnostics,
            firstPropertyLine(outcome, "target") ?? step.location.line,
            `Action ${action.id} process step ${step.name} ${outcome.result} outcome targets layout`
          );
        }

        validateOutcomeTransitionTarget(outcome, stateNames, diagnostics);
        validateUpdateMode(action.id, outcome, diagnostics, `process step ${step.name} case ${outcome.result}`);
        validateOutcomeErrorCodes(action.id, outcome, errorCodeIds, diagnostics);
        validateOutcomeBusinessRules(action.id, outcome, ruleIds, diagnostics);
        collectPartialReference(outcome.content, firstPropertyLocation(outcome, "content") ?? outcome.location ?? step.location, referencedPartialIds);
        validateDisplayEffect(action.id, `process step ${processStepLabel(step)} case ${outcome.result}`, outcome.display, targetLayoutIds, elementIds, layoutsById, elementsById, validationsById, rulesById, layoutIdsByViewport, diagnostics, referencedPartialIds);
      }
    }

    for (const transition of action.transitions) {
      if (!stateNames.has(transition.from)) {
        diagnostics.push({
          severity: "error",
          message: `Transition references missing source state ${transition.from}.`,
          line: transition.location.line
        });
      }

      if (!isExternalTransitionTarget(transition.to) && !stateNames.has(transition.to)) {
        diagnostics.push({
          severity: "error",
          message: `Transition references missing target state ${transition.to}.`,
          line: transition.location.line
        });
      }
    }
  }

  validateFormGroups(result, elementsById, actionIds, diagnostics);

  for (const validation of result.validations) {
    validateValidationTargets(validation, targetLayoutIds, elementIds, formGroupIds, diagnostics);
    validateValidationTrigger(validation, diagnostics);
    validateValidationRules(validation, elementIds, elementsById, formGroupIds, diagnostics);
    validateValidationCondition(validation, localIds, diagnostics);
    validateValidationErrorCodes(validation, errorCodeIds, diagnostics);
    validateValidationScopeAndRun(validation, diagnostics);
  }

  for (const errorCode of result.errorCodes) {
    validateErrorCode(errorCode, ruleIds, targetLayoutIds, elementIds, diagnostics);
  }

  validateHistory(result, diagnostics);

  validateReferencedPartialIds(result, referencedPartialIds, diagnostics);

  return diagnostics;
}

function validateHistory(result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  const schema = effectiveHistoryFields(result.historyFields);
  const schemaByKey = new Map(schema.map((field) => [field.key, field]));

  checkDuplicates(result.historyFields.map((field) => ({ id: field.key, location: field.location })), "history field", diagnostics);

  for (const field of result.historyFields) {
    if (field.rawType && field.rawType !== "string" && field.rawType !== "date") {
      diagnostics.push({
        severity: "warning",
        message: `History field ${field.key} type ${field.rawType} is not recognized. Use string or date.`,
        line: field.location.line
      });
    }
  }

  for (const entry of result.historyEntries) {
    for (const field of schema) {
      if (field.required && !entry.fields[field.key]) {
        diagnostics.push({
          severity: "error",
          message: `History ${entry.version} is missing required field ${field.key}.`,
          line: entry.location.line
        });
      }
    }

    for (const [key, value] of Object.entries(entry.fields)) {
      const field = schemaByKey.get(key);
      const line = entry.fieldLocations[key]?.[0]?.line ?? entry.location.line;
      if (!field) {
        diagnostics.push({
          severity: "warning",
          message: `History ${entry.version} uses undefined field ${key}.`,
          line
        });
        continue;
      }
      if (field.type === "date" && value && !isIsoDate(value)) {
        diagnostics.push({
          severity: "warning",
          message: `History ${entry.version} field ${key} must be a date in YYYY-MM-DD format.`,
          line
        });
      }
    }
  }
}

function validateMarkdownEntityReferences(
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const proseBlocks: string[][] = [];
  const pushLines = (lines: string[] | undefined): void => {
    if (lines && lines.length > 0) {
      proseBlocks.push(lines);
    }
  };

  if (result.screen.description) {
    pushLines(result.screen.description.split(/\r?\n/u));
  }
  for (const section of result.sectionProse) {
    pushLines(section.overview);
    pushLines(section.notes);
  }
  for (const note of result.notes) {
    pushLines(note.lines);
  }
  for (const entity of [
    ...result.layoutGroups,
    ...result.slotContents.flatMap((slot) => slot.layoutGroups),
    ...result.slotDefinitions,
    ...result.elements,
    ...result.formGroups,
    ...result.actions,
    ...result.validations,
    ...result.rules,
    ...result.errorCodes
  ]) {
    pushLines(entity.overview);
    pushLines(entity.notes);
  }
  for (const rule of result.rules) {
    pushLines(rule.bodyLines);
    pushLines(rule.bullets.map((bullet) => bullet.text));
  }
  for (const errorCode of result.errorCodes) {
    pushLines(errorCode.bullets.map((bullet) => bullet.text));
  }
  for (const entry of result.historyEntries) {
    pushLines(entry.bodyLines);
  }

  const missingIds = new Set<string>();
  for (const lines of proseBlocks) {
    for (const id of findMarkdownEntityReferencesInLines(lines)) {
      if (!resolveMarkVSpecEntityReference(result, id)) {
        missingIds.add(id);
      }
    }
  }

  for (const id of missingIds) {
    diagnostics.push({
      severity: "warning",
      message: `Reference #{${id}} does not match any MarkVSpec entity.`
    });
  }
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateFormGroups(
  result: MarkVSpecParseResult,
  elementsById: Map<string, MarkVSpecElement>,
  actionIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const formGroup of result.formGroups) {
    let hasMissingField = false;
    for (const field of formGroup.fields) {
      const element = elementsById.get(field.elementId);
      if (!element) {
        hasMissingField = true;
        diagnostics.push({
          severity: "error",
          message: `FormGroup ${formGroup.id} field references missing element ${field.elementId}.`,
          line: field.location.line
        });
        continue;
      }
      if (!isInputElementType(element.type)) {
        diagnostics.push({
          severity: "warning",
          message: `FormGroup ${formGroup.id} field ${field.elementId} is ${element.type}, which is not an input element.`,
          line: field.location.line
        });
      }
    }

    if (formGroup.submit && !actionIds.has(formGroup.submit.actionId)) {
      diagnostics.push({
        severity: "error",
        message: `FormGroup ${formGroup.id} submit references missing action ${formGroup.submit.actionId}.`,
        line: formGroup.submit.location.line
      });
    }

    if (!hasMissingField && formGroup.fields.length > 0 && !formGroupScopeCanBeResolved(result, formGroup)) {
      diagnostics.push({
        severity: "warning",
        message: `FormGroup ${formGroup.id} scope cannot be resolved to a layout group. Preview will show the form group only in details.`,
        line: formGroup.location.line
      });
    }
  }
}

function formGroupScopeCanBeResolved(result: MarkVSpecParseResult, formGroup: MarkVSpecFormGroup): boolean {
  const fieldIds = new Set(formGroup.fields.map((field) => field.elementId));
  if (fieldIds.size === 0) {
    return false;
  }
  const layoutById = new Map(result.layoutGroups.map((group) => [group.id, group]));
  return result.layoutGroups.some((group) => {
    const elementIds = layoutElementIds(group, layoutById, new Set());
    return [...fieldIds].every((fieldId) => elementIds.has(fieldId));
  });
}

function layoutElementIds(
  group: MarkVSpecLayoutGroup,
  layoutById: Map<string, MarkVSpecLayoutGroup>,
  visited: Set<string>
): Set<string> {
  if (visited.has(group.id)) {
    return new Set();
  }
  visited.add(group.id);
  const elementIds = new Set<string>();
  for (const item of group.items) {
    if (item.type === "contains") {
      if (item.targetId.startsWith("E-")) {
        elementIds.add(item.targetId);
      }
      const childLayout = layoutById.get(item.targetId);
      if (childLayout) {
        for (const elementId of layoutElementIds(childLayout, layoutById, new Set(visited))) {
          elementIds.add(elementId);
        }
      }
    } else if (item.type === "field") {
      elementIds.add(item.elementId);
    }
  }
  return elementIds;
}

function validateValidationTargets(
  validation: MarkVSpecParseResult["validations"][number],
  layoutIds: Set<string>,
  elementIds: Set<string>,
  formGroupIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (validationPropertyValues(validation, "target").length === 0) {
    diagnostics.push({
      severity: "error",
      message: `Validation ${validation.id} must specify target.`,
      line: validation.location.line
    });
  }

  validationPropertyValues(validation, "target").forEach((target, index) => {
    const line = validation.propertyLocations["target"]?.[index]?.line ?? validation.location.line;
    if (isPresentationPanelId(target)) {
      diagnostics.push(presentationPanelTargetDiagnostic(`Validation ${validation.id}`, target, line));
    } else if (formGroupIdRegex.test(target)) {
      if (!formGroupIds.has(target)) {
        diagnostics.push({
          severity: "error",
          message: `Validation ${validation.id} targets missing form group ${target}.`,
          line
        });
      }
    } else if (layoutIds.has(target) && validationIsComposite(validation)) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} targets layout ${target} for composite validation. Use a FormGroup target such as F-${target.replace(/^L-/u, "")} instead.`,
        line
      });
    } else if (isLocalId(target) && !layoutIds.has(target) && !elementIds.has(target)) {
      const targetKind = target.startsWith("E-") ? "element" : target.startsWith("L-") ? "layout" : "layout or element";
      diagnostics.push({
        severity: "error",
        message: `Validation ${validation.id} targets missing ${targetKind} ${target}.`,
        line
      });
    }
  });
}

function validationIsComposite(validation: MarkVSpecParseResult["validations"][number]): boolean {
  const scopes = validationPropertyValues(validation, "scope").map((scope) => scope.toLowerCase());
  if (scopes.some((scope) => scope === "composite" || scope === "cross-field")) {
    return true;
  }
  return validationPropertyValues(validation, "target").length > 1;
}

function validateValidationTrigger(
  validation: MarkVSpecParseResult["validations"][number],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  validationPropertyValues(validation, "trigger").forEach((trigger, index) => {
    const line = validation.propertyLocations["trigger"]?.[index]?.line ?? validation.location.line;
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} trigger is not canonical. Actions should consume ${validation.id}.result instead of defining validation triggers.`,
      line
    });
  });
}

function validateValidationRules(
  validation: MarkVSpecParseResult["validations"][number],
  elementIds: Set<string>,
  elementsById: Map<string, MarkVSpecElement>,
  formGroupIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (validation.rules.length === 0 && validationPropertyValues(validation, "condition").length === 0 && validationPropertyValues(validation, "check").length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} has no rules. Define rules or migrate legacy condition-only validation.`,
      line: validation.location.line
    });
    return;
  }

  for (const rule of validation.rules) {
    for (const target of rule.targets) {
      if (elementIdRegex.test(target) && !elementIds.has(target)) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "error",
          "validation.ruleMissingElement",
          { validationId: validation.id, ruleName: rule.name, elementId: target },
          rule.location.line
        ));
      } else if (formGroupIdRegex.test(target) && !formGroupIds.has(target)) {
        diagnostics.push({
          severity: "error",
          message: `Validation ${validation.id} rule ${rule.name} references missing form group ${target}.`,
          line: rule.location.line
        });
      }
    }
    validateElementBackedConstraint(validation, rule, elementsById, diagnostics);
  }
}

function validateElementBackedConstraint(
  validation: MarkVSpecParseResult["validations"][number],
  rule: MarkVSpecParseResult["validations"][number]["rules"][number],
  elementsById: Map<string, MarkVSpecElement>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const normalizedName = rule.name.toLowerCase();
  if (normalizedName !== "length" && normalizedName !== "range") {
    return;
  }
  if (!rule.targets.some((target) => target.toLowerCase() === "element")) {
    return;
  }

  const targetElementIds = validationPropertyValues(validation, "target").filter((target) => elementIdRegex.test(target));
  if (targetElementIds.length !== 1) {
    return;
  }

  const element = elementsById.get(targetElementIds[0] ?? "");
  if (!element) {
    return;
  }

  const hasNeededMetadata = normalizedName === "length"
    ? elementHasAnyInputMetadata(element, ["min length", "max length", "min-length", "max-length", "minlength", "maxlength"])
    : elementHasAnyInputMetadata(element, ["min", "max"]);
  if (!hasNeededMetadata) {
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} uses ${rule.name}: element, but target ${element.id} does not define matching ${rule.name} input metadata.`,
      line: rule.location.line
    });
  }
}

function elementHasAnyInputMetadata(element: MarkVSpecElement, keys: string[]): boolean {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const key of Object.keys(element.properties)) {
    if (normalizedKeys.has(key.toLowerCase())) {
      return true;
    }
  }
  return element.inputRules.some((rule) => normalizedKeys.has(rule.key.toLowerCase()));
}

function validateValidationErrorCodes(
  validation: MarkVSpecParseResult["validations"][number],
  errorCodeIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const key of ["error code", "error codes"]) {
    validationPropertyValues(validation, key).forEach((value, index) => {
      for (const errorCode of splitReferenceList(value)) {
        if (!errorCodeIds.has(errorCode)) {
          diagnostics.push({
            severity: "error",
            message: `Validation ${validation.id} references missing error code ${errorCode}.`,
            line: validation.propertyLocations[key]?.[index]?.line ?? validation.location.line
          });
        }
      }
    });
  }
}

function validateValidationScopeAndRun(
  validation: MarkVSpecParseResult["validations"][number],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const scopes = new Set(["single", "field", "composite", "cross-field"]);
  validationPropertyValues(validation, "scope").forEach((scope, index) => {
    const line = validation.propertyLocations["scope"]?.[index]?.line ?? validation.location.line;
    if (line !== validation.location.line) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} must not define scope; use Field Validations or Cross-field Validations section instead.`,
        line
      });
    }
    if (!scopes.has(scope)) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} scope ${scope} is not recognized. Use single, field, composite, or cross-field.`,
        line
      });
    }
  });

  validationPropertyValues(validation, "run").forEach((run, index) => {
    if (run !== "client") {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} run ${run} is not supported. Use client.`,
        line: validation.propertyLocations["run"]?.[index]?.line ?? validation.location.line
      });
    }
  });
}

function validateErrorCode(
  errorCode: MarkVSpecParseResult["errorCodes"][number],
  ruleIds: Set<string>,
  layoutIds: Set<string>,
  elementIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const key of ["business rule", "target", "message", "display"]) {
    if (validationPropertyValues(errorCode, key).length === 0) {
      diagnostics.push({
        severity: "error",
        message: `Error code ${errorCode.id} must define ${key}.`,
        line: errorCode.location.line
      });
    }
  }

  validationPropertyValues(errorCode, "business rule").forEach((rule, index) => {
    if (rule && !ruleIds.has(rule)) {
      diagnostics.push({
        severity: "error",
        message: `Error code ${errorCode.id} references missing business rule ${rule}.`,
        line: errorCode.propertyLocations["business rule"]?.[index]?.line ?? errorCode.location.line
      });
    }
  });

  validationPropertyValues(errorCode, "target").forEach((target, index) => {
    if (isPresentationPanelId(target)) {
      diagnostics.push(presentationPanelTargetDiagnostic(`Error code ${errorCode.id}`, target, errorCode.propertyLocations["target"]?.[index]?.line ?? errorCode.location.line));
    } else if (isLocalId(target) && !layoutIds.has(target) && !elementIds.has(target)) {
      diagnostics.push({
        severity: "error",
        message: `Error code ${errorCode.id} targets missing layout or element ${target}.`,
        line: errorCode.propertyLocations["target"]?.[index]?.line ?? errorCode.location.line
      });
    }
  });

  const displays = new Set(["inline", "form", "global", "banner", "toast", "dialog", "none"]);
  validationPropertyValues(errorCode, "display").forEach((display, index) => {
    if (!displays.has(display)) {
      diagnostics.push({
        severity: "warning",
        message: `Error code ${errorCode.id} display ${display} is not recognized. Use inline, form, global, banner, toast, dialog, or none.`,
        line: errorCode.propertyLocations["display"]?.[index]?.line ?? errorCode.location.line
      });
    }
  });
}

function validateValidationCondition(
  validation: MarkVSpecParseResult["validations"][number],
  localIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  validationPropertyValues(validation, "condition").forEach((condition, index) => {
    checkConditionReferences(
      condition,
      localIds,
      diagnostics,
      validation.propertyLocations["condition"]?.[index]?.line ?? validation.location.line,
      "warning"
    );
  });
}

function validationPropertyValues(owner: { properties: Record<string, string | string[]> }, key: string): string[] {
  const value = owner.properties[key];
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function splitReferenceList(value: string): string[] {
  return value.split(/[,、]/u).map((item) => item.trim()).filter(Boolean);
}

function collectPartialReference(
  value: string | undefined,
  location: SourceLocation | undefined,
  referencedPartialIds: Map<string, SourceLocation>
): void {
  if (!value || !partialIdRegex.test(value) || referencedPartialIds.has(value)) {
    return;
  }

  referencedPartialIds.set(value, location ?? { line: 1 });
}

function validateReferencedPartialIds(
  result: MarkVSpecParseResult,
  referencedPartialIds: Map<string, SourceLocation>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const [partialId, location] of referencedPartialIds) {
    if (result.screen.references.partials[partialId]) {
      continue;
    }

    diagnostics.push(createMarkVSpecDiagnostic(
      "error",
      "partial.referenceMissing",
      { partialId },
      location.line
    ));
  }
}

function validatePartialRequestStep(
  actionId: string,
  step: MarkVSpecProcessStep,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const request = step.details.find((detail) => detail.key === "request");
  if (!request || !/^([A-Z]+)\s+.+$/.test(request.value)) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} PartialRequest step should define request such as GET /path.`,
      line: request?.location.line ?? step.location.line
    });
  }

  const partial = step.details.find((detail) => detail.key === "partial");
  if (!partial) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} PartialRequest step should define partial PRT-* ID.`,
      line: step.location.line
    });
  } else if (!partialIdRegex.test(partial.value)) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} PartialRequest partial must use a PRT-* partial ID.`,
      line: partial.location.line
    });
  }
}

function validateUpdateMode(
  actionId: string,
  owner: Pick<MarkVSpecActionOutcome | MarkVSpecProcessStep, "mode" | "propertyLocations">,
  diagnostics: MarkVSpecDiagnostic[],
  context: string
): void {
  if (owner.mode && owner.mode !== "replace") {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} update mode ${owner.mode} is not supported yet. Use replace.`,
      line: firstPropertyLine(owner, "mode")
    });
  }
}

function validateProcessGranularity(actionId: string, step: MarkVSpecProcessStep, diagnostics: MarkVSpecDiagnostic[]): void {
  const executionDetails = processExecutionDetails(step);
  if (executionDetails.length > 1) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.multipleExecutionDetails",
      { actionId, stepLabel: processStepLabel(step), details: executionDetails.map((detail) => detail.name).join(", ") },
      executionDetails[1]?.location.line ?? step.location.line
    ));
  }

  const directEffectLocation = firstDirectProcessEffectLocation(step);
  const hasClassification = step.outcomes.length > 0 || step.receives.length > 0 || step.results.length > 0;
  if (directEffectLocation && executionDetails.length > 0) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.mixesExecutionDetailAndImmediateEffects",
      { actionId, stepLabel: processStepLabel(step) },
      directEffectLocation.line
    ));
  } else if (directEffectLocation && hasClassification) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.mixesResultClassificationAndImmediateEffects",
      { actionId, stepLabel: processStepLabel(step) },
      directEffectLocation.line
    ));
  }
}

function validateUnsupportedProcessLevelPartial(actionId: string, step: MarkVSpecProcessStep, diagnostics: MarkVSpecDiagnostic[]): void {
  if (isPartialRequestStep(step.name)) {
    return;
  }

  for (const detail of step.details.filter((candidate) => candidate.key === "partial")) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} process step ${processStepLabel(step)} has unsupported process-level partial ${detail.value}. Put returned partial content under Effects display.partial on the response case.`,
      line: detail.location.line
    });
  }
}

function validateProcessBusinessRulePlacement(actionId: string, step: MarkVSpecProcessStep, diagnostics: MarkVSpecDiagnostic[]): void {
  for (const detail of step.receives) {
    if (isBusinessRuleDetailKey(detail.key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${processStepLabel(step)} receive entry ${detail.key}: ${detail.value} is not allowed. Put business rule: under case: business-rule-violation.`,
        line: detail.location.line
      });
    }
  }

  for (const detail of step.results) {
    if (isBusinessRuleDetailKey(detail.key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${processStepLabel(step)} result entry ${detail.key}: ${detail.value} is not allowed. Put business rule: under case: business-rule-violation.`,
        line: detail.location.line
      });
    }
  }
}

function validateBusinessRuleOutcomeCaseName(
  actionId: string,
  step: MarkVSpecProcessStep | undefined,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (outcome.businessRules.length === 0 || outcome.result === "business-rule-violation") {
    return;
  }

  const context = step ? `process step ${processStepLabel(step)} case ${outcome.result}` : `case ${outcome.result}`;
  diagnostics.push({
    severity: "warning",
    message: `Action ${actionId} ${context} declares business rule ${outcome.businessRules.join(", ")}. Use case: business-rule-violation for business rule violations.`,
    line: firstPropertyLine(outcome, "business rule") ?? firstPropertyLine(outcome, "business rules") ?? outcome.location?.line ?? step?.location.line
  });
}

function isBusinessRuleDetailKey(key: string): boolean {
  return key === "business rule" || key === "business rules";
}

function validateProcessCaseFlowPlacement(
  actionId: string,
  step: MarkVSpecProcessStep,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (outcome.flowDirectives.length === 0) {
    return;
  }

  for (const directive of outcome.flowDirectives) {
    if (directive.underEffects) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${step.name} case ${outcome.result} has ${directive.value} under Effects. Put ${directive.value} directly under the case as the final entry.`,
        line: directive.location.line
      });
    }
  }

  const flowValues = new Set(outcome.flowDirectives.map((directive) => directive.value));
  if (flowValues.size > 1) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} process step ${step.name} case ${outcome.result} has both stop and continue. Use only one flow directive.`,
      line: outcome.flowDirectives[1]?.location.line ?? outcome.flowDirectives[0]?.location.line ?? outcome.location?.line ?? step.location.line
    });
  }

  for (const directive of outcome.flowDirectives) {
    const laterEntry = processCaseEntryLocations(outcome, directive)
      .filter((location) => location.line > directive.location.line)
      .sort((left, right) => left.line - right.line)[0];
    if (laterEntry) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${step.name} case ${outcome.result} has entries after ${directive.value}. Put ${directive.value} as the final entry in the case.`,
        line: laterEntry.line
      });
    }
  }
}

function validateSuspiciousProcessCaseResponse(
  actionId: string,
  step: MarkVSpecProcessStep,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!outcome.response || step.receives.some((detail) => detail.key === "response")) {
    return;
  }

  diagnostics.push(createMarkVSpecDiagnostic(
    "warning",
    "action.process.caseResponseWithoutReceive",
    { actionId, stepLabel: processStepLabel(step), result: outcome.result },
    outcome.response.location.line
  ));
}

function processCaseEntryLocations(outcome: MarkVSpecActionOutcome, currentDirective: { location: SourceLocation }): SourceLocation[] {
  const locations: SourceLocation[] = [];
  for (const [key, entries] of Object.entries(outcome.propertyLocations)) {
    if (key !== "flow") {
      locations.push(...entries);
    }
  }
  locations.push(...outcome.flowDirectives
    .filter((directive) => directive.location !== currentDirective.location)
    .map((directive) => directive.location));
  if (outcome.display) {
    locations.push(outcome.display.location);
    for (const entries of Object.values(outcome.display.propertyLocations)) {
      locations.push(...entries);
    }
  }
  for (const routeParam of outcome.routeParams) {
    locations.push(routeParam.location);
  }
  return locations;
}

function processExecutionDetails(step: MarkVSpecProcessStep): { name: string; location: SourceLocation }[] {
  const details = new Map<string, SourceLocation>();
  const normalizedStep = normalizeProcessName(step.name);

  if ((normalizedStep === "httprequest" || normalizedStep === "http request") && step.details.some((detail) => detail.key === "request")) {
    const request = step.details.find((detail) => detail.key === "request");
    if (request) {
      details.set("request", request.location);
    }
  }

  if ((normalizedStep === "servercall" || normalizedStep === "server call") && step.details.length > 0) {
    details.set("server", step.details[0]?.location ?? step.location);
  }

  for (const detail of step.details) {
    const root = processExecutionDetailRoot(detail.key);
    if (!root || root === "params") {
      continue;
    }

    details.set(root, details.get(root) ?? detail.location);
  }

  for (const [key, locations] of Object.entries(step.propertyLocations)) {
    if (!key.startsWith("detail ")) {
      continue;
    }

    const name = key.slice("detail ".length).trim();
    const location = locations[0];
    if (name && location) {
      details.set(name, details.get(name) ?? location);
    }
  }

  return [...details.entries()].map(([name, location]) => ({ name, location }));
}

function processExecutionDetailRoot(key: string): string | undefined {
  const root = key.split(".")[0]?.trim();
  if (!root) {
    return undefined;
  }

  if (["request", "server", "sync", "call"].includes(root)) {
    return root === "call" ? "server" : root;
  }

  if (key.includes(".")) {
    return root;
  }

  return undefined;
}

function normalizeProcessName(name: string): string {
  return name.trim().replace(/\s+/gu, " ").toLowerCase();
}

function firstDirectProcessEffectLocation(step: MarkVSpecProcessStep): SourceLocation | undefined {
  return [
    firstPropertyLocation(step, "state"),
    firstPropertyLocation(step, "navigate"),
    firstPropertyLocation(step, "model"),
    firstPropertyLocation(step, "view"),
    firstPropertyLocation(step, "target"),
    firstPropertyLocation(step, "mode"),
    firstPropertyLocation(step, "fragment"),
    firstPropertyLocation(step, "content"),
    step.display?.location
  ]
    .filter((location): location is SourceLocation => Boolean(location))
    .sort((a, b) => a.line - b.line)[0];
}

function validateProcessStepReferences(
  actionId: string,
  step: MarkVSpecProcessStep,
  validationIds: Set<string>,
  errorCodeIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const detail of step.details) {
    if (detail.key === "validation" || detail.key === "validate") {
      for (const validationId of splitReferenceList(detail.value)) {
        const resultReference = parseValidationResultReference(validationId);
        const referencedValidationId = resultReference ?? validationId;
        if (!validationIds.has(referencedValidationId)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${actionId} process step ${step.name} references missing validation ${referencedValidationId}.`,
            line: detail.location.line
          });
        } else if (validationId.startsWith("V-") && !resultReference) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${actionId} process step ${step.name} should reference ${validationId}.result when consuming validation results.`,
            line: detail.location.line
          });
        }
      }
    }
    if (detail.key === "error code" || detail.key === "error codes") {
      for (const errorCode of splitReferenceList(detail.value)) {
        if (!errorCodeIds.has(errorCode)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${actionId} process step ${step.name} references missing error code ${errorCode}.`,
            line: detail.location.line
          });
        }
      }
    }
  }
}

function validateProcessDataReferences(
  actionId: string,
  step: MarkVSpecProcessStep,
  actionIds: Set<string>,
  processMarkersByAction: Map<string, Set<string>>,
  layoutIds: Set<string>,
  elementIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const detail of [...step.inputs, ...step.receives]) {
    const sourceId = requestParamSourceId(detail.value);
    if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId) && !actionIds.has(sourceId)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} process step ${processStepLabel(step)} ${detail.key} references missing source ${sourceId}.`,
        line: detail.location.line
      });
      continue;
    }

    const processOutput = parseProcessOutputReference(detail.value);
    if (processOutput) {
      if (!actionIds.has(processOutput.actionId)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${processStepLabel(step)} references missing action ${processOutput.actionId}.`,
          line: detail.location.line
        });
      } else if (!processMarkersByAction.get(processOutput.actionId)?.has(processOutput.marker)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${processStepLabel(step)} references missing process marker ${processOutput.marker}.`,
          line: detail.location.line
        });
      }
    }
  }
}

function isCanonicalProcessParamDetail(step: MarkVSpecProcessStep, detail: MarkVSpecProcessStepDetail): boolean {
  if (isHttpRequestStep(step.name) && detail.key !== "request") {
    return true;
  }
  return detail.key.includes(".params.");
}

function validateDisplayPartialEffect(
  actionId: string,
  context: string,
  display: MarkVSpecActionOutcome["display"],
  layoutIds: Set<string>,
  elementIds: Set<string>,
  layoutsById: Map<string, MarkVSpecLayoutGroup>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!display?.partial) {
    return;
  }

  const partialLine = firstPropertyLine(display, "partial") ?? display.location.line;
  const targetLine = firstPropertyLine(display, "target") ?? display.location.line;
  const target = display.target;

  if (display.element) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.partial ${display.partial} cannot be combined with display.element ${display.element}. Use exactly one display content source.`,
      line: firstPropertyLine(display, "element") ?? partialLine
    });
  }

  if (display.message) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.partial ${display.partial} cannot be combined with display.message ${display.message}. Use exactly one display content source.`,
      line: firstPropertyLine(display, "message") ?? partialLine
    });
  }

  if (!partialIdRegex.test(display.partial)) {
    return;
  }

  if (!target) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display.partial ${display.partial} requires target to reference an L-* partial host.`,
      line: partialLine
    });
    return;
  }

  if (!layoutIds.has(target)) {
    const targetKind = elementIds.has(target) ? "element" : "missing layout";
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display.partial ${display.partial} targets ${target}, but target must be an existing L-* partial host (${targetKind}).`,
      line: targetLine
    });
    return;
  }

  const targetLayout = layoutsById.get(target);
  const targetPartialId = targetLayout?.partial?.id;
  if (!targetPartialId) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display.partial ${display.partial} targets ${target}, but layout ${target} is not a partial host with partial.id.`,
      line: targetLine
    });
    return;
  }

  if (targetPartialId !== display.partial) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display.partial ${display.partial} targets ${target}, but layout ${target} declares partial.id ${targetPartialId}.`,
      line: partialLine
    });
  }
}

function validateDisplayEffect(
  actionId: string,
  context: string,
  display: MarkVSpecActionOutcome["display"],
  layoutIds: Set<string>,
  elementIds: Set<string>,
  layoutsById: Map<string, MarkVSpecLayoutGroup>,
  elementsById: Map<string, MarkVSpecElement>,
  validationsById: Map<string, MarkVSpecParseResult["validations"][number]>,
  rulesById: Map<string, MarkVSpecParseResult["rules"][number]>,
  layoutIdsByViewport: Map<string, Set<string>>,
  diagnostics: MarkVSpecDiagnostic[],
  referencedPartialIds: Map<string, SourceLocation>
): void {
  if (!display) {
    return;
  }
  const targetResolution = resolveDisplayTarget(display, { layoutIds, elementIds, elementsById });
  const target = display.target;
  if (targetResolution.kind === "none") {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect must define target.`,
      line: display.location.line
    });
  } else if (targetResolution.kind === "presentation-panel" && target) {
    diagnostics.push(presentationPanelTargetDiagnostic(`Action ${actionId} ${context} display effect`, target, firstPropertyLine(display, "target") ?? display.location.line));
  } else if (targetResolution.kind === "field-error") {
    const elementId = targetResolution.fieldErrorElementId;
    const element = targetResolution.fieldErrorElement;
    if (!elementId || !element) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} ${context} display effect targets missing field error element ${elementId ?? target}.`,
        line: firstPropertyLine(display, "target") ?? display.location.line
      });
    } else if (isInvalidFieldErrorElement(element)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} ${context} display effect targets ${target}, but ${elementId} is ${element.type}. Field error targets should use input elements.`,
        line: firstPropertyLine(display, "target") ?? display.location.line
      });
    }
  } else if (targetResolution.kind === "form-group" && target) {
    diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${actionId} ${context} display effect`, target, firstPropertyLine(display, "target") ?? display.location.line));
  } else if (targetResolution.kind === "missing-local" && target) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect targets missing layout or element ${target}.`,
      line: firstPropertyLine(display, "target") ?? display.location.line
    });
  } else if (targetResolution.kind === "layout" && target) {
    checkLayoutTargetViewportCoverage(
      target,
      layoutIdsByViewport,
      diagnostics,
      firstPropertyLine(display, "target") ?? display.location.line,
      `Action ${actionId} ${context} display effect targets layout`
    );
  }

  if (!display.element && !display.message && !display.partial) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect must define element, message, or partial. Use element: for authored UI, message: for a V-*.messages/R-*.messages reference, or partial: for a PRT-* partial document.`,
      line: display.location.line
    });
  } else if (display.element && display.message) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display effect defines both element and message. Use element: for rich UI or message: for simple validation text, but not both.`,
      line: firstPropertyLine(display, "message") ?? display.location.line
    });
  }

  validateDisplayPartialEffect(actionId, context, display, layoutIds, elementIds, layoutsById, diagnostics);

  if (display.element && (display.propertyLocations["element"]?.length ?? 0) > 1) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect must define exactly one element.`,
      line: firstPropertyLine(display, "element") ?? display.location.line
    });
  } else if (display.element && (!isLayoutItemId(display.element) || (!display.element.startsWith("E-") && !display.element.startsWith("L-")))) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect element must reference one E-* element or L-* layout.`,
      line: firstPropertyLine(display, "element") ?? display.location.line
    });
  } else if (display.element && !layoutIds.has(display.element) && !elementIds.has(display.element)) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect references missing element or layout ${display.element}.`,
      line: firstPropertyLine(display, "element") ?? display.location.line
    });
  } else if (display.element && layoutIds.has(display.element)) {
    checkLayoutTargetViewportCoverage(
      display.element,
      layoutIdsByViewport,
      diagnostics,
      firstPropertyLine(display, "element") ?? display.location.line,
      `Action ${actionId} ${context} display effect references layout`
    );
  }

  if (display.message) {
    validateDisplayMessage(actionId, context, display, validationsById, rulesById, diagnostics);
  }

  if (display.partial) {
    if ((display.propertyLocations["partial"]?.length ?? 0) > 1) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} ${context} display effect must define exactly one partial.`,
        line: firstPropertyLine(display, "partial") ?? display.location.line
      });
    } else if (!partialIdRegex.test(display.partial)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} ${context} display.partial ${display.partial} must use a PRT-* partial ID.`,
        line: firstPropertyLine(display, "partial") ?? display.location.line
      });
    } else {
      const partialLine = display.propertyLocations["partial"]?.[0] ?? display.location;
      collectPartialReference(display.partial, partialLine, referencedPartialIds);
    }
  }

  if (display.content) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display.content is not supported. Define an E-* or L-* object and reference it with element:.`,
      line: firstPropertyLine(display, "content") ?? display.location.line
    });
  }

  if (display.contentSource.length > 0) {
    for (const source of display.contentSource) {
      const propertyName = source.key === "elements" ? "display.elements" : `display.content.${source.key}`;
      const guidance = source.key === "elements"
        ? "Use singular element: with one E-* element or L-* layout."
        : "Define an E-* or L-* object and reference it with element:.";
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} ${context} ${propertyName} is not supported. ${guidance}`,
        line: source.location.line
      });
    }
  }

  for (const source of display.contentSource) {
    if (source.key === "partial") {
      collectPartialReference(source.value, source.location, referencedPartialIds);
    }
  }
}

function validateDisplayMessage(
  actionId: string,
  context: string,
  display: MarkVSpecActionOutcome["display"],
  validationsById: Map<string, MarkVSpecParseResult["validations"][number]>,
  rulesById: Map<string, MarkVSpecParseResult["rules"][number]>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!display?.message) {
    return;
  }

  const line = firstPropertyLine(display, "message") ?? display.location.line;
  const reference = parseDisplayMessageReference(display.message);
  if (!reference) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.message ${display.message} is not recognized. Use V-*.messages or R-*.messages.`,
      line
    });
    return;
  }

  const sourceId = reference.sourceId;
  if (reference.sourceKind === "validation") {
    const validation = validationsById.get(sourceId);
    if (!validation) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} ${context} display.message references missing validation ${sourceId}.`,
        line
      });
      return;
    }
    if (validationPropertyValues(validation, "marker").length === 0) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} ${context} display.message references validation ${sourceId}, but it defines no marker. Preview will use the validation ID as the display marker.`,
        line
      });
    }
    if (validationPropertyValues(validation, "message").length === 0) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} ${context} display.message references validation ${sourceId}, but it defines no message.`,
        line
      });
    }
    return;
  }

  const rule = rulesById.get(sourceId);
  if (!rule) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.message references missing business rule ${sourceId}.`,
      line
    });
    return;
  }
  if (validationPropertyValues(rule, "messages").length === 0 && validationPropertyValues(rule, "message").length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.message references business rule ${sourceId}, but it defines no message text.`,
      line
    });
  }
  if (validationPropertyValues(rule, "marker").length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} ${context} display.message references business rule ${sourceId}, but it defines no marker. Preview will use the business rule ID as the display marker.`,
      line
    });
  }
}

function validateDialogActions(
  element: MarkVSpecElement,
  elementsById: Map<string, MarkVSpecElement>,
  actionIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (element.type !== "Dialog") {
    return;
  }

  const actionButtonIds = commaListProperty(element, "actions");
  if (actionButtonIds.length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Dialog ${element.id} should define actions with at least one Button element.`,
      line: element.location.line
    });
    return;
  }

  for (const buttonId of actionButtonIds) {
    const button = elementsById.get(buttonId);
    if (!button) {
      diagnostics.push({
        severity: "error",
        message: `Dialog ${element.id} actions references missing button element ${buttonId}.`,
        line: firstPropertyLine(element, "actions") ?? element.location.line
      });
      continue;
    }
    if (button.type !== "Button") {
      diagnostics.push({
        severity: "warning",
        message: `Dialog ${element.id} actions should reference Button elements; ${buttonId} is ${button.type}.`,
        line: firstPropertyLine(element, "actions") ?? element.location.line
      });
      continue;
    }
    const action = stringProperty(button, "action");
    if (!action) {
      diagnostics.push({
        severity: "warning",
        message: `Dialog ${element.id} button ${buttonId} should reference an action.`,
        line: button.location.line
      });
    } else if (!actionIds.has(action)) {
      diagnostics.push({
        severity: "error",
        message: `Dialog ${element.id} button ${buttonId} references missing action ${action}.`,
        line: firstPropertyLine(button, "action") ?? button.location.line
      });
    }
  }
}

function validatePreviewScenarioCases(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const caseRef of scenario.cases) {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    if (!action) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing action ${caseRef.actionId}.`,
        line: caseRef.location.line
      });
      continue;
    }
    const step = action.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    if (!step) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing process marker ${caseRef.processMarker} on action ${caseRef.actionId}.`,
        line: caseRef.location.line
      });
      continue;
    }
    const outcome = step.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    if (!outcome) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing case ${caseRef.raw}.`,
        line: caseRef.location.line
      });
      continue;
    }
    if (scenario.state && outcome.to && !isExternalTransitionTarget(outcome.to) && outcome.to !== scenario.state) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} state ${scenario.state} does not match case ${caseRef.raw} state effect ${outcome.to}.`,
        line: caseRef.location.line
      });
    }
  }
}

function processStepLabel(step: MarkVSpecProcessStep): string {
  return step.marker ? `${step.marker} ${step.name}` : step.name;
}

function parseProcessOutputReference(value: string): { actionId: string; marker: string; kind: "result" | "response" } | undefined {
  const match = /^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]*)\.(result|response)$/u.exec(value.trim());
  if (!match) {
    return undefined;
  }
  return {
    actionId: match[1],
    marker: match[2],
    kind: match[3] as "result" | "response"
  };
}

function parseValidationResultReference(value: string): string | undefined {
  const match = validationResultReferenceRegex.exec(value.trim());
  return match?.[1];
}

function validateOutcomeErrorCodes(
  actionId: string,
  outcome: MarkVSpecActionOutcome,
  errorCodeIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  outcome.errorCodes.forEach((errorCode, index) => {
    if (!errorCodeIds.has(errorCode)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} case ${outcome.result} references missing error code ${errorCode}.`,
        line: outcome.propertyLocations["error code"]?.[index]?.line ?? outcome.propertyLocations["error codes"]?.[index]?.line ?? outcome.location?.line
      });
    }
  });
}

function validateOutcomeBusinessRules(
  actionId: string,
  outcome: MarkVSpecActionOutcome,
  ruleIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  outcome.businessRules.forEach((ruleId, index) => {
    if (!ruleIds.has(ruleId)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} case ${outcome.result} references missing business rule ${ruleId}.`,
        line: outcome.propertyLocations["business rule"]?.[index]?.line ?? outcome.propertyLocations["business rules"]?.[index]?.line ?? outcome.location?.line
      });
    }
  });
}

function validateOutcomeTransitionTarget(
  outcome: MarkVSpecActionOutcome,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!outcome.to || isExternalTransitionTarget(outcome.to) || stateNames.has(outcome.to)) {
    return;
  }

  diagnostics.push({
    severity: "error",
    message: `Transition references missing target state ${outcome.to}.`,
    line: firstPropertyLine(outcome, "state") ?? firstPropertyLine(outcome, "navigate") ?? outcome.location?.line ?? 1
  });
}

function validateLayoutGroups(
  groups: MarkVSpecLayoutGroup[],
  layoutIdsByViewport: Map<string, Set<string>>,
  elementIds: Set<string>,
  localIds: Set<string>,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const group of groups) {
    validatePresentationPanelProperties(group, diagnostics);
    if (group.kind && !layoutKinds.has(group.kind)) {
      diagnostics.push(layoutKindDiagnostic(group));
    }
    validateLayoutPartialProperties(group, stateNames, diagnostics);

    for (const item of group.items) {
      if (item.type === "contains" && !(layoutIdsByViewport.get(group.viewport)?.has(item.targetId)) && !elementIds.has(item.targetId)) {
        diagnostics.push({
          severity: "error",
          message: `Layout ${group.id} contains missing target ${item.targetId}.`,
          line: item.location.line
        });
      } else if (item.type === "field" && !elementIds.has(item.elementId)) {
        diagnostics.push({
          severity: "error",
          message: `Field ${item.label} references missing element ${item.elementId}.`,
          line: item.location.line
        });
      } else if (item.type === "property" && isConditionProperty(item.key)) {
        checkConditionReferences(item.value, localIds, diagnostics, item.location.line, "warning");
      } else if (item.type === "flag" && item.scope === "items" && !isLayoutItemId(item.value)) {
        diagnostics.push({
          severity: "warning",
          message: `Layout ${group.id} has unsupported Items entry: ${item.value}.`,
          line: item.location.line
        });
      }
    }
  }
}

function validatePresentationPanelProperties(
  group: MarkVSpecLayoutGroup,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!isPresentationPanelId(group.id)) {
    return;
  }

  const markerLine = firstPropertyLine(group, "marker");
  if (markerLine !== undefined) {
    diagnostics.push({
      severity: "warning",
      message: `Presentation panel ${group.id} ignores marker. Use an L-* Layout when a layout marker is needed.`,
      line: markerLine
    });
  }

  if (group.partial) {
    diagnostics.push({
      severity: "error",
      message: `Presentation panel ${group.id} cannot host a partial. Use an L-* Layout for partial hosts.`,
      line: firstPropertyLine(group, "partial") ?? group.location.line
    });
  }

  for (const key of ["visible when", "hidden when", "disabled when", "enabled when"]) {
    const lines = group.propertyLocations[key] ?? [];
    for (const location of lines) {
      diagnostics.push({
        severity: "error",
        message: `Presentation panel ${group.id} cannot use ${key}. Use an L-* Layout when visibility or disabled control is needed.`,
        line: location.line
      });
    }
  }
}

function presentationPanelTargetDiagnostic(context: string, target: string, line: number | undefined): MarkVSpecDiagnostic {
  return {
    severity: "error",
    message: `${context} cannot target presentation panel ${target}. Use an L-* Layout when a targetable layout is needed.`,
    line
  };
}

function formGroupUpdateTargetDiagnostic(context: string, target: string, line: number | undefined): MarkVSpecDiagnostic {
  return {
    severity: "error",
    message: `${context} cannot target FormGroup ${target}. Use an L-* layout target for updates.`,
    line
  };
}

function validateLayoutPartialProperties(
  group: MarkVSpecLayoutGroup,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (group.partial) {
    const partialId = group.partial.id;
    if (!partialId) {
      diagnostics.push({
        severity: "error",
        message: `Layout ${group.id} partial block must define id.`,
        line: firstPropertyLine(group, "partial") ?? group.location.line
      });
    } else if (!partialIdRegex.test(partialId)) {
      diagnostics.push({
        severity: "error",
        message: `Layout ${group.id} partial id must use a PRT-* partial ID.`,
        line: firstPropertyLine(group, "partial id") ?? group.location.line
      });
    }

    for (const [screenState, partialState] of Object.entries(group.partial.states)) {
      validateScreenStateName(group, screenState, stateNames, firstPropertyLine(group, `partial states ${screenState}`) ?? group.location.line, diagnostics);
      if (!partialState.trim()) {
        diagnostics.push({
          severity: "warning",
          message: `Layout ${group.id} partial state mapping has an empty partial state.`,
          line: firstPropertyLine(group, `partial states ${screenState}`) ?? group.location.line
        });
      }
    }
  }

}

function validateScreenStateName(
  group: MarkVSpecLayoutGroup,
  stateName: string,
  stateNames: Set<string>,
  line: number | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (stateNames.size > 0 && !stateNames.has(stateName)) {
    diagnostics.push({
      severity: "warning",
      message: `Layout ${group.id} partial state mapping references missing screen state ${stateName}.`,
      line
    });
  }
}

function requestParamSourceId(source: string): string | undefined {
  if (isOpaqueExpression(source)) {
    return undefined;
  }
  const match = requestParamSourceIdRegex.exec(source);
  return match?.[1];
}

function checkDuplicates<T extends { id: string; location: SourceLocation }>(
  items: T[],
  label: string,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (seen.has(item.id)) {
      diagnostics.push({
        severity: "error",
        message: `Duplicate ${label} ID: ${item.id}.`,
        line: item.location.line
      });
    } else {
      seen.set(item.id, item);
    }
  }
}

function mapLayoutIdsByViewport(groups: MarkVSpecLayoutGroup[]): Map<string, Set<string>> {
  const idsByViewport = new Map<string, Set<string>>();
  for (const group of groups) {
    const ids = idsByViewport.get(group.viewport) ?? new Set<string>();
    ids.add(group.id);
    idsByViewport.set(group.viewport, ids);
  }
  return idsByViewport;
}

function checkDuplicateLayoutGroups(groups: MarkVSpecLayoutGroup[], diagnostics: MarkVSpecDiagnostic[]): void {
  const seen = new Map<string, MarkVSpecLayoutGroup>();
  for (const group of groups) {
    const key = `${group.viewport}\u001f${group.id}`;
    if (seen.has(key)) {
      diagnostics.push({
        severity: "error",
        message: `Duplicate layout ID in ${group.viewport}: ${group.id}.`,
        line: group.location.line
      });
    } else {
      seen.set(key, group);
    }
  }
}

function checkDuplicateLayoutMarkers(groups: MarkVSpecLayoutGroup[], diagnostics: MarkVSpecDiagnostic[]): void {
  const seen = new Map<string, string>();
  for (const group of groups) {
    const marker = group.properties["marker"]?.trim();
    if (!marker) {
      continue;
    }

    const key = `${group.viewport}\u001f${marker}`;
    const existingId = seen.get(key);
    if (existingId) {
      diagnostics.push({
        severity: "warning",
        message: `Duplicate layout marker ${marker} in ${group.viewport}: ${existingId} and ${group.id}.`,
        line: firstPropertyLine(group, "marker") ?? group.location.line
      });
    } else {
      seen.set(key, group.id);
    }
  }
}

function checkConsistentLayoutMarkers(groups: MarkVSpecLayoutGroup[], diagnostics: MarkVSpecDiagnostic[]): void {
  const markerById = new Map<string, string>();
  for (const group of groups) {
    const marker = group.properties["marker"]?.trim() || group.id;
    const existingMarker = markerById.get(group.id);
    if (existingMarker && existingMarker !== marker) {
      diagnostics.push({
        severity: "warning",
        message: `Layout ${group.id} uses inconsistent markers across viewports: ${existingMarker} and ${marker}.`,
        line: firstPropertyLine(group, "marker") ?? group.location.line
      });
    } else {
      markerById.set(group.id, marker);
    }
  }
}

function checkMarkers(
  items: Array<{ id: string; marker?: string; location: SourceLocation }>,
  label: string,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const item of items) {
    const marker = item.marker?.trim();
    if (!marker || markerRegex.test(marker)) {
      continue;
    }

    diagnostics.push({
      severity: "warning",
      message: `Invalid ${label} marker ${marker} on ${item.id}. Use 1-12 ASCII letters, numbers, underscores, or hyphens, starting with a letter or number.`,
      line: item.location.line
    });
  }
}

function checkLayoutTargetViewportCoverage(
  layoutId: string,
  layoutIdsByViewport: Map<string, Set<string>>,
  diagnostics: MarkVSpecDiagnostic[],
  line: number,
  context: string
): void {
  const missingViewports = [...layoutIdsByViewport]
    .filter(([, ids]) => !ids.has(layoutId))
    .map(([viewport]) => viewport);
  if (missingViewports.length === 0) {
    return;
  }

  diagnostics.push({
    severity: "warning",
    message: `${context} ${layoutId}, but it is missing from viewport${missingViewports.length === 1 ? "" : "s"} ${missingViewports.join(", ")}.`,
    line
  });
}

function checkDuplicateMarkers(
  items: Array<{ id: string; marker?: string; location: SourceLocation }>,
  label: string,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    const marker = item.marker?.trim();
    if (!marker) {
      continue;
    }

    const existingId = seen.get(marker);
    if (existingId) {
      diagnostics.push({
        severity: "warning",
        message: `Duplicate ${label} marker ${marker}: ${existingId} and ${item.id}.`,
        line: item.location.line
      });
    } else {
      seen.set(marker, item.id);
    }
  }
}

function checkConditionReferences(
  condition: string,
  localIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[],
  line: number,
  severity: MarkVSpecDiagnosticSeverity
): void {
  const references = stripOpaqueExpressions(condition).match(conditionReferenceRegex) ?? [];
  for (const reference of references) {
    if (!localIds.has(reference)) {
      diagnostics.push({
        severity,
        message: `Condition references missing ID ${reference}.`,
        line
      });
    }
  }
}

function validateViewContexts(
  result: MarkVSpecParseResult,
  viewContextNames: Set<string>,
  viewContextSampleNames: Set<string>,
  stateNames: Set<string>,
  elementsById: Map<string, MarkVSpecElement>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const viewContextByName = new Map(result.viewContexts.map((context) => [context.name, context]));

  for (const sample of result.viewContextSamples) {
    for (const [name, value] of Object.entries(sample.values)) {
      const definition = viewContextByName.get(name);
      if (!definition) {
        diagnostics.push({
          severity: "error",
          message: `View Context Sample ${sample.name} references missing view context ${name}.`,
          line: sample.valueLocations[name]?.[0]?.line ?? sample.location.line
        });
        continue;
      }

      if (!definition.values.some((candidate) => candidate.value === value)) {
        diagnostics.push({
          severity: "error",
          message: `View Context Sample ${sample.name} sets ${name} to unsupported value ${value}.`,
          line: sample.valueLocations[name]?.[0]?.line ?? sample.location.line
        });
      }
    }
  }

  if (result.previewScenarios.length > 0) {
    const scenarioNames = new Set(result.previewScenarios.map((scenario) => scenario.name));
    for (const scenario of result.previewScenarios) {
      const scenarioNameIsStateName = stateNames.has(scenario.name);
      const isBaselineStateSample = scenarioNameIsStateName && !scenario.state;
      if (isBaselineStateSample) {
        validateBaselinePreviewScenario(scenario, diagnostics);
      } else if (!scenario.state) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "error",
          "previewScenario.missingState",
          { scenario: scenario.name },
          scenario.location.line
        ));
      } else if (!stateNames.has(scenario.state)) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} references missing state ${scenario.state}.`,
          line: firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      } else if (scenarioNameIsStateName && scenario.state === scenario.name) {
        diagnostics.push({
          severity: "warning",
          message: `Preview Scenario ${scenario.name} matches a state name and repeats state: ${scenario.state}. Omit state: to define baseline state samples.`,
          line: firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      } else if (scenarioNameIsStateName && scenario.state !== scenario.name) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} matches a state name but references state ${scenario.state}. Use a different scenario name or omit state: for baseline state samples.`,
          line: firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      }

      if (scenario.view && !viewContextSampleNames.has(scenario.view)) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} references missing view context sample ${scenario.view}.`,
          line: firstPropertyLine(scenario, "view") ?? scenario.location.line
        });
      }

      if (scenario.before) {
        if (scenario.before === scenario.name) {
          diagnostics.push({
            severity: "error",
            message: `Preview Scenario ${scenario.name} before target cannot reference itself.`,
            line: firstPropertyLine(scenario, "before") ?? scenario.location.line
          });
        } else if (!stateNames.has(scenario.before) && !scenarioNames.has(scenario.before)) {
          diagnostics.push({
            severity: "error",
            message: `Preview Scenario ${scenario.name} references missing before target ${scenario.before}.`,
            line: firstPropertyLine(scenario, "before") ?? scenario.location.line
          });
        }
      }

      validatePreviewScenarioCases(scenario, result, diagnostics);
      validatePreviewScenarioSamples(scenario, elementsById, diagnostics);
    }
  }

  validateDataSourceSampleRows(result, diagnostics);
  validateConditionNamespaces(result, viewContextNames, stateNames, diagnostics);
  validateViewContextActionEffects(result, viewContextByName, diagnostics);
}

function validateBaselinePreviewScenario(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const disallowedProperties = Object.keys(scenario.properties).filter((key) => key !== "samples");
  for (const key of disallowedProperties) {
    diagnostics.push({
      severity: "error",
      message: `Preview Scenario ${scenario.name} is a baseline state sample and cannot define ${key}. Use samples only, or add state: with a distinct scenario name for an additional preview variant.`,
      line: firstPropertyLine(scenario, key) ?? scenario.location.line
    });
  }

  if (scenario.cases.length > 0) {
    diagnostics.push({
      severity: "error",
      message: `Preview Scenario ${scenario.name} is a baseline state sample and cannot define cases. Use samples only, or add state: with a distinct scenario name for an additional preview variant.`,
      line: scenario.cases[0]?.location.line ?? scenario.location.line
    });
  }
}

function validateTemplateScreenTopLevelLayouts(result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  if (result.screen.type !== "screen" || (!result.screen.template && !result.screen.templateSrc)) {
    return;
  }

  for (const group of result.layoutGroups) {
    const sectionLabel = group.viewport ? `## Layout: ${group.viewport}` : "## Layout";
    diagnostics.push({
      severity: "warning",
      message: `Screen ${result.screen.id ?? "screen"} references a template but defines top-level ${sectionLabel}. Use canonical ## Slot:<name> / ## Slot:<name>:<viewport> sections for template content; top-level Layout sections are ignored in composed screen preview.`,
      line: group.location.line
    });
  }
}

function validatePreviewScenarioSamples(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  elementsById: Map<string, MarkVSpecElement>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const sample of scenario.samples) {
    const element = elementsById.get(sample.elementId);
    if (!element) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "error",
        "previewScenario.samplesMissingElement",
        { scenario: scenario.name, elementId: sample.elementId },
        sample.location.line
      ));
      continue;
    }
    if (sample.rows && element.type !== "Table" && element.type !== "List") {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} rows sample target ${sample.elementId} must be a Table or List element.`,
        line: sample.rows.location.line
      });
    }
    if (sample.value !== undefined && (element.type === "Table" || element.type === "List")) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} scalar sample target ${sample.elementId} should not be a Table or List element. Use rows instead.`,
        line: sample.location.line
      });
    }
  }
}

function validateDataSourceSampleRows(
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const scenarioRowElementIds = new Set(
    result.previewScenarios.flatMap((scenario) => scenario.samples.filter((sample) => sample.rows).map((sample) => sample.elementId))
  );
  for (const element of result.elements) {
    if (element.type !== "Table" && element.type !== "List") {
      continue;
    }
    if (element.properties["source"] !== "data") {
      continue;
    }
    if (element.sampleRows || scenarioRowElementIds.has(element.id)) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} source data should define sample rows or Preview Scenario rows.`,
      line: firstPropertyLine(element, "source") ?? element.location.line
    });
  }
}

function validateConditionNamespaces(
  result: MarkVSpecParseResult,
  viewContextNames: Set<string>,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const check = (condition: string, line: number): void => {
    for (const reference of condition.matchAll(/\$\{(state|view)\.([^}]+)\}/gu)) {
      const [, namespace, name] = reference;
      const trimmed = name.trim();
      if (namespace === "state" && !stateNames.has(trimmed)) {
        diagnostics.push({
          severity: "error",
          message: `Condition references missing state ${trimmed}.`,
          line
        });
      }
      if (namespace === "view" && !viewContextNames.has(trimmed)) {
        diagnostics.push({
          severity: "error",
          message: `Condition references missing view context ${trimmed}.`,
          line
        });
      }
    }
  };

  for (const element of result.elements) {
    for (const [key, conditions] of [
      ["visible when", element.visibleWhen],
      ["hidden when", element.hiddenWhen],
      ["disabled when", element.disabledWhen]
    ] as const) {
      conditions.forEach((condition, index) => check(condition, element.propertyLocations[key]?.[index]?.line ?? element.location.line));
    }
  }
  for (const layout of [...result.layoutGroups, ...result.slotContents.flatMap((slot) => slot.layoutGroups)]) {
    for (const key of ["visible when", "hidden when", "disabled when", "enabled when", "selected when", "active when"]) {
      layoutPropertyValues(layout, key).forEach((value, index) => check(value, layout.propertyLocations[key]?.[index]?.line ?? layout.location.line));
    }
  }
}

function layoutPropertyValues(group: MarkVSpecLayoutGroup, key: string): string[] {
  const values = group.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "");
  if (values.length > 0) {
    return values;
  }
  const value = group.properties[key];
  return typeof value === "string" ? [value] : [];
}

function validateViewContextActionEffects(
  result: MarkVSpecParseResult,
  viewContextByName: Map<string, MarkVSpecViewContextDefinition>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const check = (sideEffect: string, line: number | undefined): void => {
    const match = /^view:\s*\$\{view\.([^}]+)\}\s*=\s*(.+)$/u.exec(sideEffect.trim());
    if (!match) {
      return;
    }

    const [, name, rawValue] = match;
    const value = rawValue.trim();
    const definition = viewContextByName.get(name.trim());
    if (!definition) {
      diagnostics.push({
        severity: "error",
        message: `View effect references missing view context ${name.trim()}.`,
        line
      });
      return;
    }

    if (!definition.values.some((candidate) => candidate.value === value)) {
      diagnostics.push({
        severity: "error",
        message: `View effect sets ${name.trim()} to unsupported value ${value}.`,
        line
      });
    }
  };

  for (const action of result.actions) {
    for (const outcome of action.outcomes) {
      outcome.sideEffects.forEach((sideEffect, index) => {
        check(sideEffect, outcome.propertyLocations["view"]?.[index]?.line ?? outcome.location?.line);
      });
    }
    for (const step of action.processSteps) {
      step.sideEffects.forEach((sideEffect, index) => {
        check(sideEffect, step.propertyLocations["view"]?.[index]?.line ?? step.location.line);
      });
      for (const outcome of step.outcomes) {
        outcome.sideEffects.forEach((sideEffect, index) => {
          check(sideEffect, outcome.propertyLocations["view"]?.[index]?.line ?? outcome.location?.line);
        });
      }
    }
  }
}

function isConditionProperty(key: string): boolean {
  return key === "visible when" || key === "hidden when" || key === "disabled when" || key === "enabled when";
}

function isExternalTransitionTarget(value: string): boolean {
  return value.startsWith("SCR-") || value.startsWith("/") || /^https?:\/\//.test(value);
}

function layoutKindDiagnostic(group: MarkVSpecLayoutGroup): MarkVSpecDiagnostic {
  if (group.kind === "region") {
    return {
      severity: "error",
      message: "Layout kind region is no longer supported. Use stack, row, grid, or inline.",
      line: group.location.line
    };
  }

  return {
    severity: "warning",
    message: `Unknown layout kind: ${group.kind}.`,
    line: group.location.line
  };
}

function isHttpRequestStep(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "http request" || normalized === "httprequest";
}

function isPartialRequestStep(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "partial request" || normalized === "partialrequest";
}

function isImmediateStep(name: string): boolean {
  return name.trim().replace(/\s+/g, " ").toLowerCase() === "immediate";
}

function isResolveStep(name: string): boolean {
  return name.trim().replace(/\s+/g, " ").toLowerCase().startsWith("resolve");
}

function validateRouteParameterReferences(result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  if (result.screen.type !== "screen") {
    return;
  }

  const declared = extractRoutePlaceholders(result.screen.route ?? "");
  const reported = new Set<string>();

  const checkValue = (value: unknown, line: number | undefined): void => {
    if (typeof value !== "string") {
      return;
    }
    for (const match of value.matchAll(/\$\{\s*route\.([A-Za-z][A-Za-z0-9_-]*)\s*\}/gu)) {
      const name = match[1];
      if (declared.has(name)) {
        continue;
      }
      const key = `${name}:${line ?? ""}`;
      if (reported.has(key)) {
        continue;
      }
      reported.add(key);
      diagnostics.push({
        severity: "warning",
        message: `Route parameter reference \${route.${name}} does not match any :param in screen route.`,
        line
      });
    }
  };

  const checkProperties = (owner: { properties: Record<string, string | true | string[]>; propertyLocations: Record<string, SourceLocation[]> }): void => {
    for (const [key, value] of Object.entries(owner.properties)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkValue(item, owner.propertyLocations[key]?.[index]?.line ?? firstPropertyLine(owner, key)));
      } else {
        checkValue(value, firstPropertyLine(owner, key));
      }
    }
  };

  for (const group of result.layoutGroups) {
    checkProperties(group);
  }
  for (const slot of result.slotDefinitions) {
    checkProperties(slot);
  }
  for (const slotContent of result.slotContents) {
    for (const group of slotContent.layoutGroups) {
      checkProperties(group);
    }
  }

  for (const element of result.elements) {
    checkProperties(element);
    for (const option of element.selectOptions) {
      checkValue(option.source, option.location.line);
    }
    for (const column of element.tableColumns) {
      checkValue(column.source, column.location.line);
      for (const metadata of column.metadata ?? []) {
        checkValue(metadata.value, metadata.location.line);
      }
    }
    for (const row of element.tableRows) {
      for (const cell of row.cells) {
        checkValue(cell.value, cell.location.line);
      }
    }
    for (const rule of element.inputRules) {
      checkValue(rule.value, rule.location.line);
    }
    for (const param of element.routeParams) {
      checkValue(param.source, param.location.line);
    }
  }

  for (const action of result.actions) {
    checkProperties(action);
    for (const param of action.routeParams) {
      checkValue(param.source, param.location.line);
    }
    for (const step of action.processSteps) {
      if (isHttpRequestStep(step.name)) {
        for (const detail of step.details.filter((detail) => detail.key !== "request")) {
          checkValue(detail.value, detail.location.line);
        }
      }
    }
    for (const outcome of action.outcomes) {
      for (const param of outcome.routeParams) {
        checkValue(param.source, param.location.line);
      }
      for (const sideEffect of outcome.sideEffects) {
        checkValue(sideEffect, firstPropertyLine(outcome, "side effect") ?? outcome.location?.line);
      }
    }
    for (const step of action.processSteps) {
      for (const detail of step.details) {
        checkValue(detail.value, detail.location.line);
      }
      for (const sideEffect of step.sideEffects) {
        checkValue(sideEffect, firstPropertyLine(step, "side effect") ?? step.location.line);
      }
      for (const outcome of step.outcomes) {
        if (outcome.response) {
          checkValue(outcome.response.definition, outcome.response.location.line);
        }
        for (const param of outcome.routeParams) {
          checkValue(param.source, param.location.line);
        }
        for (const sideEffect of outcome.sideEffects) {
          checkValue(sideEffect, firstPropertyLine(outcome, "side effect") ?? outcome.location?.line);
        }
      }
    }
  }

  for (const validation of result.validations) {
    checkProperties(validation);
    for (const bullet of validation.bullets) {
      checkValue(bullet.text, bullet.location.line);
    }
  }
  for (const rule of result.rules) {
    for (const bullet of rule.bullets) {
      checkValue(bullet.text, bullet.location.line);
    }
  }
  for (const errorCode of result.errorCodes) {
    checkProperties(errorCode);
    for (const bullet of errorCode.bullets) {
      checkValue(bullet.text, bullet.location.line);
    }
  }
}

function extractRoutePlaceholders(route: string): Set<string> {
  const placeholders = new Set<string>();
  for (const match of route.matchAll(/:([A-Za-z][A-Za-z0-9_-]*)/gu)) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function stringProperty(element: MarkVSpecElement, key: string): string {
  const value = element.properties[key];
  return typeof value === "string" ? value : "";
}

function firstStringProperty(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}

function commaListProperty(element: MarkVSpecElement, key: string): string[] {
  return stringProperty(element, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateSelectInitialValue(element: MarkVSpecElement, diagnostics: MarkVSpecDiagnostic[]): void {
  if (element.selectOptions.length === 0) {
    return;
  }
  const initialValue = stringProperty(element, "initial value").trim();
  if (!initialValue) {
    return;
  }

  const optionLabels = element.selectOptions.map((option) => option.label.trim());
  const optionLabelSet = new Set(optionLabels);
  const values = multiInitialValueOptionElementTypes.has(element.type)
    ? initialValue.split(",").map((value) => value.trim()).filter(Boolean)
    : [initialValue];

  for (const value of values) {
    if (optionLabelSet.has(value)) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} initial value "${value}" does not match any options.`,
      line: firstPropertyLine(element, "initial value") ?? element.location.line
    });
  }
}

function validateTabsElement(
  element: MarkVSpecElement,
  layoutIds: Set<string>,
  actionIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (element.type !== "Tabs") {
    return;
  }

  const active = stringProperty(element, "active").trim();
  if (active && !element.tabs.some((item) => item.label === active)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} active tab "${active}" does not match any items.`,
      line: firstPropertyLine(element, "active") ?? element.location.line
    });
  }

  for (const item of element.tabs) {
    if (item.panel && !layoutIds.has(item.panel)) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} tab item ${item.label} references missing panel ${item.panel}.`,
        line: item.propertyLocations.panel[0]?.line ?? item.location.line
      });
    }
    if (item.action && !actionIds.has(item.action)) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} tab item ${item.label} references missing action ${item.action}.`,
        line: item.propertyLocations.action[0]?.line ?? item.location.line
      });
    }
  }
}

function validateAnchoredOverlayElement(
  element: MarkVSpecElement,
  elementIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (element.type !== "Popover" && element.type !== "Tooltip") {
    return;
  }

  const anchor = stringProperty(element, "anchor").trim();
  const line = firstPropertyLine(element, "anchor") ?? element.location.line;
  if (!anchor) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} ${element.type} requires anchor: E-*.`,
      line
    });
    return;
  }

  if (!new RegExp(String.raw`^${elementIdPattern}$`, "u").test(anchor)) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} anchor must reference an E-* element.`,
      line
    });
    return;
  }

  if (!elementIds.has(anchor)) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} anchor references missing element ${anchor}.`,
      line
    });
  }
}

function validateAccordionDisclosureElement(
  element: MarkVSpecElement,
  layoutIds: Set<string>,
  actionIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (element.type === "Accordion") {
    const open = stringProperty(element, "open").trim();
    if (open && !element.accordionItems.some((item) => item.label === open)) {
      diagnostics.push({
        severity: "warning",
        message: `Element ${element.id} open item "${open}" does not match any items.`,
        line: firstPropertyLine(element, "open") ?? element.location.line
      });
    }

    for (const item of element.accordionItems) {
      if (item.panel && !layoutIds.has(item.panel)) {
        diagnostics.push({
          severity: "error",
          message: `Element ${element.id} accordion item ${item.label} references missing panel ${item.panel}.`,
          line: item.propertyLocations.panel[0]?.line ?? item.location.line
        });
      }
      if (item.action && !actionIds.has(item.action)) {
        diagnostics.push({
          severity: "error",
          message: `Element ${element.id} accordion item ${item.label} references missing action ${item.action}.`,
          line: item.propertyLocations.action[0]?.line ?? item.location.line
        });
      }
    }
    return;
  }

  if (element.type !== "Disclosure") {
    return;
  }

  const open = stringProperty(element, "open").trim();
  if (open && !["true", "false"].includes(open.toLowerCase())) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} Disclosure open must be true or false.`,
      line: firstPropertyLine(element, "open") ?? element.location.line
    });
  }

  const panel = stringProperty(element, "panel").trim();
  if (!panel) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} Disclosure requires panel: L-*.`,
      line: element.location.line
    });
    return;
  }

  if (!layoutIds.has(panel)) {
    diagnostics.push({
      severity: "error",
      message: `Element ${element.id} references missing panel ${panel}.`,
      line: firstPropertyLine(element, "panel") ?? element.location.line
    });
  }
}

function firstPropertyLine(
  owner: { propertyLocations: Record<string, SourceLocation[]> },
  key: string
): number | undefined {
  return owner.propertyLocations[key]?.[0]?.line;
}

function firstPropertyLocation(
  owner: { propertyLocations: Record<string, SourceLocation[]> },
  key: string
): SourceLocation | undefined {
  return owner.propertyLocations[key]?.[0];
}

function firstOutcomeLine(outcome: MarkVSpecActionOutcome): number | undefined {
  return ["description", "response", "request", "target", "mode", "fragment", "content", "side effect", "from", "state", "navigate", "business rule", "business rules", "error code", "error codes", "flow"]
    .map((key) => firstPropertyLine(outcome, key))
    .find((line): line is number => typeof line === "number") ?? outcome.routeParams[0]?.location.line;
}

function hasActionOutcomeDetails(outcome: MarkVSpecActionOutcome): boolean {
  return Boolean(
    outcome.request ??
      outcome.response ??
      outcome.to ??
      outcome.description ??
      outcome.target ??
      outcome.mode ??
      outcome.fragment ??
      outcome.content ??
      outcome.display ??
      outcome.flow
  ) || outcome.sideEffects.length > 0 || outcome.businessRules.length > 0 || outcome.errorCodes.length > 0 || outcome.routeParams.length > 0;
}

function hasOutcomeDetailsThatRequireTransition(outcome: MarkVSpecActionOutcome): boolean {
  return Boolean(
    outcome.request ??
      outcome.to ??
      outcome.target ??
      outcome.mode ??
      outcome.fragment ??
      outcome.content
  ) || outcome.sideEffects.length > 0 || outcome.errorCodes.length > 0 || outcome.routeParams.length > 0;
}

function processStepDetail(step: MarkVSpecProcessStep, key: string): string | undefined {
  return step.details.find((detail) => detail.key === key)?.value;
}
