import { actionIdPattern } from "./ids.js";
import type { MarkVSpecAction, MarkVSpecActionOutcome, MarkVSpecTransition } from "./types.js";

export type MarkVSpecActionTriggerKind =
  | "missing"
  | "element"
  | "document-lifecycle"
  | "action-lifecycle"
  | "process-lifecycle"
  | "invalid-element"
  | "unknown";

export interface MarkVSpecActionTriggerReadModel {
  readonly raw?: string;
  readonly kind: MarkVSpecActionTriggerKind;
  readonly elementId?: string;
  readonly elementEvent?: string;
  readonly sourceActionId?: string;
  readonly processMarker?: string;
  readonly lifecycleEvent?: string;
}

export interface MarkVSpecActionOutcomeSummary {
  readonly result?: string;
  readonly sources: Array<"transition" | "action-outcome" | "process-outcome">;
  readonly fromStates: string[];
  readonly toTargets: string[];
  readonly processMarkers: string[];
}

export interface MarkVSpecActionEnvelopeReadModel {
  readonly action: MarkVSpecAction;
  readonly trigger: MarkVSpecActionTriggerReadModel;
  readonly callerElementId?: string;
  readonly fromStates: string[];
  readonly outcomeSummaries: MarkVSpecActionOutcomeSummary[];
}

const documentLifecycleTriggers = new Set(["page.load", "partial.render", "screen.load"]);
const actionLifecycleTriggerRegex = new RegExp(String.raw`^(${actionIdPattern})\.([A-Za-z][A-Za-z0-9_-]*)$`, "u");
const actionProcessLifecycleTriggerRegex = new RegExp(String.raw`^(${actionIdPattern})\.(P[A-Za-z0-9_-]*)\.([A-Za-z][A-Za-z0-9_-]*)$`, "u");

// This model covers the action envelope: trigger, caller, from states, and case
// summaries. Process-step execution details stay in action-process-read-model.
export function buildMarkVSpecActionEnvelopeReadModel(action: MarkVSpecAction): MarkVSpecActionEnvelopeReadModel {
  const trigger = actionTriggerReadModel(action);
  return {
    action,
    trigger,
    callerElementId: trigger.elementId ?? action.properties["element"],
    fromStates: action.fromStates.slice(),
    outcomeSummaries: actionOutcomeSummaries(action)
  };
}

export function actionTriggerReadModel(action: MarkVSpecAction): MarkVSpecActionTriggerReadModel {
  const raw = action.triggeredBy;
  if (!raw) {
    return { kind: "missing" };
  }
  if (action.trigger) {
    return {
      raw,
      kind: "element",
      elementId: action.trigger.elementId,
      elementEvent: action.trigger.event
    };
  }
  if (documentLifecycleTriggers.has(raw)) {
    return {
      raw,
      kind: "document-lifecycle",
      lifecycleEvent: raw
    };
  }

  const processLifecycleTrigger = actionProcessLifecycleTriggerRegex.exec(raw);
  if (processLifecycleTrigger) {
    return {
      raw,
      kind: "process-lifecycle",
      sourceActionId: processLifecycleTrigger[1],
      processMarker: processLifecycleTrigger[2],
      lifecycleEvent: processLifecycleTrigger[3]
    };
  }

  const actionLifecycleTrigger = actionLifecycleTriggerRegex.exec(raw);
  if (actionLifecycleTrigger) {
    return {
      raw,
      kind: "action-lifecycle",
      sourceActionId: actionLifecycleTrigger[1],
      lifecycleEvent: actionLifecycleTrigger[2]
    };
  }

  return {
    raw,
    kind: raw.startsWith("E-") ? "invalid-element" : "unknown"
  };
}

export function isDocumentLifecycleAction(action: MarkVSpecAction): boolean {
  return actionTriggerReadModel(action).kind === "document-lifecycle";
}

export function isSystemEventAction(action: MarkVSpecAction): boolean {
  const trigger = actionTriggerReadModel(action);
  return trigger.kind === "document-lifecycle"
    || (trigger.kind === "process-lifecycle" && trigger.lifecycleEvent === "response");
}

export function processLifecycleTriggerSource(action: MarkVSpecAction): { actionId: string; processMarker: string; event: string } | undefined {
  const trigger = actionTriggerReadModel(action);
  return trigger.kind === "process-lifecycle" && trigger.sourceActionId && trigger.processMarker && trigger.lifecycleEvent
    ? { actionId: trigger.sourceActionId, processMarker: trigger.processMarker, event: trigger.lifecycleEvent }
    : undefined;
}

export function actionOutcomeSummaries(action: MarkVSpecAction): MarkVSpecActionOutcomeSummary[] {
  const summaries = new Map<string, MutableActionOutcomeSummary>();

  for (const transition of action.transitions) {
    const summary = summaryFor(summaries, transition.result);
    addUnique(summary.sources, "transition");
    addUnique(summary.fromStates, transition.from);
    addUnique(summary.toTargets, transition.to);
  }

  for (const outcome of action.outcomes) {
    addOutcomeSummary(summaries, outcome, "action-outcome");
  }

  for (const step of action.processSteps) {
    for (const outcome of step.outcomes) {
      const summary = addOutcomeSummary(summaries, outcome, "process-outcome");
      if (step.marker) {
        addUnique(summary.processMarkers, step.marker);
      }
    }
  }

  return [...summaries.values()].map((summary) => ({
    result: summary.result,
    sources: summary.sources,
    fromStates: summary.fromStates,
    toTargets: summary.toTargets,
    processMarkers: summary.processMarkers
  }));
}

export function actionOutcomeForTransition(
  action: MarkVSpecAction,
  transition: MarkVSpecTransition
): MarkVSpecActionOutcome | undefined {
  return [
    ...action.outcomes,
    ...action.processSteps.flatMap((step) => step.outcomes)
  ].find((outcome) => isOutcomeForTransition(outcome, transition));
}

export function actionTransitionCaseReference(action: MarkVSpecAction, resultName: string | undefined): string {
  if (!resultName) {
    return action.id;
  }

  const summary = actionOutcomeSummaries(action).find((candidate) => candidate.result === resultName);
  const processMarker = summary?.processMarkers[0];
  return processMarker ? `${action.id}.${processMarker}.${resultName}` : `${action.id}.${resultName}`;
}

function addOutcomeSummary(
  summaries: Map<string, MutableActionOutcomeSummary>,
  outcome: MarkVSpecActionOutcome,
  source: "action-outcome" | "process-outcome"
): MutableActionOutcomeSummary {
  const summary = summaryFor(summaries, outcome.result);
  addUnique(summary.sources, source);
  if (outcome.from) {
    addUnique(summary.fromStates, outcome.from);
  }
  if (outcome.to) {
    addUnique(summary.toTargets, outcome.to);
  }
  return summary;
}

function isOutcomeForTransition(outcome: MarkVSpecActionOutcome, transition: MarkVSpecTransition): boolean {
  if (outcome.result !== transition.result || outcome.to !== transition.to) {
    return false;
  }

  const transitionLines = [
    ...(outcome.propertyLocations.state ?? []),
    ...(outcome.propertyLocations.navigate ?? [])
  ].map((location) => location.line);
  return transitionLines.length === 0 || transitionLines.includes(transition.location.line);
}

interface MutableActionOutcomeSummary {
  result?: string;
  sources: Array<"transition" | "action-outcome" | "process-outcome">;
  fromStates: string[];
  toTargets: string[];
  processMarkers: string[];
}

function summaryFor(summaries: Map<string, MutableActionOutcomeSummary>, result: string | undefined): MutableActionOutcomeSummary {
  const key = result ?? "";
  const summary = summaries.get(key) ?? {
    result,
    sources: [],
    fromStates: [],
    toTargets: [],
    processMarkers: []
  };
  summaries.set(key, summary);
  return summary;
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
