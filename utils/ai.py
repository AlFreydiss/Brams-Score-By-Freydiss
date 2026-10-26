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

litellm.drop_params = True  # ignore les params non supportés au lieu de planter

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
_MODEL_GONE    = re.compile(
    r"not[ _]found|decommissioned|deprecated|does not exist|no longer|model_not_found|is not supported|retired|404",
    re.I,
)

_state = {"gemini": list(_FALLBACK_GEMINI), "groq": list(_FALLBACK_GROQ), "refreshed": 0.0}
_dead: set[str] = set()
_refresh_lock = asyncio.Lock()
_key_index = {"gemini": 0, "groq": 0}


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
    models = ([forced] if forced else []) + [m for m in _state[provider] if m != forced]
    return [m for m in models if m not in _dead]


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
    attempt_timeout: float = 20,
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

    for provider, model, keys in plan:
        for key in _rotated(provider, keys):
            remaining = end - time.monotonic()
            if remaining < 2:
                raise asyncio.TimeoutError()
            extra = {"response_format": {"type": "json_object"}} if json else {}
            try:
                resp = await asyncio.wait_for(
                    litellm.acompletion(
                        model=model,
                        api_key=key,
                        max_tokens=max_tokens,
                        temperature=temperature,
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
                return text
            except asyncio.TimeoutError as e:
                last = e
                print(f"[IA] {model} trop lent, suivant")
                break  # modèle lent : inutile d'essayer les autres clés
            except Exception as e:
                last = e
                msg = str(e)
                print(f"[IA] {model} échec : {type(e).__name__}: {msg[:300]}")
                if _MODEL_GONE.search(msg) and "api key" not in msg.lower():
                    _dead.add(model)
                    _state["refreshed"] = 0.0  # rechargera la liste au prochain appel
                    break
                continue  # rate-limit / clé invalide → clé suivante

    raise AIUnavailable("aucun modèle IA n'a répondu", last)
