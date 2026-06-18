# -*- coding: utf-8 -*-
"""
Transcode (HEVC 10-bit -> H264 NVENC) + upload R2 de 3 contenus, puis génère les JSON :
  1) Domestic na Kanojo S01 (12 ép VOSTFR)   -> domestic-na-kanojo-videos.json
  2) Koi wa Ameagari no You ni S01 (12 ép)    -> koi-ameagari-videos.json
  3) Violet Evergarden OAV (S01E14, MULTi)    -> ajouté à violet-evergarden-videos.json (kind=ova)

Audio ré-encodé en AAC (les sources FLAC/AAC ne passent pas toujours en copy dans MP4).
Reprise : fichier déjà sur R2 (même taille) = sauté. Temp sur F: (C: limité).
Lancer :  py upload_new_animes.py
"""
import sys, json, re, subprocess
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
BUCKET     = 'bramscore'
PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

def _env():
    e = {}
    p = Path(__file__).parent / '.env.upload'
    for line in p.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1); e[k.strip()] = v.strip()
    return e
env = _env()
if not env.get('R2_ACCESS_KEY') or not env.get('R2_SECRET_KEY'):
    sys.exit('❌ Clés R2 manquantes (.env.upload)')

SRC_ROOT = Path(r'F:\Brams-Score-By-Freydiss-new\public\anime')
WEB_DATA = Path(r'F:\brams-web-clone\src\data')
TMP = Path(r'F:\new_anime_tmp'); TMP.mkdir(parents=True, exist_ok=True)

s3 = boto3.client('s3', endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4'), region_name='auto')
TRANSFER = boto3.s3.transfer.TransferConfig(multipart_threshold=10*1024*1024, multipart_chunksize=50*1024*1024, max_concurrency=4)

def ff(args):
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)

def ct(p):
    return {'.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.m4a': 'audio/mp4'}.get(p.suffix.lower(), 'application/octet-stream')

def already(key, size):
    try: return s3.head_object(Bucket=BUCKET, Key=key)['ContentLength'] == size
    except ClientError: return False

def upload(local, key):
    size = local.stat().st_size
    if already(key, size):
        print(f'  ✓ déjà sur R2 — {key}'); return f'{PUBLIC_URL}/{key}'
    print(f'  ⬆️  {key} ({size/1024/1024:.0f} MB)')
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ct(local)}, Config=TRANSFER)
    return f'{PUBLIC_URL}/{key}'

def transcode_vostfr(src, mp4):
    # vidéo HEVC10 -> H264 NVENC, audio jpn -> AAC, sous-titres ignorés (extraits à part)
    if not mp4.exists():
        ff(['-i', str(src), '-map', '0:v:0', '-map', '0:a:0',
            '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '23', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-dn', '-sn', '-movflags', '+faststart', str(mp4)])

def extract_subs(src, vtt):
    if not vtt.exists():
        try: ff(['-i', str(src), '-map', '0:s:0', '-c:s', 'webvtt', str(vtt)])
        except subprocess.CalledProcessError: return False
    return vtt.exists()

EP_RE = re.compile(r'S0?1E(\d{2})', re.I)

def do_series(folder_glob, slug, key_prefix, title_fr):
    src_dir = next(SRC_ROOT.glob(folder_glob))
    eps = []
    for f in sorted(src_dir.rglob('*.mkv')):
        m = EP_RE.search(f.name)
        if m and 'NC' not in f.name.upper().split('S0')[0]:  # ignore NCOP/NCED
            eps.append((int(m.group(1)), f))
    eps.sort()
    print(f'\n🎬 {title_fr} — {len(eps)} épisodes')
    entries = []
    for ep, f in eps:
        base = f'S01E{ep:02d}'
        mp4 = TMP / f'{slug}-{base}.mp4'
        vtt = TMP / f'{slug}-{base}.vtt'
        transcode_vostfr(f, mp4)
        has_sub = extract_subs(f, vtt)
        url_mp4 = upload(mp4, f'anime/{key_prefix}/{base}.mp4')
        e = {
            'episode': ep, 'title': f'Épisode {ep}', 'src': url_mp4,
            'season': 'S01', 'arc': 'Saison 1', 'badge': 'VOSTFR',
            'preferredAudioLang': 'ja', 'progressKey': f'{slug}-{ep}',
        }
        if has_sub:
            url_vtt = upload(vtt, f'anime/{key_prefix}/{base}-fr.vtt')
            e['subtitles'] = [{'label': 'Français', 'srclang': 'fr', 'src': url_vtt}]
        entries.append(e)
        try: mp4.unlink()
        except OSError: pass
    out = WEB_DATA / f'{slug}-videos.json'
    out.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'  ✅ {len(entries)} entrées -> {out.name}')

def do_violet_oav():
    src_dir = next(SRC_ROOT.glob('*Violet*OVA*'))
    oav = next(src_dir.rglob('*OVA*.mkv'))
    print(f'\n💌 Violet OAV — {oav.name}')
    vf  = TMP / 'violet-oav.mp4'        # vidéo + VF (fre)
    vo  = TMP / 'violet-oav-vostfr.mp4' # vidéo + JP
    vtt = TMP / 'violet-oav-fr.vtt'
    # transcode vidéo (1er flux vidéo, pas la cover mjpeg) + VF (fre)
    if not vf.exists():
        ff(['-i', str(oav), '-map', '0:v:0', '-map', '0:a:m:language:fre',
            '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '23', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-dn', '-sn', '-movflags', '+faststart', str(vf)])
    # variante VOSTFR : même vidéo (re-transcodée) + JP
    if not vo.exists():
        ff(['-i', str(oav), '-map', '0:v:0', '-map', '0:a:m:language:jpn',
            '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '23', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-dn', '-sn', '-movflags', '+faststart', str(vo)])
    # sous-titres FR COMPLETS (s:1 = "FR Full", s:0 étant les Forced)
    has_sub = False
    if not vtt.exists():
        try: ff(['-i', str(oav), '-map', '0:s:1', '-c:s', 'webvtt', str(vtt)]); has_sub = vtt.exists()
        except subprocess.CalledProcessError: has_sub = False
    else:
        has_sub = True
    url_vf = upload(vf, 'anime/violet-evergarden/oav.mp4')
    url_vo = upload(vo, 'anime/violet-evergarden/oav-vostfr.mp4')
    entry = {
        'episode': 14, 'title': 'OAV — Violet Evergarden', 'kind': 'ova',
        'episodeLabel': 'OAV', 'src': url_vf, 'season': 'OAV', 'arc': 'OAV',
        'badge': 'VF/VOSTFR', 'preferredAudioLang': 'fr', 'progressKey': 'violet-oav',
        'audio': [
            {'label': 'VF', 'srclang': 'fr'},
            {'label': 'VOSTFR', 'srclang': 'ja', 'mediaSrc': url_vo},
        ],
    }
    if has_sub:
        url_vtt = upload(vtt, 'anime/violet-evergarden/oav-fr.vtt')
        entry['subtitles'] = [{'label': 'Français', 'srclang': 'fr', 'src': url_vtt}]
    # insérer dans le JSON Violet (avant les films pour rester groupé OAV)
    vj = WEB_DATA / 'violet-evergarden-videos.json'
    data = json.loads(vj.read_text(encoding='utf-8'))
    data = [d for d in data if d.get('progressKey') != 'violet-oav']
    films = [d for d in data if d.get('kind') == 'film']
    rest = [d for d in data if d.get('kind') != 'film']
    data = rest + [entry] + films
    vj.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    for t in (vf, vo):
        try: t.unlink()
        except OSError: pass
    print('  ✅ OAV ajouté à violet-evergarden-videos.json')

def main():
    do_violet_oav()
    do_series('Domestic na Kanojo*', 'domestic-na-kanojo', 'domestic-na-kanojo', 'Domestic na Kanojo')
    do_series('Koi wa Ameagari*', 'koi-ameagari', 'koi-ameagari', 'Koi wa Ameagari no You ni')
    print('\n🎉 Terminé. Committer les JSON dans brams-web-clone + créer les pages des 2 nouveaux animés.')

if __name__ == '__main__':
    main()
