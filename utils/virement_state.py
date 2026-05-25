import time

_state: dict[str, float] = {"open_until": 0.0}


def is_open() -> bool:
    v = _state["open_until"]
    return v == float("inf") or time.time() < v


def set_open(seconds: float) -> None:
    _state["open_until"] = time.time() + seconds


def set_permanent() -> None:
    _state["open_until"] = float("inf")


def close() -> None:
    _state["open_until"] = 0.0


def remaining_seconds() -> float:
    v = _state["open_until"]
    if v == float("inf"):
        return float("inf")
    return max(0.0, v - time.time())
