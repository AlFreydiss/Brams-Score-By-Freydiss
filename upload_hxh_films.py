# -*- coding: utf-8 -*-
"""
Hunter x Hunter — Films 01 (Phantom Rouge) + 02 (The Last Mission), VOSTFR BDrip 1080p
HEVC + FLAC -> h264 NVENC + AAC 192k, sous-titres ASS fre -> vtt.
Merge dans hxh-videos.json (episodes 149/150, season 'Films') — la page HxH groupe par arc.
Resumable (entrée json = film complet -> skip). Lancer APRÈS les encodes série (GPU).
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
TMP=Path(r'F:\hxh_tmp'); TMP.mkdir(parents=True,exist_ok=True)
SRC=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Hunter x Hunter (2011) MULTI BDrip 1080p FLAC x265-GundamGuy\Films')
JSON_OUT=Path(r'F:\brams-web-clone\src\data\hxh-videos.json')
KEY_PREFIX='anime/hxh'

FILMS=[
    ('Hunter x Hunter (2013) Film 01 - Phantom Rouge - VOSTFR BDrip 1080p FLAC x265-GundamGuy.mkv',
     'F01', 149, 'Film 1 — Phantom Rouge'),
    ('Hunter x Hunter (2013) Film 02 - The Last Mission - VOSTFR BDrip 1080p FLAC x265-GundamGuy.mkv',
     'F02', 150, 'Film 2 — The Last Mission'),
]

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

def encode(src,out):
    # HEVC -> h264 : décodage matériel puis repli CPU ; FLAC -> AAC 192k.
    for dec in (['-hwaccel','cuda','-c:v','hevc_cuvid'],[]):
        try:
            ff([*dec,'-i',str(src),'-map','0:v:0','-map','0:a:m:language:jpn','-c:v','h264_nvenc',
                '-preset','p5','-cq','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k',
                '-movflags','+faststart',str(out)])
            return True
        except subprocess.CalledProcessError:
            if out.exists(): out.unlink()
            continue
    return False

def main():
    entries=[]
    if JSON_OUT.exists():
        try: entries=json.loads(JSON_OUT.read_text(encoding='utf-8'))
        except Exception: entries=[]
    by_key={e['progressKey']:e for e in entries}

    for fname,code,num,title in FILMS:
        key=f'hxh-{code}'
        if by_key.get(key):
            print(f'[{code}] deja complet — skip',flush=True); continue
        src=SRC/fname
        if not src.exists():
            print(f'[{code}] INTROUVABLE : {fname}',flush=True); continue
        print(f'[{code}] {fname[:70]}',flush=True)
        vo=TMP/f'{code}-vostfr.mp4'; vtt=TMP/f'{code}-fr.vtt'; thumb=TMP/f'{code}.jpg'
        if not vo.exists():
            if not encode(src,vo): print('  !! encode echoue',code,flush=True); continue
        has_sub=vtt.exists()
        if not has_sub:
            try: ff(['-i',str(src),'-map','0:s:m:language:fre','-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
            except subprocess.CalledProcessError: pass
        if not thumb.exists():
            try: ff(['-ss','00:10:00','-i',str(vo),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
            except subprocess.CalledProcessError: pass
        url=upload(vo,f'{KEY_PREFIX}/{code}-vostfr.mp4')
        e={'episode':num,'title':title,'episodeLabel':code,'src':url,
           'season':'Films','arc':'Films','preferredAudioLang':'ja','progressKey':key,'badge':'FILM',
           'audio':[{'label':'VOSTFR','srclang':'ja','default':True}]}
        if thumb.exists(): e['thumbnail']=upload(thumb,f'{KEY_PREFIX}/thumbnails/{code}.jpg')
        if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'{KEY_PREFIX}/{code}-fr.vtt'),'default':True}]
        try: vo.unlink()
        except OSError: pass
        by_key[key]=e
        out=sorted(by_key.values(),key=lambda d:d.get('episode') or 0)
        JSON_OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
        print('  ok',code,flush=True)
    print('\nTermine films HxH.',flush=True)

if __name__=='__main__': main()
