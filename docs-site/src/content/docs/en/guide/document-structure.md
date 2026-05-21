---
title: "Document Structure"
---

This page shows where readable prose and structured DSL sections belong inside a MarkVSpec document.
Use these names consistently in tickets, parser behavior, preview behavior, and documentation.

<style>
  .document-structure-visual {
    --mv-line: #d8dee7;
    --mv-line-soft: #e9edf3;
    --mv-muted: #5f6b7a;
    --mv-header-bg: #eef2f7;
    --mv-lead-bg: #f6f1ff;
    --mv-lead-line: #9b7ee8;
    --mv-section-bg: #eef6ff;
    --mv-section-line: #4d8fd6;
    --mv-entity-bg: #edf9f3;
    --mv-entity-line: #42a56e;
    --mv-body-bg: #fff5e9;
    --mv-body-line: #d9822b;
    --mv-free-bg: #f3f0ff;
    --mv-free-line: #7f65d7;
    --mv-code-bg: #111827;
    --mv-code-ink: #e5edf8;
    display: grid;
    gap: 1.25rem;
  }

  .document-structure-visual * {
    box-sizing: border-box;
  }

  .document-structure-visual .grid {
    align-items: start;
    display: grid;
    gap: 1.125rem;
    grid-template-columns: minmax(0, 1.2fr) minmax(18rem, .8fr);
  }

  .document-structure-visual .panel,
  .document-structure-visual .comment {
    background: var(--sl-color-bg);
    border: 1px solid var(--mv-line);
    border-radius: .5rem;
    padding: 1rem;
  }

  .document-structure-visual .skeleton {
    background: var(--sl-color-bg);
    border: 1px solid var(--mv-line);
    border-radius: .5rem;
    overflow: hidden;
  }

  .document-structure-visual .zone {
    border-bottom: 1px solid var(--mv-line-soft);
    border-left: 5px solid transparent;
    padding: .8rem .9rem;
  }

  .document-structure-visual .zone:last-child {
    border-bottom: 0;
  }

  .document-structure-visual .zone-header {
    background: var(--mv-header-bg);
  }

  .document-structure-visual .zone-lead {
    background: var(--mv-lead-bg);
    border-left-color: var(--mv-lead-line);
  }

  .document-structure-visual .zone-section {
    background: var(--mv-section-bg);
    border-left-color: var(--mv-section-line);
  }

  .document-structure-visual .zone-entity {
    background: var(--mv-entity-bg);
    border-left-color: var(--mv-entity-line);
    border-top: 1px solid rgba(66, 165, 110, .25);
    margin: .65rem 0 0 1rem;
  }

  .document-structure-visual .zone-body {
    background: var(--mv-body-bg);
    border-left-color: var(--mv-body-line);
    border-top: 1px solid rgba(217, 130, 43, .25);
    margin: .65rem 0 0 1rem;
  }

  .document-structure-visual .zone-free {
    background: var(--mv-free-bg);
    border-left-color: var(--mv-free-line);
  }

  .document-structure-visual .zone-title {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    font-weight: 750;
    gap: .5rem;
    margin-bottom: .3rem;
  }

  .document-structure-visual .pill {
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 750;
    line-height: 1.2;
    padding: .15rem .5rem;
    white-space: nowrap;
  }

  .document-structure-visual .pill-header {
    color: #334155;
  }

  .document-structure-visual .pill-lead,
  .document-structure-visual .pill-free {
    color: #6d28d9;
  }

  .document-structure-visual .pill-section {
    color: #1d5ea8;
  }

  .document-structure-visual .pill-entity {
    color: #047857;
  }

  .document-structure-visual .pill-body {
    color: #b45309;
  }

  .document-structure-visual .sample {
    color: #334155;
    margin: 0 0 .15rem;
  }

  .document-structure-visual .hint {
    color: var(--mv-muted);
    font-size: .82rem;
    margin: 0;
  }

  .document-structure-visual .terms {
    display: grid;
    gap: .5rem;
  }

  .document-structure-visual .term {
    background: color-mix(in srgb, var(--sl-color-bg) 94%, #e2e8f0);
    border: 1px solid var(--mv-line-soft);
    border-radius: .4rem;
    padding: .65rem;
  }

  .document-structure-visual .term strong {
    display: block;
    margin-bottom: .2rem;
  }

  .document-structure-visual .term span {
    color: var(--mv-muted);
    font-size: .82rem;
  }

  .document-structure-visual .code-map {
    align-items: start;
    display: grid;
    gap: .875rem;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, .75fr);
  }

  .document-structure-visual pre {
    background: var(--mv-code-bg);
    border-radius: .5rem;
    color: var(--mv-code-ink);
    font: .78rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin: 0;
    overflow: auto;
    padding: 1rem;
  }

  .document-structure-visual pre code {
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0;
  }

  .document-structure-visual .legend {
    margin: 0;
    padding-left: 1.2rem;
  }

  .document-structure-visual .legend li + li,
  .document-structure-visual .rules .rule + .rule {
    margin-top: .5rem;
  }

  .document-structure-visual .rule {
    background: color-mix(in srgb, var(--sl-color-bg) 94%, #e2e8f0);
    border-left: 4px solid var(--mv-section-line);
    padding: .65rem .75rem;
  }

  @media (max-width: 54rem) {
    .document-structure-visual .grid,
    .document-structure-visual .code-map {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="document-structure-visual">
  <section class="grid" aria-labelledby="map-title">
    <div>
      <h2 id="map-title">Annotated Skeleton</h2>
      <div class="skeleton" aria-label="Annotated MarkVSpec document skeleton">
        <div class="zone zone-header">
          <div class="zone-title"><span class="pill pill-header">Document Header</span> Front Matter and H1</div>
          <p class="sample"><code>---</code> metadata, then <code># SCR-* Title</code></p>
          <p class="hint">Document-wide identity, title, route, and metadata.</p>
        </div>
        <div class="zone zone-lead">
          <div class="zone-title"><span class="pill pill-lead">Document Lead</span> Purpose before the first section</div>
          <p class="sample">Markdown body after H1 and before the first <code>##</code>.</p>
          <p class="hint">Use this for the screen, template, partial, or example purpose.</p>
        </div>
        <div class="zone zone-section">
          <div class="zone-title"><span class="pill pill-section">Section</span> Level-2 recognized section</div>
          <p class="sample"><code>## States</code>, <code>## Layout</code>, <code>## Elements</code>, <code>## Actions</code></p>
          <p class="hint">Recognized sections are interpreted by the parser; unknown sections are preserved as Markdown.</p>
          <div class="zone zone-body">
            <div class="zone-title"><span class="pill pill-body">Section Lead</span> Prose before structured entries</div>
            <p class="sample">Markdown body immediately below the section heading.</p>
            <p class="hint">Displayed before that section's table, list, or entity summary.</p>
          </div>
          <div class="zone zone-entity">
            <div class="zone-title"><span class="pill pill-entity">Entity Block</span> Level-3 definition unit</div>
            <p class="sample"><code>### A1:A-Submit Submit</code>, <code>### E-EmailInput Input</code></p>
            <p class="hint">An ID-bearing definition such as an Action, Element, Validation, or Business Rule.</p>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Entity Lead</span> Prose before entity DSL</div>
              <p class="sample">Markdown directly below the entity heading.</p>
              <p class="hint">Use this for the entity's purpose or design intent.</p>
            </div>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Structured Body</span> Machine-readable DSL</div>
              <p class="sample"><code>- Process P1: ...</code>, <code>- case: ...</code>, <code>- label: ...</code></p>
              <p class="hint">The parser, validator, and preview interpret this region as MarkVSpec semantics.</p>
            </div>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Entity Notes</span> Prose after entity DSL</div>
              <p class="sample">Markdown after the structured list, still inside the entity.</p>
              <p class="hint">Use this for caveats, implementation notes, or background.</p>
            </div>
          </div>
          <div class="zone zone-body">
            <div class="zone-title"><span class="pill pill-body">Section Notes</span> Prose after section structures</div>
            <p class="sample">Markdown after entity blocks or structured definitions.</p>
            <p class="hint">Use this for notes that apply to the whole section.</p>
          </div>
        </div>
        <div class="zone zone-free">
          <div class="zone-title"><span class="pill pill-free">Free-form Section</span> Markdown-only section</div>
          <p class="sample"><code>## Notes</code>, <code>## Open Questions</code>, or an unrecognized <code>##</code></p>
          <p class="hint">Preserved as authored Markdown, not interpreted as structured DSL.</p>
        </div>
      </div>
    </div>
    <aside class="panel" aria-labelledby="terms-title">
      <h2 id="terms-title">Canonical Terms</h2>
      <div class="terms">
        <div class="term"><strong>Document Header</strong><span>YAML Front Matter and the first level-1 heading.</span></div>
        <div class="term"><strong>Document Lead</strong><span>Markdown below the H1 and before the first level-2 section.</span></div>
        <div class="term"><strong>Section</strong><span>A level-2 heading such as <code>## States</code> or <code>## Actions</code>.</span></div>
        <div class="term"><strong>Section Lead</strong><span>Markdown at the beginning of a section, before structured entries.</span></div>
        <div class="term"><strong>Entity Block</strong><span>An ID-bearing level-3 definition unit.</span></div>
        <div class="term"><strong>Entity Lead</strong><span>Markdown directly below an entity heading and before its structured body.</span></div>
        <div class="term"><strong>Structured Body</strong><span>Lists and supported tables interpreted as MarkVSpec semantics.</span></div>
        <div class="term"><strong>Entity Notes</strong><span>Supplemental Markdown after an entity structured body.</span></div>
        <div class="term"><strong>Section Notes</strong><span>Supplemental Markdown after a section's structured definitions.</span></div>
        <div class="term"><strong>Free-form Section</strong><span>A Markdown section preserved without DSL interpretation.</span></div>
      </div>
    </aside>
  </section>

  <section class="panel" aria-labelledby="source-title">
    <h2 id="source-title">Source Range Example</h2>
    <div class="code-map">
      <pre><code>---
id: SCR-LOGIN
type: screen
title: Login
---
&#35; SCR-LOGIN Login

Explains the whole screen.

&#35;&#35; Elements

Element catalog notes.

&#35;&#35;&#35; E-EmailInput Input

Collects the user's email.

- label: Email
- type: email

Input-specific implementation note.

&#35;&#35;&#35; Section Notes

Notes for all elements.

&#35;&#35; Notes

Open authoring notes.</code></pre>
      <ol class="legend">
        <li><strong>Document Header</strong>: Front Matter plus <code># SCR-LOGIN Login</code>.</li>
        <li><strong>Document Lead</strong>: <q>Explains the whole screen.</q></li>
        <li><strong>Section</strong>: <code>## Elements</code>.</li>
        <li><strong>Section Lead</strong>: <q>Element catalog notes.</q></li>
        <li><strong>Entity Block</strong>: <code>### E-EmailInput Input</code>.</li>
        <li><strong>Entity Lead</strong>: <q>Collects the user's email.</q></li>
        <li><strong>Structured Body</strong>: <code>- label</code> and <code>- type</code>.</li>
        <li><strong>Entity Notes</strong>: <q>Input-specific implementation note.</q></li>
        <li><strong>Section Notes</strong>: <code>### Section Notes</code> content.</li>
        <li><strong>Free-form Section</strong>: <code>## Notes</code>.</li>
      </ol>
    </div>
  </section>

  <section class="panel" aria-labelledby="rules-title">
    <h2 id="rules-title">Placement Rules</h2>
    <div class="rules">
      <div class="rule"><strong>Lead appears before the target.</strong> A <code>Section Lead</code> appears before the section's generated table, list, or summary. An <code>Entity Lead</code> appears at the start of that entity's detail.</div>
      <div class="rule"><strong>Notes appear after the target.</strong> <code>Entity Notes</code> follow the entity's structured content. <code>Section Notes</code> follow the section's structured definitions.</div>
      <div class="rule"><strong>Structured Body is semantic data.</strong> Parser, validator, preview, and export behavior may depend on it. Prose regions are preserved as Markdown but do not define DSL semantics.</div>
      <div class="rule"><strong>HTML comments are authoring comments.</strong> Comments such as <code>&lt;!-- todo --&gt;</code> in prose regions are not displayed in preview or export output.</div>
    </div>
  </section>

  <section class="comment" aria-labelledby="language-title">
    <h2 id="language-title">Recommended Language</h2>
    <p>Use <code>Section Lead</code>, <code>Entity Lead</code>, <code>Entity Notes</code>, and <code>Section Notes</code> instead of vague phrases such as "above the structured block" or "below the list".</p>
  </section>
</div>
