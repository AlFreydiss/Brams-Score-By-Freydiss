"""
Cog — /duel  ⚔️  Duel Épique Anime
====================================
• PIL génère la carte VS combat (Bangers + KOMIKAX, zéro téléchargement externe)
• GIFs via embeds Discord (Giphy API)
• Sondage réactions 🔴 / 🔵
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
from PIL import Image, ImageDraw, ImageFilter, ImageFont

log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════
#  GIPHY  — clé gratuite sur https://developers.giphy.com
#  Ajouter GIPHY_API_KEY dans les variables Railway
# ══════════════════════════════════════════════════════════════════
GIPHY_KEY  = os.getenv("GIPHY_API_KEY", "")
_gif_cache: dict[str, str] = {}

# ══════════════════════════════════════════════════════════════════
#  POLICES
# ══════════════════════════════════════════════════════════════════
_FB = "Bangers-Regular.ttf"     # VS, verdict
_FK = "KOMIKAX_.ttf"             # noms personnages
_FR = "Righteous-Regular.ttf"   # titres, univers, petits textes

def _f(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# ══════════════════════════════════════════════════════════════════
#  PERSONNAGES
# ══════════════════════════════════════════════════════════════════
CHARS: dict[str, dict] = {
    "luffy": {
        "display": "Monkey D. Luffy",
        "query":   "luffy one piece fight",
        "univers": "One Piece",
        "titre":   "Futur Roi des Pirates",
        "color":   (255, 140, 0),
    },
    "zoro": {
        "display": "Roronoa Zoro",
        "query":   "zoro one piece sword",
        "univers": "One Piece",
        "titre":   "Premier Epee du Monde",
        "color":   (50, 200, 80),
    },
    "sanji": {
        "display": "Sanji",
        "query":   "sanji one piece kick",
        "univers": "One Piece",
        "titre":   "Le Cuisinier du Diable",
        "color":   (220, 220, 0),
    },
    "naruto": {
        "display": "Naruto Uzumaki",
        "query":   "naruto uzumaki rasengan",
        "univers": "Naruto",
        "titre":   "Septieme Hokage",
        "color":   (255, 110, 0),
    },
    "sasuke": {
        "display": "Sasuke Uchiha",
        "query":   "sasuke uchiha sharingan",
        "univers": "Naruto",
        "titre":   "Ninja de l Ombre",
        "color":   (130, 0, 220),
    },
    "kakashi": {
        "display": "Kakashi Hatake",
        "query":   "kakashi hatake chidori",
        "univers": "Naruto",
        "titre":   "Copieur de Mille Jutsu",
        "color":   (140, 190, 255),
    },
    "goku": {
        "display": "Son Goku",
        "query":   "goku dragon ball super saiyan",
        "univers": "Dragon Ball",
        "titre":   "Super Saiyan Legendaire",
        "color":   (255, 220, 0),
    },
    "vegeta": {
        "display": "Vegeta",
        "query":   "vegeta dragon ball saiyan",
        "univers": "Dragon Ball",
        "titre":   "Prince des Saiyans",
        "color":   (180, 0, 255),
    },
    "ichigo": {
        "display": "Ichigo Kurosaki",
        "query":   "ichigo kurosaki bleach bankai",
        "univers": "Bleach",
        "titre":   "Substitut Shinigami",
        "color":   (255, 80, 80),
    },
    "aizen": {
        "display": "Sosuke Aizen",
        "query":   "aizen bleach",
        "univers": "Bleach",
        "titre":   "Seigneur des Arrancar",
        "color":   (200, 180, 255),
    },
    "saitama": {
        "display": "Saitama",
        "query":   "saitama one punch man",
        "univers": "One Punch Man",
        "titre":   "Heros par Loisir",
        "color":   (255, 240, 100),
    },
    "mob": {
        "display": "Shigeo Kageyama",
        "query":   "mob psycho 100 power",
        "univers": "Mob Psycho 100",
        "titre":   "100% Psychique",
        "color":   (180, 180, 255),
    },
    "tanjiro": {
        "display": "Tanjiro Kamado",
        "query":   "tanjiro kamado demon slayer",
        "univers": "Demon Slayer",
        "titre":   "Pourfendeur de Demons",
        "color":   (0, 180, 220),
    },
    "rengoku": {
        "display": "Kyojuro Rengoku",
        "query":   "rengoku flame demon slayer",
        "univers": "Demon Slayer",
        "titre":   "Pilier de la Flamme",
        "color":   (255, 100, 0),
    },
    "eren": {
        "display": "Eren Yeager",
        "query":   "eren yeager attack on titan",
        "univers": "Attaque des Titans",
        "titre":   "Le Titan Fondateur",
        "color":   (180, 100, 0),
    },
    "levi": {
        "display": "Levi Ackerman",
        "query":   "levi ackerman attack on titan",
        "univers": "Attaque des Titans",
        "titre":   "Le Soldat le Plus Fort",
        "color":   (150, 200, 200),
    },
    "gojo": {
        "display": "Satoru Gojo",
        "query":   "gojo satoru jujutsu kaisen",
        "univers": "Jujutsu Kaisen",
        "titre":   "Le Plus Fort du Monde",
        "color":   (100, 200, 255),
    },
    "sukuna": {
        "display": "Ryomen Sukuna",
        "query":   "sukuna jujutsu kaisen",
        "univers": "Jujutsu Kaisen",
        "titre":   "Roi des Fleaux",
        "color":   (220, 0, 50),
    },
    "meliodas": {
        "display": "Meliodas",
        "query":   "meliodas seven deadly sins",
        "univers": "Nanatsu no Taizai",
        "titre":   "Dragon Sin of Wrath",
        "color":   (255, 80, 80),
    },
    "natsu": {
        "display": "Natsu Dragneel",
        "query":   "natsu dragneel fairy tail fire",
        "univers": "Fairy Tail",
        "titre":   "Dragon Slayer du Feu",
        "color":   (255, 80, 0),
    },
    "edward": {
        "display": "Edward Elric",
        "query":   "edward elric fullmetal alchemist",
        "univers": "Fullmetal Alchemist",
        "titre":   "Alchimiste Acier",
        "color":   (220, 180, 0),
    },
    "gintoki": {
        "display": "Gintoki Sakata",
        "query":   "gintoki gintama sword",
        "univers": "Gintama",
        "titre":   "Le Samourai du Ciel",
        "color":   (200, 200, 255),
    },
    "giorno": {
        "display": "Giorno Giovanna",
        "query":   "giorno giovanna jojo bizarre adventure",
        "univers": "JoJo Bizarre Adventure",
        "titre":   "Capo di Passione",
        "color":   (255, 180, 200),
    },
}

_RIVALRIES = [
    "Le destin du monde se joue dans ce combat legendaire !",
    "Deux titans s'affrontent — les cieux vont trembler.",
    "L'univers retient son souffle... qui va dominer ?",
    "Leurs auras se heurtent avant meme le premier coup.",
    "Cette rivalite est inscrite dans les etoiles depuis toujours.",
    "Le sol tremble, les nuages se dechirent — ca commence !",
    "Les legendes ne meurent pas, elles se battent.",
    "Meme les dieux observent avec crainte ce choc ultime.",
    "Ce n'est pas un combat — c'est une catastrophe naturelle.",
    "Un seul peut rester debout. Lequel sera le dernier ?",
]
_WIN = [
    "{w} explose son adversaire d'un seul coup !",
    "{w} domine avec une puissance ecrasante !",
    "{w} remporte ce round sans meme transpirer.",
    "{w} sort vainqueur de ce duel apocalyptique !",
    "{w} transcende ses limites et s'impose !",
]
_DRAW = [
    "Match nul ! Les deux tombent ensemble.",
    "Egalite absolue — leurs forces se neutralisent.",
    "Nul ! La Terre ne peut pas les departager.",
]

# ══════════════════════════════════════════════════════════════════
#  GIPHY SEARCH
# ══════════════════════════════════════════════════════════════════

async def _search_gif(query: str) -> str:
    if query in _gif_cache:
        return _gif_cache[query]
    if not GIPHY_KEY:
        return ""
    params = urllib.parse.urlencode({
        "api_key": GIPHY_KEY, "q": query,
        "limit": "3", "rating": "g", "lang": "en",
    })
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"https://api.giphy.com/v1/gifs/search?{params}",
                timeout=aiohttp.ClientTimeout(total=8),
            ) as r:
                if r.status != 200:
                    return ""
                data = await r.json()
        items = data.get("data", [])
        if not items:
            return ""
        url = items[0]["images"]["original"]["url"]
        _gif_cache[query] = url
        return url
    except Exception as exc:
        log.warning("[DuelCog] Giphy(%s): %s", query, exc)
        return ""

# ══════════════════════════════════════════════════════════════════
#  HELPERS PIL
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF]+", flags=re.UNICODE)

def _clean(t: str) -> str:
    return _EMOJI_RE.sub("", t).strip()


def _rr(draw: ImageDraw.ImageDraw, xy, r: int, fill=None, outline=None, width: int = 1) -> None:
    try:
        draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)
    except (AttributeError, TypeError):
        draw.rectangle(xy, fill=fill, outline=outline)


def _stroke_text(draw: ImageDraw.ImageDraw, pos, text: str, font,
                 fill, stroke_color=(0, 0, 0), stroke_w: int = 3,
                 anchor: str = "mm") -> None:
    try:
        # Pillow 8.0+ — stroke natif
        draw.text(pos, text, font=font, fill=fill,
                  stroke_width=stroke_w, stroke_fill=stroke_color, anchor=anchor)
    except TypeError:
        x, y = pos
        for dx in range(-stroke_w, stroke_w + 1):
            for dy in range(-stroke_w, stroke_w + 1):
                if dx or dy:
                    draw.text((x + dx, y + dy), text, font=font,
                               fill=stroke_color, anchor=anchor)
        draw.text(pos, text, font=font, fill=fill, anchor=anchor)


def _text_w(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]
    except Exception:
        return len(text) * (font.size if hasattr(font, "size") else 8)


def _radial_glow(canvas: Image.Image, cx: int, cy: int,
                 color: tuple, max_r: int, max_alpha: int = 65) -> None:
    """Glow radial doux composité sur canvas RGBA."""
    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    r, g, b = color
    step = 10
    for rad in range(max_r, 0, -step):
        a = int(max_alpha * (1 - rad / max_r) ** 1.6)
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(r, g, b, a))
    canvas.alpha_composite(ov)


# ══════════════════════════════════════════════════════════════════
#  MODULES DE DESSIN
# ══════════════════════════════════════════════════════════════════

def _draw_background(canvas: Image.Image) -> None:
    """Fond noir charbon avec légère profondeur centrale."""
    W, H = canvas.size
    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        t = max(0.0, 1.0 - abs(y / H - 0.42) * 1.7)
        draw.line([(0, y), (W, y)], fill=(int(38 * t * t), int(5 * t), int(9 * t), 255))


def _draw_speed_lines(canvas: Image.Image, cx: int, cy: int,
                      side: str, color: tuple) -> None:
    """Lignes de vitesse manga rayonnant depuis le centre du personnage."""
    ov   = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d    = ImageDraw.Draw(ov)
    r, g, b = color
    n    = 11
    # Angles : côté gauche → vers la gauche, côté droit → vers la droite
    a_start = math.radians(115) if side == "left" else math.radians(-65)
    a_end   = math.radians(245) if side == "left" else math.radians(65)
    for i in range(n):
        angle  = a_start + (a_end - a_start) * i / max(n - 1, 1)
        length = random.randint(170, 310)
        x2 = cx + int(math.cos(angle) * length)
        y2 = cy + int(math.sin(angle) * length)
        alpha = random.randint(20, 55)
        w     = random.choice([1, 1, 2])
        d.line([(cx, cy), (x2, y2)], fill=(r // 3, g // 3, b // 3, alpha), width=w)
    canvas.alpha_composite(ov)


def _draw_diagonal_split(canvas: Image.Image) -> None:
    """Séparateur diagonal lumineux au centre — l'âme visuelle de la carte."""
    W, H  = canvas.size
    MID   = W // 2
    LEAN  = 16   # décalage horizontal bas vs haut

    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)

    # Couches de la plus large à la plus fine
    layers = [
        (32,  (0,   0,   0,   200)),   # ombre profonde
        (16,  (140, 55,  0,   180)),   # halo brun-rouge
        (7,   (255, 120, 20,  220)),   # halo orange vif
        (2,   (255, 235, 180, 255)),   # filet blanc chaud
    ]
    for hw, fill in layers:
        pts = [
            (MID - LEAN - hw, 0),
            (MID - LEAN + hw, 0),
            (MID + LEAN + hw, H),
            (MID + LEAN - hw, H),
        ]
        d.polygon(pts, fill=fill)
    canvas.alpha_composite(ov)


def _draw_vs_badge(canvas: Image.Image, cy_center: int) -> None:
    """Badge VS hexagonal avec glow rouge et étincelles."""
    W   = canvas.size[0]
    cx  = W // 2
    cy  = cy_center

    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)

    # Halo rouge rayonné derrière le badge
    for rad in range(70, 0, -6):
        a = int(130 * (1 - rad / 70) ** 1.4)
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(210, 10, 10, a))

    # Hexagone de fond
    R  = 50
    pts_hex = [
        (cx + int(R * math.cos(math.radians(60 * i - 30))),
         cy + int(R * math.sin(math.radians(60 * i - 30))))
        for i in range(6)
    ]
    d.polygon(pts_hex, fill=(12, 8, 14, 245))

    # Bordure hexagone rouge sang
    R_border = R + 1
    for i in range(6):
        p1 = (cx + int(R_border * math.cos(math.radians(60 * i - 30))),
              cy + int(R_border * math.sin(math.radians(60 * i - 30))))
        p2 = (cx + int(R_border * math.cos(math.radians(60 * (i + 1) - 30))),
              cy + int(R_border * math.sin(math.radians(60 * (i + 1) - 30))))
        d.line([p1, p2], fill=(210, 20, 20, 255), width=2)

    # Étincelles rayonnantes (8 directions)
    for i in range(8):
        angle  = math.radians(i * 45)
        r_in   = R + 5
        r_out  = R + random.randint(14, 26)
        x1 = cx + int(r_in  * math.cos(angle))
        y1 = cy + int(r_in  * math.sin(angle))
        x2 = cx + int(r_out * math.cos(angle))
        y2 = cy + int(r_out * math.sin(angle))
        d.line([(x1, y1), (x2, y2)], fill=(255, 180, 0, 220), width=2)

    canvas.alpha_composite(ov)

    # Texte VS (sur canvas directement)
    draw  = ImageDraw.Draw(canvas)
    f_vs  = _f(_FB, 54)
    _stroke_text(draw, (cx, cy), "VS", f_vs,
                 fill=(250, 248, 248), stroke_color=(130, 0, 0), stroke_w=3)


def _draw_character_side(canvas: Image.Image, side: str,
                         d: dict, BTM_Y: int, TOP_H: int) -> None:
    """Dessine un côté complet : aura + speed lines + initiale + nom + titre + badge."""
    W, H = canvas.size
    cx   = W // 4 if side == "left" else 3 * W // 4
    cy   = TOP_H + (BTM_Y - TOP_H) // 2   # centre vertical de la zone personnage

    color = d["color"]
    r, g, b = color

    # Aura radiale
    _radial_glow(canvas, cx, cy, color, max_r=200, max_alpha=55)

    # Speed lines
    _draw_speed_lines(canvas, cx, cy, side, color)

    draw = ImageDraw.Draw(canvas)

    # Initiale fantôme (très discrète — simple fond)
    f_init = _f(_FK, 200)
    letter = _clean(d["display"])[0].upper()
    draw.text((cx, cy - 20), letter,
              fill=(r // 6, g // 6, b // 6), font=f_init, anchor="mm")

    # ── Nom (GROS, stroke manga) ──────────────────────────────────
    f_name = _f(_FK, 44)
    name   = _clean(d["display"]).upper()
    _stroke_text(draw, (cx, BTM_Y - 92), name, f_name,
                 fill=(248, 248, 252), stroke_color=(0, 0, 0), stroke_w=3)

    # ── Titre ─────────────────────────────────────────────────────
    f_titre = _f(_FR, 15)
    draw.text((cx, BTM_Y - 64), _clean(d["titre"]),
              fill=(180, 180, 195), font=f_titre, anchor="mm")

    # ── Badge univers arrondi ──────────────────────────────────────
    f_univ     = _f(_FR, 12)
    univ_text  = _clean(d["univers"]).upper()
    tw         = _text_w(draw, univ_text, f_univ)
    badge_w, badge_h = tw + 22, 20
    bx = cx - badge_w // 2
    by = BTM_Y - 48
    _rr(draw, [bx, by, bx + badge_w, by + badge_h],
        r=5, fill=(12, 12, 18), outline=color, width=1)
    draw.text((cx, by + badge_h // 2), univ_text,
              fill=color, font=f_univ, anchor="mm")


def _draw_top_banner(canvas: Image.Image, rivalry: str, TOP_H: int) -> None:
    """Bannière sombre en haut avec phrase de rivalité."""
    W  = canvas.size[0]
    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, 0, W, TOP_H], fill=(4, 4, 8, 215))
    d.line([(0, TOP_H), (W, TOP_H)], fill=(170, 45, 0, 200), width=1)
    canvas.alpha_composite(ov)

    draw = ImageDraw.Draw(canvas)
    f    = _f(_FR, 13)
    draw.text((W // 2, TOP_H // 2), _clean(rivalry),
              fill=(185, 180, 150), font=f, anchor="mm")


def _draw_bottom_bar(canvas: Image.Image,
                     d1: dict, pct1: int,
                     d2: dict, pct2: int,
                     result: str, BTM_Y: int) -> None:
    """Bande inférieure : barres de force miroir + verdict doré."""
    W, H = canvas.size
    MID  = W // 2
    PAD  = 22
    BW   = MID - PAD * 2 - 25   # largeur barre

    # Fond bande
    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d  = ImageDraw.Draw(ov)
    d.rectangle([0, BTM_Y, W, H], fill=(4, 4, 8, 228))
    d.line([(0, BTM_Y), (W, BTM_Y)], fill=(170, 45, 0, 210), width=2)
    d.line([(MID, BTM_Y + 4), (MID, H - 4)], fill=(35, 35, 48, 180), width=1)
    canvas.alpha_composite(ov)

    draw = ImageDraw.Draw(canvas)

    BY    = BTM_Y + 16   # y de départ des barres
    BH    = 15

    def _bar(bx: int, pct: int, color: tuple, rtl: bool = False) -> None:
        # Fond
        _rr(draw, [bx, BY, bx + BW, BY + BH], r=6, fill=(18, 18, 26))
        fw = int(BW * pct / 100)
        if fw < 4:
            return
        if rtl:
            x0, x1 = bx + BW - fw, bx + BW
        else:
            x0, x1 = bx, bx + fw
        # Remplissage couleur
        _rr(draw, [x0, BY, x1, BY + BH], r=6, fill=color)
        # Shine (rectangle légèrement plus clair en haut)
        r, g, b = color
        shine = (min(255, r + 70), min(255, g + 70), min(255, b + 70))
        _rr(draw, [x0 + 2, BY + 2, x1 - 2, BY + BH // 2], r=4, fill=shine)

    # Barre gauche (perso 1, gauche → droite)
    _bar(PAD, pct1, d1["color"], rtl=False)
    # Barre droite (perso 2, droite → gauche / mirroir)
    _bar(MID + PAD + 24, pct2, d2["color"], rtl=True)

    f_pct  = _f(_FR, 12)
    f_name = _f(_FR, 13)

    # Pourcentages
    draw.text((PAD + BW + 7,       BY + BH // 2), f"{pct1}%",
              fill=(215, 215, 215), font=f_pct, anchor="lm")
    draw.text((MID + PAD + 24 - 7, BY + BH // 2), f"{pct2}%",
              fill=(215, 215, 215), font=f_pct, anchor="rm")

    # Noms sous les barres
    draw.text((PAD,             BY + BH + 8), _clean(d1["display"]),
              fill=d1["color"], font=f_name, anchor="lm")
    draw.text((W - PAD,         BY + BH + 8), _clean(d2["display"]),
              fill=d2["color"], font=f_name, anchor="rm")

    # Séparateur avant le verdict
    sep_y = BTM_Y + 56
    draw.line([(PAD, sep_y), (W - PAD, sep_y)], fill=(35, 35, 50), width=1)

    # Verdict
    f_res = _f(_FB, 26)
    _stroke_text(draw, (MID, BTM_Y + 82), _clean(result), f_res,
                 fill=(255, 210, 55), stroke_color=(70, 35, 0), stroke_w=2)

    # Footer
    draw.text((MID, H - 9), "BRAMS SCORE  •  DUEL ARENA",
              fill=(50, 50, 62), font=_f(_FR, 10), anchor="mm")


# ══════════════════════════════════════════════════════════════════
#  FONCTION PRINCIPALE
# ══════════════════════════════════════════════════════════════════

def _build_card(
    d1: dict, pct1: int,
    d2: dict, pct2: int,
    rivalry: str, result: str,
) -> io.BytesIO:
    W, H   = 960, 500
    TOP_H  = 36    # hauteur bannière du haut
    BTM_H  = 130   # hauteur bande du bas
    BTM_Y  = H - BTM_H

    canvas = Image.new("RGBA", (W, H), (8, 8, 12, 255))

    _draw_background(canvas)
    _draw_character_side(canvas, "left",  d1, BTM_Y, TOP_H)
    _draw_character_side(canvas, "right", d2, BTM_Y, TOP_H)
    _draw_diagonal_split(canvas)
    _draw_vs_badge(canvas, cy_center=TOP_H + (BTM_Y - TOP_H) // 2 - 20)
    _draw_top_banner(canvas, rivalry, TOP_H)
    _draw_bottom_bar(canvas, d1, pct1, d2, pct2, result, BTM_Y)

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
        description="⚔️ Duel epique entre deux personnages anime tires au sort !",
    )
    async def duel(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()

        try:
            k1, k2 = random.sample(list(CHARS.keys()), 2)
            d1, d2  = CHARS[k1], CHARS[k2]

            outcome = random.choices(["p1", "p2", "draw"], weights=[40, 40, 20])[0]
            if outcome == "p1":
                pct1 = random.randint(56, 88); pct2 = 100 - pct1
                result = random.choice(_WIN).format(w=d1["display"])
            elif outcome == "p2":
                pct2 = random.randint(56, 88); pct1 = 100 - pct2
                result = random.choice(_WIN).format(w=d2["display"])
            else:
                pct1 = pct2 = 50
                result = random.choice(_DRAW)

            rivalry = random.choice(_RIVALRIES)

            loop = asyncio.get_running_loop()
            buf  = await loop.run_in_executor(
                None,
                lambda: _build_card(d1, pct1, d2, pct2, rivalry, result),
            )

            url1, url2 = await asyncio.gather(
                _search_gif(d1["query"]),
                _search_gif(d2["query"]),
            )

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
                    f"**Cliquez sur une réaction pour voter !**"
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

# ══════════════════════════════════════════════════════════════════
#  SETUP
# ══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
