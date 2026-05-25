import os
import discord
from discord import app_commands
from discord.ext import commands, tasks

from . import database as db
from .constants import CATEGORIES, LISTINGS_PER_PAGE
from .embeds import (
    listing_embed, listings_page_embed,
    my_listings_embed, seller_profile_embed, favorites_embed,
)
from .views import (
    ListingView, CategorySelectView, MarketplacePageView,
    MyListingsView, FavoritesView, _init as _views_init,
)

GUILD_IDS = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]


class MarketplaceCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.mp_channel_id = int(os.environ.get("MARKETPLACE_CHANNEL_ID", "0"))
        _views_init(bot)

    # ── Tâche : remboursement auto 48h ────────────────────────────

    @tasks.loop(minutes=30)
    async def _expire_check(self):
        expired = await db.get_expired_transactions()
        for tx in expired:
            try:
                self.bot.add_berrys(str(tx["buyer_id"]), tx["price"])
                await db.cancel_transaction(tx["id"])
                await db.update_listing_status(tx["listing_id"], "active")

                buyer = self.bot.get_user(tx["buyer_id"])
                if buyer:
                    try:
                        await buyer.send(
                            f"⌛ La vente n'a pas été confirmée dans les **48h**. "
                            f"Tu as été remboursé de **{tx['price']:,} 🍊**.".replace(",", " ")
                        )
                    except discord.Forbidden:
                        pass

                print(f"[MARKETPLACE] Transaction #{tx['id']} expirée → remboursement acheteur {tx['buyer_id']}")
            except Exception as e:
                print(f"[MARKETPLACE] Erreur expiration tx #{tx['id']}: {e}")

    @_expire_check.before_loop
    async def _before_expire(self):
        await self.bot.wait_until_ready()

    async def cog_load(self):
        self._expire_check.start()
        self.bot.add_view(ListingView())  # vue persistante
        print("[MARKETPLACE] Cog chargé ✅")

    async def cog_unload(self):
        self._expire_check.cancel()

    # ── /vendre_annonce ────────────────────────────────────────────

    @app_commands.command(name="vendre_annonce", description="Publier une annonce dans le marketplace 🏪")
    @app_commands.guilds(*GUILD_IDS)
    async def vendre(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            embed=discord.Embed(
                title="🏪 Nouvelle annonce",
                description="Choisis d'abord la catégorie de ton article.",
                color=0xFFD700,
            ),
            view=CategorySelectView(interaction.user.id),
            ephemeral=True,
        )

    # ── /marketplace ──────────────────────────────────────────────

    @app_commands.command(name="marketplace", description="Parcourir les annonces du marketplace 🏪")
    @app_commands.describe(
        categorie="Filtrer par catégorie",
        prix_max="Prix maximum en Berrys",
        recherche="Rechercher dans les titres / descriptions",
    )
    @app_commands.choices(categorie=[
        app_commands.Choice(name=f"{c['emoji']} {c['name']}", value=c["id"])
        for c in CATEGORIES
    ])
    @app_commands.guilds(*GUILD_IDS)
    async def marketplace(
        self, interaction: discord.Interaction,
        categorie: str = None, prix_max: int = None, recherche: str = None,
    ):
        await interaction.response.defer(ephemeral=False)
        listings, total = await db.get_listings(
            category=categorie, max_price=prix_max, search=recherche,
            offset=0, limit=LISTINGS_PER_PAGE,
        )
        embed = listings_page_embed(listings, 1, total, categorie, recherche)
        view  = MarketplacePageView(
            interaction.user.id, listings, 1, total, categorie, prix_max, recherche
        )
        await interaction.followup.send(embed=embed, view=view)

    # ── /mes-annonces ─────────────────────────────────────────────

    @app_commands.command(name="mes-annonces", description="Gérer tes annonces du marketplace")
    @app_commands.guilds(*GUILD_IDS)
    async def mes_annonces(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        listings = await db.get_user_listings(interaction.user.id)
        embed    = my_listings_embed(listings)
        view     = MyListingsView(interaction.user.id, listings) if listings else None
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    # ── /profil-vendeur ───────────────────────────────────────────

    @app_commands.command(name="profil-vendeur", description="Voir le profil vendeur d'un membre")
    @app_commands.describe(membre="Membre à inspecter (défaut : toi)")
    @app_commands.guilds(*GUILD_IDS)
    async def profil_vendeur(self, interaction: discord.Interaction, membre: discord.Member = None):
        await interaction.response.defer()
        target = membre or interaction.user
        stats  = await db.get_seller_stats(target.id)
        embed  = seller_profile_embed(stats, target)
        await interaction.followup.send(embed=embed)

    # ── /favoris ──────────────────────────────────────────────────

    @app_commands.command(name="favoris", description="Voir tes annonces favorites ❤️")
    @app_commands.guilds(*GUILD_IDS)
    async def favoris(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        listings, total = await db.get_favorites(interaction.user.id, offset=0, limit=LISTINGS_PER_PAGE)
        embed = favorites_embed(listings, 1, total)
        view  = FavoritesView(interaction.user.id, 1, total) if total > LISTINGS_PER_PAGE else None
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(MarketplaceCog(bot))
