"""
Cog — /duel  ⚔️
Duel entre deux persos au choix — images Jikan/MAL (aucune clé requise) + vote réactions
"""
from __future__ import annotations

import logging
from urllib.parse import quote as _uq

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

log = logging.getLogger(__name__)

_IMG_CACHE: dict[str, str | None] = {}


async def chercher_image(nom: str) -> str | None:
    """Cherche l'image d'un personnage via Jikan (MAL) — aucune clé API requise."""
    if nom in _IMG_CACHE:
        return _IMG_CACHE[nom]
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"https://api.jikan.moe/v4/characters?q={_uq(nom)}&limit=5",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                if r.status == 200:
                    data = await r.json()
                    chars = data.get("data", [])
                    if chars:
                        img = chars[0].get("images", {}).get("jpg", {}).get("image_url")
                        _IMG_CACHE[nom] = img
                        return img
    except Exception as e:
        log.warning("[Duel] Jikan(%s): %s", nom, e)
    _IMG_CACHE[nom] = None
    return None


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
        embed1.set_footer(text=f"🔴 {perso1}  •  Brams Score — Duel Arena")

        embed2 = discord.Embed(color=discord.Color.blue())
        if img2:
            embed2.set_image(url=img2)
        embed2.set_footer(text=f"🔵 {perso2}")

        message = await interaction.followup.send(embeds=[embed1, embed2])
        await message.add_reaction("🔴")
        await message.add_reaction("🔵")

        log.info("[Duel] %s vs %s | img1=%s img2=%s",
                 perso1, perso2, bool(img1), bool(img2))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
