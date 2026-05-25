from collections import defaultdict
from datetime import datetime, timedelta, timezone

import discord
from discord import app_commands
from discord.ext import commands

from config import BERRIES_PER_VOCAL_MINUTE
from graphs import make_activity_graph, make_peak_hours_graph
from ranks import update_rank
from storage import get_user, load_data, refresh_berry_leaderboard, save_data
from utils import (
    award_vocal_berries,
    calculate_vocal_berries_from_history,
    clean_old_data,
    format_duration,
    get_next_rank,
    get_rank_for_hours,
    messages_in_period,
    now_ts,
    iter_vocal_sessions,
    user_seconds_in_period,
)


class CommandsCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="stats", description="Tes stats vocales et messages avec graphique")
    async def stats(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        data = await load_data()
        uid = str(interaction.user.id)
        user = get_user(data, uid)

        s1d, s7d, s14d = (user_seconds_in_period(user, d) for d in (1, 7, 14))
        m1d, m7d, m14d = (messages_in_period(user["messages"], d) for d in (1, 7, 14))
        hours_7d = s7d / 3600
        rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
        next_thresh, next_rank = get_next_rank(hours_7d)

        vocal_by_day: dict = defaultdict(float)
        msg_by_day: dict = defaultdict(int)
        for s in iter_vocal_sessions(user):
            day = datetime.fromtimestamp(s["end"], tz=timezone.utc).strftime("%d/%m")
            vocal_by_day[day] += s["end"] - s["start"]
        for ts in user["messages"]:
            day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m")
            msg_by_day[day] += 1

        graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activité de {interaction.user.display_name}")

        embed = discord.Embed(title="📊 Tes statistiques", color=discord.Color.gold())
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.add_field(
            name="🎙️ Temps vocal",
            value=f"**Aujourd'hui :** {format_duration(s1d)}\n**7j :** {format_duration(s7d)}\n**14j :** {format_duration(s14d)}",
            inline=True,
        )
        embed.add_field(
            name="💬 Messages",
            value=f"**Aujourd'hui :** {m1d}\n**7j :** {m7d}\n**14j :** {m14d}",
            inline=True,
        )
        embed.add_field(
            name="🍖 Berries",
            value=f"**{int(user.get('berrys') or 0):,}** berries".replace(",", " "),
            inline=True,
        )
        embed.add_field(name="​", value="​", inline=False)
        embed.add_field(name="🎖️ Rank actuel (7j)", value=rank_actuel, inline=True)
        if next_rank:
            embed.add_field(name="⬆️ Prochain rank", value=f"{next_rank} (encore {next_thresh - hours_7d:.1f}h)", inline=True)
        else:
            embed.add_field(name="👑", value="Rang maximum !", inline=True)
        embed.set_image(url="attachment://graph.png")
        embed.set_footer(text="7 derniers jours glissants")

        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"), ephemeral=True)

    @app_commands.command(name="top", description="Top 5 vocal et messages")
    @app_commands.describe(periode="Période")
    @app_commands.choices(periode=[
        app_commands.Choice(name="Aujourd'hui",       value="1"),
        app_commands.Choice(name="7 derniers jours",  value="7"),
        app_commands.Choice(name="14 derniers jours", value="14"),
    ])
    async def top(self, interaction: discord.Interaction, periode: app_commands.Choice[str]) -> None:
        await interaction.response.defer()
        data = await load_data()
        guild = interaction.guild
        days = int(periode.value)

        vocal_list, msg_list = [], []
        vocal_by_day: dict = defaultdict(float)
        msg_by_day: dict = defaultdict(int)

        for uid, udata in data.items():
            member = guild.get_member(int(uid))
            if not member or member.bot:
                continue
            vocal_list.append((member.display_name, user_seconds_in_period(udata, days)))
            msg_list.append((member.display_name, messages_in_period(udata.get("messages", []), days)))
            for s in iter_vocal_sessions(udata, member):
                day = datetime.fromtimestamp(s["end"], tz=timezone.utc).strftime("%d/%m")
                vocal_by_day[day] += s["end"] - s["start"]
            for ts in udata.get("messages", []):
                day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m")
                msg_by_day[day] += 1

        vocal_list.sort(key=lambda x: x[1], reverse=True)
        msg_list.sort(key=lambda x: x[1], reverse=True)
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

        def build_top(lst, formatter):
            return "\n".join(
                f"{medals[i]} **{n}** — {formatter(v)}" for i, (n, v) in enumerate(lst[:5])
            ) or "Aucune donnée"

        graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activité serveur — {periode.name}")

        embed = discord.Embed(title=f"🏆 Top 5 — {periode.name}", color=discord.Color.blurple())
        embed.add_field(name="🎙️ Vocal",   value=build_top(vocal_list, format_duration),          inline=True)
        embed.add_field(name="💬 Messages", value=build_top(msg_list,  lambda x: f"{x} msg"),     inline=True)
        embed.set_image(url="attachment://graph.png")

        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))

    @app_commands.command(name="topberries", description="Top 5 des berries")
    async def topberries(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        data = await load_data()
        names = {
            str(member.id): member.display_name
            for member in interaction.guild.members
            if not member.bot
        }
        leaderboard = await refresh_berry_leaderboard(data, names=names)
        entries = leaderboard.get("entries", [])

        if not entries:
            await interaction.followup.send("Aucune donnée de berries pour le moment.")
            return

        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
        lines = []
        for i, entry in enumerate(entries[:5]):
            name = entry.get("display_name") or entry.get("uid") or "Inconnu"
            berries = int(entry.get("berrys") or 0)
            lines.append(f"{medals[i]} **{name}** — **{berries:,}** berries".replace(",", " "))

        embed = discord.Embed(
            title="🏆 Top Berries",
            description="\n".join(lines),
            color=discord.Color.gold(),
        )
        generated_at = leaderboard.get("generated_at")
        if generated_at:
            embed.set_footer(text=f"Actualisé le {generated_at}")

        await interaction.followup.send(embed=embed)

    @app_commands.command(name="serveur", description="Stats globales du serveur")
    async def serveur(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        data = await load_data()
        guild = interaction.guild

        total_vocal_7d = total_msg_7d = membres_actifs = 0
        channel_usage: dict = defaultdict(float)
        hour_usage: dict = defaultdict(float)
        cutoff = now_ts() - 7 * 86400

        for uid, udata in data.items():
            member = guild.get_member(int(uid))
            if not member or member.bot:
                continue
            sec = user_seconds_in_period(udata, 7)
            msgs = messages_in_period(udata.get("messages", []), 7)
            total_vocal_7d += sec
            total_msg_7d += msgs
            if sec > 0 or msgs > 0:
                membres_actifs += 1
            for s in iter_vocal_sessions(udata, member):
                if s["end"] < cutoff:
                    continue
                if s.get("channel"):
                    channel_usage[s["channel"]] += s["end"] - max(s["start"], cutoff)
                start_dt = datetime.fromtimestamp(max(s["start"], cutoff), tz=timezone.utc)
                end_dt = datetime.fromtimestamp(s["end"], tz=timezone.utc)
                current = start_dt
                while current < end_dt:
                    next_hour = current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                    chunk = min(next_hour, end_dt) - current
                    hour_usage[current.hour] += chunk.total_seconds() / 60
                    current = next_hour

        top_channels = sorted(channel_usage.items(), key=lambda x: x[1], reverse=True)[:5]
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
        salon_lines = []
        for i, (cid, secs) in enumerate(top_channels):
            ch = guild.get_channel(int(cid))
            name = ch.name if ch else "Salon supprimé"
            salon_lines.append(f"{medals[i]} **{name}** — {format_duration(secs)}")

        peak_hour = max(hour_usage, key=hour_usage.get) if hour_usage else 0
        graph_buf = make_peak_hours_graph(hour_usage)

        embed = discord.Embed(title=f"🌍 Stats du serveur — {guild.name}", color=discord.Color.og_blurple())
        embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
        embed.add_field(name="👥 Membres actifs (7j)", value=str(membres_actifs),         inline=True)
        embed.add_field(name="🎙️ Total vocal (7j)",    value=format_duration(total_vocal_7d), inline=True)
        embed.add_field(name="💬 Total messages (7j)", value=str(total_msg_7d),            inline=True)
        embed.add_field(
            name="🏠 Top salons vocaux (7j)",
            value="\n".join(salon_lines) if salon_lines else "Aucune donnée",
            inline=False,
        )
        embed.add_field(
            name="🕐 Heure de pointe",
            value=(
                f"**{peak_hour}h00 – {peak_hour + 1}h00 UTC** ({hour_usage.get(peak_hour, 0):.0f} min d'activité)"
                if hour_usage else "Aucune donnée"
            ),
            inline=False,
        )
        embed.set_image(url="attachment://peaks.png")
        embed.set_footer(text="Basé sur les 7 derniers jours glissants")

        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "peaks.png"))

    @app_commands.command(name="tout", description="Tout voir : tes stats + serveur + classement")
    async def tout(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        data = await load_data()
        guild = interaction.guild
        uid = str(interaction.user.id)
        user = get_user(data, uid)

        s7d = user_seconds_in_period(user, 7)
        m7d = messages_in_period(user["messages"], 7)
        hours_7d = s7d / 3600
        rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"

        total_vocal_7d = total_msg_7d = membres_actifs = 0
        vocal_list, msg_list = [], []

        for u_id, udata in data.items():
            member = guild.get_member(int(u_id))
            if not member or member.bot:
                continue
            sec = user_seconds_in_period(udata, 7)
            msgs = messages_in_period(udata.get("messages", []), 7)
            total_vocal_7d += sec
            total_msg_7d += msgs
            if sec > 0 or msgs > 0:
                membres_actifs += 1
            vocal_list.append((member.display_name, sec))
            msg_list.append((member.display_name, msgs))

        vocal_list.sort(key=lambda x: x[1], reverse=True)
        msg_list.sort(key=lambda x: x[1], reverse=True)
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

        def build_top(lst, formatter):
            return "\n".join(
                f"{medals[i]} **{n}** — {formatter(v)}" for i, (n, v) in enumerate(lst[:5])
            ) or "Aucune donnée"

        vocal_by_day: dict = defaultdict(float)
        msg_by_day: dict = defaultdict(int)
        for s in iter_vocal_sessions(user, interaction.user):
            day = datetime.fromtimestamp(s["end"], tz=timezone.utc).strftime("%d/%m")
            vocal_by_day[day] += s["end"] - s["start"]
        for ts in user["messages"]:
            day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m")
            msg_by_day[day] += 1

        graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Ton activité — {interaction.user.display_name}")

        embed = discord.Embed(title="📋 Vue complète", color=discord.Color.gold())
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.add_field(name="🎙️ Ton vocal (7j)",  value=format_duration(s7d), inline=True)
        embed.add_field(name="💬 Tes messages (7j)", value=str(m7d),           inline=True)
        embed.add_field(name="🎖️ Ton rank",          value=rank_actuel,        inline=True)
        embed.add_field(name="​", value="**— Serveur (7j) —**", inline=False)
        embed.add_field(name="👥 Membres actifs",  value=str(membres_actifs),          inline=True)
        embed.add_field(name="🎙️ Total vocal",     value=format_duration(total_vocal_7d), inline=True)
        embed.add_field(name="💬 Total messages",  value=str(total_msg_7d),             inline=True)
        embed.add_field(name="🏆 Top vocal (7j)",    value=build_top(vocal_list, format_duration),      inline=True)
        embed.add_field(name="🏆 Top messages (7j)", value=build_top(msg_list, lambda x: f"{x} msg"),  inline=True)
        embed.set_image(url="attachment://graph.png")

        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"), ephemeral=True)

    @app_commands.command(name="addheures", description="[ADMIN] Ajouter des heures vocales à un membre")
    @app_commands.checks.has_permissions(administrator=True)
    async def addheures(self, interaction: discord.Interaction, membre: discord.Member, heures: float) -> None:
        data = await load_data()
        uid = str(membre.id)
        user = get_user(data, uid)
        now = now_ts()
        user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
        award_vocal_berries(user, heures * 3600)
        clean_old_data(user)
        await save_data(data)
        names = {str(member.id): member.display_name for member in interaction.guild.members if not member.bot}
        await refresh_berry_leaderboard(data, names=names)
        hours_7d = user_seconds_in_period(user, 7) / 3600
        await update_rank(membre, hours_7d)
        await interaction.response.send_message(
            f"✅ +{heures}h ajoutées à {membre.mention} → {hours_7d:.1f}h sur 7j", ephemeral=True
        )

    @app_commands.command(name="forcerank", description="[ADMIN] Recalculer le rank d'un membre")
    @app_commands.checks.has_permissions(administrator=True)
    async def forcerank(self, interaction: discord.Interaction, membre: discord.Member) -> None:
        data = await load_data()
        uid = str(membre.id)
        user = get_user(data, uid)
        hours_7d = user_seconds_in_period(user, 7) / 3600
        await update_rank(membre, hours_7d)
        await interaction.response.send_message(
            f"✅ Rank recalculé pour {membre.mention} ({hours_7d:.1f}h/7j)", ephemeral=True
        )

    @app_commands.command(name="recalcberries", description="[ADMIN] Recalculer les berries vocales de tout le serveur")
    @app_commands.checks.has_permissions(administrator=True)
    async def recalcberries(self, interaction: discord.Interaction) -> None:
        data = await load_data()
        names = {
            str(member.id): member.display_name
            for member in interaction.guild.members
            if not member.bot
        }
        total = members = 0
        for uid, user in data.items():
            if not isinstance(user, dict):
                continue
            get_user(data, uid)
            vocal_berries = calculate_vocal_berries_from_history(user)
            user["berrys"] = vocal_berries
            user["berrys_vocal_seconds_paid"] = vocal_berries // BERRIES_PER_VOCAL_MINUTE * 60
            total += vocal_berries
            members += 1
        await save_data(data)
        await refresh_berry_leaderboard(data, names=names)
        await interaction.response.send_message(
            f"✅ Berries recalculées pour {members} membres — Total vocal : {total:,} berries".replace(",", " "),
            ephemeral=True,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CommandsCog(bot))
