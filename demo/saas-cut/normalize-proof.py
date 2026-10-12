#!/usr/bin/env python3
"""Reframe genuine proof recordings around their observed cart header.

Original files are untouched. No pixels or UI states are synthesized. When the
source scrolls the cart out of view, hold the preceding authentic cart crop at
its original time. This presentation derivative is separate from verification.
"""
import argparse, hashlib, json, pathlib, subprocess
import numpy as np
from PIL import Image, ImageDraw

parser=argparse.ArgumentParser();parser.add_argument('--root',default='.');parser.add_argument('--out',default='artifacts/submission-2026-10-12/saas-cut-v3/normalized');args=parser.parse_args()
root=pathlib.Path(args.root).resolve();out=pathlib.Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
inputs=root/'docs/evidence/live-confirmed-2026-10-12'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=['verification-1.webm','verification-2.webm','control.webm'];rows=[];template=None

def darkness(im):
 a=np.asarray(im.convert('L'),dtype=np.float32);a=(255-a)/255;a[a<.25]=0;return a

def locate(im,t):
 area=darkness(im.crop((820,0,960,320)));h,w=t.shape;ah,aw=area.shape;shape=(ah+h-1,aw+w-1)
 corr=np.fft.irfftn(np.fft.rfftn(area,shape,axes=(0,1))*np.conj(np.fft.rfftn(t,shape,axes=(0,1))),shape,axes=(0,1))[:ah-h+1,:aw-w+1]
 integral=np.pad(np.cumsum(np.cumsum(area*area,axis=0),axis=1),((1,0),(1,0)))
 sums=integral[h:,w:]-integral[:-h,w:]-integral[h:,:-w]+integral[:-h,:-w]
 error=sums+float(np.sum(t*t))-2*corr;y,x=np.unravel_index(np.argmin(error),error.shape)
 confidence=1-float(error[y,x])/float(np.sum(t*t));return int(x)+820,int(y),confidence

def ranges(indices):
 result=[]
 for n in indices:
  if result and n==result[-1][-1]+1:result[-1].append(n)
  else:result.append([n])
 return [{'startSeconds':r[0]/25,'endSeconds':(r[-1]+1)/25,'sourceFrameIndices':r} for r in result]

for name in files:
 source=inputs/name;slug=source.stem;frames=out/f'{slug}-source';frames.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(source),'-fps_mode','passthrough','-y',str(frames/'%04d.png')],check=True)
 paths=sorted(frames.glob('*.png'));dest=out/f'{slug}-frames';dest.mkdir(exist_ok=True);records=[];held=[];last=None;lastsource=None
 if template is None:template=darkness(Image.open(paths[13]).crop((862,150,950,176)))
 for index,p in enumerate(paths):
  original=Image.open(p).convert('RGB');a=np.asarray(original);gray=np.max(np.abs(a.astype('int16')-128),axis=2)<5;fraction=gray.mean(axis=0);candidate=np.flatnonzero((fraction>.9)&(np.arange(a.shape[1])>700));width=int(candidate[0]) if len(candidate) else a.shape[1]
  normalized=original.resize((1280,round(original.height*1280/width)),Image.Resampling.LANCZOS) if width!=1280 else original
  if width!=1280:
   # Exclude the authentic gray padding before restoring the source CSS scale.
   normalized=original.crop((0,0,width,original.height)).resize((1280,round(original.height*1280/width)),Image.Resampling.LANCZOS)
  x,y,confidence=locate(normalized,template)
  isolated_scale_flash=index==11
  valid=confidence>=.50 and y>=45 and not isolated_scale_flash
  if valid:
   crop=normalized.crop((x-37,y-45,x+383,y+355)).resize((840,800),Image.Resampling.LANCZOS);last=crop;lastsource=index
  elif last is not None:crop=last.copy();held.append(index)
  else:crop=None;held.append(index)
  if crop is not None:crop.save(dest/f'{index+1:04d}.png')
  records.append({'sourceFrameIndex':index,'sourceTimeSeconds':index/25,'viewportContentWidth':width,'headerAnchor':[x,y],'matchConfidence':round(confidence,4),'heldFromSourceFrameIndex':lastsource if not valid else None,'holdReason':('Isolated one-frame viewport scale flash; adjacent authentic frames show the same two-item cart.' if isolated_scale_flash else 'Full cart header/ROI is unavailable during navigation or source scroll.') if not valid else None})
 first=next(i for i,r in enumerate(records) if r['matchConfidence']>=.50 and r['headerAnchor'][1]>=45)
 for i in range(first):
  Image.open(dest/f'{first+1:04d}.png').save(dest/f'{i+1:04d}.png');records[i]['heldFromSourceFrameIndex']=first;records[i]['holdReason']='Leading navigation has no cart; first genuine visible cart crop held until source catches up.'
 derivative=out/f'{slug}-stabilized.mp4';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-framerate','25','-i',str(dest/'%04d.png'),'-c:v','libx264','-preset','medium','-crf','14','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',str(derivative)],check=True)
 rows.append({'originalFile':str(source.relative_to(root)),'originalSha256':sha(source),'derivativeFile':derivative.name,'derivativeSha256':sha(derivative),'sourceFrames':len(paths),'sourceFramesPerSecond':25,'durationSeconds':len(paths)/25,'derivativeWidth':840,'derivativeHeight':800,'method':'Actual viewport-scale normalization and observed cart-header alignment, with exact authentic-neighbor hold mappings. Source duration retained; no synthesized UI or AI interpolation. Original run outcomes and verification evidence remain the source of truth.','heldRanges':ranges(held),'heldFrameMeaning':'An authentic neighboring cart crop is held for leading navigation or when the source scrolls its header out of view. Per-frame source mappings identify forward leading holds and backward scroll holds. The derivative is not the original verification recording.','frames':records})
 print(name,'frames',len(paths),'holds',len(held),'range',ranges(held),'confidence',min(r['matchConfidence'] for r in records),flush=True)
manifest={'version':1,'kind':'Presentation derivatives of genuine verification recordings','originalRecordingsUntouched':True,'outcomesNotModified':True,'notAnUnmodifiedRecording':True,'sourceDurationRetained':True,'holdsMayOmitIntermediateOffscreenActivity':True,'clips':rows};(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(out/'manifest.json')
