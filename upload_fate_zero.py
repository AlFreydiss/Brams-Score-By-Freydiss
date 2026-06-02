# -*- coding: utf-8 -*-
"""
Fate/Zero → R2 + site. Source : HEVC 10-bit MKV (illisible navigateur), audio AAC
japonais, sous-titres ASS français (VOSTFR).

Pour chaque épisode (S01E01-13, S02E01-12 ; les NCOP/NCED sont ignorés) :
  - transcode vidéo HEVC 10-bit → H.264 8-bit via GPU NVENC (audio AAC copié) → MP4
  - extrait les sous-titres FR en .vtt
  - upload MP4 + VTT sur R2
Puis génère fate-zero-videos.json dans brams-web-clone.

Clés R2 lues depuis .env.upload (gitignoré). Reprise : fichier déjà sur R2 = sauté.
Lancer :  py upload_fate_zero.py
"""
import sys, json, re, subprocess, tempfile
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
BUCKET     = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

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
    sys.exit('❌ Clés R2 manquantes : crée .env.upload (R2_ACCESS_KEY / R2_SECRET_KEY)')

SRC_ROOT = Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')
OUT_JSON = Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data\fate-zero-videos.json')
TMP = Path(r'F:\fz_remux')  # C: est plein → temp sur F: (disque source, 260 Go libres)
TMP.mkdir(parents=True, exist_ok=True)

s3 = boto3.client('s3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version='s3v4'), region_name='auto')
TRANSFER = boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024, multipart_chunksize=50*1024*1024, max_concurrency=4)

def ff(args):
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)

def ct(path):
    return {'.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8'}.get(path.suffix.lower(), 'application/octet-stream')

def already(key, size):
    try:
        return s3.head_object(Bucket=BUCKET, Key=key)['ContentLength'] == size
    except ClientError:
        return False

def upload(local, key):
    size = local.stat().st_size
    if already(key, size):
        print(f'  ✓ déjà sur R2 — {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'  ⬆️  {key} ({size/1024/1024:.0f} MB)')
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct(local)}, Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

EP_RE = re.compile(r'S(\d{2})E(\d{2})', re.I)

def main():
    try:
        src_dir = next(SRC_ROOT.glob('*Zero*'))
    except StopIteration:
        sys.exit(f'❌ Dossier Fate/Zero introuvable dans {SRC_ROOT}')

    eps = []
    for f in sorted(src_dir.rglob('*.mkv')):
        m = EP_RE.search(f.name)
        if m:  # ignore NCOP/NCED (pas de SxxEyy)
            eps.append((int(m.group(1)), int(m.group(2)), f))
    eps.sort()
    print(f'🔥 Fate/Zero — {len(eps)} épisodes (transcodage GPU NVENC HEVC10→H264)\n')

    entries = []
    for season, ep, f in eps:
        base = f'S{season:02d}E{ep:02d}'
        mp4 = TMP / f'fz-{base}.mp4'
        vtt = TMP / f'fz-{base}.vtt'
        if not mp4.exists():
            ff(['-i', str(f), '-map', '0:v:0', '-map', '0:a:0',
                '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '23', '-pix_fmt', 'yuv420p',
                '-c:a', 'copy', '-dn', '-sn', '-movflags', '+faststart', str(mp4)])
        if not vtt.exists():
            ff(['-i', str(f), '-map', '0:s:0', '-c:s', 'webvtt', str(vtt)])
        url_mp4 = upload(mp4, f'anime/fate-zero/{base}.mp4')
        url_vtt = upload(vtt, f'anime/fate-zero/{base}-fr.vtt')
        try: mp4.unlink()
        except OSError: pass
        entries.append({
            'episode': ep,
            'title': f'Saison {season} — Épisode {ep}',
            'src': url_mp4,
            'season': f'S{season:02d}',
            'arc': f'Saison {season}',
            'badge': 'VOSTFR',
            'preferredAudioLang': 'ja',
            'progressKey': f'fz-s{season}-{ep}',
            'subtitles': [{'label': 'Français', 'srclang': 'fr', 'src': url_vtt}],
        })

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n✅ {len(entries)} épisodes écrits → {OUT_JSON}')

if __name__ == '__main__':
    main()
