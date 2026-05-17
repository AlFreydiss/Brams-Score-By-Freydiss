"""
Cog Piscine — Quarantaine automatique des membres du serveur piscine.

PRÉREQUIS : le bot doit être invité dans le serveur piscine (1369786812003778680)
avec les permissions : Read Members, Manage Roles côté Brams.

Déclencheurs :
  - Quelqu'un rejoint la piscine → quarantaine sur Brams si présent
  - Quelqu'un rejoint Brams → quarantaine si déjà dans piscine
  - Quelqu'un quitte la piscine → levée de quarantaine sur Brams
  - Scan au démarrage + toutes les heures
"""

import os
import asyncio
import discord
from discord import app_commands
from discord.ext import commands, tasks

PISCINE_GUILD_ID = 1369786812003778680
BRAMS_GUILD_IDS  = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]

QUARANTINE_ROLE_NAME = "🚫 Piscine"

MP_MESSAGE = (
    "👋 Salut !\n\n"
    "On a détecté que tu es membre du **serveur Piscine**, "
    "qui est en conflit avec la **Brams Community**.\n\n"
    "Tant que tu y restes, tu ne pourras **pas parler, ni rejoindre les salons vocaux** "
    "sur notre serveur.\n\n"
    "➡️ **Quitte le serveur Piscine** pour retrouver un accès complet.\n\n"
    "— *Brams Community* 🏴‍☠️"
)


async def _get_or_create_quarantine_role(guild: discord.Guild) -> discord.Role | None:
    role = discord.utils.get(guild.roles, name=QUARANTINE_ROLE_NAME)
    if role:
        return role
    try:
        role = await guild.create_role(
            name=QUARANTINE_ROLE_NAME,
            color=discord.Color.red(),
            reason="Rôle quarantaine serveur Piscine",
        )
        for channel in guild.channels:
            try:
                await channel.set_permissions(role,
                    send_messages=False,
                    speak=False,
                    connect=False,
                    add_reactions=False,
                    create_public_threads=False,
                    send_messages_in_threads=False,
                )
            except (discord.Forbidden, discord.HTTPException):
                pass
        return role
    except (discord.Forbidden, discord.HTTPException) as e:
        print(f"[PISCINE] Impossible de créer le rôle quarantaine sur {guild.name}: {e}")
        return None


class PiscineCog(commands.Cog, name="PiscineCog"):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        self._hourly_scan.start()
        print("[PISCINE] Cog chargé ✅")

    async def cog_unload(self):
        self._hourly_scan.cancel()

    # ── Utilitaires ──────────────────────────────────────────────────────────

    def _piscine_guild(self) -> discord.Guild | None:
        g = self.bot.get_guild(PISCINE_GUILD_ID)
        if not g:
            print("[PISCINE] ⚠️  Bot non présent dans le serveur piscine — invite-le !")
        return g

    def _in_piscine(self, user_id: int) -> bool:
        g = self._piscine_guild()
        return g is not None and g.get_member(user_id) is not None

    async def _quarantine(self, member: discord.Member, silent: bool = False):
        """Applique le rôle quarantaine + envoie le MP."""
        role = await _get_or_create_quarantine_role(member.guild)
        if role and role not in member.roles:
            try:
                await member.add_roles(role, reason="Membre du serveur Piscine")
                print(f"[PISCINE] Quarantaine appliquée à {member} ({member.guild.name})")
            except (discord.Forbidden, discord.HTTPException) as e:
                print(f"[PISCINE] Impossible d'appliquer le rôle à {member}: {e}")

        if not silent:
            try:
                await member.send(MP_MESSAGE)
            except discord.Forbidden:
                pass

    async def _lift_quarantine(self, member: discord.Member):
        """Retire le rôle quarantaine + prévient le membre."""
        role = discord.utils.get(member.guild.roles, name=QUARANTINE_ROLE_NAME)
        if not (role and role in member.roles):
            return
        try:
            await member.remove_roles(role, reason="A quitté le serveur Piscine")
            print(f"[PISCINE] Quarantaine levée pour {member} ({member.guild.name})")
            try:
                await member.send(
                    "✅ Tu as quitté le serveur Piscine — tes accès sur **Brams Community** sont rétablis. "
                    "Bienvenue dans l'équipage ! 🏴‍☠️"
                )
            except discord.Forbidden:
                pass
        except (discord.Forbidden, discord.HTTPException) as e:
            print(f"[PISCINE] Impossible de lever la quarantaine de {member}: {e}")

    # ── Événements ───────────────────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return

        # Cas 1 : quelqu'un rejoint un serveur Brams → vérifier s'il est dans la piscine
        if member.guild.id in BRAMS_GUILD_IDS:
            if self._in_piscine(member.id):
                await self._quarantine(member)
            return

        # Cas 2 : quelqu'un rejoint LE SERVEUR PISCINE → quarantaine sur tous les Brams
        if member.guild.id == PISCINE_GUILD_ID:
            print(f"[PISCINE] {member} ({member.id}) a rejoint la piscine")
            for gid in BRAMS_GUILD_IDS:
                brams = self.bot.get_guild(gid)
                if not brams:
                    continue
                brams_member = brams.get_member(member.id)
                if brams_member:
                    await self._quarantine(brams_member)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        if member.bot:
            return
        # Quelqu'un quitte la piscine → lever la quarantaine sur Brams
        if member.guild.id != PISCINE_GUILD_ID:
            return
        print(f"[PISCINE] {member} ({member.id}) a quitté la piscine")
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            brams_member = brams.get_member(member.id)
            if brams_member:
                await self._lift_quarantine(brams_member)

    # ── Scan ─────────────────────────────────────────────────────────────────

    async def _run_scan(self) -> tuple[int, int]:
        """Scan complet. Retourne (quarantinés, levés)."""
        piscine = self._piscine_guild()
        if not piscine:
            return 0, 0

        piscine_ids = {m.id for m in piscine.members}
        quarantined = 0
        lifted = 0

        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            role = discord.utils.get(brams.roles, name=QUARANTINE_ROLE_NAME)

            for member in brams.members:
                if member.bot:
                    continue
                in_piscine    = member.id in piscine_ids
                in_quarantine = role is not None and role in member.roles

                if in_piscine and not in_quarantine:
                    await self._quarantine(member)
                    quarantined += 1
                    await asyncio.sleep(0.5)
                elif not in_piscine and in_quarantine:
                    await self._lift_quarantine(member)
                    lifted += 1
                    await asyncio.sleep(0.5)

        return quarantined, lifted

    @tasks.loop(hours=1)
    async def _hourly_scan(self):
        try:
            q, l = await self._run_scan()
            print(f"[PISCINE] Scan horaire — {q} quarantinés, {l} levés ✅")
        except Exception as e:
            print(f"[PISCINE] Erreur scan horaire: {e}")

    @_hourly_scan.before_loop
    async def _before_scan(self):
        await self.bot.wait_until_ready()
        # Scan immédiat au démarrage
        await asyncio.sleep(10)
        try:
            q, l = await self._run_scan()
            print(f"[PISCINE] Scan démarrage — {q} quarantinés, {l} levés ✅")
        except Exception as e:
            print(f"[PISCINE] Erreur scan démarrage: {e}")

    # ── Commande admin ────────────────────────────────────────────────────────

    @app_commands.command(name="piscine-scan", description="[Admin] Lance un scan manuel piscine")
    @app_commands.default_permissions(administrator=True)
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_scan(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        piscine = self._piscine_guild()
        if not piscine:
            await interaction.followup.send(
                "❌ Le bot n'est pas dans le serveur piscine.\n"
                f"Invite-le avec ce lien et relance le bot.",
                ephemeral=True,
            )
            return
        q, l = await self._run_scan()
        await interaction.followup.send(
            f"✅ Scan terminé — **{q}** quarantinés, **{l}** levés.",
            ephemeral=True,
        )

    @app_commands.command(name="piscine-check", description="[Admin] Vérifie si un membre est dans la piscine")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(membre="Le membre à vérifier")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_check(self, interaction: discord.Interaction, membre: discord.Member):
        await interaction.response.defer(ephemeral=True)
        piscine = self._piscine_guild()
        bot_in_piscine = piscine is not None
        in_piscine = self._in_piscine(membre.id)
        role = discord.utils.get(interaction.guild.roles, name=QUARANTINE_ROLE_NAME)
        in_quarantine = role is not None and role in membre.roles

        lines = [
            f"**{membre.display_name}** (`{membre.id}`)",
            f"Bot dans piscine : {'✅' if bot_in_piscine else '❌ (bot absent du serveur piscine)'}",
            f"Dans la piscine : {'✅ OUI' if in_piscine else '❌ Non'}",
            f"Rôle quarantaine : {'✅ Oui' if in_quarantine else '❌ Non'}",
        ]
        await interaction.followup.send("\n".join(lines), ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PiscineCog(bot))
    print("[PISCINE] Cog enregistré ✅")
