# -*- coding: utf-8 -*-
"""Vraies miniatures d'épisodes : extrait 1 frame (à 3 min) de chaque mp4/HLS R2
via ffmpeg en lecture HTTP (pas de téléchargement complet), upload R2
anime/<slug>/thumbnails/<base>.jpg, patche le JSON. Ne traite QUE les entrées
dont la miniature actuelle est un poster local (pas https).  py gen_ep_thumbs.py
"""
import json, re, subprocess, tempfile, time
from pathlib import Path
import boto3
from botocore.config import Config

DATA = Path(r'F:\brams-web-test\src\data')
SLUGS = ['aot', 'domestic-na-kanojo', 'jjk', 'koi-ameagari']
PUBLIC = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

env = {}
for line in Path(r'C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss\.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
s3 = boto3.client('s3', endpoint_url='https://166b8357e5229b31a88cf104058ed5ee.r2.cloudflarestorage.com',
                  aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
                  config=Config(signature_version='s3v4'), region_name='auto')

def thumb_key(slug, src):
    base = re.sub(r'[^A-Za-z0-9_-]', '_', Path(src.split('?')[0]).stem)
    return f'anime/{slug}/thumbnails/{base}.jpg'

def main():
    tmp = Path(tempfile.mkdtemp(prefix='epthumbs_'))
    for slug in SLUGS:
        path = DATA / f'{slug}-videos.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        patched = 0
        for e in data:
            th = str(e.get('thumbnail') or '')
            src = e.get('src') or ''
            if th.startswith('https') or not src.startswith('https'):
                continue
            key = thumb_key(slug, src)
            out = tmp / (key.replace('/', '_'))
            try:
                # -ss avant -i = seek HTTP par ranges (mp4 faststart) ; marche aussi sur master.m3u8
                subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                                '-ss', '00:03:00', '-i', src, '-frames:v', '1',
                                '-q:v', '3', '-vf', 'scale=640:-2', str(out)],
                               check=True, timeout=120)
                s3.upload_file(str(out), 'bramscore', key,
                               ExtraArgs={'ContentType': 'image/jpeg', 'CacheControl': 'public, max-age=604800'})
                e['thumbnail'] = f'{PUBLIC}/{key}'
                patched += 1
                print(f'  ok {key}', flush=True)
            except Exception as ex:
                print(f'  ECHEC {key}: {ex}', flush=True)
        if patched:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{slug}: {patched} miniatures generees', flush=True)

if __name__ == '__main__':
    main()
