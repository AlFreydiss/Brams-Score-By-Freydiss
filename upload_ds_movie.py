# -*- coding: utf-8 -*-
"""
Demon Slayer - Le Film (Mugen Train) -> R2 + page KNY.
Source x264 (deja H264) -> simple REMUX MKV->MP4 (copie video, audio AAC) + sous-titres FR.
Ecrit kny-videos.json (la page KNY etait vide) avec le film en kind=film.
"""
import sys, json, subprocess
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
TMP=Path(r'F:\ds_movie_tmp'); TMP.mkdir(parents=True,exist_ok=True)

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def ct(p): return {'.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8'}.get(p.suffix.lower(),'application/octet-stream')
def already(k,s):
    try: return s3.head_object(Bucket=BUCKET,Key=k)['ContentLength']==s
    except ClientError: return False
def upload(local,key):
    sz=local.stat().st_size
    if already(key,sz): print(f'  deja sur R2 {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'  upload {key} ({sz/1024/1024:.0f} MB)')
    s3.upload_file(str(local),BUCKET,key,ExtraArgs={'ContentType':ct(local)},Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

def main():
    root=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')
    src=next(f for f in root.glob('*.mkv') if 'demon' in f.name.lower() or 'kimetsu' in f.name.lower())
    print('Film:',src.name)
    mp4=TMP/'kny-movie.mp4'; vtt=TMP/'kny-movie-fr.vtt'
    if not mp4.exists():
        # x264 deja -> copie video ; audio en AAC (au cas ou) ; faststart
        ff(['-i',str(src),'-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','aac','-b:a','192k',
            '-dn','-sn','-movflags','+faststart',str(mp4)])
    has_sub=False
    if not vtt.exists():
        try: ff(['-i',str(src),'-map','0:s:0','-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
        except subprocess.CalledProcessError: has_sub=False
    else: has_sub=True
    url=upload(mp4,'anime/kny/movie-mugen-train.mp4')
    entry={'episode':1,'title':'Le Train de l\'Infini (Mugen Train)','kind':'film',
        'episodeLabel':'Film','src':url,'season':'Film','arc':'Film','badge':'VOSTFR',
        'preferredAudioLang':'ja','progressKey':'kny-movie-mugen'}
    if has_sub:
        url_v=upload(vtt,'anime/kny/movie-mugen-train-fr.vtt')
        entry['subtitles']=[{'label':'Français','srclang':'fr','src':url_v}]
    out=Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data\kny-videos.json')
    out.write_text(json.dumps([entry],ensure_ascii=False,indent=2),encoding='utf-8')
    try: mp4.unlink()
    except OSError: pass
    print('OK -> kny-videos.json (1 film)')

if __name__=='__main__': main()
