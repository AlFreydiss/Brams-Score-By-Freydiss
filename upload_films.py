# -*- coding: utf-8 -*-
"""
Films MULTi (VF + VOSTFR) -> R2, format Kaiju (2 mp4 par film + sous-titre FR).
Bubble (2022) + Chainsaw Man - Reze Arc (2025).
Source H264 (copie video) + audio eac3 fre/jpn -> aac stereo, subs FR complets -> vtt.
Ecrit src/data/films-videos.json. Lancer : py upload_films.py
"""
import sys, json, subprocess
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'; BUCKET = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

env = {}
for line in (Path(__file__).parent / '.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1); env[k.strip()] = v.strip()

s3 = boto3.client('s3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'), region_name='auto')
TRANSFER = boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024, multipart_chunksize=50*1024*1024, max_concurrency=4)
TMP = Path(r'F:\films_tmp'); TMP.mkdir(parents=True, exist_ok=True)
ROOT = Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')

# Les deux films ont la meme structure de pistes : v:0, a:0=fre, a:1=jpn, s:1=fre complet.
FILMS = [
    {'slug': 'bubble', 'match': 'Bubble', 'title': 'Bubble',
     'meta': {'year': 2022, 'synopsis': "Tokyo coupee du monde par des bulles defiant la gravite. Hibiki, jeune parkouriste, rencontre la mysterieuse Uta. Un conte SF signe Wit Studio / Tetsuro Araki (AOT) sur un scenario de Gen Urobuchi."}},
    {'slug': 'reze', 'match': 'Chainsaw Man The Movie Reze', 'title': 'Chainsaw Man - The Movie : Reze Arc',
     'meta': {'year': 2025, 'synopsis': "Denji rencontre Reze, une fille enigmatique, au cafe sous la pluie. Mais la douceur cache un demon. L'arc Reze adapte au cinema par MAPPA."}},
]

def ff(args): subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)
def ct(p): return {'.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg'}.get(p.suffix.lower(), 'application/octet-stream')
def already(k, s):
    try: return s3.head_object(Bucket=BUCKET, Key=k)['ContentLength'] == s
    except ClientError: return False
def upload(local, key):
    sz = local.stat().st_size
    if already(key, sz): print(f'  deja R2 {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'  upload {key} ({sz/1024/1024:.0f} MB)')
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct(local)}, Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

def process(film):
    slug = film['slug']
    src = next(f for f in ROOT.glob('*.mkv') if film['match'].lower() in f.name.lower())
    print(f"\n=== {film['title']} === ({src.name})")
    vf = TMP / f'{slug}-vf.mp4'; vo = TMP / f'{slug}-vostfr.mp4'
    vtt = TMP / f'{slug}-fr.vtt'; jpg = TMP / f'{slug}.jpg'

    if not vf.exists():
        print('  VF (copie video + audio fr->aac)...')
        ff(['-i', str(src), '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
            '-c:a', 'aac', '-ac', '2', '-b:a', '192k', '-sn', '-dn', '-movflags', '+faststart', str(vf)])
    if not vo.exists():
        print('  VOSTFR (copie video + audio jp->aac)...')
        ff(['-i', str(src), '-map', '0:v:0', '-map', '0:a:1', '-c:v', 'copy',
            '-c:a', 'aac', '-ac', '2', '-b:a', '192k', '-sn', '-dn', '-movflags', '+faststart', str(vo)])
    if not vtt.exists():
        print('  Sous-titre FR complet...')
        try: ff(['-i', str(src), '-map', '0:s:1', '-c:s', 'webvtt', str(vtt)])
        except subprocess.CalledProcessError:
            try: ff(['-i', str(src), '-map', '0:s:0', '-c:s', 'webvtt', str(vtt)])
            except subprocess.CalledProcessError: print('  (pas de sous-titre)')
    if not jpg.exists():
        print('  Miniature...')
        try: ff(['-ss', '600', '-i', str(vf), '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '3', str(jpg)])
        except subprocess.CalledProcessError: pass

    base = f'anime/films/{slug}'
    print('  Upload R2...')
    url_vf = upload(vf, f'{base}/{slug}-vf.mp4')
    url_vo = upload(vo, f'{base}/{slug}-vostfr.mp4')
    entry = {
        'episode': 1, 'title': film['title'], 'kind': 'film', 'episodeLabel': 'Film',
        'src': url_vf, 'season': 'Film', 'arc': 'Film', 'badge': 'MULTI',
        'preferredAudioLang': 'fr', 'progressKey': f'film-{slug}',
        'year': film['meta']['year'], 'synopsis': film['meta']['synopsis'],
        'audio': [
            {'label': 'VF', 'srclang': 'fr', 'default': True},
            {'label': 'VOSTFR', 'srclang': 'ja', 'mediaSrc': url_vo},
        ],
    }
    if vtt.exists():
        entry['subtitles'] = [{'label': 'Français', 'srclang': 'fr', 'src': upload(vtt, f'{base}/{slug}-fr.vtt')}]
    if jpg.exists():
        entry['thumbnail'] = upload(jpg, f'{base}/{slug}.jpg')
    return entry

def main():
    entries = [process(f) for f in FILMS]
    out = Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data\films-videos.json')
    out.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nOK -> films-videos.json ({len(entries)} films)')

if __name__ == '__main__':
    main()
