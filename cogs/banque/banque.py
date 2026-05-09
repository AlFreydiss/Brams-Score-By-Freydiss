import os
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands

from . import database as db
from .constants import COLOR_NEUTRAL, BANK_RANKS
from .views import BanqueView, fmt, _send_leaderboard

GUILD_IDS   = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]
_img_exec   = ThreadPoolExecutor(max_workers=2, thread_name_prefix="bank_img")

_IMG_CACHE: dict[str, tuple[float, bytes]] = {}
_IMG_CACHE_TTL = 30.0

_aio_session: aiohttp.ClientSession | None = None


async def _get_avatar_bytes(url: str) -> bytes | None:
    global _aio_session
    if _aio_session is None or _aio_session.closed:
        _aio_session = aiohttp.ClientSession()
    try:
        async with _aio_session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
            if r.status == 200:
                return await r.read()
    except Exception:
        return None


async def _generate_card(uid: str, target: discord.Member, account: dict,
                          wallet: int, position: int, total_m: int) -> bytes | None:
    import time
    now = time.monotonic()
    if uid in _IMG_CACHE:
        ts, data = _IMG_CACHE[uid]
        if now - ts < _IMG_CACHE_TTL:
            return data

    try:
        from utils.bank_image import generate_bank_card
        from .database import get_bank_rank

        rank  = get_bank_rank(wallet + account.get("vault", 0))
        av    = await _get_avatar_bytes(str(target.display_avatar.replace(format="png", size=128).url))
        data  = await asyncio.get_running_loop().run_in_executor(
            _img_exec,
            generate_bank_card,
            target.display_name,
            av,
            wallet,
            account.get("vault") or 0,
            rank,
            position,
            total_m,
            account.get("streak") or 0,
        )
        _IMG_CACHE[uid] = (now, data)
        return data
    except Exception as e:
        print(f"[BANK IMG] Erreur génération carte: {e}")
        return None


class BankCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="banque", description="🏦 Freydiss Bank — dashboard financier complet")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(membre="Membre à consulter (toi par défaut)")
    async def banque(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        await interaction.response.defer()

        try:
            target    = membre or interaction.user
            uid       = str(target.id)
            guild_id  = str(interaction.guild_id)
            gids      = [str(m.id) for m in interaction.guild.members if not m.bot]

            wallet = self.bot.get_berrys(uid)

            # Appels DB en parallèle : compte + vaults + stats hebdo
            account, vaults, (week_gain, week_dep) = await asyncio.gather(
                db.ensure_and_get_account(uid, guild_id),
                db.get_vaults_for_guild(guild_id, gids),
                db.get_week_stats(uid),
            )

            vault   = account.get("vault") or 0
            total   = wallet + vault

            # Classement richesse dans le guild
            all_totals = sorted(
                [self.bot.get_berrys(mid) + vaults.get(mid, 0) for mid in gids],
                reverse=True,
            )
            position = next((i + 1 for i, t in enumerate(all_totals) if t <= total), len(all_totals))
            total_m  = len(all_totals)

            # Rang bancaire + vérification rank-up
            rank      = db.get_bank_rank(total)
            old_rank  = account.get("bank_rank", "Mousse")
            if rank["nom"] != old_rank:
                await db.update_bank_rank_db(uid, guild_id, rank["nom"])
                await _announce_rank_up(interaction, target, old_rank, rank)

            # Prochain rang
            next_rank = db.get_next_rank(total)
            next_str  = (
                f"`{fmt(next_rank['seuil'] - total)}` ฿ pour {next_rank['emoji']} **{next_rank['nom']}**"
                if next_rank else "🐉 Rang maximum atteint !"
            )

            # Embed principal
            now_str   = datetime.now(timezone.utc).strftime("%H:%M UTC")
            embed = discord.Embed(
                title=f"🏴‍☠️ Freydiss Bank — {interaction.guild.name}",
                color=rank["couleur"],
            )
            embed.set_author(name=target.display_name, icon_url=target.display_avatar.url)
            embed.set_thumbnail(url=target.display_avatar.url)

            embed.add_field(name="💰 Berries en poche", value=f"`{fmt(wallet)}` ฿", inline=True)
            embed.add_field(name="🔒 Coffre-fort", value=f"`{fmt(vault)}` ฿", inline=True)
            embed.add_field(name="💎 Total", value=f"`{fmt(total)}` ฿", inline=True)
            embed.add_field(name="🏆 Rang bancaire", value=f"{rank['emoji']} **{rank['nom']}**", inline=True)
            embed.add_field(name="📊 Classement", value=f"**#{position}** sur {total_m} membres", inline=True)
            embed.add_field(name="📅 Streak quotidien", value=f"**{account.get('streak') or 0}** jour(s) 🔗", inline=True)
            embed.add_field(name="🎯 Prochain palier", value=next_str, inline=False)

            if week_gain or week_dep:
                bilan  = week_gain - week_dep
                b_icon = "📈" if bilan >= 0 else "📉"
                embed.add_field(
                    name="📅 Cette semaine",
                    value=(
                        f"Gagné : `{fmt(week_gain)}` ฿\n"
                        f"Dépensé : `{fmt(week_dep)}` ฿\n"
                        f"Bilan : {b_icon} `{'+' if bilan >= 0 else ''}{fmt(bilan)}` ฿"
                    ),
                    inline=False,
                )

            embed.set_footer(
                text=f"Freydiss Bank • Compte n°{uid[-6:]} • {now_str}",
                icon_url=interaction.client.user.display_avatar.url,
            )

            view = BanqueView(uid, target, account)
            card = await _generate_card(uid, target, account, wallet, position, total_m)

            if card:
                file = discord.File(fp=__import__("io").BytesIO(card), filename="carnet.png")
                embed.set_image(url="attachment://carnet.png")
                msg = await interaction.followup.send(embed=embed, file=file, view=view)
            else:
                msg = await interaction.followup.send(embed=embed, view=view)

            view.message = msg

        except Exception as e:
            print(f"[BANQUE] Erreur: {e}")
            try:
                await interaction.followup.send(
                    "❌ Une erreur est survenue. Réessaie dans quelques secondes.", ephemeral=True
                )
            except Exception:
                pass



async def _announce_rank_up(
    interaction: discord.Interaction,
    target: discord.Member,
    old_rank: str,
    new_rank: dict,
) -> None:
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
