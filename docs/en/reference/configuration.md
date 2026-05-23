# External Inputs And Configuration

<!-- markvspec-coverage:reference.page.configuration -->

MarkVSpec has a small set of external inputs. Most behavior comes from the
`.vspec.md` source itself; configuration is used only for document metadata,
project composition, renderer labels, command options, and export environment.

This page lists the inputs that can change how tools read, preview, validate, or
export a MarkVSpec document.

## Input Summary

| Input | Where It Is Written | Used By |
| --- | --- | --- |
| Screen document metadata | YAML Front Matter in `.vspec.md` | Parser, preview, export |
| Project file | `.vspec.project.md` | Project preview, project HTML/PDF export, `export document-list` |
| Renderer messages | CLI `--messages`, Front Matter `messages`, or nearby `markvspec.messages.*` files | HTML/PDF export, VS Code preview labels |
| CLI options | Command line flags such as `--out`, `--messages`, and `--fail-on-warnings` | CLI validation and export |
| VS Code commands | Command Palette commands contributed by the extension | VS Code preview, format, export, refresh |
| PDF browser | Installed Chrome-compatible browser | PDF export |

## Front Matter

YAML Front Matter is the document-level input for a `.vspec.md` file. Common
fields include `id`, `type`, `title`, `route`, and `locale`.

Keep element properties, action behavior, layout items, rules, and validation
details in the Markdown body. Front Matter is only for document-level metadata
and file-level references.

See [File Format](file-format.md) for the current Front Matter fields and source
shape.

## Project Files

A `.vspec.project.md` file lists related screen and template files. Project
preview uses it to show project overview, notes, screen lists, template lists,
transitions, and diagnostics. The CLI `export document-list` command also uses a
project file as its single input.

Project files do not scan arbitrary directories. List the files that belong to
the project.

See [File Format](file-format.md) and [CLI](cli.md) for project file examples
and export behavior.

## Renderer Message Files

Renderer messages customize labels in generated previews and exports. Use them
for localized or product-specific output labels.

Message resolution order is:

1. CLI `--messages <path>`.
2. Front Matter `messages: ./file.yml`.
3. Default files near the source: `markvspec.messages.<locale>.yml`,
   `markvspec.messages.<locale>.yaml`, `markvspec.messages.<locale>.json`,
   `markvspec.messages.yml`, `markvspec.messages.yaml`, or
   `markvspec.messages.json`.

If a renderer message file is missing, invalid, or outside the allowed location,
MarkVSpec falls back to built-in labels and reports a warning. If the file
contains unsupported or non-string message keys, MarkVSpec ignores those keys,
keeps any valid overrides from the same file, and reports warnings.

See [CLI](cli.md#renderer-messages) for command examples and exact export
behavior.

## CLI Options

The CLI accepts source files, directories, or globs for validation and export.
Important options include:

| Option | Meaning |
| --- | --- |
| `--out <dir>` | Output directory for export commands. |
| `--messages <path>` | Explicit renderer message file for HTML/PDF export. |
| `--fail-on-warnings` | Make `validate` fail on warnings as well as errors. |
| `--version` / `-v` | Print the installed CLI version. |

See [CLI](cli.md) for command syntax and inputs.

## VS Code Extension Settings

The VS Code extension currently does not contribute MarkVSpec-specific user
settings in VS Code Settings. Its user-facing inputs are the active `.vspec.md`
or `.vspec.project.md` file, referenced message files, referenced partial files,
and Command Palette commands such as `MarkVSpec: Open Preview`,
`MarkVSpec: Format Structure`, `MarkVSpec: Export Static HTML`,
`MarkVSpec: Export PDF`, and `MarkVSpec: Refresh Preview`.

See [Preview](../start/preview.md) for the current command list.

## PDF Export Environment

PDF export needs a Chrome-compatible browser. The CLI and extension look for
Chrome, Edge, Brave, or Chromium depending on the operating system. This is an
environment dependency rather than MarkVSpec source syntax.

If PDF export fails, export HTML first and inspect the generated HTML before
debugging browser-specific page breaks, fonts, or print behavior.

## Notes

- MarkVSpec does not require JSON as an authoring configuration format.
- Source files are still the canonical input. External inputs should not replace
  screen structure, action behavior, or validation rules in the Markdown body.
- Keep implementation framework settings outside MarkVSpec source unless the
  document is explicitly describing an implementation mapping.

## Related Pages

- [File Format](file-format.md)
- [CLI](cli.md)
- [Preview](../start/preview.md)
- [Limitations](limitations.md)
