"""
cogs/onboarding_welcome.py — v3

Discord gère l'onboarding natif (règles + 4 questions + rôles pavillon/plateforme).
Ce cog se déclenche À LA FIN du wizard et fait :

  1. Donne le rôle @Membre
  2. Poste le welcome immersif dans #bienvenue (mention du pavillon)
  3. Envoie un DM "Guide du Pirate" multi-embeds qui explique :
     • Berrys (messages + vocal)
     • Système de rang (paliers vocal)
     • Équipages (forum + guerres)
     • Commandes essentielles

Trigger : on_member_update avec before.pending=True → after.pending=False
"""

import os
import discord
from datetime import datetime
from discord import app_commands
from discord.ext import commands

# ============================================================
# CONFIG
# ============================================================
WELCOME_CHANNEL_ID   = int(os.getenv("WELCOME_CHANNEL_ID", 0))
EQUIPAGES_FORUM_ID   = int(os.getenv("EQUIPAGES_FORUM_ID", 0))
MEMBER_ROLE_ID       = int(os.getenv("MEMBER_ROLE_ID", 0))

GUILD_NAME = "Brams Community"

# Palette
COLOR_BLOOD   = 0xC1121F
COLOR_NAVY    = 0x1A2332
COLOR_GOLD    = 0xDAA520
COLOR_PARCH   = 0x6F1D1B
COLOR_AMBER   = 0xBC6C25

DIVIDER = "╾━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╼"
SUBDIV  = "─────────────────────────"

# Citation d'accueil selon le pavillon (rôle attribué par l'onboarding natif)
PAVILLON_QUOTES = {
    "Chapeau de Paille": ("Monkey D. Luffy",   "« Shishishi ! Bienvenue à bord, nakama ! »"),
    "Marine":            ("Vice-Amiral Garp",  "« Un nouveau soldat ? Montre-moi ce que tu as dans le ventre. »"),
    "Révolutionnaires":  ("Monkey D. Dragon",  "« La révolution gagne un combattant de plus aujourd'hui. »"),
    "Chasseur de Primes":("Bartholomew Kuma",  "« Une nouvelle proie chasse sur les mers. »"),
}

# Paliers de rang (ajuste selon ton vrai système /rank)
RANKS = """🥈 Pirate              10h
🥇 Shichibukai         25h
🏴 Amiral              40h
☠️  Yonko               70h
👑 Roi des Pirates    150h+"""


def get_pavillon(member: discord.Member) -> tuple[str, str, str]:
    """Retourne (pavillon, narrateur, citation) selon les rôles du membre."""
    for role in member.roles:
        if role.name in PAVILLON_QUOTES:
            narrator, quote = PAVILLON_QUOTES[role.name]
            return role.name, narrator, quote
    return ("Pirate libre", "Shakky", "« Encore un rookie qui débarque sur l'archipel. »")


# ============================================================
# COG
# ============================================================
class OnboardingWelcome(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_update(self, before: discord.Member, after: discord.Member):
        # Déclenche UNIQUEMENT quand le wizard d'onboarding est complété
        if before.pending and not after.pending:
            await self.complete_onboarding(after)

    async def complete_onboarding(self, member: discord.Member):
        await self.give_member_role(member)
        await self.post_welcome(member)
        await self.send_guide_dm(member)

    # ---------- 1. Rôle Membre ----------
    async def give_member_role(self, member: discord.Member):
        role = member.guild.get_role(MEMBER_ROLE_ID)
        if role and role not in member.roles:
            try:
                await member.add_roles(role, reason="Onboarding complété")
            except discord.Forbidden:
                pass

    # ---------- 2. Welcome public ----------
    async def post_welcome(self, member: discord.Member):
        ch = self.bot.get_channel(WELCOME_CHANNEL_ID)
        if not ch:
            return

        pavillon, narrator, quote = get_pavillon(member)

        embed = discord.Embed(
            title="⛵  UN NAVIRE ACCOSTE...",
            description=(
                f"*{quote}*\n"
                f"`— {narrator}`\n\n"
                f"{DIVIDER}\n\n"
                f"🏴‍☠️ **{member.mention} a hissé le pavillon "
                f"des {pavillon}.**\n\n"
                f"```yaml\n"
                f"Identité       : {member.display_name}\n"
                f"Pavillon       : {pavillon}\n"
                f"Matricule      : Pirate n°{member.guild.member_count:04d}\n"
                f"Embarcadère    : {datetime.now().strftime('%d.%m.%Y')}\n"
                f"```\n"
                f"*Que ton Log Pose te guide.*"
            ),
            color=COLOR_BLOOD,
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text=f"{GUILD_NAME} · Transmission Den Den Mushi")
        await ch.send(content=member.mention, embed=embed)

    # ---------- 3. DM Guide du Pirate ----------
    async def send_guide_dm(self, member: discord.Member):
        pavillon, _, _ = get_pavillon(member)
        equipages_mention = f"<#{EQUIPAGES_FORUM_ID}>" if EQUIPAGES_FORUM_ID else "**#équipages**"

        # --- Embed 1 : Transmission ---
        e1 = discord.Embed(
            title="📞  TRANSMISSION ・ Den Den Mushi",
            description=(
                f"```\n"
                f"  purupurupuru... purupuru...\n"
                f"             ▸ KATCHA ◂\n"
                f"```\n"
                f"*« Allô ? C'est bien {member.display_name} des **{pavillon}** ? »*\n"
                f"*« Bienvenue dans l'équipage de **{GUILD_NAME}**. »*\n"
                f"*« Avant de prendre la mer, lis bien ce qui suit — "
                f"ce sont les règles du jeu. »*\n\n"
                f"{DIVIDER}\n\n"
                f"🏴 Tu as reçu le rôle **@Membre**\n"
                f"🏴‍☠️ Ton pavillon : **@{pavillon}**"
            ),
            color=COLOR_NAVY,
        )

        # --- Embed 2 : Berrys ---
        e2 = discord.Embed(
            title="💰  LE TRÉSOR ・ Berrys (฿)",
            description=(
                f"*« L'argent fait tourner les mers. »*\n"
                f"`— Nami, navigatrice & trésorière`\n"
                f"{SUBDIV}\n"
                f"**Comment en gagner :**\n"
                f"▸ Chaque **message** rapporte des ฿\n"
                f"▸ Chaque **heure de vocal** rapporte gros ฿฿฿\n"
                f"▸ Gagne aux jeux du bot (`/quiz`, `/duel`)\n\n"
                f"**Comment les voir :**\n"
                f"▸ `/banque` → ton trésor actuel\n"
                f"▸ `/profil` → ta fiche complète\n"
                f"▸ `/top berry` → les plus riches du serveur"
            ),
            color=COLOR_GOLD,
        )

        # --- Embed 3 : Rang ---
        e3 = discord.Embed(
            title="⚔️  TON RANG DE PIRATE",
            description=(
                f"*« De simple mousse à Roi des Pirates. »*\n"
                f"`— Gol D. Roger`\n"
                f"{SUBDIV}\n"
                f"**Ton rang évolue selon ton temps en vocal :**\n"
                f"```\n{RANKS}\n```\n"
                f"▸ `/rank` → ta carte One Piece personnalisée\n"
                f"▸ `/top vocal` → top navigateurs\n\n"
                f"*Plus tu navigues, plus ta légende grandit.*"
            ),
            color=COLOR_BLOOD,
        )

        # --- Embed 4 : Équipages ---
        e4 = discord.Embed(
            title="🏴‍☠️  LES ÉQUIPAGES",
            description=(
                f"*« Un pirate seul ne va nulle part. »*\n"
                f"`— Edward Newgate, Barbe Blanche`\n"
                f"{SUBDIV}\n"
                f"Direction {equipages_mention} (le forum) pour :\n\n"
                f"▸ **Rejoindre** un équipage existant\n"
                f"▸ **Créer** ton propre équipage (`/equipage-creer`)\n"
                f"▸ **Déclarer la guerre** à un rival (`/guerre-declarer`)\n"
                f"▸ Voir le palmarès V/D de chaque crew\n\n"
                f"*Les guerres rapportent des Berrys et de la gloire.*\n"
                f"*Les défaites... bah, t'évite.*"
            ),
            color=COLOR_PARCH,
        )

        # --- Embed 5 : Commandes ---
        e5 = discord.Embed(
            title="📜  COMMANDES ESSENTIELLES",
            description=(
                f"```\n"
                f"/banque       Voir ton trésor en Berrys\n"
                f"/profil       Ta fiche pirate complète\n"
                f"/rank         Ta carte de progression\n"
                f"/wanted       Ton avis de recherche\n"
                f"/duel @user   Défier un pirate\n"
                f"/citation     Citation d'anime aléatoire\n"
                f"/quiz         Quiz anime (gagne ฿)\n"
                f"/top          Classements du serveur\n"
                f"```\n"
                f"{SUBDIV}\n"
                f"*« Maintenant va, jeune pirate. »*\n"
                f"*« Que le Roi des Pirates s'éveille en toi. »*\n"
                f"`— Buster, Den Den Mushi de Brams Community`"
            ),
            color=COLOR_AMBER,
        )
        e5.set_footer(text=f"{GUILD_NAME} · Guide du Pirate v1")

        try:
            await member.send(embeds=[e1, e2, e3, e4, e5])
        except discord.Forbidden:
            pass

    # ============================================================
    # /test-onboarding (admin only)
    # ============================================================
    @app_commands.command(name="test-onboarding", description="Simule le flow de fin d'onboarding sur un membre")
    @app_commands.describe(
        cible="Cible du test (toi par défaut)",
        skip_role="Ne PAS donner/redonner le rôle @Membre (au cas où tu l'as déjà)",
        skip_welcome="Ne PAS poster dans #bienvenue (mode silencieux)",
        skip_dm="Ne PAS envoyer le DM Guide du Pirate",
    )
    @app_commands.default_permissions(administrator=True)
    async def test_onboarding(
        self,
        interaction: discord.Interaction,
        cible: discord.Member | None = None,
        skip_role: bool = True,
        skip_welcome: bool = False,
        skip_dm: bool = False,
    ):
        await interaction.response.defer(ephemeral=True)
        member = cible or interaction.user

        steps = []
        try:
            if not skip_role:
                await self.give_member_role(member)
                steps.append("✅ Rôle @Membre attribué")
            else:
                steps.append("⏭️ Rôle @Membre (skipped)")

            if not skip_welcome:
                await self.post_welcome(member)
                steps.append("✅ Welcome posté dans #bienvenue")
            else:
                steps.append("⏭️ Welcome public (skipped)")

            if not skip_dm:
                await self.send_guide_dm(member)
                steps.append("✅ DM Guide du Pirate envoyé")
            else:
                steps.append("⏭️ DM Guide (skipped)")

            pavillon, narrator, _ = get_pavillon(member)
            recap = (
                f"🧪 **Test sur {member.mention}** terminé.\n\n"
                + "\n".join(steps)
                + f"\n\n```\nPavillon détecté : {pavillon}\nNarrateur        : {narrator}\n```"
            )
            await interaction.followup.send(recap, ephemeral=True)

        except Exception as e:
            await interaction.followup.send(
                f"❌ Erreur pendant le test : `{type(e).__name__}: {e}`",
                ephemeral=True,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(OnboardingWelcome(bot))
