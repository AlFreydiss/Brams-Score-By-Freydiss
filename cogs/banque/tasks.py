import os
import discord
from discord.ext import commands, tasks

from . import database as db

BANK_ANNOUNCE_CH = int(os.environ.get("BANK_ANNOUNCE_CHANNEL_ID", "0"))
GUILD_IDS = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]


class BankTasksCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.vault_interest_loop.start()

    def cog_unload(self):
        self.vault_interest_loop.cancel()

    @tasks.loop(hours=24)
    async def vault_interest_loop(self):
        for guild_id in GUILD_IDS:
            try:
                results = await db.apply_vault_interests(str(guild_id))
                if not results or not BANK_ANNOUNCE_CH:
                    continue

                ch = self.bot.get_channel(BANK_ANNOUNCE_CH)
                if not ch:
                    continue

                # Notif DM individuelle si activé
                for uid, gain in results:
                    settings = await db.get_bank_settings(uid)
                    if not settings.get("dm_notifications"):
                        continue
                    member = ch.guild.get_member(int(uid))
                    if not member:
                        continue
                    try:
                        await member.send(
                            embed=discord.Embed(
                                title="📈 Intérêts du coffre crédités !",
                                description=f"**+`{gain:,}` ฿** ont été ajoutés à ton coffre.".replace(",", " "),
                                color=0x2ECC71,
                            )
                        )
                    except discord.Forbidden:
                        pass

                # Annonce globale résumée
                total_gain = sum(g for _, g in results)
                await ch.send(
                    embed=discord.Embed(
                        title="📈 Intérêts quotidiens versés !",
                        description=(
                            f"**{len(results)}** coffres ont reçu des intérêts.\n"
                            f"Total distribué : `{total_gain:,}` ฿".replace(",", " ")
                        ),
                        color=0x2ECC71,
                    )
                )
            except Exception as e:
                print(f"[BANK TASKS] Intérêts guild {guild_id}: {e}")

    @vault_interest_loop.before_loop
    async def _before(self):
        await self.bot.wait_until_ready()
