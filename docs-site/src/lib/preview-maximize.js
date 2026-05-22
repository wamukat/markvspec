const buttons = Array.from(document.querySelectorAll('[data-preview-maximize]'));
let maximizedPane;

function setMaximized(pane, button, maximized) {
  if (!pane) {
    return;
  }
  maximizedPane = maximized ? pane : undefined;
  document.body.dataset.previewMaximized = maximized ? 'true' : 'false';
  pane.dataset.previewMaximized = maximized ? 'true' : 'false';
  button?.setAttribute('aria-pressed', String(maximized));
  button?.setAttribute('aria-label', maximized ? 'Restore preview' : 'Maximize preview');
  button?.setAttribute('title', maximized ? 'Restore preview' : 'Maximize preview');
}

for (const button of buttons) {
  const pane = button.closest('[data-preview-maximizable]');
  if (!pane) {
    continue;
  }
  button.addEventListener('click', () => {
    setMaximized(pane, button, pane.dataset.previewMaximized !== 'true');
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !maximizedPane) {
    return;
  }
  const button = maximizedPane.querySelector('[data-preview-maximize]');
  setMaximized(maximizedPane, button, false);
  button?.focus();
});
