# -*- coding: utf-8 -*-
"""Client IA unique du bot (Gemini en premier, Groq en secours).

Les modèles ne sont plus écrits en dur : la liste des modèles actifs est
demandée à Google et à Groq au démarrage puis toutes les 12 h, et le meilleur
disponible est choisi tout seul. Quand un fournisseur coupe un modèle, l'appel
passe au suivant et la liste est rechargée — plus de panne comme en oct. 2026
(gemini-2.0-flash et llama-3.3-70b-versatile coupés sans prévenir).

Forcer un modèle reste possible via Railway > Variables :
AI_MODEL_GEMINI (ex. gemini/gemini-3.6-flash) / AI_MODEL_GROQ (ex. groq/openai/gpt-oss-120b).
"""

import asyncio
import os
import re
import time

import aiohttp
import litellm

litellm.drop_params = True          # ignore les params non supportés au lieu de planter
litellm.suppress_debug_info = True  # pas de « Give Feedback » à chaque erreur dans les logs

_REFRESH_EVERY = 12 * 3600
_LIST_TIMEOUT  = aiohttp.ClientTimeout(total=8)

# Secours si les listes de modèles sont injoignables
_FALLBACK_GEMINI = ["gemini/gemini-3.6-flash", "gemini/gemini-2.5-flash"]
_FALLBACK_GROQ   = ["groq/openai/gpt-oss-120b", "groq/qwen/qwen3.6-27b"]

# Ordre de préférence Groq ; tout autre modèle de chat actif passe après
_GROQ_PREFERRED = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]
_GROQ_NOT_CHAT = re.compile(r"whisper|guard|tts|orpheus|playai|compound|distil|safeguard|embed", re.I)
_GEMINI_STABLE = re.compile(r"^models/(gemini-(\d+(?:\.\d+)?)-flash(-lite)?)$")
# Modèle saturé / lent : on le met de côté un moment, inutile d'essayer les autres clés
_MODEL_BUSY    = re.compile(r"\b503\b|UNAVAILABLE|overloaded|high demand|timed? ?out|Timeout", re.I)
# Clé sans crédit / invalide / bloquée : de côté 1 h. Quota par minute : 1 min.
_KEY_DEAD      = re.compile(r"\b40[123]\b|credits are depleted|billing|api key not valid|invalid api key|permission", re.I)
_KEY_LIMITED   = re.compile(r"\b429\b|rate.?limit|quota|RESOURCE_EXHAUSTED", re.I)
_MODEL_COOLDOWN = 600
_MODEL_GONE    = re.compile(
    r"not[ _]found|decommissioned|deprecated|does not exist|no longer|model_not_found|is not supported|retired|404",
    re.I,
)

_state = {"gemini": list(_FALLBACK_GEMINI), "groq": list(_FALLBACK_GROQ), "refreshed": 0.0}
_dead: set[str] = set()
_refresh_lock = asyncio.Lock()
_key_index = {"gemini": 0, "groq": 0}
_model_until: dict[str, float] = {}  # modèle -> pas avant ce moment (saturé/lent)
_key_until:   dict[str, float] = {}  # clé -> pas avant ce moment (sans crédit, quota)
_last_good:   dict[str, str]   = {}  # fournisseur -> dernier modèle qui a répondu
_latency:     dict[str, float] = {}  # modèle -> temps de réponse moyen (s), le plus rapide passe devant
_LATENCY_UNKNOWN = 6.0


def _note_latency(model: str, seconds: float) -> None:
    old = _latency.get(model)
    _latency[model] = seconds if old is None else old * 0.7 + seconds * 0.3


class AIUnavailable(RuntimeError):
    """Aucun modèle n'a répondu ; .last garde la dernière erreur fournisseur."""

    def __init__(self, msg: str, last: Exception | None = None):
        super().__init__(f"{msg} ({type(last).__name__}: {last})" if last else msg)
        self.last = last


# ── Clés ──────────────────────────────────────────────────────────────

def gemini_keys() -> list[str]:
    """GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2…"""
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


def groq_keys() -> list[str]:
    k = os.environ.get("GROQ_API_KEY", "")
    return [k] if k else []


def has_keys() -> bool:
    return bool(gemini_keys() or groq_keys())


def _rotated(provider: str, keys: list[str]) -> list[str]:
    now  = time.time()
    keys = [k for k in keys if _key_until.get(k, 0) <= now]
    if not keys:
        return []
    i = _key_index[provider] % len(keys)
    _key_index[provider] = (i + 1) % len(keys)
    return keys[i:] + keys[:i]


# ── Choix automatique des modèles ─────────────────────────────────────

async def _list_gemini(sess: aiohttp.ClientSession) -> list[str]:
    keys = gemini_keys()
    if not keys:
        return []
    url = "https://generativelanguage.googleapis.com/v1beta/models"
    async with sess.get(url, params={"pageSize": 1000, "key": keys[0]}, timeout=_LIST_TIMEOUT) as r:
        r.raise_for_status()
        data = await r.json()
    found = []
    for m in data.get("models", []):
        if "generateContent" not in m.get("supportedGenerationMethods", []):
            continue
        hit = _GEMINI_STABLE.match(m.get("name", ""))
        if hit:
            version = tuple(int(x) for x in hit.group(2).split("."))
            found.append((version, hit.group(3) is None, hit.group(1)))
    # version la plus récente d'abord, la version complète avant la lite
    found.sort(reverse=True)
    return [f"gemini/{name}" for _, _, name in found[:4]]


async def _list_groq(sess: aiohttp.ClientSession) -> list[str]:
    keys = groq_keys()
    if not keys:
        return []
    url = "https://api.groq.com/openai/v1/models"
    async with sess.get(url, headers={"Authorization": f"Bearer {keys[0]}"}, timeout=_LIST_TIMEOUT) as r:
        r.raise_for_status()
        data = await r.json()
    active = {
        m["id"] for m in data.get("data", [])
        if m.get("active", True) and not _GROQ_NOT_CHAT.search(m.get("id", ""))
    }
    ordered = [m for m in _GROQ_PREFERRED if m in active]
    ordered += sorted(active - set(ordered))
    return [f"groq/{m}" for m in ordered[:4]]


async def refresh_models(force: bool = False) -> None:
    async with _refresh_lock:
        if not force and time.time() - _state["refreshed"] < _REFRESH_EVERY:
            return
        _state["refreshed"] = time.time()
        async with aiohttp.ClientSession() as sess:
            for provider, lister in (("gemini", _list_gemini), ("groq", _list_groq)):
                try:
                    models = await lister(sess)
                except Exception as e:
                    print(f"[IA] liste des modèles {provider} indisponible : {type(e).__name__}: {e}")
                    continue
                if models and models != _state[provider]:
                    print(f"[IA] modèles {provider} : {_state[provider]} → {models}")
                    _state[provider] = models
        _dead.clear()


def _candidates(provider: str) -> list[str]:
    forced = os.environ.get("AI_MODEL_GEMINI" if provider == "gemini" else "AI_MODEL_GROQ", "")
    good   = _last_good.get(provider)
    models = [forced] if forced else []
    if good and good not in models:
        models.append(good)  # le dernier qui a marché passe devant
    models += [m for m in _state[provider] if m not in models]
    models = [m for m in models if m not in _dead]
    now  = time.time()
    free = [m for m in models if _model_until.get(m, 0) <= now]
    return free or models[:1]  # tout saturé : on tente quand même le premier


def current_models() -> dict:
    return {"gemini": _candidates("gemini"), "groq": _candidates("groq")}


def _reasoning_kwargs(model: str) -> dict:
    """Les modèles récents raisonnent avant de répondre : au minimum, sinon
    le raisonnement mange tout max_tokens et la réponse arrive vide."""
    if model.startswith("gemini/") and not re.search(r"gemini-(1|2\.0)", model):
        return {"reasoning_effort": "minimal" if "gemini-2.5" not in model else "low"}
    if "gpt-oss" in model or "qwen3" in model:
        return {"reasoning_effort": "low"}
    return {}


# ── Appel ─────────────────────────────────────────────────────────────

async def complete(
    messages: list[dict],
    *,
    max_tokens: int = 1024,
    temperature: float = 0.8,
    json: bool = False,
    deadline: float = 45,
    attempt_timeout: float = 12,
    safety_settings: list[dict] | None = None,
    prefer: str | None = None,
) -> str:
    """Renvoie le texte du premier modèle qui répond, dans la limite de `deadline` secondes
    au total et `attempt_timeout` secondes par modèle."""
    if not has_keys():
        raise AIUnavailable("no_keys")
    try:
        await refresh_models()
    except Exception as e:
        print(f"[IA] refresh modèles : {type(e).__name__}: {e}")

    end  = time.monotonic() + deadline
    last: Exception | None = None
    plan = [("gemini", m, gemini_keys()) for m in _candidates("gemini")]
    plan += [("groq", m, groq_keys()) for m in _candidates("groq")]
    # tri stable : à vitesse inconnue l'ordre Gemini puis Groq est gardé
    plan.sort(key=lambda step: _latency.get(step[1], _LATENCY_UNKNOWN))
    if prefer:
        # seul le modèle le plus rapide du fournisseur préféré passe devant : si lui
        # est lent ou saturé, on retombe tout de suite sur l'ordre par vitesse
        first = next((step for step in plan if step[0] == prefer), None)
        if first:
            plan.remove(first)
            plan.insert(0, first)

    for provider, model, keys in plan:
        for key in _rotated(provider, keys):
            remaining = end - time.monotonic()
            if remaining < 2:
                raise asyncio.TimeoutError()
            started = time.monotonic()
            extra = {"response_format": {"type": "json_object"}} if json else {}
            # Gemini 3+ : la température est dépréciée (warning à chaque appel)
            if not re.search(r"gemini/gemini-[3-9]", model):
                extra["temperature"] = temperature
            if safety_settings and provider == "gemini":
                extra["safety_settings"] = safety_settings
            try:
                resp = await asyncio.wait_for(
                    litellm.acompletion(
                        model=model,
                        api_key=key,
                        max_tokens=max_tokens,
                        request_timeout=min(attempt_timeout, remaining),
                        num_retries=0,
                        messages=messages,
                        **_reasoning_kwargs(model),
                        **extra,
                    ),
                    timeout=min(attempt_timeout + 2, remaining),
                )
                text = (resp.choices[0].message.content or "").strip()
                if not text:
                    raise RuntimeError("réponse vide du modèle")
                _last_good[provider] = model
                _note_latency(model, time.monotonic() - started)
                return text
            except asyncio.TimeoutError as e:
                last = e
                _model_until[model] = time.time() + _MODEL_COOLDOWN
                _note_latency(model, attempt_timeout)
                print(f"[IA] {model} trop lent, de côté 10 min")
                break  # modèle lent : inutile d'essayer les autres clés
            except Exception as e:
                last = e
                msg = f"{type(e).__name__}: {e}"
                short = re.sub(r"\s+", " ", msg)[:220]
                if _KEY_DEAD.search(msg) and not _MODEL_GONE.search(msg):
                    _key_until[key] = time.time() + 3600
                    print(f"[IA] clé {provider} …{key[-4:]} inutilisable, de côté 1 h : {short}")
                    continue
                if _MODEL_BUSY.search(msg):
                    _model_until[model] = time.time() + _MODEL_COOLDOWN
                    _note_latency(model, attempt_timeout)
                    print(f"[IA] {model} saturé/lent, de côté 10 min : {short}")
                    break
                if _MODEL_GONE.search(msg):
                    _dead.add(model)
                    _state["refreshed"] = 0.0  # rechargera la liste au prochain appel
                    print(f"[IA] {model} n'existe plus, liste rechargée : {short}")
                    break
                if _KEY_LIMITED.search(msg):
                    _key_until[key] = time.time() + 60
                print(f"[IA] {model} échec : {short}")
                continue  # rate-limit / autre → clé suivante

    raise AIUnavailable("aucun modèle IA n'a répondu", last)
