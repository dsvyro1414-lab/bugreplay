import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// This is a packaging guard, not a substitute for independent replay or human review.
const input = process.argv[2];
if (!input) { console.error('Usage: node demo/final/validate-evidence.mjs /path/to/evidence-manifest.json'); process.exit(2); }
const manifestPath = path.resolve(input), root = path.dirname(manifestPath);
const m = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const errors = [];
const get = key => key.split('.').reduce((v,k)=>v?.[k],m);
const need = (condition,message) => { if (!condition) errors.push(message); };
const text = key => { const v=get(key);need(typeof v==='string'&&v.trim().length>0&&!/\[|TODO|TBD|PLACEHOLDER/i.test(v),`${key}: supply actual evidence`); };
const url = key => { text(key);try{const u=new URL(get(key));need(u.protocol==='https:'&&!['example.com','example.invalid'].includes(u.hostname),`${key}: use an actual HTTPS evidence link`);}catch{errors.push(`${key}: invalid URL`);} };
const file = async key => {text(key);const v=get(key);if(typeof v!=='string')return;try{const p=path.resolve(root,v),s=await fs.stat(p);need(s.isFile()&&s.size>0,`${key}: expected a nonempty file`);return p;}catch{errors.push(`${key}: file is unavailable`);} };
for(const k of ['mainRun.id','mainRun.model','control.sourceRunId','improvement.beforeRunId','improvement.afterRunId','improvement.observedWeakness','improvement.change','improvement.metricName','improvement.metricUnit','improvement.conditions','improvement.entireCheckpoint','finance.costBasis','finance.decision'])text(k);
for(const k of ['finalGitSha','improvement.beforeGitSha','improvement.afterGitSha'])need(/^[a-f0-9]{40}$/i.test(get(k)??''),`${k}: expected full Git SHA`);
for(const k of ['improvement.beforeTraceUrl','improvement.afterTraceUrl','finance.cfoModelUrl','publicLinks.repository','publicLinks.demo','publicLinks.evidence'])url(k);
need(m.mainRun?.verdict==='bug_confirmed','mainRun.verdict: expected actual bug_confirmed');
need(m.mainRun?.matchedFailures===2&&m.mainRun?.attempts===2,'mainRun: two intended failures in two clean attempts required');
need(Number.isFinite(m.mainRun?.elapsedSeconds)&&m.mainRun.elapsedSeconds>0,'mainRun.elapsedSeconds: actual positive duration required');
need(/^[a-f0-9]{64}$/i.test(m.mainRun?.testSha256??''),'mainRun.testSha256: expected SHA-256');
need(m.control?.sourceRunId===m.mainRun?.id,'control.sourceRunId must identify the main run');
need(m.control?.verdict==='passed','control.verdict: passing unchanged saved test required');
need(typeof m.control?.testSha256==='string'&&m.control.testSha256===m.mainRun?.testSha256,'control test hash must equal main test hash');
try{const u=new URL(m.control?.baseUrl);need(['http:','https:'].includes(u.protocol),'control.baseUrl: expected HTTP(S)');}catch{errors.push('control.baseUrl: invalid URL');}
const ids=m.acceptance?.buggyRunIds;need(Array.isArray(ids)&&ids.length===3&&new Set(ids).size===3&&ids.every(x=>typeof x==='string'&&x.length>0),'acceptance.buggyRunIds: three distinct real run IDs required');
text('acceptance.fixedRunId');need(!ids?.includes(m.acceptance?.fixedRunId),'fixed investigation must have a separate run ID');
need(m.improvement?.beforeRunId!==m.improvement?.afterRunId,'improvement: before/after runs must differ');
for(const k of ['improvement.beforeValue','improvement.afterValue'])need(Number.isFinite(get(k)),`${k}: supply measured numeric value`);
let testPath;
for(const k of ['mainRun.testFile','mainRun.reportFile','mainRun.reproductionFile','mainRun.verificationFile','mainRun.videoFile','control.verificationFile','control.videoFile','acceptance.summaryFile','improvement.checkpointEvidenceFile','finance.cfoExportFile','finance.cfoScreenCaptureFile','finalVideo.file']){const p=await file(k);if(k==='mainRun.testFile')testPath=p;}
if(testPath){const hash=crypto.createHash('sha256').update(await fs.readFile(testPath)).digest('hex');need(hash===m.mainRun.testSha256,'mainRun.testFile: file hash does not match manifest');}
need(Array.isArray(m.recordings)&&m.recordings.length>0,'recordings: include reviewed original captures');
for(const [i,r]of (m.recordings??[]).entries()){need(typeof r.file==='string'&&r.file.length>0,`recordings[${i}].file missing`);need(r.reviewed===true,`recordings[${i}] must be reviewed`);if(typeof r.file==='string'){try{const s=await fs.stat(path.resolve(root,r.file));need(s.isFile()&&s.size>0,`recordings[${i}] empty`);}catch{errors.push(`recordings[${i}] file unavailable`);}}}
need(Number.isFinite(m.finalVideo?.durationSeconds)&&m.finalVideo.durationSeconds>0&&m.finalVideo.durationSeconds<=180,'finalVideo duration must be measured and <=180 seconds');
need(m.finalVideo?.hasNarration===true&&m.finalVideo?.captionsReviewed===true,'finalVideo narration and caption review required');
for(const k of ['sameRunArtifacts','intendedAssertions','unchangedControlTest','privacy','claimsMatchFootage','sponsorScreensAuthentic'])need(m.humanReview?.[k]===true,`humanReview.${k}: review is required`);
if(errors.length){console.error(JSON.stringify({ready:false,missingOrInvalid:errors},null,2));process.exitCode=1;}
else console.log(JSON.stringify({readyForEditorialReview:true,note:'Packaging checks passed. This is not a live-model test, sponsor validation, or proof of submission.'},null,2));
