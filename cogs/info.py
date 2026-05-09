import os
import discord
import litellm
from discord import app_commands
from discord.ext import commands

GUILD_IDS = [
    int(x)
    for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")
]

_MODEL = "groq/llama-3.3-70b-versatile"

_SYSTEM = """\
Tu es le bot officiel du serveur Discord "Brams Community", une communauté francophone passionnée par One Piece.

Contexte du serveur :
- Le serveur s'appelle Brams Community. Brams est le fondateur et figure centrale du serveur — c'est un membre respecté, passionné de One Piece, connu pour son charisme et son humour. C'est LUI qui a créé et fait vivre cette communauté.
- Les admins/modérateurs principaux sont : Brams, BenActief, Berat, Freydiss (qui a développé ce bot).
- Le serveur tourne autour de One Piece mais accueille aussi d'autres animés, du gaming, et des discussions générales.
- La monnaie du serveur s'appelle les Berries (฿), comme dans One Piece.

Ton rôle :
- Répondre à TOUTES les questions avec précision et intelligence : culture générale, One Piece, autres animés, histoire, sciences, maths, géographie, langue française, gaming, conseils, etc.
- Si on te demande qui est Brams : c'est le fondateur et chef du serveur Brams Community, une personne influente et respectée dans la communauté.
- Tu NE DIS JAMAIS que tu es une IA, un modèle de langage, ou que tu es "basé sur" quoi que ce soit. Tu es simplement le bot du serveur.
- Si tu ne connais pas quelque chose avec certitude, dis-le honnêtement sans inventer.
- Réponds dans la même langue que la question (français par défaut).
- Sois précis, direct, et va à l'essentiel. Maximum 3 paragraphes courts.
- Pas de phrases d'intro inutiles comme "Bien sûr !" ou "Excellente question !". Réponds directement.
- Utilise du markdown Discord simple (gras, italique) si ça rend la réponse plus lisible.\
"""


class InfoCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="question",
        description="❓ Pose une question au bot — il répond à tout !",
    )
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(question="Ta question")
    async def question(self, interaction: discord.Interaction, question: str):
        await interaction.response.defer()

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            await interaction.followup.send(
                "❌ Clé API manquante — contacte un admin.", ephemeral=True
            )
            return

        try:
            resp = await litellm.acompletion(
                model=_MODEL,
                api_key=api_key,
                max_tokens=700,
                temperature=0.4,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": question},
                ],
            )
            answer = resp.choices[0].message.content.strip()
        except Exception as e:
            await interaction.followup.send(
                f"❌ Erreur : `{e}`", ephemeral=True
            )
            return

        if len(answer) > 4000:
            answer = answer[:3997] + "…"

        embed = discord.Embed(
            description=answer,
            color=0x5865F2,
        )
        embed.set_author(
            name=f"{interaction.user.display_name} demande :",
            icon_url=interaction.user.display_avatar.url,
        )
        embed.set_footer(text=f"❓ {question[:120]}{'…' if len(question) > 120 else ''}")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
