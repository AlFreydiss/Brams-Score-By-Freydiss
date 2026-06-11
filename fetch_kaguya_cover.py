# -*- coding: utf-8 -*-
# Affiche AniList de Kaguya-sama (S1, id 101921) -> R2 anime/kaguya/cover.jpg
import urllib.request, json, boto3
from botocore.config import Config
from pathlib import Path

q = json.dumps({"query": "{ Media(id:101921){ coverImage{ extraLarge } bannerImage } }"})
req = urllib.request.Request('https://graphql.anilist.co', data=q.encode(),
                             headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
d = json.loads(urllib.request.urlopen(req, timeout=20).read())['data']['Media']
print('cover:', d['coverImage']['extraLarge'])
print('banner:', d['bannerImage'])

env = {}
for line in Path(r'C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss\.env.upload').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
s3 = boto3.client('s3', endpoint_url='https://166b8357e5229b31a88cf104058ed5ee.r2.cloudflarestorage.com',
                  aws_access_key_id=env['R2_ACCESS_KEY'], aws_secret_access_key=env['R2_SECRET_KEY'],
                  config=Config(signature_version='s3v4'), region_name='auto')
for url, key in [(d['coverImage']['extraLarge'], 'anime/kaguya/cover.jpg')]:
    if not url:
        continue
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
    s3.put_object(Bucket='bramscore', Key=key, Body=data, ContentType='image/jpeg')
    print('up', key, len(data) // 1024, 'Ko')
