import type { MarkVSpecAction } from "./types.js";

export type UnscopedActionApplicability = "always" | "initial" | "never";

export interface ActionApplicabilityOptions {
  initial?: boolean;
  unscoped?: UnscopedActionApplicability;
}

export function actionAppliesToState(
  action: MarkVSpecAction,
  stateName: string | undefined,
  options: ActionApplicabilityOptions = {}
): boolean {
  if (action.fromStates.length > 0) {
    return stateName ? action.fromStates.includes(stateName) : false;
  }

  if (!stateName) {
    return true;
  }

  if (action.transitions.some((transition) => transition.from === stateName) || action.outcomes.some((outcome) => outcome.from === stateName)) {
    return true;
  }

  const hasStateScope = action.transitions.length > 0 || action.outcomes.some((outcome) => Boolean(outcome.from));
  if (hasStateScope) {
    return false;
  }

  const unscoped = options.unscoped ?? "always";
  if (unscoped === "always") {
    return true;
  }
  if (unscoped === "initial") {
    return Boolean(options.initial);
  }
  return false;
}
