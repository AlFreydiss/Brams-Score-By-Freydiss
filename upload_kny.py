# -*- coding: utf-8 -*-
"""
Kimetsu no Yaiba — 62 ep TV VOSTFR (S1 26 + Mugen Ressha 7 + Yuukaku 11 + Katanakaji 11 + Hashira Geiko 7)
-> R2 anime/kny/ + merge dans kny-videos.json (le film Mugen Train déjà en ligne est conservé, replacé ep 27).
Source Mo7tas BD 1080p : vidéo AV1 -> h264 NVENC (décodage hw av1_cuvid), audio AAC jpn copy,
sous-titres ASS fre -> vtt, 1 miniature/ep. ONA/Special écartés (pas de piste FR).
Resumable (head_object + temp local supprimé après upload). Lancer : py upload_kny.py
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
TMP=Path(r'F:\kny_tmp'); TMP.mkdir(parents=True,exist_ok=True)
ROOT=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Kimetsu no Yaiba')
JSON_OUT=Path(r'F:\brams-web-clone\src\data\kny-videos.json')
KEY_PREFIX='anime/kny'

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

# (dossier, code saison affiché, arc, offset episode global)
SETS=[
    ('(2019) Kimetsu no Yaiba','S01','Saison 1',0),
    ('(2021) Kimetsu no Yaiba∶ Mugen Ressha-hen','S02','Arc du Train de l’Infini',27),
    ('(2021) Kimetsu no Yaiba∶ Yuukaku-hen','S03','Arc du Quartier des Plaisirs',34),
    ('(2023) Kimetsu no Yaiba∶ Katanakaji no Sato-hen','S04','Arc du Village des Forgerons',45),
    ('(2024) Kimetsu no Yaiba∶ Hashira Geiko-hen','S05','Arc de l’Entraînement des Piliers',56),
]

def encode(src,out):
    # MAX QUALITE : AV1 -> x264 slow crf16 tune animation (profil High). Audio AAC jpn copie (lossless).
    # Décodage matériel av1_cuvid (RTX 5070), repli décodage CPU dav1d.
    for dec in (['-hwaccel','cuda','-c:v','av1_cuvid'],[]):
        try:
            ff([*dec,'-i',str(src),'-map','0:v:0','-map','0:a:m:language:jpn','-c:v','libx264','-preset','slow','-crf','16',
                '-tune','animation','-profile:v','high','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(out)])
            return True
        except subprocess.CalledProcessError:
            if out.exists(): out.unlink()
            continue
    return False

def process(f,base,season,arc,num):
    vo=TMP/f'{base}-vostfr.mp4'; vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
    if not vo.exists():
        if not encode(f,vo): print('  !! encode echoue',base,flush=True); return None
    has_sub=vtt.exists()
    if not has_sub:
        try: ff(['-i',str(f),'-map','0:s:m:language:fre','-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
        except subprocess.CalledProcessError: pass
    if not thumb.exists():
        try: ff(['-ss','00:05:00','-i',str(vo),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
        except subprocess.CalledProcessError: pass
    url=upload(vo,f'{KEY_PREFIX}/{base}-vostfr.mp4')
    e={'episode':num,'title':f'Épisode {int(base[4:])}','episodeLabel':base,'src':url,
       'season':season,'arc':arc,'preferredAudioLang':'ja','progressKey':f'kny-{base}','badge':'VOSTFR',
       'audio':[{'label':'VOSTFR','srclang':'ja','default':True}],'hq':True}
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
    # Le film Mugen Train (déjà en ligne) prend l'ep 27, chronologiquement après la S1.
    if 'kny-movie-mugen' in by_key: by_key['kny-movie-mugen']['episode']=27
    for folder,season,arc,offset in SETS:
        src=ROOT/folder
        files={}
        for f in sorted(src.glob('*.mkv')):
            m=EP.search(f.name)
            if m: files[int(m.group(2))]=f
        print(f'\n=== {season} ({arc}) : {len(files)} fichiers ===',flush=True)
        for ep in sorted(files):
            num=offset+ep  # offsets incluent déjà le film inséré en 27
            base=f'{season}E{ep:02d}'
            # Entrée déjà dans le json = épisode encodé ET uploadé (l'entrée n'est
            # écrite qu'après l'upload) → on saute sans ré-encoder (reprise rapide).
            if by_key.get(f'kny-{base}',{}).get('hq'):
                print(f'[{base}] hq deja — skip',flush=True); continue
            print(f'[{base}] {files[ep].name[:70]}',flush=True)
            e=process(files[ep],base,season,arc,num)
            if not e: continue
            # Un re-run ne doit pas écraser un titre Jikan/personnalisé déjà appliqué.
            old=by_key.get(e['progressKey'])
            if old and old.get('title') and not re.match(r'^épisode \d+$',old['title'].strip(),re.I):
                e['title']=old['title']
            by_key[e['progressKey']]=e
            out=sorted(by_key.values(),key=lambda d:d.get('episode') or 0)
            JSON_OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
            print('  ok',base,flush=True)
    print('\nTermine Kimetsu no Yaiba.',flush=True)

if __name__=='__main__': main()
