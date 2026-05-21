# Guide

Use this section to learn how to write `.vspec.md` files as an OSS user. MarkVSpec is a text-first UI specification format, so you do not need to model the whole screen at once. Start with Markdown, then add screen states, layout, elements, actions, and validation step by step.

Detailed syntax belongs in [Reference](../reference/index.md). Guide pages stay focused on authoring concepts, minimal examples, and common patterns. The intended workflow is to write the source, check it in VS Code preview, and export HTML/PDF from the same source when needed.

## Reading Order

1. [Markdown Model](./markdown-model.md): Learn the basic `.vspec.md` structure. Start with metadata, headings, and bullets.
2. [Document Structure](./document-structure.md): Learn where prose and structured DSL content belong. This keeps human-readable notes and parser-readable structure from blurring together.
3. [States](./states.md): Name the screen states. This makes state-specific previews and reviews easier.
4. [Layout](./layout.md): Build the screen skeleton with layout groups and items. Write UI meaning and order, not CSS.
5. [Elements](./elements.md): Describe UI elements such as Heading, Input, and Button. Prefer role, label, and action over visual detail.
6. [Actions](./actions.md): Connect triggers, processes, and cases. This makes API behavior, navigation, and state changes reviewable.
7. [Validation](./validation.md): Capture input constraints and error behavior in the source. Separate field rules from business rules.
8. [Scenarios](./scenarios.md): Name reviewable preview cases such as validation errors, empty data, toast/dialog results, and direct links.
9. [Partial Updates](./partial-updates.md): Describe server-rendered partial updates as intent. Write the request and update semantics, not raw attributes.

## How To Use This Guide

Create the minimal example from [Markdown Model](./markdown-model.md) as a `.vspec.md` file and confirm it appears in VS Code preview. Then add state, layout, element, and action sections for your real screen. When you are unsure, write a short prose note first, then add the structured MarkVSpec section below it.

MarkVSpec source is plain text. It works well with Git diff reviews, AI edits, and HTML/PDF export from the same source. Each Guide page helps you start small while staying aligned with that text-first workflow.

## Examples

- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Scenario Preview Data](../../../examples/showcase/scenario-samples.html)
- [Profile Page With Template](../../../examples/showcase/profile-page-with-template.html)

## Next Reading

- [Reference](../reference/index.md)
