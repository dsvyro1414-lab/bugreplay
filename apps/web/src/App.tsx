import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  createRunSchema, reproductionSchema, terminalStatuses,
  type Artifact, type CreateRun, type Reproduction, type ReproStep, type RunEvent, type RunStatus, type RunView,
} from '@bugreplay/contracts';
import { ApiError, artifactPath, createRun, errorMessage, getArtifact, isRunId, requestJson } from './api';
import { useInvestigation } from './useInvestigation';

const initialInput: CreateRun = {
  targetUrl: 'http://localhost:4173',
  complaint: 'Sometimes the cart becomes empty after I change my delivery address. Find the conditions that cause this.',
  expected: 'Cart items and quantities must remain after saving a changed address.',
  oracleKind: 'cart_preserved_after_checkout_change',
};

const statusCopy: Record<RunStatus, { title: string; description: string; tone: string }> = {
  queued: { title: 'Preparing investigation', description: 'The runner is preparing an isolated browser session.', tone: 'working' },
  investigating: { title: 'Investigating', description: 'Testing conditions and following what the browser reveals.', tone: 'working' },
  verifying: { title: 'Verifying the reproduction', description: 'Replaying the saved test independently, without an LLM.', tone: 'working' },
  bug_confirmed: { title: 'Bug confirmed', description: 'Regression assertion failed in 2 clean runs. The unchanged test passed on the corrected control.', tone: 'confirmed' },
  not_reproduced: { title: 'Not reproduced within budget', description: 'No independently confirmed reproduction was found within this investigation’s limits.', tone: 'neutral' },
  inconclusive: { title: 'Investigation inconclusive', description: 'The available evidence does not establish a confirmed bug.', tone: 'warning' },
  cancelled: { title: 'Investigation cancelled', description: 'The run stopped. Evidence collected before cancellation is preserved.', tone: 'neutral' },
  error: { title: 'Investigation stopped', description: 'An error prevented the investigation from finishing. Review the last event below.', tone: 'warning' },
};

function Icon({ name, size = 18 }: { name: 'play' | 'arrow' | 'download' | 'check' | 'stop' | 'image' | 'file' | 'refresh' | 'external'; size?: number }) {
  const paths: Record<typeof name, ReactNode> = {
    play: <path d="m9 5 11 7-11 7V5Z" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1" /><path d="m3 17 6-5 4 3 3-3 5 4" /></>,
    file: <><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 13h8M8 17h5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    external: <><path d="M14 3h7v7M21 3l-9 9M10 3H3v18h18v-7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function duration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function useRunnerHealth() {
  const [health, setHealth] = useState<{ connected: boolean | null; activeRunId?: string }>({ connected: null });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const data = await requestJson('/api/health', { signal: controller.signal });
        if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'ok') throw new Error('Invalid health response');
        if (!controller.signal.aborted) setHealth({ connected: true, activeRunId: 'activeRunId' in data && isRunId(data.activeRunId) ? data.activeRunId : undefined });
      } catch { if (!controller.signal.aborted) setHealth({ connected: false }); }
      if (!controller.signal.aborted) timer = setTimeout(check, 10000);
    };
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return health;
}

function ReportForm({ run, pending, onInvestigate, onNew }: { run: RunView | null; pending: boolean; onInvestigate: (input: CreateRun) => Promise<void>; onNew: () => void }) {
  const [input, setInput] = useState<CreateRun>(initialInput);
  const [validation, setValidation] = useState<string | null>(null);
  const isRunning = Boolean(run && !terminalStatuses.includes(run.status));
  const disabled = pending || isRunning;
  useEffect(() => { if (run) setInput(run.input); }, [run?.id]);
  const edit = (key: keyof Omit<CreateRun, 'oracleKind'>, value: string) => { setInput(current => ({ ...current, [key]: value })); setValidation(null); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createRunSchema.safeParse(input);
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.message || 'Check the report fields.'); return; }
    await onInvestigate(parsed.data);
  };
  return <aside className="report-panel" aria-label="Investigation report">
    <div className="panel-heading"><span className="section-number">01</span><h2>Start with the symptom.</h2></div>
    <p className="panel-intro">Describe what went wrong. Let the browser evidence reveal how.</p>
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="target-url">Website URL</label>
        <input id="target-url" name="targetUrl" type="url" required autoComplete="url" value={input.targetUrl} disabled={disabled} onChange={event => edit('targetUrl', event.target.value)} aria-describedby="target-help" />
        <p id="target-help" className="field-help">This version supports the local demo shop.</p>
      </div>
      <div className="field">
        <label htmlFor="complaint">Bug report</label>
        <textarea id="complaint" name="complaint" rows={5} minLength={10} maxLength={8000} required value={input.complaint} disabled={disabled} onChange={event => edit('complaint', event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="expected">Expected behavior</label>
        <textarea id="expected" name="expected" rows={3} minLength={5} maxLength={4000} required value={input.expected} disabled={disabled} onChange={event => edit('expected', event.target.value)} />
      </div>
      <div className="verification-scope"><span className="scope-icon"><Icon name="check" size={16} /></span><div><strong>Cart preservation</strong><span>Items and quantities after checkout changes</span></div></div>
      {validation && <p className="inline-error" role="alert">{validation}</p>}
      <button className="button button-primary investigate-button" type="submit" disabled={disabled}><Icon name="play" size={17} />{pending ? 'Starting investigation…' : isRunning ? 'Investigation in progress' : 'Investigate'}{!disabled && <Icon name="arrow" size={18} />}</button>
      {run && !isRunning && <button className="text-button new-report" type="button" onClick={() => { setInput(initialInput); setValidation(null); onNew(); }}>Start a new report</button>}
    </form>
    <div className="scope-note"><span className="scope-line" /><p>One controlled shop.<br />One verifiable defect class.<br />Every claim backed by a replay.</p></div>
  </aside>;
}

function Metrics({ run }: { run: RunView | null }) {
  const [now, setNow] = useState(Date.now());
  const active = Boolean(run && !terminalStatuses.includes(run.status));
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  const elapsed = run ? active ? Math.max(run.metrics.elapsedMs, now - Date.parse(run.createdAt)) : run.metrics.elapsedMs : 0;
  return <dl className="metrics">
    <div><dt>Elapsed</dt><dd>{duration(elapsed)}</dd></div>
    <div><dt>Browser actions</dt><dd>{run?.metrics.actions ?? '—'}</dd></div>
    <div><dt>Model cost</dt><dd className={!run || run.metrics.costUsd === undefined ? 'unavailable' : ''}>{run?.metrics.costUsd === undefined ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(run.metrics.costUsd)}</dd></div>
  </dl>;
}

function BrowserEvidence({ run }: { run: RunView | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const screenshots = run?.artifacts.filter(item => item.kind === 'screenshot' && artifactPath(run, item)) ?? [];
  const latest = screenshots.at(-1);
  const chosen = screenshots.find(item => item.name === selected) ?? latest;
  const chosenUrl = run && chosen ? artifactPath(run, chosen) : null;
  useEffect(() => { setSelected(null); setFailed(null); }, [run?.id]);
  const target = run?.input.targetUrl;
  let displayUrl = 'Waiting for a browser session';
  if (target) { try { const url = new URL(target); displayUrl = `${url.host}${url.pathname === '/' ? '' : url.pathname}`; } catch { displayUrl = target; } }
  return <section className="browser-evidence" aria-label="Browser evidence">
    <div className="browser-toolbar"><span className="browser-dots" aria-hidden="true"><i /><i /><i /></span><span className="browser-address">{displayUrl}</span><span className="capture-label">{chosen ? 'Captured frame' : 'Browser evidence'}</span></div>
    <div className={`browser-canvas ${chosenUrl ? 'has-capture' : ''}`}>
      {chosenUrl && failed !== chosenUrl ? <a href={chosenUrl} target="_blank" rel="noreferrer" aria-label="Open full-size browser screenshot"><img key={`${chosenUrl}:${retry}`} src={chosenUrl} alt={`Browser screenshot: ${chosen?.name}`} onError={() => setFailed(chosenUrl)} /></a> : <div className="evidence-placeholder">
        <span className="placeholder-icon"><Icon name="image" size={30} /></span>
        <h3>{failed === chosenUrl && chosenUrl ? 'Screenshot unavailable' : run ? 'Waiting for browser evidence' : 'The evidence starts here.'}</h3>
        <p>{failed === chosenUrl && chosenUrl ? 'This captured frame could not be loaded from the runner.' : run ? 'Screenshots will appear when the runner observes the shop.' : 'Start an investigation to see what the agent sees, as it tests your report.'}</p>
        {failed === chosenUrl && chosenUrl && <button className="button button-small" onClick={() => { setFailed(null); setRetry(value => value + 1); }}><Icon name="refresh" size={15} />Retry screenshot</button>}
        {!run && <div className="evidence-stages"><span>Observe</span><i /><span>Investigate</span><i /><span>Verify</span></div>}
      </div>}
    </div>
    <div className="capture-footer"><span>{chosen ? chosen.name : 'Screenshots from the actual investigation'}</span>{screenshots.length > 1 && <label className="capture-picker"><span className="visually-hidden">Select browser screenshot</span><select aria-label="Select browser screenshot" value={selected ?? ''} onChange={event => { setSelected(event.target.value || null); setFailed(null); }}><option value="">Latest frame</option>{screenshots.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>}{chosenUrl && <a className="icon-link" href={chosenUrl} target="_blank" rel="noreferrer" aria-label="Open full-size screenshot"><Icon name="external" size={15} /></a>}</div>
  </section>;
}

const eventLabels: Record<RunEvent['type'], string> = { status: 'Status', hypothesis: 'Hypothesis', action: 'Browser action', observation: 'Observation', tool_error: 'Tool error', verification: 'Verification', artifact: 'File saved', completed: 'Result' };

function ActivityLog({ run }: { run: RunView | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const events = run?.events.filter(event => event.type !== 'artifact') ?? [];
  useEffect(() => { if (followRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [events.length]);
  useEffect(() => { followRef.current = true; }, [run?.id]);
  return <section className="activity-panel" aria-label="Investigation activity">
    <div className="activity-heading"><h3>Investigation log</h3><span>{events.length ? `${events.length} events` : 'Ready'}</span></div>
    <div ref={scrollRef} className="activity-scroll" role="log" aria-label="Investigation events" aria-live="polite" aria-relevant="additions" onScroll={() => { const el = scrollRef.current; if (el) followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
      {events.length ? <ol className="event-list">{events.map(event => <li key={`${event.runId}:${event.id}`} className={`event event-${event.type}`}><div className="event-meta"><span>{eventLabels[event.type]}</span><time dateTime={event.at}>{duration(Date.parse(event.at) - Date.parse(run!.createdAt))}</time></div><p>{event.message}</p></li>)}</ol> : <div className="activity-empty"><span className="log-mark" aria-hidden="true"><i /><i /><i /></span><p>Follow the investigation,<br />one observation at a time.</p><span>Hypotheses, actions, and results will appear here.</span></div>}
    </div>
    <div className="activity-footnote">Browser observations guide the next action.</div>
  </section>;
}

function stepDescription(step: ReproStep): string {
  switch (step.kind) {
    case 'goto': return `Open ${step.path}`;
    case 'click': return `Click “${step.locator.name}”`;
    case 'fill': return `Fill “${step.locator.name}” with “${step.value}”`;
    case 'select': return `Select “${step.value}” in “${step.locator.name}”`;
    case 'check': return `${step.checked ? 'Check' : 'Uncheck'} “${step.locator.name}”`;
  }
}

function useReproduction(run: RunView) {
  const artifact = run.artifacts.find(item => item.kind === 'reproduction');
  const revision = `${run.id}:${run.status}:${run.events.findLast(event => event.type === 'verification')?.id ?? 0}:${artifact?.name ?? ''}`;
  const [reproduction, setReproduction] = useState<Reproduction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setReproduction(null); setError(null);
    if (!artifact) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void getArtifact(run, artifact, controller.signal).then(response => response.json()).then(data => {
      const parsed = reproductionSchema.safeParse(data);
      if (!parsed.success) throw new Error('The saved reproduction does not match the shared format. Download the original file for inspection.');
      if (!controller.signal.aborted) setReproduction(parsed.data);
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, retry]);
  return { reproduction, error, loading, retry: () => setRetry(value => value + 1) };
}

function controlPassed(run: RunView): boolean | null {
  const event = run.events.findLast(item => item.type === 'verification' && item.data?.control);
  const control = event?.data?.control;
  if (!control || typeof control !== 'object' || !('attempts' in control) || !Array.isArray(control.attempts) || control.attempts.length !== 1) return null;
  const attempt: unknown = control.attempts[0];
  if (!attempt || typeof attempt !== 'object' || !('classification' in attempt)) return null;
  return attempt.classification === 'passed';
}

function DownloadFile({ run, artifact }: { run: RunView; artifact: Artifact }) {
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const download = async () => {
    setPending(true); setError(null);
    try {
      const response = await getArtifact(run, artifact);
      const blob = await response.blob();
      if (!blob.size) throw new Error(`${artifact.name} is empty. The download was not saved.`);
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = artifact.name; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  };
  return <div className="file-item"><button className="file-download" type="button" onClick={() => void download()} disabled={pending}><span className="file-symbol"><Icon name={artifact.kind === 'video' ? 'play' : 'file'} size={19} /></span><span><strong>{artifact.name}</strong><small>{pending ? 'Downloading…' : artifact.kind === 'test' ? 'Executable Playwright test' : artifact.kind === 'report' ? 'Investigation report' : artifact.kind === 'reproduction' ? 'Recorded steps and assertion' : artifact.kind === 'verification' ? 'Independent replay evidence' : 'Recorded browser replay'}</small></span><Icon name="download" size={17} /></button>{error && <p className="inline-error file-error" role="alert">{error} <button className="text-button" onClick={() => void download()}>Retry</button></p>}</div>;
}

function ReplayVideo({ run, artifacts }: { run: RunView; artifacts: Artifact[] }) {
  const [selected, setSelected] = useState(artifacts[0]?.name ?? '');
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const artifact = artifacts.find(item => item.name === selected) ?? artifacts[0];
  const url = artifact ? artifactPath(run, artifact) : null;
  if (!artifact || !url) return null;
  return <section className="replay-section"><div className="result-subheading"><h3>Independent replay</h3>{artifacts.length > 1 && <select aria-label="Select replay video" value={artifact.name} onChange={event => { setSelected(event.target.value); setFailed(null); }}>{artifacts.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select>}</div>{failed === url ? <div className="video-error" role="alert"><p>The replay video could not be loaded.</p><button className="button button-small" onClick={() => { setFailed(null); setRetry(value => value + 1); }}>Retry video</button></div> : <video key={`${url}:${retry}`} controls preload="metadata" src={url} onError={() => setFailed(url)} aria-label={`Recorded replay ${artifact.name}`} /> }<p className="field-help">A recording of the saved test running in a clean browser. No LLM is used during replay.</p></section>;
}

function ResultEvidence({ run }: { run: RunView }) {
  const { reproduction, error, loading, retry } = useReproduction(run);
  const [testSource, setTestSource] = useState<string | null>(null), [testError, setTestError] = useState<string | null>(null), [testLoading, setTestLoading] = useState(false);
  const files = run.artifacts.filter(item => item.kind !== 'screenshot' && artifactPath(run, item));
  const videos = files.filter(item => item.kind === 'video');
  const test = files.find(item => item.kind === 'test');
  const terminal = terminalStatuses.includes(run.status);
  const confirmed = run.status === 'bug_confirmed';
  const control = controlPassed(run);
  useEffect(() => { setTestSource(null); setTestError(null); }, [run.status, run.events.findLast(event => event.type === 'verification')?.id]);
  if (!terminal && !files.length) return null;
  const readTest = async () => {
    if (!test) return;
    if (testSource !== null) { setTestSource(null); return; }
    setTestLoading(true); setTestError(null);
    try { const response = await getArtifact(run, test); const source = await response.text(); if (!source.trim()) throw new Error('The saved test is empty.'); setTestSource(source); }
    catch (reason) { setTestError(errorMessage(reason)); }
    finally { setTestLoading(false); }
  };
  return <section className="results" aria-label="Investigation results">
    <div className="results-heading"><div className="panel-heading"><span className="section-number">03</span><h2>{confirmed ? 'A reproduction you can run.' : 'Evidence, preserved.'}</h2></div>{confirmed && <span className="verification-badge"><Icon name="check" size={15} />Verified 2/2</span>}</div>
    <div className="results-grid"><div className="result-detail">
      {run.verification && <div className="verification-strip"><div><span>Regression replay</span><strong>{run.verification.matchedFailures}/{run.verification.attempts} intended failures</strong></div><div><span>Corrected control</span><strong>{control === true ? 'Unchanged test passed' : control === false ? 'Did not pass' : 'Not established'}</strong></div></div>}
      {loading && <p className="muted">Loading the recorded reproduction…</p>}
      {error && <div className="notice notice-warning" role="alert"><p>{error}</p><button className="text-button" onClick={retry}>Retry reproduction</button></div>}
      {reproduction ? <><div className="expected-observed"><div><h3>Expected</h3><p>{reproduction.expected}</p></div><div><h3>{confirmed ? 'Observed trigger and outcome' : 'Candidate observation'}</h3><p>{reproduction.observed}</p></div></div><h3 className="steps-title">Recorded reproduction steps</h3><ol className="reproduction-steps">{reproduction.steps.map(step => <li key={step.id}><span>{stepDescription(step)}</span></li>)}</ol>{!confirmed && <p className="candidate-note">These are recorded candidate steps. They are not a confirmed reproduction unless independent verification and the corrected control pass.</p>}</> : !loading && !error && <p className="no-reproduction">{terminal ? 'No saved reproduction is available for this run. The investigation log and any completed files remain available.' : 'The recorded reproduction will appear after a candidate is saved.'}</p>}
      {test && <div className="test-source"><button className="text-button" onClick={() => void readTest()} disabled={testLoading}><Icon name="file" size={16} />{testLoading ? 'Loading saved test…' : testSource !== null ? 'Hide saved test' : 'Inspect saved Playwright test'}</button>{testError && <p className="inline-error" role="alert">{testError}</p>}{testSource !== null && <pre tabIndex={0} aria-label="Saved Playwright source"><code>{testSource}</code></pre>}</div>}
    </div><div className="result-files"><h3>Run files</h3>{files.length ? <div className="file-list">{files.map(artifact => <DownloadFile key={`${run.id}:${artifact.name}`} run={run} artifact={artifact} />)}</div> : <p className="muted">No completed files were registered.</p>}{videos.length > 0 && <ReplayVideo key={run.id} run={run} artifacts={videos} />}</div></div>
  </section>;
}

export default function App() {
  const investigation = useInvestigation();
  const { run, runId, openRun } = investigation;
  const health = useRunnerHealth();
  const [pending, setPending] = useState(false), [startError, setStartError] = useState<string | null>(null), [conflictId, setConflictId] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false), [cancelRequested, setCancelRequested] = useState(false), [cancelError, setCancelError] = useState<string | null>(null);
  const active = Boolean(run && !terminalStatuses.includes(run.status));
  useEffect(() => { setCancelRequested(false); setCancelError(null); }, [runId]);
  const start = async (input: CreateRun) => {
    setPending(true); setStartError(null); setConflictId(null);
    try { openRun(await createRun(input)); }
    catch (reason) { setStartError(errorMessage(reason)); if (reason instanceof ApiError && reason.runId) setConflictId(reason.runId); }
    finally { setPending(false); }
  };
  const cancel = async () => {
    if (!run) return;
    setCancelPending(true); setCancelError(null);
    try {
      const response = await requestJson(`/api/runs/${encodeURIComponent(run.id)}/cancel`, { method: 'POST' });
      if (!response || typeof response !== 'object' || !('runId' in response) || response.runId !== run.id) throw new Error('The runner returned an invalid cancellation response. The investigation status has not changed.');
      setCancelRequested(true); investigation.retry();
    } catch (reason) { setCancelError(errorMessage(reason)); }
    finally { setCancelPending(false); }
  };
  const status = run ? statusCopy[run.status] : null;
  const lastExplanation = run?.events.findLast(event => event.type === 'completed')?.message;
  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="/" onClick={event => { event.preventDefault(); if (!active && !pending) openRun(null); }} aria-label="BugReplay home"><span className="brand-symbol" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 28 28" fill="none"><path d="M7 6h11a6 6 0 0 1 0 12H8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="m11 13-5 5 5 5M8 6l4 3V3L8 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>BugReplay</span></a><span className="header-divider" /><span className="workspace-name">Investigation workspace</span><div className={`runner-status ${health.connected === true ? 'online' : health.connected === false ? 'offline' : ''}`}><span className="status-dot" />{health.connected === true ? 'Runner connected' : health.connected === false ? 'Runner unavailable' : 'Connecting to runner'}</div></header>
    <main>
      <section className="page-intro"><div><h1>From bug report<br className="mobile-break" /> to reliable repro.</h1><p>Investigate in a real browser. Verify with an independent test.</p></div><span className="local-label"><span />Controlled environment</span></section>
      {health.activeRunId && health.activeRunId !== runId && <div className="notice"><p>Another investigation is running.</p><button className="text-button" onClick={() => openRun(health.activeRunId!)}>View active investigation</button></div>}
      {startError && <div className="notice notice-warning" role="alert"><p>{startError}</p>{conflictId && <button className="text-button" onClick={() => { openRun(conflictId); setStartError(null); setConflictId(null); }}>Open active investigation</button>}</div>}
      <div className="workspace-layout">
        <ReportForm run={run} pending={pending || Boolean(runId && !run && investigation.loading)} onInvestigate={start} onNew={() => { openRun(null); setStartError(null); setConflictId(null); }} />
        <div className="investigation-workspace">
          <section className={`run-overview ${status?.tone ?? 'idle'}`} aria-label="Investigation status">
            <div className="run-title-row"><div><div className="run-label"><span className="section-number">02</span><span>Investigation</span>{run && <span className={`run-state-pill ${status?.tone}`}><span className="status-dot" />{active ? 'In progress' : run.status === 'bug_confirmed' ? 'Confirmed' : 'Complete'}</span>}</div><h2 aria-live="polite">{status?.title ?? (investigation.loading ? 'Restoring investigation…' : 'Ready when you are.')}</h2><p>{status?.description ?? 'Your report becomes a sequence of observable, repeatable steps.'}</p></div>{active && <button className="button button-small cancel-button" disabled={cancelPending || cancelRequested} onClick={() => void cancel()}><Icon name="stop" size={14} />{cancelRequested ? 'Cancelling…' : cancelPending ? 'Requesting…' : 'Cancel run'}</button>}</div>
            <Metrics run={run} />
            {run && <div className="run-identity"><span>Run <code>{run.id}</code></span><span>Saved on this runner</span></div>}
          </section>
          {investigation.error && <div className="notice notice-warning" role="alert"><p>{investigation.error}{run && ' Your last received evidence is still shown.'}</p><button className="text-button" onClick={investigation.retry}>Reconnect</button>{!run && <button className="text-button" onClick={() => openRun(null)}>Back to new report</button>}</div>}
          {cancelError && <div className="notice notice-warning" role="alert"><p>{cancelError}</p></div>}
          {lastExplanation && run && !['bug_confirmed', 'not_reproduced'].includes(run.status) && <div className="notice notice-warning"><p>{lastExplanation}</p></div>}
          <div className="observation-layout"><BrowserEvidence run={run} /><ActivityLog run={run} /></div>
        </div>
      </div>
      {run && <ResultEvidence key={run.id} run={run} />}
    </main>
    <footer className="app-footer"><span>BugReplay</span><p>Controlled Chromium shop · Cart preservation · Independent Playwright verification</p><span>Local workspace</span></footer>
  </div>;
}
