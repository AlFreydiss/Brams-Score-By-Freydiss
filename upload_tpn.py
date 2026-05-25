import os, sys, json, re, concurrent.futures, requests
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'
SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWV0cm11bHFuZHh1Z2Zib2pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM3NTE3OSwiZXhwIjoyMDkxOTUxMTc5fQ.H3N7Zr_8UHqTAKCa11RLEQLOzXe6J-kY4mI1d8KDZJI'
BUCKET       = 'scans'
WORKERS      = 10

BASE_DIR = Path(r'F:\Manga\TPN\The Promised Neverland')
OUT_JSON = Path(r'F:\Brams-Score-By-Freydiss\brams-website\src\data\tpn-chapters.json')

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def public_url(path):
    return f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}'

def upload_file(local_path, storage_path):
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}'
    ext = local_path.suffix.lower()
    ct  = 'image/jpeg' if ext in ('.jpg', '.jpeg') else 'image/webp' if ext == '.webp' else 'image/png'
    with open(local_path, 'rb') as f:
        data = f.read()
    r = requests.post(url, headers={**HEADERS, 'Content-Type': ct, 'x-upsert': 'true'}, data=data)
    return r.status_code in (200, 201)

def parse_chapter_folder(name):
    """Extract (sort_key, num_display, title) from folder name like '1   Grace Field House'"""
    m = re.match(r'^(\d+(?:\.\d+)?)\s{2,}(.+)$', name.strip())
    if m:
        raw = m.group(1)
        title = m.group(2).strip()
        num = float(raw)
        return num, raw, title
    # fallback: try single-word num at start
    m2 = re.match(r'^(\d+(?:\.\d+)?)\s+(.+)$', name.strip())
    if m2:
        raw = m2.group(1)
        title = m2.group(2).strip()
        num = float(raw)
        return num, raw, title
    return 9999, name, name

# ── Discover chapters ─────────────────────────────────────────────────────────

raw_folders = [d for d in BASE_DIR.iterdir() if d.is_dir()]
chapters_meta = []
for folder in raw_folders:
    sort_key, num_raw, title = parse_chapter_folder(folder.name)
    pages_files = sorted([f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.webp', '.png')],
                         key=lambda f: f.name)
    if pages_files:
        chapters_meta.append({
            'sort_key': sort_key,
            'num_raw': num_raw,
            'num': int(sort_key) if sort_key == int(sort_key) else sort_key,
            'title': title,
            'folder': folder,
            'files': pages_files,
        })

chapters_meta.sort(key=lambda x: x['sort_key'])
total_pages = sum(len(c['files']) for c in chapters_meta)
print(f'📚 {len(chapters_meta)} chapitres · {total_pages} pages')

# ── Build upload tasks ────────────────────────────────────────────────────────

tasks = []  # (local_path, storage_path)
for ch in chapters_meta:
    slug = ch['num_raw']  # e.g. "1", "21.5"
    for f in ch['files']:
        storage_path = f'tpn/ch{slug}/{f.name}'
        tasks.append((f, storage_path))

print(f'⬆️  Démarrage upload ({WORKERS} workers)...')

done = 0
failed = 0

def do_upload(args):
    local, path = args
    ok = upload_file(local, path)
    return ok, path

with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futures = {ex.submit(do_upload, t): t for t in tasks}
    for fut in concurrent.futures.as_completed(futures):
        ok, path = fut.result()
        done += 1
        if not ok:
            failed += 1
            print(f'  ❌ {path}')
        if done % 100 == 0 or done == len(tasks):
            print(f'  [{done}/{len(tasks)}] ✅ ok · ❌ {failed} erreurs')

print(f'\n✅ Upload terminé : {done - failed}/{len(tasks)} pages')

# ── Generate tpn-chapters.json ────────────────────────────────────────────────

result = []
for ch in chapters_meta:
    slug = ch['num_raw']
    pages_urls = [public_url(f'tpn/ch{slug}/{f.name}') for f in ch['files']]
    result.append({
        'num':   ch['num'],
        'title': ch['title'],
        'pages': pages_urls,
    })

with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f'📄 {OUT_JSON} mis à jour ({len(result)} chapitres)')
