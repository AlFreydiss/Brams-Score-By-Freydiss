"""
Cog — /duel  ⚔️
Duel entre deux persos au choix — GIFs Giphy + vote réactions
"""
from __future__ import annotations

import os
import random
import logging

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

log = logging.getLogger(__name__)

GIPHY_KEY = os.getenv("GIPHY_API_KEY", "")


async def chercher_gif(query: str) -> str | None:
    if not GIPHY_KEY:
        return None
    params = {
        "api_key": GIPHY_KEY,
        "q": query,
        "limit": 10,
        "rating": "pg-13",
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.giphy.com/v1/gifs/search",
                params=params,
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                if not data.get("data"):
                    return None
                gif = random.choice(data["data"])
                return gif["images"]["original"]["url"]
    except Exception as e:
        log.warning("[Duel] Giphy(%s): %s", query, e)
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

        gif1, gif2 = await asyncio.gather(
            chercher_gif(f"{perso1} anime"),
            chercher_gif(f"{perso2} anime"),
            return_exceptions=True,
        )
        if isinstance(gif1, Exception): gif1 = None
        if isinstance(gif2, Exception): gif2 = None

        embed1 = discord.Embed(
            title="⚔️  DUEL ÉPIQUE  ⚔️",
            description=(
                f"**{perso1}**  `VS`  **{perso2}**\n"
                f"*Aucun expert ne s'accorde. La communauté décide.*"
            ),
            color=discord.Color.red(),
        )
        if gif1:
            embed1.set_image(url=gif1)
        embed1.set_footer(text=f"🔴 {perso1}  •  Brams Score — Duel Arena")

        embed2 = discord.Embed(color=discord.Color.blue())
        if gif2:
            embed2.set_image(url=gif2)
        embed2.set_footer(text=f"🔵 {perso2}")

        message = await interaction.followup.send(embeds=[embed1, embed2])
        await message.add_reaction("🔴")
        await message.add_reaction("🔵")

        log.info("[Duel] %s vs %s | gif1=%s gif2=%s",
                 perso1, perso2, bool(gif1), bool(gif2))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
