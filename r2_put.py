# -*- coding: utf-8 -*-
"""Upload de fichiers vers R2. Usage : py r2_put.py <local> <key> [<local> <key> ...]"""
import sys
from pathlib import Path
import boto3
from botocore.config import Config

ACCOUNT_ID='166b8357e5229b31a88cf104058ed5ee'; BUCKET='bramscore'
PUBLIC='https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
env={}
for line in (Path(__file__).parent/'.env.upload').read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1); env[k.strip()]=v.strip()
s3=boto3.client('s3',endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'],aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'),region_name='auto')
CT={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}
args=sys.argv[1:]
for i in range(0,len(args),2):
    local,key=args[i],args[i+1]
    ct=CT.get(Path(local).suffix.lower(),'application/octet-stream')
    s3.upload_file(local,BUCKET,key,ExtraArgs={'ContentType':ct,'CacheControl':'public, max-age=86400'})
    print('OK',f'{PUBLIC}/{key}')
