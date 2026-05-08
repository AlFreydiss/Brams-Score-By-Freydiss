import discord
from discord import app_commands
from .constants import MAX_NAME_LEN, MIN_NAME_LEN, MAX_TAG_LEN, MIN_TAG_LEN, MAX_DESC_LEN


# ── Modals ────────────────────────────────────────────────────────

class CreerCrewModal(discord.ui.Modal, title="Créer un équipage"):
    nom = discord.ui.TextInput(
        label="Nom de l'équipage",
        placeholder="Les Pirates du Chapeau de Paille",
        min_length=MIN_NAME_LEN,
        max_length=MAX_NAME_LEN,
    )
    tag = discord.ui.TextInput(
        label=f"Tag ({MIN_TAG_LEN}-{MAX_TAG_LEN} caractères, majuscules)",
        placeholder="SHP",
        min_length=MIN_TAG_LEN,
        max_length=MAX_TAG_LEN,
    )
    description = discord.ui.TextInput(
        label="Description (optionnel)",
        placeholder="On va devenir Roi des Pirates !",
        max_length=MAX_DESC_LEN,
        required=False,
        style=discord.TextStyle.paragraph,
    )

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction: discord.Interaction):
        await self._cb(interaction, self.nom.value.strip(),
                       self.tag.value.strip().upper(),
                       self.description.value.strip())


class RenommerModal(discord.ui.Modal, title="Renommer l'équipage"):
    nouveau_nom = discord.ui.TextInput(
        label="Nouveau nom",
        min_length=MIN_NAME_LEN,
        max_length=MAX_NAME_LEN,
    )

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction: discord.Interaction):
        await self._cb(interaction, self.nouveau_nom.value.strip())


class CandidatureModal(discord.ui.Modal, title="Candidature à l'équipage"):
    message = discord.ui.TextInput(
        label="Message de motivation",
        placeholder="Parle-nous de toi et pourquoi tu veux rejoindre...",
        max_length=300,
        style=discord.TextStyle.paragraph,
        required=False,
    )

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction: discord.Interaction):
        await self._cb(interaction, self.message.value.strip())


class RetraitModal(discord.ui.Modal, title="Retrait du trésor"):
    montant = discord.ui.TextInput(label="Montant à retirer", placeholder="50000")
    raison  = discord.ui.TextInput(label="Raison", max_length=100, style=discord.TextStyle.short)

    def __init__(self, callback):
        super().__init__()
        self._cb = callback

    async def on_submit(self, interaction: discord.Interaction):
        try:
            amount = int(self.montant.value.strip().replace(" ", ""))
        except ValueError:
            await interaction.response.send_message("❌ Montant invalide.", ephemeral=True)
            return
        await self._cb(interaction, amount, self.raison.value.strip())


# ── Confirm Views ─────────────────────────────────────────────────

class ConfirmView(discord.ui.View):
    def __init__(self, author_id: int, label: str = "✅ Confirmer"):
        super().__init__(timeout=60)
        self.author_id = author_id
        self.confirmed = False
        self._btn = discord.ui.Button(label=label, style=discord.ButtonStyle.danger)
        self._can = discord.ui.Button(label="❌ Annuler", style=discord.ButtonStyle.secondary)
        self._btn.callback = self._confirm
        self._can.callback = self._cancel
        self.add_item(self._btn)
        self.add_item(self._can)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Ce n'est pas ta confirmation.", ephemeral=True)
            return False
        return True

    async def _confirm(self, interaction: discord.Interaction):
        self.confirmed = True
        self.stop()
        await interaction.response.defer()

    async def _cancel(self, interaction: discord.Interaction):
        self.stop()
        await interaction.response.send_message("❌ Annulé.", ephemeral=True)


class ApplicationsView(discord.ui.View):
    """Vue paginée pour les candidatures avec boutons Accepter/Refuser par candidature."""

    def __init__(self, apps: list[dict], crew: dict, bot, page: int = 0):
        super().__init__(timeout=120)
        self._apps  = apps
        self._crew  = crew
        self._bot   = bot
        self._page  = page
        self._build()

    def _build(self):
        self.clear_items()
        app = self._apps[self._page] if self._apps else None
        if app:
            acc = discord.ui.Button(label="✅ Accepter", style=discord.ButtonStyle.success)
            rej = discord.ui.Button(label="❌ Refuser",  style=discord.ButtonStyle.danger)
            acc.callback = lambda i, a=app: self._decide(i, a, 'accepted')
            rej.callback = lambda i, a=app: self._decide(i, a, 'rejected')
            self.add_item(acc)
            self.add_item(rej)
        if self._page > 0:
            prev = discord.ui.Button(label="◀", style=discord.ButtonStyle.secondary)
            prev.callback = self._prev
            self.add_item(prev)
        if self._page < len(self._apps) - 1:
            nxt = discord.ui.Button(label="▶", style=discord.ButtonStyle.secondary)
            nxt.callback = self._next
            self.add_item(nxt)

    async def _decide(self, interaction: discord.Interaction, app: dict, status: str):
        import asyncio
        from . import database as db
        from .utils import assign_role
        await interaction.response.defer()
        if status == 'accepted':
            coros = [
                db.update_application(app['id'], status, interaction.user.id),
                db.add_member(app['user_id'], app['crew_id']),
                db.add_history(app['crew_id'], app['user_id'], 'joined', 'via candidature'),
            ]
            if self._crew.get('role_id'):
                coros.append(assign_role(interaction.guild, app['user_id'], self._crew['role_id']))
            await asyncio.gather(*coros)
            u = self._bot.get_user(app['user_id'])
            if u:
                try:
                    await u.send(f"✅ Ta candidature à **{self._crew['name']}** a été **acceptée** ! Bienvenue à bord !")
                except discord.Forbidden:
                    pass
        else:
            await db.update_application(app['id'], status, interaction.user.id)
            u = self._bot.get_user(app['user_id'])
            if u:
                try:
                    await u.send(f"❌ Ta candidature à **{self._crew['name']}** a été **refusée**.")
                except discord.Forbidden:
                    pass
        self._apps = [a for a in self._apps if a['id'] != app['id']]
        self._page = min(self._page, max(0, len(self._apps) - 1))
        self._build()
        from .embeds import applications_embed
        await interaction.message.edit(
            embed=applications_embed(self._crew, self._apps[self._page:self._page+1], self._page+1, len(self._apps)),
            view=self,
        )

    async def _prev(self, interaction: discord.Interaction):
        self._page -= 1
        self._build()
        from .embeds import applications_embed
        await interaction.response.edit_message(
            embed=applications_embed(self._crew, self._apps[self._page:self._page+1], self._page+1, len(self._apps)),
            view=self,
        )

    async def _next(self, interaction: discord.Interaction):
        self._page += 1
        self._build()
        from .embeds import applications_embed
        await interaction.response.edit_message(
            embed=applications_embed(self._crew, self._apps[self._page:self._page+1], self._page+1, len(self._apps)),
            view=self,
        )


class CrewListView(discord.ui.View):
    def __init__(self, crews: list[dict], total: int, page: int = 0, recruiting_only: bool = False):
        super().__init__(timeout=120)
        self._crews         = crews
        self._total         = total
        self._page          = page
        self._recruiting    = recruiting_only
        self._per_page      = 10
        self._build()

    def _build(self):
        self.clear_items()
        if self._page > 0:
            p = discord.ui.Button(label="◀", style=discord.ButtonStyle.secondary)
            p.callback = self._prev
            self.add_item(p)
        if (self._page + 1) * self._per_page < self._total:
            n = discord.ui.Button(label="▶", style=discord.ButtonStyle.secondary)
            n.callback = self._next
            self.add_item(n)

    async def _prev(self, interaction: discord.Interaction):
        from . import database as db
        from .embeds import leaderboard_embed
        self._page -= 1
        self._crews, _ = await db.list_crews(self._recruiting, self._page * self._per_page, self._per_page)
        self._build()
        await interaction.response.edit_message(embed=leaderboard_embed(self._crews, self._page + 1), view=self)

    async def _next(self, interaction: discord.Interaction):
        from . import database as db
        from .embeds import leaderboard_embed
        self._page += 1
        self._crews, _ = await db.list_crews(self._recruiting, self._page * self._per_page, self._per_page)
        self._build()
        await interaction.response.edit_message(embed=leaderboard_embed(self._crews, self._page + 1), view=self)


class AllianceResponseView(discord.ui.View):
    def __init__(self, crew_id: int, proposer_crew_id: int, captain_id: int, bot):
        super().__init__(timeout=3600)
        self._crew_id         = crew_id
        self._proposer_id     = proposer_crew_id
        self._captain_id      = captain_id
        self._bot             = bot

    @discord.ui.button(label="✅ Accepter l'alliance", style=discord.ButtonStyle.success)
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._captain_id:
            await interaction.response.send_message("Seul le capitaine peut décider.", ephemeral=True)
            return
        import asyncio
        from . import database as db
        from .utils import award_xp
        from .constants import XP_ALLIANCE
        await asyncio.gather(
            db.accept_alliance(self._proposer_id, self._crew_id),
            award_xp(self._bot, self._crew_id, XP_ALLIANCE),
            award_xp(self._bot, self._proposer_id, XP_ALLIANCE),
            db.add_history(self._crew_id, interaction.user.id, 'joined', f'Alliance avec crew #{self._proposer_id} acceptée'),
        )
        self.stop()
        await interaction.response.edit_message(
            content="✅ Alliance acceptée ! Les deux équipages sont maintenant alliés.", view=None
        )

    @discord.ui.button(label="❌ Refuser", style=discord.ButtonStyle.danger)
    async def refuse(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._captain_id:
            await interaction.response.send_message("Seul le capitaine peut décider.", ephemeral=True)
            return
        self.stop()
        await interaction.response.edit_message(content="❌ Proposition d'alliance refusée.", view=None)


class WarResponseView(discord.ui.View):
    def __init__(self, war_id: int, captain_id: int, bot):
        super().__init__(timeout=3600)
        self._war_id     = war_id
        self._captain_id = captain_id
        self._bot        = bot

    @discord.ui.button(label="⚔️ Accepter la guerre", style=discord.ButtonStyle.danger)
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._captain_id:
            await interaction.response.send_message("Seul le capitaine peut répondre.", ephemeral=True)
            return
        from . import database as db
        await db.accept_war(self._war_id)
        self.stop()
        await interaction.response.edit_message(
            content=f"⚔️ La guerre a commencé ! Utilisez `/crew war attaquer` pour combattre.", view=None
        )

    @discord.ui.button(label="🏳️ Refuser (forfait)", style=discord.ButtonStyle.secondary)
    async def refuse(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._captain_id:
            await interaction.response.send_message("Seul le capitaine peut répondre.", ephemeral=True)
            return
        import asyncio
        from . import database as db
        war = await db.get_war(self._war_id)
        if war:
            att_crew, _ = await asyncio.gather(
                db.get_crew(war['attacker_id']),
                db.cancel_war(self._war_id),
            )
            att_size = (war['prize_pool'] // 2) if war.get('prize_pool') else 0
            if att_crew and att_size > 0:
                await asyncio.gather(
                    db.update_crew(war['attacker_id'], treasury=att_crew['treasury'] + att_size),
                    db.add_treasury_log(war['attacker_id'], 0, att_size, 'war_refund', 'Guerre refusée'),
                )
        self.stop()
        await interaction.response.edit_message(content="🏳️ Guerre refusée. Forfait enregistré.", view=None)
