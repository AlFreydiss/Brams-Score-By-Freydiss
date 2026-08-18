"""Tests du binôme vocal : même salon obligatoire (bug Douglas)."""
from wrapped_math import (
    overlap_same_channel,
    best_binome,
    membership_ok,
    hour_vibe,
    MEMBERSHIP_DAYS,
)


def test_same_channel_counts():
    a = [(0, 3600, "111")]
    b = [(0, 3600, "111")]
    assert abs(overlap_same_channel(a, b) - 1.0) < 1e-6


def test_different_channel_is_zero():
    # Douglas en vocal ailleurs au même moment : 0
    user = [(0, 10 * 3600, "sunny")]
    douglas = [(0, 10 * 3600, "grand-line")]
    assert overlap_same_channel(user, douglas) == 0.0


def test_missing_channel_is_zero():
    a = [(0, 7200, None)]
    b = [(0, 7200, "111")]
    assert overlap_same_channel(a, b) == 0.0
    assert overlap_same_channel([(0, 7200, None)], [(0, 7200, None)]) == 0.0


def test_partial_same_channel():
    # 2h ensemble dans sunny, Douglas aussi 8h dans un autre salon
    user = [(0, 2 * 3600, "sunny"), (2 * 3600, 4 * 3600, "sunny")]
    berat = [(3600, 3 * 3600, "sunny")]
    douglas = [(0, 12 * 3600, "afk-or-other")]
    assert abs(overlap_same_channel(user, berat) - 2.0) < 1e-6
    assert overlap_same_channel(user, douglas) == 0.0
    pick = best_binome("u", user, {
        "berat": (berat, "Berat", None),
        "doug": (douglas, "Douglas", None),
    })
    assert pick is not None
    assert pick["username"] == "Berat"
    assert pick["hours"] == 2.0


def test_douglas_always_online_does_not_win():
    user = [(100, 100 + 3 * 3600, "crew")]
    real = [(100, 100 + 3 * 3600, "crew")]
    doug = [(0, 20 * 3600, "lobby")]  # 20h ailleurs, chevauche en TEMPS mais pas en salon
    pick = best_binome("me", user, {
        "doug": (doug, "Douglas", None),
        "ami": (real, "VraiNakama", None),
    })
    assert pick["username"] == "VraiNakama"


def test_below_one_hour_ignored():
    a = [(0, 1800, "x")]
    b = [(0, 1800, "x")]
    assert best_binome("a", a, {"b": (b, "X", None)}) is None


def test_membership():
    now = 2_000_000_000
    assert membership_ok(now - MEMBERSHIP_DAYS * 86400, now) is True
    assert membership_ok(now - (MEMBERSHIP_DAYS - 1) * 86400, now) is False
    assert membership_ok(None, now) is False


def test_night_owl():
    # 23h-3h Paris (UTC+2) = 21h-1h UTC
    # timestamp 0 = 1970-01-01 00:00 UTC = 01:00 Paris → night
    night = [(0, 4 * 3600, "c")]
    v = hour_vibe(night, tz_offset_hours=2)
    assert v["vibe"] == "night_owl"


if __name__ == "__main__":
    tests = [fn for name, fn in list(globals().items()) if name.startswith("test_")]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"ok  {fn.__name__}")
        except Exception as e:
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    raise SystemExit(failed)
