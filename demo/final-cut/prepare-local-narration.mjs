import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

// Explicitly authorized offline system speech. No provider request or time stretching.
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(await fs.readFile(path.join(here,'narration-plan.json'),'utf8'));
const out = path.resolve(process.argv[2] ?? 'artifacts/submission-2026-10-12/final-cut/narration');
await fs.mkdir(out,{recursive:true});
const probe = async file => Number((await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file])).stdout.trim());
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const segments = [], captions = [], sources = [];
for (const chapter of plan.chapters) {
  const cueFiles = [];
  let elapsed = 0;
  for (const [index,text] of chapter.cues.entries()) {
    if (text.length>180) throw new Error(`Caption too long: ${chapter.scene}/${index}`);
    const base = `${chapter.scene}-${String(index+1).padStart(2,'0')}`;
    const textFile = path.join(out,`${base}.txt`), aiff=path.join(out,`${base}.aiff`), wav=path.join(out,`${base}.wav`);
    await fs.writeFile(textFile,text+'\n');
    await run('/usr/bin/say',['-v',plan.voice.name,'-r',String(plan.voice.wordsPerMinute),'-f',textFile,'-o',aiff]);
    await run('ffmpeg',['-hide_banner','-loglevel','error','-i',aiff,'-ac','1','-ar','24000','-c:a','pcm_s16le','-y',wav]);
    const seconds = await probe(wav);
    cueFiles.push(wav);
    captions.push({startSeconds:Number((chapter.startSeconds+elapsed).toFixed(6)),durationSeconds:Number(seconds.toFixed(6)),text});
    sources.push({scene:chapter.scene,cue:index+1,text,file:wav,durationSeconds:seconds,sha256:sha(await fs.readFile(wav))});
    elapsed += seconds;
  }
  if (elapsed>chapter.durationSeconds+0.001) {
    await fs.writeFile(path.join(out,'duration-failure.json'),JSON.stringify({scene:chapter.scene,measuredSeconds:elapsed,targetSeconds:chapter.durationSeconds,action:'Shorten this chapter text; do not time-stretch.'},null,2));
    throw new Error(`${chapter.scene} speech ${elapsed.toFixed(3)}s exceeds ${chapter.durationSeconds}s; shorten text`);
  }
  const concat = path.join(out,`${chapter.scene}-concat.txt`);
  await fs.writeFile(concat,cueFiles.map(file=>`file '${file.replaceAll("'","'\\''")}'`).join('\n')+'\n');
  const segment=path.join(out,`${chapter.scene}.wav`);
  await run('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concat,'-c','copy','-y',segment]);
  segments.push({scene:chapter.scene,file:segment,sourceStartSeconds:0,reviewed:false,measuredSeconds:await probe(segment),windowSeconds:chapter.durationSeconds});
  console.log(`${chapter.scene}: ${elapsed.toFixed(3)}s / ${chapter.durationSeconds}s`);
}
const time = seconds => {
  const ms=Math.round(seconds*1000), h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;
};
await fs.writeFile(path.join(out,'captions.srt'),captions.map((cue,i)=>`${i+1}\n${time(cue.startSeconds)} --> ${time(cue.startSeconds+cue.durationSeconds)}\n${cue.text}\n`).join('\n'));
await fs.writeFile(path.join(out,'narration-manifest.json'),JSON.stringify({provider:'macOS /usr/bin/say',voice:plan.voice,generatedAtUtc:new Date().toISOString(),planFile:path.join(here,'narration-plan.json'),externalProviderCalls:0,timeStretching:false,segments,captions,synchronizedCaptionsReviewed:false,sources,note:'Cue timestamps derive from separately synthesized exact text and measured file durations. Listen and inspect final caption/picture sync before marking reviewed.'},null,2)+'\n');
console.log(JSON.stringify({out,segments:segments.length,captions:captions.length,rendered:false}));
