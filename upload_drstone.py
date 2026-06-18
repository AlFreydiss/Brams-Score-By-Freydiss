import os, sys, json, re, concurrent.futures, requests
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'
# service_role lue depuis .env.upload (gitignoré) — jamais en dur (repo public).
_envu = {}
for _l in (Path(__file__).parent / '.env.upload').read_text(encoding='utf-8').splitlines():
    _l = _l.strip()
    if _l and not _l.startswith('#') and '=' in _l:
        _k, _v = _l.split('=', 1); _envu[_k.strip()] = _v.strip()
SERVICE_KEY  = _envu.get('SUPABASE_SERVICE_KEY', '')
BUCKET       = 'scans'
WORKERS      = 10

BASE_DIR = Path(r'F:\Manga\TPN\Dr. Stone')
OUT_JSON = Path(r'F:\brams-web-clone\src\data\drstone-chapters.json')

HEADERS = {'Authorization': f'Bearer {SERVICE_KEY}', 'apikey': SERVICE_KEY}

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

def parse_folder(name):
    stripped = name.strip()
    m0 = re.match(r'^(\d+(?:\.\d+)?)$', stripped)
    if m0:
        raw = m0.group(1); num = float(raw); return num, raw, ''
    m1 = re.match(r'^(\d+(?:\.\d+)?)\s{2,}(.+)$', stripped)
    if m1:
        raw = m1.group(1); title = m1.group(2).strip(); return float(raw), raw, title
    m2 = re.match(r'^(\d+(?:\.\d+)?)\s+(.+)$', stripped)
    if m2:
        raw = m2.group(1); title = m2.group(2).strip(); return float(raw), raw, title
    return 9999, name, name

chapters_meta = []
for folder in BASE_DIR.iterdir():
    if not folder.is_dir(): continue
    sort_key, num_raw, title = parse_folder(folder.name)
    files = sorted([f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in ('.jpg','.jpeg','.webp','.png')], key=lambda f: f.name)
    if not files: continue
    num_val = int(sort_key) if sort_key == int(sort_key) else sort_key
    chapters_meta.append({'sort_key': sort_key, 'num_raw': num_raw, 'num': num_val, 'title': title, 'files': files})

chapters_meta.sort(key=lambda x: x['sort_key'])
total_pages = sum(len(c['files']) for c in chapters_meta)
print(f'📚 {len(chapters_meta)} chapitres · {total_pages} pages')

tasks = []
for ch in chapters_meta:
    slug = ch['num_raw']
    for f in ch['files']:
        tasks.append((f, f'drstone/ch{slug}/{f.name}'))

print(f'⬆️  Upload ({WORKERS} workers)...')
done = 0; failed = 0

def do_upload(args):
    local, path = args
    return upload_file(local, path), path

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

print(f'\n✅ {done - failed}/{len(tasks)} pages uploadées')

result = []
for ch in chapters_meta:
    slug = ch['num_raw']
    pages = [public_url(f'drstone/ch{slug}/{f.name}') for f in ch['files']]
    result.append({'num': ch['num'], 'title': ch['title'], 'pages': pages})

with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f'📄 {OUT_JSON} ({len(result)} chapitres)')
