# Agent B product readiness

Date: 2026-10-12. Current engine baseline: `d892d7d`.

This is Agent B's first recorded development step on `agent-b-product`: documentation only, intended to check genuine Entire capture before substantial implementation. `AGENTS.md`, `plan.md`, and `packages/contracts/DOM.md` were read before this change.

Planned scope:

- `apps/web`: investigation form, real runner integration, polled progress, screenshots, results, and artifact downloads. Any temporary mock must be visibly labeled.
- `apps/demo-shop`: controlled cart-preservation scenario after checkout changes, with browser-local state and buggy/fixed variants sharing the frozen DOM contract and UI. Keep the trigger recipe out of runtime input.
- `evals`: independent inspection of saved tests, stdout, and artifacts; require the intended cart assertion failure in two clean runs and a pass on the corrected control with only the base URL changed. Treat setup, selector, and navigation failures or inconsistent results as inconclusive.

Agent A retains ownership of `apps/runner`, `packages/contracts`, `scripts`, root configuration, root `package.json`, the lockfile, run instructions, and branch integration. Contract and dependency changes must go through A.

Entire hooks were enabled before product code. No checkpoint or captured change context is verified yet. No live investigation, cfo.ai model, final demo, or product acceptance is verified yet. This document does not establish product readiness or successful Entire capture.
