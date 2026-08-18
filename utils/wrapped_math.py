"""Calculs purs du Brams Wrapped / nakama vocal.

Le binôme DOIT partager le même salon au même moment.
Un chevauchement horaire seul (Douglas en vocal ailleurs) ne compte pas.
Les sessions sans channel_id sont ignorées pour le duo (pas de wildcard).
"""

from __future__ import annotations

MEMBERSHIP_DAYS = 30
MIN_BINOME_HOURS = 1.0
MIN_SESSION_SEC = 60.0


def interval_overlap_seconds(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> float:
    """Chevauchement de deux listes d'intervalles (start, end) déjà triées."""
    i = j = 0
    total = 0.0
    while i < len(a) and j < len(b):
        lo = max(a[i][0], b[j][0])
        hi = min(a[i][1], b[j][1])
        if hi > lo:
            total += hi - lo
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return total


def _group_by_channel(sessions: list[tuple[float, float, object]]) -> dict[str, list[tuple[float, float]]]:
    by: dict[str, list[tuple[float, float]]] = {}
    for item in sessions:
        if len(item) < 3:
            continue
        st, en, ch = item[0], item[1], item[2]
        if ch is None or ch == "" or ch == "None":
            continue
        try:
            st_f, en_f = float(st), float(en)
        except (TypeError, ValueError):
            continue
        if en_f - st_f < MIN_SESSION_SEC:
            continue
        by.setdefault(str(ch), []).append((st_f, en_f))
    for ch in by:
        by[ch].sort()
    return by


def overlap_same_channel(a, b) -> float:
    """Heures passées dans LE MÊME salon au même moment. 0 si aucun salon commun."""
    ga = _group_by_channel(a)
    gb = _group_by_channel(b)
    total = 0.0
    for ch, sa in ga.items():
        sb = gb.get(ch)
        if not sb:
            continue
        total += interval_overlap_seconds(sa, sb)
    return total / 3600.0


def best_binome(uid: str, mine, others: dict) -> dict | None:
    """others: {ouid: (sessions, name, avatar)}. Retourne le meilleur duo ou None."""
    best = None
    best_ov = 0.0
    for ouid, pack in others.items():
        if str(ouid) == str(uid):
            continue
        osess, oname, oavatar = pack[0], pack[1], pack[2]
        ov = overlap_same_channel(mine, osess)
        if ov > best_ov:
            best_ov = ov
            best = {"username": oname, "avatar_url": oavatar, "hours": round(ov, 1)}
    if not best or best_ov < MIN_BINOME_HOURS:
        return None
    return best


def membership_ok(joined_ts: float | None, now: float, days: int = MEMBERSHIP_DAYS) -> bool:
    if not joined_ts:
        return False
    return (now - float(joined_ts)) >= days * 86400


def days_aboard(joined_ts: float | None, now: float) -> int:
    if not joined_ts:
        return 0
    return max(0, int((now - float(joined_ts)) / 86400))


def hour_vibe(sessions, tz_offset_hours: int = 2) -> dict:
    """Répartit les secondes en nuit (22h-6h) / jour (8h-18h) selon un offset fixe."""
    night = day = other = 0.0
    shift = tz_offset_hours * 3600
    for item in sessions:
        st, en = float(item[0]), float(item[1])
        t = st
        while t < en:
            step = min(en - t, 3600 - ((t + shift) % 3600))
            if step <= 0:
                break
            hour = int(((t + shift) % 86400) // 3600)
            if hour >= 22 or hour < 6:
                night += step
            elif 8 <= hour < 18:
                day += step
            else:
                other += step
            t += step
    total = night + day + other
    if total <= 0:
        return {"vibe": "mixed", "night_share": 0.0, "day_share": 0.0}
    ns = night / total
    ds = day / total
    if ns >= 0.45:
        vibe = "night_owl"
    elif ds >= 0.55:
        vibe = "daytime"
    else:
        vibe = "mixed"
    return {"vibe": vibe, "night_share": round(ns, 2), "day_share": round(ds, 2)}
