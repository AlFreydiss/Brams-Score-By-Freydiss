# -*- coding: utf-8 -*-
"""
Liste (ou supprime) tous les objets R2 sous un prefixe.
  py r2_delete_prefix.py anime/bleach           -> LISTE seulement (dry-run)
  py r2_delete_prefix.py anime/bleach DELETE     -> SUPPRIME (irreversible)
"""
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

prefix=sys.argv[1] if len(sys.argv)>1 else ''
do_delete=len(sys.argv)>2 and sys.argv[2]=='DELETE'
if not prefix:
    print('usage: py r2_delete_prefix.py <prefix> [DELETE]'); sys.exit(1)

keys=[]; total=0
paginator=s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=BUCKET,Prefix=prefix):
    for obj in page.get('Contents',[]):
        keys.append(obj['Key']); total+=obj['Size']
print(f'Prefixe "{prefix}" : {len(keys)} objets, {total/1024/1024/1024:.2f} GB')
# apercu par type
from collections import Counter
ext=Counter(k.rsplit('.',1)[-1] if '.' in k else '(none)' for k in keys)
print('  types :',dict(ext))
if keys[:3]: print('  ex :',*keys[:3],sep='\n    ')

if not do_delete:
    print('\n[DRY-RUN] rien supprime. Relancer avec DELETE pour supprimer.')
    sys.exit(0)

print(f'\nSuppression de {len(keys)} objets...')
deleted=0
for i in range(0,len(keys),1000):
    batch=[{'Key':k} for k in keys[i:i+1000]]
    s3.delete_objects(Bucket=BUCKET,Delete={'Objects':batch,'Quiet':True})
    deleted+=len(batch); print(f'  supprime {deleted}/{len(keys)}',flush=True)
print('Termine. Supprime',deleted,'objets.')
