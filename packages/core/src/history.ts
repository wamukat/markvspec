import type { MarkVSpecHistoryFieldSchema } from "./types.js";

export const standardHistoryFields: MarkVSpecHistoryFieldSchema[] = [
  {
    key: "date",
    label: "Date",
    required: true,
    type: "date",
    location: { line: 1 },
    raw: "date"
  },
  {
    key: "author",
    label: "Author",
    required: true,
    type: "string",
    location: { line: 1 },
    raw: "author"
  },
  {
    key: "reviewer",
    label: "Reviewer",
    required: false,
    type: "string",
    location: { line: 1 },
    raw: "reviewer"
  },
  {
    key: "reason",
    label: "Reason",
    required: false,
    type: "string",
    location: { line: 1 },
    raw: "reason"
  }
];

export function effectiveHistoryFields(customFields: MarkVSpecHistoryFieldSchema[]): MarkVSpecHistoryFieldSchema[] {
  const fields = new Map(standardHistoryFields.map((field) => [field.key, field]));
  for (const field of customFields) {
    fields.set(field.key, field);
  }
  return [...fields.values()];
}
