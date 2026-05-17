"""
Cog Piscine — Blacklist manuelle + quarantaine automatique.

Sans le bot dans le serveur piscine, utilise la blacklist manuelle :
  /piscine-add @membre ou ID     → ajoute à la blacklist + quarantaine immédiate
  /piscine-add-masse [ids...]    → ajoute plusieurs IDs d'un coup
  /piscine-remove @membre ou ID  → retire de la blacklist + lève la quarantaine
  /piscine-list                  → liste tous les blacklistés
  /piscine-scan                  → force un scan (si bot dans la piscine)
  /piscine-check @membre         → diagnostic complet
"""

import os
import asyncio
import psycopg2
import psycopg2.pool
import psycopg2.extras
from concurrent.futures import ThreadPoolExecutor
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

# ── DB ────────────────────────────────────────────────────────────────────────

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="piscine_db")
_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_DC = psycopg2.extras.RealDictCursor


def _get_pool():
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1, maxconn=4,
            dsn=os.environ.get("SUPABASE_URL", ""),
            sslmode="require",
        )
    return _pool


def _bl_add(user_id: int, added_by: int, reason: str | None):
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn:
            conn.cursor().execute(
                "INSERT INTO piscine_blacklist (user_id, added_by, reason)"
                " VALUES (%s,%s,%s) ON CONFLICT (user_id) DO NOTHING",
                (user_id, added_by, reason),
            )
    finally:
        pool.putconn(conn)


def _bl_remove(user_id: int):
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn:
            conn.cursor().execute(
                "DELETE FROM piscine_blacklist WHERE user_id=%s", (user_id,)
            )
    finally:
        pool.putconn(conn)


def _bl_get_all() -> list[dict]:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=_DC)
        cur.execute("SELECT * FROM piscine_blacklist ORDER BY added_at DESC")
        return [dict(r) for r in cur.fetchall()]
    finally:
        pool.putconn(conn)


def _bl_has(user_id: int) -> bool:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM piscine_blacklist WHERE user_id=%s", (user_id,))
        return cur.fetchone() is not None
    finally:
        pool.putconn(conn)


async def _run(fn):
    import asyncio
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


# ── Role quarantaine ──────────────────────────────────────────────────────────

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
                    send_messages=False, speak=False, connect=False,
                    add_reactions=False, create_public_threads=False,
                    send_messages_in_threads=False,
                )
            except (discord.Forbidden, discord.HTTPException):
                pass
        return role
    except (discord.Forbidden, discord.HTTPException) as e:
        print(f"[PISCINE] Impossible de créer le rôle sur {guild.name}: {e}")
        return None


# ── Cog ───────────────────────────────────────────────────────────────────────

class PiscineCog(commands.Cog, name="PiscineCog"):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        self._hourly_scan.start()
        print("[PISCINE] Cog chargé ✅")

    async def cog_unload(self):
        self._hourly_scan.cancel()

    # ── Détection ────────────────────────────────────────────────────────────

    async def _is_blacklisted(self, user_id: int) -> bool:
        """Vérifie blacklist DB + présence dans le serveur piscine si le bot y est."""
        in_db = await _run(lambda: _bl_has(user_id))
        if in_db:
            return True
        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        if piscine:
            return piscine.get_member(user_id) is not None
        return False

    # ── Quarantaine ───────────────────────────────────────────────────────────

    async def _quarantine(self, member: discord.Member):
        role = await _get_or_create_quarantine_role(member.guild)
        if role and role not in member.roles:
            try:
                await member.add_roles(role, reason="Blacklist piscine")
                print(f"[PISCINE] ✅ Quarantaine → {member} ({member.guild.name})")
            except (discord.Forbidden, discord.HTTPException) as e:
                print(f"[PISCINE] ❌ Rôle impossible sur {member}: {e}")
        try:
            await member.send(MP_MESSAGE)
        except discord.Forbidden:
            pass

    async def _lift_quarantine(self, member: discord.Member):
        role = discord.utils.get(member.guild.roles, name=QUARANTINE_ROLE_NAME)
        if not (role and role in member.roles):
            return
        try:
            await member.remove_roles(role, reason="Retiré de la blacklist piscine")
            print(f"[PISCINE] ✅ Quarantaine levée → {member}")
            try:
                await member.send(
                    "✅ Tu as été retiré de la liste piscine — accès **Brams Community** rétablis. 🏴‍☠️"
                )
            except discord.Forbidden:
                pass
        except (discord.Forbidden, discord.HTTPException) as e:
            print(f"[PISCINE] ❌ Lever quarantaine impossible sur {member}: {e}")

    # ── Events ────────────────────────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return
        if member.guild.id in BRAMS_GUILD_IDS:
            if await self._is_blacklisted(member.id):
                await self._quarantine(member)
        elif member.guild.id == PISCINE_GUILD_ID:
            for gid in BRAMS_GUILD_IDS:
                brams = self.bot.get_guild(gid)
                if brams:
                    bm = brams.get_member(member.id)
                    if bm:
                        await _run(lambda: _bl_add(member.id, 0, "Auto-détecté via serveur piscine"))
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
                    await self._lift_quarantine(bm)

    # ── Scan ─────────────────────────────────────────────────────────────────

    async def _run_scan(self) -> tuple[int, int]:
        blacklist = await _run(_bl_get_all)
        bl_ids = {r['user_id'] for r in blacklist}

        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        if piscine:
            bl_ids |= {m.id for m in piscine.members}

        quarantined = lifted = 0
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            role = discord.utils.get(brams.roles, name=QUARANTINE_ROLE_NAME)
            for member in brams.members:
                if member.bot:
                    continue
                in_bl = member.id in bl_ids
                in_q  = role is not None and role in member.roles
                if in_bl and not in_q:
                    await self._quarantine(member)
                    quarantined += 1
                    await asyncio.sleep(0.4)
                elif not in_bl and in_q:
                    await self._lift_quarantine(member)
                    lifted += 1
                    await asyncio.sleep(0.4)
        return quarantined, lifted

    @tasks.loop(hours=1)
    async def _hourly_scan(self):
        try:
            q, l = await self._run_scan()
            print(f"[PISCINE] Scan horaire — {q} quarantinés, {l} levés")
        except Exception as e:
            print(f"[PISCINE] Erreur scan: {e}")

    @_hourly_scan.before_loop
    async def _before_scan(self):
        await self.bot.wait_until_ready()
        await asyncio.sleep(10)
        try:
            q, l = await self._run_scan()
            print(f"[PISCINE] Scan démarrage — {q} quarantinés, {l} levés")
        except Exception as e:
            print(f"[PISCINE] Erreur scan démarrage: {e}")

    # ── Commandes admin ───────────────────────────────────────────────────────

    @app_commands.command(name="piscine-add", description="[Admin] Blacklist un membre de la piscine")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(cible="@mention ou ID Discord", raison="Raison (optionnel)")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_add(self, interaction: discord.Interaction, cible: str, raison: str = None):
        await interaction.response.defer(ephemeral=True)
        try:
            uid = int(cible.strip("<@!> "))
        except ValueError:
            await interaction.followup.send("❌ ID invalide.", ephemeral=True)
            return

        await _run(lambda: _bl_add(uid, interaction.user.id, raison))

        added = []
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            member = brams.get_member(uid)
            if member:
                await self._quarantine(member)
                added.append(f"**{member.display_name}** sur {brams.name}")

        if added:
            await interaction.followup.send(f"✅ Blacklisté et quarantaine appliquée :\n" + "\n".join(added), ephemeral=True)
        else:
            await interaction.followup.send(f"✅ ID `{uid}` blacklisté (pas encore sur Brams).", ephemeral=True)

    @app_commands.command(name="piscine-add-masse", description="[Admin] Blacklist plusieurs IDs d'un coup")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(ids="IDs séparés par des espaces ou virgules")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_add_masse(self, interaction: discord.Interaction, ids: str):
        await interaction.response.defer(ephemeral=True)
        raw = ids.replace(",", " ").split()
        uid_list = []
        for r in raw:
            try:
                uid_list.append(int(r.strip("<@!> ")))
            except ValueError:
                pass

        if not uid_list:
            await interaction.followup.send("❌ Aucun ID valide trouvé.", ephemeral=True)
            return

        quarantined = 0
        for uid in uid_list:
            await _run(lambda u=uid: _bl_add(u, interaction.user.id, "Ajout en masse"))
            for gid in BRAMS_GUILD_IDS:
                brams = self.bot.get_guild(gid)
                if not brams:
                    continue
                member = brams.get_member(uid)
                if member:
                    await self._quarantine(member)
                    quarantined += 1
            await asyncio.sleep(0.3)

        await interaction.followup.send(
            f"✅ **{len(uid_list)}** IDs blacklistés — **{quarantined}** quarantaines appliquées immédiatement.",
            ephemeral=True,
        )

    @app_commands.command(name="piscine-remove", description="[Admin] Retire un membre de la blacklist piscine")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(cible="@mention ou ID Discord")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_remove(self, interaction: discord.Interaction, cible: str):
        await interaction.response.defer(ephemeral=True)
        try:
            uid = int(cible.strip("<@!> "))
        except ValueError:
            await interaction.followup.send("❌ ID invalide.", ephemeral=True)
            return

        await _run(lambda: _bl_remove(uid))

        lifted = []
        for gid in BRAMS_GUILD_IDS:
            brams = self.bot.get_guild(gid)
            if not brams:
                continue
            member = brams.get_member(uid)
            if member:
                await self._lift_quarantine(member)
                lifted.append(f"**{member.display_name}**")

        msg = f"✅ `{uid}` retiré de la blacklist."
        if lifted:
            msg += f" Quarantaine levée pour {', '.join(lifted)}."
        await interaction.followup.send(msg, ephemeral=True)

    @app_commands.command(name="piscine-list", description="[Admin] Liste tous les membres blacklistés")
    @app_commands.default_permissions(administrator=True)
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_list(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        rows = await _run(_bl_get_all)
        if not rows:
            await interaction.followup.send("📋 Blacklist vide.", ephemeral=True)
            return

        lines = []
        for r in rows[:50]:
            member = interaction.guild.get_member(r['user_id'])
            name = member.display_name if member else f"ID {r['user_id']}"
            raison = f" — {r['reason']}" if r.get('reason') else ""
            lines.append(f"`{r['user_id']}` {name}{raison}")

        embed = discord.Embed(
            title=f"🚫 Blacklist Piscine ({len(rows)} membres)",
            description="\n".join(lines),
            color=0xFF0000,
        )
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="piscine-scan", description="[Admin] Lance un scan manuel de la blacklist")
    @app_commands.default_permissions(administrator=True)
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_scan(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        q, l = await self._run_scan()
        await interaction.followup.send(f"✅ Scan terminé — **{q}** quarantinés, **{l}** levés.", ephemeral=True)

    @app_commands.command(name="piscine-check", description="[Admin] Vérifie le statut piscine d'un membre")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(cible="@mention ou ID Discord")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in BRAMS_GUILD_IDS])
    async def piscine_check(self, interaction: discord.Interaction, cible: str):
        await interaction.response.defer(ephemeral=True)
        try:
            uid = int(cible.strip("<@!> "))
        except ValueError:
            await interaction.followup.send("❌ ID invalide.", ephemeral=True)
            return

        in_db   = await _run(lambda: _bl_has(uid))
        piscine = self.bot.get_guild(PISCINE_GUILD_ID)
        in_g    = piscine.get_member(uid) is not None if piscine else False
        role    = discord.utils.get(interaction.guild.roles, name=QUARANTINE_ROLE_NAME)
        member  = interaction.guild.get_member(uid)
        in_q    = role is not None and member is not None and role in member.roles

        name = member.display_name if member else f"ID {uid}"
        embed = discord.Embed(title=f"🔍 Check piscine — {name}", color=0xFF4444 if (in_db or in_g) else 0x2ECC71)
        embed.add_field(name="Dans la blacklist DB", value="✅ Oui" if in_db else "❌ Non", inline=True)
        embed.add_field(name="Détecté dans la piscine", value="✅ Oui" if in_g else "❌ Non (bot absent ou pas présent)", inline=True)
        embed.add_field(name="Rôle quarantaine actif", value="✅ Oui" if in_q else "❌ Non", inline=True)
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PiscineCog(bot))
    print("[PISCINE] Cog enregistré ✅")
