import os
import discord
from discord import app_commands
from discord.ext import commands

from .constants import GAME_CHOICES, GAME_NAMES, MISE_MIN, MISE_MAX, MIN_PLAYERS
from .views import LobbyView

GUILD_IDS = [
    int(x)
    for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")
]


def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


class JeuxCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="jeu",
        description="🎮 Lancer un jeu interactif pour les membres en salon vocal",
    )
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(
        type_jeu="Le jeu à lancer",
        mise="Berries misés par joueur",
    )
    @app_commands.choices(type_jeu=GAME_CHOICES)
    async def jeu(
        self,
        interaction: discord.Interaction,
        type_jeu: str,
        mise: int,
    ):
        await interaction.response.defer()

        if not interaction.user.voice or not interaction.user.voice.channel:
            await interaction.followup.send(
                "❌ Tu dois être dans un **salon vocal** pour lancer un jeu.", ephemeral=True
            )
            return

        if not (MISE_MIN <= mise <= MISE_MAX):
            await interaction.followup.send(
                f"❌ La mise doit être entre **{fmt(MISE_MIN)}** ฿ et **{fmt(MISE_MAX)}** ฿.",
                ephemeral=True,
            )
            return

        wallet = self.bot.get_berrys(str(interaction.user.id))
        if wallet < mise:
            await interaction.followup.send(
                f"❌ Il te faut **{fmt(mise)}** ฿ pour lancer (tu as `{fmt(wallet)}` ฿).",
                ephemeral=True,
            )
            return

        voice_ch = interaction.user.voice.channel
        n_voice  = len([m for m in voice_ch.members if not m.bot])
        if n_voice < MIN_PLAYERS[type_jeu]:
            await interaction.followup.send(
                f"❌ Il faut au moins **{MIN_PLAYERS[type_jeu]}** personnes dans le salon vocal.",
                ephemeral=True,
            )
            return

        view = LobbyView(
            host=interaction.user,
            game_type=type_jeu,
            mise=mise,
            bot=self.bot,
            voice_channel_id=voice_ch.id,
        )

        msg = await interaction.followup.send(
            embed=view.build_embed(),
            view=view,
        )
        view.message = msg


async def setup(bot: commands.Bot):
    await bot.add_cog(JeuxCog(bot))
    print("[JEUX] Cog enregistré ✅")
