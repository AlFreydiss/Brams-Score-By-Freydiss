import re
import discord
from . import database as db
from .constants import (
    CATEGORIES, CATEGORY_BY_ID, LISTINGS_PER_PAGE,
    PRICE_MIN, PRICE_MAX, BANNED_WORDS, COLOR_ACTIVE, COLOR_SOLD,
)
from .embeds import listing_embed, listings_page_embed, favorites_embed

# Injecté par marketplace.py au démarrage du cog
_bot = None
def _init(bot_instance):
    global _bot
    _bot = bot_instance


def _fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def _clean(text: str) -> bool:
    low = text.lower()
    return not any(w in low for w in BANNED_WORDS)


def _listing_id_from_embed(message: discord.Message):
    """Extrait l'ID de l'annonce depuis le footer de l'embed  (🏪 #42 • …)"""
    try:
        footer = message.embeds[0].footer.text or ""
        m = re.search(r"#(\d+)", footer)
        return int(m.group(1)) if m else None
    except Exception:
        return None


# ── Modals ────────────────────────────────────────────────────────

class CreateListingModal(discord.ui.Modal, title="Nouvelle annonce"):
    titre       = discord.ui.TextInput(label="Titre",       max_length=80,  placeholder="Ex : Pack fruits démon rares")
    description = discord.ui.TextInput(label="Description", max_length=500, style=discord.TextStyle.paragraph,
                                       placeholder="Décris ton article...")
    prix        = discord.ui.TextInput(label="Prix (Berrys)", max_length=10,  placeholder="Ex : 50000")
    image_url   = discord.ui.TextInput(label="URL image (optionnel)", required=False, max_length=300)

    def __init__(self, category: str):
        super().__init__()
        self._category = category

    async def on_submit(self, interaction: discord.Interaction):
        uid = interaction.user.id

        # Validation prix
        try:
            price = int(self.prix.value.replace(" ", "").replace(",", ""))
            if not (PRICE_MIN <= price <= PRICE_MAX):
                raise ValueError
        except ValueError:
            await interaction.response.send_message(
                f"❌ Prix invalide. Entre **{_fmt(PRICE_MIN)}** et **{_fmt(PRICE_MAX)} 🍊**.",
                ephemeral=True,
            )
            return

        # Filtre mots interdits
        for field in (self.titre.value, self.description.value):
            if not _clean(field):
                await interaction.response.send_message(
                    "❌ Ton annonce contient des mots interdits.", ephemeral=True
                )
                return

        # Limites
        active_count = await db.count_active_listings(uid)
        if active_count >= 5:
            await interaction.response.send_message(
                "❌ Tu as déjà **5 annonces actives**. Retire-en une avant d'en publier une nouvelle.",
                ephemeral=True,
            )
            return
        today_count = await db.count_listings_today(uid)
        if today_count >= 3:
            await interaction.response.send_message(
                "❌ Tu as déjà publié **3 annonces** aujourd'hui. Reviens demain.", ephemeral=True
            )
            return

        # Solde
        bal = _bot.get_berrys(str(uid))
        if bal < price:
            # Prix seulement affiché, on ne débite pas ici
            pass

        img = self.image_url.value.strip() or None
        listing_id = await db.create_listing(
            uid, self.titre.value.strip(), self.description.value.strip(),
            price, self._category, img,
        )

        # Poster dans le salon marketplace
        mp_ch = _bot.get_channel(_bot.mp_channel_id)
        listing = await db.get_listing(listing_id)
        embed   = listing_embed(listing, interaction.user.display_name)
        if mp_ch:
            msg = await mp_ch.send(embed=embed, view=ListingView())
            await db.set_listing_message_id(listing_id, msg.id)

        await interaction.response.send_message(
            f"✅ Annonce **#{listing_id}** publiée dans {mp_ch.mention if mp_ch else '#marketplace'} !",
            ephemeral=True,
        )


class EditListingModal(discord.ui.Modal, title="Modifier l'annonce"):
    titre       = discord.ui.TextInput(label="Titre",       max_length=80)
    description = discord.ui.TextInput(label="Description", max_length=500, style=discord.TextStyle.paragraph)
    prix        = discord.ui.TextInput(label="Prix (Berrys)", max_length=10)
    image_url   = discord.ui.TextInput(label="URL image (optionnel)", required=False, max_length=300)

    def __init__(self, listing: dict):
        super().__init__()
        self._listing = listing
        self.titre.default       = listing["title"]
        self.description.default = listing["description"]
        self.prix.default        = str(listing["price"])
        self.image_url.default   = listing.get("image_url") or ""

    async def on_submit(self, interaction: discord.Interaction):
        try:
            price = int(self.prix.value.replace(" ", "").replace(",", ""))
            if not (PRICE_MIN <= price <= PRICE_MAX):
                raise ValueError
        except ValueError:
            await interaction.response.send_message(
                f"❌ Prix invalide ({_fmt(PRICE_MIN)}–{_fmt(PRICE_MAX)} 🍊).", ephemeral=True
            )
            return

        for field in (self.titre.value, self.description.value):
            if not _clean(field):
                await interaction.response.send_message(
                    "❌ Contenu interdit.", ephemeral=True
                )
                return

        lid = self._listing["id"]
        img = self.image_url.value.strip() or None
        await db.update_listing(
            lid, self.titre.value.strip(), self.description.value.strip(),
            price, self._listing["category"], img,
        )

        # Mettre à jour l'embed dans le salon
        listing = await db.get_listing(lid)
        mp_ch   = _bot.get_channel(_bot.mp_channel_id)
        if mp_ch and listing.get("message_id"):
            try:
                msg = await mp_ch.fetch_message(listing["message_id"])
                await msg.edit(embed=listing_embed(listing, interaction.user.display_name))
            except Exception:
                pass

        await interaction.response.send_message(
            f"✅ Annonce **#{lid}** modifiée.", ephemeral=True
        )


class RateModal(discord.ui.Modal, title="Noter la transaction"):
    note       = discord.ui.TextInput(label="Note (1 à 5)", max_length=1, placeholder="5")
    commentaire = discord.ui.TextInput(label="Commentaire (optionnel)", required=False,
                                        max_length=200, style=discord.TextStyle.paragraph)

    def __init__(self, transaction_id: int, rated_id: int):
        super().__init__()
        self._tx_id    = transaction_id
        self._rated_id = rated_id

    async def on_submit(self, interaction: discord.Interaction):
        try:
            score = int(self.note.value)
            if not (1 <= score <= 5):
                raise ValueError
        except ValueError:
            await interaction.response.send_message("❌ Note invalide (1–5).", ephemeral=True)
            return

        already = await db.has_rated(self._tx_id, interaction.user.id)
        if already:
            await interaction.response.send_message("❌ Tu as déjà noté cette transaction.", ephemeral=True)
            return

        await db.create_rating(
            self._tx_id, interaction.user.id, self._rated_id,
            score, self.commentaire.value.strip() or None,
        )
        await interaction.response.send_message(
            f"⭐ Note **{score}/5** envoyée. Merci !", ephemeral=True
        )


class ReportModal(discord.ui.Modal, title="Signaler l'annonce"):
    raison = discord.ui.TextInput(label="Raison du signalement", max_length=300,
                                   style=discord.TextStyle.paragraph)

    def __init__(self, listing_id: int):
        super().__init__()
        self._listing_id = listing_id

    async def on_submit(self, interaction: discord.Interaction):
        await db.create_report(self._listing_id, interaction.user.id, self.raison.value.strip())
        await interaction.response.send_message(
            "🚩 Signalement envoyé. Les admins vont examiner cette annonce.", ephemeral=True
        )


# ── Vue acheteur : confirmation d'achat ───────────────────────────

class ConfirmPurchaseView(discord.ui.View):
    def __init__(self, listing: dict):
        super().__init__(timeout=60)
        self._listing = listing

    @discord.ui.button(label="✅ Confirmer l'achat", style=discord.ButtonStyle.success)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        listing = self._listing
        uid     = str(interaction.user.id)
        price   = listing["price"]

        # Re-vérifier le statut
        fresh = await db.get_listing(listing["id"])
        if not fresh or fresh["status"] != "active":
            await interaction.response.edit_message(
                content="❌ Cette annonce n'est plus disponible.", embed=None, view=None
            )
            return

        # Débiter l'acheteur
        if not _bot.spend_berrys(uid, price):
            bal = _bot.get_berrys(uid)
            await interaction.response.edit_message(
                content=f"❌ Solde insuffisant (**{_fmt(bal)} 🍊** / **{_fmt(price)} 🍊**).",
                embed=None, view=None,
            )
            return

        # Créer la transaction + réserver l'annonce
        tx_id = await db.create_transaction(
            listing["id"], interaction.user.id, listing["seller_id"], price
        )
        await db.update_listing_status(listing["id"], "reserved")

        # Mettre à jour l'embed dans le salon
        mp_ch = _bot.get_channel(_bot.mp_channel_id)
        if mp_ch and fresh.get("message_id"):
            try:
                msg = await mp_ch.fetch_message(fresh["message_id"])
                updated = await db.get_listing(listing["id"])
                await msg.edit(
                    embed=listing_embed(updated, interaction.user.display_name),
                    view=ListingView(),
                )
            except Exception:
                pass

        # DM au vendeur
        seller = _bot.get_user(listing["seller_id"])
        if seller:
            try:
                await seller.send(
                    embed=discord.Embed(
                        title="🛒 Quelqu'un veut acheter ton annonce !",
                        description=(
                            f"**{interaction.user.display_name}** souhaite acheter "
                            f"**{listing['title']}** pour **{_fmt(price)} 🍊**.\n\n"
                            f"Livre le bien puis clique **Marquer comme livré**.\n"
                            f"⚠️ Tu as **48h** — passé ce délai l'acheteur est remboursé."
                        ),
                        color=COLOR_ACTIVE,
                    ),
                    view=SellerDeliveryView(tx_id, interaction.user.id, listing),
                )
            except discord.Forbidden:
                pass

        await interaction.response.edit_message(
            content=(
                f"✅ Achat confirmé ! **{_fmt(price)} 🍊** débités.\n"
                f"Le vendeur a été notifié et a **48h** pour livrer.\n"
                f"Transaction **#{tx_id}**"
            ),
            embed=None, view=None,
        )

    @discord.ui.button(label="❌ Annuler", style=discord.ButtonStyle.danger)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        await interaction.response.edit_message(content="Achat annulé.", embed=None, view=None)


# ── Vue vendeur : livraison (DM) ──────────────────────────────────

class SellerDeliveryView(discord.ui.View):
    def __init__(self, tx_id: int, buyer_id: int, listing: dict):
        super().__init__(timeout=None)
        self._tx_id    = tx_id
        self._buyer_id = buyer_id
        self._listing  = listing

    @discord.ui.button(label="✅ Marquer comme livré", style=discord.ButtonStyle.success,
                        custom_id="mp_delivered")
    async def delivered(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        tx = await db.get_transaction(self._tx_id)
        if not tx or tx["status"] != "pending":
            await interaction.response.edit_message(content="⚠️ Transaction déjà traitée.", view=None)
            return

        await db.confirm_transaction(self._tx_id)
        await db.update_listing_status(self._listing["id"], "sold")

        # Créditer le vendeur
        _bot.add_berrys(str(interaction.user.id), tx["price"])

        # Mettre à jour l'embed salon
        mp_ch = _bot.get_channel(_bot.mp_channel_id)
        if mp_ch and self._listing.get("message_id"):
            try:
                msg = await mp_ch.fetch_message(self._listing["message_id"])
                sold_listing = await db.get_listing(self._listing["id"])
                embed = listing_embed(sold_listing, interaction.user.display_name)
                embed.color = COLOR_SOLD
                embed.set_author(name="✅ VENDU")
                await msg.edit(embed=embed, view=None)
            except Exception:
                pass

        # DM à l'acheteur
        buyer = _bot.get_user(self._buyer_id)
        if buyer:
            try:
                await buyer.send(
                    embed=discord.Embed(
                        title="📦 Ta commande a été livrée !",
                        description=(
                            f"**{self._listing['title']}** a été marqué comme livré.\n"
                            f"Tu peux maintenant noter le vendeur."
                        ),
                        color=COLOR_ACTIVE,
                    ),
                    view=RateView(self._tx_id, interaction.user.id),
                )
            except discord.Forbidden:
                pass

        await interaction.response.edit_message(
            content=f"✅ Livraison confirmée ! **{_fmt(tx['price'])} 🍊** crédités sur ton compte.",
            view=None,
        )

    @discord.ui.button(label="❌ Annuler la vente", style=discord.ButtonStyle.danger,
                        custom_id="mp_seller_cancel")
    async def seller_cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        tx = await db.get_transaction(self._tx_id)
        if not tx or tx["status"] != "pending":
            await interaction.response.edit_message(content="⚠️ Transaction déjà traitée.", view=None)
            return

        await db.cancel_transaction(self._tx_id)
        await db.update_listing_status(self._listing["id"], "active")
        _bot.add_berrys(str(self._buyer_id), tx["price"])  # remboursement

        buyer = _bot.get_user(self._buyer_id)
        if buyer:
            try:
                await buyer.send(
                    f"⚠️ La vente **{self._listing['title']}** a été annulée par le vendeur. "
                    f"Tu as été remboursé de **{_fmt(tx['price'])} 🍊**."
                )
            except discord.Forbidden:
                pass

        await interaction.response.edit_message(
            content="Vente annulée. L'acheteur a été remboursé.", view=None
        )


# ── Vue notation ──────────────────────────────────────────────────

class RateView(discord.ui.View):
    def __init__(self, tx_id: int, rated_id: int):
        super().__init__(timeout=86400)  # 24h
        self._tx_id    = tx_id
        self._rated_id = rated_id

    @discord.ui.button(label="⭐ Noter", style=discord.ButtonStyle.primary)
    async def rate(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        await interaction.response.send_modal(RateModal(self._tx_id, self._rated_id))


# ── Vue litige ────────────────────────────────────────────────────

class DisputeView(discord.ui.View):
    def __init__(self, tx_id: int, listing_title: str):
        super().__init__(timeout=3600)
        self._tx_id  = tx_id
        self._title  = listing_title

    @discord.ui.button(label="🚨 Ouvrir un litige", style=discord.ButtonStyle.danger)
    async def dispute(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.stop()
        tx = await db.get_transaction(self._tx_id)
        if not tx or tx["status"] != "pending":
            await interaction.response.send_message("⚠️ Transaction non active.", ephemeral=True)
            return

        # Notifier le staff
        staff_ch = discord.utils.find(
            lambda c: "staff" in c.name.lower() or "admin" in c.name.lower(),
            interaction.guild.text_channels,
        )
        msg = (
            f"🚨 **Litige ouvert** par {interaction.user.mention}\n"
            f"Transaction **#{self._tx_id}** — **{self._title}**\n"
            f"Acheteur : <@{tx['buyer_id']}> · Vendeur : <@{tx['seller_id']}>"
        )
        if staff_ch:
            await staff_ch.send(msg)

        await interaction.response.send_message(
            "🚨 Litige ouvert. Le staff a été notifié.", ephemeral=True
        )


# ── Vue principale du salon marketplace (persistante) ─────────────

class ListingView(discord.ui.View):
    """Boutons sur l'embed posté dans #marketplace. Survit aux redémarrages."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="🛒 Acheter",   style=discord.ButtonStyle.success,  custom_id="mp_buy")
    async def buy(self, interaction: discord.Interaction, button: discord.ui.Button):
        listing_id = _listing_id_from_embed(interaction.message)
        if not listing_id:
            await interaction.response.send_message("❌ Annonce introuvable.", ephemeral=True)
            return
        listing = await db.get_listing(listing_id)
        if not listing:
            await interaction.response.send_message("❌ Annonce introuvable.", ephemeral=True)
            return
        if listing["status"] != "active":
            await interaction.response.send_message(
                "❌ Cette annonce n'est plus disponible.", ephemeral=True
            )
            return
        if interaction.user.id == listing["seller_id"]:
            await interaction.response.send_message(
                "❌ Tu ne peux pas acheter ta propre annonce.", ephemeral=True
            )
            return

        await db.increment_views(listing_id)
        embed = discord.Embed(
            title=f"🛒 Confirmer l'achat — {listing['title'][:50]}",
            description=(
                f"Prix : **{_fmt(listing['price'])} 🍊**\n"
                f"Vendeur : <@{listing['seller_id']}>\n\n"
                f"Les Berrys seront débités immédiatement et conservés jusqu'à la livraison."
            ),
            color=COLOR_ACTIVE,
        )
        await interaction.response.send_message(
            embed=embed, view=ConfirmPurchaseView(listing), ephemeral=True
        )

    @discord.ui.button(label="💬 Contacter", style=discord.ButtonStyle.primary, custom_id="mp_contact")
    async def contact(self, interaction: discord.Interaction, button: discord.ui.Button):
        listing_id = _listing_id_from_embed(interaction.message)
        listing    = await db.get_listing(listing_id) if listing_id else None
        if not listing:
            await interaction.response.send_message("❌ Annonce introuvable.", ephemeral=True)
            return
        seller = _bot.get_user(listing["seller_id"])
        if seller:
            await interaction.response.send_message(
                f"💬 Contacte le vendeur directement : {seller.mention}\n"
                f"*(Envoie-lui un MP ou mentionne-le dans le serveur)*",
                ephemeral=True,
            )
        else:
            await interaction.response.send_message(
                f"Vendeur : <@{listing['seller_id']}>", ephemeral=True
            )

    @discord.ui.button(label="❤️ Favori",   style=discord.ButtonStyle.secondary, custom_id="mp_fav")
    async def fav(self, interaction: discord.Interaction, button: discord.ui.Button):
        listing_id = _listing_id_from_embed(interaction.message)
        if not listing_id:
            await interaction.response.send_message("❌ Annonce introuvable.", ephemeral=True)
            return
        added = await db.toggle_favorite(interaction.user.id, listing_id)
        await interaction.response.send_message(
            f"{'❤️ Ajouté aux favoris !' if added else '💔 Retiré des favoris.'}",
            ephemeral=True,
        )

    @discord.ui.button(label="🚩 Signaler", style=discord.ButtonStyle.danger,    custom_id="mp_report")
    async def report(self, interaction: discord.Interaction, button: discord.ui.Button):
        listing_id = _listing_id_from_embed(interaction.message)
        if not listing_id:
            await interaction.response.send_message("❌ Annonce introuvable.", ephemeral=True)
            return
        await interaction.response.send_modal(ReportModal(listing_id))


# ── Vue paginée /marketplace ──────────────────────────────────────

class MarketplacePageView(discord.ui.View):
    def __init__(self, user_id: int, listings: list, page: int, total: int,
                 category=None, max_price=None, search=None):
        super().__init__(timeout=180)
        self._uid       = user_id
        self._page      = page
        self._total     = total
        self._category  = category
        self._max_price = max_price
        self._search    = search
        self._pages     = max(1, -(-total // LISTINGS_PER_PAGE))
        self._refresh_buttons()

    def _refresh_buttons(self):
        self.prev_btn.disabled = self._page <= 1
        self.next_btn.disabled = self._page >= self._pages

    @discord.ui.button(label="◀️", style=discord.ButtonStyle.secondary)
    async def prev_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self._page -= 1
        await self._update(interaction)

    @discord.ui.button(label="▶️", style=discord.ButtonStyle.secondary)
    async def next_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self._page += 1
        await self._update(interaction)

    @discord.ui.select(
        placeholder="Filtrer par catégorie…",
        options=[discord.SelectOption(label="Toutes", value="__all__", emoji="🏪")]
        + [discord.SelectOption(label=c["name"], value=c["id"], emoji=c["emoji"]) for c in CATEGORIES],
    )
    async def category_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        val = select.values[0]
        self._category = None if val == "__all__" else val
        self._page = 1
        await self._update(interaction)

    async def _update(self, interaction: discord.Interaction):
        listings, total = await db.get_listings(
            category=self._category, max_price=self._max_price,
            search=self._search, offset=(self._page - 1) * LISTINGS_PER_PAGE,
            limit=LISTINGS_PER_PAGE,
        )
        self._total  = total
        self._pages  = max(1, -(-total // LISTINGS_PER_PAGE))
        self._page   = min(self._page, self._pages)
        self._refresh_buttons()
        embed = listings_page_embed(listings, self._page, total, self._category, self._search)
        await interaction.response.edit_message(embed=embed, view=self)


# ── Vue /mes-annonces ─────────────────────────────────────────────

class MyListingsView(discord.ui.View):
    def __init__(self, user_id: int, listings: list):
        super().__init__(timeout=180)
        self._uid      = user_id
        self._listings = listings
        self._sel_id   = None  # listing sélectionné

        opts = []
        for l in listings[:25]:
            status_icon = {"active":"🟢","reserved":"🟠","sold":"🔴","removed":"⚫"}.get(l["status"],"❓")
            opts.append(discord.SelectOption(
                label=f"{l['title'][:50]}",
                value=str(l["id"]),
                description=f"{status_icon} {l['status']} · {l['price']:,} 🍊".replace(",", " "),
            ))

        if opts:
            sel = discord.ui.Select(placeholder="Choisir une annonce…", options=opts)
            sel.callback = self._on_select
            self.add_item(sel)

        self.edit_btn   = discord.ui.Button(label="✏️ Modifier",       style=discord.ButtonStyle.primary,   disabled=True)
        self.remove_btn = discord.ui.Button(label="❌ Retirer",          style=discord.ButtonStyle.danger,    disabled=True)
        self.sold_btn   = discord.ui.Button(label="✅ Marquer vendu",   style=discord.ButtonStyle.success,   disabled=True)
        self.edit_btn.callback   = self._edit
        self.remove_btn.callback = self._remove
        self.sold_btn.callback   = self._mark_sold
        self.add_item(self.edit_btn)
        self.add_item(self.remove_btn)
        self.add_item(self.sold_btn)

    async def _on_select(self, interaction: discord.Interaction):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self._sel_id = int(interaction.data["values"][0])
        listing = next((l for l in self._listings if l["id"] == self._sel_id), None)
        if listing:
            is_active = listing["status"] == "active"
            self.edit_btn.disabled   = not is_active
            self.remove_btn.disabled = listing["status"] in ("sold", "removed")
            self.sold_btn.disabled   = not is_active
        await interaction.response.edit_message(view=self)

    async def _edit(self, interaction: discord.Interaction):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        if not self._sel_id:
            return
        listing = await db.get_listing(self._sel_id)
        if listing and listing["seller_id"] == self._uid:
            await interaction.response.send_modal(EditListingModal(listing))

    async def _remove(self, interaction: discord.Interaction):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        if not self._sel_id:
            return
        listing = await db.get_listing(self._sel_id)
        if listing and listing["seller_id"] == self._uid:
            await db.update_listing_status(self._sel_id, "removed")
            # Éditer l'embed salon
            mp_ch = _bot.get_channel(_bot.mp_channel_id)
            if mp_ch and listing.get("message_id"):
                try:
                    msg = await mp_ch.fetch_message(listing["message_id"])
                    await msg.delete()
                except Exception:
                    pass
            await interaction.response.send_message(
                f"✅ Annonce **#{self._sel_id}** retirée.", ephemeral=True
            )

    async def _mark_sold(self, interaction: discord.Interaction):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        if not self._sel_id:
            return
        listing = await db.get_listing(self._sel_id)
        if listing and listing["seller_id"] == self._uid:
            await db.update_listing_status(self._sel_id, "sold")
            mp_ch = _bot.get_channel(_bot.mp_channel_id)
            if mp_ch and listing.get("message_id"):
                try:
                    msg = await mp_ch.fetch_message(listing["message_id"])
                    from .embeds import listing_embed as le
                    updated = await db.get_listing(self._sel_id)
                    emb = le(updated, interaction.user.display_name)
                    emb.color   = COLOR_SOLD
                    emb.set_author(name="✅ VENDU")
                    await msg.edit(embed=emb, view=None)
                except Exception:
                    pass
            await interaction.response.send_message(
                f"✅ Annonce **#{self._sel_id}** marquée comme vendue.", ephemeral=True
            )


# ── Vue /favoris ──────────────────────────────────────────────────

class FavoritesView(discord.ui.View):
    def __init__(self, user_id: int, page: int, total: int):
        super().__init__(timeout=180)
        self._uid   = user_id
        self._page  = page
        self._total = total
        self._pages = max(1, -(-total // LISTINGS_PER_PAGE))
        self.prev_btn.disabled = page <= 1
        self.next_btn.disabled = page >= self._pages

    @discord.ui.button(label="◀️", style=discord.ButtonStyle.secondary)
    async def prev_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self._page -= 1
        await self._update(interaction)

    @discord.ui.button(label="▶️", style=discord.ButtonStyle.secondary)
    async def next_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self._page += 1
        await self._update(interaction)

    async def _update(self, interaction: discord.Interaction):
        listings, total = await db.get_favorites(
            self._uid, offset=(self._page - 1) * LISTINGS_PER_PAGE, limit=LISTINGS_PER_PAGE
        )
        self._total  = total
        self._pages  = max(1, -(-total // LISTINGS_PER_PAGE))
        self._page   = min(self._page, self._pages)
        self.prev_btn.disabled = self._page <= 1
        self.next_btn.disabled = self._page >= self._pages
        await interaction.response.edit_message(
            embed=favorites_embed(listings, self._page, total), view=self
        )


# ── Select catégorie pour /vendre ─────────────────────────────────

class CategorySelectView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self._uid = user_id

    @discord.ui.select(
        placeholder="Choisis une catégorie…",
        options=[
            discord.SelectOption(label=c["name"], value=c["id"], emoji=c["emoji"])
            for c in CATEGORIES
        ],
    )
    async def select_category(self, interaction: discord.Interaction, select: discord.ui.Select):
        if interaction.user.id != self._uid:
            await interaction.response.send_message("Ce menu ne t'appartient pas.", ephemeral=True)
            return
        self.stop()
        await interaction.response.send_modal(CreateListingModal(select.values[0]))
