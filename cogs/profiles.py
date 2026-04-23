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
_RANK_THRESHOLDS = {
    "Roi des pirates": 150, "Yonkou": 70, "Amiral": 40, "Shichibukai": 25, "Pirate": 10,
}

# ══════════════════════════════════════════════════════════════════
#  MODALS
# ══════════════════════════════════════════════════════════════════

class ModalBio(discord.ui.Modal, title="📝 Ta bio"):
    bio = discord.ui.TextInput(label="Bio", style=discord.TextStyle.paragraph,
                               max_length=200, required=False)

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing and existing["bio"]:
            self.bio.default = existing["bio"]

    async def on_submit(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            await c.execute(
                "UPDATE profiles SET bio=$1 WHERE user_id=$2",
                self.bio.value or None, str(i.user.id)
            )
        await i.response.send_message("✅ Bio mise à jour !", ephemeral=True)


class ModalAnime(discord.ui.Modal, title="🎌 Top Anime"):
    top_anime = discord.ui.TextInput(
        label="Top Anime (séparés par virgule)", max_length=120, required=False,
        placeholder="One Piece, Dragon Ball, Demon Slayer",
    )

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing and existing["top_anime"]:
            self.top_anime.default = existing["top_anime"]

    async def on_submit(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            await c.execute(
                "UPDATE profiles SET top_anime=$1 WHERE user_id=$2",
                self.top_anime.value or None, str(i.user.id)
            )
        await i.response.send_message("✅ Top anime mis à jour !", ephemeral=True)


class ModalWaifu(discord.ui.Modal, title="❤️ Waifu / Husbando"):
    waifu = discord.ui.TextInput(
        label="Waifu ou Husbando", max_length=80, required=False,
        placeholder="Nami, Zoro...",
    )

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing and existing["waifu_husbando"]:
            self.waifu.default = existing["waifu_husbando"]

    async def on_submit(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            await c.execute(
                "UPDATE profiles SET waifu_husbando=$1 WHERE user_id=$2",
                self.waifu.value or None, str(i.user.id)
            )
        await i.response.send_message("✅ Waifu / Husbando mis à jour !", ephemeral=True)


class ModalPays(discord.ui.Modal, title="🌍 Pays / Région"):
    pays = discord.ui.TextInput(
        label="Pays ou région", max_length=60, required=False,
        placeholder="France, Maroc, Belgique...",
    )

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing and existing["pays"]:
            self.pays.default = existing["pays"]

    async def on_submit(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            await c.execute(
                "UPDATE profiles SET pays=$1 WHERE user_id=$2",
                self.pays.value or None, str(i.user.id)
            )
        await i.response.send_message("✅ Pays mis à jour !", ephemeral=True)


class ModalImageURL(discord.ui.Modal, title="🖼️ Image personnalisée"):
    url = discord.ui.TextInput(
        label="URL de l'image (PNG/JPG)", max_length=300, required=False,
        placeholder="https://exemple.com/image.png",
    )

    def __init__(self, pool, existing):
        super().__init__()
        self.pool = pool
        if existing and existing["custom_image"]:
            self.url.default = existing["custom_image"]

    async def on_submit(self, i: discord.Interaction):
        val = self.url.value.strip() or None
        async with self.pool.acquire() as c:
            await c.execute(
                "UPDATE profiles SET custom_image=$1 WHERE user_id=$2",
                val, str(i.user.id)
            )
        await i.response.send_message("✅ Image mise à jour !", ephemeral=True)


# ══════════════════════════════════════════════════════════════════
#  VUE /modifprofil
# ══════════════════════════════════════════════════════════════════

class ModifView(discord.ui.View):
    def __init__(self, pool, existing):
        super().__init__(timeout=120)
        self.pool     = pool
        self.existing = existing

    @discord.ui.button(label="📝 Bio",             style=discord.ButtonStyle.secondary, row=0)
    async def btn_bio(self, i: discord.Interaction, _):
        await i.response.send_modal(ModalBio(self.pool, self.existing))

    @discord.ui.button(label="🎌 Top Anime",       style=discord.ButtonStyle.secondary, row=0)
    async def btn_anime(self, i: discord.Interaction, _):
        await i.response.send_modal(ModalAnime(self.pool, self.existing))

    @discord.ui.button(label="❤️ Waifu/Husbando", style=discord.ButtonStyle.secondary, row=1)
    async def btn_waifu(self, i: discord.Interaction, _):
        await i.response.send_modal(ModalWaifu(self.pool, self.existing))

    @discord.ui.button(label="🌍 Pays",            style=discord.ButtonStyle.secondary, row=1)
    async def btn_pays(self, i: discord.Interaction, _):
        await i.response.send_modal(ModalPays(self.pool, self.existing))

    @discord.ui.button(label="🖼️ Image URL",       style=discord.ButtonStyle.secondary, row=2)
    async def btn_img_url(self, i: discord.Interaction, _):
        await i.response.send_modal(ModalImageURL(self.pool, self.existing))

    @discord.ui.button(label="✅ Terminer",         style=discord.ButtonStyle.success,   row=2)
    async def btn_done(self, i: discord.Interaction, _):
        for child in self.children:
            child.disabled = True
        await i.response.edit_message(
            content="**Profil sauvegardé !** Utilise `/monprofil` pour voir le résultat.",
            embed=None, view=self,
        )
        self.stop()


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

    # Rang le plus haut parmi les rôles du membre
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
    embed.add_field(name="⚓ Rang",            value=f"{emoji} **{rank_label}**", inline=True)
    embed.add_field(name="📅 Membre depuis",   value=joined,                      inline=True)

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

    # ── /monprofil ───────────────────────────────────────────────
    @app_commands.command(name="monprofil", description="Afficher ton profil")
    async def monprofil(self, i: discord.Interaction):
        embed = await _build_profile_embed(i.user, self.pool, i.guild, public=False)
        await i.response.send_message(embed=embed, ephemeral=True)

    # ── /info @membre ────────────────────────────────────────────
    @app_commands.command(name="info", description="Voir le profil d'un membre")
    @app_commands.describe(membre="Le membre à afficher")
    async def info(self, i: discord.Interaction, membre: discord.Member):
        embed = await _build_profile_embed(membre, self.pool, i.guild, public=True)
        await i.response.send_message(embed=embed)

    # ── /modifprofil ─────────────────────────────────────────────
    @app_commands.command(name="modifprofil", description="Modifier ton profil")
    async def modifprofil(self, i: discord.Interaction):
        async with self.pool.acquire() as c:
            await c.execute(
                "INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
                str(i.user.id)
            )
            existing = await c.fetchrow(
                "SELECT * FROM profiles WHERE user_id=$1", str(i.user.id)
            )

        lines = [
            f"📝 Bio : {existing['bio'] or '*vide*'}",
            f"🎌 Anime : {existing['top_anime'] or '*vide*'}",
            f"❤️ Waifu : {existing['waifu_husbando'] or '*vide*'}",
            f"🌍 Pays : {existing['pays'] or '*vide*'}",
            f"🖼️ Image : {'✅ définie' if existing['custom_image'] else '*vide*'}",
        ]
        embed = discord.Embed(
            title="✏️ Modifier mon profil",
            description=(
                "Clique sur un bouton pour modifier ce champ.\n"
                "Chaque modification est sauvegardée **immédiatement**."
            ),
            color=COLOR_MAIN,
        )
        embed.add_field(name="Valeurs actuelles", value="\n".join(lines), inline=False)

        await i.response.send_message(embed=embed, view=ModifView(self.pool, existing), ephemeral=True)

    # ── /setimage — upload direct ─────────────────────────────────
    @app_commands.command(name="setimage", description="Définir une image perso pour ton profil (upload direct)")
    @app_commands.describe(image="Image PNG ou JPG à uploader")
    async def setimage(self, i: discord.Interaction, image: discord.Attachment):
        if not image.content_type or not image.content_type.startswith("image/"):
            await i.response.send_message("❌ Le fichier doit être une image (PNG/JPG).", ephemeral=True)
            return
        async with self.pool.acquire() as c:
            await c.execute(
                """INSERT INTO profiles (user_id, custom_image) VALUES ($1, $2)
                   ON CONFLICT (user_id) DO UPDATE SET custom_image = EXCLUDED.custom_image""",
                str(i.user.id), image.url,
            )
        embed = discord.Embed(title="✅ Image mise à jour !", color=COLOR_OK)
        embed.set_thumbnail(url=image.url)
        await i.response.send_message(embed=embed, ephemeral=True)

    # ── on_member_join ────────────────────────────────────────────
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
