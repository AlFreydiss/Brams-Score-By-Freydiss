"""
Cog — /duel  ⚔️  Duel Épique Anime
====================================
• Sélection 100% aléatoire
• Carte PIL composite : les deux persos côte à côte
• GIFs via Giphy Search API (GIPHY_API_KEY dans les variables Railway)
• Fallback couleur si API indisponible
• Sondage réactions après la carte
"""

from __future__ import annotations

import asyncio
import io
import logging
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
#  GIPHY API  —  clé gratuite sur https://developers.giphy.com
#  Ajouter GIPHY_API_KEY dans les variables Railway
# ══════════════════════════════════════════════════════════════════
GIPHY_KEY  = os.getenv("GIPHY_API_KEY", "")
_gif_cache: dict[str, str] = {}   # cache mémoire pour éviter les appels répétés

# ══════════════════════════════════════════════════════════════════
#  POLICES
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
#  query = termes de recherche Giphy (en anglais pour de meilleurs résultats)
#  color = couleur RGB
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
        "titre":   "Ninja de l'Ombre",
        "color":   (130, 0, 220),
    },
    "kakashi": {
        "display": "Kakashi Hatake",
        "query":   "kakashi hatake chidori lightning",
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
        "query":   "vegeta dragon ball prince saiyan",
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
        "titre":   "Dragon's Sin of Wrath",
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
        "titre":   "Alchimiste d'Acier",
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
        "query":   "giorno giovanna jojo bizarre",
        "univers": "JoJo's Bizarre Adventure",
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
    """Retourne l'URL du premier GIF Giphy correspondant à la query."""
    if query in _gif_cache:
        return _gif_cache[query]
    if not GIPHY_KEY:
        return ""
    params = urllib.parse.urlencode({
        "api_key": GIPHY_KEY,
        "q":       query,
        "limit":   "3",
        "rating":  "g",
        "lang":    "en",
    })
    api_url = f"https://api.giphy.com/v1/gifs/search?{params}"
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(api_url, timeout=aiohttp.ClientTimeout(total=8)) as r:
                if r.status != 200:
                    raise ValueError(f"Giphy HTTP {r.status}")
                data = await r.json()
        items = data.get("data", [])
        if not items:
            return ""
        gif_url = items[0]["images"]["original"]["url"]
        _gif_cache[query] = gif_url
        log.info("[DuelCog] Giphy cache %s → OK", query)
        return gif_url
    except Exception as exc:
        log.warning("[DuelCog] Giphy search(%s) → %s", query, exc)
        return ""

# ══════════════════════════════════════════════════════════════════
#  FETCH IMAGE
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF]+", flags=re.UNICODE)

def _clean(t: str) -> str:
    return _EMOJI_RE.sub("", t).strip()


def _placeholder(color: tuple, name: str, w: int = 320, h: int = 400) -> Image.Image:
    """Panneau coloré affiché quand aucune image n'est disponible."""
    img = Image.new("RGBA", (w, h), (10, 10, 15, 255))
    d   = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(color[0] * (1 - t) * 0.5)
        g = int(color[1] * (1 - t) * 0.5)
        b = int(color[2] * (1 - t) * 0.5)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))
    # Initiale du nom en grand
    initial = _clean(name)[0].upper() if name else "?"
    d.text((w // 2, h // 2), initial, fill=(*color, 200),
           font=_f(_FK, 140), anchor="mm")
    return img


async def _fetch(url: str, color: tuple, name: str) -> Image.Image:
    """Télécharge l'URL et retourne une frame RGBA, ou un placeholder."""
    if not url:
        return _placeholder(color, name)
    ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    try:
        async with aiohttp.ClientSession(headers={"User-Agent": ua}) as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=12)) as r:
                if r.status != 200:
                    raise ValueError(f"HTTP {r.status}")
                data = await r.read()
        img = Image.open(io.BytesIO(data))
        if getattr(img, "n_frames", 1) > 1:
            try:
                img.seek(img.n_frames // 4)
            except EOFError:
                img.seek(0)
        return img.convert("RGBA")
    except Exception as exc:
        log.warning("[DuelCog] fetch(%s) → %s — placeholder", url[:60], exc)
        return _placeholder(color, name)

# ══════════════════════════════════════════════════════════════════
#  GÉNÉRATION CARTE PIL
# ══════════════════════════════════════════════════════════════════

def _f_safe(path: str, size: int) -> ImageFont.FreeTypeFont:
    return _f(path, size)


def _rounded_rect(draw: ImageDraw.ImageDraw, xy, r: int, fill) -> None:
    try:
        draw.rounded_rectangle(xy, radius=r, fill=fill)
    except (AttributeError, TypeError):
        draw.rectangle(xy, fill=fill)


def _build_card(
    img1: Image.Image, d1: dict, pct1: int,
    img2: Image.Image, d2: dict, pct2: int,
    rivalry: str, result: str,
) -> io.BytesIO:
    W, H = 960, 540
    MID  = W // 2
    PAD  = 18
    COL  = MID - PAD

    canvas = Image.new("RGBA", (W, H), (6, 6, 10, 255))
    draw   = ImageDraw.Draw(canvas)

    # Fond dégradé vertical sombre
    for y in range(H):
        t = max(0.0, 1.0 - abs(y / H - 0.40) * 1.9)
        draw.line([(0, y), (W, y)], fill=(int(52*t*t), int(7*t), int(10*t), 255))

    # Tints colorés gauche / droite (via draw.line — rapide)
    for x in range(COL + PAD):
        fade = max(0.0, 1.0 - abs(x / (COL + PAD) - 0.5) * 2)
        a = int(42 * fade)
        draw.line([(x,       0), (x,       H)], fill=(*d1["color"], a))
        draw.line([(MID + x, 0), (MID + x, H)], fill=(*d2["color"], a))

    # Séparateur central lumineux
    for xi in range(-4, 5):
        a = int(230 * (1 - abs(xi) / 5))
        draw.line([(MID + xi, 0), (MID + xi, H)], fill=(255, 140, 0, a))

    # ── Images personnages ─────────────────────────────────────────
    MAX_W, MAX_H = COL - 20, H - 128

    def _paste(img: Image.Image, px_left: int) -> None:
        img = img.copy()
        img.thumbnail((MAX_W, MAX_H), Image.LANCZOS)
        glow = img.filter(ImageFilter.GaussianBlur(18))
        px = px_left + (COL - img.width)  // 2
        py = max(PAD, (MAX_H - img.height) // 2)
        canvas.alpha_composite(glow, (px, py))
        canvas.alpha_composite(img,  (px, py))

    _paste(img1, PAD)
    _paste(img2, MID + PAD)

    # ── Halo + VS central ─────────────────────────────────────────
    halo = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    hd   = ImageDraw.Draw(halo)
    for rad in range(90, 0, -5):
        a = int(150 * (1 - rad / 90) ** 1.5)
        hd.ellipse([90-rad, 90-rad, 90+rad, 90+rad], fill=(255, 80, 0, a))
    halo = halo.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(halo, (MID - 90, H // 2 - 145))

    dv   = ImageDraw.Draw(canvas)
    f_vs = _f_safe(_FK, 80)
    dv.text((MID + 3, H // 2 - 82 + 3), "VS", fill=(60, 0, 0, 200), font=f_vs, anchor="mm")
    dv.text((MID,     H // 2 - 82),      "VS", fill=(255, 215, 0, 255), font=f_vs, anchor="mm")

    # ── Bande inférieure ──────────────────────────────────────────
    BTM_H = 148
    BTM_Y = H - BTM_H
    btm   = Image.new("RGBA", (W, BTM_H), (4, 4, 8, 218))
    canvas.alpha_composite(btm, (0, BTM_Y))

    db = ImageDraw.Draw(canvas)
    db.line([(0,   BTM_Y), (W,   BTM_Y)], fill=(200, 55, 0, 200), width=2)
    db.line([(MID, BTM_Y), (MID, H)],     fill=(55, 55, 65, 160), width=1)

    f_name = _f_safe(_FK, 24)
    f_sub  = _f_safe(_FR, 15)
    f_tiny = _f_safe(_FR, 12)
    f_res  = _f_safe(_FR, 17)
    f_riv  = _f_safe(_FR, 13)

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
    BY, BH = BTM_Y + 70, 13
    BW     = COL - 50
    BX1, BX2 = PAD + 8, MID + PAD + 8

    for bx, pct, color in [(BX1, pct1, d1["color"]), (BX2, pct2, d2["color"])]:
        _rounded_rect(db, [bx, BY, bx + BW, BY + BH], 5, (22, 22, 30))
        fw = int(BW * pct / 100)
        if fw:
            _rounded_rect(db, [bx, BY, bx + fw, BY + BH], 5, color)
        db.text((bx + BW + 6, BY + BH // 2), f"{pct}%", fill=(220, 220, 220), font=f_tiny, anchor="lm")

    # Résultat
    db.text((MID, BTM_Y + 108), f">> {_clean(result)} <<",
            fill=(255, 230, 70, 255), font=f_res, anchor="mm")

    # Phrase de rivalité en haut
    db.text((MID, 9), _clean(rivalry),
            fill=(185, 180, 155, 200), font=f_riv, anchor="mt")

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

        # Tirage aléatoire
        k1, k2 = random.sample(list(CHARS.keys()), 2)
        d1, d2  = CHARS[k1], CHARS[k2]

        # Résultat
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

        # Recherche GIFs sur Giphy + téléchargement en parallèle
        url1, url2 = await asyncio.gather(
            _search_gif(d1["query"]),
            _search_gif(d2["query"]),
        )
        img1, img2 = await asyncio.gather(
            _fetch(url1, d1["color"], d1["display"]),
            _fetch(url2, d2["color"], d2["display"]),
        )

        # Génération PIL dans un thread
        loop = asyncio.get_running_loop()
        buf  = await loop.run_in_executor(
            None,
            lambda: _build_card(img1, d1, pct1, img2, d2, pct2, rivalry, result),
        )

        # Embed principal
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

        # Sondage réactions
        poll_embed = discord.Embed(
            title="🗳️  QUI VA GAGNER ?  Votez !",
            description=(
                f"🔴  **{d1['display']}**  *({d1['univers']})*\n"
                f"🔵  **{d2['display']}**  *({d2['univers']})*\n\n"
                f"**Cliquez sur une réaction ci-dessus pour voter !**"
            ),
            color=0x2B2D31,
        )
        poll_embed.set_footer(text="⚔️ Le vote est ouvert — que le meilleur gagne !")
        poll_msg = await interaction.channel.send(embed=poll_embed)
        await poll_msg.add_reaction("🔴")
        await poll_msg.add_reaction("🔵")

        log.info("[DuelCog] %s vs %s → %d%%/%d%%", d1["display"], d2["display"], pct1, pct2)


# ══════════════════════════════════════════════════════════════════
#  SETUP
# ══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
