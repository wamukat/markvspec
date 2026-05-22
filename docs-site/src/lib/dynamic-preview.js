import {
  composeMarkVSpecTemplate,
  evaluateMarkVSpecDiagnostics,
  parseMarkVSpec,
  renderDiagnosticMessageForLocale
} from '@markvspec/core/browser';
import { renderBrowserDesignDocumentHtml } from '@markvspec/document-renderer/browser';

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

function showRuntimeFailure(error, config = {}) {
  if (fallbackElement) {
    fallbackElement.replaceChildren(runtimeFailureView(error, config));
    fallbackElement.hidden = false;
  }
  if (previewElement) {
    previewElement.replaceChildren();
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

function runtimeFailureView(error, config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-preview-failure';

  const title = document.createElement('h3');
  title.textContent = 'Dynamic preview could not be rendered';
  wrapper.append(title);

  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : String(error);
  wrapper.append(message);

  const links = document.createElement('div');
  links.className = 'dynamic-preview-failure-links';
  appendFailureLink(links, config.sourceHref, 'Open published source asset');
  appendFailureLink(links, config.rawSourceHref, 'Open raw source on GitHub');
  wrapper.append(links);

  return wrapper;
}

function appendFailureLink(parent, href, label) {
  if (!href) {
    return;
  }
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  parent.append(link);
}

async function renderDynamicPreview() {
  const config = parseConfig();
  if (config.dynamicPreviewEnabled === false) {
    showRuntimeFailure(new Error(config.fallbackReason || 'Dynamic preview is disabled.'), config);
    setStatus('fallback', config.fallbackReason || 'Dynamic preview is disabled.');
    setMetrics(['runtime failure UI']);
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
  const html = renderBrowserDesignDocumentHtml(renderResult);
  const renderedAt = performance.now();

  showDynamicPreview(html);
  setDiagnostics(validation.diagnostics, config.locale);
  setStatus(validation.passed ? 'ready' : 'diagnostics', validation.passed ? 'Generated document rendered in browser.' : 'Generated document rendered with diagnostics.');
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
  let config = {};
  try {
    config = parseConfig();
  } catch {
    // Keep the original failure visible when configuration itself is invalid.
  }
  showRuntimeFailure(error, config);
  setStatus('fallback', `Dynamic preview failed: ${error instanceof Error ? error.message : String(error)}`);
  setMetrics(['runtime failure UI']);
  setDiagnostics([], 'en');
});
