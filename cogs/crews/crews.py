import os
import re
import asyncio
import random
from datetime import datetime, timezone, timedelta

import discord
from discord import app_commands
from discord.ext import commands

from . import database as db
from .constants import (
    POSITIONS, CREW_LEVELS, COST_CREATE, COST_RENAME, MIN_WAR_BET,
    RENAME_COOLDOWN_DAYS, CREATE_COOLDOWN_DAYS,
    MIN_TAG_LEN, MAX_TAG_LEN, MIN_NAME_LEN, MAX_NAME_LEN,
    MIN_WAR_HOURS, MAX_WAR_HOURS, XP_DUEL_WIN, XP_DUEL_LOSS, DISSOLVE_REFUND,
    CREW_COLOR, WAR_COOLDOWN_DAYS, SABOTAGE_COST, SABOTAGE_POINTS_STOLEN,
    XP_SABOTAGE, CONTRIBUTION_DUEL_WIN, POSITION_WAR_BONUS,
    ISLANDS, MISSION_TEMPLATES, MISSIONS_PER_CREW, mission_difficulty,
    TOURNAMENT_ENTRY_FEE, TOURNAMENT_MAX_SLOTS,
    VOCAL_DUEL_ACCEPT_MINUTES, VOCAL_DUEL_DURATION_MINUTES,
    VOCAL_DUEL_STAKE_DEFAULT, XP_VOCAL_DUEL_WIN, XP_VOCAL_DUEL_LOSS,
)
from .utils import (
    has_perm, can_feature, fmt_berries, random_role_color,
    award_xp, create_crew_channels, delete_crew_channels,
    assign_role, remove_role, get_level_data,
)
from .embeds import (
    crew_info_embed, treasury_embed, applications_embed,
    war_status_embed, history_embed, leaderboard_embed,
    missions_embed, territories_embed, tournament_embed,
)
from .views import (
    CreerCrewModal, RenommerModal, RetraitModal,
    ConfirmView, ApplicationsView, CrewListView,
    AllianceResponseView, WarResponseView,
)
from .tasks import CrewTasks

GUILD_IDS   = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]
ANNOUNCE_CH = int(os.environ.get("CREWS_ANNOUNCEMENT_CHANNEL_ID", "0"))
LOGS_CH     = int(os.environ.get("CREWS_LOGS_CHANNEL_ID", "0"))
PARENT_CAT  = int(os.environ.get("CREWS_CATEGORY_PARENT_ID", "0")) or None

GERER_CHOICES = [
    app_commands.Choice(name="🏴 Changer le drapeau",          value="drapeau"),
    app_commands.Choice(name="📋 Gérer les candidatures",      value="candidatures"),
    app_commands.Choice(name="🥾 Expulser un membre",          value="kick"),
    app_commands.Choice(name="📢 Recrutement on/off",          value="recrutement"),
    app_commands.Choice(name="⬆️ Promouvoir un membre",        value="promouvoir"),
    app_commands.Choice(name="👑 Transférer le commandement",  value="transfert"),
    app_commands.Choice(name="💸 Retrait du trésor",           value="retrait"),
    app_commands.Choice(name="🎁 Don à un membre",             value="don"),
    app_commands.Choice(name="✏️ Renommer l'équipage",         value="renommer"),
    app_commands.Choice(name="💀 Dissoudre l'équipage",        value="dissoudre"),
]

GUERRE_CHOICES = [
    app_commands.Choice(name="⚔️ Déclarer la guerre",          value="declarer"),
    app_commands.Choice(name="🗡️ Attaquer (duel en guerre)",   value="attaquer"),
    app_commands.Choice(name="💣 Saboter l'équipage ennemi",   value="saboter"),
    app_commands.Choice(name="🤝 Proposer une alliance",        value="allier"),
    app_commands.Choice(name="🗡️ Rompre une alliance",         value="trahir"),
    app_commands.Choice(name="📊 Stats de la guerre en cours", value="stats"),
]


# ══════════════════════════════════════════════════════════════════════
# DUEL VOCAL — VIEWS
# ══════════════════════════════════════════════════════════════════════

class VocalDuelResponseView(discord.ui.View):
    """Envoyée au capitaine adverse pour accepter/refuser le défi."""

    def __init__(self, duel_id: int, challenger_crew, opponent_crew, cog):
        super().__init__(timeout=VOCAL_DUEL_ACCEPT_MINUTES * 60)
        self._duel_id  = duel_id
        self._chall    = challenger_crew
        self._opp      = opponent_crew
        self._cog      = cog

    @discord.ui.button(label="⚔️ Accepter le défi", style=discord.ButtonStyle.danger)
    async def accept(self, interaction: discord.Interaction, _):
        if interaction.user.id != self._opp['captain_id']:
            await interaction.response.send_message("❌ Seul le capitaine adverse peut répondre.", ephemeral=True)
            return
        await interaction.response.defer()
        await self._cog._start_vocal_duel(interaction, self._duel_id, self._chall, self._opp)
        self.stop()

    @discord.ui.button(label="🚫 Refuser", style=discord.ButtonStyle.secondary)
    async def refuse(self, interaction: discord.Interaction, _):
        if interaction.user.id != self._opp['captain_id']:
            await interaction.response.send_message("❌ Seul le capitaine adverse peut répondre.", ephemeral=True)
            return
        await db.cancel_vocal_duel(self._duel_id)
        await interaction.response.edit_message(
            content=f"🚫 **{self._opp['name']}** a refusé le défi de **{self._chall['name']}**.",
            embed=None, view=None,
        )
        self.stop()

    async def on_timeout(self):
        await db.cancel_vocal_duel(self._duel_id)


class ArbitreView(discord.ui.View):
    """Envoyée à l'arbitre pour déclarer le vainqueur."""

    def __init__(self, duel_id: int, crew_a, crew_b, voice_channel_id: int, cog):
        super().__init__(timeout=VOCAL_DUEL_DURATION_MINUTES * 60)
        self._duel_id       = duel_id
        self._crew_a        = crew_a
        self._crew_b        = crew_b
        self._vc_id         = voice_channel_id
        self._cog           = cog

        b_a = discord.ui.Button(label=f"🏆 {crew_a['name']}", style=discord.ButtonStyle.success)
        b_b = discord.ui.Button(label=f"🏆 {crew_b['name']}", style=discord.ButtonStyle.success)
        b_n = discord.ui.Button(label="🤝 Match nul",          style=discord.ButtonStyle.secondary)

        b_a.callback = lambda i: self._declare(i, self._crew_a['id'])
        b_b.callback = lambda i: self._declare(i, self._crew_b['id'])
        b_n.callback = lambda i: self._declare(i, None)

        self.add_item(b_a)
        self.add_item(b_b)
        self.add_item(b_n)

    async def _declare(self, interaction: discord.Interaction, winner_id: int | None):
        await interaction.response.defer()
        await self._cog._resolve_vocal_duel(interaction, self._duel_id, winner_id,
                                             self._crew_a, self._crew_b, self._vc_id)
        self.stop()

    async def on_timeout(self):
        await db.cancel_vocal_duel(self._duel_id)
        guild = self._cog.bot.guilds[0] if self._cog.bot.guilds else None
        if guild and self._vc_id:
            vc = guild.get_channel(self._vc_id)
            if vc:
                try:
                    await vc.delete(reason="Duel vocal expiré sans verdict")
                except Exception:
                    pass


# ══════════════════════════════════════════════════════════════════════
# MODALS SPÉCIFIQUES
# ══════════════════════════════════════════════════════════════════════

class DeclararModal(discord.ui.Modal, title="⚔️ Déclarer la guerre"):
    crew_name = discord.ui.TextInput(label="Équipage cible (nom exact)", max_length=30)
    mise      = discord.ui.TextInput(label="Mise en Berrys (min 10 000)", placeholder="10000")
    duree     = discord.ui.TextInput(label="Durée en heures (12–48)",     placeholder="24")

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction):
        try:
            mise_val  = int(self.mise.value.strip().replace(" ", "").replace("\xa0", ""))
            duree_val = int(self.duree.value.strip())
        except ValueError:
            await interaction.response.send_message("❌ Valeurs numériques invalides.", ephemeral=True)
            return
        await self._cb(interaction, self.crew_name.value.strip(), mise_val, duree_val)


class DerapeauModal(discord.ui.Modal, title="🏴 Nouveau drapeau"):
    url = discord.ui.TextInput(label="URL image (PNG/JPG/GIF/WEBP)", placeholder="https://...")

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction):
        await self._cb(interaction, self.url.value.strip())


class DonModal(discord.ui.Modal, title="🎁 Don depuis le trésor"):
    membre_id = discord.ui.TextInput(label="ID Discord du bénéficiaire",    placeholder="123456789")
    montant   = discord.ui.TextInput(label="Montant en Berrys",             placeholder="50000")

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction):
        try:
            uid = int(self.membre_id.value.strip())
            val = int(self.montant.value.strip().replace(" ", "").replace("\xa0", ""))
        except ValueError:
            await interaction.response.send_message("❌ Valeurs invalides.", ephemeral=True)
            return
        await self._cb(interaction, uid, val)


class CandidaterModal(discord.ui.Modal, title="📋 Candidater à un équipage"):
    crew_name = discord.ui.TextInput(label="Nom de l'équipage",        max_length=30)
    message   = discord.ui.TextInput(label="Message de motivation",    required=False,
                                     max_length=300, style=discord.TextStyle.paragraph)

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction):
        await self._cb(interaction, self.crew_name.value.strip(), self.message.value.strip())


# ══════════════════════════════════════════════════════════════════════
# VIEWS GESTION
# ══════════════════════════════════════════════════════════════════════

class MembresKickView(discord.ui.View):
    def __init__(self, crew, members):
        super().__init__(timeout=60)
        opts = [
            discord.SelectOption(
                label=f"{POSITIONS.get(m['position'], {}).get('emoji','👤')} {m['position']} · ID {m['user_id']}",
                value=str(m['user_id']),
            )
            for m in members if m['position'] != 'capitaine'
        ][:25]
        if opts:
            sel = discord.ui.Select(placeholder="Choisir le membre à expulser...", options=opts)
            sel.callback = self._kick
            self.add_item(sel)
        self._crew = crew

    async def _kick(self, interaction: discord.Interaction):
        uid = int(interaction.data['values'][0])
        target = await db.get_member(uid)
        if not target or target['crew_id'] != self._crew['id']:
            await interaction.response.send_message("❌ Membre introuvable.", ephemeral=True)
            return
        await db.remove_member(uid)
        await db.add_history(self._crew['id'], uid, 'kicked', f"par {interaction.user.display_name}")
        if self._crew.get('role_id'):
            await remove_role(interaction.guild, uid, self._crew['role_id'])
        m = interaction.guild.get_member(uid)
        if m:
            try:
                await m.send(f"Tu as été expulsé de **{self._crew['name']}**.")
            except discord.Forbidden:
                pass
        await interaction.response.edit_message(content=f"✅ <@{uid}> expulsé.", embed=None, view=None)


class PromouvoirView(discord.ui.View):
    def __init__(self, crew, members):
        super().__init__(timeout=60)
        self._crew = crew
        self._uid  = None
        opts_m = [
            discord.SelectOption(
                label=f"{POSITIONS.get(m['position'], {}).get('emoji','👤')} {m['position']} · ID {m['user_id']}",
                value=str(m['user_id']),
            )
            for m in members if m['position'] != 'capitaine'
        ][:25]
        opts_p = [
            discord.SelectOption(
                label=f"{data['emoji']} {pos}",
                value=pos,
            )
            for pos, data in POSITIONS.items() if pos != 'capitaine'
        ][:25]
        sel_m = discord.ui.Select(placeholder="1. Choisir le membre...",    options=opts_m or [discord.SelectOption(label="—", value="none")])
        sel_p = discord.ui.Select(placeholder="2. Choisir le nouveau poste...", options=opts_p)
        sel_m.callback = self._pick_member
        sel_p.callback = self._pick_poste
        self.add_item(sel_m)
        self.add_item(sel_p)

    async def _pick_member(self, interaction: discord.Interaction):
        self._uid = int(interaction.data['values'][0])
        await interaction.response.defer()

    async def _pick_poste(self, interaction: discord.Interaction):
        if not self._uid:
            await interaction.response.send_message("❌ Sélectionne d'abord un membre.", ephemeral=True)
            return
        poste  = interaction.data['values'][0]
        target = await db.get_member(self._uid)
        if not target or target['crew_id'] != self._crew['id']:
            await interaction.response.send_message("❌ Membre introuvable.", ephemeral=True)
            return
        if POSITIONS[poste]['max'] == 1:
            members = await db.get_crew_members(self._crew['id'])
            if any(x['position'] == poste and x['user_id'] != self._uid for x in members):
                await interaction.response.send_message(f"❌ Le poste *{poste}* est déjà occupé.", ephemeral=True)
                return
        old = target['position']
        await db.update_member_position(self._uid, poste)
        action = 'promoted' if poste != 'mousse' else 'demoted'
        await db.add_history(self._crew['id'], self._uid, action, f"{old} → {poste}")
        emoji = POSITIONS[poste]['emoji']
        await interaction.response.edit_message(
            content=f"✅ <@{self._uid}> est maintenant **{emoji} {poste}** !", embed=None, view=None
        )


# ══════════════════════════════════════════════════════════════════════
# DASHBOARD VIEW
# ══════════════════════════════════════════════════════════════════════

class EquipageDashboardView(discord.ui.View):
    def __init__(self, cog, user_id: int, crew, member):
        super().__init__(timeout=120)
        self._cog    = cog
        self._uid    = user_id
        self._crew   = crew
        self._member = member
        self._build()

    def _build(self):
        self.clear_items()
        if not self._crew:
            b1 = discord.ui.Button(label="📋 Candidater",          style=discord.ButtonStyle.primary)
            b2 = discord.ui.Button(label="🏴‍☠️ Créer un équipage",  style=discord.ButtonStyle.success)
            b3 = discord.ui.Button(label="🏆 Classement",           style=discord.ButtonStyle.secondary)
            b1.callback = self._candidater
            b2.callback = self._creer
            b3.callback = self._classement
            self.add_item(b1)
            self.add_item(b2)
            self.add_item(b3)
            return

        b_t = discord.ui.Button(label="🏦 Trésor",    style=discord.ButtonStyle.secondary)
        b_h = discord.ui.Button(label="📜 Historique", style=discord.ButtonStyle.secondary)
        b_t.callback = self._tresor
        b_h.callback = self._historique
        self.add_item(b_t)
        self.add_item(b_h)

        if self._crew['captain_id'] == self._uid:
            b_ca = discord.ui.Button(label="📋 Candidatures", style=discord.ButtonStyle.primary)
            b_di = discord.ui.Button(label="💀 Dissoudre",    style=discord.ButtonStyle.danger)
            b_ca.callback = self._candidatures
            b_di.callback = self._dissoudre
            self.add_item(b_ca)
            self.add_item(b_di)
        else:
            b_q = discord.ui.Button(label="🚪 Quitter", style=discord.ButtonStyle.danger)
            b_q.callback = self._quitter
            self.add_item(b_q)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce n'est pas ton tableau de bord.", ephemeral=True)
            return False
        return True

    # ── boutons sans équipage ──────────────────────────────────────

    async def _classement(self, interaction: discord.Interaction):
        crews = await db.leaderboard_crews(10)
        await interaction.response.send_message(embed=leaderboard_embed(crews), ephemeral=True)

    async def _candidater(self, interaction: discord.Interaction):
        async def _submit(inter, crew_name, message):
            if await db.get_member(self._uid):
                await inter.response.send_message("❌ Tu es déjà dans un équipage.", ephemeral=True)
                return
            target = await db.get_crew_by_name(crew_name)
            if not target:
                await inter.response.send_message("❌ Équipage introuvable.", ephemeral=True)
                return
            if not target['is_recruiting']:
                await inter.response.send_message("❌ Cet équipage ne recrute pas.", ephemeral=True)
                return
            if await db.get_user_pending_application(self._uid, target['id']):
                await inter.response.send_message("❌ Tu as déjà une candidature en attente.", ephemeral=True)
                return
            await inter.response.defer(ephemeral=True)
            await db.create_application(target['id'], self._uid, message)
            cap = inter.guild.get_member(target['captain_id'])
            if cap:
                try:
                    await cap.send(embed=discord.Embed(
                        title=f"📋 Nouvelle candidature — {target['name']}",
                        description=f"<@{self._uid}> souhaite rejoindre.\n\n*{message or 'Aucun message.'}*",
                        color=CREW_COLOR,
                    ))
                except discord.Forbidden:
                    pass
            await inter.followup.send(f"✅ Candidature envoyée à **{target['name']}** !", ephemeral=True)
        await interaction.response.send_modal(CandidaterModal(_submit))

    async def _creer(self, interaction: discord.Interaction):
        uid = self._uid
        if await db.get_member(uid):
            await interaction.response.send_message("❌ Tu es déjà dans un équipage.", ephemeral=True)
            return
        last_leave = await db.last_crew_leave(uid)
        if last_leave:
            dt = datetime.fromisoformat(last_leave.replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - dt).days < CREATE_COOLDOWN_DAYS:
                days_left = CREATE_COOLDOWN_DAYS - (datetime.now(timezone.utc) - dt).days
                await interaction.response.send_message(f"⏳ Encore **{days_left}j** avant de pouvoir créer.", ephemeral=True)
                return

        async def _submit(inter, name, tag, description):
            if not re.match(r'^[A-Z0-9]{' + str(MIN_TAG_LEN) + ',' + str(MAX_TAG_LEN) + r'}$', tag):
                await inter.response.send_message(f"❌ Tag invalide. {MIN_TAG_LEN}–{MAX_TAG_LEN} caractères alphanumériques majuscules.", ephemeral=True)
                return
            name_taken, tag_taken = await db.check_name_and_tag(name, tag)
            if name_taken:
                await inter.response.send_message("❌ Ce nom est déjà pris.", ephemeral=True)
                return
            if tag_taken:
                await inter.response.send_message("❌ Ce tag est déjà pris.", ephemeral=True)
                return
            if not self._cog.bot.spend_berrys(str(uid), COST_CREATE):
                bal = self._cog.bot.get_berrys(str(uid))
                await inter.response.send_message(
                    f"❌ Il te faut **{fmt_berries(COST_CREATE)} 🍊** (tu as **{fmt_berries(bal)} 🍊**).", ephemeral=True
                )
                return
            await inter.response.defer(ephemeral=True)
            crew_id = await db.create_crew(name, tag, description, uid)
            role = await inter.guild.create_role(name=f"🏴‍☠️ {tag}", color=random_role_color())
            cat_id, ch_id, _ = await create_crew_channels(inter.guild, name, tag, role, PARENT_CAT)
            await db.update_crew(crew_id, category_channel_id=cat_id, text_channel_id=ch_id, role_id=role.id)
            await db.add_member(uid, crew_id, 'capitaine')
            await db.add_history(crew_id, uid, 'joined', 'Fondateur')
            await assign_role(inter.guild, uid, role.id)
            await self._cog._log_staff("🏴‍☠️ Crew créé", f"**{name}** [{tag}] par <@{uid}>", 0x2ECC71)
            await inter.followup.send(embed=discord.Embed(
                title="🏴‍☠️ Équipage fondé !",
                description=f"**{name}** [{tag}] est né !\nSalon : <#{ch_id}> · Rôle : <@&{role.id}>",
                color=0x2ECC71,
            ), ephemeral=True)
        await interaction.response.send_modal(CreerCrewModal(_submit))

    # ── boutons membre ─────────────────────────────────────────────

    async def _tresor(self, interaction: discord.Interaction):
        logs, members = await asyncio.gather(
            db.get_treasury_logs(self._crew['id']),
            db.get_crew_members(self._crew['id']),
        )
        await interaction.response.send_message(embed=treasury_embed(self._crew, logs, members), ephemeral=True)

    async def _historique(self, interaction: discord.Interaction):
        events = await db.get_history(self._crew['id'])
        await interaction.response.send_message(embed=history_embed(self._crew, events), ephemeral=True)

    async def _quitter(self, interaction: discord.Interaction):
        if self._crew['captain_id'] == self._uid:
            await interaction.response.send_message(
                "❌ Tu es capitaine. Utilise `/equipage gerer` → Transférer ou Dissoudre.", ephemeral=True
            )
            return
        view = ConfirmView(self._uid, "🚪 Quitter")
        await interaction.response.send_message(f"Quitter **{self._crew['name']}** ?", view=view, ephemeral=True)
        await view.wait()
        if not view.confirmed:
            return
        await db.remove_member(self._uid)
        await db.add_history(self._crew['id'], self._uid, 'left')
        if self._crew.get('role_id'):
            await remove_role(interaction.guild, self._uid, self._crew['role_id'])
        await interaction.edit_original_response(content=f"✅ Tu as quitté **{self._crew['name']}**.", view=None)

    # ── boutons capitaine ──────────────────────────────────────────

    async def _candidatures(self, interaction: discord.Interaction):
        apps = await db.get_pending_applications(self._crew['id'])
        if not apps:
            await interaction.response.send_message("✅ Aucune candidature en attente.", ephemeral=True)
            return
        await interaction.response.send_message(
            embed=applications_embed(self._crew, apps[:1], 1, len(apps)),
            view=ApplicationsView(apps, self._crew, self._cog.bot),
            ephemeral=True,
        )

    async def _dissoudre(self, interaction: discord.Interaction):
        view = ConfirmView(self._uid, "⚠️ Dissoudre définitivement")
        await interaction.response.send_message(
            embed=discord.Embed(
                title="⚠️ Dissoudre l'équipage ?",
                description=(
                    f"**{self._crew['name']}** sera supprimé définitivement.\n"
                    f"**{int(self._crew['treasury'] * DISSOLVE_REFUND):,} 🍊** te seront remboursés.".replace(",", " ")
                ),
                color=discord.Color.red(),
            ),
            view=view, ephemeral=True,
        )
        await view.wait()
        if not view.confirmed:
            return
        members = await db.get_crew_members(self._crew['id'])
        refund = int(self._crew['treasury'] * DISSOLVE_REFUND)
        if refund > 0:
            self._cog.bot.add_berrys(str(self._uid), refund)
        for mem in members:
            await db.remove_member(mem['user_id'])
            if self._crew.get('role_id'):
                await remove_role(interaction.guild, mem['user_id'], self._crew['role_id'])
        await db.dissolve_crew(self._crew['id'])
        await delete_crew_channels(
            interaction.guild,
            self._crew.get('category_channel_id'),
            self._crew.get('text_channel_id'),
            self._crew.get('role_id'),
        )
        await self._cog._log_staff("💀 Crew dissous", f"**{self._crew['name']}** par <@{self._uid}>", 0xFF0000)
        await interaction.edit_original_response(
            embed=discord.Embed(
                title="💀 Équipage dissous",
                description=f"**{self._crew['name']}** n'existe plus.\nRemboursement : **{fmt_berries(refund)} 🍊**",
                color=discord.Color.red(),
            ),
            view=None,
        )


# ══════════════════════════════════════════════════════════════════════
# CONTEST & TOURNAMENT VIEWS
# ══════════════════════════════════════════════════════════════════════

class ContestVoteView(discord.ui.View):
    def __init__(self, contest_id: int, attacker_id: int, defender_id: int | None):
        super().__init__(timeout=7200)
        self._contest_id  = contest_id
        self._attacker_id = attacker_id
        self._defender_id = defender_id

    @discord.ui.button(label="⚔️ Attaquant", style=discord.ButtonStyle.danger)
    async def vote_att(self, interaction: discord.Interaction, button: discord.ui.Button):
        m, crew = await db.get_member_and_crew(interaction.user.id)
        if not crew or crew['id'] != self._attacker_id:
            await interaction.response.send_message(
                "❌ Tu dois être dans l'équipage attaquant pour voter ici.", ephemeral=True
            )
            return
        ok = await db.add_contest_vote(self._contest_id, interaction.user.id, crew['id'])
        if not ok:
            await interaction.response.send_message("❌ Tu as déjà voté.", ephemeral=True)
            return
        await interaction.response.send_message("✅ Vote enregistré !", ephemeral=True)

    @discord.ui.button(label="🛡️ Défenseur", style=discord.ButtonStyle.primary)
    async def vote_def(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not self._defender_id:
            await interaction.response.send_message("❌ Pas de défenseur.", ephemeral=True)
            return
        m, crew = await db.get_member_and_crew(interaction.user.id)
        if not crew or crew['id'] != self._defender_id:
            await interaction.response.send_message(
                "❌ Tu dois être dans l'équipage défenseur pour voter ici.", ephemeral=True
            )
            return
        ok = await db.add_contest_vote(self._contest_id, interaction.user.id, crew['id'])
        if not ok:
            await interaction.response.send_message("❌ Tu as déjà voté.", ephemeral=True)
            return
        await interaction.response.send_message("✅ Vote enregistré !", ephemeral=True)


class TournamentView(discord.ui.View):
    def __init__(self, tournament: dict, entries: list[dict], cog):
        super().__init__(timeout=300)
        self._tournament = tournament
        self._entries    = entries
        self._cog        = cog

    @discord.ui.button(label="🎟️ S'inscrire", style=discord.ButtonStyle.success)
    async def register(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self._tournament['status'] != 'registration':
            await interaction.response.send_message("❌ Les inscriptions sont fermées.", ephemeral=True)
            return
        if len(self._entries) >= self._tournament['max_slots']:
            await interaction.response.send_message("❌ Tournoi complet.", ephemeral=True)
            return
        m, crew = await db.get_member_and_crew(interaction.user.id)
        if not crew or crew['captain_id'] != interaction.user.id:
            await interaction.response.send_message("❌ Seul le capitaine peut inscrire l'équipage.", ephemeral=True)
            return
        if any(e['crew_id'] == crew['id'] for e in self._entries):
            await interaction.response.send_message("❌ Ton équipage est déjà inscrit.", ephemeral=True)
            return
        fee = self._tournament['entry_fee']
        if crew['treasury'] < fee:
            await interaction.response.send_message(
                f"❌ Trésor insuffisant. Il faut **{fmt_berries(fee)} 🍊**.", ephemeral=True
            )
            return
        await db.update_crew(crew['id'], treasury=crew['treasury'] - fee)
        await db.update_crew(self._tournament['id'], prize_pool=self._tournament['prize_pool'] + fee)
        ok = await db.register_tournament(self._tournament['id'], crew['id'])
        if not ok:
            await interaction.response.send_message("❌ Inscription échouée.", ephemeral=True)
            return
        await db.add_treasury_log(crew['id'], interaction.user.id, -fee, 'tournament_fee',
                                   f"Tournoi #{self._tournament['id']}")
        await interaction.response.send_message(
            f"✅ **{crew['name']}** inscrit au tournoi ! Fee : **{fmt_berries(fee)} 🍊** prélevé du trésor.",
            ephemeral=True,
        )


# ══════════════════════════════════════════════════════════════════════
# COG
# ══════════════════════════════════════════════════════════════════════

class CrewCog(CrewTasks, commands.Cog):
    crew = app_commands.Group(
        name="equipage",
        description="🏴‍☠️ Système d'équipages",
        guild_ids=GUILD_IDS,
        default_permissions=discord.Permissions(administrator=True),
    )

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_load(self):
        self._daily_bounty_recalc.start()
        self._war_expire_check.start()
        self._weekly_leaderboard.start()
        self._daily_territory_bonus.start()
        self._weekly_missions.start()
        self._contest_expire_check.start()
        self._tournament_match_expire.start()
        self._vocal_duel_expire_check.start()
        await db.seed_territories(ISLANDS)
        print("[CREWS] Cog chargé ✅")

    async def cog_unload(self):
        self._daily_bounty_recalc.cancel()
        self._war_expire_check.cancel()
        self._weekly_leaderboard.cancel()
        self._daily_territory_bonus.cancel()
        self._weekly_missions.cancel()
        self._contest_expire_check.cancel()
        self._tournament_match_expire.cancel()
        self._vocal_duel_expire_check.cancel()

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
    # 1. /equipage voir — Dashboard complet
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="voir", description="Tableau de bord complet de l'équipage")
    @app_commands.describe(nom="Nom d'un équipage à consulter (optionnel)")
    async def voir(self, interaction: discord.Interaction, nom: str = None):
        await interaction.response.defer()
        if nom:
            crew_obj = await db.get_crew_by_name(nom)
            m = None
        else:
            m, crew_obj = await self._get_user_crew(interaction.user.id)

        if not crew_obj:
            embed = discord.Embed(
                title="🏴‍☠️ Tu n'es dans aucun équipage",
                description="Rejoins un équipage ou fonde le tien !",
                color=CREW_COLOR,
            )
            view = EquipageDashboardView(self, interaction.user.id, None, None)
            await interaction.followup.send(embed=embed, view=view)
            return

        members, alliances, war_data = await asyncio.gather(
            db.get_crew_members(crew_obj['id']),
            db.get_active_alliances(crew_obj['id']),
            db.get_active_war_with_crews(crew_obj['id']),
        )
        war, crew_a, crew_b = war_data
        embed = crew_info_embed(crew_obj, members, alliances, interaction.guild,
                                war=war, war_crew_a=crew_a, war_crew_b=crew_b)

        view = EquipageDashboardView(self, interaction.user.id, crew_obj, m) if not nom else None
        await interaction.followup.send(embed=embed, view=view)

    # ══════════════════════════════════════════════════════════════
    # 2. /equipage creer — Création d'équipage
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="creer", description="Créer un nouvel équipage (30 000 000 🍊)")
    async def creer(self, interaction: discord.Interaction):
        uid = interaction.user.id
        if await db.get_member(uid):
            await interaction.response.send_message("❌ Tu es déjà dans un équipage.", ephemeral=True)
            return
        last_leave = await db.last_crew_leave(uid)
        if last_leave:
            dt = datetime.fromisoformat(last_leave.replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - dt).days < CREATE_COOLDOWN_DAYS:
                days_left = CREATE_COOLDOWN_DAYS - (datetime.now(timezone.utc) - dt).days
                await interaction.response.send_message(f"⏳ Encore **{days_left}j** avant de créer un équipage.", ephemeral=True)
                return

        async def _submit(inter, name, tag, description):
            if not re.match(r'^[A-Z0-9]{' + str(MIN_TAG_LEN) + ',' + str(MAX_TAG_LEN) + r'}$', tag):
                await inter.response.send_message(
                    f"❌ Tag invalide. {MIN_TAG_LEN}–{MAX_TAG_LEN} caractères alphanumériques majuscules.", ephemeral=True
                )
                return
            name_taken, tag_taken = await db.check_name_and_tag(name, tag)
            if name_taken:
                await inter.response.send_message("❌ Ce nom est déjà pris.", ephemeral=True)
                return
            if tag_taken:
                await inter.response.send_message("❌ Ce tag est déjà pris.", ephemeral=True)
                return
            if not self.bot.spend_berrys(str(uid), COST_CREATE):
                bal = self.bot.get_berrys(str(uid))
                await inter.response.send_message(
                    f"❌ Il te faut **{fmt_berries(COST_CREATE)} 🍊** (tu as **{fmt_berries(bal)} 🍊**).", ephemeral=True
                )
                return
            await inter.response.defer(ephemeral=True)
            crew_id = await db.create_crew(name, tag, description, uid)
            role = await inter.guild.create_role(name=f"🏴‍☠️ {tag}", color=random_role_color())
            cat_id, ch_id, _ = await create_crew_channels(inter.guild, name, tag, role, PARENT_CAT)
            await db.update_crew(crew_id, category_channel_id=cat_id, text_channel_id=ch_id, role_id=role.id)
            await db.add_member(uid, crew_id, 'capitaine')
            await db.add_history(crew_id, uid, 'joined', 'Fondateur')
            await assign_role(inter.guild, uid, role.id)
            await self._log_staff("🏴‍☠️ Crew créé", f"**{name}** [{tag}] par <@{uid}>", 0x2ECC71)
            await inter.followup.send(embed=discord.Embed(
                title="🏴‍☠️ Équipage fondé !",
                description=(
                    f"**{name}** [{tag}] est né !\n\n"
                    f"Salon : <#{ch_id}>\nRôle : <@&{role.id}>\n"
                    f"Solde restant : **{fmt_berries(self.bot.get_berrys(str(uid)))} 🍊**"
                ),
                color=0x2ECC71,
            ), ephemeral=True)

        await interaction.response.send_modal(CreerCrewModal(_submit))

    # ══════════════════════════════════════════════════════════════
    # 3. /equipage gerer <action>
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="gerer", description="Gérer ton équipage (drapeau, membres, trésor…)")
    @app_commands.describe(action="L'action à effectuer")
    @app_commands.choices(action=GERER_CHOICES)
    async def gerer(self, interaction: discord.Interaction, action: str):
        m, crew_obj = await self._get_user_crew(interaction.user.id)
        if not crew_obj:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return

        # ── drapeau ───────────────────────────────────────────────
        if action == "drapeau":
            if not has_perm(m['position'], 'manage_all'):
                await interaction.response.send_message("❌ Seul le capitaine peut changer le drapeau.", ephemeral=True)
                return
            async def _cb(inter, url):
                if not url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                    await inter.response.send_message("❌ Format non supporté (PNG/JPG/GIF/WEBP).", ephemeral=True)
                    return
                await db.update_crew(crew_obj['id'], flag_url=url)
                await inter.response.send_message(
                    embed=discord.Embed(title="🏴‍☠️ Drapeau mis à jour !", color=0x2ECC71).set_image(url=url),
                    ephemeral=True,
                )
            await interaction.response.send_modal(DerapeauModal(_cb))

        # ── candidatures ──────────────────────────────────────────
        elif action == "candidatures":
            if not has_perm(m['position'], 'manage_members'):
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            apps = await db.get_pending_applications(crew_obj['id'])
            if not apps:
                await interaction.response.send_message("✅ Aucune candidature en attente.", ephemeral=True)
                return
            await interaction.response.send_message(
                embed=applications_embed(crew_obj, apps[:1], 1, len(apps)),
                view=ApplicationsView(apps, crew_obj, self.bot),
                ephemeral=True,
            )

        # ── kick ──────────────────────────────────────────────────
        elif action == "kick":
            if not has_perm(m['position'], 'manage_members'):
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            members = await db.get_crew_members(crew_obj['id'])
            view = MembresKickView(crew_obj, members)
            if not view.children:
                await interaction.response.send_message("❌ Aucun membre à expulser.", ephemeral=True)
                return
            await interaction.response.send_message("Choisir le membre à expulser :", view=view, ephemeral=True)

        # ── recrutement ───────────────────────────────────────────
        elif action == "recrutement":
            if not has_perm(m['position'], 'manage_members'):
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            new_state = not crew_obj['is_recruiting']
            await db.update_crew(crew_obj['id'], is_recruiting=new_state)
            status = "✅ Ouvert" if new_state else "🔒 Fermé"
            await interaction.response.send_message(f"Recrutement : **{status}**", ephemeral=True)

        # ── promouvoir ────────────────────────────────────────────
        elif action == "promouvoir":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut promouvoir.", ephemeral=True)
                return
            members = await db.get_crew_members(crew_obj['id'])
            await interaction.response.send_message(
                "Sélectionne le membre puis son nouveau poste :",
                view=PromouvoirView(crew_obj, members),
                ephemeral=True,
            )

        # ── transfert ─────────────────────────────────────────────
        elif action == "transfert":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut transférer.", ephemeral=True)
                return
            members = await db.get_crew_members(crew_obj['id'])
            opts = [
                discord.SelectOption(
                    label=f"{POSITIONS.get(mem['position'], {}).get('emoji','👤')} {mem['position']} · ID {mem['user_id']}",
                    value=str(mem['user_id']),
                )
                for mem in members if mem['user_id'] != interaction.user.id
            ][:25]
            if not opts:
                await interaction.response.send_message("❌ Aucun membre disponible.", ephemeral=True)
                return

            uid_cap = interaction.user.id
            cog_ref = self

            class TransfertView(discord.ui.View):
                def __init__(self):
                    super().__init__(timeout=60)
                    sel = discord.ui.Select(placeholder="Nouveau capitaine...", options=opts)
                    sel.callback = self._do
                    self.add_item(sel)

                async def _do(self, inter: discord.Interaction):
                    new_id = int(inter.data['values'][0])
                    target = await db.get_member(new_id)
                    if not target or target['crew_id'] != crew_obj['id']:
                        await inter.response.send_message("❌ Membre introuvable.", ephemeral=True)
                        return
                    view2 = ConfirmView(uid_cap, "👑 Confirmer le transfert")
                    await inter.response.send_message(f"⚠️ Transférer à <@{new_id}> ?", view=view2, ephemeral=True)
                    await view2.wait()
                    if not view2.confirmed:
                        return
                    await asyncio.gather(
                        db.update_crew(crew_obj['id'], captain_id=new_id),
                        db.update_member_position(uid_cap, 'second'),
                        db.update_member_position(new_id, 'capitaine'),
                        db.add_history(crew_obj['id'], uid_cap, 'demoted', f"transfert à <@{new_id}>"),
                        db.add_history(crew_obj['id'], new_id, 'promoted', 'nouveau capitaine'),
                    )
                    await inter.edit_original_response(content=f"✅ <@{new_id}> est le nouveau capitaine !", view=None)

            await interaction.response.send_message("Choisir le nouveau capitaine :", view=TransfertView(), ephemeral=True)

        # ── retrait ───────────────────────────────────────────────
        elif action == "retrait":
            if not has_perm(m['position'], 'manage_treasury'):
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            async def _cb(inter, amount, raison):
                if amount <= 0 or amount > crew_obj['treasury']:
                    await inter.response.send_message("❌ Montant invalide ou trésor insuffisant.", ephemeral=True)
                    return
                await db.update_crew(crew_obj['id'], treasury=crew_obj['treasury'] - amount)
                self.bot.add_berrys(str(interaction.user.id), amount)
                await db.add_treasury_log(crew_obj['id'], interaction.user.id, -amount, 'withdraw', raison)
                await inter.response.send_message(
                    f"✅ **{fmt_berries(amount)} 🍊** retirés. Raison : *{raison}*", ephemeral=True
                )
            await interaction.response.send_modal(RetraitModal(_cb))

        # ── don ───────────────────────────────────────────────────
        elif action == "don":
            if not has_perm(m['position'], 'manage_treasury'):
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            async def _cb(inter, uid, montant):
                if montant <= 0 or montant > crew_obj['treasury']:
                    await inter.response.send_message("❌ Montant invalide ou trésor insuffisant.", ephemeral=True)
                    return
                target = await db.get_member(uid)
                if not target or target['crew_id'] != crew_obj['id']:
                    await inter.response.send_message("❌ Ce membre n'est pas dans l'équipage.", ephemeral=True)
                    return
                await db.update_crew(crew_obj['id'], treasury=crew_obj['treasury'] - montant)
                self.bot.add_berrys(str(uid), montant)
                await db.add_treasury_log(crew_obj['id'], interaction.user.id, -montant, 'don', f"à <@{uid}>")
                await inter.response.send_message(f"✅ **{fmt_berries(montant)} 🍊** envoyés à <@{uid}>.", ephemeral=True)
            await interaction.response.send_modal(DonModal(_cb))

        # ── renommer ──────────────────────────────────────────────
        elif action == "renommer":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut renommer.", ephemeral=True)
                return
            async def _cb(inter, new_name):
                if await db.get_crew_by_name(new_name):
                    await inter.response.send_message("❌ Ce nom est déjà pris.", ephemeral=True)
                    return
                if not self.bot.spend_berrys(str(interaction.user.id), COST_RENAME):
                    await inter.response.send_message(f"❌ Il te faut **{fmt_berries(COST_RENAME)} 🍊**.", ephemeral=True)
                    return
                await db.update_crew(crew_obj['id'], name=new_name)
                await inter.response.send_message(f"✅ L'équipage s'appelle maintenant **{new_name}** !", ephemeral=True)
            await interaction.response.send_modal(RenommerModal(_cb))

        # ── dissoudre ─────────────────────────────────────────────
        elif action == "dissoudre":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut dissoudre.", ephemeral=True)
                return
            view = ConfirmView(interaction.user.id, "⚠️ Dissoudre définitivement")
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="⚠️ Dissoudre l'équipage ?",
                    description=(
                        f"**{crew_obj['name']}** sera supprimé définitivement.\n"
                        f"**{int(crew_obj['treasury'] * DISSOLVE_REFUND):,} 🍊** te seront remboursés.".replace(",", " ")
                    ),
                    color=discord.Color.red(),
                ),
                view=view, ephemeral=True,
            )
            await view.wait()
            if not view.confirmed:
                return
            members = await db.get_crew_members(crew_obj['id'])
            refund = int(crew_obj['treasury'] * DISSOLVE_REFUND)
            if refund > 0:
                self.bot.add_berrys(str(interaction.user.id), refund)
            for mem in members:
                await db.remove_member(mem['user_id'])
                if crew_obj.get('role_id'):
                    await remove_role(interaction.guild, mem['user_id'], crew_obj['role_id'])
            await db.dissolve_crew(crew_obj['id'])
            await delete_crew_channels(
                interaction.guild,
                crew_obj.get('category_channel_id'),
                crew_obj.get('text_channel_id'),
                crew_obj.get('role_id'),
            )
            await self._log_staff("💀 Crew dissous", f"**{crew_obj['name']}** par <@{interaction.user.id}>", 0xFF0000)
            await interaction.edit_original_response(
                embed=discord.Embed(
                    title="💀 Équipage dissous",
                    description=f"**{crew_obj['name']}** n'existe plus.\nRemboursement : **{fmt_berries(refund)} 🍊**",
                    color=discord.Color.red(),
                ),
                view=None,
            )

    # ══════════════════════════════════════════════════════════════
    # 4. /equipage guerre <action> [cible] [ennemi]
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="guerre", description="Guerres et alliances")
    @app_commands.describe(
        action="L'action à effectuer",
        cible="Nom de l'équipage cible (déclarer / allier / trahir)",
        ennemi="Membre ennemi à attaquer (attaquer)",
    )
    @app_commands.choices(action=GUERRE_CHOICES)
    async def guerre(self, interaction: discord.Interaction,
                     action: str,
                     cible: str = None,
                     ennemi: discord.Member = None):
        m, crew_obj = await self._get_user_crew(interaction.user.id)
        if not crew_obj:
            await interaction.response.send_message("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return

        # ── stats ─────────────────────────────────────────────────
        if action == "stats":
            war, crew_a, crew_b = await db.get_active_war_with_crews(crew_obj['id'])
            if not war:
                await interaction.response.send_message("❌ Aucune guerre en cours.", ephemeral=True)
                return
            top = await db.get_war_top_contributors(war['id'])
            await interaction.response.send_message(embed=war_status_embed(war, crew_a, crew_b, top))
            return

        # ── attaquer ──────────────────────────────────────────────
        if action == "attaquer":
            if not ennemi:
                await interaction.response.send_message("❌ Précise l'ennemi à attaquer (param `ennemi`).", ephemeral=True)
                return
            _, en_crew = await self._get_user_crew(ennemi.id)
            war = await db.get_active_war(crew_obj['id'])
            if not war or war['status'] != 'active':
                await interaction.response.send_message("❌ Ton équipage n'est pas en guerre active.", ephemeral=True)
                return
            if not en_crew or en_crew['id'] not in (war['attacker_id'], war['defender_id']):
                await interaction.response.send_message("❌ Cet ennemi n'est pas dans la guerre en cours.", ephemeral=True)
                return
            if en_crew['id'] == crew_obj['id']:
                await interaction.response.send_message("❌ Tu ne peux pas attaquer un coéquipier.", ephemeral=True)
                return
            if ennemi.id == interaction.user.id:
                await interaction.response.send_message("❌ Tu ne peux pas t'attaquer toi-même.", ephemeral=True)
                return
            last = await db.get_last_battle_time(war['id'], interaction.user.id)
            if last:
                dt      = datetime.fromisoformat(last.replace("Z", "+00:00"))
                elapsed = (datetime.now(timezone.utc) - dt).total_seconds()
                if elapsed < 1800:
                    rem = int(1800 - elapsed)
                    await interaction.response.send_message(
                        f"⏳ Cooldown : **{rem // 60}min {rem % 60}s** avant le prochain duel.", ephemeral=True
                    )
                    return

            # Probabilité basée sur le poste + différence de niveau
            pos_bonus   = POSITION_WAR_BONUS.get(m['position'], 0.0)
            level_bonus = min(0.15, max(-0.15, (crew_obj['level'] - en_crew['level']) * 0.025))
            win_prob    = min(0.80, max(0.20, 0.50 + pos_bonus + level_bonus))
            won         = random.random() < win_prob
            pts         = 10 if won else 0

            coros = [
                db.add_battle(war['id'], interaction.user.id, crew_obj['id'],
                              ennemi.id, 'won' if won else 'lost', pts),
            ]
            if won:
                coros += [
                    db.update_war_score(war['id'], crew_obj['id'], pts),
                    award_xp(self.bot, crew_obj['id'], XP_DUEL_WIN),
                    db.add_contribution(interaction.user.id, CONTRIBUTION_DUEL_WIN),
                ]
            else:
                coros.append(award_xp(self.bot, crew_obj['id'], XP_DUEL_LOSS))
            await asyncio.gather(*coros)

            war_upd = await db.get_war(war['id'])
            pos_emoji = POSITIONS.get(m['position'], {}).get('emoji', '👤')
            embed = discord.Embed(
                title=f"⚔️ Duel — {'✅ Victoire !' if won else '❌ Défaite'}",
                description=(
                    f"{pos_emoji} <@{interaction.user.id}> (*{m['position']}*, {int(win_prob * 100)}% chance)"
                    f" vs <@{ennemi.id}>\n"
                    f"{'🟢' if won else '🔴'} **{'+10 pts' if won else '+0 pts'}** · "
                    f"XP : +**{XP_DUEL_WIN if won else XP_DUEL_LOSS}**"
                ),
                color=0x2ECC71 if won else 0xFF4444,
            )
            if war_upd:
                att_c, def_c = await asyncio.gather(
                    db.get_crew(war_upd['attacker_id']),
                    db.get_crew(war_upd['defender_id']),
                )
                att_name = att_c['name'] if att_c else '?'
                def_name = def_c['name'] if def_c else '?'
                att_s    = war_upd['attacker_score']
                def_s    = war_upd['defender_score']
                leader   = att_name if att_s >= def_s else def_name
                embed.add_field(
                    name="📊 Score actuel",
                    value=f"🏴‍☠️ **{att_name}** : **{att_s}** pts  ·  🏴‍☠️ **{def_name}** : **{def_s}** pts\n🏆 En tête : **{leader}**",
                    inline=False,
                )
                if war_upd.get('ends_at'):
                    embed.set_footer(text=f"⏰ Fin de la guerre")
                    embed.timestamp = war_upd['ends_at']
            await interaction.response.send_message(embed=embed)
            return

        # ── saboter ───────────────────────────────────────────────
        if action == "saboter":
            war = await db.get_active_war(crew_obj['id'])
            if not war or war['status'] != 'active':
                await interaction.response.send_message("❌ Ton équipage n'est pas en guerre active.", ephemeral=True)
                return
            count = await db.get_war_sabotages_today(war['id'], interaction.user.id)
            if count >= 1:
                await interaction.response.send_message(
                    "❌ Tu as déjà saboté aujourd'hui. Reviens dans **24h** !", ephemeral=True
                )
                return
            wallet = self.bot.get_berrys(str(interaction.user.id))
            if wallet < SABOTAGE_COST:
                await interaction.response.send_message(
                    f"❌ Il te faut **{fmt_berries(SABOTAGE_COST)} 🍊** en poche pour saboter.", ephemeral=True
                )
                return
            enemy_crew_id = war['defender_id'] if war['attacker_id'] == crew_obj['id'] else war['attacker_id']
            self.bot.spend_berrys(str(interaction.user.id), SABOTAGE_COST)
            await asyncio.gather(
                db.subtract_war_score(war['id'], enemy_crew_id, SABOTAGE_POINTS_STOLEN),
                db.add_battle(war['id'], interaction.user.id, crew_obj['id'], 0, 'sabotage', 0),
                award_xp(self.bot, crew_obj['id'], XP_SABOTAGE),
            )
            war_upd = await db.get_war(war['id'])
            enemy_crew = await db.get_crew(enemy_crew_id)
            embed = discord.Embed(
                title="💣 Sabotage réussi !",
                description=(
                    f"<@{interaction.user.id}> a dépensé **{fmt_berries(SABOTAGE_COST)} 🍊** pour saboter "
                    f"**{enemy_crew['name'] if enemy_crew else 'l\'ennemi'}** !\n\n"
                    f"💥 **-{SABOTAGE_POINTS_STOLEN} points** retirés de leur score.\n"
                    f"⏰ Prochain sabotage disponible dans **24h**."
                ),
                color=0xFF6600,
            )
            if war_upd:
                att_s = war_upd['attacker_score']
                def_s = war_upd['defender_score']
                att_c = await db.get_crew(war_upd['attacker_id'])
                def_c = await db.get_crew(war_upd['defender_id'])
                embed.add_field(
                    name="📊 Score après sabotage",
                    value=(
                        f"🏴‍☠️ **{att_c['name'] if att_c else '?'}** : **{att_s}** pts  ·  "
                        f"🏴‍☠️ **{def_c['name'] if def_c else '?'}** : **{def_s}** pts"
                    ),
                    inline=False,
                )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return

        # ── déclarer ──────────────────────────────────────────────
        if action == "declarer":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut déclarer.", ephemeral=True)
                return
            if not can_feature(crew_obj['level'], 'wars'):
                await interaction.response.send_message("❌ Les guerres se débloquent au niveau 4.", ephemeral=True)
                return
            if await db.get_active_war(crew_obj['id']):
                await interaction.response.send_message("❌ Tu as déjà une guerre en cours.", ephemeral=True)
                return
            async def _cb(inter, crew_name, mise, duree_h):
                if mise < MIN_WAR_BET:
                    await inter.response.send_message(f"❌ Mise minimum : **{fmt_berries(MIN_WAR_BET)} 🍊**.", ephemeral=True)
                    return
                if not (MIN_WAR_HOURS <= duree_h <= MAX_WAR_HOURS):
                    await inter.response.send_message(f"❌ Durée : {MIN_WAR_HOURS}–{MAX_WAR_HOURS}h.", ephemeral=True)
                    return
                if crew_obj['treasury'] < mise:
                    await inter.response.send_message("❌ Trésor insuffisant.", ephemeral=True)
                    return
                target = await db.get_crew_by_name(crew_name)
                if not target or target['id'] == crew_obj['id']:
                    await inter.response.send_message("❌ Équipage introuvable.", ephemeral=True)
                    return
                ally = await db.get_alliance(crew_obj['id'], target['id'])
                if ally and ally['status'] == 'active':
                    await inter.response.send_message("❌ Tu ne peux pas attaquer un allié.", ephemeral=True)
                    return
                if target['treasury'] < mise:
                    await inter.response.send_message(f"❌ {target['name']} n'a pas assez dans son trésor.", ephemeral=True)
                    return
                if await db.get_recent_war_between(crew_obj['id'], target['id'], WAR_COOLDOWN_DAYS):
                    await inter.response.send_message(
                        f"❌ Cooldown actif — tu dois attendre **{WAR_COOLDOWN_DAYS} jours** après une guerre contre cet équipage.",
                        ephemeral=True,
                    )
                    return
                await db.update_crew(crew_obj['id'], treasury=crew_obj['treasury'] - mise)
                war_id = await db.declare_war(crew_obj['id'], target['id'], mise * 2, duree_h)
                cap = inter.guild.get_member(target['captain_id'])
                view = WarResponseView(war_id, target['captain_id'], self.bot)
                if cap:
                    try:
                        await cap.send(embed=discord.Embed(
                            title="⚔️ Déclaration de Guerre !",
                            description=f"**{crew_obj['name']}** vous déclare la guerre !\nMise : **{fmt_berries(mise * 2)} 🍊** · Durée : **{duree_h}h**",
                            color=0xFF4444,
                        ), view=view)
                    except discord.Forbidden:
                        pass
                ch = self.bot.get_channel(ANNOUNCE_CH)
                if ch:
                    await ch.send(embed=discord.Embed(
                        title="⚔️ Déclaration de Guerre !",
                        description=f"**{crew_obj['name']}** a déclaré la guerre à **{target['name']}** !",
                        color=0xFF4444,
                    ))
                await inter.response.send_message(
                    f"⚔️ Guerre déclarée à **{target['name']}** ! Mise bloquée : **{fmt_berries(mise)} 🍊**.", ephemeral=True
                )
            await interaction.response.send_modal(DeclararModal(_cb))
            return

        # ── allier ────────────────────────────────────────────────
        if action == "allier":
            if not can_feature(crew_obj['level'], 'alliances'):
                await interaction.response.send_message("❌ Les alliances se débloquent au niveau 3.", ephemeral=True)
                return
            if not has_perm(m['position'], 'manage_alliances') and m['position'] != 'capitaine':
                await interaction.response.send_message("❌ Permission refusée.", ephemeral=True)
                return
            if not cible:
                await interaction.response.send_message("❌ Précise l'équipage cible (param `cible`).", ephemeral=True)
                return
            target = await db.get_crew_by_name(cible)
            if not target or target['id'] == crew_obj['id']:
                await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
                return
            existing = await db.get_alliance(crew_obj['id'], target['id'])
            if existing and existing['status'] == 'active':
                await interaction.response.send_message("❌ Vous êtes déjà alliés.", ephemeral=True)
                return
            await db.propose_alliance(crew_obj['id'], target['id'], interaction.user.id)
            cap = interaction.guild.get_member(target['captain_id'])
            view = AllianceResponseView(target['id'], crew_obj['id'], target['captain_id'], self.bot)
            if cap:
                try:
                    await cap.send(embed=discord.Embed(
                        title="🤝 Proposition d'alliance",
                        description=f"**{crew_obj['name']}** te propose une alliance !",
                        color=0x9B59B6,
                    ), view=view)
                except discord.Forbidden:
                    pass
            await interaction.response.send_message(f"✅ Proposition envoyée à **{target['name']}**.", ephemeral=True)
            return

        # ── trahir ────────────────────────────────────────────────
        if action == "trahir":
            if crew_obj['captain_id'] != interaction.user.id:
                await interaction.response.send_message("❌ Seul le capitaine peut rompre une alliance.", ephemeral=True)
                return
            if not cible:
                await interaction.response.send_message("❌ Précise l'équipage allié (param `cible`).", ephemeral=True)
                return
            target = await db.get_crew_by_name(cible)
            if not target:
                await interaction.response.send_message("❌ Équipage introuvable.", ephemeral=True)
                return
            ally = await db.get_alliance(crew_obj['id'], target['id'])
            if not ally or ally['status'] != 'active':
                await interaction.response.send_message("❌ Vous n'êtes pas alliés.", ephemeral=True)
                return
            view = ConfirmView(interaction.user.id, "🗡️ Confirmer la trahison")
            await interaction.response.send_message(
                f"⚠️ Rompre l'alliance avec **{target['name']}** sera visible publiquement.", view=view, ephemeral=True
            )
            await view.wait()
            if not view.confirmed:
                return
            await db.break_alliance(crew_obj['id'], target['id'], interaction.user.id)
            ch = self.bot.get_channel(ANNOUNCE_CH)
            if ch:
                await ch.send(embed=discord.Embed(
                    title="🗡️ Alliance Rompue !",
                    description=f"**{crew_obj['name']}** a trahi **{target['name']}** !",
                    color=0xFF0000,
                ))
            await interaction.edit_original_response(content=f"Alliance avec **{target['name']}** rompue.", view=None)

    @guerre.autocomplete('cible')
    async def guerre_cible_autocomplete(self, interaction: discord.Interaction, current: str):
        crews, _ = await db.list_crews(False, 0, 25)
        return [
            app_commands.Choice(name=c['name'], value=c['name'])
            for c in crews if current.lower() in c['name'].lower()
        ][:25]

    # ══════════════════════════════════════════════════════════════
    # 5. /equipage liste
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="liste", description="Liste tous les équipages actifs")
    @app_commands.describe(recrutement="Afficher uniquement les équipages qui recrutent")
    async def liste(self, interaction: discord.Interaction, recrutement: bool = False):
        await interaction.response.defer()
        crews, total = await db.list_crews(recruiting_only=recrutement, limit=10)
        if not crews:
            await interaction.followup.send("Aucun équipage actif.", ephemeral=True)
            return
        from .leaderboard import generate_leaderboard_image
        file  = generate_leaderboard_image(crews)
        embed = leaderboard_embed(crews)
        embed.title = "📋 Équipages Actifs" + (" (recrutement)" if recrutement else "")
        embed.set_footer(text=f"{total} équipage(s) au total")
        embed.set_image(url="attachment://leaderboard.png")
        view = CrewListView(crews, total, recruiting_only=recrutement)
        await interaction.followup.send(embed=embed, file=file, view=view)

    # ══════════════════════════════════════════════════════════════
    # 6. /equipage missions
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="missions", description="Missions hebdomadaires de l'équipage")
    async def missions(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        m, crew_obj = await self._get_user_crew(interaction.user.id)
        if not crew_obj:
            await interaction.followup.send("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        active_missions = await db.get_active_missions(crew_obj['id'])
        if not active_missions:
            # Génération à la demande si pas encore générées
            import random
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            diff = mission_difficulty(crew_obj['level'])
            templates = random.sample(MISSION_TEMPLATES, min(MISSIONS_PER_CREW, len(MISSION_TEMPLATES)))
            for tpl in templates:
                lvl_data = tpl['levels'][diff]
                label    = tpl['label'].format(target=lvl_data['target'])
                await db.create_mission(
                    crew_obj['id'], tpl['type'], label,
                    lvl_data['target'], lvl_data['xp'], lvl_data['gold'],
                    expires_at,
                )
            active_missions = await db.get_active_missions(crew_obj['id'])
        await interaction.followup.send(
            embed=missions_embed(crew_obj, active_missions), ephemeral=True
        )

    # ══════════════════════════════════════════════════════════════
    # 7. /equipage territoires + /equipage attaquer-ile
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="territoires", description="Carte des territoires — voir les îles et leurs propriétaires")
    async def territoires(self, interaction: discord.Interaction):
        await interaction.response.defer()
        territories = await db.get_all_territories()
        owner_ids   = {t['owner_crew_id'] for t in territories if t.get('owner_crew_id')}
        crews_list  = await db.get_crews_by_ids(list(owner_ids))
        crews_map   = {c['id']: c for c in crews_list}
        await interaction.followup.send(embed=territories_embed(territories, crews_map))

    @crew.command(name="attaquer-ile", description="Attaquer une île pour la conquérir (dure 2h)")
    @app_commands.describe(ile="Clé de l'île (ex: wano, dressrosa, egghead…)")
    async def attaquer_ile(self, interaction: discord.Interaction, ile: str):
        await interaction.response.defer(ephemeral=True)
        m, crew_obj = await self._get_user_crew(interaction.user.id)
        if not crew_obj:
            await interaction.followup.send("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew_obj['captain_id'] != interaction.user.id:
            await interaction.followup.send("❌ Seul le capitaine peut lancer une attaque.", ephemeral=True)
            return

        territory = await db.get_territory(ile.lower())
        if not territory:
            await interaction.followup.send(
                f"❌ Île inconnue. Utilise `/equipage territoires` pour voir la liste.", ephemeral=True
            )
            return
        if territory.get('owner_crew_id') == crew_obj['id']:
            await interaction.followup.send("❌ Tu contrôles déjà cette île.", ephemeral=True)
            return
        existing = await db.get_active_contest(ile.lower())
        if existing:
            await interaction.followup.send("❌ Une contestation est déjà en cours sur cette île.", ephemeral=True)
            return

        ends_at     = datetime.now(timezone.utc) + timedelta(minutes=120)
        defender_id = territory.get('owner_crew_id')
        contest_id  = await db.create_contest(ile.lower(), crew_obj['id'], defender_id, ends_at)

        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            view = ContestVoteView(contest_id, crew_obj['id'], defender_id)
            defender_name = ""
            if defender_id:
                def_crew = await db.get_crew(defender_id)
                defender_name = f"Défenseur : **{def_crew['name'] if def_crew else '?'}**" if def_crew else ""
            embed = discord.Embed(
                title=f"⚔️ Attaque sur {territory['zone_emoji']} {territory['zone_name']} !",
                description=(
                    f"**{crew_obj['name']}** attaque l'île **{territory['zone_name']}** !\n"
                    f"{defender_name if defender_name else 'Île libre — premier à voter gagne !'}\n\n"
                    f"Votez pour soutenir votre camp. Fin : <t:{int(ends_at.timestamp())}:R>"
                ),
                color=0xFF6600,
            )
            await ch.send(embed=embed, view=view)

        await interaction.followup.send(
            f"⚔️ Attaque lancée sur **{territory['zone_name']}** ! La communauté a 2h pour voter.",
            ephemeral=True,
        )

    # ══════════════════════════════════════════════════════════════
    # 8. /equipage tournoi + /equipage tournoi-creer + /equipage tournoi-demarrer
    # ══════════════════════════════════════════════════════════════

    @crew.command(name="tournoi", description="Voir le tournoi en cours ou s'inscrire")
    async def tournoi(self, interaction: discord.Interaction):
        await interaction.response.defer()
        tournament = await db.get_open_tournament()
        if not tournament:
            await interaction.followup.send(embed=discord.Embed(
                title="🏆 Tournoi des Équipages",
                description="*Aucun tournoi en cours.*\nUn admin peut en lancer un avec `/equipage tournoi-creer`.",
                color=0xFFD700,
            ))
            return
        entries = await db.get_tournament_entries(tournament['id'])
        await interaction.followup.send(
            embed=tournament_embed(tournament, entries),
            view=TournamentView(tournament, entries, self),
        )

    @crew.command(name="tournoi-creer", description="[Admin] Créer un nouveau tournoi")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(fee="Frais d'inscription (défaut 500 000 🍊)", slots="Nombre de places (4 ou 8)")
    async def tournoi_creer(self, interaction: discord.Interaction,
                             fee: int = 500_000, slots: int = 8):
        await interaction.response.defer(ephemeral=True)
        existing = await db.get_open_tournament()
        if existing:
            await interaction.followup.send("❌ Un tournoi est déjà ouvert.", ephemeral=True)
            return
        if slots not in (4, 8):
            await interaction.followup.send("❌ slots doit être 4 ou 8.", ephemeral=True)
            return
        t_id = await db.create_tournament(fee, slots)
        await interaction.followup.send(
            f"✅ Tournoi #{t_id} créé ! Inscriptions ouvertes · Fee : **{fmt_berries(fee)} 🍊** · {slots} places.",
            ephemeral=True,
        )

    @crew.command(name="tournoi-demarrer", description="[Admin] Démarrer le tournoi et générer le bracket")
    @app_commands.default_permissions(administrator=True)
    async def tournoi_demarrer(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        tournament = await db.get_open_tournament()
        if not tournament or tournament['status'] != 'registration':
            await interaction.followup.send("❌ Aucun tournoi en inscription.", ephemeral=True)
            return
        entries = await db.get_tournament_entries(tournament['id'])
        if len(entries) < 2:
            await interaction.followup.send("❌ Il faut au moins 2 équipages.", ephemeral=True)
            return
        matches = await db.start_tournament(tournament['id'])
        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            lines = []
            for match in matches:
                a = await db.get_crew(match['crew_a_id'])
                b = await db.get_crew(match['crew_b_id'])
                lines.append(f"⚔️ **{a['name'] if a else '?'}** vs **{b['name'] if b else '?'}**")
            await ch.send(embed=discord.Embed(
                title="🏆 Tournoi Lancé !",
                description="\n".join(lines) + f"\n\nMatchs durent **24h** — utilisez `/equipage guerre attaquer` !",
                color=0xFFD700,
            ))
        await interaction.followup.send(f"✅ Tournoi démarré ! {len(matches)} matchs générés.", ephemeral=True)


    # ══════════════════════════════════════════════════════════════════
    # 9. /equipage duel-vocal
    # ══════════════════════════════════════════════════════════════════

    @crew.command(name="duel-vocal", description="Défie un équipage en vocal avec un arbitre neutre")
    @app_commands.describe(
        cible="Nom de l'équipage à défier",
        mise="Mise en Berrys (défaut 100 000 🍊)",
    )
    async def duel_vocal(self, interaction: discord.Interaction,
                          cible: str, mise: int = VOCAL_DUEL_STAKE_DEFAULT):
        await interaction.response.defer(ephemeral=True)
        m, crew_obj = await self._get_user_crew(interaction.user.id)
        if not crew_obj:
            await interaction.followup.send("❌ Tu n'es dans aucun équipage.", ephemeral=True)
            return
        if crew_obj['captain_id'] != interaction.user.id:
            await interaction.followup.send("❌ Seul le capitaine peut lancer un défi.", ephemeral=True)
            return
        if crew_obj['treasury'] < mise:
            await interaction.followup.send(
                f"❌ Trésor insuffisant ({fmt_berries(crew_obj['treasury'])} 🍊 < mise {fmt_berries(mise)} 🍊).",
                ephemeral=True,
            )
            return

        existing = await db.get_active_vocal_duel_for_crew(crew_obj['id'])
        if existing:
            await interaction.followup.send("❌ Un duel vocal est déjà en cours pour ton équipage.", ephemeral=True)
            return

        target = await db.get_crew_by_name(cible)
        if not target or target['id'] == crew_obj['id']:
            await interaction.followup.send("❌ Équipage introuvable.", ephemeral=True)
            return
        if target['treasury'] < mise:
            await interaction.followup.send(
                f"❌ **{target['name']}** n'a pas assez dans son trésor pour cette mise.",
                ephemeral=True,
            )
            return

        existing_opp = await db.get_active_vocal_duel_for_crew(target['id'])
        if existing_opp:
            await interaction.followup.send("❌ Cet équipage a déjà un duel vocal en cours.", ephemeral=True)
            return

        accept_deadline = datetime.now(timezone.utc) + timedelta(minutes=VOCAL_DUEL_ACCEPT_MINUTES)
        ends_at         = datetime.now(timezone.utc) + timedelta(minutes=VOCAL_DUEL_ACCEPT_MINUTES + VOCAL_DUEL_DURATION_MINUTES)
        duel_id = await db.create_vocal_duel(crew_obj['id'], target['id'], mise, accept_deadline, ends_at)

        cap_opp = interaction.guild.get_member(target['captain_id'])
        view    = VocalDuelResponseView(duel_id, crew_obj, target, self)

        embed = discord.Embed(
            title="🎙️ Défi en vocal !",
            description=(
                f"**{crew_obj['name']}** vous défie en duel vocal !\n\n"
                f"💰 Mise : **{fmt_berries(mise)} 🍊** de chaque côté\n"
                f"⏱️ Vous avez **{VOCAL_DUEL_ACCEPT_MINUTES} min** pour répondre."
            ),
            color=0x5865F2,
        )

        if cap_opp:
            try:
                await cap_opp.send(embed=embed, view=view)
            except discord.Forbidden:
                pass

        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            await ch.send(embed=discord.Embed(
                title="🎙️ Défi en vocal lancé !",
                description=f"**{crew_obj['name']}** défie **{target['name']}** en duel vocal ! Le capitaine adverse doit répondre.",
                color=0x5865F2,
            ))

        await interaction.followup.send(
            f"⚔️ Défi envoyé à **{target['name']}** ! En attente de réponse ({VOCAL_DUEL_ACCEPT_MINUTES} min).",
            ephemeral=True,
        )

    async def _start_vocal_duel(self, interaction: discord.Interaction,
                                  duel_id: int, chall_crew: dict, opp_crew: dict):
        guild = interaction.guild

        # Créer le salon vocal temporaire
        cat = guild.get_channel(PARENT_CAT) if PARENT_CAT else None
        try:
            vc = await guild.create_voice_channel(
                f"⚔️ Duel {chall_crew['tag']} vs {opp_crew['tag']}",
                category=cat,
                reason="Duel vocal arbitré",
            )
        except discord.Forbidden:
            vc = None

        # Trouver un arbitre neutre (membre du serveur hors des deux équipages)
        chall_members = {m2['user_id'] for m2 in await db.get_crew_members(chall_crew['id'])}
        opp_members   = {m2['user_id'] for m2 in await db.get_crew_members(opp_crew['id'])}
        excluded      = chall_members | opp_members

        candidates = [
            mem for mem in guild.members
            if not mem.bot and mem.id not in excluded
        ]
        import random as _rnd
        arbitre = _rnd.choice(candidates) if candidates else None

        arbitre_id = arbitre.id if arbitre else interaction.user.id
        vc_id      = vc.id if vc else 0
        await db.accept_vocal_duel(duel_id, arbitre_id, vc_id)

        chall_cap = guild.get_member(chall_crew['captain_id'])
        opp_cap   = guild.get_member(opp_crew['captain_id'])

        vc_mention = vc.mention if vc else "*(pas de salon créé — rejoignez-vous en vocal)*"

        notif_embed = discord.Embed(
            title="🎙️ Duel Vocal — C'est parti !",
            description=(
                f"**{chall_crew['name']}** ⚔️ **{opp_crew['name']}**\n\n"
                f"📢 Salon : {vc_mention}\n"
                f"⚖️ Arbitre : <@{arbitre_id}>\n"
                f"⏱️ Durée : **{VOCAL_DUEL_DURATION_MINUTES} min** max\n"
                f"💰 Mise : **{fmt_berries(chall_crew.get('treasury', 0))} 🍊** → en jeu !"
            ),
            color=0x5865F2,
        )

        for cap in (chall_cap, opp_cap):
            if cap:
                try:
                    await cap.send(embed=notif_embed)
                except discord.Forbidden:
                    pass

        # DM arbitre avec les boutons de verdict
        arbitre_view = ArbitreView(duel_id, chall_crew, opp_crew, vc_id, self)
        if arbitre:
            try:
                await arbitre.send(
                    embed=discord.Embed(
                        title="⚖️ Tu es l'arbitre !",
                        description=(
                            f"Tu as été désigné arbitre du duel **{chall_crew['name']}** vs **{opp_crew['name']}**.\n\n"
                            f"Rejoins {vc_mention}, observe le duel, puis déclare le vainqueur ci-dessous.\n"
                            f"Tu as **{VOCAL_DUEL_DURATION_MINUTES} min**."
                        ),
                        color=0xFFD700,
                    ),
                    view=arbitre_view,
                )
            except discord.Forbidden:
                pass

        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            await ch.send(embed=notif_embed)

        await interaction.edit_original_response(
            content=f"✅ Duel vocal lancé ! Arbitre : <@{arbitre_id}> · {vc_mention}",
            embed=None, view=None,
        )

    async def _resolve_vocal_duel(self, interaction: discord.Interaction,
                                    duel_id: int, winner_id: int | None,
                                    crew_a: dict, crew_b: dict, vc_id: int):
        await db.resolve_vocal_duel(duel_id, winner_id)

        loser_id = None
        if winner_id:
            loser_id  = crew_b['id'] if winner_id == crew_a['id'] else crew_a['id']
            winner    = await db.get_crew(winner_id)
            loser     = await db.get_crew(loser_id)
            duel_row  = await db.get_vocal_duel(duel_id)
            stake     = duel_row['stake'] if duel_row else VOCAL_DUEL_STAKE_DEFAULT

            await asyncio.gather(
                award_xp(self.bot, winner_id, XP_VOCAL_DUEL_WIN),
                award_xp(self.bot, loser_id,  XP_VOCAL_DUEL_LOSS),
                db.update_crew(winner_id, treasury=winner['treasury'] + stake),
                db.update_crew(loser_id,  treasury=max(0, loser['treasury'] - stake)),
                db.add_treasury_log(winner_id, 0, stake,  'duel_win',  f"Duel vocal vs {loser['name']}"),
                db.add_treasury_log(loser_id,  0, -stake, 'duel_loss', f"Duel vocal vs {winner['name']}"),
                db.add_history(winner_id, winner['captain_id'], 'duel_vocal_win',  f"vs {loser['name']}"),
                db.add_history(loser_id,  loser['captain_id'],  'duel_vocal_loss', f"vs {winner['name']}"),
            )
            result_txt = f"🏆 **{winner['name']}** remporte le duel et **{fmt_berries(stake)} 🍊** !"
        else:
            result_txt = "🤝 Match nul — aucune mise transférée."

        guild = self.bot.get_guild(interaction.guild_id) if interaction.guild_id else (self.bot.guilds[0] if self.bot.guilds else None)
        if guild and vc_id:
            vc = guild.get_channel(vc_id)
            if vc:
                try:
                    await vc.delete(reason="Duel vocal terminé")
                except Exception:
                    pass

        ch = self.bot.get_channel(ANNOUNCE_CH)
        if ch:
            await ch.send(embed=discord.Embed(
                title="🎙️ Fin du Duel Vocal !",
                description=(
                    f"**{crew_a['name']}** ⚔️ **{crew_b['name']}**\n\n{result_txt}"
                ),
                color=0xFFD700 if winner_id else 0x5865F2,
            ))

        await interaction.followup.send(
            f"✅ Verdict enregistré ! {result_txt}", ephemeral=True
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(CrewCog(bot))
    print("[CREWS] Cog enregistré ✅")
