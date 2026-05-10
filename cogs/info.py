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

_MODEL_GEMINI    = "gemini/gemini-2.0-flash"
_MODEL_GROQ      = "groq/llama-3.3-70b-versatile"
_SESSION_TIMEOUT = 600
_MAX_HISTORY     = 14
_MEMORY_EVERY    = 5

_gemini_key_index = 0  # rotation round-robin


def _get_gemini_keys() -> list[str]:
    """Lit toutes les clés GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2… depuis l'env."""
    keys = []
    base = os.environ.get("GEMINI_API_KEY", "")
    if base:
        keys.append(base)
    i = 1
    while True:
        k = os.environ.get(f"GEMINI_API_KEY_{i}", "")
        if not k:
            break
        keys.append(k)
        i += 1
    return keys


def _next_gemini_key() -> str | None:
    global _gemini_key_index
    keys = _get_gemini_keys()
    if not keys:
        return None
    key = keys[_gemini_key_index % len(keys)]
    _gemini_key_index = (_gemini_key_index + 1) % len(keys)
    return key

_SYSTEM_BASE = (
    "Tu es Brams Score, le bot du serveur Discord 'Brams Community' (One Piece, francophone). "
    "Tu parles comme un pote décontracté : familier, direct, un peu taquin, jamais formel. "
    "Pas de 'bonjour', pas de 'bien sûr !', pas d'intro — tu réponds direct comme dans un chat. "
    "Brams = fondateur du serveur. Admins : Brams, BenActief, Berat, Freydiss (dev du bot). "
    "Monnaie du serveur = Berries (฿). "
    "Tu réponds à tout : One Piece, culture générale, gaming, sciences, etc. "
    "Ne mentionne jamais être une IA. Réponds dans la langue de l'utilisateur. "
    "Sois court et punchy (max 2 paragraphes). Si t'as rien à dire, dis-le franchement. "
    "INTERDIT : ne jamais utiliser ** * __ # ``` ni aucun markdown. Texte brut uniquement."
)

_MEMORY_SYSTEM = (
    "Mets à jour la fiche mémoire de cet utilisateur avec les nouveaux faits appris. "
    "Retourne UNIQUEMENT des bullet points concis (prénom, âge, goûts, opinions confirmés). "
    "Max 150 mots. Si rien de nouveau, retourne la fiche inchangée."
)

# user_id → {"channel_id", "history", "last_active", "memory", "exchange_count"}
_sessions: dict[int, dict] = {}


def _build_system(memory: str) -> str:
    if not memory:
        return _SYSTEM_BASE
    return _SYSTEM_BASE + f" | Ce que tu sais sur cet utilisateur : {memory}"


def _strip_mention(content: str, bot_id: int) -> str:
    return re.sub(rf"<@!?{bot_id}>", "", content).strip()


def _strip_markdown(text: str) -> str:
    # Titres ## / ### etc.
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Gras/italique **text** *text* ***text***
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text, flags=re.DOTALL)
    # Souligné __text__ _text_
    text = re.sub(r"_{1,2}(.+?)_{1,2}", r"\1", text, flags=re.DOTALL)
    # Code inline/bloc
    text = re.sub(r"```[\s\S]*?```", lambda m: m.group(0).replace("```", ""), text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    # Listes à puces (- item / • item)
    text = re.sub(r"^[\-\•\–]\s+", "", text, flags=re.MULTILINE)
    # Listes numérotées (1. item)
    text = re.sub(r"^\d+\.\s+", "", text, flags=re.MULTILINE)
    # Liens [texte](url)
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    # Astérisques/underscores résiduels isolés
    text = re.sub(r"(?<!\w)[*_]{1,3}(?!\w)", "", text)
    # Lignes vides multiples → une seule
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _parse_retry_after(error_str: str) -> str:
    m = re.search(r"try again in ([0-9a-z .]+)\.", error_str, re.IGNORECASE)
    return m.group(1).strip() if m else "quelques minutes"


def _get_or_create_session(uid: int, channel_id: int, memory: str) -> dict:
    s = _sessions.get(uid)
    if s is None or s["channel_id"] != channel_id or time.time() - s["last_active"] > _SESSION_TIMEOUT:
        _sessions[uid] = {
            "channel_id":     channel_id,
            "history":        [],
            "last_active":    time.time(),
            "memory":         memory,
            "exchange_count": 0,
        }
    return _sessions[uid]


def _trim_history(session: dict):
    if len(session["history"]) > _MAX_HISTORY:
        session["history"] = session["history"][-_MAX_HISTORY:]


async def _call_ai(system: str, history: list[dict]) -> str:
    msgs = [{"role": "system", "content": system}] + history

    # Essai toutes les clés Gemini en rotation
    gemini_keys = _get_gemini_keys()
    for _ in range(len(gemini_keys)):
        key = _next_gemini_key()
        try:
            resp = await asyncio.wait_for(
                litellm.acompletion(
                    model=_MODEL_GEMINI,
                    api_key=key,
                    max_tokens=450,
                    temperature=0.8,
                    request_timeout=25,
                    messages=msgs,
                ),
                timeout=30,
            )
            return resp.choices[0].message.content.strip()
        except asyncio.TimeoutError:
            raise
        except Exception:
            continue  # essaie la clé suivante

    # Fallback Groq
    groq_key = os.environ.get("GROQ_API_KEY", "")
    resp = await asyncio.wait_for(
        litellm.acompletion(
            model=_MODEL_GROQ,
            api_key=groq_key,
            max_tokens=450,
            temperature=0.8,
            request_timeout=25,
            messages=msgs,
        ),
        timeout=30,
    )
    return resp.choices[0].message.content.strip()


async def _update_memory_task(bot, uid: int, current_memory: str, history: list[dict]):
    try:
        gemini_keys = _get_gemini_keys()
        model   = _MODEL_GEMINI if gemini_keys else _MODEL_GROQ
        api_key = (gemini_keys[_gemini_key_index % len(gemini_keys)] if gemini_keys
                   else os.environ.get("GROQ_API_KEY", ""))
        last = history[-4:] if len(history) >= 4 else history
        exchange_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Bot'}: {m['content'][:300]}"
            for m in last
        )
        prompt = f"Fiche actuelle :\n{current_memory or '(vide)'}\n\nÉchange récent :\n{exchange_text}"
        resp = await asyncio.wait_for(
            litellm.acompletion(
                model=model,
                api_key=api_key,
                max_tokens=180,
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
        if uid in _sessions:
            _sessions[uid]["memory"] = new_memory
    except Exception:
        pass


def _handle_error(e: Exception) -> str:
    s = str(e)
    if "rate_limit" in s.lower() or "ratelimit" in s.lower():
        wait = _parse_retry_after(s)
        return f"⏳ Limite quotidienne atteinte — réessaie dans **{wait}**."
    return f"❌ Erreur : `{type(e).__name__}`"


async def _respond(session: dict, uid: int, content: str, bot) -> str | None:
    """Appelle l'IA, met à jour la session. Retourne la réponse ou None si erreur."""
    session["history"].append({"role": "user", "content": content})
    _trim_history(session)

    try:
        answer = await _call_ai(_build_system(session["memory"]), session["history"])
    except asyncio.TimeoutError:
        session["history"].pop()
        return "⏱️ Trop long à répondre — réessaie !"
    except Exception as e:
        session["history"].pop()
        return _handle_error(e)

    session["history"].append({"role": "assistant", "content": answer})
    session["last_active"] = time.time()
    session["exchange_count"] += 1

    # Mise à jour mémoire tous les N échanges seulement
    if session["exchange_count"] % _MEMORY_EVERY == 0:
        asyncio.create_task(
            _update_memory_task(bot, uid, session["memory"], session["history"])
        )

    return answer


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

        if not _get_gemini_keys() and not os.environ.get("GROQ_API_KEY"):
            await interaction.followup.send("❌ Aucune clé API configurée — contacte un admin.", ephemeral=True)
            return

        uid     = interaction.user.id
        memory  = self.bot.get_ai_memory(uid)
        session = _get_or_create_session(uid, interaction.channel_id, memory)

        answer = await _respond(session, uid, question, self.bot)

        is_error = answer.startswith("⏱️") or answer.startswith("❌") or answer.startswith("⏳")
        if is_error:
            await interaction.followup.send(answer, ephemeral=True)
            return

        answer = _strip_markdown(answer)
        if len(answer) > 4000:
            answer = answer[:3997] + "…"

        embed = discord.Embed(description=answer, color=0x5865F2)
        embed.set_author(
            name=f"{interaction.user.display_name} demande :",
            icon_url=interaction.user.display_avatar.url,
        )
        embed.set_footer(
            text=f"❓ {question[:120]}{'…' if len(question) > 120 else ''} • @mentionne-moi ou reply pour continuer"
        )
        await interaction.followup.send(embed=embed)

    # ── Listener messages ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return

        bot_mentioned  = self.bot.user in message.mentions
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

        uid     = message.author.id
        memory  = self.bot.get_ai_memory(uid)
        session = _get_or_create_session(uid, message.channel.id, memory)

        async with message.channel.typing():
            answer = await _respond(session, uid, content, self.bot)

        answer = _strip_markdown(answer)
        if len(answer) > 2000:
            answer = answer[:1997] + "…"

        await message.reply(answer, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
