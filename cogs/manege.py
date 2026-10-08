import asyncio
import discord
from discord import app_commands
from discord.ext import commands

# /manege : fait défiler un membre dans tous les salons vocaux, de haut en bas,
# en boucle, jusqu'à /manege_stop. Réservé à qui a « Déplacer des membres » et à OWNER_IDS.
# Garde-fous : 1,5 s entre deux déplacements (en dessous Discord renvoie des 429
# et le bot entier ralentit), 10 minutes max, arrêt si le membre quitte le vocal,
# et retour dans son salon d'origine à la fin.

# Freydiss : autorisé partout, même sans la permission sur le serveur.
OWNER_IDS = {1094070545248694342}

STEP_SECONDS = 1.5
MAX_SECONDS = 600


def _allowed(interaction: discord.Interaction) -> bool:
    if interaction.user.id in OWNER_IDS:
        return True
    perms = getattr(interaction.user, "guild_permissions", None)
    if perms and perms.move_members:
        return True
    raise app_commands.MissingPermissions(["move_members"])


class ManegeCog(commands.Cog):

    def __init__(self, bot):
        self.bot = bot
        self._runs: dict[tuple[int, int], asyncio.Task] = {}

    def _route(self, member: discord.Member) -> list[discord.VoiceChannel]:
        guild = member.guild
        me = guild.me
        out = []
        for ch in sorted(guild.voice_channels, key=lambda c: (c.category.position if c.category else -1, c.position)):
            if ch == guild.afk_channel:
                continue
            perms = ch.permissions_for(me)
            if perms.connect and perms.move_members:
                out.append(ch)
        return out

    async def _ride(self, member: discord.Member, origin: discord.VoiceChannel, route: list[discord.VoiceChannel]):
        loop = asyncio.get_running_loop()
        end = loop.time() + MAX_SECONDS
        try:
            while loop.time() < end:
                for ch in route:
                    if not member.voice or loop.time() >= end:
                        return
                    if member.voice.channel != ch:
                        try:
                            await member.move_to(ch, reason="/manege")
                        except discord.HTTPException:
                            pass
                    await asyncio.sleep(STEP_SECONDS)
        finally:
            self._runs.pop((member.guild.id, member.id), None)
            if member.voice and origin and member.voice.channel != origin:
                try:
                    await member.move_to(origin, reason="/manege terminé")
                except discord.HTTPException:
                    pass

    @app_commands.command(name="manege", description="🎠 Fait tourner un membre dans tous les vocaux, de haut en bas, en boucle")
    @app_commands.describe(membre="Le membre à faire tourner (il doit être en vocal)")
    @app_commands.check(_allowed)
    @app_commands.guild_only()
    async def manege(self, interaction: discord.Interaction, membre: discord.Member):
        key = (interaction.guild_id, membre.id)
        if key in self._runs:
            return await interaction.response.send_message(f"{membre.mention} est déjà sur le manège. `/manege_stop` pour l'arrêter.", ephemeral=True)
        if not membre.voice or not membre.voice.channel:
            return await interaction.response.send_message(f"{membre.mention} n'est pas en vocal.", ephemeral=True)
        route = self._route(membre)
        if len(route) < 2:
            return await interaction.response.send_message("Il me faut au moins deux salons vocaux accessibles.", ephemeral=True)
        self._runs[key] = asyncio.create_task(self._ride(membre, membre.voice.channel, route))
        await interaction.response.send_message(
            f"🎠 {membre.mention} part sur le manège : {len(route)} salons, en boucle. "
            f"`/manege_stop` pour l'arrêter (arrêt auto au bout de {MAX_SECONDS // 60} min)."
        )

    @app_commands.command(name="manege_stop", description="🛑 Arrête le manège d'un membre (ou de tout le monde)")
    @app_commands.describe(membre="Le membre à faire descendre (vide = tout le monde)")
    @app_commands.check(_allowed)
    @app_commands.guild_only()
    async def manege_stop(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        keys = [k for k in self._runs if k[0] == interaction.guild_id and (membre is None or k[1] == membre.id)]
        for k in keys:
            self._runs[k].cancel()
        if not keys:
            return await interaction.response.send_message("Personne sur le manège.", ephemeral=True)
        await interaction.response.send_message(f"🛑 Manège arrêté ({len(keys)}). Retour au salon de départ.")

    @manege.error
    @manege_stop.error
    async def _perm_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Il faut la permission « Déplacer des membres ».", ephemeral=True)
        else:
            raise error


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ManegeCog(bot))
