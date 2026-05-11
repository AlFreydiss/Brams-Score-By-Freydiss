import os
import asyncio
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands

from . import database as db
from .constants import BANK_RANKS
from .views import MainBanqueView, fmt, _send_leaderboard
from utils.embed_helpers import build_banque_banner

GUILD_IDS = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]

# ── Version de l'embed banque ─────────────────────────────────────────────────
# "A" : fortune uniquement dans la bannière — fields compacts (En poche + Coffre + Progression)
# "B" : bannière + description fortune totale + tous les fields (comportement original enrichi)
BANNER_VERSION = "A"

# Remplace les chaînes vides par les URLs Supabase de tes images de rang
RANK_THUMBNAILS: list[tuple[int, str]] = [
    (100,  ""),   # Mousse    — position 1-100
    (500,  ""),   # Pirate    — position 101-500
    (1000, ""),   # Capitaine — position 501-1000
    (1500, ""),   # Supernova — position 1001-1500
    (9999, ""),   # Yonko     — position 1501+
]

_RANK_COLORS: list[int] = [
    0x8B7355,  # Mousse
    0x4A90D9,  # Matelot
    0xFF69B4,  # Pirate
    0xCC3333,  # Capitaine
    0xFF8C00,  # Supernova
    0x00CED1,  # Shichibukai
    0xFF4500,  # Yonkou
    0xAA00FF,  # Roi des Pirates
]


def get_rank_thumbnail(position: int) -> str:
    for threshold, url in RANK_THUMBNAILS:
        if position <= threshold:
            return url
    return RANK_THUMBNAILS[-1][1]


def build_progress_bar(percentage: float, length: int = 10) -> str:
    filled = round(percentage * length)
    return "▰" * filled + "▱" * (length - filled)


def get_rank_color(rank_idx: int) -> int:
    return _RANK_COLORS[min(rank_idx, len(_RANK_COLORS) - 1)]


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
                account, vaults, settings = await asyncio.wait_for(
                    asyncio.gather(
                        db.ensure_and_get_account(uid, guild_id),
                        db.get_vaults_for_guild(guild_id, gids),
                        db.get_bank_settings(uid),
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

            rank     = db.get_bank_rank(total)
            old_rank = account.get("bank_rank", "Mousse")
            if rank["nom"] != old_rank:
                await db.update_bank_rank_db(uid, guild_id, rank["nom"])
                await _announce_rank_up(interaction, target, old_rank, rank)

            rank_idx  = next(i for i, r in enumerate(BANK_RANKS) if r["nom"] == rank["nom"])
            next_rank = db.get_next_rank(total)

            prog_ratio = 0.0
            prog_next  = ""
            if next_rank:
                prev_seuil = rank["seuil"]
                prog_ratio = min((total - prev_seuil) / max(1, next_rank["seuil"] - prev_seuil), 1.0)
                prog_next  = next_rank["nom"]
                bar = build_progress_bar(prog_ratio)
                pct = int(prog_ratio * 100)
                progress_val = (
                    f"Rang **#{position}** → {rank['emoji']} **{next_rank['nom']}**\n"
                    f"{bar} **{pct}%**\n"
                    f"Encore `{fmt(next_rank['seuil'] - total)}` ฿"
                )
            else:
                progress_val = f"Rang **#{position}**\n{'▰' * 10} **MAX**\n🐉 Rang maximum atteint !"

            now_str     = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
            streak_val  = account.get("streak") or 0
            streak_unit = "jour" if streak_val <= 1 else "jours"
            thumb_url   = settings.get("thumbnail_url") or get_rank_thumbnail(position)
            rang_label  = f"Rang #{position}  ·  {rank['emoji']} {rank['nom']}"

            banner_file = await build_banque_banner(
                user_name=target.display_name,
                rang_label=rang_label,
                fortune=total,
                char_url=thumb_url or None,
                prog_ratio=prog_ratio,
                prog_next=prog_next,
                bg_gif_url=settings.get("background_gif_url"),
            )

            # ── Version A : fortune dans la bannière, fields compacts ─────────
            # ── Version B : bannière + fortune en description + tous les fields ─
            # Changer BANNER_VERSION en haut du fichier pour switcher.
            if BANNER_VERSION == "A":
                embed = discord.Embed(
                    title="🏴‍☠️  Freydiss Bank",
                    color=get_rank_color(rank_idx),
                )
                embed.set_author(name=target.display_name, icon_url=target.display_avatar.url)
                embed.add_field(name="💰 En poche",    value=f"`{fmt(wallet)}` ฿", inline=True)
                embed.add_field(name="🔒 Coffre-fort", value=f"`{fmt(vault)}` ฿",  inline=True)
                embed.add_field(name="⚓ Progression", value=progress_val,          inline=False)
            else:
                embed = discord.Embed(
                    title="🏴‍☠️  Freydiss Bank",
                    description=f"**💎 Fortune Totale**\n### {fmt(total)} ฿",
                    color=get_rank_color(rank_idx),
                )
                embed.set_author(name=target.display_name, icon_url=target.display_avatar.url)
                embed.add_field(name="💰 En poche",    value=f"`{fmt(wallet)}` ฿", inline=True)
                embed.add_field(name="🔒 Coffre-fort", value=f"`{fmt(vault)}` ฿",  inline=True)
                embed.add_field(name="⚓ Progression", value=progress_val,          inline=False)

            footer_text = f"🔥 Streak : {streak_val} {streak_unit}  •  {now_str} UTC"
            if not settings.get("thumbnail_url"):
                footer_text += "\n💡 Personnalise ton image via ⚙️ Paramètres"
            embed.set_footer(
                text=footer_text,
                icon_url=interaction.client.user.display_avatar.url,
            )
            embed.set_image(url=f"attachment://{banner_file.filename}")

            view = MainBanqueView(uid, target, account, str(interaction.guild_id), embed, settings)
            msg  = await interaction.followup.send(embed=embed, view=view, file=banner_file)
            view.message = msg

        except Exception as e:
            import traceback
            print(f"[BANQUE] Erreur: {e}", flush=True)
            traceback.print_exc()
            try:
                await interaction.followup.send("❌ Une erreur est survenue.", ephemeral=True)
            except Exception:
                pass

    @app_commands.command(name="banque_preview", description="🎨 Aperçu de la bannière banque (test rapide — éphémère)")
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    async def banque_preview(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        try:
            target   = interaction.user
            uid      = str(target.id)
            guild_id = str(interaction.guild_id)
            gids     = [str(m.id) for m in interaction.guild.members if not m.bot]

            wallet = self.bot.get_berrys(uid)

            try:
                account, vaults, settings = await asyncio.wait_for(
                    asyncio.gather(
                        db.ensure_and_get_account(uid, guild_id),
                        db.get_vaults_for_guild(guild_id, gids),
                        db.get_bank_settings(uid),
                    ),
                    timeout=14.0,
                )
            except asyncio.TimeoutError:
                await interaction.followup.send("❌ Timeout DB.", ephemeral=True)
                return

            vault = account.get("vault") or 0
            total = wallet + vault

            all_totals = sorted(
                [self.bot.get_berrys(mid) + vaults.get(mid, 0) for mid in gids],
                reverse=True,
            )
            position = next((i + 1 for i, t in enumerate(all_totals) if t <= total), len(all_totals))

            rank      = db.get_bank_rank(total)
            next_rank = db.get_next_rank(total)

            prog_ratio = 0.0
            prog_next  = ""
            if next_rank:
                prev_seuil = rank["seuil"]
                prog_ratio = min((total - prev_seuil) / max(1, next_rank["seuil"] - prev_seuil), 1.0)
                prog_next  = next_rank["nom"]

            thumb_url  = settings.get("thumbnail_url") or get_rank_thumbnail(position)
            rang_label = f"Rang #{position}  ·  {rank['emoji']} {rank['nom']}"

            banner_file = await build_banque_banner(
                user_name=target.display_name,
                rang_label=rang_label,
                fortune=total,
                char_url=thumb_url or None,
                prog_ratio=prog_ratio,
                prog_next=prog_next,
                bg_gif_url=settings.get("background_gif_url"),
            )
            await interaction.followup.send(file=banner_file, ephemeral=True)

        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                await interaction.followup.send(f"❌ Erreur preview : {e}", ephemeral=True)
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
