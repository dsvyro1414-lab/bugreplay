# Final recording plan

Target: 170 seconds. Voiceover language: English. Product scope: one controlled Chromium shop and cart preservation after a saved checkout/address change.

| Time | Picture and capture | Required evidence / acceptance |
| --- | --- | --- |
| 00:00–00:12 | BugReplay form with the symptom, expected behavior and shop URL. Start the real investigation. | Run ID and Git SHA recorded before capture. No prepared trigger in the complaint. |
| 00:12–00:44 | Real hypothesis/action log and screenshots. Show an observation changing the next action, and recovery from a real failed action if present. | Complete original recording retained. Clearly label cuts and speed-up, displaying actual elapsed time. Do not require or invent a predetermined wrong hypothesis. |
| 00:44–01:04 | Result, cart before/after, saved `.spec.ts`, two independent replay results and one original replay clip. | Same investigation ID across report, reproduction, test and media. Two failures specifically classified as `BUGREPLAY_CART_PRESERVATION`, not a selector or setup error. |
| 01:04–01:31 | Neatlogs before trace, the actual observed weakness, and after trace for the same case after a fix. | Two run IDs, two commit SHAs, matching conditions/budgets and metric denominators. Show a specific span or retry. If results do not improve, state that instead of inventing an improvement. |
| 01:31–01:51 | Entire checkpoint with the rationale and diff for that same fix. | Authentic checkpoint ID tied to the actual fix commit. The readiness-document checkpoint is insufficient for this scene. |
| 01:51–02:17 | CFO.ai model with price, run cost, base/downside forecast and cash. Edit one cost assumption to show the decision. | Actual model/export and evidence of service use. Label assumptions; show measured cost only when there is a source. Explain the $0.1293 full-allowance variable-cost ceiling under the stated assumptions. |
| 02:17–02:34 | The exact saved test passing on the fixed shop. Show file hash and changed base URL. | Byte-identical `.spec.ts`; new browser context; a passing preservation assertion. This is separate from the fixed-shop model investigation. |
| 02:34–02:50 | Repository, evidence index, original downloads and MVP limits. | Public accessible links and final release commit. Say “one controlled shop and one defect class.” No arbitrary-site support or Codex-superiority claim. |

## Capture setup

- Record the application window at 1280×720 or 1920×1080, 30 fps. Increase browser zoom for readable logs and charts before recording. Keep popups and unrelated windows out of frame.
- Keep API keys, `.env`, private billing details, unrelated traces and personal browser tabs out of all recordings. Only use the synthetic shop data. Review recordings before making them public.
- Capture cursor actions as they occur. Do not add a fabricated cursor, replace a failure with a staged success, or use fixture API results as a real model run.
- For each recording, keep a short manifest: filename, run ID, Git SHA, recording timestamp, raw duration, displayed speed factor and source tool. Keep the original uncut recording locally.
- Extract 10–20 readable seconds per sponsor screen. The point is the actual input, action and resulting decision, not a logo montage.
- Include narration and captions in the final MP4. The previous silent preview is not the final narration track.

## Useful file names

`01-intake.mp4`, `02-investigation.mp4`, `03-replay.mp4`, `04-neatlogs-before.mp4`, `05-neatlogs-after.mp4`, `06-entire.mp4`, `07-cfo-model.mp4`, `08-control.mp4`, `09-close.mp4`.

Do not commit placeholder footage under these names. Supply only authentic reviewed captures.
