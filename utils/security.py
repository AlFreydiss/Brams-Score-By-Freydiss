"""
Utilitaires de sécurité partagés pour le bot Brams Score.
"""
import ipaddress
import re
import time
import urllib.parse
from functools import wraps
from typing import Any, Callable, Optional

# ── Constantes ────────────────────────────────────────────────────────────────

MAX_INPUT_LEN    = 500    # longueur max d'un champ texte utilisateur
MAX_REASON_LEN   = 200    # longueur max d'une raison/note
MAX_NAME_LEN     = 80     # longueur max d'un pseudo/nom
MAX_URL_LEN      = 1024   # longueur max d'une URL

_CONTROL_CHARS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
_HTML_TAGS     = re.compile(r'<[^>]*>')
_SQL_PATTERNS  = re.compile(
    r"(\b(select|insert|update|delete|drop|alter|create|truncate|exec|union|xp_)\b"
    r"|--|;|\bor\b\s+\d+=\d+|\band\b\s+\d+=\d+)",
    re.IGNORECASE,
)

# ── Sanitisation ──────────────────────────────────────────────────────────────

def sanitize(text: Any, max_len: int = MAX_INPUT_LEN) -> str:
    """Nettoie une entrée utilisateur : control chars, HTML, longueur."""
    if not isinstance(text, str):
        text = str(text)
    text = _CONTROL_CHARS.sub('', text)
    text = _HTML_TAGS.sub('', text)
    text = text.strip()
    return text[:max_len]


def sanitize_name(text: Any) -> str:
    return sanitize(text, MAX_NAME_LEN)


def sanitize_reason(text: Any) -> str:
    return sanitize(text, MAX_REASON_LEN)


def has_sql_injection(text: str) -> bool:
    """Détecte les tentatives d'injection SQL basiques."""
    return bool(_SQL_PATTERNS.search(text))


# ── Validation d'URL ──────────────────────────────────────────────────────────

_ALLOWED_SCHEMES = {'http', 'https'}
_BLOCKED_HOSTS   = {'localhost', '127.0.0.1', '0.0.0.0', '::1'}


def is_safe_url(url: str) -> bool:
    """
    Rejette les URLs vers localhost, IPs privées/link-local, schemes non-http(s).
    Protège contre le SSRF.
    """
    if not url or len(url) > MAX_URL_LEN:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in _ALLOWED_SCHEMES:
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in _BLOCKED_HOSTS:
            return False
        # Bloque les IPs privées / loopback / link-local
        try:
            addr = ipaddress.ip_address(hostname)
            if (addr.is_private or addr.is_loopback
                    or addr.is_link_local or addr.is_reserved
                    or addr.is_multicast):
                return False
        except ValueError:
            pass  # hostname textuel → OK
        return True
    except Exception:
        return False


# ── Rate limiter en mémoire ───────────────────────────────────────────────────

class RateLimiter:
    """
    Limiteur de débit par clé (ID utilisateur, channel, etc.).
    Usage : limiter = RateLimiter(max_calls=5, window=60)
            if not limiter.allow(user_id): ... trop vite ...
    """

    def __init__(self, max_calls: int, window: float):
        self._max   = max_calls
        self._win   = window
        self._store: dict[Any, list[float]] = {}

    def allow(self, key: Any) -> bool:
        now       = time.monotonic()
        cutoff    = now - self._win
        timestamps = self._store.get(key, [])
        timestamps = [t for t in timestamps if t > cutoff]
        if len(timestamps) >= self._max:
            self._store[key] = timestamps
            return False
        timestamps.append(now)
        self._store[key] = timestamps
        return True

    def remaining(self, key: Any) -> int:
        now       = time.monotonic()
        cutoff    = now - self._win
        timestamps = [t for t in self._store.get(key, []) if t > cutoff]
        return max(0, self._max - len(timestamps))

    def reset(self, key: Any) -> None:
        self._store.pop(key, None)

    def cleanup(self) -> None:
        """Supprime les entrées expirées pour éviter la fuite mémoire."""
        now    = time.monotonic()
        cutoff = now - self._win
        for key in list(self._store):
            self._store[key] = [t for t in self._store[key] if t > cutoff]
            if not self._store[key]:
                del self._store[key]


# ── Limiteurs pré-configurés pour les commandes Discord ──────────────────────

cmd_limiter      = RateLimiter(max_calls=5,  window=10)    # 5 cmds / 10s
quiz_limiter     = RateLimiter(max_calls=3,  window=30)    # 3 /question / 30s
transfer_limiter = RateLimiter(max_calls=3,  window=60)    # 3 virements / min
admin_limiter    = RateLimiter(max_calls=10, window=60)    # 10 cmds admin / min


def rate_limited(limiter: RateLimiter, message: str = "Tu vas trop vite, patiente quelques secondes."):
    """
    Décorateur pour les handlers de commandes Discord app_commands.
    Utilise l'ID de l'utilisateur comme clé.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(self_or_interaction, *args, **kwargs):
            # Gère les deux cas : méthode de Cog ou fonction libre
            if hasattr(self_or_interaction, 'user'):
                interaction = self_or_interaction
            else:
                interaction = args[0] if args else None

            if interaction is not None:
                uid = str(interaction.user.id)
                if not limiter.allow(uid):
                    if not interaction.response.is_done():
                        await interaction.response.send_message(message, ephemeral=True)
                    return
            return await func(self_or_interaction, *args, **kwargs)
        return wrapper
    return decorator


# ── Validation des montants Berry ─────────────────────────────────────────────

def validate_amount(value: Any, min_val: int = 1, max_val: int = 100_000_000) -> Optional[int]:
    """Valide et retourne un montant Berry, ou None si invalide."""
    try:
        amount = int(value)
        if min_val <= amount <= max_val:
            return amount
    except (TypeError, ValueError):
        pass
    return None


# ── Flask security headers ────────────────────────────────────────────────────

def add_security_headers(response):
    """À appliquer via app.after_request dans Flask."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options']         = 'DENY'
    response.headers['X-XSS-Protection']        = '1; mode=block'
    response.headers['Referrer-Policy']          = 'no-referrer'
    response.headers['Cache-Control']            = 'no-store'
    return response
