import {
  actionIdPattern,
  conditionReferenceRegex,
  elementIdPattern,
  formGroupIdPattern,
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
  parseDisplayMessageReference
} from "./display-effect.js";
import {
  formGroupUpdateTargetDiagnostic,
  presentationPanelTargetDiagnostic,
  validateDisplayEffectTarget,
  type DisplayEffectTargetValidationSupport
} from "./display-effect-validator.js";
import {
  validateViewContextsAndPreviewScenarios,
  type PreviewScenarioValidationSupport
} from "./preview-scenario-validator.js";
import {
  findMarkdownEntityReferencesInLines,
  resolveMarkVSpecEntityReference
} from "./entity-reference.js";
import {
  buildMarkVSpecProcessStepReadModel
} from "./action-process-read-model.js";
import {
  buildMarkVSpecActionEnvelopeReadModel,
  processLifecycleTriggerSource
} from "./action-envelope-read-model.js";
import {
  processStepLabel,
  validateProcessBusinessRulePlacement,
  validateProcessCaseFlowPlacement,
  validateProcessDataReferences,
  validateProcessGranularity,
  validateProcessStepReferences,
  validateSuspiciousProcessCaseResponse,
  validateUnsupportedProcessLevelPartial,
  type ActionProcessValidationSupport
} from "./action-process-validator.js";
import {
  splitReferenceList,
  validateBusinessRuleOutcomeCaseName,
  validateValidationErrorCodes,
  validateValidationRules,
  validateValidationScopeAndRun,
  validateValidationTargets,
  validationPropertyValues,
  type BusinessRuleOutcomeDiagnosticSupport,
  type ValidationRuleDiagnosticContext,
  type ValidationTargetDiagnosticContext
} from "./validation-diagnostics-validator.js";
import {
  propertyFirstString,
  propertyList,
  propertyLocation,
  propertyString
} from "./property-accessor.js";
import { entityMarkerReadModels } from "./entity-marker-read-model.js";
import {
  anchoredOverlayReference,
  controlledPanelReferences,
  elementDomainFor
} from "./element-domain.js";
import type {
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecDiagnosticSeverity,
  MarkVSpecElement,
  MarkVSpecFormGroup,
  MarkVSpecLayoutGroup,
  MarkVSpecParseResult,
  MarkVSpecProcessStep,
  SourceLocation
} from "./types.js";

const layoutKinds = new Set(["stack", "row", "grid", "inline"]);
const partialIdRegex = /^PRT-[\p{L}\p{N}-]+$/u;
const actionEvents = new Set(["click", "change", "submit", "focus", "blur", "open", "close"]);
const actionLifecycleEvents = new Set(["response"]);
const canonicalDocumentLifecycleEvents = new Set(["page.load", "partial.render"]);
const elementIdRegex = new RegExp(String.raw`^${elementIdPattern}$`, "u");
const formGroupIdRegex = new RegExp(String.raw`^${formGroupIdPattern}$`, "u");
const markerRegex = /^[A-Za-z0-9][A-Za-z0-9_-]{0,11}$/u;
const multiInitialValueOptionElementTypes = new Set(["MultiSelect", "CheckboxGroup"]);
const actionProcessValidationSupport: ActionProcessValidationSupport = {
  firstPropertyLocation,
  requestParamSourceId,
  splitReferenceList
};
const displayEffectTargetValidationSupport: DisplayEffectTargetValidationSupport = {
  firstPropertyLine,
  checkLayoutTargetViewportCoverage
};
const previewScenarioValidationSupport: PreviewScenarioValidationSupport = {
  extractRoutePlaceholders,
  firstPropertyLine,
  isExternalTransitionTarget
};
const businessRuleOutcomeDiagnosticSupport: BusinessRuleOutcomeDiagnosticSupport = {
  firstPropertyLine,
  processStepLabel
};

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
  const validationTargetDiagnosticContext: ValidationTargetDiagnosticContext = {
    layoutIds: targetLayoutIds,
    elementIds,
    formGroupIds
  };
  const validationRuleDiagnosticContext: ValidationRuleDiagnosticContext = {
    elementIds,
    elementsById,
    formGroupIds
  };
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
  validateControlledPanelLayoutUsage(result, targetLayoutIds, diagnostics);
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
  validateViewContextsAndPreviewScenarios({
    result,
    viewContextNames,
    viewContextSampleNames,
    stateNames,
    elementsById,
    diagnostics,
    support: previewScenarioValidationSupport
  });
  checkDuplicateLayoutMarkers(result.layoutGroups.filter((group) => !isPresentationPanelId(group.id)), diagnostics);
  checkConsistentLayoutMarkers(result.layoutGroups.filter((group) => !isPresentationPanelId(group.id)), diagnostics);
  checkMarkers(
    entityMarkerReadModels(allLayoutGroups.filter((group) => !isPresentationPanelId(group.id))),
    "layout",
    diagnostics
  );
  checkMarkers(
    entityMarkerReadModels(result.formGroups),
    "form group",
    diagnostics
  );
  checkMarkers(
    [
      ...entityMarkerReadModels(result.validations),
      ...entityMarkerReadModels(result.rules)
    ],
    "message",
    diagnostics
  );
  checkMarkers(
    entityMarkerReadModels(result.errorCodes),
    "error code",
    diagnostics
  );
  checkMarkers(
    entityMarkerReadModels(result.elements),
    "element",
    diagnostics
  );
  checkMarkers(
    entityMarkerReadModels(result.actions),
    "action",
    diagnostics
  );
  checkDuplicateMarkers(
    entityMarkerReadModels(result.formGroups),
    "form group",
    diagnostics
  );
  checkDuplicateMarkers(
    [
      ...entityMarkerReadModels(result.validations),
      ...entityMarkerReadModels(result.rules)
    ],
    "message",
    diagnostics
  );
  checkDuplicateMarkers(
    entityMarkerReadModels(result.errorCodes),
    "error code",
    diagnostics
  );
  checkDuplicateMarkers(
    entityMarkerReadModels(result.elements),
    "element",
    diagnostics
  );
  checkDuplicateMarkers(
    entityMarkerReadModels(result.actions),
    "action",
    diagnostics
  );

  const initialStates = result.states.filter((state) => state.initial);
  const preInitialStates = result.states.filter((state) => state.preInitial);
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
    const firstDisplayState = result.states.find((state) => !state.preInitial) ?? result.states[0];
    diagnostics.push({
      severity: "warning",
      message: "No initial state is marked; the first state will be treated as initial.",
      line: firstDisplayState?.location.line
    });
  } else if (initialStates.length > 1) {
    diagnostics.push({
      severity: "warning",
      message: "Multiple states are marked initial.",
      line: initialStates[1]?.location.line
    });
  }
  if (preInitialStates.length > 1) {
    diagnostics.push({
      severity: "warning",
      message: "Multiple states are marked pre-initial; only the first pre-initial state is used for page.load entry checks.",
      line: preInitialStates[1]?.location.line
    });
  }
  validatePageLoadPreInitialState(result, diagnostics);

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
    validateTabsElement(element, targetLayoutIds, actionIds, stateNames, diagnostics);
    validateAnchoredOverlayElement(element, elementIds, diagnostics);
    validateAccordionDisclosureElement(element, targetLayoutIds, actionIds, stateNames, diagnostics);
    validateActionMenuElement(element, actionIds, stateNames, diagnostics);

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
      ["disabled when", element.disabledWhen],
      ["open when", element.openWhen]
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
    const envelope = buildMarkVSpecActionEnvelopeReadModel(action);
    const trigger = envelope.trigger;
    if (trigger.kind === "missing") {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "action.missingTrigger",
        { actionId: action.id },
        action.location.line
      ));
    } else if (trigger.kind === "document-lifecycle") {
      // Valid document lifecycle trigger.
    } else if (trigger.kind === "invalid-element") {
      diagnostics.push({
        severity: "error",
        message: `Action ${action.id} has invalid trigger ${trigger.raw}. Expected E-*.event.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (trigger.kind === "process-lifecycle") {
      const sourceActionId = trigger.sourceActionId ?? "";
      const processMarker = trigger.processMarker ?? "";
      const event = trigger.lifecycleEvent ?? "";
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
    } else if (trigger.kind === "action-lifecycle") {
      const sourceActionId = trigger.sourceActionId ?? "";
      const event = trigger.lifecycleEvent ?? "";
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
    } else if (trigger.kind === "element" && trigger.elementId && !elementIds.has(trigger.elementId)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${action.id} trigger references missing element ${trigger.elementId}.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (trigger.kind === "element" && trigger.elementEvent && !actionEvents.has(trigger.elementEvent)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} uses unsupported event ${trigger.elementEvent}.`,
        line: action.triggeredByLocation?.line ?? action.location.line
      });
    } else if (trigger.raw && trigger.kind === "unknown") {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "action.invalidTrigger",
        { actionId: action.id, trigger: trigger.raw },
        action.triggeredByLocation?.line ?? action.location.line
      ));
    }

    const processResponseTrigger = processLifecycleTriggerSource(action);
    if (processResponseTrigger?.event === "response") {
      const receivesTriggeredResponse = action.processSteps.some((step) => step.receives.some((receive) => receive.value === trigger.raw));
      if (!receivesTriggeredResponse) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} is triggered by ${trigger.raw} but no process receives that response.`,
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

      const processReadModel = buildMarkVSpecProcessStepReadModel(step);
      if (processReadModel.kind === "HttpRequest" && !processReadModel.execution.request) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} request process step has no request line such as POST /path.`,
          line: step.location.line
        });
      }
      for (const detail of processReadModel.execution.params) {
        const sourceId = requestParamSourceId(detail.value);
        if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} process step ${processStepLabel(step)} parameter ${detail.key} references missing source ${sourceId}.`,
            line: detail.location.line
          });
        }
      }

      if (processReadModel.kind === "Resolve") {
        if (!processReadModel.execution.resolveGroup) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${action.id} Resolve step must specify a parallel group with group: initial-load.`,
            line: step.location.line
          });
        } else if (!parallelGroups.has(processReadModel.execution.resolveGroup)) {
          diagnostics.push({
            severity: "error",
            message: `Action ${action.id} Resolve step references missing parallel group ${processReadModel.execution.resolveGroup}.`,
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
      validateBusinessRuleOutcomeCaseName(action.id, undefined, outcome, diagnostics, businessRuleOutcomeDiagnosticSupport);

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
      const processReadModel = buildMarkVSpecProcessStepReadModel(step);
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
      validateProcessStepReferences(action.id, step, validationIds, errorCodeIds, diagnostics, actionProcessValidationSupport);
      validateProcessGranularity(action.id, step, diagnostics, actionProcessValidationSupport);
      validateUnsupportedProcessLevelPartial(action.id, step, diagnostics);
      validateProcessBusinessRulePlacement(action.id, step, diagnostics);
      validateProcessDataReferences(action.id, step, actionIds, processMarkersByAction, layoutIds, elementIds, diagnostics, actionProcessValidationSupport);
      collectPartialReference(step.content, firstPropertyLocation(step, "content") ?? step.location, referencedPartialIds);
      validateDisplayEffect(action.id, `process step ${processStepLabel(step)}`, step.display, targetLayoutIds, elementIds, layoutsById, elementsById, validationsById, rulesById, layoutIdsByViewport, diagnostics, referencedPartialIds);

      for (const outcome of step.outcomes) {
        validateBusinessRuleOutcomeCaseName(action.id, step, outcome, diagnostics, businessRuleOutcomeDiagnosticSupport);
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

        if (processReadModel.kind === "Immediate" && outcome.response && !transitionResults.has(outcome.result)) {
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
    validateValidationTargets(validation, validationTargetDiagnosticContext, diagnostics);
    validateValidationRules(validation, validationRuleDiagnosticContext, diagnostics);
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
      if (!elementDomainFor(element).isFormControl()) {
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
  validateDisplayEffectTarget({
    actionId,
    context,
    display,
    layoutIds,
    elementIds,
    elementsById,
    layoutIdsByViewport,
    diagnostics,
    support: displayEffectTargetValidationSupport
  });

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
    const marker = propertyString(group, "marker")?.trim();
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
    const marker = propertyString(group, "marker")?.trim() || group.id;
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

function validatePageLoadPreInitialState(result: MarkVSpecParseResult, diagnostics: MarkVSpecDiagnostic[]): void {
  const pageLoadEvents = result.events.filter((event) => event.event === "page.load");
  if (pageLoadEvents.length === 0) {
    return;
  }

  const preInitialState = result.states.find((state) => state.preInitial);
  if (!preInitialState) {
    for (const event of pageLoadEvents) {
      diagnostics.push({
        severity: "warning",
        message: "page.load event has no pre-initial state. Add a + state such as before-load+ to show lifecycle entry transitions.",
        line: event.location.line
      });
    }
    return;
  }

  const initialState = result.states.find((state) => state.initial) ?? result.states.find((state) => !state.preInitial);
  for (const event of pageLoadEvents) {
    const action = result.actions.find((candidate) => candidate.id === event.actionId);
    if (!action) {
      continue;
    }
    if (!action.fromStates.includes(preInitialState.name)) {
      diagnostics.push({
        severity: "warning",
        message: `page.load action ${action.id} should include pre-initial state ${preInitialState.name} in From.`,
        line: event.location.line
      });
    }
    if (initialState && !action.transitions.some((transition) => transition.from === preInitialState.name && transition.to === initialState.name)) {
      diagnostics.push({
        severity: "warning",
        message: `page.load action ${action.id} should transition from ${preInitialState.name} to initial state ${initialState.name}.`,
        line: event.location.line
      });
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
  return {
    severity: "warning",
    message: `Unknown layout kind: ${group.kind}.`,
    line: group.location.line
  };
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
      const processReadModel = buildMarkVSpecProcessStepReadModel(step);
      if (processReadModel.kind === "HttpRequest") {
        for (const detail of processReadModel.execution.params) {
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
  const path = route.split("#", 1)[0] ?? route;
  for (const match of path.matchAll(/:([A-Za-z][A-Za-z0-9_-]*)/gu)) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function stringProperty(element: MarkVSpecElement, key: string): string {
  return propertyString(element, key) ?? "";
}

function firstStringProperty(value: string | string[] | true | undefined): string | undefined {
  return propertyFirstString({ properties: { value } }, "value");
}

function commaListProperty(element: MarkVSpecElement, key: string): string[] {
  return propertyList(element, key);
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
  stateNames: Set<string>,
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
    validateControlledConditions(element.id, "tab item", item.label, "active when", item.activeWhen, item.propertyLocations["active when"], stateNames, diagnostics);
  }
  validateSingleMatchedCondition(element.id, "Tabs active when", element.tabs.map((item) => ({ label: item.label, conditions: item.activeWhen, locations: item.propertyLocations["active when"] })), stateNames, diagnostics);
}

function validateControlledPanelLayoutUsage(
  result: MarkVSpecParseResult,
  layoutIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const normalLayoutReferences = new Set<string>();
  for (const group of result.layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutIds.has(item.targetId)) {
        normalLayoutReferences.add(item.targetId);
      }
    }
  }
  const panelReferences: Array<{ layoutId: string; elementId: string; line: number }> = [];
  for (const element of result.elements) {
    for (const reference of controlledPanelReferences(element)) {
      if (reference.panelId) {
        panelReferences.push({ layoutId: reference.panelId, elementId: element.id, line: reference.location?.line ?? element.location.line });
      }
    }
  }

  for (const reference of panelReferences) {
    if (!normalLayoutReferences.has(reference.layoutId)) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      message: `Layout ${reference.layoutId} is used both as a controlled panel for Element ${reference.elementId} and as a normal layout item. Preview keeps the normal layout display and does not expand it inside the component.`,
      line: reference.line
    });
  }
}

function validateAnchoredOverlayElement(
  element: MarkVSpecElement,
  elementIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const overlay = anchoredOverlayReference(element);
  if (!overlay) {
    return;
  }

  const anchor = overlay.anchorId?.trim() ?? "";
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
  stateNames: Set<string>,
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
      validateControlledConditions(element.id, "accordion item", item.label, "open when", item.openWhen, item.propertyLocations["open when"], stateNames, diagnostics);
    }
    validateSingleMatchedCondition(element.id, "Accordion open when", element.accordionItems.map((item) => ({ label: item.label, conditions: item.openWhen, locations: item.propertyLocations["open when"] })), stateNames, diagnostics);
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
  validateControlledConditions(element.id, "Disclosure", element.id, "open when", element.openWhen, element.propertyLocations["open when"] ?? [], stateNames, diagnostics);
}

function validateActionMenuElement(
  element: MarkVSpecElement,
  actionIds: Set<string>,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (element.type !== "ActionMenu") {
    return;
  }

  const open = stringProperty(element, "open").trim();
  if (open && !["true", "false"].includes(open.toLowerCase())) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} ActionMenu open must be true or false.`,
      line: firstPropertyLine(element, "open") ?? element.location.line
    });
  }

  for (const item of element.actionMenuItems) {
    if (!item.action) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} action menu item ${item.label} requires action: A-*.`,
        line: item.location.line
      });
      continue;
    }

    if (!new RegExp(String.raw`^${actionIdPattern}$`, "u").test(item.action)) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} action menu item ${item.label} action must reference an A-* action.`,
        line: item.propertyLocations.action[0]?.line ?? item.location.line
      });
      continue;
    }

    if (!actionIds.has(item.action)) {
      diagnostics.push({
        severity: "error",
        message: `Element ${element.id} action menu item ${item.label} references missing action ${item.action}.`,
        line: item.propertyLocations.action[0]?.line ?? item.location.line
      });
    }
    validateControlledConditions(element.id, "action menu item", item.label, "disabled when", item.disabledWhen, item.propertyLocations["disabled when"], stateNames, diagnostics);
  }
  validateControlledConditions(element.id, "ActionMenu", element.id, "open when", element.openWhen, element.propertyLocations["open when"] ?? [], stateNames, diagnostics);
}

function validateControlledConditions(
  elementId: string,
  ownerKind: string,
  ownerLabel: string,
  property: "active when" | "open when" | "disabled when",
  conditions: string[],
  locations: SourceLocation[],
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  conditions.forEach((condition, index) => {
    if (!isPreviewEvaluableControlledCondition(condition, stateNames)) {
      diagnostics.push({
        severity: "warning",
        message: `Element ${elementId} ${ownerKind} ${ownerLabel} ${property} condition "${condition}" cannot be evaluated in preview. Use a state name, state is ..., or a namespaced condition such as \${state.*}, \${view.*}, or \${route.*}.`,
        line: locations[index]?.line ?? locations[0]?.line
      });
    }
  });
}

function validateSingleMatchedCondition(
  elementId: string,
  label: string,
  items: Array<{ label: string; conditions: string[]; locations: SourceLocation[] }>,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const stateName of stateNames) {
    const matched = items.filter((item) => item.conditions.some((condition) => isActiveControlledStateCondition(condition, stateName, stateNames)));
    if (matched.length > 1) {
      diagnostics.push({
        severity: "warning",
        message: `Element ${elementId} ${label} matches multiple items for state ${stateName}: ${matched.map((item) => item.label).join(", ")}. Preview uses the first matching item.`,
        line: matched[1]?.locations[0]?.line ?? matched[0]?.locations[0]?.line
      });
    }
  }
}

function isPreviewEvaluableControlledCondition(condition: string, stateNames: Set<string>): boolean {
  const normalized = condition.trim();
  return /^(not\s+)?\$\{(?:model|view|state|route)\.[^}]+\}(?:\s*=\s*[^=].*)?$/u.test(normalized)
    || normalized.startsWith("state is ")
    || stateNames.has(normalized);
}

function isActiveControlledStateCondition(condition: string, activeState: string, stateNames: Set<string>): boolean {
  const normalized = condition.trim();
  if (!stateNames.has(activeState)) {
    return false;
  }
  return normalized === activeState || normalized === `state is ${activeState}` || normalized === `\${state.${activeState}}`;
}

function firstPropertyLine(
  owner: { propertyLocations: Record<string, SourceLocation[]> },
  key: string
): number | undefined {
  return propertyLocation(owner, key)?.line;
}

function firstPropertyLocation(
  owner: { propertyLocations: Record<string, SourceLocation[]> },
  key: string
): SourceLocation | undefined {
  return propertyLocation(owner, key);
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
