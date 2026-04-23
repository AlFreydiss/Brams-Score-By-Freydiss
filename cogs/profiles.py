from __future__ import annotations

import discord
from discord.ext import commands
from discord import app_commands

COLOR_MAIN = 0xFFD700
COLOR_OK   = 0x1D9E75

FLAGS = {
    "France": "🇫🇷", "Belgique": "🇧🇪", "Suisse": "🇨🇭", "Canada": "🇨🇦",
    "Maroc": "🇲🇦", "Algérie": "🇩🇿", "Tunisie": "🇹🇳", "USA": "🇺🇸", "Autre": "🌍",
}
_RANK_ORDER  = ["Roi des pirates", "Yonkou", "Amiral", "Shichibukai", "Pirate"]
_RANK_EMOJIS = {
    "Pirate": "🏴‍☠️", "Shichibukai": "⚔️", "Amiral": "🪖",
    "Yonkou": "👑", "Roi des pirates": "🤴",
}


# ══════════════════════════════════════════════════════════════════
#  MODAL UNIQUE — /modifprofil
# ══════════════════════════════════════════════════════════════════

class ModifModal(discord.ui.Modal, title="✏️ Mon profil"):
    pays = discord.ui.TextInput(
        label="🌍 Pays / Région",
        placeholder="France, Maroc, Belgique...",
        required=False,
        max_length=60,
    )
    top_anime = discord.ui.TextInput(
        label="🎌 Top Anime (séparés par virgule)",
        placeholder="One Piece, Naruto, Demon Slayer...",
        required=False,
        max_length=120,
    )
    waifu_husbando = discord.ui.TextInput(
        label="❤️ Waifu / Husbando",
        placeholder="Nami, Zoro...",
        required=False,
        max_length=80,
    )
    bio = discord.ui.TextInput(
        label="📝 Bio",
        placeholder="Présente-toi en quelques mots...",
        required=False,
        max_length=200,
        style=discord.TextStyle.paragraph,
    )
    custom_image = discord.ui.TextInput(
        label="🖼️ Image perso (URL ou laisse vide)",
        placeholder="https://exemple.com/image.png",
        required=False,
        max_length=300,
    )

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing:
            self.pays.default          = existing["pays"]          or ""
            self.top_anime.default     = existing["top_anime"]     or ""
            self.waifu_husbando.default= existing["waifu_husbando"]or ""
            self.bio.default           = existing["bio"]           or ""
            self.custom_image.default  = existing["custom_image"]  or ""

    async def on_submit(self, i: discord.Interaction):
        img = self.custom_image.value.strip() or None
        async with self.pool.acquire() as c:
            await c.execute(
                """INSERT INTO profiles (user_id, pays, top_anime, waifu_husbando, bio, custom_image)
                   VALUES ($1,$2,$3,$4,$5,$6)
                   ON CONFLICT (user_id) DO UPDATE SET
                       pays           = EXCLUDED.pays,
                       top_anime      = EXCLUDED.top_anime,
                       waifu_husbando = EXCLUDED.waifu_husbando,
                       bio            = EXCLUDED.bio,
                       custom_image   = EXCLUDED.custom_image""",
                str(i.user.id),
                self.pays.value.strip() or None,
                self.top_anime.value.strip() or None,
                self.waifu_husbando.value.strip() or None,
                self.bio.value.strip() or None,
                img,
            )
        await i.response.send_message("✅ Profil mis à jour ! Utilise `/monprofil` pour voir le résultat.", ephemeral=True)


# ══════════════════════════════════════════════════════════════════
#  HELPER : BUILD EMBED
# ══════════════════════════════════════════════════════════════════

async def _build_profile_embed(
    member: discord.Member,
    pool,
    guild: discord.Guild,
    public: bool = False,
) -> discord.Embed:
    async with pool.acquire() as c:
        row = await c.fetchrow("SELECT * FROM profiles WHERE user_id=$1", str(member.id))

    rank = None
    for r in _RANK_ORDER:
        if any(role.name == r for role in member.roles):
            rank = r
            break
    emoji = _RANK_EMOJIS.get(rank, "🏴‍☠️") if rank else "🏴‍☠️"
    rank_label = rank or "Aucun rang"

    embed = discord.Embed(title=f"{emoji}  {member.display_name}", color=COLOR_MAIN)

    if row and row["custom_image"]:
        embed.set_thumbnail(url=row["custom_image"])
    else:
        embed.set_thumbnail(url=member.display_avatar.url)

    joined = member.joined_at.strftime("%d/%m/%Y") if member.joined_at else "?"
    embed.add_field(name="⚓ Rang",          value=f"{emoji} **{rank_label}**", inline=True)
    embed.add_field(name="📅 Membre depuis", value=joined,                      inline=True)

    if row:
        if row["pays"]:
            flag = FLAGS.get(row["pays"].strip(), "🌍")
            embed.add_field(name="🌍 Pays", value=f"{flag} {row['pays']}", inline=True)

        if row["top_anime"]:
            animes = [a.strip() for a in row["top_anime"].split(",") if a.strip()]
            embed.add_field(name="🎌 Top Anime",
                            value="\n".join(f"• {a}" for a in animes), inline=False)

        if row["waifu_husbando"]:
            embed.add_field(name="❤️ Waifu / Husbando", value=row["waifu_husbando"], inline=True)

        if row["bio"]:
            embed.add_field(name="📝 Bio", value=f"*{row['bio']}*", inline=False)

        if not public and not row["top_anime"] and not row["bio"]:
            embed.add_field(
                name="📋 Profil incomplet",
                value="Utilise `/modifprofil` pour compléter ton profil !",
                inline=False,
            )
    else:
        embed.add_field(
            name="📋 Profil vide",
            value="Utilise `/modifprofil` pour remplir ton profil !",
            inline=False,
        )

    icon = guild.icon.url if guild.icon else None
    embed.set_footer(text="Brams Community • Anime & Manga", icon_url=icon)
    return embed


# ══════════════════════════════════════════════════════════════════
#  COG
# ══════════════════════════════════════════════════════════════════

class Profile(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot  = bot
        self.pool = bot.pg_pool

    @app_commands.command(name="monprofil", description="Afficher ton profil")
    async def monprofil(self, i: discord.Interaction):
        embed = await _build_profile_embed(i.user, self.pool, i.guild, public=False)
        await i.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="info", description="Voir le profil d'un membre")
    @app_commands.describe(membre="Le membre à afficher")
    async def info(self, i: discord.Interaction, membre: discord.Member):
        embed = await _build_profile_embed(membre, self.pool, i.guild, public=True)
        await i.response.send_message(embed=embed)

    @app_commands.command(name="modifprofil", description="Modifier ton profil")
    async def modifprofil(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            existing = await c.fetchrow(
                "SELECT * FROM profiles WHERE user_id=$1", str(i.user.id)
            )
        await i.response.send_modal(ModifModal(self.pool, existing))

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return
        channel = member.guild.system_channel
        if channel is None:
            return

        ranks_desc = "\n".join([
            "🏴‍☠️ **Pirate** — 10h vocales / semaine",
            "⚔️ **Shichibukai** — 25h vocales / semaine",
            "🪖 **Amiral** — 40h vocales / semaine",
            "👑 **Yonkou** — 70h vocales / semaine",
            "🤴 **Roi des pirates** — 150h vocales / semaine",
        ])

        embed = discord.Embed(
            title=f"Bienvenue sur Brams Community, {member.display_name} !",
            description=(
                f"Heureux de t'accueillir, {member.mention} !\n\n"
                "Ce serveur est dédié aux **animés et mangas** et à la communauté Brams. "
                "Plus tu passes de temps en vocal, plus tu gravis les rangs !\n\n"
                f"**Système de rangs (heures vocales / 7 jours) :**\n{ranks_desc}\n\n"
                "**Commandes utiles :**\n"
                "`/monprofil` — Voir ton profil\n"
                "`/modifprofil` — Personnaliser ton profil\n"
                "`/stats` — Tes statistiques vocales\n"
                "`/quizz` — Quiz animé"
            ),
            color=discord.Color.from_rgb(255, 215, 0),
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        icon = member.guild.icon.url if member.guild.icon else None
        embed.set_footer(text="Brams Community • Anime & Manga", icon_url=icon)

        try:
            await channel.send(embed=embed)
        except discord.Forbidden:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Profile(bot))
