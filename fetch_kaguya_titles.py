# -*- coding: utf-8 -*-
# Titres d'épisodes Kaguya via Jikan (MyAnimeList) — S1 37999, S2 40591, S3 43608
import urllib.request, json, time

IDS = {'S01': 37999, 'S02': 40591, 'S03': 43608}
for season, mid in IDS.items():
    url = f'https://api.jikan.moe/v4/anime/{mid}/episodes'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    data = json.loads(urllib.request.urlopen(req, timeout=20).read())['data']
    print(f'=== {season} ({len(data)}) ===')
    for e in data:
        print(f"{e['mal_id']}. {e['title']}")
    time.sleep(1.5)
