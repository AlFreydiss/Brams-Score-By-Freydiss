"""
Cog — /duel  ⚔️
• Carte PNG avec image personnage en fond sur chaque côté (Giphy still)
• Balance serrée 45–55 % — force le vrai débat communautaire
• Sondage réactions pour que la communauté tranche
"""
from __future__ import annotations

import asyncio
import io
import logging
import math
import os
import random
import re
import urllib.parse

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands
from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)

GIPHY_KEY     = os.getenv("GIPHY_API_KEY", "")
_gif_cache:   dict[str, str]   = {}
_still_cache: dict[str, bytes] = {}

_FB = "Bangers-Regular.ttf"
_FK = "KOMIKAX_.ttf"
_FR = "Righteous-Regular.ttf"

# ── Canvas constants ──────────────────────────────────────────────
W, H   = 960, 520
HALF   = W // 2
TOP_H  = 44
BTM_H  = 128
BTM_Y  = H - BTM_H   # 392


# ══════════════════════════════════════════════════════════════════
#  PERSONNAGES
# ══════════════════════════════════════════════════════════════════
CHARS: dict[str, dict] = {
    "luffy":    {"display": "Monkey D. Luffy",   "query": "luffy gear fifth one piece",          "univers": "One Piece",              "titre": "Roi des Pirates",           "color": (255, 130,   0)},
    "zoro":     {"display": "Roronoa Zoro",       "query": "zoro one piece three swords",         "univers": "One Piece",              "titre": "Premier Épéiste du Monde",  "color": ( 40, 190,  70)},
    "sanji":    {"display": "Sanji",              "query": "sanji ifrit jambe one piece",         "univers": "One Piece",              "titre": "Cuisinier du Diable",       "color": (210, 210,   0)},
    "naruto":   {"display": "Naruto Uzumaki",     "query": "naruto baryon mode fight",             "univers": "Naruto",                 "titre": "Septieme Hokage",           "color": (255, 100,   0)},
    "sasuke":   {"display": "Sasuke Uchiha",      "query": "sasuke rinnegan sharingan fight",      "univers": "Naruto",                 "titre": "Ninja de l Ombre",          "color": (120,   0, 220)},
    "kakashi":  {"display": "Kakashi Hatake",     "query": "kakashi lightning blade fight",        "univers": "Naruto",                 "titre": "Copieur de Mille Jutsu",    "color": (130, 180, 255)},
    "goku":     {"display": "Son Goku",           "query": "goku ultra instinct dragon ball",      "univers": "Dragon Ball",            "titre": "Ultra Instinct Maitrise",   "color": (255, 215,   0)},
    "vegeta":   {"display": "Vegeta",             "query": "vegeta ultra ego dragon ball",         "univers": "Dragon Ball",            "titre": "Prince des Saiyans",        "color": (170,   0, 255)},
    "ichigo":   {"display": "Ichigo Kurosaki",    "query": "ichigo bleach final form bankai",      "univers": "Bleach",                 "titre": "Substitute Shinigami",      "color": (255,  60,  60)},
    "aizen":    {"display": "Sosuke Aizen",       "query": "aizen bleach final form",              "univers": "Bleach",                 "titre": "Seigneur des Arrancar",     "color": (190, 160, 255)},
    "saitama":  {"display": "Saitama",            "query": "saitama serious punch hero",           "univers": "One Punch Man",          "titre": "Heros par Loisir",          "color": (255, 230,  80)},
    "mob":      {"display": "Shigeo Kageyama",    "query": "mob psycho 100 percent power",         "univers": "Mob Psycho 100",         "titre": "100% Psychique",            "color": (170, 170, 255)},
    "tanjiro":  {"display": "Tanjiro Kamado",     "query": "tanjiro sun breathing demon slayer",   "univers": "Demon Slayer",           "titre": "Danse du Dieu du Feu",      "color": (  0, 170, 220)},
    "rengoku":  {"display": "Kyojuro Rengoku",    "query": "rengoku flame hashira demon slayer",   "univers": "Demon Slayer",           "titre": "Pilier de la Flamme",       "color": (255,  90,   0)},
    "eren":     {"display": "Eren Yeager",        "query": "eren founding titan attack on titan",  "univers": "Attaque des Titans",     "titre": "Le Titan Fondateur",        "color": (160,  90,   0)},
    "levi":     {"display": "Levi Ackerman",      "query": "levi ackerman titan fight",            "univers": "Attaque des Titans",     "titre": "Le Soldat le Plus Fort",    "color": (140, 195, 200)},
    "gojo":     {"display": "Satoru Gojo",        "query": "gojo satoru hollow purple",            "univers": "Jujutsu Kaisen",         "titre": "Le Plus Fort du Monde",     "color": ( 80, 190, 255)},
    "sukuna":   {"display": "Ryomen Sukuna",      "query": "sukuna malevolent shrine jujutsu",     "univers": "Jujutsu Kaisen",         "titre": "Roi des Fleaux",            "color": (210,   0,  40)},
    "meliodas": {"display": "Meliodas",           "query": "meliodas assault mode deadly sins",    "univers": "Nanatsu no Taizai",      "titre": "Dragon Sin of Wrath",       "color": (255,  70,  70)},
    "natsu":    {"display": "Natsu Dragneel",     "query": "natsu dragneel fire dragon slayer",    "univers": "Fairy Tail",             "titre": "Dragon Slayer du Feu",      "color": (255,  70,   0)},
    "edward":   {"display": "Edward Elric",       "query": "edward elric alchemy fight",           "univers": "Fullmetal Alchemist",    "titre": "Alchimiste de Metal",       "color": (210, 170,   0)},
    "gintoki":  {"display": "Gintoki Sakata",     "query": "gintoki white demon gintama",          "univers": "Gintama",                "titre": "Samourai du Ciel",          "color": (200, 200, 255)},
    "giorno":   {"display": "Giorno Giovanna",    "query": "giorno gold experience requiem jojo",  "univers": "JoJo Bizarre Adventure", "titre": "Capo di Passione",          "color": (255, 170, 190)},
}

_RIVALRIES = [
    "Niveau identique — aucun favori. Tranchez !",
    "Deux monstres, une seule question : lequel ?",
    "Le debat dure depuis des annees. Votez.",
    "Meme puissance, meme volonte — qui cede en premier ?",
    "Aucun expert ne s accorde. La communaute decide.",
    "Les deux sont a leur pic absolu. Qui reste debout ?",
    "Ce combat n a pas de reponse evidente. A vous.",
    "L univers entier est divise sur ce duel.",
    "A forces egales, c est la volonte qui tranche.",
    "Legendes vivantes — l une d elles doit tomber.",
]

_VERDICTS = [
    "VOTE DECISIF — TROP SERRE",
    "ULTRA PROCHE — A VOUS !",
    "LE DEBAT EST OUVERT",
    "IMPOSSIBLE A TRANCHER",
    "COMMUNAUTE : VOTEZ !",
    "MATCH INDECIS",
    "TROP PROCHE — VOTEZ",
    "VOUS DECIDEZ !",
]


# ══════════════════════════════════════════════════════════════════
#  GIPHY — GIF URL + still PNG bytes
# ══════════════════════════════════════════════════════════════════

async def _fetch_char_assets(
    session: aiohttp.ClientSession, query: str
) -> tuple[str, bytes | None]:
    if query in _gif_cache:
        return _gif_cache[query], _still_cache.get(query)
    if not GIPHY_KEY:
        return "", None
    params = urllib.parse.urlencode({"api_key": GIPHY_KEY, "q": query,
                                     "limit": "5", "rating": "g", "lang": "en"})
    try:
        async with session.get(f"https://api.giphy.com/v1/gifs/search?{params}",
                               timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                return "", None
            data = await r.json()
        items = data.get("data", [])
        if not items:
            return "", None
        item    = random.choice(items[:3])
        gif_url = item["images"]["original"]["url"]
        _gif_cache[query] = gif_url

        still_url = (
            (item["images"].get("original_still") or
             item["images"].get("fixed_height_still") or
             item["images"].get("downsized_still") or {}).get("url", "")
        )
        still_b = None
        if still_url:
            try:
                async with session.get(still_url, timeout=aiohttp.ClientTimeout(total=6)) as r2:
                    if r2.status == 200:
                        still_b = await r2.read()
                        _still_cache[query] = still_b
            except Exception as e:
                log.warning("[DuelCog] still(%s): %s", query, e)
        return gif_url, still_b
    except Exception as exc:
        log.warning("[DuelCog] Giphy(%s): %s", query, exc)
        return "", None


# ══════════════════════════════════════════════════════════════════
#  PIL HELPERS
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]+", flags=re.UNICODE)

def _clean(t: str) -> str:
    return _EMOJI_RE.sub("", t).strip()

def _f(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:    return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

def _rr(draw, xy, r=6, fill=None, outline=None, width=1):
    try:    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)
    except: draw.rectangle(xy, fill=fill, outline=outline)

def _stroke(draw, pos, text, font, fill, sc=(0, 0, 0), sw=3, anchor="mm"):
    try:
        draw.text(pos, text, font=font, fill=fill,
                  stroke_width=sw, stroke_fill=sc, anchor=anchor)
    except TypeError:
        x, y = pos
        for dx in range(-sw, sw + 1):
            for dy in range(-sw, sw + 1):
                if dx or dy:
                    draw.text((x+dx, y+dy), text, font=font, fill=sc, anchor=anchor)
        draw.text(pos, text, font=font, fill=fill, anchor=anchor)

def _tw(draw, text, font) -> int:
    try:
        b = draw.textbbox((0, 0), text, font=font)
        return b[2] - b[0]
    except:
        return len(text) * (font.size if hasattr(font, "size") else 8)


# ══════════════════════════════════════════════════════════════════
#  DESSIN — FOND PERSONNAGE
# ══════════════════════════════════════════════════════════════════

def _apply_char_image(canvas: Image.Image, still_b: bytes | None,
                      side: str, color: tuple, display: str = "") -> None:
    x0 = 0    if side == "left" else HALF
    x1 = HALF if side == "left" else W
    y0, y1   = TOP_H, BTM_Y
    zw, zh   = x1 - x0, y1 - y0
    cx       = (x0 + x1) // 2
    cy       = (y0 + y1) // 2
    r, g, b  = color

    img_ok = False
    # ── Image personnage en fond ──────────────────────────────────
    if still_b:
        try:
            img = Image.open(io.BytesIO(still_b)).convert("RGBA")
            iw, ih  = img.size
            scale   = max(zw / iw, zh / ih)
            nw, nh  = int(iw * scale), int(ih * scale)
            img     = img.resize((nw, nh), Image.LANCZOS)
            left = (nw - zw) // 2
            top  = int((nh - zh) * 0.15)
            img  = img.crop((left, top, left + zw, top + zh))
            dark = Image.new("RGBA", (zw, zh), (0, 0, 0, 145))
            img.alpha_composite(dark)
            canvas.paste(img, (x0, y0), img)
            img_ok = True
        except Exception as e:
            log.warning("[DuelCog] img composite(%s): %s", side, e)

    # ── Fallback visuel si pas d'image ────────────────────────────
    if not img_ok:
        # Aura radiale colorée
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        for rad in range(220, 0, -14):
            a = int(72 * (1 - rad / 220) ** 1.6)
            od.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=(r, g, b, a))
        canvas.alpha_composite(ov)
        # Lettre fantôme
        letter = _clean(display)[0].upper() if display else "?"
        draw = ImageDraw.Draw(canvas)
        draw.text((cx, cy - 10), letter,
                  fill=(r // 6, g // 6, b // 6), font=_f(_FK, 230), anchor="mm")
        # Speed lines
        sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sl)
        for _ in range(14):
            angle  = random.uniform(0, 2 * math.pi)
            length = random.randint(160, 300)
            x2 = cx + int(math.cos(angle) * length)
            y2 = cy + int(math.sin(angle) * length)
            sd.line([(cx, cy), (x2, y2)],
                    fill=(r // 3, g // 3, b // 3, random.randint(18, 50)),
                    width=random.choice([1, 1, 2]))
        canvas.alpha_composite(sl)

    # ── Overlay couleur atmosphérique ────────────────────────────
    r, g, b = color
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rectangle([x0, y0, x1, y1], fill=(r, g, b, 26))
    canvas.alpha_composite(ov)

    # ── Vignette bord extérieur ───────────────────────────────────
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd  = ImageDraw.Draw(vig)
    for i in range(60):
        a = int(130 * (i / 60) ** 1.8)
        if side == "left":
            vd.line([(x0 + i, y0), (x0 + i, y1)], fill=(0, 0, 0, a))
        else:
            vd.line([(x1 - i - 1, y0), (x1 - i - 1, y1)], fill=(0, 0, 0, a))
    canvas.alpha_composite(vig)

    # ── Fondu haut / bas ─────────────────────────────────────────
    fade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd   = ImageDraw.Draw(fade)
    fh   = 50
    for i in range(fh):
        a = int(200 * ((1 - i / fh) ** 2))
        fd.line([(x0, y0 + i),     (x1, y0 + i)],     fill=(0, 0, 0, a))
        fd.line([(x0, y1 - i - 1), (x1, y1 - i - 1)], fill=(0, 0, 0, a))
    canvas.alpha_composite(fade)


# ══════════════════════════════════════════════════════════════════
#  DESSIN — TEXTE PERSONNAGE
# ══════════════════════════════════════════════════════════════════

def _draw_char_text(canvas: Image.Image, side: str, d: dict) -> None:
    x0 = 0    if side == "left" else HALF
    x1 = HALF if side == "left" else W
    cx = (x0 + x1) // 2

    # Gradient sombre derrière le texte
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(grad)
    for i in range(110):
        a = int(215 * (i / 110) ** 0.65)
        gd.line([(x0, BTM_Y - 110 + i), (x1, BTM_Y - 110 + i)], fill=(0, 0, 0, a))
    canvas.alpha_composite(grad)

    draw = ImageDraw.Draw(canvas)

    # Nom (grand, stroke épais)
    _stroke(draw, (cx, BTM_Y - 74), _clean(d["display"]).upper(),
            _f(_FK, 42), fill=(255, 255, 255), sc=(0, 0, 0), sw=4)

    # Titre
    draw.text((cx, BTM_Y - 44), _clean(d["titre"]),
              fill=(200, 200, 200), font=_f(_FR, 14), anchor="mm")

    # Badge univers
    f_univ = _f(_FR, 11)
    utext  = _clean(d["univers"]).upper()
    tw     = _tw(draw, utext, f_univ)
    bw, bh = tw + 22, 18
    bx     = cx - bw // 2
    by     = BTM_Y - 28
    _rr(draw, [bx, by, bx + bw, by + bh], r=4,
        fill=(8, 8, 14, 210), outline=d["color"], width=1)
    draw.text((cx, by + bh // 2), utext, fill=d["color"], font=f_univ, anchor="mm")


# ══════════════════════════════════════════════════════════════════
#  DESSIN — SÉPARATEUR DIAGONAL + VS BADGE
# ══════════════════════════════════════════════════════════════════

def _draw_diagonal_split(canvas: Image.Image) -> None:
    LEAN = 18
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    for hw, fill in [
        (38, (0,   0,   0,   225)),
        (18, (80,  28,  0,   195)),
        ( 8, (230, 100,  8,  235)),
        ( 2, (255, 228, 155, 255)),
    ]:
        d.polygon([
            (HALF - LEAN - hw, TOP_H), (HALF - LEAN + hw, TOP_H),
            (HALF + LEAN + hw, BTM_Y), (HALF + LEAN - hw, BTM_Y),
        ], fill=fill)
    canvas.alpha_composite(ov)


def _draw_vs_badge(canvas: Image.Image) -> None:
    cx = HALF
    cy = TOP_H + (BTM_Y - TOP_H) // 2

    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)

    # Halo rouge
    for rad in range(85, 0, -8):
        a = int(160 * (1 - rad / 85) ** 1.5)
        d.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=(195, 8, 8, a))

    # Hexagone fond
    R = 54
    pts = [(cx + int(R * math.cos(math.radians(60*i - 30))),
            cy + int(R * math.sin(math.radians(60*i - 30)))) for i in range(6)]
    d.polygon(pts, fill=(10, 6, 14, 252))

    # Bordure hex rouge vif
    for i in range(6):
        p1 = (cx + int((R+3)*math.cos(math.radians(60*i - 30))),
              cy + int((R+3)*math.sin(math.radians(60*i - 30))))
        p2 = (cx + int((R+3)*math.cos(math.radians(60*(i+1) - 30))),
              cy + int((R+3)*math.sin(math.radians(60*(i+1) - 30))))
        d.line([p1, p2], fill=(220, 18, 18, 255), width=3)

    # Étincelles dorées
    for i in range(8):
        angle = math.radians(i * 45 + 22.5)
        r1 = R + 7
        r2 = R + random.randint(18, 30)
        d.line([(cx + int(r1*math.cos(angle)), cy + int(r1*math.sin(angle))),
                (cx + int(r2*math.cos(angle)), cy + int(r2*math.sin(angle)))],
               fill=(255, 195, 0, 235), width=2)

    canvas.alpha_composite(ov)

    _stroke(ImageDraw.Draw(canvas), (cx, cy), "VS", _f(_FB, 58),
            fill=(255, 252, 250), sc=(120, 0, 0), sw=4)


# ══════════════════════════════════════════════════════════════════
#  DESSIN — BANNIÈRE HAUT + BARRE BAS
# ══════════════════════════════════════════════════════════════════

def _draw_top_banner(canvas: Image.Image, rivalry: str) -> None:
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, 0, W, TOP_H], fill=(4, 3, 8, 235))
    d.line([(0, TOP_H), (W, TOP_H)], fill=(160, 38, 0, 210), width=1)
    canvas.alpha_composite(ov)
    ImageDraw.Draw(canvas).text((HALF, TOP_H // 2), _clean(rivalry),
                                fill=(175, 170, 140), font=_f(_FR, 13), anchor="mm")


def _draw_bottom_bar(canvas: Image.Image,
                     d1: dict, pct1: int,
                     d2: dict, pct2: int,
                     verdict: str) -> None:
    # Fond barre basse
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, BTM_Y, W, H], fill=(4, 3, 8, 238))
    d.line([(0, BTM_Y), (W, BTM_Y)], fill=(160, 38, 0, 215), width=2)
    canvas.alpha_composite(ov)

    draw  = ImageDraw.Draw(canvas)
    BAR_H = 14
    BAR_Y = BTM_Y + 18
    PAD   = 28
    bar_w = HALF - PAD - 14

    def _bar(side: str, pct: int, color: tuple) -> None:
        if side == "left":
            bx0, bx1 = PAD, PAD + bar_w
            _rr(draw, [bx0, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=(18, 18, 26))
            fw = int(bar_w * pct / 100)
            if fw > 4:
                _rr(draw, [bx0, BAR_Y, bx0 + fw, BAR_Y + BAR_H], r=5, fill=color)
                r, g, b = color
                _rr(draw, [bx0+2, BAR_Y+2, bx0+fw-2, BAR_Y+BAR_H//2], r=3,
                    fill=(min(255,r+70), min(255,g+70), min(255,b+70)))
            draw.text((bx1 + 8, BAR_Y + BAR_H//2), f"{pct}%",
                      fill=(215,215,215), font=_f(_FR,12), anchor="lm")
        else:
            bx0, bx1 = HALF + 14 + PAD, W - PAD
            _rr(draw, [bx0, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=(18, 18, 26))
            fw = int(bar_w * pct / 100)
            if fw > 4:
                _rr(draw, [bx1 - fw, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=color)
                r, g, b = color
                _rr(draw, [bx1-fw+2, BAR_Y+2, bx1-2, BAR_Y+BAR_H//2], r=3,
                    fill=(min(255,r+70), min(255,g+70), min(255,b+70)))
            draw.text((bx0 - 8, BAR_Y + BAR_H//2), f"{pct}%",
                      fill=(215,215,215), font=_f(_FR,12), anchor="rm")

    _bar("left",  pct1, d1["color"])
    _bar("right", pct2, d2["color"])

    f_nm = _f(_FR, 13)
    draw.text((PAD,    BAR_Y + BAR_H + 9), _clean(d1["display"]),
              fill=d1["color"], font=f_nm, anchor="lm")
    draw.text((W-PAD,  BAR_Y + BAR_H + 9), _clean(d2["display"]),
              fill=d2["color"], font=f_nm, anchor="rm")

    sep_y = BTM_Y + 60
    draw.line([(PAD, sep_y), (W - PAD, sep_y)], fill=(32, 32, 46), width=1)

    _stroke(draw, (HALF, BTM_Y + 86), _clean(verdict), _f(_FB, 26),
            fill=(255, 215, 50), sc=(55, 28, 0), sw=2)

    draw.text((HALF, H - 9), "BRAMS SCORE  •  DUEL ARENA",
              fill=(46, 46, 58), font=_f(_FR, 10), anchor="mm")


# ══════════════════════════════════════════════════════════════════
#  CONSTRUCTION CARTE
# ══════════════════════════════════════════════════════════════════

def _build_card(
    d1: dict, still1: bytes | None, pct1: int,
    d2: dict, still2: bytes | None, pct2: int,
    rivalry: str, verdict: str,
) -> io.BytesIO:
    canvas = Image.new("RGBA", (W, H), (6, 5, 10, 255))

    # Fond sombre avec légère profondeur centrale
    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        t = max(0.0, 1.0 - abs(y / H - 0.44) * 2.1)
        draw.line([(0, y), (W, y)], fill=(int(28*t), int(4*t), int(7*t), 255))

    _apply_char_image(canvas, still1, "left",  d1["color"], d1["display"])
    _apply_char_image(canvas, still2, "right", d2["color"], d2["display"])
    _draw_diagonal_split(canvas)
    _draw_vs_badge(canvas)
    _draw_char_text(canvas, "left",  d1)
    _draw_char_text(canvas, "right", d2)
    _draw_top_banner(canvas, rivalry)
    _draw_bottom_bar(canvas, d1, pct1, d2, pct2, verdict)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, "PNG", optimize=True)
    buf.seek(0)
    return buf


# ══════════════════════════════════════════════════════════════════
#  COG
# ══════════════════════════════════════════════════════════════════

class DuelCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="duel",
        description="⚔️ Duel épique entre deux personnages anime tirés au sort !",
    )
    async def duel(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        try:
            k1, k2 = random.sample(list(CHARS.keys()), 2)
            d1, d2  = CHARS[k1], CHARS[k2]

            # Balance ultra-serrée — vrai débat
            raw  = random.choices([50, 51, 52, 53, 54, 55],
                                   weights=[25, 22, 20, 16, 11, 6])[0]
            pct1 = raw if random.random() > 0.5 else 100 - raw
            pct2 = 100 - pct1

            rivalry = random.choice(_RIVALRIES)
            verdict = random.choice(_VERDICTS)

            async with aiohttp.ClientSession() as sess:
                (url1, still1), (url2, still2) = await asyncio.gather(
                    _fetch_char_assets(sess, d1["query"]),
                    _fetch_char_assets(sess, d2["query"]),
                )

            loop = asyncio.get_running_loop()
            buf  = await loop.run_in_executor(
                None,
                lambda: _build_card(d1, still1, pct1, d2, still2, pct2, rivalry, verdict),
            )

            main = discord.Embed(title="⚔️  D U E L   É P I Q U E  ⚔️", color=0xE63939)
            main.description = (
                f"### {d1['display']}  `VS`  {d2['display']}\n"
                f"*{rivalry}*"
            )
            main.set_image(url="attachment://duel.png")
            main.set_footer(text="⚔️ Brams Score • Duel Arena  |  /duel pour rejouer !")
            main.timestamp = discord.utils.utcnow()

            embeds = [main]
            if url1:
                e1 = discord.Embed(title=f"🔴  {d1['display']}", color=0xFF4500)
                e1.set_image(url=url1)
                embeds.append(e1)
            if url2:
                e2 = discord.Embed(title=f"🔵  {d2['display']}", color=0x1E90FF)
                e2.set_image(url=url2)
                embeds.append(e2)

            await interaction.followup.send(
                file=discord.File(buf, filename="duel.png"),
                embeds=embeds,
            )

            poll = discord.Embed(
                title="🗳️  QUI VA GAGNER ?  Votez !",
                description=(
                    f"🔴  **{d1['display']}**  *({d1['univers']})*\n"
                    f"🔵  **{d2['display']}**  *({d2['univers']})*\n\n"
                    f"**Votez ci-dessous — le debat est ouvert !**"
                ),
                color=0x2B2D31,
            )
            poll.set_footer(text="⚔️ Le vote est ouvert — que le meilleur gagne !")
            poll_msg = await interaction.channel.send(embed=poll)
            await poll_msg.add_reaction("🔴")
            await poll_msg.add_reaction("🔵")

            log.info("[DuelCog] %s vs %s → %d%%/%d%%",
                     d1["display"], d2["display"], pct1, pct2)

        except Exception as exc:
            log.exception("[DuelCog] Erreur /duel : %s", exc)
            await interaction.followup.send(
                "❌ Erreur lors du duel. Réessaie dans quelques secondes.",
                ephemeral=True,
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
