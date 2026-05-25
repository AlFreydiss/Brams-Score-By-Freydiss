import os
import asyncio
import discord
from discord.ext import commands, tasks

PISCINE_GUILD_ID = 1369786812003778680
BRAMS_GUILD_IDS  = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]
QUARANTINE_ROLE_NAME = "🚫 Piscine"

MP_MESSAGE = (
    "👋 Salut !\n\n"
    "On a détecté que tu fais partie du **serveur Piscine**.\n\n"
    "Tant que tu y restes, tu ne peux **pas parler ni rejoindre les vocaux** "
    "sur **Brams Community**.\n\n"
    "Quitte ce serveur pour retrouver un accès complet.\n\n"
    "— *Brams Community* 🏴‍☠️"
)


async def _get_or_create_role(guild: discord.Guild) -> discord.Role | None:
    role = discord.utils.get(guild.roles, name=QUARANTINE_ROLE_NAME)
    if role:
        return role
    try:
        role = await guild.create_role(name=QUARANTINE_ROLE_NAME, color=discord.Color.red())
        for ch in guild.channels:
            try:
                await ch.set_permissions(role,
                    send_messages=False, speak=False, connect=False,
                    add_reactions=False, create_public_threads=False,
                    send_messages_in_threads=False,
                )
            except (discord.Forbidden, discord.HTTPException):
                pass
        return role
    except Exception as e:
        print(f"[PISCINE] Impossible de créer le rôle sur {guild.name}: {e}")
        return None


class PiscineCog(commands.Cog):

    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self._scan.start()

    async def cog_unload(self):
        self._scan.cancel()

    async def _quarantine(self, member: discord.Member):
        role = await _get_or_create_role(member.guild)
        if role and role not in member.roles:
            try:
                await member.add_roles(role, reason="Serveur piscine")
                print(f"[PISCINE] Quarantaine → {member} ({member.guild.name})")
            except Exception as e:
                print(f"[PISCINE] Erreur rôle {member}: {e}")
        try:
            await member.send(MP_MESSAGE)
        except discord.Forbidden:
            pass

    async def _lift(self, member: discord.Member):
        role = discord.utils.get(member.guild.roles, name=QUARANTINE_ROLE_NAME)
        if role and role in member.roles:
            try:
                await member.remove_roles(role, reason="A quitté la piscine")
                print(f"[PISCINE] Levée → {member}")
                await member.send("✅ Accès **Brams Community** rétablis. 🏴‍☠️")
            except Exception:
                pass

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return
        # Quelqu'un rejoint Brams → vérifier s'il est dans la piscine
        if member.guild.id in BRAMS_GUILD_IDS:
            piscine = self.bot.get_guild(PISCINE_GUILD_ID)
            if piscine and piscine.get_member(member.id):
                await self._quarantine(member)
        # Quelqu'un rejoint la piscine → le restreindre sur Brams
        elif member.guild.id == PISCINE_GUILD_ID:
            for gid in BRAMS_GUILD_IDS:
                brams = self.bot.get_guild(gid)
                if brams:
                    bm = brams.get_member(member.id)
                    if bm:
                        await self._quarantine(bm)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        if member.bot or member.guild.id != PISCINE_GUILD_ID:
            return
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if brams:
                bm = brams.get_member(member.id)
                if bm:
                    await self._lift(bm)

    @tasks.loop(hours=1)
    async def _scan(self):
        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        if not piscine:
            print("[PISCINE] ⚠️  Bot absent du serveur piscine — invite-le !")
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
                if member.id in piscine_ids and (not role or role not in member.roles):
                    await self._quarantine(member)
                    await asyncio.sleep(0.4)
                elif member.id not in piscine_ids and role and role in member.roles:
                    await self._lift(member)
                    await asyncio.sleep(0.4)

    @_scan.before_loop
    async def _before(self):
        await self.bot.wait_until_ready()
        await asyncio.sleep(10)
        await self._scan()


async def setup(bot):
    await bot.add_cog(PiscineCog(bot))
    print("[PISCINE] Cog enregistré ✅")
