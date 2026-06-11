# -*- coding: utf-8 -*-
"""
Nettoyage R2 2026-06-11 — doublons VO/VF et prefixes orphelins (zero ref site verifiee).
  wave1 : anime/dbs (mp4 remplaces par dbs-hls), dbs-audio-ja, kaiju-no-8 (videos),
          MKV sources Refrain dans violet-evergarden/, marqueur tpn/
  wave2 : violet-evergarden-vf/ + kaiju/*-vostfr.mp4 (APRES deploy du swap pistes audio)
Usage : py r2_cleanup_juin11.py wave1|wave2 [--dry]
"""
import sys
from pathlib import Path
import boto3
from botocore.config import Config

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID='166b8357e5229b31a88cf104058ed5ee'; BUCKET='bramscore'
env=dict(l.strip().split('=',1) for l in (Path(__file__).parent/'.env.upload').read_text(encoding='utf-8').splitlines() if '=' in l and not l.startswith('#'))
s3=boto3.client('s3',endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'],aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'),region_name='auto')

import re
def _dbs_done(k):
    # sources MKV seule copie restante (dossier F: efface) : on garde E122-131
    # tant que leur piste ja HLS n'est pas encodee, idem dbs-audio-ja (garde).
    m=re.search(r'S01E(\d+)',k)
    return bool(m) and int(m.group(1))<=121

WAVES={
 'wave1':{'prefixes':['anime/kaiju-no-8/'],
          'key_filters':[('anime/violet-evergarden/', lambda k: k.endswith('.mkv')),
                         ('anime/dbs/', _dbs_done),
                         ('tpn/', lambda k: k=='tpn/')]},
 'wave2':{'prefixes':['anime/violet-evergarden-vf/'],
          'key_filters':[('anime/kaiju/', lambda k: k.endswith('-vostfr.mp4'))]},
}

def collect(w):
    keys=[]
    pag=s3.get_paginator('list_objects_v2')
    for pfx in w['prefixes']:
        for page in pag.paginate(Bucket=BUCKET,Prefix=pfx):
            keys+=[(o['Key'],o['Size']) for o in page.get('Contents',[])]
    for pfx,f in w['key_filters']:
        for page in pag.paginate(Bucket=BUCKET,Prefix=pfx):
            keys+=[(o['Key'],o['Size']) for o in page.get('Contents',[]) if f(o['Key'])]
    return keys

def main():
    wave=sys.argv[1]; dry='--dry' in sys.argv
    keys=collect(WAVES[wave])
    total=sum(s for _,s in keys)
    print(f'{wave}: {len(keys)} objets, {total/1024**3:.1f} GB')
    if dry:
        for k,s in keys[:20]: print(' ',k,f'{s/1024**2:.0f}MB')
        if len(keys)>20: print(f'  ... +{len(keys)-20}')
        return
    for i in range(0,len(keys),1000):
        batch=[{'Key':k} for k,_ in keys[i:i+1000]]
        r=s3.delete_objects(Bucket=BUCKET,Delete={'Objects':batch,'Quiet':True})
        errs=r.get('Errors',[])
        if errs: print('ERREURS:',errs)
    print('supprime.')

if __name__=='__main__': main()
