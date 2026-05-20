# MarkVSpec

Write UI specifications in Markdown.

- VS Code live preview
- Wireframe rendering
- HTML / PDF export
- AI-friendly text format
- Git-friendly UI specs

日本語の説明は [README.ja.md](README.ja.md) を参照してください。

![Hello Screen Markdown source next to the generated MarkVSpec static HTML preview](docs/assets/readme-hello-screen-preview.png)

## Try It

You do not need to clone this repository to try MarkVSpec.

1. Install the VS Code extension from the
   [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec).

   ```sh
   code --install-extension wamukat.markvspec
   ```

2. Open any folder in VS Code and create `hello.vspec.md`.

3. Paste the Hello Screen source from the
   [Start guide](https://wamukat.github.io/markvspec/docs/en/start/) and save it.

4. Run:

   ```text
   MarkVSpec: Open Preview
   ```

## Where To Go Next

- [Website](https://wamukat.github.io/markvspec/)
- [Start guide](https://wamukat.github.io/markvspec/docs/en/start/)
- [Examples](https://wamukat.github.io/markvspec/examples/)
- [Guide](https://wamukat.github.io/markvspec/docs/en/guide/)
- [Reference](https://wamukat.github.io/markvspec/docs/en/reference/)
- [Recipes](https://wamukat.github.io/markvspec/docs/en/recipes/)

## Tools

- VS Code extension: `wamukat.markvspec`
- CLI package: `@markvspec/cli`

```sh
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

## For Contributors

This section is for people cloning the repository to develop MarkVSpec. You do not need it to try the extension.

```sh
npm run typecheck
npm test
npm run build
```

Maintainer notes live under [docs/en/maintainers/](docs/en/maintainers/) and
[docs/ja/maintainers/](docs/ja/maintainers/).

Release maintainers must run `npm run check:readme-release` before tagging.
