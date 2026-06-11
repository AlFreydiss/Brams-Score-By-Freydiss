# -*- coding: utf-8 -*-
"""Somme la taille des objets R2 par prefixe top-level -> estimation data uploadee."""
import sys
from pathlib import Path
import boto3
from botocore.config import Config

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

totals={}
count={}
paginator=s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=BUCKET):
    for o in page.get('Contents',[]):
        parts=o['Key'].split('/')
        top='/'.join(parts[:2]) if parts[0]=='anime' else parts[0]
        totals[top]=totals.get(top,0)+o['Size']
        count[top]=count.get(top,0)+1
grand=0
for k in sorted(totals,key=lambda x:-totals[x]):
    gb=totals[k]/1024**3; grand+=totals[k]
    print(f'{k:35s} {gb:8.1f} GB  ({count[k]} objets)')
print(f'\nTOTAL bucket: {grand/1024**3:.1f} GB')
