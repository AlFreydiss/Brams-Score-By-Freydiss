"""
Cog — /duel  ⚔️  Duel Épique Anime/Shonen
==========================================
• Deux personnages s'affrontent dans un embed battle dynamique
• Base de données GIFs pour les personnages populaires
• Autocomplete sur les deux paramètres
• Résultat aléatoire avec barres de puissance
• Gestion des personnages inconnus (GIF placeholder)
"""

from __future__ import annotations

import logging
import random
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

log = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
#  ██████╗  █████╗ ███████╗███████╗     ██████╗ ███████╗
#  ██╔══██╗██╔══██╗██╔════╝██╔════╝    ██╔════╝ ██╔════╝
#  ██████╔╝███████║███████╗█████╗      ██║  ███╗█████╗
#  ██╔══██╗██╔══██║╚════██║██╔══╝      ██║   ██║██╔══╝
#  ██████╔╝██║  ██║███████║███████╗    ╚██████╔╝██║
#  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═════╝ ╚═╝
#  GIFs  |  Modifier ici pour ajouter ou corriger des liens
# ═══════════════════════════════════════════════════════════════════

# Chaque entrée : clé minuscule = alias de recherche
# gif : lien direct vers un GIF animé (Giphy CDN ou Tenor)
CHARS: dict[str, dict] = {
    "luffy": {
        "display": "Monkey D. Luffy",
        "gif":     "https://media.giphy.com/media/Z3l3guhVcMQPu/giphy.gif",
        "univers": "One Piece",
        "titre":   "Futur Roi des Pirates",
        "emoji":   "🍖",
    },
    "zoro": {
        "display": "Roronoa Zoro",
        "gif":     "https://media.giphy.com/media/ekXUPaggtv2lg/giphy.gif",
        "univers": "One Piece",
        "titre":   "Premier Épéiste du Monde",
        "emoji":   "⚔️",
    },
    "sanji": {
        "display": "Sanji",
        "gif":     "https://media.giphy.com/media/3o6Zt8AhLPCbbPjgJO/giphy.gif",
        "univers": "One Piece",
        "titre":   "Le Cuisinier du Diable",
        "emoji":   "🦵",
    },
    "naruto": {
        "display": "Naruto Uzumaki",
        "gif":     "https://media.giphy.com/media/nygKRHCxJMVLi/giphy.gif",
        "univers": "Naruto",
        "titre":   "Septième Hokage",
        "emoji":   "🌀",
    },
    "sasuke": {
        "display": "Sasuke Uchiha",
        "gif":     "https://media.giphy.com/media/3ohzdWsUjM3EWL4FXq/giphy.gif",
        "univers": "Naruto",
        "titre":   "Ninja de l'Ombre",
        "emoji":   "👁️",
    },
    "kakashi": {
        "display": "Kakashi Hatake",
        "gif":     "https://media.giphy.com/media/3o7btXJrSd8SkUsrLO/giphy.gif",
        "univers": "Naruto",
        "titre":   "Copieur de Mille Techniques",
        "emoji":   "📖",
    },
    "goku": {
        "display": "Son Goku",
        "gif":     "https://media.giphy.com/media/2t9sDPrlvFpdK/giphy.gif",
        "univers": "Dragon Ball",
        "titre":   "Super Saiyan Légendaire",
        "emoji":   "⚡",
    },
    "vegeta": {
        "display": "Vegeta",
        "gif":     "https://media.giphy.com/media/l0ExuyMmmgK4qX6ZG/giphy.gif",
        "univers": "Dragon Ball",
        "titre":   "Prince des Saiyans",
        "emoji":   "👑",
    },
    "gohan": {
        "display": "Son Gohan",
        "gif":     "https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif",
        "univers": "Dragon Ball",
        "titre":   "La Bête Ultime",
        "emoji":   "🔥",
    },
    "ichigo": {
        "display": "Ichigo Kurosaki",
        "gif":     "https://media.giphy.com/media/5zkZRNNpKDYxG/giphy.gif",
        "univers": "Bleach",
        "titre":   "Substitut Shinigami",
        "emoji":   "🌙",
    },
    "aizen": {
        "display": "Sosuke Aizen",
        "gif":     "https://media.giphy.com/media/3o6ZtoLRSzN0rF8ZnO/giphy.gif",
        "univers": "Bleach",
        "titre":   "Seigneur des Arrancar",
        "emoji":   "🕊️",
    },
    "saitama": {
        "display": "Saitama",
        "gif":     "https://media.giphy.com/media/3oEdv6osBU5bAGGQOA/giphy.gif",
        "univers": "One Punch Man",
        "titre":   "Héros par Loisir",
        "emoji":   "👊",
    },
    "genos": {
        "display": "Genos",
        "gif":     "https://media.giphy.com/media/l0HlFZfztZXlmHHgk/giphy.gif",
        "univers": "One Punch Man",
        "titre":   "Cyborg Démon",
        "emoji":   "🤖",
    },
    "mob": {
        "display": "Shigeo Kageyama (Mob)",
        "gif":     "https://media.giphy.com/media/WpP7KSqI3OqHkn5KMT/giphy.gif",
        "univers": "Mob Psycho 100",
        "titre":   "100% Psychique",
        "emoji":   "💫",
    },
    "tanjiro": {
        "display": "Tanjiro Kamado",
        "gif":     "https://media.giphy.com/media/dXFKDUolyLLi8gq6Cl/giphy.gif",
        "univers": "Demon Slayer",
        "titre":   "Pourfendeur de Démons",
        "emoji":   "💧",
    },
    "rengoku": {
        "display": "Kyojuro Rengoku",
        "gif":     "https://media.giphy.com/media/3oriNPdqSCrm0aSJkA/giphy.gif",
        "univers": "Demon Slayer",
        "titre":   "Pilier de la Flamme",
        "emoji":   "🔥",
    },
    "eren": {
        "display": "Eren Yeager",
        "gif":     "https://media.giphy.com/media/3oriNOmRKpvL6lJi1i/giphy.gif",
        "univers": "L'Attaque des Titans",
        "titre":   "Le Titan Fondateur",
        "emoji":   "🗡️",
    },
    "levi": {
        "display": "Levi Ackerman",
        "gif":     "https://media.giphy.com/media/SqflD2OBqzAFi/giphy.gif",
        "univers": "L'Attaque des Titans",
        "titre":   "Soldat le Plus Fort de l'Humanité",
        "emoji":   "💎",
    },
    "gojo": {
        "display": "Satoru Gojo",
        "gif":     "https://media.giphy.com/media/vHizpBFNFrHMzrHGhH/giphy.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Le Plus Fort du Monde",
        "emoji":   "♾️",
    },
    "sukuna": {
        "display": "Ryomen Sukuna",
        "gif":     "https://media.giphy.com/media/RLf0yKIylzHYYe8YwT/giphy.gif",
        "univers": "Jujutsu Kaisen",
        "titre":   "Roi des Fléaux",
        "emoji":   "👹",
    },
    "meliodas": {
        "display": "Meliodas",
        "gif":     "https://media.giphy.com/media/9oIPCsv0vXq3EFE8dK/giphy.gif",
        "univers": "Nanatsu no Taizai",
        "titre":   "Dragon's Sin of Wrath",
        "emoji":   "🐉",
    },
    "escanor": {
        "display": "Escanor",
        "gif":     "https://media.giphy.com/media/l4pTjOu0NsrLApt0c/giphy.gif",
        "univers": "Nanatsu no Taizai",
        "titre":   "Lion's Sin of Pride",
        "emoji":   "☀️",
    },
    "natsu": {
        "display": "Natsu Dragneel",
        "gif":     "https://media.giphy.com/media/l0HlFv9iFljcFVr0k/giphy.gif",
        "univers": "Fairy Tail",
        "titre":   "Dragon Slayer du Feu",
        "emoji":   "🔥",
    },
    "edward": {
        "display": "Edward Elric",
        "gif":     "https://media.giphy.com/media/3o6Zt4GX0XKYW7IHIc/giphy.gif",
        "univers": "Fullmetal Alchemist",
        "titre":   "Alchimiste d'Acier",
        "emoji":   "⚙️",
    },
    "giorno": {
        "display": "Giorno Giovanna",
        "gif":     "https://media.giphy.com/media/9J7tdYltWyXIqeMeSJ/giphy.gif",
        "univers": "JoJo's Bizarre Adventure",
        "titre":   "Capo de Passione",
        "emoji":   "🌸",
    },
    "jotaro": {
        "display": "Jotaro Kujo",
        "gif":     "https://media.giphy.com/media/3ov9jNziFTMfzSumAw/giphy.gif",
        "univers": "JoJo's Bizarre Adventure",
        "titre":   "Star Platinum",
        "emoji":   "⭐",
    },
    "gintoki": {
        "display": "Gintoki Sakata",
        "gif":     "https://media.giphy.com/media/3o7btSzQqLMfvPyPgk/giphy.gif",
        "univers": "Gintama",
        "titre":   "Le Samouraï du Ciel",
        "emoji":   "🍭",
    },
    "yusuke": {
        "display": "Yusuke Urameshi",
        "gif":     "https://media.giphy.com/media/QZ3qJZ5qAw3fRRHDtO/giphy.gif",
        "univers": "Yu Yu Hakusho",
        "titre":   "Détective des Enfers",
        "emoji":   "🔫",
    },
}

# GIF affiché quand le personnage est introuvable dans la base
GIF_PLACEHOLDER = "https://media.giphy.com/media/26FLd2NBRqrVIbgzC/giphy.gif"

# ── Textes aléatoires ──────────────────────────────────────────────

RIVALRY_PHRASES = [
    "Le destin du monde se joue dans ce combat légendaire ! 🌍",
    "Deux titans s'affrontent dans un choc qui fera trembler les cieux ! ⛈️",
    "L'univers retient son souffle… qui va dominer ? 🌌",
    "Leurs auras s'affrontent avant même le premier coup ! 💥",
    "Cette rivalité est inscrite dans les étoiles depuis la nuit des temps ! ✨",
    "Le sol tremble, les nuages se déchirent — la bataille commence ! 🔥",
    "Les légendes ne meurent pas, elles se battent ! ⚡",
    "Un seul peut rester debout. Lequel sera le dernier ? 🏆",
    "La puissance de ces deux guerriers fait plier la réalité ! 🌀",
    "Ceux qui ont vu ce combat en parleront pour l'éternité… 📜",
    "Même les dieux observent avec crainte ce choc ultime ! 👁️",
    "Ce n'est pas juste un combat — c'est une catastrophe naturelle ! 🌋",
]

WIN_MSGS = [
    "**{winner}** explose son adversaire en un seul coup ! 💢",
    "**{winner}** domine d'une puissance absolument écrasante ! 👑",
    "**{winner}** remporte ce round sans même transpirer ! 😤",
    "**{winner}** sort vainqueur de ce duel apocalyptique ! 🔥",
    "Personne ne peut arrêter **{winner}** aujourd'hui ! ⚡",
    "**{winner}** transcende ses limites et s'impose ! 🌟",
    "**{winner}** délivre le coup de grâce avec une brutalité absolue ! 💥",
]

DRAW_MSGS = [
    "Match nul explosif — les deux combattants s'effondrent simultanément ! 💥",
    "Égalité absolue ! Leurs forces se neutralisent parfaitement. ⚖️",
    "Nul ! La Terre elle-même ne peut départager ces deux monstres. 🌍",
    "Les deux tombent en même temps dans un dernier éclat de puissance ! ✨",
]


# ═══════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════

def _get_char(name: str) -> Optional[dict]:
    """Recherche un personnage par alias ou nom d'affichage (insensible à la casse)."""
    key = name.strip().lower()
    if key in CHARS:
        return CHARS[key]
    # Correspondance partielle sur le display name ou l'univers
    for char in CHARS.values():
        if key in char["display"].lower():
            return char
    return None


def _power_bar(pct: int) -> str:
    filled = round(pct / 10)
    return "█" * filled + "░" * (10 - filled)


def _roll_result(p1: str, p2: str) -> tuple[str, int, int]:
    """Retourne (message_résultat, pct_p1, pct_p2)."""
    outcome = random.choices(["p1", "p2", "draw"], weights=[40, 40, 20])[0]
    if outcome == "p1":
        pct1 = random.randint(55, 88)
        msg = random.choice(WIN_MSGS).format(winner=p1)
        return msg, pct1, 100 - pct1
    if outcome == "p2":
        pct2 = random.randint(55, 88)
        msg = random.choice(WIN_MSGS).format(winner=p2)
        return msg, 100 - pct2, pct2
    return random.choice(DRAW_MSGS), 50, 50


# ═══════════════════════════════════════════════════════════════════
#  COG
# ═══════════════════════════════════════════════════════════════════

class DuelCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    # ── Autocomplete partagé ─────────────────────────────────────────
    async def _autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        curr = current.lower()
        choices: list[app_commands.Choice[str]] = []
        for key, data in CHARS.items():
            if curr in data["display"].lower() or curr in key or curr in data["univers"].lower():
                label = f"{data['emoji']} {data['display']}  —  {data['univers']}"
                choices.append(app_commands.Choice(name=label[:100], value=data["display"]))
        return choices[:25]

    # ── Commande /duel ───────────────────────────────────────────────
    @app_commands.command(
        name="duel",
        description="⚔️ Lance un duel épique entre deux personnages anime/shonen !",
    )
    @app_commands.describe(
        personnage1="1er combattant  (ex : Luffy, Naruto, Goku…)",
        personnage2="2ème combattant (ex : Zoro, Sasuke, Ichigo…)",
    )
    @app_commands.autocomplete(personnage1=_autocomplete, personnage2=_autocomplete)
    async def duel(
        self,
        interaction: discord.Interaction,
        personnage1: str,
        personnage2: str,
    ) -> None:
        await interaction.response.defer()

        # ── Résolution des données personnages ───────────────────────
        d1 = _get_char(personnage1)
        d2 = _get_char(personnage2)

        p1_name  = d1["display"] if d1 else personnage1.strip().title()
        p2_name  = d2["display"] if d2 else personnage2.strip().title()
        p1_gif   = d1["gif"]    if d1 else GIF_PLACEHOLDER
        p2_gif   = d2["gif"]    if d2 else GIF_PLACEHOLDER
        p1_titre = d1["titre"]  if d1 else "Combattant mystérieux"
        p2_titre = d2["titre"]  if d2 else "Combattant mystérieux"
        p1_univ  = d1["univers"] if d1 else "Univers inconnu"
        p2_univ  = d2["univers"] if d2 else "Univers inconnu"
        p1_emoji = d1["emoji"]  if d1 else "⚡"
        p2_emoji = d2["emoji"]  if d2 else "⚡"

        rivalry = random.choice(RIVALRY_PHRASES)
        result_msg, pct1, pct2 = _roll_result(p1_name, p2_name)

        # ── Embed principal — Battle Card ────────────────────────────
        main = discord.Embed(color=0xE63939)
        main.title = "⚔️  D U E L   É P I Q U E  ⚔️"
        main.description = (
            f"# {p1_emoji} **{p1_name}**  `VS`  **{p2_name}** {p2_emoji}\n"
            f"┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
            f"*{rivalry}*\n"
            f"┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄"
        )

        # Fiche combattant 1
        main.add_field(
            name=f"{p1_emoji} {p1_name}",
            value=(
                f"*{p1_titre}*\n"
                f"🌊 **{p1_univ}**\n"
                f"💪 `{_power_bar(pct1)}` **{pct1}%**"
            ),
            inline=True,
        )

        # Séparateur central (champ vide avec symbole)
        main.add_field(name="\u200b", value="```\n ⚔️ \n```", inline=True)

        # Fiche combattant 2
        main.add_field(
            name=f"{p2_emoji} {p2_name}",
            value=(
                f"*{p2_titre}*\n"
                f"🌊 **{p2_univ}**\n"
                f"💪 `{_power_bar(pct2)}` **{pct2}%**"
            ),
            inline=True,
        )

        # Résultat final
        main.add_field(
            name="┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
            value=f"🏆 **RÉSULTAT** ➜  {result_msg}",
            inline=False,
        )

        # Avertissement si un personnage est inconnu
        notes: list[str] = []
        if not d1:
            notes.append(f"⚠️ **{p1_name}** non reconnu — GIF générique utilisé")
        if not d2:
            notes.append(f"⚠️ **{p2_name}** non reconnu — GIF générique utilisé")
        if notes:
            main.add_field(name="\u200b", value="\n".join(notes), inline=False)

        main.set_footer(text="⚔️ Brams Score • Duel Arena  |  Que le plus fort gagne !")
        main.timestamp = discord.utils.utcnow()

        # ── Embed GIF — personnage 1 ─────────────────────────────────
        gif1 = discord.Embed(
            title=f"🔴 {p1_name}",
            color=0xFF4500,
        )
        gif1.set_image(url=p1_gif)

        # ── Embed GIF — personnage 2 ─────────────────────────────────
        gif2 = discord.Embed(
            title=f"🔵 {p2_name}",
            color=0x1E90FF,
        )
        gif2.set_image(url=p2_gif)

        # Discord affiche les 3 embeds dans la même bulle de message
        await interaction.followup.send(embeds=[main, gif1, gif2])
        log.info("[DuelCog] /duel  %s vs %s  → %s%% / %s%%", p1_name, p2_name, pct1, pct2)


# ═══════════════════════════════════════════════════════════════════
#  SETUP — appelé par bot.load_extension("cogs.duel")
# ═══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(DuelCog(bot))
    log.info("[DuelCog] Chargé ✅")
