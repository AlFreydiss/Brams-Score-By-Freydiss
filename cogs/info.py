import os
import discord
import litellm
from discord import app_commands
from discord.ext import commands

GUILD_IDS = [
    int(x)
    for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")
]

_MODEL   = "groq/llama-3.3-70b-versatile"
_SYSTEM  = (
    "Tu es un assistant intelligent et sympa intégré dans un serveur Discord One Piece francophone. "
    "Tu réponds à toutes les questions : One Piece, culture générale, gaming, science, histoire, maths, "
    "langues, conseils, etc. Réponds dans la même langue que l'utilisateur. "
    "Sois clair, précis et concis — maximum 3 paragraphes. "
    "Pas de markdown excessif. Évite les listes à puces sauf si vraiment nécessaire."
)


class InfoCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="info",
        description="🤖 Pose une question à l'IA — elle répond à tout !",
    )
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(question="Ta question")
    async def info(self, interaction: discord.Interaction, question: str):
        await interaction.response.defer()

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            await interaction.followup.send(
                "❌ `GROQ_API_KEY` manquante dans les variables Railway.", ephemeral=True
            )
            return

        try:
            resp = await litellm.acompletion(
                model=_MODEL,
                api_key=api_key,
                max_tokens=600,
                temperature=0.7,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": question},
                ],
            )
            answer = resp.choices[0].message.content.strip()
        except Exception as e:
            await interaction.followup.send(
                f"❌ L'IA n'a pas pu répondre : `{e}`", ephemeral=True
            )
            return

        if len(answer) > 4000:
            answer = answer[:3997] + "…"

        embed = discord.Embed(
            description=answer,
            color=0x5865F2,
        )
        embed.set_author(
            name=f"Question de {interaction.user.display_name}",
            icon_url=interaction.user.display_avatar.url,
        )
        embed.set_footer(text=f"❓ {question[:100]}{'…' if len(question) > 100 else ''}")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
