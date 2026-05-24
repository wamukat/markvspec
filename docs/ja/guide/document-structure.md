# 文書構造

MarkVSpec 文書内の文章と構造化 DSL の位置を説明するページです。
チケット、parser、preview、documentation で同じ名前を使えるように、文書の領域を視覚的に分けます。

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
      <div class="skeleton" aria-label="MarkVSpec document structure">
        <div class="zone zone-header">
          <div class="zone-title"><span class="pill pill-header">Document Header</span> Front Matter と H1</div>
          <p class="sample"><code>---</code> metadata と <code># SCR-* Title</code></p>
          <p class="hint">文書 ID、title、route など、文書全体の metadata を置きます。</p>
        </div>
        <div class="zone zone-lead">
          <div class="zone-title"><span class="pill pill-lead">Document Lead</span> 最初の Section より前の目的説明</div>
          <p class="sample">H1 の後、最初の <code>##</code> より前の Markdown 本文。</p>
          <p class="hint">screen、template、partial、example 全体の目的を書きます。</p>
        </div>
        <div class="zone zone-section">
          <div class="zone-title"><span class="pill pill-section">Section</span> level-2 の認識済み section</div>
          <p class="sample"><code>## States</code>、<code>## Layout</code>、<code>## Elements</code>、<code>## Actions</code></p>
          <p class="hint">認識済み section は parser が解釈し、未知の section は Markdown として保持します。</p>
          <div class="zone zone-body">
            <div class="zone-title"><span class="pill pill-body">Section Lead</span> 構造化定義より前の prose</div>
            <p class="sample">section heading 直下の Markdown 本文。</p>
            <p class="hint">その section の表、一覧、entity summary より前に表示します。</p>
          </div>
          <div class="zone zone-entity">
            <div class="zone-title"><span class="pill pill-entity">Entity Block</span> level-3 の定義単位</div>
            <p class="sample"><code>### A1:A-Submit Submit</code>、<code>### E-EmailInput Input</code></p>
            <p class="hint">Action、Element、Validation、Business Rule など、ID を持つ対象の定義です。</p>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Entity Lead</span> entity DSL より前の prose</div>
              <p class="sample">entity heading 直下の Markdown 本文。</p>
              <p class="hint">その entity の目的や設計意図を書きます。</p>
            </div>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Structured Body</span> 機械可読な DSL</div>
              <p class="sample"><code>#### P1: Process ...</code>、<code>- case: ...</code>、<code>- label: ...</code></p>
              <p class="hint">parser、validator、preview が MarkVSpec semantics として解釈します。</p>
            </div>
            <div class="zone zone-body">
              <div class="zone-title"><span class="pill pill-body">Entity Notes</span> entity DSL の後の prose</div>
              <p class="sample">structured list の後、同じ entity 内に残る Markdown 本文。</p>
              <p class="hint">補足、実装メモ、設計上の注意を書きます。</p>
            </div>
          </div>
          <div class="zone zone-body">
            <div class="zone-title"><span class="pill pill-body">Section Notes</span> section 構造化定義の後の prose</div>
            <p class="sample">entity blocks や structured definitions の後の Markdown 本文。</p>
            <p class="hint">section 全体に対する後置補足です。</p>
          </div>
        </div>
        <div class="zone zone-free">
          <div class="zone-title"><span class="pill pill-free">Free-form Section</span> Markdown-only section</div>
          <p class="sample"><code>## Notes</code>、<code>## Open Questions</code>、未認識の <code>##</code></p>
          <p class="hint">構造化 DSL としては解釈せず、author が書いた Markdown として保持します。</p>
        </div>
      </div>
    </div>
    <aside class="panel" aria-labelledby="terms-title">
      <h2 id="terms-title">Canonical Terms</h2>
      <div class="terms">
        <div class="term"><strong>Document Header</strong><span>YAML Front Matter と最初の level-1 heading。</span></div>
        <div class="term"><strong>Document Lead</strong><span>H1 の下、最初の level-2 section より前の Markdown。</span></div>
        <div class="term"><strong>Section</strong><span><code>## States</code> や <code>## Actions</code> のような level-2 heading。</span></div>
        <div class="term"><strong>Section Lead</strong><span>section 冒頭、構造化 entry より前の Markdown。</span></div>
        <div class="term"><strong>Entity Block</strong><span>ID を持つ level-3 definition unit。</span></div>
        <div class="term"><strong>Entity Lead</strong><span>entity heading 直下、structured body より前の Markdown。</span></div>
        <div class="term"><strong>Structured Body</strong><span>MarkVSpec semantics として解釈する list / table。</span></div>
        <div class="term"><strong>Entity Notes</strong><span>entity structured body の後の補足 Markdown。</span></div>
        <div class="term"><strong>Section Notes</strong><span>section の structured definitions 後の補足 Markdown。</span></div>
        <div class="term"><strong>Free-form Section</strong><span>DSL として解釈しない Markdown section。</span></div>
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

画面全体の説明。

&#35;&#35; Elements

element catalog 全体の説明。

&#35;&#35;&#35; E-EmailInput Input

email 入力の目的。

- label: Email
- type: email

input 固有の実装メモ。

&#35;&#35;&#35; Section Notes

Elements 全体への補足。

&#35;&#35; Notes

設計中の open note。</code></pre>
      <ol class="legend">
        <li><strong>Document Header</strong>: Front Matter と <code># SCR-LOGIN Login</code>。</li>
        <li><strong>Document Lead</strong>: 「画面全体の説明。」</li>
        <li><strong>Section</strong>: <code>## Elements</code>。</li>
        <li><strong>Section Lead</strong>: 「element catalog 全体の説明。」</li>
        <li><strong>Entity Block</strong>: <code>### E-EmailInput Input</code>。</li>
        <li><strong>Entity Lead</strong>: 「email 入力の目的。」</li>
        <li><strong>Structured Body</strong>: <code>- label</code> と <code>- type</code>。</li>
        <li><strong>Entity Notes</strong>: 「input 固有の実装メモ。」</li>
        <li><strong>Section Notes</strong>: <code>### Section Notes</code> の内容。</li>
        <li><strong>Free-form Section</strong>: <code>## Notes</code>。</li>
      </ol>
    </div>
  </section>

  <section class="panel" aria-labelledby="rules-title">
    <h2 id="rules-title">Placement Rules</h2>
    <div class="rules">
      <div class="rule"><strong>Lead は対象の前に表示します。</strong> <code>Section Lead</code> は section の table / list / summary の前に、<code>Entity Lead</code> は entity detail の冒頭に表示します。</div>
      <div class="rule"><strong>Notes は対象の後に表示します。</strong> <code>Entity Notes</code> は entity の structured content の後、<code>Section Notes</code> は section の structured definitions の後に表示します。</div>
      <div class="rule"><strong>Structured Body は semantic data です。</strong> parser、validator、preview、export はこの内容に依存します。prose 領域は Markdown として保持しますが DSL semantics ではありません。</div>
      <div class="rule"><strong>HTML comment は authoring comment です。</strong> prose 領域にある <code>&lt;!-- todo --&gt;</code> のような comment は preview / export に表示しません。</div>
    </div>
  </section>

  <section class="comment" aria-labelledby="language-title">
    <h2 id="language-title">推奨する呼び方</h2>
    <p>「構造化ブロックの上」「list の下」のような曖昧な表現ではなく、<code>Section Lead</code>、<code>Entity Lead</code>、<code>Entity Notes</code>、<code>Section Notes</code> を使います。</p>
  </section>
</div>
