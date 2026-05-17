"""
Cog Piscine — Détecte les membres du serveur piscine (1369786812003778680)
et les restreint automatiquement sur les serveurs Brams Community.

Comportement :
- À l'arrivée d'un nouveau membre : si présent sur le serveur piscine → quarantaine + MP
- Toutes les heures : scan de tous les membres existants
- Si un membre quitte le serveur piscine → levée automatique de la quarantaine
"""

import os
import asyncio
import discord
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


async def _get_or_create_quarantine_role(guild: discord.Guild) -> discord.Role:
    role = discord.utils.get(guild.roles, name=QUARANTINE_ROLE_NAME)
    if role:
        return role
    role = await guild.create_role(
        name=QUARANTINE_ROLE_NAME,
        color=discord.Color.from_str("#ff0000"),
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


class PiscineCog(commands.Cog, name="PiscineCog"):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        self._hourly_scan.start()
        print("[PISCINE] Cog chargé ✅")

    async def cog_unload(self):
        self._hourly_scan.cancel()

    # ── Utilitaire : est-ce que ce member est dans le serveur piscine ? ──────

    def _in_piscine(self, user_id: int) -> bool:
        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        if not piscine:
            return False
        return piscine.get_member(user_id) is not None

    # ── Appliquer la quarantaine ─────────────────────────────────────────────

    async def _quarantine(self, member: discord.Member):
        try:
            role = await _get_or_create_quarantine_role(member.guild)
            if role not in member.roles:
                await member.add_roles(role, reason="Membre du serveur Piscine")
        except (discord.Forbidden, discord.HTTPException) as e:
            print(f"[PISCINE] Impossible d'appliquer la quarantaine à {member}: {e}")

        try:
            await member.send(MP_MESSAGE)
        except discord.Forbidden:
            pass

    # ── Lever la quarantaine ─────────────────────────────────────────────────

    async def _lift_quarantine(self, member: discord.Member):
        role = discord.utils.get(member.guild.roles, name=QUARANTINE_ROLE_NAME)
        if role and role in member.roles:
            try:
                await member.remove_roles(role, reason="A quitté le serveur Piscine")
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
        if member.guild.id not in BRAMS_GUILD_IDS:
            return
        if self._in_piscine(member.id):
            await self._quarantine(member)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        """Quand quelqu'un quitte le serveur piscine, lever la quarantaine sur Brams."""
        if member.guild.id != PISCINE_GUILD_ID:
            return
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            brams_member = brams.get_member(member.id)
            if brams_member:
                await self._lift_quarantine(brams_member)

    # ── Scan horaire ─────────────────────────────────────────────────────────

    @tasks.loop(hours=1)
    async def _hourly_scan(self):
        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        if not piscine:
            return
        piscine_ids = {m.id for m in piscine.members}

        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            role = discord.utils.get(brams.roles, name=QUARANTINE_ROLE_NAME)

            for member in brams.members:
                if member.bot:
                    continue
                in_piscine   = member.id in piscine_ids
                in_quarantine = role is not None and role in member.roles

                if in_piscine and not in_quarantine:
                    await self._quarantine(member)
                    await asyncio.sleep(0.5)
                elif not in_piscine and in_quarantine:
                    await self._lift_quarantine(member)
                    await asyncio.sleep(0.5)

        print("[PISCINE] Scan horaire terminé ✅")

    @_hourly_scan.before_loop
    async def _before_scan(self):
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot):
    await bot.add_cog(PiscineCog(bot))
    print("[PISCINE] Cog enregistré ✅")
