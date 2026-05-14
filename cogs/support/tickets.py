"""
Système de tickets Discord — Brams Community
Crée un salon privé par ticket dans la catégorie "Support".
Seuls les rôles configurés (+ le créateur) peuvent voir le salon.
"""
import discord
from discord import app_commands
from discord.ext import commands
import asyncio
from datetime import datetime, timezone

GUILD_IDS = [924346730194014220, 1478937064031518892]

TICKET_CATEGORIES = [
    ("🐛", "Bug",          "Le bot ne fonctionne pas correctement"),
    ("⚔️", "Rang",         "Mon rang n'a pas été attribué / erreur de rang"),
    ("💰", "Berrys",       "Problème avec mes Berrys ou la banque"),
    ("❓", "Question",     "J'ai une question sur le serveur ou le bot"),
    ("💡", "Suggestion",   "Une idée pour améliorer Brams Community"),
    ("📩", "Autre",        "Autre demande"),
]

CATEGORY_COLORS = {
    "Bug":        discord.Color.red(),
    "Rang":       discord.Color.gold(),
    "Berrys":     discord.Color.teal(),
    "Question":   discord.Color.blue(),
    "Suggestion": discord.Color.purple(),
    "Autre":      discord.Color.greyple(),
}


# ── Helpers DB ────────────────────────────────────────────────────────────────

def _db_ensure_tables(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS ticket_config (
                guild_id BIGINT PRIMARY KEY,
                admin_role_ids BIGINT[] NOT NULL DEFAULT '{}',
                category_id BIGINT
            );
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                guild_id BIGINT NOT NULL,
                channel_id BIGINT NOT NULL UNIQUE,
                user_id BIGINT NOT NULL,
                category TEXT NOT NULL,
                claimed_by BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        conn.commit()


def _db_get_config(conn, guild_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT admin_role_ids, category_id FROM ticket_config WHERE guild_id = %s",
            (guild_id,)
        )
        row = cur.fetchone()
    if row:
        return {"admin_role_ids": list(row[0] or []), "category_id": row[1]}
    return {"admin_role_ids": [], "category_id": None}


def _db_set_config(conn, guild_id: int, admin_role_ids: list, category_id: int | None):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO ticket_config (guild_id, admin_role_ids, category_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (guild_id) DO UPDATE
                SET admin_role_ids = EXCLUDED.admin_role_ids,
                    category_id    = EXCLUDED.category_id
        """, (guild_id, admin_role_ids, category_id))
        conn.commit()


def _db_add_ticket(conn, guild_id: int, channel_id: int, user_id: int, category: str):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO tickets (guild_id, channel_id, user_id, category)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (channel_id) DO NOTHING
        """, (guild_id, channel_id, user_id, category))
        conn.commit()


def _db_get_ticket(conn, channel_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT guild_id, user_id, category, claimed_by, created_at FROM tickets WHERE channel_id = %s",
            (channel_id,)
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"guild_id": row[0], "user_id": row[1], "category": row[2],
            "claimed_by": row[3], "created_at": row[4]}


def _db_claim_ticket(conn, channel_id: int, admin_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE tickets SET claimed_by = %s WHERE channel_id = %s",
            (admin_id, channel_id)
        )
        conn.commit()


def _db_delete_ticket(conn, channel_id: int):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM tickets WHERE channel_id = %s", (channel_id,))
        conn.commit()


# ── Views ─────────────────────────────────────────────────────────────────────

class TicketCategorySelect(discord.ui.Select):
    def __init__(self):
        opts = [
            discord.SelectOption(label=f"{e} {label}", description=desc, value=label)
            for e, label, desc in TICKET_CATEGORIES
        ]
        super().__init__(placeholder="Choisis une catégorie…", options=opts, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.send_modal(TicketModal(self.values[0]))


class TicketOpenView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(TicketCategorySelect())


class TicketModal(discord.ui.Modal):
    def __init__(self, category: str):
        super().__init__(title=f"Ticket — {category}")
        self.category = category
        self.desc = discord.ui.TextInput(
            label="Décris ton problème",
            placeholder="Explique en détail (min 20 caractères)…",
            style=discord.TextStyle.paragraph,
            min_length=10,
            max_length=800,
        )
        self.add_item(self.desc)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        cog: TicketCog = interaction.client.cogs.get("TicketCog")
        if cog:
            await cog.create_ticket(interaction, self.category, self.desc.value)


class TicketControlView(discord.ui.View):
    """Boutons dans le salon du ticket (claim + fermer)."""
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="✋ Prendre en charge", style=discord.ButtonStyle.primary, custom_id="ticket:claim")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog: TicketCog = interaction.client.cogs.get("TicketCog")
        if not cog:
            return
        if not await cog._is_ticket_admin(interaction):
            return await interaction.response.send_message("❌ Réservé aux admins support.", ephemeral=True)

        conn = interaction.client.get_cog("TicketCog")._get_db()
        try:
            t = _db_get_ticket(conn, interaction.channel.id)
            if not t:
                return await interaction.response.send_message("❌ Ticket introuvable.", ephemeral=True)
            if t["claimed_by"]:
                claimer = interaction.guild.get_member(t["claimed_by"])
                name = claimer.display_name if claimer else str(t["claimed_by"])
                return await interaction.response.send_message(f"❌ Déjà pris en charge par **{name}**.", ephemeral=True)
            _db_claim_ticket(conn, interaction.channel.id, interaction.user.id)
        finally:
            cog._release_db(conn)

        await interaction.channel.send(
            embed=discord.Embed(
                description=f"✋ **{interaction.user.display_name}** prend ce ticket en charge.",
                color=discord.Color.green(),
            )
        )
        button.disabled = True
        button.label = f"✋ Pris par {interaction.user.display_name}"
        await interaction.response.edit_message(view=self)

    @discord.ui.button(label="🔒 Fermer le ticket", style=discord.ButtonStyle.danger, custom_id="ticket:close")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog: TicketCog = interaction.client.cogs.get("TicketCog")
        if not cog:
            return
        if not await cog._is_ticket_admin(interaction) and interaction.user.id not in [
            m.id for m in interaction.channel.members
        ]:
            return await interaction.response.send_message("❌ Pas l'autorisation.", ephemeral=True)
        await cog.close_ticket(interaction)


# ── Cog principal ─────────────────────────────────────────────────────────────

class TicketCog(commands.Cog, name="TicketCog"):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._panel_message_id: dict[int, int] = {}  # guild_id → message_id du panel

    # DB helpers — utilise le pool global du module bot
    def _get_db(self):
        import bot as _bot_module
        return _bot_module.get_db()

    def _release_db(self, conn):
        import bot as _bot_module
        _bot_module.release_db(conn)

    def _run_db(self, fn, *args):
        conn = self._get_db()
        try:
            return fn(conn, *args)
        finally:
            self._release_db(conn)

    async def _is_ticket_admin(self, interaction: discord.Interaction) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        cfg = await self.bot.loop.run_in_executor(
            None, lambda: self._run_db(_db_get_config, interaction.guild.id)
        )
        member_role_ids = {r.id for r in interaction.user.roles}
        return bool(member_role_ids & set(cfg["admin_role_ids"]))

    async def _get_or_create_category(self, guild: discord.Guild, cfg: dict) -> discord.CategoryChannel:
        if cfg["category_id"]:
            cat = guild.get_channel(cfg["category_id"])
            if cat and isinstance(cat, discord.CategoryChannel):
                return cat

        # Cherche une catégorie existante
        for ch in guild.categories:
            if ch.name.lower() in ("support", "tickets", "🎫 support"):
                return ch

        # Crée la catégorie avec permissions fermées au public
        overwrites = {guild.default_role: discord.PermissionOverwrite(view_channel=False)}
        cat = await guild.create_category("🎫 Support", overwrites=overwrites)

        # Sauvegarde l'ID
        conn = self._get_db()
        try:
            _db_set_config(conn, guild.id, cfg["admin_role_ids"], cat.id)
        finally:
            self._release_db(conn)

        return cat

    async def create_ticket(self, interaction: discord.Interaction, category: str, description: str):
        guild = interaction.guild
        conn = self._get_db()
        try:
            _db_ensure_tables(conn)
            cfg = _db_get_config(conn, guild.id)
        finally:
            self._release_db(conn)

        # Vérifie pas de ticket ouvert
        existing = discord.utils.get(
            guild.channels,
            name=f"ticket-{interaction.user.name.lower().replace(' ', '-')[:20]}"
        )
        if existing:
            return await interaction.followup.send(
                f"❌ Tu as déjà un ticket ouvert : {existing.mention}", ephemeral=True
            )

        support_cat = await self._get_or_create_category(guild, cfg)

        # Permissions du salon
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            interaction.user:   discord.PermissionOverwrite(
                view_channel=True, send_messages=True, read_message_history=True, attach_files=True
            ),
            guild.me:           discord.PermissionOverwrite(
                view_channel=True, send_messages=True, manage_channels=True, read_message_history=True
            ),
        }
        # Ajoute les rôles admins support
        for role_id in cfg["admin_role_ids"]:
            role = guild.get_role(role_id)
            if role:
                overwrites[role] = discord.PermissionOverwrite(
                    view_channel=True, send_messages=True, read_message_history=True, attach_files=True, manage_messages=True
                )
        # Les admins Discord classiques voient aussi
        for role in guild.roles:
            if role.permissions.administrator and role not in overwrites:
                overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, manage_messages=True)

        chan_name = f"ticket-{interaction.user.name.lower().replace(' ', '-')[:20]}"
        channel = await guild.create_text_channel(
            name=chan_name,
            category=support_cat,
            overwrites=overwrites,
            topic=f"Ticket {category} ouvert par {interaction.user} | {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC",
        )

        # Enregistre en DB
        conn = self._get_db()
        try:
            _db_add_ticket(conn, guild.id, channel.id, interaction.user.id, category)
        finally:
            self._release_db(conn)

        # Embed dans le ticket
        color = CATEGORY_COLORS.get(category, discord.Color.blurple())
        embed = discord.Embed(
            title=f"🎫 Ticket — {category}",
            color=color,
            timestamp=datetime.now(timezone.utc),
        )
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.add_field(name="Catégorie", value=f"**{category}**", inline=True)
        embed.add_field(name="Membre", value=interaction.user.mention, inline=True)
        embed.add_field(name="Problème", value=description, inline=False)
        embed.set_footer(text="Brams Community · Support | Un admin va prendre en charge dès que possible.")

        # Ping les rôles admins
        mentions = " ".join(f"<@&{rid}>" for rid in cfg["admin_role_ids"]) or "@admins"

        await channel.send(
            content=f"{interaction.user.mention} · {mentions}",
            embed=embed,
            view=TicketControlView(),
        )

        await interaction.followup.send(
            f"✅ Ton ticket a été créé : {channel.mention}", ephemeral=True
        )

    async def close_ticket(self, interaction: discord.Interaction):
        conn = self._get_db()
        try:
            t = _db_get_ticket(conn, interaction.channel.id)
            if not t:
                return await interaction.response.send_message("❌ Ce salon n'est pas un ticket.", ephemeral=True)
        finally:
            self._release_db(conn)

        await interaction.response.defer()

        embed = discord.Embed(
            description="🔒 Ce ticket va être **fermé dans 5 secondes**…",
            color=discord.Color.red(),
        )
        await interaction.channel.send(embed=embed)
        await asyncio.sleep(5)

        conn = self._get_db()
        try:
            _db_delete_ticket(conn, interaction.channel.id)
        finally:
            self._release_db(conn)

        try:
            await interaction.channel.delete(reason=f"Ticket fermé par {interaction.user}")
        except discord.NotFound:
            pass

    # ── Commandes slash ────────────────────────────────────────────────────────

    ticket_group = app_commands.Group(
        name="ticket",
        description="Système de tickets support",
        guild_ids=GUILD_IDS,
    )

    @ticket_group.command(name="ouvrir", description="Ouvre un ticket de support")
    async def ticket_open(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            embed=discord.Embed(
                title="🎫 Support — Brams Community",
                description=(
                    "Choisis une catégorie pour ouvrir ton ticket.\n"
                    "Un admin support te répondra dès que possible, nakama !"
                ),
                color=discord.Color.blurple(),
            ),
            view=TicketOpenView(),
            ephemeral=True,
        )

    @ticket_group.command(name="panel", description="[Admin] Envoie le panel de tickets dans ce salon")
    @app_commands.default_permissions(administrator=True)
    async def ticket_panel(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="🎫 Support Brams Community",
            description=(
                "Un problème avec le bot, ton rang, tes Berrys ?\n"
                "Une question ou une suggestion ?\n\n"
                "**Clique sur le bouton ci-dessous** pour ouvrir un ticket.\n"
                "Un admin prendra en charge ta demande dès que possible."
            ),
            color=discord.Color.blurple(),
        )
        embed.set_footer(text="Brams Community · Système de tickets")

        class PanelView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=None)

            @discord.ui.button(label="🎫 Ouvrir un ticket", style=discord.ButtonStyle.primary, custom_id="ticket:open_panel")
            async def open_ticket(self, btn_interaction: discord.Interaction, button: discord.ui.Button):
                await btn_interaction.response.send_message(
                    embed=discord.Embed(
                        title="🎫 Support — Brams Community",
                        description="Choisis une catégorie pour ouvrir ton ticket.",
                        color=discord.Color.blurple(),
                    ),
                    view=TicketOpenView(),
                    ephemeral=True,
                )

        await interaction.response.send_message(embed=embed, view=PanelView())

    @ticket_group.command(name="fermer", description="Ferme le ticket courant")
    async def ticket_close(self, interaction: discord.Interaction):
        if not await self._is_ticket_admin(interaction):
            conn = self._get_db()
            try:
                t = _db_get_ticket(conn, interaction.channel.id)
            finally:
                self._release_db(conn)
            if not t or t["user_id"] != interaction.user.id:
                return await interaction.response.send_message("❌ Pas l'autorisation.", ephemeral=True)
        await self.close_ticket(interaction)

    @ticket_group.command(name="admins", description="[Admin] Gérer les rôles admins support")
    @app_commands.describe(action="Ajouter ou retirer un rôle", role="Le rôle admin support")
    @app_commands.choices(action=[
        app_commands.Choice(name="Ajouter", value="add"),
        app_commands.Choice(name="Retirer", value="remove"),
        app_commands.Choice(name="Voir la liste", value="list"),
    ])
    @app_commands.default_permissions(administrator=True)
    async def ticket_admins(self, interaction: discord.Interaction, action: str, role: discord.Role = None):
        await interaction.response.defer(ephemeral=True)

        conn = self._get_db()
        try:
            _db_ensure_tables(conn)
            cfg = _db_get_config(conn, interaction.guild.id)
        finally:
            self._release_db(conn)

        ids: list[int] = cfg["admin_role_ids"]

        if action == "list":
            if not ids:
                return await interaction.followup.send("Aucun rôle admin support configuré.", ephemeral=True)
            roles_txt = "\n".join(f"• <@&{rid}>" for rid in ids)
            return await interaction.followup.send(
                embed=discord.Embed(title="Rôles admin support", description=roles_txt, color=discord.Color.blurple()),
                ephemeral=True,
            )

        if not role:
            return await interaction.followup.send("❌ Précise un rôle.", ephemeral=True)

        if action == "add":
            if role.id in ids:
                return await interaction.followup.send(f"✅ {role.mention} est déjà admin support.", ephemeral=True)
            ids.append(role.id)
            msg = f"✅ {role.mention} ajouté comme admin support."
        else:
            if role.id not in ids:
                return await interaction.followup.send(f"❌ {role.mention} n'est pas admin support.", ephemeral=True)
            ids.remove(role.id)
            msg = f"✅ {role.mention} retiré des admins support."

        conn = self._get_db()
        try:
            _db_set_config(conn, interaction.guild.id, ids, cfg["category_id"])
        finally:
            self._release_db(conn)

        await interaction.followup.send(msg, ephemeral=True)

    @ticket_group.command(name="liste", description="[Admin] Voir tous les tickets ouverts")
    @app_commands.default_permissions(administrator=True)
    async def ticket_list(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        conn = self._get_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT channel_id, user_id, category, claimed_by, created_at FROM tickets WHERE guild_id = %s ORDER BY created_at DESC LIMIT 20",
                    (interaction.guild.id,)
                )
                rows = cur.fetchall()
        finally:
            self._release_db(conn)

        if not rows:
            return await interaction.followup.send("Aucun ticket ouvert.", ephemeral=True)

        lines = []
        for ch_id, uid, cat, claimed, created_at in rows:
            ch = interaction.guild.get_channel(ch_id)
            ch_txt = ch.mention if ch else f"(supprimé {ch_id})"
            claim_txt = f"<@{claimed}>" if claimed else "Non pris en charge"
            lines.append(f"{ch_txt} · **{cat}** · <@{uid}> · {claim_txt}")

        embed = discord.Embed(
            title=f"🎫 Tickets ouverts ({len(rows)})",
            description="\n".join(lines),
            color=discord.Color.blurple(),
        )
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(TicketCog(bot))
