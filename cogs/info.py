import os
import re
import time
import discord
import litellm
from discord import app_commands
from discord.ext import commands, tasks

GUILD_IDS = [
    int(x)
    for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")
]

_MODEL           = "groq/llama-3.3-70b-versatile"
_SESSION_TIMEOUT = 600   # secondes d'inactivité avant fermeture de session
_MAX_HISTORY     = 20    # messages max dans l'historique (10 échanges)

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
- Utilise du markdown Discord simple (gras, italique) si ça rend la réponse plus lisible.
- Tu te souviens de tout ce qui a été dit dans la conversation en cours.\
"""

# user_id → {"channel_id": int, "history": list, "last_active": float}
_sessions: dict[int, dict] = {}


def _strip_mention(content: str, bot_id: int) -> str:
    """Retire la mention du bot en début de message."""
    return re.sub(rf"<@!?{bot_id}>", "", content).strip()


def _get_or_create_session(uid: int, channel_id: int) -> dict:
    s = _sessions.get(uid)
    if s is None or s["channel_id"] != channel_id or time.time() - s["last_active"] > _SESSION_TIMEOUT:
        _sessions[uid] = {"channel_id": channel_id, "history": [], "last_active": time.time()}
    return _sessions[uid]


async def _call_ai(history: list[dict]) -> str:
    api_key = os.environ.get("GROQ_API_KEY", "")
    resp = await litellm.acompletion(
        model=_MODEL,
        api_key=api_key,
        max_tokens=700,
        temperature=0.4,
        messages=[{"role": "system", "content": _SYSTEM}] + history,
    )
    return resp.choices[0].message.content.strip()


def _trim_history(session: dict):
    if len(session["history"]) > _MAX_HISTORY:
        session["history"] = session["history"][-_MAX_HISTORY:]


class InfoCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cleanup_sessions.start()

    def cog_unload(self):
        self._cleanup_sessions.cancel()

    @tasks.loop(minutes=5)
    async def _cleanup_sessions(self):
        now  = time.time()
        dead = [uid for uid, s in _sessions.items() if now - s["last_active"] > _SESSION_TIMEOUT]
        for uid in dead:
            del _sessions[uid]

    # ── /question ─────────────────────────────────────────────────────

    @app_commands.command(
        name="question",
        description="❓ Pose une question au bot — il répond à tout !",
    )
    @app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])
    @app_commands.describe(question="Ta question")
    async def question(self, interaction: discord.Interaction, question: str):
        await interaction.response.defer()

        if not os.environ.get("GROQ_API_KEY"):
            await interaction.followup.send("❌ Clé API manquante — contacte un admin.", ephemeral=True)
            return

        uid     = interaction.user.id
        session = _get_or_create_session(uid, interaction.channel_id)

        session["history"].append({"role": "user", "content": question})
        _trim_history(session)

        try:
            answer = await _call_ai(session["history"])
        except Exception as e:
            await interaction.followup.send(f"❌ Erreur : `{e}`", ephemeral=True)
            session["history"].pop()
            return

        session["history"].append({"role": "assistant", "content": answer})
        session["last_active"] = time.time()

        if len(answer) > 4000:
            answer = answer[:3997] + "…"

        embed = discord.Embed(description=answer, color=0x5865F2)
        embed.set_author(
            name=f"{interaction.user.display_name} demande :",
            icon_url=interaction.user.display_avatar.url,
        )
        embed.set_footer(
            text=f"❓ {question[:120]}{'…' if len(question) > 120 else ''} • Réponds ou @mentionne-moi pour continuer"
        )
        await interaction.followup.send(embed=embed)

    # ── Listener messages ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return
        if message.content.startswith("/"):
            return

        uid          = message.author.id
        bot_mentioned = self.bot.user in message.mentions

        # Contenu nettoyé (retire la mention du bot si présente)
        content = _strip_mention(message.content, self.bot.user.id) if bot_mentioned else message.content
        if not content:
            return

        session = _sessions.get(uid)
        has_active_session = (
            session is not None
            and message.channel.id == session["channel_id"]
            and time.time() - session["last_active"] <= _SESSION_TIMEOUT
        )

        # Répond si : session active dans ce salon, OU bot mentionné directement
        if not has_active_session and not bot_mentioned:
            return

        # Mention sans session → ouvre une nouvelle session
        session = _get_or_create_session(uid, message.channel.id)

        session["history"].append({"role": "user", "content": content})
        _trim_history(session)
        session["last_active"] = time.time()

        try:
            async with message.channel.typing():
                answer = await _call_ai(session["history"])
        except Exception as e:
            await message.reply(f"❌ Erreur : `{e}`")
            session["history"].pop()
            return

        session["history"].append({"role": "assistant", "content": answer})

        if len(answer) > 2000:
            answer = answer[:1997] + "…"

        await message.reply(answer, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
