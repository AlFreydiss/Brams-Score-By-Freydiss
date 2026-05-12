import time

_state: dict[str, float] = {"open_until": time.time() + 3600}


def is_open() -> bool:
    return time.time() < _state["open_until"]


def set_open(seconds: float) -> None:
    _state["open_until"] = time.time() + seconds


def close() -> None:
    _state["open_until"] = 0.0


def remaining_seconds() -> float:
    return max(0.0, _state["open_until"] - time.time())
