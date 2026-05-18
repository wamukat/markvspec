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
  | "otherwise";

type ActionNestedBlock = "update" | "params";
type ProcessNestedBlock = ActionNestedBlock | "input" | "receive" | "result" | "display" | "display-content" | string;

export interface ActionParseContext {
  block?: ActionBlock;
  outcome?: string;
  outcomeIndent?: number;
  nestedBlock?: ProcessNestedBlock;
  nestedBlockIndent?: number;
  processStep?: MarkVSpecProcessStep;
  rejectedProcessStepIndent?: number;
  processOutcome?: string;
  processOutcomeIndent?: number;
  processEffectsIndent?: number;
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
    const canonicalProcess = parseCanonicalProcessHeading(bullet.text);
    if (canonicalProcess) {
      const step = createProcessStep(`${canonicalProcess.marker}: ${canonicalProcess.name}`, bullet.indent, bullet.location);
      action.processSteps.push(step);
      return { block: "process", processStep: step };
    }

    const inlineProcess = parseInlineProcess(bullet.text);
    if (inlineProcess) {
      const normalizedProcess = normalizeBlockLabel(inlineProcess);
      if (isHttpRequestLine(inlineProcess)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} has malformed Process entry: ${inlineProcess}. Put request lines under a marked process such as Process P1: Submit request.`,
          line: bullet.location.line
        });
        return { block: "process", rejectedProcessStepIndent: bullet.indent };
      }
      const [inlineProcessKey, inlineProcessValue] = splitKeyValue(inlineProcess);
      const normalizedInlineProcessKey = normalizeBlockLabel(inlineProcessKey);
      if (inlineProcessValue !== undefined && normalizedInlineProcessKey !== "validate" && normalizedInlineProcessKey !== "resolve") {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} has malformed Process entry: ${inlineProcess}. Start with a marked process such as Process P1: Submit request.`,
          line: bullet.location.line
        });
        return { block: "process", rejectedProcessStepIndent: bullet.indent };
      }
      if (normalizedProcess === "client call" || normalizedProcess === "clientcall") {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} process step ${inlineProcess} is not supported. Use ServerCall instead.`,
          line: bullet.location.line
        });
        return { block: "process", rejectedProcessStepIndent: bullet.indent };
      }

      const step = createProcessStep(inlineProcessValue === undefined ? inlineProcess : inlineProcessKey.trim(), bullet.indent, bullet.location);
      if (inlineProcessValue !== undefined && normalizedInlineProcessKey === "validate") {
        step.details.push({
          key: "validation",
          value: inlineProcessValue.trim(),
          location: bullet.location
        });
        addPropertyLocation(step.propertyLocations, "validation", bullet.location);
      }
      if (inlineProcessValue !== undefined && normalizedInlineProcessKey === "resolve") {
        step.resolveGroup = inlineProcessValue.trim();
        addPropertyLocation(step.propertyLocations, "resolve", bullet.location);
      }
      action.processSteps.push(step);
      return { block: "process", processStep: step };
    }

    const block = parseActionBlock(bullet.text);
    if (block) {
      return { block, outcome: block === "otherwise" ? "otherwise" : undefined };
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has unsupported top-level entry: ${bullet.text}. Use From, Process P1: <name>, or Otherwise.`,
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
          message: `Action ${action.id} has malformed Process entry: ${bullet.text}. Put request lines under a marked process such as Process P1: Submit request.`,
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

      if (context.processOutcome && context.processOutcomeIndent !== undefined && bullet.indent > context.processOutcomeIndent) {
        return applyProcessStepDirectCaseBullet(action, context.processStep, bullet, context, diagnostics);
      }

      if (context.processEffectsIndent !== undefined && bullet.indent > context.processEffectsIndent) {
        applyProcessStepEffect(action, context.processStep, bullet, activeNestedBlock(context, bullet), diagnostics);
        return {
          block: context.block,
          processStep: context.processStep,
          processEffectsIndent: context.processEffectsIndent,
          ...nextNestedContext(bullet, context)
        };
      }

      const directCaseName = parseDirectCaseName(bullet.text);
      if (directCaseName) {
        getProcessStepOutcome(context.processStep, directCaseName, bullet.location);
        return {
          block: context.block,
          processStep: context.processStep,
          processOutcome: directCaseName,
          processOutcomeIndent: bullet.indent
        };
      }

      if (isCasesBlock(bullet.text)) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${action.id} process step ${context.processStep.name} uses removed cases block syntax. Use direct case: <name> entries under Process: ${context.processStep.name}.`,
          line: bullet.location.line
        });
        return { block: context.block, processStep: context.processStep, rejectedProcessStepIndent: bullet.indent };
      }

      if (normalizeBlockLabel(bullet.text) === "effects") {
        return { block: context.block, processStep: context.processStep, processEffectsIndent: bullet.indent };
      }

      applyProcessStepBullet(action, context.processStep, bullet, activeNestedBlock(context, bullet), diagnostics);
      return { block: context.block, processStep: context.processStep, ...nextNestedContext(bullet, context) };
    }
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has malformed Process entry: ${bullet.text}. Start with a marked process such as Process P1: Submit request.`,
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
  if (normalized === "otherwise") {
    return "otherwise";
  }
  return undefined;
}

function parseInlineProcess(text: string): string | undefined {
  const [key, value] = splitKeyValue(text);
  return normalizeBlockLabel(key) === "process" && value !== undefined && value.trim()
    ? value.trim()
    : undefined;
}

function parseDirectCaseName(text: string): string | undefined {
  const [key, value] = splitKeyValue(text);
  return normalizeBlockLabel(key) === "case" && value !== undefined && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value.trim())
    ? value.trim()
    : undefined;
}

function parseCanonicalProcess(text: string): { marker: string; name: string } | undefined {
  const match = /^(P[A-Za-z0-9_-]*)\s*:\s*(.+)$/u.exec(text.trim());
  if (!match) {
    return undefined;
  }
  return {
    marker: match[1],
    name: match[2].trim()
  };
}

function parseCanonicalProcessHeading(text: string): { marker: string; name: string } | undefined {
  const match = /^Process\s+(P[A-Za-z0-9_-]*)\s*:\s*(.+)$/u.exec(text.trim());
  if (!match) {
    return undefined;
  }
  return {
    marker: match[1],
    name: match[2].trim()
  };
}

function normalizeBlockLabel(text: string): string {
  return text.trim().replace(/:$/, "").trim().toLowerCase();
}

function isProcessCaseFlowDirective(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "stop" || normalized === "continue";
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
  const canonical = parseCanonicalProcess(name);
  return {
    name: canonical?.name ?? name,
    marker: canonical?.marker,
    indent,
    when: [],
    skipWhen: [],
    inputs: [],
    receives: [],
    results: [],
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
  action.properties["triggered"] = value;
  addPropertyLocation(action.propertyLocations, "triggered", location);
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
  currentNestedBlock: ProcessNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const normalizedStep = normalizeBlockLabel(step.name);
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  const isHttpRequestStep = normalizedStep === "http request" || normalizedStep === "httprequest";

  if (currentNestedBlock === "input" && value !== undefined) {
    step.inputs.push({ key, value, location: bullet.location });
    addPropertyLocation(step.propertyLocations, `input ${key}`, bullet.location);
    return;
  }

  if (currentNestedBlock === "receive" && value !== undefined) {
    step.receives.push({ key, value, location: bullet.location });
    addPropertyLocation(step.propertyLocations, `receive ${key}`, bullet.location);
    return;
  }

  if (currentNestedBlock === "result") {
    step.results.push({ key: value === undefined ? "result" : key, value: value ?? bullet.text, location: bullet.location });
    addPropertyLocation(step.propertyLocations, "result", bullet.location);
    return;
  }

  if (isProcessStepDirectEffect(key, value, currentNestedBlock)) {
    applyProcessStepEffect(action, step, bullet, currentNestedBlock, diagnostics);
    return;
  }

  if (isProcessDetailNestedBlock(currentNestedBlock)) {
    if (value === undefined || value === "") {
      const normalized = normalizeBlockLabel(bullet.text);
      if (!isProcessDetailBlockLabel(normalized) && normalized !== "params") {
        step.details.push({ key: currentNestedBlock, value: bullet.text, location: bullet.location });
        addPropertyLocation(step.propertyLocations, currentNestedBlock, bullet.location);
      }
      return;
    }

    step.details.push({ key: `${currentNestedBlock}.${key}`, value, location: bullet.location });
    addPropertyLocation(step.propertyLocations, currentNestedBlock, bullet.location);
    return;
  }

  if (["request", "server", "response", "validation"].includes(currentNestedBlock ?? "") && value !== undefined) {
    step.details.push({ key: `${currentNestedBlock}.${key}`, value, location: bullet.location });
    addPropertyLocation(step.propertyLocations, currentNestedBlock ?? key, bullet.location);
    return;
  }

  if (normalizedStep.startsWith("resolve") && (key === "resolve" || key === "group") && value !== undefined) {
    step.resolveGroup = value;
    addPropertyLocation(step.propertyLocations, key, bullet.location);
    return;
  }

  if ((key === "parallel" || key === "group") && value !== undefined) {
    step.parallelGroup = value;
    addPropertyLocation(step.propertyLocations, key, bullet.location);
    return;
  }

  if ((value === undefined || value === "") && (isProcessDetailBlockLabel(normalizeBlockLabel(bullet.text)) || isCustomProcessDetailBlockStart(bullet.text) || ["input", "receive", "result"].includes(normalizeBlockLabel(bullet.text)))) {
    if (isCustomProcessDetailBlockStart(bullet.text)) {
      addPropertyLocation(step.propertyLocations, `detail ${normalizeBlockLabel(bullet.text)}`, bullet.location);
    }
    if (normalizeBlockLabel(bullet.text) === "input") {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} process step ${step.name} uses legacy input block syntax. Put execution values under request.params, server.params, or custom detail params instead.`,
        line: bullet.location.line
      });
    }
    return;
  }

  if (isHttpRequestStep) {
    if (value !== undefined && isUpdateEffectKey(key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${action.id} HttpRequest has unsupported entry: ${bullet.text}. Use request parameter entries or move update details under a case update block.`,
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

  if (key === "target" && normalizeBlockLabel(step.name) === "validate") {
    step.target = value;
    addPropertyLocation(step.propertyLocations, "target", bullet.location);
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

function applyProcessStepDirectCaseBullet(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  bullet: ActionBulletInput,
  context: ActionParseContext,
  diagnostics: MarkVSpecDiagnostic[]
): ActionParseContext {
  const outcomeName = context.processOutcome;
  if (!outcomeName || context.processOutcomeIndent === undefined) {
    return { block: "process", processStep: step };
  }

  if (bullet.indent <= context.processOutcomeIndent) {
    return { block: "process", processStep: step };
  }

  const normalized = normalizeBlockLabel(bullet.text);
  if (normalized === "effects") {
    return {
      block: "process",
      processStep: step,
      processOutcome: outcomeName,
      processOutcomeIndent: context.processOutcomeIndent,
      processEffectsIndent: bullet.indent
    };
  }

  const nestedBlock = activeNestedBlock(context, bullet);
  const flowUnderEffects = context.processEffectsIndent !== undefined && bullet.indent > context.processEffectsIndent;
  applyProcessStepCaseEffect(action, step, outcomeName, bullet, nestedBlock, diagnostics, flowUnderEffects);
  return {
    block: "process",
    processStep: step,
    processOutcome: outcomeName,
    processOutcomeIndent: context.processOutcomeIndent,
    processEffectsIndent: context.processEffectsIndent,
    ...nextNestedContext(bullet, context)
  };
}

function applyProcessStepCaseEffect(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  result: string,
  bullet: ActionBulletInput,
  currentNestedBlock: ProcessNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  flowUnderEffects = false
): void {
  const outcome = getProcessStepOutcome(step, result, bullet.location);
  applyStructuredEffectToOutcome(action, outcome, result, bullet, currentNestedBlock, diagnostics, `process step ${step.name} case ${result}`, flowUnderEffects);
}

function applyProcessStepEffect(
  action: MarkVSpecAction,
  step: MarkVSpecProcessStep,
  bullet: ActionBulletInput,
  currentNestedBlock: ProcessNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (key === "display") {
    ensureStepDisplayEffect(step, bullet.location);
    return;
  }

  if (value === undefined) {
    return;
  }

  const sideEffect = structuredSideEffect(key, value);
  if (sideEffect) {
    step.sideEffects.push(sideEffect);
    addPropertyLocation(step.propertyLocations, key, bullet.location);
    return;
  }

  if (key === "state" || key === "navigate") {
    step.to = value;
    addPropertyLocation(step.propertyLocations, key, bullet.location);
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

  if (currentNestedBlock === "display" && value !== undefined) {
    applyDisplayEffectToStep(step, key, value, bullet.location);
    return;
  }

  if (currentNestedBlock === "display-content" && value !== undefined) {
    const display = ensureStepDisplayEffect(step, bullet.location);
    display.contentSource.push({ key, value, location: bullet.location });
    addPropertyLocation(display.propertyLocations, `content.${key}`, bullet.location);
    return;
  }

  if (key === "update") {
    return;
  }

  if (isUpdateEffectKey(key)) {
    if (currentNestedBlock === "update") {
      applyActionEffect(step, key, value, bullet.location);
      return;
    }

    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} process step ${step.name} has unsupported Effects entry: ${bullet.text}. Put update details under an update block.`,
      line: bullet.location.line
    });
    return;
  }

  diagnostics.push({
    severity: "warning",
    message: `Action ${action.id} process step ${step.name} has unsupported Effects entry: ${bullet.text}. Use model, view, state, navigate, or update.`,
    line: bullet.location.line
  });
}

function isProcessStepDirectEffect(key: string, value: string | undefined, currentNestedBlock: ProcessNestedBlock | undefined): boolean {
  if (currentNestedBlock === "display" || currentNestedBlock === "display-content" || currentNestedBlock === "update") {
    return true;
  }

  if (value === undefined) {
    return false;
  }

  return key === "state" || key === "navigate" || key === "display" || key === "update" || structuredSideEffect(key, value) !== undefined;
}

function ensureStepDisplayEffect(step: MarkVSpecProcessStep, location: SourceLocation): NonNullable<MarkVSpecProcessStep["display"]> {
  step.display ??= {
    contentSource: [],
    location,
    propertyLocations: {}
  };
  return step.display;
}

function applyDisplayEffectToStep(step: MarkVSpecProcessStep, key: string, value: string, location: SourceLocation): void {
  const display = ensureStepDisplayEffect(step, location);
  if (key === "target") {
    display.target = value;
  } else if (key === "element") {
    display.element = value;
  } else if (key === "message") {
    display.message = value;
  } else if (key === "partial") {
    display.partial = value;
  } else if (key === "content") {
    display.content = value;
  } else {
    display.contentSource.push({ key, value, location });
  }
  addPropertyLocation(display.propertyLocations, key, location);
}

function applyActionStructuredEffect(
  action: MarkVSpecAction,
  result: string | undefined,
  bullet: ActionBulletInput,
  currentNestedBlock: ProcessNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (value === undefined && result && isProcessCaseFlowDirective(key)) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} case ${result} has unsupported flow directive ${key}. Use stop or continue only under a process case block.`,
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
    message: `Action ${action.id} has unsupported Effects entry: ${bullet.text}. Use description, state, navigate, response, from, params, or update.`,
    line: bullet.location.line
  });
}

function applyStructuredEffectToOutcome(
  action: MarkVSpecAction,
  outcome: MarkVSpecActionOutcome,
  result: string,
  bullet: ActionBulletInput,
  currentNestedBlock: ProcessNestedBlock | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  contextLabel: string,
  flowUnderEffects = false
): void {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (value === undefined && isProcessCaseFlowDirective(key) && contextLabel.startsWith("process step ")) {
    const flow = key.trim().toLowerCase() as "stop" | "continue";
    outcome.flow = flow;
    outcome.flowDirectives.push({ value: flow, location: bullet.location, underEffects: flowUnderEffects });
    addPropertyLocation(outcome.propertyLocations, "flow", bullet.location);
    return;
  }

  if (currentNestedBlock === "display" && value !== undefined) {
    applyDisplayEffect(outcome, key, value, bullet.location);
    return;
  }

  if (currentNestedBlock === "display-content" && value !== undefined) {
    const display = ensureDisplayEffect(outcome, bullet.location);
    display.contentSource.push({ key, value, location: bullet.location });
    addPropertyLocation(display.propertyLocations, `content.${key}`, bullet.location);
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

  if (key === "description") {
    outcome.description = value;
    addPropertyLocation(outcome.propertyLocations, "description", bullet.location);
    return;
  }

  if (key === "result") {
    addPropertyLocation(outcome.propertyLocations, "result", bullet.location);
    diagnostics.push({
      severity: "warning",
      message: `Action ${action.id} has unsupported ${contextLabel} entry: ${bullet.text}. Use description for case-level explanatory text; keep result at the Process level.`,
      line: bullet.location.line
    });
    return;
  }

  const sideEffect = structuredSideEffect(key, value);
  if (sideEffect) {
    outcome.sideEffects.push(sideEffect);
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

  if (key === "business rule" || key === "business rules") {
    outcome.businessRules.push(...splitReferenceList(value));
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

  if (key === "display") {
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
    message: `Action ${action.id} has unsupported ${contextLabel} entry: ${bullet.text}. Use description, state, navigate, response, from, params, update, stop, or continue.`,
    line: bullet.location.line
  });
}

function ensureDisplayEffect(outcome: MarkVSpecActionOutcome, location: SourceLocation) {
  outcome.display ??= {
    contentSource: [],
    location,
    propertyLocations: {}
  };
  return outcome.display;
}

function applyDisplayEffect(outcome: MarkVSpecActionOutcome, key: string, value: string, location: SourceLocation): void {
  const display = ensureDisplayEffect(outcome, location);
  if (key === "target") {
    display.target = value;
  } else if (key === "element") {
    display.element = value;
  } else if (key === "message") {
    display.message = value;
  } else if (key === "partial") {
    display.partial = value;
  } else if (key === "content") {
    display.content = value;
  } else {
    display.contentSource.push({ key, value, location });
  }
  addPropertyLocation(display.propertyLocations, key, location);
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

function structuredSideEffect(key: string, value: string): string | undefined {
  if (key === "model" && /^\$\{model\.[^}]+\}\s*=/.test(value)) {
    return `${key}: ${value}`;
  }
  if (key === "view" && /^\$\{view\.[^}]+\}\s*=/.test(value)) {
    return `${key}: ${value}`;
  }
  return undefined;
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

function activeNestedBlock(context: ActionParseContext, bullet: ActionBulletInput): ProcessNestedBlock | undefined {
  return context.nestedBlockIndent !== undefined && bullet.indent > context.nestedBlockIndent
    ? context.nestedBlock
    : undefined;
}

function nextNestedContext(bullet: ActionBulletInput, context: ActionParseContext): Pick<ActionParseContext, "nestedBlock" | "nestedBlockIndent"> {
  const normalized = normalizeBlockLabel(bullet.text);
  if (isProcessDetailNestedBlock(context.nestedBlock) && normalized === "params") {
    return {
      nestedBlock: `${context.nestedBlock}.params`,
      nestedBlockIndent: bullet.indent
    };
  }

  if (normalized === "update" || normalized === "params" || normalized === "input" || normalized === "receive" || normalized === "result" || isKnownProcessDetailBlock(normalized) || normalized === "display") {
    return {
      nestedBlock: normalized,
      nestedBlockIndent: bullet.indent
    };
  }

  if (context.nestedBlock === "display" && normalized === "content") {
    return {
      nestedBlock: "display-content",
      nestedBlockIndent: bullet.indent
    };
  }

  if (context.block === "process" && isCustomProcessDetailBlockStart(bullet.text)) {
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

function isKnownProcessDetailBlock(normalized: string): boolean {
  return normalized === "request" || normalized === "server" || normalized === "response" || normalized === "validation";
}

function isProcessDetailBlockLabel(normalized: string): boolean {
  return isKnownProcessDetailBlock(normalized);
}

function isCustomProcessDetailBlockStart(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.endsWith(":")) {
    return false;
  }
  const normalized = normalizeBlockLabel(trimmed);
  return /^[a-z][a-z0-9_-]*$/u.test(normalized)
    && !["triggered", "from", "process", "otherwise", "case", "effects", "input", "receive", "result", "update", "params", "display", "content"].includes(normalized)
    && !isKnownProcessDetailBlock(normalized);
}

function isProcessDetailNestedBlock(block: ProcessNestedBlock | undefined): block is string {
  if (!block) {
    return false;
  }
  if (["input", "receive", "result", "update", "params", "display", "display-content"].includes(block)) {
    return false;
  }
  return isKnownProcessDetailBlock(block) || block.includes(".") || /^[a-z][a-z0-9_-]*$/u.test(block);
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
    flowDirectives: [],
    sideEffects: [],
    errorCodes: [],
    businessRules: [],
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
    flowDirectives: [],
    sideEffects: [],
    errorCodes: [],
    businessRules: [],
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
