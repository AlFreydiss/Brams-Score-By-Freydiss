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


def sort_sessions(sessions: list) -> list:
    """Trie les sessions chronologiquement SANS comparer le salon.

    Le salon est heterogene selon le writer (None a la fermeture apres restart,
    str en vocal reel, int possible en legacy) : trier sur le tuple entier fait
    participer ce 3e element des que deux sessions partagent start ET end, et
    leve TypeError.
    """
    return sorted(sessions, key=lambda s: (s[0], s[1]))


def clamp_sessions(sessions: list, max_seconds: float) -> list:
    """Borne chaque session à `max_seconds` en gardant la FIN.

    seconds_since() plafonne déjà chaque session à MAX_SESSION_SECONDS, mais les
    constructeurs d'intervalles ne le faisaient pas : un join_time corrompu (très
    ancien) produisait une session ouverte de plusieurs centaines d'heures qui
    dominait le classement et gonflait le temps partagé. On garde la fin plutôt
    que le début : sur une session fantôme, c'est le présent qui est fiable.
    """
    out = []
    for item in sessions:
        st, en = float(item[0]), float(item[1])
        if en - st > max_seconds:
            st = en - max_seconds
        out.append((st, en) + tuple(item[2:]))
    return out


def percentile_for(uid, hours_sorted: list) -> int | None:
    """Rang vocal en % parmi ceux qui ont des heures. None = non classé.

    hours_sorted : [(uid, heures)] trié par heures décroissantes. Un membre sans
    heures n'est PAS classé : l'ancien repli sur la dernière place l'affichait
    « TOP 100% » comme s'il figurait au classement.
    """
    voiced = [u for u, h in hours_sorted if h > 0]
    if not voiced:
        return None
    try:
        rankpos = voiced.index(str(uid))
    except ValueError:
        return None
    return max(1, round((rankpos + 1) / len(voiced) * 100))


def group_by_channel(sessions: list[tuple[float, float, object]]) -> dict[str, list[tuple[float, float]]]:
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


def overlap_grouped(ga: dict, b) -> float:
    """overlap_same_channel avec le premier terme déjà groupé par salon.

    Permet à best_binome de grouper les sessions de l'appelant UNE fois au lieu
    d'une fois par candidat (le regroupement était refait N fois).
    """
    gb = group_by_channel(b)
    if not gb:
        return 0.0
    total = 0.0
    for ch, sa in ga.items():
        sb = gb.get(ch)
        if not sb:
            continue
        total += interval_overlap_seconds(sa, sb)
    return total / 3600.0


def overlap_same_channel(a, b) -> float:
    """Heures passées dans LE MÊME salon au même moment. 0 si aucun salon commun."""
    return overlap_grouped(group_by_channel(a), b)


def best_binome(uid: str, mine, others: dict) -> dict | None:
    """others: {ouid: (sessions, name, avatar)}. Retourne le meilleur duo ou None."""
    gmine = group_by_channel(mine)
    if not gmine:
        return None
    best = None
    best_ov = 0.0
    for ouid, pack in others.items():
        if str(ouid) == str(uid):
            continue
        osess, oname, oavatar = pack[0], pack[1], pack[2]
        ov = overlap_grouped(gmine, osess)
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
