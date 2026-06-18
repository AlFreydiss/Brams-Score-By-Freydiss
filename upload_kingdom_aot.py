import os, sys, re, json, requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

env = {}
env_path = Path(__file__).parent / '.env.upload'
for line in env_path.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env['SUPABASE_URL']
SERVICE_KEY  = env['SUPABASE_SERVICE_KEY']
BUCKET       = env['SUPABASE_BUCKET']
WORKERS      = 10

SOURCES = {
    'kingdom': Path(r'F:\Manga\TPN\Kingdom'),
    'aot':     Path(r'F:\Manga\TPN\Attaque des titans'),
}

CH_RE_FULL = re.compile(r'^(\d+(?:\.\d+)?)\s{2,}(.+)$')
CH_RE_NUM  = re.compile(r'^(\d+(?:\.\d+)?)$')
IMG_EXTS   = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'x-upsert': 'true',
}

def parse_folder(name):
    m = CH_RE_FULL.match(name)
    if m:
        return m.group(1), m.group(2).strip()
    m = CH_RE_NUM.match(name)
    if m:
        return m.group(1), ''
    return None, None

def upload_file(storage_path, local_path):
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}'
    ext = local_path.suffix.lower()
    ct  = 'image/webp' if ext == '.webp' else 'image/avif' if ext == '.avif' else f'image/{ext[1:]}'
    with open(local_path, 'rb') as f:
        r = requests.post(url, headers={**HEADERS, 'Content-Type': ct}, data=f, timeout=60)
    if r.status_code not in (200, 201):
        raise RuntimeError(f'HTTP {r.status_code}: {r.text[:120]}')

def scan_chapters(manga_key, base_dir):
    chapters = []
    for folder in sorted(base_dir.iterdir()):
        if not folder.is_dir():
            continue
        num_raw, title = parse_folder(folder.name)
        if num_raw is None:
            print(f'[SKIP] {folder.name}')
            continue
        pages = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXTS)
        if not pages:
            continue
        chapters.append({
            'num_raw': num_raw,
            'num': float(num_raw),
            'title': title,
            'pages': pages,
            'storage_prefix': f'{manga_key}/ch{num_raw}',
        })
    chapters.sort(key=lambda c: c['num'])
    return chapters

def upload_all(manga_key, chapters):
    tasks = [(f"{ch['storage_prefix']}/{p.name}", p) for ch in chapters for p in ch['pages']]
    total, done, failed = len(tasks), 0, []

    print(f'\n[{manga_key.upper()}] {len(chapters)} chapitres · {total} pages')

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(upload_file, sp, lp): (sp, lp) for sp, lp in tasks}
        for fut in as_completed(futs):
            sp, lp = futs[fut]
            done += 1
            try:
                fut.result()
                if done % 200 == 0 or done == total:
                    print(f'  {done}/{total} pages uploadées')
            except Exception as e:
                failed.append((sp, lp))
                print(f'  [FAIL] {sp} — {e}')

    print(f'[{manga_key.upper()}] Terminé : {total - len(failed)}/{total} OK, {len(failed)} échecs')

    if failed:
        print(f'  Relance des {len(failed)} échecs...')
        still_failed = []
        for sp, lp in failed:
            try:
                upload_file(sp, lp)
                print(f'    [RETRY OK] {sp}')
            except Exception as e:
                still_failed.append(sp)
                print(f'    [RETRY FAIL] {sp} — {e}')
        if still_failed:
            print(f'  {len(still_failed)} encore en échec : {still_failed}')

BASE_URL = f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}'

for manga_key, base_dir in SOURCES.items():
    if not base_dir.exists():
        print(f'[WARN] Dossier introuvable : {base_dir}')
        continue

    print(f'\n=== {manga_key.upper()} ===')
    chapters = scan_chapters(manga_key, base_dir)
    if not chapters:
        print('Aucun chapitre trouvé.')
        continue

    upload_all(manga_key, chapters)

    json_data = [{'num': ch['num_raw'], 'title': ch['title'], 'pages': [f"{BASE_URL}/{ch['storage_prefix']}/{p.name}" for p in ch['pages']]} for ch in chapters]
    out_path  = Path(r'F:\brams-web-clone\src\data') / f'{manga_key}-chapters.json'
    out_path.write_text(json.dumps(json_data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[JSON] {out_path.name} écrit ({len(json_data)} chapitres)')

print('\nTout terminé !')
