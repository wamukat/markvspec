import { opaqueExpressionBody } from "./ids.js";

export function sourcePathKey(source: string): string {
  return opaqueExpressionBody(source) ?? source;
}
