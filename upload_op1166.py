# -*- coding: utf-8 -*-
"""
One Piece episode 1166 (VOSTFR) -> R2 (schema op-egghead).
Source Kaerizaki .mp4 deja H264 1080p + audio AAC jpn + sous-titres incrustes (hardsub).
Pas de transcode (remux -c copy = qualite source preservee), miniature generee, upload R2.
Lancer : py upload_op1166.py
"""
import sys, subprocess
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'; BUCKET = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
EP = 1166

env = {}
for line in (Path(__file__).parent / '.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1); env[k.strip()] = v.strip()

s3 = boto3.client('s3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'), region_name='auto')
TRANSFER = boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024, multipart_chunksize=50*1024*1024, max_concurrency=4)
TMP = Path(r'F:\op1166_tmp'); TMP.mkdir(parents=True, exist_ok=True)

def ff(args): subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)
def ct(p): return {'.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg'}.get(p.suffix.lower(), 'application/octet-stream')
def already(k, s):
    try: return s3.head_object(Bucket=BUCKET, Key=k)['ContentLength'] == s
    except ClientError: return False
def upload(local, key):
    sz = local.stat().st_size
    if already(key, sz): print(f'  deja sur R2 {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'  upload {key} ({sz/1024/1024:.0f} MB)')
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct(local)}, Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

def main():
    root = Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')
    src = next(f for f in root.glob('*.mp4') if 'One_Piece_1166' in f.name or '_1166_' in f.name)
    print('Source:', src.name)

    mp4 = TMP / f'E{EP}.mp4'
    jpg = TMP / f'E{EP}.jpg'

    # 1) Remux video+audio sans reencode (source deja H264/AAC), faststart pour lecture progressive
    if not mp4.exists():
        print('Remux (-c copy, pas de transcode)...')
        ff(['-i', str(src), '-map', '0:v:0', '-map', '0:a:0',
            '-c', 'copy', '-dn', '-sn', '-movflags', '+faststart', str(mp4)])

    # 2) Miniature (frame a 7 min, evite l'intro)
    if not jpg.exists():
        print('Miniature...')
        try: ff(['-ss', '420', '-i', str(mp4), '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '3', str(jpg)])
        except subprocess.CalledProcessError: print('  (miniature echouee)')

    print('Upload R2...')
    upload(mp4, f'anime/op-egghead/E{EP}.mp4')
    if jpg.exists(): upload(jpg, f'anime/op-egghead-thumbnails/E{EP}.jpg')

    print(f'\nOK -> episode {EP} sur R2 (subs incrustes). Ajoute {EP} a EPISODES dans onepiece-videos.js.')

if __name__ == '__main__':
    main()
