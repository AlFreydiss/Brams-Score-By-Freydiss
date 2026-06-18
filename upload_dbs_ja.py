# -*- coding: utf-8 -*-
"""
Dragon Ball Super — ajoute la VO japonaise pour les épisodes 60-131.

Les ép. 1-59 ont déjà le japonais (piste alternée HLS). Les 60-131 n'avaient que la
VF sur R2. Les sources MKV "MULTi" contiennent une piste audio japonaise (jpn).

Pour chaque épisode du range :
  - remux (copie, pas de ré-encodage) vidéo + piste audio japonaise → HLS TS
  - upload sur R2 sous anime/dbs-hls/S01E0NN/ja/ (master.m3u8 + seg*.ts)
La VF existante n'est PAS touchée. Puis on (ré)active l'option "Japonais" dans
dbs-videos.json en tant que variante `mediaSrc` (le lecteur sait basculer la source).

Reprise : épisode déjà uploadé (master ja sur R2) = sauté.
Usage :
  py upload_dbs_ja.py            -> épisodes 60 à 131
  py upload_dbs_ja.py 60 60      -> seulement l'épisode 60 (test)
"""
import sys, json, re, subprocess, shutil
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
BUCKET     = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

SRC_DIR  = Path(r'F:\Brams-Score-By-Freydiss\brams-website\public\anime\Dragon Ball Super S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (ADN)')
OUT_JSON = Path(r'F:\brams-web-clone\src\data\dbs-videos.json')
TMP = Path(r'F:\dbs_ja_tmp')
TMP.mkdir(parents=True, exist_ok=True)

def _load_env_upload():
    env = {}
    p = Path(__file__).parent / '.env.upload'
    if p.exists():
        for line in p.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    return env
_env = _load_env_upload()
ACCESS_KEY = _env.get('R2_ACCESS_KEY', '')
SECRET_KEY = _env.get('R2_SECRET_KEY', '')
if not ACCESS_KEY or not SECRET_KEY:
    sys.exit('❌ Clés R2 manquantes : .env.upload (R2_ACCESS_KEY / R2_SECRET_KEY)')

s3 = boto3.client('s3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version='s3v4'), region_name='auto')
TRANSFER = boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024, multipart_chunksize=50*1024*1024, max_concurrency=4)

def ct(path):
    return {'.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t'}.get(path.suffix.lower(), 'application/octet-stream')

def exists_on_r2(key):
    try:
        s3.head_object(Bucket=BUCKET, Key=key); return True
    except ClientError:
        return False

def upload(local, key):
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct(local)}, Config=TRANSFER)

EP_RE = re.compile(r'S01E(\d+)', re.I)

def find_source(ep):
    for f in SRC_DIR.glob('*.mkv'):
        m = EP_RE.search(f.name)
        if m and int(m.group(1)) == ep:
            return f
    return None

def build_and_upload(ep):
    key_prefix = f'anime/dbs-hls/S01E{ep:03d}/ja'
    master_key = f'{key_prefix}/master.m3u8'
    if exists_on_r2(master_key):
        print(f'  ✓ E{ep:03d} déjà sur R2 — sauté')
        return f'{PUBLIC_URL}/{master_key}'
    src = find_source(ep)
    if not src:
        print(f'  ⚠️  E{ep:03d} source MKV introuvable — sauté')
        return None
    out = TMP / f'S01E{ep:03d}_ja'
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    print(f'  🎞️  E{ep:03d} remux piste japonaise → HLS …')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(src),
        '-map', '0:v:0', '-map', '0:a:m:language:jpn', '-c', 'copy',
        '-f', 'hls', '-hls_time', '10', '-hls_playlist_type', 'vod', '-start_number', '0',
        '-hls_segment_filename', str(out / 'seg%04d.ts'), str(out / 'master.m3u8')], check=True)
    files = sorted(out.glob('*'))
    total = sum(f.stat().st_size for f in files) / 1024 / 1024
    print(f'     ⬆️  upload {len(files)} fichiers ({total:.0f} MB) → {key_prefix}/')
    for f in files:
        upload(f, f'{key_prefix}/{f.name}')
    shutil.rmtree(out, ignore_errors=True)
    return f'{PUBLIC_URL}/{master_key}'

def patch_json():
    """Réactive l'option Japonais (mediaSrc) pour les ép. 60-131 ayant la VO sur R2."""
    data = json.loads(OUT_JSON.read_text(encoding='utf-8'))
    changed = 0
    for v in data:
        ep = v.get('episode')
        if not isinstance(ep, int) or ep < 60:
            continue
        master_key = f'anime/dbs-hls/S01E{ep:03d}/ja/master.m3u8'
        if not exists_on_r2(master_key):
            continue
        ja_url = f'{PUBLIC_URL}/{master_key}'
        audio = [a for a in (v.get('audio') or []) if str(a.get('srclang', '')).lower() != 'ja']
        if not audio:
            audio = [{'label': 'VF', 'srclang': 'fr', 'default': True}]
        audio.append({'label': 'Japonais', 'srclang': 'ja', 'mediaSrc': ja_url})
        v['audio'] = audio
        changed += 1
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'\n📝 dbs-videos.json : {changed} épisodes avec VO japonaise')

def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    end   = int(sys.argv[2]) if len(sys.argv) > 2 else 131
    print(f'🐉 DBS VO japonaise — épisodes {start} à {end}\n')
    for ep in range(start, end + 1):
        build_and_upload(ep)
    patch_json()
    print('\n✅ Terminé.')

if __name__ == '__main__':
    main()
