"""
cogs/equipages.py

Forum salon "équipages" (layout Galerie média) :
- /equipage-creer   → crée un post forum avec bannière + embed
- /equipage-modifier→ MAJ tags / description d'un post existant
- /guerre-declarer  → déclare une guerre entre 2 équipages (ping + embed dans les 2 threads)
- /guerre-resultat  → enregistre le résultat (V/D, met à jour le compteur)

Le post du forum sert de fiche équipage. Pour un vrai système de stats persistant
(ligues, ELO, classement), branche sur Supabase (table `equipages` / `guerres`).
"""

import os
import re
import discord
from discord import app_commands
from discord.ext import commands

EQUIPAGES_FORUM_ID = int(os.getenv("EQUIPAGES_FORUM_ID", 0))
THEME_COLOR = 0xE63946


def find_field(embed: discord.Embed, name_starts_with: str):
    """Retourne (index, field) ou (None, None)."""
    for i, f in enumerate(embed.fields):
        if f.name.startswith(name_starts_with):
            return i, f
    return None, None


def parse_score(value: str) -> tuple[int, int]:
    """'3V - 1D' → (3, 1)."""
    m = re.match(r"(\d+)\s*V\s*-\s*(\d+)\s*D", value)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


class Equipages(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def _get_forum(self) -> discord.ForumChannel | None:
        ch = self.bot.get_channel(EQUIPAGES_FORUM_ID)
        return ch if isinstance(ch, discord.ForumChannel) else None

    # =========================================================
    # /equipage-creer
    # =========================================================
    @app_commands.command(name="equipage-creer", description="Crée un post équipage dans le forum")
    @app_commands.describe(
        nom="Nom de l'équipage",
        capitaine="Capitaine",
        description="Présentation (style, valeurs, recrutement…)",
        banniere="Image bannière (image affichée dans la galerie)",
        tags="Tags séparés par virgule (ex: Actif, En recrutement)",
        couleur="Couleur de l'embed en hex (ex: E63946) — optionnel",
    )
    async def equipage_creer(
        self,
        interaction: discord.Interaction,
        nom: str,
        capitaine: discord.Member,
        description: str,
        banniere: discord.Attachment,
        tags: str | None = None,
        couleur: str | None = None,
    ):
        forum = self._get_forum()
        if not forum:
            return await interaction.response.send_message(
                "❌ Forum équipages introuvable (vérifie `EQUIPAGES_FORUM_ID`).", ephemeral=True
            )

        if not banniere.content_type or not banniere.content_type.startswith("image/"):
            return await interaction.response.send_message(
                "❌ La bannière doit être une image.", ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        color = THEME_COLOR
        if couleur:
            try:
                color = int(couleur.lstrip("#"), 16)
            except ValueError:
                pass

        embed = discord.Embed(title=f"🏴‍☠️ {nom}", description=description, color=color)
        embed.add_field(name="⚓ Capitaine", value=capitaine.mention, inline=True)
        embed.add_field(name="👥 Membres", value="`1`", inline=True)
        embed.add_field(name="⚔️ Guerres", value="`0V - 0D`", inline=True)
        embed.set_image(url=f"attachment://{banniere.filename}")
        embed.set_footer(text=f"Fondé le {discord.utils.format_dt(interaction.created_at, 'D')}")

        applied = []
        if tags:
            wanted = {t.strip().lower() for t in tags.split(",") if t.strip()}
            for ft in forum.available_tags:
                if ft.name.lower() in wanted:
                    applied.append(ft)

        file = await banniere.to_file()
        result = await forum.create_thread(
            name=nom,
            embed=embed,
            file=file,
            applied_tags=applied or discord.utils.MISSING,
        )
        thread = result.thread

        await interaction.followup.send(
            f"✅ Équipage créé : {thread.mention}", ephemeral=True
        )

    # =========================================================
    # /equipage-modifier (édite l'embed du premier message)
    # =========================================================
    @app_commands.command(name="equipage-modifier", description="Met à jour la fiche équipage (à lancer DANS le thread)")
    @app_commands.describe(
        description="Nouvelle description (optionnel)",
        membres="Nouveau nombre de membres (optionnel)",
        tags="Nouveaux tags séparés par virgule (remplace les anciens)",
    )
    async def equipage_modifier(
        self,
        interaction: discord.Interaction,
        description: str | None = None,
        membres: int | None = None,
        tags: str | None = None,
    ):
        thread = interaction.channel
        if not isinstance(thread, discord.Thread) or thread.parent_id != EQUIPAGES_FORUM_ID:
            return await interaction.response.send_message(
                "❌ Lance cette commande dans le thread de l'équipage.", ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        starter = await thread.fetch_message(thread.id)
        if not starter.embeds:
            return await interaction.followup.send("❌ Pas d'embed à modifier.", ephemeral=True)

        embed = starter.embeds[0]
        if description:
            embed.description = description
        if membres is not None:
            idx, _ = find_field(embed, "👥 Membres")
            if idx is not None:
                embed.set_field_at(idx, name="👥 Membres", value=f"`{membres}`", inline=True)

        await starter.edit(embed=embed)

        if tags is not None:
            forum = self._get_forum()
            wanted = {t.strip().lower() for t in tags.split(",") if t.strip()}
            new_tags = [ft for ft in forum.available_tags if ft.name.lower() in wanted]
            await thread.edit(applied_tags=new_tags)

        await interaction.followup.send("✅ Fiche mise à jour.", ephemeral=True)

    # =========================================================
    # /guerre-declarer
    # =========================================================
    @app_commands.command(name="guerre-declarer", description="Déclare une guerre entre 2 équipages")
    @app_commands.describe(
        equipage_adverse="Thread de l'équipage adverse",
        motif="Raison de la guerre",
        date="Quand ? (ex: samedi 22h)",
    )
    async def guerre_declarer(
        self,
        interaction: discord.Interaction,
        equipage_adverse: discord.Thread,
        motif: str,
        date: str,
    ):
        thread = interaction.channel
        if not isinstance(thread, discord.Thread) or thread.parent_id != EQUIPAGES_FORUM_ID:
            return await interaction.response.send_message(
                "❌ Lance ça depuis le thread de TON équipage.", ephemeral=True
            )
        if equipage_adverse.parent_id != EQUIPAGES_FORUM_ID:
            return await interaction.response.send_message(
                "❌ L'adversaire doit être un thread du forum équipages.", ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        embed = discord.Embed(
            title="⚔️ DÉCLARATION DE GUERRE",
            description=(
                f"**{thread.name}** déclare la guerre à **{equipage_adverse.name}** !\n\n"
                f"📜 **Motif** : {motif}\n"
                f"📅 **Date** : {date}\n\n"
                f"Que le meilleur équipage gagne. 🏴‍☠️"
            ),
            color=0xC1121F,
        )
        embed.set_footer(text=f"Déclaré par {interaction.user.display_name}")

        forum = self._get_forum()
        war_tag = next((t for t in forum.available_tags if t.name.lower() == "en guerre"), None)

        for t in (thread, equipage_adverse):
            await t.send(embed=embed)
            if war_tag and war_tag not in t.applied_tags:
                await t.edit(applied_tags=[*t.applied_tags, war_tag])

        await interaction.followup.send("⚔️ Guerre déclarée dans les 2 threads.", ephemeral=True)

    # =========================================================
    # /guerre-resultat
    # =========================================================
    @app_commands.command(name="guerre-resultat", description="Enregistre le résultat d'une guerre (lance-la dans le thread vainqueur)")
    @app_commands.describe(
        adversaire="Thread de l'équipage perdant",
        score="Score final (ex: 5-3)",
    )
    async def guerre_resultat(
        self,
        interaction: discord.Interaction,
        adversaire: discord.Thread,
        score: str,
    ):
        winner = interaction.channel
        if not isinstance(winner, discord.Thread) or winner.parent_id != EQUIPAGES_FORUM_ID:
            return await interaction.response.send_message(
                "❌ Lance ça depuis le thread du VAINQUEUR.", ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        async def bump(thread: discord.Thread, won: bool):
            starter = await thread.fetch_message(thread.id)
            if not starter.embeds:
                return
            embed = starter.embeds[0]
            idx, field = find_field(embed, "⚔️ Guerres")
            if idx is None:
                return
            v, d = parse_score(field.value)
            if won:
                v += 1
            else:
                d += 1
            embed.set_field_at(idx, name="⚔️ Guerres", value=f"`{v}V - {d}D`", inline=True)
            await starter.edit(embed=embed)

        await bump(winner, won=True)
        await bump(adversaire, won=False)

        embed = discord.Embed(
            title="🏆 Résultat de guerre",
            description=(
                f"**Vainqueur** : {winner.name}\n"
                f"**Perdant** : {adversaire.name}\n"
                f"**Score** : `{score}`"
            ),
            color=0xFFD60A,
        )
        embed.set_footer(text=f"Validé par {interaction.user.display_name}")

        forum = self._get_forum()
        for t in (winner, adversaire):
            await t.send(embed=embed)
            new_tags = [tag for tag in t.applied_tags if tag.name.lower() != "en guerre"]
            if len(new_tags) != len(t.applied_tags):
                await t.edit(applied_tags=new_tags)

        await interaction.followup.send("✅ Résultat enregistré, compteurs MAJ.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Equipages(bot))
