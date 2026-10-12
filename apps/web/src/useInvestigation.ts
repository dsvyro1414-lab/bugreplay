import { useCallback, useEffect, useState } from 'react';
import { terminalStatuses, type RunView } from '@bugreplay/contracts';
import { ApiError, errorMessage, getRun, isRunId } from './api';

const storageKey = 'bugreplay.lastRunId';

function storedRunId(): string | null {
  const fromUrl = new URL(window.location.href).searchParams.get('run');
  if (fromUrl !== null) return isRunId(fromUrl) ? fromUrl : null;
  try { const saved = localStorage.getItem(storageKey); return isRunId(saved) ? saved : null; }
  catch { return null; }
}

export function useInvestigation() {
  const [runId, setRunId] = useState<string | null>(storedRunId);
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(runId));
  const [refreshKey, setRefreshKey] = useState(0);

  const openRun = useCallback((id: string | null) => {
    setRun(null); setError(null); setLoading(Boolean(id)); setRunId(id);
    setRefreshKey(value => value + 1);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('run', id); else url.searchParams.delete('run');
    window.history.pushState({}, '', url);
    try { if (id) localStorage.setItem(storageKey, id); else localStorage.removeItem(storageKey); } catch { /* Storage can be disabled. URL recovery still works. */ }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const value = new URL(window.location.href).searchParams.get('run');
      const id = isRunId(value) ? value : null;
      setRun(null); setError(null); setLoading(Boolean(id)); setRunId(id);
      // History can contain two entries for the same terminal run. Its old poll has stopped.
      setRefreshKey(current => current + 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!runId) { setLoading(false); return; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminalSeen = false, failures = 0;
    const poll = async () => {
      let nextDelay = 1000;
      try {
        const current = await getRun(runId, controller.signal);
        if (controller.signal.aborted) return;
        setRun(current); setError(null); setLoading(false); failures = 0;
        if (terminalStatuses.includes(current.status)) {
          // One final read includes metrics persisted during runner cleanup.
          if (terminalSeen) return;
          terminalSeen = true;
        } else terminalSeen = false;
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(errorMessage(reason)); setLoading(false);
        if (reason instanceof ApiError && reason.status === 404) return;
        nextDelay = Math.min(1000 * 2 ** ++failures, 10000);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, nextDelay);
    };
    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [runId, refreshKey]);

  return { runId, run, error, loading, openRun, retry: () => setRefreshKey(value => value + 1) };
}
