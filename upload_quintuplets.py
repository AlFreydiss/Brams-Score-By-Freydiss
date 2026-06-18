# -*- coding: utf-8 -*-
"""
The Quintessential Quintuplets / Gotoubun no Hanayome — S01 12 ep + S02 12 ep + Film (2022)
-> R2 anime/quintuplets/ + quintuplets-videos.json.
Source Tsundere-Raws WEB 1080p : h264 + AAC jpn déjà compatibles -> REMUX (-c copy, zéro encodage,
tourne en parallèle des encodes NVENC sans toucher au GPU), sous-titres ASS fre -> vtt, 1 miniature/ep.
Resumable (entrée json = épisode complet -> skip). Lancer : py upload_quintuplets.py
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
TMP=Path(r'F:\quintuplets_tmp'); TMP.mkdir(parents=True,exist_ok=True)
BASE=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')
S01=BASE/'The Quintessential Quintuplets S01 VOSTFR 1080p WEB x264 AAC -Tsundere-Raws (CR) (Gotoubun no Hanayome)'
S02=BASE/'The Quintessential Quintuplets S02 VOSTFR 1080p WEB x264 AAC -Tsundere-Raws (CR) (Gotoubun no Hanayome)'
MOVIE=BASE/'The Quintessential Quintuplets Movie (2022) VOSTFR 1080p WEB x264 AAC -Tsundere-Raws (CR).mkv'
JSON_OUT=Path(r'F:\brams-web-clone\src\data\quintuplets-videos.json')
KEY_PREFIX='anime/quintuplets'

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def ct(p): return {'.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.jpg':'image/jpeg'}.get(p.suffix.lower(),'application/octet-stream')
def already(k,s):
    try: return s3.head_object(Bucket=BUCKET,Key=k)['ContentLength']==s
    except ClientError: return False
def upload(local,key):
    sz=local.stat().st_size
    if already(key,sz): print('  deja',key,flush=True); return f'{PUBLIC_URL}/{key}'
    print(f'  up {key} ({sz/1024/1024:.0f} MB)',flush=True); s3.upload_file(str(local),BUCKET,key,ExtraArgs={'ContentType':ct(local)},Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

EP=re.compile(r'S(\d{2})E(\d{2})',re.I)

def process(src,base,num,season,arc,title,badge='VOSTFR'):
    vo=TMP/f'{base}-vostfr.mp4'; vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
    if not vo.exists():
        # WEB h264+aac -> remux pur (copy), juste la piste jpn + faststart
        ff(['-i',str(src),'-map','0:v:0','-map','0:a:m:language:jpn','-c','copy','-movflags','+faststart',str(vo)])
    has_sub=vtt.exists()
    if not has_sub:
        try: ff(['-i',str(src),'-map','0:s:m:language:fre','-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
        except subprocess.CalledProcessError: pass
    if not thumb.exists():
        try: ff(['-ss','00:05:00','-i',str(vo),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
        except subprocess.CalledProcessError: pass
    url=upload(vo,f'{KEY_PREFIX}/{base}-vostfr.mp4')
    e={'episode':num,'title':title,'episodeLabel':base,'src':url,
       'season':season,'arc':arc,'preferredAudioLang':'ja','progressKey':f'quintuplets-{base}','badge':badge,
       'audio':[{'label':'VOSTFR','srclang':'ja','default':True}]}
    if thumb.exists(): e['thumbnail']=upload(thumb,f'{KEY_PREFIX}/thumbnails/{base}.jpg')
    if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'{KEY_PREFIX}/{base}-fr.vtt'),'default':True}]
    try: vo.unlink()
    except OSError: pass
    return e

def save(by_key):
    out=sorted(by_key.values(),key=lambda d:d.get('episode') or 0)
    JSON_OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')

def main():
    entries=[]
    if JSON_OUT.exists():
        try: entries=json.loads(JSON_OUT.read_text(encoding='utf-8'))
        except Exception: entries=[]
    by_key={e['progressKey']:e for e in entries}

    jobs=[]
    for folder,season,arc,offset in ((S01,'S01','Saison 1',0),(S02,'S02','Saison 2',12)):
        for f in sorted(folder.glob('*.mkv')):
            m=EP.search(f.name)
            if not m: continue
            ep=int(m.group(2)); base=f'{season}E{ep:02d}'
            jobs.append((f,base,offset+ep,season,arc,f'Épisode {ep}','VOSTFR'))
    jobs.append((MOVIE,'MOVIE',25,'Film','Film (2022)','Le film : Cinq fiancées',  'FILM'))

    print(f'Quintuplets : {len(jobs)} fichiers',flush=True)
    for src,base,num,season,arc,title,badge in jobs:
        if by_key.get(f'quintuplets-{base}'):
            print(f'[{base}] deja complet — skip',flush=True); continue
        print(f'[{base}] {src.name[:70]}',flush=True)
        e=process(src,base,num,season,arc,title,badge)
        if not e: continue
        old=by_key.get(e['progressKey'])
        if old and old.get('title') and not re.match(r'^épisode \d+$',old['title'].strip(),re.I):
            e['title']=old['title']
        by_key[e['progressKey']]=e
        save(by_key)
        print('  ok',base,flush=True)
    print('\nTermine Quintuplets.',flush=True)

if __name__=='__main__': main()
