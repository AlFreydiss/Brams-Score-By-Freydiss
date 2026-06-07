# -*- coding: utf-8 -*-
"""
Upload des fonds de rang generes (Flux) vers R2 -> bramscore/ranks/<rang>.png
Sert de fond de profil premium selon le rang du membre sur le site.
Lancer : py upload_ranks.py
"""
import sys
from pathlib import Path
import boto3
from botocore.config import Config

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
BUCKET = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

env = {}
for line in (Path(__file__).parent / '.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

s3 = boto3.client(
    's3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'), region_name='auto',
)

SRC = Path(__file__).parent / 'flux_output'
FILES = [
    'pirate_bg.png', 'shichibukai_bg.png', 'amiral_bg.png',
    'yonkou_bg.png', 'roi_des_pirates_bg.png',
]

for fn in FILES:
    p = SRC / fn
    if not p.exists():
        print(f'SKIP (absent): {fn}')
        continue
    key = f'ranks/{fn}'
    s3.upload_file(str(p), BUCKET, key, ExtraArgs={'ContentType': 'image/png'})
    print(f'OK -> {PUBLIC_URL}/{key}  ({p.stat().st_size // 1024} Ko)')

print('\nTermine.')
