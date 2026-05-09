import asyncio
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
_SESSION_TIMEOUT = 600
_MAX_HISTORY     = 20

_SYSTEM_BASE = """\
Tu es le bot officiel du serveur Discord "Brams Community", une communauté francophone passionnée par One Piece.

Contexte du serveur :
- Le serveur s'appelle Brams Community. Brams est le fondateur et figure centrale du serveur — c'est un membre respecté, passionné de One Piece, connu pour son charisme et son humour.
- Les admins/modérateurs principaux sont : Brams, BenActief, Berat, Freydiss (qui a développé ce bot).
- Le serveur tourne autour de One Piece mais accueille aussi d'autres animés, du gaming, et des discussions générales.
- La monnaie du serveur s'appelle les Berries (฿), comme dans One Piece.

Ton rôle :
- Répondre à TOUTES les questions avec précision et intelligence : culture générale, One Piece, autres animés, histoire, sciences, maths, géographie, langue française, gaming, conseils, etc.
- Si on te demande qui est Brams : c'est le fondateur et chef du serveur Brams Community.
- Tu NE DIS JAMAIS que tu es une IA, un modèle de langage, ou que tu es "basé sur" quoi que ce soit. Tu es simplement le bot du serveur.
- Si tu ne connais pas quelque chose avec certitude, dis-le honnêtement sans inventer.
- Réponds dans la même langue que la question (français par défaut).
- Sois précis, direct, et va à l'essentiel. Maximum 3 paragraphes courts.
- Pas de phrases d'intro inutiles comme "Bien sûr !" ou "Excellente question !". Réponds directement.
- Utilise du markdown Discord simple (gras, italique) si ça rend la réponse plus lisible.
- Tu te souviens de tout ce qui a été dit dans la conversation en cours ET de ce que tu sais déjà sur cet utilisateur.\
"""

_MEMORY_SYSTEM = """\
Tu maintiens une fiche mémoire sur un utilisateur Discord.
À partir de la conversation fournie, extrais et mets à jour les faits personnels importants :
prénom/pseudo réel, âge, centres d'intérêt, animés préférés, opinions, situation, préférences, etc.
Retourne UNIQUEMENT la fiche mise à jour en bullet points très concis (une ligne par fait).
Maximum 200 mots. Ne garde que des faits confirmés explicitement par l'utilisateur.
Si rien de nouveau, retourne la fiche inchangée.\
"""

# user_id → {"channel_id": int, "history": list, "last_active": float, "memory": str}
_sessions: dict[int, dict] = {}


def _build_system(memory: str) -> str:
    if not memory:
        return _SYSTEM_BASE
    return _SYSTEM_BASE + f"\n\nCe que tu sais déjà sur cet utilisateur :\n{memory}"


def _strip_mention(content: str, bot_id: int) -> str:
    return re.sub(rf"<@!?{bot_id}>", "", content).strip()


def _get_or_create_session(uid: int, channel_id: int, memory: str) -> dict:
    s = _sessions.get(uid)
    if s is None or s["channel_id"] != channel_id or time.time() - s["last_active"] > _SESSION_TIMEOUT:
        _sessions[uid] = {
            "channel_id": channel_id,
            "history": [],
            "last_active": time.time(),
            "memory": memory,
        }
    return _sessions[uid]


def _trim_history(session: dict):
    if len(session["history"]) > _MAX_HISTORY:
        session["history"] = session["history"][-_MAX_HISTORY:]


async def _call_ai(system: str, history: list[dict]) -> str:
    resp = await asyncio.wait_for(
        litellm.acompletion(
            model=_MODEL,
            api_key=os.environ.get("GROQ_API_KEY", ""),
            max_tokens=700,
            temperature=0.4,
            request_timeout=25,
            messages=[{"role": "system", "content": system}] + history,
        ),
        timeout=30,
    )
    return resp.choices[0].message.content.strip()


async def _update_memory_task(bot, uid: int, current_memory: str, history: list[dict]):
    """Mise à jour de la mémoire en arrière-plan — n'impacte pas le temps de réponse."""
    try:
        last = history[-6:] if len(history) >= 6 else history
        exchange_text = "\n".join(
            f"{'Utilisateur' if m['role'] == 'user' else 'Bot'}: {m['content']}"
            for m in last
        )
        prompt = (
            f"Fiche actuelle :\n{current_memory or '(vide)'}\n\n"
            f"Dernier échange :\n{exchange_text}"
        )
        resp = await asyncio.wait_for(
            litellm.acompletion(
                model=_MODEL,
                api_key=os.environ.get("GROQ_API_KEY", ""),
                max_tokens=300,
                temperature=0.1,
                request_timeout=15,
                messages=[
                    {"role": "system", "content": _MEMORY_SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
            ),
            timeout=20,
        )
        new_memory = resp.choices[0].message.content.strip()
        bot.set_ai_memory(str(uid), new_memory)
        # Met à jour aussi la session en cours si elle existe encore
        if uid in _sessions:
            _sessions[uid]["memory"] = new_memory
    except Exception:
        pass  # best-effort


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

        uid    = interaction.user.id
        memory = self.bot.get_ai_memory(uid)
        session = _get_or_create_session(uid, interaction.channel_id, memory)

        session["history"].append({"role": "user", "content": question})
        _trim_history(session)

        try:
            answer = await _call_ai(_build_system(session["memory"]), session["history"])
        except asyncio.TimeoutError:
            await interaction.followup.send(
                "⏱️ La réponse a pris trop de temps — réessaie dans quelques secondes.", ephemeral=True
            )
            session["history"].pop()
            return
        except Exception as e:
            await interaction.followup.send(f"❌ Erreur : `{e}`", ephemeral=True)
            session["history"].pop()
            return

        session["history"].append({"role": "assistant", "content": answer})
        session["last_active"] = time.time()

        # Mise à jour mémoire en arrière-plan
        asyncio.create_task(
            _update_memory_task(self.bot, uid, session["memory"], session["history"])
        )

        if len(answer) > 4000:
            answer = answer[:3997] + "…"

        embed = discord.Embed(description=answer, color=0x5865F2)
        embed.set_author(
            name=f"{interaction.user.display_name} demande :",
            icon_url=interaction.user.display_avatar.url,
        )
        embed.set_footer(
            text=f"❓ {question[:120]}{'…' if len(question) > 120 else ''} • @mentionne-moi pour continuer la conversation"
        )
        await interaction.followup.send(embed=embed)

    # ── Listener messages ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return

        bot_mentioned = self.bot.user in message.mentions
        replied_to_bot = (
            message.reference is not None
            and isinstance(message.reference.resolved, discord.Message)
            and message.reference.resolved.author == self.bot.user
        )

        if not bot_mentioned and not replied_to_bot:
            return

        content = _strip_mention(message.content, self.bot.user.id)
        if not content:
            return

        uid    = message.author.id
        memory = self.bot.get_ai_memory(uid)
        session = _get_or_create_session(uid, message.channel.id, memory)

        session["history"].append({"role": "user", "content": content})
        _trim_history(session)
        session["last_active"] = time.time()

        try:
            async with message.channel.typing():
                answer = await _call_ai(_build_system(session["memory"]), session["history"])
        except asyncio.TimeoutError:
            await message.reply("⏱️ Trop long à répondre — réessaie !", mention_author=False)
            session["history"].pop()
            return
        except Exception as e:
            await message.reply(f"❌ Erreur : `{e}`", mention_author=False)
            session["history"].pop()
            return

        session["history"].append({"role": "assistant", "content": answer})

        # Mise à jour mémoire en arrière-plan
        asyncio.create_task(
            _update_memory_task(self.bot, uid, session["memory"], session["history"])
        )

        if len(answer) > 2000:
            answer = answer[:1997] + "…"

        await message.reply(answer, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
