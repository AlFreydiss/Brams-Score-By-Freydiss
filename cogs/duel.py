"""
Cog — /duel  ⚔️  Duel Épique Anime
====================================
• Sélection 100% aléatoire des deux combattants
• Carte PIL composite : les deux images côte à côte sur un fond battle
• Résultat aléatoire avec barres de puissance style fighting game
• Aucun paramètre requis
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
#  POLICES  (mêmes fichiers que le bot principal)
# ══════════════════════════════════════════════════════════════════
_FONT_KOMIKAX = "KOMIKAX_.ttf"
_FONT_PIRATA  = "PirataOne-Regular.ttf"
_FONT_RIGHT   = "Righteous-Regular.ttf"

def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# ══════════════════════════════════════════════════════════════════
#  BASE PERSONNAGES — gif = lien direct image/GIF animé
#  Remplacer les URLs si un lien meurt (Tenor CDN est plus stable)
# ══════════════════════════════════════════════════════════════════
CHARS: dict[str, dict] = {
    "luffy": {
        "display": "Monkey D. Luffy",
        "gif":     "https://media.tenor.com/pTRBdL0Ypl8AAAAC/luffy-one-piece.gif",
        "univers": "One Piece",
        "titre":   "Futur Roi des Pirates",
        "color":   (255, 140, 0),
    },
    "zoro": {
        "display": "Roronoa Zoro",
        "gif":     "https://media.tenor.com/HsWKSMEOFJMAAAAC/zoro-roronoa-zoro.gif",
        "univers": "One Piece",
        "titre":   "Premier Épéiste du Monde",
        "color":   (50, 200, 80),
    },
    "sanji": {
        "display": "Sanji",
        "gif":     "https://media.tenor.com/RLv0o-YjEKQAAAAC/sanji-one-piece.gif",
        "univers": "One Piece",
        "titre":   "Le Cuisinier du Diable",
        "color":   (220, 220, 0),
    },
    "naruto": {
        "display": "Naruto Uzumaki",
        "gif":     "https://media.tenor.com/kxxSVhaCU6UAAAAC/naruto-run.gif",
        "univers": "Naruto",
        "titre":   "Septieme Hokage",
        "color":   (255, 120, 0),
    },
    "sasuke": {
        "display": "Sasuke Uchiha",
        "gif":     "https://media.tenor.com/jkk9lRJEMKIAAAAC/sasuke-uchiha-anime.gif",
        "univers": "Naruto",
        "titre":   "Ninja de l'Ombre",
        "color":   (100, 0, 200),
    },
    "kakashi": {
        "display": "Kakashi Hatake",
        "gif":     "https://media.tenor.com/8Cg-P9TT3UYAAAAC/kakashi-lightning.gif",
        "univers": "Naruto",
        "titre":   "Copieur de Mille Jutsu",
        "color":   (150, 200, 255),
    },
    "goku": {
        "display": "Son Goku",
        "gif":     "https://media.tenor.com/xLNvHVNXaXYAAAAC/goku-ssj.gif",
        "univers": "Dragon Ball",
        "titre":   "Super Saiyan Legendaire",
        "color":   (255, 220, 0),
    },
    "vegeta": {
        "display": "Vegeta",
        "gif":     "https://media.tenor.com/Ei0L3xpqO6YAAAAC/vegeta-dragon-ball.gif",
        "univers": "Dragon Ball",
        "titre":   "Prince des Saiyans",
        "color":   (180, 0, 255),
    },
    "ichigo": {
        "display": "Ichigo Kurosaki",
        "gif":     "https://media.tenor.com/C2sHBiI9pxcAAAAC/ichigo-kurosaki-bleach.gif",
        "univers": "Bleach",
        "titre":   "Substitut Shinigami",
        "color":   (255, 80, 80),
    },
    "aizen": {
        "display": "Sosuke Aizen",
        "gif":     "https://media.tenor.com/XfkMRVH48XEAAAAC/aizen-bleach.gif",
        "univers": "Bleach",
        "titre":   "Seigneur des Arrancar",
        "color":   (200, 180, 255),
    },
    "saitama": {
        "display": "Saitama",
        "gif":     "https://media.tenor.com/VOTGiEPMoRoAAAAC/saitama-one-punch.gif",
        "univers": "One Punch Man",
        "titre":   "Heros par Loisir",
        "color":   (255, 240, 100),
    },
    "mob": {
        "display": "Shigeo Kageyama",
        "gif":     "https://media.tenor.com/KDZmyv8BmvgAAAAC/mob-psycho-100.gif",
        "univers": "Mob Psycho 100",
        "titre":   "100% Psychique",
        "color":   (180, 180, 255),
    },
    "tanjiro": {
        "display": "Tanjiro Kamado",
        "gif":     "https://media.tenor.com/7Qk2VnGQWm4AAAAC/tanjiro-demon-slayer.gif",
        "univers": "Demon Slayer",
        "titre":   "Pourfendeur de Demons",
        "color":   (0, 180, 220),
    },
    "rengoku": {
        "display": "Kyojuro Rengoku",
        "gif":     "https://media.tenor.com/DUO3_6vbZgEAAAAC/rengoku-flame.gif",
        "univers": "Demon Slayer",
        "titre":   "Pilier de la Flamme",
        "color":   (255, 100, 0),
    },
    "eren": {
        "display": "Eren Yeager",
        "gif":     "https://media.tenor.com/JnKTkh8bY0AAAAAC/eren-yeager-attack-on-titan.gif",
        "univers": "Attaque des Titans",
        "titre":   "Le Titan Fondateur",
        "color":   (180, 100, 0),
    },
    "levi": {
        "display": "Levi Ackerman",
        "gif":     "https://media.tenor.com/PJYV7WaJEpQAAAAC/levi-ackerman-attack-on-titan.gif",
        "univers": "Attaque des Titans",
        "titre":   "Le Soldat le Plus Fort",
        "color":   (150, 200, 200),
    },
    "gojo": {
        "display": "Satoru Gojo",
        "gif":     "https://media.tenor.com/lKHxJTuJhYAAAAAC/gojo-satoru-jujutsu-kaisen.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Le Plus Fort du Monde",
        "color":   (100, 200, 255),
    },
    "sukuna": {
        "display": "Ryomen Sukuna",
        "gif":     "https://media.tenor.com/A9A7HDzIZoAAAAAC/sukuna-jujutsu-kaisen.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Roi des Fleaux",
        "color":   (220, 0, 50),
    },
    "meliodas": {
        "display": "Meliodas",
        "gif":     "https://media.tenor.com/Dq9j4HcNoBkAAAAC/meliodas-seven-deadly-sins.gif",
        "univers": "Nanatsu no Taizai",
        "titre":   "Dragon's Sin of Wrath",
        "color":   (255, 80, 80),
    },
    "escanor": {
        "display": "Escanor",
        "gif":     "https://media.tenor.com/bUJd9GHaT4UAAAAC/escanor-seven-deadly-sins.gif",
        "univers": "Nanatsu no Taizai",
        "titre":   "Lion's Sin of Pride",
        "color":   (255, 200, 0),
    },
    "natsu": {
        "display": "Natsu Dragneel",
        "gif":     "https://media.tenor.com/kE7zb2bxbdoAAAAC/natsu-fairy-tail.gif",
        "univers": "Fairy Tail",
        "titre":   "Dragon Slayer du Feu",
        "color":   (255, 80, 0),
    },
    "edward": {
        "display": "Edward Elric",
        "gif":     "https://media.tenor.com/5EpNvT8ORVQAAAAC/edward-elric-fma.gif",
        "univers": "Fullmetal Alchemist",
        "titre":   "Alchimiste d'Acier",
        "color":   (220, 180, 0),
    },
    "gintoki": {
        "display": "Gintoki Sakata",
        "gif":     "https://media.tenor.com/ZT5bGF3xWXMAAAAC/gintoki-gintama.gif",
        "univers": "Gintama",
        "titre":   "Le Samourai du Ciel",
        "color":   (200, 200, 255),
    },
    "giorno": {
        "display": "Giorno Giovanna",
        "gif":     "https://media.tenor.com/wTbq8yJ5VQYAAAAC/giorno-giovanna-jojo.gif",
        "univers": "JoJo's Bizarre Adventure",
        "titre":   "Capo di Passione",
        "color":   (255, 180, 200),
    },
    "jotaro": {
        "display": "Jotaro Kujo",
        "gif":     "https://media.tenor.com/oLyBFGHp_OEAAAAC/jotaro-kujo-jojo.gif",
        "univers": "JoJo's Bizarre Adventure",
        "titre":   "Star Platinum",
        "color":   (80, 200, 255),
    },
}

# ── Textes battle ──────────────────────────────────────────────────
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
    "{w} domine avec une puissance absolument ecrasante !",
    "{w} remporte ce round sans meme transpirer.",
    "{w} sort vainqueur de ce duel apocalyptique !",
    "{w} transcende ses limites et s'impose !",
    "{w} delivre le coup de grace avec une brutalite absolue.",
]

_DRAW = [
    "Match nul ! Les deux combattants s'effondrent ensemble.",
    "Egalite absolue — leurs forces se neutralisent.",
    "Nul ! La Terre ne peut pas les departager.",
]


# ══════════════════════════════════════════════════════════════════
#  HELPERS IMAGE
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F9FF"
    "\U00002702-\U000027B0"
    "\u2600-\u26FF"
    "\u2700-\u27BF"
    "]+",
    flags=re.UNICODE,
)


def _clean(text: str) -> str:
    return _EMOJI_RE.sub("", text).strip()


async def _fetch_frame(url: str) -> Image.Image:
    """Télécharge l'URL et retourne une frame RGBA utilisable."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=12)
            ) as r:
                if r.status != 200:
                    raise ValueError(f"HTTP {r.status}")
                data = await r.read()
        img = Image.open(io.BytesIO(data))
        # Frame du tiers initial — généralement la meilleure pose
        if hasattr(img, "n_frames") and img.n_frames > 1:
            try:
                img.seek(img.n_frames // 4)
            except EOFError:
                img.seek(0)
        return img.convert("RGBA")
    except Exception as exc:
        log.warning("[DuelCog] fetch_frame(%s) → %s", url, exc)
        ph = Image.new("RGBA", (300, 360), (20, 20, 30, 255))
        d  = ImageDraw.Draw(ph)
        f  = _font(_FONT_KOMIKAX, 48)
        d.text((150, 180), "?", fill=(100, 100, 120, 200), font=f, anchor="mm")
        return ph


def _rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, fill) -> None:
    try:
        draw.rounded_rectangle(xy, radius=radius, fill=fill)
    except (AttributeError, TypeError):
        draw.rectangle(xy, fill=fill)


def _draw_power_bar(
    draw: ImageDraw.ImageDraw,
    x: int, y: int, w: int, h: int,
    pct: int, color: tuple, rtl: bool = False,
    font: ImageFont.FreeTypeFont = None,
) -> None:
    """Barre de puissance style fighting game."""
    fill_w = int(w * pct / 100)
    _rounded_rect(draw, [x, y, x + w, y + h], 5, (25, 25, 35))
    if fill_w > 0:
        if rtl:
            _rounded_rect(draw, [x + w - fill_w, y, x + w, y + h], 5, color)
        else:
            _rounded_rect(draw, [x, y, x + fill_w, y + h], 5, color)
    if font:
        label = f"{pct}%"
        if rtl:
            draw.text((x - 6, y + h // 2), label, fill=(230, 230, 230), font=font, anchor="rm")
        else:
            draw.text((x + w + 6, y + h // 2), label, fill=(230, 230, 230), font=font, anchor="lm")


def _build_card(
    img1: Image.Image, d1: dict, pct1: int,
    img2: Image.Image, d2: dict, pct2: int,
    rivalry: str, result: str,
) -> io.BytesIO:
    W, H   = 960, 540
    PAD    = 20
    CENTER = W // 2
    COL_W  = (W - PAD * 3) // 2   # ~455px chacun

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw   = ImageDraw.Draw(canvas)

    # ── Fond gradient vertical sombre ─────────────────────────────
    for y in range(H):
        t = 1.0 - abs(y / H - 0.4)
        t = max(0.0, t)
        r = int(55 * t * t)
        g = int(8  * t)
        b = int(12 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # ── Panneaux colorés gauche / droite ──────────────────────────
    def _tinted_panel(color: tuple, size: tuple) -> Image.Image:
        p = Image.new("RGBA", size, (*color, 0))
        for x in range(size[0]):
            alpha = int(55 * (1 - abs(x / size[0] - 0.5) * 2))
            for y2 in range(size[1]):
                p.putpixel((x, y2), (*color, alpha))
        return p

    pnl1 = _tinted_panel(d1["color"], (COL_W + PAD, H))
    pnl2 = _tinted_panel(d2["color"], (COL_W + PAD, H))
    canvas.alpha_composite(pnl1, (0, 0))
    canvas.alpha_composite(pnl2, (CENTER, 0))

    # ── Ligne de séparation centrale lumineuse ────────────────────
    glow_line = Image.new("RGBA", (6, H), (0, 0, 0, 0))
    for xi in range(6):
        alpha = int(200 * (1 - abs(xi - 2.5) / 3))
        for yi in range(H):
            glow_line.putpixel((xi, yi), (255, 160, 0, alpha))
    canvas.alpha_composite(glow_line, (CENTER - 3, 0))

    # ── Images personnages ─────────────────────────────────────────
    CHAR_MAX_H = H - 140
    CHAR_MAX_W = COL_W - 20

    def _place(img: Image.Image, panel_x: int) -> None:
        img = img.copy()
        img.thumbnail((CHAR_MAX_W, CHAR_MAX_H), Image.LANCZOS)
        # Légère lueur derrière le perso
        glow = img.filter(ImageFilter.GaussianBlur(18))
        gx = panel_x + (COL_W - img.width)  // 2
        gy = max(PAD, (CHAR_MAX_H - img.height) // 2)
        canvas.alpha_composite(glow, (gx, gy))
        canvas.alpha_composite(img,  (gx, gy))

    _place(img1, PAD)
    _place(img2, CENTER + PAD)

    # ── VS central ────────────────────────────────────────────────
    vs_glow = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    gd = ImageDraw.Draw(vs_glow)
    for rad in range(80, 0, -4):
        a = int(180 * (1 - rad / 80) ** 2)
        gd.ellipse([80 - rad, 80 - rad, 80 + rad, 80 + rad], fill=(255, 80, 0, a))
    vs_glow = vs_glow.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(vs_glow, (CENTER - 80, H // 2 - 130))

    f_vs   = _font(_FONT_KOMIKAX, 76)
    draw2  = ImageDraw.Draw(canvas)
    # Ombre du VS
    draw2.text((CENTER + 3, H // 2 - 70 + 3), "VS", fill=(80, 0, 0, 180), font=f_vs, anchor="mm")
    draw2.text((CENTER,     H // 2 - 70),      "VS", fill=(255, 210, 0,  255), font=f_vs, anchor="mm")

    # ── Bande du bas semi-transparente ────────────────────────────
    BTM_H = 145
    BTM_Y = H - BTM_H
    btm   = Image.new("RGBA", (W, BTM_H), (5, 5, 10, 215))
    canvas.alpha_composite(btm, (0, BTM_Y))

    # Ligne de séparation haut de la bande
    draw3 = ImageDraw.Draw(canvas)
    draw3.line([(0, BTM_Y), (W, BTM_Y)], fill=(200, 60, 0, 220), width=2)
    # Ligne VS séparation dans la bande
    draw3.line([(CENTER, BTM_Y), (CENTER, H)], fill=(80, 80, 90, 180), width=1)

    # Polices
    f_name = _font(_FONT_KOMIKAX, 26)
    f_sub  = _font(_FONT_RIGHT,   16)
    f_tiny = _font(_FONT_RIGHT,   13)
    f_res  = _font(_FONT_RIGHT,   18)

    # Nom + titre + univers perso 1
    cx1 = COL_W // 2 + PAD
    draw3.text((cx1, BTM_Y + 18), _clean(d1["display"]), fill=d1["color"],  font=f_name, anchor="mm")
    draw3.text((cx1, BTM_Y + 40), _clean(d1["titre"]),   fill=(200, 200, 200), font=f_sub,  anchor="mm")
    draw3.text((cx1, BTM_Y + 56), _clean(d1["univers"]), fill=(140, 140, 150), font=f_tiny, anchor="mm")

    # Nom + titre + univers perso 2
    cx2 = CENTER + COL_W // 2 + PAD
    draw3.text((cx2, BTM_Y + 18), _clean(d2["display"]), fill=d2["color"],  font=f_name, anchor="mm")
    draw3.text((cx2, BTM_Y + 40), _clean(d2["titre"]),   fill=(200, 200, 200), font=f_sub,  anchor="mm")
    draw3.text((cx2, BTM_Y + 56), _clean(d2["univers"]), fill=(140, 140, 150), font=f_tiny, anchor="mm")

    # Barres de puissance
    BAR_Y  = BTM_Y + 72
    BAR_H  = 14
    BAR_W  = COL_W - 60

    _draw_power_bar(draw3, PAD + 10,          BAR_Y, BAR_W, BAR_H, pct1, d1["color"], rtl=False, font=f_tiny)
    _draw_power_bar(draw3, CENTER + PAD + 10, BAR_Y, BAR_W, BAR_H, pct2, d2["color"], rtl=False, font=f_tiny)

    # Résultat
    clean_res = _clean(result)
    draw3.text((CENTER, BTM_Y + 108), f">> {clean_res} <<",
               fill=(255, 230, 80), font=f_res, anchor="mm")

    # Phrase de rivalité (petite, en haut)
    f_riv = _font(_FONT_RIGHT, 14)
    draw3.text((CENTER, PAD + 8), _clean(rivalry),
               fill=(200, 200, 180, 200), font=f_riv, anchor="mt")

    # ── Export PNG ────────────────────────────────────────────────
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
        description="⚔️ Lance un duel epique entre deux personnages anime tires au sort !",
    )
    async def duel(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()

        # Tirage aléatoire — deux personnages différents
        keys = random.sample(list(CHARS.keys()), 2)
        d1, d2 = CHARS[keys[0]], CHARS[keys[1]]

        # Résultat
        outcome = random.choices(["p1", "p2", "draw"], weights=[40, 40, 20])[0]
        if outcome == "p1":
            pct1    = random.randint(56, 88)
            pct2    = 100 - pct1
            result  = random.choice(_WIN).format(w=d1["display"])
        elif outcome == "p2":
            pct2    = random.randint(56, 88)
            pct1    = 100 - pct2
            result  = random.choice(_WIN).format(w=d2["display"])
        else:
            pct1 = pct2 = 50
            result = random.choice(_DRAW)

        rivalry = random.choice(_RIVALRIES)

        # Téléchargement des frames en parallèle
        img1, img2 = await asyncio.gather(
            _fetch_frame(d1["gif"]),
            _fetch_frame(d2["gif"]),
        )

        # Génération de la carte PIL
        buf = await asyncio.get_event_loop().run_in_executor(
            None,
            _build_card,
            img1, d1, pct1,
            img2, d2, pct2,
            rivalry, result,
        )

        # Embed wrapper Discord
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
        log.info("[DuelCog] %s vs %s → %s%%/%s%%", d1["display"], d2["display"], pct1, pct2)


# ══════════════════════════════════════════════════════════════════
#  SETUP
# ══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
