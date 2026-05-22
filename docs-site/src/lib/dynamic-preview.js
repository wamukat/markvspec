import {
  evaluateMarkVSpecDiagnostics,
  parseMarkVSpec,
  renderDiagnosticMessageForLocale,
  renderMarkVSpecHtml
} from '@markvspec/core/browser';

const configElement = document.querySelector('#dynamic-preview-config');
const statusElement = document.querySelector('[data-dynamic-preview-status]');
const metricsElement = document.querySelector('[data-dynamic-preview-metrics]');
const diagnosticsElement = document.querySelector('[data-dynamic-preview-diagnostics]');
const previewElement = document.querySelector('[data-dynamic-preview-output]');
const fallbackElement = document.querySelector('[data-dynamic-preview-fallback]');

function parseConfig() {
  if (!configElement?.textContent) {
    throw new Error('Dynamic preview configuration is missing.');
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

function showFallback() {
  if (fallbackElement) {
    fallbackElement.hidden = false;
  }
  if (previewElement) {
    previewElement.hidden = true;
  }
}

function showDynamicPreview(html) {
  if (previewElement) {
    previewElement.innerHTML = html;
    previewElement.hidden = false;
  }
  if (fallbackElement) {
    fallbackElement.hidden = true;
  }
}

async function renderDynamicPreview() {
  const config = parseConfig();
  if (config.dynamicPreviewEnabled === false) {
    showFallback();
    setStatus('fallback', config.fallbackReason || 'Using generated preview fallback.');
    setMetrics(['fallback generated HTML']);
    setDiagnostics([], config.locale || 'en');
    return;
  }

  const startedAt = performance.now();
  setStatus('loading', 'Loading source...');

  const response = await fetch(config.sourceHref, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Could not fetch source asset (${response.status}).`);
  }

  const source = await response.text();
  const fetchedAt = performance.now();
  const result = parseMarkVSpec(source);
  const validation = evaluateMarkVSpecDiagnostics(result.diagnostics);
  const html = renderMarkVSpecHtml(result, { showIds: true });
  const renderedAt = performance.now();

  showDynamicPreview(html);
  setDiagnostics(validation.diagnostics, config.locale);
  setStatus(validation.passed ? 'ready' : 'diagnostics', validation.passed ? 'Rendered in browser.' : 'Rendered with diagnostics.');
  setMetrics([
    `source ${(source.length / 1024).toFixed(1)} KiB`,
    `fetch ${(fetchedAt - startedAt).toFixed(1)} ms`,
    `parse/render ${(renderedAt - fetchedAt).toFixed(1)} ms`,
    `diagnostics ${validation.diagnostics.length}`
  ]);
}

renderDynamicPreview().catch((error) => {
  showFallback();
  setStatus('fallback', `Using generated preview fallback: ${error instanceof Error ? error.message : String(error)}`);
  setMetrics(['fallback generated HTML']);
  setDiagnostics([], 'en');
});
