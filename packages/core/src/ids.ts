export const idNamePattern = String.raw`[\p{L}\p{N}-]+`;
export const layoutIdPattern = String.raw`L-${idNamePattern}`;
export const presentationPanelIdPattern = String.raw`P-${idNamePattern}`;
export const layoutGroupIdPattern = String.raw`(?:${layoutIdPattern}|${presentationPanelIdPattern})`;
export const elementIdPattern = String.raw`E-${idNamePattern}`;
export const formGroupIdPattern = String.raw`F-${idNamePattern}`;
export const actionIdPattern = String.raw`A-${idNamePattern}`;
export const ruleIdPattern = String.raw`R-${idNamePattern}`;
export const localIdPattern = String.raw`(?:${layoutIdPattern}|${elementIdPattern}|${actionIdPattern}|${ruleIdPattern})`;
export const layoutItemIdPattern = String.raw`(?:${layoutGroupIdPattern}|${elementIdPattern})`;

export const localIdRegex = new RegExp(String.raw`^${localIdPattern}$`, "u");
export const layoutItemIdRegex = new RegExp(String.raw`^${layoutItemIdPattern}$`, "u");
export const conditionReferenceRegex = new RegExp(localIdPattern, "gu");
export const requestParamSourceIdRegex = new RegExp(String.raw`^(${localIdPattern})(?:\.|$)`, "u");

export function isLocalId(value: string): boolean {
  return localIdRegex.test(value);
}

export function isLayoutItemId(value: string): boolean {
  return layoutItemIdRegex.test(value);
}

export function isPresentationPanelId(value: string): boolean {
  return new RegExp(String.raw`^${presentationPanelIdPattern}$`, "u").test(value);
}

export function isOpaqueExpression(value: string): boolean {
  return /^\$\{[^}]+\}$/u.test(value.trim());
}

export function opaqueExpressionBody(value: string): string | undefined {
  const trimmed = value.trim();
  return isOpaqueExpression(trimmed) ? trimmed.slice(2, -1).trim() : undefined;
}

export function stripOpaqueExpressions(value: string): string {
  return value.replace(/\$\{[^}]+\}/gu, "");
}
