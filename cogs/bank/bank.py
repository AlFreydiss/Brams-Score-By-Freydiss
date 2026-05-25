from __future__ import annotations
import os
from datetime import datetime, timezone, timedelta

import discord
from discord import app_commands
from discord.ext import commands, tasks

from . import database as db
from .constants import GUILD_IDS, ANNOUNCE_CHANNEL_ID, INVEST_RATE, INVEST_INTERVAL
from .utils import fmt, get_rank
from .views import BankView, _main_embed


class BankCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        await db.init_tables()
        self.lottery_loop.start()

    async def cog_unload(self):
        self.lottery_loop.cancel()

    # ── /bank ─────────────────────────────────────────────────────

    @app_commands.command(name="bank", description="🏴‍☠️ Freydiss Bank — ton tableau de bord pirate")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(membre="Membre à consulter (toi par défaut)")
    async def bank(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        await interaction.response.defer()
        try:
            target   = membre or interaction.user
            uid      = str(target.id)
            guild_id = str(interaction.guild_id)

            profile  = await db.get_or_create(uid, guild_id)
            balance  = self.bot.get_berrys(uid)

            embed = await _main_embed(self.bot, uid, guild_id, profile, balance)
            embed.set_author(
                name=f"{target.display_name}  ·  Pirate #{uid[-5:]}",
                icon_url=target.display_avatar.url,
            )
            embed.set_thumbnail(url=target.display_avatar.url)

            # Permet seulement à l'auteur d'interagir avec les boutons
            view = BankView(str(interaction.user.id), guild_id, profile)
            msg  = await interaction.followup.send(embed=embed, view=view)
            view.message = msg

        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                await interaction.followup.send("❌ La Marine a bloqué la connexion. Réessaie plus tard.", ephemeral=True)
            except Exception:
                pass

    # ── Tirage loterie (toutes les heures, draw si 24h écoulées) ──

    @tasks.loop(hours=1)
    async def lottery_loop(self):
        for gid in GUILD_IDS:
            try:
                result = await db.draw_lottery(str(gid))
                if not result:
                    continue
                winner_uid = result["winner_id"]
                pot        = result["pot"]
                if pot > 0:
                    self.bot.add_berrys(winner_uid, pot)
                    await db.log_tx(winner_uid, str(gid), "loterie_gain", pot, "Jackpot loterie")
                await _announce_lottery(self.bot, gid, winner_uid, pot)
                await db.ensure_lottery(str(gid))
            except Exception:
                pass

    @lottery_loop.before_loop
    async def _before_lottery(self):
        await self.bot.wait_until_ready()


async def _announce_lottery(bot, guild_id: int, winner_uid: str, pot: int):
    if not ANNOUNCE_CHANNEL_ID:
        return
    ch = bot.get_channel(ANNOUNCE_CHANNEL_ID)
    if not ch:
        return
    try:
        guild  = bot.get_guild(guild_id)
        member = guild.get_member(int(winner_uid)) if guild else None
        mention = member.mention if member else f"<@{winner_uid}>"
        embed = discord.Embed(
            title="🎟️ TIRAGE DE LA LOTERIE — FREYDISS BANK",
            description=(
                f"🥁 *Roulement de tambour...*\n\n"
                f"🎉 Le grand gagnant est **{mention}** !\n"
                f"💰 Il remporte le jackpot de **`{fmt(pot)}` ฿** !\n\n"
                f"*Achète tes tickets pour le prochain tirage dans `/bank` → Loterie !*"
            ),
            color=0xFFD700,
        )
        embed.set_footer(text="Brams Community • Freydiss Bank • Loterie")
        await ch.send(content=mention, embed=embed)
    except Exception:
        pass
