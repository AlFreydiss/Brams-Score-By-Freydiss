#!/usr/bin/env python3
"""
Upload scans vers Supabase Storage et met à jour chapters-data.json
Usage : python upload_scans.py
Deps  : pip install requests python-dotenv
"""
import sys, os, json, mimetypes, time
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from dotenv import load_dotenv
    load_dotenv('.env.upload')
except ImportError:
    pass

import requests

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL  = os.environ.get('SUPABASE_URL', '').rstrip('/')
SERVICE_KEY   = os.environ.get('SUPABASE_SERVICE_KEY', '')
BUCKET        = os.environ.get('SUPABASE_BUCKET', 'scans')
SCANS_DIR     = Path('brams-website/public/scans')
CHAPTERS_JSON = Path(r'F:\brams-web-clone\src\data\chapters-data.json')
MAX_WORKERS   = 6

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌  Remplis .env.upload avec SUPABASE_URL et SUPABASE_SERVICE_KEY")
    raise SystemExit(1)

HEADERS = {'Authorization': f'Bearer {SERVICE_KEY}', 'apikey': SERVICE_KEY}


# ── Bucket ────────────────────────────────────────────────────────────────────
def ensure_bucket():
    r = requests.post(
        f'{SUPABASE_URL}/storage/v1/bucket',
        headers={**HEADERS, 'Content-Type': 'application/json'},
        json={'id': BUCKET, 'name': BUCKET, 'public': True},
        timeout=15,
    )
    if r.status_code in (200, 201):
        print(f'✅  Bucket "{BUCKET}" créé (public)')
    elif r.status_code == 409 or 'already exists' in r.text.lower():
        print(f'✅  Bucket "{BUCKET}" existe déjà')
    else:
        print(f'⚠️  Bucket: {r.status_code} — {r.text[:200]}')


# ── Upload d'un fichier ───────────────────────────────────────────────────────
def upload_file(local_path: Path, object_name: str):
    mime = mimetypes.guess_type(local_path)[0] or 'application/octet-stream'
    url  = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_name}'
    hdrs = {**HEADERS, 'Content-Type': mime, 'x-upsert': 'true'}

    with open(local_path, 'rb') as f:
        r = requests.post(url, headers=hdrs, data=f, timeout=60)

    if r.status_code in (200, 201):
        return f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{object_name}'
    else:
        print(f'  ❌ {object_name}: {r.status_code} {r.text[:120]}')
        return None


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ensure_bucket()

    # Collecte des fichiers
    tasks = []
    for ch_dir in sorted(SCANS_DIR.iterdir()):
        if not ch_dir.is_dir():
            continue
        for img in sorted(ch_dir.iterdir()):
            if img.suffix.lower() in ('.webp', '.jpg', '.jpeg', '.png'):
                tasks.append((img, f'{ch_dir.name}/{img.name}'))

    total = len(tasks)
    print(f'\n📦  {total} fichiers à uploader dans "{BUCKET}"…\n')

    uploaded: dict[str, str] = {}
    done = 0
    errors = 0
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(upload_file, p, n): n for p, n in tasks}
        for fut in as_completed(futures):
            name = futures[fut]
            url  = fut.result()
            done += 1
            if url:
                uploaded[name] = url
            else:
                errors += 1
            if done % 50 == 0 or done == total:
                elapsed   = time.time() - t0
                speed     = done / elapsed if elapsed else done
                remaining = (total - done) / speed if speed else 0
                print(f'  {done}/{total} — {speed:.1f} f/s — ~{remaining:.0f}s restantes')

    print(f'\n✅  {len(uploaded)}/{total} uploadés ({errors} erreurs)\n')

    # Mise à jour chapters-data.json
    with open(CHAPTERS_JSON, encoding='utf-8') as f:
        chapters = json.load(f)

    updated = 0
    for ch in chapters:
        new_pages = []
        for page_url in ch['pages']:
            # /scans/ch1127/01.webp → ch1127/01.webp
            parts = page_url.lstrip('/').split('/')
            if len(parts) >= 3:
                key = f'{parts[1]}/{parts[2]}'
                if key in uploaded:
                    new_pages.append(uploaded[key])
                    updated += 1
                else:
                    new_pages.append(page_url)
            else:
                new_pages.append(page_url)
        ch['pages'] = new_pages

    with open(CHAPTERS_JSON, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, ensure_ascii=False, indent=4)

    print(f'✅  {updated} URLs mises à jour dans chapters-data.json')
    print()
    print('🚀  Maintenant lance :')
    print('    git add F:/brams-web-clone/src/data/chapters-data.json')
    print('    git commit -m "feat(scans): images hébergées sur Supabase Storage"')
    print('    git push')


if __name__ == '__main__':
    main()
