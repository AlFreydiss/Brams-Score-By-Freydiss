# -*- coding: utf-8 -*-
"""Vignettes JPG des fonds d'opening -> R2 bg-thumbs/<id>.jpg.
Extrait 1 frame (t=2s) de chaque videoUrl du catalogue boutique (ffmpeg lit le mp4
distant en range-requests, pas de download complet). Resumable (head_object).
Lancer : py gen_bg_thumbs.py"""
import re, subprocess, sys, tempfile
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID='166b8357e5229b31a88cf104058ed5ee'; BUCKET='bramscore'
env={}
for line in (Path(__file__).parent/'.env.upload').read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1); env[k.strip()]=v.strip()
s3=boto3.client('s3',endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'],aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'),region_name='auto')

WEB=Path(r'F:\brams-web-clone\src\data')
pairs={}
for f in ['openingBgGenerated.js','opening-backgrounds.js']:
    txt=(WEB/f).read_text(encoding='utf-8')
    # id puis videoUrl dans le même objet (ordre stable dans les 2 fichiers)
    for m in re.finditer(r'["\']?id["\']?\s*:\s*[\'"]([\w-]+)[\'"][\s\S]{0,600}?["\']?videoUrl["\']?\s*:\s*[\'"](https://[^\'"]+)[\'"]',txt):
        pairs.setdefault(m.group(1),m.group(2))
print(f'{len(pairs)} fonds avec videoUrl')

tmp=Path(tempfile.gettempdir())/'bg-thumb.jpg'
ok=skip=err=0
for i,(bid,url) in enumerate(sorted(pairs.items()),1):
    key=f'bg-thumbs/{bid}.jpg'
    try:
        s3.head_object(Bucket=BUCKET,Key=key); skip+=1; continue
    except ClientError: pass
    r=subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','2','-i',url,
        '-frames:v','1','-vf','scale=480:-2','-q:v','4',str(tmp)],capture_output=True,timeout=90)
    if r.returncode!=0 or not tmp.exists() or tmp.stat().st_size<1000:
        print(f'ERR {bid}'); err+=1; continue
    s3.upload_file(str(tmp),BUCKET,key,ExtraArgs={'ContentType':'image/jpeg'})
    ok+=1
    if ok%10==0: print(f'{i}/{len(pairs)} ok={ok}')
print(f'DONE ok={ok} skip={skip} err={err}')
