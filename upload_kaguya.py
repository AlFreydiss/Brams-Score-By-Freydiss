# -*- coding: utf-8 -*-
"""
Kaguya-sama: Love is War — intégrale VOSTFR (S1 12 + S2 12 + S3 13 + Film 4 parties + OVA)
-> R2 + génère kaguya-videos.json (dans F:\\brams-web-clone\\src\\data).
Source Tsundere-Raws WEB x264 AAC -> REMUX (pas de réencodage) : video copy, audio
copy si AAC sinon -> aac (OVA en FLAC), sous-titres ASS -> vtt, 1 miniature/ep.
Resumable (head_object + temp local). Lancer : py upload_kaguya.py
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
TMP=Path(r'F:\kaguya_tmp'); TMP.mkdir(parents=True,exist_ok=True)
ROOT=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\KAGUYA-SAMA LOVE IS WAR iNTEGRALE VOSTFR-VF 1080p WEB x264 AAC -Tsundere-Raws\VOSTFR')
JSON_OUT=Path(r'F:\brams-web-clone\src\data\kaguya-videos.json')
KEY_PREFIX='anime/kaguya'

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def probe_audio(p):
    r=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name',
                      '-of','default=noprint_wrappers=1:nokey=1',str(p)],capture_output=True,text=True)
    return (r.stdout or '').strip()
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

# (dossier, saison, arc, offset episode global, prefixe label)
SETS=[
    ('Saison 01 (Kaguya-sama wa Kokurasetai - Tensai-tachi no Renai Zunousen)','S01','Saison 1',0,'S01E'),
    ('Saison 02 (Kaguya-sama wa Kokurasetai - Tensai-tachi no Renai Zunousen Season 2)','S02','Saison 2',12,'S02E'),
    ('Saison 03 (Kaguya-sama wa Kokurasetai - Ultra Romantic)','S03','Saison 3 : Ultra Romantic',24,'S03E'),
    ('Film (Kaguya-sama wa Kokurasetai - First Kiss wa Owaranai)','Film','Film : First Kiss',37,'FILM-P'),
    ('Specials (Kaguya-sama wa Kokurasetai - Tensai-tachi no Renai Zunousen OVA)','OVA','OVA',41,'OVA'),
]

def process(f,base,season,arc,num,title):
    vo=TMP/f'{base}-vostfr.mp4'; vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
    if not vo.exists():
        acodec=probe_audio(f)
        a_args=['-c:a','copy'] if acodec=='aac' else ['-c:a','aac','-b:a','192k']
        ff(['-i',str(f),'-map','0:v:0','-map','0:a:0','-c:v','copy',*a_args,'-movflags','+faststart',str(vo)])
    has_sub=vtt.exists()
    if not has_sub:
        for smap in ('0:s:m:language:fre','0:s:m:language:fra','0:s:0'):
            try: ff(['-i',str(f),'-map',smap,'-c:s','webvtt',str(vtt)]); has_sub=vtt.exists(); break
            except subprocess.CalledProcessError: continue
    if not thumb.exists():
        try: ff(['-ss','00:03:00','-i',str(f),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
        except subprocess.CalledProcessError: pass
    url_vo=upload(vo,f'{KEY_PREFIX}/{base}-vostfr.mp4')
    e={'episode':num,'title':title,'episodeLabel':base,'src':url_vo,
       'season':season,'arc':arc,'preferredAudioLang':'ja','progressKey':f'kaguya-{base}','badge':'VOSTFR',
       'audio':[{'label':'VOSTFR','srclang':'ja','default':True}]}
    if thumb.exists(): e['thumbnail']=upload(thumb,f'{KEY_PREFIX}/thumbnails/{base}.jpg')
    if has_sub: e['subtitles']=[{'label':'Français','srclang':'fr','src':upload(vtt,f'{KEY_PREFIX}/{base}-fr.vtt'),'default':True}]
    try: vo.unlink()
    except OSError: pass
    return e

def main():
    entries=[]
    if JSON_OUT.exists():
        try: entries=json.loads(JSON_OUT.read_text(encoding='utf-8'))
        except Exception: entries=[]
    by_key={e['progressKey']:e for e in entries}
    for folder,season,arc,offset,label in SETS:
        src=ROOT/folder
        files={}
        for f in sorted(src.glob('*.mkv')):
            m=EP.search(f.name)
            if m: files[int(m.group(2))]=f
        print(f'\n=== {season} : {len(files)} fichiers ===',flush=True)
        for ep in sorted(files):
            num=offset+ep
            if season=='Film': base=f'FILM-P{ep}'; title=f'Film : First Kiss — Partie {ep}'
            elif season=='OVA': base='OVA01'; title='OVA'
            else: base=f'{season}E{ep:02d}'; title=f'Épisode {ep}'
            print(f'[{season} ep {ep}] {files[ep].name[:60]}',flush=True)
            e=process(files[ep],base,season,arc,num,title)
            by_key[e['progressKey']]=e
            out=sorted(by_key.values(),key=lambda d:d.get('episode') or 0)
            JSON_OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
            print('  ok',base,flush=True)
    print('\nTermine Kaguya-sama.',flush=True)

if __name__=='__main__': main()
