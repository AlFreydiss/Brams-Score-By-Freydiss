# -*- coding: utf-8 -*-
"""
Hunter x Hunter (2011) — 148 ep VOSTFR -> R2 anime/hxh/ + écrit hxh-videos.json incrémentalement.
Source GundamGuy BDrip MULTI : vidéo HEVC -> h264 NVENC (décodage hw), audio FLAC jpn -> aac 192k,
sous-titres ASS "Bluray Fr (VO)" -> vtt, 1 miniature/ep. La VF (piste fre) pourra venir plus tard en HLS.
Saisons = arcs canon (Examen 1-21, Zoldyck 22-26, Tour Céleste 27-36, Yorknew 37-58,
Greed Island 59-75, Fourmis-Chimères 76-136, Élection 137-148).
Resumable (head_object + temp local supprimé après upload). Lancer : py upload_hxh.py
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
ROOT=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Hunter x Hunter (2011) MULTI BDrip 1080p FLAC x265-GundamGuy\Série')
JSON_OUT=Path(r'F:\brams-web-clone\src\data\hxh-videos.json')
KEY_PREFIX='anime/hxh'

# (premier ep, dernier ep, code saison, arc)
ARCS=[
    (1,21,'S01','Arc de l’Examen de Hunter'),
    (22,26,'S02','Arc de la Famille Zoldyck'),
    (27,36,'S03','Arc de la Tour Céleste'),
    (37,58,'S04','Arc de Yorknew City'),
    (59,75,'S05','Arc de Greed Island'),
    (76,136,'S06','Arc des Fourmis-Chimères'),
    (137,148,'S07','Arc de l’Élection du Président'),
]
def arc_of(n):
    for a,b,season,arc in ARCS:
        if a<=n<=b: return season,arc
    return 'S07',ARCS[-1][3]

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

NUM=re.compile(r'\) - (\d{3}) ')

def sub_map_vo(mkv):
    # 2 pistes fre : "Sous-Titres Bluray Fr (VO)" = sous-titres complets pour la VO.
    out=subprocess.run(['ffprobe','-v','error','-select_streams','s',
        '-show_entries','stream=index:stream_tags=language,title','-of','json',str(mkv)],
        capture_output=True,text=True,check=True).stdout
    streams=json.loads(out).get('streams',[])
    fre=[s for s in streams if s.get('tags',{}).get('language','').startswith('fr')] or streams
    if not fre: return None
    for s in fre:
        if '(vo)' in s.get('tags',{}).get('title','').lower(): return f"0:{s['index']}"
    return f"0:{fre[0]['index']}"

def encode(src,out):
    # GPU MAX QUALITE : NVENC H264 (RTX 5070 Blackwell) preset p7 + multipass + spatial/temporal AQ.
    # cq19 VBR sans plafond bitrate + AQ fort tue le banding du vieux cq23 Main. ~6x temps reel
    # (vs x264 slow ~0.5x), donc ~9h pour 148 ep au lieu de ~3j. Decodage HEVC 10bit sur GPU (cuda),
    # sortie 8bit yuv420p web-safe.
    for dec in (['-hwaccel','cuda'],[]):
        try:
            ff([*dec,'-i',str(src),'-map','0:v:0','-map','0:a:m:language:jpn',
                '-c:v','h264_nvenc','-preset','p7','-tune','hq','-rc','vbr','-cq','19','-b:v','0',
                '-multipass','fullres','-spatial_aq','1','-temporal_aq','1','-aq-strength','8',
                '-bf','3','-b_ref_mode','middle','-rc-lookahead','32','-profile:v','high',
                '-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-movflags','+faststart',str(out)])
            return True
        except subprocess.CalledProcessError:
            if out.exists(): out.unlink()
            continue
    return False

def process(f,num):
    season,arc=arc_of(num); base=f'E{num:03d}'
    vo=TMP/f'{base}-vostfr.mp4'; vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
    if not vo.exists():
        if not encode(f,vo): print('  !! encode echoue',base,flush=True); return None
    has_sub=vtt.exists()
    if not has_sub:
        smap=sub_map_vo(f)
        if smap:
            try: ff(['-i',str(f),'-map',smap,'-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
            except subprocess.CalledProcessError: pass
    if not thumb.exists():
        try: ff(['-ss','00:05:00','-i',str(vo),'-frames:v','1','-q:v','3','-vf','scale=640:-1',str(thumb)])
        except subprocess.CalledProcessError: pass
    url=upload(vo,f'{KEY_PREFIX}/{base}-vostfr.mp4')
    e={'episode':num,'title':f'Épisode {num}','episodeLabel':base,'src':url,
       'season':season,'arc':arc,'preferredAudioLang':'ja','progressKey':f'hxh-{base}','badge':'VOSTFR',
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
    files={}
    for f in sorted(ROOT.glob('*.mkv')):
        m=NUM.search(f.name)
        if m: files[int(m.group(1))]=f
    print(f'=== Hunter x Hunter : {len(files)} fichiers ===',flush=True)
    for num in sorted(files):
        # Entrée déjà dans le json = épisode encodé ET uploadé (l'entrée n'est
        # écrite qu'après l'upload) → on saute sans ré-encoder (reprise rapide).
        prev=by_key.get(f'hxh-E{num:03d}')
        if prev and prev.get('hq'):
            print(f'[E{num:03d}] hq deja — skip',flush=True); continue
        print(f'[E{num:03d}] {files[num].name[:70]}',flush=True)
        e=process(files[num],num)
        if not e: continue
        # Un re-run ne doit pas écraser un titre Jikan/personnalisé déjà appliqué.
        old=by_key.get(e['progressKey'])
        if old and old.get('title') and not re.match(r'^épisode \d+$',old['title'].strip(),re.I):
            e['title']=old['title']
        by_key[e['progressKey']]=e
        out=sorted(by_key.values(),key=lambda d:d.get('episode') or 0)
        JSON_OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
        print('  ok',f'E{num:03d}',flush=True)
    print('\nTermine Hunter x Hunter.',flush=True)

if __name__=='__main__': main()
