# MarkVSpec Brand Assets

## Icon

<p>
  <img src="../../../assets/markvspec-icon.svg" alt="MarkVSpec" width="128">
</p>

Primary source:

- `assets/markvspec-icon.svg`
- `assets/markvspec-icon.png`

The icon combines three MarkVSpec ideas:

- Markdown document as the canonical source.
- Wireframe blocks as the rendered design surface.
- Pointer shape as live preview and interactive inspection.

## Usage

Use the SVG as the source of truth for demo pages, documentation, and generated
bitmap variants. Use the checked-in PNG when a raster asset is required. Keep
the square composition when exporting to PNG for extension marketplaces or
social previews.

Recommended exports:

- `128x128` PNG for VS Code extension icon.
- `256x256` PNG for documentation and demo site cards.
- `512x512` PNG for high-resolution previews.

For the VS Code extension, place the exported `128x128` PNG inside
`packages/vscode-extension/` and reference it from
`packages/vscode-extension/package.json` with the manifest `icon` field. A
root-level asset is not automatically packaged as the extension icon.

For websites, use meaningful alt text such as `MarkVSpec` when the icon acts as a
brand link. Use empty alt text only when the same label is already visible next
to the icon.

## Notes

The current asset is intentionally simple and vector-first. It is suitable as a
release identity mark. Brand work can refine color, typography, and small size
hinting.
