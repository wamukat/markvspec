import assert from "node:assert/strict";

export function lineNumber(source: string, needle: string, occurrence = 1): number {
  let matches = 0;
  const index = source.split(/\r?\n/u).findIndex((line) => {
    if (line !== needle && line.trim() !== needle.trim()) {
      return false;
    }

    matches += 1;
    return matches === occurrence;
  });
  assert.notEqual(index, -1);
  return index + 1;
}
