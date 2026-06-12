# -*- coding: utf-8 -*-
"""Splice ponctuel : restyle l'embed de /serveur (lignes 4115-4167) au format /stats."""
from pathlib import Path

p = Path(__file__).parent / 'bot.py'
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

# Garde-fous : on vérifie les ancres avant de couper.
assert 'salon_lines.append' in lines[4114], lines[4114]
assert 'embeds=[embed1, embed2]' in lines[4164], lines[4164]
assert ')' in lines[4166]

new_block = '''        salon_lines.append(f"{medals[i]} **{name}**\\n     `{format_duration(secs)}`")

    peak_hour = max(hour_usage, key=hour_usage.get) if hour_usage else 0

    rank_lines = "\\n".join(
        f"{RANK_EMOJIS.get(r, '🎖️')} {r} : `{c}`"
        for r, c in sorted(rank_counts.items(), key=lambda x: x[1], reverse=True)
    ) or "*Aucun*"

    graph_buf = make_peak_hours_graph(hour_usage)

    # Même habillage que /stats : un seul embed, sections ━━━, valeurs en backticks.
    embed = discord.Embed(
        title=f"🌐 {guild.name.upper()}",
        description=(
            f"\\u3000⚓ *Vue d'ensemble du serveur*\\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\\n"
            f"👥 **Membres actifs (7j)** : `{membres_actifs}`\\n"
            f"🎙️ **En vocal maintenant** : `{en_vocal_now}`\\n"
            f"🕐 **Heure de pointe** : `{peak_hour}h - {peak_hour+1}h UTC`\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\\n"
            f"🎙️ **TEMPS VOCAL**\\n"
            f"7 jours : `{format_duration(total_vocal_7d)}`\\n"
            f"Total : `{format_duration(total_vocal_all)}`\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\\n"
            f"💬 **MESSAGES**\\n"
            f"7 jours : `{total_msg_7d}`\\n"
            f"Total : `{total_msg_all}`\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\\n"
            f"🎖️ **RÉPARTITION DES RANGS**\\n"
            f"{rank_lines}\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\\n"
            f"🔊 **TOP SALONS (7j)**\\n"
            + ("\\n\\n".join(salon_lines) if salon_lines else "*Aucune donnée*")
        ),
        color=discord.Color.from_rgb(212, 175, 55)
    )
    if guild.icon:
        embed.set_thumbnail(url=guild.icon.url)
    embed.set_image(url="attachment://peaks.png")
    embed.set_footer(text=f"⚓ BRAMS SCORE BY FREYDISS • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "peaks.png"))
'''

out = lines[:4114] + [new_block] + lines[4167:]
p.write_text(''.join(out), encoding='utf-8')
print('OK - /serveur restyle, lignes', 4115, '-', 4167, 'remplacees')
