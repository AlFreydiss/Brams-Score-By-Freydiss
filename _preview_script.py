import sys; sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image, ImageDraw, ImageFont
import os

def _cit_font(name, size):
    if os.path.exists(name):
        return ImageFont.truetype(name, size)
    return ImageFont.load_default()

_CF_QUOTE  = _cit_font("CormorantGaramond-Italic.ttf", 44)
_CF_NAME   = _cit_font("CormorantGaramond-Bold.ttf",   46)
_CF_SERIE  = _cit_font("Rajdhani-Light.ttf",           15)
_CF_WM     = _cit_font("Rajdhani-SemiBold.ttf",        14)
_CF_QMARK  = _cit_font("CormorantGaramond-Italic.ttf", 120)

GOLD   = (212, 175, 55)
IVORY  = (248, 243, 230)
MARGIN = 52
W, H   = 1024, 512

# Charger le GIF de Thorfinn (première frame)
gif = Image.open("thorfinnn citation.gif")
gif.seek(0)
frame = gif.convert("RGBA").resize((W, H))

mask = Image.new("L", (W, H), 255)
dm = ImageDraw.Draw(mask)
FADE_S = int(H * 0.42)
FADE_E = int(H * 0.80)
for y in range(FADE_S, H):
    t = (y - FADE_S) / (FADE_E - FADE_S) if y < FADE_E else 1
    dm.line([(0, y), (W, y)], fill=max(0, int(255 * (1 - t * t))))

bg = Image.new("RGBA", (W, H), (5, 5, 12, 255))
bg.paste(frame, mask=mask)

overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)

# Gradient horizontal
GRAD_W = int(W * 0.62)
for x in range(GRAD_W):
    t = 1 - (x / GRAD_W) ** 1.6
    d.line([(x, 0), (x, H)], fill=(4, 4, 12, int(205 * t)))

# Vignettes haut/bas
for i in range(40):
    t = ((40 - i) / 40) ** 2
    d.line([(0, i), (W, i)], fill=(0, 0, 0, int(70 * t)))
    d.line([(0, H - 1 - i), (W, H - 1 - i)], fill=(0, 0, 0, int(90 * t)))

# Watermark
WM = "BRAMS COMMUNITY"
wm_bb = d.textbbox((0, 0), WM, font=_CF_WM)
d.text((W - (wm_bb[2] - wm_bb[0]) - 20, 16), WM, font=_CF_WM, fill=(255, 255, 255, 22))

citation = "Un vrai guerrier n'a pas besoin d'ennemis."
perso    = "Thorfinn"
serie    = "Vinland Saga"

TEXT_ZONE_W = int(W * 0.50)
words, lines, cur = citation.split(), [], ""
for word in words:
    test = (cur + " " + word).strip()
    bb = d.textbbox((0, 0), test, font=_CF_QUOTE)
    if bb[2] - bb[0] <= TEXT_ZONE_W:
        cur = test
    else:
        if cur: lines.append(cur)
        cur = word
    if len(lines) == 4:
        cur = ""; break
if cur and len(lines) < 4: lines.append(cur)

qm_bb    = d.textbbox((0, 0), "“", font=_CF_QMARK)
qm_h     = qm_bb[3] - qm_bb[1]
name_bb  = d.textbbox((0, 0), perso, font=_CF_NAME)
name_h   = name_bb[3] - name_bb[1]
serie_bb = d.textbbox((0, 0), "  ".join(serie.upper()), font=_CF_SERIE)
serie_h  = serie_bb[3] - serie_bb[1]

LINE_H = 56; n = len(lines)
GAP_QM_TEXT = 4; GAP_TEXT_SEP = 22; GAP_SEP_NAME = 14; GAP_NAME_SER = 10

total_h = qm_h + GAP_QM_TEXT + n * LINE_H + GAP_TEXT_SEP + 2 + GAP_SEP_NAME + name_h + GAP_NAME_SER + serie_h
block_y = max(28, (H - total_h) // 2)
cur_y = block_y

d.rectangle([(MARGIN - 8, cur_y + 10), (MARGIN - 6, block_y + total_h)], fill=(*GOLD, 70))

d.text((MARGIN, cur_y), "“", font=_CF_QMARK, fill=(*GOLD, 230))
cur_y += qm_h + GAP_QM_TEXT

for i, line in enumerate(lines):
    y = cur_y + i * LINE_H
    d.text((MARGIN + 2, y + 2), line, font=_CF_QUOTE, fill=(0, 0, 0, 110))
    d.text((MARGIN, y), line, font=_CF_QUOTE, fill=(*IVORY, 245))
cur_y += n * LINE_H + GAP_TEXT_SEP

d.line([(MARGIN, cur_y),     (MARGIN + 70, cur_y)],     fill=(*GOLD, 210), width=1)
d.line([(MARGIN, cur_y + 4), (MARGIN + 35, cur_y + 4)], fill=(*GOLD, 100), width=1)
cur_y += 2 + GAP_SEP_NAME

d.text((MARGIN + 2, cur_y + 2), perso, font=_CF_NAME, fill=(0, 0, 0, 100))
d.text((MARGIN, cur_y), perso, font=_CF_NAME, fill=(*GOLD, 255))
cur_y += name_h + GAP_NAME_SER

d.text((MARGIN, cur_y), "  ".join(serie.upper()), font=_CF_SERIE, fill=(*GOLD, 145))

bg.paste(overlay, mask=overlay)
bg.save("preview_citation.png")
print("OK")
