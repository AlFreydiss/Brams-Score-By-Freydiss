"""
Cog — /duel  ⚔️
Images personnages via MAL (Jikan) — même système que /citation dans bot.py
"""
from __future__ import annotations

import asyncio
import io
import logging
import math
import random
import re
import sys

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands
from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)

_FB = "Bangers-Regular.ttf"
_FK = "KOMIKAX_.ttf"
_FR = "Righteous-Regular.ttf"

W, H  = 960, 540
HALF  = W // 2
TOP_H = 48
BTM_H = 130
BTM_Y = H - BTM_H   # 410


# ══════════════════════════════════════════════════════════════════
#  PERSONNAGES
# ══════════════════════════════════════════════════════════════════

CHARS: dict[str, dict] = {
    "luffy":    {"display": "Monkey D. Luffy",   "jikan_name": "Monkey D. Luffy",   "jikan_id": 40,     "univers": "One Piece",              "titre": "Roi des Pirates",           "color": (255, 130,   0)},
    "zoro":     {"display": "Roronoa Zoro",       "jikan_name": "Roronoa Zoro",       "jikan_id": 62,     "univers": "One Piece",              "titre": "Premier Epéiste du Monde",  "color": ( 34, 180,  60)},
    "sanji":    {"display": "Sanji",              "jikan_name": "Sanji",              "jikan_id": 305,    "univers": "One Piece",              "titre": "Cuisinier du Diable",       "color": (210, 200,   0)},
    "naruto":   {"display": "Naruto Uzumaki",     "jikan_name": "Naruto Uzumaki",     "jikan_id": 17,     "univers": "Naruto",                 "titre": "Septieme Hokage",           "color": (255, 100,   0)},
    "sasuke":   {"display": "Sasuke Uchiha",      "jikan_name": "Sasuke Uchiha",      "jikan_id": 13,     "univers": "Naruto",                 "titre": "Ninja de l Ombre",          "color": (110,   0, 200)},
    "kakashi":  {"display": "Kakashi Hatake",     "jikan_name": "Kakashi Hatake",     "jikan_id": 85,     "univers": "Naruto",                 "titre": "Copieur de Mille Jutsu",    "color": (130, 180, 255)},
    "goku":     {"display": "Son Goku",           "jikan_name": "Son Goku",           "jikan_id": 246,    "univers": "Dragon Ball",            "titre": "Ultra Instinct",            "color": (255, 215,   0)},
    "vegeta":   {"display": "Vegeta",             "jikan_name": "Vegeta",             "jikan_id": 913,    "univers": "Dragon Ball",            "titre": "Prince des Saiyans",        "color": (160,   0, 240)},
    "ichigo":   {"display": "Ichigo Kurosaki",    "jikan_name": "Ichigo Kurosaki",    "jikan_id": 5,      "univers": "Bleach",                 "titre": "Substitute Shinigami",      "color": (255,  55,  55)},
    "aizen":    {"display": "Sosuke Aizen",       "jikan_name": "Sosuke Aizen",       "jikan_id": 7,      "univers": "Bleach",                 "titre": "Seigneur des Arrancar",     "color": (185, 150, 255)},
    "saitama":  {"display": "Saitama",            "jikan_name": "Saitama",            "jikan_id": 73935,  "univers": "One Punch Man",          "titre": "Héros par Loisir",          "color": (255, 230,  70)},
    "mob":      {"display": "Shigeo Kageyama",    "jikan_name": "Shigeo Kageyama",    "jikan_id": None,   "univers": "Mob Psycho 100",         "titre": "100% Psychique",            "color": (170, 170, 255)},
    "tanjiro":  {"display": "Tanjiro Kamado",     "jikan_name": "Tanjiro Kamado",     "jikan_id": 146156, "univers": "Demon Slayer",           "titre": "Danse du Dieu du Feu",      "color": (  0, 165, 215)},
    "rengoku":  {"display": "Kyojuro Rengoku",    "jikan_name": "Rengoku Kyojuro",    "jikan_id": 151143, "univers": "Demon Slayer",           "titre": "Pilier de la Flamme",       "color": (255,  85,   0)},
    "eren":     {"display": "Eren Yeager",        "jikan_name": "Eren Yeager",        "jikan_id": 40882,  "univers": "Attaque des Titans",     "titre": "Le Titan Fondateur",        "color": (150,  85,   0)},
    "levi":     {"display": "Levi Ackerman",      "jikan_name": "Levi Ackerman",      "jikan_id": 290124, "univers": "Attaque des Titans",     "titre": "Le Soldat le Plus Fort",    "color": (130, 190, 200)},
    "gojo":     {"display": "Satoru Gojo",        "jikan_name": "Gojo Satoru",        "jikan_id": 164471, "univers": "Jujutsu Kaisen",         "titre": "Le Plus Fort du Monde",     "color": ( 70, 185, 255)},
    "sukuna":   {"display": "Ryomen Sukuna",      "jikan_name": "Ryomen Sukuna",      "jikan_id": 160116, "univers": "Jujutsu Kaisen",         "titre": "Roi des Fléaux",            "color": (200,   0,  35)},
    "meliodas": {"display": "Meliodas",           "jikan_name": "Meliodas",           "jikan_id": None,   "univers": "Nanatsu no Taizai",      "titre": "Dragon Sin of Wrath",       "color": (255,  65,  65)},
    "natsu":    {"display": "Natsu Dragneel",     "jikan_name": "Natsu Dragneel",     "jikan_id": 5187,   "univers": "Fairy Tail",             "titre": "Dragon Slayer du Feu",      "color": (255,  65,   0)},
    "edward":   {"display": "Edward Elric",       "jikan_name": "Edward Elric",       "jikan_id": 11,     "univers": "Fullmetal Alchemist",    "titre": "Alchimiste de Métal",       "color": (210, 165,   0)},
    "gintoki":  {"display": "Gintoki Sakata",     "jikan_name": "Gintoki Sakata",     "jikan_id": None,   "univers": "Gintama",                "titre": "Samourai du Ciel",          "color": (200, 200, 255)},
    "giorno":   {"display": "Giorno Giovanna",    "jikan_name": "Giorno Giovanna",    "jikan_id": 10529,  "univers": "JoJo Bizarre Adventure", "titre": "Capo di Passione",          "color": (255, 165, 185)},
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

# Cache URL par jikan_name
_URL_CACHE: dict[str, str | None] = {}
# Cache bytes PIL par jikan_name
_BYTES_CACHE: dict[str, bytes | None] = {}


# ══════════════════════════════════════════════════════════════════
#  IMAGE — URL via bot.py, bytes téléchargés séparément
# ══════════════════════════════════════════════════════════════════

def _inject_jikan_id(jikan_name: str, jikan_id: int | None) -> None:
    bot_mod = sys.modules.get("bot")
    if bot_mod and jikan_id is not None:
        jids = getattr(bot_mod, "CHAR_JIKAN_IDS", {})
        if jikan_name not in jids:
            jids[jikan_name] = jikan_id


async def _get_image_url(jikan_name: str, jikan_id: int | None) -> str | None:
    """Retourne l'URL MAL du personnage (pas de download, juste l'URL)."""
    if jikan_name in _URL_CACHE:
        return _URL_CACHE[jikan_name]
    _inject_jikan_id(jikan_name, jikan_id)
    bot_mod = sys.modules.get("bot")
    url = None
    if bot_mod:
        try:
            url = await bot_mod._get_char_image_url(jikan_name)
        except Exception as e:
            log.warning("[Duel] _get_char_image_url(%s): %s", jikan_name, e)
    _URL_CACHE[jikan_name] = url
    return url


async def _download_bytes(url: str) -> bytes | None:
    """Télécharge les bytes d'une image depuis son URL (pour PIL card)."""
    if url in _BYTES_CACHE:
        return _BYTES_CACHE[url]
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=7)) as r:
                if r.status == 200:
                    raw = await r.read()
                    _BYTES_CACHE[url] = raw
                    return raw
    except Exception as e:
        log.warning("[Duel] download_bytes(%s): %s", url, e)
    _BYTES_CACHE[url] = None
    return None


# ══════════════════════════════════════════════════════════════════
#  PIL HELPERS
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]+", flags=re.UNICODE)

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

def _apply_char_image(canvas: Image.Image, img_b: bytes | None,
                      side: str, color: tuple, display: str = "") -> None:
    x0 = 0    if side == "left" else HALF
    x1 = HALF if side == "left" else W
    y0, y1 = TOP_H, BTM_Y
    zw, zh  = x1 - x0, y1 - y0
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    r, g, b = color

    img_ok = False
    if img_b:
        try:
            img = Image.open(io.BytesIO(img_b)).convert("RGBA")
            iw, ih = img.size
            scale  = max(zw / iw, zh / ih)
            nw, nh = int(iw * scale), int(ih * scale)
            img    = img.resize((nw, nh), Image.LANCZOS)
            # Portrait MAL : aligner en haut pour garder le visage
            left = max(0, (nw - zw) // 2)
            top  = 0
            img  = img.crop((left, top, left + zw, top + zh))
            # Assombrissement modéré pour lisibilité du texte
            dark = Image.new("RGBA", (zw, zh), (0, 0, 0, 110))
            img.alpha_composite(dark)
            canvas.paste(img, (x0, y0), img)
            img_ok = True
        except Exception as e:
            log.warning("[Duel] img composite(%s): %s", side, e)

    if not img_ok:
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        for rad in range(220, 0, -14):
            a = int(80 * (1 - rad / 220) ** 1.6)
            od.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=(r, g, b, a))
        canvas.alpha_composite(ov)
        letter = _clean(display)[0].upper() if display else "?"
        draw = ImageDraw.Draw(canvas)
        draw.text((cx, cy - 10), letter,
                  fill=(r // 6, g // 6, b // 6), font=_f(_FK, 230), anchor="mm")

    # Overlay couleur atmosphérique léger
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rectangle([x0, y0, x1, y1], fill=(r, g, b, 22))
    canvas.alpha_composite(ov)

    # Vignette bord extérieur
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd  = ImageDraw.Draw(vig)
    steps = 70
    for i in range(steps):
        a = int(140 * (i / steps) ** 1.8)
        stripe = [x0 + i, y0, x0 + i + 1, y1] if side == "left" else [x1 - i - 1, y0, x1 - i, y1]
        vd.rectangle(stripe, fill=(0, 0, 0, a))
    canvas.alpha_composite(vig)

    # Fondu haut / bas
    fade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd   = ImageDraw.Draw(fade)
    fh   = 55
    for i in range(fh):
        a = int(210 * ((1 - i / fh) ** 2))
        fd.rectangle([x0, y0 + i, x1, y0 + i + 1], fill=(0, 0, 0, a))
        fd.rectangle([x0, y1 - i - 1, x1, y1 - i], fill=(0, 0, 0, a))
    canvas.alpha_composite(fade)


# ══════════════════════════════════════════════════════════════════
#  DESSIN — TEXTE PERSONNAGE
# ══════════════════════════════════════════════════════════════════

def _draw_char_text(canvas: Image.Image, side: str, d: dict) -> None:
    x0 = 0    if side == "left" else HALF
    x1 = HALF if side == "left" else W
    cx = (x0 + x1) // 2

    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(grad)
    for i in range(120):
        a = int(230 * (i / 120) ** 0.6)
        gd.line([(x0, BTM_Y - 120 + i), (x1, BTM_Y - 120 + i)], fill=(0, 0, 0, a))
    canvas.alpha_composite(grad)

    draw = ImageDraw.Draw(canvas)

    _stroke(draw, (cx, BTM_Y - 76), _clean(d["display"]).upper(),
            _f(_FK, 44), fill=(255, 255, 255), sc=(0, 0, 0), sw=4)

    draw.text((cx, BTM_Y - 44), _clean(d["titre"]),
              fill=(205, 205, 205), font=_f(_FR, 14), anchor="mm")

    f_univ = _f(_FR, 11)
    utext  = _clean(d["univers"]).upper()
    tw     = _tw(draw, utext, f_univ)
    bw, bh = tw + 24, 19
    bx     = cx - bw // 2
    by     = BTM_Y - 28
    _rr(draw, [bx, by, bx + bw, by + bh], r=4,
        fill=(8, 8, 14, 215), outline=d["color"], width=1)
    draw.text((cx, by + bh // 2), utext, fill=d["color"], font=f_univ, anchor="mm")


# ══════════════════════════════════════════════════════════════════
#  DESSIN — SÉPARATEUR DIAGONAL + VS BADGE
# ══════════════════════════════════════════════════════════════════

def _draw_diagonal_split(canvas: Image.Image) -> None:
    LEAN = 20
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    for hw, fill in [
        (40, (0,   0,   0,   230)),
        (20, (80,  28,  0,   200)),
        ( 8, (230, 100,  8,  240)),
        ( 2, (255, 230, 160, 255)),
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

    for rad in range(90, 0, -8):
        a = int(165 * (1 - rad / 90) ** 1.5)
        d.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=(195, 8, 8, a))

    R = 56
    pts = [(cx + int(R * math.cos(math.radians(60*i - 30))),
            cy + int(R * math.sin(math.radians(60*i - 30)))) for i in range(6)]
    d.polygon(pts, fill=(10, 6, 14, 252))

    for i in range(6):
        p1 = (cx + int((R+3)*math.cos(math.radians(60*i - 30))),
              cy + int((R+3)*math.sin(math.radians(60*i - 30))))
        p2 = (cx + int((R+3)*math.cos(math.radians(60*(i+1) - 30))),
              cy + int((R+3)*math.sin(math.radians(60*(i+1) - 30))))
        d.line([p1, p2], fill=(225, 18, 18, 255), width=3)

    for i in range(8):
        angle = math.radians(i * 45 + 22.5)
        r1 = R + 7
        r2 = R + 20 + (i % 3) * 6
        d.line([(cx + int(r1*math.cos(angle)), cy + int(r1*math.sin(angle))),
                (cx + int(r2*math.cos(angle)), cy + int(r2*math.sin(angle)))],
               fill=(255, 200, 0, 235), width=2)

    canvas.alpha_composite(ov)
    _stroke(ImageDraw.Draw(canvas), (cx, cy), "VS", _f(_FB, 60),
            fill=(255, 252, 250), sc=(120, 0, 0), sw=4)


# ══════════════════════════════════════════════════════════════════
#  DESSIN — BANNIÈRE HAUT + BARRE BAS
# ══════════════════════════════════════════════════════════════════

def _draw_top_banner(canvas: Image.Image, rivalry: str) -> None:
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, 0, W, TOP_H], fill=(4, 3, 8, 240))
    d.line([(0, TOP_H), (W, TOP_H)], fill=(165, 38, 0, 215), width=1)
    canvas.alpha_composite(ov)
    ImageDraw.Draw(canvas).text((HALF, TOP_H // 2), _clean(rivalry),
                                fill=(180, 172, 140), font=_f(_FR, 13), anchor="mm")


def _draw_bottom_bar(canvas: Image.Image,
                     d1: dict, pct1: int,
                     d2: dict, pct2: int,
                     verdict: str) -> None:
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, BTM_Y, W, H], fill=(4, 3, 8, 242))
    d.line([(0, BTM_Y), (W, BTM_Y)], fill=(165, 38, 0, 220), width=2)
    canvas.alpha_composite(ov)

    draw  = ImageDraw.Draw(canvas)
    BAR_H = 14
    BAR_Y = BTM_Y + 20
    PAD   = 30
    bar_w = HALF - PAD - 18

    def _bar(side: str, pct: int, color: tuple) -> None:
        if side == "left":
            bx0, bx1 = PAD, PAD + bar_w
            _rr(draw, [bx0, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=(18, 18, 26))
            fw = int(bar_w * pct / 100)
            if fw > 4:
                _rr(draw, [bx0, BAR_Y, bx0 + fw, BAR_Y + BAR_H], r=5, fill=color)
                r, g, b = color
                _rr(draw, [bx0+2, BAR_Y+2, bx0+fw-2, BAR_Y+BAR_H//2], r=3,
                    fill=(min(255,r+60), min(255,g+60), min(255,b+60)))
            draw.text((bx1 + 8, BAR_Y + BAR_H//2), f"{pct}%",
                      fill=(215,215,215), font=_f(_FR,12), anchor="lm")
        else:
            bx0, bx1 = HALF + 18 + PAD, W - PAD
            _rr(draw, [bx0, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=(18, 18, 26))
            fw = int(bar_w * pct / 100)
            if fw > 4:
                _rr(draw, [bx1 - fw, BAR_Y, bx1, BAR_Y + BAR_H], r=5, fill=color)
                r, g, b = color
                _rr(draw, [bx1-fw+2, BAR_Y+2, bx1-2, BAR_Y+BAR_H//2], r=3,
                    fill=(min(255,r+60), min(255,g+60), min(255,b+60)))
            draw.text((bx0 - 8, BAR_Y + BAR_H//2), f"{pct}%",
                      fill=(215,215,215), font=_f(_FR,12), anchor="rm")

    _bar("left",  pct1, d1["color"])
    _bar("right", pct2, d2["color"])

    f_nm = _f(_FR, 13)
    draw.text((PAD,   BAR_Y + BAR_H + 10), _clean(d1["display"]),
              fill=d1["color"], font=f_nm, anchor="lm")
    draw.text((W-PAD, BAR_Y + BAR_H + 10), _clean(d2["display"]),
              fill=d2["color"], font=f_nm, anchor="rm")

    sep_y = BTM_Y + 64
    draw.line([(PAD, sep_y), (W - PAD, sep_y)], fill=(30, 30, 46), width=1)

    _stroke(draw, (HALF, BTM_Y + 92), _clean(verdict), _f(_FB, 28),
            fill=(255, 218, 50), sc=(55, 28, 0), sw=2)

    draw.text((HALF, H - 10), "BRAMS SCORE  •  DUEL ARENA",
              fill=(44, 44, 56), font=_f(_FR, 10), anchor="mm")


# ══════════════════════════════════════════════════════════════════
#  CONSTRUCTION CARTE
# ══════════════════════════════════════════════════════════════════

def _build_card(
    d1: dict, img1: bytes | None, pct1: int,
    d2: dict, img2: bytes | None, pct2: int,
    rivalry: str, verdict: str,
) -> io.BytesIO:
    canvas = Image.new("RGBA", (W, H), (6, 5, 10, 255))

    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        t = max(0.0, 1.0 - abs(y / H - 0.42) * 2.0)
        draw.line([(0, y), (W, y)], fill=(int(30*t), int(5*t), int(8*t), 255))

    _apply_char_image(canvas, img1, "left",  d1["color"], d1["display"])
    _apply_char_image(canvas, img2, "right", d2["color"], d2["display"])
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
            d1, d2 = CHARS[k1], CHARS[k2]

            raw = random.choices([50, 51, 52, 53, 54, 55],
                                  weights=[25, 22, 20, 16, 11, 6])[0]
            pct1 = raw if random.random() > 0.5 else 100 - raw
            pct2 = 100 - pct1

            rivalry = random.choice(_RIVALRIES)
            verdict = random.choice(_VERDICTS)

            # Récupère les URLs ET les bytes en parallèle
            url1, url2 = await asyncio.gather(
                _get_image_url(d1["jikan_name"], d1["jikan_id"]),
                _get_image_url(d2["jikan_name"], d2["jikan_id"]),
                return_exceptions=True,
            )
            if isinstance(url1, Exception): url1 = None
            if isinstance(url2, Exception): url2 = None

            img1, img2 = await asyncio.gather(
                _download_bytes(url1) if url1 else asyncio.sleep(0, result=None),
                _download_bytes(url2) if url2 else asyncio.sleep(0, result=None),
                return_exceptions=True,
            )
            if isinstance(img1, Exception): img1 = None
            if isinstance(img2, Exception): img2 = None

            loop = asyncio.get_running_loop()
            buf  = await loop.run_in_executor(
                None,
                lambda: _build_card(d1, img1, pct1, d2, img2, pct2, rivalry, verdict),
            )

            # Embed principal — carte VS
            main = discord.Embed(
                title="⚔️  D U E L   É P I Q U E  ⚔️",
                color=0xE63939,
            )
            main.description = (
                f"### {d1['display']}  `VS`  {d2['display']}\n"
                f"*{rivalry}*"
            )
            main.set_image(url="attachment://duel.png")
            main.set_footer(text="⚔️ Brams Score • Duel Arena  |  /duel pour rejouer !")
            main.timestamp = discord.utils.utcnow()

            embeds = [main]

            # Embeds personnages — Discord charge l'URL directement (toujours fiable)
            if url1:
                e1 = discord.Embed(
                    title=f"🔴  {d1['display']}",
                    description=f"*{d1['titre']}*  ·  {d1['univers']}",
                    color=discord.Color.from_rgb(*d1["color"]),
                )
                e1.set_image(url=url1)
                embeds.append(e1)
            if url2:
                e2 = discord.Embed(
                    title=f"🔵  {d2['display']}",
                    description=f"*{d2['titre']}*  ·  {d2['univers']}",
                    color=discord.Color.from_rgb(*d2["color"]),
                )
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
                    f"**Votez ci-dessous — le débat est ouvert !**"
                ),
                color=0x2B2D31,
            )
            poll.set_footer(text="⚔️ Le vote est ouvert — que le meilleur gagne !")
            poll_msg = await interaction.channel.send(embed=poll)
            await poll_msg.add_reaction("🔴")
            await poll_msg.add_reaction("🔵")

            log.info("[DuelCog] %s vs %s → %d%%/%d%% | url1=%s url2=%s",
                     d1["display"], d2["display"], pct1, pct2,
                     bool(url1), bool(url2))

        except Exception as exc:
            log.exception("[DuelCog] Erreur /duel : %s", exc)
            await interaction.followup.send(
                "❌ Erreur lors du duel. Réessaie dans quelques secondes.",
                ephemeral=True,
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
