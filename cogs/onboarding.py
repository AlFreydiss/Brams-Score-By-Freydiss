import os
import json
import asyncio
import secrets
from datetime import datetime, timezone

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands, tasks


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
ONBOARDING_URL = os.environ.get("ONBOARDING_URL", "https://example.netlify.app")


def _load_role_map(guild_id: int) -> dict[str, int]:
    raw = os.environ.get(f"ONBOARDING_ROLES_{guild_id}")
    if not raw:
        return {}
    try:
        return {k: int(v) for k, v in json.loads(raw).items()}
    except Exception:
        return {}


class Onboarding(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            self.enabled = True
            self.poll_responses.start()
        else:
            self.enabled = False
            print("[onboarding] SUPABASE_URL/SUPABASE_SERVICE_KEY manquants — cog désactivé")

    def cog_unload(self):
        if self.enabled:
            self.poll_responses.cancel()

    async def _rest(self, method: str, table: str, *, params: dict | None = None, json_body=None):
        if not self.enabled:
            raise RuntimeError("Supabase onboarding non configuré")
        base = SUPABASE_URL.rstrip("/")
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        }
        if method.upper() in {"POST", "PATCH"}:
            headers["Prefer"] = "return=minimal"
        timeout = aiohttp.ClientTimeout(total=12)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.request(
                method,
                f"{base}/rest/v1/{table}",
                headers=headers,
                params=params,
                json=json_body,
            ) as resp:
                if resp.status >= 400:
                    body = await resp.text()
                    raise RuntimeError(f"HTTP {resp.status}: {body[:300]}")
                if resp.status == 204:
                    return None
                text = await resp.text()
                return json.loads(text) if text else None

    # ------------------------------------------------------------------
    # Helper interne : génère un token et envoie le lien en DM
    # ------------------------------------------------------------------
    async def _send_onboarding_dm(self, user: discord.User | discord.Member, guild_id: int) -> bool:
        if not self.enabled:
            return False
        token = secrets.token_urlsafe(16)
        try:
            await self._rest("POST", "onboarding_tokens", json_body={
                    "token": token,
                    "discord_user_id": str(user.id),
                    "guild_id": str(guild_id),
                })
        except Exception as e:
            print(f"[onboarding] erreur insert token: {e}")
            return False

        link = f"{ONBOARDING_URL}/?token={token}"
        embed = discord.Embed(
            title="🏴‍☠️ Personnalise ton profil Brams !",
            description=(
                "Réponds à quelques questions pour qu'on te donne les bons rôles "
                "(anime, gaming, foot...) et que ça s'affiche dans ton `/monprofil`.\n\n"
                f"**[Commencer l'onboarding →]({link})**\n\n"
                "Ce lien est personnel et expire dans **24h**."
            ),
            color=0xE0524A,
        )
        try:
            await user.send(embed=embed)
            return True
        except discord.Forbidden:
            return False

    # ------------------------------------------------------------------
    # Auto-onboarding au join
    # ------------------------------------------------------------------
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return
        await self._send_onboarding_dm(member, member.guild.id)

    # ------------------------------------------------------------------
    # /modifier-onboarding — refaire l'onboarding à tout moment
    # ------------------------------------------------------------------
    @app_commands.command(
        name="modifier-onboarding",
        description="Modifie tes centres d'intérêt (reçois un nouveau lien en DM).",
    )
    async def modifier_onboarding_cmd(self, interaction: discord.Interaction):
        if not self.enabled:
            await interaction.response.send_message(
                "❌ L'onboarding n'est pas configuré sur ce bot.", ephemeral=True
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        sent = await self._send_onboarding_dm(interaction.user, interaction.guild_id)
        if sent:
            await interaction.followup.send("✅ Lien envoyé en DM !", ephemeral=True)
        else:
            token = secrets.token_urlsafe(16)
            try:
                await self._rest("POST", "onboarding_tokens", json_body={
                    "token": token,
                    "discord_user_id": str(interaction.user.id),
                    "guild_id": str(interaction.guild_id),
                })
                link = f"{ONBOARDING_URL}/?token={token}"
                await interaction.followup.send(
                    f"⚠️ Tes DMs sont fermés. Voici ton lien : {link}", ephemeral=True
                )
            except Exception as e:
                await interaction.followup.send(f"❌ Erreur : `{e}`", ephemeral=True)

    # ------------------------------------------------------------------
    # Polling — toutes les 10s, on traite les réponses non processées
    # ------------------------------------------------------------------
    @tasks.loop(seconds=10)
    async def poll_responses(self):
        try:
            rows = await self._rest("GET", "onboarding_responses", params={
                "select": "*",
                "processed": "is.false",
                "order": "submitted_at.asc",
                "limit": "20",
            })
        except Exception as e:
            print(f"[onboarding] erreur de polling: {e}")
            return

        for row in rows or []:
            await self._handle_response(row)

    @poll_responses.before_loop
    async def _before_poll(self):
        await self.bot.wait_until_ready()

    async def _handle_response(self, row: dict):
        guild_id = int(row["guild_id"])
        user_id = int(row["discord_user_id"])
        answers: dict = row["answers"] or {}

        guild = self.bot.get_guild(guild_id)
        if guild is None:
            return

        member = guild.get_member(user_id)
        if member is None:
            try:
                member = await guild.fetch_member(user_id)
            except discord.HTTPException:
                return

        role_map = _load_role_map(guild_id)
        roles_to_add: list[discord.Role] = []

        for q_id, value in answers.items():
            values = value if isinstance(value, list) else [value]
            for v in values:
                if v is None:
                    continue
                key = f"{q_id}.{v}"
                role_id = role_map.get(key)
                if not role_id:
                    continue
                role = guild.get_role(role_id)
                if role:
                    roles_to_add.append(role)

        try:
            if roles_to_add:
                await member.add_roles(*roles_to_add, reason="Onboarding Brams")
        except discord.Forbidden:
            print(f"[onboarding] permissions manquantes pour {member}")
        except Exception as e:
            print(f"[onboarding] erreur add_roles: {e}")

        def _save_answers():
            conn = self.bot.get_db()
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO profiles (user_id, onboarding_answers)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET onboarding_answers = EXCLUDED.onboarding_answers
                """, (str(user_id), json.dumps(answers)))
                conn.commit()
                cur.close()
            finally:
                self.bot.release_db(conn)

        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _save_answers)
        except Exception as e:
            print(f"[onboarding] erreur save profiles: {e}")

        try:
            await self._rest(
                "PATCH",
                "onboarding_responses",
                params={"id": f"eq.{row['id']}"},
                json_body={
                    "processed": True,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception as e:
            print(f"[onboarding] erreur update processed: {e}")


async def setup(bot: commands.Bot):
    await bot.add_cog(Onboarding(bot))
