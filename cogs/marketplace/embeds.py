import discord
from datetime import datetime, timezone
from .constants import CATEGORY_BY_ID, COLOR_ACTIVE, COLOR_SOLD, COLOR_RESERVED, COLOR_PROFILE, LISTINGS_PER_PAGE


def _fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def _stars(avg) -> str:
    if avg is None:
        return "Aucune note"
    full  = int(avg)
    half  = 1 if (avg - full) >= 0.5 else 0
    empty = 5 - full - half
    return "⭐" * full + "✨" * half + "☆" * empty + f"  **{avg}/5**"


def listing_embed(listing: dict, seller_name: str) -> discord.Embed:
    cat  = CATEGORY_BY_ID.get(listing["category"], {"emoji": "📦", "name": listing["category"]})
    color = COLOR_ACTIVE if listing["status"] == "active" else \
            COLOR_RESERVED if listing["status"] == "reserved" else COLOR_SOLD

    embed = discord.Embed(
        title=f"{cat['emoji']}  {listing['title']}",
        description=listing["description"],
        color=color,
    )
    embed.add_field(name="💰 Prix",      value=f"**{_fmt(listing['price'])} 🍊**", inline=True)
    embed.add_field(name="🏷️ Catégorie", value=f"{cat['emoji']} {cat['name']}",   inline=True)
    embed.add_field(name="👤 Vendeur",   value=f"<@{listing['seller_id']}>",       inline=True)

    status_label = {
        "active":   "🟢 Disponible",
        "reserved": "🟠 Réservé",
        "sold":     "🔴 Vendu",
        "removed":  "⚫ Retiré",
    }.get(listing["status"], listing["status"])
    embed.add_field(name="📊 Statut",    value=status_label,                        inline=True)
    embed.add_field(name="👁️ Vues",      value=str(listing.get("views", 0)),         inline=True)

    ts = listing.get("created_at")
    if ts:
        embed.add_field(name="📅 Publié", value=f"<t:{int(ts.timestamp())}:R>", inline=True)

    if listing.get("image_url"):
        embed.set_image(url=listing["image_url"])

    embed.set_footer(text=f"🏪 #{listing['id']} • Brams Marketplace")
    return embed


def listings_page_embed(listings: list, page: int, total: int,
                         category_filter=None, search=None) -> discord.Embed:
    pages = max(1, -(-total // LISTINGS_PER_PAGE))
    title = "🏪  Brams Marketplace"
    if category_filter:
        cat = CATEGORY_BY_ID.get(category_filter, {})
        title += f"  —  {cat.get('emoji','')} {cat.get('name', category_filter)}"

    embed = discord.Embed(title=title, color=COLOR_ACTIVE)

    if not listings:
        embed.description = "*Aucune annonce trouvée.*"
    else:
        for l in listings:
            cat = CATEGORY_BY_ID.get(l["category"], {"emoji": "📦", "name": l["category"]})
            embed.add_field(
                name=f"{cat['emoji']} {l['title'][:50]}  —  {_fmt(l['price'])} 🍊",
                value=(
                    f"Vendeur : <@{l['seller_id']}> • "
                    f"<t:{int(l['created_at'].timestamp())}:R>\n"
                    f"ID : **#{l['id']}**"
                ),
                inline=False,
            )

    embed.set_footer(text=f"Page {page}/{pages}  •  {total} annonce(s) active(s)")
    if search:
        embed.set_footer(text=embed.footer.text + f"  •  Recherche : « {search} »")
    return embed


def my_listings_embed(listings: list) -> discord.Embed:
    embed = discord.Embed(title="📋  Mes annonces", color=COLOR_ACTIVE)
    if not listings:
        embed.description = "*Tu n'as aucune annonce.*"
        return embed
    for l in listings:
        cat = CATEGORY_BY_ID.get(l["category"], {"emoji": "📦", "name": l["category"]})
        status_icon = {"active": "🟢", "reserved": "🟠", "sold": "🔴", "removed": "⚫"}.get(l["status"], "❓")
        embed.add_field(
            name=f"{status_icon} {cat['emoji']} {l['title'][:50]}  —  {_fmt(l['price'])} 🍊",
            value=f"ID **#{l['id']}** • {l['status']} • {l.get('views',0)} vue(s)",
            inline=False,
        )
    return embed


def seller_profile_embed(stats: dict, member: discord.Member) -> discord.Embed:
    embed = discord.Embed(
        title=f"🏴‍☠️  Profil vendeur — {member.display_name}",
        color=COLOR_PROFILE,
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.add_field(name="✅ Ventes",         value=str(stats["total_sales"]),         inline=True)
    embed.add_field(name="⭐ Note",           value=_stars(stats["avg_score"]),        inline=True)
    embed.add_field(name="📊 Avis",           value=str(stats["rating_count"]),        inline=True)
    embed.add_field(name="🟢 Annonces actives", value=str(stats["active_listings"]),   inline=True)

    if stats["comments"]:
        lines = []
        for c in stats["comments"]:
            stars = "⭐" * c["score"]
            txt   = c["comment"] or "*Sans commentaire*"
            lines.append(f"{stars}  {txt[:80]}")
        embed.add_field(name="💬 Derniers avis", value="\n".join(lines), inline=False)
    return embed


def favorites_embed(listings: list, page: int, total: int) -> discord.Embed:
    pages = max(1, -(-total // LISTINGS_PER_PAGE))
    embed = discord.Embed(title="❤️  Mes favoris", color=COLOR_ACTIVE)
    if not listings:
        embed.description = "*Aucun favori actif.*"
    else:
        for l in listings:
            cat = CATEGORY_BY_ID.get(l["category"], {"emoji": "📦"})
            embed.add_field(
                name=f"{cat['emoji']} {l['title'][:50]}  —  {_fmt(l['price'])} 🍊",
                value=f"<@{l['seller_id']}> • ID **#{l['id']}**",
                inline=False,
            )
    embed.set_footer(text=f"Page {page}/{pages}  •  {total} favori(s)")
    return embed
