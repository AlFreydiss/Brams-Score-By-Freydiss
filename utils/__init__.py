from datetime import datetime, timezone

from config import BERRIES_PER_VOCAL_MINUTE, RANKS


def now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


def seconds_in_period(sessions: list, days: int) -> float:
    cutoff = now_ts() - days * 86400
    return sum(
        s["end"] - max(s["start"], cutoff)
        for s in sessions
        if s["end"] >= cutoff
    )


def active_seconds_in_period(join_time, days: int) -> float:
    if not join_time:
        return 0.0
    cutoff = now_ts() - days * 86400
    return max(0.0, now_ts() - max(float(join_time), cutoff))


def user_seconds_in_period(user: dict, days: int) -> float:
    return (
        seconds_in_period(user.get("vocal_sessions", []), days)
        + active_seconds_in_period(user.get("join_time"), days)
    )


def iter_vocal_sessions(user: dict, member=None) -> list[dict]:
    sessions = list(user.get("vocal_sessions", []))
    join_time = user.get("join_time")
    if join_time:
        active_session = {
            "start": float(join_time),
            "end": now_ts(),
            "channel": None,
        }
        if member and getattr(member, "voice", None) and member.voice and member.voice.channel:
            active_session["channel"] = str(member.voice.channel.id)
        sessions.append(active_session)
    return sessions


def award_vocal_berries(user: dict, seconds: float) -> int:
    whole_minutes = max(0, int(seconds)) // 60
    if whole_minutes <= 0:
        return 0
    earned = whole_minutes * BERRIES_PER_VOCAL_MINUTE
    user["berrys"] = int(user.get("berrys") or 0) + earned
    user["berrys_vocal_seconds_paid"] = int(user.get("berrys_vocal_seconds_paid") or 0) + whole_minutes * 60
    return earned


def calculate_vocal_berries_from_history(user: dict) -> int:
    total_minutes = sum(
        max(0, int(s.get("end", 0) - s.get("start", 0))) // 60
        for s in user.get("vocal_sessions", [])
    )
    return total_minutes * BERRIES_PER_VOCAL_MINUTE


def messages_in_period(messages: list, days: int) -> int:
    cutoff = now_ts() - days * 86400
    return sum(1 for ts in messages if ts >= cutoff)


def clean_old_data(user: dict) -> None:
    cutoff = now_ts() - 14 * 86400
    user["vocal_sessions"] = [s for s in user.get("vocal_sessions", []) if s["end"] >= cutoff]
    user["messages"] = [ts for ts in user.get("messages", []) if ts >= cutoff]


def format_duration(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}min"


def get_rank_for_hours(hours: float) -> str | None:
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return role_name
    return None


def get_next_rank(hours: float) -> tuple[int | None, str | None]:
    for threshold, role_name in reversed(RANKS):
        if hours < threshold:
            return threshold, role_name
    return None, None


def get_current_rank_threshold(hours: float) -> tuple[int | None, str | None]:
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return threshold, role_name
    return None, None
