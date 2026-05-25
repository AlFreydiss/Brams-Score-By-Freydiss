import discord

from config import RANKS, RANK_EMOJIS, ANNOUNCE_CHANNEL
from storage import load_data, save_data, get_user
from utils import now_ts, get_rank_for_hours, get_current_rank_threshold


async def update_rank(
    member: discord.Member,
    hours_7d: float,
    announce: bool = True,
    data: dict | None = None,
) -> None:
    _own_data = data is None
    if _own_data:
        data = await load_data()

    uid = str(member.id)
    user = get_user(data, uid)
    guild = member.guild
    rank_names = {r for _, r in RANKS}

    roles_to_remove = [r for r in member.roles if r.name in rank_names]
    if roles_to_remove:
        await member.remove_roles(*roles_to_remove)

    new_rank = get_rank_for_hours(hours_7d)
    old_rank = user.get("last_rank")

    if new_rank:
        role = discord.utils.get(guild.roles, name=new_rank)
        if role:
            await member.add_roles(role)

    if announce and new_rank and new_rank != old_rank:
        rank_order = {r: i for i, (_, r) in enumerate(reversed(RANKS))}
        if rank_order.get(new_rank, -1) > rank_order.get(old_rank, -1):
            channel = discord.utils.get(guild.text_channels, name=ANNOUNCE_CHANNEL)
            if channel:
                emoji = RANK_EMOJIS.get(new_rank, "🎖️")
                embed = discord.Embed(
                    title=f"{emoji} Nouveau rank débloqué !",
                    description=(
                        f"**{member.display_name}** vient d'atteindre le rang "
                        f"**{new_rank}** avec **{hours_7d:.1f}h** de vocal cette semaine !"
                    ),
                    color=discord.Color.gold(),
                )
                embed.set_thumbnail(url=member.display_avatar.url)
                await channel.send(content=member.mention, embed=embed)

    user["last_rank"] = new_rank
    if _own_data:
        await save_data(data)


async def check_alert(
    member: discord.Member,
    hours_7d: float,
    data: dict | None = None,
) -> None:
    _own_data = data is None
    if _own_data:
        data = await load_data()

    uid = str(member.id)
    user = get_user(data, uid)

    threshold, current_rank = get_current_rank_threshold(hours_7d)
    if current_rank is None:
        user["alerted"] = False
        if _own_data:
            await save_data(data)
        return

    cutoff_7d = now_ts() - 7 * 86400
    expiring_soon = sum(
        s["end"] - max(s["start"], cutoff_7d)
        for s in user.get("vocal_sessions", [])
        if cutoff_7d <= s["end"] <= cutoff_7d + 86400
    )
    hours_expiring = expiring_soon / 3600
    will_lose_rank = (hours_7d - hours_expiring) < threshold
    already_alerted = user.get("alerted", False)

    if will_lose_rank and not already_alerted:
        user["alerted"] = True
        if _own_data:
            await save_data(data)
        try:
            embed = discord.Embed(
                title="⚠️ Tu vas perdre ton rank !",
                description=(
                    f"Attention **{member.display_name}** !\n\n"
                    f"Tu risques de perdre ton rang **{current_rank}** dans les prochaines 24h.\n"
                    f"Il te faut encore **{hours_expiring:.1f}h** de vocal pour le garder !\n\n"
                    f"Connecte-toi vite sur le serveur 🎙️"
                ),
                color=discord.Color.red(),
            )
            await member.send(embed=embed)
        except discord.Forbidden:
            pass
    elif not will_lose_rank:
        user["alerted"] = False
        if _own_data:
            await save_data(data)
