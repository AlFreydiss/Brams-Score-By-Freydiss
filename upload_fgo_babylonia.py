# -*- coding: utf-8 -*-
"""
Fate/Grand Order Absolute Demonic Front: Babylonia (2019, VOSTFR, BD 1080p HEVC 10bits AAC)
-> R2 + genere fgo-babylonia-videos.json.
Source HEVC 10bits + audio AAC (jpn) + sous-titres ASS (fre) -> TRANSCODE :
  video h265 -> h264 NVENC, audio aac -> copy, 1 MP4 VOSTFR/ep + sous-titres FR (vtt)
  + 1 miniature jpg/ep. Inclut le special S00E01 (-Initium Iter-) en ep 0.
Resumable (head_object + temp local). Lancer : py upload_fgo_babylonia.py
"""
import sys, json, re, subprocess
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID='166b8357e5229b31a88cf104058ed5ee'; BUCKET='bramscore'
PUBLIC_URL='https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
env={}
for line in (Path(__file__).parent/'.env.upload').read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1); env[k.strip()]=v.strip()
s3=boto3.client('s3',endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'],aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'),region_name='auto')
TRANSFER=boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024,multipart_chunksize=50*1024*1024,max_concurrency=4)
TMP=Path(r'F:\fgo_babylonia_tmp'); TMP.mkdir(parents=True,exist_ok=True)
SRC=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Fate⁄Grand Order Absolute Demonic Front, Babylonia - iNTEGRALE (2019) VOSTFR 1080p 10bits BluRay x265 AAC v2 -Punisher694')
JSON=Path(r'F:\bwc-main\src\data\fgo-babylonia-videos.json')
KEY_PREFIX='anime/fgo-babylonia'

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def ct(p): return {'.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.jpg':'image/jpeg'}.get(p.suffix.lower(),'application/octet-stream')
def already(k,s):
    try: return s3.head_object(Bucket=BUCKET,Key=k)['ContentLength']==s
    except ClientError: return False
def upload(local,key):
    sz=local.stat().st_size
    if already(key,sz): print('  deja',key); return f'{PUBLIC_URL}/{key}'
    print(f'  up {key} ({sz/1024/1024:.0f} MB)'); s3.upload_file(str(local),BUCKET,key,ExtraArgs={'ContentType':ct(local)},Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

# S00E01 = special (-Initium Iter-) -> ep 0 ; S01E01..21 -> 1..21
EP=re.compile(r'S(\d{2})E(\d{2})',re.I)

def main():
    files={}
    for f in sorted(SRC.glob('*.mkv')):
        m=EP.search(f.name)
        if not m: continue
        season=int(m.group(1)); num=int(m.group(2))
        ep = 0 if season==0 else num
        files[ep]=f
    print('FGO Babylonia :',len(files),'episodes')
    entries=[]
    if JSON.exists():
        try: entries=json.loads(JSON.read_text(encoding='utf-8'))
        except Exception: entries=[]
    by_ep={e['episode']:e for e in entries}
    for ep in sorted(files):
        f=files[ep]
        special = (ep==0)
        base = 'S00E01' if special else f'S01E{ep:02d}'
        print('\nEp',ep, '(special)' if special else '')
        vo=TMP/f'{base}-vostfr.mp4'; vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
        if not vo.exists():
            ff(['-i',str(f),'-map','0:v:0','-map','0:a:0','-c:v','h264_nvenc','-preset','p5','-cq','23',
                '-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(vo)])
        has_sub=False
        if not vtt.exists():
            for smap in ('0:s:m:language:fre','0:s:0'):
                try: ff(['-i',str(f),'-map',smap,'-c:s','webvtt',str(vtt)]); has_sub=vtt.exists(); break
                except subprocess.CalledProcessError: continue
        else: has_sub=True
        if not thumb.exists():
            try: ff(['-ss','00:03:00','-i',str(f),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
            except subprocess.CalledProcessError: pass
        url_vo=upload(vo,f'{KEY_PREFIX}/{base}-vostfr.mp4')
        url_thumb=upload(thumb,f'{KEY_PREFIX}/thumbnails/{base}.jpg') if thumb.exists() else None
        title = 'Spécial : -Initium Iter-' if special else f'Épisode {ep}'
        e={'episode':ep,'title':title,'episodeLabel':base,'src':url_vo,
           'season':'S00' if special else 'S01','arc':'Prologue' if special else 'Saison 1',
           'preferredAudioLang':'ja','progressKey':base,'badge':'VOSTFR',
           'audio':[{'label':'VOSTFR','srclang':'ja','default':True}]}
        if url_thumb: e['thumbnail']=url_thumb
        if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'{KEY_PREFIX}/{base}-fr.vtt'),'default':True}]
        by_ep[ep]=e
        out=sorted(by_ep.values(),key=lambda d:d.get('episode') if d.get('episode') is not None else 0)
        JSON.parent.mkdir(parents=True,exist_ok=True)
        JSON.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
        for t in (vo,):
            try: t.unlink()
            except OSError: pass
        print('  ok ep',ep)
    print('\nTermine FGO Babylonia.')

if __name__=='__main__': main()
