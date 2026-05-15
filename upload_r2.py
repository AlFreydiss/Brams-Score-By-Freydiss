import sys, json, re
from pathlib import Path
import boto3
from botocore.config import Config

sys.stdout.reconfigure(encoding='utf-8')

# ── Config R2 ─────────────────────────────────────────────────────────────────
ACCOUNT_ID  = '166b8357e5229b31a88cf104058ed5ee'
ACCESS_KEY  = '4f39550055d95fe0f9999e5011c91d68'
SECRET_KEY  = 'dc832c19090b450439e85e03290339127957047fc61c447a179e5e2def52ba93'
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

BASE  = Path(r'F:\Brams-Score-By-Freydiss\brams-website\public\anime')
DATA  = Path(r'F:\Brams-Score-By-Freydiss\brams-website\src\data')

def upload(local: Path, key: str, ct: str):
    size_mb = local.stat().st_size / 1024 / 1024
    print(f'  ⬆️  {local.name} ({size_mb:.0f} MB)  →  {key}')
    cfg = boto3.s3.transfer.TransferConfig(
        multipart_threshold=10 * 1024 * 1024,   # 10 MB
        multipart_chunksize=50 * 1024 * 1024,   # 50 MB par chunk
        max_concurrency=4,
    )
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct}, Config=cfg)
    return f'{PUBLIC_URL}/{key}'

def content_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == '.mkv': return 'video/x-matroska'
    if ext == '.mp4': return 'video/mp4'
    if ext in ('.jpg', '.jpeg'): return 'image/jpeg'
    if ext == '.png': return 'image/png'
    if ext == '.webp': return 'image/webp'
    return 'application/octet-stream'

# ══════════════════════════════════════════════════════════════════════════════
# TPN — 12 épisodes
# ══════════════════════════════════════════════════════════════════════════════
print('\n📺 Upload TPN...')

TPN_DIR  = BASE / 'Yakusoku no Neverland - MULTi BD 1080p x264 AAC -Fuceo'
TPN_JSON = DATA / 'tpn-videos.json'

tpn_files = sorted(TPN_DIR.glob('*.mkv'), key=lambda f: f.name)
tpn_videos = json.loads(TPN_JSON.read_text(encoding='utf-8'))

ep_num = re.compile(r'- (\d+) ')
for f in tpn_files:
    m = ep_num.search(f.name)
    if not m:
        print(f'  ⚠️  Skipped (pas de numéro): {f.name}')
        continue
    ep = int(m.group(1))
    key = f'anime/tpn/Ep{ep:02d}.mkv'
    url = upload(f, key, content_type(f))
    for v in tpn_videos:
        if v['episode'] == ep:
            v['src'] = url
            break

# Thumbnails TPN
for f in sorted(TPN_DIR.glob('*-thumb.png'), key=lambda f: f.name):
    m = ep_num.search(f.name)
    if not m:
        continue
    ep = int(m.group(1))
    key = f'anime/tpn/Ep{ep:02d}-thumb.png'
    url = upload(f, key, content_type(f))
    for v in tpn_videos:
        if v['episode'] == ep:
            v['thumbnail'] = url
            break

TPN_JSON.write_text(json.dumps(tpn_videos, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'✅ TPN terminé — tpn-videos.json mis à jour')

# ══════════════════════════════════════════════════════════════════════════════
# Dr. Stone — saison 1 + 2
# ══════════════════════════════════════════════════════════════════════════════
print('\n🧪 Upload Dr. Stone...')

DRS_S1   = BASE / 'Dr.Stone' / 'Dr. Stone Henshu' / 'Saison 1'
DRS_S2   = BASE / 'Dr.Stone' / 'Dr. Stone Henshu' / 'Saison 2'
DRS_JSON = DATA / 'drstone-videos.json'

drs_videos = json.loads(DRS_JSON.read_text(encoding='utf-8'))

ep_num_drs = re.compile(r'- (\d+) -')

for season_dir in [DRS_S1, DRS_S2]:
    for f in sorted(season_dir.glob('*.mkv'), key=lambda f: f.name):
        m = ep_num_drs.search(f.name)
        if not m:
            print(f'  ⚠️  Skipped: {f.name}')
            continue
        ep = int(m.group(1))
        key = f'anime/drs/Ep{ep:02d}.mkv'
        url = upload(f, key, content_type(f))
        for v in drs_videos:
            if v['episode'] == ep:
                v['src'] = url
                break

    # Thumbnails
    for f in sorted(season_dir.glob('*-thumb.png'), key=lambda f: f.name):
        m = ep_num_drs.search(f.name)
        if not m:
            continue
        ep = int(m.group(1))
        key = f'anime/drs/Ep{ep:02d}-thumb.png'
        url = upload(f, key, content_type(f))
        for v in drs_videos:
            if v['episode'] == ep:
                v['thumbnail'] = url
                break

DRS_JSON.write_text(json.dumps(drs_videos, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'✅ Dr. Stone terminé — drstone-videos.json mis à jour')

print('\n🎉 Tout est uploadé sur R2 !')
