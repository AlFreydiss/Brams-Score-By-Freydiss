"""
Cog — /duel  ⚔️  Duel Épique Anime
====================================
• Sélection 100% aléatoire
• Carte PIL composite : les deux persos côte à côte
• Images Giphy CDN (User-Agent spoofé, fallback couleur si échec)
"""

from __future__ import annotations

import asyncio
import io
import logging
import random
import re

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands
from PIL import Image, ImageDraw, ImageFilter, ImageFont

log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════
#  POLICES (fichiers présents dans le repo)
# ══════════════════════════════════════════════════════════════════
_FK = "KOMIKAX_.ttf"
_FR = "Righteous-Regular.ttf"

def _f(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# ══════════════════════════════════════════════════════════════════
#  PERSONNAGES
#  gif = URL image directe (Giphy CDN fonctionne avec User-Agent)
#  color = couleur RGB du personnage (barres + tint)
# ══════════════════════════════════════════════════════════════════
CHARS: dict[str, dict] = {
    "luffy": {
        "display": "Monkey D. Luffy",
        "gif":     "https://i.imgur.com/X9Ywubd.gif",
        "univers": "One Piece",
        "titre":   "Futur Roi des Pirates",
        "color":   (255, 140, 0),
    },
    "zoro": {
        "display": "Roronoa Zoro",
        "gif":     "https://i.imgur.com/5RtBwnR.gif",
        "univers": "One Piece",
        "titre":   "Premier Epee du Monde",
        "color":   (50, 200, 80),
    },
    "sanji": {
        "display": "Sanji",
        "gif":     "https://i.imgur.com/cDqfnpd.gif",
        "univers": "One Piece",
        "titre":   "Le Cuisinier du Diable",
        "color":   (220, 220, 0),
    },
    "naruto": {
        "display": "Naruto Uzumaki",
        "gif":     "https://i.imgur.com/ZfhLVIE.gif",
        "univers": "Naruto",
        "titre":   "Septieme Hokage",
        "color":   (255, 110, 0),
    },
    "sasuke": {
        "display": "Sasuke Uchiha",
        "gif":     "https://i.imgur.com/z6G3pEQ.gif",
        "univers": "Naruto",
        "titre":   "Ninja de l'Ombre",
        "color":   (130, 0, 220),
    },
    "kakashi": {
        "display": "Kakashi Hatake",
        "gif":     "https://i.imgur.com/EYgqcvB.gif",
        "univers": "Naruto",
        "titre":   "Copieur de Mille Jutsu",
        "color":   (140, 190, 255),
    },
    "goku": {
        "display": "Son Goku",
        "gif":     "https://i.imgur.com/m1YhPOV.gif",
        "univers": "Dragon Ball",
        "titre":   "Super Saiyan Legendaire",
        "color":   (255, 220, 0),
    },
    "vegeta": {
        "display": "Vegeta",
        "gif":     "https://i.imgur.com/7jlFODj.gif",
        "univers": "Dragon Ball",
        "titre":   "Prince des Saiyans",
        "color":   (180, 0, 255),
    },
    "ichigo": {
        "display": "Ichigo Kurosaki",
        "gif":     "https://i.imgur.com/BrtBwgW.gif",
        "univers": "Bleach",
        "titre":   "Substitut Shinigami",
        "color":   (255, 80, 80),
    },
    "saitama": {
        "display": "Saitama",
        "gif":     "https://i.imgur.com/dS8MXBZ.gif",
        "univers": "One Punch Man",
        "titre":   "Heros par Loisir",
        "color":   (255, 240, 100),
    },
    "tanjiro": {
        "display": "Tanjiro Kamado",
        "gif":     "https://i.imgur.com/UBmKeFF.gif",
        "univers": "Demon Slayer",
        "titre":   "Pourfendeur de Demons",
        "color":   (0, 180, 220),
    },
    "gojo": {
        "display": "Satoru Gojo",
        "gif":     "https://i.imgur.com/wRQFqEZ.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Le Plus Fort du Monde",
        "color":   (100, 200, 255),
    },
    "sukuna": {
        "display": "Ryomen Sukuna",
        "gif":     "https://i.imgur.com/jCBkWIl.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Roi des Fleaux",
        "color":   (220, 0, 50),
    },
    "eren": {
        "display": "Eren Yeager",
        "gif":     "https://i.imgur.com/NQKNMDV.gif",
        "univers": "Attaque des Titans",
        "titre":   "Le Titan Fondateur",
        "color":   (180, 100, 0),
    },
    "levi": {
        "display": "Levi Ackerman",
        "gif":     "https://i.imgur.com/R9eRUxT.gif",
        "univers": "Attaque des Titans",
        "titre":   "Le Soldat le Plus Fort",
        "color":   (150, 200, 200),
    },
    "meliodas": {
        "display": "Meliodas",
        "gif":     "https://i.imgur.com/Wf8XJWY.gif",
        "univers": "Nanatsu no Taizai",
        "titre":   "Dragon's Sin of Wrath",
        "color":   (255, 80, 80),
    },
    "natsu": {
        "display": "Natsu Dragneel",
        "gif":     "https://i.imgur.com/FfMjqZZ.gif",
        "univers": "Fairy Tail",
        "titre":   "Dragon Slayer du Feu",
        "color":   (255, 80, 0),
    },
    "mob": {
        "display": "Shigeo Kageyama",
        "gif":     "https://i.imgur.com/EasrHmN.gif",
        "univers": "Mob Psycho 100",
        "titre":   "100% Psychique",
        "color":   (180, 180, 255),
    },
    "edward": {
        "display": "Edward Elric",
        "gif":     "https://i.imgur.com/ioJyFQS.gif",
        "univers": "Fullmetal Alchemist",
        "titre":   "Alchimiste d'Acier",
        "color":   (220, 180, 0),
    },
    "aizen": {
        "display": "Sosuke Aizen",
        "gif":     "https://i.imgur.com/LaxfpSv.gif",
        "univers": "Bleach",
        "titre":   "Seigneur des Arrancar",
        "color":   (200, 180, 255),
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
    "{w} delivre le coup de grace avec brutalite.",
]
_DRAW = [
    "Match nul ! Les deux tombent ensemble.",
    "Egalite absolue — leurs forces se neutralisent.",
    "Nul ! La Terre ne peut pas les departager.",
]

# ══════════════════════════════════════════════════════════════════
#  HELPERS IMAGE
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\u2600-\u27BF]+", flags=re.UNICODE
)

def _clean(t: str) -> str:
    return _EMOJI_RE.sub("", t).strip()


def _color_placeholder(color: tuple, w: int = 320, h: int = 400) -> Image.Image:
    """Image de remplacement colorée quand le téléchargement échoue."""
    img = Image.new("RGBA", (w, h), (15, 15, 20, 255))
    d   = ImageDraw.Draw(img)
    # Dégradé vertical avec la couleur du perso
    for y in range(h):
        t = y / h
        r = int(color[0] * (1 - t) * 0.4)
        g = int(color[1] * (1 - t) * 0.4)
        b = int(color[2] * (1 - t) * 0.4)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))
    # Silhouette "?"
    f = _f(_FK, 96)
    d.text((w // 2, h // 2), "?", fill=(*color, 180), font=f, anchor="mm")
    return img


async def _fetch(url: str, color: tuple) -> Image.Image:
    """Télécharge l'image/GIF, retourne la meilleure frame en RGBA."""
    ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(headers={"User-Agent": ua}) as sess:
            async with sess.get(url, timeout=timeout) as r:
                if r.status != 200:
                    raise ValueError(f"HTTP {r.status}")
                data = await r.read()
        img = Image.open(io.BytesIO(data))
        # Pour les GIFs, choisir une frame du premier tiers
        if getattr(img, "n_frames", 1) > 1:
            try:
                img.seek(img.n_frames // 4)
            except EOFError:
                img.seek(0)
        return img.convert("RGBA")
    except Exception as exc:
        log.warning("[DuelCog] fetch(%s) → %s — fallback couleur", url, exc)
        return _color_placeholder(color)


def _build_card(
    img1: Image.Image, d1: dict, pct1: int,
    img2: Image.Image, d2: dict, pct2: int,
    rivalry: str, result: str,
) -> io.BytesIO:
    W, H  = 960, 540
    MID   = W // 2
    PAD   = 18
    COL   = MID - PAD            # largeur disponible par panneau

    # ── Canvas de base ────────────────────────────────────────────
    canvas = Image.new("RGBA", (W, H), (6, 6, 10, 255))
    draw   = ImageDraw.Draw(canvas)

    # Dégradé vertical sombre avec pointe rouge au centre
    for y in range(H):
        t = 1.0 - abs(y / H - 0.42) * 1.8
        t = max(0.0, min(1.0, t))
        draw.line([(0, y), (W, y)], fill=(int(50*t*t), int(6*t), int(9*t), 255))

    # ── Tint coloré sur chaque panneau (avec ImageDraw.line — rapide) ──
    tint_alpha = 38
    for x in range(COL + PAD):
        fade = 1.0 - abs(x / (COL + PAD) - 0.5) * 2
        a = int(tint_alpha * max(0.0, fade))
        c1 = (*d1["color"], a)
        c2 = (*d2["color"], a)
        draw.line([(x, 0), (x, H)], fill=c1)
        draw.line([(MID + x, 0), (MID + x, H)], fill=c2)

    # ── Séparateur central lumineux ───────────────────────────────
    for xi in range(-4, 5):
        a = int(220 * (1 - abs(xi) / 5))
        draw.line([(MID + xi, 0), (MID + xi, H)], fill=(255, 140, 0, a))

    # ── Images personnages ─────────────────────────────────────────
    CHAR_MAX_W = COL - 20
    CHAR_MAX_H = H - 130

    def _paste_char(img: Image.Image, panel_x: int) -> None:
        img = img.copy()
        img.thumbnail((CHAR_MAX_W, CHAR_MAX_H), Image.LANCZOS)
        # Lueur derrière
        glow = img.filter(ImageFilter.GaussianBlur(16))
        px   = panel_x + (COL - img.width)  // 2
        py   = max(PAD, (CHAR_MAX_H - img.height) // 2)
        canvas.alpha_composite(glow, (px, py))
        canvas.alpha_composite(img,  (px, py))

    _paste_char(img1, PAD)
    _paste_char(img2, MID + PAD)

    # ── VS central ────────────────────────────────────────────────
    # Halo
    halo = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    hd   = ImageDraw.Draw(halo)
    for r in range(90, 0, -5):
        a = int(160 * (1 - r / 90) ** 1.5)
        hd.ellipse([90-r, 90-r, 90+r, 90+r], fill=(255, 80, 0, a))
    halo = halo.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(halo, (MID - 90, H // 2 - 140))

    # Texte VS
    dv   = ImageDraw.Draw(canvas)
    f_vs = _f(_FK, 80)
    # ombre
    dv.text((MID + 3, H // 2 - 80 + 3), "VS", fill=(60, 0, 0, 200), font=f_vs, anchor="mm")
    dv.text((MID,     H // 2 - 80),      "VS", fill=(255, 215, 0, 255), font=f_vs, anchor="mm")

    # ── Bande inférieure ──────────────────────────────────────────
    BTM_H = 148
    BTM_Y = H - BTM_H
    btm   = Image.new("RGBA", (W, BTM_H), (4, 4, 8, 215))
    canvas.alpha_composite(btm, (0, BTM_Y))

    db = ImageDraw.Draw(canvas)
    db.line([(0, BTM_Y), (W, BTM_Y)], fill=(200, 55, 0, 200), width=2)
    db.line([(MID, BTM_Y), (MID, H)],  fill=(60, 60, 70, 160), width=1)

    # Polices
    f_name = _f(_FK, 24)
    f_sub  = _f(_FR, 15)
    f_tiny = _f(_FR, 12)
    f_res  = _f(_FR, 17)
    f_riv  = _f(_FR, 13)

    cx1 = PAD + COL // 2
    cx2 = MID + PAD + COL // 2

    # Noms, titres, univers
    db.text((cx1, BTM_Y + 16), _clean(d1["display"]), fill=(*d1["color"], 255), font=f_name, anchor="mm")
    db.text((cx2, BTM_Y + 16), _clean(d2["display"]), fill=(*d2["color"], 255), font=f_name, anchor="mm")
    db.text((cx1, BTM_Y + 37), _clean(d1["titre"]),   fill=(200, 200, 200, 220), font=f_sub,  anchor="mm")
    db.text((cx2, BTM_Y + 37), _clean(d2["titre"]),   fill=(200, 200, 200, 220), font=f_sub,  anchor="mm")
    db.text((cx1, BTM_Y + 53), _clean(d1["univers"]), fill=(130, 130, 140, 200), font=f_tiny, anchor="mm")
    db.text((cx2, BTM_Y + 53), _clean(d2["univers"]), fill=(130, 130, 140, 200), font=f_tiny, anchor="mm")

    # Barres de puissance
    BY, BH, BW = BTM_Y + 70, 13, COL - 50
    BX1, BX2   = PAD + 8, MID + PAD + 8

    def _bar(x: int, y: int, pct: int, color: tuple) -> None:
        # fond
        try:
            db.rounded_rectangle([x, y, x + BW, y + BH], radius=5, fill=(22, 22, 30))
        except (AttributeError, TypeError):
            db.rectangle([x, y, x + BW, y + BH], fill=(22, 22, 30))
        # remplissage
        fw = int(BW * pct / 100)
        if fw:
            try:
                db.rounded_rectangle([x, y, x + fw, y + BH], radius=5, fill=color)
            except (AttributeError, TypeError):
                db.rectangle([x, y, x + fw, y + BH], fill=color)
        db.text((x + BW + 6, y + BH // 2), f"{pct}%", fill=(220, 220, 220), font=f_tiny, anchor="lm")

    _bar(BX1, BY, pct1, d1["color"])
    _bar(BX2, BY, pct2, d2["color"])

    # Résultat
    db.text((MID, BTM_Y + 108), f">> {_clean(result)} <<",
            fill=(255, 230, 70, 255), font=f_res, anchor="mm")

    # Phrase de rivalité (haut de l'image)
    db.text((MID, 10), _clean(rivalry),
            fill=(190, 185, 160, 200), font=f_riv, anchor="mt")

    # ── Export ────────────────────────────────────────────────────
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

        # Tirage aléatoire — deux persos différents
        k1, k2 = random.sample(list(CHARS.keys()), 2)
        d1, d2  = CHARS[k1], CHARS[k2]

        # Résultat
        outcome = random.choices(["p1", "p2", "draw"], weights=[40, 40, 20])[0]
        if outcome == "p1":
            pct1 = random.randint(56, 88);  pct2 = 100 - pct1
            result = random.choice(_WIN).format(w=d1["display"])
        elif outcome == "p2":
            pct2 = random.randint(56, 88);  pct1 = 100 - pct2
            result = random.choice(_WIN).format(w=d2["display"])
        else:
            pct1 = pct2 = 50
            result = random.choice(_DRAW)

        rivalry = random.choice(_RIVALRIES)

        # Téléchargement parallèle des images
        img1, img2 = await asyncio.gather(
            _fetch(d1["gif"], d1["color"]),
            _fetch(d2["gif"], d2["color"]),
        )

        # Génération PIL dans un thread (non-bloquant)
        loop = asyncio.get_running_loop()
        buf  = await loop.run_in_executor(
            None,
            lambda: _build_card(img1, d1, pct1, img2, d2, pct2, rivalry, result),
        )

        embed = discord.Embed(
            title="⚔️  D U E L   É P I Q U E  ⚔️",
            color=0xE63939,
        )
        embed.description = (
            f"### {d1['display']}  `VS`  {d2['display']}\n"
            f"*{rivalry}*"
        )
        embed.set_image(url="attachment://duel.png")
        embed.set_footer(text="⚔️ Brams Score • Duel Arena  |  /duel pour rejouer !")
        embed.timestamp = discord.utils.utcnow()

        await interaction.followup.send(
            file=discord.File(buf, filename="duel.png"),
            embed=embed,
        )
        log.info("[DuelCog] %s vs %s → %d%%/%d%%", d1["display"], d2["display"], pct1, pct2)


# ══════════════════════════════════════════════════════════════════
#  SETUP
# ══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
