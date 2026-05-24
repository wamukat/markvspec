# MarkVSpec 0.7.1 Release Notes

Release date: 2026-05-24

## Highlights

- This patch release closes the source text diagnostics coverage gaps found
  after `0.7.0`.
- Front Matter extension metadata now has explicit diagnostics behavior.
- Generated/static design documents now render thematic breaks consistently with
  VS Code preview.

## Added

- `frontMatter.representedExtension` info diagnostics for unknown scalar
  top-level YAML Front Matter fields such as `x-owner: team-a`.
- `frontMatter.unsupportedExtension` warning diagnostics for unknown non-scalar
  top-level YAML Front Matter fields that cannot be preserved in the public
  `frontMatter` metadata map.
- Maintainer coverage documentation for Front Matter unknown fields, Layout and
  Slot metadata diagnostics, raw HTML prose blocks, and thematic breaks.

## Changed

- Raw HTML blocks in prose are classified as represented source text and render
  as escaped text in VS Code preview and generated/static documents.
- Thematic breaks in structured prose and free-form notes render as
  `<hr class="note-break">` in generated/static documents, matching VS Code
  preview behavior.

## Fixed

- Layout and Slot metadata lines that look like meaningful unsupported author
  text now produce `unrepresented-source-text` warnings instead of being dropped
  silently.

## Compatibility Notes

- No DSL syntax migration is required from `0.7.0`.
- Package versions are aligned at `0.7.1` across the root package, CLI, core,
  document renderer, exporter, docs site, and VS Code extension.
