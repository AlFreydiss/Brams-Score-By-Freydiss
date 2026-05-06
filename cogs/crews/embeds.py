import discord
from datetime import datetime, timezone
from .constants import CREW_LEVELS, POSITIONS, CREW_COLOR
from .utils import fmt_berries, get_level_data, xp_for_next, can_feature


def crew_info_embed(crew: dict, members: list[dict], alliances: list[dict],
                    guild: discord.Guild | None = None) -> discord.Embed:
    lvl  = crew['level']
    data = get_level_data(lvl)
    e = discord.Embed(
        title=f"🏴‍☠️  {crew['name']}  [{crew['tag']}]",
        description=crew.get('description') or "*Aucune description.*",
        color=CREW_COLOR,
    )
    if crew.get('flag_url'):
        e.set_thumbnail(url=crew['flag_url'])

    cap_mention = f"<@{crew['captain_id']}>"
    e.add_field(name="👑 Capitaine",     value=cap_mention,                       inline=True)
    e.add_field(name="⚔️ Niveau",         value=f"**{lvl}** / 10",                inline=True)
    e.add_field(name="👥 Membres",        value=f"**{len(members)}** / {data['max_members']}", inline=True)
    e.add_field(name="💰 Prime cumulée",  value=f"**{fmt_berries(crew['total_bounty'])} 🍊**", inline=True)
    e.add_field(name="🏦 Trésor",         value=f"**{fmt_berries(crew['treasury'])} 🍊**",     inline=True)
    e.add_field(name="⚔️ Guerres",        value=f"✅ {crew['wars_won']}W / ❌ {crew['wars_lost']}L", inline=True)

    if alliances:
        ally_names = []
        for a in alliances:
            other_id = a['crew_b_id'] if a['crew_a_id'] == crew['id'] else a['crew_a_id']
            ally_names.append(f"<@&{other_id}>") if guild else ally_names.append(f"Crew #{other_id}")
        e.add_field(name="🤝 Alliances",  value=", ".join(ally_names), inline=False)

    roster = []
    for m in members:
        pos  = m['position']
        emoji = POSITIONS.get(pos, {}).get('emoji', '👤')
        roster.append(f"{emoji} <@{m['user_id']}> — *{pos}*")
    if roster:
        e.add_field(name="📋 Équipage", value="\n".join(roster[:12]), inline=False)

    recr = "✅ Recrutement ouvert" if crew['is_recruiting'] else "🔒 Recrutement fermé"
    e.set_footer(text=recr)
    return e


def crew_level_embed(crew: dict) -> discord.Embed:
    lvl      = crew['level']
    xp       = crew['xp']
    next_xp  = xp_for_next(lvl)
    e = discord.Embed(title=f"📈 Progression — {crew['name']}", color=CREW_COLOR)
    e.add_field(name="Niveau actuel", value=f"**{lvl}** / 10", inline=True)
    e.add_field(name="XP total",      value=f"**{fmt_berries(xp)}**",       inline=True)
    if next_xp:
        pct    = min(100, int(xp / next_xp * 100))
        filled = pct // 5
        bar    = "█" * filled + "░" * (20 - filled)
        e.add_field(
            name=f"Vers niveau {lvl + 1}",
            value=f"`{bar}` **{pct}%**\n{fmt_berries(xp)} / {fmt_berries(next_xp)} XP",
            inline=False,
        )
        feats_next = get_level_data(lvl + 1).get('features', [])
        new_feats  = [f for f in feats_next if f not in get_level_data(lvl).get('features', [])]
        if new_feats:
            e.add_field(name="✨ Prochain déblocage", value="\n".join(f"• `{f}`" for f in new_feats), inline=False)
    else:
        e.add_field(name="🏆 Niveau maximum atteint !", value="*Yonko Status* débloqué.", inline=False)
    return e


def treasury_embed(crew: dict, logs: list[dict]) -> discord.Embed:
    e = discord.Embed(title=f"🏦 Trésor — {crew['name']}", color=CREW_COLOR)
    e.add_field(name="Solde actuel", value=f"**{fmt_berries(crew['treasury'])} 🍊**", inline=False)
    if logs:
        lines = []
        for lg in logs:
            sign  = "+" if lg['amount'] > 0 else ""
            lines.append(
                f"`{lg['action']:12}` {sign}{fmt_berries(lg['amount'])} 🍊 — <@{lg['user_id']}>"
            )
        e.add_field(name="📜 10 derniers mouvements", value="\n".join(lines), inline=False)
    return e


def applications_embed(crew: dict, apps: list[dict], page: int, total: int) -> discord.Embed:
    e = discord.Embed(
        title=f"📋 Candidatures — {crew['name']}",
        description=f"**{total}** candidature(s) en attente",
        color=CREW_COLOR,
    )
    for app in apps:
        e.add_field(
            name=f"<@{app['user_id']}>",
            value=f"*{app['message'][:200] if app['message'] else 'Aucun message.'}*\nID: `{app['id']}`",
            inline=False,
        )
    e.set_footer(text=f"Page {page}")
    return e


def war_status_embed(war: dict, crew_a: dict, crew_b: dict, top: list[dict]) -> discord.Embed:
    attacker = crew_a if war['attacker_id'] == crew_a['id'] else crew_b
    defender = crew_b if war['attacker_id'] == crew_a['id'] else crew_a
    color = 0xFF4444 if war['status'] == 'active' else 0x888888
    e = discord.Embed(
        title=f"⚔️ Guerre — {attacker['name']} vs {defender['name']}",
        color=color,
    )
    e.add_field(name=f"🏴‍☠️ {attacker['name']}", value=f"**{war['attacker_score']}** pts", inline=True)
    e.add_field(name="VS",                        value="─",                                inline=True)
    e.add_field(name=f"🏴‍☠️ {defender['name']}", value=f"**{war['defender_score']}** pts", inline=True)
    e.add_field(name="💰 Prize pool", value=f"**{fmt_berries(war['prize_pool'])} 🍊**", inline=True)
    if war.get('ends_at'):
        e.add_field(name="⏰ Fin", value=f"<t:{int(war['ends_at'].timestamp())}:R>", inline=True)
    if top:
        lines = [f"<@{t['user_id']}> — **{t['total_points']}** pts ({t['battles']} duels)" for t in top[:5]]
        e.add_field(name="🏆 Top contributeurs", value="\n".join(lines), inline=False)
    return e


def alliances_embed(crew: dict, alliances: list[dict], ally_crews: list[dict]) -> discord.Embed:
    e = discord.Embed(title=f"🤝 Alliances — {crew['name']}", color=0x9B59B6)
    if not alliances:
        e.description = "*Aucune alliance active.*"
        return e
    for ally in alliances:
        other_id = ally['crew_b_id'] if ally['crew_a_id'] == crew['id'] else ally['crew_a_id']
        other    = next((c for c in ally_crews if c['id'] == other_id), None)
        name     = other['name'] if other else f"Crew #{other_id}"
        since    = ally.get('accepted_at')
        since_str = f"<t:{int(since.timestamp())}:D>" if since else "?"
        e.add_field(name=f"🏴‍☠️ {name}", value=f"Depuis {since_str}", inline=True)
    return e


def history_embed(crew: dict, events: list[dict]) -> discord.Embed:
    ACTION_LABELS = {
        'joined':   '📥 a rejoint',
        'left':     '📤 a quitté',
        'kicked':   '🥾 a été expulsé',
        'betrayed': '🗡️ a trahi',
        'promoted': '⬆️ a été promu',
        'demoted':  '⬇️ a été rétrogradé',
    }
    e = discord.Embed(title=f"📜 Historique — {crew['name']}", color=CREW_COLOR)
    lines = []
    for ev in events:
        label = ACTION_LABELS.get(ev['action'], ev['action'])
        ts    = f"<t:{int(ev['created_at'].timestamp())}:R>"
        detail = f" *({ev['details']})*" if ev.get('details') else ""
        lines.append(f"{ts} <@{ev['user_id']}> {label}{detail}")
    e.description = "\n".join(lines) or "*Aucun événement.*"
    return e


def leaderboard_embed(crews: list[dict], page: int = 1) -> discord.Embed:
    medals = ["🥇", "🥈", "🥉"] + [f"**{i}.**" for i in range(4, 21)]
    e = discord.Embed(title="🏆 Classement des Équipages", color=CREW_COLOR)
    lines = []
    for i, crew in enumerate(crews):
        rank = medals[i] if i < len(medals) else f"{i+1}."
        lines.append(
            f"{rank} **{crew['name']}** [{crew['tag']}] — "
            f"{fmt_berries(crew['total_bounty'])} 🍊 · Niv.{crew['level']}"
        )
    e.description = "\n".join(lines) or "*Aucun équipage.*"
    e.set_footer(text=f"Page {page}")
    return e
