import sys, json, re
from pathlib import Path
import boto3
from botocore.config import Config

sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
# Clés R2 lues depuis .env.upload (gitignoré) — jamais en dur (repo public).
_envu = {}
for _l in (Path(__file__).parent / '.env.upload').read_text(encoding='utf-8').splitlines():
    _l = _l.strip()
    if _l and not _l.startswith('#') and '=' in _l:
        _k, _v = _l.split('=', 1); _envu[_k.strip()] = _v.strip()
ACCESS_KEY  = _envu['R2_ACCESS_KEY']
SECRET_KEY  = _envu['R2_SECRET_KEY']
BUCKET      = 'bramscore'
PUBLIC_URL  = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto',
)

DRS_S1   = Path(r'F:\Brams-Score-By-Freydiss\brams-website\public\anime\Dr.Stone\Dr. Stone Henshu\Saison 1')
DRS_JSON = Path(r'F:\brams-web-clone\src\data\drstone-videos.json')

drs_videos = json.loads(DRS_JSON.read_text(encoding='utf-8'))

def upload(local, key, ct):
    size_mb = local.stat().st_size / 1024 / 1024
    print(f'  ⬆️  {local.name} ({size_mb:.0f} MB)  →  {key}')
    cfg = boto3.s3.transfer.TransferConfig(
        multipart_threshold=10 * 1024 * 1024,
        multipart_chunksize=50 * 1024 * 1024,
        max_concurrency=4,
    )
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct}, Config=cfg)
    return f'{PUBLIC_URL}/{key}'

# Regex qui capture aussi le format "[Roro] Dr Stone Henshû 06 - ..."
ep_num = re.compile(r'(?:- (\d+) -|[uû] (\d+) -)')

print('🧪 Upload Dr. Stone Ep06-09 (Roro)...')
for f in sorted(DRS_S1.glob('[[]Roro]*.mkv'), key=lambda x: x.name):
    m = ep_num.search(f.name)
    if not m:
        print(f'  ⚠️  Skipped: {f.name}')
        continue
    ep = int(m.group(1) or m.group(2))
    key = f'anime/drs/Ep{ep:02d}.mkv'
    url = upload(f, key, 'video/x-matroska')
    for v in drs_videos:
        if v['episode'] == ep:
            v['src'] = url
            break

# Thumbnails Roro
for f in sorted(DRS_S1.glob('[[]Roro]*-thumb.png'), key=lambda x: x.name):
    m = ep_num.search(f.name)
    if not m:
        continue
    ep = int(m.group(1) or m.group(2))
    key = f'anime/drs/Ep{ep:02d}-thumb.png'
    url = upload(f, key, 'image/png')
    for v in drs_videos:
        if v['episode'] == ep:
            v['thumbnail'] = url
            break

DRS_JSON.write_text(json.dumps(drs_videos, ensure_ascii=False, indent=2), encoding='utf-8')
print('✅ drstone-videos.json mis à jour')
print('🎉 Ep06-09 uploadés !')
