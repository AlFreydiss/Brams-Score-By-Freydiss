# -*- coding: utf-8 -*-
# Keyarts hub : Kaguya (rouge P5), Reze (film CSM), Violet Evergarden -> R2
import boto3, os
from botocore.config import Config
from pathlib import Path
from PIL import Image

env = {}
for line in Path(r'C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss\.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
s3 = boto3.client('s3', endpoint_url='https://166b8357e5229b31a88cf104058ed5ee.r2.cloudflarestorage.com',
                  aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
                  config=Config(signature_version='s3v4'), region_name='auto')

FILES = {
    r'C:\Users\Feydi\Desktop\kaguya sama love is war.jpeg': 'kaguya',
    r'C:\Users\Feydi\Downloads\reze csm movie arc.jpg': 'reze',
    r'C:\Users\Feydi\Downloads\violet-evergarden--19956.jpg': 'violet-evergarden',
}
for path, slug in FILES.items():
    img = Image.open(path)
    key = f'anime/keyart/{slug}.jpg'
    s3.upload_file(path, 'bramscore', key, ExtraArgs={'ContentType': 'image/jpeg', 'CacheControl': 'public, max-age=86400'})
    print(f'OK {key} ({img.width}x{img.height}, {os.path.getsize(path)//1024} Ko)')
