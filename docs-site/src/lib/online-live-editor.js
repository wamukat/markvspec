import {
  evaluateMarkVSpecDiagnostics,
  parseMarkVSpec,
  renderDiagnosticMessageForLocale,
  renderMarkVSpecHtml
} from '@markvspec/core/browser';

const configElement = document.querySelector('#online-live-editor-config');
const editorElement = document.querySelector('[data-online-editor-source]');
const previewElement = document.querySelector('[data-online-editor-preview]');
const diagnosticsElement = document.querySelector('[data-online-editor-diagnostics]');
const statusElement = document.querySelector('[data-online-editor-status]');
const metricsElement = document.querySelector('[data-online-editor-metrics]');
const resetButton = document.querySelector('[data-online-editor-reset]');
const copyButton = document.querySelector('[data-online-editor-copy]');
const downloadLink = document.querySelector('[data-online-editor-download]');

let initialSource = '';
let renderTimer;

function parseConfig() {
  if (!configElement?.textContent) {
    throw new Error('Online editor configuration is missing.');
  }
  return JSON.parse(configElement.textContent);
}

function setStatus(kind, message) {
  if (!statusElement) {
    return;
  }
  statusElement.dataset.status = kind;
  statusElement.textContent = message;
}

function setMetrics(metrics) {
  if (!metricsElement) {
    return;
  }
  metricsElement.textContent = metrics.join(' | ');
}

function setDiagnostics(diagnostics, locale) {
  if (!diagnosticsElement) {
    return;
  }
  diagnosticsElement.replaceChildren();

  if (diagnostics.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No diagnostics.';
    diagnosticsElement.append(item);
    return;
  }

  for (const diagnostic of diagnostics) {
    const item = document.createElement('li');
    const line = diagnostic.location?.line ? `line ${diagnostic.location.line}: ` : '';
    item.dataset.severity = diagnostic.severity;
    item.textContent = `${diagnostic.severity}: ${line}${renderDiagnosticMessageForLocale(diagnostic, locale)}`;
    diagnosticsElement.append(item);
  }
}

function updateDownload(source, fileName) {
  if (!downloadLink) {
    return;
  }
  const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' });
  const previousHref = downloadLink.href;
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = fileName;
  if (previousHref.startsWith('blob:')) {
    URL.revokeObjectURL(previousHref);
  }
}

function renderSource(source, config) {
  const startedAt = performance.now();
  try {
    const result = parseMarkVSpec(source);
    const validation = evaluateMarkVSpecDiagnostics(result.diagnostics);
    const html = renderMarkVSpecHtml(result, { showIds: true });
    const renderedAt = performance.now();

    if (previewElement) {
      previewElement.innerHTML = html;
    }
    setDiagnostics(validation.diagnostics, config.locale);
    setStatus(validation.passed ? 'ready' : 'diagnostics', validation.passed ? 'Preview updated.' : 'Preview updated with diagnostics.');
    setMetrics([
      `source ${(source.length / 1024).toFixed(1)} KiB`,
      `parse/render ${(renderedAt - startedAt).toFixed(1)} ms`,
      `diagnostics ${validation.diagnostics.length}`
    ]);
    updateDownload(source, config.fileName);
  } catch (error) {
    setStatus('error', error instanceof Error ? error.message : String(error));
    setDiagnostics([], config.locale);
    if (previewElement) {
      previewElement.innerHTML = '<div class="editor-error-preview" role="alert">Preview is unavailable until the source can be parsed.</div>';
    }
  }
}

function scheduleRender(config) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderSource(editorElement.value, config);
  }, 120);
}

async function initializeEditor() {
  const config = parseConfig();
  if (!(editorElement instanceof HTMLTextAreaElement)) {
    throw new Error('Online editor source textarea is missing.');
  }

  setStatus('loading', 'Loading source...');
  const response = await fetch(config.sourceHref, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Could not fetch source asset (${response.status}).`);
  }

  initialSource = await response.text();
  editorElement.value = initialSource;
  renderSource(initialSource, config);

  editorElement.addEventListener('input', () => {
    scheduleRender(config);
  });

  resetButton?.addEventListener('click', () => {
    editorElement.value = initialSource;
    renderSource(initialSource, config);
    editorElement.focus();
  });

  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(editorElement.value);
      setStatus('ready', 'Source copied.');
    } catch (error) {
      setStatus(
        'error',
        error instanceof Error ? `Copy failed: ${error.message}` : 'Copy failed.'
      );
    }
  });
}

initializeEditor().catch((error) => {
  setStatus('error', error instanceof Error ? error.message : String(error));
});
