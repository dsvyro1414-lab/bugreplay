import { randomUUID } from 'node:crypto';
import { mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser as PlaywrightBrowser, type BrowserContext, type Locator, type Page } from 'playwright';
import type { ActionRecord, ActionSemantic, BrowserObservation, CartCheckpoint, CartItem, LocatorSpec, ReproStep, ShopState } from '@bugreplay/contracts';

export interface BrowserEvent {
  type: 'action' | 'observation' | 'tool_error';
  message: string;
  data?: Record<string, unknown>;
  screenshotName?: string;
  videoName?: string;
}
export interface BrowserOptions {
  targetUrl: string;
  allowedOrigins: string[];
  artifactDir: string;
  onEvent?: (event: BrowserEvent) => void | Promise<void>;
  timeoutMs?: number;
  deadlineAt?: number;
  maxActions?: number;
}
export interface BrowserAction {
  kind: 'click' | 'fill' | 'select' | 'check';
  ref: string;
  value?: string;
  checked?: boolean;
}
export class BrowserToolError extends Error {
  constructor(message: string) { super(message); this.name = 'BrowserToolError'; }
}

interface AriaNode { role?: string; name?: string; disabled?: boolean; children?: AriaNode[] }
interface EpisodeRecording {
  context: BrowserContext;
  episodeId: string;
  number: number;
  page?: Page;
  closePromise?: Promise<void>;
}
const roles = new Set<LocatorSpec['role']>(['button', 'link', 'textbox', 'combobox', 'checkbox']);
const scopeRoles = new Set(['region', 'dialog', 'listitem']);
const semantics = new Set<ActionSemantic>(['navigation', 'cart-add', 'cart-remove', 'cart-clear', 'checkout-edit', 'checkout-save', 'checkout-submit']);
const afterCheckpoint = new Set<ActionSemantic>(['navigation', 'checkout-edit', 'checkout-save']);
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

/** Browser-only controlled-shop adapter. The model never receives a Page or an evaluation tool. */
export class BrowserSession {
  readonly records: ActionRecord[] = [];
  readonly checkpoints: CartCheckpoint[] = [];
  observation?: BrowserObservation;
  episodeId = '';
  requiresRestart = false;
  actionCount = 0;
  private browser?: PlaywrightBrowser;
  private context?: BrowserContext;
  private page?: Page;
  private readonly origins: Set<string>;
  private readonly deadlineAt: number;
  private readonly timeoutMs: number;
  private readonly maxActions: number;
  private snapshotId = 0;
  private stepId = 0;
  private refs = new Map<string, LocatorSpec>();
  private navigationBlock?: string;
  private closed = false;
  private closePromise?: Promise<void>;
  private recording?: EpisodeRecording;
  private episodeNumber = 0;

  constructor(private readonly options: BrowserOptions) {
    const target = new URL(options.targetUrl);
    this.origins = new Set(options.allowedOrigins.map(origin => {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.origin !== origin) {
        throw new BrowserToolError('Allowed origins must be HTTP(S) origins without paths or credentials.');
      }
      return parsed.origin;
    }));
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || !this.origins.has(target.origin)) {
      throw new BrowserToolError('The target URL must belong to a configured HTTP(S) test-shop origin.');
    }
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxActions = options.maxActions ?? 40;
    this.deadlineAt = options.deadlineAt ?? Date.now() + 6 * 60_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs < 100 || !Number.isFinite(this.deadlineAt)) {
      throw new BrowserToolError('Browser timeouts must be finite and at least 100 ms.');
    }
    if (!Number.isSafeInteger(this.maxActions) || this.maxActions < 1) throw new BrowserToolError('The browser action budget must be a positive integer.');
  }

  async start(): Promise<BrowserObservation> {
    if (this.closed) throw new BrowserToolError('The browser session is closed.');
    if (this.browser) throw new BrowserToolError('The browser is already started; use restart for a clean episode.');
    this.ensureActionAvailable();
    await mkdir(this.options.artifactDir, { recursive: true });
    if (this.closed) throw new BrowserToolError('The browser session is closed.');
    const launched = await chromium.launch({ headless: true, timeout: this.timeout() });
    if (this.closed) {
      await launched.close();
      throw new BrowserToolError('The browser session was closed during startup.');
    }
    this.browser = launched;
    return this.newEpisode();
  }

  async restart(): Promise<BrowserObservation> {
    this.ensureStarted();
    this.ensureActionAvailable();
    this.invalidateRefs();
    await this.closeEpisode();
    return this.newEpisode();
  }

  async observe(): Promise<BrowserObservation> {
    this.ensureStarted();
    this.invalidateRefs();
    this.checkNavigationBlock();
    return this.capture(await this.settledState());
  }

  async readCart(): Promise<CartItem[]> {
    this.ensureStarted();
    this.checkNavigationBlock();
    return structuredClone((await this.settledState()).cart);
  }

  async checkpointCart(): Promise<CartCheckpoint> {
    this.ensureUsableEpisode();
    const state = await this.settledState();
    if (state.cart.length === 0) throw new BrowserToolError('A cart checkpoint requires at least one visible item.');
    const last = this.records.filter(record => record.episodeId === this.episodeId).at(-1);
    if (!last) throw new BrowserToolError('No trusted setup prefix exists for this episode.');
    const checkpoint: CartCheckpoint = {
      id: `checkpoint-${this.checkpoints.length + 1}`, episodeId: this.episodeId, afterStepId: last.step.id, state: structuredClone(state),
    };
    this.checkpoints.push(checkpoint);
    return structuredClone(checkpoint);
  }

  async act(action: BrowserAction): Promise<BrowserObservation> {
    this.ensureUsableEpisode();
    this.ensureActionAvailable();
    const spec = this.refs.get(action.ref);
    this.invalidateRefs();
    if (!spec) throw new BrowserToolError('Unknown or stale ref. Call observe and use a ref from the new snapshot.');
    const locator = this.locator(spec);
    if (await locator.count() !== 1 || !await locator.isVisible()) {
      throw new BrowserToolError('The snapshot locator is no longer unique and visible. Call observe before retrying.');
    }
    const rawSemantic = await locator.evaluate(element => element.closest('[data-action]')?.getAttribute('data-action') ?? 'unknown');
    const semantic: ActionSemantic = semantics.has(rawSemantic as ActionSemantic) ? rawSemantic as ActionSemantic : 'unknown';
    if (semantic === 'checkout-submit') throw new BrowserToolError('Completing a purchase is prohibited during cart-preservation investigation.');
    if (this.checkpoints.some(checkpoint => checkpoint.episodeId === this.episodeId) && !afterCheckpoint.has(semantic)) {
      throw new BrowserToolError(`Action semantic "${semantic}" is prohibited after a cart checkpoint. Restart to change cart setup.`);
    }
    this.validateAction(action, spec);
    const before = await this.settledState();
    const step = this.makeStep(action, spec);
    let after: ShopState;
    try {
      this.consumeAction();
      switch (action.kind) {
        case 'click': await locator.click({ timeout: this.timeout() }); break;
        case 'fill': await locator.fill(action.value!, { timeout: this.timeout() }); break;
        case 'select': await locator.selectOption(action.value!, { timeout: this.timeout() }); break;
        case 'check': await locator.setChecked(action.checked!, { timeout: this.timeout() }); break;
      }
      this.checkNavigationBlock();
      after = await this.settledState();
    } catch (error) {
      this.requiresRestart = true;
      throw new BrowserToolError(`The action may have partially executed: ${messageOf(error)}. Observe for context, then restart before further actions or a checkpoint.`);
    }
    const record: ActionRecord = { episodeId: this.episodeId, step, semantic, before, after };
    this.records.push(record);
    await this.emit({ type: 'action', message: `${action.kind} ${spec.role} "${spec.name}"`, data: { record } });
    return this.capture(after);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.invalidateRefs();
    if (!this.closePromise) this.closePromise = (async () => {
      await this.closeEpisode().catch(() => undefined);
      await this.browser?.close().catch(() => undefined);
      this.context = undefined;
      this.page = undefined;
      this.browser = undefined;
    })();
    await this.closePromise;
  }

  private async closeEpisode(): Promise<void> {
    const recording = this.recording;
    if (!recording) return;
    if (!recording.closePromise) recording.closePromise = (async () => {
      let closeError: unknown;
      try { await recording.context.close(); } catch (error) { closeError = error; }
      const video = recording.page?.video();
      if (video) {
        try {
          const videoName = `investigation-episode-${recording.number}.webm`;
          // Context closure finalizes the uncut Playwright recording. Moving preserves its original bytes.
          await rename(await video.path(), join(this.options.artifactDir, videoName));
          await this.emit({ type: 'observation', message: `Saved original investigation episode ${recording.number} video.`, videoName,
            data: { episodeId: recording.episodeId, episodeNumber: recording.number } });
        } catch {
          await this.emit({ type: 'tool_error', message: `Could not finalize investigation episode ${recording.number} video.`,
            data: { episodeId: recording.episodeId, episodeNumber: recording.number } });
        }
      }
      if (this.recording === recording) {
        this.recording = undefined;
        this.context = undefined;
        this.page = undefined;
      }
      if (closeError) throw closeError;
    })();
    await recording.closePromise;
  }

  private async newEpisode(): Promise<BrowserObservation> {
    this.timeout();
    if (this.closed || !this.browser) throw new BrowserToolError('The browser session is closed.');
    this.ensureActionAvailable();
    this.episodeId = randomUUID();
    this.requiresRestart = false;
    this.navigationBlock = undefined;
    this.invalidateRefs();
    const recordingDir = join(this.options.artifactDir, 'investigation-recordings');
    await mkdir(recordingDir, { recursive: true });
    if (this.closed || !this.browser) throw new BrowserToolError('The browser session is closed.');
    const context = await this.browser.newContext({ serviceWorkers: 'block', acceptDownloads: false, viewport: { width: 1280, height: 900 },
      recordVideo: { dir: recordingDir, size: { width: 1280, height: 900 } } });
    if (this.closed) {
      await context.close();
      throw new BrowserToolError('The browser session was closed while creating a clean episode.');
    }
    this.context = context;
    const recording: EpisodeRecording = { context, episodeId: this.episodeId, number: ++this.episodeNumber };
    this.recording = recording;
    context.on('page', page => {
      if (!recording.page) recording.page = page;
      else if (page !== recording.page) {
        this.navigationBlock = 'Popup navigation is unsupported by the controlled-shop adapter.';
        void page.close().catch(() => undefined);
      }
    });
    this.context.setDefaultTimeout(this.timeout());
    this.context.setDefaultNavigationTimeout(this.timeout());
    await this.context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!this.permitted(url)) {
        if (request.isNavigationRequest()) this.navigationBlock = 'Navigation to an origin outside the configured test shops was blocked.';
        await route.abort('blockedbyclient');
        return;
      }
      try {
        // Read redirect responses without following them, so a redirect cannot send a request to another origin.
        const response = await route.fetch({ maxRedirects: 0, timeout: this.timeout() });
        if (response.status() >= 300 && response.status() < 400 && response.headers().location) {
          // Playwright routes only the first request of a redirect chain. Conservatively reject redirects in P0.
          this.navigationBlock = 'HTTP redirects are unsupported by the controlled-shop adapter. Use a direct shop URL.';
          await route.abort('blockedbyclient');
          return;
        }
        await route.fulfill({ response });
      } catch {
        await route.abort('failed').catch(() => undefined);
      }
    });
    await this.context.routeWebSocket(/.*/, async socket => {
      const url = new URL(socket.url());
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      if (this.permitted(url)) socket.connectToServer();
      else await socket.close({ code: 1008, reason: 'Origin not allowed' });
    });
    const page = await context.newPage();
    if (this.closed) {
      await this.closeEpisode();
      throw new BrowserToolError('The browser session was closed while creating a clean episode.');
    }
    this.page = page;
    try {
      this.consumeAction();
      await this.page.goto(this.options.targetUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout() });
      this.checkNavigationBlock();
      const state = await this.settledState();
      const url = new URL(this.page.url());
      const step: ReproStep = { id: this.nextStepId(), kind: 'goto', path: `${url.pathname}${url.search}${url.hash}` };
      const record: ActionRecord = { episodeId: this.episodeId, step, semantic: 'navigation', after: state };
      this.records.push(record);
      await this.emit({ type: 'action', message: `Open ${url.pathname}`, data: { record } });
      return this.capture(state);
    } catch (error) {
      this.requiresRestart = true;
      throw new BrowserToolError(`The clean episode could not start: ${this.navigationBlock ?? messageOf(error)}`);
    }
  }

  private permitted(url: URL): boolean {
    return ['http:', 'https:'].includes(url.protocol) && this.origins.has(url.origin) && !url.username && !url.password;
  }

  private async readState(): Promise<ShopState> {
    const page = this.page!;
    if (!this.permitted(new URL(page.url()))) throw new BrowserToolError('The page left the configured test-shop origins.');
    const cart = page.getByRole('region', { name: 'Cart', exact: true });
    const address = page.locator('[data-checkout-address]:visible');
    const status = page.locator('[role="status"][data-save-seq]:visible');
    if (await cart.count() !== 1 || !await cart.isVisible() || await address.count() !== 1 || await status.count() !== 1) {
      throw new BrowserToolError('Shop DOM contract requires one visible Cart region, committed address, and save status.');
    }
    const busyValue = await cart.getAttribute('aria-busy', { timeout: this.timeout() });
    if (busyValue !== 'true' && busyValue !== 'false') throw new BrowserToolError('The Cart region must expose aria-busy=true or false.');
    const rows = await cart.locator('[data-product-id][data-quantity]:visible').evaluateAll(elements => elements.map(element => ({
      productId: element.getAttribute('data-product-id') ?? '', quantity: Number(element.getAttribute('data-quantity')),
    })));
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row.productId.trim() || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || ids.has(row.productId)) {
        throw new BrowserToolError('Visible cart rows need unique product IDs and positive integer quantities.');
      }
      ids.add(row.productId);
    }
    rows.sort((a, b) => a.productId.localeCompare(b.productId));
    const saveSeq = Number(await status.getAttribute('data-save-seq', { timeout: this.timeout() }));
    if (!Number.isSafeInteger(saveSeq) || saveSeq < 0) throw new BrowserToolError('The save sequence must be a nonnegative integer.');
    return {
      cart: rows, address: normalize(await address.innerText({ timeout: this.timeout() })), saveSeq,
      saved: normalize(await status.innerText({ timeout: this.timeout() })) === 'Address saved', busy: busyValue === 'true',
    };
  }

  private async settledState(): Promise<ShopState> {
    const expires = Date.now() + this.timeout();
    let previous = '';
    let stableSince = 0;
    let lastError = 'Cart remained busy.';
    while (Date.now() < expires) {
      this.timeout();
      this.checkNavigationBlock();
      try {
        const state = await this.readState();
        const signature = JSON.stringify(state);
        if (!state.busy && signature === previous && Date.now() - stableSince >= 250) return state;
        if (signature !== previous || state.busy) stableSince = Date.now();
        previous = signature;
      } catch (error) { lastError = messageOf(error); previous = ''; stableSince = Date.now(); }
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new BrowserToolError(`The shop did not reach a stable completed state: ${lastError}`);
  }

  private async capture(state: ShopState): Promise<BrowserObservation> {
    const page = this.page!;
    const snapshotId = ++this.snapshotId;
    const tree = await page.ariaSnapshotJSON({ timeout: this.timeout() }) as AriaNode[];
    const elements: BrowserObservation['elements'] = [];
    const candidates: LocatorSpec[] = [];
    const disabledControls = new Set<string>();
    const visit = (nodes: AriaNode[], ancestors: NonNullable<LocatorSpec['scope']>[]) => {
      for (const node of nodes) {
        if (node.role && roles.has(node.role as LocatorSpec['role']) && node.name && node.disabled) {
          disabledControls.add(`${node.role} ${JSON.stringify(node.name)} [disabled]`);
        }
        if (node.role && roles.has(node.role as LocatorSpec['role']) && node.name && !node.disabled) {
          const base: LocatorSpec = { role: node.role as LocatorSpec['role'], name: node.name, exact: true };
          candidates.push(base, ...ancestors.toReversed().map(scope => ({ ...base, scope })));
        }
        const scope = node.role && scopeRoles.has(node.role) && node.name ? { role: node.role as NonNullable<LocatorSpec['scope']>['role'], name: node.name } : undefined;
        if (node.children) visit(node.children, scope ? [...ancestors, scope] : ancestors);
      }
    };
    visit(tree, []);
    const seen = new Set<string>();
    for (const spec of candidates) {
      this.timeout();
      const key = JSON.stringify(spec);
      if (seen.has(key)) continue;
      seen.add(key);
      if (spec.scope && await page.getByRole(spec.scope.role, { name: spec.scope.name, exact: true }).count() !== 1) continue;
      const locator = this.locator(spec);
      if (await locator.count() !== 1 || !await locator.isVisible()) continue;
      if (!await locator.isEnabled()) {
        // Include effective disabled state (for example, a disabled fieldset), not just
        // controls explicitly marked disabled in the accessibility snapshot.
        disabledControls.add(`${spec.role} ${JSON.stringify(spec.name)} [disabled]`);
        continue;
      }
      // Once a globally unique control is exposed, its redundant scoped form adds no information.
      if (spec.scope && elements.some(element => !element.locator.scope && element.locator.role === spec.role && element.locator.name === spec.name)) continue;
      const ref = `s${snapshotId}-e${elements.length + 1}`;
      const element: BrowserObservation['elements'][number] = { ref, locator: spec };
      if (spec.role === 'textbox' || spec.role === 'combobox') {
        element.value = await locator.inputValue({ timeout: this.timeout() }).catch(() => undefined);
      }
      if (spec.role === 'combobox') {
        element.options = await locator.locator('option').evaluateAll(options => options.map(option => ({
          label: (option as HTMLOptionElement).label, value: (option as HTMLOptionElement).value,
        })));
      }
      if (spec.role === 'checkbox') element.value = String(await locator.isChecked({ timeout: this.timeout() }));
      this.refs.set(ref, spec);
      elements.push(element);
    }
    const screenshotName = `observation-${snapshotId}-${this.episodeId}.png`;
    await page.screenshot({ path: join(this.options.artifactDir, screenshotName), fullPage: true, timeout: this.timeout() });
    const disabledText = disabledControls.size ? `Disabled controls (observed; no action refs):\n${[...disabledControls].join('\n')}\n\n` : '';
    const observation: BrowserObservation = {
      snapshotId, episodeId: this.episodeId, url: page.url(), text: `${disabledText}${await page.locator('body').innerText({ timeout: this.timeout() })}`.slice(0, 12_000),
      elements, state: structuredClone(state), screenshotName,
    };
    this.observation = observation;
    await this.emit({ type: 'observation', message: `Observed ${elements.length} available controls and ${state.cart.length} cart items.`, screenshotName, data: { observation } });
    return structuredClone(observation);
  }

  private locator(spec: LocatorSpec): Locator {
    const root = spec.scope ? this.page!.getByRole(spec.scope.role, { name: spec.scope.name, exact: true }) : this.page!;
    return root.getByRole(spec.role, { name: spec.name, exact: true });
  }

  private validateAction(action: BrowserAction, spec: LocatorSpec): void {
    if (!['click', 'fill', 'select', 'check'].includes(action.kind)) throw new BrowserToolError('Unsupported browser action.');
    if (action.kind === 'fill' && (spec.role !== 'textbox' || typeof action.value !== 'string' || action.value.length > 2000)) throw new BrowserToolError('fill requires a textbox and a string of at most 2000 characters.');
    if (action.kind === 'select' && (spec.role !== 'combobox' || typeof action.value !== 'string' || action.value.length > 500)) throw new BrowserToolError('select requires a combobox and a string of at most 500 characters.');
    if (action.kind === 'check' && (spec.role !== 'checkbox' || typeof action.checked !== 'boolean')) throw new BrowserToolError('check requires a checkbox and a boolean checked value.');
  }

  private makeStep(action: BrowserAction, locator: LocatorSpec): ReproStep {
    const id = this.nextStepId();
    if (action.kind === 'fill' || action.kind === 'select') return { id, kind: action.kind, locator, value: action.value! };
    if (action.kind === 'check') return { id, kind: action.kind, locator, checked: action.checked! };
    return { id, kind: 'click', locator };
  }
  private nextStepId(): string { return `step-${++this.stepId}`; }
  private ensureActionAvailable(): void {
    if (this.actionCount >= this.maxActions) throw new BrowserToolError('The browser action budget has been exhausted.');
  }
  private consumeAction(): void { this.ensureActionAvailable(); this.actionCount++; }
  private invalidateRefs(): void { this.refs.clear(); }
  private timeout(): number {
    const remaining = this.deadlineAt - Date.now();
    if (remaining <= 0) throw new BrowserToolError('The browser investigation deadline has been reached.');
    return Math.max(1, Math.min(this.timeoutMs, remaining));
  }
  private ensureStarted(): void {
    this.timeout();
    if (this.closed || !this.browser || !this.page) throw new BrowserToolError('Start an open browser session first.');
  }
  private ensureUsableEpisode(): void {
    this.ensureStarted();
    this.checkNavigationBlock();
    if (this.requiresRestart) throw new BrowserToolError('The episode contains a possibly partial action. Call restart before further actions or checkpoints.');
  }
  private checkNavigationBlock(): void {
    if (this.navigationBlock) {
      const message = this.navigationBlock;
      this.navigationBlock = undefined;
      throw new BrowserToolError(message);
    }
  }
  private async emit(event: BrowserEvent): Promise<void> { await this.options.onEvent?.(event); }
}

export { BrowserSession as Browser };
