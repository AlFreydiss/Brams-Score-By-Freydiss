"""
Cog — /duel  ⚔️  Duel Épique Anime
====================================
• PIL génère la carte VS (texte/barres) — ZERO téléchargement externe dans PIL
• Les GIFs des persos sont affichés via embed Discord (Giphy API ou fallback)
• Sondage réactions 🔴 / 🔵
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
#  GIPHY  — clé gratuite sur https://developers.giphy.com
#  Ajouter GIPHY_API_KEY dans les variables d'environnement Railway
# ══════════════════════════════════════════════════════════════════
GIPHY_KEY  = os.getenv("GIPHY_API_KEY", "")
_gif_cache: dict[str, str] = {}

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
    """Retourne l'URL du premier GIF Giphy. Retourne '' si pas de clé/erreur."""
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
#  CARTE PIL  —  ZERO téléchargement externe, génération 100% locale
# ══════════════════════════════════════════════════════════════════

_EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF]+", flags=re.UNICODE)

def _clean(t: str) -> str:
    return _EMOJI_RE.sub("", t).strip()


def _rr(draw: ImageDraw.ImageDraw, xy, r: int, fill) -> None:
    try:
        draw.rounded_rectangle(xy, radius=r, fill=fill)
    except (AttributeError, TypeError):
        draw.rectangle(xy, fill=fill)


def _build_card(
    d1: dict, pct1: int,
    d2: dict, pct2: int,
    rivalry: str, result: str,
) -> io.BytesIO:
    """Carte battle 100% PIL — aucune image externe."""
    W, H = 900, 420
    MID  = W // 2

    canvas = Image.new("RGB", (W, H), (6, 6, 10))
    draw   = ImageDraw.Draw(canvas)

    # ── Fond dégradé ─────────────────────────────────────────────
    for y in range(H):
        t = max(0.0, 1.0 - abs(y / H - 0.38) * 1.9)
        draw.line([(0, y), (W, y)], fill=(int(55*t*t), int(8*t), int(12*t)))

    # ── Tints colorés gauche/droite ───────────────────────────────
    for x in range(MID):
        fade = max(0.0, 1.0 - abs(x / MID - 0.5) * 2)
        a1   = int(60 * fade)
        a2   = int(60 * fade)
        r1, g1, b1 = d1["color"]
        r2, g2, b2 = d2["color"]
        # Blend manuel (pas d'alpha sur Image.new "RGB")
        for yy in [0]:  # on dessine des lignes verticales
            pass
        draw.line([(x,       0), (x,       H)],
                  fill=(int(r1*a1/255 + 6*(255-a1)/255),
                        int(g1*a1/255 + 6*(255-a1)/255),
                        int(b1*a1/255 + 10*(255-a1)/255)))
        draw.line([(MID + x, 0), (MID + x, H)],
                  fill=(int(r2*a2/255 + 6*(255-a2)/255),
                        int(g2*a2/255 + 6*(255-a2)/255),
                        int(b2*a2/255 + 10*(255-a2)/255)))

    # ── Séparateur central ────────────────────────────────────────
    for xi in range(-3, 4):
        a = int(220 * (1 - abs(xi) / 4))
        draw.line([(MID + xi, 0), (MID + xi, H)],
                  fill=(int(255 * a / 255), int(140 * a / 255), 0))

    # ── Panneaux personnages ──────────────────────────────────────
    PNL_Y, PNL_H = 30, H - 160
    PNL_W        = MID - 30

    def _panel(x: int, color: tuple) -> None:
        r, g, b = color
        _rr(draw, [x, PNL_Y, x + PNL_W, PNL_Y + PNL_H], 12,
            (max(0, r - 180), max(0, g - 180), max(0, b - 180)))
        # Bordure colorée
        for i in range(3):
            draw.rounded_rectangle(
                [x + i, PNL_Y + i, x + PNL_W - i, PNL_Y + PNL_H - i],
                radius=12 - i,
                outline=(*color,),
                width=1,
            ) if hasattr(draw, "rounded_rectangle") else None

    _panel(15,        d1["color"])
    _panel(MID + 15,  d2["color"])

    # ── Initiale géante dans chaque panneau ───────────────────────
    f_init = _f(_FK, 160)
    cx1    = 15 + PNL_W // 2
    cx2    = MID + 15 + PNL_W // 2
    cy_init = PNL_Y + PNL_H // 2 - 10

    def _initial(cx: int, name: str, color: tuple) -> None:
        letter = _clean(name)[0].upper()
        r, g, b = color
        # Ombre
        draw.text((cx + 4, cy_init + 4), letter,
                  fill=(max(0, r - 150), max(0, g - 150), max(0, b - 150)),
                  font=f_init, anchor="mm")
        draw.text((cx, cy_init), letter,
                  fill=color, font=f_init, anchor="mm")

    _initial(cx1, d1["display"], d1["color"])
    _initial(cx2, d2["display"], d2["color"])

    # ── Noms et titres dans les panneaux ─────────────────────────
    f_name = _f(_FK, 22)
    f_sub  = _f(_FR, 14)

    draw.text((cx1, PNL_Y + PNL_H - 38), _clean(d1["display"]),
              fill=d1["color"], font=f_name, anchor="mm")
    draw.text((cx1, PNL_Y + PNL_H - 18), _clean(d1["titre"]),
              fill=(180, 180, 180), font=f_sub, anchor="mm")
    draw.text((cx2, PNL_Y + PNL_H - 38), _clean(d2["display"]),
              fill=d2["color"], font=f_name, anchor="mm")
    draw.text((cx2, PNL_Y + PNL_H - 18), _clean(d2["titre"]),
              fill=(180, 180, 180), font=f_sub, anchor="mm")

    # ── VS central ────────────────────────────────────────────────
    f_vs = _f(_FK, 72)
    draw.text((MID + 3, H // 2 - 80 + 3), "VS",
              fill=(60, 0, 0), font=f_vs, anchor="mm")
    draw.text((MID, H // 2 - 80), "VS",
              fill=(255, 215, 0), font=f_vs, anchor="mm")

    # ── Phrase rivalité (haut) ────────────────────────────────────
    f_riv = _f(_FR, 13)
    draw.text((MID, 10), _clean(rivalry),
              fill=(180, 175, 150), font=f_riv, anchor="mt")

    # ── Bande inférieure ──────────────────────────────────────────
    BTM_Y = H - 128
    _rr(draw, [0, BTM_Y, W, H], 0, (4, 4, 8))
    draw.line([(0, BTM_Y), (W, BTM_Y)], fill=(200, 55, 0), width=2)
    draw.line([(MID, BTM_Y), (MID, H)], fill=(55, 55, 65), width=1)

    f_tiny = _f(_FR, 12)
    f_res  = _f(_FR, 17)

    draw.text((cx1, BTM_Y + 18), _clean(d1["univers"]),
              fill=(130, 130, 140), font=f_tiny, anchor="mm")
    draw.text((cx2, BTM_Y + 18), _clean(d2["univers"]),
              fill=(130, 130, 140), font=f_tiny, anchor="mm")

    # Barres de puissance
    BY, BH, BW = BTM_Y + 35, 13, MID - 55
    BX1, BX2   = 15, MID + 15

    for bx, pct, color in [(BX1, pct1, d1["color"]), (BX2, pct2, d2["color"])]:
        _rr(draw, [bx, BY, bx + BW, BY + BH], 5, (22, 22, 30))
        fw = int(BW * pct / 100)
        if fw:
            _rr(draw, [bx, BY, bx + fw, BY + BH], 5, color)
        draw.text((bx + BW + 6, BY + BH // 2),
                  f"{pct}%", fill=(220, 220, 220), font=f_tiny, anchor="lm")

    # Résultat
    draw.text((MID, BTM_Y + 72), f">> {_clean(result)} <<",
              fill=(255, 230, 70), font=f_res, anchor="mm")

    # Footer
    f_ft = _f(_FR, 11)
    draw.text((MID, H - 12), "Brams Score • Duel Arena",
              fill=(80, 80, 90), font=f_ft, anchor="mm")

    buf = io.BytesIO()
    canvas.save(buf, "PNG", optimize=True)
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

            # Génération PIL en thread (local, pas d'internet)
            loop = asyncio.get_running_loop()
            buf  = await loop.run_in_executor(
                None,
                lambda: _build_card(d1, pct1, d2, pct2, rivalry, result),
            )

            # Recherche GIFs Giphy en parallèle (peut échouer sans impact)
            url1, url2 = await asyncio.gather(
                _search_gif(d1["query"]),
                _search_gif(d2["query"]),
            )

            # ── Embed principal (carte PIL) ────────────────────────
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

            # ── Embeds GIF personnages (si Giphy disponible) ───────
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

            # ── Sondage réactions ──────────────────────────────────
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
