"""
cogs/crews/crew_view.py

Commande slash /equipage — génère et envoie la vue constellation.
"""
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from typing import TYPE_CHECKING

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

from . import database as db
from .constants import POSITIONS
from .utils import fmt_berries
from utils.constellation_builder import build_constellation

if TYPE_CHECKING:
    from bot import BotType

log = logging.getLogger(__name__)

GUILD_IDS    = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220").split(",")]
AVATAR_SIZE  = 512          # px — avatar téléchargé depuis Discord
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# Intros thématiques aléatoires affichées en description de l'embed
_INTROS = [
    "Ces fugitifs sèment la terreur dans le Grand Line. Avis de recherche émis par la Marine.",
    "Le Gouvernement Mondial offre une récompense pour chacun de ces pirates.",
    "Capturez-les morts ou vivants. La Marine ne fait pas de prisonniers.",
    "Des primes colossales pour des âmes encore plus grandes. Bonne chasse, Marines.",
    "L'équipage le plus dangereux des mers. Approchez-les à vos risques et périls.",
]

# Correspondance position Discord → rôle constellation
_ROLE_MAP: dict[str, str] = {
    "capitaine":   "capitaine",
    "second":      "second",
    "navigateur":  "navigateur",
    "sniper":      "sniper",
    "cuisinier":   "cuisinier",
    "medecin":     "medecin",
    "musicien":    "musicien",
    "bretteur":    "bretteur",
    "charpentier": "charpentier",
    "archeologue": "archeologue",
    "timonier":    "timonier",
    "mousse":      "mousse",
}


async def _fetch_avatar(session: aiohttp.ClientSession,
                         member: discord.Member | None) -> bytes | None:
    """Télécharge l'avatar Discord d'un membre en bytes."""
    if member is None:
        return None
    try:
        url  = member.display_avatar.replace(size=AVATAR_SIZE).url
        async with session.get(url, timeout=HTTP_TIMEOUT) as resp:
            if resp.status == 200:
                return await resp.read()
    except Exception as exc:
        log.debug("Avatar fetch failed: %s", exc)
    return None


async def _build_crew_data(guild: discord.Guild, crew: dict,
                            members: list[dict]) -> dict:
    """
    Assemble le dict crew_data attendu par build_constellation.
    Télécharge les avatars Discord en parallèle.
    """
    async with aiohttp.ClientSession() as session:
        tasks = [
            _fetch_avatar(session, guild.get_member(m["user_id"]))
            for m in members
        ]
        avatars: list[bytes | None] = await asyncio.gather(*tasks, return_exceptions=False)

    crew_members = []
    for m, avatar in zip(members, avatars):
        guild_member = guild.get_member(m["user_id"])
        crew_members.append({
            "name":         guild_member.display_name if guild_member else f"User#{m['user_id']}",
            "nickname":     None,
            "bounty":       m.get("contribution", 0),
            "role":         _ROLE_MAP.get(m.get("position", "mousse"), "mousse"),
            "_avatar_bytes": avatar,
            "links":        [],
        })

    return {"name": crew["name"], "members": crew_members}


class RegenerateView(discord.ui.View):
    """Boutons sous l'embed constellation."""

    def __init__(self, crew: dict, members: list[dict], guild: discord.Guild):
        super().__init__(timeout=120)
        self._crew    = crew
        self._members = members
        self._guild   = guild

    @discord.ui.button(label="🔄 Régénérer", style=discord.ButtonStyle.secondary)
    async def regenerate(self, interaction: discord.Interaction,
                          button: discord.ui.Button) -> None:
        await interaction.response.defer(thinking=True, ephemeral=True)
        try:
            path, embed, file = await _generate_image(self._crew, self._members, self._guild)
            await interaction.followup.send(embed=embed, file=file, ephemeral=True)
        except Exception as exc:
            log.exception("Régénération échouée : %s", exc)
            await interaction.followup.send("❌ Erreur lors de la génération.", ephemeral=True)

    @discord.ui.button(label="💾 Télécharger HD", style=discord.ButtonStyle.primary)
    async def download_hd(self, interaction: discord.Interaction,
                           button: discord.ui.Button) -> None:
        await interaction.response.send_message(
            "La constellation est déjà envoyée en PNG pleine résolution (1920×1080).",
            ephemeral=True,
        )


async def _generate_image(crew: dict, members: list[dict],
                           guild: discord.Guild) -> tuple[str, discord.Embed, discord.File]:
    """Génère la constellation et retourne (path, embed, file)."""
    import random
    crew_data  = await _build_crew_data(guild, crew, members)
    total      = sum(m.get("bounty", 0) or 0 for m in crew_data["members"])

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        out_path = tmp.name

    await build_constellation(
        crew_data,
        output_path=out_path,
        seed=random.randint(0, 2**31),
    )

    import random as _r
    description = _r.choice(_INTROS)

    embed = discord.Embed(
        title=f"🏴‍☠️ Affiches WANTED — {crew['name']}",
        description=description,
        color=0xD4A017,
    )
    embed.set_image(url="attachment://constellation.png")
    embed.set_footer(text=f"Prime totale : {fmt_berries(total)} Berry  •  {len(members)} membre(s)")

    file = discord.File(out_path, filename="constellation.png")
    return out_path, embed, file


class CrewView(commands.Cog):
    """Cog gérant la commande /equipage."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="equipage",
                          description="Affiche les affiches WANTED de l'équipage en constellation")
    @app_commands.guilds(*[discord.Object(id=g) for g in GUILD_IDS])
    async def equipage(self, interaction: discord.Interaction) -> None:
        """Génère et envoie la vue constellation de l'équipage de l'utilisateur."""
        await interaction.response.defer(thinking=True)

        user_id = interaction.user.id

        # Récupérer l'équipage de l'utilisateur
        member_row = await db.get_member(user_id)
        if not member_row:
            await interaction.followup.send(
                "❌ Tu ne fais partie d'aucun équipage. Rejoins ou crée un équipage d'abord !",
                ephemeral=True,
            )
            return

        crew = await db.get_crew(member_row["crew_id"])
        if not crew:
            await interaction.followup.send("❌ Équipage introuvable.", ephemeral=True)
            return

        members = await db.get_crew_members(member_row["crew_id"])
        if not members:
            await interaction.followup.send("❌ L'équipage n'a aucun membre.", ephemeral=True)
            return

        try:
            path, embed, file = await _generate_image(crew, members, interaction.guild)
        except Exception as exc:
            log.exception("Génération constellation échouée : %s", exc)
            await interaction.followup.send(
                "❌ Erreur lors de la génération de la constellation. Réessaie.", ephemeral=True
            )
            return

        view = RegenerateView(crew, members, interaction.guild)
        await interaction.followup.send(embed=embed, file=file, view=view)

        # Nettoyage fichier temporaire
        try:
            import os
            os.unlink(path)
        except OSError:
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CrewView(bot))
