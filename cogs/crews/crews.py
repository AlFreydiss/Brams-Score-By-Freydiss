import os
import re
import asyncio
from datetime import datetime, timezone, timedelta

import discord
from discord import app_commands
from discord.ext import commands, tasks

from . import database as db
from .constants import (
    POSITIONS, CREW_LEVELS, COST_CREATE, COST_RENAME, MIN_WAR_BET,
    RENAME_COOLDOWN_DAYS, CREATE_COOLDOWN_DAYS, FLAG_MAX_BYTES,
    MIN_TAG_LEN, MAX_TAG_LEN, MIN_NAME_LEN, MAX_NAME_LEN,
    MIN_WAR_HOURS, MAX_WAR_HOURS, XP_DUEL_WIN, DISSOLVE_REFUND,
    POSITION_CHOICES, CREW_COLOR,
)
from .utils import (
    has_perm, can_feature, fmt_berries, random_role_color,
    award_xp, create_crew_channels, delete_crew_channels,
    assign_role, remove_role, get_level_data,
)
from .embeds import (
    crew_info_embed, crew_level_embed, treasury_embed,
    applications_embed, war_status_embed, alliances_embed,
    history_embed, leaderboard_embed,
)
from .views import (
    CreerCrewModal, RenommerModal, CandidatureModal, RetraitModal,
    ConfirmView, ApplicationsView, CrewListView,
    AllianceResponseView, WarResponseView,
)
from .tasks import CrewTasks

GUILD_IDS   = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]
ANNOUNCE_CH = int(os.environ.get("CREWS_ANNOUNCEMENT_CHANNEL_ID", "0"))
LOGS_CH     = int(os.environ.get("CREWS_LOGS_CHANNEL_ID", "0"))
PARENT_CAT  = int(os.environ.get("CREWS_CATEGORY_PARENT_ID", "0")) or None


class CrewCog(CrewTasks, commands.Cog):
    crew = app_commands.Group(name="equipage", description="🏴‍☠️ Système d'équipages", guild_ids=GUILD_IDS,
                              default_permissions=discord.Permissions(administrator=True))

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        self._daily_bounty_recalc.start()
        self._war_expire_check.start()
        self._weekly_leaderboard.start()
        print("[CREWS] Cog chargé ✅")

    async def cog_unload(self):
        self._daily_bounty_recalc.cancel()
        self._war_expire_check.cancel()
        self._weekly_leaderboard.cancel()

    # ── Helpers ───────────────────────────────────────────────────

    async def _get_user_crew(self, user_id: int):
        return await db.get_member_and_crew(user_id)

    async def _log_staff(self, title: str, description: str, color: int = CREW_COLOR):
        ch = self.bot.get_channel(LOGS_CH)
        if ch:
            try:
                await ch.send(embed=discord.Embed(title=title, description=description, color=color))
            except Exception:
                pass

    # ══════════════════════════════════════════════════════════════
    # COMMANDES PUBLIQUES
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="info", description="Tableau de bord complet de l'équipage")
    @app_commands.describe(nom="Nom de l'équipage (vide = le tien)")
    async def crew_info(self, interaction: discord.Interaction, nom: str = None):
        await interaction.response.defer()
        if nom:
            crew = await db.get_crew_by_name(nom)
        else:
            m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.followup.send("❌ Équipage introuvable.", ephemeral=True)
            return
        members, alliances, war_data = await asyncio.gather(
            db.get_crew_members(crew['id']),
            db.get_active_alliances(crew['id']),
            db.get_active_war_with_crews(crew['id']),
        )
        war, crew_a, crew_b = war_data
        await interaction.followup.send(embed=crew_info_embed(
            crew, members, alliances, interaction.guild,
            war=war, war_crew_a=crew_a, war_crew_b=crew_b,
        ))

    @crew.command(name="leaderboard", description="Classement des équipages")
    @app_commands.describe(recrutement="Afficher uniquement ceux qui recrutent")
    async def crew_leaderboard(self, interaction: discord.Interaction, recrutement: bool = False):
        await interaction.response.defer()
        if recrutement:
            crews, total = await db.list_crews(True, 0, 10)
            embed = leaderboard_embed(crews)
            embed.title = "🏴‍☠️ Équipages qui recrutent"
            view = CrewListView(crews, total, recruiting_only=True)
            await interaction.followup.send(embed=embed, view=view)
        else:
            crews = await db.leaderboard_crews(20)
            from .leaderboard import generate_leaderboard_image
            f = generate_leaderboard_image(crews)
            embed = leaderboard_embed(crews)
            await interaction.followup.send(embed=embed, file=f)

    @crew.command(name="historique", description="Derniers événements de ton équipage")
    async def crew_historique(self, interaction: discord.Interaction):
        _, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        events = await db.get_history(crew['id'])
        await interaction.response.send_message(embed=history_embed(crew, events))

    @crew.command(name="stats", description="Contribution d'un membre")
    @app_commands.describe(membre="Le membre à afficher")
    async def crew_stats(self, interaction: discord.Interaction, membre: discord.Member = None):
        target  = membre or interaction.user
        mem     = await db.get_member(target.id)
        if not mem:
            await interaction.response.send_message(f"❌ <@{target.id}> n'est dans aucun équipage.", ephemeral=True)
            return
        crew, members = await asyncio.gather(
            db.get_crew(mem['crew_id']),
            db.get_crew_members(mem['crew_id']),
        )
        pos       = mem['position']
        pos_emoji = POSITIONS.get(pos, {}).get('emoji', '👤')

        sorted_m     = sorted(members, key=lambda m: m['contribution'], reverse=True)
        contrib_rank = next((i + 1 for i, m in enumerate(sorted_m) if m['user_id'] == target.id), len(members))
        total_contrib = sum(m['contribution'] for m in members)
        contrib_pct   = int(mem['contribution'] / total_contrib * 100) if total_contrib else 0

        joined_at = mem['joined_at']
        if joined_at and isinstance(joined_at, str):
            joined_at = datetime.fromisoformat(joined_at.replace("Z", "+00:00"))
        if joined_at:
            if not joined_at.tzinfo:
                joined_at = joined_at.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - joined_at).days
        else:
            days = 0

        embed = discord.Embed(title=f"📊 Stats — {target.display_name}", color=CREW_COLOR)
        embed.set_thumbnail(url=target.display_avatar.url)
        embed.add_field(name="🏴‍☠️ Équipage",   value=crew['name'] if crew else "?",              inline=True)
        embed.add_field(name="⚔️ Poste",         value=f"{pos_emoji} **{pos}**",                   inline=True)
        embed.add_field(name="📅 Membre depuis", value=f"<t:{int(joined_at.timestamp())}:D> (**{days}j**)", inline=True)
        embed.add_field(name="💰 Contribution",  value=f"**{fmt_berries(mem['contribution'])} 🍊**", inline=True)
        embed.add_field(name="🏆 Rang contrib.", value=f"**#{contrib_rank}** / {len(members)}",     inline=True)
        embed.add_field(name="📊 Part équipage", value=f"**{contrib_pct}%** du total",              inline=True)

        if total_contrib > 0:
            bar_f = int(contrib_pct / 10)
            bar   = "█" * bar_f + "░" * (10 - bar_f)
            embed.add_field(
                name="📈 Contribution relative",
                value=f"`{bar}` **{contrib_pct}%** — {fmt_berries(mem['contribution'])} / {fmt_berries(total_contrib)} 🍊",
                inline=False,
            )

        if crew:
            embed.add_field(
                name="🏴‍☠️ Infos équipage",
                value=(
                    f"Niveau **{crew['level']}** · "
                    f"Trésor **{fmt_berries(crew['treasury'])} 🍊** · "
                    f"Guerres ✅{crew['wars_won']} / ❌{crew['wars_lost']}"
                ),
                inline=False,
            )
        await interaction.response.send_message(embed=embed)

    @crew.command(name="candidater", description="Candidater à rejoindre un équipage")
    @app_commands.describe(crew_name="Nom de l'équipage")
    async def crew_candidater(self, interaction: discord.Interaction, crew_name: str):
        if await db.get_member(interaction.user.id):
            await interaction.response.send_message("❌ Tu es déjà dans un équipage.", ephemeral=True)
            return
        target_crew = await db.get_crew_by_name(crew_name)
        if not target_crew:
            await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
            return
        if not target_crew['is_recruiting']:
            await interaction.response.send_message("❌ Cet équipage ne recrute pas.", ephemeral=True)
            return
        existing = await db.get_user_pending_application(interaction.user.id, target_crew['id'])
        if existing:
            await interaction.response.send_message("❌ Tu as déjà une candidature en attente.", ephemeral=True)
            return

        async def _submit(inter, message):
            await inter.response.defer(ephemeral=True)
            await db.create_application(target_crew['id'], interaction.user.id, message)
            cap = interaction.guild.get_member(target_crew['captain_id'])
            if cap:
                try:
                    await cap.send(
                        embed=discord.Embed(
                            title=f"📋 Nouvelle candidature — {target_crew['name']}",
                            description=f"<@{interaction.user.id}> souhaite rejoindre ton équipage.\n\n*{message or 'Aucun message.'}*",
                            color=CREW_COLOR,
                        )
                    )
                except discord.Forbidden:
                    pass
            await inter.followup.send(f"✅ Ta candidature à **{target_crew['name']}** a été envoyée !", ephemeral=True)

        await interaction.response.send_modal(CandidatureModal(_submit))

    @crew.command(name="quitter", description="Quitter ton équipage")
    async def crew_quitter(self, interaction: discord.Interaction):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] == interaction.user.id:
            await interaction.response.send_message(
                "❌ Tu es capitaine. Transfère d'abord le commandement avec `/equipage transfert` "
                "ou dissous l'équipage avec `/equipage dissoudre`.",
                ephemeral=True,
            )
            return
        view = ConfirmView(interaction.user.id, "🚪 Quitter")
        await interaction.response.send_message(
            f"Tu vas quitter **{crew['name']}**. Confirmer ?", view=view, ephemeral=True
        )
        await view.wait()
        if not view.confirmed:
            return
        await db.remove_member(interaction.user.id)
        await db.add_history(crew['id'], interaction.user.id, 'left')
        if crew.get('role_id'):
            await remove_role(interaction.guild, interaction.user.id, crew['role_id'])
        await interaction.edit_original_response(
            content=f"✅ Tu as quitté **{crew['name']}**.", view=None
        )

    # ══════════════════════════════════════════════════════════════
    # GESTION
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="creer", description="Créer un nouvel équipage (30 000 000 🍊)")
    async def creer(self, interaction: discord.Interaction):
        uid = interaction.user.id
        existing_m = await db.get_member(uid)
        if existing_m:
            await interaction.response.send_message("❌ Tu es déjà dans un équipage.", ephemeral=True)
            return
        last_leave = await db.last_crew_leave(uid)
        if last_leave:
            dt = datetime.fromisoformat(last_leave.replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - dt).days < CREATE_COOLDOWN_DAYS:
                days_left = CREATE_COOLDOWN_DAYS - (datetime.now(timezone.utc) - dt).days
                await interaction.response.send_message(
                    f"⏳ Tu dois attendre encore **{days_left}j** avant de créer un équipage.", ephemeral=True
                )
                return

        async def _submit(inter, name, tag, description):
            if not re.match(r'^[A-Z0-9]{' + str(MIN_TAG_LEN) + ',' + str(MAX_TAG_LEN) + r'}$', tag):
                await inter.response.send_message(
                    f"❌ Tag invalide. {MIN_TAG_LEN}-{MAX_TAG_LEN} caractères alphanumériques majuscules.", ephemeral=True
                )
                return
            name_taken, tag_taken = await db.check_name_and_tag(name, tag)
            if name_taken:
                await inter.response.send_message("❌ Ce nom d'équipage est déjà pris.", ephemeral=True)
                return
            if tag_taken:
                await inter.response.send_message("❌ Ce tag est déjà pris.", ephemeral=True)
                return
            if not self.bot.spend_berrys(str(uid), COST_CREATE):
                bal = self.bot.get_berrys(str(uid))
                await inter.response.send_message(
                    f"❌ Solde insuffisant. Il te faut **{fmt_berries(COST_CREATE)} 🍊** (tu as **{fmt_berries(bal)} 🍊**).",
                    ephemeral=True,
                )
                return
            await inter.response.defer(ephemeral=True)
            crew_id = await db.create_crew(name, tag, description, uid)
            role = await inter.guild.create_role(name=f"🏴‍☠️ {tag}", color=random_role_color())
            cat_id, ch_id, _ = await create_crew_channels(inter.guild, name, tag, role, PARENT_CAT)
            await db.update_crew(crew_id, text_channel_id=ch_id, role_id=role.id)
            await db.add_member(uid, crew_id, 'capitaine')
            await db.add_history(crew_id, uid, 'joined', 'Fondateur')
            await assign_role(inter.guild, uid, role.id)
            await self._log_staff("🏴‍☠️ Crew créé", f"**{name}** [{tag}] par <@{uid}>", 0x2ECC71)
            await inter.followup.send(
                embed=discord.Embed(
                    title="🏴‍☠️ Équipage fondé !",
                    description=(
                        f"**{name}** [{tag}] est né !\n\n"
                        f"Salon : <#{ch_id}>\n"
                        f"Rôle : <@&{role.id}>\n"
                        f"Solde restant : **{fmt_berries(self.bot.get_berrys(str(uid)))} 🍊**"
                    ),
                    color=0x2ECC71,
                ),
                ephemeral=True,
            )

        await interaction.response.send_modal(CreerCrewModal(_submit))

    @crew.command(name="dissoudre", description="Dissoudre ton équipage (capitaine seulement)")
    async def dissoudre(self, interaction: discord.Interaction):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut dissoudre l'équipage.", ephemeral=True)
            return
        view = ConfirmView(interaction.user.id, "⚠️ Dissoudre définitivement")
        await interaction.response.send_message(
            embed=discord.Embed(
                title="⚠️ Dissoudre l'équipage ?",
                description=(
                    f"Tu vas dissoudre **{crew['name']}** définitivement.\n\n"
                    f"**{int(crew['treasury'] * DISSOLVE_REFUND):,} 🍊** te seront remboursés.".replace(",", " ")
                ),
                color=discord.Color.red(),
            ),
            view=view,
            ephemeral=True,
        )
        await view.wait()
        if not view.confirmed:
            return
        members = await db.get_crew_members(crew['id'])
        refund  = int(crew['treasury'] * DISSOLVE_REFUND)
        if refund > 0:
            self.bot.add_berrys(str(interaction.user.id), refund)
        for mem in members:
            await db.remove_member(mem['user_id'])
            if crew.get('role_id'):
                await remove_role(interaction.guild, mem['user_id'], crew['role_id'])
        await db.dissolve_crew(crew['id'])
        await delete_crew_channels(interaction.guild, None, crew.get('text_channel_id'), crew.get('role_id'))
        await self._log_staff("💀 Crew dissous", f"**{crew['name']}** dissous par <@{interaction.user.id}>", 0xFF0000)
        await interaction.edit_original_response(
            embed=discord.Embed(
                title="💀 Équipage dissous",
                description=f"**{crew['name']}** n'existe plus.\nRemboursement : **{fmt_berries(refund)} 🍊**",
                color=discord.Color.red(),
            ),
            view=None,
        )

    @crew.command(name="renommer", description="Renommer l'équipage (20 000 🍊, cooldown 30j)")
    async def renommer(self, interaction: discord.Interaction):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut renommer.", ephemeral=True)
            return

        async def _submit(inter, new_name):
            if await db.get_crew_by_name(new_name):
                await inter.response.send_message("❌ Ce nom est déjà pris.", ephemeral=True)
                return
            if not self.bot.spend_berrys(str(interaction.user.id), COST_RENAME):
                await inter.response.send_message(
                    f"❌ Solde insuffisant. Il te faut **{fmt_berries(COST_RENAME)} 🍊**.", ephemeral=True
                )
                return
            await db.update_crew(crew['id'], name=new_name)
            await inter.response.send_message(
                f"✅ L'équipage s'appelle maintenant **{new_name}** !", ephemeral=True
            )

        await interaction.response.send_modal(RenommerModal(_submit))

    @crew.command(name="drapeau", description="Définir le drapeau de l'équipage (lien image)")
    @app_commands.describe(url="URL de l'image (PNG/JPG/GIF, max 5MB)")
    async def drapeau(self, interaction: discord.Interaction, url: str):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_all'):
            await interaction.response.send_message("❌ Seul le capitaine peut changer le drapeau.", ephemeral=True)
            return
        if not url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            await interaction.response.send_message("❌ Format non supporté (PNG, JPG, GIF, WEBP).", ephemeral=True)
            return
        await db.update_crew(crew['id'], flag_url=url)
        await interaction.response.send_message(
            embed=discord.Embed(title="🏴‍☠️ Drapeau mis à jour !", color=0x2ECC71).set_image(url=url),
            ephemeral=True,
        )

    @crew.command(name="recrutement", description="Activer ou désactiver le recrutement")
    @app_commands.describe(actif="True = ouvert, False = fermé")
    async def recrutement(self, interaction: discord.Interaction, actif: bool):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_members'):
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return
        await db.update_crew(crew['id'], is_recruiting=actif)
        status = "✅ Ouvert" if actif else "🔒 Fermé"
        await interaction.response.send_message(f"Recrutement : **{status}**", ephemeral=True)

    # ══════════════════════════════════════════════════════════════
    # MEMBRES
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="membres", description="Liste des membres et leurs postes")
    async def membres(self, interaction: discord.Interaction):
        _, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        members = await db.get_crew_members(crew['id'])
        lines = []
        for mem in members:
            pos   = mem['position']
            emoji = POSITIONS.get(pos, {}).get('emoji', '👤')
            contrib = fmt_berries(mem['contribution'])
            lines.append(f"{emoji} <@{mem['user_id']}> — *{pos}* · contribution: **{contrib} 🍊**")
        max_m = get_level_data(crew['level'])['max_members']
        embed = discord.Embed(
            title=f"👥 Équipage — {crew['name']} ({len(members)}/{max_m})",
            description="\n".join(lines) or "*Aucun membre.*",
            color=CREW_COLOR,
        )
        await interaction.response.send_message(embed=embed)

    @crew.command(name="kick", description="Expulser un membre de l'équipage")
    @app_commands.describe(membre="Le membre à expulser", raison="Raison (optionnel)")
    async def kick(self, interaction: discord.Interaction,
                   membre: discord.Member, raison: str = None):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_members'):
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return
        if membre.id == interaction.user.id:
            await interaction.response.send_message("❌ Tu ne peux pas te kick toi-même.", ephemeral=True)
            return
        target_m = await db.get_member(membre.id)
        if not target_m or target_m['crew_id'] != crew['id']:
            await interaction.response.send_message("❌ Ce membre n'est pas dans ton équipage.", ephemeral=True)
            return
        if target_m['position'] == 'capitaine':
            await interaction.response.send_message("❌ Impossible d'expulser le capitaine.", ephemeral=True)
            return
        await db.remove_member(membre.id)
        await db.add_history(crew['id'], membre.id, 'kicked', raison or f"par {interaction.user.display_name}")
        if crew.get('role_id'):
            await remove_role(interaction.guild, membre.id, crew['role_id'])
        try:
            await membre.send(f"Tu as été expulsé de **{crew['name']}**." + (f"\nRaison : {raison}" if raison else ""))
        except discord.Forbidden:
            pass
        await interaction.response.send_message(
            f"✅ <@{membre.id}> a été expulsé de **{crew['name']}**.", ephemeral=True
        )

    @crew.command(name="promouvoir", description="Attribuer un poste à un membre")
    @app_commands.describe(membre="Le membre", poste="Le poste à attribuer")
    @app_commands.choices(poste=POSITION_CHOICES)
    async def promouvoir(self, interaction: discord.Interaction,
                         membre: discord.Member, poste: str):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut promouvoir.", ephemeral=True)
            return
        target_m = await db.get_member(membre.id)
        if not target_m or target_m['crew_id'] != crew['id']:
            await interaction.response.send_message("❌ Ce membre n'est pas dans ton équipage.", ephemeral=True)
            return
        max_count = POSITIONS[poste]['max']
        if max_count == 1:
            members = await db.get_crew_members(crew['id'])
            if any(x['position'] == poste and x['user_id'] != membre.id for x in members):
                await interaction.response.send_message(f"❌ Le poste *{poste}* est déjà occupé.", ephemeral=True)
                return
        old_pos = target_m['position']
        await db.update_member_position(membre.id, poste)
        action = 'promoted' if poste != 'mousse' else 'demoted'
        await db.add_history(crew['id'], membre.id, action, f"{old_pos} → {poste}")
        emoji = POSITIONS[poste]['emoji']
        await interaction.response.send_message(
            f"✅ <@{membre.id}> est maintenant **{emoji} {poste}** !", ephemeral=True
        )

    @crew.command(name="transfert", description="Transférer le commandement à un autre membre")
    @app_commands.describe(membre="Le nouveau capitaine")
    async def transfert(self, interaction: discord.Interaction, membre: discord.Member):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut transférer.", ephemeral=True)
            return
        target_m = await db.get_member(membre.id)
        if not target_m or target_m['crew_id'] != crew['id']:
            await interaction.response.send_message("❌ Ce membre n'est pas dans l'équipage.", ephemeral=True)
            return
        view = ConfirmView(interaction.user.id, f"👑 Transférer à {membre.display_name}")
        await interaction.response.send_message(
            f"⚠️ Tu vas transférer le commandement de **{crew['name']}** à <@{membre.id}>.", view=view, ephemeral=True
        )
        await view.wait()
        if not view.confirmed:
            return
        await db.update_crew(crew['id'], captain_id=membre.id)
        await db.update_member_position(interaction.user.id, 'second')
        await db.update_member_position(membre.id, 'capitaine')
        await db.add_history(crew['id'], interaction.user.id, 'demoted', f"transfert à <@{membre.id}>")
        await db.add_history(crew['id'], membre.id, 'promoted', 'nouveau capitaine')
        await interaction.edit_original_response(content=f"✅ <@{membre.id}> est le nouveau capitaine !", view=None)

    @crew.command(name="candidatures", description="Gérer les candidatures de l'équipage")
    async def candidatures(self, interaction: discord.Interaction):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_members'):
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return
        apps = await db.get_pending_applications(crew['id'])
        if not apps:
            await interaction.response.send_message("✅ Aucune candidature en attente.", ephemeral=True)
            return
        embed = applications_embed(crew, apps[0:1], 1, len(apps))
        view  = ApplicationsView(apps, crew, self.bot)
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    # ══════════════════════════════════════════════════════════════
    # TRÉSOR
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="tresor", description="Solde et mouvements du trésor")
    async def tresor(self, interaction: discord.Interaction):
        _, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        logs, members = await asyncio.gather(
            db.get_treasury_logs(crew['id']),
            db.get_crew_members(crew['id']),
        )
        await interaction.response.send_message(embed=treasury_embed(crew, logs, members))

    @crew.command(name="depot", description="Déposer des Berrys dans le trésor de l'équipage")
    @app_commands.describe(montant="Montant à déposer")
    async def depot(self, interaction: discord.Interaction, montant: int):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if montant <= 0:
            await interaction.response.send_message("❌ Montant invalide.", ephemeral=True)
            return
        if not self.bot.spend_berrys(str(interaction.user.id), montant):
            await interaction.response.send_message("❌ Solde insuffisant.", ephemeral=True)
            return
        new_treasury = crew['treasury'] + montant
        await asyncio.gather(
            db.update_crew(crew['id'], treasury=new_treasury),
            db.add_contribution(interaction.user.id, montant),
            db.add_treasury_log(crew['id'], interaction.user.id, montant, 'deposit'),
        )
        await award_xp(self.bot, crew['id'], montant // 100)
        await interaction.response.send_message(
            embed=discord.Embed(
                title="🏦 Dépôt effectué",
                description=f"+**{fmt_berries(montant)} 🍊** → trésor : **{fmt_berries(new_treasury)} 🍊**",
                color=0x2ECC71,
            ),
            ephemeral=True,
        )

    @crew.command(name="retrait", description="Retirer des Berrys du trésor (capitaine/second)")
    async def retrait(self, interaction: discord.Interaction):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_treasury'):
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return

        async def _submit(inter, amount, raison):
            if amount <= 0 or amount > crew['treasury']:
                await inter.response.send_message("❌ Montant invalide ou trésor insuffisant.", ephemeral=True)
                return
            new_treasury = crew['treasury'] - amount
            await db.update_crew(crew['id'], treasury=new_treasury)
            self.bot.add_berrys(str(interaction.user.id), amount)
            await db.add_treasury_log(crew['id'], interaction.user.id, -amount, 'withdraw', raison)
            await inter.response.send_message(
                f"✅ **{fmt_berries(amount)} 🍊** retirés du trésor. Raison : *{raison}*", ephemeral=True
            )

        await interaction.response.send_modal(RetraitModal(_submit))

    @crew.command(name="don", description="Distribuer du trésor à un membre (capitaine/second)")
    @app_commands.describe(membre="Bénéficiaire", montant="Montant en Berrys")
    async def don(self, interaction: discord.Interaction,
                  membre: discord.Member, montant: int):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_treasury'):
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return
        if montant <= 0 or montant > crew['treasury']:
            await interaction.response.send_message("❌ Montant invalide ou trésor insuffisant.", ephemeral=True)
            return
        target_m = await db.get_member(membre.id)
        if not target_m or target_m['crew_id'] != crew['id']:
            await interaction.response.send_message("❌ Ce membre n'est pas dans l'équipage.", ephemeral=True)
            return
        await db.update_crew(crew['id'], treasury=crew['treasury'] - montant)
        self.bot.add_berrys(str(membre.id), montant)
        await db.add_treasury_log(crew['id'], interaction.user.id, -montant, 'don', f"à <@{membre.id}>")
        await interaction.response.send_message(
            f"✅ **{fmt_berries(montant)} 🍊** envoyés à <@{membre.id}> depuis le trésor.", ephemeral=True
        )

    # ══════════════════════════════════════════════════════════════
    # ALLIANCES
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="allier", description="Proposer une alliance à un équipage")
    @app_commands.describe(crew_name="Nom de l'équipage cible")
    async def allier(self, interaction: discord.Interaction, crew_name: str):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if not can_feature(crew['level'], 'alliances'):
            await interaction.response.send_message("❌ Les alliances se débloquent au niveau 3.", ephemeral=True)
            return
        if not has_perm(m['position'], 'manage_alliances') and m['position'] != 'capitaine':
            await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
            return
        target = await db.get_crew_by_name(crew_name)
        if not target or target['id'] == crew['id']:
            await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
            return
        existing = await db.get_alliance(crew['id'], target['id'])
        if existing and existing['status'] == 'active':
            await interaction.response.send_message("❌ Vous êtes déjà alliés.", ephemeral=True)
            return
        await db.propose_alliance(crew['id'], target['id'], interaction.user.id)
        cap = interaction.guild.get_member(target['captain_id'])
        view = AllianceResponseView(target['id'], crew['id'], target['captain_id'], self.bot)
        if cap:
            try:
                await cap.send(
                    embed=discord.Embed(
                        title="🤝 Proposition d'alliance",
                        description=f"**{crew['name']}** te propose une alliance !",
                        color=0x9B59B6,
                    ),
                    view=view,
                )
            except discord.Forbidden:
                pass
        await interaction.response.send_message(
            f"✅ Proposition d'alliance envoyée à **{target['name']}**.", ephemeral=True
        )

    @crew.command(name="trahir", description="Rompre une alliance (compte comme trahison)")
    @app_commands.describe(crew_name="Nom de l'équipage allié")
    async def trahir(self, interaction: discord.Interaction, crew_name: str):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut rompre une alliance.", ephemeral=True)
            return
        target = await db.get_crew_by_name(crew_name)
        if not target:
            await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
            return
        ally = await db.get_alliance(crew['id'], target['id'])
        if not ally or ally['status'] != 'active':
            await interaction.response.send_message("❌ Vous n'êtes pas alliés.", ephemeral=True)
            return
        view = ConfirmView(interaction.user.id, "🗡️ Rompre l'alliance (trahison)")
        await interaction.response.send_message(
            f"⚠️ Rompre l'alliance avec **{target['name']}** sera visible publiquement.", view=view, ephemeral=True
        )
        await view.wait()
        if not view.confirmed:
            return
        await db.break_alliance(crew['id'], target['id'], interaction.user.id)
        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            await ch.send(
                embed=discord.Embed(
                    title="🗡️ Alliance Rompue !",
                    description=f"**{crew['name']}** a trahi **{target['name']}** !",
                    color=0xFF0000,
                )
            )
        await interaction.edit_original_response(
            content=f"Alliance avec **{target['name']}** rompue.", view=None
        )

    # ══════════════════════════════════════════════════════════════
    # GUERRES
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="declarer", description="Déclarer la guerre à un équipage")
    @app_commands.describe(
        crew_name="Équipage cible",
        mise="Mise de guerre (min 10 000 🍊)",
        duree_h="Durée en heures (12-48)",
    )
    async def declarer(self, interaction: discord.Interaction,
                       crew_name: str, mise: int, duree_h: int):
        m, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut déclarer une guerre.", ephemeral=True)
            return
        if not can_feature(crew['level'], 'wars'):
            await interaction.response.send_message("❌ Les guerres se débloquent au niveau 4.", ephemeral=True)
            return
        if mise < MIN_WAR_BET:
            await interaction.response.send_message(f"❌ Mise minimum : **{fmt_berries(MIN_WAR_BET)} 🍊**.", ephemeral=True)
            return
        if not (MIN_WAR_HOURS <= duree_h <= MAX_WAR_HOURS):
            await interaction.response.send_message(f"❌ Durée : {MIN_WAR_HOURS}-{MAX_WAR_HOURS}h.", ephemeral=True)
            return
        if crew['treasury'] < mise:
            await interaction.response.send_message("❌ Trésor insuffisant pour couvrir la mise.", ephemeral=True)
            return
        target = await db.get_crew_by_name(crew_name)
        if not target or target['id'] == crew['id']:
            await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
            return
        ally = await db.get_alliance(crew['id'], target['id'])
        if ally and ally['status'] == 'active':
            await interaction.response.send_message("❌ Tu ne peux pas attaquer un allié.", ephemeral=True)
            return
        active = await db.get_active_war(crew['id'])
        if active:
            await interaction.response.send_message("❌ Tu as déjà une guerre en cours.", ephemeral=True)
            return
        if target['treasury'] < mise:
            await interaction.response.send_message(f"❌ {target['name']} n'a pas assez dans son trésor.", ephemeral=True)
            return
        await db.update_crew(crew['id'], treasury=crew['treasury'] - mise)
        war_id = await db.declare_war(crew['id'], target['id'], mise * 2, duree_h)
        cap = interaction.guild.get_member(target['captain_id'])
        view = WarResponseView(war_id, target['captain_id'], self.bot)
        if cap:
            try:
                await cap.send(
                    embed=discord.Embed(
                        title="⚔️ Déclaration de Guerre !",
                        description=(
                            f"**{crew['name']}** vous déclare la guerre !\n\n"
                            f"Mise : **{fmt_berries(mise * 2)} 🍊** · Durée : **{duree_h}h**"
                        ),
                        color=0xFF4444,
                    ),
                    view=view,
                )
            except discord.Forbidden:
                pass
        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            await ch.send(
                embed=discord.Embed(
                    title="⚔️ Déclaration de Guerre !",
                    description=f"**{crew['name']}** a déclaré la guerre à **{target['name']}** !",
                    color=0xFF4444,
                )
            )
        await interaction.response.send_message(
            f"⚔️ Guerre déclarée à **{target['name']}** ! Mise bloquée : **{fmt_berries(mise)} 🍊**.", ephemeral=True
        )

    @crew.command(name="attaquer", description="Défier un ennemi en duel pendant la guerre (cooldown 30 min)")
    @app_commands.describe(ennemi="Membre ennemi à défier")
    async def attaquer(self, interaction: discord.Interaction, ennemi: discord.Member):
        (m, crew), (em, ecrew) = await asyncio.gather(
            self._get_user_crew(interaction.user.id),
            self._get_user_crew(ennemi.id),
        )
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        war = await db.get_active_war(crew['id'])
        if not war or war['status'] != 'active':
            await interaction.response.send_message("❌ Ton équipage n'est pas en guerre.", ephemeral=True)
            return
        if not ecrew:
            await interaction.response.send_message("❌ Cet ennemi n'est dans aucun équipage.", ephemeral=True)
            return
        if ecrew['id'] not in (war['attacker_id'], war['defender_id']):
            await interaction.response.send_message("❌ Cet ennemi n'est pas dans la guerre en cours.", ephemeral=True)
            return
        if ecrew['id'] == crew['id']:
            await interaction.response.send_message("❌ Tu ne peux pas attaquer un allié.", ephemeral=True)
            return
        last = await db.get_last_battle_time(war['id'], interaction.user.id)
        if last:
            dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - dt).total_seconds()
            if elapsed < 1800:
                remaining = int(1800 - elapsed)
                await interaction.response.send_message(
                    f"⏳ Cooldown : encore **{remaining // 60}min {remaining % 60}s** avant le prochain duel.",
                    ephemeral=True,
                )
                return
        import random
        won    = random.random() < 0.5
        result = 'won' if won else 'lost'
        pts    = 10 if won else 0
        coros  = [db.add_battle(war['id'], interaction.user.id, crew['id'], ennemi.id, result, pts)]
        if pts:
            coros.append(db.update_war_score(war['id'], crew['id'], pts))
        if won:
            coros.append(award_xp(self.bot, crew['id'], XP_DUEL_WIN))
        await asyncio.gather(*coros)
        outcome = "✅ Victoire" if won else "❌ Défaite"
        war_updated = await db.get_war(war['id'])
        embed = discord.Embed(
            title=f"⚔️ Duel de Guerre — {outcome}",
            description=f"<@{interaction.user.id}> vs <@{ennemi.id}>\n+**{pts}** points pour ton équipage",
            color=0x2ECC71 if won else 0xFF4444,
        )
        if war_updated:
            att = war_updated['attacker_score']
            dfs = war_updated['defender_score']
            att_crew, def_crew = await asyncio.gather(
                db.get_crew(war_updated['attacker_id']),
                db.get_crew(war_updated['defender_id']),
            )
            embed.add_field(
                name="Score actuel",
                value=f"{att_crew['name'] if att_crew else '?'}: **{att}** | {def_crew['name'] if def_crew else '?'}: **{dfs}**",
                inline=False,
            )
        await interaction.response.send_message(embed=embed)

    @crew.command(name="guerre", description="Score live de la guerre en cours")
    async def guerre(self, interaction: discord.Interaction):
        _, crew = await self._get_user_crew(interaction.user.id)
        if not crew:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        war, crew_a, crew_b = await db.get_active_war_with_crews(crew['id'])
        if not war:
            await interaction.response.send_message("❌ Aucune guerre en cours.", ephemeral=True)
            return
        top = await db.get_war_top_contributors(war['id'])
        await interaction.response.send_message(embed=war_status_embed(war, crew_a, crew_b, top))


async def setup(bot: commands.Bot):
    await bot.add_cog(CrewCog(bot))
    print("[CREWS] Cog enregistré ✅")
