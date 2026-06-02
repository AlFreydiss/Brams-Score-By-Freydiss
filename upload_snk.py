# -*- coding: utf-8 -*-
"""
Upload SNK / L'Attaque des Titans saisons 3 & 4 vers Cloudflare R2,
puis génère aot-videos.json directement dans le repo du site (brams-web-clone).

- S3 : 22 MKV multi-audio (VOSTFR + VF) — uploadés tels quels, le player détecte
       les pistes audio nativement (comme drstone/tpn déjà en .mkv sur R2).
- S4 : 15 MP4 VOSTFR (subs incrustés) — uploadés tels quels.

Reprise possible : un fichier déjà présent sur R2 (même clé + même taille) est sauté.
Lancer :  python upload_snk.py
"""
import sys, json, re
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')

# ── Config R2 (identique à upload_r2.py) ──────────────────────────────────────
ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
ACCESS_KEY = 'b6623ff28dad38c5013cce52ca385723'
SECRET_KEY = '51f32c44071f4b7fffdfbdd50aeef93e791ca6128a05e6221915fc5ab6e61e0e'
BUCKET     = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

# ── Sources (dossier "brams web site new") + sortie JSON (repo du site) ────────
SRC_ROOT = Path(r'F:\Brams-Score-By-Freydiss-new\dist\anime')
S3_DIR   = SRC_ROOT / "[sekkusu&ok] L'Attaque des titans S3 (Shingeki no Kyojin) - VOSTFR-VF [Multi] [1080p WEB-DL]"
S4_DIR   = SRC_ROOT / "[Tsundere-Raws] Shingeki no Kyojin S4 - BATCH VOSTFR (WKN) [1080p]"
OUT_JSON = Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data\aot-videos.json')

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto',
)

TRANSFER = boto3.s3.transfer.TransferConfig(
    multipart_threshold=10 * 1024 * 1024,
    multipart_chunksize=50 * 1024 * 1024,
    max_concurrency=4,
)

def content_type(path: Path) -> str:
    return {'.mkv': 'video/x-matroska', '.mp4': 'video/mp4'}.get(path.suffix.lower(), 'application/octet-stream')

def already_uploaded(key: str, size: int) -> bool:
    try:
        head = s3.head_object(Bucket=BUCKET, Key=key)
        return head['ContentLength'] == size
    except ClientError:
        return False

def upload(local: Path, key: str) -> str:
    size = local.stat().st_size
    if already_uploaded(key, size):
        print(f'  ✓ déjà sur R2 — {key}')
        return f'{PUBLIC_URL}/{key}'
    print(f'  ⬆️  {local.name} ({size / 1024 / 1024:.0f} MB)  →  {key}')
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': content_type(local)}, Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

EP_NUM = re.compile(r'-\s*(\d{1,3})\s')  # "... - 07 VOSTFR ..."

def episode_number(name: str, fallback: int) -> int:
    m = EP_NUM.search(name)
    return int(m.group(1)) if m else fallback

def collect(folder: Path, ext: str):
    files = sorted(folder.glob(f'*{ext}'), key=lambda f: f.name)
    return [(episode_number(f.name, i + 1), f) for i, f in enumerate(files)]

def main():
    if not S3_DIR.exists() or not S4_DIR.exists():
        print(f'❌ Dossiers introuvables.\n  S3: {S3_DIR}\n  S4: {S4_DIR}')
        sys.exit(1)

    entries = []

    print('\n🗡️  Saison 3 (MKV multi-audio VOSTFR/VF)…')
    for ep, f in collect(S3_DIR, '.mkv'):
        key = f'anime/aot/S03E{ep:02d}.mkv'
        url = upload(f, key)
        entries.append({
            'episode': ep,
            'title': f'Saison 3 — Épisode {ep}',
            'src': url,
            'season': 'S03',
            'arc': 'Saison 3',
            'badge': 'MULTI',
            'preferredAudioLang': 'fr',
            'progressKey': f's3-{ep}',   # unique inter-saisons (sinon S03E01/S04E01 partagent la clé)
        })

    print('\n🗡️  Saison 4 (MP4 VOSTFR)…')
    for ep, f in collect(S4_DIR, '.mp4'):
        key = f'anime/aot/S04E{ep:02d}.mp4'
        url = upload(f, key)
        entries.append({
            'episode': ep,
            'title': f'Saison 4 — Épisode {ep}',
            'src': url,
            'season': 'S04',
            'arc': 'Saison 4',
            'badge': 'VOSTFR',
            'preferredAudioLang': 'ja',
            'progressKey': f's4-{ep}',
        })

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n✅ {len(entries)} épisodes écrits → {OUT_JSON}')
    print('   Ensuite, dans brams-web-clone :  git add src/data/aot-videos.json && git commit -m "feat: SNK S3+S4" && git push origin main')

if __name__ == '__main__':
    main()
