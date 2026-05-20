export interface PreviewPatchResult {
  success: boolean;
  reason: string;
  webviewPatchMs?: number;
}

export interface PreviewUpdateState {
  hasPreviewPanel: boolean;
  currentGenerationId: number;
  currentDocumentUri: string | undefined;
}

export interface PreviewUpdateControllerOptions<TTimer> {
  clearTimeout(timer: TTimer): void;
  debounceMs: number;
  setTimeout(callback: () => void, delayMs: number): TTimer;
  timeoutMs: number;
}

interface PreviewFragmentUpdatePostTarget {
  postMessage(message: unknown): PromiseLike<boolean>;
}

export class PreviewUpdateController<TTimer> {
  private generationId = 0;
  private pendingFragmentUpdates = new Map<string, (result: PreviewPatchResult) => void>();
  private timer: TTimer | undefined;

  constructor(private readonly options: PreviewUpdateControllerOptions<TTimer>) {}

  reserveGeneration(): number {
    this.generationId += 1;
    return this.generationId;
  }

  invalidateGeneration(): void {
    this.generationId += 1;
  }

  schedule<TDocument>(input: {
    document: TDocument;
    documentUri: string;
    shouldRun: (documentUri: string, generationId: number) => boolean;
    run: (document: TDocument, generationId: number) => void;
  }): void {
    const generationId = this.reserveGeneration();
    this.timer = scheduleCoalescedPreviewUpdate({
      timer: this.timer,
      clearTimeout: this.options.clearTimeout,
      setTimeout: this.options.setTimeout,
      delayMs: this.options.debounceMs,
      document: input.document,
      documentUri: input.documentUri,
      shouldRun: (scheduledDocumentUri) => input.shouldRun(scheduledDocumentUri, generationId),
      run: (scheduledDocument) => input.run(scheduledDocument, generationId),
      clearTimer: () => {
        this.timer = undefined;
      }
    });
  }

  cancelScheduledUpdate(): void {
    if (this.timer === undefined) {
      return;
    }
    this.options.clearTimeout(this.timer);
    this.timer = undefined;
  }

  isCurrentGeneration(state: Omit<PreviewUpdateState, "currentGenerationId">, generationId: number, documentUri: string): boolean {
    return isCurrentPreviewGenerationState({
      ...state,
      currentGenerationId: this.generationId
    }, generationId, documentUri);
  }

  async postFragmentUpdate(
    webview: PreviewFragmentUpdatePostTarget,
    fragments: unknown[],
    generationId: number
  ): Promise<PreviewPatchResult> {
    const updateId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const result = new Promise<PreviewPatchResult>((resolve) => {
      const timer = this.options.setTimeout(() => {
        this.pendingFragmentUpdates.delete(updateId);
        resolve({ success: false, reason: "webview-timeout" });
      }, this.options.timeoutMs);
      this.pendingFragmentUpdates.set(updateId, (patchResult) => {
        this.options.clearTimeout(timer);
        resolve(patchResult);
      });
    });

    let posted = false;
    try {
      posted = await webview.postMessage({
        command: "replaceFragments",
        generationId,
        requestId: updateId,
        updateId,
        fragments
      });
    } catch {
      posted = false;
    }
    if (!posted) {
      const resolve = this.pendingFragmentUpdates.get(updateId);
      this.pendingFragmentUpdates.delete(updateId);
      resolve?.({ success: false, reason: "post-message-failed" });
    }

    return result;
  }

  resolveFragmentUpdateResult(
    requestId: string,
    message: { generationId?: number; success?: boolean; reason?: string; webviewPatchMs?: number },
    documentUri: string,
    state: Omit<PreviewUpdateState, "currentGenerationId">
  ): boolean {
    const resolve = this.pendingFragmentUpdates.get(requestId);
    if (!resolve) {
      return false;
    }
    this.pendingFragmentUpdates.delete(requestId);
    resolve(this.normalizePatchResult(message, documentUri, state));
    return true;
  }

  resolvePendingFragmentUpdates(success: boolean): void {
    for (const resolve of this.pendingFragmentUpdates.values()) {
      resolve({ success, reason: success ? "disposed-success" : "disposed" });
    }
    this.pendingFragmentUpdates.clear();
  }

  normalizePatchResult(
    message: { generationId?: number; success?: boolean; reason?: string; webviewPatchMs?: number },
    documentUri: string,
    state: Omit<PreviewUpdateState, "currentGenerationId">
  ): PreviewPatchResult {
    return normalizePreviewPatchResultState({
      ...state,
      currentGenerationId: this.generationId
    }, message, documentUri);
  }
}

export function scheduleCoalescedPreviewUpdate<TDocument, TTimer>(input: {
  timer: TTimer | undefined;
  clearTimeout: (timer: TTimer) => void;
  setTimeout: (callback: () => void, delayMs: number) => TTimer;
  delayMs: number;
  document: TDocument;
  documentUri: string;
  shouldRun: (documentUri: string) => boolean;
  run: (document: TDocument) => void;
  clearTimer: () => void;
}): TTimer {
  if (input.timer !== undefined) {
    input.clearTimeout(input.timer);
  }

  return input.setTimeout(() => {
    input.clearTimer();
    if (!input.shouldRun(input.documentUri)) {
      return;
    }
    input.run(input.document);
  }, input.delayMs);
}

export function isCurrentPreviewGenerationState(
  state: PreviewUpdateState,
  generationId: number,
  documentUri: string
): boolean {
  return state.hasPreviewPanel && state.currentGenerationId === generationId && state.currentDocumentUri === documentUri;
}

export function normalizePreviewPatchResultState(
  state: PreviewUpdateState,
  message: { generationId?: number; success?: boolean; reason?: string; webviewPatchMs?: number },
  documentUri: string
): PreviewPatchResult {
  if (typeof message.generationId !== "number") {
    return { success: false, reason: message.reason ?? "missing-generation" };
  }
  if (!isCurrentPreviewGenerationState(state, message.generationId, documentUri)) {
    return { success: false, reason: "stale-generation-result" };
  }
  const normalized: PreviewPatchResult = {
    success: Boolean(message.success),
    reason: message.reason ?? (message.success ? "applied" : "webview-rejected")
  };
  if (typeof message.webviewPatchMs === "number" && Number.isFinite(message.webviewPatchMs)) {
    normalized.webviewPatchMs = message.webviewPatchMs;
  }
  return normalized;
}
