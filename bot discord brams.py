import os
import io
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from threading import Thread

from dotenv import load_dotenv
from flask import Flask
import discord
from discord.ext import commands, tasks
from discord import app_commands

load_dotenv()

# ─────────────────────────────────────────
#  KEEP-ALIVE (Flask)
# ─────────────────────────────────────────
app = Flask('')

@app.route('/')
def home():
    return "Bot en ligne !"

def run():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run)
    t.start()

# ─────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────
TOKEN = os.getenv("DISCORD_TOKEN")
DATA_FILE = "data.json"
ANNOUNCE_CHANNEL = "rappel-rank"
ALERT_HOURS_THRESHOLD = 2.0
BERRIES_PER_VOCAL_MINUTE = 1000

RANKS = [
    (70, "Yonko"),
    (40, "Amiral"),
    (25, "Shichibukai"),
    (10, "Pirate"),
]

# ─────────────────────────────────────────
#  UTILITAIRES
# ─────────────────────────────────────────
def now_ts():
    return datetime.now(timezone.utc).timestamp()

def load_data():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_user(data, uid: str):
    if uid not in data:
        data[uid] = {
            "vocal_sessions": [],
            "join_time": None,
            "messages": [],
            "berrys": 0,
            "berrys_vocal_seconds_paid": 0,
            "last_rank": None,
            "alerted": False,
        }
    defaults = {
        "vocal_sessions": [],
        "join_time": None,
        "messages": [],
        "berrys": 0,
        "berrys_vocal_seconds_paid": 0,
        "last_rank": None,
        "alerted": False,
    }
    for key, value in defaults.items():
        if key not in data[uid]:
            data[uid][key] = value
    return data[uid]

def seconds_in_period(sessions, days):
    cutoff = now_ts() - days * 86400
    total = 0
    for s in sessions:
        start = max(s["start"], cutoff)
        end = s["end"]
        if end < cutoff:
            continue
        total += end - start
    return total

def active_seconds_in_period(join_time, days):
    if not join_time:
        return 0
    cutoff = now_ts() - days * 86400
    start = max(float(join_time), cutoff)
    end = now_ts()
    return max(0, end - start)

def user_seconds_in_period(user, days):
    return seconds_in_period(user.get("vocal_sessions", []), days) + active_seconds_in_period(user.get("join_time"), days)

def award_vocal_berries(user, seconds):
    seconds = max(0, int(seconds))
    whole_minutes = seconds // 60
    if whole_minutes <= 0:
        return 0
    earned = whole_minutes * BERRIES_PER_VOCAL_MINUTE
    user["berrys"] = int(user.get("berrys", 0) or 0) + earned
    user["berrys_vocal_seconds_paid"] = int(user.get("berrys_vocal_seconds_paid", 0) or 0) + whole_minutes * 60
    return earned

def calculate_vocal_berries_from_history(user):
    total_minutes = 0
    for session in user.get("vocal_sessions", []):
        total_minutes += max(0, int(session.get("end", 0) - session.get("start", 0))) // 60
    return total_minutes * BERRIES_PER_VOCAL_MINUTE

def messages_in_period(messages, days):
    cutoff = now_ts() - days * 86400
    return sum(1 for ts in messages if ts >= cutoff)

def clean_old_data(user):
    cutoff = now_ts() - 14 * 86400
    user["vocal_sessions"] = [s for s in user["vocal_sessions"] if s["end"] >= cutoff]
    user["messages"] = [ts for ts in user["messages"] if ts >= cutoff]

def format_duration(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}min"

def get_rank_for_hours(hours):
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return role_name
    return None

def get_next_rank(hours):
    for threshold, role_name in reversed(RANKS):
        if hours < threshold:
            return threshold, role_name
    return None, None

def get_current_rank_threshold(hours):
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return threshold, role_name
    return None, None

# ─────────────────────────────────────────
#  BOT
# ─────────────────────────────────────────
intents = discord.Intents.default()
intents.voice_states = True
intents.members = True
intents.message_content = True
intents.messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

# ─────────────────────────────────────────
#  RANK UPDATE + ANNONCES
# ─────────────────────────────────────────
RANK_EMOJIS = {
    "Pirate": "🏴‍☠️",
    "Shichibukai": "⚔️",
    "Amiral": "🪖",
    "Yonko": "👑",
}

async def update_rank(member: discord.Member, hours_7d: float, announce=True, data=None):
    _own_data = data is None
    if _own_data:
        data = load_data()

    guild = member.guild
    uid = str(member.id)
    user = get_user(data, uid)

    new_rank = get_rank_for_hours(hours_7d)
    old_rank = user.get("last_rank")
    rank_names = [r for _, r in RANKS]

    roles_to_remove = [r for r in member.roles if r.name in rank_names]
    if roles_to_remove:
        await member.remove_roles(*roles_to_remove)

    if new_rank:
        role = discord.utils.get(guild.roles, name=new_rank)
        if role:
            await member.add_roles(role)

    if announce and new_rank != old_rank and new_rank is not None:
        rank_order = {r: i for i, (_, r) in enumerate(reversed(RANKS))}
        old_order = rank_order.get(old_rank, -1)
        new_order = rank_order.get(new_rank, -1)
        if new_order > old_order:
            channel = discord.utils.get(guild.text_channels, name=ANNOUNCE_CHANNEL)
            if channel:
                emoji = RANK_EMOJIS.get(new_rank, "🎖️")
                embed = discord.Embed(
                    title=f"{emoji} Nouveau rank débloqué !",
                    description=f"**{member.display_name}** vient d'atteindre le rang **{new_rank}** avec **{hours_7d:.1f}h** de vocal cette semaine !",
                    color=discord.Color.gold()
                )
                embed.set_thumbnail(url=member.display_avatar.url)
                await channel.send(content=member.mention, embed=embed)

    user["last_rank"] = new_rank
    if _own_data:
        save_data(data)


async def check_alert(member: discord.Member, hours_7d: float, data=None):
    _own_data = data is None
    if _own_data:
        data = load_data()

    uid = str(member.id)
    user = get_user(data, uid)

    threshold, current_rank = get_current_rank_threshold(hours_7d)
    if current_rank is None:
        user["alerted"] = False
        if _own_data:
            save_data(data)
        return

    cutoff_7d = now_ts() - 7 * 86400
    sessions = user.get("vocal_sessions", [])
    expiring_soon = 0
    for s in sessions:
        if cutoff_7d <= s["end"] <= cutoff_7d + 86400:
            expiring_soon += s["end"] - max(s["start"], cutoff_7d)

    hours_expiring = expiring_soon / 3600
    future_hours = hours_7d - hours_expiring
    will_lose_rank = future_hours < threshold
    already_alerted = user.get("alerted", False)

    if will_lose_rank and not already_alerted:
        user["alerted"] = True
        if _own_data:
            save_data(data)
        try:
            embed = discord.Embed(
                title="⚠️ Tu vas perdre ton rank !",
                description=(
                    f"Attention **{member.display_name}** !\n\n"
                    f"Tu risques de perdre ton rang **{current_rank}** dans les prochaines 24h.\n"
                    f"Il te faut encore **{hours_expiring:.1f}h** de vocal pour le garder !\n\n"
                    f"Connecte-toi vite sur le serveur 🎙️"
                ),
                color=discord.Color.red()
            )
            await member.send(embed=embed)
        except discord.Forbidden:
            pass
    elif not will_lose_rank:
        user["alerted"] = False
        if _own_data:
            save_data(data)

# ─────────────────────────────────────────
#  GRAPHIQUES
# ─────────────────────────────────────────
def make_activity_graph(vocal_by_day, msg_by_day, title="Activité des 7 derniers jours"):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), facecolor="#2b2d31")
    fig.suptitle(title, color="white", fontsize=14, fontweight="bold")

    days = []
    for i in range(6, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        days.append(d.strftime("%d/%m"))

    vocal_hours = [vocal_by_day.get(d, 0) / 3600 for d in days]
    msg_counts  = [msg_by_day.get(d, 0) for d in days]

    ax1.set_facecolor("#313338")
    bars1 = ax1.bar(days, vocal_hours, color="#5865f2", alpha=0.85, width=0.6)
    ax1.set_ylabel("Heures", color="white")
    ax1.set_title("🎙️ Temps vocal (h)", color="#5865f2", fontsize=11)
    ax1.tick_params(colors="white")
    for spine in ax1.spines.values():
        spine.set_edgecolor("#4f545c")
    for bar, val in zip(bars1, vocal_hours):
        if val > 0:
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                     f"{val:.1f}h", ha="center", va="bottom", color="white", fontsize=8)

    ax2.set_facecolor("#313338")
    bars2 = ax2.bar(days, msg_counts, color="#57f287", alpha=0.85, width=0.6)
    ax2.set_ylabel("Messages", color="white")
    ax2.set_title("💬 Messages", color="#57f287", fontsize=11)
    ax2.tick_params(colors="white")
    for spine in ax2.spines.values():
        spine.set_edgecolor("#4f545c")
    for bar, val in zip(bars2, msg_counts):
        if val > 0:
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                     str(val), ha="center", va="bottom", color="white", fontsize=8)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=120)
    buf.seek(0)
    plt.close()
    return buf

def make_peak_hours_graph(hour_counts):
    fig, ax = plt.subplots(figsize=(12, 4), facecolor="#2b2d31")
    ax.set_facecolor("#313338")

    hours_labels = [f"{h}h" for h in range(24)]
    values = [hour_counts.get(h, 0) for h in range(24)]
    colors = ["#5865f2" if v == max(values) else "#4f545c" for v in values]

    bars = ax.bar(hours_labels, values, color=colors, alpha=0.9, width=0.7)
    ax.set_title("🕐 Heures de pointe du serveur (7 derniers jours)", color="white", fontsize=13, fontweight="bold")
    ax.set_xlabel("Heure (UTC)", color="white")
    ax.set_ylabel("Minutes d'activité vocale", color="white")
    ax.tick_params(colors="white", labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor("#4f545c")

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=120)
    buf.seek(0)
    plt.close()
    return buf

# ─────────────────────────────────────────
#  EVENTS
# ─────────────────────────────────────────
@bot.event
async def on_ready():
    print(f"✅ Bot connecté : {bot.user}")
    data = load_data()
    started = 0
    for guild in bot.guilds:
        for member in guild.members:
            if member.bot:
                continue
            if member.voice and member.voice.channel:
                user = get_user(data, str(member.id))
                if not user.get("join_time"):
                    user["join_time"] = now_ts()
                    started += 1
    if started:
        save_data(data)
        print(f"Sessions vocales restaurees pour {started} membre(s).")
    check_ranks_loop.start()
    try:
        synced = await bot.tree.sync()
        print(f"📡 {len(synced)} commandes slash synchronisées")
    except Exception as e:
        print(f"Erreur sync: {e}")

@bot.event
async def on_message(message):
    if message.author.bot:
        return
    data = load_data()
    uid = str(message.author.id)
    user = get_user(data, uid)
    user["messages"].append(now_ts())
    clean_old_data(user)
    save_data(data)
    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    if member.bot:
        return

    data = load_data()
    uid = str(member.id)
    user = get_user(data, uid)

    if before.channel is None and after.channel is not None:
        # Rejoint un vocal
        user["join_time"] = now_ts()
        save_data(data)

    elif before.channel is not None and after.channel is None:
        # Quitte le vocal
        if user["join_time"]:
            start = user["join_time"]
            end = now_ts()
            user["vocal_sessions"].append({"start": start, "end": end, "channel": str(before.channel.id)})
            award_vocal_berries(user, end - start)
            user["join_time"] = None
            clean_old_data(user)
            save_data(data)
            seconds_7d = user_seconds_in_period(user, 7)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d)

    elif before.channel is not None and after.channel is not None and before.channel != after.channel:
        # Change de salon vocal : ferme la session en cours, en ouvre une nouvelle
        if user["join_time"]:
            start = user["join_time"]
            end = now_ts()
            user["vocal_sessions"].append({"start": start, "end": end, "channel": str(before.channel.id)})
            award_vocal_berries(user, end - start)
        user["join_time"] = now_ts()
        clean_old_data(user)
        save_data(data)

# ─────────────────────────────────────────
#  LOOP HORAIRE — ranks + alertes
# ─────────────────────────────────────────
@tasks.loop(hours=1)
async def check_ranks_loop():
    # Charge une seule fois pour éviter d'écraser les changements de last_rank
    data = load_data()
    for guild in bot.guilds:
        for member in guild.members:
            if member.bot:
                continue
            uid = str(member.id)
            user = get_user(data, uid)
            clean_old_data(user)
            seconds_7d = user_seconds_in_period(user, 7)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d, announce=True, data=data)
            await check_alert(member, hours_7d, data=data)
    save_data(data)
    print("🔄 Vérification horaire des ranks effectuée.")

# ─────────────────────────────────────────
#  COMMANDES SLASH
# ─────────────────────────────────────────

@bot.tree.command(name="stats", description="Tes stats vocales et messages avec graphique")
async def stats(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    data = load_data()
    uid = str(interaction.user.id)
    user = get_user(data, uid)

    s1d  = user_seconds_in_period(user, 1)
    s7d  = user_seconds_in_period(user, 7)
    s14d = user_seconds_in_period(user, 14)
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)

    hours_7d = s7d / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    next_thresh, next_rank = get_next_rank(hours_7d)

    vocal_by_day = defaultdict(float)
    msg_by_day   = defaultdict(int)
    for s in user["vocal_sessions"]:
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
        inline=True
    )
    embed.add_field(
        name="💬 Messages",
        value=f"**Aujourd'hui :** {m1d}\n**7j :** {m7d}\n**14j :** {m14d}",
        inline=True
    )
    embed.add_field(
        name="Berries",
        value=f"**{int(user.get('berrys', 0) or 0):,}** berries".replace(",", " "),
        inline=True
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


@bot.tree.command(name="top", description="Top 5 vocal et messages")
@app_commands.describe(periode="Période")
@app_commands.choices(periode=[
    app_commands.Choice(name="Aujourd'hui", value="1"),
    app_commands.Choice(name="7 derniers jours", value="7"),
    app_commands.Choice(name="14 derniers jours", value="14"),
])
async def top(interaction: discord.Interaction, periode: app_commands.Choice[str]):
    await interaction.response.defer()
    data = load_data()
    guild = interaction.guild
    days = int(periode.value)

    vocal_list, msg_list = [], []
    vocal_by_day, msg_by_day = defaultdict(float), defaultdict(int)

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        sec  = user_seconds_in_period(udata, days)
        msgs = messages_in_period(udata.get("messages", []), days)
        vocal_list.append((member.display_name, sec))
        msg_list.append((member.display_name, msgs))
        for s in udata.get("vocal_sessions", []):
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
    embed.add_field(name="🎙️ Vocal", value=build_top(vocal_list, format_duration), inline=True)
    embed.add_field(name="💬 Messages", value=build_top(msg_list, lambda x: f"{x} msg"), inline=True)
    embed.set_image(url="attachment://graph.png")

    await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))


@bot.tree.command(name="serveur", description="Stats globales du serveur")
async def serveur(interaction: discord.Interaction):
    await interaction.response.defer()
    data = load_data()
    guild = interaction.guild

    total_vocal_7d = 0
    total_msg_7d   = 0
    membres_actifs = 0
    channel_usage  = defaultdict(float)
    hour_usage     = defaultdict(float)

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        sec  = user_seconds_in_period(udata, 7)
        msgs = messages_in_period(udata.get("messages", []), 7)
        total_vocal_7d += sec
        total_msg_7d   += msgs
        if sec > 0 or msgs > 0:
            membres_actifs += 1

        for s in udata.get("vocal_sessions", []):
            cutoff = now_ts() - 7 * 86400
            if s["end"] < cutoff:
                continue
            duration = s["end"] - max(s["start"], cutoff)
            ch_id = s.get("channel")
            if ch_id:
                channel_usage[ch_id] += duration

            start_dt = datetime.fromtimestamp(max(s["start"], cutoff), tz=timezone.utc)
            end_dt   = datetime.fromtimestamp(s["end"], tz=timezone.utc)
            current  = start_dt
            while current < end_dt:
                next_hour = current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                chunk = min(next_hour, end_dt) - current
                hour_usage[current.hour] += chunk.total_seconds() / 60
                current = next_hour

    top_channels = sorted(channel_usage.items(), key=lambda x: x[1], reverse=True)[:5]
    salon_lines = []
    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
    for i, (ch_id, secs) in enumerate(top_channels):
        ch = guild.get_channel(int(ch_id))
        name = ch.name if ch else "Salon supprimé"
        salon_lines.append(f"{medals[i]} **{name}** — {format_duration(secs)}")

    peak_hour = max(hour_usage, key=hour_usage.get) if hour_usage else 0
    peak_val  = hour_usage.get(peak_hour, 0)

    graph_buf = make_peak_hours_graph(hour_usage)

    embed = discord.Embed(
        title=f"🌍 Stats du serveur — {guild.name}",
        color=discord.Color.og_blurple()
    )
    embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
    embed.add_field(name="👥 Membres actifs (7j)", value=str(membres_actifs), inline=True)
    embed.add_field(name="🎙️ Total vocal (7j)", value=format_duration(total_vocal_7d), inline=True)
    embed.add_field(name="💬 Total messages (7j)", value=str(total_msg_7d), inline=True)
    embed.add_field(
        name="🏠 Top salons vocaux (7j)",
        value="\n".join(salon_lines) if salon_lines else "Aucune donnée",
        inline=False
    )
    embed.add_field(
        name="🕐 Heure de pointe",
        value=f"**{peak_hour}h00 – {peak_hour+1}h00 UTC** ({peak_val:.0f} min d'activité)",
        inline=False
    )
    embed.set_image(url="attachment://peaks.png")
    embed.set_footer(text="Basé sur les 7 derniers jours glissants")

    await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "peaks.png"))


@bot.tree.command(name="tout", description="Tout voir : tes stats + serveur + classement")
async def tout(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    data = load_data()
    guild = interaction.guild
    uid = str(interaction.user.id)
    user = get_user(data, uid)

    s7d  = user_seconds_in_period(user, 7)
    m7d  = messages_in_period(user["messages"], 7)
    hours_7d = s7d / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"

    total_vocal_7d, total_msg_7d, membres_actifs = 0, 0, 0
    vocal_list, msg_list = [], []

    for u_id, udata in data.items():
        member = guild.get_member(int(u_id))
        if not member or member.bot:
            continue
        sec  = user_seconds_in_period(udata, 7)
        msgs = messages_in_period(udata.get("messages", []), 7)
        total_vocal_7d += sec
        total_msg_7d   += msgs
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

    vocal_by_day = defaultdict(float)
    msg_by_day   = defaultdict(int)
    for s in user["vocal_sessions"]:
        day = datetime.fromtimestamp(s["end"], tz=timezone.utc).strftime("%d/%m")
        vocal_by_day[day] += s["end"] - s["start"]
    for ts in user["messages"]:
        day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m")
        msg_by_day[day] += 1

    graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Ton activité — {interaction.user.display_name}")

    embed = discord.Embed(title="📋 Vue complète", color=discord.Color.gold())
    embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)

    embed.add_field(name="🎙️ Ton vocal (7j)", value=format_duration(s7d), inline=True)
    embed.add_field(name="💬 Tes messages (7j)", value=str(m7d), inline=True)
    embed.add_field(name="🎖️ Ton rank", value=rank_actuel, inline=True)

    embed.add_field(name="​", value="**— Serveur (7j) —**", inline=False)
    embed.add_field(name="👥 Membres actifs", value=str(membres_actifs), inline=True)
    embed.add_field(name="🎙️ Total vocal", value=format_duration(total_vocal_7d), inline=True)
    embed.add_field(name="💬 Total messages", value=str(total_msg_7d), inline=True)

    embed.add_field(name="🏆 Top vocal (7j)", value=build_top(vocal_list, format_duration), inline=True)
    embed.add_field(name="🏆 Top messages (7j)", value=build_top(msg_list, lambda x: f"{x} msg"), inline=True)
    embed.set_image(url="attachment://graph.png")

    await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"), ephemeral=True)


@bot.tree.command(name="addheures", description="[ADMIN] Ajouter des heures vocales à un membre")
@app_commands.checks.has_permissions(administrator=True)
async def addheures(interaction: discord.Interaction, membre: discord.Member, heures: float):
    data = load_data()
    uid = str(membre.id)
    user = get_user(data, uid)
    now = now_ts()
    user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
    award_vocal_berries(user, heures * 3600)
    clean_old_data(user)
    save_data(data)
    seconds_7d = user_seconds_in_period(user, 7)
    hours_7d = seconds_7d / 3600
    await update_rank(membre, hours_7d)
    await interaction.response.send_message(
        f"✅ +{heures}h ajoutées à {membre.mention} → {hours_7d:.1f}h sur 7j", ephemeral=True
    )


@bot.tree.command(name="forcerank", description="[ADMIN] Recalculer le rank d'un membre")
@app_commands.checks.has_permissions(administrator=True)
async def forcerank(interaction: discord.Interaction, membre: discord.Member):
    data = load_data()
    uid = str(membre.id)
    user = get_user(data, uid)
    seconds_7d = user_seconds_in_period(user, 7)
    hours_7d = seconds_7d / 3600
    await update_rank(membre, hours_7d)
    await interaction.response.send_message(
        f"✅ Rank recalculé pour {membre.mention} ({hours_7d:.1f}h/7j)", ephemeral=True
    )


@bot.tree.command(name="recalcberries", description="[ADMIN] Recalculer les berries vocales de tout le serveur")
@app_commands.checks.has_permissions(administrator=True)
async def recalcberries(interaction: discord.Interaction):
    data = load_data()
    total = 0
    members = 0
    for uid, user in data.items():
        if not isinstance(user, dict):
            continue
        get_user(data, uid)
        vocal_berries = calculate_vocal_berries_from_history(user)
        user["berrys"] = vocal_berries
        user["berrys_vocal_seconds_paid"] = vocal_berries // BERRIES_PER_VOCAL_MINUTE * 60
        total += vocal_berries
        members += 1
    save_data(data)
    await interaction.response.send_message(
        f"Berries recalculées pour {members} membres. Total vocal: {total:,} berries".replace(",", " "),
        ephemeral=True
    )

# ─────────────────────────────────────────
#  LANCEMENT
# ─────────────────────────────────────────
keep_alive()
bot.run(TOKEN)
