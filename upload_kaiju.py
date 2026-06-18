# -*- coding: utf-8 -*-
"""
Kaiju No 8 S01 (12 ep, MULTi x264) -> R2 + regenere kaiju-videos.json.
Source deja H264 -> REMUX (copie video, rapide) : video-only une fois + pistes
VF (fre) et VOSTFR (jpn) muxees en 2 MP4 (variantes mediaSrc) + sous-titres FR.
Resumable. Lancer : py upload_kaiju.py
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
TMP=Path(r'F:\kaiju_tmp'); TMP.mkdir(parents=True,exist_ok=True)
SRC=Path(r'F:\Brams-Score-By-Freydiss\brams-website\public\anime\Kaiju No 8 S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (CR)')
JSON=Path(r'F:\brams-web-clone\src\data\kaiju-videos.json')

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def ct(p): return {'.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.m4a':'audio/mp4'}.get(p.suffix.lower(),'application/octet-stream')
def already(k,s):
    try: return s3.head_object(Bucket=BUCKET,Key=k)['ContentLength']==s
    except ClientError: return False
def upload(local,key):
    sz=local.stat().st_size
    if already(key,sz): print('  deja',key); return f'{PUBLIC_URL}/{key}'
    print(f'  up {key} ({sz/1024/1024:.0f} MB)'); s3.upload_file(str(local),BUCKET,key,ExtraArgs={'ContentType':ct(local)},Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

EP=re.compile(r'S01E(\d{2})',re.I)

def main():
    files={}
    for f in sorted(SRC.rglob('*.mkv')):
        m=EP.search(f.name)
        if m: files[int(m.group(1))]=f
    print('Kaiju No 8 :',len(files),'episodes')
    entries=[]
    for ep in sorted(files):
        f=files[ep]; base=f'S01E{ep:02d}'
        print('\nEp',ep)
        vid=TMP/f'{base}-vid.mp4'; vo=TMP/f'{base}-vostfr.mp4'; vf=TMP/f'{base}-vf.mp4'; vtt=TMP/f'{base}-fr.vtt'
        if not vid.exists():
            ff(['-i',str(f),'-map','0:v:0','-an','-c:v','h264_nvenc','-preset','p5','-cq','23','-pix_fmt','yuv420p','-movflags','+faststart',str(vid)])
        if not vf.exists():
            ff(['-i',str(vid),'-i',str(f),'-map','0:v:0','-map','1:a:m:language:fre','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(vf)])
        if not vo.exists():
            ff(['-i',str(vid),'-i',str(f),'-map','0:v:0','-map','1:a:m:language:jpn','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(vo)])
        has_sub=False
        if not vtt.exists():
            for smap in ('0:s:1','0:s:m:language:fre','0:s:0'):
                try: ff(['-i',str(f),'-map',smap,'-c:s','webvtt',str(vtt)]); has_sub=vtt.exists(); break
                except subprocess.CalledProcessError: continue
        else: has_sub=True
        url_vf=upload(vf,f'anime/kaiju/{base}-vf.mp4'); url_vo=upload(vo,f'anime/kaiju/{base}-vostfr.mp4')
        e={'episode':ep,'title':f'Episode {ep}','episodeLabel':base,'src':url_vf,
           'season':'S01','arc':'Saison 1','preferredAudioLang':'fr','progressKey':base,'badge':'MULTI',
           'audio':[{'label':'VF','srclang':'fr','default':True},
                    {'label':'VOSTFR','srclang':'ja','mediaSrc':url_vo}]}
        if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'anime/kaiju/{base}-fr.vtt')}]
        entries.append(e)
        entries.sort(key=lambda d:d.get('episode') or 0)
        JSON.write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
        for t in (vid,vf,vo):
            try: t.unlink()
            except OSError: pass
        print('  ok ep',ep)
    print('\nTermine Kaiju No 8.')

if __name__=='__main__': main()
