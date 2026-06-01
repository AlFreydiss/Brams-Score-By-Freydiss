import asyncio
import json
import os
import re
import random
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
_MEMORY_EVERY    = 1
_COMMUNITY_MEMORY_UID = "__brams_important_people__"
_CREATOR_MEMORY_EDITOR_IDS = {523567699004227609, 1094070545248694342}

_KNOWN_MEMBERS: dict[int, dict[str, str]] = {
    523567699004227609: {
        "name": "Al Freydiss / Freydiss",
        "summary": "developpeur du bot, admin de Brams Community",
    },
    1094070545248694342: {
        "name": "Al Freydiss / Freydiss",
        "summary": "createur cote web/API, staff de Brams Community",
    },
    1079054995917381672: {
        "name": "Brams",
        "summary": "fondateur de Brams Community",
    },
    999607813334638692: {
        "name": "Berat",
        "summary": "admin de Brams Community",
    },
    670668161540161559: {
        "name": "BenActief",
        "summary": "staff de Brams Community",
    },
    1095386277169340426: {
        "name": "Mowgli",
        "summary": "staff de Brams Community",
    },
    239486561366835201: {
        "name": "Yoonae",
        "summary": "personne importante de Brams Community",
    },
    66201021684043787: {
        "name": "Nour",
        "summary": "personne importante de Brams Community",
    },
}
_FREYDISS_ID     = 523567699004227609
_VIOLET_GIF_DIR  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "violet_gifs")
_VIOLET_GIF_FILES = [
    "violet-blue-sky.gif",
    "violet-eye.gif",
    "violet-rain.gif",
    "violet-revelation.gif",
    "violet-mirror.gif",
]
_RE_VIOLET_BEST_ANIME = re.compile(
    r"\b(?:"
    r"quel\s+est\s+le\s+meilleur\s+anime(?:\s+(?:du\s+monde|de\s+tous\s+les\s+temps))?|"
    r"c[''’]?(?:est)?\s*quoi\s+le\s+meilleur\s+anime(?:\s+(?:du\s+monde|de\s+tous\s+les\s+temps))?|"
    r"best\s+anime(?:\s+(?:of\s+all\s+time|in\s+the\s+world))?|"
    r"what(?:'s|\s+is)\s+the\s+best\s+anime(?:\s+(?:of\s+all\s+time|in\s+the\s+world))?"
    r")\b",
    re.IGNORECASE,
)
_VIOLET_BEST_REPLY = (
    "Violet Evergarden.\n\n"
    "Parce que c'est l'un des rares animés qui ne se contente pas d'être beau : il est précis, sincère et construit avec une vraie retenue. "
    "Chaque épisode a une intention claire, chaque silence compte, chaque lettre dit quelque chose de plus grand que le dialogue lui-même. "
    "L'animation n'est jamais là pour faire joli gratuitement : elle sert l'émotion, elle la guide, elle la laisse respirer.\n\n"
    "Violet est aussi un personnage qui évolue pour de vrai. On ne la suit pas juste pour ses scènes fortes, mais pour la manière dont elle apprend le langage, le deuil, la guerre, la tendresse et le sens des mots. "
    "L'anime prend un sujet simple en apparence et le traite avec une élégance rare, sans surjouer, sans bruit inutile, sans effet facile. "
    "C'est justement pour ça qu'il reste au-dessus : il touche fort sans forcer, et il reste en tête longtemps après le générique."
)


def _violet_best_gif_path() -> str | None:
    candidates = [os.path.join(_VIOLET_GIF_DIR, name) for name in _VIOLET_GIF_FILES]
    available = [path for path in candidates if os.path.exists(path)]
    return random.choice(available) if available else None


async def _reply_violet_best_anime(message: discord.Message) -> bool:
    gif_path = _violet_best_gif_path()
    try:
        if gif_path:
            await message.reply(
                _VIOLET_BEST_REPLY,
                file=discord.File(gif_path, filename=os.path.basename(gif_path)),
                mention_author=False,
            )
        else:
            await message.reply(_VIOLET_BEST_REPLY, mention_author=False)
        return True
    except Exception as exc:
        print(f"[VIOLET BEST] envoi impossible: {exc}")
        return False

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
    "Tu maintiens la fiche memoire persistante d'un membre Discord de Brams Community. "
    "Cette fiche concerne UNIQUEMENT l'utilisateur courant, jamais une autre personne. "
    "Utilise uniquement les faits que l'utilisateur dit sur lui-meme, les roles Discord visibles, "
    "et les identites fixes fournies dans le contexte. N'invente rien. "
    "Garde les informations pertinentes pour le reconnaitre et personnaliser les futures reponses : "
    "pseudo/prefered name, roles, statut dans le serveur, apparence declaree, genre/pronoms si declare, "
    "gouts, aversions, projets, relations, habitudes, limites. "
    "Ignore les faits sur des tiers, les blagues vagues, insultes, secrets/tokens, infos bancaires, adresses, numeros de telephone, "
    "IDs Discord d'autres personnes et details trop temporaires. Si un nouveau fait contredit un ancien, garde le plus recent et note qu'il est declare par l'utilisateur. "
    "Retourne UNIQUEMENT une fiche courte en bullet points avec '-' ; max 220 mots. "
    "Si rien de pertinent n'est appris, retourne exactement la fiche actuelle."
)

_IDENTITY_QUESTION_RE = re.compile(
    r"\b("
    r"qui\s+suis[-\s]?je|"
    r"je\s+suis\s+qui|"
    r"tu\s+sais\s+qui\s+je\s+suis|"
    r"c[' ]?est\s+qui\s+moi"
    r")\b",
    re.IGNORECASE,
)

_PERSON_QUERY_RE = re.compile(
    r"\b(?:c['’]est\s+qui|qui\s+est|tu\s+connais)\s+(?P<name>[a-zA-ZÀ-ÿ0-9_ .'\-]{2,40})\??$"
    r"|^(?P<name2>[a-zA-ZÀ-ÿ0-9_ .'\-]{2,40})\s+c['’]est\s+qui\??$",
    re.IGNORECASE,
)
_PERSON_WITH_ID_RE = re.compile(
    r"\b(?:pour|sur|traitement\s+pour)\s+(?P<name>[a-zA-ZÀ-ÿ0-9_ .'\-]{2,40})\s+(?P<id>\d{15,25})\b",
    re.IGNORECASE,
)
_PERSON_FACT_RE = re.compile(
    r"^\s*(?P<name>[a-zA-ZÀ-ÿ0-9_ .'\-]{2,40})\s+(?:est|c['’]est)\s+(?P<fact>.+)$",
    re.IGNORECASE,
)
_PERSON_NEGATED_FACT_RE = re.compile(
    r"^\s*(?P<names>[a-zA-ZÀ-ÿ0-9_ .'\-]+(?:\s+et\s+[a-zA-ZÀ-ÿ0-9_ .'\-]+)+)\s+ne\s+sont\s+pas\s+(?P<fact>.+)$",
    re.IGNORECASE,
)
_LAST_TARGET_FACT_RE = re.compile(
    r"\b(?:c['’]?\s*(?:est\s*)?un|c['’]?\s*(?:est\s*)?une|c['’]?\s*(?:est\s*)?le|c['’]?\s*(?:est\s*)?la)\s+(?P<fact>[a-zA-ZÀ-ÿ0-9_ .'\-]{2,80})",
    re.IGNORECASE,
)

# user_id → {"channel_id", "history", "last_active", "memory", "exchange_count"}
_sessions: dict[int, dict] = {}
_editor_targets: dict[tuple[int, int], str] = {}


def _build_system(memory: str, user_context: str = "") -> str:
    parts = [_SYSTEM_BASE]
    parts.append(
        "Ne donne jamais l'ID Discord d'une personne dans une reponse publique. "
        "Les fiches de personnes importantes sont une source fiable uniquement quand elles sont fournies dans le contexte."
    )
    if user_context:
        parts.append(user_context)
    if memory:
        parts.append(f"Ce que tu sais sur cet utilisateur : {memory}")
    return " | ".join(parts)


def _format_memory_for_reply(memory: str, max_chars: int = 260) -> str:
    memory = (memory or "").strip()
    if not memory:
        return ""
    compact = re.sub(r"\s*\n\s*", " ", memory)
    compact = re.sub(r"\s+", " ", compact).strip(" -")
    if len(compact) > max_chars:
        compact = compact[:max_chars - 1].rstrip() + "…"
    return compact


def _ensure_known_member_memory(bot, uid: int, memory: str) -> str:
    known = _KNOWN_MEMBERS.get(uid)
    if not known:
        return memory

    pinned = f"- Identite fixe : {known['name']} ({known['summary']})."
    if known["name"].lower() in (memory or "").lower() and known["summary"].lower() in (memory or "").lower():
        return memory

    merged = f"{pinned}\n{memory}".strip() if memory else pinned
    bot.set_ai_memory(str(uid), merged)
    return merged


def _ensure_discord_profile_memory(bot, user, memory: str) -> str:
    if memory:
        return memory

    display_name = getattr(user, "display_name", None) or getattr(user, "name", None) or "inconnu"
    lines = [f"- Profil Discord : pseudo serveur actuel = {display_name}, id = {user.id}."]
    roles = _visible_roles(user)
    if roles:
        lines.append(f"- Roles Discord visibles : {', '.join(roles[:12])}.")

    profile = "\n".join(lines)
    bot.set_ai_memory(str(user.id), profile)
    return profile


def _is_creator_editor(user_id: int) -> bool:
    return int(user_id) in _CREATOR_MEMORY_EDITOR_IDS


def _person_key(name: str) -> str:
    name = re.sub(r"\s+", " ", name or "").strip(" .,!?:;").lower()
    return name[:80]


def _clean_person_name(name: str) -> str:
    return re.sub(r"\s+", " ", name or "").strip(" .,!?:;")[:80]


def _clean_fact(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip(" .,!?:;")
    text = re.sub(r"\bet\s+son\s+id\b.*", "", text, flags=re.IGNORECASE).strip(" .,!?:;")
    text = re.sub(r"\bid\b.*", "", text, flags=re.IGNORECASE).strip(" .,!?:;")
    return text[:180]


def _load_people_memory(bot) -> dict:
    raw = bot.get_ai_memory(_COMMUNITY_MEMORY_UID)
    if not raw:
        return {"people": {}}
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and isinstance(data.get("people"), dict):
            return data
    except Exception:
        pass
    return {"people": {}}


def _save_people_memory(bot, data: dict) -> None:
    bot.set_ai_memory(_COMMUNITY_MEMORY_UID, json.dumps(data, ensure_ascii=False, separators=(",", ":")))


def _seed_known_person(data: dict, member_id: int, info: dict[str, str]) -> None:
    key = _person_key(info["name"].split("/")[0])
    person = data.setdefault("people", {}).setdefault(
        key,
        {"name": info["name"].split("/")[0].strip(), "facts": [], "share_id": False},
    )
    person.setdefault("facts", [])
    person["id"] = str(member_id)
    person["share_id"] = False
    summary = info.get("summary", "").strip()
    if summary and summary not in person["facts"]:
        person["facts"].insert(0, summary)


def _ensure_people_seed(bot) -> dict:
    data = _load_people_memory(bot)
    changed = False
    before = json.dumps(data, sort_keys=True, ensure_ascii=False)
    for member_id, info in _KNOWN_MEMBERS.items():
        _seed_known_person(data, member_id, info)
    after = json.dumps(data, sort_keys=True, ensure_ascii=False)
    changed = before != after
    if changed:
        _save_people_memory(bot, data)
    return data


def _find_person(data: dict, name: str) -> dict | None:
    key = _person_key(name)
    if not key:
        return None
    people = data.get("people", {})
    if key in people:
        return people[key]
    for person in people.values():
        pname = _person_key(person.get("name", ""))
        if pname == key:
            return person
    return None


def _upsert_person_fact(bot, name: str, fact: str = "", *, member_id: str | None = None, negative: bool = False) -> dict:
    data = _ensure_people_seed(bot)
    key = _person_key(name)
    display = _clean_person_name(name)
    people = data.setdefault("people", {})
    person = people.setdefault(key, {"name": display, "facts": [], "share_id": False})
    person["name"] = person.get("name") or display
    person["share_id"] = False
    if member_id:
        person["id"] = str(member_id)

    fact = _clean_fact(fact)
    if fact:
        if negative:
            fact = f"n'est pas {fact}"
        facts = person.setdefault("facts", [])
        facts_lower = {f.lower() for f in facts}
        if fact.lower() not in facts_lower:
            facts.insert(0, fact)
        del facts[10:]

    _save_people_memory(bot, data)
    return person


def _answer_person_query(content: str, bot) -> str | None:
    m = _PERSON_QUERY_RE.search(content.strip())
    if not m:
        return None
    name = _clean_person_name(m.group("name") or m.group("name2"))
    data = _ensure_people_seed(bot)
    person = _find_person(data, name)
    if not person:
        return f"je connais pas encore {name} proprement."
    facts = [f for f in person.get("facts", []) if f]
    desc = ", ".join(facts[:3]) if facts else "personne importante de Brams Community"
    return f"{person.get('name', name)}, c'est {desc}."


def _handle_people_memory_update(content: str, user, bot, channel_id: int) -> tuple[str | None, bool]:
    text = content.strip()
    can_edit = _is_creator_editor(user.id)

    update_like = (
        _PERSON_WITH_ID_RE.search(text)
        or _PERSON_FACT_RE.search(text)
        or _PERSON_NEGATED_FACT_RE.search(text)
        or ("id" in text.lower() and "partage" in text.lower())
    )
    if update_like and not can_edit:
        return "je peux pas modifier la mémoire des personnes importantes. Seul Freydiss peut faire ça.", True

    if not can_edit:
        return None, False

    m = _PERSON_WITH_ID_RE.search(text)
    if m:
        person = _upsert_person_fact(bot, m.group("name"), member_id=m.group("id"))
        _editor_targets[(user.id, channel_id)] = person["name"]
        return f"c'est noté pour {person['name']}. Je garde son ID en interne et je ne le ressortirai pas.", True

    m = _PERSON_NEGATED_FACT_RE.search(text)
    if m:
        names = re.split(r"\s+et\s+", m.group("names"), flags=re.IGNORECASE)
        updated = []
        for name in names:
            person = _upsert_person_fact(bot, name, m.group("fact"), negative=True)
            updated.append(person["name"])
        if updated:
            _editor_targets[(user.id, channel_id)] = updated[-1]
            return f"c'est corrigé pour {', '.join(updated)}.", True

    m = _PERSON_FACT_RE.search(text)
    if m:
        fact = _clean_fact(m.group("fact"))
        if fact:
            person = _upsert_person_fact(bot, m.group("name"), fact)
            _editor_targets[(user.id, channel_id)] = person["name"]
            return f"c'est noté pour {person['name']} : {fact}.", True

    last_name = _editor_targets.get((user.id, channel_id))
    if last_name:
        if "id" in text.lower() and "partage" in text.lower():
            data = _ensure_people_seed(bot)
            existing = _find_person(data, last_name)
            if existing:
                existing["share_id"] = False
                _save_people_memory(bot, data)
            added = ""
            m_fact = _LAST_TARGET_FACT_RE.search(text)
            if m_fact:
                fact = _clean_fact(m_fact.group("fact"))
                if fact:
                    person = _upsert_person_fact(bot, last_name, fact)
                    added = f" J'ajoute aussi : {fact}."
            return f"ok, je ne partagerai pas l'ID de {last_name}.{added}", True

        m = _LAST_TARGET_FACT_RE.search(text)
        if m:
            fact = _clean_fact(m.group("fact"))
            if fact:
                person = _upsert_person_fact(bot, last_name, fact)
                return f"c'est ajouté pour {person['name']} : {fact}.", True

    return None, False


def _quote(value) -> str:
    if value is None:
        return "inconnu"
    return str(value).replace("|", "/")[:80]


def _build_user_context(user) -> str:
    display_name = _quote(getattr(user, "display_name", None))
    username = _quote(getattr(user, "name", None))
    global_name = _quote(getattr(user, "global_name", None))

    parts = [
        f"Utilisateur Discord actuel : id={user.id}, pseudo serveur={display_name}, username={username}, global_name={global_name}."
    ]
    known = _KNOWN_MEMBERS.get(user.id)
    if known:
        parts.append(
            f"Identite fixe : cet utilisateur est {known['name']} ({known['summary']}). "
            f"S'il demande qui il est, reponds clairement que c'est {known['name']}."
        )

    roles = _visible_roles(user)
    if roles:
        parts.append(f"Roles Discord visibles : {', '.join(roles[:12])}.")

    return " ".join(parts)


def _visible_roles(user) -> list[str]:
    return [
        role.name
        for role in getattr(user, "roles", [])
        if getattr(role, "name", "@everyone") != "@everyone"
    ]


def _direct_identity_answer(content: str, user, memory: str = "") -> str | None:
    if not _IDENTITY_QUESTION_RE.search(content):
        return None

    display_name = getattr(user, "display_name", None) or getattr(user, "name", None) or "toi"
    known = _KNOWN_MEMBERS.get(user.id)
    facts = _format_memory_for_reply(memory)
    if known:
        answer = f"t'es {known['name']}, {known['summary']}."
    else:
        answer = f"t'es {display_name} sur Discord. Je te reconnais avec ton compte Discord."
    if facts:
        answer += f" Dans ma memoire : {facts}"
    else:
        roles = _visible_roles(user)
        if roles:
            answer += f" Roles visibles : {', '.join(roles[:8])}."
    return answer


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

    # Essai toutes les clés Gemini en rotation (skip sur rate-limit aussi)
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
            continue  # rate-limit ou autre → clé suivante

    # Fallback Groq
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        raise RuntimeError("no_keys")
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


async def _update_memory_task(bot, uid: int, current_memory: str, history: list[dict], user_context: str = ""):
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
        prompt = (
            f"Contexte utilisateur fiable :\n{user_context or '(aucun)'}\n\n"
            f"Fiche actuelle :\n{current_memory or '(vide)'}\n\n"
            f"Échange récent :\n{exchange_text}"
        )
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


async def _respond(
    session: dict,
    uid: int,
    content: str,
    bot,
    user_context: str = "",
    update_personal_memory: bool = True,
) -> str | None:
    """Appelle l'IA, met à jour la session. Retourne la réponse ou None si erreur."""
    session["history"].append({"role": "user", "content": content})
    _trim_history(session)

    try:
        answer = await _call_ai(_build_system(session["memory"], user_context), session["history"])
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
    if update_personal_memory and session["exchange_count"] % _MEMORY_EVERY == 0:
        asyncio.create_task(
            _update_memory_task(bot, uid, session["memory"], session["history"], user_context)
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

        uid     = interaction.user.id
        memory  = self.bot.get_ai_memory(uid)
        memory  = _ensure_known_member_memory(self.bot, uid, memory)
        memory  = _ensure_discord_profile_memory(self.bot, interaction.user, memory)
        session = _get_or_create_session(uid, interaction.channel_id, memory)
        session["memory"] = memory

        answer, handled_memory_update = _handle_people_memory_update(
            question,
            interaction.user,
            self.bot,
            interaction.channel_id,
        )
        if answer is None:
            answer = _answer_person_query(question, self.bot)
        if answer is None:
            answer = _direct_identity_answer(question, interaction.user, memory)
        if answer is None:
            if not _get_gemini_keys() and not os.environ.get("GROQ_API_KEY"):
                await interaction.followup.send("❌ Aucune clé API configurée — contacte un admin.", ephemeral=True)
                return
            answer = await _respond(
                session,
                uid,
                question,
                self.bot,
                user_context=_build_user_context(interaction.user),
                update_personal_memory=not handled_memory_update,
            )

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

        if _RE_VIOLET_BEST_ANIME.search(content):
            await _reply_violet_best_anime(message)
            return

        uid     = message.author.id
        memory  = self.bot.get_ai_memory(uid)
        memory  = _ensure_known_member_memory(self.bot, uid, memory)
        memory  = _ensure_discord_profile_memory(self.bot, message.author, memory)
        session = _get_or_create_session(uid, message.channel.id, memory)
        session["memory"] = memory

        answer, handled_memory_update = _handle_people_memory_update(
            content,
            message.author,
            self.bot,
            message.channel.id,
        )
        if answer is None:
            answer = _answer_person_query(content, self.bot)
        if answer is None:
            answer = _direct_identity_answer(content, message.author, memory)
        if answer is None:
            async with message.channel.typing():
                answer = await _respond(
                    session,
                    uid,
                    content,
                    self.bot,
                    user_context=_build_user_context(message.author),
                    update_personal_memory=not handled_memory_update,
                )

        if not answer:
            return

        # Erreurs : message casual au lieu du message technique
        if answer.startswith("⏳"):
            try:
                await message.reply("je peux pas répondre là, réessaie dans quelques minutes", mention_author=False)
            except Exception:
                pass
            return
        if answer.startswith(("⏱️", "❌")):
            return  # autres erreurs → silence

        answer = _strip_markdown(answer)
        if len(answer) > 2000:
            answer = answer[:1997] + "…"

        await message.reply(answer, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
    print("[INFO] Cog enregistré ✅")
