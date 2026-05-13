"""
cogs/onboarding.py
==================

À ajouter dans ton bot Buster (Discord).

Dépendances déjà présentes : discord.py, supabase
Variables d'env requises (Railway → Variables) :
    SUPABASE_URL              -> ton URL Supabase
    SUPABASE_SERVICE_KEY      -> ta service_role key (Project Settings → API)
    ONBOARDING_URL            -> https://ton-site.netlify.app
    ONBOARDING_ROLES_<GUILD>  -> JSON mapping clé/valeur → role_id (voir plus bas)

Mapping rôles (ex. pour le guild 123456789) :
    ONBOARDING_ROLES_123456789 = {
      "passions.anime": 111111,
      "passions.gaming": 222222,
      "passions.foot": 333333,
      "gaming.pc": 444444,
      "gaming.playstation": 555555,
      "foot.ligue1": 666666,
      "notifs.events": 777777
    }
Les clés sont question_id + "." + option_value. Si une clé n'est pas mappée,
le rôle n'est simplement pas attribué (zéro erreur).
"""

import os
import json
import asyncio
import secrets

import discord
from discord import app_commands
from discord.ext import commands, tasks
from supabase import create_client, Client


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
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
        self.supa: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.poll_responses.start()

    def cog_unload(self):
        self.poll_responses.cancel()

    # ------------------------------------------------------------------
    # /onboarding — DM l'utilisateur avec son lien perso
    # ------------------------------------------------------------------
    @app_commands.command(
        name="onboarding",
        description="Reçoit ton lien d'embarquement personnel en DM.",
    )
    async def onboarding_cmd(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)

        token = secrets.token_urlsafe(16)
        try:
            self.supa.table("onboarding_tokens").insert(
                {
                    "token": token,
                    "discord_user_id": str(interaction.user.id),
                    "guild_id": str(interaction.guild_id),
                }
            ).execute()
        except Exception as e:
            await interaction.followup.send(
                f"❌ Erreur en générant ton lien : `{e}`", ephemeral=True
            )
            return

        link = f"{ONBOARDING_URL}/?token={token}"

        embed = discord.Embed(
            title="👋 Bienvenue sur Brams Community !",
            description=(
                "Avant qu'on t'ouvre tous les salons, on a besoin de quelques infos "
                "pour te donner les bons rôles (anime, gaming, foot...).\n\n"
                f"**[Clique ici pour commencer →]({link})**\n\n"
                "Ce lien est personnel et expire dans 24h."
            ),
            color=0xE0524A,
        )

        try:
            await interaction.user.send(embed=embed)
            await interaction.followup.send(
                "✅ Je t'ai envoyé ton lien en DM !", ephemeral=True
            )
        except discord.Forbidden:
            await interaction.followup.send(
                f"⚠️ Tes DMs sont fermés. Voici quand même ton lien : {link}",
                ephemeral=True,
            )

    # ------------------------------------------------------------------
    # Polling — toutes les 10s, on traite les réponses non processées
    # ------------------------------------------------------------------
    @tasks.loop(seconds=10)
    async def poll_responses(self):
        try:
            res = (
                self.supa.table("onboarding_responses")
                .select("*")
                .eq("processed", False)
                .order("submitted_at")
                .limit(20)
                .execute()
            )
        except Exception as e:
            print(f"[onboarding] erreur de polling: {e}")
            return

        for row in res.data or []:
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

        import json as _json
        import asyncio as _asyncio
        from concurrent.futures import ThreadPoolExecutor as _TPE

        def _save_answers():
            conn = self.bot.get_db()
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO profiles (user_id, onboarding_answers)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET onboarding_answers = EXCLUDED.onboarding_answers
                """, (str(user_id), _json.dumps(answers)))
                conn.commit()
                cur.close()
            finally:
                self.bot.release_db(conn)

        try:
            loop = _asyncio.get_running_loop()
            await loop.run_in_executor(None, _save_answers)
        except Exception as e:
            print(f"[onboarding] erreur save profiles: {e}")

        try:
            self.supa.table("onboarding_responses").update(
                {"processed": True, "processed_at": "now()"}
            ).eq("id", row["id"]).execute()
        except Exception as e:
            print(f"[onboarding] erreur update processed: {e}")


async def setup(bot: commands.Bot):
    await bot.add_cog(Onboarding(bot))
