export type PreviewHtmlTarget = "webview" | "standalone";

export interface PreviewClientScriptOptions {
  target: PreviewHtmlTarget;
  messages: unknown;
  sourceLabel?: string;
  defaultPositionKey: string;
  mermaidRenderIdPrefix: string;
  updateTimeoutMs: number;
}

export function renderPreviewClientScript(options: PreviewClientScriptOptions): string {
  const webviewMessaging = options.target === "webview";
  const vscodeApiScript = webviewMessaging ? renderVscodeApiClientScript() : "";
  return `      ${vscodeApiScript}
      function serializePreviewClientError(error) {
        if (error instanceof Error) {
          return {
            message: error.message,
            stack: error.stack || ""
          };
        }
        return {
          message: String(error),
          stack: ""
        };
      }
      function reportPreviewClientError(phase, error, detail) {
        const serialized = serializePreviewClientError(error);
        ${webviewMessaging ? `
        try {
          const previewApi = window.__markvspecVscodeApi;
          if (previewApi && typeof previewApi.postMessage === "function") {
            previewApi.postMessage({
              command: "previewClientError",
              phase,
              message: serialized.message,
              stack: serialized.stack,
              detail
            });
            return;
          }
          console.error("MarkVSpec preview error.", phase, error, detail);
        } catch (postError) {
          console.error("Unable to report MarkVSpec preview error.", postError, phase, error);
        }` : `console.error("MarkVSpec preview error.", phase, error, detail, serialized);`}
      }
      window.addEventListener("error", (event) => {
        reportPreviewClientError("window.error", event.error || event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        reportPreviewClientError("window.unhandledrejection", event.reason);
      });
      function runPreviewInitializer(name, initializer) {
        try {
          const result = initializer();
          if (result && typeof result.then === "function") {
            result.catch((error) => reportPreviewClientError(name, error));
          }
          return result;
        } catch (error) {
          reportPreviewClientError(name, error);
          return undefined;
        }
      }
      const markvspecMessages = ${scriptJson(options.messages)};
      const markvspecPreviewPositionKey = ${scriptJson(options.sourceLabel ?? options.defaultPositionKey)};
      let previewPositionRestorePending = true;
      const markvspecMermaidRenderIdPrefix = ${scriptJson(options.mermaidRenderIdPrefix)};
      const pendingRenderCommits = new Map();
      runPreviewInitializer("renderMermaidDiagrams", () => renderMermaidDiagrams());
      runPreviewInitializer("initTableOfContents", () => initTableOfContents());
      runPreviewInitializer("initActiveTableOfContents", () => initActiveTableOfContents());
      runPreviewInitializer("initTableOfContentsToggle", () => initTableOfContentsToggle());
      runPreviewInitializer("initRepeatedContentToggle", () => initRepeatedContentToggle());
      runPreviewInitializer("initPreviewRefreshControls", () => initPreviewRefreshControls());
      runPreviewInitializer("initPreviewFragmentUpdates", () => initPreviewFragmentUpdates());
      runPreviewInitializer("initPreviewPositionTracking", () => initPreviewPositionTracking());
      runPreviewInitializer("restorePreviewPosition", () => restorePreviewPosition());

      async function renderMermaidDiagrams() {
        const blocks = Array.from(document.querySelectorAll("[data-mermaid-source]"));
        const prepared = blocks.map((block) => {
          const source = block.textContent || "";
          const cacheKey = mermaidCacheKey(source);
          return {
            ...prepareMermaidBlock(block, cacheKey),
            cacheKey,
            source
          };
        });
        if (!window.mermaid) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          return;
        }

        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default"
          });
        } catch (error) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          reportPreviewClientError("renderMermaidDiagrams.initialize", error);
          return;
        }

        for (let index = 0; index < prepared.length; index += 1) {
          const item = prepared[index];
          const output = document.createElement("div");
          output.className = "mermaid-render";
          applyCachedMermaidSize(output, item.cacheKey);
          try {
            const rendered = await window.mermaid.render(markvspecMermaidRenderIdPrefix + index, item.source);
            output.innerHTML = rendered.svg;
            item.placeholder.replaceWith(output);
            rememberMermaidSize(item.cacheKey, item.wrapper);
          } catch (error) {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
            reportPreviewClientError("renderMermaidDiagrams", error, { index });
          }
        }
      }

      function prepareMermaidBlock(block, cacheKey) {
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-block";
        applyCachedMermaidSize(wrapper, cacheKey);
        const existingPlaceholder = block.nextElementSibling && block.nextElementSibling.matches("[data-mermaid-placeholder]")
          ? block.nextElementSibling
          : undefined;
        const placeholder = existingPlaceholder || document.createElement("div");
        placeholder.className = "mermaid-placeholder";
        placeholder.textContent = placeholder.textContent || markvspecMessages.mermaidRendering;
        applyCachedMermaidSize(placeholder, cacheKey);
        const toggle = document.createElement("button");
        toggle.className = "mermaid-source-toggle";
        toggle.type = "button";
        toggle.textContent = markvspecMessages.mermaidShowSource;
        toggle.setAttribute("aria-label", markvspecMessages.mermaidShowSource);
        toggle.setAttribute("aria-pressed", "false");
        toggle.addEventListener("click", () => {
          const visible = !wrapper.classList.contains("is-source-visible");
          wrapper.classList.toggle("is-source-visible", visible);
          toggle.textContent = visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource;
          toggle.setAttribute("aria-label", visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource);
          toggle.setAttribute("aria-pressed", String(visible));
        });
        block.before(wrapper);
        wrapper.appendChild(block);
        wrapper.appendChild(toggle);
        wrapper.appendChild(placeholder);
        return { wrapper, placeholder };
      }

      function mermaidSizeCache() {
        if (!(window.__markvspecMermaidSizeCache instanceof Map)) {
          window.__markvspecMermaidSizeCache = new Map();
        }
        return window.__markvspecMermaidSizeCache;
      }

      function mermaidCacheKey(source) {
        let hash = 2166136261;
        for (let index = 0; index < source.length; index += 1) {
          hash ^= source.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return "mmd:" + source.length + ":" + (hash >>> 0).toString(36);
      }

      function applyCachedMermaidSize(element, cacheKey) {
        const cached = mermaidSizeCache().get(cacheKey);
        if (!cached || typeof cached.height !== "number" || !Number.isFinite(cached.height) || cached.height <= 0) {
          return;
        }
        element.style.minHeight = cached.height + "px";
      }

      function rememberMermaidSize(cacheKey, element) {
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const height = Math.ceil(rect.height);
          if (!Number.isFinite(height) || height <= 0 || height > 10000) {
            return;
          }
          mermaidSizeCache().set(cacheKey, { height });
          element.style.minHeight = height + "px";
        });
      }

      document.querySelectorAll("[data-marker-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
          const category = toggle.getAttribute("data-marker-toggle");
          if (!category) {
            return;
          }

          const nextPressed = toggle.getAttribute("aria-pressed") !== "true";
          toggle.setAttribute("aria-pressed", String(nextPressed));
          document.body.classList.toggle("hide-marker-" + category, !nextPressed);
          ${webviewMessaging ? `
          vscode.postMessage({
            command: "toggleMarker",
            category
          });` : ""}
        });
      });

      function initRepeatedContentToggle() {
        const toggle = document.querySelector("[data-repeated-toggle]");
        if (!toggle) {
          return;
        }
        toggle.addEventListener("change", () => {
          const enabled = Boolean(toggle.checked);
          document.body.classList.toggle("hide-repeated-content", !enabled);
          ${webviewMessaging ? `
          vscode.postMessage({
            command: "toggleRepeatedContent",
            enabled
          });` : ""}
        });
      }

      ${webviewMessaging ? `document.querySelectorAll("[data-mm-reference-path]").forEach((link) => {
        link.addEventListener("click", (event) => {
          const path = link.getAttribute("data-mm-reference-path");
          if (!path) {
            return;
          }

          event.preventDefault();
          vscode.postMessage({
            command: "openReference",
            path
          });
        });
      });` : ""}

      function initPreviewFragmentUpdates() {
        ${webviewMessaging ? `
        window.addEventListener("message", async (event) => {
          const message = event.data || {};
          if (message.command === "renderReadyResult") {
            const resolve = pendingRenderCommits.get(message.updateId);
            if (resolve) {
              pendingRenderCommits.delete(message.updateId);
              resolve(Boolean(message.commit));
            }
            return;
          }

          if (message.command !== "replaceFragments") {
            return;
          }

          const requestId = message.requestId || "";
          const updateId = message.updateId || requestId;
          const generationId = message.generationId;
          const result = await applyFragmentUpdate(message.fragments, generationId, updateId);
          vscode.postMessage({
            command: "fragmentUpdateResult",
            generationId,
            reason: result.reason,
            requestId,
            success: result.success,
            updateId,
            webviewPatchMs: result.webviewPatchMs
          });
        });` : ""}
      }

      async function applyFragmentUpdate(fragments, generationId, updateId) {
        const patchStarted = performance.now();
        const patchResult = (success, reason, measuredMs) => ({
          success,
          reason,
          webviewPatchMs: Math.round(measuredMs ?? (performance.now() - patchStarted))
        });
        if (!Array.isArray(fragments)) {
          return patchResult(false, "invalid-fragments");
        }
        if (typeof generationId !== "number" || typeof updateId !== "string" || updateId.length === 0) {
          return patchResult(false, "invalid-update-id");
        }

        const replacements = [];
        for (const fragment of fragments) {
          if (!fragment || typeof fragment.renderKey !== "string" || !Array.isArray(fragment.html)) {
            return patchResult(false, "invalid-fragment");
          }
          const targets = Array.from(document.querySelectorAll('[data-mm-render-key="' + cssAttributeEscape(fragment.renderKey) + '"]'));
          if (targets.length === 0 || targets.length !== fragment.html.length) {
            return patchResult(false, "target-count-mismatch:" + fragment.renderKey);
          }

          for (let index = 0; index < targets.length; index += 1) {
            const template = document.createElement("template");
            template.innerHTML = String(fragment.html[index]).trim();
            const replacement = template.content.firstElementChild;
            const significantNodes = Array.from(template.content.childNodes).filter((node) => !(node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));
            if (!replacement || significantNodes.length !== 1 || significantNodes[0] !== replacement || replacement.getAttribute("data-mm-render-key") !== fragment.renderKey) {
              return patchResult(false, "replacement-root-mismatch:" + fragment.renderKey);
            }
            replacements.push({ target: targets[index], replacement });
          }
        }

        const preCommitPatchMs = performance.now() - patchStarted;
        const commit = await requestRenderCommit(generationId, updateId);
        if (!commit) {
          return patchResult(false, "render-commit-rejected", preCommitPatchMs);
        }

        const domPatchStarted = performance.now();
        const scrollYBeforePatch = window.scrollY;
        for (const item of replacements) {
          item.target.replaceWith(item.replacement);
        }
        initTableOfContents();
        updateTableOfContentsVisibility();
        updateStickyOffset();
        window.scrollTo(0, scrollYBeforePatch);
        updateActiveTableOfContents();
        savePreviewPosition(currentActiveSectionId());
        return patchResult(true, "applied", preCommitPatchMs + (performance.now() - domPatchStarted));
      }

      function requestRenderCommit(generationId, updateId) {
        ${webviewMessaging ? `
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            pendingRenderCommits.delete(updateId);
            resolve(false);
          }, ${options.updateTimeoutMs});
          pendingRenderCommits.set(updateId, (commit) => {
            clearTimeout(timer);
            resolve(commit);
          });
          vscode.postMessage({
            command: "renderReady",
            generationId,
            updateId
          });
        });` : "return Promise.resolve(false);"}
      }

      function cssAttributeEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
          return window.CSS.escape(value);
        }
        return String(value).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
      }

      function initPreviewRefreshControls() {
        const refresh = document.querySelector("[data-refresh-preview]");
        const autoUpdate = document.querySelector("[data-auto-update]");
        const syncRefreshState = () => {
          if (refresh && autoUpdate) {
            refresh.disabled = Boolean(autoUpdate.checked);
          }
        };
        if (autoUpdate) {
          autoUpdate.addEventListener("change", () => {
            syncRefreshState();
            ${webviewMessaging ? `
            vscode.postMessage({ command: "setAutoUpdate", enabled: Boolean(autoUpdate.checked) });
            ` : ""}
          });
        }
        if (refresh) {
          refresh.addEventListener("click", () => {
            if (refresh.disabled) {
              return;
            }
            savePreviewPosition(currentActiveSectionId());
            ${webviewMessaging ? `
            vscode.postMessage({ command: "refreshPreview" });
            ` : ""}
          });
        }
        syncRefreshState();

      }

      function initTableOfContents() {
        const lists = Array.from(document.querySelectorAll("[data-toc-list]"));
        if (lists.length === 0) {
          return;
        }

        try {
          lists.forEach((list) => setTableOfContentsStatus(list, "loading"));
          const sections = Array.from(document.querySelectorAll(".document > .doc-section"));
          lists.forEach((list) => {
            list.innerHTML = "";
            appendTableOfContentsItems(list, sections);
            if (list.querySelector("[data-toc-target]")) {
              clearTableOfContentsStatus(list);
            } else {
              setTableOfContentsStatus(list, "empty");
            }
          });
          updateTableOfContentsVisibility();
        } catch (error) {
          lists.forEach((list) => setTableOfContentsStatus(list, "error"));
          throw error;
        }
      }

      function clearTableOfContentsStatus(list) {
        list.removeAttribute("aria-busy");
        list.removeAttribute("aria-live");
      }

      function setTableOfContentsStatus(list, status) {
        const messages = {
          loading: markvspecMessages.contentsLoading,
          empty: markvspecMessages.contentsEmpty,
          error: markvspecMessages.contentsError
        };
        list.innerHTML = "";
        list.setAttribute("aria-busy", status === "loading" ? "true" : "false");
        list.setAttribute("aria-live", "polite");
        const item = document.createElement("li");
        item.className = "toc-status is-" + status;
        item.dataset.tocStatus = status;
        item.textContent = messages[status] || status;
        list.appendChild(item);
      }

      function appendTableOfContentsItems(list, sections) {
        const viewportGroups = new Map();
        sections.forEach((section, index) => {
          const heading = representativeSectionHeading(section);
          if (!heading) {
            return;
          }

          ensureSectionId(section, index);
          if (section.classList.contains("state-views-section")) {
            appendStateViewsTableOfContentsItem(list, section);
            return;
          }
          if (section.classList.contains("state-screen-section")) {
            appendStateTableOfContentsItem(list, viewportGroups, section, heading);
            return;
          }

          const item = document.createElement("li");
          item.dataset.tocTarget = section.id;
          const link = document.createElement("a");
          link.href = "#" + section.id;
          link.textContent = headingText(heading);
          item.appendChild(link);
          list.appendChild(item);
        });
      }

      function representativeSectionHeading(section) {
        if (section.classList.contains("screen-spec-section")) {
          return undefined;
        }
        const directHeading = Array.from(section.children).find((child) => child.tagName === "H2");
        if (directHeading) {
          return directHeading;
        }
        if (section.classList.contains("state-screen-section")) {
          return section.querySelector(".state-screen-heading");
        }
        return undefined;
      }

      function appendStateTableOfContentsItem(list, viewportGroups, section, heading) {
        const viewport = section.getAttribute("data-viewport") || "__default__";
        let group = viewportGroups.get(viewport);
        if (!group) {
          const groupItem = document.createElement("li");
          groupItem.className = "toc-state-group";
          const groupLink = document.createElement("a");
          groupLink.href = "#" + section.id;
          groupLink.textContent = viewportGroupText(section, heading);
          const sublist = document.createElement("ol");
          sublist.className = "toc-sublist";
          groupItem.appendChild(groupLink);
          groupItem.appendChild(sublist);
          list.appendChild(groupItem);
          group = { item: groupItem, sublist };
          viewportGroups.set(viewport, group);
        }

        const item = document.createElement("li");
        item.dataset.tocTarget = section.id;
        const link = document.createElement("a");
        link.href = "#" + section.id;
        link.textContent = stateHeadingText(section, heading);
        item.appendChild(link);
        group.sublist.appendChild(item);
      }

      function appendStateViewsTableOfContentsItem(list, section) {
        const heading = representativeSectionHeading(section);
        if (!heading) {
          return;
        }

        const item = document.createElement("li");
        item.dataset.tocTarget = section.id;
        const link = document.createElement("a");
        link.href = "#" + section.id;
        link.textContent = headingText(heading);
        const viewportList = document.createElement("ol");
        viewportList.className = "toc-sublist";
        item.appendChild(link);
        item.appendChild(viewportList);
        list.appendChild(item);

        const viewports = Array.from(section.querySelectorAll(":scope > .state-viewport-section"));
        viewports.forEach((viewportSection, viewportIndex) => {
          ensureSectionId(viewportSection, "state-viewport-" + viewportIndex);
          const viewportHeading = Array.from(viewportSection.children).find((child) => child.tagName === "H3");
          const viewportItem = document.createElement("li");
          viewportItem.className = "toc-state-group";
          viewportItem.dataset.tocTarget = viewportSection.id;
          const viewportLink = document.createElement("a");
          viewportLink.href = "#" + viewportSection.id;
          viewportLink.textContent = viewportHeading ? viewportTocText(viewportSection, viewportHeading) : viewportSection.getAttribute("data-viewport") || "Viewport";
          const stateList = document.createElement("ol");
          stateList.className = "toc-sublist";
          viewportItem.appendChild(viewportLink);
          viewportItem.appendChild(stateList);
          viewportList.appendChild(viewportItem);

          Array.from(viewportSection.querySelectorAll(":scope > .state-screen-section")).forEach((stateSection, stateIndex) => {
            ensureSectionId(stateSection, "state-screen-" + viewportIndex + "-" + stateIndex);
            const stateHeading = stateSection.querySelector(".state-screen-heading");
            const stateItem = document.createElement("li");
            stateItem.dataset.tocTarget = stateSection.id;
            const stateLink = document.createElement("a");
            stateLink.href = "#" + stateSection.id;
            stateLink.textContent = numberedTocText(stateSection, stateSection.getAttribute("data-state-view-title") || stateSection.getAttribute("data-state") || (stateHeading ? stateHeadingText(stateSection, stateHeading) : "State"));
            stateItem.appendChild(stateLink);
            stateList.appendChild(stateItem);
          });
        });
      }

      function ensureSectionId(section, index) {
        if (!section.id) {
          section.id = "markvspec-section-" + index;
        }
      }

      function headingText(heading) {
        const parts = Array.from(heading.childNodes)
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || "Section";
      }

      function viewportHeadingText(heading) {
        const parts = Array.from(heading.childNodes)
          .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && (node.classList.contains("state-label") || node.classList.contains("state-badge"))))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ");
      }

      function viewportGroupText(section, heading) {
        const viewport = section.getAttribute("data-viewport");
        if (!viewport) {
          return viewportHeadingText(heading) || "Default";
        }
        const headingViewport = viewportHeadingText(heading);
        return headingViewport && headingViewport.includes(viewport) ? headingViewport : "Viewport " + viewport;
      }

      function viewportTocText(section, heading) {
        const viewport = section.getAttribute("data-viewport");
        const parts = Array.from(heading.childNodes)
          .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && node.classList.contains("state-badge")))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || (viewport ? "Viewport " + viewport : "Viewport");
      }

      function stateHeadingText(section, heading) {
        const stateViewTitle = section.getAttribute("data-state-view-title");
        if (stateViewTitle) {
          return stateViewTitle;
        }
        const parts = Array.from(heading.querySelectorAll(".state-label"))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || headingText(heading);
      }

      function numberedTocText(section, label) {
        const sectionNumber = section.getAttribute("data-section-number");
        return sectionNumber ? sectionNumber + ". " + label : label;
      }

      function updateTableOfContentsVisibility() {
        document.querySelectorAll("[data-toc-target]").forEach((item) => {
          const target = item.getAttribute("data-toc-target");
          const section = target ? document.getElementById(target) : undefined;
          item.hidden = Boolean(section && section.hidden);
        });
        document.querySelectorAll(".toc-state-group").forEach((group) => {
          const stateItems = Array.from(group.querySelectorAll("[data-toc-target]"));
          group.hidden = stateItems.length > 0 && stateItems.every((item) => item.hidden);
        });
        updateActiveTableOfContents();
      }

      function initActiveTableOfContents() {
        initStickyOffsetTracking();
        updateActiveTableOfContents();
        window.addEventListener("scroll", updateActiveTableOfContents, { passive: true });
        window.addEventListener("resize", updateActiveTableOfContents);
      }

      function initStickyOffsetTracking() {
        updateStickyOffset();
        const toolbar = document.querySelector(".toolbar");
        if (toolbar && typeof ResizeObserver === "function") {
          const observer = new ResizeObserver(() => {
            updateStickyOffset();
            updateActiveTableOfContents();
          });
          observer.observe(toolbar);
        }
      }

      function updateStickyOffset() {
        const toolbar = document.querySelector(".toolbar");
        const visible = toolbar && getComputedStyle(toolbar).display !== "none";
        const offset = visible ? Math.ceil(toolbar.getBoundingClientRect().height + 12) : 0;
        document.documentElement.style.setProperty("--markvspec-sticky-offset", offset + "px");
        return offset;
      }

      function updateActiveTableOfContents() {
        const items = Array.from(document.querySelectorAll("[data-toc-target]"));
        if (items.length === 0) {
          return;
        }

        const activeSection = findActiveSection();
        const activeId = activeSection?.id || "";
        items.forEach((item) => {
          item.classList.toggle("is-active", !item.hidden && item.getAttribute("data-toc-target") === activeId);
        });
        savePreviewPosition(activeId);
      }

      function findActiveSection() {
        const sections = Array.from(document.querySelectorAll(".document .doc-section, .document .state-viewport-section"))
          .filter((section) => !section.hidden && section.offsetParent !== null);
        const anchorY = updateStickyOffset() + 16;
        return sections.reduce((best, section) => {
          const rect = section.getBoundingClientRect();
          if (rect.bottom < anchorY) {
            return best;
          }
          if (!best) {
            return section;
          }
          const bestRect = best.getBoundingClientRect();
          const bestDistance = Math.abs(bestRect.top - anchorY);
          const distance = Math.abs(rect.top - anchorY);
          return distance < bestDistance ? section : best;
        }, undefined);
      }

      function currentActiveSectionId() {
        return findActiveSection()?.id || "";
      }

      function initPreviewPositionTracking() {
        window.addEventListener("scroll", () => {
          savePreviewPosition(currentActiveSectionId());
        }, { passive: true });
      }

      function savePreviewPosition(activeSectionId) {
        if (previewPositionRestorePending) {
          return;
        }
        const state = previewState();
        const positionsBySource = {
          ...(state.positionsBySource && typeof state.positionsBySource === "object" ? state.positionsBySource : {})
        };
        positionsBySource[markvspecPreviewPositionKey] = {
          activeSectionId,
          scrollY: window.scrollY
        };
        savePreviewState({
          ...state,
          positionsBySource
        });
      }

      function restorePreviewPosition() {
        const state = previewPositionState();
        requestAnimationFrame(() => {
          try {
            if (Number.isFinite(state.scrollY)) {
              window.scrollTo(0, state.scrollY);
              return;
            }
            if (state.activeSectionId) {
              const section = document.getElementById(state.activeSectionId);
              if (section) {
                section.scrollIntoView({ block: "start" });
                return;
              }
            }
            window.scrollTo(0, 0);
          } finally {
            previewPositionRestorePending = false;
            updateActiveTableOfContents();
          }
        });
      }

      function initTableOfContentsToggle() {
        const toggle = document.querySelector("[data-toc-toggle]");
        if (!toggle) {
          return;
        }

        const state = previewState();
        setTableOfContentsCollapsed(Boolean(state.tocCollapsed), false);
        toggle.addEventListener("click", () => {
          setTableOfContentsCollapsed(!document.body.classList.contains("toc-collapsed"), true);
        });
      }

      function setTableOfContentsCollapsed(collapsed, persist) {
        const toggle = document.querySelector("[data-toc-toggle]");
        document.body.classList.toggle("toc-collapsed", collapsed);
        if (toggle) {
          toggle.setAttribute("aria-expanded", String(!collapsed));
          toggle.setAttribute("title", collapsed ? markvspecMessages.showContents : markvspecMessages.hideContents);
        }
        if (persist) {
          savePreviewState({ ...previewState(), tocCollapsed: collapsed });
        }
      }

      function previewState() {
        ${webviewMessaging ? `
        if (typeof vscode !== "undefined" && typeof vscode.getState === "function") {
          return vscode.getState() || {};
        }` : ""}
        return {};
      }

      function previewPositionState() {
        const state = previewState();
        const positionsBySource = state.positionsBySource;
        if (positionsBySource && typeof positionsBySource === "object") {
          return positionsBySource[markvspecPreviewPositionKey] || {};
        }
        return {};
      }

      function savePreviewState(state) {
        ${webviewMessaging ? `
        if (typeof vscode !== "undefined" && typeof vscode.setState === "function") {
          vscode.setState(state);
        }` : "(void state);"}
      }

      function markerLabel(category) {
        if (category === "layout") return markvspecMessages.layout;
        if (category === "element") return markvspecMessages.element;
        return markvspecMessages.action;
      }`;
}

export function renderPreviewMermaidScriptTag(options: {
  target: PreviewHtmlTarget;
  mermaidScript?: string;
  mermaidScriptUri?: string;
}, scriptNonce: string): string {
  if (options.target === "standalone") {
    return options.mermaidScript ? `<script>\n${options.mermaidScript}\n    </script>` : "";
  }
  return options.mermaidScriptUri ? `<script${scriptNonce} src="${options.mermaidScriptUri}"></script>` : "";
}

function renderVscodeApiClientScript(): string {
  return `function markvspecAcquireVscodeApi() {
        if (window.__markvspecVscodeApi) {
          return window.__markvspecVscodeApi;
        }
        try {
          window.__markvspecVscodeApi = acquireVsCodeApi();
          return window.__markvspecVscodeApi;
        } catch (error) {
          console.warn("Unable to acquire VS Code API for MarkVSpec preview.", error);
          return { postMessage() {} };
        }
      }
      const vscode = markvspecAcquireVscodeApi();`;
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
