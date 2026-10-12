import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const execute=promisify(execFile), here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..'), args=process.argv.slice(2);
const option=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
const out=path.resolve(option('--out',path.join(root,'artifacts/submission-2026-10-12/saas-cut-v3/project')));
if(!out.startsWith(path.join(root,'artifacts')+path.sep)) throw new Error('Keep the generated project and staged media in ignored artifacts.');
const narration=JSON.parse(await fs.readFile(path.join(here,'edit-plan.json'),'utf8'));
const inputAudio=option('--audio-manifest',null);
if(inputAudio)throw new Error('Revision 3 is silent. Do not include a narration manifest.');
const supplied=inputAudio?JSON.parse(await fs.readFile(path.resolve(inputAudio),'utf8')):null;
const audioBase=inputAudio?path.dirname(path.resolve(inputAudio)):root;
const audioRows=Array.isArray(supplied)?supplied:(supplied?.blocks??[]);
const selected=path.join(root,'docs/evidence/live-confirmed-2026-10-12');
const improvement=path.join(root,'docs/evidence/live-improvement-2026-10-12');
const finance=path.join(root,'docs/evidence/finance');
const evidence=JSON.parse(await fs.readFile(path.join(selected,'audit.json'),'utf8'));
if(evidence.status!=='bug_confirmed'||!evidence.checks.twoIntendedFailures||!evidence.checks.fixedControlPassed||!evidence.checks.candidateTestByteIdentical) throw new Error('Reviewed selected-run proof is required.');
const official=JSON.parse(await fs.readFile(path.join(improvement,'neatlogs-after-official-ui-audit.json'),'utf8'));
if(official.traceId!==evidence.traceId||official.observed.verifierReplay.matchedFailures!==2||official.observed.verifierControl.classification!=='passed') throw new Error('Official hosted after screenshots must identify this selected run.');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=x=>Number(x.toFixed(6));
const probes=new Map(), assets=new Map();
await fs.mkdir(path.join(out,'assets'),{recursive:true});
async function probe(file){
 if(!probes.has(file)){
  const {stdout}=await execute('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file]);
  const parsed=JSON.parse(stdout), v=parsed.streams.find(s=>s.codec_type==='video');
  probes.set(file,{width:v?.width,height:v?.height,duration:Number(parsed.format.duration),fps:v?.r_frame_rate});
 }
 return probes.get(file);
}
async function stage(file,kind){
 file=path.resolve(file);const bytes=await fs.readFile(file),hash=sha(bytes);
 if(!assets.has(hash)){
  const relative=`assets/${hash.slice(0,18)}${path.extname(file).toLowerCase()}`;
  await fs.copyFile(file,path.join(out,relative));
  assets.set(hash,{relativeFile:relative,sourceFile:path.relative(root,file),sha256:hash,bytes:bytes.length,kind});
 }
 return assets.get(hash).relativeFile;
}
const blocks=[];let cursor=0;
for(const b of narration.blocks){
 const row=audioRows.find(x=>x.id===b.id);let audioFile=null,audioDuration=0;
 if(supplied){
  if(!row?.file)throw new Error(`Missing neural voice file for ${b.id}`);
  audioFile=path.resolve(audioBase,row.file);audioDuration=(await probe(audioFile)).duration;
  if(!Number.isFinite(audioDuration)||audioDuration<=0)throw new Error(`Invalid voice duration: ${b.id}`);
  if(row.text&&row.text!==b.text)throw new Error(`Narration text differs from approved block: ${b.id}`);
 }
 const minimum={hook:7,investigate:12,verify:10.2,control:7,improve:16,limits:7}[b.id];
 const audioOffset=supplied?(row.audioOffsetSeconds??.1):0;
 const duration=supplied?(row.durationSeconds??Math.max(minimum,audioDuration+.1)):b.intendedDurationSeconds;
 if(duration<audioDuration+audioOffset)throw new Error(`Picture window cuts narration: ${b.id}`);
 blocks.push({...b,start:cursor,duration,audioFile,audioDuration,audioOffset});cursor+=duration;
}
const total=num(cursor);
if(supplied&&(total<80||total>95))throw new Error(`Measured neural edit requires ${total}s. Provide a reviewed 80–95s spoken edit; do not stretch speech.`);
const B=Object.fromEntries(blocks.map(b=>[b.id,b]));
const time=(id,fraction)=>num(B[id].start+B[id].duration*fraction);
const scenes=[],shells=[],media=[],audio=[],motions=[],shots=[];
let serial=0;
function scene(id,start,end,content,{tone='',note='',tag=''}={}){
 const duration=num(end-start);
 if(duration<=0)throw new Error(`Invalid shot ${id}`);
 scenes.push(`<section id="${id}" class="clip scene ${tone}" data-start="${num(start)}" data-duration="${duration}" data-track-index="20">${content}${tag?`<div class="frame-tag">${escape(tag)}</div>`:''}</section>`);
 shots.push({id,startSeconds:num(start),durationSeconds:duration,sourceNote:note});
}
const title=(text,extra='')=>`<h1 class="hero ${extra} hit">${text}</h1>`;
const top=text=>`<h2 class="top-title hit">${text}</h2>`;
const pill=(text,style='')=>`<span class="pill ${style} hit">${text}</span>`;
function frame(box,start,end){shells.push(`<div id="frame-${shells.length}" class="clip media-shell" data-start="${num(start)}" data-duration="${num(end-start)}" data-track-index="3" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"></div>`);}
async function visual(file,start,end,rect,box,label,{offset=0,kind='image',motion=false}={}){
 const p=await probe(file),id=`actual-${serial++}`,src=await stage(file,kind);
 if(rect.x<0||rect.y<0||rect.x+rect.w>p.width+.01||rect.y+rect.h>p.height+.01)throw new Error(`Crop outside ${path.basename(file)}: ${JSON.stringify(rect)}`);
 if(kind==='video'&&offset+end-start>p.duration+.025)throw new Error(`Trim exceeds genuine recording ${path.basename(file)}`);
 const scale=Math.min(box.w/rect.w,box.h/rect.h);
 const left=box.x+(box.w-rect.w*scale)/2-rect.x*scale;
 const top=box.y+(box.h-rect.h*scale)/2-rect.y*scale;
 const style=`left:${num(left)}px;top:${num(top)}px;width:${num(p.width*scale)}px;height:${num(p.height*scale)}px;clip-path:inset(${num(rect.y*scale)}px ${num((p.width-rect.x-rect.w)*scale)}px ${num((p.height-rect.y-rect.h)*scale)}px ${num(rect.x*scale)}px);transform-origin:${num((rect.x+rect.w/2)/p.width*100)}% ${num((rect.y+rect.h/2)/p.height*100)}%`;
 const timing=`class="clip media-original" data-start="${num(start)}" data-duration="${num(end-start)}" data-track-index="8"`;
 media.push(kind==='video'?`<video id="${id}" ${timing} src="${src}" data-media-start="${num(offset)}" muted playsinline style="${style}"></video>`:`<img id="${id}" ${timing} src="${src}" alt="${escape(label)}" style="${style}">`);
 // Evidence pixels and clip geometry remain fixed; only editorial text animates.
 return {id,sourceFile:path.relative(root,file),startSeconds:num(start),durationSeconds:num(end-start),sourceStartSeconds:offset,sourceRect:rect,displayBox:box,label,kind,speedFactor:1};
}
const sources=[];
async function show(...params){sources.push(await visual(...params));}
const wide={x:64,y:162,w:1152,h:452},right={x:510,y:100,w:706,h:560};
const product=path.join(selected,'product-confirmed-workspace.jpg'),result=path.join(selected,'product-confirmed-evidence.jpg');

// Three differently choreographed graphic beats earn the actual product reveal.
scene('hook-complaint',0,time('hook',.31),`<div class="eyebrow hit">A browser bug report</div>${title('<span class="line">“The cart</span><span class="line accent">disappeared.”</span>')}<div class="workflow hit"><span>Symptom</span><i>→</i><span>?</span></div>`,{note:'Editorial title · controlled demo-shop complaint'});
scene('hook-promise',time('hook',.31),time('hook',.64),`<div class="eyebrow hit">BugReplay</div>${title('<span class="line">Make it</span><span class="line accent">reproducible.</span>')}<div class="workflow hit"><span>Report</span><i>→</i><span>Browser</span><i>→</i><span>Test</span></div>`,{tone:'blue'});
scene('hook-product',time('hook',.64),time('hook',1),top('From report to <span class="accent">reproduction.</span>'),{note:'Actual BugReplay capture · selected run b8ffd757 · screenshot, cropped'});
frame(wide,time('hook',.64),time('hook',1));await show(product,time('hook',.64),time('hook',1),{x:8,y:130,w:1264,h:520},wide,'Actual selected BugReplay run',{motion:true});

const I=B.investigate.start,IE=time('investigate',1);
scene('intake',I,time('investigate',.24),top('A URL. A symptom. <span class="accent">Go.</span>'),{note:'Actual model input · no source code or prepared trigger recipe'});
frame(wide,I,time('investigate',.24));await show(product,I,time('investigate',.24),{x:13,y:150,w:450,h:365},wide,'Actual symptom and URL input',{motion:true});
const investigation=path.join(selected,'investigation-episode-1.webm');
const findingShots=[
 ['observe',.24,.48,3,{x:780,y:120,w:450,h:360},'Observe the browser.'],
 ['conditions',.48,.72,25,{x:780,y:575,w:450,h:320},'Follow the evidence.'],
 ['cart-loss',.72,1,32,{x:780,y:120,w:450,h:350},'The cart disappears.']
];
for(const [id,a,z,offset,rect,heading]of findingShots){
 const s=time('investigate',a),e=time('investigate',z);
 scene(id,s,e,`<div class="proof-copy"><div class="eyebrow hit">Browser exploration</div><p class="hit">${heading}</p><div class="stat blue hit">${id==='cart-loss'?'2 → 0':'13'}</div><div class="mini hit">${id==='cart-loss'?'Observed cart loss':'browser actions'}</div></div>`,{note:'Original investigation · edited excerpt · 1× speed · actual interface crop'});
 frame(right,s,e);await show(investigation,s,e,rect,right,heading,{offset,kind:'video'});
}

// Reframe actual cart-header anchors in separate, documented presentation derivatives.
const normalizedDir=path.resolve(option('--normalized-dir',path.join(here,'normalized')));
const normalization=JSON.parse(await fs.readFile(path.join(normalizedDir,'manifest.json'),'utf8'));
// Source viewport changes come from genuine full-page captures in the recording.
// Reframe the actual cart at those boundaries; do not retime or fabricate frames.
async function replay(fileName,start,label,passed=false){
 const original=normalization.clips.find(c=>path.basename(c.originalFile)===fileName);
 if(!original)throw new Error(`Missing original-to-derivative mapping: ${fileName}`);
 const file=path.join(normalizedDir,path.basename(original.derivativeFile)),p=await probe(file),end=start+original.durationSeconds;
 if(sha(await fs.readFile(file))!==original.derivativeSha256)throw new Error(`Normalized proof hash differs: ${fileName}`);
 scene(`replay-${fileName.replaceAll('.','-')}`,start,end,`<div class="proof-copy"><div class="eyebrow hit">${passed?'Same test':label.replace('Independent replay','Replay')}</div><div class="stat ${passed?'green':'blue'} hit">${passed?'2 → 2':'2 → 0'}</div><p class="hit">${passed?'Only the URL changes.':'Target assertion fails.'}</p><div class="mini hit"><div>${passed?'Same steps. Same assertion.':'Independent, clean browser.'}</div></div></div>`,{note:`${label} · normalized presentation derivative · ${original.durationSeconds.toFixed(3)}s source duration retained · original recording preserved`});
 frame(right,start,end);
 await show(file,start,end,{x:0,y:0,w:p.width,h:p.height},right,label,{kind:'video'});
 return end;
}
const V=B.verify.start;
let replayEnd=await replay('verification-1.webm',V,'Independent replay 01');
replayEnd=await replay('verification-2.webm',replayEnd,'Independent replay 02');
scene('verified',replayEnd,time('verify',1),`<div class="eyebrow hit">Independent verification</div><div class="result-row"><div class="stat green hit">2 / 2</div><div class="result-details"><h2 class="hit">The intended failure.</h2><p class="hit">Two clean runs. Same cart-preservation assertion.</p></div></div><div class="rule"></div>`,{note:'Actual verification.json · selected run b8ffd757 · assertion and setup independently reviewed'});
const C=B.control.start,controlEnd=await replay('control.webm',C,'Same test · corrected control',true);
const controlStillEnd=controlEnd+2.5,artifactEnd=time('control',1);
scene('fixed-pass',controlEnd,controlStillEnd,`<div class="proof-copy"><div class="eyebrow hit">Change only the URL</div><div class="stat green hit">PASS</div><p class="hit">Same test. Same assertion.</p><div class="mini hit">Identical test bytes.</div></div>`,{note:'Actual corrected-control result · base URL changed · both items retained'});
frame(right,controlEnd,controlStillEnd);await show(path.join(selected,'control-after.png'),controlEnd,controlStillEnd,{x:840,y:120,w:390,h:360},right,'Actual corrected cart');
scene('artifacts',controlStillEnd,artifactEnd,top('Keep the <span class="accent">proof.</span>')+`<div class="artifact-stack"><div class="artifact hit">repro.spec.ts</div><div class="artifact hit">report.md</div><div class="artifact hit">reproduction.json</div></div>`,{note:'Actual saved outputs · original screenshots, videos and failed investigations retained'});
if(artifactEnd<time('control',1)){
 scene('evidence-view',artifactEnd,time('control',1),top('Every result. <span class="accent">Inspectable.</span>'),{note:'Actual selected-run Evidence panel · original artifacts retained'});
 frame(wide,artifactEnd,time('control',1));await show(result,artifactEnd,time('control',1),{x:8,y:130,w:1264,h:520},wide,'Actual BugReplay Evidence panel',{motion:true});
}

const sponsor=(id,a,z,titleText,body,note)=>scene(id,time('improve',a),time('improve',z),`<div class="sponsor-copy"><div class="eyebrow hit">${id.startsWith('neat')?'Neatlogs':id.startsWith('entire')?'Entire':'CFO.ai'}</div><h2 class="hit">${titleText}</h2><p class="hit">${body}</p></div>`,{note});
const sponsorBox={x:540,y:125,w:675,h:520};
sponsor('neat-before',0,.19,'Find the failure.','Baseline: provider succeeds. Format rejected.','Actual hosted UI · first baseline trace17af… · safe screenshot crop');
frame(sponsorBox,time('improve',0),time('improve',.19));await show(path.join(improvement,'neatlogs-before-parser-crop.png'),time('improve',0),time('improve',.19),{x:120,y:1135,w:1380,h:190},sponsorBox,'Actual baseline terminal wrapper error');
sponsor('neat-after',.19,.32,'Trace the rerun.','Two intended failures, captured in the real hosted trace.','Actual official Neatlogs UI · selected trace9096… · screenshot crop');
frame(sponsorBox,time('improve',.19),time('improve',.32));await show(path.join(improvement,'neatlogs-after-official-replay.jpg'),time('improve',.19),time('improve',.32),{x:150,y:270,w:600,h:200},sponsorBox,'Official hosted verifier.replay output');
sponsor('neat-control',.32,.43,'And the control.','The identical test passes on the corrected shop.','Actual official Neatlogs UI · verifier.control passed · screenshot crop');
frame(sponsorBox,time('improve',.32),time('improve',.43));await show(path.join(improvement,'neatlogs-after-official-control.jpg'),time('improve',.32),time('improve',.43),{x:180,y:360,w:560,h:215},sponsorBox,'Official hosted verifier.control output');
sponsor('entire-checkpoint',.43,.54,'Keep the context.','Actual fix checkpoint. Local CLI export.','Authentic Entire CLI metadata export · local viewer · no official-app claim');
frame(sponsorBox,time('improve',.43),time('improve',.54));await show(path.join(improvement,'latest-entire-local-viewer.jpg'),time('improve',.43),time('improve',.54),{x:28,y:98,w:625,h:235},sponsorBox,'Genuine Entire checkpoint metadata');
sponsor('entire-diff',.54,.64,'Bounded recovery.','Actual Git diff. Local CLI export.','Actual Git diff linked to Entire checkpoint · CLI export viewer');
frame(sponsorBox,time('improve',.54),time('improve',.64));await show(path.join(improvement,'latest-entire-local-viewer.jpg'),time('improve',.54),time('improve',.64),{x:28,y:440,w:426,h:184},sponsorBox,'Actual bounded-recovery diff');
sponsor('cfo-model',.64,.81,'Model the tradeoff.','Editable Base / Downside. Planning assumptions.','Actual native CFO.ai model · planning assumptions, not measured traction');
frame(sponsorBox,time('improve',.64),time('improve',.81));await show(path.join(finance,'screens/cfo-base-summary.jpg'),time('improve',.64),time('improve',.81),{x:90,y:175,w:470,h:405},sponsorBox,'Native CFO Planning summary');
scene('cfo-cost',time('improve',.81),time('improve',1),`<div class="price-main"><div class="eyebrow hit">Gateway accounting</div><div class="stat hit">$0.1563</div><p class="hit">Selected confirmed run.</p><div class="price-compare hit"><strong>&gt; $0.1293</strong> budget</div><p class="cost-hypothesis hit">$49 / 100 · 70% target</p></div>`,{note:'CFO.ai observed evidence · $49/100 and 70% are hypotheses · invoices and credits unknown'});
const cfoBox={x:650,y:145,w:565,h:440};frame(cfoBox,time('improve',.81),time('improve',1));await show(path.join(finance,'screens/cfo-observed-costs.jpg'),time('improve',.81),time('improve',1),{x:90,y:175,w:470,h:335},cfoBox,'Native CFO observed-cost page');

scene('scope',time('limits',0),time('limits',.21),`<div class="eyebrow hit">Controlled MVP</div>${title('<span class="line">One shop.</span><span class="line accent">One defect class.</span>','small')}`,{note:'Cart preservation after checkout changes · no general website-support claim'});
scene('cohort',time('limits',.21),time('limits',.46),`<div class="eyebrow hit">Final buggy cohort</div><div class="result-row"><div class="stat blue hit">1 / 3</div><div class="result-details"><h2 class="hit">Confirmed.</h2><p class="hit">Two investigations did not reproduce it.</p></div></div>`,{note:'Discovery outcome differs from 2/2 independent replay verification · not a general success rate'});
scene('billing',time('limits',.46),time('limits',.68),`<div class="eyebrow hit">Complete cash billing</div>${title('<span class="line">Still</span><span class="line accent">unknown.</span>','small')}<p class="deck hit">Invoices and promotional credits.</p>`,{note:'All attempts retained · missing historical costs are not treated as zero'});
scene('close',time('limits',.68),total,`<div class="eyebrow hit">BugReplay</div>${title('<span class="line">From report</span><span class="line accent">to reproduction.</span>','small')}<div class="closing-url hit">github.com/dsvyro1414-lab/bugreplay</div>`,{note:'Engine SHA 2b541b20a97e · selected run b8ffd757 · actual evidence in repository'});

for(const b of blocks)if(b.audioFile){const src=await stage(b.audioFile,'neural-narration');audio.push(`<audio id="voice-${b.id}" src="${src}" data-start="${num(b.start+b.audioOffset)}" data-duration="${num(b.audioDuration)}" data-track-index="50" data-volume="1"></audio>`);}
const sfxRoot=path.resolve(option('--sfx-dir',path.join(root,'artifacts/submission-2026-10-12/saas-cut/.media/audio/sfx')));
const whoosh=path.join(sfxRoot,'sfx_001.mp3'),chime=path.join(sfxRoot,'sfx_002.mp3');
const sfx=[];
for(const [i,start]of [time('hook',.31),B.investigate.start,B.verify.start,B.improve.start].entries()){
 const src=await stage(whoosh,'licensed-bundled-sfx'),duration=(await probe(whoosh)).duration;
 audio.push(`<audio id="whoosh-${i}" src="${src}" data-start="${start}" data-duration="${duration}" data-track-index="60" data-volume="0.075"></audio>`);sfx.push({kind:'whoosh',startSeconds:start,volume:.075,purpose:'Editorial graphic transition only'});
}
{const src=await stage(chime,'licensed-bundled-sfx'),duration=(await probe(chime)).duration;audio.push(`<audio id="confirmed-chime" src="${src}" data-start="${num(controlEnd)}" data-duration="${duration}" data-track-index="61" data-volume="0.09"></audio>`);sfx.push({kind:'chime',startSeconds:num(controlEnd),volume:.09,purpose:'Editorial fixed-control PASS reveal; not a browser sound'});}
let html=await fs.readFile(path.join(here,'index.template.html'),'utf8');
for(const [key,value]of Object.entries({DURATION:total,PROTOTYPE:'',SHELLS:shells.join('\n'),SCENES:scenes.join('\n'),MEDIA:media.join('\n'),AUDIO:audio.join('\n'),CAPTIONS:'',BEATS:JSON.stringify(shots.map(s=>({id:s.id,start:s.startSeconds}))),MEDIA_MOTION:motions.join('\n')}))html=html.replaceAll(`{{${key}}}`,String(value));
await fs.writeFile(path.join(out,'index.html'),html);
await fs.copyFile(path.join(here,'styles.css'),path.join(out,'styles.css'));
await fs.copyFile(path.join(root,'demo/assets/gsap.min.js'),path.join(out,'assets/gsap.min.js'));
for(const font of ['Montserrat.ttf','IBMPlexMono-Regular.ttf'])await fs.copyFile(path.join(here,'assets',font),path.join(out,'assets',font));
await fs.writeFile(path.join(out,'provenance.json'),JSON.stringify({kind:'silent-stable-saas-cut',revision:3,mode:'silent',normalization,durationSeconds:total,narrated:!!supplied,selectedRunId:evidence.runId,engineGitSha:evidence.gitSha,testSha256:evidence.testSha256,blocks:blocks.map(({audioFile,...b})=>({...b,audioFile:audioFile?path.relative(root,audioFile):null})),shots,media:sources,assets:[...assets.values()],soundEffects:sfx,limits:['Proof presentation derivatives preserve source durations and outcomes, align observed cart anchors, and document neighboring authentic-frame holds. Original verification recordings remain untouched.','Hosted after screenshots are genuine official Neatlogs UI. Entire remains a labeled CLI export viewer.','Gateway accounting differs from complete cash billing and credits; earlier missing costs remain unknown.','Final silent revision requested by the owner; no speech assets or narration clips are included.']},null,2)+'\n');
console.log(JSON.stringify({sourceProject:out,durationSeconds:total,narrated:!!supplied,shots:shots.length,mediaEntries:sources.length,voiceBlocks:blocks.filter(b=>b.audioFile).length,sfx:sfx.length,rendered:false},null,2));
