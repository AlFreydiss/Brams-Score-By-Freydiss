import os
import discord
from discord.ext import commands, tasks

from . import database as db
from utils.transactions import log_transaction

BANK_ANNOUNCE_CH = int(os.environ.get("BANK_ANNOUNCE_CHANNEL_ID", "0"))
GUILD_IDS = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]

_TAX_RATE = 0.60


class BankTasksCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.vault_interest_loop.start()
        self.richest_tax_loop.start()

    def cog_unload(self):
        self.vault_interest_loop.cancel()
        self.richest_tax_loop.cancel()

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
    async def _before_interest(self):
        await self.bot.wait_until_ready()

    @tasks.loop(hours=24)
    async def richest_tax_loop(self):
        for guild_id in GUILD_IDS:
            try:
                guild = self.bot.get_guild(guild_id)
                if not guild:
                    continue

                member_ids = [str(m.id) for m in guild.members if not m.bot]
                if not member_ids:
                    continue

                vaults = await db.get_vaults_for_guild(str(guild_id), member_ids)

                richest_uid = max(
                    member_ids,
                    key=lambda uid: self.bot.get_berrys(uid) + vaults.get(uid, 0),
                )
                wallet = self.bot.get_berrys(richest_uid)
                total  = wallet + vaults.get(richest_uid, 0)
                if total == 0:
                    continue

                taxe = int(wallet * _TAX_RATE)
                if taxe <= 0:
                    continue

                self.bot.spend_berrys(richest_uid, taxe, track="lost")
                await log_transaction(
                    richest_uid, "depense", "autre", taxe,
                    "Taxe du plus riche (60%)",
                    self.bot.get_berrys(richest_uid),
                )

                if not BANK_ANNOUNCE_CH:
                    continue
                ch = self.bot.get_channel(BANK_ANNOUNCE_CH)
                if not ch:
                    continue

                member = guild.get_member(int(richest_uid))
                name = member.display_name if member else f"<@{richest_uid}>"
                mention = member.mention if member else f"<@{richest_uid}>"

                def _fmt(n: int) -> str:
                    return f"{n:,}".replace(",", " ")

                await ch.send(
                    embed=discord.Embed(
                        title="⚖️ Taxe du Gouvernement Mondial",
                        description=(
                            f"Le CP0 a frappé ! **{name}**, le pirate le plus riche du serveur "
                            f"avec **{_fmt(total)} ฿** de fortune totale, vient de se faire saisir "
                            f"**{_fmt(taxe)} ฿** — soit **60%** de sa poche.\n\n"
                            f"{mention} il te reste **{_fmt(self.bot.get_berrys(richest_uid))} ฿** en poche. "
                            f"*La prochaine fois, sois discret.*"
                        ),
                        color=0xC0392B,
                    )
                )
            except Exception as e:
                print(f"[BANK TASKS] Taxe richest guild {guild_id}: {e}")

    @richest_tax_loop.before_loop
    async def _before_tax(self):
        await self.bot.wait_until_ready()
