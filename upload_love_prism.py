# -*- coding: utf-8 -*-
"""
Love Through A Prism — ajoute les épisodes MANQUANTS (E07-E20) à love-prism-videos.json.
Source MULTi AV1 + E-AC-3 (illisible navigateur) :
  - transcode vidéo AV1 -> H264 NVENC UNE fois (sans audio)
  - extrait + ré-encode audio jpn et fre en AAC
  - muxe vidéo + jpn (VOSTFR) et vidéo + fre (VF)  -> 2 MP4 (variantes mediaSrc)
  - sous-titres FR (1er flux fre) -> vtt ; miniature à 5:00
Reprise : fichier déjà sur R2 (taille) = sauté. Temp sur F:.
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
TMP=Path(r'F:\love_prism_tmp'); TMP.mkdir(parents=True,exist_ok=True)
SRC=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Love Through A Prism S01 MULTi 1080p WEB AV1 E-AC-3 -Tsundere-Raws (NF)')
JSON=Path(r'F:\brams-web-clone\src\data\love-prism-videos.json')

def ff(a): subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*a],check=True)
def ct(p): return {'.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.jpg':'image/jpeg','.m4a':'audio/mp4'}.get(p.suffix.lower(),'application/octet-stream')
def already(k,s):
    try: return s3.head_object(Bucket=BUCKET,Key=k)['ContentLength']==s
    except ClientError: return False
def upload(local,key):
    sz=local.stat().st_size
    if already(key,sz): print(f'    deja {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'    up {key} ({sz/1024/1024:.0f} MB)')
    s3.upload_file(str(local),BUCKET,key,ExtraArgs={'ContentType':ct(local)},Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

EP_RE=re.compile(r'S01E(\d{2})',re.I)

def main():
    data=json.loads(JSON.read_text(encoding='utf-8'))
    have={d.get('episode') for d in data}
    files={}
    for f in sorted(SRC.rglob('*.mkv')):
        m=EP_RE.search(f.name)
        if m: files[int(m.group(1))]=f
    todo=[ep for ep in sorted(files) if ep not in have]
    print(f'Love Prism : {len(have)} déjà sur le site, à ajouter : {todo}')
    for ep in todo:
        f=files[ep]; base=f'S01E{ep:03d}'
        print(f'\n🎞️  Épisode {ep}')
        vid=TMP/f'{base}-vid.mp4'; aja=TMP/f'{base}-ja.m4a'; afr=TMP/f'{base}-fr.m4a'
        vo=TMP/f'{base}-vostfr.mp4'; vf=TMP/f'{base}-vf.mp4'
        vtt=TMP/f'{base}-fr.vtt'; thumb=TMP/f'{base}.jpg'
        if not vid.exists():
            ff(['-i',str(f),'-map','0:v:0','-an','-c:v','h264_nvenc','-preset','p5','-cq','23','-pix_fmt','yuv420p','-movflags','+faststart',str(vid)])
        if not aja.exists():
            ff(['-i',str(f),'-map','0:a:m:language:jpn','-c:a','aac','-b:a','192k',str(aja)])
        if not afr.exists():
            ff(['-i',str(f),'-map','0:a:m:language:fre','-c:a','aac','-b:a','192k',str(afr)])
        if not vo.exists():
            ff(['-i',str(vid),'-i',str(aja),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(vo)])
        if not vf.exists():
            ff(['-i',str(vid),'-i',str(afr),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(vf)])
        has_sub=False
        if not vtt.exists():
            try: ff(['-i',str(f),'-map','0:s:m:language:fre','-c:s','webvtt',str(vtt)]); has_sub=vtt.exists()
            except subprocess.CalledProcessError: has_sub=False
        else: has_sub=True
        if not thumb.exists():
            try: ff(['-ss','300','-i',str(vo),'-frames:v','1','-q:v','3',str(thumb)])
            except subprocess.CalledProcessError: pass
        url_vo=upload(vo,f'anime/love-prism/{base}-vostfr.mp4')
        url_vf=upload(vf,f'anime/love-prism/{base}-vf.mp4')
        entry={'episode':ep,'title':f'Episode {ep}','episodeLabel':base,'src':url_vo,
            'season':'S01','arc':'Saison 1','preferredAudioLang':'ja','progressKey':base,'badge':'MULTI',
            'audio':[{'label':'Japonais','srclang':'ja','default':True,'mediaSrc':url_vo},
                     {'label':'VF','srclang':'fr','mediaSrc':url_vf}]}
        if has_sub:
            entry['subtitles']=[{'label':'Francais','srclang':'fr','src':upload(vtt,f'anime/love-prism/{base}-fr.vtt')}]
        if thumb.exists():
            entry['thumbnail']=upload(thumb,f'anime/love-prism/{base}.jpg')
        data.append(entry)
        data.sort(key=lambda d:(d.get('episode') or 0))
        JSON.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')  # écrit au fil de l'eau (résumable)
        for t in (vid,aja,afr,vo,vf):
            try: t.unlink()
            except OSError: pass
        print(f'  ✅ ép {ep} ajouté')
    print(f'\n🎉 Love Prism complété ({len(data)} épisodes).')

if __name__=='__main__': main()
