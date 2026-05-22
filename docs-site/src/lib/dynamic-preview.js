import {
  composeMarkVSpecTemplate,
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

  const source = await fetchTextAsset(config.sourceHref, 'source asset');
  const fetchedAt = performance.now();
  const result = parseMarkVSpec(source);
  const dependencies = await loadDependencies(config.dependencies);
  const renderResult = dependencies.template
    ? composeMarkVSpecTemplate(dependencies.template.result, result)
    : result;
  const dependencyDiagnostics = [
    ...dependencies.partials.flatMap((partial) => partial.result.diagnostics)
  ];
  const validation = evaluateMarkVSpecDiagnostics([...renderResult.diagnostics, ...dependencyDiagnostics]);
  const html = renderMarkVSpecHtml(renderResult, { showIds: true });
  const renderedAt = performance.now();

  showDynamicPreview(html);
  setDiagnostics(validation.diagnostics, config.locale);
  setStatus(validation.passed ? 'ready' : 'diagnostics', validation.passed ? 'Rendered in browser.' : 'Rendered with diagnostics.');
  setMetrics([
    `source ${(source.length / 1024).toFixed(1)} KiB`,
    `dependencies ${dependencies.count}`,
    `fetch ${(fetchedAt - startedAt).toFixed(1)} ms`,
    `parse/render ${(renderedAt - fetchedAt).toFixed(1)} ms`,
    `diagnostics ${validation.diagnostics.length}`
  ]);
}

async function fetchTextAsset(href, label) {
  const response = await fetch(href, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Could not fetch ${label} (${response.status}).`);
  }
  return response.text();
}

async function loadDependencies(dependencies = {}) {
  const template = dependencies.template
    ? await loadDependency(dependencies.template, 'template')
    : undefined;
  const partials = [];
  for (const partial of dependencies.partials ?? []) {
    partials.push(await loadDependency(partial, `partial ${partial.id || partial.href}`));
  }
  return {
    count: (template ? 1 : 0) + partials.length,
    partials,
    template
  };
}

async function loadDependency(dependency, label) {
  if (!dependency?.href) {
    throw new Error(`Dynamic preview dependency is missing an href for ${label}.`);
  }
  const source = await fetchTextAsset(dependency.href, label);
  const result = parseMarkVSpec(source);
  if (dependency.id && result.screen.id && dependency.id !== result.screen.id) {
    throw new Error(`Dynamic preview ${label} ${dependency.id} points to ${result.screen.id}.`);
  }
  return {
    ...dependency,
    result,
    source
  };
}

renderDynamicPreview().catch((error) => {
  showFallback();
  setStatus('fallback', `Using generated preview fallback: ${error instanceof Error ? error.message : String(error)}`);
  setMetrics(['fallback generated HTML']);
  setDiagnostics([], 'en');
});
