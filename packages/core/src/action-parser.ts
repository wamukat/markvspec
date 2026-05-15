import { elementIdPattern } from "./ids.js";
import type { MarkVSpecAction, MarkVSpecActionOutcome, MarkVSpecDiagnostic, MarkVSpecProcessStep, MarkVSpecRouteParam, SourceLocation } from "./types.js";

export interface ActionBulletInput {
  text: string;
  indent: number;
  location: SourceLocation;
}

type ActionBlock =
  | "triggered"
  | "from"
  | "process"
  | "effects"
  | "otherwise"
  | "cases";

type ActionNestedBlock = "update" | "params";

export interface ActionParseContext {
  block?: ActionBlock;
  outcome?: string;
  outcomeIndent?: number;
  nestedBlock?: ActionNestedBlock;
  nestedBlockIndent?: number;
  processStep?: MarkVSpecProcessStep;
  rejectedProcessStepIndent?: number;
  processCaseBlockIndent?: number;
  processOutcome?: string;
  processOutcomeIndent?: number;
}

export function createActionParseContext(): ActionParseContext {
  return {};
}

export function applyActionBulletToContext(
  action: MarkVSpecAction,
  bullet: ActionBulletInput,
  context: ActionParseContext,
  diagnostics: MarkVSpecDiagnostic[] = []
): ActionParseContext {
  if (bullet.indent === 0) {
    const block = parseActionBlock(bullet.text);
    if (block) {
      return { block, outcome: block === "otherwise" ? "otherwise" : undefined };
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has unsupported top-level entry: ${bullet.text}. Use Triggered, From, Process, Effects, Otherwise, or Cases.`,
      line: bullet.location.line
    });
    return {};
  }

  if (!context.block) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has nested entry outside a recognized block: ${bullet.text}.`,
      line: bullet.location.line
    });
    return {};
  }

  if (context.block === "triggered") {
    applyActionTrigger(action, bullet.text, bullet.location);
    return { block: context.block };
  }

  if (context.block === "from") {
    action.fromStates.push(bullet.text);
    action.properties["from"] = action.fromStates.join(", ");
    addPropertyLocation(action.propertyLocations, "from", bullet.location);
    return { block: context.block };
  }

  if (context.block === "effects") {
    applyActionStructuredEffect(action, undefined, bullet, activeNestedBlock(context, bullet), diagnostics);
    return { block: context.block, ...nextNestedContext(bullet, context) };
  }

  if (context.block === "otherwise") {
    applyActionStructuredEffect(action, "otherwise", bullet, activeNestedBlock(context, bullet), diagnostics);
    return { block: context.block, outcome: "otherwise", ...nextNestedContext(bullet, context) };
  }

  if (context.block === "process") {
    if (context.rejectedProcessStepIndent !== undefined && bullet.indent > context.rejectedProcessStepIndent) {
      return { block: context.block, rejectedProcessStepIndent: context.rejectedProcessStepIndent };
    }

    const stepName = parseProcessStepName(bullet.text);
    if (stepName && (!context.processStep || bullet.indent <= context.processStep.indent)) {
      if (isHttpRequestLine(stepName)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} has malformed Process entry: ${bullet.text}. Put request lines under an HttpRequest step.`,
          line: bullet.location.line
        });
        return { block: context.block, processStep: context.processStep, ...nextNestedContext(bullet, context) };
      }

      const normalizedStepName = normalizeBlockLabel(stepName);
      if (normalizedStepName === "client call" || normalizedStepName === "clientcall") {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} process step ${stepName} is not supported. Use ServerCall instead.`,
          line: bullet.location.line
        });
        return { block: context.block, rejectedProcessStepIndent: bullet.indent };
      }
      const step = createProcessStep(stepName, bullet.indent, bullet.location);
      const [, inlineValue] = splitKeyValue(bullet.text);
      if (inlineValue !== undefined && normalizedStepName === "validate") {
        step.details.push({
          key: "validation",
          value: inlineValue.trim(),
          location: bullet.location
        });
        addPropertyLocation(step.propertyLocations, "validation", bullet.location);
      }
      if (inlineValue !== undefined && normalizeBlockLabel(stepName) === "resolve") {
        step.resolveGroup = inlineValue.trim();
        addPropertyLocation(step.propertyLocations, "resolve", bullet.location);
      }
      action.processSteps.push(step);
      return { block: context.block, processStep: step };
    }

    if (context.processStep) {
      if (bullet.indent <= context.processStep.indent) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} has malformed Process entry: ${bullet.text}. Nest process details under ${context.processStep.name}.`,
          line: bullet.location.line
        });
        return { block: context.block, processStep: context.processStep, ...nextNestedContext(bullet, context) };
      }

      if (context.processCaseBlockIndent !== undefined && bullet.indent > context.processCaseBlockIndent) {
        return applyProcessStepCaseBullet(action, context.processStep, bullet, context, diagnostics);
      }

      if (isCasesBlock(bullet.text)) {
        return { block: context.block, processStep: context.processStep, processCaseBlockIndent: bullet.indent };
      }

      applyProcessStepBullet(action, context.processStep, bullet, activeNestedBlock(context, bullet), diagnostics);
      return { block: context.block, processStep: context.processStep, ...nextNestedContext(bullet, context) };
    }
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has malformed Process entry: ${bullet.text}. Start with a process step such as HttpRequest.`,
      line: bullet.location.line
    });
    return { block: context.block };
  }

  if (context.block === "cases") {
    const outcomeName = context.outcome && isProcessCaseFlowDirective(bullet.text) ? undefined : parseOutcomeName(bullet.text);
    if (outcomeName && !isStructuredEffectKey(bullet.text)) {
      getActionOutcome(action, outcomeName, bullet.location);
      return { block: context.block, outcome: outcomeName, outcomeIndent: bullet.indent };
    }

    if (context.outcome) {
      if (context.outcomeIndent !== undefined && bullet.indent <= context.outcomeIndent) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} has malformed Cases entry: ${bullet.text}. Nest case details under ${context.outcome}.`,
          line: bullet.location.line
        });
        return { block: context.block, outcome: context.outcome, outcomeIndent: context.outcomeIndent, ...nextNestedContext(bullet, context) };
      }

      applyActionStructuredEffect(action, context.outcome, bullet, activeNestedBlock(context, bullet), diagnostics);
      return { block: context.block, outcome: context.outcome, outcomeIndent: context.outcomeIndent, ...nextNestedContext(bullet, context) };
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has malformed Cases entry: ${bullet.text}. Start each case with a result name such as success:.`,
      line: bullet.location.line
    });
    return { block: context.block };
  }

  return { block: context.block, outcome: context.outcome };
}

function isHttpRequestLine(text: string): boolean {
  return /^[A-Z]+\s+.+$/.test(text);
}

function parseActionBlock(text: string): ActionBlock | undefined {
  const normalized = normalizeBlockLabel(text);
  if (normalized === "triggered") {
    return "triggered";
  }
  if (normalized === "from") {
    return "from";
  }
  if (normalized === "process") {
    return "process";
  }
  if (normalized === "effects") {
    return "effects";
  }
  if (normalized === "otherwise") {
    return "otherwise";
  }
  if (normalized === "cases") {
    return "cases";
  }
  return undefined;
}

function parseOutcomeName(text: string): string | undefined {
  const normalized = text.trim().replace(/:$/, "").trim();
  return /^[A-Za-z][A-Za-z0-9_-]*$/.test(normalized) ? normalized : undefined;
}

function isProcessCaseFlowDirective(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "stop" || normalized === "continue";
}

function normalizeBlockLabel(text: string): string {
  return text.trim().replace(/:$/, "").trim().toLowerCase();
}

function parseProcessStepName(text: string): string | undefined {
  const [name, value] = splitKeyValue(text);
  if (value !== undefined) {
    const normalizedName = normalizeBlockLabel(name);
    return normalizedName === "validate" || normalizedName === "resolve" ? name.trim() : undefined;
  }

  const normalized = name.trim();
  return normalized ? normalized : undefined;
}

function createProcessStep(name: string, indent: number, location: SourceLocation): MarkVSpecProcessStep {
  return {
    name,
    indent,
    when: [],
    skipWhen: [],
    details: [],
    outcomes: [],
    sideEffects: [],
    propertyLocations: {},
    location
  };
}

function isCasesBlock(text: string): boolean {
  const normalized = normalizeBlockLabel(text);
  return normalized === "cases";
}

function applyActionTrigger(action: MarkVSpecAction, value: string, location: SourceLocation): void {
  action.triggeredBy = value;
  action.triggeredByLocation = location;
  const triggerParts = new RegExp(String.raw`^(${elementIdPattern})\.([A-Za-z][A-Za-z0-9_-]*)$`, "u").exec(value);
  if (triggerParts) {
    action.trigger = {
      elementId: triggerParts[1],
      event: triggerParts[2]
    };
  }
}

function applyHttpRequestBullet(bullet: ActionBulletInput, step: MarkVSpecProcessStep): void {
  const request = /^([A-Z]+)\s+(.+)$/.exec(bullet.text);
  if (request) {
    step.details.push({
      key: "request",
      value: bullet.text,
      location: bullet.location
    });
    addPropertyLocation(step.propertyLocations, "request", bullet.location);
    return;
  }

  const [name, source] = splitKeyValue(bullet.text);
  if (source !== undefined) {
    step.details.push({
      key: name.trim(),
      value: source.trim(),
      location: bullet.location
    });
    addPropertyLocation(step.propertyLocations, name.trim(), bullet.location);
  }
}

function applyProcessStepBullet(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  bullet: ActionBulletInput,
  currentNestedBlock: ActionNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const normalizedStep = normalizeBlockLabel(step.name);
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  const isHttpRequestStep = normalizedStep === "http request" || normalizedStep === "httprequest";

  if (key === "parallel" && value !== undefined) {
    step.parallelGroup = value;
    addPropertyLocation(step.propertyLocations, "parallel", bullet.location);
    return;
  }

  if (normalizedStep === "resolve" && key === "resolve" && value !== undefined) {
    step.resolveGroup = value;
    addPropertyLocation(step.propertyLocations, "resolve", bullet.location);
    return;
  }

  if (isHttpRequestStep) {
    if (value !== undefined && isUpdateEffectKey(key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} HttpRequest has unsupported entry: ${bullet.text}. Use request parameter entries or move update details under a Cases update block.`,
        line: bullet.location.line
      });
      return;
    }

    applyHttpRequestBullet(bullet, step);
    return;
  }

  if (isServerCallStep(normalizedStep) && value === undefined) {
    step.details.push({
      key: "call",
      value: bullet.text,
      location: bullet.location
    });
    addPropertyLocation(step.propertyLocations, "call", bullet.location);
    return;
  }

  if (value === undefined) {
    return;
  }

  if (normalizeBlockLabel(step.name) === "validate" && (key === "Validate" || key === "validate")) {
    step.details.push({
      key: "validation",
      value,
      location: bullet.location
    });
    addPropertyLocation(step.propertyLocations, "validation", bullet.location);
    return;
  }

  if (key === "when") {
    step.when.push(value);
    addPropertyLocation(step.propertyLocations, "when", bullet.location);
    return;
  }

  if (key === "skip when") {
    step.skipWhen.push(value);
    addPropertyLocation(step.propertyLocations, "skip when", bullet.location);
    return;
  }

  if (isServerCallStep(normalizedStep)) {
    if (key === "client") {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} process step ${step.name} has unsupported entry: ${bullet.text}. Use an unlabeled call line such as Service.method().`,
        line: bullet.location.line
      });
      return;
    }

    step.details.push({
      key,
      value,
      location: bullet.location
    });
    addPropertyLocation(step.propertyLocations, key, bullet.location);
    return;
  }

  if (key === "update") {
    return;
  }

  if (isUpdateEffectKey(key)) {
    if (currentNestedBlock !== "update") {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} process step ${step.name} has unsupported entry: ${bullet.text}. Put update details under an update block.`,
        line: bullet.location.line
      });
      return;
    }

    applyActionEffect(step, key, value, bullet.location);
    return;
  }

  step.details.push({
    key,
    value,
    location: bullet.location
  });
  addPropertyLocation(step.propertyLocations, key, bullet.location);
}

function isServerCallStep(normalizedStep: string): boolean {
  return normalizedStep === "server call" || normalizedStep === "servercall";
}

function applyProcessStepCaseBullet(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  bullet: ActionBulletInput,
  context: ActionParseContext,
  diagnostics: MarkVSpecDiagnostic[]
): ActionParseContext {
  const outcomeName = isProcessCaseFlowDirective(bullet.text) ? undefined : parseOutcomeName(bullet.text);
  if (outcomeName && !isStructuredEffectKey(bullet.text)) {
    getProcessStepOutcome(step, outcomeName, bullet.location);
    return {
      block: "process",
      processStep: step,
      processCaseBlockIndent: context.processCaseBlockIndent,
      processOutcome: outcomeName,
      processOutcomeIndent: bullet.indent
    };
  }

  if (context.processOutcome) {
    if (context.processOutcomeIndent !== undefined && bullet.indent <= context.processOutcomeIndent) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} process step ${step.name} has malformed cases entry: ${bullet.text}. Nest case details under ${context.processOutcome}.`,
        line: bullet.location.line
      });
      return {
        block: "process",
        processStep: step,
        processCaseBlockIndent: context.processCaseBlockIndent,
        processOutcome: context.processOutcome,
        processOutcomeIndent: context.processOutcomeIndent,
        ...nextNestedContext(bullet, context)
      };
    }

    applyProcessStepCaseEffect(action, step, context.processOutcome, bullet, activeNestedBlock(context, bullet), diagnostics);
    return {
      block: "process",
      processStep: step,
      processCaseBlockIndent: context.processCaseBlockIndent,
      processOutcome: context.processOutcome,
      processOutcomeIndent: context.processOutcomeIndent,
      ...nextNestedContext(bullet, context)
    };
  }

  diagnostics.push({
    severity: "warning",
    message: `Action ${action.id} process step ${step.name} has malformed cases entry: ${bullet.text}. Start each case with a result name such as success:.`,
    line: bullet.location.line
  });
  return { block: "process", processStep: step, processCaseBlockIndent: context.processCaseBlockIndent };
}

function applyProcessStepCaseEffect(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  result: string,
  bullet: ActionBulletInput,
  currentNestedBlock: ActionNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const outcome = getProcessStepOutcome(step, result, bullet.location);
  applyStructuredEffectToOutcome(action, outcome, result, bullet, currentNestedBlock, diagnostics, `process step ${step.name} case ${result}`);
}

function applyActionStructuredEffect(
  action: MarkVSpecAction,
  result: string | undefined,
  bullet: ActionBulletInput,
  currentNestedBlock: ActionNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (value === undefined && result && isProcessCaseFlowDirective(key)) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} case ${result} has unsupported flow directive ${key}. Use stop or continue only under a process step cases block.`,
      line: bullet.location.line
    });
    return;
  }

  if (value === undefined) {
    return;
  }

  if (result) {
    const outcome = getActionOutcome(action, result, bullet.location);
    applyStructuredEffectToOutcome(action, outcome, result, bullet, currentNestedBlock, diagnostics, `case ${result}`);
    return;
  }

  if (currentNestedBlock === "params") {
    applyRouteParam(action.routeParams, key, value, bullet.location);
    action.properties[`route param ${key}`] = value;
    addPropertyLocation(action.propertyLocations, `route param ${key}`, bullet.location);
    return;
  }

  if (key === "state" || key === "navigate") {
    for (const from of action.fromStates) {
      action.transitions.push({
        from,
        to: value,
        location: bullet.location,
        raw: `${key}: ${value}`
      });
    }
    return;
  }

  if (key === "update") {
    return;
  }

  if (key === "params") {
    return;
  }

  if (isUpdateEffectKey(key)) {
    if (result && currentNestedBlock === "update") {
      const outcome = getActionOutcome(action, result, bullet.location);
      applyActionEffect(outcome, key, value, bullet.location);
      return;
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has unsupported ${result ? `case ${result}` : "Effects"} entry: ${bullet.text}. Put update details under an update block.`,
      line: bullet.location.line
    });
    return;
  }

  diagnostics.push({
    severity: "warning",
    message: `Action ${action.id} has unsupported Effects entry: ${bullet.text}. Use state, navigate, response, from, params, or update.`,
    line: bullet.location.line
  });
}

function applyStructuredEffectToOutcome(
  action: MarkVSpecAction,
  outcome: MarkVSpecActionOutcome,
  result: string,
  bullet: ActionBulletInput,
  currentNestedBlock: ActionNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  contextLabel: string
): void {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (value === undefined && isProcessCaseFlowDirective(key) && contextLabel.startsWith("process step ")) {
    outcome.flow = key.trim().toLowerCase() as "stop" | "continue";
    addPropertyLocation(outcome.propertyLocations, "flow", bullet.location);
    return;
  }

  if (currentNestedBlock === "params" && value !== undefined) {
    applyRouteParam(outcome.routeParams, key, value, bullet.location);
    addPropertyLocation(outcome.propertyLocations, `route param ${key}`, bullet.location);
    return;
  }

  if (value === undefined) {
    return;
  }

  if (key === "response") {
    outcome.response = {
      result,
      definition: value,
      location: bullet.location
    };
    if (action.outcomes.includes(outcome)) {
      action.responses.push(outcome.response);
      action.properties[`response ${result}`] = value;
      addPropertyLocation(action.propertyLocations, `response ${result}`, bullet.location);
    }
    addPropertyLocation(outcome.propertyLocations, "response", bullet.location);
    return;
  }

  if (isModelAssignmentKey(key)) {
    outcome.sideEffects.push(`${key}: ${value}`);
    addPropertyLocation(outcome.propertyLocations, key, bullet.location);
    return;
  }

  if (key === "from") {
    outcome.from = value;
    addPropertyLocation(outcome.propertyLocations, "from", bullet.location);
    return;
  }

  if (key === "error code" || key === "error codes") {
    outcome.errorCodes.push(...splitReferenceList(value));
    addPropertyLocation(outcome.propertyLocations, key, bullet.location);
    return;
  }

  if (key === "state" || key === "navigate") {
    outcome.to = value;
    addPropertyLocation(outcome.propertyLocations, key, bullet.location);
    const fromStates = outcome.from ? [outcome.from] : action.fromStates;
    for (const from of fromStates) {
      action.transitions.push({
        from,
        result,
        to: value,
        location: bullet.location,
        raw: `${key}: ${value}`
      });
    }
    return;
  }

  if (key === "update") {
    return;
  }

  if (key === "params") {
    return;
  }

  if (isUpdateEffectKey(key)) {
    if (currentNestedBlock === "update") {
      applyActionEffect(outcome, key, value, bullet.location);
      return;
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has unsupported ${contextLabel} entry: ${bullet.text}. Put update details under an update block.`,
      line: bullet.location.line
    });
    return;
  }

  diagnostics.push({
    severity: "warning",
    message: `Action ${action.id} has unsupported ${contextLabel} entry: ${bullet.text}. Use state, navigate, response, from, params, update, stop, or continue.`,
    line: bullet.location.line
  });
}

function applyRouteParam(params: MarkVSpecRouteParam[], name: string, source: string, location: SourceLocation): void {
  params.push({
    name,
    source,
    location
  });
}

function isUpdateEffectKey(key: string): boolean {
  return key === "target" || key === "mode" || key === "fragment" || key === "content" || key === "side effect";
}

function isModelAssignmentKey(key: string): boolean {
  return /^\$\{model\.[^}]+\}$/.test(key);
}

function applyActionEffect(
  target: {
    request?: { method: string; path: string };
    target?: string;
    mode?: string;
    fragment?: string;
    content?: string;
    sideEffects: string[];
    propertyLocations: Record<string, SourceLocation[]>;
  },
  key: string,
  value: string,
  location: SourceLocation
): void {
  if (key === "request") {
    const request = /^([A-Z]+)\s+(.+)$/.exec(value);
    if (request) {
      target.request = {
        method: request[1],
        path: request[2]
      };
    }
  } else if (key === "target") {
    target.target = value;
  } else if (key === "mode") {
    target.mode = value;
  } else if (key === "fragment") {
    target.fragment = value;
  } else if (key === "content") {
    target.content = value;
  } else if (key === "side effect") {
    target.sideEffects.push(value);
  }

  addPropertyLocation(target.propertyLocations, key, location);
}

function activeNestedBlock(context: ActionParseContext, bullet: ActionBulletInput): ActionNestedBlock | undefined {
  return context.nestedBlockIndent !== undefined && bullet.indent > context.nestedBlockIndent
    ? context.nestedBlock
    : undefined;
}

function nextNestedContext(bullet: ActionBulletInput, context: ActionParseContext): Pick<ActionParseContext, "nestedBlock" | "nestedBlockIndent"> {
  const normalized = normalizeBlockLabel(bullet.text);
  if (normalized === "update" || normalized === "params") {
    return {
      nestedBlock: normalized,
      nestedBlockIndent: bullet.indent
    };
  }

  if (context.nestedBlockIndent !== undefined && bullet.indent > context.nestedBlockIndent) {
    return {
      nestedBlock: context.nestedBlock,
      nestedBlockIndent: context.nestedBlockIndent
    };
  }

  return {};
}

function isStructuredEffectKey(text: string): boolean {
  const [key, value] = splitKeyValue(text);
  const normalized = key.trim();
  if (normalized === "params") {
    return true;
  }
  return value !== undefined && ["response", "from", "state", "navigate", "update", "target", "mode", "fragment", "content", "side effect"].includes(normalized);
}

function getActionOutcome(action: MarkVSpecAction, result: string, location?: SourceLocation): MarkVSpecActionOutcome {
  const existing = action.outcomes.find((outcome) => outcome.result === result);
  if (existing) {
    existing.location ??= location;
    return existing;
  }

  const outcome: MarkVSpecActionOutcome = {
    result,
    location,
    sideEffects: [],
    errorCodes: [],
    routeParams: [],
    propertyLocations: {}
  };
  action.outcomes.push(outcome);
  return outcome;
}

function getProcessStepOutcome(step: MarkVSpecProcessStep, result: string, location?: SourceLocation): MarkVSpecActionOutcome {
  const existing = step.outcomes.find((outcome) => outcome.result === result);
  if (existing) {
    existing.location ??= location;
    return existing;
  }

  const outcome: MarkVSpecActionOutcome = {
    result,
    location,
    sideEffects: [],
    errorCodes: [],
    routeParams: [],
    propertyLocations: {}
  };
  step.outcomes.push(outcome);
  return outcome;
}

function splitKeyValue(text: string): [string, string | undefined] {
  const match = /^([^:]+):\s*(.*)$/.exec(text);
  if (!match) {
    return [text, undefined];
  }

  return [match[1], match[2]];
}

function splitReferenceList(value: string): string[] {
  return value.split(/[,、]/u).map((item) => item.trim()).filter(Boolean);
}

function addPropertyLocation(
  locations: Record<string, SourceLocation[]>,
  key: string,
  location: SourceLocation
): void {
  const existing = locations[key] ?? [];
  existing.push(location);
  locations[key] = existing;
}
