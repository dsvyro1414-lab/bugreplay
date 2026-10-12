# Final demonstration recording kit

Status: **materials prepared; final footage and sponsor evidence not yet supplied**. The existing 52-second MP4 remains a scripted engineering preview. Do not present it as autonomous discovery or as the finished submission.

The final cut targets **2:50**, leaving 10 seconds under the three-minute limit. It uses one real investigation for the product story, an unchanged saved-test control replay, one genuine trace-driven improvement with its Entire checkpoint, and an actual CFO.ai model. A before/after improvement naturally involves two run IDs; label them instead of implying all footage belongs to one run.

## Ready now

- [Shot list and recording instructions](recording-plan.md).
- [English voiceover and captions](narration-en.md), with explicitly unresolved facts in brackets.
- [Evidence manifest](evidence-manifest.template.json) and its [validator](validate-evidence.mjs).
- [Exact request to Agent A](request-to-agent-a.md).
- [Submission copy and release checklist](submission-draft.md).
- [Financial model, scenario inputs and CFO.ai transfer prompt](../../docs/evidence/finance/README.md).

Use the existing [HyperFrames source](../README.md) for branding and typography. Finance workbook previews can be used as working editorial references. The final CFO.ai scene must show the actual model in that service, not a relabeled spreadsheet screenshot.

## Finish after receiving evidence

1. Copy the manifest template to a local `evidence-manifest.json` and fill it with the exact run IDs, commit SHA, source references, metrics and reviewed asset paths. Store unreviewed/raw recordings outside Git.
2. Validate the manifest with `node demo/final/validate-evidence.mjs /absolute/path/evidence-manifest.json`. Missing evidence should fail. The validator checks structure, links, local files and the saved-test hash; a person must still review the footage and the actual claims.
3. Assemble the scenes in HyperFrames using the shot list. Keep the existing preview separately. Label any speed-up with the actual recorded elapsed time; do not simulate agent actions.
4. Record the final narration only after resolving bracketed facts. Add synchronized captions; verify technical identifiers and dollar amounts manually.
5. Export H.264 MP4 with AAC narration at 1280×720 or better, 30 fps, duration at most 180 seconds. Check playback from start to end, legibility, audio levels and the original file download.
6. Publish reviewed assets and public evidence links. Verify that a logged-out viewer can open them. Send the original MP4 as a file/document in Telegram to preserve the original download.

Recording the final video and publishing the entry remain pending. A validated manifest alone does not establish live-model acceptance or submission.
