# -*- coding: utf-8 -*-
"""
Jujutsu Kaisen Saison 3 (12 ép, MULTi x265) -> R2 + ajoute à jjk-videos.json.
Transcode HEVC->H264 NVENC (vidéo une fois) + pistes VF (fre) et VOSTFR (jpn) en AAC,
muxées en 2 MP4 (variantes mediaSrc) + sous-titres FR complets. season='S03'.
Resumable. Lancer : py upload_jjk_s3.py
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
TMP=Path(r'F:\jjk_s3_tmp'); TMP.mkdir(parents=True,exist_ok=True)
SRC=Path(r'F:\Brams-Score-By-Freydiss\brams-website\public\anime\Jujutsu.Kaisen.S03.MULTi.1080p.WEBRiP.x265-KAF')
JSON=Path(r'F:\brams-web-clone\src\data\jjk-videos.json')

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

EP=re.compile(r'S03E(\d{2})',re.I)

def main():
    files={}
    for f in sorted(SRC.rglob('*.mkv')):
        m=EP.search(f.name)
        if m: files[int(m.group(1))]=f
    print('JJK S03 :',len(files),'épisodes')
    data=json.loads(JSON.read_text(encoding='utf-8'))
    data=[d for d in data if d.get('season')!='S03']  # rejoue proprement
    for ep in sorted(files):
        f=files[ep]; base=f'S03E{ep:02d}'
        print('\nÉp',ep)
        vid=TMP/f'{base}-vid.mp4'; aja=TMP/f'{base}-ja.m4a'; afr=TMP/f'{base}-fr.m4a'
        vo=TMP/f'{base}-vostfr.mp4'; vf=TMP/f'{base}-vf.mp4'; vtt=TMP/f'{base}-fr.vtt'
        if not vid.exists():
            ff(['-i',str(f),'-map','0:v:0','-an','-c:v','h264_nvenc','-preset','p5','-cq','23','-pix_fmt','yuv420p','-movflags','+faststart',str(vid)])
        if not aja.exists(): ff(['-i',str(f),'-map','0:a:m:language:jpn','-c:a','aac','-b:a','192k',str(aja)])
        if not afr.exists(): ff(['-i',str(f),'-map','0:a:m:language:fre','-c:a','aac','-b:a','192k',str(afr)])
        if not vo.exists(): ff(['-i',str(vid),'-i',str(aja),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(vo)])
        if not vf.exists(): ff(['-i',str(vid),'-i',str(afr),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(vf)])
        has_sub=False
        if not vtt.exists():
            for smap in ('0:s:m:language:fre','0:s:0'):
                try: ff(['-i',str(f),'-map',smap,'-c:s','webvtt',str(vtt)]); has_sub=vtt.exists(); break
                except subprocess.CalledProcessError: continue
        else: has_sub=True
        url_vo=upload(vo,f'anime/jjk/{base}-vostfr.mp4'); url_vf=upload(vf,f'anime/jjk/{base}-vf.mp4')
        e={'episode':ep,'title':f'S03 - Episode {ep}','episodeLabel':base,'src':url_vo,
           'season':'S03','arc':'Saison 3','preferredAudioLang':'ja','progressKey':base,'badge':'MULTI',
           'audio':[{'label':'Japonais','srclang':'ja','default':True,'mediaSrc':url_vo},
                    {'label':'VF','srclang':'fr','mediaSrc':url_vf}]}
        if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'anime/jjk/{base}-fr.vtt')}]
        data.append(e)
        data.sort(key=lambda d:(str(d.get('season')), d.get('episode') or 0))
        JSON.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
        for t in (vid,aja,afr,vo,vf):
            try: t.unlink()
            except OSError: pass
        print('  ok ép',ep)
    print('\nTerminé JJK S03.')

if __name__=='__main__': main()
