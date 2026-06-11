# -*- coding: utf-8 -*-
"""
Fix sous-titres Fire Force S03 : le rip MULTI a 2 pistes ASS fre ("FR Forced" puis
"FR Full") et l'upload initial a extrait la Forced (panneaux only). On re-extrait
la piste Full et on ecrase les VTT sur R2 (memes cles, JSON inchange).
"""
import sys, json, re, subprocess
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

SRC=Path(r'F:\Brams-Score-By-Freydiss-new\public\anime\Fire.Force.S03.MULTi.1080p.WEBRiP.x265-T3KASHi')
TMP=Path(r'F:\fireforce_tmp')
EP=re.compile(r'S03E(\d{2})',re.I)

def full_sub_index(mkv):
    out=subprocess.run(['ffprobe','-v','error','-select_streams','s',
        '-show_entries','stream=index:stream_tags=language,title','-of','json',str(mkv)],
        capture_output=True,text=True,check=True).stdout
    streams=json.loads(out)['streams']
    fre=[s for s in streams if s.get('tags',{}).get('language','').startswith('fr')]
    for s in fre:
        if 'full' in s.get('tags',{}).get('title','').lower(): return s['index']
    # pas de piste "Full" identifiable -> derniere piste fre (la Forced est en premier)
    return fre[-1]['index'] if fre else None

def main():
    for f in sorted(SRC.glob('*.mkv')):
        m=EP.search(f.name)
        if not m: continue
        ep=int(m.group(1)); base=f'S03E{ep:02d}'
        idx=full_sub_index(f)
        if idx is None: print(base,'!! aucune piste fre'); continue
        vtt=TMP/f'{base}-fr.vtt'
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',
            '-i',str(f),'-map',f'0:{idx}','-c:s','webvtt',str(vtt)],check=True)
        n=sum(1 for l in vtt.read_text(encoding='utf-8').splitlines() if '-->' in l)
        key=f'anime/fireforce/{base}-fr.vtt'
        s3.upload_file(str(vtt),BUCKET,key,ExtraArgs={'ContentType':'text/vtt; charset=utf-8'})
        print(f'{base}: piste 0:{idx}, {n} cues -> {key}')
    print('Termine.')

if __name__=='__main__': main()
