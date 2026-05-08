import discord
from datetime import datetime, timezone
from .constants import CREW_LEVELS, POSITIONS, CREW_COLOR
from .utils import fmt_berries, get_level_data, xp_for_next, can_feature

FEATURE_LABELS = {
    'basic':                '📋 Fonctions de base',
    'custom_role_color':    '🎨 Couleur de rôle custom',
    'alliances':            '🤝 Alliances',
    'wars':                 '⚔️ Guerres',
    'shop_discount_5%':     '🏷️ Réduction boutique 5%',
    'shop_discount_10%':    '🏷️ Réduction boutique 10%',
    'custom_crew_emoji':    '😀 Emoji d\'équipage custom',
    'voice_xp_boost_10%':   '🔊 Boost XP vocal +10%',
    'custom_voice_channel': '📢 Salon vocal dédié',
    'yonko_status':         '👑 Statut Yonko',
}


def _xp_bar(xp: int, next_xp: int, width: int = 18) -> str:
    pct    = min(100, int(xp / next_xp * 100)) if next_xp else 100
    filled = int(pct / 100 * width)
    return f"{'█' * filled}{'░' * (width - filled)}"


def _dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def crew_info_embed(crew: dict, members: list[dict], alliances: list[dict],
                    guild: discord.Guild | None = None,
                    war: dict | None = None,
                    war_crew_a: dict | None = None,
                    war_crew_b: dict | None = None) -> discord.Embed:
    lvl     = crew['level']
    data    = get_level_data(lvl)
    xp      = crew['xp']
    next_xp = xp_for_next(lvl)

    recr = "✅ Recrutement ouvert" if crew['is_recruiting'] else "🔒 Recrutement fermé"

    e = discord.Embed(
        title=f"🏴‍☠️  {crew['name']}  [{crew['tag']}]",
        description=crew.get('description') or "*Aucune description.*",
        color=CREW_COLOR,
    )
    if crew.get('flag_url'):
        e.set_thumbnail(url=crew['flag_url'])

    # ── Infos de base ────────────────────────────────────────────────
    total_wars = crew['wars_won'] + crew['wars_lost']
    win_rate   = f"{int(crew['wars_won'] / total_wars * 100)}%" if total_wars else "—"
    e.add_field(name="👑 Capitaine",     value=f"<@{crew['captain_id']}>",                                        inline=True)
    e.add_field(name="📊 Niveau",        value=f"**{lvl}** / 10  ·  {recr}",                                     inline=True)
    e.add_field(name="👥 Membres",       value=f"**{len(members)}** / {data['max_members']}",                     inline=True)
    e.add_field(name="💰 Prime cumulée", value=f"**{fmt_berries(crew['total_bounty'])} 🍊**",                     inline=True)
    e.add_field(name="🏦 Trésor",        value=f"**{fmt_berries(crew['treasury'])} 🍊**",                         inline=True)
    e.add_field(name="⚔️ Guerres",       value=f"✅ {crew['wars_won']}V / ❌ {crew['wars_lost']}D · {win_rate}",  inline=True)

    # ── Barre XP ────────────────────────────────────────────────────
    if next_xp:
        pct = min(100, int(xp / next_xp * 100))
        e.add_field(
            name=f"📈 XP — Niv.{lvl} → Niv.{lvl + 1}  ({pct}%)",
            value=f"`{_xp_bar(xp, next_xp)}`  {fmt_berries(xp)} / {fmt_berries(next_xp)} XP",
            inline=False,
        )
    else:
        e.add_field(name="📈 XP", value=f"**{fmt_berries(xp)} XP** · 🏆 Niveau maximum atteint !", inline=False)

    # ── Roster complet ───────────────────────────────────────────────
    total_contrib = sum(m['contribution'] for m in members)
    roster = []
    for m in sorted(members, key=lambda x: x['contribution'], reverse=True):
        pos   = m['position']
        emoji = POSITIONS.get(pos, {}).get('emoji', '👤')
        pct   = int(m['contribution'] / total_contrib * 100) if total_contrib else 0
        roster.append(f"{emoji} <@{m['user_id']}> · *{pos}* · **{fmt_berries(m['contribution'])} 🍊** ({pct}%)")
    if roster:
        e.add_field(name=f"📋 Équipage ({len(members)}/{data['max_members']})", value="\n".join(roster[:15]), inline=False)

    # ── Alliances ────────────────────────────────────────────────────
    if alliances:
        ally_lines = []
        for a in alliances:
            other_id = a['crew_b_id'] if a['crew_a_id'] == crew['id'] else a['crew_a_id']
            since    = _dt(a.get('accepted_at'))
            since_str = f" · depuis <t:{int(since.timestamp())}:D>" if since else ""
            ally_lines.append(f"🤝 <@&{other_id}>{since_str}" if guild else f"🤝 Crew #{other_id}{since_str}")
        e.add_field(name=f"🤝 Alliances ({len(alliances)})", value="\n".join(ally_lines), inline=False)

    # ── Guerre en cours ──────────────────────────────────────────────
    if war and war_crew_a and war_crew_b:
        attacker = war_crew_a if war['attacker_id'] == war_crew_a['id'] else war_crew_b
        defender = war_crew_b if war['attacker_id'] == war_crew_a['id'] else war_crew_a
        att_s, def_s = war['attacker_score'], war['defender_score']
        total_pts = att_s + def_s
        att_pct   = int(att_s / total_pts * 100) if total_pts else 50
        def_pct   = 100 - att_pct
        w = 8
        att_bar = "█" * int(att_pct / 100 * w) + "░" * (w - int(att_pct / 100 * w))
        def_bar = "█" * int(def_pct / 100 * w) + "░" * (w - int(def_pct / 100 * w))
        ends = f" · fin <t:{int(war['ends_at'].timestamp())}:R>" if war.get('ends_at') else ""
        war_val = (
            f"🔴 **{attacker['name']}** `{att_bar}` {att_s}pts  vs  {def_s}pts `{def_bar}` **{defender['name']}**\n"
            f"💰 Prize pool : **{fmt_berries(war['prize_pool'])} 🍊**{ends}"
        )
        e.add_field(name="⚔️ Guerre en cours", value=war_val, inline=False)

    # ── Fonctionnalités ──────────────────────────────────────────────
    feats = [f for f in data.get('features', []) if f != 'basic']
    if feats:
        e.add_field(
            name="✨ Fonctionnalités",
            value="  ".join(f"`{FEATURE_LABELS.get(f, f)}`" for f in feats),
            inline=False,
        )

    # ── Footer ───────────────────────────────────────────────────────
    created = _dt(crew.get('created_at'))
    if created:
        e.set_footer(text="Fondé le")
        e.timestamp = created
    return e


def crew_level_embed(crew: dict) -> discord.Embed:
    lvl     = crew['level']
    xp      = crew['xp']
    next_xp = xp_for_next(lvl)
    data    = get_level_data(lvl)

    e = discord.Embed(title=f"📈 Progression — {crew['name']}", color=CREW_COLOR)
    e.add_field(name="Niveau actuel",  value=f"**{lvl}** / 10",           inline=True)
    e.add_field(name="XP total",       value=f"**{fmt_berries(xp)}**",    inline=True)
    e.add_field(name="👥 Max membres", value=f"**{data['max_members']}**", inline=True)

    if next_xp:
        pct    = min(100, int(xp / next_xp * 100))
        filled = pct // 5
        bar    = "█" * filled + "░" * (20 - filled)
        e.add_field(
            name=f"Vers niveau {lvl + 1}  ({pct}%)",
            value=f"`{bar}`\n{fmt_berries(xp)} / {fmt_berries(next_xp)} XP",
            inline=False,
        )
        feats_next = get_level_data(lvl + 1).get('features', [])
        new_feats  = [f for f in feats_next if f not in data.get('features', [])]
        if new_feats:
            e.add_field(
                name="✨ Prochain déblocage",
                value="\n".join(f"🔒 {FEATURE_LABELS.get(f, f)}" for f in new_feats),
                inline=False,
            )
    else:
        e.add_field(name="🏆 Niveau maximum atteint !", value="*Yonko Status* débloqué.", inline=False)

    # Fonctionnalités actuellement débloquées
    current_feats = [f for f in data.get('features', []) if f != 'basic']
    if current_feats:
        e.add_field(
            name="🔓 Fonctionnalités actuelles",
            value="\n".join(f"✅ {FEATURE_LABELS.get(f, f)}" for f in current_feats),
            inline=False,
        )
    return e


def treasury_embed(crew: dict, logs: list[dict], members: list[dict] = None) -> discord.Embed:
    e = discord.Embed(title=f"🏦 Trésor — {crew['name']}", color=CREW_COLOR)
    e.add_field(name="💰 Solde actuel", value=f"**{fmt_berries(crew['treasury'])} 🍊**", inline=True)

    if members:
        total_contrib = sum(m['contribution'] for m in members)
        e.add_field(name="📊 Total contribué", value=f"**{fmt_berries(total_contrib)} 🍊**", inline=True)
        e.add_field(name="​", value="​", inline=True)

        top5 = sorted(members, key=lambda m: m['contribution'], reverse=True)[:5]
        if top5 and total_contrib > 0:
            medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
            lines = []
            for i, m in enumerate(top5):
                pct = int(m['contribution'] / total_contrib * 100)
                bar_f = int(pct / 10)
                bar   = "█" * bar_f + "░" * (10 - bar_f)
                lines.append(f"{medals[i]} <@{m['user_id']}> `{bar}` **{pct}%** — {fmt_berries(m['contribution'])} 🍊")
            e.add_field(name="🏆 Top Contributeurs", value="\n".join(lines), inline=False)

    if logs:
        lines = []
        for lg in logs:
            sign    = "+" if lg['amount'] > 0 else ""
            ts      = f"<t:{int(lg['created_at'].timestamp())}:R>" if lg.get('created_at') else ""
            reason  = f" — *{str(lg['reason'])[:30]}*" if lg.get('reason') else ""
            action  = lg['action']
            emoji   = "💚" if lg['amount'] > 0 else "🔴"
            lines.append(f"{emoji} {ts} `{action:10}` {sign}{fmt_berries(abs(lg['amount']))} 🍊 <@{lg['user_id']}>{reason}")
        e.add_field(name="📜 10 derniers mouvements", value="\n".join(lines), inline=False)
    return e


def applications_embed(crew: dict, apps: list[dict], page: int, total: int) -> discord.Embed:
    e = discord.Embed(
        title=f"📋 Candidatures — {crew['name']}",
        description=f"**{total}** candidature(s) en attente",
        color=CREW_COLOR,
    )
    for app in apps:
        ts = f"<t:{int(app['created_at'].timestamp())}:R>" if app.get('created_at') else ""
        e.add_field(
            name=f"<@{app['user_id']}> {ts}",
            value=f"*{app['message'][:200] if app['message'] else 'Aucun message.'}*\nID: `{app['id']}`",
            inline=False,
        )
    e.set_footer(text=f"Page {page} / {total}")
    return e


def war_status_embed(war: dict, crew_a: dict, crew_b: dict, top: list[dict]) -> discord.Embed:
    attacker = crew_a if war['attacker_id'] == crew_a['id'] else crew_b
    defender = crew_b if war['attacker_id'] == crew_a['id'] else crew_a
    color    = 0xFF4444 if war['status'] == 'active' else 0x888888

    e = discord.Embed(
        title=f"⚔️ Guerre — {attacker['name']} vs {defender['name']}",
        color=color,
    )

    # Barres de score
    att_score = war['attacker_score']
    def_score = war['defender_score']
    total_pts = att_score + def_score
    att_pct   = int(att_score / total_pts * 100) if total_pts else 50
    def_pct   = 100 - att_pct
    width     = 10
    att_bar   = "█" * int(att_pct / 10) + "░" * (width - int(att_pct / 10))
    def_bar   = "█" * int(def_pct / 10) + "░" * (width - int(def_pct / 10))

    e.add_field(
        name=f"🏴‍☠️ {attacker['name']}",
        value=f"**{att_score}** pts\n`{att_bar}` {att_pct}%",
        inline=True,
    )
    e.add_field(name="⚔️ VS", value="──────", inline=True)
    e.add_field(
        name=f"🏴‍☠️ {defender['name']}",
        value=f"**{def_score}** pts\n`{def_bar}` {def_pct}%",
        inline=True,
    )

    # Infos
    status_map = {
        'active':    '🔴 En cours',
        'pending':   '⏳ En attente',
        'finished':  '✅ Terminée',
        'cancelled': '❌ Annulée',
    }
    total_battles = sum(int(t.get('battles', 0)) for t in top)
    e.add_field(name="💰 Prize pool",   value=f"**{fmt_berries(war['prize_pool'])} 🍊**",        inline=True)
    e.add_field(name="⚔️ Duels joués", value=f"**{total_battles}** combat(s)",                   inline=True)
    e.add_field(name="📊 Statut",       value=status_map.get(war['status'], war['status']),       inline=True)

    if war.get('ends_at'):
        e.add_field(name="⏰ Fin",    value=f"<t:{int(war['ends_at'].timestamp())}:R>",           inline=True)
    if war.get('started_at'):
        e.add_field(name="🕐 Début", value=f"<t:{int(war['started_at'].timestamp())}:D>",         inline=True)
    if war.get('declared_at'):
        e.add_field(name="📢 Déclarée", value=f"<t:{int(war['declared_at'].timestamp())}:R>",     inline=True)

    if top:
        lines = []
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
        for i, t in enumerate(top[:5]):
            medal = medals[i] if i < len(medals) else f"**{i+1}.**"
            lines.append(f"{medal} <@{t['user_id']}> — **{t['total_points']}** pts · {t['battles']} duel(s)")
        e.add_field(name="🏆 Top Contributeurs", value="\n".join(lines), inline=False)
    return e


def alliances_embed(crew: dict, alliances: list[dict], ally_crews: list[dict]) -> discord.Embed:
    e = discord.Embed(title=f"🤝 Alliances — {crew['name']}", color=0x9B59B6)
    if not alliances:
        e.description = "*Aucune alliance active.*"
        return e
    e.description = f"**{len(alliances)}** alliance(s) active(s)"
    for ally in alliances:
        other_id  = ally['crew_b_id'] if ally['crew_a_id'] == crew['id'] else ally['crew_a_id']
        other     = next((c for c in ally_crews if c['id'] == other_id), None)
        name      = other['name'] if other else f"Crew #{other_id}"
        since     = _dt(ally.get('accepted_at'))
        since_str = f"<t:{int(since.timestamp())}:D>" if since else "?"
        lvl_str   = f" · Niv.**{other['level']}**" if other else ""
        bounty    = f" · {fmt_berries(other['total_bounty'])} 🍊" if other else ""
        e.add_field(
            name=f"🏴‍☠️ {name}",
            value=f"Depuis {since_str}{lvl_str}{bounty}",
            inline=True,
        )
    return e


def history_embed(crew: dict, events: list[dict]) -> discord.Embed:
    ACTION_LABELS = {
        'joined':   '📥 a rejoint',
        'left':     '📤 a quitté',
        'kicked':   '🥾 a été expulsé',
        'betrayed': '🗡️ a trahi',
        'promoted': '⬆️ a été promu',
        'demoted':  '⬇️ a été rétrogradé',
        'war_won':  '⚔️ a remporté une guerre',
        'war_lost': '💀 a perdu une guerre',
    }
    e = discord.Embed(title=f"📜 Historique — {crew['name']}", color=CREW_COLOR)

    created = _dt(crew.get('created_at'))
    header  = f"🏴‍☠️ Fondé le <t:{int(created.timestamp())}:D>" if created else ""
    e.description = header or None

    lines = []
    for ev in events:
        label  = ACTION_LABELS.get(ev['action'], ev['action'])
        ts     = f"<t:{int(ev['created_at'].timestamp())}:R>"
        detail = f" *({ev['details']})*" if ev.get('details') else ""
        lines.append(f"{ts} <@{ev['user_id']}> {label}{detail}")

    e.add_field(
        name=f"📋 Événements récents ({len(events)})",
        value="\n".join(lines) or "*Aucun événement.*",
        inline=False,
    )
    return e


def leaderboard_embed(crews: list[dict], page: int = 1) -> discord.Embed:
    medals = ["🥇", "🥈", "🥉"] + [f"**{i}.**" for i in range(4, 21)]
    e = discord.Embed(title="🏆 Classement des Équipages", color=CREW_COLOR)
    lines = []
    for i, crew in enumerate(crews):
        rank    = medals[i] if i < len(medals) else f"{i+1}."
        recr    = "✅" if crew.get('is_recruiting') else "🔒"
        wars    = f"{crew['wars_won']}V/{crew['wars_lost']}D" if 'wars_won' in crew else ""
        wars_str = f" · {wars}" if wars else ""
        lines.append(
            f"{rank} **{crew['name']}** `[{crew['tag']}]` · "
            f"{fmt_berries(crew['total_bounty'])} 🍊 · Niv.**{crew['level']}**{wars_str} {recr}"
        )
    e.description = "\n".join(lines) or "*Aucun équipage.*"
    e.set_footer(text=f"Page {page}")
    return e
