import random
import discord
from .constants import CREW_LEVELS, POSITIONS


def has_perm(position: str, perm: str) -> bool:
    if position == 'capitaine':
        return True
    return perm in POSITIONS.get(position, {}).get('permissions', [])


def get_level_data(level: int) -> dict:
    return CREW_LEVELS.get(level, CREW_LEVELS[10])


def can_feature(level: int, feature: str) -> bool:
    return feature in get_level_data(level).get('features', [])


def xp_for_next(level: int) -> int | None:
    if level >= 10:
        return None
    return CREW_LEVELS[level + 1]['xp_required']


def fmt_berries(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def random_role_color() -> discord.Color:
    return discord.Color(random.randint(0x100000, 0xFFFFFF))


async def award_xp(bot, crew_id: int, xp: int) -> tuple[int, bool]:
    """Ajoute xp au crew (1 transaction DB). Retourne (new_xp, leveled_up)."""
    from . import database as db
    new_xp, _, leveled = await db.award_xp_and_level(crew_id, xp)
    return new_xp, leveled


async def create_crew_channels(guild: discord.Guild, name: str, tag: str,
                                role: discord.Role, parent_id: int | None
                                ) -> tuple[int, int, int]:
    """Crée catégorie + salon texte. Retourne (category_id, channel_id, 0)."""
    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        role:               discord.PermissionOverwrite(view_channel=True, send_messages=True, connect=True),
        guild.me:           discord.PermissionOverwrite(view_channel=True, manage_channels=True),
    }
    parent = guild.get_channel(parent_id) if parent_id else None
    cat = await guild.create_category(
        f"🏴‍☠️ {name}",
        overwrites=overwrites,
        position=100,
    )
    txt = await guild.create_text_channel("📜︱pont", category=cat, overwrites=overwrites)
    return cat.id, txt.id, 0


async def delete_crew_channels(guild: discord.Guild, category_id: int | None,
                                channel_id: int | None, role_id: int | None):
    if category_id:
        cat = guild.get_channel(category_id)
        if cat:
            for ch in cat.channels:
                try:
                    await ch.delete(reason="Crew dissous")
                except Exception:
                    pass
            try:
                await cat.delete(reason="Crew dissous")
            except Exception:
                pass
    if role_id:
        role = guild.get_role(role_id)
        if role:
            try:
                await role.delete(reason="Crew dissous")
            except Exception:
                pass


async def assign_role(guild: discord.Guild, user_id: int, role_id: int):
    member = guild.get_member(user_id)
    role   = guild.get_role(role_id)
    if member and role and role not in member.roles:
        try:
            await member.add_roles(role, reason="Crew rejoint")
        except Exception:
            pass


async def remove_role(guild: discord.Guild, user_id: int, role_id: int):
    member = guild.get_member(user_id)
    role   = guild.get_role(role_id)
    if member and role and role in member.roles:
        try:
            await member.remove_roles(role, reason="Crew quitté")
        except Exception:
            pass
