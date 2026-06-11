# -*- coding: utf-8 -*-
"""
Dedoublonnage VO/VF : Violet (ep 1-13) et Kaiju n8 — la variante audio passe de
"2e video complete" (mediaSrc) a une piste audio externe m4a (src), deja sur R2.
Durees verifiees identiques a la ms pres (memes encodes source).
"""
import json
from pathlib import Path

PUB='https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
DATA=Path(r'C:\Users\Feydi\Desktop\brams-web-clone\src\data')

def patch(path, fix):
    j=json.loads(path.read_text(encoding='utf-8'))
    n=sum(fix(e) for e in j)
    path.write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf-8')
    print(path.name, ':', n, 'entrees modifiees')

def fix_violet(e):
    changed=False
    for a in e.get('audio') or []:
        ms=a.get('mediaSrc','')
        if '/violet-evergarden-vf/' in ms:
            ep=ms.rsplit('/',1)[-1].replace('.mp4','')
            a.pop('mediaSrc'); a['src']=f'{PUB}/anime/violet-evergarden-audio-fr/{ep}.m4a'
            changed=True
    return changed

def fix_kaiju(e):
    changed=False
    for a in e.get('audio') or []:
        ms=a.get('mediaSrc','')
        if '/anime/kaiju/' in ms and ms.endswith('-vostfr.mp4'):
            num=int(e['episode'])
            a.pop('mediaSrc'); a['src']=f'{PUB}/anime/kaiju-no-8-audio-jp/Ep{num:02d}.m4a'
            changed=True
    return changed

patch(DATA/'violet-evergarden-videos.json', fix_violet)
patch(DATA/'kaiju-videos.json', fix_kaiju)
