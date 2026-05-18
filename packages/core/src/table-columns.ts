import { sourcePathKey } from "./model-paths.js";
import type { MarkVSpecTableColumn } from "./types.js";

export function tableColumnSampleKeys(column: MarkVSpecTableColumn): string[] {
  const sourceKey = column.source ? sourcePathKey(column.source) : undefined;
  const sourceLeaf = sourceKey?.split(".").filter(Boolean).slice(-1)[0];
  const rawSourceLeaf = column.source?.replace(/^\$\{/u, "").replace(/\}$/u, "").split(".").filter(Boolean).slice(-1)[0];
  return [column.key, sourceKey, sourceLeaf, rawSourceLeaf, column.label].filter((value): value is string => Boolean(value));
}
