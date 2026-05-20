# First Screen

Start with `hello.vspec.md`.

This file is the smallest useful Markdown screen specification. The repository `examples/` are for later learning; you do not need them for the first run.

## What To Check

- YAML Front Matter contains the screen ID and title.
- `## States` lists screen states.
- `## Layout: mobile` describes how the screen is arranged.
- `## Elements` describes text, controls, and buttons.
- `## Actions` describes what happens when the button is clicked.

## What This File Represents

`hello.vspec.md` is the smallest useful unit for writing one screen as reviewable
Markdown. It does not define implementation components or CSS. It puts the
screen information in this order:

- `id` / `type` / `title` / `route`: document metadata.
- `# SCR-*`: the screen heading, readable title, and screen ID.
- `States`: screen states used by preview and actions.
- `Layout`: screen groups and item order.
- `Elements`: headings, prose, buttons, and other semantic UI pieces.
- `Actions`: changes caused by user interaction.

You do not need a complete specification on the first pass. Aim for enough
states, elements, layout, and actions to produce a meaningful wireframe preview.

## Create It

Open any folder in VS Code, create `hello.vspec.md`, paste the Hello Screen source from [Start](index.md), and save it.

A `.vspec.md` file should be readable as Markdown. Read the source first, then use preview to inspect the structure.

## What To Change Next

When you adapt Hello Screen to your own screen, change it in this order:

1. Update Front Matter `id`, `title`, and `route`.
2. Replace `Elements` labels and text with real screen copy.
3. Reorder `Layout` `Items` to match the screen.
4. Update button and link `action` references to match the intended behavior.

When you need inputs, validation, or server requests, use [Guide](../guide/index.md)
and [Recipes](../recipes/index.md) instead of stretching the Hello Screen example.

## Next

- [Preview](preview.md)
