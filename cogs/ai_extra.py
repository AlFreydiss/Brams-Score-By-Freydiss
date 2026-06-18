# -*- coding: utf-8 -*-
"""Pack de fonctionnalités IA du serveur — aventure interactive, avis de recherche,
horoscope, clash, éloge, destin, nakama, journal, traduction pirate.

Réutilise la rotation de clés Gemini→Groq de cogs.info et le contexte live
exposé par bot.py (ai_member_stats / ai_server_snapshot / ai_overlap_partner).
"""

import asyncio
import json
import os
import random
import re
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import discord
import litellm
from discord import app_commands
from discord.ext import commands

from .info import (
    GUILD_IDS,
    _MODEL_GEMINI,
    _MODEL_GROQ,
    _call_ai,
    _get_gemini_keys,
    _next_gemini_key,
    _strip_markdown,
)

GOLD    = discord.Color.from_rgb(212, 175, 55)
PARIS   = ZoneInfo("Europe/Paris")
_FOOTER = "⚓ BRAMS SCORE BY FREYDISS"
_GUILD_DECORATOR = app_commands.guilds(*[discord.Object(id=gid) for gid in GUILD_IDS])


def _fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def _stats_block(bot, member) -> str:
    """Vraies stats du membre, formatées pour un prompt."""
    try:
        st = bot.ai_member_stats(member)
    except Exception:
        return f"Membre : {member.display_name}."
    ranks = ", ".join(st["ranks"]) if st["ranks"] else "Moussaillon (aucun rang)"
    line = (
        f"Membre : {member.display_name}. Vocal 7 derniers jours : {st['hours_7d']}h, vocal total : {st['hours_total']}h. "
        f"Messages 7j : {st['messages_7d']}, total : {st['messages_total']}. "
        f"Solde : {st['berrys']:,} berrys. Prime : {st['prime']:,} berrys. Rangs : {ranks}."
    )
    if st["next_rank"]:
        line += f" Prochain rang : {st['next_rank']} dans {st['hours_to_next']}h."
    if st["in_voice"]:
        line += " En vocal en ce moment."
    if st["marine_levy_count"]:
        line += f" Taxé {st['marine_levy_count']} fois par la Marine ({st['marine_levy_total']:,} berrys)."
    return line


async def _call_ai_json(system: str, user_msg: str, max_tokens: int = 800, temperature: float = 0.9) -> dict | None:
    """Comme _call_ai mais force du JSON (rotation Gemini puis fallback Groq)."""
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user_msg}]

    async def _try(model: str, key: str) -> str:
        resp = await asyncio.wait_for(
            litellm.acompletion(
                model=model, api_key=key, max_tokens=max_tokens, temperature=temperature,
                request_timeout=25, response_format={"type": "json_object"}, messages=msgs,
            ),
            timeout=30,
        )
        return resp.choices[0].message.content.strip()

    raw = None
    for _ in range(len(_get_gemini_keys())):
        key = _next_gemini_key()
        try:
            raw = await _try(_MODEL_GEMINI, key)
            break
        except Exception:
            continue
    if raw is None:
        groq_key = os.environ.get("GROQ_API_KEY", "")
        if groq_key:
            try:
                raw = await _try(_MODEL_GROQ, groq_key)
            except Exception:
                return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    return None


async def _call_ai_text(system: str, prompt: str) -> str | None:
    try:
        answer = await _call_ai(system, [{"role": "user", "content": prompt}])
        return _strip_markdown(answer)
    except Exception:
        return None


def _err_embed(msg: str = "L'IA est en pause clope, réessaie dans une minute ⏳") -> discord.Embed:
    return discord.Embed(description=f"❌ {msg}", color=0xe74c3c)


# ═══════════════════════════════════════════════════════════════════
#  /aventure — histoire interactive One Piece avec mise en berrys
# ═══════════════════════════════════════════════════════════════════

_ADV_CHAPTERS    = 5
_ADV_MAX_BET     = 200_000
_ADV_FREE_WIN    = 15_000
_ADV_FREE_SURVIE = 5_000
_ADV_SESSIONS: dict[int, dict] = {}

_ADV_SYSTEM = (
    "Tu es le narrateur d'une aventure interactive dans l'univers de One Piece, sur Grand Line. "
    "Le héros est un vrai membre du serveur Discord Brams Community : ses stats te sont fournies, "
    "glisse-les dans le récit (son rang, sa prime, ses heures de vocal deviennent des éléments de l'histoire). "
    "Ton style : immersif, nerveux, drôle, en français, à la 2e personne du singulier. Scènes de 60 à 110 mots. "
    f"L'aventure dure exactement {_ADV_CHAPTERS} chapitres : la tension monte, chaque choix a des conséquences réelles, "
    "le désastre est possible si le joueur enchaîne les mauvais choix. Sois cohérent avec les choix passés. "
    "Réponds UNIQUEMENT en JSON valide, sans aucun texte autour.\n"
    f"Chapitres 1 à {_ADV_CHAPTERS - 1} : " + '{"scene": "...", "choices": ["choix A", "choix B", "choix C"], "done": false}\n'
    f"Chapitre final ({_ADV_CHAPTERS}) : " + '{"scene": "...", "done": true, "outcome": "triomphe" ou "survie" ou "desastre", "epilogue": "une phrase de morale piratesque"}\n'
    "Le champ outcome doit refléter honnêtement la qualité des choix du joueur sur toute l'aventure."
)


def _adv_messages(session: dict) -> str:
    return "\n".join(
        f"{'JOUEUR' if h['role'] == 'user' else 'NARRATEUR'}: {h['content']}"
        for h in session["history"]
    )


async def _adv_call(session: dict) -> dict | None:
    data = await _call_ai_json(_ADV_SYSTEM, _adv_messages(session), max_tokens=600)
    if not data or "scene" not in data:
        return None
    if not data.get("done") and not (isinstance(data.get("choices"), list) and len(data["choices"]) >= 2):
        return None
    return data


def _adv_chapter_embed(session: dict, data: dict, hero: discord.Member) -> discord.Embed:
    n = session["chapter"]
    bar = "▰" * n + "▱" * (_ADV_CHAPTERS - n)
    choices = data.get("choices", [])[:3]
    letters = ["🇦", "🇧", "🇨"]
    choice_lines = "\n\n".join(f"{letters[i]} {c}" for i, c in enumerate(choices))
    embed = discord.Embed(
        title=f"🗺️ AVENTURE — Chapitre {n}/{_ADV_CHAPTERS}",
        description=(
            f"`{bar}`\n\n"
            f"{data['scene']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{choice_lines}"
        ),
        color=GOLD,
    )
    embed.set_thumbnail(url=hero.display_avatar.url)
    mise = f"💰 Mise : {_fmt(session['bet'])} ฿ — abandon = mise perdue" if session["bet"] else "💰 Sans mise — triomphe = bonus"
    embed.set_footer(text=f"{_FOOTER} • {mise}")
    return embed


def _adv_final_embed(session: dict, data: dict, hero: discord.Member, payout_line: str) -> discord.Embed:
    outcome = data.get("outcome", "survie")
    titles = {
        "triomphe": ("🏆 TRIOMPHE SUR GRAND LINE", discord.Color.from_rgb(46, 204, 113)),
        "survie":   ("🌊 TU AS SURVÉCU… DE JUSTESSE", discord.Color.from_rgb(52, 152, 219)),
        "desastre": ("☠️ DÉSASTRE EN MER", discord.Color.from_rgb(231, 76, 60)),
    }
    title, color = titles.get(outcome, titles["survie"])
    epilogue = data.get("epilogue", "")
    embed = discord.Embed(
        title=title,
        description=(
            f"{data['scene']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚓ *{epilogue}*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{payout_line}"
        ),
        color=color,
    )
    embed.set_thumbnail(url=hero.display_avatar.url)
    embed.set_footer(text=f"{_FOOTER} • Fin de l'aventure")
    return embed


class _AdvView(discord.ui.View):
    def __init__(self, cog: "AIExtraCog", session: dict, choices: list[str]):
        super().__init__(timeout=240)
        self._cog = cog
        self._session = session
        for i, label in enumerate(["A", "B", "C"][: len(choices[:3])]):
            btn = discord.ui.Button(label=label, style=discord.ButtonStyle.primary)
            btn.callback = self._make_cb(i, choices[i])
            self.add_item(btn)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self._session["user_id"]:
            await interaction.response.send_message("C'est pas ton aventure, moussaillon 🏴‍☠️", ephemeral=True)
            return False
        return True

    def _make_cb(self, idx: int, choice_text: str):
        async def _cb(interaction: discord.Interaction):
            await interaction.response.defer()
            await self._cog._adv_advance(interaction, self._session, choice_text)
            self.stop()
        return _cb

    async def on_timeout(self):
        session = self._session
        if session.get("ended"):
            return
        session["ended"] = True
        _ADV_SESSIONS.pop(session["user_id"], None)
        msg = session.get("msg")
        if msg:
            embed = discord.Embed(
                title="💤 Aventure abandonnée",
                description=(
                    "Le héros s'est endormi sur le pont. Le navire dérive…\n\n"
                    + (f"💸 Mise perdue : {_fmt(session['bet'])} ฿" if session["bet"] else "Pas de mise, pas de casse.")
                ),
                color=0x7f8c8d,
            )
            try:
                await msg.edit(embed=embed, view=None)
            except Exception:
                pass


# ═══════════════════════════════════════════════════════════════════

_HOROSCOPE_CACHE: dict[str, discord.Embed] = {}
_HOROSCOPE_ASTRES = [
    "Luffy", "Zoro", "Nami", "Usopp", "Sanji", "Chopper", "Robin", "Franky", "Brook", "Jinbe",
    "Shanks", "Mihawk", "Ace", "Sabo", "Law", "Doflamingo", "Katakuri", "Yamato", "Buggy", "Garp",
]
_HOROSCOPE_MERS = ["East Blue", "West Blue", "North Blue", "South Blue", "Grand Line", "le Nouveau Monde"]

_JOURNAL_COOLDOWN: dict[int, float] = {}
_JOURNAL_DELAY = 300


class AIExtraCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_app_command_error(self, interaction: discord.Interaction, error):
        if isinstance(error, app_commands.CommandOnCooldown):
            try:
                await interaction.response.send_message(
                    f"⏳ Doucement moussaillon, réessaie dans {error.retry_after:.0f}s.", ephemeral=True
                )
            except Exception:
                pass
            return
        raise error

    # ── /aventure ─────────────────────────────────────────────────

    @app_commands.command(name="aventure", description="🗺️ Aventure One Piece interactive — tes choix, ton destin (mise en berrys optionnelle)")
    @_GUILD_DECORATOR
    @app_commands.describe(mise=f"Berrys misés (0 = gratuit, max {_ADV_MAX_BET:,}) — triomphe = x2, survie = remboursé, désastre = perdu")
    @app_commands.checks.cooldown(1, 60.0)
    async def aventure(self, interaction: discord.Interaction, mise: app_commands.Range[int, 0, _ADV_MAX_BET] = 0):
        uid = interaction.user.id
        if uid in _ADV_SESSIONS:
            await interaction.response.send_message("⚓ T'as déjà une aventure en cours, finis-la d'abord !", ephemeral=True)
            return
        if mise > 0 and not self.bot.spend_berrys(str(uid), mise):
            await interaction.response.send_message(
                f"💸 Pas assez de berrys pour miser {_fmt(mise)} ฿.", ephemeral=True
            )
            return

        await interaction.response.defer()
        session = {
            "user_id": uid, "bet": mise, "chapter": 1, "ended": False,
            "history": [{
                "role": "user",
                "content": (
                    f"{_stats_block(self.bot, interaction.user)} "
                    f"Mise engagée : {mise} berrys. "
                    "Invente une aventure One Piece ORIGINALE (thème surprise : île maudite, trésor, Marine, "
                    "yonkou, créature des abysses, mystère…). Écris le chapitre 1."
                ),
            }],
        }

        data = await _adv_call(session)
        if not data:
            if mise > 0:
                self.bot.add_berrys(str(uid), mise, track="refund")  # remboursement ≠ gain
            await interaction.followup.send(embed=_err_embed("Le narrateur a le mal de mer. Mise remboursée."))
            return

        session["history"].append({"role": "assistant", "content": json.dumps(data, ensure_ascii=False)})
        _ADV_SESSIONS[uid] = session
        view = _AdvView(self, session, data.get("choices", []))
        msg = await interaction.followup.send(embed=_adv_chapter_embed(session, data, interaction.user), view=view)
        session["msg"] = msg

    async def _adv_advance(self, interaction: discord.Interaction, session: dict, choice_text: str):
        # busy = anti double-clic pendant la latence de génération du chapitre suivant
        if session.get("ended") or session.get("busy"):
            return
        session["busy"] = True
        uid = session["user_id"]
        session["chapter"] += 1
        final = session["chapter"] >= _ADV_CHAPTERS
        session["history"].append({
            "role": "user",
            "content": (
                f"Choix du joueur : « {choice_text} ». "
                + (f"C'est le chapitre FINAL ({_ADV_CHAPTERS}/{_ADV_CHAPTERS}) : conclus l'aventure avec done=true, outcome et epilogue."
                   if final else f"Écris le chapitre {session['chapter']}/{_ADV_CHAPTERS}.")
            ),
        })

        data = await _adv_call(session)
        if not data:
            session["ended"] = True
            _ADV_SESSIONS.pop(uid, None)
            if session["bet"] > 0:
                self.bot.add_berrys(str(uid), session["bet"], track="refund")  # remboursement ≠ gain
            try:
                await interaction.edit_original_response(embed=_err_embed("Le narrateur s'est noyé en pleine histoire. Mise remboursée."), view=None)
            except Exception:
                pass
            return

        session["history"].append({"role": "assistant", "content": json.dumps(data, ensure_ascii=False)})

        if data.get("done") or final:
            session["ended"] = True
            _ADV_SESSIONS.pop(uid, None)
            outcome = data.get("outcome", "survie")
            bet = session["bet"]
            if outcome == "triomphe":
                gain = bet * 2 if bet else _ADV_FREE_WIN
                bal = self.bot.add_berrys(str(uid), gain, track="earned")
                payout = f"💰 **+{_fmt(gain)} ฿** ! Solde : `{_fmt(bal)} ฿`"
            elif outcome == "survie":
                gain = bet if bet else _ADV_FREE_SURVIE
                # mise remboursée = refund (≠ gain) ; prime de survie sans mise = vrai gain
                bal = self.bot.add_berrys(str(uid), gain, track="refund" if bet else "earned")
                payout = (f"💰 Mise remboursée : **{_fmt(gain)} ฿**. Solde : `{_fmt(bal)} ฿`" if bet
                          else f"💰 Prime de survie : **+{_fmt(gain)} ฿**. Solde : `{_fmt(bal)} ฿`")
            else:
                payout = (f"💸 Mise engloutie : **-{_fmt(bet)} ฿**. La mer ne rend rien." if bet
                          else "💸 Tu repars les poches vides — mais vivant. Enfin, presque.")
            await interaction.edit_original_response(
                embed=_adv_final_embed(session, data, interaction.user, payout), view=None
            )
        else:
            view = _AdvView(self, session, data.get("choices", []))
            await interaction.edit_original_response(
                embed=_adv_chapter_embed(session, data, interaction.user), view=view
            )
            session["busy"] = False

    # ── /avis_de_recherche ────────────────────────────────────────

    @app_commands.command(name="avis_de_recherche", description="☠️ Le Gouvernement Mondial émet ton avis de recherche (motifs basés sur tes vraies stats)")
    @_GUILD_DECORATOR
    @app_commands.describe(membre="Le pirate recherché (toi par défaut)")
    @app_commands.checks.cooldown(1, 30.0)
    async def avis_de_recherche(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        cible = membre or interaction.user
        if cible.bot:
            await interaction.response.send_message("Les bots sont des agents du Gouvernement, ils ne sont pas recherchés 🕵️", ephemeral=True)
            return
        await interaction.response.defer()

        system = (
            "Tu rédiges des avis de recherche du Gouvernement Mondial (univers One Piece) pour les membres "
            "d'un serveur Discord. Ton : officiel, pompeux, mais les motifs sont absurdes et drôles, directement "
            "tirés des vraies stats fournies (heures de vocal, messages, taxes Marine, berrys, rang). "
            "Jamais de moquerie sur le physique ou la vie privée. En français. "
            'Réponds UNIQUEMENT en JSON : {"epithete": "surnom de pirate percutant (2-4 mots)", '
            '"motifs": ["motif 1", "motif 2", "motif 3"], "citation": "déclaration arrogante du pirate à son arrestation ratée"}'
        )
        data = await _call_ai_json(system, _stats_block(self.bot, cible), max_tokens=400)
        if not data:
            await interaction.followup.send(embed=_err_embed())
            return

        try:
            prime = self.bot.ai_member_stats(cible)["prime"]
        except Exception:
            prime = 0
        motifs = "\n".join(f"• {m}" for m in data.get("motifs", [])[:4])
        embed = discord.Embed(
            title="☠️ WANTED — DEAD OR ALIVE",
            description=(
                f"# {cible.display_name.upper()}\n"
                f"*dit « {data.get('epithete', 'le Sans-Nom')} »*\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"**MOTIFS DE RECHERCHE**\n{motifs}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 **PRIME : `{_fmt(prime)} ฿`**\n\n"
                f"🗣️ *« {data.get('citation', '…')} »*"
            ),
            color=discord.Color.from_rgb(200, 162, 75),
        )
        embed.set_thumbnail(url=cible.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Gouvernement Mondial — Justice Absolue")
        await interaction.followup.send(embed=embed)

    # ── /horoscope ────────────────────────────────────────────────

    @app_commands.command(name="horoscope", description="🔮 Ton horoscope pirate du jour — astre gardien, prédiction et conseil de Grand Line")
    @_GUILD_DECORATOR
    @app_commands.checks.cooldown(2, 60.0)
    async def horoscope(self, interaction: discord.Interaction):
        today = datetime.now(PARIS).strftime("%Y-%m-%d")
        cache_key = f"{interaction.user.id}-{today}"
        if cache_key in _HOROSCOPE_CACHE:
            await interaction.response.send_message(embed=_HOROSCOPE_CACHE[cache_key])
            return
        await interaction.response.defer()

        rng = random.Random(cache_key)
        astre = rng.choice(_HOROSCOPE_ASTRES)
        mer = rng.choice(_HOROSCOPE_MERS)
        chiffre = rng.randint(1, 99)

        system = (
            "Tu es l'astrologue de Grand Line (univers One Piece). Tu écris des horoscopes pirates du jour : "
            "drôles, imagés, légèrement mystiques, personnalisés avec les stats fournies. En français, tutoiement. "
            'Réponds UNIQUEMENT en JSON : {"prediction": "prédiction du jour (40-60 mots)", '
            '"vocal": "présage sur sa semaine vocale (15-25 mots)", "conseil": "conseil de pirate (10-20 mots)"}'
        )
        prompt = f"{_stats_block(self.bot, interaction.user)} Astre gardien du jour : {astre}. Mer dominante : {mer}."
        data = await _call_ai_json(system, prompt, max_tokens=350)
        if not data:
            await interaction.followup.send(embed=_err_embed("Les astres sont couverts, réessaie plus tard."))
            return

        embed = discord.Embed(
            title=f"🔮 HOROSCOPE PIRATE — {interaction.user.display_name.upper()}",
            description=(
                f"⭐ **Astre gardien** : `{astre}`　🌊 **Mer dominante** : `{mer}`　🎲 **Chiffre** : `{chiffre}`\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{data.get('prediction', '…')}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎙️ **Vocal** : {data.get('vocal', '…')}\n"
                f"⚓ **Conseil** : *{data.get('conseil', '…')}*"
            ),
            color=discord.Color.from_rgb(155, 89, 182),
        )
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Valable jusqu'à minuit, heure de Paris")
        _HOROSCOPE_CACHE[cache_key] = embed
        if len(_HOROSCOPE_CACHE) > 500:
            for k in [k for k in _HOROSCOPE_CACHE if not k.endswith(today)]:
                _HOROSCOPE_CACHE.pop(k, None)
        await interaction.followup.send(embed=embed)

    # ── /clash & /eloge ───────────────────────────────────────────

    @app_commands.command(name="clash", description="🔥 Le bot clash un membre — vannes basées sur ses vraies stats")
    @_GUILD_DECORATOR
    @app_commands.describe(membre="La victime")
    @app_commands.checks.cooldown(1, 30.0)
    async def clash(self, interaction: discord.Interaction, membre: discord.Member):
        if membre.bot:
            await interaction.response.send_message("Je clash pas mes frères de code 🤖", ephemeral=True)
            return
        await interaction.response.defer()
        system = (
            "Tu es le vanneur officiel d'un serveur Discord One Piece. On te donne les vraies stats d'un membre : "
            "écris un clash drôle et créatif de 50-80 mots, UNIQUEMENT basé sur ses stats et sa vie de serveur "
            "(heures de vocal, messages, berrys, rang, taxes Marine). "
            "INTERDIT : physique, famille, origines, religion, vie privée. Taquin, jamais haineux. "
            "En français, tutoiement, texte brut sans markdown."
        )
        texte = await _call_ai_text(system, _stats_block(self.bot, membre))
        if not texte:
            await interaction.followup.send(embed=_err_embed())
            return
        embed = discord.Embed(
            title=f"🔥 CLASH — {membre.display_name.upper()}",
            description=texte[:2000],
            color=discord.Color.from_rgb(231, 76, 60),
        )
        embed.set_thumbnail(url=membre.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Demandé par {interaction.user.display_name} • /eloge pour te rattraper")
        await interaction.followup.send(content=membre.mention, embed=embed)

    @app_commands.command(name="eloge", description="👑 Le bot rédige l'éloge légendaire d'un membre, digne des récits de Grand Line")
    @_GUILD_DECORATOR
    @app_commands.describe(membre="Le membre à célébrer")
    @app_commands.checks.cooldown(1, 30.0)
    async def eloge(self, interaction: discord.Interaction, membre: discord.Member):
        if membre.bot:
            await interaction.response.send_message("Les bots n'ont pas besoin de gloire, juste d'uptime 🤖", ephemeral=True)
            return
        await interaction.response.defer()
        system = (
            "Tu es le barde d'un serveur Discord One Piece. On te donne les vraies stats d'un membre : "
            "écris un éloge épique et sincère de 50-80 mots, comme une légende qu'on raconte dans les tavernes "
            "de Grand Line. Transforme ses stats en exploits (heures de vocal = veilles héroïques, messages = "
            "harangues, berrys = trésor, rang = titre). En français, texte brut sans markdown."
        )
        texte = await _call_ai_text(system, _stats_block(self.bot, membre))
        if not texte:
            await interaction.followup.send(embed=_err_embed())
            return
        embed = discord.Embed(
            title=f"👑 LÉGENDE DE GRAND LINE — {membre.display_name.upper()}",
            description=texte[:2000],
            color=GOLD,
        )
        embed.set_thumbnail(url=membre.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Demandé par {interaction.user.display_name}")
        await interaction.followup.send(content=membre.mention, embed=embed)

    # ── /destin ───────────────────────────────────────────────────

    @app_commands.command(name="destin", description="🦈 Madame Shyarly lit ton avenir dans sa boule de cristal")
    @_GUILD_DECORATOR
    @app_commands.checks.cooldown(1, 45.0)
    async def destin(self, interaction: discord.Interaction):
        await interaction.response.defer()
        today = datetime.now(PARIS).strftime("%Y-%m-%d")
        proba = random.Random(f"{interaction.user.id}-{today}-destin").randint(13, 97)
        system = (
            "Tu es Madame Shyarly, la voyante sirène de l'île des Hommes-Poissons (One Piece). "
            "Tu lis l'avenir d'un membre du serveur dans ta boule de cristal : une vision mystérieuse, poétique "
            "et légèrement inquiétante de 40-70 mots, qui s'appuie sur ses vraies stats comme présages. "
            "Termine toujours par une phrase ambiguë. En français, tutoiement, texte brut sans markdown."
        )
        texte = await _call_ai_text(system, _stats_block(self.bot, interaction.user))
        if not texte:
            await interaction.followup.send(embed=_err_embed("La boule de cristal est embuée…"))
            return
        embed = discord.Embed(
            title="🦈 LA VISION DE MADAME SHYARLY",
            description=(
                f"*La fumée s'épaissit… la boule s'illumine…*\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{texte[:1800]}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎱 **Probabilité d'accomplissement** : `{proba}%`"
            ),
            color=discord.Color.from_rgb(72, 61, 139),
        )
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Les visions de Shyarly ne se trompent jamais. Sauf parfois.")
        await interaction.followup.send(embed=embed)

    # ── /nakama ───────────────────────────────────────────────────

    @app_commands.command(name="nakama", description="🤝 Découvre ton nakama : le membre avec qui tu partages le plus de vocal (7 jours)")
    @_GUILD_DECORATOR
    @app_commands.checks.cooldown(1, 30.0)
    async def nakama(self, interaction: discord.Interaction):
        await interaction.response.defer()
        try:
            partner_uid, heures = self.bot.ai_overlap_partner(interaction.user)
        except Exception:
            partner_uid, heures = None, 0.0

        partner = interaction.guild.get_member(int(partner_uid)) if partner_uid else None
        if not partner or heures < 0.1:
            embed = discord.Embed(
                title="🤝 NAKAMA INTROUVABLE",
                description=(
                    "Aucun compagnon de vocal détecté sur les 7 derniers jours…\n\n"
                    "Un pirate sans équipage, c'est juste un naufragé avec de l'ambition. "
                    "Rejoins un vocal et reviens me voir ⚓"
                ),
                color=0x7f8c8d,
            )
            await interaction.followup.send(embed=embed)
            return

        system = (
            "Tu écris la légende d'un duo de pirates (univers One Piece) : deux membres d'un serveur Discord "
            "qui ont passé beaucoup d'heures en vocal ensemble cette semaine. 40-70 mots : raconte leur complicité "
            "comme un duo iconique de Grand Line (sans copier un duo existant). Chaleureux et drôle. "
            "En français, texte brut sans markdown."
        )
        texte = await _call_ai_text(
            system,
            f"Duo : {interaction.user.display_name} et {partner.display_name}. "
            f"Temps vocal partagé sur 7 jours : {heures:.1f} heures.",
        )
        embed = discord.Embed(
            title="🤝 TON NAKAMA DE LA SEMAINE",
            description=(
                f"# {interaction.user.display_name} ⚓ {partner.display_name}\n\n"
                f"🎙️ **Temps partagé (7j)** : `{heures:.1f}h`\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{(texte or 'Deux silhouettes sur le même pont, et la mer qui les écoute.')[:1500]}"
            ),
            color=GOLD,
        )
        embed.set_thumbnail(url=partner.display_avatar.url)
        embed.set_footer(text=f"{_FOOTER} • Calculé sur le chevauchement réel de vos sessions vocales")
        await interaction.followup.send(embed=embed)

    # ── /journal ──────────────────────────────────────────────────

    @app_commands.command(name="journal", description="📰 La une du Brams Times — l'actu du serveur écrite par la rédaction")
    @_GUILD_DECORATOR
    async def journal(self, interaction: discord.Interaction):
        now = time.time()
        gid = interaction.guild_id
        if now - _JOURNAL_COOLDOWN.get(gid, 0) < _JOURNAL_DELAY:
            restant = int(_JOURNAL_DELAY - (now - _JOURNAL_COOLDOWN[gid]))
            await interaction.response.send_message(
                f"📰 La prochaine édition part à l'imprimerie dans {restant}s.", ephemeral=True
            )
            return
        await interaction.response.defer()

        try:
            snap = self.bot.ai_server_snapshot(interaction.guild)
        except Exception:
            snap = {"actifs_7j": 0, "top_vocal_7j": [], "en_vocal_maintenant": []}
        top = ", ".join(f"{t['nom']} ({t['heures_7j']}h)" for t in snap["top_vocal_7j"]) or "personne"
        vocs = " ; ".join(f"{v['salon']} : {', '.join(v['membres'][:6])}" for v in snap["en_vocal_maintenant"][:4]) or "aucun vocal occupé"

        system = (
            "Tu es la rédaction du Brams Times, le journal du serveur Discord Brams Community (univers One Piece, "
            "façon journal de Morgans avec les News Coo). On te donne l'état réel du serveur : écris l'édition du jour. "
            "Ton : sensationnaliste et drôle, comme la presse de Grand Line, mais les CHIFFRES restent exacts. En français. "
            'Réponds UNIQUEMENT en JSON : {"une": "gros titre choc (8-14 mots)", '
            '"article": "article principal sur le top vocal (40-60 mots)", '
            '"breve": "brève sur les vocaux du moment ou la vie du serveur (25-40 mots)", '
            '"meteo": "météo fantaisiste de Grand Line (10-18 mots)"}'
        )
        prompt = (
            f"Date : {datetime.now(PARIS).strftime('%d/%m/%Y %H:%M')} (Paris). "
            f"Membres actifs en vocal sur 7 jours : {snap['actifs_7j']}. Top vocal 7j : {top}. "
            f"En vocal maintenant : {vocs}."
        )
        data = await _call_ai_json(system, prompt, max_tokens=500)
        if not data:
            await interaction.followup.send(embed=_err_embed("Le News Coo s'est perdu en route."))
            return

        _JOURNAL_COOLDOWN[gid] = now
        embed = discord.Embed(
            title="📰 LE BRAMS TIMES",
            description=(
                f"*Édition du {datetime.now(PARIS).strftime('%d/%m/%Y')} — 100 ฿ le numéro, offert par la maison*\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"# {data.get('une', 'RIEN À SIGNALER, ET C·EST DÉJÀ SUSPECT')}\n\n"
                f"{data.get('article', '…')}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🗞️ **EN BREF** : {data.get('breve', '…')}\n\n"
                f"🌦️ **MÉTÉO DE GRAND LINE** : {data.get('meteo', '…')}"
            ),
            color=discord.Color.from_rgb(236, 240, 241),
        )
        if interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)
        embed.set_footer(text=f"{_FOOTER} • Rédigé par Morgans, vérifié par personne")
        await interaction.followup.send(embed=embed)

    # ── /pirate ───────────────────────────────────────────────────

    @app_commands.command(name="pirate", description="🏴‍☠️ Traduis ton message en parler pirate de Grand Line")
    @_GUILD_DECORATOR
    @app_commands.describe(message="Le message à traduire (max 300 caractères)")
    @app_commands.checks.cooldown(2, 30.0)
    async def pirate(self, interaction: discord.Interaction, message: app_commands.Range[str, 1, 300]):
        await interaction.response.defer()
        system = (
            "Tu traduis des messages en parler pirate français truculent (univers One Piece) : jurons de marin "
            "inventés, vocabulaire de navigation, références à Grand Line, aux berrys, à la Marine. "
            "Garde le SENS du message d'origine, même longueur approximative. Texte brut sans markdown."
        )
        texte = await _call_ai_text(system, message)
        if not texte:
            await interaction.followup.send(embed=_err_embed())
            return
        embed = discord.Embed(
            description=(
                f"💬 *{message[:300]}*\n\n"
                f"⬇️\n\n"
                f"🏴‍☠️ **{texte[:1500]}**"
            ),
            color=GOLD,
        )
        embed.set_author(name=f"{interaction.user.display_name} parle pirate", icon_url=interaction.user.display_avatar.url)
        embed.set_footer(text=_FOOTER)
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(AIExtraCog(bot))
    print("[AI_EXTRA] Cog enregistré ✅")
