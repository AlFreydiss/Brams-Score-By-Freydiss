import os
import asyncio
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands

from . import database as db
from .constants import COLOR_NEUTRAL, BANK_RANKS
from .views import BanqueView, fmt, _send_leaderboard

GUILD_IDS = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]

_SEP = "━━━━━━━━━━━━━━━━━━━━━━"


class BankCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="banque", description="🏦 Freydiss Bank — tableau de bord financier")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(membre="Membre à consulter (toi par défaut)")
    async def banque(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        await interaction.response.defer()

        try:
            target   = membre or interaction.user
            uid      = str(target.id)
            guild_id = str(interaction.guild_id)
            gids     = [str(m.id) for m in interaction.guild.members if not m.bot]

            wallet = self.bot.get_berrys(uid)

            try:
                account, vaults = await asyncio.wait_for(
                    asyncio.gather(
                        db.ensure_and_get_account(uid, guild_id),
                        db.get_vaults_for_guild(guild_id, gids),
                    ),
                    timeout=14.0,
                )
            except asyncio.TimeoutError:
                await interaction.followup.send("❌ La base de données met trop de temps à répondre.", ephemeral=True)
                return

            vault = account.get("vault") or 0
            total = wallet + vault

            all_totals = sorted(
                [self.bot.get_berrys(mid) + vaults.get(mid, 0) for mid in gids],
                reverse=True,
            )
            position = next((i + 1 for i, t in enumerate(all_totals) if t <= total), len(all_totals))
            total_m  = len(all_totals)

            rank     = db.get_bank_rank(total)
            old_rank = account.get("bank_rank", "Mousse")
            if rank["nom"] != old_rank:
                await db.update_bank_rank_db(uid, guild_id, rank["nom"])
                await _announce_rank_up(interaction, target, old_rank, rank)

            next_rank = db.get_next_rank(total)
            next_str  = (
                f"`{fmt(next_rank['seuil'] - total)}` ฿ pour {next_rank['emoji']} **{next_rank['nom']}**"
                if next_rank else "🐉 Rang maximum atteint !"
            )

            if next_rank:
                prev_seuil = rank["seuil"]
                prog_ratio = min((total - prev_seuil) / max(1, next_rank["seuil"] - prev_seuil), 1.0)
                filled = int(prog_ratio * 12)
                prog_bar = "█" * filled + "░" * (12 - filled)
                prog_str = f"`{prog_bar}` {int(prog_ratio * 100)}%"
            else:
                prog_str = "`████████████` MAX"

            now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")

            embed = discord.Embed(
                title="🏴‍☠️  FREYDISS BANK",
                description=(
                    f"{_SEP}\n"
                    f"💰 **En poche** · `{fmt(wallet)}` ฿\n"
                    f"🔒 **Coffre-fort** · `{fmt(vault)}` ฿\n"
                    f"💎 **Fortune totale** · `{fmt(total)}` ฿\n"
                    f"{_SEP}\n"
                    f"{rank['emoji']} **{rank['nom']}** · Rang **#{position}** / {total_m}\n"
                    f"{prog_str}\n"
                    f"🎯 {next_str}\n"
                    f"{_SEP}\n"
                    f"🔗 Streak · **{account.get('streak') or 0}** jour(s)"
                ),
                color=rank["couleur"],
            )
            embed.set_author(
                name=f"{target.display_name}  ·  Compte #{uid[-6:]}",
                icon_url=target.display_avatar.url,
            )
            embed.set_thumbnail(url=target.display_avatar.url)
            embed.set_footer(
                text=f"⚓ Freydiss Bank  ·  {now_str} UTC",
                icon_url=interaction.client.user.display_avatar.url,
            )

            view = BanqueView(uid, target, account, str(interaction.guild_id))
            msg  = await interaction.followup.send(embed=embed, view=view)
            view.message = msg

        except Exception as e:
            import traceback
            print(f"[BANQUE] Erreur: {e}", flush=True)
            traceback.print_exc()
            try:
                await interaction.followup.send("❌ Une erreur est survenue.", ephemeral=True)
            except Exception:
                pass


async def _announce_rank_up(interaction, target, old_rank, new_rank):
    announce_ch_id = int(os.environ.get("ANNOUNCE_CHANNEL_ID", "0"))
    if not announce_ch_id:
        return
    ch = interaction.client.get_channel(announce_ch_id)
    if not ch:
        return
    try:
        await ch.send(
            embed=discord.Embed(
                title=f"{new_rank['emoji']} Rang bancaire atteint !",
                description=(
                    f"🎉 {target.mention} vient de devenir "
                    f"**{new_rank['emoji']} {new_rank['nom']}** à la Freydiss Bank !\n"
                    f"*(anciennement : {old_rank})*"
                ),
                color=new_rank["couleur"],
            ).set_thumbnail(url=target.display_avatar.url)
        )
    except Exception:
        pass
