# -*- coding: utf-8 -*-
"""
Ingestion des scans d'UN manga depuis F:\\Manga\\TPN\\<Manga> vers R2,
puis genere src/data/manga/<slug>.json  ( [{num, title, pages:[urls]}] ).

Usage : py upload_manga_scans.py "Solo Leveling" solo-leveling
        (arg1 = nom du dossier source, arg2 = slug pour R2/json)

Resumable : un fichier deja sur R2 (meme taille) est saute.
"""
import sys, json, re, unicodedata
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8')
ACCOUNT_ID='166b8357e5229b31a88cf104058ed5ee'; BUCKET='bramscore'
PUBLIC_URL='https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
env={}
for line in (Path(__file__).parent/'.env.upload').read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1); env[k.strip()]=v.strip()
s3=boto3.client('s3',endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=env['R2_ACCESS_KEY'],aws_secret_access_key=env['R2_SECRET_KEY'],
    config=Config(signature_version='s3v4',max_pool_connections=20),region_name='auto')

SRC_ROOT = Path(r'F:\Manga\TPN')
OUT_DIR  = Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data\manga')
IMG_EXT  = {'.webp','.jpg','.jpeg','.png'}

def ctype(p):
    return {'.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'}.get(p.suffix.lower(),'application/octet-stream')

def chapter_num(name):
    m = re.match(r'\s*(\d+(?:\.\d+)?)', name)
    return float(m.group(1)) if m else None

def chapter_title(name):
    # "100   Declaration de Guerre" -> "Declaration de Guerre"
    return re.sub(r'^\s*\d+(?:\.\d+)?\s+', '', name).strip()

def already(key, size):
    try: return s3.head_object(Bucket=BUCKET, Key=key)['ContentLength'] == size
    except ClientError: return False

def up(local, key):
    size = local.stat().st_size
    if already(key, size): return f'{PUBLIC_URL}/{key}'
    s3.upload_file(str(local), BUCKET, key, ExtraArgs={'ContentType': ctype(local), 'CacheControl': 'public, max-age=31536000, immutable'})
    return f'{PUBLIC_URL}/{key}'

def main():
    if len(sys.argv) < 3:
        sys.exit('Usage: py upload_manga_scans.py "<Dossier>" <slug>')
    folder, slug = sys.argv[1], sys.argv[2]
    src = SRC_ROOT / folder
    if not src.exists(): sys.exit(f'Introuvable: {src}')
    chapters = sorted([d for d in src.iterdir() if d.is_dir()], key=lambda d: (chapter_num(d.name) is None, chapter_num(d.name) or 0, d.name))
    print(f'{folder} -> {len(chapters)} chapitres (slug={slug})')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_json = OUT_DIR / f'{slug}.json'
    data = json.loads(out_json.read_text(encoding='utf-8')) if out_json.exists() else []
    done_nums = {c['num'] for c in data}

    for ci, ch in enumerate(chapters, 1):
        num = chapter_num(ch.name)
        if num is None: continue
        num = int(num) if float(num).is_integer() else num
        if num in done_nums: continue
        imgs = sorted([f for f in ch.iterdir() if f.suffix.lower() in IMG_EXT], key=lambda f: f.name)
        if not imgs: continue
        pages = [None]*len(imgs)
        def task(i_f):
            i, f = i_f
            key = f'manga/{slug}/{num}/{i+1:03d}{f.suffix.lower()}'
            return i, up(f, key)
        with ThreadPoolExecutor(max_workers=12) as ex:
            for fut in as_completed([ex.submit(task, (i, f)) for i, f in enumerate(imgs)]):
                i, url = fut.result(); pages[i] = url
        data.append({'num': num, 'title': chapter_title(ch.name) or f'Chapitre {num}', 'pages': pages})
        data.sort(key=lambda c: c['num'])
        out_json.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')  # ecrit au fil (resumable)
        print(f'  [{ci}/{len(chapters)}] ch {num} : {len(imgs)} pages OK')

    print(f'\nTermine : {len(data)} chapitres -> {out_json.name}')

if __name__ == '__main__':
    main()
