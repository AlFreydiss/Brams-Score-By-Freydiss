# -*- coding: utf-8 -*-
"""Pipeline titres d'épisodes : Jikan (MyAnimeList) -> src/data/<anime>-videos.json.
RÈGLE : ne remplace QUE les titres génériques (« Épisode N », « Saison X — Épisode N »).
Réutilisable : relancer après tout re-run d'un upload_*.py.  py fetch_apply_titles.py
"""
import json, re, sys, time, urllib.request
from pathlib import Path

DATA = Path(__file__).parent / 'src' / 'data'
# Tous les formats placeholder rencontrés : « Épisode 1 », « Saison 3 — Épisode 1 »,
# « Saison 1 - Episode 1 », « S01 - Episode 1 », accents/tirets/casse variables.
GENERIC = re.compile(r'^\s*(S\d+\s*[—-]\s*|Saison \d+\s*[—-]\s*)?(É|E|é|e)pisode\s+\d+\s*$', re.I)

# slug -> { season: [mal_ids...] } (concaténés dans l'ordre des épisodes du groupe)
CONFIG = {
    'aot':                {'S03': [35760, 38524], 'S04': [40028]},
    'fireforce':          {'S02': [40956], 'S03': [51818, 58966]},
    'jjk':                {'S01': [40748]},
    'mha':                {'S01': [31964], 'S02': [33486], 'S03': [36456], 'S04': [38408], 'S05': [41587], 'S06': [47778]},
    'fate-zero':          {'S01': [10087], 'S02': [11741]},
    'bunny-girl':         {'S01': [37450]},
    'rent-girlfriend':    {'S01': [40839], 'S02': [42962], 'S03': [50739]},
    'carole-tuesday':     {'S01': [37435]},
    'dbs':                {'S01': [30694]},
    'kaiju':              {'S01': [52588]},
    'domestic-na-kanojo': {'S01': [37982]},
    'koi-ameagari':       {'S01': [36882]},
    'your-lie':           {'S01': [23273]},
    'violet-evergarden':  {'S01': [33352]},
    # '*' = un seul MAL id pour toute la série, indexé par numéro d'épisode global
    # (hxh découpe ses 148 ép. en "saisons"-arcs S01..S07 dans le json).
    'hxh':                {'*': [11061]},
    'kny':                {'S01': [38000], 'S02': [49926], 'S03': [44511], 'S04': [51019], 'S05': [55701]},
}

def jikan_titles(mal_id):
    titles, page = [], 1
    while True:
        url = f'https://api.jikan.moe/v4/anime/{mal_id}/episodes?page={page}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        d = json.loads(urllib.request.urlopen(req, timeout=20).read())
        titles += [e.get('title') or '' for e in d.get('data', [])]
        if not d.get('pagination', {}).get('has_next_page'): break
        page += 1
        time.sleep(1.1)
    time.sleep(1.1)
    return titles

def main():
    only = set(sys.argv[1:])  # py fetch_apply_titles.py kny hxh -> ne traite que ceux-là
    for slug, seasons in CONFIG.items():
        if only and slug not in only: continue
        path = DATA / f'{slug}-videos.json'
        if not path.exists():
            print(f'{slug}: json absent, skip'); continue
        data = json.loads(path.read_text(encoding='utf-8'))
        patched = 0
        for season, mal_ids in seasons.items():
            titles = []
            for mid in mal_ids:
                try: titles += jikan_titles(mid)
                except Exception as e: print(f'  {slug}/{season} mal {mid}: {e}')
            group = ([e for e in data if not e.get('kind')] if season == '*'
                     else [e for e in data if e.get('season') == season])
            for i, entry in enumerate(group):
                if i < len(titles) and titles[i] and GENERIC.match(str(entry.get('title') or '')):
                    entry['title'] = titles[i]
                    patched += 1
        if patched:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{slug}: {patched} titres appliqués')

if __name__ == '__main__':
    main()
