import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--manifest') || !args.includes('--out')) throw new Error('Usage: node demo/final-cut/build.mjs --manifest /path/editorial.json --out /path/project');
const input = path.resolve(option('--manifest')), destination = path.resolve(option('--out'));
if (destination === here) throw new Error('Keep generated media and index.html outside the source folder.');
const editorialRoot = path.dirname(input);
const editorial = JSON.parse(await fs.readFile(input, 'utf8'));
const errors = [];
const need = (condition, message) => { if (!condition) errors.push(message); };
const realText = value => typeof value === 'string' && value.trim().length > 0 && !/\[|TODO|TBD|PLACEHOLDER/i.test(value);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function file(root, value, label) {
  need(realText(value), `${label}: supply an actual local file`);
  if (!realText(value)) return null;
  const resolved = path.resolve(root, value);
  try { const stat = await fs.stat(resolved); need(stat.isFile() && stat.size > 0, `${label}: expected a nonempty file`); return resolved; }
  catch { errors.push(`${label}: file unavailable`); return null; }
}
function https(value, label) {
  try { const url = new URL(value); need(url.protocol === 'https:' && !url.username && !url.password && !/example\.(com|invalid)$/.test(url.hostname), `${label}: use a real HTTPS evidence URL`); }
  catch { errors.push(`${label}: invalid URL`); }
}
const scenes = [
  { id: 'intake', start: 0, duration: 12, title: 'A symptom. A URL. A reproduction.', chapter: '01 / Intake' },
  { id: 'investigation', start: 12, duration: 32, title: 'Browser observations guide the next action.', chapter: '02 / Real investigation' },
  { id: 'verification', start: 44, duration: 20, title: 'Two clean replays. The intended assertion.', chapter: '03 / Independent replay' },
  { id: 'neatlogs-before', start: 64, duration: 13, title: 'Neatlogs: the observed failure.', chapter: '04 / Before the change' },
  { id: 'neatlogs-after', start: 77, duration: 14, title: 'Neatlogs: repeat after the change.', chapter: '04 / After the change' },
  { id: 'entire', start: 91, duration: 20, title: 'The fix and its development context.', chapter: '05 / Entire' },
  { id: 'cfo', start: 111, duration: 26, title: 'Price, all-attempt cost, and runway.', chapter: '06 / CFO.ai' },
  { id: 'control', start: 137, duration: 17, title: 'The unchanged test passes on the control.', chapter: '07 / Fixed control' },
  { id: 'close', start: 154, duration: 16, title: 'A verified reproduction, ready to inspect.', chapter: '08 / Evidence' },
];
need(editorial.approvedForEditing === true && editorial.privacyReviewed === true && editorial.claimsReviewed === true, 'Editing, privacy and claims review must be complete.');
need(editorial.narration?.synchronizedCaptionsReviewed === true, 'Reviewed synchronized captions are required.');
const evidenceFile = await file(editorialRoot, editorial.evidenceManifest, 'evidenceManifest');
const evidenceRoot = evidenceFile ? path.dirname(evidenceFile) : editorialRoot;
const evidence = evidenceFile ? JSON.parse(await fs.readFile(evidenceFile, 'utf8')) : {};
const runFile = await file(editorialRoot, editorial.runViewFile, 'runViewFile');
const run = runFile ? JSON.parse(await fs.readFile(runFile, 'utf8')) : {};
need(run.id === evidence.mainRun?.id && run.status === 'bug_confirmed', 'The original RunView must identify the selected real bug_confirmed investigation.');
need(evidence.mainRun?.verdict === 'bug_confirmed' && evidence.mainRun?.matchedFailures === 2 && evidence.mainRun?.attempts === 2, 'The selected main run needs two intended failures in two clean replays.');
need(Number.isFinite(evidence.mainRun?.elapsedSeconds) && evidence.mainRun.elapsedSeconds > 0, 'Supply actual investigation elapsed time.');
need(/^[a-f0-9]{40}$/i.test(evidence.finalGitSha ?? ''), 'Supply a full final release SHA.');
const evidenceFiles = {};
for (const key of ['testFile', 'reportFile', 'reproductionFile', 'verificationFile', 'videoFile']) evidenceFiles[key] = await file(evidenceRoot, evidence.mainRun?.[key], `mainRun.${key}`);
const controlTest = await file(evidenceRoot, evidence.control?.testFile, 'control.testFile');
const controlVerification = await file(evidenceRoot, evidence.control?.verificationFile, 'control.verificationFile');
if (evidenceFiles.testFile && controlTest) {
  const mainHash = hash(await fs.readFile(evidenceFiles.testFile)), controlHash = hash(await fs.readFile(controlTest));
  need(mainHash === controlHash && mainHash === evidence.mainRun?.testSha256 && mainHash === evidence.control?.testSha256, 'Main and control must use the byte-identical saved test and matching recorded hash.');
}
if (evidenceFiles.verificationFile) {
  const verification = JSON.parse(await fs.readFile(evidenceFiles.verificationFile, 'utf8'));
  need(verification.attempts?.length === 2 && verification.attempts.every(attempt => attempt.classification === 'matched_failure'), 'Actual replay results must contain exactly two intended assertion failures.');
}
if (controlVerification) {
  const control = JSON.parse(await fs.readFile(controlVerification, 'utf8'));
  need(control.attempts?.length === 1 && control.attempts[0].classification === 'passed', 'Actual unchanged control replay must pass.');
}
need(evidence.control?.sourceRunId === evidence.mainRun?.id && evidence.control?.verdict === 'passed', 'Control provenance must identify the selected run and passing result.');
for (const key of ['beforeRunId', 'afterRunId', 'observedWeakness', 'change', 'metricName', 'metricUnit', 'conditions', 'entireCheckpoint']) need(realText(evidence.improvement?.[key]), `improvement.${key}: supply actual evidence`);
for (const key of ['beforeGitSha', 'afterGitSha']) need(/^[a-f0-9]{40}$/i.test(evidence.improvement?.[key] ?? ''), `improvement.${key}: full SHA required`);
for (const key of ['beforeValue', 'afterValue']) need(Number.isFinite(evidence.improvement?.[key]), `improvement.${key}: measured metric required`);
for (const key of ['beforeTraceUrl', 'afterTraceUrl']) https(evidence.improvement?.[key], `improvement.${key}`);
await file(evidenceRoot, evidence.improvement?.checkpointEvidenceFile, 'improvement.checkpointEvidenceFile');
https(evidence.finance?.cfoModelUrl, 'finance.cfoModelUrl');
await file(evidenceRoot, evidence.finance?.cfoExportFile, 'finance.cfoExportFile');
await file(evidenceRoot, evidence.finance?.cfoScreenCaptureFile, 'finance.cfoScreenCaptureFile');
https(evidence.publicLinks?.repository, 'publicLinks.repository');
const evidenceReview = evidence.evidenceReview ?? evidence.humanReview;
for (const key of ['sameRunArtifacts', 'intendedAssertions', 'unchangedControlTest', 'privacy', 'claimsMatchFootage', 'sponsorScreensAuthentic']) need(evidenceReview?.[key] === true, `evidenceReview.${key}: actual evidence review required`);

const staged = [];
async function stage(filePath, kind) {
  const bytes = await fs.readFile(filePath), sha256 = hash(bytes);
  const name = `${sha256.slice(0, 18)}${path.extname(filePath).toLowerCase()}`;
  staged.push({ sourceFile: filePath, relativeFile: `assets/${name}`, sha256, kind });
  return `assets/${name}`;
}
async function duration(filePath, label) {
  try {
    const { stdout } = await execute('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
    const seconds = Number(stdout.trim());
    need(Number.isFinite(seconds) && seconds > 0, `${label}: no valid media duration`);
    return seconds;
  } catch { errors.push(`${label}: ffprobe could not verify the media duration`); return 0; }
}
async function sourceCrop(filePath, rect, label) {
  if (rect === undefined || rect === null) return null;
  need(['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])), `${label}: sourceRect needs pixel coordinates and dimensions`);
  if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key]))) return null;
  need(rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0, `${label}: invalid sourceRect`);
  try {
    const { stdout } = await execute('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', filePath]);
    const dimensions = JSON.parse(stdout).streams?.[0];
    need(dimensions && rect.x + rect.width <= dimensions.width && rect.y + rect.height <= dimensions.height, `${label}: sourceRect exceeds original media bounds`);
    if (!dimensions) return null;
    const scale = Math.min(1180 / rect.width, 398 / rect.height);
    const px = value => Number(value.toFixed(4));
    return { sourceRect: rect, sourceWidth: dimensions.width, sourceHeight: dimensions.height,
      style: `left:${px(50 + (1180 - rect.width * scale) / 2 - rect.x * scale)}px;top:${px(175 + (398 - rect.height * scale) / 2 - rect.y * scale)}px;width:${px(dimensions.width * scale)}px;height:${px(dimensions.height * scale)}px;object-fit:fill;border-radius:0;clip-path:inset(${px(rect.y * scale)}px ${px((dimensions.width - rect.x - rect.width) * scale)}px ${px((dimensions.height - rect.y - rect.height) * scale)}px ${px(rect.x * scale)}px)` };
  } catch { errors.push(`${label}: ffprobe could not verify original media dimensions`); return null; }
}
const media = [];
for (const scene of scenes) {
  const entries = editorial.sceneMedia?.[scene.id] ?? [];
  need(Array.isArray(entries), `sceneMedia.${scene.id}: expected an array`);
  const intervals = [];
  for (const [index, item] of (Array.isArray(entries) ? entries : []).entries()) {
    const label = `${scene.id}[${index}]`;
    const source = await file(editorialRoot, item.file, label);
    need(item.reviewed === true && realText(item.label), `${label}: reviewed authentic media and a truthful label required`);
    need(['image', 'video'].includes(item.kind), `${label}: expected image or video`);
    need(Number.isFinite(item.startSecondsInScene) && item.startSecondsInScene >= 0 && Number.isFinite(item.durationSeconds) && item.durationSeconds > 0 && item.startSecondsInScene + item.durationSeconds <= scene.duration + 0.001, `${label}: trim must fit the scene`);
    need(Number.isFinite(item.sourceStartSeconds) && item.sourceStartSeconds >= 0, `${label}: invalid media offset`);
    need(Number.isFinite(item.speedFactor) && item.speedFactor > 0, `${label}: declare the actual speed factor`);
    if (item.speedFactor !== 1) {
      need(item.preprocessed === true, `${label}: a speed change requires a prepared authentic clip`);
      await file(editorialRoot, item.originalFile, `${label}.originalFile`);
    }
    if (!source) continue;
    need(item.kind !== 'image' || /\.(png|jpe?g|webp)$/i.test(source), `${label}: use a local still capture`);
    if (item.kind === 'video') need(item.sourceStartSeconds + item.durationSeconds <= await duration(source, label) + 0.05, `${label}: trim exceeds the actual recording`);
    const crop = await sourceCrop(source, item.sourceRect, label);
    const origin = item.sourceOrigin ?? 'application_capture';
    need(['application_capture', 'artifact_export_capture'].includes(origin), `${label}: unsupported source origin`);
    let exportEvidence = null;
    if (origin === 'artifact_export_capture') {
      need(item.kind === 'image', `${label}: an export capture must be a clearly labeled still`);
      const exportFile = await file(editorialRoot, item.sourceEvidenceFile, `${label}.sourceEvidenceFile`);
      if (exportFile) exportEvidence = { sourceFile: exportFile, sha256: hash(await fs.readFile(exportFile)) };
    }
    intervals.push([item.startSecondsInScene, item.startSecondsInScene + item.durationSeconds]);
    media.push({ id: `media-${scene.id}-${index}`, scene: scene.id, kind: item.kind, source,
      start: scene.start + item.startSecondsInScene, duration: item.durationSeconds, offset: item.sourceStartSeconds,
      sourceOrigin: origin, exportEvidence, crop,
      label: `${origin === 'artifact_export_capture' ? 'Authentic data export' : item.kind === 'image' ? 'Actual screenshot' : 'Recorded footage'} · ${item.label}${crop ? ' · crop' : ''} · ${item.speedFactor}×`, relativeFile: await stage(source, item.kind) });
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [start, finish] of intervals) { need(Math.abs(start - end) < 0.01, `${scene.id}: media must cover the scene without gaps or overlap`); end = finish; }
  if (scene.id !== 'close') need(Math.abs(end - scene.duration) < 0.01, `${scene.id}: complete actual visual coverage required`);
  if (scene.id === 'close') need(entries.length === 0, 'close: the final repository card is generated from verified data; use no overlay media');
}
const audio = [];
if (editorial.narration?.fullFile) {
  const source = await file(editorialRoot, editorial.narration.fullFile, 'narration.fullFile');
  need(editorial.narration.fullFileReviewed === true && (editorial.narration.segments ?? []).length === 0, 'Review the synchronized full narration and use either fullFile or segments.');
  if (source) {
    const seconds = await duration(source, 'narration.fullFile');
    need(seconds <= 170.05, 'Full narration must fit the 170-second composition.');
    audio.push({ id: 'audio-full-narration', start: 0, duration: Math.min(seconds, 170), offset: 0, relativeFile: await stage(source, 'narration') });
  }
}
for (const scene of editorial.narration?.fullFile ? [] : scenes) {
  const segments = (editorial.narration?.segments ?? []).filter(segment => segment.scene === scene.id);
  need(segments.length === 1, `${scene.id}: supply one actual reviewed narration segment`);
  const segment = segments[0];
  if (!segment) continue;
  const source = await file(editorialRoot, segment.file, `narration.${scene.id}`);
  need(segment.reviewed === true && Number.isFinite(segment.sourceStartSeconds) && segment.sourceStartSeconds >= 0, `narration.${scene.id}: review and valid source offset required`);
  if (!source) continue;
  const seconds = await duration(source, `narration.${scene.id}`) - segment.sourceStartSeconds;
  need(seconds > 0 && seconds <= scene.duration + 0.05, `narration.${scene.id}: voice segment must fit its scene`);
  audio.push({ id: `audio-${scene.id}`, start: scene.start, duration: Math.min(seconds, scene.duration), offset: segment.sourceStartSeconds, relativeFile: await stage(source, 'narration') });
}
const captions = editorial.narration?.captions ?? [];
need(Array.isArray(captions) && captions.length > 0, 'Supply reviewed caption cues.');
let previousEnd = 0;
for (const [index, cue] of captions.entries()) {
  need(realText(cue.text) && cue.text.length <= 180, `caption[${index}]: reviewed text of at most 180 characters required`);
  need(Number.isFinite(cue.startSeconds) && cue.startSeconds >= previousEnd - 0.000002 && Number.isFinite(cue.durationSeconds) && cue.durationSeconds > 0 && cue.startSeconds + cue.durationSeconds <= 170, `caption[${index}]: invalid or overlapping cue timing`);
  previousEnd = cue.startSeconds + cue.durationSeconds;
}
for (const scene of scenes) need(captions.some(cue => cue.startSeconds < scene.start + scene.duration && cue.startSeconds + cue.durationSeconds > scene.start), `${scene.id}: captions missing`);
const gsap = path.resolve(here, '../assets/gsap.min.js');
const gsapFile = await file(here, gsap, 'Pinned GSAP runtime; run node demo/setup-runtime.mjs first');
if (gsapFile) need(hash(await fs.readFile(gsapFile)) === 'c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280', 'Pinned GSAP hash mismatch');
if (errors.length) { console.error(JSON.stringify({ readyForAssembly: false, missingOrInvalid: errors }, null, 2)); process.exit(1); }

const sceneHtml = scenes.map(scene => `<section id="scene-${scene.id}" class="clip scene" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="1"><div class="scene-head"><h1>${escape(scene.title)}</h1><span class="chapter">${escape(scene.chapter)}</span></div>${scene.id === 'close' ? `<div class="close-card"><h2>Turn a browser bug report into a verified Playwright reproduction.</h2><p>One controlled shop. One defect class. Original test, report, JSON and replay evidence.</p><p class="repo">${escape(evidence.publicLinks.repository.replace('https://', ''))}</p><p>Selected run ${escape(evidence.mainRun.id.slice(0, 12))} · ${escape(evidence.mainRun.model)}</p></div>` : '<div class="media-shell"></div>'}</section>`).join('\n');
const mediaHtml = media.map(item => `${item.kind === 'video' ? `<video id="${item.id}" class="evidence-media" muted playsinline src="${item.relativeFile}" data-media-start="${item.offset}"` : `<img id="${item.id}" class="clip evidence-media" alt="${escape(item.label)}" src="${item.relativeFile}"`}${item.crop ? ` style="${item.crop.style}"` : ''} data-start="${item.start}" data-duration="${item.duration}" data-track-index="2">${item.kind === 'video' ? '</video>' : ''}<div id="label-${item.id}" class="clip media-label" data-start="${item.start}" data-duration="${item.duration}" data-track-index="3">${escape(item.label)}${item.scene === 'investigation' ? ` · investigation ${(evidence.mainRun.elapsedSeconds).toFixed(1)}s` : ''}</div>`).join('\n');
const audioHtml = audio.map(item => `<audio id="${item.id}" src="${item.relativeFile}" data-start="${item.start}" data-duration="${item.duration}" data-media-start="${item.offset}" data-track-index="10" data-volume="1"></audio>`).join('\n');
const captionHtml = captions.map((cue, index) => `<div id="caption-${index}" class="clip caption" data-start="${cue.startSeconds}" data-duration="${cue.durationSeconds}" data-track-index="5"><p>${escape(cue.text)}</p></div>`).join('\n');
let html = await fs.readFile(path.join(here, 'index.template.html'), 'utf8');
for (const [key, value] of Object.entries({ SCENES: sceneHtml, MEDIA: mediaHtml, AUDIO: audioHtml, CAPTIONS: captionHtml, RELEASE_SHA: `Engine SHA ${evidence.finalGitSha.slice(0, 12)}` })) html = html.replace(`{{${key}}}`, value);
await fs.mkdir(path.join(destination, 'assets'), { recursive: true });
for (const item of staged) await fs.copyFile(item.sourceFile, path.join(destination, item.relativeFile));
await fs.copyFile(gsap, path.join(destination, 'assets/gsap.min.js'));
await fs.copyFile(path.join(here, 'styles.css'), path.join(destination, 'styles.css'));
await fs.writeFile(path.join(destination, 'index.html'), html);
await fs.writeFile(path.join(destination, 'provenance.json'), JSON.stringify({ kind: 'real-recorded-demo-assembly', durationSeconds: 170, width: 1280, height: 720, engineGitSha: evidence.finalGitSha, mainRunId: evidence.mainRun.id, sourceEvidenceManifest: evidenceFile, originalRunView: runFile, reviewedMedia: staged, media, scenes, reviewNotes: editorial.reviewNotes ?? null, note: 'Source assembly only; CLI check, visual/audio review and rendering are separate steps. Originals preserved.' }, null, 2) + '\n');
console.log(JSON.stringify({ sourceProject: destination, durationSeconds: 170, sourceAssemblyComplete: true, rendered: false, note: 'Perform HyperFrames check and actual visual/audio review before rendering.' }, null, 2));
