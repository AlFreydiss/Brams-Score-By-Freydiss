"""
Cog — /duel  ⚔️
Duel entre deux persos au choix — images Jikan/MAL (aucune clé requise) + vote réactions
"""
from __future__ import annotations

import asyncio
import io
import logging
from urllib.parse import quote as _uq

import aiohttp
import discord
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from discord import app_commands
from discord.ext import commands

log = logging.getLogger(__name__)

DUEL_TIMEOUT = 60  # secondes avant affichage des résultats


def _make_duel_graph(nom1: str, nom2: str, votes1: int, votes2: int) -> io.BytesIO:
    total = votes1 + votes2 or 1
    pct1 = round(votes1 / total * 100)
    pct2 = round(votes2 / total * 100)

    fig, ax = plt.subplots(figsize=(9, 3), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")

    noms  = [nom2[:24], nom1[:24]]
    pcts  = [pct2, pct1]
    votes = [votes2, votes1]
    colors = ["#5865F2", "#ED4245"]

    bars = ax.barh(noms, pcts, color=colors, height=0.5, edgecolor="none")

    for bar, pct, v in zip(bars, pcts, votes):
        ax.text(
            min(pct + 2, 102), bar.get_y() + bar.get_height() / 2,
            f"{pct}%  ({v} vote{'s' if v != 1 else ''})",
            va="center", color="white", fontsize=12, fontweight="bold",
        )

    winner = nom1 if votes1 >= votes2 else nom2
    titre = f"🏆 {winner} remporte le duel !" if votes1 != votes2 else "⚖️ Égalité !"

    ax.set_xlim(0, 130)
    ax.set_title(titre, color="white", fontsize=13, pad=10, fontweight="bold")
    ax.tick_params(colors="white", labelsize=11)
    for spine in ax.spines.values():
        spine.set_color("#444")
    ax.set_xlabel("% des votes", color="#aaa", fontsize=9)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", facecolor=fig.get_facecolor(), dpi=130)
    plt.close(fig)
    buf.seek(0)
    return buf


async def _send_duel_results(
    message: discord.Message, nom1: str, nom2: str,
    embed1: discord.Embed, embed2: discord.Embed,
) -> None:
    for remaining in range(DUEL_TIMEOUT, 0, -1):
        try:
            embed1.set_footer(text=f"🔴 {nom1}  •  Brams Score — Duel Arena  •  ⏳ {remaining}s")
            await message.edit(embeds=[embed1, embed2])
        except Exception:
            pass
        await asyncio.sleep(1)
    try:
        embed1.set_footer(text=f"🔴 {nom1}  •  Brams Score — Duel Arena  •  🔒 Votes fermés")
        await message.edit(embeds=[embed1, embed2])
        msg = await message.channel.fetch_message(message.id)
        votes1 = next((r.count - 1 for r in msg.reactions if str(r.emoji) == "🔴"), 0)
        votes2 = next((r.count - 1 for r in msg.reactions if str(r.emoji) == "🔵"), 0)
        loop = asyncio.get_running_loop()
        buf = await loop.run_in_executor(None, _make_duel_graph, nom1, nom2, votes1, votes2)
        await msg.reply(file=discord.File(buf, "duel_results.png"))
    except Exception as e:
        log.warning("[Duel] Erreur résultats graphique: %s", e)

# IDs Jikan directs pour les persos connus — évite les mauvais matchs de recherche
_CHAR_IDS: dict[str, int] = {
    # One Piece
    "luffy": 40, "monkey d. luffy": 40,
    "zoro": 62, "roronoa zoro": 62,
    "nami": 723,
    "usopp": 724,
    "sanji": 305,
    "robin": 61, "nico robin": 61,
    "chopper": 309, "tony tony chopper": 309,
    "franky": 64,
    "brook": 5627,
    "jinbei": 18938,
    "ace": 2072, "portgas d. ace": 2072,
    "shanks": 727,
    "barbe blanche": 2751, "whitebeard": 2751,
    "trafalgar law": 13767, "law": 13767,
    "akainu": 22687,
    "hancock": 16342, "boa hancock": 16342,
    "crocodile": 2749,
    "doflamingo": 2754,
    "kaido": 278670,
    "big mom": 54495,
    # Naruto
    "naruto": 17, "naruto uzumaki": 17,
    "sasuke": 13, "sasuke uchiha": 13,
    "kakashi": 85, "kakashi hatake": 85,
    "itachi": 14, "itachi uchiha": 14,
    "sakura": 16847, "sakura haruno": 16847,
    "hinata": 1555, "hinata hyuga": 1555,
    "gaara": 1662,
    "rock lee": 306,
    "jiraiya": 2423,
    "minato": 2535, "minato namikaze": 2535,
    "obito": 2910, "obito uchiha": 2910,
    "pain": 3180,
    # Bleach
    "ichigo": 5, "ichigo kurosaki": 5,
    "byakuya": 907, "byakuya kuchiki": 907,
    "aizen": 1086, "sosuke aizen": 1086,
    "rukia": 6, "rukia kuchiki": 6,
    # FMA
    "edward elric": 11, "edward": 11,
    "alphonse elric": 12, "alphonse": 12,
    "roy mustang": 68,
    # HxH
    "gon": 30, "gon freecss": 30,
    "killua": 27, "killua zoldyck": 27,
    "hisoka": 238998, "hisoka morow": 238998,
    "kurapika": 28,
    "meruem": 23277,
    # JoJo
    "jotaro": 4003, "jotaro kujo": 4003,
    "giorno": 10529, "giorno giovanna": 10529,
    "dio": 4004, "dio brando": 4004,
    # Attack on Titan
    "levi": 290124, "levi ackerman": 290124,
    "eren": 40882, "eren yeager": 40882,
    "mikasa": 40881, "mikasa ackerman": 40881,
    "armin": 46494, "armin arlert": 46494,
    "erwin": 46496, "erwin smith": 46496,
    # Death Note
    "light yagami": 80, "light": 80,
    "l": 71,
    "ryuk": 75,
    # Dragon Ball
    "goku": 246, "son goku": 246,
    "vegeta": 913,
    "piccolo": 914,
    "gohan": 2093,
    # Demon Slayer
    "tanjiro": 146156, "tanjiro kamado": 146156,
    "zenitsu": 146158, "zenitsu agatsuma": 146158,
    "inosuke": 146159, "inosuke hashibira": 146159,
    "rengoku": 151143, "rengoku kyojuro": 151143,
    "muzan": 151156, "muzan kibutsuji": 151156,
    # Jujutsu Kaisen
    "itadori": 163847, "yuji itadori": 163847,
    "gojo": 164471, "gojo satoru": 164471,
    "sukuna": 175198, "ryomen sukuna": 175198,
    "megumi": 164470, "megumi fushiguro": 164470,
    # Tokyo Ghoul
    "kaneki": 87275, "ken kaneki": 87275,
    # Code Geass
    "lelouch": 417, "lelouch vi britannia": 417,
    # One Punch Man
    "saitama": 73935,
    "genos": 73979,
    # Fairy Tail
    "natsu": 5187, "natsu dragneel": 5187,
    "erza": 5189, "erza scarlet": 5189,
    "gray": 4839, "gray fullbuster": 4839,
    # Mob Psycho
    "mob": 109929, "shigeo kageyama": 109929,
    # SAO
    "kirito": 245235,
    "asuna": 36828, "asuna yuuki": 36828,
    # Re:Zero
    "rem": 118763,
    "subaru": 118735, "subaru natsuki": 118735,
    # Berserk
    "guts": 422,
    # Black Clover
    "asta": 33356,
    # Nanatsu no Taizai
    "meliodas": 72921,
    # Gintama
    "gintoki": 672, "gintoki sakata": 672,
    # Cowboy Bebop
    "spike": 1, "spike spiegel": 1,
    # Violet Evergarden
    "violet evergarden": 141354,
}

_IMG_CACHE: dict[str, str | None] = {}


async def _fetch_by_id(char_id: int, session: aiohttp.ClientSession) -> str | None:
    """Récupère l'image d'un perso Jikan via son ID exact."""
    async with session.get(
        f"https://api.jikan.moe/v4/characters/{char_id}",
        timeout=aiohttp.ClientTimeout(total=10),
    ) as r:
        if r.status == 200:
            data = await r.json()
            return data.get("data", {}).get("images", {}).get("jpg", {}).get("image_url")
    return None


async def _fetch_by_search(nom: str, session: aiohttp.ClientSession) -> str | None:
    """Cherche un perso par nom et prend le résultat dont le nom correspond le mieux."""
    async with session.get(
        f"https://api.jikan.moe/v4/characters?q={_uq(nom)}&limit=5",
        timeout=aiohttp.ClientTimeout(total=10),
    ) as r:
        if r.status != 200:
            return None
        data = await r.json()
        chars = data.get("data", [])
        if not chars:
            return None
        # Cherche le meilleur match par nom
        nom_lower = nom.lower()
        for char in chars:
            char_name = char.get("name", "").lower()
            char_name_kanji = (char.get("name_kanji") or "").lower()
            if nom_lower in char_name or nom_lower in char_name_kanji:
                img = char.get("images", {}).get("jpg", {}).get("image_url")
                if img:
                    return img
        # Fallback : premier résultat
        return chars[0].get("images", {}).get("jpg", {}).get("image_url")


async def chercher_image(nom: str) -> str | None:
    cache_key = nom.lower().strip()
    if cache_key in _IMG_CACHE:
        return _IMG_CACHE[cache_key]

    result = None
    try:
        async with aiohttp.ClientSession() as sess:
            char_id = _CHAR_IDS.get(cache_key)
            if char_id:
                result = await _fetch_by_id(char_id, sess)
            if not result:
                result = await _fetch_by_search(nom, sess)
    except Exception as e:
        log.warning("[Duel] chercher_image(%s): %s", nom, e)

    _IMG_CACHE[cache_key] = result
    return result


class DuelCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="duel",
        description="⚔️ Duel épique entre deux personnages — tape leurs noms !",
    )
    @app_commands.describe(
        perso1="Premier personnage (ex: Luffy, Goku, Naruto…)",
        perso2="Deuxième personnage (ex: Zoro, Vegeta, Sasuke…)",
    )
    async def duel(
        self,
        interaction: discord.Interaction,
        perso1: str,
        perso2: str,
    ) -> None:
        import asyncio
        await interaction.response.defer()

        img1, img2 = await asyncio.gather(
            chercher_image(perso1),
            chercher_image(perso2),
            return_exceptions=True,
        )
        if isinstance(img1, Exception): img1 = None
        if isinstance(img2, Exception): img2 = None

        embed1 = discord.Embed(
            title="⚔️  DUEL ÉPIQUE  ⚔️",
            description=(
                f"**{perso1}**  `VS`  **{perso2}**\n"
                f"*Aucun expert ne s'accorde. La communauté décide.*"
            ),
            color=discord.Color.red(),
        )
        if img1:
            embed1.set_image(url=img1)
        embed1.set_footer(text=f"🔴 {perso1}  •  Brams Score — Duel Arena  •  Résultats dans {DUEL_TIMEOUT}s")

        embed2 = discord.Embed(color=discord.Color.blue())
        if img2:
            embed2.set_image(url=img2)
        embed2.set_footer(text=f"🔵 {perso2}")
        message = await interaction.followup.send(embeds=[embed1, embed2])
        await message.add_reaction("🔴")
        await message.add_reaction("🔵")

        asyncio.create_task(_send_duel_results(message, perso1, perso2, embed1, embed2))
        log.info("[Duel] %s vs %s | img1=%s img2=%s",
                 perso1, perso2, bool(img1), bool(img2))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
